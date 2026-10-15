export const VISUAL_CSS = `
.timeline-controls, .timeline-readout, .record-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
.timeline-controls { justify-content: flex-start; margin: 8px 0 14px; }
.timeline-controls label { color: var(--muted); font-size: 11px; }
.timeline-controls input { margin-left: 7px; max-width: 150px; padding: 6px 8px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); color: var(--ink); font: inherit; color-scheme: light dark; }
.timeline-controls .brief-btn { font-size: 11px; }
.timeline-graphic { width: 100%; display: block; overflow: visible; }
.timeline-graphic text { font-size: 14px; }
.timeline-point { cursor: pointer; outline: none; }
.timeline-point:focus-visible .point-dot { stroke: var(--focus, #007a72); stroke-width: 4px; }
.timeline-readout { padding: 14px 0 4px; min-height: 65px; }
.timeline-reading { min-width: 0; }
.timeline-reading small { display: block; color: var(--muted); font-size: 11px; margin-bottom: 4px; }
.timeline-reading strong { font-size: 23px; font-weight: 600; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.timeline-navigation { display: flex; align-items: center; gap: 6px; }
.timeline-navigation button { min-width: 44px; min-height: 44px; }
.visual-info { font-size: 12px; color: var(--muted); }
.visual-info summary { font-size: 11px; }
.visual-info p { margin: 8px 0; line-height: 1.6; overflow-wrap: anywhere; }
.visual-info.compact summary { list-style: none; border: 1px solid var(--border); border-radius: 50%; width: 24px; height: 24px; display: grid; place-items: center; padding: 0; }
.visual-info summary::-webkit-details-marker { display: none; }
.counter-details { display: grid; gap: 10px; margin: 18px 0; }
.counter-detail { min-width: 0; border: 1px solid var(--border); border-radius: 13px; background: var(--surface); }
.counter-detail > summary { display: grid; grid-template-columns: minmax(0, 1fr) auto 16px; align-items: center; gap: 8px 12px; min-height: 56px; padding: 14px 16px; list-style: none; color: var(--ink); }
.counter-detail > summary::-webkit-details-marker { display: none; }
.counter-detail > summary::after { content: "+"; grid-column: 3; grid-row: 1; color: var(--accent); text-align: center; font-size: 18px; }
.counter-detail[open] > summary::after { content: "-"; }
.counter-name { display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 13px; }
.counter-name .dot { flex-shrink: 0; width: 8px; height: 8px; border-radius: 50%; }
.counter-total { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 6px; min-width: 0; }
.counter-total b { font-size: 16px; font-weight: 600; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.counter-total .counter-badge { margin-left: 0; }
.counter-ratio { grid-column: 1 / -1; color: var(--muted); font-size: 12px; }
.counter-detail .visual-track { grid-column: 1 / -1; }
.counter-evidence { padding: 0 16px 14px; color: var(--muted); font-size: 12px; }
.counter-evidence p { margin: 7px 0; overflow-wrap: anywhere; }
.counter-badge { display: inline-block; color: var(--coach); font-size: 10px; border: 1px solid var(--border); border-radius: 12px; padding: 3px 7px; margin-left: 7px; vertical-align: middle; }
.counter-badge.missing { color: var(--muted); }
.visual-track { height: 7px; border-radius: 8px; overflow: hidden; background: var(--track); }
.visual-fill { display: block; height: 100%; border-radius: inherit; background: var(--coach); }
.visual-track.unrecorded { background: repeating-linear-gradient(135deg, var(--track), var(--track) 4px, var(--surface) 4px, var(--surface) 8px); }
.contribution-list, .session-cards { display: grid; gap: 10px; margin-top: 14px; }
.inspector .contribution-card, .inspector .session-card { display: block; width: 100%; max-width: none; border: 1px solid var(--border); border-radius: 13px; background: var(--surface); color: var(--ink); padding: 14px 16px; text-align: left; text-decoration: none; cursor: pointer; }
.contribution-card:hover, .session-card:hover { border-color: var(--coach); background: var(--coach-soft); }
.record-name { min-width: 0; flex: 1; overflow-wrap: anywhere; font-size: 12px; line-height: 1.5; }
.record-value { color: var(--coach); font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; }
.contribution-card .visual-track, .session-card .visual-track { margin: 12px 0 4px; }
.record-counters { display: flex; flex-wrap: wrap; gap: 7px 16px; margin-top: 10px; color: var(--muted); font-size: 11px; }
.record-counters b { color: var(--ink); font-weight: 500; }
.share-visual { display: flex; flex-wrap: wrap; align-items: center; gap: 18px; margin: 20px 0; }
.share-visual svg { width: 106px; height: 106px; }
.share-visual b { display: block; font-size: 24px; font-weight: 600; }
.share-visual small { color: var(--muted); font-size: 12px; }
.session-meta { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
.scope-chip { font-size: 11px; padding: 6px 10px; border: 1px solid var(--border); border-radius: 20px; color: var(--muted); overflow-wrap: anywhere; }
@media (max-width: 460px) {
  .counter-detail > summary { padding: 12px; gap: 8px; }
  .counter-evidence { padding: 0 12px 12px; }
  .timeline-reading strong { font-size: 20px; }
  .record-top { gap: 7px; }
  .timeline-graphic text { font-size: 24px; }
}
`;

export const VISUAL_JS = String.raw`
let visualSequence = 0;
const COUNTER_EXPLANATIONS = {
  aiu: "Recorded AIU, not money, an allowance, or account-wide billing.",
  tokens: "Input + output, including repeated context. Cache and reasoning are not added again.",
  requests: "Recorded model calls, including agent-loop and sub-agent requests. Not premium-request billing units.",
  input: "Recorded input tokens, including context supplied again on subsequent calls.",
  output: "Recorded output tokens.",
  cacheRead: "Cache reads overlap input; they are not extra tokens.",
  cacheWrite: "Cache writes may overlap input; they are not extra tokens.",
  reasoning: "Reasoning may overlap output; it is not added to total tokens.",
};
const TOKEN_COLORS = { input: "--c1", output: "--c3", cacheRead: "--c6", cacheWrite: "--c2", reasoning: "--c5" };
const COUNTER_PARENTS = { input: "tokens", output: "tokens", cacheRead: "input", cacheWrite: "input", reasoning: "output" };
function visualInfo(label, lines, compact = false) {
  const details = el("details", "visual-info" + (compact ? " compact" : ""));
  const summary = el("summary", null, compact ? "i" : label);
  summary.setAttribute("aria-label", label);
  details.appendChild(summary);
  lines.filter(Boolean).forEach(line => details.appendChild(el("p", null, line)));
  return details;
}
function counterStatus(key, metric) {
  if (metric.value == null) return "Not recorded";
  if (!metric.totalCalls) return key === "requests" ? "No observed calls" : "Not recorded";
  return metric.complete ? "" : "Partial";
}
function counterBadge(key, metric) {
  const text = counterStatus(key, metric);
  return text ? el("span", "counter-badge" + (text === "Not recorded" ? " missing" : ""), text) : null;
}
function counterDetails(metrics, keys = ["input", "output", "cacheRead", "cacheWrite", "reasoning", "tokens", "aiu", "requests"], proportions = false) {
  const group = el("div", "counter-details");
  keys.forEach(key => {
    const metric = metrics[key], row = el("details", "counter-detail"), summary = el("summary");
    row.dataset.counter = key;
    const name = el("span", "counter-name");
    if (TOKEN_COLORS[key]) {
      const dot = el("span", "dot"); dot.style.background = cvar(TOKEN_COLORS[key]);
      dot.setAttribute("aria-hidden", "true"); name.appendChild(dot);
    }
    name.appendChild(el("span", null, METRIC_LABELS[key]));
    summary.appendChild(name);
    const value = el("span", "counter-total");
    value.appendChild(el("b", null, metricText(key, metric)));
    const badge = counterBadge(key, metric);
    if (badge) value.appendChild(badge);
    summary.appendChild(value);
    const parent = COUNTER_PARENTS[key], base = parent && metrics[parent];
    if (proportions && parent) {
      const qualified = metric.complete && base.complete && base.value > 0 &&
        metric.value != null && metric.value >= 0 && metric.value <= base.value;
      summary.appendChild(el("span", "counter-ratio", qualified
        ? (metric.value / base.value * 100).toFixed(1) + "% of " + (parent === "tokens" ? "total tokens" : parent)
        : "Share unavailable"));
      summary.appendChild(visualTrack(qualified ? metric.value : null, base.value, !qualified, cvar(TOKEN_COLORS[key])));
    }
    row.appendChild(summary);
    const evidence = el("div", "counter-evidence");
    evidence.appendChild(el("p", null, COUNTER_EXPLANATIONS[key]));
    evidence.appendChild(el("p", null, metric.completeCalls + " / " + metric.totalCalls + " calls have complete counters."));
    if (proportions && parent) evidence.appendChild(el("p", null,
      "Shares need complete counters and a positive parent total. Counters that do not fit within their parent are shown without a percentage."));
    row.appendChild(evidence); group.appendChild(row);
  });
  return group;
}
function visualTrack(value, total, missing = false, color = null) {
  const track = el("div", "visual-track" + (missing ? " unrecorded" : ""));
  track.setAttribute("aria-hidden", "true");
  if (value != null) {
    const fill = el("span", "visual-fill");
    fill.style.width = (total > 0 ? Math.min(100, value / total * 100) : 0) + "%";
    if (color) fill.style.background = color;
    track.appendChild(fill);
  }
  return track;
}
function contributionCard(label, key, metrics, total) {
  const button = el("button", "model-link contribution-card");
  button.type = "button";
  const top = el("div", "record-top");
  top.appendChild(el("span", "record-name", label));
  top.appendChild(el("span", "record-value", metricText(key, metrics[key], true)));
  button.appendChild(top);
  const badge = counterBadge(key, metrics[key]);
  if (badge) button.appendChild(badge);
  button.appendChild(visualTrack(metrics[key].value, total, metrics[key].value == null));
  button.setAttribute("aria-label", label + ": " + METRIC_LABELS[key] + " " + metricText(key, metrics[key]) +
    (counterStatus(key, metrics[key]) ? ", " + counterStatus(key, metrics[key]) : "") + ". Open details.");
  return button;
}
function shareVisual(share, label = "recorded AIU") {
  const box = el("div", "share-visual");
  const ring = svg("svg", { viewBox: "0 0 120 120", role: "img", "aria-label": (share * 100).toFixed(1) + "% of " + label });
  ring.appendChild(svg("circle", { cx: 60, cy: 60, r: 46, fill: "none", stroke: cvar("--track"), "stroke-width": 10 }));
  ring.appendChild(svg("circle", { cx: 60, cy: 60, r: 46, fill: "none", stroke: cvar("--coach"),
    "stroke-width": 10, "stroke-linecap": "round", "stroke-dasharray": (share * 289.0265) + " 289.0265", transform: "rotate(-90 60 60)" }));
  box.appendChild(ring);
  const copy = el("div"); copy.appendChild(el("b", null, (share * 100).toFixed(1) + "%"));
  copy.appendChild(el("small", null, "of " + label)); box.appendChild(copy);
  return box;
}
function renderTimeline(target, series, key, options = {}) {
  target.replaceChildren();
  const points = series.points;
  if (!points.length) {
    target.appendChild(el("p", "panel-note", "No recorded calls in this graph window."));
    return;
  }
  const known = points.filter(point => point.metrics[key].value != null);
  const max = Math.max(1, ...known.map(point => point.metrics[key].value));
  const baseline = 194, left = 36, right = 624;
  const x = index => points.length === 1 ? 330 : left + index / (points.length - 1) * (right - left);
  const y = value => baseline - value / max * 152;
  const chart = svg("svg", { viewBox: "0 0 660 235", class: "timeline-graphic", role: "group",
    "aria-label": METRIC_LABELS[key] + " timeline. Use arrow keys to explore points." });
  const id = "timeline-gradient-" + ++visualSequence;
  const defs = svg("defs", {}), gradient = svg("linearGradient", { id, x1: "0", y1: "0", x2: "0", y2: "1" });
  gradient.appendChild(svg("stop", { offset: "0%", "stop-color": cvar("--coach"), "stop-opacity": .25 }));
  gradient.appendChild(svg("stop", { offset: "100%", "stop-color": cvar("--coach"), "stop-opacity": .02 }));
  defs.appendChild(gradient); chart.appendChild(defs);
  [0, .5, 1].forEach(fraction => {
    const yy = y(max * fraction);
    chart.appendChild(svg("line", { x1: left, x2: right, y1: yy, y2: yy, stroke: cvar("--border"), "stroke-dasharray": fraction ? "3 6" : "none" }));
    const label = svg("text", { x: left, y: yy - 8, fill: cvar("--muted"), "font-size": 11 });
    label.textContent = fmtCompact(max * fraction); chart.appendChild(label);
  });
  let segment = [];
  function drawSegment() {
    if (segment.length > 1) {
      const line = segment.map(([xx, yy], index) => (index ? "L" : "M") + xx + " " + yy).join(" ");
      chart.appendChild(svg("path", { d: line + " L" + segment.at(-1)[0] + " " + baseline + " L" + segment[0][0] + " " + baseline + " Z",
        fill: "url(#" + id + ")", "aria-hidden": "true" }));
      chart.appendChild(svg("path", { d: line, fill: "none", stroke: cvar("--coach"), "stroke-width": 3, "stroke-linejoin": "round", "aria-hidden": "true" }));
    }
    segment = [];
  }
  points.forEach((point, index) => {
    const value = point.metrics[key].value;
    if (value == null) drawSegment();
    else segment.push([x(index), y(value)]);
  });
  drawSegment();
  [0, points.length - 1].filter((index, pos, all) => all.indexOf(index) === pos).forEach(index => {
    const label = svg("text", { x: points.length === 1 ? x(index) : index ? right : left, y: 226,
      "text-anchor": points.length === 1 ? "middle" : index ? "end" : "start", fill: cvar("--muted"), "font-size": 12 });
    label.textContent = new Date(points[index].date + "T12:00:00Z").toLocaleDateString("en-US", {
      month: "short", day: "numeric", timeZone: "UTC",
    }); chart.appendChild(label);
  });
  const guide = svg("line", { y1: 28, y2: baseline, stroke: cvar("--coach"), "stroke-opacity": .35, "stroke-dasharray": "3 5" });
  chart.appendChild(guide);
  const reading = el("div", "timeline-reading"), readout = el("div", "timeline-readout");
  reading.setAttribute("aria-live", "polite");
  const nav = el("div", "timeline-navigation");
  const previous = el("button", "brief-btn", "\u2190"), next = el("button", "brief-btn", "\u2192");
  previous.type = next.type = "button";
  previous.setAttribute("aria-label", "Previous graph point"); next.setAttribute("aria-label", "Next graph point");
  nav.appendChild(previous); nav.appendChild(next);
  nav.appendChild(visualInfo("About this graph", [
    "Graph dates do not change the selected-range totals. Time zone: " + state.data.timeZone + ".",
    "Gaps are missing observations, not zero consumption. Today and edge buckets may be partial.",
  ], true));
  readout.appendChild(reading); readout.appendChild(nav);
  let selected = Math.max(0, points.findIndex(point => point.date === options.selected));
  if (!options.selected) selected = points.length - 1;
  const controls = [];
  function select(index, focus = false) {
    selected = index;
    const point = points[index], metric = point.metrics[key];
    reading.replaceChildren(el("small", null, niceDate(point.date) + " \u00b7 " + METRIC_LABELS[key]));
    reading.appendChild(el("strong", null, metricText(key, metric)));
    const badge = counterBadge(key, metric);
    if (badge) reading.appendChild(badge);
    controls.forEach((entry, pos) => {
      entry.group.setAttribute("tabindex", pos === index ? "0" : "-1");
      entry.group.setAttribute("aria-pressed", String(pos === index));
      entry.dot.setAttribute("r", pos === index ? 6 : 3.5);
    });
    guide.setAttribute("x1", x(index)); guide.setAttribute("x2", x(index));
    previous.disabled = index === 0; next.disabled = index === points.length - 1;
    if (options.onSelect) options.onSelect(point.date);
    if (focus) controls[index].group.focus();
  }
  points.forEach((point, index) => {
    const metric = point.metrics[key], yy = metric.value == null ? baseline : y(metric.value);
    const group = svg("g", { class: "timeline-point", role: "button", tabindex: -1,
      "aria-label": niceDate(point.date) + ": " + METRIC_LABELS[key] + " " + metricText(key, metric) +
        (counterStatus(key, metric) ? ", " + counterStatus(key, metric) : "") });
    group.dataset.date = point.date;
    group.appendChild(svg("circle", { cx: x(index), cy: yy, r: 20, fill: "transparent" }));
    const dot = svg("circle", { class: "point-dot", cx: x(index), cy: yy, r: 3.5,
      fill: metric.value == null ? cvar("--surface") : cvar("--coach"), stroke: cvar("--coach"), "stroke-width": 1.5 });
    group.appendChild(dot);
    group.addEventListener("pointerenter", () => select(index));
    group.addEventListener("click", () => select(index));
    group.addEventListener("focus", () => select(index));
    group.addEventListener("keydown", event => {
      let position;
      if (event.key === "ArrowLeft") position = Math.max(0, index - 1);
      else if (event.key === "ArrowRight") position = Math.min(points.length - 1, index + 1);
      else if (event.key === "Home") position = 0;
      else if (event.key === "End") position = points.length - 1;
      else if (event.key === "Enter" || event.key === " ") position = index;
      else return;
      event.preventDefault(); select(position, true);
    });
    chart.appendChild(group); controls.push({ group, dot });
  });
  previous.addEventListener("click", () => select(Math.max(0, selected - 1)));
  next.addEventListener("click", () => select(Math.min(points.length - 1, selected + 1)));
  target.appendChild(chart); target.appendChild(readout);
  select(selected);
}
`;
