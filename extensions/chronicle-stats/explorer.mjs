import { VISUAL_CSS, VISUAL_JS } from "./visuals.mjs";

export const EXPLORER_CSS = `
${VISUAL_CSS}
.pulse { padding: 20px 22px; margin-bottom: 18px; border: 1px solid color-mix(in srgb, var(--coach) 26%, var(--border)); border-radius: 16px; background: var(--coach-soft); }
.pulse-eyebrow { margin: 0 0 8px; font-size: 11px; font-weight: 600; color: var(--coach); }
.pulse-eyebrow span { color: var(--muted); font-weight: 400; margin-left: 8px; }
.pulse h2 { margin: 0; font-size: 20px; line-height: 1.35; letter-spacing: -.4px; overflow-wrap: anywhere; }
#pulse-summary { margin: 8px 0 14px; color: var(--muted); font-size: 12px; max-width: 70ch; }
.pulse-actions, .pulse-follow, .inspector-bar, .inspect-pagination { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.pulse-follow { margin-top: 12px; font-size: 12px; }
.pulse-follow:empty { display: none; }
.primary-strip { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.primary-strip .kpi { padding: 0; overflow: hidden; }
.primary-strip .kpi { display: flex; flex-direction: column; }
.primary-strip .metric-details { margin-top: auto; }
.metric-select { display: block; width: 100%; text-align: left; border: 0; background: transparent; color: var(--ink); padding: 15px 16px 7px; cursor: pointer; }
.metric-select[aria-pressed="true"] { background: var(--coach-soft); }
.metric-select .v, .metric-select .l { display: block; }
.metric-select .v { font-size: 27px; line-height: 1.3; font-weight: 600; font-variant-numeric: tabular-nums; }
.metric-select .l { color: var(--muted); font-size: 11px; margin-bottom: 3px; }
.metric-details { min-height: 38px; width: 100%; border: 0; border-top: 1px solid var(--border); color: var(--accent); background: transparent; font-size: 11px; text-align: left; padding: 8px 16px; cursor: pointer; }
.metric-note { display: block; min-height: 30px; padding: 0 16px 8px; color: var(--muted); font-size: 10px; line-height: 1.45; }
.activity-summary { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 14px; }
.activity-summary .kpi { border: 0; background: transparent; padding: 0; }
.activity-summary .v { font-size: 17px; }
.model-link { border: 0; padding: 5px 0; color: var(--ink); background: transparent; text-align: left; cursor: pointer; text-decoration: underline; text-underline-offset: 4px; text-decoration-color: var(--border); }
.model-link:hover { color: var(--accent); text-decoration-color: currentColor; }
.privacy-control { display: flex; gap: 7px; align-items: center; color: var(--muted); font-size: 11px; margin-bottom: 10px; }
summary { cursor: pointer; color: var(--accent); font-size: 12px; padding: 5px 0; }
.inspector { margin-top: 16px; }
.inspector h2 { font-size: 23px; margin: 16px 0 6px; overflow-wrap: anywhere; }
.inspector h3 { font-size: 14px; margin: 22px 0 8px; }
.inspector select { color: var(--ink); background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 8px; }
.inspector .identifier { font-size: 11px; overflow-wrap: anywhere; color: var(--muted); }
.inspector-bar { justify-content: space-between; }
.inspector-facts { color: var(--muted); font-size: 12px; line-height: 1.65; }
.inspector-facts p { margin: 7px 0; }
.inspect-pagination { margin-top: 12px; }
.inspect-records-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-top: 20px; }
.inspect-records-head h3 { margin: 0; }
.inspector .brief-btn { min-height: 38px; }
.inspector .model-link { overflow-wrap: anywhere; }
#preference-error { margin: 8px 0; }
#usage-note { line-height: 1.55; margin: 10px 0 16px; }
.cols { grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); }
button:focus-visible, select:focus-visible, input:focus-visible, summary:focus-visible { outline: 2px solid var(--focus, #007a72); outline-offset: 3px; }
@media (max-width: 460px) {
  .pulse { padding: 17px; }
  .pulse h2 { font-size: 18px; }
  .pulse-eyebrow span { display: block; margin: 4px 0 0; }
  .metric-select { padding: 12px 10px 6px; }
  .metric-select .v { font-size: 22px; }
  .metric-note, .metric-details { padding-left: 10px; padding-right: 10px; }
  .metric-details, .inspector .brief-btn, .model-link { min-height: 44px; }
}
`;

export const EXPLORER_JS = `
${VISUAL_JS}
const METRIC_LABELS = { aiu: "Recorded AIU", tokens: "Recorded tokens", requests: "Model calls",
  input: "Input", output: "Output", cacheRead: "Cache read", cacheWrite: "Cache write",
  reasoning: "Reasoning", sessions: "Sessions started", turns: "Turns", activeDays: "Active days" };
let preferenceWrite = Promise.resolve();
function persistPreferences(patch) {
  preferenceWrite = preferenceWrite.then(async () => {
    try {
      await api("/preferences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      $("#preference-error").hidden = true;
    } catch (error) {
      $("#preference-error").textContent = "Your view changed, but the preference could not be saved: " + error.message;
      $("#preference-error").hidden = false;
    }
  });
}
function setCoachExpanded(expanded, save = true) {
  if (state.inspectorStack.length) closeInspector(false);
  state.coachExpanded = expanded;
  $("#coaching").hidden = !expanded;
  $("#content").hidden = expanded;
  $("#range").hidden = expanded;
  $("#usage-note").hidden = expanded;
  ["usage","insights"].forEach(view => {
    const selected = (view === "insights") === expanded;
    $("#" + view + "-tab").setAttribute("aria-selected", String(selected));
    $("#" + view + "-tab").setAttribute("tabindex", selected ? "0" : "-1");
  });
  if (expanded) resizeQuestion();
  if (save) persistPreferences({ coachExpanded: expanded });
}
function renderFollowThrough(data) {
  const target = $("#pulse-follow"); target.replaceChildren();
  const active = Object.values(data.experiments || {}).filter(item => item.status === "trying");
  if (active.length) {
    target.appendChild(el("span", null, "Trying: " + active[0].title));
    const check = el("button", "brief-btn", "Check in");
    check.type = "button"; check.addEventListener("click", () => openExperiment(active[0].id));
    target.appendChild(check);
  }
}
function metricText(key, metric, compact = false) {
  if (metric.value == null) return "Not recorded";
  if (compact) return key === "aiu" ? fmtAiu(metric.value) : fmtCompact(metric.value);
  return metric.value.toLocaleString("en-US", { maximumFractionDigits: key === "aiu" ? 9 : 0 });
}
function renderPrimaryMetrics(d) {
  const target = $("#kpis"); target.replaceChildren();
  const fallback = !d.hasUsage || (d.metrics.aiu.value == null && d.metrics.tokens.value == null);
  const keys = fallback ? (d.hasUsage ? ["requests", "sessions", "activeDays"] : ["sessions", "turns", "activeDays"]) : ["aiu", "tokens", "requests"];
  keys.forEach(key => {
    const entry = d.metrics[key] || { value: d.kpis[key], complete: true };
    const card = el("div", "kpi");
    const select = el("button", "metric-select");
    select.type = "button";
    select.setAttribute("aria-pressed", String(key === state.metric));
    select.appendChild(el("span", "l", key === "aiu" ? "AIU" : key === "tokens" ? "Tokens" : METRIC_LABELS[key]));
    select.appendChild(el("span", "v", entry.value == null ? "\\u2014" : metricText(key, entry, true)));
    select.setAttribute("aria-label", METRIC_LABELS[key] + ": " + metricText(key, entry) + ". " +
      (d.metrics[key] ? "Select trend metric." : "Inspect activity definition."));
    select.addEventListener("click", () => {
      if (!d.metrics[key]) return openInspector({ kind: "metric", key }, select);
      state.metric = key;
      persistPreferences({ metric: key });
      renderPrimaryMetrics(d); renderTrend(d);
    });
    const note = entry.value == null ? "Not recorded" : !entry.complete ? "Partial" : "";
    card.appendChild(select);
    if (note) card.appendChild(el("small", "metric-note", note));
    const details = el("button", "metric-details", "Details");
    details.type = "button";
    details.setAttribute("aria-label", "Inspect " + METRIC_LABELS[key]);
    details.addEventListener("click", () => openInspector({ kind: "metric", key }, details));
    card.appendChild(details); target.appendChild(card);
  });
  $("#hide-repositories").checked = state.hideRepositories;
  $("#p-trend").hidden = !d.hasUsage;
  $("#cols-models").hidden = !d.hasUsage;
  $("#p-tokens").hidden = !d.hasUsage;
}
function renderPulse(d) {
  $("#pulse").hidden = false;
  $("#pulse-title").textContent = d.pulse.headline;
  $("#pulse-summary").textContent = d.pulse.summary;
  $("#pulse-evidence").disabled = false;
  $("#pulse-evidence").textContent = "See why";
  $("#pulse-evidence").setAttribute("aria-expanded","false");
  $("#pulse-explanation").hidden = true;
  $("#pulse-explanation").replaceChildren();
}
function togglePulseEvidence() {
  const target = $("#pulse-explanation"), show = target.hidden;
  target.hidden = !show;
  $("#pulse-evidence").setAttribute("aria-expanded",String(show));
  $("#pulse-evidence").textContent = show ? "Hide explanation" : "See why";
  if (!show) return;
  target.replaceChildren();
  const d = state.data, pulse = d.pulse;
  if (pulse.driver) {
    const driver = pulse.driver;
    target.appendChild(el("p", null, driver.model + " used " + driver.value.toLocaleString("en-US", { maximumFractionDigits:5 }) +
      " of " + driver.total.toLocaleString("en-US", { maximumFractionDigits:5 }) + " recorded AIU (" + (driver.share * 100).toFixed(1) + "%)."));
    const row = d.models.find(item => item.model === driver.model);
    if (row) {
      const link = contributionCard(driver.model, "aiu", row.metrics, d.metrics.aiu.value);
      link.addEventListener("click", () => openInspector({ kind:"model", model:driver.model, offset:0, sort:"aiu" }, link));
      link.setAttribute("aria-label","Explore contributing sessions for " + driver.model); target.appendChild(link);
    }
    target.appendChild(el("p", "panel-note", "This identifies the largest contributor, not waste or value. Explore its sessions before changing anything."));
  } else if (pulse.comparison) {
    const compared = pulse.comparison, label = METRIC_LABELS[compared.key];
    target.appendChild(el("p", null, label + ": " + compared.current.toLocaleString() + " versus " + compared.previous.toLocaleString() + " in the preceding equal-length period."));
    target.appendChild(el("p", "panel-note", "Completed days only; today is excluded. Consumption changes do not establish efficiency or quality."));
    const link = el("button", "brief-btn", "Explore " + label.toLowerCase()); link.type = "button";
    link.addEventListener("click", () => openInspector({ kind:"metric", key:compared.key }, link)); target.appendChild(link);
  } else {
    target.appendChild(el("p", null, d.kpis.requests + " model calls are recorded. There isn't enough comparable history to establish a reliable trend yet."));
    const link = el("button", "brief-btn", "Explore token components"); link.type = "button";
    link.addEventListener("click", () => openInspector({ kind:"metric", key:"tokens" }, link)); target.appendChild(link);
  }
  const rules = pulse.kind === "concentration" ? [pulse.evidence[0], pulse.evidence.at(-1)]
    : pulse.kind === "change" ? pulse.evidence.filter(line => /Comparison excludes|Samples:|Percentage gate:/.test(line))
    : [pulse.evidence.at(-1)];
  target.appendChild(visualInfo("How it's calculated", rules));
}
async function timelineSeries(d, series, model = null) {
  if (!state.trendStart) return series;
  const cacheKey = d.snapshot.id + ":" + (model || "") + ":" + state.trendStart;
  if (state.seriesCache.has(cacheKey)) return state.seriesCache.get(cacheKey);
  const query = new URLSearchParams({ snapshotId: d.snapshot.id, start: state.trendStart });
  if (model) query.set("model", model);
  const result = await api("/usage-series?" + query.toString());
  state.seriesCache.set(cacheKey, result);
  return result;
}
async function renderTrend(d) {
  const key = state.metric, requestId = ++state.trendRequestId;
  $$("#trend-metric button").forEach(button => {
    const selected = button.dataset.metric === key;
    button.classList.toggle("on", selected); button.setAttribute("aria-pressed", String(selected));
  });
  const target = $("#trend"); target.replaceChildren();
  $("#trend-start").value = state.trendStart || "";
  $("#trend-start").max = d.today;
  try {
    const series = await timelineSeries(d, d.series);
    if (requestId !== state.trendRequestId || state.data !== d) return;
    renderTimeline(target, series, key);
  } catch (error) {
    if (requestId !== state.trendRequestId || state.data !== d) return;
    target.replaceChildren(el("p", "rec-error", error.message));
    const refresh = el("button", "brief-btn", "Refresh overview"); refresh.type = "button";
    refresh.addEventListener("click", () => load(state.range)); target.appendChild(refresh);
  }
}
function facts(target, values) {
  const box = el("div", "inspector-facts");
  values.filter(Boolean).forEach(value => box.appendChild(el("p", null, value)));
  target.appendChild(box);
}
function scopedStamp() {
  const d = state.data;
  const frame = state.inspectorStack.at(-1);
  $("#inspector-scope").textContent = (d.range === "all" ? "All history" : d.range + "d") +
    (frame.model && frame.kind === "session" ? " / " + frame.model : "");
  $("#inspector-asof").textContent = "Snapshot " + new Date(d.snapshot.asOf).toLocaleTimeString("en-US", { timeZone: d.timeZone, hour: "numeric", minute: "2-digit" });
  $("#inspector-asof").title = "Frozen as of " + d.snapshot.asOf + ". Display time zone: " + d.timeZone + ". Overview totals do not change while exploring.";
}
function closeInspector(restore = true) {
  ++state.inspectorRequestId;
  state.inspectorStack = [];
  $("#inspector").hidden = true; $("#content").hidden = false;
  if (restore) {
    if (state.inspectorOrigin && state.inspectorOrigin.isConnected !== false) state.inspectorOrigin.focus();
    window.scrollTo(0, state.overviewScroll || 0);
  }
}
function openInspector(frame, origin, replace = false) {
  if (!state.data) return;
  if (frame.kind === "pulse") { togglePulseEvidence(); return; }
  if (!state.inspectorStack.length) {
    state.inspectorOrigin = origin || document.activeElement;
    state.overviewScroll = window.scrollY;
  } else {
    const parent = state.inspectorStack.at(-1);
    parent.scroll = window.scrollY;
    if (origin?.dataset.inspectorFocus) parent.focusKey = origin.dataset.inspectorFocus;
  }
  if (replace) state.inspectorStack[state.inspectorStack.length - 1] = frame;
  else state.inspectorStack.push(frame);
  $("#content").hidden = true; $("#inspector").hidden = false;
  return renderInspector();
}
function recordLabel(row) {
  if (row.date) return niceDate(row.date);
  if (row.sessionId == null) return "Unattributed calls";
  const started = row.startedAt ? new Date(row.startedAt).toLocaleString("en-US", {
    timeZone: state.data.timeZone, month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  }) : "Start not recorded";
  return (row.currentSession ? "Current session" : "Session " + row.sessionId.slice(0, 8)) +
    " \\u00b7 " + started +
    (row.beforeRange ? " \\u00b7 started earlier" : "");
}
function renderRecords(target, payload, frame) {
  const controls = el("div", "inspect-records-head");
  controls.appendChild(el("h3", null, payload.mode === "sessions" ? "Contributing sessions" : "Recorded days"));
  const label = el("label", "panel-note", "Sort ");
  const sort = el("select"); sort.id = "inspector-sort";
  ["aiu", "tokens", "requests"].forEach(key => {
    const option = el("option", null, METRIC_LABELS[key]); option.value = key;
    option.selected = key === payload.records.sort; sort.appendChild(option);
  });
  sort.value = payload.records.sort;
  sort.addEventListener("change", () => openInspector({ ...frame, offset: 0, sort: sort.value, focusControl: "#inspector-sort" }, null, true));
  label.appendChild(sort); controls.appendChild(label); target.appendChild(controls);
  const cards = el("div", "session-cards");
  payload.records.rows.forEach(row => {
    const name = contributionCard(recordLabel(row), payload.records.sort, row.metrics, payload.metrics[payload.records.sort].value);
    name.classList.add("session-card");
    name.dataset.inspectorFocus = row.sessionId != null ? "session:" + row.sessionId :
      row.date ? "day:" + row.date : "unattributed";
    name.addEventListener("click", () => openInspector(row.sessionId != null
      ? { kind: "session", sessionId: row.sessionId, model: frame.model }
      : { kind: "record", label: recordLabel(row), model: frame.model, metrics: row.metrics }, name));
    const counters = el("div", "record-counters");
    [["aiu", "AIU"], ["tokens", "tokens"], ["requests", "calls"]].forEach(([key, label]) => {
      const counter = el("span");
      counter.appendChild(el("b", null, metricText(key, row.metrics[key], true)));
      counter.appendChild(el("span", null, " " + label));
      counter.title = metricText(key, row.metrics[key]) + " " + label + (row.metrics[key].complete ? "" : " (partial)");
      counters.appendChild(counter);
    });
    name.appendChild(counters); cards.appendChild(name);
  });
  target.appendChild(cards);
  target.appendChild(visualInfo("About this breakdown", [
    payload.attribution.matchedCalls + " linked calls; " + payload.attribution.unattributedCalls + " unattributed calls.",
    "Bars show each contribution to this model's known total. Missing values sort last.",
    payload.mode === "days" ? "Session links are unavailable; these are recorded-day contributions." : null,
  ]));
  const pagination = el("div", "inspect-pagination");
  [["Previous", payload.records.previousOffset], ["Next", payload.records.nextOffset]].forEach(([text, offset]) => {
    const button = el("button", "brief-btn", text); button.type = "button";
    button.id = "inspector-" + text.toLowerCase(); button.disabled = offset == null;
    button.addEventListener("click", () => openInspector({ ...frame, offset, focusControl: "#" + button.id }, null, true));
    pagination.appendChild(button);
  });
  pagination.appendChild(el("span", "panel-note", (payload.records.offset + 1) + "\\u2013" +
    Math.min(payload.records.offset + 20, payload.records.total) + " of " + payload.records.total + " records"));
  target.appendChild(pagination);
}
async function renderInspector(restoreFocus = false) {
  const frame = state.inspectorStack.at(-1), requestId = ++state.inspectorRequestId;
  if (!frame) return;
  scopedStamp();
  $("#inspector-back").textContent = state.inspectorStack.length > 1 ? "Back" : "Back to overview";
  const target = $("#inspector-content"); target.replaceChildren(el("p", "panel-note", "Loading snapshot evidence..."));
  const title = frame.kind === "pulse" ? "Why this pulse?" : frame.kind === "metric"
    ? METRIC_LABELS[frame.key] : frame.kind === "model" ? frame.model : frame.kind === "session" ? "Inside this session" : frame.label;
  $("#inspector-title").textContent = title;
  $("#inspector-title").focus();
  window.scrollTo(0, frame.scroll || 0);
  try {
    let payload;
    if (frame.kind === "model" || frame.kind === "session") {
      const query = new URLSearchParams({ snapshotId: state.data.snapshot.id, model: frame.model });
      if (frame.kind === "model") { query.set("offset", frame.offset || 0); query.set("sort", frame.sort || state.metric); }
      else query.set("sessionId", frame.sessionId);
      payload = await api("/" + frame.kind + "-usage?" + query.toString());
    }
    if (requestId !== state.inspectorRequestId) return;
    target.replaceChildren();
    if (frame.kind === "metric") {
      const metric = state.data.metrics[frame.key];
      if (metric) {
        if (frame.key === "tokens") {
          target.appendChild(el("h3", null, "Token components"));
          target.appendChild(counterDetails(state.data.metrics, ["tokens", "input", "output", "cacheRead", "cacheWrite", "reasoning"], true));
        } else target.appendChild(counterDetails(state.data.metrics, [frame.key]));
        target.appendChild(el("h3", null, frame.key === "tokens" ? "Tokens by model"
          : frame.key === "requests" ? "Calls by model" : "AIU by model"));
        const contributions = el("div", "contribution-list");
        state.data.models.forEach(row => {
          const button = contributionCard(row.model, frame.key, row.metrics, metric.value);
          button.dataset.inspectorFocus = "model:" + row.model;
          button.addEventListener("click", () => openInspector({ kind: "model", model: row.model, offset: 0, sort: frame.key }, button));
          contributions.appendChild(button);
        });
        target.appendChild(contributions);
      } else {
        facts(target, [
          METRIC_LABELS[frame.key] + ": " + fmtInt(state.data.kpis[frame.key]) + ".",
          frame.key === "sessions" ? "Sessions created within the range. Older sessions can still contribute turns or model calls in this view." :
            frame.key === "turns" ? "Turns timestamped within the range, including turns in older sessions." :
              "Days with recorded sessions, turns or calls. Active days do not measure recording coverage.",
          "Detailed call counters are unavailable or incomplete here; missing usage is not zero.",
        ]);
      }
      target.appendChild(visualInfo("Source and coverage", [state.data.usageCoverage.message,
        state.data.usageCoverage.missingFields.length ? "Not recorded: " + state.data.usageCoverage.missingFields.join(", ") + "." : null]));
    } else if (frame.kind === "model") {
      const counters = visualInfo("Model counters", payload.share != null && payload.metrics.aiu.complete && state.data.metrics.aiu.complete
        ? [(payload.share * 100).toFixed(1) + "% of recorded AIU in this range."] : []);
      counters.appendChild(counterDetails(payload.metrics));
      target.appendChild(counters);
      renderRecords(target, payload, frame);
    } else if (frame.kind === "session") {
      const meta = el("div", "session-meta");
      [payload.currentSession ? "Current session" : "Session " + payload.sessionId.slice(0, 8),
        payload.startedAt ? new Date(payload.startedAt).toLocaleString("en-US", { timeZone: payload.timeZone }) : "Start not recorded",
        payload.beforeRange ? "Started earlier" : null,
        payload.repository ? state.hideRepositories ? "Repository hidden" : payload.repository : null,
      ].filter(Boolean).forEach(text => meta.appendChild(el("span", "scope-chip", text)));
      target.appendChild(meta);
      target.appendChild(el("h3", null, "Session counters"));
      target.appendChild(counterDetails(payload.metrics));
      target.appendChild(visualInfo("Session scope", [
        "Model scope: " + payload.model + ".", payload.note, "Session ID: " + payload.sessionId,
      ]));
    } else {
      target.appendChild(el("h3", null, "Contribution counters"));
      target.appendChild(counterDetails(frame.metrics));
      target.appendChild(visualInfo("Contribution scope", ["Model scope: " + frame.model + ".", frame.label === "Unattributed calls"
        ? "These calls have no matching local session. They remain in model and overview totals."
        : "Counters for this recorded day. Session linkage is not usable for these calls."]));
    }
    if (["metric","model","session"].includes(frame.kind)) {
      const ask = el("button", "brief-btn", frame.kind === "metric" ? "Ask about this data" : "Ask about this " + frame.kind);
      ask.type = "button"; ask.addEventListener("click", () => askAboutInspection(frame)); target.appendChild(ask);
    }
    const returnControl = restoreFocus && frame.focusKey
      ? [...target.querySelectorAll("[data-inspector-focus]")].find(node => node.dataset.inspectorFocus === frame.focusKey)
      : null;
    const control = returnControl || (frame.focusControl ? $(frame.focusControl) : null);
    if (control && !control.disabled) control.focus();
    else $("#inspector-title").focus();
    window.scrollTo(0, frame.scroll || 0);
  } catch (error) {
    if (requestId !== state.inspectorRequestId) return;
    target.replaceChildren(el("p", "rec-error", error.message));
    const refresh = el("button", "brief-btn", "Refresh overview"); refresh.type = "button";
    refresh.addEventListener("click", () => { closeInspector(); load(state.range); });
    target.appendChild(refresh);
  }
}
$("#open-coach").addEventListener("click", () => { setCoachExpanded(true); $("#insights-tab").focus(); });
$("#pulse-evidence").addEventListener("click", togglePulseEvidence);
$("#inspector-back").addEventListener("click", () => {
  if (state.inspectorStack.length <= 1) return closeInspector();
  state.inspectorStack.pop(); return renderInspector(true);
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !state.inspectorStack.length && !$("#pulse-explanation").hidden) {
    event.preventDefault(); togglePulseEvidence(); $("#pulse-evidence").focus(); return;
  }
  if (event.key !== "Escape" || !state.inspectorStack.length) return;
  event.preventDefault();
  if (state.inspectorStack.length <= 1) closeInspector();
  else { state.inspectorStack.pop(); renderInspector(true); }
});
$$("#trend-metric button").forEach(button => button.addEventListener("click", () => {
  state.metric = button.dataset.metric;
  persistPreferences({ metric: state.metric });
  if (state.data) { renderPrimaryMetrics(state.data); renderTrend(state.data); }
}));
$("#trend-start").addEventListener("change", event => {
  state.trendStart = event.currentTarget.value || null;
  persistPreferences({ trendStart: state.trendStart });
  if (state.data) renderTrend(state.data);
});
$("#trend-reset").addEventListener("click", () => {
  state.trendStart = null;
  persistPreferences({ trendStart: null });
  if (state.data) renderTrend(state.data);
});
$("#hide-repositories").addEventListener("change", event => {
  state.hideRepositories = event.currentTarget.checked;
  persistPreferences({ hideRepositories: state.hideRepositories });
  if (state.data) renderRepos(state.data);
});
$("#range").addEventListener("keydown", event => {
  const buttons = $$("#range button"), current = buttons.indexOf(document.activeElement);
  let index;
  if (event.key === "ArrowRight") index = (current + 1) % buttons.length;
  else if (event.key === "ArrowLeft") index = (current - 1 + buttons.length) % buttons.length;
  else if (event.key === "Home") index = 0;
  else if (event.key === "End") index = buttons.length - 1;
  else return;
  event.preventDefault();
  buttons[index].focus();
  load(buttons[index].dataset.range);
  persistPreferences({ range: buttons[index].dataset.range });
});
load(initialRange);
`;
