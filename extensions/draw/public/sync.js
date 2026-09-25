// Keeps the editor and the extension's copy of the drawing in sync.
// Local edits are sent as small element-level ops, and the server sends each change as ops too.
// Remote (agent) edits are merged on top of whatever the user has not saved yet.
import { applyOps, diffOps, mergeOps } from "/lib/model.mjs";

// How many changes can wait for the one before them (see drainOps) before the panel gives up on
// them and fetches the whole drawing again.
const MAX_EARLY = 200;

// Browsers only send keepalive requests (the kind that still goes out once the page is gone)
// while their bodies add up to at most 64 KiB (see flushBeacon).
const KEEPALIVE_BYTES = 64 * 1024;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class Sync {
  constructor({ instanceId, token, editor, handlers }) {
    this.instanceId = instanceId;
    this.token = token;
    this.editor = editor;
    this.handlers = handlers;
    this.clientId = `c${Math.random().toString(36).slice(2, 10)}`;
    this.drawingId = null;
    this.rev = 0;
    this.synced = new Map();
    this.inflight = false;
    // Every change sent gets the next number, so the server can tell an old one that arrives late.
    this.seq = 0;
    // The ops of the change on its way, if any, and the drawing they are for.
    this.sending = null;
    this.timer = 0;
    this.deferred = null;
    // Changes from the server that came before the one they follow (see drainOps).
    this.early = [];
    // Set when a change was missed, so the whole drawing has to be fetched again.
    this.behind = false;
    this.resyncing = false;
    // The agent's newest selection, while the editor cannot show it yet (see showSelection).
    this.pendingSelection = null;
    this.failures = 0;
    this.retryTimer = 0;
    // Why the server refused our last changes, and why the extension cannot write this drawing
    // to disk (it still has the changes in memory). Both show as errors until they clear.
    this.refusal = null;
    this.diskError = null;
    // Set when the server says this drawing was deleted, so there is nothing left to save it to.
    this.gone = false;
    // Drawings this panel is moving to, each waiting for the edits on the current one to be saved.
    this.switching = new Set();
    this.source = null;
    this.connectedOnce = false;
    editor.on("change", () => this.schedule());
    editor.on("idle", () => this.onIdle());
    window.addEventListener("pagehide", () => this.flushBeacon());
  }

  url(route, extra = "") {
    return `/api/${route}?i=${encodeURIComponent(this.instanceId)}&t=${encodeURIComponent(this.token)}${extra}`;
  }

  async post(route, body) {
    const res = await fetch(this.url(route), {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ clientId: this.clientId, ...body }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || `Request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  async loadState() {
    const res = await fetch(this.url("state"), { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Could not load the drawing (${res.status})`);
    return data;
  }

  setDoc(doc) {
    this.drawingId = doc.id;
    this.rev = doc.rev;
    this.synced = new Map(doc.elements.map((e) => [e.id, e]));
    this.deferred = null;
    this.early = [];
    this.behind = false;
    this.pendingSelection = null;
    this.gone = false;
  }

  connect() {
    const source = new EventSource(this.url("events", `&c=${this.clientId}`));
    this.source = source;
    const on = (name, fn) => source.addEventListener(name, (ev) => {
      let data;
      try {
        data = JSON.parse(ev.data);
      } catch {
        return;
      }
      fn(data);
    });
    source.addEventListener("open", () => {
      const again = this.connectedOnce;
      this.connectedOnce = true;
      this.handlers.connection?.(true);
      // "Reconnecting" covered the status line, so bring back an error that still applies.
      if (this.refusal) this.handlers.status?.("error", this.refusal);
      else if (this.diskError) this.settled();
      if (again) this.resync();
    });
    source.addEventListener("error", () => this.handlers.connection?.(false));
    on("ops", (ev) => this.onOps(ev));
    on("list", ({ drawings }) => this.handlers.list?.(drawings));
    on("switch", ({ drawing }) => this.switchTo(drawing));
    on("export", (req) => this.handlers.exportRequest?.(req));
    on("select", ({ drawingId, ids }) => {
      if (drawingId === this.drawingId) this.showSelection(ids);
      for (const t of this.switching) if (t.drawing.id === drawingId) t.selection = ids;
    });
    on("settings", ({ settings, origin }) => {
      if (origin !== this.clientId) this.handlers.settings?.(settings);
    });
    on("save", ({ drawingId, error }) => {
      if (drawingId === this.drawingId) this.setDiskError(error);
      for (const t of this.switching) if (t.drawing.id === drawingId) t.drawing = { ...t.drawing, saveError: error };
    });
  }

  // Fetches the whole drawing again: after a reconnect, when events may have been missed, and when
  // a change turns out to be missing (see drainOps). Changes that come meanwhile wait in `early`.
  async resync() {
    if (this.resyncing) {
      // This one may have asked before the change that was missed, so ask again after it.
      this.behind = true;
      return;
    }
    this.resyncing = true;
    this.behind = false;
    let state = null;
    try {
      state = await this.loadState();
    } catch {
      // The next change or reconnect tries again.
      this.behind = true;
    } finally {
      this.resyncing = false;
    }
    if (!state) return;
    this.handlers.list?.(state.drawings);
    if (state.settings) this.handlers.settings?.(state.settings);
    if (state.drawing.id !== this.drawingId) {
      this.switchTo(state.drawing);
    } else {
      this.onRemote(state.drawing);
      this.setDiskError(state.drawing.saveError);
      this.drainOps({ refetch: false });
    }
  }

  // A change from the server: the ops that turn the drawing at `baseRev` into the one at `rev`.
  onOps(ev) {
    for (const t of this.switching) {
      if (t.drawing.id !== ev.drawingId || ev.rev <= t.drawing.rev) continue;
      if (ev.baseRev === t.drawing.rev) {
        t.drawing = { ...t.drawing, rev: ev.rev, elements: ev.ops ? mergeOps(t.drawing.elements, ev.ops) : t.drawing.elements };
      } else {
        t.behind = true;
      }
    }
    if (ev.drawingId !== this.drawingId) return;
    if (this.early.length >= MAX_EARLY) {
      this.early = [];
      this.behind = true;
    }
    this.early.push(ev);
    this.drainOps();
  }

  // Applies the changes that follow on from the newest copy of the drawing this panel has: the one
  // waiting to be shown, or else the one it last loaded or saved. While our own save is on its way,
  // a change made after it can come first, and waits for its reply (our change is the one it
  // follows). Any other gap means a change never came (the panel was on another drawing for a
  // moment, say), so the whole drawing is fetched again. Right after that fetch (`refetch` false),
  // a change that still does not follow on can never apply, so it is dropped instead, and the next
  // change that does not follow on fetches the drawing again.
  drainOps({ refetch = true } = {}) {
    const queue = this.early;
    while (queue.length) {
      const ev = queue[0];
      const base = this.deferred || { rev: this.rev, elements: null };
      if (ev.drawingId !== this.drawingId || ev.rev <= base.rev) {
        queue.shift();
        continue;
      }
      if (ev.baseRev !== base.rev) break;
      queue.shift();
      const elements = base.elements || [...this.synced.values()];
      this.onRemote({ id: ev.drawingId, rev: ev.rev, elements: ev.ops ? mergeOps(elements, ev.ops) : elements });
    }
    if (this.inflight) return;
    if (queue.length) {
      if (refetch) this.behind = true;
      else queue.length = 0;
    }
    if (this.behind) this.resync();
  }

  onRemote(drawing) {
    if (!drawing) return;
    // A drawing this panel is about to show: keep the newest copy of it for when it does.
    for (const t of this.switching) if (t.drawing.id === drawing.id && drawing.rev > t.drawing.rev) t.drawing = drawing;
    if (drawing.id !== this.drawingId || drawing.rev <= this.rev) return;
    if (this.inflight || this.editor.busy) {
      if (!this.deferred || drawing.rev > this.deferred.rev) this.deferred = drawing;
      return;
    }
    this.rebase(drawing);
  }

  // Replaces our base with the remote doc and re-applies unsaved local changes on top. `record`
  // is false when the doc differs only because the server tidied up what we sent.
  rebase(drawing, { record = true } = {}) {
    const pending = diffOps(this.synced, this.editor.elements);
    this.synced = new Map(drawing.elements.map((e) => [e.id, e]));
    this.rev = drawing.rev;
    this.deferred = null;
    // No element cap here. Going over it makes the server refuse the save and say why, which is
    // better than the user's newest elements quietly disappearing.
    const next = pending ? applyOps(drawing.elements, pending, Infinity) : drawing.elements;
    this.editor.applyRemote(next, { record });
    if (pending) this.schedule();
  }

  // Shows another drawing. Edits on screen that are not saved yet would be lost, so when they
  // cannot be saved first, the panel stays on this drawing, tells the server so, and resolves
  // false, and the unsaved handler lets the user discard them. `discard` skips that check.
  // A deleted drawing has nowhere left to save to, so it never holds the panel.
  async switchTo(drawing, { discard = false } = {}) {
    // Showing the drawing that is already on screen loses nothing, so it is only an update to it.
    if (drawing.id === this.drawingId) {
      this.onRemote(drawing);
      return true;
    }
    // The server already treats the other drawing as shown, so while the flush below waits, it
    // sends that drawing's changes, save status and selection. They are kept here until then.
    const target = { drawing, selection: null, behind: false };
    this.switching.add(target);
    let ready;
    try {
      ready = discard || (await this.flush(true)) || this.gone;
    } finally {
      this.switching.delete(target);
    }
    if (!ready) {
      // The server has already moved this panel to the other drawing, so move it back. Changes to
      // this drawing did not come to the panel in the meantime, so it takes the copy in the reply.
      this.post("drawings", { action: "open", id: this.drawingId })
        .then((res) => {
          if (res.drawing) this.onRemote(res.drawing);
          this.drainOps();
          this.sendSelection([...this.editor.selection]);
        })
        .catch(() => {});
      this.handlers.unsaved?.(target.drawing);
      return false;
    }
    drawing = target.drawing;
    // Another switch can show this drawing first. Then this copy is only an update to it.
    if (drawing.id === this.drawingId) {
      this.onRemote(drawing);
      return true;
    }
    this.setDoc(drawing);
    this.handlers.switched?.(drawing);
    if (target.selection) this.showSelection(target.selection);
    // Messages about the last drawing do not apply to this one.
    this.refusal = null;
    this.diskError = null;
    this.setDiskError(drawing.saveError);
    if (!this.diskError) this.settled();
    // A change to it came while the panel waited, and one before it never did.
    if (target.behind) this.resync();
    return true;
  }

  // The extension has all our changes, so show "saved", unless it cannot write them to disk.
  settled() {
    if (this.diskError) this.handlers.status?.("error", `Not saved to disk: ${this.diskError}`);
    else this.handlers.status?.("saved");
  }

  setDiskError(error) {
    const was = this.diskError;
    this.diskError = error || null;
    if (this.diskError === was) return;
    if (this.diskError) this.handlers.problem?.(`This drawing could not be saved to disk: ${this.diskError}. Draw will keep trying.`);
    if (this.diskError || (!this.inflight && !this.dirty)) this.settled();
  }

  onIdle() {
    // Once the handler that ended the edit or drag is done, since it may start the next one right
    // away (Tab opens the next step's label). Then what waits keeps waiting.
    queueMicrotask(() => this.applyDeferred());
    this.schedule();
  }

  // Shows a selection the agent made. While the user drags or types, or while an agent change
  // waits for a save to finish (it may add the elements named here), the newest one waits for
  // applyDeferred.
  showSelection(ids) {
    this.pendingSelection = { ids, before: [...this.editor.selection] };
    this.applyDeferred();
  }

  // Applies what the server sent while the editor could not take it: the newest remote doc, and
  // then the agent's newest selection, unless the user picked something else since it came.
  // Their newer choice stands then, and the server already has it. Elements that are gone do
  // not count as a different choice, since removing an element also drops it from the selection.
  applyDeferred() {
    if (this.inflight || this.editor.busy) return;
    if (this.deferred) {
      const d = this.deferred;
      this.deferred = null;
      if (d.rev > this.rev) this.rebase(d);
    }
    const sel = this.pendingSelection;
    if (!sel) return;
    this.pendingSelection = null;
    const now = this.editor.selection;
    const before = sel.before.filter((id) => this.editor.byId.has(id));
    if (before.length === now.size && before.every((id) => now.has(id))) this.handlers.select?.(sel.ids);
  }

  schedule(delay = 60) {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = 0;
      this.flush();
    }, delay);
  }

  get dirty() {
    return !!this.drawingId && !!diffOps(this.synced, this.editor.elements);
  }

  // Sends the edits the extension does not have yet. Resolves true once it has everything the
  // editor shows, false while something is still unsaved. `force` waits for a request that is
  // already out and sends even in the middle of a gesture, for callers that need the saved copy
  // to match the screen.
  async flush(force = false) {
    if (this.inflight) {
      if (!force) return false;
      while (this.inflight) await sleep(30);
    }
    if (!this.drawingId) return true;
    if (!force && this.editor.busy) return false;
    const sent = this.editor.elements;
    const ops = diffOps(this.synced, sent);
    if (!ops) {
      this.refusal = null;
      this.settled();
      return true;
    }
    this.inflight = true;
    this.handlers.status?.("saving");
    const drawingId = this.drawingId;
    this.sending = { drawingId, ops };
    let retry = false;
    let refused = false;
    try {
      const res = await this.post("ops", { drawingId, baseRev: this.rev, seq: ++this.seq, ops });
      this.failures = 0;
      this.refusal = null;
      if (drawingId === this.drawingId) {
        // "ignored" means the server already had newer changes from this page, so these were
        // not applied. They are still on screen, so rebasing sends them again.
        if (!res.ignored) this.synced = new Map(sent.map((e) => [e.id, e]));
        this.rev = res.rev;
        this.inflight = false;
        // "cleaned" means the server saved our changes in a tidier form than we sent (a size
        // past the limit, say), so the screen takes that form, without an undo step of its own.
        if (res.drawing) this.rebase(res.drawing, { record: !res.cleaned });
      }
    } catch (err) {
      if (err.status === 404) {
        refused = true;
        this.gone = drawingId === this.drawingId;
        this.handlers.status?.("error", "This drawing was deleted.");
      } else if (err.status === 400 || err.status === 413) {
        // Sending the same changes again would fail the same way, so the next edit tries again
        // (undoing, for example, can bring the drawing back under a limit).
        refused = true;
        const msg = `Not saved: ${err.message}`;
        this.handlers.status?.("error", msg);
        if (msg !== this.refusal) this.handlers.problem?.(msg);
        this.refusal = msg;
      } else {
        this.failures += 1;
        retry = true;
        this.handlers.status?.("error", this.failures <= 6 ? "Not saved yet, retrying" : "Could not save. Check that Copilot is running.");
      }
    } finally {
      this.inflight = false;
      this.sending = null;
    }
    // Changes that came before the reply, and waited for it.
    this.drainOps();
    if (retry) {
      clearTimeout(this.retryTimer);
      this.retryTimer = setTimeout(() => this.schedule(0), Math.min(8000, 400 * 2 ** this.failures));
      return false;
    }
    if (drawingId !== this.drawingId) {
      // The panel moved to another drawing while this was out. Edits made there since then
      // could not be sent during that time, so send them now.
      if (this.dirty) this.schedule();
      return !this.dirty;
    }
    this.applyDeferred();
    if (refused) return false;
    if (diffOps(this.synced, this.editor.elements)) {
      // Edits made while the request was out. A forced flush sends them now too.
      if (force) return this.flush(true);
      this.schedule();
      return false;
    }
    this.settled();
    return true;
  }

  // Best effort save when the iframe goes away. A change still on its way can reach the server
  // before or after this one. If it comes after, the server drops it (its number is lower). If
  // it comes first, this one has to undo whatever the editor no longer shows, so it also sets
  // every element that change touched to what the editor shows now.
  flushBeacon() {
    if (!this.drawingId) return;
    const elements = this.editor.elements;
    const ops = diffOps(this.synced, elements) || { upserts: [], deletes: [] };
    const out = this.sending?.drawingId === this.drawingId ? this.sending.ops : null;
    if (out) {
      const now = new Map(elements.map((e) => [e.id, e]));
      const listed = new Set([...ops.upserts.map((e) => e.id), ...ops.deletes]);
      for (const id of [...out.upserts.map((e) => e.id), ...out.deletes]) {
        if (listed.has(id)) continue;
        listed.add(id);
        if (now.has(id)) ops.upserts.push(now.get(id));
        else ops.deletes.push(id);
      }
      // Its order, or a deleted element coming back at the end, can leave the order wrong.
      if (out.order || out.deletes.some((id) => now.has(id))) ops.order = elements.map((e) => e.id);
    }
    if (!ops.upserts.length && !ops.deletes.length && !ops.order) return;
    const body = JSON.stringify({ clientId: this.clientId, drawingId: this.drawingId, seq: ++this.seq, ops });
    // Only a keepalive request is sure to arrive once the page is gone, and past the keepalive limit
    // the browser refuses it outright. Splitting it would not help, since the limit is for all of
    // them together. Any one element fits (see MAX_PEN_POINTS), and a change is saved about 60 ms
    // after it is made, so only a bulk change to a big drawing that was not saved yet (a drag of
    // many shapes that is still going on, say) is bigger. That goes as an ordinary request, which
    // can still reach the local server but is often cancelled along with the page.
    const keepalive = new TextEncoder().encode(body).length <= KEEPALIVE_BYTES;
    try {
      fetch(this.url("ops"), { method: "POST", body, keepalive, headers: { "Content-Type": "text/plain;charset=utf-8" } }).catch(() => {});
    } catch {
      // Nothing else we can do while unloading.
    }
  }

  sendSelection(ids) {
    clearTimeout(this.selTimer);
    this.selTimer = setTimeout(() => {
      this.post("selection", { drawingId: this.drawingId, ids }).catch(() => {});
    }, 150);
  }
}
