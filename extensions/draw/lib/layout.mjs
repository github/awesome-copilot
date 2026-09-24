// Automatic placement: layered graph layout, label-based sizing, free-spot search,
// and turning an agent's { nodes, edges, texts } spec into positioned elements.
import {
  DEFAULT_SIZES, FONT_SIZES, LABEL_WEIGHT, ID_PATTERN, isShape, isNum, snap,
  normalizeElement, normalizeSize, normalizeText, resolveShapeType, uniqueId,
} from "./model.mjs";
import {
  LABEL_PAD, approxMeasure, lineHeight, wrapText, labelMaxWidth, neededHeight, elementBounds, unionBounds, textLayout,
} from "./geometry.mjs";

const ceil20 = (v) => Math.ceil(v / 20) * 20;
const lower = (v) => (typeof v === "string" ? v.trim().toLowerCase() : "");
export const DIRECTIONS = ["right", "down", "left", "up"];

// Width/height that fit a label, in multiples of 20 so centers stay on the grid.
export function autoSize(text, type, measure = approxMeasure, size = "m") {
  const [dw, dh] = DEFAULT_SIZES[type] || DEFAULT_SIZES.rect;
  const str = String(text || "");
  if (!str.trim()) return { w: dw, h: dh };
  const fs = FONT_SIZES[size] || FONT_SIZES.m;
  const widest = Math.max(...str.split("\n").map((l) => measure(l, fs, LABEL_WEIGHT)));
  let need = widest + 2 * LABEL_PAD + 4;
  if (type === "ellipse") need = (widest + 12) / 0.72;
  if (type === "diamond") need = (widest + 12) / 0.56;
  const w = Math.min(Math.max(ceil20(need), dw), type === "rect" ? 280 : 240);
  const h = Math.max(dh, ceil20(neededHeight({ type, x: 0, y: 0, w, h: dh, size, text: str }, measure)));
  return { w, h };
}

// 1D placement: keeps order, respects minimum gaps, and stays as close as possible to the
// targets (weighted, so real nodes win over edge placeholders).
function placeRow(desired, seps, weights) {
  const n = desired.length;
  const offset = [0];
  for (let i = 1; i < n; i++) offset[i] = offset[i - 1] + seps[i - 1];
  const blocks = [];
  for (let i = 0; i < n; i++) {
    const w = weights[i];
    blocks.push({ sum: (desired[i] - offset[i]) * w, weight: w, start: i });
    while (blocks.length > 1) {
      const b = blocks[blocks.length - 1];
      const a = blocks[blocks.length - 2];
      if (a.sum / a.weight <= b.sum / b.weight) break;
      a.sum += b.sum;
      a.weight += b.weight;
      blocks.pop();
    }
  }
  const out = new Array(n);
  blocks.forEach((b, k) => {
    const end = k + 1 < blocks.length ? blocks[k + 1].start : n;
    for (let i = b.start; i < end; i++) out[i] = b.sum / b.weight + offset[i];
  });
  return out;
}

// Layered (Sugiyama-style) layout. nodes: [{id, w, h}], edges: [{from, to, label?}].
// Returns Map id -> {x, y} (top-left), with the layout's top-left corner at 0,0.
export function layeredLayout(nodes, edges, { direction = "right", measure = approxMeasure } = {}) {
  const horizontal = direction === "right" || direction === "left";
  const N = nodes.length;
  const result = new Map();
  if (!N) return result;
  const index = new Map(nodes.map((n, i) => [n.id, i]));
  const succ = Array.from({ length: N }, () => new Set());
  let labelSpace = 0;
  for (const e of edges) {
    const a = index.get(e.from);
    const b = index.get(e.to);
    if (a === undefined || b === undefined || a === b) continue;
    succ[a].add(b);
    if (e.label) labelSpace = Math.max(labelSpace, horizontal ? measure(e.label, FONT_SIZES.s, 400) + 40 : 30);
  }
  const connected = new Array(N).fill(false);
  succ.forEach((set, a) => set.forEach((b) => { connected[a] = true; connected[b] = true; }));

  // Break cycles with a DFS, reversing back edges. Sources go first so cycles break naturally.
  const indeg0 = new Array(N).fill(0);
  succ.forEach((set) => set.forEach((b) => indeg0[b]++));
  const roots = [...Array(N).keys()].sort((a, b) => (indeg0[a] === 0 ? 0 : 1) - (indeg0[b] === 0 ? 0 : 1) || a - b);
  const mark = new Uint8Array(N);
  const dag = Array.from({ length: N }, () => new Set());
  for (const root of roots) {
    if (mark[root]) continue;
    mark[root] = 1;
    const stack = [[root, [...succ[root]], 0]];
    while (stack.length) {
      const top = stack[stack.length - 1];
      if (top[2] < top[1].length) {
        const v = top[1][top[2]++];
        const u = top[0];
        if (mark[v] === 1) dag[v].add(u);
        else {
          dag[u].add(v);
          if (mark[v] === 0) { mark[v] = 1; stack.push([v, [...succ[v]], 0]); }
        }
      } else {
        mark[top[0]] = 2;
        stack.pop();
      }
    }
  }

  // Longest-path layering, then pull sources next to their first child.
  const preds = Array.from({ length: N }, () => []);
  dag.forEach((set, u) => set.forEach((v) => preds[v].push(u)));
  const indeg = preds.map((p) => p.length);
  const layer = new Array(N).fill(0);
  const queue = [];
  for (let i = 0; i < N; i++) if (connected[i] && !indeg[i]) queue.push(i);
  const topo = [];
  while (queue.length) {
    const u = queue.shift();
    topo.push(u);
    for (const v of dag[u]) {
      layer[v] = Math.max(layer[v], layer[u] + 1);
      if (--indeg[v] === 0) queue.push(v);
    }
  }
  for (let i = topo.length - 1; i >= 0; i--) {
    const u = topo[i];
    if (!preds[u].length && dag[u].size) layer[u] = Math.min(...[...dag[u]].map((v) => layer[v])) - 1;
  }

  // Layers with dummy vertices for edges that span several layers.
  const layers = [];
  const up = [];
  const down = [];
  const isDummy = [];
  const addVertex = (li, dummy) => {
    const v = up.length;
    up.push([]);
    down.push([]);
    isDummy.push(dummy);
    (layers[li] ||= []).push(v);
    return v;
  };
  const vertexOf = new Array(N);
  for (let i = 0; i < N; i++) if (connected[i]) vertexOf[i] = addVertex(layer[i], false);
  const realOf = new Map();
  vertexOf.forEach((v, i) => { if (v !== undefined) realOf.set(v, i); });
  for (let u = 0; u < N; u++) {
    for (const v of dag[u]) {
      let prev = vertexOf[u];
      for (let li = layer[u] + 1; li < layer[v]; li++) {
        const d = addVertex(li, true);
        down[prev].push(d);
        up[d].push(prev);
        prev = d;
      }
      down[prev].push(vertexOf[v]);
      up[vertexOf[v]].push(prev);
    }
  }
  for (let li = 0; li < layers.length; li++) layers[li] ||= [];

  // Crossing reduction: barycenter sweeps, keeping the best ordering seen.
  const pos = new Map();
  const setPos = () => layers.forEach((L) => L.forEach((v, i) => pos.set(v, i)));
  setPos();
  const crossings = () => {
    let c = 0;
    for (let li = 0; li < layers.length - 1; li++) {
      const es = [];
      for (const u of layers[li]) for (const v of down[u]) es.push([pos.get(u), pos.get(v)]);
      for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) if ((es[i][0] - es[j][0]) * (es[i][1] - es[j][1]) < 0) c++;
    }
    return c;
  };
  let best = layers.map((L) => [...L]);
  let bestC = crossings();
  for (let iter = 0; iter < 12 && bestC > 0; iter++) {
    const downward = iter % 2 === 0;
    const order = [...layers.keys()];
    if (!downward) order.reverse();
    for (const li of order.slice(1)) {
      const bc = new Map();
      for (const v of layers[li]) {
        const nb = downward ? up[v] : down[v];
        bc.set(v, nb.length ? nb.reduce((s, n) => s + pos.get(n), 0) / nb.length : pos.get(v));
      }
      layers[li].sort((a, b) => bc.get(a) - bc.get(b) || pos.get(a) - pos.get(b));
      layers[li].forEach((v, i) => pos.set(v, i));
    }
    const c = crossings();
    if (c < bestC) { bestC = c; best = layers.map((L) => [...L]); }
  }
  best.forEach((L, li) => { layers[li] = L; });
  setPos();

  // Coordinates. "main" runs along the flow, "cross" across it.
  const size = (v, main) => {
    if (isDummy[v]) return 0;
    const n = nodes[realOf.get(v)];
    return horizontal === main ? n.w : n.h;
  };
  const rankGap = Math.max(horizontal ? 100 : 80, labelSpace);
  const nodeGap = horizontal ? 50 : 60;
  const mainCenter = [];
  let cursor = 0;
  for (const L of layers) {
    const m = Math.max(0, ...L.map((v) => size(v, true)));
    mainCenter.push(cursor + m / 2);
    cursor += m + rankGap;
  }
  const gapBetween = (a, b) => (isDummy[a] && isDummy[b] ? 10 : isDummy[a] || isDummy[b] ? nodeGap / 2 : nodeGap);
  const seps = (L) => L.slice(1).map((v, i) => (size(L[i], false) + size(v, false)) / 2 + gapBetween(L[i], v));
  const cross = new Map();
  for (const L of layers) {
    const s = seps(L);
    const total = s.reduce((a, b) => a + b, 0);
    let c = -total / 2;
    L.forEach((v, i) => { if (i) c += s[i - 1]; cross.set(v, c); });
  }
  // Edge placeholders follow real nodes, not the other way around.
  const desiredOf = (v, nb) => {
    let sum = 0;
    let weight = 0;
    for (const n of nb) {
      const k = isDummy[n] ? 0.1 : 1;
      sum += cross.get(n) * k;
      weight += k;
    }
    return weight ? sum / weight : cross.get(v);
  };
  for (let iter = 0; iter < 10; iter++) {
    const mode = iter === 9 ? "both" : iter % 2 === 0 ? "down" : "up";
    const order = [...layers.keys()];
    if (mode === "up") order.reverse();
    for (const li of order) {
      const L = layers[li];
      if (!L.length) continue;
      const desired = L.map((v) => desiredOf(v, mode === "down" ? up[v] : mode === "up" ? down[v] : [...up[v], ...down[v]]));
      placeRow(desired, seps(L), L.map((v) => (isDummy[v] ? 0.05 : 1))).forEach((c, i) => cross.set(L[i], c));
    }
  }
  // Straighten one-to-one links at the ends of a flow: a node with a single link, whose neighbor
  // has no other link on that side, moves into line with it if there is room. Nothing else moves.
  for (const L of layers) {
    const s = seps(L);
    L.forEach((v, i) => {
      if (isDummy[v] || up[v].length + down[v].length !== 1) return;
      const n = up[v].length ? up[v][0] : down[v][0];
      if ((up[v].length ? down[n] : up[n]).length !== 1) return;
      let c = cross.get(n);
      if (i > 0) c = Math.max(c, cross.get(L[i - 1]) + s[i - 1]);
      if (i < L.length - 1) c = Math.min(c, cross.get(L[i + 1]) - s[i]);
      cross.set(v, c);
    });
  }

  const flipMain = direction === "left" || direction === "up";
  for (const [v, i] of realOf) {
    const n = nodes[i];
    const li = layer[i];
    const m = flipMain ? -mainCenter[li] : mainCenter[li];
    const cx = snap(horizontal ? m : cross.get(v));
    const cy = snap(horizontal ? cross.get(v) : m);
    result.set(n.id, { x: cx - n.w / 2, y: cy - n.h / 2 });
  }

  // Unconnected nodes go in a grid after the connected part.
  const loose = nodes.filter((n, i) => !connected[i]);
  if (loose.length) {
    const placed = unionBounds([...result.entries()].map(([id, p]) => {
      const n = nodes[index.get(id)];
      return { x: p.x, y: p.y, w: n.w, h: n.h };
    }));
    const cols = Math.min(4, Math.ceil(Math.sqrt(loose.length)));
    const cellW = Math.max(...loose.map((n) => n.w)) + 60;
    const cellH = Math.max(...loose.map((n) => n.h)) + 60;
    const ox = placed ? placed.x : 0;
    const oy = placed ? placed.y + placed.h + 80 : 0;
    loose.forEach((n, k) => {
      const cx = snap(ox + (k % cols) * cellW + cellW / 2);
      const cy = snap(oy + Math.floor(k / cols) * cellH + cellH / 2);
      result.set(n.id, { x: cx - n.w / 2, y: cy - n.h / 2 });
    });
  }

  const all = unionBounds([...result.entries()].map(([id, p]) => ({ x: p.x, y: p.y, w: 0, h: 0 })));
  const dx = snap(all.x);
  const dy = snap(all.y);
  for (const p of result.values()) { p.x -= dx; p.y -= dy; }
  return result;
}

// Finds a spot for a new w x h box next to an anchor box in a direction, avoiding obstacles.
export function findFreeSpot(anchor, dir, w, h, obstacles, gap = 60) {
  const horizontal = dir === "left" || dir === "right";
  const forward = dir === "right" || dir === "down";
  const cx = anchor.x + anchor.w / 2;
  const cy = anchor.y + anchor.h / 2;
  const blocked = (x, y) => obstacles.some((o) => x < o.x + o.w + 20 && x + w > o.x - 20 && y < o.y + o.h + 20 && y + h > o.y - 20);
  let first = null;
  for (let step = 0; step < 6; step++) {
    for (const k of [0, 1, -1, 2, -2]) {
      let x;
      let y;
      if (horizontal) {
        x = forward ? anchor.x + anchor.w + gap + step * (w + gap) : anchor.x - gap - w - step * (w + gap);
        y = cy - h / 2 + k * (h + 30);
      } else {
        y = forward ? anchor.y + anchor.h + gap + step * (h + gap) : anchor.y - gap - h - step * (h + gap);
        x = cx - w / 2 + k * (w + 30);
      }
      first ||= { x, y };
      if (!blocked(x, y)) return { x, y };
    }
  }
  return first;
}

export const oppositeDir = (d) => ({ right: "left", left: "right", up: "down", down: "up" })[d] || "left";

export function slugId(label, taken, fallback = "node") {
  let base = lower(label).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24).replace(/-+$/, "");
  if (!base) base = fallback;
  let id = base;
  for (let i = 2; taken.has(id); i++) id = `${base}-${i}`;
  taken.add(id);
  return id;
}

// Converts { nodes, edges, texts } into elements. With `existing`, new nodes are placed next to
// the existing nodes they connect to, or beside the current content.
// Returns { elements, errors }. Nothing should be applied when errors is non-empty.
export function buildFromSpec(spec, { existing = [], direction = "right", measure = approxMeasure } = {}) {
  const errors = [];
  const taken = new Set(existing.map((e) => e.id));
  const existingShapes = existing.filter(isShape);
  const nodes = [];
  const pinned = new Set();

  for (const n of spec.nodes || []) {
    const label = normalizeText(n.label ?? n.text);
    const type = resolveShapeType(n.shape || n.type);
    let id;
    if (n.id != null && String(n.id) !== "") {
      id = String(n.id);
      if (!ID_PATTERN.test(id)) { errors.push(`Node id "${id}" is not valid. Use letters, numbers, dashes or underscores.`); continue; }
      if (taken.has(id)) { errors.push(`Node id "${id}" is already used. Pick another id, or use update_elements to change the existing one.`); continue; }
      taken.add(id);
    } else {
      id = slugId(label, taken);
    }
    const size = normalizeSize(n.size);
    const auto = autoSize(label, type, measure, size);
    const el = normalizeElement({
      id, type, text: label, color: n.color, fill: n.fill, dash: n.dashed ?? n.dash, size,
      x: n.x, y: n.y, w: n.w ?? auto.w, h: n.h ?? auto.h,
    });
    if (isNum(n.x) && isNum(n.y)) pinned.add(id);
    nodes.push(el);
  }

  const allShapes = [...existingShapes, ...nodes];
  const byId = new Map(allShapes.map((s) => [s.id, s]));
  const resolveRef = (ref) => {
    if (typeof ref !== "string" || !ref) return null;
    if (byId.has(ref)) return ref;
    const matches = allShapes.filter((s) => lower(s.text) === lower(ref));
    return matches.length === 1 ? matches[0].id : null;
  };
  const edges = [];
  for (const e of spec.edges || []) {
    const from = resolveRef(e.from);
    const to = resolveRef(e.to);
    if (!from || !to) {
      errors.push(`Edge "${e.from}" -> "${e.to}": no node with id or label "${!from ? e.from : e.to}".`);
      continue;
    }
    if (from === to) { errors.push(`Edge "${e.from}" -> "${e.to}" connects a node to itself, which is not supported.`); continue; }
    let id = e.id != null && String(e.id) !== "" ? String(e.id) : null;
    if (id && (!ID_PATTERN.test(id) || taken.has(id))) { errors.push(`Edge id "${id}" is not valid or already used.`); continue; }
    if (id) taken.add(id);
    else id = uniqueId("a", taken);
    edges.push(normalizeElement({
      id, type: "arrow", from, to, text: e.label ?? e.text, color: e.color, dash: e.dashed ?? e.dash, head: e.head, route: e.route,
    }));
  }

  // Place nodes that have no x/y.
  const obstacles = existing.map((e) => elementBounds(e, new Map(existing.map((x) => [x.id, x])), measure)).filter(Boolean);
  for (const n of nodes) if (pinned.has(n.id)) obstacles.push({ x: n.x, y: n.y, w: n.w, h: n.h });
  const anchored = new Map([...existingShapes, ...nodes.filter((n) => pinned.has(n.id))].map((s) => [s.id, s]));
  const unplaced = nodes.filter((n) => !pinned.has(n.id));
  if (anchored.size) {
    for (let progress = true; progress;) {
      progress = false;
      for (const n of unplaced) {
        if (anchored.has(n.id)) continue;
        const link = edges.find((e) => (e.to === n.id && anchored.has(e.from)) || (e.from === n.id && anchored.has(e.to)));
        if (!link) continue;
        const outgoing = link.to === n.id;
        const anchor = anchored.get(outgoing ? link.from : link.to);
        const spot = findFreeSpot(anchor, outgoing ? direction : oppositeDir(direction), n.w, n.h, obstacles);
        n.x = spot.x;
        n.y = spot.y;
        anchored.set(n.id, n);
        obstacles.push({ x: n.x, y: n.y, w: n.w, h: n.h });
        progress = true;
      }
    }
  }
  const rest = unplaced.filter((n) => !anchored.has(n.id));
  if (rest.length) {
    const restIds = new Set(rest.map((n) => n.id));
    const pos = layeredLayout(rest, edges.filter((e) => restIds.has(e.from) && restIds.has(e.to)).map((e) => ({ from: e.from, to: e.to, label: e.text })), { direction, measure });
    const content = unionBounds(obstacles);
    let ox = 0;
    let oy = 0;
    if (content) {
      const vertical = direction === "down" || direction === "up";
      ox = snap(vertical ? content.x : content.x + content.w + 120);
      oy = snap(vertical ? content.y + content.h + 100 : content.y);
    }
    for (const n of rest) {
      const p = pos.get(n.id);
      n.x = ox + p.x;
      n.y = oy + p.y;
    }
  }

  const texts = [];
  const shapeBox = unionBounds([...existing, ...nodes].filter(isShape).map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h })));
  let textCursor = shapeBox ? shapeBox.y - 30 : 0;
  for (const t of spec.texts || []) {
    const text = normalizeText(t.text ?? t.label);
    if (!text.trim()) { errors.push("A text item needs non-empty text."); continue; }
    let id = t.id != null && String(t.id) !== "" ? String(t.id) : null;
    if (id && (!ID_PATTERN.test(id) || taken.has(id))) { errors.push(`Text id "${id}" is not valid or already used.`); continue; }
    if (id) taken.add(id);
    else id = uniqueId("t", taken);
    const el = normalizeElement({ id, type: "text", text, color: t.color, size: t.size ?? "l", x: t.x, y: t.y });
    if (!(isNum(t.x) && isNum(t.y))) {
      const l = textLayout(el, measure);
      textCursor -= l.h;
      el.x = shapeBox ? shapeBox.x : 0;
      el.y = Math.round(textCursor);
      textCursor -= 12;
    }
    texts.push(el);
  }
  return { elements: [...nodes, ...edges, ...texts], errors };
}

// Re-lays out all shapes in a drawing, keeping the top-left corner where it was.
export function relayout(elements, { direction = "right", measure = approxMeasure } = {}) {
  const shapes = elements.filter(isShape);
  if (!shapes.length) return elements;
  const before = unionBounds(shapes.map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h })));
  const edges = elements.filter((e) => e.type === "arrow" && e.from && e.to).map((e) => ({ from: e.from, to: e.to, label: e.text }));
  const pos = layeredLayout(shapes, edges, { direction, measure });
  const ox = snap(before.x);
  const oy = snap(before.y);
  return elements.map((e) => (isShape(e) && pos.has(e.id) ? { ...e, x: ox + pos.get(e.id).x, y: oy + pos.get(e.id).y } : e));
}

// A short readable outline of a drawing for the agent.
export function describe(doc) {
  const els = doc.elements || [];
  const shapes = els.filter(isShape);
  const arrows = els.filter((e) => e.type === "arrow");
  const texts = els.filter((e) => e.type === "text");
  const pens = els.filter((e) => e.type === "pen");
  const q = (s) => JSON.stringify(String(s).replace(/\n/g, " / "));
  const lines = [`Drawing ${q(doc.name)}: ${shapes.length} shapes, ${arrows.length} arrows, ${texts.length} text, ${pens.length} pen strokes.`];
  if (shapes.length) {
    lines.push("Shapes:");
    for (const s of shapes) {
      const style = [s.type, s.color !== "gray" ? s.color : null, s.fill !== "soft" ? `fill ${s.fill}` : null, s.dash ? "dashed" : null].filter(Boolean).join(", ");
      lines.push(`- ${s.id} (${style}) ${s.text ? q(s.text) : "(no label)"} at ${Math.round(s.x)},${Math.round(s.y)} size ${Math.round(s.w)}x${Math.round(s.h)}`);
    }
  }
  if (arrows.length) {
    lines.push("Arrows:");
    for (const a of arrows) {
      const from = a.from || `(${Math.round(a.x1)},${Math.round(a.y1)})`;
      const to = a.to || `(${Math.round(a.x2)},${Math.round(a.y2)})`;
      const style = [a.head !== "end" ? `head ${a.head}` : null, a.route !== "straight" ? a.route : null, a.dash ? "dashed" : null, a.color !== "gray" ? a.color : null].filter(Boolean).join(", ");
      lines.push(`- ${a.id}: ${from} -> ${to}${a.text ? ` ${q(a.text)}` : ""}${style ? ` (${style})` : ""}`);
    }
  }
  if (texts.length) {
    lines.push("Text:");
    for (const t of texts) lines.push(`- ${t.id}: ${q(t.text)} at ${Math.round(t.x)},${Math.round(t.y)}`);
  }
  if (pens.length) {
    lines.push("Pen strokes:");
    for (const p of pens) {
      const b = elementBounds(p, null);
      const style = [p.color !== "gray" ? p.color : null, `width ${p.width}`].filter(Boolean).join(", ");
      lines.push(`- ${p.id} (${style}) ${p.points.length} points at ${Math.round(b.x)},${Math.round(b.y)} size ${Math.round(b.w)}x${Math.round(b.h)}`);
    }
  }
  return lines.join("\n");
}

export { wrapText, labelMaxWidth, lineHeight };
