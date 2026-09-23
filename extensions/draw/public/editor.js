// Editor core: elements, selection, view, history, rendering and element-level commands.
import {
  isShape, snap, clamp, normalizeElement, normalizeElements, removeWithArrows, newId, idPrefix,
  PEN_WIDTHS, SHAPE_TYPES,
} from "/lib/model.mjs";
import { renderElements, renderStandaloneSVG, outline, penPath } from "/lib/render.mjs";
import { fmt, arrowGeometry, elementBounds, contentBounds, unionBounds, neededHeight } from "/lib/geometry.mjs";
import { findFreeSpot } from "/lib/layout.mjs";

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;
const HISTORY_LIMIT = 200;
const round = (v) => Math.round(v * 100) / 100;
export const STYLE_KEYS = {
  shape: ["color", "fill", "dash", "size", "type"],
  text: ["color", "size"],
  arrow: ["color", "dash", "head", "route", "size"],
  pen: ["color", "width"],
};

export const categoryOf = (el) => (isShape(el) ? "shape" : el.type);
const sameElements = (a, b) => a === b || (a.length === b.length && a.every((e, i) => e === b[i]));

export function translateElement(el, dx, dy) {
  if (el.type === "pen") return { ...el, points: el.points.map(([x, y]) => [round(x + dx), round(y + dy)]) };
  if (el.type === "arrow") {
    const next = { ...el };
    if (!el.from) { next.x1 = round(el.x1 + dx); next.y1 = round(el.y1 + dy); }
    if (!el.to) { next.x2 = round(el.x2 + dx); next.y2 = round(el.y2 + dy); }
    return next;
  }
  return { ...el, x: round(el.x + dx), y: round(el.y + dy) };
}

export class Editor {
  constructor(dom, theme) {
    Object.assign(this, dom);
    this.theme = theme;
    this.elements = [];
    this.byId = new Map();
    this.selection = new Set();
    this.tool = "select";
    this.view = { x: 0, y: 0, zoom: 1 };
    this.history = [];
    this.future = [];
    this.handlers = new Map();
    this.interaction = null;
    this.changeStart = null;
    this.editing = null;
    this.hover = null;
    this.hoverHandle = null;
    this.target = null;
    this.marquee = null;
    this.guides = [];
    this.preview = null;
    this.spaceDown = false;
    this.lastPointer = null;
    this.lastDirection = "right";
    this.contentDirty = true;
    this.raf = 0;
    this.styles = {
      shape: { color: "gray", fill: "soft", dash: false, size: "m" },
      text: { color: "gray", size: "l" },
      arrow: { color: "gray", dash: false, head: "end", route: "straight", size: "s" },
      pen: { color: "gray", width: PEN_WIDTHS.m },
    };
    new ResizeObserver(() => {
      if (this.needsFit && this.stage.clientWidth && this.stage.clientHeight) {
        this.needsFit = false;
        this.fit();
      }
      this.requestRender();
    }).observe(this.stage);
  }

  get measure() { return this.theme.measure; }
  get paint() { return this.theme.paint; }
  get busy() { return !!(this.interaction || this.editing); }

  on(name, fn) {
    if (!this.handlers.has(name)) this.handlers.set(name, new Set());
    this.handlers.get(name).add(fn);
  }

  emit(name, data) {
    for (const fn of this.handlers.get(name) || []) fn(data);
  }

  // ---------- elements and history ----------

  setElements(next, { record = true, emit = true } = {}) {
    if (next === this.elements) return;
    if (record && !this.changeStart) this.pushHistory(this.elements);
    this.elements = next;
    this.byId = new Map(next.map((e) => [e.id, e]));
    let pruned = false;
    for (const id of this.selection) if (!this.byId.has(id)) { this.selection.delete(id); pruned = true; }
    if (this.hover && !this.byId.has(this.hover)) this.hover = null;
    this.contentDirty = true;
    this.requestRender();
    if (pruned) this.emit("selection");
    if (emit) this.emit("change");
  }

  replaceElement(el, opts) {
    this.setElements(this.elements.map((e) => (e.id === el.id ? el : e)), opts);
  }

  upsertElement(el, opts) {
    if (this.byId.has(el.id)) this.replaceElement(el, opts);
    else this.setElements([...this.elements, el], opts);
  }

  pushHistory(snapshot) {
    this.history.push(snapshot);
    if (this.history.length > HISTORY_LIMIT) this.history.shift();
    this.future = [];
    this.emit("history");
  }

  beginInteraction(it) {
    this.interaction = it;
    this.changeStart = this.elements;
    this.requestRender();
  }

  // record: false leaves the undo point to a label edit that follows (creation + typing = one step).
  endInteraction({ revert = false, record = true } = {}) {
    const start = this.changeStart;
    this.changeStart = null;
    this.interaction = null;
    this.guides = [];
    this.target = null;
    this.marquee = null;
    this.preview = null;
    if (revert && start) this.setElements(start, { record: false });
    else if (record && start && !sameElements(start, this.elements)) this.pushHistory(start);
    this.contentDirty = true;
    this.requestRender();
    this.emit("change");
    this.emit("idle");
  }

  undo() {
    if (this.busy) return;
    const prev = this.history.pop();
    if (!prev) return;
    this.future.push(this.elements);
    this.setElements(prev, { record: false });
    this.emit("history");
  }

  redo() {
    if (this.busy) return;
    const next = this.future.pop();
    if (!next) return;
    this.history.push(this.elements);
    this.setElements(next, { record: false });
    this.emit("history");
  }

  load(doc) {
    this.cancelPointer?.();
    if (this.editing) this.labels.close();
    this.elements = doc.elements;
    this.byId = new Map(doc.elements.map((e) => [e.id, e]));
    this.selection = new Set();
    this.history = [];
    this.future = [];
    this.hover = null;
    this.contentDirty = true;
    this.fit();
    this.emit("history");
    this.emit("selection");
    this.emit("change", { loaded: true });
  }

  // Remote (agent) changes: undoable, and new content is brought into view.
  applyRemote(next) {
    const before = this.elements;
    if (before.length === next.length && JSON.stringify(before) === JSON.stringify(next)) return;
    const known = new Set(before.map((e) => e.id));
    this.setElements(next, { record: true });
    const added = next.filter((e) => !known.has(e.id));
    if (!before.length) this.fit();
    else if (added.length && !this.isVisible(added)) this.fit({ maxZoom: this.view.zoom });
  }

  // ---------- creation helpers ----------

  newShape(type, props = {}) {
    return normalizeElement({ ...this.styles.shape, id: newId(idPrefix(type)), type, ...props });
  }

  newText(props = {}) {
    return normalizeElement({ ...this.styles.text, id: newId("t"), type: "text", text: "", ...props });
  }

  newArrow(props = {}) {
    return normalizeElement({ ...this.styles.arrow, id: newId("a"), type: "arrow", ...props });
  }

  obstacles(exclude = null) {
    return this.elements
      .filter((e) => e.type !== "arrow" && e.id !== exclude)
      .map((e) => elementBounds(e, this.byId, this.measure))
      .filter(Boolean);
  }

  // Adds a copy of a shape next to it in a direction, connected with an arrow, and edits its label.
  addConnected(sourceId, dir = "right", { from = sourceId, anchorId = sourceId } = {}) {
    const src = this.byId.get(sourceId);
    const anchor = this.byId.get(anchorId);
    if (!src || !isShape(src) || !anchor) return null;
    const gap = dir === "left" || dir === "right" ? 80 : 60;
    const spot = findFreeSpot(anchor, dir, src.w, src.h, this.obstacles(), gap);
    const shape = normalizeElement({ ...src, id: newId(idPrefix(src.type)), text: "", x: snap(spot.x), y: snap(spot.y) });
    const next = [...this.elements, shape];
    if (from) next.push(this.newArrow({ from, to: shape.id }));
    const before = this.elements;
    this.setElements(next, { record: false });
    this.lastDirection = dir;
    this.select([shape.id]);
    this.ensureVisible([shape]);
    this.labels.open(shape.id, { fresh: true, before });
    return shape;
  }

  // Shift+Tab: another child of the same parent (or a plain copy below when there is no parent).
  addSibling(id) {
    const s = this.byId.get(id);
    if (!s || !isShape(s)) return null;
    const incoming = this.elements.find((e) => e.type === "arrow" && e.to === id && e.from);
    const across = this.lastDirection === "down" || this.lastDirection === "up" ? "right" : "down";
    return this.addConnected(id, across, { from: incoming ? incoming.from : null });
  }

  // ---------- selection ----------

  selected() {
    return this.elements.filter((e) => this.selection.has(e.id));
  }

  single() {
    return this.selection.size === 1 ? this.byId.get([...this.selection][0]) || null : null;
  }

  select(ids, { toggle = false, add = false } = {}) {
    const next = toggle || add ? new Set(this.selection) : new Set();
    for (const id of ids) {
      if (!this.byId.has(id)) continue;
      if (toggle && next.has(id)) next.delete(id);
      else next.add(id);
    }
    if (next.size === this.selection.size && [...next].every((id) => this.selection.has(id))) return;
    this.selection = next;
    this.requestRender();
    this.emit("selection");
  }

  selectAll() {
    this.setTool("select");
    this.select(this.elements.map((e) => e.id));
  }

  deleteSelection() {
    if (!this.selection.size) return;
    this.setElements(removeWithArrows(this.elements, [...this.selection]).elements);
  }

  nudge(dx, dy) {
    if (!this.selection.size) return;
    this.setElements(this.elements.map((e) => (this.selection.has(e.id) ? translateElement(e, dx, dy) : e)));
  }

  reorder(toFront) {
    if (!this.selection.size) return;
    const picked = this.elements.filter((e) => this.selection.has(e.id));
    const rest = this.elements.filter((e) => !this.selection.has(e.id));
    this.setElements(toFront ? [...rest, ...picked] : [...picked, ...rest]);
  }

  // Copies of elements with fresh ids. Arrow ends bound outside the set become free ends.
  cloneSet(list, dx, dy) {
    const ids = new Map(list.map((e) => [e.id, newId(idPrefix(e.type))]));
    const byId = new Map([...this.byId, ...list.map((e) => [e.id, e])]);
    const out = [];
    for (const el of list) {
      let copy = { ...el, id: ids.get(el.id) };
      if (el.type === "arrow") {
        const g = arrowGeometry(el, byId);
        if (!g) continue;
        copy.from = ids.get(el.from) || null;
        copy.to = ids.get(el.to) || null;
        if (!copy.from) { copy.x1 = round(g.start.x); copy.y1 = round(g.start.y); }
        if (!copy.to) { copy.x2 = round(g.end.x); copy.y2 = round(g.end.y); }
      }
      copy = normalizeElement(translateElement(copy, dx, dy));
      if (copy) out.push(copy);
    }
    return out;
  }

  duplicate() {
    const list = this.selected();
    if (!list.length) return;
    const copies = this.cloneSet(list, 20, 20);
    this.setElements([...this.elements, ...copies]);
    this.select(copies.map((e) => e.id));
  }

  copyText() {
    const list = this.selected();
    if (!list.length) return null;
    return JSON.stringify({ type: "copilot-draw", version: 1, elements: this.cloneSet(list, 0, 0) });
  }

  paste(text) {
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      // Plain text.
    }
    const p = this.lastPointer || this.viewCenter();
    if (data && data.type === "copilot-draw" && Array.isArray(data.elements)) {
      const list = normalizeElements(data.elements);
      if (!list.length) return;
      const b = contentBounds(list, this.measure);
      const dx = snap(p.x - (b.x + b.w / 2));
      const dy = snap(p.y - (b.y + b.h / 2));
      const copies = this.cloneSet(list, dx, dy);
      this.setElements([...this.elements, ...copies]);
      this.select(copies.map((e) => e.id));
      return;
    }
    const str = String(text).trim();
    if (!str) return;
    const el = this.newText({ text: str.slice(0, 4000), x: snap(p.x), y: snap(p.y) });
    this.setElements([...this.elements, el]);
    this.select([el.id]);
  }

  // ---------- styles ----------

  toolCategory() {
    if (SHAPE_TYPES.includes(this.tool)) return "shape";
    return ["text", "arrow", "pen"].includes(this.tool) ? this.tool : null;
  }

  // Patch keys: color, fill, dash, head, route, size, width, type. Only keys that fit each element apply.
  applyStyle(patch) {
    const sel = this.selected();
    const pick = (cat) => Object.fromEntries(Object.entries(patch).filter(([k]) => STYLE_KEYS[cat].includes(k)));
    if (sel.length) {
      const next = this.elements.map((el) => {
        if (!this.selection.has(el.id)) return el;
        const p = pick(categoryOf(el));
        if (!Object.keys(p).length) return el;
        let out = normalizeElement({ ...el, ...p }) || el;
        if (isShape(out)) {
          const need = Math.ceil(neededHeight(out, this.measure) / 10) * 10;
          if (need > out.h) out = { ...out, y: round(out.y - (need - out.h) / 2), h: need };
        }
        return out;
      });
      this.setElements(next);
      for (const el of sel) {
        const { type, ...rest } = pick(categoryOf(el));
        Object.assign(this.styles[categoryOf(el)], rest);
      }
    } else {
      const cat = this.toolCategory();
      if (cat) {
        const { type, ...rest } = pick(cat);
        Object.assign(this.styles[cat], rest);
      }
    }
    this.emit("style");
  }

  setTool(tool) {
    if (tool === this.tool) return;
    if (this.editing) this.labels.commit();
    this.tool = tool;
    if (tool !== "select") this.hover = null;
    this.requestRender();
    this.emit("tool", tool);
  }

  setTheme(theme) {
    this.theme = theme;
    this.contentDirty = true;
    this.requestRender();
  }

  refresh() {
    this.contentDirty = true;
    this.requestRender();
  }

  // ---------- view ----------

  viewport() {
    const r = this.stage.getBoundingClientRect();
    return { w: r.width, h: r.height, left: r.left, top: r.top };
  }

  toWorld(clientX, clientY) {
    const r = this.stage.getBoundingClientRect();
    return { x: (clientX - r.left) / this.view.zoom + this.view.x, y: (clientY - r.top) / this.view.zoom + this.view.y };
  }

  toScreen(x, y) {
    return { x: (x - this.view.x) * this.view.zoom, y: (y - this.view.y) * this.view.zoom };
  }

  viewCenter() {
    const { w, h } = this.viewport();
    return { x: this.view.x + w / 2 / this.view.zoom, y: this.view.y + h / 2 / this.view.zoom };
  }

  setView(view) {
    this.view = view;
    this.requestRender();
    this.emit("view");
  }

  panBy(dx, dy) {
    this.setView({ ...this.view, x: this.view.x + dx / this.view.zoom, y: this.view.y + dy / this.view.zoom });
  }

  zoomAt(factor, sx, sy) {
    const z0 = this.view.zoom;
    const z = clamp(z0 * factor, MIN_ZOOM, MAX_ZOOM);
    const wx = sx / z0 + this.view.x;
    const wy = sy / z0 + this.view.y;
    this.setView({ zoom: z, x: wx - sx / z, y: wy - sy / z });
  }

  zoomBy(factor) {
    const { w, h } = this.viewport();
    this.zoomAt(factor, w / 2, h / 2);
  }

  zoomTo(z) {
    this.zoomBy(z / this.view.zoom);
  }

  // Room left for the floating tool rail, style bar and zoom controls.
  insets() {
    return { l: 64, r: 24, t: 56, b: 52 };
  }

  fitBounds(b, maxZoom = 1) {
    const { w, h } = this.viewport();
    if (!w || !h) return;
    const m = this.insets();
    const aw = Math.max(80, w - m.l - m.r);
    const ah = Math.max(80, h - m.t - m.b);
    const zoom = clamp(Math.min(aw / Math.max(b.w, 1), ah / Math.max(b.h, 1), maxZoom), MIN_ZOOM, MAX_ZOOM);
    const cx = m.l + aw / 2;
    const cy = m.t + ah / 2;
    this.setView({ zoom, x: b.x + b.w / 2 - cx / zoom, y: b.y + b.h / 2 - cy / zoom });
  }

  fit({ maxZoom = 1 } = {}) {
    const { w, h } = this.viewport();
    if (!w || !h) {
      this.needsFit = true;
      return;
    }
    const b = contentBounds(this.elements, this.measure);
    if (b) return this.fitBounds(b, maxZoom);
    this.setView({ zoom: 1, x: -Math.round(w / 2), y: -Math.round(h / 2) });
  }

  isVisible(list) {
    const b = unionBounds(list.map((e) => elementBounds(e, this.byId, this.measure)));
    if (!b) return true;
    const { w, h } = this.viewport();
    const z = this.view.zoom;
    const v = { x: this.view.x, y: this.view.y, w: w / z, h: h / z };
    return b.x >= v.x && b.y >= v.y && b.x + b.w <= v.x + v.w && b.y + b.h <= v.y + v.h;
  }

  ensureVisible(list) {
    if (this.isVisible(list)) return;
    const b = unionBounds(list.map((e) => elementBounds(e, this.byId, this.measure)));
    if (!b) return;
    const { w, h } = this.viewport();
    const z = this.view.zoom;
    if (b.w * z < w - 120 && b.h * z < h - 120) {
      this.setView({ zoom: z, x: b.x + b.w / 2 - w / 2 / z, y: b.y + b.h / 2 - h / 2 / z });
    } else {
      this.fitBounds(b, z);
    }
  }

  // ---------- export ----------

  exportSVG({ background = true } = {}) {
    return renderStandaloneSVG(this.elements, {
      measure: this.measure,
      paint: this.paint,
      fontFamily: this.theme.font,
      background: background ? this.theme.bg : null,
    });
  }

  async exportPNG(scale = 2, maxSide = 8000) {
    const svg = this.exportSVG();
    const m = /width="(\d+)" height="(\d+)"/.exec(svg);
    const w = Number(m[1]);
    const h = Number(m[2]);
    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    await img.decode();
    const k = Math.min(scale, maxSide / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * k));
    canvas.height = Math.max(1, Math.round(h * k));
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create the PNG."))), "image/png"));
  }

  // ---------- handles ----------

  handles() {
    const it = this.interaction;
    if (this.editing || (it && it.kind !== "resize" && it.kind !== "endpoint")) return [];
    const out = [];
    const one = this.single();
    if (one && isShape(one)) {
      for (const [which, x, y] of [["nw", one.x, one.y], ["ne", one.x + one.w, one.y], ["sw", one.x, one.y + one.h], ["se", one.x + one.w, one.y + one.h]]) {
        out.push({ kind: "resize", id: one.id, which, x, y, r: 4 });
      }
    } else if (one && one.type === "arrow") {
      const g = arrowGeometry(one, this.byId);
      if (g) {
        out.push({ kind: "end", id: one.id, which: "start", x: g.start.x, y: g.start.y, r: 5, bound: !!one.from });
        out.push({ kind: "end", id: one.id, which: "end", x: g.end.x, y: g.end.y, r: 5, bound: !!one.to });
      }
    }
    if (!it && this.tool === "select") {
      const id = this.hover || (one && isShape(one) ? one.id : null);
      const s = id ? this.byId.get(id) : null;
      const z = this.view.zoom;
      if (s && isShape(s) && s.w * z >= 30 && s.h * z >= 20) {
        const off = 20 / z;
        out.push(
          { kind: "connect", id: s.id, which: "right", x: s.x + s.w + off, y: s.y + s.h / 2, r: 8 },
          { kind: "connect", id: s.id, which: "down", x: s.x + s.w / 2, y: s.y + s.h + off, r: 8 },
          { kind: "connect", id: s.id, which: "left", x: s.x - off, y: s.y + s.h / 2, r: 8 },
          { kind: "connect", id: s.id, which: "up", x: s.x + s.w / 2, y: s.y - off, r: 8 },
        );
      }
    }
    return out;
  }

  handleAt(sx, sy) {
    const list = this.handles();
    for (let i = list.length - 1; i >= 0; i--) {
      const h = list[i];
      const p = this.toScreen(h.x, h.y);
      if (Math.hypot(p.x - sx, p.y - sy) <= h.r + 4) return h;
    }
    return null;
  }

  // ---------- rendering ----------

  requestRender() {
    if (!this.raf) this.raf = requestAnimationFrame(() => this.render());
  }

  render() {
    this.raf = 0;
    const { x, y, zoom } = this.view;
    this.world.setAttribute("transform", `scale(${zoom}) translate(${fmt(-x)} ${fmt(-y)})`);
    if (this.contentDirty) {
      this.content.innerHTML = renderElements(this.elements, {
        measure: this.measure,
        paint: this.paint,
        hideText: this.editing ? this.editing.id : null,
      });
      this.contentDirty = false;
    }
    this.overlay.innerHTML = this.renderOverlay();
    let step = 20;
    while (step * zoom < 12) step *= 5;
    const px = step * zoom;
    this.stage.style.backgroundSize = `${px}px ${px}px`;
    this.stage.style.backgroundPosition = `${-x * zoom}px ${-y * zoom}px`;
    this.emit("render");
  }

  renderOverlay() {
    const u = 1 / this.view.zoom;
    const A = this.theme.accent;
    const bg = this.theme.bg;
    const sw = (px) => fmt(px * u);
    const box = (b, pad, attrs) =>
      `<rect x="${fmt(b.x - pad)}" y="${fmt(b.y - pad)}" width="${fmt(b.w + 2 * pad)}" height="${fmt(b.h + 2 * pad)}" ${attrs}/>`;
    const parts = [];
    if (this.preview) {
      const p = this.preview;
      parts.push(`<path d="${penPath(p.points)}" fill="none" stroke="${this.paint(p.color, "stroke")}" stroke-width="${fmt(p.width)}" stroke-linecap="round" stroke-linejoin="round"/>`);
    }
    const hovered = this.hover && !this.selection.has(this.hover) && !this.interaction ? this.byId.get(this.hover) : null;
    if (hovered) parts.push(outline(hovered, ` fill="none" stroke="${A}" stroke-width="${sw(1.5)}" opacity="0.45"`));
    const target = this.target ? this.byId.get(this.target) : null;
    if (target) parts.push(outline(target, ` fill="${A}" fill-opacity="0.08" stroke="${A}" stroke-width="${sw(2)}"`));
    const sel = this.selected();
    for (const el of sel) {
      if (el.type === "arrow") {
        const g = arrowGeometry(el, this.byId);
        if (g) parts.push(`<path d="${g.d}" fill="none" stroke="${A}" stroke-width="${sw(1.5)}" stroke-dasharray="${sw(4)} ${sw(3)}" stroke-linecap="round"/>`);
        continue;
      }
      const b = elementBounds(el, this.byId, this.measure);
      if (b) parts.push(box(b, 4 * u, `fill="none" stroke="${A}" stroke-width="${sw(1.5)}" rx="${sw(3)}"`));
    }
    if (sel.length > 1 && this.interaction?.kind !== "move") {
      const b = unionBounds(sel.map((e) => elementBounds(e, this.byId, this.measure)));
      if (b) parts.push(box(b, 10 * u, `fill="none" stroke="${A}" stroke-width="${sw(1)}" stroke-dasharray="${sw(4)} ${sw(4)}"`));
    }
    for (const h of this.handles()) parts.push(this.renderHandle(h, u, A, bg));
    if (this.marquee) parts.push(box(this.marquee, 0, `fill="${A}" fill-opacity="0.07" stroke="${A}" stroke-width="${sw(1)}"`));
    for (const g of this.guides) {
      parts.push(`<line x1="${fmt(g.x1)}" y1="${fmt(g.y1)}" x2="${fmt(g.x2)}" y2="${fmt(g.y2)}" stroke="${A}" stroke-width="${sw(1)}" stroke-dasharray="${sw(3)} ${sw(3)}"/>`);
    }
    return parts.join("");
  }

  renderHandle(h, u, A, bg) {
    const r = h.r * u;
    const x = fmt(h.x);
    const y = fmt(h.y);
    if (h.kind === "resize") {
      return `<rect x="${fmt(h.x - r)}" y="${fmt(h.y - r)}" width="${fmt(2 * r)}" height="${fmt(2 * r)}" rx="${fmt(1.5 * u)}" fill="${bg}" stroke="${A}" stroke-width="${fmt(1.5 * u)}"/>`;
    }
    if (h.kind === "end") {
      return `<circle cx="${x}" cy="${y}" r="${fmt(r)}" fill="${h.bound ? A : bg}" stroke="${A}" stroke-width="${fmt(1.5 * u)}"/>`;
    }
    const hot = this.hoverHandle === `${h.kind}:${h.id}:${h.which}`;
    const arm = 3.5 * u;
    return `<g opacity="${hot ? 1 : 0.8}"><circle cx="${x}" cy="${y}" r="${fmt(r)}" fill="${hot ? A : bg}" stroke="${A}" stroke-width="${fmt(1.25 * u)}"/>` +
      `<path d="M${fmt(h.x - arm)} ${y}H${fmt(h.x + arm)}M${x} ${fmt(h.y - arm)}V${fmt(h.y + arm)}" stroke="${hot ? bg : A}" stroke-width="${fmt(1.5 * u)}" stroke-linecap="round"/></g>`;
  }
}
