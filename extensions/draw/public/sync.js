// Keeps the editor and the extension's copy of the drawing in sync.
// Local edits are sent as small element-level ops; remote (agent) edits are merged on top of
// whatever the user has not saved yet.
import { applyOps } from "/lib/model.mjs";

export function diffOps(synced, elements) {
  const upserts = [];
  const ids = new Set();
  for (const el of elements) {
    ids.add(el.id);
    const prev = synced.get(el.id);
    if (prev !== el && (!prev || JSON.stringify(prev) !== JSON.stringify(el))) upserts.push(el);
  }
  const deletes = [...synced.keys()].filter((id) => !ids.has(id));
  // The server keeps existing ids in place and appends new ones, so only send order when that differs.
  const serverOrder = [...synced.keys()].filter((id) => ids.has(id));
  for (const el of elements) if (!synced.has(el.id)) serverOrder.push(el.id);
  const orderChanged = serverOrder.some((id, i) => id !== elements[i].id);
  if (!upserts.length && !deletes.length && !orderChanged) return null;
  const ops = { upserts, deletes };
  if (orderChanged) ops.order = elements.map((e) => e.id);
  return ops;
}

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
    this.failures = 0;
    this.retryTimer = 0;
    // Why the server refused our last changes, and why the extension cannot write this drawing
    // to disk (it still has the changes in memory). Both show as errors until they clear.
    this.refusal = null;
    this.diskError = null;
    // Set when the server says this drawing was deleted, so there is nothing left to save it to.
    this.gone = false;
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
    on("doc", ({ drawing }) => this.onRemote(drawing));
    on("list", ({ drawings }) => this.handlers.list?.(drawings));
    on("switch", ({ drawing }) => this.switchTo(drawing));
    on("export", (req) => this.handlers.exportRequest?.(req));
    on("select", ({ drawingId, ids }) => {
      if (drawingId === this.drawingId) this.handlers.select?.(ids);
    });
    on("settings", ({ settings, origin }) => {
      if (origin !== this.clientId) this.handlers.settings?.(settings);
    });
    on("save", ({ drawingId, error }) => {
      if (drawingId === this.drawingId) this.setDiskError(error);
    });
  }

  // After a reconnect we may have missed events, so fetch the latest state.
  async resync() {
    try {
      const state = await this.loadState();
      this.handlers.list?.(state.drawings);
      if (state.settings) this.handlers.settings?.(state.settings);
      if (state.drawing.id !== this.drawingId) {
        this.switchTo(state.drawing);
      } else {
        this.onRemote(state.drawing);
        this.setDiskError(state.drawing.saveError);
      }
    } catch {
      // The next reconnect will try again.
    }
  }

  onRemote(drawing) {
    if (!drawing || drawing.id !== this.drawingId || drawing.rev <= this.rev) return;
    if (this.inflight || this.editor.busy) {
      if (!this.deferred || drawing.rev > this.deferred.rev) this.deferred = drawing;
      return;
    }
    this.rebase(drawing);
  }

  // Replaces our base with the remote doc and re-applies unsaved local changes on top.
  rebase(drawing) {
    const pending = diffOps(this.synced, this.editor.elements);
    this.synced = new Map(drawing.elements.map((e) => [e.id, e]));
    this.rev = drawing.rev;
    this.deferred = null;
    // No element cap here. Going over it makes the server refuse the save and say why, which is
    // better than the user's newest elements quietly disappearing.
    const next = pending ? applyOps(drawing.elements, pending, Infinity) : drawing.elements;
    this.editor.applyRemote(next, drawing);
    if (pending) this.schedule();
  }

  // Shows another drawing. Edits on screen that are not saved yet would be lost, so when they
  // cannot be saved first, the panel stays on this drawing, tells the server so, and resolves
  // false, and the unsaved handler lets the user discard them. `discard` skips that check.
  // A deleted drawing has nowhere left to save to, so it never holds the panel.
  async switchTo(drawing, { discard = false } = {}) {
    if (!discard && !(await this.flush(true)) && !this.gone) {
      // The server has already moved this panel to the other drawing, so move it back.
      this.post("drawings", { action: "open", id: this.drawingId })
        .then(() => this.sendSelection([...this.editor.selection]))
        .catch(() => {});
      this.handlers.unsaved?.(drawing);
      return false;
    }
    this.setDoc(drawing);
    this.handlers.switched?.(drawing);
    // Messages about the last drawing do not apply to this one.
    this.refusal = null;
    this.diskError = null;
    this.setDiskError(drawing.saveError);
    if (!this.diskError) this.settled();
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
    if (this.deferred && !this.inflight) {
      const d = this.deferred;
      this.deferred = null;
      if (d.rev > this.rev) this.rebase(d);
    }
    this.schedule();
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
        if (res.drawing) this.rebase(res.drawing);
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
    if (this.deferred && !this.editor.busy) {
      const d = this.deferred;
      this.deferred = null;
      if (d.rev > this.rev) this.rebase(d);
    }
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
    try {
      fetch(this.url("ops"), { method: "POST", body, keepalive: true, headers: { "Content-Type": "text/plain;charset=utf-8" } }).catch(() => {});
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
