// Drawing data model shared by the extension (Node) and the editor (browser).
// Pure functions only: no DOM and no file system.

export const GRID = 10;
export const SHAPE_TYPES = ["rect", "ellipse", "diamond", "cylinder"];
export const ELEMENT_TYPES = [...SHAPE_TYPES, "text", "arrow", "pen"];
export const COLORS = ["gray", "blue", "green", "yellow", "orange", "red", "purple", "pink"];
export const FILLS = ["none", "soft", "solid"];
export const HEADS = ["end", "start", "both", "none"];
export const ROUTES = ["straight", "elbow", "curve"];
export const FONT_SIZES = { s: 13, m: 15, l: 20, xl: 28 };
export const SIZE_KEYS = Object.keys(FONT_SIZES);
export const PEN_WIDTHS = { s: 1.5, m: 2.5, l: 4, xl: 6 };
export const DEFAULT_SIZES = { rect: [160, 60], ellipse: [160, 80], diamond: [180, 120], cylinder: [120, 80] };
export const LABEL_WEIGHT = 500;
export const TEXT_WEIGHT = 400;
export const MAX_ELEMENTS = 5000;
// The biggest width or height a shape can have.
export const MAX_SIDE = 5000;

const ID_PREFIX = { rect: "r", ellipse: "o", diamond: "d", cylinder: "c", text: "t", arrow: "a", pen: "p" };
export const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$/;

export const isNum = (v) => typeof v === "number" && Number.isFinite(v);
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const round2 = (v) => Math.round(v * 100) / 100;
export const snap = (v, grid = GRID) => Math.round(v / grid) * grid;
export const isShape = (el) => !!el && SHAPE_TYPES.includes(el.type);
const lower = (v) => (typeof v === "string" ? v.trim().toLowerCase() : "");

function toNum(v, fallback) {
  if (isNum(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return fallback;
}
const coord = (v) => round2(clamp(toNum(v, 0), -1e6, 1e6));

export function newId(prefix = "e") {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let s = prefix;
  for (let i = 0; i < 7; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function uniqueId(prefix, taken) {
  let id = newId(prefix);
  while (taken.has(id)) id = newId(prefix);
  taken.add(id);
  return id;
}

export function idPrefix(type) {
  return ID_PREFIX[type] || "e";
}

const TYPE_ALIASES = {
  rectangle: "rect", box: "rect", square: "rect", process: "rect", node: "rect", shape: "rect", card: "rect", step: "rect",
  circle: "ellipse", oval: "ellipse", terminal: "ellipse", pill: "ellipse",
  decision: "diamond", rhombus: "diamond", condition: "diamond", choice: "diamond",
  database: "cylinder", db: "cylinder", storage: "cylinder", datastore: "cylinder",
  label: "text", note: "text", title: "text",
  line: "arrow", edge: "arrow", connector: "arrow", link: "arrow",
  freehand: "pen", stroke: "pen", sketch: "pen",
};

export function resolveType(raw) {
  let t = lower(raw?.type);
  if ((!t || t === "shape" || t === "node") && raw?.shape) t = lower(raw.shape);
  t = TYPE_ALIASES[t] || t;
  return ELEMENT_TYPES.includes(t) ? t : null;
}

export function resolveShapeType(value, fallback = "rect") {
  const t = TYPE_ALIASES[lower(value)] || lower(value);
  return SHAPE_TYPES.includes(t) ? t : fallback;
}

const COLOR_ALIASES = {
  grey: "gray", black: "gray", white: "gray", default: "gray", neutral: "gray", none: "gray",
  cyan: "blue", navy: "blue", sky: "blue", teal: "green", lime: "green", emerald: "green",
  amber: "yellow", gold: "yellow", violet: "purple", indigo: "purple", lavender: "purple",
  magenta: "pink", rose: "pink", crimson: "red", brown: "orange",
};

export function normalizeColor(value, fallback = "gray") {
  const s = lower(value);
  if (!s) return fallback;
  if (COLORS.includes(s)) return s;
  if (COLOR_ALIASES[s]) return COLOR_ALIASES[s];
  if (/^#[0-9a-f]{6}$/.test(s)) return s;
  if (/^#[0-9a-f]{3}$/.test(s)) return "#" + [...s.slice(1)].map((c) => c + c).join("");
  return fallback;
}

export function normalizeFill(value, fallback = "soft") {
  if (value === true) return "soft";
  if (value === false) return "none";
  const s = lower(value);
  if (FILLS.includes(s)) return s;
  const alias = {
    outline: "none", transparent: "none", empty: "none", hollow: "none",
    light: "soft", tint: "soft", tinted: "soft", pastel: "soft",
    filled: "solid", full: "solid", strong: "solid", bold: "solid", dark: "solid",
  };
  return alias[s] || fallback;
}

export function normalizeHead(value, fallback = "end") {
  if (value === false) return "none";
  if (value === true) return "end";
  const s = lower(value);
  if (HEADS.includes(s)) return s;
  const alias = {
    arrow: "end", forward: "end", to: "end", back: "start", backward: "start", reverse: "start", from: "start",
    "two-way": "both", bidirectional: "both", double: "both", line: "none", no: "none", off: "none", plain: "none",
  };
  return alias[s] || fallback;
}

export function normalizeRoute(value, fallback = "straight") {
  const s = lower(value);
  if (ROUTES.includes(s)) return s;
  const alias = {
    direct: "straight", line: "straight", linear: "straight",
    orthogonal: "elbow", step: "elbow", elbowed: "elbow", manhattan: "elbow", angled: "elbow",
    curved: "curve", bezier: "curve", spline: "curve", smooth: "curve", arc: "curve",
  };
  return alias[s] || fallback;
}

export function normalizeSize(value, fallback = "m") {
  if (isNum(value)) {
    let best = fallback;
    let diff = Infinity;
    for (const k of SIZE_KEYS) {
      const d = Math.abs(FONT_SIZES[k] - value);
      if (d < diff) { diff = d; best = k; }
    }
    return best;
  }
  const s = lower(value);
  if (SIZE_KEYS.includes(s)) return s;
  const alias = { small: "s", sm: "s", medium: "m", md: "m", normal: "m", large: "l", lg: "l", big: "l", xlarge: "xl", "x-large": "xl", huge: "xl" };
  return alias[s] || fallback;
}

export function normalizeText(value) {
  if (typeof value === "number") return String(value);
  if (typeof value !== "string") return "";
  // eslint-disable-next-line no-control-regex
  return value.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").slice(0, 4000);
}

function refId(value) {
  return typeof value === "string" && ID_PATTERN.test(value) ? value : null;
}

function normalizePoints(points) {
  if (!Array.isArray(points)) return [];
  const out = [];
  for (const p of points.slice(0, 5000)) {
    const nx = toNum(Array.isArray(p) ? p[0] : p?.x, NaN);
    const ny = toNum(Array.isArray(p) ? p[1] : p?.y, NaN);
    if (Number.isFinite(nx) && Number.isFinite(ny)) {
      out.push([Math.round(clamp(nx, -1e6, 1e6) * 10) / 10, Math.round(clamp(ny, -1e6, 1e6) * 10) / 10]);
    }
  }
  return out;
}

// Turns loose input (from the editor, a file or the agent) into a clean element, or null.
export function normalizeElement(raw) {
  if (!raw || typeof raw !== "object") return null;
  const type = resolveType(raw);
  if (!type) return null;
  const id = typeof raw.id === "string" && ID_PATTERN.test(raw.id) ? raw.id : newId(ID_PREFIX[type]);
  const color = normalizeColor(raw.color);
  const dash = Boolean(raw.dash ?? raw.dashed);
  if (isShape({ type })) {
    const [dw, dh] = DEFAULT_SIZES[type];
    return {
      id, type,
      x: coord(raw.x), y: coord(raw.y),
      w: round2(clamp(toNum(raw.w ?? raw.width, dw), 10, MAX_SIDE)),
      h: round2(clamp(toNum(raw.h ?? raw.height, dh), 10, MAX_SIDE)),
      text: normalizeText(raw.text ?? raw.label),
      color, fill: normalizeFill(raw.fill), dash, size: normalizeSize(raw.size ?? raw.fontSize),
    };
  }
  if (type === "text") {
    return { id, type, x: coord(raw.x), y: coord(raw.y), text: normalizeText(raw.text ?? raw.label), color, size: normalizeSize(raw.size ?? raw.fontSize) };
  }
  if (type === "arrow") {
    return {
      id, type,
      from: refId(raw.from ?? raw.source), to: refId(raw.to ?? raw.target),
      x1: coord(raw.x1), y1: coord(raw.y1), x2: coord(raw.x2), y2: coord(raw.y2),
      text: normalizeText(raw.text ?? raw.label),
      color, dash,
      head: normalizeHead(raw.head, lower(raw.type) === "line" ? "none" : "end"),
      route: normalizeRoute(raw.route),
      size: normalizeSize(raw.size ?? raw.fontSize, "s"),
    };
  }
  const points = normalizePoints(raw.points);
  if (!points.length) return null;
  return { id, type: "pen", points, color, width: round2(clamp(toNum(raw.width ?? raw.strokeWidth, PEN_WIDTHS.m), 0.5, 24)) };
}

// Normalizes a whole list: fixes duplicate ids and drops arrows that point at missing shapes.
// Anything past `limit` elements is dropped.
export function normalizeElements(list, limit = MAX_ELEMENTS) {
  const out = [];
  const taken = new Set();
  for (const raw of Array.isArray(list) ? list.slice(0, limit) : []) {
    const el = normalizeElement(raw);
    if (!el) continue;
    if (taken.has(el.id)) el.id = uniqueId(ID_PREFIX[el.type], taken);
    taken.add(el.id);
    out.push(el);
  }
  const shapes = new Set(out.filter(isShape).map((e) => e.id));
  return out.filter((el) => {
    if (el.type !== "arrow") return true;
    if (el.from && !shapes.has(el.from)) return false;
    if (el.to && !shapes.has(el.to)) return false;
    if (el.from && el.from === el.to) return false;
    if (!el.from && !el.to && Math.hypot(el.x2 - el.x1, el.y2 - el.y1) < 1) return false;
    return true;
  });
}

// Merges element-level changes: { upserts: [element], deletes: [id], order?: [id] }.
export function applyOps(elements, ops = {}, limit = MAX_ELEMENTS) {
  return normalizeElements(mergeOps(elements, ops), limit);
}

// The merge step of applyOps, before the list is cleaned up.
export function mergeOps(elements, ops = {}) {
  const map = new Map(elements.map((e) => [e.id, e]));
  for (const id of Array.isArray(ops.deletes) ? ops.deletes : []) map.delete(id);
  for (const raw of Array.isArray(ops.upserts) ? ops.upserts : []) {
    const el = normalizeElement(raw);
    if (el) map.set(el.id, el);
  }
  let list = [...map.values()];
  if (Array.isArray(ops.order) && ops.order.length) {
    const rank = new Map(ops.order.map((id, i) => [id, i]));
    const known = list.filter((e) => rank.has(e.id)).sort((a, b) => rank.get(a.id) - rank.get(b.id));
    list = [...known, ...list.filter((e) => !rank.has(e.id))];
  }
  return list;
}

// Removes elements plus any arrows attached to them.
export function removeWithArrows(elements, ids) {
  const del = new Set(ids);
  for (const el of elements) if (el.type === "arrow" && (del.has(el.from) || del.has(el.to))) del.add(el.id);
  return {
    elements: elements.filter((e) => !del.has(e.id)),
    removed: elements.filter((e) => del.has(e.id)).map((e) => e.id),
  };
}

// ---------- colors ----------

export const LIGHT_PALETTE = {
  bg: "#ffffff", ink: "#1f2328",
  blue: "#0969da", green: "#1a7f37", yellow: "#9a6700", orange: "#bc4c00",
  red: "#cf222e", purple: "#8250df", pink: "#bf3989",
};
export const DARK_PALETTE = {
  bg: "#0d1117", ink: "#e6edf3",
  blue: "#4493f8", green: "#3fb950", yellow: "#d29922", orange: "#db6d28",
  red: "#f85149", purple: "#ab7df8", pink: "#db61a2",
};

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = (rgb) => "#" + rgb.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("");

export function mixHex(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return toHex(ca.map((v, i) => v * t + cb[i] * (1 - t)));
}

export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Text color for a solid background. Dark and white text have equal contrast at about 0.21.
export function textOn(hex) {
  return luminance(hex) > 0.21 ? "#1f2328" : "#ffffff";
}

// Returns paint(color, role) resolving element colors to hex for a palette.
// Roles: stroke, soft (tinted fill), solid (strong fill), onSolid (text on solid), ink (text), bg.
export function staticPaint(palette = LIGHT_PALETTE) {
  const pal = { ...LIGHT_PALETTE, ...palette };
  const dark = luminance(pal.bg) < 0.4;
  const base = (color) => (color === "gray" ? pal.ink : String(color).startsWith("#") ? color : pal[color] || pal.ink);
  return (color, role) => {
    const c = base(color);
    switch (role) {
      case "soft": return mixHex(c, pal.bg, color === "gray" ? (dark ? 0.12 : 0.06) : (dark ? 0.24 : 0.14));
      case "onSolid": return textOn(c);
      case "bg": return pal.bg;
      default: return c;
    }
  };
}
