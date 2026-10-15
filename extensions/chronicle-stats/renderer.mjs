import { EXPLORER_CSS, EXPLORER_JS } from "./explorer.mjs";
import { INSIGHT_HTML, TIDEPOOL_CSS, INSIGHT_JS, INSIGHT_INTERACTIONS } from "./insight-view.mjs";
import fs from "node:fs";

const markdownLexer = fs.readFileSync(new URL("./markdown.js", import.meta.url), "utf8")
    .replace(/<\/script/gi, "<\\/script");

export function renderHtml() {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>My AI Usage</title>
<style>
${CSS}
${EXPLORER_CSS}
${TIDEPOOL_CSS}
</style>
</head>
<body>
<div class="app" id="app">
  <header class="hd">
    <div class="hd-title">
      <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
      <div><h1>My AI Usage</h1><p class="hd-sub" id="span">Local Chronicle</p></div>
    </div>
    <div class="hd-actions">
      <div class="seg" role="tablist" aria-label="Time range" id="range">
        <button role="tab" data-range="30" aria-selected="true" class="on">30d</button>
        <button role="tab" data-range="90" tabindex="-1">90d</button>
        <button role="tab" data-range="all" tabindex="-1">All</button>
      </div>
      <button class="icon-btn" id="refresh" title="Refresh" aria-label="Refresh">
        <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M8 3a5 5 0 1 0 4.546 2.914.75.75 0 0 1 1.364-.626A6.5 6.5 0 1 1 8 1.5V.31c0-.29.336-.45.561-.267l2.323 1.885a.343.343 0 0 1 0 .534L8.56 4.347A.343.343 0 0 1 8 4.08V3Z"/></svg>
      </button>
    </div>
  </header>
  <nav class="view-nav" id="view-nav" role="tablist" aria-label="Canvas view">
    <button id="usage-tab" role="tab" aria-selected="true" aria-controls="content">Usage</button>
    <button id="insights-tab" role="tab" aria-selected="false" aria-controls="coaching" tabindex="-1">Insights</button>
  </nav>

  <p class="coach-status" id="coach-progress" role="status" aria-live="polite" aria-atomic="true" hidden></p>
  <p class="panel-note" id="usage-note" role="status"></p>
  <p class="rec-error" id="preference-error" role="alert" hidden></p>
  <section class="panel inspector" id="inspector" aria-labelledby="inspector-title" hidden>
    <div class="inspector-bar">
      <button class="brief-btn" id="inspector-back" type="button">Back to overview</button>
      <span class="panel-note" id="inspector-scope"></span>
    </div>
    <h2 id="inspector-title" tabindex="-1"></h2>
    <p class="panel-note" id="inspector-asof"></p>
    <div id="inspector-content" aria-live="polite"></div>
  </section>
  <div id="content" role="tabpanel" aria-labelledby="usage-tab" aria-busy="true">
    <div id="load-state" role="status" hidden></div>
    <!-- KPI strip -->
    <section class="strip primary-strip dashboard" id="kpis" aria-label="Primary usage metrics"></section>
    <div class="cols dashboard" id="cols-models">
    <section class="panel" id="p-trend">
      <div class="panel-hd">
        <h2>Usage over time</h2>
        <div class="seg seg-sm" id="trend-metric" aria-label="Trend metric">
          <button data-metric="aiu" class="on" aria-pressed="true">AIU</button>
          <button data-metric="tokens" aria-pressed="false">Tokens</button>
          <button data-metric="requests" aria-pressed="false">Calls</button>
        </div>
      </div>
      <div class="timeline-controls">
        <label>Graph from <input type="date" id="trend-start" aria-label="Graph start date" /></label>
        <button class="brief-btn" id="trend-reset" type="button">All dates</button>
      </div>
      <div id="trend"></div>
    </section>
      <section class="panel" id="p-models">
        <div class="panel-hd">
          <h2>Your model mix</h2>
          <div class="seg seg-sm" id="model-metric">
            <button data-metric="aiu" aria-pressed="true" class="on">AIU</button>
            <button data-metric="reqs" aria-pressed="false">Calls</button>
            <button data-metric="tokens" aria-pressed="false">Tokens</button>
          </div>
        </div>
        <div id="models" class="bars"></div>
      </section>
    </div>

    <section class="pulse" id="pulse" aria-labelledby="pulse-title">
      <p class="pulse-eyebrow">One thing to notice</p>
      <h2 id="pulse-title">Reading your recorded usage&hellip;</h2>
      <p id="pulse-summary"></p>
      <div class="pulse-actions">
        <button class="brief-btn" id="pulse-evidence" type="button" aria-expanded="false" aria-controls="pulse-explanation">See why</button>
        <button class="brief-btn" id="open-coach" type="button" aria-controls="coaching">Insights</button>
      </div>
      <div id="pulse-explanation" class="pulse-explanation" hidden></div>
      <div class="pulse-follow" id="pulse-follow"></div>
    </section>

    <!-- Activity heatmap -->
    <div class="cols dashboard" id="cols-activity">
    <section class="panel" id="p-activity">
      <div class="panel-hd">
        <h2>Activity</h2>
        <span class="panel-note" id="activity-note"></span>
      </div>
      <div class="activity-summary" id="activity-summary"></div>
      <div class="heat-wrap"><div id="heatmap" class="heatmap"></div></div>
    </section>

      <section class="panel" id="p-tokens">
        <div class="panel-hd"><h2>Token flow</h2><span class="panel-note" id="tokens-total"></span></div>
        <div id="tokenbar" class="stackbar"></div>
        <ul id="tokenlegend" class="legend"></ul>
        <details class="visual-info"><summary>About these counters</summary><p>Total = input + output. Cache and reasoning counters may overlap; they are not added again.</p></details>
      </section>
    </div>

    <div class="cols dashboard">
      <section class="panel" id="p-repos">
        <div class="panel-hd"><h2>Top repositories</h2><span class="panel-note">by sessions</span></div>
        <label class="privacy-control"><input type="checkbox" id="hide-repositories" checked /> Hide repository names</label>
        <div id="repos" class="bars"></div>
      </section>

      <section class="panel" id="p-rhythm">
        <div class="panel-hd"><h2>When you work</h2><span class="panel-note">sessions by hour</span></div>
        <div id="hours" class="hours"></div>
        <div class="mini-grid">
          <div class="mini" id="mini-effort"><h3>Reasoning effort</h3><div class="stackbar sm"></div><ul class="legend legend-inline"></ul></div>
          <div class="mini" id="mini-initiator"><h3>Initiated by</h3><div class="stackbar sm"></div><ul class="legend legend-inline"></ul></div>
        </div>
        <div class="chips" id="chips"></div>
      </section>
    </div>

  </div>

  ${INSIGHT_HTML}
  <footer class="ft"><span id="foot"></span></footer>
</div>

<script>
${markdownLexer}
${JS}
${EXPLORER_JS}
</script>
</body>
</html>`;
}

const CSS = `
:root { --ease: cubic-bezier(.2,.8,.2,1); }

* { box-sizing: border-box; }
[hidden] { display: none !important; }
html, body { margin: 0; }
body {
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif);
  font-size: 14px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
}
.app { max-width: 1040px; margin: 0 auto; padding: 20px clamp(16px, 4vw, 28px) 36px; }

/* Header */
.hd { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
.hd-title h1 { margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.02em; }
.hd-sub { margin: 2px 0 0; color: var(--muted); font-size: 12.5px; }
.hd-actions { display: flex; align-items: center; gap: 10px; }

.seg { display: inline-flex; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 2px; }
.seg button { appearance: none; border: 0; background: transparent; color: var(--muted); font: inherit; font-size: 12.5px; font-weight: 500;
  padding: 5px 11px; border-radius: 6px; cursor: pointer; transition: color .15s var(--ease), background .15s var(--ease); }
.seg button:hover { color: var(--ink); }
.seg button.on { background: var(--bg); color: var(--ink); box-shadow: var(--shadow); }
.seg-sm button { padding: 3px 9px; font-size: 12px; }

.icon-btn { display: inline-grid; place-items: center; width: 32px; height: 32px; border: 1px solid var(--border);
  background: var(--surface); color: var(--muted); border-radius: 8px; cursor: pointer; transition: color .15s, background .15s, transform .3s var(--ease); }
.icon-btn:hover { color: var(--ink); background: var(--surface-2); }
.icon-btn.spin svg { animation: spin .6s var(--ease); }
@keyframes spin { to { transform: rotate(360deg); } }

:where(button):focus-visible { outline: 2px solid var(--focus); outline-offset: 1px; }

.rec-error { margin-top: 8px !important; color: var(--true-color-red, #cf222e); font-size: 11.5px; }
.send {
  display: grid; place-items: center;
  width: 36px; border: 0; border-radius: 10px;
  background: var(--coach); color: var(--color-white, #fff);
  cursor: pointer; transition: opacity .15s, transform .2s var(--ease);
}
.send:hover:not(:disabled) { transform: translateY(-1px); }
.send:disabled { opacity: .45; cursor: wait; }
.brief-btn { border: 1px solid var(--border); border-radius: 8px; padding: 6px 10px; background: var(--coach-soft); color: var(--ink); font: inherit; font-size: 12px; cursor: pointer; }
.brief-btn:disabled { opacity: .5; cursor: wait; }
#coach-error { margin: 8px 13px; }

/* KPI strip */
.strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr)); gap: 0;
  border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); overflow: hidden; margin-bottom: var(--gap); box-shadow: var(--shadow); }
.kpi { padding: 14px 16px; border-right: 1px solid var(--border); }
.kpi:last-child { border-right: 0; }
.kpi .v { font-size: 21px; font-weight: 600; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.kpi .v .u { font-size: 12px; font-weight: 500; color: var(--muted); margin-left: 2px; letter-spacing: 0; }
.kpi .l { font-size: 11.5px; color: var(--muted); margin-top: 1px; }

/* Panels */
.panel { border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg); padding: 16px 18px; margin-bottom: var(--gap); box-shadow: var(--shadow); }
.panel-hd { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.panel-hd h2 { margin: 0; font-size: 13px; font-weight: 600; }
.panel-sub { margin: 3px 0 0; color: var(--muted); font-size: 11.5px; }
.panel-note { font-size: 11.5px; color: var(--muted); font-variant-numeric: tabular-nums; }
.cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--gap); }

/* Heatmap */
.heat-wrap { overflow-x: auto; padding-bottom: 4px; }
.heatmap svg { display: block; }
.heat-cell { transition: opacity .3s var(--ease); }
.heat-legend { display: flex; align-items: center; gap: 6px; color: var(--muted); font-size: 11px; margin-top: 8px; justify-content: flex-end; }
.heat-legend .sw { width: 11px; height: 11px; border-radius: 3px; }

/* Bars */
.bars { display: flex; flex-direction: column; gap: 10px; }
.bar-row { display: grid; grid-template-columns: 1fr auto; gap: 4px 10px; align-items: center; }
.bar-row .name { font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bar-row .name .dim { color: var(--muted); }
.bar-row .val { font-size: 12px; font-variant-numeric: tabular-nums; color: var(--muted); }
.bar-track { grid-column: 1 / -1; height: 7px; background: var(--surface-2); border-radius: 99px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 99px; width: 100%; transform: scaleX(0); transform-origin: left; transition: transform .5s var(--ease); }

/* Stacked bar */
.stackbar { display: flex; height: 14px; border-radius: 6px; overflow: hidden; background: var(--surface-2); }
.stackbar.sm { height: 9px; }
.stackbar span { height: 100%; transform: scaleX(0); transform-origin: left; transition: transform .5s var(--ease); }
.legend { list-style: none; margin: 12px 0 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px,1fr)); gap: 6px 14px; }
.legend.legend-inline { grid-template-columns: 1fr 1fr; margin-top: 8px; gap: 3px 10px; }
.legend li { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--muted); }
.legend .dot { width: 9px; height: 9px; border-radius: 3px; flex: none; }
.legend .lbl { color: var(--ink); }
.legend .amt { margin-left: auto; font-variant-numeric: tabular-nums; }

.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

/* Hours */
.hours { display: flex; align-items: flex-end; gap: 3px; height: 68px; }
.hours .hbar { flex: 1; height: 100%; background: var(--accent); border-radius: 3px 3px 0 0; min-height: 2px; opacity: .85; transform: scaleY(.02); transform-origin: bottom; transition: transform .5s var(--ease); }
.hours .hbar[data-peak="1"] { opacity: 1; }
.hours-axis { display: flex; justify-content: space-between; color: var(--muted); font-size: 10px; margin-top: 4px; font-variant-numeric: tabular-nums; }

.mini-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
.mini h3 { margin: 0 0 7px; font-size: 11.5px; font-weight: 600; color: var(--muted); }
@media (max-width: 460px) { .mini-grid { grid-template-columns: 1fr; } }

.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.chip { display: inline-flex; align-items: baseline; gap: 6px; padding: 5px 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 99px; font-size: 12px; }
.chip b { font-weight: 600; font-variant-numeric: tabular-nums; }
.chip .ck { color: var(--muted); }

.ft { color: var(--muted); font-size: 11px; margin-top: 8px; }

/* States */
.empty { text-align: center; padding: 56px 20px; color: var(--muted); }
.empty h2 { color: var(--ink); font-size: 15px; margin: 0 0 6px; }
.reveal { opacity: 0; transform: translateY(6px); animation: reveal .4s var(--ease) forwards; }
@keyframes reveal { to { opacity: 1; transform: none; } }
.fade { animation: fadein .25s var(--ease); }
@keyframes fadein { from { opacity: .35; } to { opacity: 1; } }

@media (prefers-reduced-motion: reduce) {
  * { animation-duration: .001ms !important; transition-duration: .001ms !important; }
  .reveal { opacity: 1; transform: none; }
}
`;

const JS = `
"use strict";
const CATS = ["--c1","--c2","--c3","--c4","--c5","--c6"];
const cvar = (n) => "var(" + n + ")";
const params = new URLSearchParams(location.search);
const initialRange = ["30", "90", "all"].includes(params.get("range")) ? params.get("range") : "30";
const state = { range: initialRange, data: null, insights: { briefs: [], chats: {}, experiments: {} }, modelMetric: "aiu", metric: "aiu", trendStart: null, seriesCache: new Map(), trendRequestId: 0, visibleDays: 3, asking: false, generating: false, showLatestAnswer: false, loadId: 0, initialized: false, coachExpanded: false, hideRepositories: true, inspectorStack: [], inspectorRequestId: 0, composerHeight: null, lastComposerHeight: null, askScope: null, askScopeDetails: null, activeExperiment: null, experimentDrafts: {}, reviewingExperiment: false, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
state.coachStatus = null;
state.coachDisconnected = false;
state.coachConnecting = typeof EventSource !== "undefined";
state.insightReadId = 0;

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

function fmtInt(n) { return (n||0).toLocaleString("en-US"); }
function fmtCompact(n) {
  n = n || 0; const a = Math.abs(n);
  if (a >= 1e9) return (n/1e9).toFixed(a>=1e10?0:1)+"B";
  if (a >= 1e6) return (n/1e6).toFixed(a>=1e7?0:1)+"M";
  if (a >= 1e3) return (n/1e3).toFixed(a>=1e4?0:1)+"K";
  return String(Math.round(n));
}
function fmtAiu(n) {
  n = n || 0;
  if (n > 0 && n < .1) return n < .000001 ? "<0.000001" : n.toLocaleString("en-US", { maximumFractionDigits: 6 });
  return n >= 1000 ? fmtCompact(n) : (n>=100? Math.round(n).toString() : n.toFixed(1));
}
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const SVGNS = "http://www.w3.org/2000/svg";
function svg(tag, attrs) { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; }

async function api(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...options.headers, "X-Chronicle-Token": params.get("token") || "" } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed with HTTP " + res.status);
  return data;
}

async function load(range) {
  if (state.inspectorStack.length) closeInspector(false);
  const loadId = ++state.loadId;
  const insightReadId = ++state.insightReadId;
  state.range = range;
  $$("#range button").forEach(button => {
    const selected = button.dataset.range === range;
    button.classList.toggle("on", selected);
    button.setAttribute("aria-selected", String(selected));
    button.setAttribute("tabindex", selected ? "0" : "-1");
  });
  $("#content").setAttribute("aria-busy", "true");
  try {
    const [stats, insights] = await Promise.allSettled([
      api("/data?range=" + encodeURIComponent(range)),
      api("/insights"),
    ]);
    if (loadId !== state.loadId) return;
    if (insights.status === "fulfilled" && insightReadId === state.insightReadId) {
      state.insights = insights.value;
      state.timeZone = insights.value.timeZone;
      if (!state.initialized) {
        state.initialized = true;
        const prefs = insights.value.preferences;
        if (prefs) {
          state.metric = prefs.metric;
          state.trendStart = prefs.trendStart || null;
          state.hideRepositories = prefs.hideRepositories;
          state.composerHeight = prefs.composerHeight || null;
          setCoachExpanded(prefs.coachExpanded, false);
          if (!params.has("range") && prefs.range !== range) {
            await load(prefs.range);
            return;
          }
        }
      }
      if (!state.asking && !state.generating) $("#coach-error").hidden = true;
      renderThread(insights.value);
      renderFollowThrough(insights.value);
      renderActiveExperiment();
      if (insights.value.coach) acceptCoachStatus(insights.value.coach, false);
      syncCoachControls();
      if (insights.value.coach && state.coachStatus?.revision !== insights.value.coach.revision) refreshSavedInsights();
    } else if (insights.status === "rejected") {
      $("#coach-error").hidden = false;
      $("#coach-error").textContent = insights.reason.message;
      $("#thread").replaceChildren(el("p", "panel-note", "Saved insights could not be read. Refresh to retry."));
    }
    if (stats.status === "rejected") throw stats.reason;
    state.data = stats.value;
    state.seriesCache.clear();
    render(stats.value);
  } catch (e) {
    if (loadId === state.loadId) {
      state.data = null;
      renderError(e);
    }
  } finally {
    if (loadId === state.loadId) $("#content").setAttribute("aria-busy", "false");
  }
}

function renderError(e, title = "Couldn't load your stats") {
  $("#pulse").hidden = true;
  $$("#content > .dashboard").forEach(node => node.hidden = true);
  const box = $("#load-state");
  box.className = "empty";
  box.hidden = false;
  box.replaceChildren(el("h2", null, title));
  box.appendChild(el("p", null, (e && e.message) || String(e)));
  $("#pulse-title").textContent = title;
  $("#pulse-summary").textContent = e.message || String(e);
  $("#pulse-evidence").disabled = true;
}

function render(d) {
  if (!d.kpis.sessions && !d.kpis.turns && !d.hasUsage) {
    renderError(new Error("Try a wider time range, or run a Copilot session and refresh."), "No activity in this range");
    return;
  }
  $("#load-state").hidden = true;
  $$("#content > .dashboard").forEach(node => node.hidden = false);
  $("#span").textContent = "Local Chronicle";
  const coverage = d.usageCoverage;
  $("#usage-note").textContent = "Local Chronicle \\u00b7 " +
    (coverage.recordingSince ? "Since " + new Date(coverage.recordingSince).toLocaleDateString("en-US", { timeZone: d.timeZone, month: "short", day: "numeric" }) : "Activity only") +
    (coverage.invalidTimestampCalls ? " \\u00b7 " + coverage.invalidTimestampCalls + " unplaced calls" : "");
  $("#usage-note").title = "Local retained data, not account-wide billing. Earliest retained calls do not prove continuous recording.";
  renderPrimaryMetrics(d);
  renderActivityStats(d);
  renderPulse(d);
  renderTrend(d);
  renderHeatmap(d);
  renderModels(d);
  renderTokens(d);
  renderRepos(d);
  renderHours(d);
  renderDist("#mini-effort", d.effort);
  renderDist("#mini-initiator", d.initiator);
  renderChips(d);
  const g = new Date(d.generatedAt);
  $("#foot").textContent = "Local Chronicle \\u00b7 Updated " + g.toLocaleTimeString("en-US",{timeZone:d.timeZone,hour:"numeric",minute:"2-digit"});
}

function niceDate(date) {
  return new Date(date + "T12:00:00Z").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC"
  });
}

function localToday() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: state.timeZone, year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date());
  const fields = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return fields.year + "-" + fields.month + "-" + fields.day;
}

${INSIGHT_JS}

function renderActivityStats(d) {
  const k = d.kpis;
  const items = [
    { v: fmtInt(k.sessions), l: "Sessions" },
    { v: fmtInt(k.turns), l: "Turns" },
    { v: fmtInt(k.repos), l: "Repositories" },
    { v: fmtInt(k.files), l: "File touches" },
    { v: fmtInt(k.activeDays), l: "Active days" },
  ];
  const c = $("#activity-summary"); c.innerHTML = "";
  items.forEach((it, i) => {
    const cell = el("div", "kpi reveal");
    cell.style.animationDelay = (i*30) + "ms";
    const v = el("div", "v"); v.textContent = it.v;
    cell.appendChild(v);
    cell.appendChild(el("div", "l", it.l));
    c.appendChild(cell);
  });
}

function renderHeatmap(d) {
  const wrap = $("#heatmap"); wrap.innerHTML = "";
  const map = d.dayMap || {};
  const keys = Object.keys(map);
  // window: from range start (or first activity) to today
  const today = new Date(d.today + "T00:00:00Z");
  let start;
  if (d.range === "all") {
    start = keys.length ? new Date(keys.slice().sort()[0] + "T00:00:00Z") : new Date(today);
  } else {
    start = new Date(today.getTime() - (Number(d.range)-1)*86400000);
  }
  start.setUTCHours(0,0,0,0);
  // align to Sunday
  const gridStart = new Date(start); gridStart.setUTCDate(gridStart.getUTCDate() - gridStart.getUTCDay());
  const days = Math.round((today - gridStart)/86400000) + 1;
  const weeks = Math.ceil(days/7);
  const counts = keys.map(k => map[k].s + map[k].t + (map[k].u || 0));
  const max = counts.length ? Math.max(...counts) : 0;
  const bucket = (n) => { if (!n) return 0; if (max<=1) return 4; const r=n/max; return r>.75?4:r>.5?3:r>.25?2:1; };
  const HEAT = { 1:26, 2:46, 3:70, 4:100 };
  const heatCol = (b) => b===0 ? cvar("--heat-0") : \`color-mix(in srgb, \${cvar("--accent")} \${HEAT[b]}%, var(--heat-0))\`;

  const CELL = 12, GAP = 3, LEFT = 26, TOP = 16;
  const W = LEFT + weeks*(CELL+GAP), H = TOP + 7*(CELL+GAP);
  const s = svg("svg", { width: W, height: H, viewBox: \`0 0 \${W} \${H}\`, role: "img", "aria-label": "Activity heatmap", "aria-describedby": "heatmap-data" });
  const srRows = [];

  // weekday labels
  [1,3,5].forEach(wd => {
    const t = svg("text", { x: 0, y: TOP + wd*(CELL+GAP)+CELL-2, fill: cvar("--muted"), "font-size": 12 });
    t.textContent = WEEKDAYS[wd]; s.appendChild(t);
  });

  let lastMonth = -1;
  for (let w=0; w<weeks; w++) {
    for (let dow=0; dow<7; dow++) {
      const cur = new Date(gridStart); cur.setUTCDate(cur.getUTCDate() + w*7 + dow);
      if (cur > today || cur < start) continue;
      const iso = cur.toISOString().slice(0, 10);
      const rec = map[iso];
      const b = bucket(rec ? rec.s + rec.t + (rec.u || 0) : 0);
      const x = LEFT + w*(CELL+GAP), y = TOP + dow*(CELL+GAP);
      const rect = svg("rect", { x, y, width: CELL, height: CELL, rx: 3, fill: heatCol(b), class: "heat-cell" });
      const nice = cur.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",timeZone:"UTC"});
      const tt = rec ? \`\${rec.s} sessions, \${rec.t} turns, \${rec.u || 0} requests \\u00b7 \${nice}\` : \`No activity \\u00b7 \${nice}\`;
      const title = svg("title", {}); title.textContent = tt; rect.appendChild(title);
      if (rec) srRows.push([nice, rec.s, rec.t, rec.u || 0]);
      rect.style.opacity = "0"; rect.style.transitionDelay = (w*8) + "ms";
      requestAnimationFrame(() => { rect.style.opacity = "1"; });
      s.appendChild(rect);
      // month label at first row of a new month
      if (dow===0 && cur.getUTCMonth() !== lastMonth) {
        lastMonth = cur.getUTCMonth();
        const t = svg("text", { x, y: 10, fill: cvar("--muted"), "font-size": 12 });
        t.textContent = MONTHS[cur.getUTCMonth()]; s.appendChild(t);
      }
    }
  }
  wrap.appendChild(s);

  const table = el("table", "sr-only"); table.id = "heatmap-data";
  table.appendChild(el("caption", null, srRows.length ? "Daily activity (days with activity only)" : "No activity in this range"));
  const head = el("tr");
  ["Day", "Sessions", "Turns", "Requests"].forEach(h => { const th = el("th", null, h); th.scope = "col"; head.appendChild(th); });
  table.appendChild(head);
  srRows.forEach(r => { const tr = el("tr"); r.forEach(v => tr.appendChild(el("td", null, String(v)))); table.appendChild(tr); });
  wrap.appendChild(table);

  // legend
  const leg = el("div", "heat-legend");
  leg.appendChild(el("span", null, "Less"));
  for (let b=0;b<5;b++){ const sw=el("span","sw"); sw.style.background = heatCol(b); leg.appendChild(sw); }
  leg.appendChild(el("span", null, "More"));
  wrap.appendChild(leg);

  const total = d.kpis.sessions;
  $("#activity-note").textContent = fmtInt(total) + " sessions \\u00b7 " + d.kpis.activeDays + " active days";
}

function renderModels(d) {
  const c = $("#models"); c.innerHTML = "";
  const m = state.modelMetric;
  const rows = (d.models||[]).slice().sort((a,b)=> {
    if (a[m] == null && b[m] != null) return 1;
    if (b[m] == null && a[m] != null) return -1;
    return (b[m] || 0) - (a[m] || 0);
  });
  if (!rows.length) { c.appendChild(emptyNote("No model usage recorded yet.")); return; }
  const key = m === "reqs" ? "requests" : m;
  const total = d.metrics[key];
  if (total.complete && total.value > 0 && rows[0].metrics[key].complete) {
    c.appendChild(shareVisual(rows[0].metrics[key].value / total.value, key === "aiu" ? "recorded AIU" : key === "tokens" ? "recorded tokens" : "recorded calls"));
    c.appendChild(el("b", "mix-leading", rows[0].model));
  }
  const max = Math.max(...rows.map(r=>r[m]), 1);
  rows.slice(0,3).forEach((r, i) => {
    const row = el("div", "bar-row");
    const name = el("button", "name model-link", r.model);
    name.type = "button";
    name.setAttribute("aria-label", "Inspect " + r.model);
    name.addEventListener("click", () => openInspector({ kind: "model", model: r.model, offset: 0 }, name));
    const val = el("div", "val");
    val.textContent = r[m] == null ? "Not recorded" : (m==="aiu" ? fmtAiu(r.aiu)+" AIU" : m==="reqs" ? fmtInt(r.reqs)+" calls" : fmtCompact(r.tokens)+" tok") +
      (r.metrics[key].complete ? "" : " \\u00b7 Partial");
    const track = el("div", "bar-track");
    const fill = el("div", "bar-fill");
    fill.style.background = cvar(CATS[i % CATS.length]);
    track.appendChild(fill);
    row.appendChild(name); row.appendChild(val); row.appendChild(track);
    c.appendChild(row);
    requestAnimationFrame(()=>{ fill.style.transform = "scaleX(" + ((r[m] || 0)/max) + ")"; });
  });
  const all = el("button", "brief-btn", "Explore models");
  all.type = "button"; all.addEventListener("click", () => openInspector({ kind: "metric", key }, all));
  c.appendChild(all);
}

function renderTokens(d) {
  const t = d.tokenComposition || {};
  const parts = [
    { k:"input", label:"Input", c:"--c1" },
    { k:"cacheRead", label:"Cache read", c:"--c6" },
    { k:"cacheWrite", label:"Cache write", c:"--c2" },
    { k:"output", label:"Output", c:"--c3" },
    { k:"reasoning", label:"Reasoning", c:"--c5" },
  ];
  const total = (t.input || 0) + (t.output || 0);
  $("#tokens-total").textContent = d.kpis.tokens == null ? "Not recorded" : fmtCompact(total) +
    (d.metrics.tokens.complete ? " total" : " known \\u00b7 incomplete");
  const bar = $("#tokenbar"); bar.innerHTML = "";
  const leg = $("#tokenlegend"); leg.innerHTML = "";
  parts.forEach(p => {
    const v = t[p.k];
    if (p.k === "input" || p.k === "output") {
      const seg = el("span"); seg.style.background = cvar(p.c);
      seg.style.width = (total ? (v || 0)/total*100 : 0) + "%";
      seg.title = p.label + ": " + (v == null ? "Not recorded" : fmtInt(v));
      bar.appendChild(seg);
      requestAnimationFrame(()=>{ seg.style.transform = "scaleX(1)"; });
    }
    const li = el("li");
    const dot = el("span","dot"); dot.style.background = cvar(p.c);
    li.appendChild(dot);
    li.appendChild(el("span","lbl", p.label));
    li.appendChild(el("span","amt", v == null ? "Not recorded" : fmtCompact(v)));
    leg.appendChild(li);
  });
  const control = el("li", "token-overview-link");
  const details = el("button", "brief-btn", "Explore tokens");
  details.type = "button"; details.addEventListener("click", () => openInspector({ kind: "metric", key: "tokens" }, details));
  control.appendChild(details); leg.appendChild(control);
}

function renderRepos(d) {
  const c = $("#repos"); c.innerHTML = "";
  const rows = d.repos || [];
  if (!rows.length) { c.appendChild(emptyNote("No repositories recorded.")); return; }
  const max = Math.max(...rows.map(r=>r.sessions), 1);
  rows.forEach((r, index) => {
    const row = el("div", "bar-row");
    const name = el("div", "name");
    const label = state.hideRepositories ? "Repository " + (index + 1) : r.repository;
    const parts = label.split("/");
    if (parts.length===2){ const dim=el("span","dim"); dim.textContent=parts[0]+"/"; name.appendChild(dim); name.appendChild(document.createTextNode(parts[1])); }
    else name.textContent = label;
    name.title = label;
    const val = el("div", "val", fmtInt(r.sessions));
    const track = el("div", "bar-track");
    const fill = el("div", "bar-fill"); fill.style.background = cvar("--accent");
    track.appendChild(fill);
    row.appendChild(name); row.appendChild(val); row.appendChild(track);
    c.appendChild(row);
    requestAnimationFrame(()=>{ fill.style.transform = "scaleX(" + (r.sessions/max) + ")"; });
  });
}

function renderHours(d) {
  const wrap = $("#hours"); wrap.innerHTML = "";
  wrap.setAttribute("role", "group"); wrap.setAttribute("aria-label", "Sessions by hour of day");
  const hours = d.hours || new Array(24).fill(0);
  const max = Math.max(...hours, 1);
  const peak = hours.indexOf(max);
  hours.forEach((h, i) => {
    const b = el("div", "hbar");
    b.dataset.peak = i===peak ? "1" : "0";
    b.title = h + " session" + (h!==1?"s":"") + " at " + fmtHour(i);
    b.setAttribute("role", "img"); b.setAttribute("aria-label", b.title);
    wrap.appendChild(b);
    requestAnimationFrame(()=>{ b.style.transform = "scaleY(" + Math.max(.02, h/max) + ")"; });
  });
  let axis = $("#hours + .hours-axis");
  if (!axis) { axis = el("div","hours-axis"); wrap.after(axis); }
  axis.innerHTML = "";
  ["12a","6a","12p","6p","11p"].forEach(t=>axis.appendChild(el("span",null,t)));
}
function fmtHour(h){ const ap = h<12?"am":"pm"; const hh = h%12===0?12:h%12; return hh+ap; }

function renderDist(sel, rows) {
  const root = $(sel);
  const bar = $(".stackbar", root); const leg = $(".legend", root);
  bar.innerHTML = ""; leg.innerHTML = "";
  rows = rows || [];
  const total = rows.reduce((a,r)=>a+r.count,0) || 1;
  rows.forEach((r, i) => {
    const seg = el("span"); seg.style.background = cvar(CATS[i % CATS.length]);
    seg.style.width = (r.count/total*100) + "%";
    seg.title = r.label + ": " + fmtInt(r.count);
    bar.appendChild(seg);
    requestAnimationFrame(()=>{ seg.style.transform = "scaleX(1)"; });
    const li = el("li");
    const dot = el("span","dot"); dot.style.background = cvar(CATS[i % CATS.length]);
    li.appendChild(dot); li.appendChild(el("span","lbl", r.label));
    li.appendChild(el("span","amt", fmtInt(r.count)));
    leg.appendChild(li);
  });
}

function renderChips(d) {
  const c = $("#chips"); c.innerHTML = "";
  const refByType = Object.fromEntries((d.refs||[]).map(r=>[r.label, r.count]));
  const chips = [
    { k:"Commit refs", v: refByType.commit || 0 },
    { k:"PR refs", v: refByType.pr || 0 },
    { k:"Issue refs", v: refByType.issue || 0 },
    ...(d.tools || []).map(row => ({ k: row.label + " file records", v: row.count })),
  ];
  if (d.kpis.avgTtftMs) chips.push({ k:"Avg first token", v: (d.kpis.avgTtftMs/1000).toFixed(1)+"s", raw:true });
  chips.forEach(ch => {
    const e = el("div","chip");
    const b = el("b", null, ch.raw ? ch.v : fmtInt(ch.v)); e.appendChild(b);
    e.appendChild(el("span","ck", ch.k)); c.appendChild(e);
  });
}

function emptyNote(txt){ const p = el("p","panel-note",txt); p.style.margin="4px 0"; return p; }

// interactions
$("#range").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  $$("#range button").forEach(x=>{ x.classList.toggle("on", x===b); x.setAttribute("aria-selected", x===b); });
  document.querySelector("#content").classList.add("fade");
  setTimeout(()=>document.querySelector("#content").classList.remove("fade"), 260);
  load(b.dataset.range);
  persistPreferences({ range: b.dataset.range });
});
$("#model-metric").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  $$("#model-metric button").forEach(x=>{ x.classList.toggle("on", x===b); x.setAttribute("aria-pressed", String(x===b)); });
  state.modelMetric = b.dataset.metric;
  if (state.data) renderModels(state.data);
});
$("#refresh").addEventListener("click", () => {
  const btn = $("#refresh"); btn.classList.remove("spin"); void btn.offsetWidth; btn.classList.add("spin");
  load(state.range);
});
${INSIGHT_INTERACTIONS}

`;
