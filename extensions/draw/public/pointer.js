// Pointer input: select, move, resize, connect, create, draw, pan and zoom.
import { isShape, snap, clamp, newId, idPrefix, normalizeElement, DEFAULT_SIZES, SHAPE_TYPES, MAX_SIDE } from "/lib/model.mjs";
import {
  hitTest, shapeAt, pointInShape, elementBounds, unionBounds, boxContains, arrowGeometry, lineHeight, fontSizeOf,
} from "/lib/geometry.mjs";
import { translateElement } from "./editor.js";

const DRAG = 3;
const DOUBLE_MS = 400;
const r2 = (v) => Math.round(v * 100) / 100;

// Ramer-Douglas-Peucker simplification for pen strokes.
function simplify(points, eps) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    let max = 0;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      const d = len < 1e-6 ? Math.hypot(px - ax, py - ay) : Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
      if (d > max) { max = d; idx = i; }
    }
    if (idx > 0 && max > eps) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function snapAxis(pos, size, cands, th) {
  let best = null;
  for (const off of [0, size / 2, size]) {
    for (const c of cands) {
      const d = c.v - (pos + off);
      if (Math.abs(d) <= th && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, v: c.v };
    }
  }
  return best;
}

function guideLine(axis, v, box, cands) {
  const all = unionBounds([box, ...cands.filter((c) => Math.abs(c.v - v) < 0.5).map((c) => c.b)]);
  return axis === "x"
    ? { x1: v, y1: all.y - 8, x2: v, y2: all.y + all.h + 8 }
    : { x1: all.x - 8, y1: v, x2: all.x + all.w + 8, y2: v };
}

export function attachPointer(ed) {
  const svg = ed.svg;
  let it = null;
  let lastClick = null;
  let cursor = "";

  const local = (e) => {
    const r = ed.stage.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const tol = () => 4 / ed.view.zoom;
  const grid = (v, e) => (e.altKey ? r2(v) : snap(v));

  function setCursor(c) {
    if (c !== cursor) svg.style.cursor = cursor = c;
  }

  function cursorFor(h, hit) {
    if (it) {
      if (it.kind === "pan") return "grabbing";
      if (it.kind === "move") return "move";
      if (it.kind === "resize") return it.cursor;
      if (it.kind === "marquee" || it.kind === "dbl") return "default";
      return it.kind === "text" ? "text" : "crosshair";
    }
    if (ed.spaceDown || ed.tool === "hand") return "grab";
    if (ed.tool === "text") return "text";
    if (ed.tool !== "select") return "crosshair";
    if (h) {
      if (h.kind === "resize") return h.which === "nw" || h.which === "se" ? "nwse-resize" : "nesw-resize";
      return h.kind === "connect" ? "pointer" : "grab";
    }
    return hit ? "move" : "default";
  }

  function hoverAt(s, p) {
    if (ed.tool !== "select" || ed.editing || ed.spaceDown) {
      setHover(null, null);
      setCursor(cursorFor(null, null));
      return;
    }
    const h = ed.handleAt(s.x, s.y);
    let hover = null;
    let hit = null;
    if (h) {
      hover = h.kind === "connect" ? h.id : ed.hover;
    } else {
      hit = hitTest(ed.elements, p.x, p.y, tol(), ed.measure);
      if (hit && isShape(hit)) hover = hit.id;
      else if (!hit && ed.hover) {
        const cur = ed.byId.get(ed.hover);
        if (cur && pointInShape(cur, p.x, p.y, 34 / ed.view.zoom)) hover = cur.id;
      }
    }
    setHover(hover, h ? `${h.kind}:${h.id}:${h.which}` : null);
    setCursor(cursorFor(h, hit));
  }

  function setHover(id, handle) {
    if (id === ed.hover && handle === ed.hoverHandle) return;
    ed.hover = id;
    ed.hoverHandle = handle;
    ed.requestRender();
  }

  ed.refreshCursor = () => setCursor(cursorFor(null, null));

  function begin(next, e) {
    it = next;
    try {
      svg.setPointerCapture(e.pointerId);
    } catch {
      // The pointer may already be gone.
    }
    setHover(it.kind === "connect" ? ed.hover : null, null);
    ed.beginInteraction(it);
    setCursor(cursorFor(null, null));
  }

  function down(e) {
    if (it || (e.button !== 0 && e.button !== 1)) return;
    e.preventDefault();
    if (ed.editing) ed.labels.commit({ refocus: false });
    ed.focusCanvas();
    const s = local(e);
    const p = ed.toWorld(e.clientX, e.clientY);
    ed.lastPointer = p;
    const base = { pointerId: e.pointerId, sx: s.x, sy: s.y, start: p, moved: false };
    if (e.button === 1 || ed.spaceDown || ed.tool === "hand") return begin({ ...base, kind: "pan", view: { ...ed.view } }, e);

    const now = performance.now();
    const dbl = !!lastClick && now - lastClick.t < DOUBLE_MS && Math.hypot(s.x - lastClick.x, s.y - lastClick.y) < 6;
    lastClick = dbl ? null : { t: now, x: s.x, y: s.y };
    const tool = ed.tool;

    if (tool === "select") {
      const h = ed.handleAt(s.x, s.y);
      if (h) {
        lastClick = null;
        return beginHandle(h, base, e);
      }
      const hit = hitTest(ed.elements, p.x, p.y, tol(), ed.measure);
      if (dbl) return begin({ ...base, kind: "dbl", hit: hit ? hit.id : null }, e);
      if (hit) {
        if (e.shiftKey) {
          ed.select([hit.id], { toggle: true });
          if (!ed.selection.has(hit.id)) return;
        } else if (!ed.selection.has(hit.id)) {
          ed.select([hit.id]);
        }
        return begin({ ...base, kind: "move", hit: hit.id, shift: e.shiftKey }, e);
      }
      if (!e.shiftKey) ed.select([]);
      return begin({ ...base, kind: "marquee", baseSel: e.shiftKey ? [...ed.selection] : [] }, e);
    }
    if (tool === "text") return begin({ ...base, kind: "text" }, e);
    if (tool === "pen") {
      begin({ ...base, kind: "pen", points: [[r2(p.x), r2(p.y)]] }, e);
      ed.preview = { points: it.points, color: ed.styles.pen.color, width: ed.styles.pen.width };
      return;
    }
    if (tool === "arrow") {
      const from = e.altKey ? null : shapeAt(ed.elements, p.x, p.y, tol());
      return begin({ ...base, kind: "arrow", from: from ? from.id : null, x1: grid(p.x, e), y1: grid(p.y, e) }, e);
    }
    if (SHAPE_TYPES.includes(tool)) return begin({ ...base, kind: "create", type: tool }, e);
  }

  function beginHandle(h, base, e) {
    const el = ed.byId.get(h.id);
    if (!el) return;
    if (h.kind === "resize") {
      const cursorName = h.which === "nw" || h.which === "se" ? "nwse-resize" : "nesw-resize";
      return begin({ ...base, kind: "resize", which: h.which, orig: el, cursor: cursorName }, e);
    }
    if (h.kind === "end") return begin({ ...base, kind: "endpoint", which: h.which, orig: el }, e);
    return begin({ ...base, kind: "connect", src: el.id, dir: h.which, arrowId: null }, e);
  }

  function move(e) {
    const s = local(e);
    const p = ed.toWorld(e.clientX, e.clientY);
    ed.lastPointer = p;
    if (!it) return hoverAt(s, p);
    if (e.pointerId !== it.pointerId) return;
    if (it.kind === "pen") return drawPen(e);
    if (!it.moved && Math.hypot(s.x - it.sx, s.y - it.sy) < DRAG) return;
    it.moved = true;
    if (it.kind === "pan") {
      const z = it.view.zoom;
      ed.setView({ zoom: z, x: it.view.x - (s.x - it.sx) / z, y: it.view.y - (s.y - it.sy) / z });
      return;
    }
    const fn = { move: dragMove, marquee: dragMarquee, resize: dragResize, endpoint: dragEndpoint, connect: dragConnect, arrow: dragArrow, create: dragCreate }[it.kind];
    if (fn) fn(p, e);
    ed.requestRender();
  }

  function drawPen(e) {
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    const min = 0.75 / ed.view.zoom;
    for (const ev of events.length ? events : [e]) {
      const q = ed.toWorld(ev.clientX, ev.clientY);
      const last = it.points[it.points.length - 1];
      if (Math.hypot(q.x - last[0], q.y - last[1]) >= min) it.points.push([r2(q.x), r2(q.y)]);
    }
    it.moved = true;
    ed.requestRender();
  }

  function dragMove(p, e) {
    if (!it.orig) {
      it.orig = ed.elements;
      it.ids = new Set(ed.selection);
      const moving = it.orig.filter((el) => it.ids.has(el.id));
      const boxes = (list) => list.map((el) => elementBounds(el, ed.byId, ed.measure));
      it.box = unionBounds(boxes(moving.filter((el) => el.type !== "arrow"))) || unionBounds(boxes(moving));
      it.xs = [];
      it.ys = [];
      for (const el of it.orig) {
        if (it.ids.has(el.id) || !(isShape(el) || el.type === "text")) continue;
        const b = elementBounds(el, ed.byId, ed.measure);
        for (const v of [b.x, b.x + b.w / 2, b.x + b.w]) it.xs.push({ v, b });
        for (const v of [b.y, b.y + b.h / 2, b.y + b.h]) it.ys.push({ v, b });
      }
    }
    let dx = p.x - it.start.x;
    let dy = p.y - it.start.y;
    let sx = null;
    let sy = null;
    const b = it.box;
    if (b && !e.altKey) {
      const th = 6 / ed.view.zoom;
      sx = snapAxis(b.x + dx, b.w, it.xs, th);
      sy = snapAxis(b.y + dy, b.h, it.ys, th);
      dx = sx ? dx + sx.d : snap(b.x + dx) - b.x;
      dy = sy ? dy + sy.d : snap(b.y + dy) - b.y;
    }
    if (e.shiftKey) {
      if (Math.abs(p.x - it.start.x) >= Math.abs(p.y - it.start.y)) { dy = 0; sy = null; } else { dx = 0; sx = null; }
    }
    ed.guides = [];
    if (b) {
      const nb = { x: b.x + dx, y: b.y + dy, w: b.w, h: b.h };
      if (sx) ed.guides.push(guideLine("x", sx.v, nb, it.xs));
      if (sy) ed.guides.push(guideLine("y", sy.v, nb, it.ys));
    }
    ed.setElements(it.orig.map((el) => (it.ids.has(el.id) ? translateElement(el, dx, dy) : el)));
  }

  function dragMarquee(p) {
    const m = {
      x: Math.min(it.start.x, p.x), y: Math.min(it.start.y, p.y),
      w: Math.abs(p.x - it.start.x), h: Math.abs(p.y - it.start.y),
    };
    ed.marquee = m;
    const inside = ed.elements.filter((el) => {
      const b = elementBounds(el, ed.byId, ed.measure);
      return b && boxContains(m, b);
    });
    ed.select([...it.baseSel, ...inside.map((el) => el.id)]);
  }

  function dragResize(p, e) {
    const s = it.orig;
    const west = it.which.includes("w");
    const north = it.which.includes("n");
    const fx = west ? s.x + s.w : s.x;
    const fy = north ? s.y + s.h : s.y;
    const px = grid(p.x, e);
    const py = grid(p.y, e);
    let w = clamp(west ? fx - px : px - fx, 20, MAX_SIDE);
    let h = clamp(north ? fy - py : py - fy, 20, MAX_SIDE);
    if (e.shiftKey) {
      // Keeps the proportions, up to the size limit.
      const k = Math.min(Math.max(w / s.w, h / s.h), MAX_SIDE / Math.max(s.w, s.h));
      w = Math.max(20, s.w * k);
      h = Math.max(20, s.h * k);
    }
    ed.replaceElement({ ...s, x: r2(west ? fx - w : fx), y: r2(north ? fy - h : fy), w: r2(w), h: r2(h) });
  }

  function dragEndpoint(p, e) {
    const a = it.orig;
    const isStart = it.which === "start";
    const other = isStart ? a.to : a.from;
    const target = e.altKey ? null : shapeAt(ed.elements, p.x, p.y, tol(), other);
    ed.target = target ? target.id : null;
    const x = target ? r2(p.x) : grid(p.x, e);
    const y = target ? r2(p.y) : grid(p.y, e);
    const id = target ? target.id : null;
    ed.replaceElement(isStart ? { ...a, from: id, x1: x, y1: y } : { ...a, to: id, x2: x, y2: y });
  }

  // Shared by the connect handle and the arrow tool: a live arrow from `from` to the pointer.
  function liveArrow(p, e, from, extra = {}) {
    const src = from ? ed.byId.get(from) : null;
    const inside = src && pointInShape(src, p.x, p.y, 2 / ed.view.zoom);
    const target = inside || e.altKey ? null : shapeAt(ed.elements, p.x, p.y, tol(), from);
    ed.target = target ? target.id : null;
    if (inside) {
      if (it.arrowId && ed.byId.has(it.arrowId)) ed.setElements(ed.elements.filter((el) => el.id !== it.arrowId));
      return;
    }
    if (!it.arrowId) it.arrowId = newId("a");
    const x2 = target ? r2(p.x) : grid(p.x, e);
    const y2 = target ? r2(p.y) : grid(p.y, e);
    ed.upsertElement(ed.newArrow({ id: it.arrowId, from, to: target ? target.id : null, x2, y2, ...extra }));
  }

  function dragConnect(p, e) {
    liveArrow(p, e, it.src);
  }

  function dragArrow(p, e) {
    liveArrow(p, e, it.from, { x1: it.x1, y1: it.y1 });
  }

  function dragCreate(p, e) {
    const x0 = grid(it.start.x, e);
    const y0 = grid(it.start.y, e);
    const x1 = grid(p.x, e);
    const y1 = grid(p.y, e);
    let w = Math.abs(x1 - x0);
    let h = Math.abs(y1 - y0);
    if (e.shiftKey) w = h = Math.max(w, h);
    if (!it.id) it.id = newId(idPrefix(it.type));
    ed.upsertElement(ed.newShape(it.type, {
      id: it.id, x: x1 < x0 ? x0 - w : x0, y: y1 < y0 ? y0 - h : y0, w: Math.max(10, w), h: Math.max(10, h),
    }));
  }

  function arrowLength(id) {
    const a = ed.byId.get(id);
    const g = a && arrowGeometry(a, ed.byId);
    return g ? Math.hypot(g.end.x - g.start.x, g.end.y - g.start.y) : 0;
  }

  function createText(p) {
    const before = ed.elements;
    const lh = lineHeight(fontSizeOf(ed.styles.text));
    const t = ed.newText({ x: snap(p.x), y: snap(p.y - lh / 2) });
    ed.setElements([...ed.elements, t], { record: false });
    ed.select([t.id]);
    ed.setTool("select");
    ed.labels.open(t.id, { before });
  }

  function editOrCreateText(p) {
    const hit = hitTest(ed.elements, p.x, p.y, tol(), ed.measure);
    if (hit && hit.type !== "pen") {
      ed.setTool("select");
      ed.select([hit.id]);
      ed.labels.open(hit.id);
    } else {
      createText(p);
    }
  }

  function up(e) {
    if (it && e.pointerId === it.pointerId) finish(e, false);
  }

  function finish(e, cancelled) {
    const cur = it;
    it = null;
    try {
      svg.releasePointerCapture(cur.pointerId);
    } catch {
      // Already released.
    }
    if (cancelled) {
      ed.endInteraction({ revert: cur.kind !== "pan" && cur.kind !== "marquee" });
      ed.refreshCursor();
      return;
    }
    const start = ed.changeStart;
    const p = cur.moved ? ed.lastPointer || cur.start : cur.start;
    let after = null;

    if (cur.kind === "move") {
      if (!cur.moved && !cur.shift && ed.selection.size > 1) ed.select([cur.hit]);
    } else if (cur.kind === "endpoint") {
      if (arrowLength(cur.orig.id) < 4) ed.replaceElement(cur.orig);
    } else if (cur.kind === "dbl") {
      const hit = cur.hit ? ed.byId.get(cur.hit) : null;
      after = () => {
        if (!hit) return createText(cur.start);
        ed.select([hit.id]);
        if (hit.type !== "pen") ed.labels.open(hit.id);
      };
    } else if (cur.kind === "text") {
      after = () => editOrCreateText(cur.start);
    } else if (cur.kind === "pen") {
      const el = normalizeElement({ id: newId("p"), type: "pen", points: simplify(cur.points, 0.6 / ed.view.zoom), color: ed.styles.pen.color, width: ed.styles.pen.width });
      if (el) ed.setElements([...ed.elements, el]);
    } else if (cur.kind === "connect") {
      if (!cur.moved) {
        after = () => ed.addConnected(cur.src, cur.dir);
      } else if (cur.arrowId && ed.byId.has(cur.arrowId)) {
        const arrow = ed.byId.get(cur.arrowId);
        const src = ed.byId.get(cur.src);
        const ddx = p.x - (src.x + src.w / 2);
        const ddy = p.y - (src.y + src.h / 2);
        ed.lastDirection = Math.abs(ddx) >= Math.abs(ddy) ? (ddx >= 0 ? "right" : "left") : (ddy >= 0 ? "down" : "up");
        if (arrow.to) {
          after = () => ed.select([arrow.id]);
        } else {
          const shape = ed.newShape(src.type, {
            ...src, id: newId(idPrefix(src.type)), text: "", x: snap(p.x - src.w / 2), y: snap(p.y - src.h / 2),
          });
          ed.setElements([...ed.elements.map((el) => (el.id === arrow.id ? { ...el, to: shape.id } : el)), shape]);
          ed.endInteraction({ record: false });
          ed.select([shape.id]);
          ed.labels.open(shape.id, { fresh: true, before: start });
          ed.refreshCursor();
          return;
        }
      }
    } else if (cur.kind === "arrow") {
      if (!cur.arrowId || !ed.byId.has(cur.arrowId)) {
        if (!cur.moved) ed.emit("hint", "Drag to draw an arrow. Start on a shape to connect it.");
      } else if (arrowLength(cur.arrowId) < 8) {
        ed.setElements(ed.elements.filter((el) => el.id !== cur.arrowId));
      } else {
        after = () => {
          ed.select([cur.arrowId]);
          ed.setTool("select");
        };
      }
    } else if (cur.kind === "create") {
      let el = cur.id ? ed.byId.get(cur.id) : null;
      const fresh = !el || el.w < 20 || el.h < 20;
      if (fresh) {
        const [w, h] = DEFAULT_SIZES[cur.type];
        el = ed.newShape(cur.type, { id: cur.id || newId(idPrefix(cur.type)), x: snap(cur.start.x - w / 2), y: snap(cur.start.y - h / 2), w, h });
        ed.upsertElement(el);
      }
      ed.endInteraction({ record: false });
      ed.select([el.id]);
      ed.setTool("select");
      ed.labels.open(el.id, { fresh, before: start });
      ed.refreshCursor();
      return;
    }
    ed.endInteraction();
    if (after) after();
    ed.refreshCursor();
  }

  function cancel(e) {
    if (it && e.pointerId === it.pointerId) finish(e, true);
  }

  function wheel(e) {
    e.preventDefault();
    const s = local(e);
    if (e.ctrlKey || e.metaKey) {
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      ed.zoomAt(Math.exp(-dy * 0.002), s.x, s.y);
      return;
    }
    let dx = e.deltaMode === 1 ? e.deltaX * 16 : e.deltaX;
    let dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    if (e.shiftKey && !dx) {
      dx = dy;
      dy = 0;
    }
    ed.panBy(dx, dy);
  }

  svg.addEventListener("pointerdown", down);
  svg.addEventListener("pointermove", move);
  svg.addEventListener("pointerup", up);
  svg.addEventListener("pointercancel", cancel);
  svg.addEventListener("lostpointercapture", (e) => {
    if (it && e.pointerId === it.pointerId) finish(e, false);
  });
  svg.addEventListener("pointerleave", () => {
    if (!it) setHover(null, null);
  });
  svg.addEventListener("mousedown", (e) => e.preventDefault());
  svg.addEventListener("contextmenu", (e) => e.preventDefault());
  svg.addEventListener("wheel", wheel, { passive: false });

  ed.cancelPointer = () => {
    if (!it) return;
    const cur = it;
    it = null;
    try {
      svg.releasePointerCapture(cur.pointerId);
    } catch {
      // Already released.
    }
    ed.endInteraction({ revert: cur.kind !== "pan" && cur.kind !== "marquee" });
    ed.refreshCursor();
  };
  ed.pointerActive = () => !!it;
}
