// Renders drawing elements to SVG markup. Used for the live editor and for exports.
import { FONT_SIZES, LABEL_WEIGHT, TEXT_WEIGHT, isShape, staticPaint } from "./model.mjs";
import {
  HEAD_LENGTH, HEAD_HALF_WIDTH, fmt, lineHeight, baselineOffset, approxMeasure, cylinderCap,
  shapeLabelLayout, textLayout, arrowGeometry, arrowLabelBox, contentBounds,
} from "./geometry.mjs";

export function escapeXml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const DASH = ' stroke-dasharray="6 6"';

export function outline(s, attrs) {
  const { x, y, w, h } = s;
  if (s.type === "ellipse") {
    return `<ellipse cx="${fmt(x + w / 2)}" cy="${fmt(y + h / 2)}" rx="${fmt(w / 2)}" ry="${fmt(h / 2)}"${attrs}/>`;
  }
  if (s.type === "diamond") {
    return `<path d="M${fmt(x + w / 2)} ${fmt(y)} L${fmt(x + w)} ${fmt(y + h / 2)} L${fmt(x + w / 2)} ${fmt(y + h)} L${fmt(x)} ${fmt(y + h / 2)} Z"${attrs}/>`;
  }
  if (s.type === "cylinder") {
    const c = cylinderCap(s);
    const rx = fmt(w / 2);
    const body = `M${fmt(x)} ${fmt(y + c)} L${fmt(x)} ${fmt(y + h - c)} A${rx} ${fmt(c)} 0 0 0 ${fmt(x + w)} ${fmt(y + h - c)} L${fmt(x + w)} ${fmt(y + c)} A${rx} ${fmt(c)} 0 0 0 ${fmt(x)} ${fmt(y + c)} Z`;
    return `<path d="${body}"${attrs}/><ellipse cx="${fmt(x + w / 2)}" cy="${fmt(y + c)}" rx="${rx}" ry="${fmt(c)}"${attrs}/>`;
  }
  const r = Math.min(8, w / 4, h / 4);
  return `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" rx="${fmt(r)}"${attrs}/>`;
}

function textLines(lines, x, top, fs, lh, weight, fill, anchor) {
  const base = baselineOffset(fs, lh);
  let out = `<text font-size="${fs}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">`;
  lines.forEach((line, i) => {
    out += `<tspan x="${fmt(x)}" y="${fmt(top + i * lh + base)}">${escapeXml(line) || " "}</tspan>`;
  });
  return `${out}</text>`;
}

function renderShape(s, ctx) {
  const stroke = ctx.paint(s.color, "stroke");
  const fill = s.fill === "solid" ? ctx.paint(s.color, "solid") : s.fill === "soft" ? ctx.paint(s.color, "soft") : "none";
  const attrs = ` fill="${fill}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"${s.dash ? DASH : ""}`;
  let out = outline(s, attrs);
  if (s.text && ctx.hideText !== s.id) {
    const l = shapeLabelLayout(s, ctx.measure);
    const ink = s.fill === "solid" ? ctx.paint(s.color, "onSolid") : ctx.paint("gray", "ink");
    out += textLines(l.lines, l.cx, l.top, l.fs, l.lh, LABEL_WEIGHT, ink, "middle");
  }
  return `<g data-id="${escapeXml(s.id)}">${out}</g>`;
}

function renderText(t, ctx) {
  if (ctx.hideText === t.id || !t.text) return "";
  const l = textLayout(t, ctx.measure);
  return `<g data-id="${escapeXml(t.id)}">${textLines(l.lines, t.x, t.y, l.fs, l.lh, TEXT_WEIGHT, ctx.paint(t.color, "ink"), "start")}</g>`;
}

export function penPath(points) {
  const p = points;
  if (p.length === 1) return `M${fmt(p[0][0])} ${fmt(p[0][1])} l0.01 0`;
  if (p.length === 2) return `M${fmt(p[0][0])} ${fmt(p[0][1])} L${fmt(p[1][0])} ${fmt(p[1][1])}`;
  let d = `M${fmt(p[0][0])} ${fmt(p[0][1])}`;
  for (let i = 1; i < p.length - 1; i++) {
    const mx = (p[i][0] + p[i + 1][0]) / 2;
    const my = (p[i][1] + p[i + 1][1]) / 2;
    d += ` Q${fmt(p[i][0])} ${fmt(p[i][1])} ${fmt(mx)} ${fmt(my)}`;
  }
  const last = p[p.length - 1];
  return `${d} L${fmt(last[0])} ${fmt(last[1])}`;
}

function renderPen(el, ctx) {
  return `<path data-id="${escapeXml(el.id)}" d="${penPath(el.points)}" fill="none" stroke="${ctx.paint(el.color, "stroke")}" stroke-width="${fmt(el.width)}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function headPath(tip, dir) {
  const bx = tip.x - dir.x * HEAD_LENGTH;
  const by = tip.y - dir.y * HEAD_LENGTH;
  const px = -dir.y * HEAD_HALF_WIDTH;
  const py = dir.x * HEAD_HALF_WIDTH;
  return `M${fmt(tip.x)} ${fmt(tip.y)} L${fmt(bx + px)} ${fmt(by + py)} L${fmt(bx - px)} ${fmt(by - py)} Z`;
}

function renderArrow(a, byId, ctx) {
  const g = arrowGeometry(a, byId);
  if (!g) return "";
  const stroke = ctx.paint(a.color, "stroke");
  let out = `<path d="${g.d}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${a.dash ? DASH : ""}/>`;
  const head = (tip, dir) => `<path d="${headPath(tip, dir)}" fill="${stroke}" stroke="${stroke}" stroke-width="1" stroke-linejoin="round"/>`;
  if (a.head === "end" || a.head === "both") out += head(g.end, g.endDir);
  if (a.head === "start" || a.head === "both") out += head(g.start, g.startDir);
  if (a.text && ctx.hideText !== a.id) {
    const box = arrowLabelBox(a, g, ctx.measure);
    out += `<rect x="${fmt(box.x)}" y="${fmt(box.y)}" width="${fmt(box.w)}" height="${fmt(box.h)}" rx="4" fill="${ctx.paint("gray", "bg")}"/>`;
    out += textLines(box.lines, g.mid.x, box.y + 2, box.fs, box.lh, TEXT_WEIGHT, ctx.paint(a.color, "ink"), "middle");
  }
  return `<g data-id="${escapeXml(a.id)}">${out}</g>`;
}

// Returns SVG markup (no <svg> wrapper). Arrows are drawn last so they sit on top.
export function renderElements(elements, { measure = approxMeasure, paint = staticPaint(), hideText = null } = {}) {
  const byId = new Map(elements.map((e) => [e.id, e]));
  const ctx = { measure, paint, hideText };
  const parts = [];
  for (const el of elements) {
    if (isShape(el)) parts.push(renderShape(el, ctx));
    else if (el.type === "text") parts.push(renderText(el, ctx));
    else if (el.type === "pen") parts.push(renderPen(el, ctx));
  }
  for (const el of elements) if (el.type === "arrow") parts.push(renderArrow(el, byId, ctx));
  return parts.join("");
}

export const DEFAULT_FONT = "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif";

// A complete SVG document sized to the content.
export function renderStandaloneSVG(elements, { measure = approxMeasure, paint = staticPaint(), fontFamily = DEFAULT_FONT, padding = 32, background = null } = {}) {
  const b = contentBounds(elements, measure) || { x: 0, y: 0, w: 240, h: 120 };
  const x = Math.floor(b.x - padding);
  const y = Math.floor(b.y - padding);
  const w = Math.ceil(b.w + 2 * padding);
  const h = Math.ceil(b.h + 2 * padding);
  const bg = background ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${escapeXml(background)}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}" font-family="${escapeXml(fontFamily)}">${bg}${renderElements(elements, { measure, paint })}</svg>`;
}

export { FONT_SIZES, lineHeight };
