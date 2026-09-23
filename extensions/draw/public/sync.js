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
    this.timer = 0;
    this.deferred = null;
    this.failures = 0;
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
  }

  // After a reconnect we may have missed events, so fetch the latest state.
  async resync() {
    try {
      const state = await this.loadState();
      this.handlers.list?.(state.drawings);
      if (state.settings) this.handlers.settings?.(state.settings);
      if (state.drawing.id !== this.drawingId) this.switchTo(state.drawing);
      else this.onRemote(state.drawing);
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
    const next = pending ? applyOps(drawing.elements, pending) : drawing.elements;
    this.editor.applyRemote(next, drawing);
    if (pending) this.schedule();
  }

  async switchTo(drawing) {
    await this.flush(true);
    this.setDoc(drawing);
    this.handlers.switched?.(drawing);
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

  async flush(force = false) {
    if (this.inflight) {
      if (force) while (this.inflight) await sleep(30);
      else return;
    }
    if (!this.drawingId || (!force && this.editor.busy)) return;
    const sent = this.editor.elements;
    const ops = diffOps(this.synced, sent);
    if (!ops) {
      this.handlers.status?.("saved");
      return;
    }
    this.inflight = true;
    this.handlers.status?.("saving");
    const drawingId = this.drawingId;
    let retry = false;
    try {
      const res = await this.post("ops", { drawingId, baseRev: this.rev, ops });
      this.failures = 0;
      if (drawingId === this.drawingId) {
        this.synced = new Map(sent.map((e) => [e.id, e]));
        this.rev = res.rev;
        this.inflight = false;
        if (res.drawing) this.rebase(res.drawing);
      }
    } catch (err) {
      if (err.status === 404) {
        this.handlers.status?.("error", "This drawing was deleted.");
      } else {
        this.failures += 1;
        retry = this.failures <= 6;
        this.handlers.status?.("error", retry ? "Not saved yet, retrying" : "Could not save. Check that Copilot is running.");
      }
    } finally {
      this.inflight = false;
    }
    if (retry) {
      setTimeout(() => this.schedule(0), Math.min(8000, 400 * 2 ** this.failures));
      return;
    }
    if (drawingId !== this.drawingId) return;
    if (this.deferred && !this.editor.busy) {
      const d = this.deferred;
      this.deferred = null;
      if (d.rev > this.rev) this.rebase(d);
    }
    if (diffOps(this.synced, this.editor.elements)) this.schedule();
    else this.handlers.status?.("saved");
  }

  // Best effort save when the iframe goes away.
  flushBeacon() {
    if (!this.drawingId) return;
    const ops = diffOps(this.synced, this.editor.elements);
    if (!ops) return;
    const body = JSON.stringify({ clientId: this.clientId, drawingId: this.drawingId, ops });
    try {
      fetch(this.url("ops"), { method: "POST", body, keepalive: true, headers: { "Content-Type": "text/plain;charset=utf-8" } });
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
