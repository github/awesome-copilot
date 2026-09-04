function safeJson(value) {
    return JSON.stringify(value).replaceAll("<", "\\u003c");
}

export function renderDashboardHtml({ instanceId, defaults, initialData }) {
    const initial = safeJson({ ...defaults, instanceId });
    const bootstrap = safeJson(initialData || null);
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Usage Insights</title>
  <style>
    :root {
      color-scheme: light dark;
      --accent: var(--true-color-blue, #3b82f6);
      --accent-muted: var(--true-color-blue-muted, #172554);
      --danger: var(--true-color-red, #ef6a6a);
      --danger-muted: var(--true-color-red-muted, #3b161a);
      --canvas: var(--background-color-default, #0d1117);
      --text: var(--text-color-default, #f0f3f6);
      --muted: var(--text-color-muted, #9da7b3);
      --rule: var(--border-color-default, #30363d);
      --row: color-mix(in srgb, var(--canvas) 91%, var(--text) 9%);
      --row-hover: color-mix(in srgb, var(--canvas) 88%, var(--accent) 12%);
      --track: color-mix(in srgb, var(--text) 8%, transparent);
      --blue: var(--accent);
      --amber: #76551c;
      --teal: #3f747b;
      --slate: #667080;
      --red: #c75c5c;
      --violet: #6b63d8;
    }

    * { box-sizing: border-box; }

    html {
      background: var(--canvas);
      scrollbar-color: var(--muted) transparent;
    }

    body {
      margin: 0;
      background: var(--canvas);
      color: var(--text);
      font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
      font-size: var(--text-body-medium, 14px);
      line-height: var(--leading-body-medium, 20px);
      font-variant-numeric: tabular-nums lining-nums;
    }

    ::selection {
      background: var(--accent);
      color: var(--color-white, #fff);
    }

    button { font: inherit; }

    button:focus-visible {
      outline: 2px solid var(--color-focus-outline, var(--accent));
      outline-offset: 2px;
    }

    .shell {
      min-height: 100vh;
      border-left: 1px solid var(--rule);
      border-right: 1px solid var(--rule);
    }

    .summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      min-height: 70px;
      padding: 18px 22px;
      border-bottom: 1px solid var(--rule);
    }

    .summary h1 {
      margin: 0;
      font-size: var(--text-title-small, 16px);
      line-height: var(--leading-title-small, 22px);
      font-weight: var(--font-weight-semibold, 600);
      letter-spacing: -.01em;
    }

    .summary h1 strong { color: var(--accent); }

    .summary-meta {
      display: block;
      max-width: 72vw;
      margin-top: 3px;
      overflow: hidden;
      color: var(--muted);
      font-size: var(--text-body-small, 12px);
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .header-actions {
      display: flex;
      align-items: center;
      flex: 0 0 auto;
      gap: 10px;
    }

    .live {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      color: var(--muted);
      font-size: var(--text-body-small, 12px);
    }

    .live::before {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--accent);
      content: "";
    }

    .loading .live::before { animation: pulse 1.1s ease-in-out infinite; }

    .button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 30px;
      border: 1px solid var(--rule);
      border-radius: 8px;
      padding: 4px 10px;
      background: transparent;
      color: var(--text);
      font-size: var(--text-body-small, 12px);
      cursor: pointer;
    }

    .button:hover { background: var(--row-hover); }
    .button[hidden] { display: none; }

    .button svg {
      width: 13px;
      height: 13px;
      stroke: currentColor;
    }

    .section {
      padding: 20px 22px;
      border-bottom: 1px solid var(--rule);
    }

    .section.flush { padding-inline: 0; }

    .section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      margin-bottom: 14px;
    }

    .section-head h2 {
      margin: 0;
      font-size: var(--text-title-small, 16px);
      line-height: var(--leading-title-small, 22px);
      font-weight: var(--font-weight-semibold, 600);
      letter-spacing: -.01em;
    }

    .section-head h2 span {
      color: var(--muted);
      font-weight: 400;
    }

    .section-head p {
      margin: 0;
      color: var(--muted);
      font-size: var(--text-body-small, 12px);
    }

    .color-0 { background: var(--amber); }
    .color-1 { background: var(--slate); }
    .color-2 { background: var(--teal); }
    .color-3 { background: var(--blue); }
    .color-4 { background: var(--red); }
    .color-5 { background: var(--violet); }

    .collapsible {
      width: 100%;
      border: 0;
      padding: 0;
      background: transparent;
      color: inherit;
      text-align: left;
      cursor: pointer;
    }

    .collapsible .chevron {
      display: inline-block;
      margin-right: 8px;
      color: var(--muted);
      transform: rotate(90deg);
    }

    .collapsible[aria-expanded="false"] .chevron { transform: rotate(0); }

    .chart {
      position: relative;
      height: 230px;
      margin-top: 12px;
    }

    .chart svg {
      display: block;
      width: 100%;
      height: 200px;
      overflow: visible;
    }

    .chart-grid {
      stroke: var(--rule);
      stroke-width: 1;
      vector-effect: non-scaling-stroke;
    }

    .chart-line {
      fill: none;
      stroke: var(--accent);
      stroke-width: 2;
      vector-effect: non-scaling-stroke;
    }

    .chart-area { fill: color-mix(in srgb, var(--accent) 19%, transparent); }
    .chart-dot { fill: var(--accent); }

    .chart-label {
      fill: var(--muted);
      font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
      font-size: 12px;
    }

    .chart-times {
      display: flex;
      justify-content: space-between;
      padding: 0 0 0 56px;
      color: var(--muted);
      font-size: var(--text-body-small, 12px);
    }

    .active-call {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      min-height: 48px;
      margin-top: 14px;
      padding: 10px 16px;
      border-radius: 12px;
      background: var(--row);
    }

    .active-call span:first-child {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }

    .activity-mark {
      display: grid;
      grid-template-columns: repeat(2, 3px);
      gap: 3px;
      width: 9px;
    }

    .activity-mark i {
      width: 3px;
      height: 3px;
      border-radius: 50%;
      background: var(--muted);
    }

    .active-call time { color: var(--muted); }

    .segmented {
      display: inline-flex;
      padding: 2px;
      border-radius: 10px;
      background: var(--row);
    }

    .segmented button {
      border: 0;
      border-radius: 8px;
      padding: 6px 11px;
      background: transparent;
      color: var(--muted);
      font-size: var(--text-body-small, 12px);
      font-weight: var(--font-weight-semibold, 600);
      cursor: pointer;
    }

    .segmented button:hover { color: var(--text); }

    .segmented button[aria-pressed="true"] {
      border: 1px solid var(--rule);
      padding: 5px 10px;
      background: var(--canvas);
      color: var(--text);
    }

    .bar-list {
      display: grid;
      gap: 18px;
    }

    .bar-row { min-width: 0; }

    .bar-label {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 7px;
    }

    .bar-label span:last-child {
      color: var(--muted);
      white-space: nowrap;
    }

    .bar-track {
      height: 8px;
      overflow: hidden;
      border-radius: 999px;
      background: var(--track);
    }

    .bar-fill {
      width: 100%;
      height: 100%;
      border-radius: inherit;
      transform-origin: left center;
    }

    .agent-detail {
      display: block;
      margin-top: 3px;
      color: var(--muted);
      font-size: var(--text-body-small, 12px);
    }

    .history-summary {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      margin: 0 -22px 20px;
      border-top: 1px solid var(--rule);
      border-bottom: 1px solid var(--rule);
      background: var(--row);
    }

    .history-stat {
      min-width: 0;
      padding: 12px 18px;
    }

    .history-stat + .history-stat { border-left: 1px solid var(--rule); }

    .history-stat strong {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .history-stat span {
      display: block;
      margin-top: 2px;
      color: var(--muted);
      font-size: var(--text-body-small, 12px);
    }

    .session-list {
      margin-inline: -22px;
      border-top: 1px solid var(--rule);
    }

    .session-button {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 18px;
      width: 100%;
      min-height: 52px;
      border: 0;
      border-bottom: 1px solid var(--rule);
      padding: 9px 22px;
      background: transparent;
      color: inherit;
      text-align: left;
      cursor: pointer;
    }

    .session-button:hover { background: var(--row-hover); }

    .session-name {
      display: block;
      overflow: hidden;
      font-weight: var(--font-weight-semibold, 600);
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .session-meta {
      display: block;
      margin-top: 2px;
      overflow: hidden;
      color: var(--muted);
      font-size: var(--text-body-small, 12px);
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .session-cost {
      color: var(--muted);
      white-space: nowrap;
    }

    .empty {
      padding: 28px 22px;
      color: var(--muted);
      text-align: center;
    }

    .error {
      margin: 14px 22px;
      padding: 10px 12px;
      border: 1px solid color-mix(in srgb, var(--danger) 45%, var(--rule));
      border-radius: 8px;
      background: var(--danger-muted);
      color: var(--danger);
    }

    .footer {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      padding: 16px 22px 24px;
      color: var(--muted);
      font-size: var(--text-body-small, 12px);
    }

    @keyframes pulse {
      50% { opacity: .35; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: .01ms !important;
        animation-iteration-count: 1 !important;
        scroll-behavior: auto !important;
      }
    }

    @media (max-width: 720px) {
      .summary, .section { padding-inline: 16px; }
      .history-summary, .session-list { margin-inline: -16px; }
      .history-stat { padding-inline: 12px; }
      .session-button { padding-inline: 16px; }
      .section-head { align-items: flex-start; }
    }

    @media (max-width: 560px) {
      .summary { align-items: flex-start; }
      .summary-meta { max-width: 58vw; }
      .live { font-size: 0; }
      .history-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .history-stat:nth-child(3) { border-left: 0; }
      .history-stat:nth-child(n+3) { border-top: 1px solid var(--rule); }
      .section-head { flex-direction: column; }
      .chart { height: 210px; }
      .chart svg { height: 180px; }
    }

    @media (max-width: 400px) {
      .button span { display: none; }
      .history-summary { grid-template-columns: 1fr; }
      .history-stat + .history-stat { border-left: 0; border-top: 1px solid var(--rule); }
      .footer { flex-direction: column; }
    }
  </style>
</head>
<body>
<!--
THESIS: A native GHCP telemetry view for model usage, not a separate analytics dashboard.
OWN-WORLD: Flat dark surfaces, section dividers, dense labels, thin tracks, restrained Rampa-backed color.
STORY: Read total spend, follow cumulative credits, then compare agents, token categories, and session history.
FIRST VIEWPORT: Session cost header and the cumulative usage chart, followed immediately by per-agent rollups.
FORM: Direct extension of the native Insights canvas shown by the user; seed key ghcp-insights-telemetry-v3.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
-->
  <main class="shell loading" id="app">
    <header class="summary">
      <div>
        <h1>Session usage: <strong id="headerCredits">—</strong> AI credits · <span id="headerCalls">—</span> calls</h1>
        <span class="summary-meta" id="sessionTitle">Loading session...</span>
      </div>
      <div class="header-actions">
        <button class="button" id="backButton" type="button" hidden>
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M6.5 3.5 2 8l4.5 4.5M2.5 8H14" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Current session</span>
        </button>
        <span class="live" id="liveStatus" aria-live="polite">Live</span>
      </div>
    </header>

    <section class="section" aria-labelledby="creditsHeading">
      <div class="section-head">
        <button class="collapsible" id="chartToggle" type="button" aria-expanded="true">
          <h2 id="creditsHeading"><span class="chevron">›</span>AI credits · <span id="chartCredits">—</span></h2>
        </button>
      </div>
      <div id="chartContent">
        <div class="chart" id="creditChart"></div>
        <div class="active-call">
          <span>
            <span class="activity-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
            <span id="latestCallLabel">Latest model call</span>
          </span>
          <time id="latestCallDuration">—</time>
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="agentUsageHeading">
      <div class="section-head">
        <h2 id="agentUsageHeading">Usage by agent</h2>
        <div class="segmented" id="agentMetricControl" aria-label="Agent metric">
          <button type="button" data-metric="credits" aria-pressed="true">AI credits</button>
          <button type="button" data-metric="tokens" aria-pressed="false">Tokens</button>
        </div>
      </div>
      <div class="bar-list" id="agentBars"></div>
    </section>

    <section class="section" aria-labelledby="tokensHeading">
      <div class="section-head">
        <h2 id="tokensHeading">Token breakdown</h2>
        <p id="tokenTotal">— total tokens</p>
      </div>
      <div class="bar-list" id="tokenBars"></div>
    </section>

    <section class="section" aria-labelledby="historyHeading">
      <div class="section-head">
        <div>
          <h2 id="historyHeading">Session history</h2>
          <p id="rangeLabel">Recent locally recorded usage</p>
        </div>
        <div class="segmented" id="rangeControl" aria-label="History range"></div>
      </div>
      <div class="history-summary">
        <div class="history-stat"><strong id="rangeCredits">—</strong><span>AI credits</span></div>
        <div class="history-stat"><strong id="rangeSessions">—</strong><span>Sessions</span></div>
        <div class="history-stat"><strong id="rootCredits">—</strong><span>Root agents</span></div>
        <div class="history-stat"><strong id="subagentCredits">—</strong><span>Sub-agents</span></div>
      </div>
      <div class="section-head">
        <h2>Highest-cost sessions</h2>
        <p>Select one to inspect its agent breakdown</p>
      </div>
      <div class="session-list" id="sessionList"></div>
    </section>

    <div class="error" id="errorState" role="alert" hidden></div>

    <footer class="footer">
      <span>Read-only · local Copilot usage data</span>
      <span id="updatedAt">Not updated yet</span>
    </footer>
  </main>

  <script>
    const initial = ${initial};
    const bootstrap = ${bootstrap};
    const state = {
      agentMetric: 'credits',
      range: initial.range || '7d',
      sessionId: initial.sessionId || '',
      loading: false,
      latestData: null,
    };

    const SVG_NS = 'http://www.w3.org/2000/svg';
    const app = document.getElementById('app');
    const errorState = document.getElementById('errorState');
    const backButton = document.getElementById('backButton');
    const chartToggle = document.getElementById('chartToggle');
    const chartContent = document.getElementById('chartContent');
    const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
    const compactFormat = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 2 });
    const creditFormat = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 });

    function formatNumber(value) {
      const amount = Number(value || 0);
      return amount >= 100000 ? compactFormat.format(amount) : numberFormat.format(amount);
    }

    function formatCredits(value) {
      return creditFormat.format(Number(value || 0));
    }

    function formatDuration(value, compact = false) {
      const ms = Math.max(0, Number(value || 0));
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      if (hours) return hours + 'h ' + (minutes % 60) + 'm';
      if (minutes) return minutes + 'm ' + (compact ? '' : (seconds % 60) + 's').trim();
      return Math.max(1, seconds) + 's';
    }

    function text(id, value) {
      document.getElementById(id).textContent = value;
    }

    function element(tag, className, content) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (content !== undefined) node.textContent = content;
      return node;
    }

    function svgElement(tag, attributes = {}) {
      const node = document.createElementNS(SVG_NS, tag);
      for (const [name, value] of Object.entries(attributes)) {
        node.setAttribute(name, String(value));
      }
      return node;
    }

    function renderCreditChart(selected) {
      const host = document.getElementById('creditChart');
      host.replaceChildren();
      const calls = selected.timeline.calls;
      if (!calls.length) {
        host.append(element('div', 'empty', 'No credit activity has been recorded yet.'));
        return;
      }

      const width = 1000;
      const height = 190;
      const left = 54;
      const top = 10;
      const right = 10;
      const bottom = 18;
      const plotWidth = width - left - right;
      const plotHeight = height - top - bottom;
      const total = Math.max(.001, calls.reduce((sum, call) => sum + call.aiCredits, 0));
      let cumulative = 0;
      const points = calls.map((call) => {
        cumulative += call.aiCredits;
        const x = left + (call.endedAtMs - selected.timeline.startedAtMs) / selected.timeline.durationMs * plotWidth;
        const y = top + plotHeight - cumulative / total * plotHeight;
        return { x, y };
      });

      const svg = svgElement('svg', {
        viewBox: '0 0 ' + width + ' ' + height,
        role: 'img',
        'aria-label': 'Cumulative AI credit usage over the selected session',
      });

      for (const ratio of [0, .25, .5, .75, 1]) {
        const y = top + plotHeight - ratio * plotHeight;
        svg.append(svgElement('line', { class: 'chart-grid', x1: left, x2: width - right, y1: y, y2: y }));
        const label = svgElement('text', { class: 'chart-label', x: 0, y: y + 4 });
        label.textContent = formatCredits(total * ratio);
        svg.append(label);
      }

      for (const ratio of [.25, .5, .75]) {
        const x = left + ratio * plotWidth;
        svg.append(svgElement('line', { class: 'chart-grid', x1: x, x2: x, y1: top, y2: top + plotHeight }));
      }

      const linePath = points.map((point, index) => (index ? 'L' : 'M') + point.x.toFixed(2) + ' ' + point.y.toFixed(2)).join(' ');
      const areaPath = linePath + ' L' + points.at(-1).x.toFixed(2) + ' ' + (top + plotHeight) + ' L' + points[0].x.toFixed(2) + ' ' + (top + plotHeight) + ' Z';
      svg.append(svgElement('path', { class: 'chart-area', d: areaPath }));
      svg.append(svgElement('path', { class: 'chart-line', d: linePath }));

      const pointStep = Math.max(1, Math.ceil(points.length / 52));
      points.forEach((point, index) => {
        if (index % pointStep === 0 || index === points.length - 1) {
          svg.append(svgElement('circle', { class: 'chart-dot', cx: point.x, cy: point.y, r: 3 }));
        }
      });

      host.append(svg);
      const times = element('div', 'chart-times');
      times.append(element('time', '', new Date(selected.timeline.startedAt).toLocaleTimeString()));
      times.append(element('time', '', new Date(selected.timeline.endedAt).toLocaleTimeString()));
      host.append(times);

      const latest = calls.at(-1);
      text('latestCallLabel', latest.model || 'Latest model call');
      text('latestCallDuration', formatDuration(latest.durationMs));
    }

    function renderAgentBars(selected) {
      const host = document.getElementById('agentBars');
      host.replaceChildren();
      if (!selected.agents.length) {
        host.append(element('div', 'empty', 'No per-agent usage has been recorded yet.'));
        return;
      }

      const values = selected.agents.map((agent) => {
        const tokens = agent.inputTokens + agent.outputTokens + agent.reasoningTokens;
        return { agent, value: state.agentMetric === 'credits' ? agent.aiCredits : tokens };
      });
      const maximum = Math.max(...values.map((entry) => entry.value), 1);

      values.forEach((entry, index) => {
        const row = element('div', 'bar-row');
        const label = element('div', 'bar-label');
        const left = document.createElement('span');
        left.append(element('span', '', entry.agent.displayName));
        left.append(element('span', 'agent-detail', entry.agent.models.join(', ') + ' · ' + entry.agent.calls + ' calls'));
        label.append(left);
        label.append(element('span', '', state.agentMetric === 'credits'
          ? formatCredits(entry.value) + ' AI credits'
          : formatNumber(entry.value) + ' tokens'));
        row.append(label);
        const track = element('div', 'bar-track');
        const fill = element('div', 'bar-fill color-' + (index % 6));
        fill.style.transform = 'scaleX(' + entry.value / maximum + ')';
        track.append(fill);
        row.append(track);
        host.append(row);
      });
    }

    function renderTokenBars(totals) {
      const host = document.getElementById('tokenBars');
      host.replaceChildren();
      const values = [
        { label: 'Input', value: totals.inputTokens, color: 1 },
        { label: 'Cache read', value: totals.cacheReadTokens, color: 2 },
        { label: 'Output', value: totals.outputTokens, color: 3 },
        { label: 'Reasoning', value: totals.reasoningTokens, color: 5 },
      ];
      const maximum = Math.max(...values.map((entry) => entry.value), 1);
      const total = values.reduce((sum, entry) => sum + entry.value, 0);
      text('tokenTotal', formatNumber(total) + ' total tokens');

      for (const entry of values) {
        const row = element('div', 'bar-row');
        const label = element('div', 'bar-label');
        label.append(element('span', '', entry.label));
        label.append(element('span', '', formatNumber(entry.value)));
        row.append(label);
        const track = element('div', 'bar-track');
        const fill = element('div', 'bar-fill color-' + entry.color);
        fill.style.transform = 'scaleX(' + entry.value / maximum + ')';
        track.append(fill);
        row.append(track);
        host.append(row);
      }
    }

    function renderRangeControl(data) {
      const control = document.getElementById('rangeControl');
      control.replaceChildren();
      for (const range of data.ranges) {
        const button = element('button', '', range.id === 'all' ? 'All' : range.id);
        button.type = 'button';
        button.setAttribute('aria-pressed', String(range.id === state.range));
        button.title = range.label;
        button.addEventListener('click', () => {
          if (state.range !== range.id) {
            state.range = range.id;
            if (bootstrap) render(bootstrap);
            load();
          }
        });
        control.append(button);
      }
    }

    function renderHistory(range) {
      const split = new Map(range.split.map((entry) => [entry.segment, entry]));
      text('rangeCredits', formatCredits(range.totals.aiCredits));
      text('rangeSessions', formatNumber(range.totals.sessions));
      text('rootCredits', formatCredits(split.get('root')?.aiCredits || 0));
      text('subagentCredits', formatCredits(split.get('subagents')?.aiCredits || 0));
      text('rangeLabel', range.label + ' · ' + formatNumber(range.totals.calls) + ' calls');

      const list = document.getElementById('sessionList');
      list.replaceChildren();
      if (!range.topSessions.length) {
        list.append(element('div', 'empty', 'No usage was recorded in this range.'));
        return;
      }

      for (const item of range.topSessions) {
        const button = element('button', 'session-button');
        button.type = 'button';
        button.title = 'Inspect ' + item.title;
        button.addEventListener('click', () => {
          state.sessionId = item.id;
          load();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        const labels = document.createElement('span');
        labels.append(element('span', 'session-name', item.title));
        labels.append(element('span', 'session-meta', [item.repository, item.model, formatNumber(item.calls) + ' calls'].filter(Boolean).join(' · ')));
        button.append(labels);
        button.append(element('span', 'session-cost', formatCredits(item.aiCredits) + ' credits'));
        list.append(button);
      }
    }

    function render(data) {
      state.latestData = data;
      const selected = data.selected;
      const totals = selected.totals;
      text('headerCredits', formatCredits(totals.aiCredits));
      text('headerCalls', formatNumber(totals.calls));
      text('sessionTitle', [selected.info.title, selected.info.repository, selected.info.model].filter(Boolean).join(' · '));
      text('chartCredits', formatCredits(totals.aiCredits));
      text('liveStatus', selected.isCurrent ? 'Live' : 'History');
      text('updatedAt', 'Updated ' + new Date(data.generatedAt).toLocaleTimeString());
      backButton.hidden = selected.isCurrent;

      renderCreditChart(selected);
      renderAgentBars(selected);
      renderTokenBars(totals);
      renderRangeControl(data);
      renderHistory(data.range);
    }

    async function load() {
      if (state.loading) return;
      state.loading = true;
      app.classList.add('loading');
      errorState.hidden = true;
      try {
        const params = new URLSearchParams({ range: state.range });
        if (state.sessionId) params.set('sessionId', state.sessionId);
        const response = await fetch('/api/stats?' + params.toString(), { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load session metrics.');
        render(data);
      } catch (error) {
        errorState.textContent = error instanceof Error ? error.message : 'Unable to load session metrics.';
        errorState.hidden = false;
        text('liveStatus', 'Unavailable');
      } finally {
        state.loading = false;
        app.classList.remove('loading');
      }
    }

    backButton.addEventListener('click', () => {
      state.sessionId = '';
      load();
    });

    chartToggle.addEventListener('click', () => {
      const expanded = chartToggle.getAttribute('aria-expanded') === 'true';
      chartToggle.setAttribute('aria-expanded', String(!expanded));
      chartContent.hidden = expanded;
    });

    document.getElementById('agentMetricControl').addEventListener('click', (event) => {
      const button = event.target.closest('button[data-metric]');
      if (!button || button.dataset.metric === state.agentMetric) return;
      state.agentMetric = button.dataset.metric;
      for (const candidate of event.currentTarget.querySelectorAll('button')) {
        candidate.setAttribute('aria-pressed', String(candidate === button));
      }
      if (state.latestData) renderAgentBars(state.latestData.selected);
    });

    const events = new EventSource('/events');
    let refreshTimer;
    events.addEventListener('refresh', () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(load, 180);
    });
    events.onerror = () => {
      text('liveStatus', 'Reconnecting');
    };

    load();
    setInterval(load, 5000);
  </script>
</body>
</html>`;
}
