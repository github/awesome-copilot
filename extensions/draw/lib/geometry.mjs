// Geometry for drawings: text layout, shape outlines, arrow routing, bounds and hit testing.
import { FONT_SIZES, LABEL_WEIGHT, TEXT_WEIGHT, isShape, limitPoints } from "./model.mjs";

export const LABEL_PAD = 12;
export const ARROW_GAP = 3;
export const HEAD_LENGTH = 11;
export const HEAD_HALF_WIDTH = 5.5;
const HEAD_TRIM = 6;
const MIN_ROUTE_GAP = 16;

export const fmt = (v) => String(Math.round(v * 100) / 100);
export const lineHeight = (fs) => Math.round(fs * 1.35);
export const baselineOffset = (fs, lh) => lh / 2 + 0.34 * fs;
export const fontSizeOf = (el) => FONT_SIZES[el.size] || FONT_SIZES.m;

// Width units for ASCII characters, used where no real font measurement exists (Node side).
// Later groups overwrite earlier ones, so "I", "M" and "W" get the width of their own group
// rather than the width of the other capitals.
const ASCII_UNITS = new Float64Array(128).fill(0.54);
for (const [chars, units] of [
  ["ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$?_~+=<>*^", 0.64],
  ["mwMW@%&", 0.86],
  ["fjtIr()[]{}\"-/\\", 0.38],
  ["il|!.,:;'`", 0.27],
  [" ", 0.28],
]) {
  for (const ch of chars) ASCII_UNITS[ch.charCodeAt(0)] = units;
}

// Rough text width used where no real font measurement exists (Node side).
export function approxMeasure(str, fontSize, weight = 400) {
  let units = 0;
  for (const ch of String(str)) {
    const code = ch.codePointAt(0);
    units += code < 128 ? ASCII_UNITS[code] : code > 0x2e7f ? 1 : 0.54;
  }
  return units * fontSize * (weight >= 600 ? 1.06 : weight >= 500 ? 1.03 : 1);
}

// Greedy word wrap. Words longer than the line are broken by character. Every check measures a
// whole line, so how many more words (or characters) fit is searched for rather than found by
// adding them one at a time. The search starts from the last line's count, since lines tend to
// hold about the same, so most lines take two measurements and none takes more than about
// 2 log n. Even a 4,000-character label with no spaces wraps quickly.
export function wrapText(text, maxWidth, fs, weight, measure = approxMeasure) {
  const out = [];
  const fits = (s) => measure(s, fs, weight) <= maxWidth;
  let wordGuess = 1;
  let charGuess = 1;
  for (const para of String(text).split("\n")) {
    const words = para.split(" ");
    let line = "";
    let i = 0;
    while (i < words.length) {
      // The line with the next n words added. A word that starts an empty line has no space before it.
      const withWords = (n) => {
        let s = line;
        for (let k = i; k < i + n; k++) s = s ? `${s} ${words[k]}` : words[k];
        return s;
      };
      const n = longestFit(words.length - i, (m) => fits(withWords(m)), wordGuess);
      wordGuess = Math.max(1, n);
      if (n > 0) {
        line = withWords(n);
        i += n;
        // n is the most that fit, so a word left over starts a new line. (When only empty words
        // fit, the line is still empty, and the next word is cut to fit on it instead.)
        if (i < words.length && line) {
          out.push(line);
          line = "";
        }
      } else if (line) {
        // The next word starts a new line.
        out.push(line);
        line = "";
      } else {
        // It does not fit on a line of its own either, so it is cut into pieces that do (at
        // least one character each). The last piece starts the next line.
        const chars = Array.from(words[i++]);
        const piece = (from, m) => chars.slice(from, from + m).join("");
        let start = 0;
        for (;;) {
          const len = Math.max(1, longestFit(chars.length - start, (m) => fits(piece(start, m)), charGuess));
          if (start + len >= chars.length) {
            line = piece(start, len);
            break;
          }
          out.push(piece(start, len));
          start += len;
          charGuess = len;
        }
      }
    }
    out.push(line);
  }
  return out;
}

// The largest n from 0 to max for which ok(n) holds, when ok holds up to some n and not after
// it (n = 0 counts as holding). It checks the guess first. Then, from the largest count known to
// fit (the guess, or 0 when the guess does not fit), it steps out by 1, 2, 4 ... until a step
// fails, and halves the gap that is left. So a good guess costs two checks, and a bad one never
// leads to checking much more than twice the answer, apart from the guess itself.
function longestFit(max, ok, guess = 1) {
  if (max < 1) return 0;
  const g = Math.min(Math.max(guess, 1), max);
  let lo = 0;
  let hi = max + 1;
  if (ok(g)) lo = g;
  else hi = g;
  let step = 1;
  while (lo + step < hi && ok(lo + step)) {
    lo += step;
    step *= 2;
  }
  hi = Math.min(hi, lo + step);
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (ok(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

export function cylinderCap(s) {
  return Math.min(s.h * 0.18, s.w * 0.25, 18);
}

export function labelMaxWidth(s) {
  if (s.type === "ellipse") return Math.max(20, s.w * 0.72 - 8);
  if (s.type === "diamond") return Math.max(20, s.w * 0.56 - 8);
  return Math.max(20, s.w - 2 * LABEL_PAD);
}

export function labelCenterY(s) {
  return s.type === "cylinder" ? s.y + s.h / 2 + cylinderCap(s) / 2 : s.y + s.h / 2;
}

export function shapeLabelLayout(s, measure = approxMeasure) {
  const fs = fontSizeOf(s);
  const lh = lineHeight(fs);
  const lines = s.text ? wrapText(s.text, labelMaxWidth(s), fs, LABEL_WEIGHT, measure) : [];
  return { lines, fs, lh, cx: s.x + s.w / 2, top: labelCenterY(s) - (lines.length * lh) / 2 };
}

// Smallest height that fits the label at the shape's current width.
export function neededHeight(s, measure = approxMeasure) {
  const { lines, lh } = shapeLabelLayout(s, measure);
  const textH = Math.max(1, lines.length) * lh;
  if (s.type === "ellipse") return textH / 0.69 + 8;
  if (s.type === "diamond") return textH / 0.44 + 8;
  if (s.type === "cylinder") return textH + 28 + cylinderCap(s) * 2;
  return textH + 28;
}

export function textLayout(t, measure = approxMeasure) {
  const fs = fontSizeOf(t);
  const lh = lineHeight(fs);
  const lines = String(t.text || "").split("\n");
  const w = Math.max(fs * 0.5, ...lines.map((l) => measure(l, fs, TEXT_WEIGHT)));
  return { lines, fs, lh, w, h: lines.length * lh };
}

// ---------- shapes ----------

export const shapeCenter = (s) => ({ x: s.x + s.w / 2, y: s.y + s.h / 2 });

// Where the ray from the shape center toward (tx, ty) leaves the outline, pushed out by gap.
export function boundaryPoint(s, tx, ty, gap = 0) {
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { x: cx, y: cy };
  const ux = dx / len;
  const uy = dy / len;
  const hw = s.w / 2;
  const hh = s.h / 2;
  let t;
  if (s.type === "ellipse") t = 1 / Math.sqrt((ux * ux) / (hw * hw) + (uy * uy) / (hh * hh));
  else if (s.type === "diamond") t = 1 / (Math.abs(ux) / hw + Math.abs(uy) / hh);
  else t = Math.min(Math.abs(ux) > 1e-9 ? hw / Math.abs(ux) : Infinity, Math.abs(uy) > 1e-9 ? hh / Math.abs(uy) : Infinity);
  return { x: cx + ux * (t + gap), y: cy + uy * (t + gap) };
}

// Inside test with a tolerance. For unfilled shapes, "border" limits hits to the outline band.
export function pointInShape(s, x, y, tol = 0, mode = "fill") {
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2;
  const hw = s.w / 2;
  const hh = s.h / 2;
  const dx = Math.abs(x - cx);
  const dy = Math.abs(y - cy);
  let dist;
  if (s.type === "ellipse") {
    const r = Math.hypot(dx / hw, dy / hh);
    dist = (r - 1) * Math.min(hw, hh);
  } else if (s.type === "diamond") {
    const r = dx / hw + dy / hh;
    dist = ((r - 1) * hw * hh) / Math.hypot(hw, hh);
  } else {
    dist = Math.max(dx - hw, dy - hh);
  }
  if (mode === "border") return Math.abs(dist) <= tol + 3;
  return dist <= tol;
}

// ---------- arrows ----------

const SIDE_NORMAL = { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, top: { x: 0, y: -1 }, bottom: { x: 0, y: 1 } };

function sideAnchor(s, side, gap) {
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2;
  if (side === "left") return { x: s.x - gap, y: cy };
  if (side === "right") return { x: s.x + s.w + gap, y: cy };
  if (side === "top") return { x: cx, y: s.y - gap };
  return { x: cx, y: s.y + s.h + gap };
}

// Point on a side of the outline at cross-axis coordinate c (y for left/right, x for top/bottom).
function outlinePoint(s, side, c, gap) {
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2;
  const hw = s.w / 2;
  const hh = s.h / 2;
  const horizontal = side === "left" || side === "right";
  const t = Math.min(1, horizontal ? Math.abs(c - cy) / hh : Math.abs(c - cx) / hw);
  let half = horizontal ? hw : hh;
  if (s.type === "ellipse") half *= Math.sqrt(1 - t * t);
  else if (s.type === "diamond") half *= 1 - t;
  else if (s.type === "cylinder" && !horizontal) {
    const cap = cylinderCap(s);
    half = hh - cap + cap * Math.sqrt(1 - t * t);
  }
  if (side === "left") return { x: cx - half - gap, y: c };
  if (side === "right") return { x: cx + half + gap, y: c };
  if (side === "top") return { x: c, y: cy - half - gap };
  return { x: c, y: cy + half + gap };
}

// Chooses which sides an elbow or curved connector leaves from and enters.
function pickSides(a, b) {
  const gapX = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
  const gapY = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
  if (gapX < MIN_ROUTE_GAP && gapY < MIN_ROUTE_GAP) return null;
  const acx = a.x + a.w / 2;
  const acy = a.y + a.h / 2;
  const bcx = b.x + b.w / 2;
  const bcy = b.y + b.h / 2;
  if (gapX >= gapY) return bcx >= acx ? ["right", "left"] : ["left", "right"];
  return bcy >= acy ? ["bottom", "top"] : ["top", "bottom"];
}

function dedupePoints(pts) {
  const out = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < 0.01 && Math.abs(last.y - p.y) < 0.01) continue;
    out.push(p);
  }
  // Drop middle points that sit on a straight line.
  for (let i = out.length - 2; i >= 1; i--) {
    const a = out[i - 1];
    const b = out[i];
    const c = out[i + 1];
    if (Math.abs((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)) < 0.01) out.splice(i, 1);
  }
  return out;
}

function roundedPath(pts, radius = 8) {
  let d = `M${fmt(pts[0].x)} ${fmt(pts[0].y)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const l1 = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const l2 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const r = Math.min(radius, l1 / 2, l2 / 2);
    if (r < 0.5) { d += ` L${fmt(p1.x)} ${fmt(p1.y)}`; continue; }
    const a = { x: p1.x + ((p0.x - p1.x) / l1) * r, y: p1.y + ((p0.y - p1.y) / l1) * r };
    const b = { x: p1.x + ((p2.x - p1.x) / l2) * r, y: p1.y + ((p2.y - p1.y) / l2) * r };
    d += ` L${fmt(a.x)} ${fmt(a.y)} Q${fmt(p1.x)} ${fmt(p1.y)} ${fmt(b.x)} ${fmt(b.y)}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${fmt(last.x)} ${fmt(last.y)}`;
}

function unit(dx, dy) {
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

// Moves the first/last point of a polyline inward by `amount` (so strokes end under arrowheads).
function trimPolyline(pts, atStart, atEnd, amount) {
  const out = pts.map((p) => ({ ...p }));
  const trim = (i, j) => {
    const len = Math.hypot(out[j].x - out[i].x, out[j].y - out[i].y);
    const t = Math.min(amount, Math.max(0, len - 0.5)) / (len || 1);
    out[i] = { x: out[i].x + (out[j].x - out[i].x) * t, y: out[i].y + (out[j].y - out[i].y) * t };
  };
  if (atStart && out.length > 1) trim(0, 1);
  if (atEnd && out.length > 1) trim(out.length - 1, out.length - 2);
  return out;
}

function pointAtHalfLength(pts) {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  let remaining = total / 2;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (seg >= remaining && seg > 0) {
      const t = remaining / seg;
      return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t };
    }
    remaining -= seg;
  }
  return { ...pts[pts.length - 1] };
}

const bezier = (p0, c1, c2, p3, t) => {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y,
  };
};

function straightEnds(a, A, B) {
  const p0 = A ? shapeCenter(A) : { x: a.x1, y: a.y1 };
  const q0 = B ? shapeCenter(B) : { x: a.x2, y: a.y2 };
  const p = A ? boundaryPoint(A, q0.x, q0.y, ARROW_GAP) : p0;
  const q = B ? boundaryPoint(B, p0.x, p0.y, ARROW_GAP) : q0;
  // Overlapping shapes: clipping flips the direction, so fall back to center-to-center.
  if (A && B && (q.x - p.x) * (q0.x - p0.x) + (q.y - p.y) * (q0.y - p0.y) <= 0) return [p0, q0];
  return [p, q];
}

// Resolves the drawn path of an arrow. Returns null when an end is missing.
// Result: { d, points, start, end, startDir, endDir, mid } where *Dir point into the tips.
export function arrowGeometry(a, byId) {
  const A = a.from ? byId.get(a.from) : null;
  const B = a.to ? byId.get(a.to) : null;
  if ((a.from && !A) || (a.to && !B)) return null;
  const headStart = a.head === "start" || a.head === "both";
  const headEnd = a.head === "end" || a.head === "both";
  const boxA = A || { x: a.x1, y: a.y1, w: 0, h: 0 };
  const boxB = B || { x: a.x2, y: a.y2, w: 0, h: 0 };
  // A free end counts as a box with no size, so an arrow attached to nothing follows its route too.
  const sides = a.route !== "straight" ? pickSides(boxA, boxB) : null;

  if (sides && a.route === "curve") {
    const p = A ? sideAnchor(A, sides[0], ARROW_GAP) : { x: a.x1, y: a.y1 };
    const q = B ? sideAnchor(B, sides[1], ARROW_GAP) : { x: a.x2, y: a.y2 };
    const na = SIDE_NORMAL[sides[0]];
    const nb = SIDE_NORMAL[sides[1]];
    const k = Math.min(160, Math.max(24, Math.hypot(q.x - p.x, q.y - p.y) * 0.45));
    let c1 = { x: p.x + na.x * k, y: p.y + na.y * k };
    let c2 = { x: q.x + nb.x * k, y: q.y + nb.y * k };
    const startDir = { x: -na.x, y: -na.y };
    const endDir = { x: -nb.x, y: -nb.y };
    let ps = p;
    let qs = q;
    if (headStart) { ps = { x: p.x + na.x * HEAD_TRIM, y: p.y + na.y * HEAD_TRIM }; c1 = { x: c1.x + na.x * HEAD_TRIM, y: c1.y + na.y * HEAD_TRIM }; }
    if (headEnd) { qs = { x: q.x + nb.x * HEAD_TRIM, y: q.y + nb.y * HEAD_TRIM }; c2 = { x: c2.x + nb.x * HEAD_TRIM, y: c2.y + nb.y * HEAD_TRIM }; }
    const points = [];
    for (let i = 0; i <= 24; i++) points.push(bezier(p, c1, c2, q, i / 24));
    return {
      d: `M${fmt(ps.x)} ${fmt(ps.y)} C${fmt(c1.x)} ${fmt(c1.y)} ${fmt(c2.x)} ${fmt(c2.y)} ${fmt(qs.x)} ${fmt(qs.y)}`,
      points, start: p, end: q, startDir, endDir, mid: bezier(p, c1, c2, q, 0.5),
    };
  }

  let pts;
  if (sides && a.route === "elbow") {
    const horizontal = sides[0] === "left" || sides[0] === "right";
    // When the two ends overlap across the flow, a single straight segment reads better than a jog.
    const lo = horizontal ? Math.max(boxA.y, boxB.y) : Math.max(boxA.x, boxB.x);
    const hi = horizontal ? Math.min(boxA.y + boxA.h, boxB.y + boxB.h) : Math.min(boxA.x + boxA.w, boxB.x + boxB.w);
    if (hi - lo >= (A && B ? 20 : 0)) {
      const c = (lo + hi) / 2;
      const end = (s, side, free) => (s ? outlinePoint(s, side, c, ARROW_GAP) : free);
      pts = [end(A, sides[0], { x: a.x1, y: a.y1 }), end(B, sides[1], { x: a.x2, y: a.y2 })];
    } else {
      const p = A ? sideAnchor(A, sides[0], ARROW_GAP) : { x: a.x1, y: a.y1 };
      const q = B ? sideAnchor(B, sides[1], ARROW_GAP) : { x: a.x2, y: a.y2 };
      if (horizontal) {
        const mx = (p.x + q.x) / 2;
        pts = [p, { x: mx, y: p.y }, { x: mx, y: q.y }, q];
      } else {
        const my = (p.y + q.y) / 2;
        pts = [p, { x: p.x, y: my }, { x: q.x, y: my }, q];
      }
    }
    pts = dedupePoints(pts);
  } else {
    pts = straightEnds(a, A, B);
  }
  if (pts.length < 2) pts = [pts[0], { ...pts[0] }];
  const start = pts[0];
  const end = pts[pts.length - 1];
  const startDir = unit(start.x - pts[1].x, start.y - pts[1].y);
  const endDir = unit(end.x - pts[pts.length - 2].x, end.y - pts[pts.length - 2].y);
  const drawn = trimPolyline(pts, headStart, headEnd, HEAD_TRIM);
  return { d: roundedPath(drawn), points: pts, start, end, startDir, endDir, mid: pointAtHalfLength(pts) };
}

export function arrowLabelBox(a, g, measure = approxMeasure) {
  if (!a.text || !g) return null;
  const fs = fontSizeOf(a);
  const lh = lineHeight(fs);
  const lines = String(a.text).split("\n");
  const w = Math.max(...lines.map((l) => measure(l, fs, TEXT_WEIGHT))) + 8;
  const h = lines.length * lh + 4;
  return { x: g.mid.x - w / 2, y: g.mid.y - h / 2, w, h, lines, fs, lh };
}

// ---------- bounds and hit testing ----------

// The smallest and largest x and y of a pen stroke's points. Hit testing and marquee selection
// need them for every stroke on every pointer move, so they are worked out once per points array.
// Points are never changed in place: a stroke that moves gets new ones (see translateElement).
const strokeExtents = new WeakMap();
function penExtents(points) {
  let e = strokeExtents.get(points);
  if (!e) {
    e = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    for (let i = 0; i < points.length; i++) {
      const x = points[i][0];
      const y = points[i][1];
      if (x < e.minX) e.minX = x;
      if (x > e.maxX) e.maxX = x;
      if (y < e.minY) e.minY = y;
      if (y > e.maxY) e.maxY = y;
    }
    strokeExtents.set(points, e);
  }
  return e;
}

export function elementBounds(el, byId, measure = approxMeasure) {
  if (isShape(el)) return { x: el.x, y: el.y, w: el.w, h: el.h };
  if (el.type === "text") {
    const l = textLayout(el, measure);
    return { x: el.x, y: el.y, w: l.w, h: l.h };
  }
  if (el.type === "pen") {
    const e = penExtents(el.points);
    const r = el.width / 2;
    const x = e.minX - r;
    const y = e.minY - r;
    return { x, y, w: e.maxX + r - x, h: e.maxY + r - y };
  }
  if (el.type === "arrow") {
    const g = arrowGeometry(el, byId);
    if (!g) return null;
    const boxes = g.points.map((p) => ({ x: p.x, y: p.y, w: 0, h: 0 }));
    const label = arrowLabelBox(el, g, measure);
    if (label) boxes.push(label);
    return unionBounds(boxes);
  }
  return null;
}

export function unionBounds(list) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of list) {
    if (!b) continue;
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  return minX === Infinity ? null : { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function contentBounds(elements, measure = approxMeasure) {
  const byId = new Map(elements.map((e) => [e.id, e]));
  return unionBounds(elements.map((e) => elementBounds(e, byId, measure)));
}

export function distToSegment(px, py, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / len2)) : 0;
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}

export function distToPolyline(px, py, pts) {
  if (pts.length === 1) return Math.hypot(px - pts[0].x, py - pts[0].y);
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) best = Math.min(best, distToSegment(px, py, pts[i - 1], pts[i]));
  return best;
}

// How many points of a pen stroke each piece of simplifyStroke covers.
const STROKE_PIECE = 512;

// Ramer-Douglas-Peucker simplification of a pen stroke ([x, y] points): drops points within
// `eps` of the line the rest make. The first and last points always stay. It runs on pieces of
// STROKE_PIECE points that share their ends (which stay too), because on a jagged stroke the time
// plain RDP takes can grow with the square of the number of points. In pieces it grows in step
// with it.
export function simplifyStroke(points, eps) {
  if (points.length < 3) return points;
  const last = points.length - 1;
  const keep = new Uint8Array(points.length);
  keep[last] = 1;
  const stack = [];
  for (let s = 0; s < last; s += STROKE_PIECE) {
    keep[s] = 1;
    stack.push([s, Math.min(s + STROKE_PIECE, last)]);
  }
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
      if (d > max) {
        max = d;
        idx = i;
      }
    }
    if (idx > 0 && max > eps) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

// A stroke as it is saved: simplified, and then thinned evenly if it still has more points than
// a stroke keeps, so a long stroke loses detail rather than its end.
export function fitStroke(points, eps) {
  return limitPoints(simplifyStroke(points, eps));
}

const inBox = (b, x, y, tol) => b && x >= b.x - tol && x <= b.x + b.w + tol && y >= b.y - tol && y <= b.y + b.h + tol;

// Whether a point is within `reach` of a pen stroke. A stroke whose box is further away is
// skipped without looking at its points, and the rest are measured from the stored [x, y] pairs
// without making an object for each one.
function nearStroke(points, x, y, reach) {
  const e = penExtents(points);
  if (x < e.minX - reach || x > e.maxX + reach || y < e.minY - reach || y > e.maxY + reach) return false;
  const r2 = reach * reach;
  let ax = points[0][0];
  let ay = points[0][1];
  if (points.length === 1) return (x - ax) ** 2 + (y - ay) ** 2 <= r2;
  for (let i = 1; i < points.length; i++) {
    const bx = points[i][0];
    const by = points[i][1];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2)) : 0;
    const ex = x - (ax + t * dx);
    const ey = y - (ay + t * dy);
    if (ex * ex + ey * ey <= r2) return true;
    ax = bx;
    ay = by;
  }
  return false;
}

// Topmost element under a point. Arrows are drawn on top, so they are tested first.
// Unfilled shapes only catch clicks on their outline or label unless nothing else is hit.
export function hitTest(elements, x, y, tol = 4, measure = approxMeasure) {
  const byId = new Map(elements.map((e) => [e.id, e]));
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.type !== "arrow") continue;
    const g = arrowGeometry(el, byId);
    if (!g) continue;
    if (distToPolyline(x, y, g.points) <= tol + 3 || inBox(arrowLabelBox(el, g, measure), x, y, 0)) return el;
  }
  let hollow = null;
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.type === "arrow") continue;
    if (el.type === "pen") {
      if (nearStroke(el.points, x, y, el.width / 2 + tol + 2)) return el;
    } else if (el.type === "text") {
      if (inBox(elementBounds(el, byId, measure), x, y, tol)) return el;
    } else if (isShape(el)) {
      if (el.fill !== "none") {
        if (pointInShape(el, x, y, tol)) return el;
        continue;
      }
      if (pointInShape(el, x, y, tol, "border")) return el;
      if (el.text) {
        const l = shapeLabelLayout(el, measure);
        const w = Math.max(...l.lines.map((s) => measure(s, l.fs, LABEL_WEIGHT)), 0);
        if (inBox({ x: l.cx - w / 2, y: l.top, w, h: l.lines.length * l.lh }, x, y, tol)) return el;
      }
      if (!hollow && pointInShape(el, x, y, tol)) hollow = el;
    }
  }
  return hollow;
}

// Topmost shape (not arrow/text/pen) whose area contains the point. Used for arrow binding.
export function shapeAt(elements, x, y, tol = 0, excludeId = null) {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (isShape(el) && el.id !== excludeId && pointInShape(el, x, y, tol)) return el;
  }
  return null;
}

export function boxesIntersect(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function boxContains(outer, inner) {
  return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;
}
