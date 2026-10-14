export const INSIGHT_HTML = `
<section class="insights-view" id="coaching" role="tabpanel" aria-labelledby="insights-tab" hidden>
  <header class="insights-heading">
    <div><h2>A few ideas for your next session</h2><span class="scope-chip">Daily insight</span></div>
    <div class="insight-action"><button class="primary-action" id="generate" type="button">Generate insight</button><small>Copilot analyzes history</small></div>
  </header>
  <p id="coach-error" class="rec-error" role="alert" hidden></p>
  <div class="insights-grid">
    <div>
    <div id="thread" aria-live="polite">
      <section class="panel"><h3>Reading your saved insights...</h3></section>
    </div>
    <section class="panel experiment-review" id="experiment-panel" hidden aria-labelledby="experiment-title"></section>
    </div>
    <div class="insights-side">
      <section class="panel ask-panel" aria-labelledby="ask-title">
        <h3 id="ask-title">Ask about your usage</h3>
        <div id="ask-scope" class="question-scope" hidden></div>
        <form class="question-composer" id="composer" autocomplete="off">
          <textarea id="ask" rows="4" maxlength="600" required wrap="soft" aria-label="Question about your usage" aria-describedby="ask-shortcut" placeholder="What would you like to understand about your usage?"></textarea>
          <div class="composer-footer"><span id="ask-shortcut">Ctrl / Cmd + Enter</span><small class="question-service">Copilot analyzes history</small><button class="brief-btn" id="reset-composer" type="button" hidden>Auto size</button><button class="send primary-action" type="submit" aria-label="Send question">Ask &gt;</button></div>
        </form>
        <div class="suggestions" id="suggest"></div>
        <p class="question-status panel-note" id="question-status" role="status" hidden></p>
        <div id="latest-answer" aria-live="polite"></div>
        <div class="question-error" id="question-error" role="alert" hidden>
          <p class="rec-error" id="question-error-copy"></p>
          <button class="brief-btn" id="ask-retry" type="button">Retry question</button>
          <button class="brief-btn" id="refresh-question-scope" type="button" hidden>Refresh question scope</button>
        </div>
      </section>
      <section class="panel history-panel" aria-labelledby="history-title">
        <h3 id="history-title">Saved insights</h3>
        <div id="insight-history"></div>
      </section>
      <details class="visual-info insight-about">
        <summary>About insights</summary>
        <p>Daily insights combine native Chronicle standup, tips and cost-tips with local usage. Questions use tips and cost-tips and are answered independently. Default analysis uses today's work and recent history in your runtime's timezone. Ask about this data/model/session carries the selected Usage snapshot instead.</p>
        <p>Chronicle may send relevant session content and usage to your configured Copilot model. Canvas history is saved on this device; Copilot chat follows your session-sync settings. Nothing is scheduled automatically.</p>
        <p>Usage totals remain local. Chronicle history and cloud cost profiles can have different coverage; their totals are not merged into the charts.</p>
      </details>
    </div>
  </div>
</section>`;

export const TIDEPOOL_CSS = `
:root {
  --bg:#f3f8f8; --ink:#0b1b1d; --muted:#4b6265; --border:#d3e0e0;
  --surface:#fff; --surface-2:#e7f0f0; --accent:#007a72; --accent-ink:#fff;
  --focus:#00605a; --control:#6f8b8c; --heat-0:#dce8e8; --track:#dce8e8;
  --coach:var(--accent); --coach-soft:color-mix(in srgb,var(--accent) 8%,var(--surface));
  --success:#4a8000; --warning:#916000; --danger:#b42318;
  --c1:#2f78db; --c2:#4a8000; --c3:#a16b00; --c4:#bf415b; --c5:#007a72; --c6:#337b83;
  --radius:17px; --gap:20px; --shadow:none; color-scheme:light;
}
:root[data-color-mode="dark"], body[data-color-mode="dark"] {
  --bg:#0c1113; --ink:#eaf3f2; --muted:#97a9a7; --border:#2b373b;
  --surface:#141b1e; --surface-2:#1c2528; --accent:#22d3c5; --accent-ink:#04201d;
  --coach:var(--accent);
  --focus:#7cf2e8; --control:#60767a; --heat-0:#26323a; --track:#26323a;
  --success:#a3e635; --warning:#ffc247; --danger:#ff9385;
  --c1:#5aaeff; --c2:#a3e635; --c3:#ffc247; --c4:#ff8aa3; --c5:#22d3c5; --c6:#79ccd5;
  color-scheme:dark;
}
@media(prefers-color-scheme:dark) {
  :root:not([data-color-mode="light"]) {
    --bg:#0c1113; --ink:#eaf3f2; --muted:#97a9a7; --border:#2b373b;
    --surface:#141b1e; --surface-2:#1c2528; --accent:#22d3c5; --accent-ink:#04201d;
    --focus:#7cf2e8; --control:#60767a; --heat-0:#26323a; --track:#26323a;
    --success:#a3e635; --warning:#ffc247; --danger:#ff9385;
    --c1:#5aaeff; --c2:#a3e635; --c3:#ffc247; --c4:#ff8aa3; --c5:#22d3c5; --c6:#79ccd5;
    color-scheme:dark;
  }
}
body { line-height:1.5; }
button,input,textarea,select,summary { font-family:inherit; }
.app { max-width:1100px; padding-top:28px; }
.hd { align-items:center; }
.hd-title { display:flex; align-items:center; gap:12px; }
.hd-title h1 { font-size:24px; letter-spacing:-.7px; }
.brand-mark { display:flex; align-items:flex-end; gap:4px; width:29px; height:27px; }
.brand-mark i { width:6px; height:60%; border-radius:3px; background:var(--accent); }
.brand-mark i:nth-child(2) { height:100%; background:var(--success); }
.brand-mark i:nth-child(3) { height:78%; background:var(--c1); }
.view-nav { display:flex; gap:24px; border-bottom:1px solid var(--border); margin-bottom:20px; }
.view-nav button { min-height:44px; min-width:70px; padding:8px 2px 14px; border:0; border-bottom:2px solid transparent; margin-bottom:-1px; background:none; color:var(--muted); font:inherit; cursor:pointer; }
.view-nav button[aria-selected="true"] { border-bottom-color:var(--accent); color:var(--ink); }
.seg { border-radius:12px; background:var(--bg); }
.seg button { min-width:44px; min-height:44px; font-size:12px; border-radius:8px; }
.seg button.on { background:var(--surface-2); }
.icon-btn { width:44px; height:44px; border-color:var(--control); border-radius:11px; }
.panel { padding:22px; background:var(--surface); }
.cols > .panel { min-width:0; }
.panel-hd { flex-wrap:wrap; }
.panel-hd h2 { font-size:17px; letter-spacing:-.3px; }
.panel-note,.privacy-control,.metric-note,.metric-details,.metric-select .l,.legend li,.heat-legend,.hours-axis,.mini h3,.counter-badge,.record-counters,.record-name,.scope-chip,.visual-info summary,.timeline-reading small,.timeline-controls label,.timeline-controls .brief-btn,.ft { font-size:12px; }
.rec-error { color:var(--danger); font-size:13px; overflow-wrap:anywhere; }
.coach-status { margin:0 0 20px; padding:12px 16px; border:1px solid var(--border); border-radius:11px; background:var(--surface-2); color:var(--ink); font-size:14px; overflow-wrap:anywhere; }
.coach-status[data-failed="true"] { color:var(--danger); }
.model-link,summary,select,.privacy-control { min-height:44px; }
.primary-strip { gap:14px; border:0; background:none; overflow:visible; }
.primary-strip .kpi { border:1px solid var(--border); border-radius:16px; background:var(--surface); }
.primary-strip .kpi:has([aria-pressed="true"]) { border-color:var(--accent); background:radial-gradient(ellipse at top right,var(--coach-soft),transparent 80%),var(--surface); }
.metric-select { padding:18px 20px 8px; background:none !important; }
.metric-select .v { font-size:clamp(30px,4vw,44px); letter-spacing:-1.3px; }
.metric-select .l { margin-bottom:6px; }
.metric-details { min-height:44px; border-top:0; padding:8px 20px; }
.activity-summary .reveal { animation:none; opacity:1; transform:none; }
.pulse { padding:18px 22px; border-color:var(--border); background:var(--surface); }
.pulse-eyebrow { font-size:12px; margin-bottom:6px; }
.pulse h2 { font-size:18px; }
#pulse-summary { font-size:13px; margin:7px 0 10px; }
.brief-btn { min-height:44px; border-radius:10px; padding:8px 13px; background:var(--surface); border-color:var(--control); }
#cols-models { grid-template-columns:minmax(0,1.65fr) minmax(260px,1fr); }
#cols-models > .panel { min-width:0; }
#models .share-visual { justify-content:center; margin:10px 0 18px; }
#models .share-visual svg { width:130px; height:130px; }
#models .mix-leading { font-size:14px; color:var(--ink); overflow-wrap:anywhere; }
.bar-row .name { white-space:normal; overflow-wrap:anywhere; }
.bar-row .val { text-align:right; }
.timeline-controls input { min-height:44px; font-size:12px; border-color:var(--control); }
.timeline-graphic text { font-size:24px; }
.visual-info.compact summary { width:44px; height:44px; border-color:var(--control); }
.token-overview-link { margin-top:14px; }
button:focus-visible,select:focus-visible,input:focus-visible,textarea:focus-visible,summary:focus-visible { outline:2px solid var(--focus); outline-offset:3px; }
.timeline-point:focus-visible .point-dot { stroke:var(--focus); }
.insights-heading { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:16px; margin-bottom:20px; }
.insights-heading h2 { margin:0 0 10px; font-size:21px; letter-spacing:-.4px; }
.insight-action { text-align:center; }
.insight-action small { display:block; color:var(--muted); font-size:12px; margin-top:5px; }
.primary-action { min-height:44px; padding:11px 17px; border:0; border-radius:11px; background:var(--accent); color:var(--accent-ink); font:inherit; font-size:13px; font-weight:600; cursor:pointer; }
.primary-action:disabled { opacity:.55; cursor:wait; }
.insights-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:20px; align-items:start; }
.insights-grid > * { min-width:0; }
.insights-view h3 { margin:0 0 12px; font-size:15px; }
.insights-view p { margin:8px 0; overflow-wrap:anywhere; }
.daily-insight h3 { font-size:22px; line-height:1.35; letter-spacing:-.5px; }
.daily-insight > p { color:var(--muted); font-size:14px; }
.insight-stamp { display:flex; flex-wrap:wrap; gap:8px; color:var(--muted); font-size:12px; margin-bottom:14px; }
.insight-full-copy,.insight-evidence { margin-top:12px; }
.insight-full-copy p,.insight-evidence p { color:var(--muted); font-size:13px; }
.experiment-list { display:grid; gap:12px; }
.experiment { padding:18px; border:1px solid var(--border); border-radius:15px; background:var(--surface); }
.experiment h3 { font-size:15px; margin-bottom:8px; overflow-wrap:anywhere; }
.experiment > p { font-size:13px; color:var(--muted); }
.experiment-controls { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-top:12px; }
.experiment-status { color:var(--accent); font-size:12px; margin-right:auto; }
.experiment[data-status="done"] .experiment-status { color:var(--success); }
.experiment summary { min-height:44px; }
.experiment-review { margin-top:18px; }
.experiment-review textarea { display:block; width:100%; min-height:110px; resize:vertical; padding:12px; border:1px solid var(--control); border-radius:10px; background:var(--bg); color:var(--ink); font:inherit; }
.experiment-review label { display:block; margin:16px 0 8px; font-size:13px; }
.experiment-review select { max-width:100%; min-height:44px; padding:8px; background:var(--surface); color:var(--ink); border:1px solid var(--control); border-radius:8px; }
.experiment-review .experiment-controls { justify-content:flex-start; }
.experiment-baseline { color:var(--muted); font-size:13px; }
.insight-watchout { border-left:3px solid var(--warning); padding-left:10px; color:var(--ink); font-size:13px; }
.question-scope { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-bottom:10px; }
.answer-table-wrap { max-width:100%; overflow-x:auto; margin:12px 0; }
.answer-content table { border-collapse:collapse; width:100%; font-size:13px; }
.answer-content th,.answer-content td { padding:8px; border:1px solid var(--border); text-align:left; }
.answer-content blockquote { margin:12px 0; padding-left:12px; border-left:3px solid var(--control); color:var(--muted); }
.answer-content a { color:var(--accent); text-decoration:underline; }
.pulse-explanation { margin-top:16px; padding-top:16px; border-top:1px solid var(--border); }
.question-composer { border:1px solid var(--control); border-radius:13px; background:var(--bg); }
.question-composer:focus-within { border-color:var(--focus); box-shadow:0 0 0 1px var(--focus); }
.question-composer textarea { display:block; width:100%; min-width:0; min-height:140px; max-height:300px; padding:16px; border:0; border-radius:13px; background:none; color:var(--ink); font:14px/1.65 var(--font-sans,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif); resize:vertical; overflow-x:hidden; overflow-y:auto; white-space:pre-wrap; overflow-wrap:anywhere; }
.question-composer textarea::placeholder { color:var(--muted); opacity:1; }
.question-composer textarea:focus-visible { outline-offset:-3px; }
.composer-footer { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px; padding:0 12px 12px; }
#ask-shortcut { color:var(--muted); font-size:12px; }
.question-service { color:var(--muted); font-size:12px; }
.send { margin-left:auto; min-width:76px; width:auto; }
.suggestions { margin-top:8px; }
.suggestions button { min-height:44px; padding:4px 0; border:0; background:none; color:var(--muted); font:inherit; font-size:12px; text-align:left; cursor:pointer; }
.latest-answer { padding-top:16px; margin-top:16px; border-top:1px solid var(--border); }
.latest-answer .answer-question { color:var(--muted); font-size:12px; }
.latest-answer > p { font-size:14px; }
.latest-answer details p { font-size:14px; }
.answer-content { color:var(--ink); font-size:14px; line-height:1.65; overflow-wrap:anywhere; }
.answer-content p { margin:0 0 14px; }
.answer-content h4 { margin:18px 0 8px; font-size:14px; font-weight:600; }
.answer-content ul,.answer-content ol { margin:8px 0 14px; padding-left:22px; }
.answer-content li { margin:6px 0; }
.answer-content strong { font-weight:600; }
.answer-content code { padding:2px 4px; border-radius:4px; background:var(--surface-2); font-family:var(--font-mono,ui-monospace,monospace); font-size:.9em; }
.answer-content pre { margin:12px 0; padding:12px; border-radius:10px; background:var(--surface-2); white-space:pre-wrap; overflow-wrap:anywhere; }
.answer-content pre code { padding:0; }
.answer-content > :last-child { margin-bottom:0; }
.history-answer .answer-content,.history-answer .answer-content p { font-size:13px; }
.question-error,.question-status { margin-top:16px; }
.history-row { border-top:1px solid var(--border); padding:6px 0; }
.history-row > summary { display:flex; flex-wrap:wrap; justify-content:space-between; gap:8px; min-height:44px; color:var(--ink); font-size:13px; }
.history-row > summary small { color:var(--muted); font-size:12px; }
.history-content { padding:12px 0; }
.history-content .daily-insight { padding:0; border:0; background:none; }
.history-answer { border-top:1px solid var(--border); padding:12px 0; }
.history-answer > p { font-size:13px; }
.history-answer .insight-stamp { margin-bottom:4px; }
.insight-about { margin:8px 0 20px; }
.insight-about summary { min-height:44px; }
@media(max-width:700px) {
  #cols-models,.insights-grid { grid-template-columns:minmax(0,1fr); }
}
@media(max-width:460px) {
  .app { padding:20px 16px 28px; }
  .hd-title h1 { font-size:22px; }
  .panel { padding:18px; }
  .primary-strip { gap:8px; }
  .metric-select { padding:13px 10px 7px; }
  .metric-select .v { font-size:29px; }
  .metric-note,.metric-details { padding-left:10px; padding-right:10px; }
  .insight-action { text-align:left; }
  #ask-shortcut { display:none; }
  .timeline-graphic text { font-size:30px; }
}
@media(forced-colors:active) {
  .panel,.experiment,.primary-strip .kpi,.question-composer { border-color:CanvasText; }
  .primary-action { border:1px solid ButtonText; }
  .view-nav button[aria-selected="true"] { border-bottom-color:Highlight; }
  .visual-track,.bar-track { border:1px solid CanvasText; }
  svg path,svg circle { stroke:CanvasText; }
}
`;

export const INSIGHT_JS = String.raw`
function coachBusy() {
  return state.asking || state.generating || state.reviewingExperiment ||
    state.coachStatus?.operation?.state === "running" || state.coachConnecting || state.coachDisconnected;
}
function syncCoachControls() {
  const busy = coachBusy(), operation = state.coachStatus?.operation;
  $("#generate").disabled = busy;
  $("#generate").textContent = state.generating || (operation?.state === "running" && operation.kind === "generate")
    ? "Generating..." : "Generate insight";
  $(".send").disabled = busy; $("#ask").disabled = busy;
  $("#ask-retry").disabled = busy;
  $("#composer").setAttribute("aria-busy", String(state.asking || (operation?.state === "running" && operation.kind === "ask")));
  const review = document.querySelector("#review-experiment");
  if (review) {
    review.disabled = busy;
    review.textContent = state.reviewingExperiment || (operation?.state === "running" && operation.kind === "review")
      ? "Reviewing..." : "Review with Copilot";
  }
  const progress = $("#coach-progress");
  progress.hidden = !operation && !state.coachDisconnected && !state.coachConnecting;
  progress.dataset.failed = String(operation?.state === "failed");
  progress.textContent = state.coachDisconnected
    ? "Live updates disconnected. Reconnecting automatically; check chat before retrying a request."
    : state.coachConnecting ? "Connecting to live coach progress..."
    : operation ? ({ generate:"Insight", ask:"Question", review:"Experiment review" }[operation.kind] + ": " + operation.message) : "";
}
function acceptCoachStatus(status, refresh = true) {
  if (!status || typeof status.providerId !== "string" || !Number.isInteger(status.sequence)) return;
  const previous = state.coachStatus;
  if (previous?.providerId === status.providerId && previous.sequence > status.sequence) return;
  state.coachStatus = status;
  if (refresh) {
    state.coachConnecting = false;
    state.coachDisconnected = false;
  }
  const operation = status.operation;
  const newlyFinished = operation?.state === "completed" &&
    (previous?.operation?.id !== operation.id || previous.operation.state !== "completed");
  if (newlyFinished && operation.kind === "ask") state.showLatestAnswer = true;
  if (operation?.kind === "review" && !state.activeExperiment &&
      (operation.state === "running" || newlyFinished)) state.activeExperiment = operation.experimentId;
  syncCoachControls();
  if (refresh && state.initialized && (!previous || previous.providerId !== status.providerId ||
      previous.revision !== status.revision || newlyFinished)) refreshSavedInsights();
}
async function refreshSavedInsights() {
  const readId = ++state.insightReadId;
  try {
    const insights = await api("/insights");
    if (readId !== state.insightReadId) return;
    const selected = state.activeExperiment;
    const reviewChanged = selected && state.insights.experiments?.[selected]?.review?.at !== insights.experiments?.[selected]?.review?.at;
    const editingExperiment = $("#experiment-panel").contains(document.activeElement) ||
      (selected && Object.hasOwn(state.experimentDrafts, selected));
    state.insights = insights; state.timeZone = insights.timeZone;
    if (insights.coach) acceptCoachStatus(insights.coach, false);
    renderThread(insights); renderFollowThrough(insights);
    if (!editingExperiment || reviewChanged) renderActiveExperiment();
    if (state.showLatestAnswer) renderLatestAnswer(insights);
    syncCoachControls();
    $("#coach-error").hidden = true;
  } catch (error) {
    if (readId !== state.insightReadId) return;
    $("#coach-error").textContent = "Could not update saved results: " + error.message + " Use Refresh to retry.";
    $("#coach-error").hidden = false;
  }
}
function connectCoachUpdates() {
  if (typeof EventSource === "undefined") return;
  let events;
  function connect() {
    events = new EventSource("/events?token=" + encodeURIComponent(params.get("token") || ""));
    events.onmessage = event => {
      try { acceptCoachStatus(JSON.parse(event.data)); }
      catch (error) {
        state.coachDisconnected = true; syncCoachControls();
        $("#coach-error").textContent = "Could not read live progress: " + error.message;
        $("#coach-error").hidden = false;
      }
    };
    events.onerror = () => { state.coachConnecting = false; state.coachDisconnected = true; syncCoachControls(); };
  }
  connect();
  window.addEventListener("pagehide", () => events.close());
  window.addEventListener("pageshow", event => { if (event.persisted) connect(); });
  syncCoachControls();
}
function excerpt(text, limit) {
  const words = String(text || "").trim().split(/\s+/);
  return words.length > limit ? words.slice(0, limit).join(" ") + "..." : String(text || "");
}
function markdownText(text) {
  return String(text).replace(/&(?:amp|lt|gt|quot|apos|nbsp|#\d+|#x[\da-f]+);/gi, entity => {
    const named = { "&amp;":"&", "&lt;":"<", "&gt;":">", "&quot;":'"', "&apos;":"'", "&nbsp;":" " };
    if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
    const value = entity.slice(2,-1), point = value[0].toLowerCase() === "x" ? parseInt(value.slice(1),16) : Number(value);
    return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : "\ufffd";
  });
}
function safeAnswerLink(href) {
  try {
    const url = new URL(href);
    return ["https:", "http:", "mailto:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}
function markdownInline(target, tokens) {
  for (const token of tokens || []) {
    if (["strong","em","del"].includes(token.type)) {
      const node = el(token.type); markdownInline(node, token.tokens); target.appendChild(node);
    } else if (token.type === "codespan") target.appendChild(el("code", null, token.text));
    else if (token.type === "br") target.appendChild(el("br"));
    else if (token.type === "link") {
      const href = safeAnswerLink(token.href);
      const node = el(href ? "a" : "span");
      if (href) { node.setAttribute("href", href); node.setAttribute("target","_blank"); node.setAttribute("rel","noopener noreferrer"); }
      markdownInline(node, token.tokens || [{ type:"text", text:token.text }]); target.appendChild(node);
    } else if (token.type === "image") target.appendChild(document.createTextNode("[Image: " + markdownText(token.text || "image") + "]"));
    else if (token.tokens) markdownInline(target, token.tokens);
    else target.appendChild(document.createTextNode(token.type === "html" ? token.raw : markdownText(token.text || token.raw || "")));
  }
}
function markdownBlocks(target, tokens) {
  for (const token of tokens) {
    if (token.type === "space" || token.type === "def") continue;
    if (token.type === "list") {
      const list = el(token.ordered ? "ol" : "ul");
      if (token.ordered) list.setAttribute("start", token.start);
      for (const item of token.items) {
        const node = el("li");
        if (item.task) { const check = el("input"); check.type = "checkbox"; check.checked = item.checked; check.disabled = true; node.appendChild(check); }
        markdownBlocks(node, item.tokens); list.appendChild(node);
      }
      target.appendChild(list);
    } else if (token.type === "blockquote") {
      const node = el("blockquote"); markdownBlocks(node, token.tokens); target.appendChild(node);
    } else if (token.type === "table") {
      const wrap = el("div", "answer-table-wrap"), table = el("table"), head = el("thead"), row = el("tr");
      token.header.forEach((cell, index) => { const node = el("th"); node.setAttribute("scope","col"); node.style.textAlign = token.align[index] || "left"; markdownInline(node, cell.tokens); row.appendChild(node); });
      head.appendChild(row); table.appendChild(head);
      const body = el("tbody");
      token.rows.forEach(cells => { const row = el("tr"); cells.forEach((cell,index) => { const node = el("td"); node.style.textAlign = token.align[index] || "left"; markdownInline(node, cell.tokens); row.appendChild(node); }); body.appendChild(row); });
      table.appendChild(body); wrap.appendChild(table); target.appendChild(wrap);
    } else if (token.type === "code") {
      const node = el("pre"); node.appendChild(el("code", null, token.text)); target.appendChild(node);
    } else if (token.type === "hr") target.appendChild(el("hr"));
    else {
      const node = el(token.type === "heading" ? "h4" : "p");
      if (token.type === "html") node.textContent = token.raw;
      else markdownInline(node, token.tokens || [{ type:"text", text:token.text || token.raw }]);
      target.appendChild(node);
    }
  }
}
function answerContent(text) {
  const root = el("div", "answer-content");
  markdownBlocks(root, ChronicleMarkdown.lex(String(text)));
  return root;
}
function fullCopy(label, text) {
  const details = el("details", "insight-full-copy");
  details.appendChild(el("summary", null, label));
  details.appendChild(el("p", null, text));
  return details;
}
function insightBody(brief, archived = false) {
  const box = el("section", "panel daily-insight");
  const stamp = el("div", "insight-stamp");
  stamp.appendChild(el("span", null, archived ? "Saved " + niceDate(brief.date) : "Today"));
  if (brief.analysisSource === "native-chronicle") stamp.appendChild(el("span", null, "Chronicle"));
  if (brief.generatedAt) stamp.appendChild(el("span", null, new Date(brief.generatedAt).toLocaleTimeString("en-US", { timeZone: state.timeZone, hour: "numeric", minute: "2-digit" })));
  box.appendChild(stamp);
  box.appendChild(el("h3", null, excerpt(brief.headline, 8)));
  box.appendChild(el("p", null, excerpt(brief.summary, 20)));
  if (excerpt(brief.headline, 8) !== brief.headline || excerpt(brief.summary, 20) !== brief.summary) {
    box.appendChild(fullCopy("Read full insight", brief.headline + "\n\n" + brief.summary));
  }
  if (brief.watchouts?.length) box.appendChild(el("p", "insight-watchout", "Watch: " + excerpt(brief.watchouts[0].title, 8)));
  const signals = [...(brief.wins || []).map(item => ({ ...item, kind:"Win" })),
    ...(brief.watchouts || []).map(item => ({ ...item, kind:"Watchout" }))];
  if (signals.length) {
    const evidence = el("details", "insight-evidence");
    evidence.appendChild(el("summary", null, "Evidence"));
    signals.forEach(signal => {
      evidence.appendChild(el("b", null, signal.kind + ": " + signal.title));
      evidence.appendChild(el("p", null, signal.evidence));
    });
    box.appendChild(evidence);
  }
  return box;
}
function recMessage(date, rec) {
  const card = el("article", "experiment");
  card.dataset.date = date; card.dataset.recommendationId = rec.id; card.dataset.status = rec.status || "new";
  card.appendChild(el("h3", null, excerpt(rec.title, 8)));
  card.appendChild(el("p", null, excerpt(rec.action, 18)));
  const controls = el("div", "experiment-controls");
  controls.appendChild(el("span", "experiment-status", rec.status === "trying" ? "Trying" : rec.status === "done" ? "Done" : "Suggested"));
  const statuses = rec.status === "trying" ? [["done","Done"],["new","Not now"]]
    : rec.status === "done" ? [["new","Reset"]] : [["trying","Start"]];
  statuses.forEach(([status, label]) => {
    const button = el("button", "brief-btn", label);
    button.type = "button"; button.dataset.status = status;
    button.setAttribute("aria-label", label + ": " + rec.title);
    button.addEventListener("click", () => saveExperiment(card, date, rec, status));
    controls.appendChild(button);
  });
  card.appendChild(controls);
  if (rec.status === "trying" || rec.status === "done") {
    const check = el("button", "brief-btn", rec.status === "trying" ? "Check in" : "Review experiment");
    check.type = "button"; check.addEventListener("click", () => openExperiment(rec.id)); controls.appendChild(check);
  }
  const why = el("details", "insight-evidence");
  why.appendChild(el("summary", null, "Why this?"));
  why.appendChild(el("b", null, rec.title));
  why.appendChild(el("p", null, "Try: " + rec.action));
  why.appendChild(el("p", null, rec.why));
  why.appendChild(el("p", null, rec.evidence));
  card.appendChild(why);
  return card;
}
async function saveExperiment(card, date, rec, status) {
  const cards = $$("[data-recommendation-id]").filter(item => item.dataset.recommendationId === rec.id);
  const buttons = cards.flatMap(item => [...item.querySelectorAll("button")]);
  buttons.forEach(button => button.disabled = true);
  card.querySelector(".rec-error")?.remove();
  try {
    const updated = await api("/recommendation-status", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, recommendationId: rec.id, status }) });
    const current = state.insights.briefs.find(brief => brief.date === date)?.recommendations.find(item => item.id === rec.id) || rec;
    Object.assign(current, { status: updated.status, statusUpdatedAt: updated.statusUpdatedAt });
    if (updated.experiment) {
      applyExperiment(updated.experiment);
    }
    syncExperimentCards(rec.id);
    renderFollowThrough(state.insights);
    if (status === "trying") openExperiment(rec.id);
    else renderActiveExperiment();
  } catch (error) {
    const notice = el("p", "rec-error", "Could not save your experiment: " + error.message);
    notice.setAttribute("role","alert"); card.appendChild(notice);
    buttons.forEach(button => button.disabled = false);
  }
}
function applyExperiment(experiment) {
  if (!state.insights.experiments) state.insights.experiments = {};
  state.insights.experiments[experiment.id] = experiment;
  for (const brief of state.insights.briefs || []) for (const rec of brief.recommendations || []) {
    if (rec.id === experiment.id) Object.assign(rec, { status:experiment.status, statusUpdatedAt:experiment.statusUpdatedAt });
  }
}
function syncExperimentCards(id) {
  $$("[data-recommendation-id]").filter(item => item.dataset.recommendationId === id).forEach(shown => {
    const date = shown.dataset.date, rec = state.insights.briefs.find(brief => brief.date === date)?.recommendations.find(item => item.id === id) || state.insights.experiments[id];
    const restore = state.coachExpanded && shown.contains(document.activeElement);
    const replacement = recMessage(date, rec);
    shown.replaceWith(replacement);
    if (restore) replacement.querySelector("button")?.focus();
  });
}
function appendRecommendations(target, brief) {
  const recommendations = brief.recommendations || [];
  if (!recommendations.length) return;
  target.appendChild(el("h3", null, "Experiments to try"));
  const list = el("div", "experiment-list");
  recommendations.slice(0,2).forEach(rec => list.appendChild(recMessage(brief.date, rec)));
  target.appendChild(list);
  if (recommendations.length > 2) {
    const more = el("details", "insight-full-copy");
    more.appendChild(el("summary", null, "More ideas"));
    recommendations.slice(2).forEach(rec => more.appendChild(recMessage(brief.date, rec)));
    target.appendChild(more);
  }
}
function latestReply(insights) {
  const dates = Object.keys(insights.chats || {}).sort().reverse();
  let latest = null, latestTime = -Infinity;
  for (const date of dates) {
    const messages = insights.chats[date] || [];
    for (let index = messages.length - 1; index >= 0; index--) {
      if (messages[index].role !== "coach") continue;
      const at = Date.parse(messages[index].at);
      const timestamp = Number.isFinite(at) ? at : Date.parse(date + "T00:00:00Z") + index;
      if (timestamp > latestTime) {
        latestTime = timestamp;
        latest = { date, answer: messages[index], question: messages.slice(0,index).reverse().find(message => message.role === "user") };
      }
    }
  }
  return latest;
}
function renderLatestAnswer(insights) {
  const root = $("#latest-answer"); root.replaceChildren();
  const reply = latestReply(insights);
  if (!reply) return;
  const box = el("section", "latest-answer");
  box.appendChild(el("div", "insight-stamp", "Saved answer · " + niceDate(reply.date)));
  const answer = el("details");
  answer.open = state.showLatestAnswer;
  answer.appendChild(el("summary", null, state.showLatestAnswer ? "Your answer" : "Latest saved answer"));
  if (reply.question) {
    answer.appendChild(el("p", "answer-question", excerpt(reply.question.text, 18)));
    if (excerpt(reply.question.text,18) !== reply.question.text) answer.appendChild(fullCopy("Full question", reply.question.text));
  }
  answer.appendChild(answerContent(reply.answer.text));
  if (reply.answer.scope) answer.appendChild(fullCopy("Answer context", reply.answer.scope.label + " · " + new Date(reply.answer.scope.asOf).toLocaleString("en-US", { timeZone: state.timeZone })));
  box.appendChild(answer);
  root.appendChild(box);
}
function renderHistory(insights) {
  const root = $("#insight-history"); root.replaceChildren();
  const briefs = insights.briefs || [], chats = insights.chats || {};
  const dates = [...new Set(briefs.map(brief => brief.date).concat(Object.keys(chats)))].sort().reverse();
  if (!dates.length) { root.appendChild(el("p", "panel-note", "Your saved insights will appear here.")); return; }
  dates.slice(0,state.visibleDays).forEach(date => {
    const row = el("details", "history-row"), summary = el("summary");
    summary.appendChild(el("span", null, niceDate(date)));
    const brief = briefs.find(item => item.date === date);
    summary.appendChild(el("small", null, brief ? "Snapshot" : "Answers"));
    row.appendChild(summary);
    let populated = false;
    row.addEventListener("toggle", () => {
      if (!row.open || populated) return;
      populated = true;
      const body = el("div", "history-content");
      if (brief) { body.appendChild(insightBody(brief, true)); appendRecommendations(body, brief); }
      (chats[date] || []).forEach(message => {
        const item = el("section", "history-answer");
        item.appendChild(el("div", "insight-stamp", message.role === "user" ? "Question" : "Saved answer"));
        if (message.role === "coach") item.appendChild(answerContent(message.text));
        else String(message.text).split(/\n{2,}/).forEach(part => { if (part.trim()) item.appendChild(el("p", null, part.trim())); });
        if (message.scope) item.appendChild(fullCopy("Answer context", message.scope.label + " · " + new Date(message.scope.asOf).toLocaleString("en-US", { timeZone: state.timeZone })));
        body.appendChild(item);
      });
      row.appendChild(body);
    });
    root.appendChild(row);
  });
  if (dates.length > state.visibleDays) {
    const more = el("button", "brief-btn", "Show more history");
    more.type = "button";
    more.addEventListener("click", () => { state.visibleDays += 7; renderHistory(state.insights); });
    root.appendChild(more);
  }
}
function renderThread(insights) {
  const root = $("#thread"); root.replaceChildren();
  const today = insights.today || localToday();
  const brief = (insights.briefs || []).find(item => item.date === today);
  if (brief) {
    root.appendChild(insightBody(brief));
    appendRecommendations(root, brief);
  } else {
    const box = el("section", "panel daily-insight");
    box.appendChild(el("h3", null, "No insight for today yet"));
    box.appendChild(el("p", null, "Generate one when you're ready."));
    root.appendChild(box);
  }
  renderHistory(insights);
  if (!state.asking) renderLatestAnswer(insights);
}
function resizeQuestion() {
  const field = $("#ask");
  if (!field.getClientRects().length) return;
  const incoming = parseInt(field.style.height, 10);
  if (state.lastComposerHeight && incoming && incoming !== state.lastComposerHeight) {
    state.composerHeight = Math.min(300, Math.max(140, incoming));
    persistPreferences({ composerHeight:state.composerHeight });
  }
  if (state.composerHeight != null) {
    field.style.height = state.composerHeight + "px"; state.lastComposerHeight = state.composerHeight;
    $("#reset-composer").hidden = false; return;
  }
  field.style.height = "auto";
  const height = Math.min(300, Math.max(140, field.scrollHeight));
  field.style.height = height + "px"; state.lastComposerHeight = height;
  $("#reset-composer").hidden = true;
}
function renderAskScope() {
  const root = $("#ask-scope"); root.replaceChildren(); root.hidden = !state.askScope;
  if (!state.askScope) return;
  const scope = state.askScope;
  const range = state.askScopeDetails?.range || state.range;
  root.appendChild(el("span", "scope-chip", "Selected " + scope.kind + " · " + (range === "all" ? "all history" : range + "d")));
  if (state.askScopeDetails?.asOf) root.appendChild(el("small", null, "Snapshot as of " + new Date(state.askScopeDetails.asOf).toLocaleString("en-US", { timeZone:state.timeZone })));
  const clear = el("button", "brief-btn", "Clear scope"); clear.type = "button";
  clear.addEventListener("click", () => { state.askScope = null; state.askScopeDetails = null; renderAskScope(); $("#ask").focus(); });
  root.appendChild(clear);
}
function askAboutInspection(frame) {
  const scope = { snapshotId:state.data.snapshot.id, kind:"range", metric:frame.key || null };
  if (frame.kind === "model") { scope.kind = "model"; scope.model = frame.model; delete scope.metric; }
  if (frame.kind === "session") { scope.kind = "session"; scope.model = frame.model; scope.sessionId = frame.sessionId; delete scope.metric; }
  state.askScope = scope;
  state.askScopeDetails = { range:state.data.range, asOf:state.data.snapshot.asOf };
  setCoachExpanded(true);
  renderAskScope();
  if (!$("#ask").value.trim()) $("#ask").value = "What explains the token use in this " + scope.kind + ", and what should I investigate?";
  resizeQuestion(); $("#ask").focus();
}
function openExperiment(id) {
  state.activeExperiment = id;
  setCoachExpanded(true);
  renderActiveExperiment();
  document.querySelector("#experiment-title")?.focus();
  $("#experiment-panel").scrollIntoView?.({ block:"nearest" });
}
function renderActiveExperiment() {
  const root = $("#experiment-panel");
  root.hidden = !state.activeExperiment;
  if (!state.activeExperiment || state.reviewingExperiment) return;
  root.replaceChildren();
  const catalog = state.insights.experiments || {};
  const experiment = Object.hasOwn(catalog, state.activeExperiment) ? catalog[state.activeExperiment] : null;
  if (!experiment) { root.appendChild(el("p", "rec-error", "This experiment could not be read. Refresh to retry.")); return; }
  const title = el("h3", null, experiment.title); title.id = "experiment-title"; title.tabIndex = -1; root.appendChild(title);
  root.appendChild(el("p", null, experiment.action));
  const why = el("details", "insight-evidence"); why.appendChild(el("summary", null, "Original recommendation"));
  why.appendChild(el("p", null, experiment.why)); why.appendChild(el("p", null, experiment.evidence)); root.appendChild(why);
  const other = Object.values(catalog).filter(item => item.id !== experiment.id && item.status === "trying");
  if (other.length) {
    const label = el("label", null, "Other active experiments"), select = el("select");
    select.appendChild(el("option", null, "Choose an experiment"));
    other.forEach(item => { const option = el("option", null, item.title); option.value = item.id; select.appendChild(option); });
    select.addEventListener("change", () => { if (select.value && Object.hasOwn(catalog, select.value)) openExperiment(select.value); });
    label.appendChild(select); root.appendChild(label);
  }
  const baseline = el("div", "experiment-baseline");
  if (experiment.baseline) {
    const metrics = experiment.baseline.metrics;
    baseline.appendChild(el("p", null, "Baseline: the seven days before Start."));
    baseline.appendChild(el("p", null, metricText("input", metrics.input) + " input tokens · " +
      metricText("tokens", metrics.tokens) + " total tokens · " + metrics.requests.value + " recorded calls."));
    const detail = visualInfo("Baseline evidence", [
      experiment.baseline.startAt + " to " + experiment.baseline.endAt + ".",
      experiment.baseline.usageCoverage.message,
      "A different workload or unequal period cannot establish that this experiment helped.",
    ]);
    detail.appendChild(counterDetails(metrics)); baseline.appendChild(detail);
  } else baseline.appendChild(el("p", null, "No baseline was recorded for this older experiment. A review must acknowledge that limitation."));
  root.appendChild(baseline);
  const draft = Object.hasOwn(state.experimentDrafts, experiment.id) ? state.experimentDrafts[experiment.id]
    : { notes:experiment.notes || "", outcome:experiment.outcome || "unassessed" };
  const notesLabel = el("label", null, "What did you try?"), notes = el("textarea");
  notes.id = "experiment-notes"; notes.maxLength = 2000; notes.value = draft.notes;
  notes.setAttribute("aria-label","Experiment notes"); notesLabel.appendChild(notes); root.appendChild(notesLabel);
  const outcomeLabel = el("label", null, "Your assessment"), outcome = el("select");
  outcome.id = "experiment-outcome";
  [["unassessed","Not assessed"],["helped","Helped"],["no-change","No clear change"],["worse","Made it worse"],["inconclusive","Inconclusive"]].forEach(([value,text]) => {
    const option = el("option", null, text); option.value = value; option.selected = value === draft.outcome; outcome.appendChild(option);
  });
  outcome.value = draft.outcome; outcomeLabel.appendChild(outcome); root.appendChild(outcomeLabel);
  const status = el("p", "panel-note"); status.id = "experiment-save-status"; status.setAttribute("role","status"); root.appendChild(status);
  if (Object.hasOwn(state.experimentDrafts, experiment.id)) status.textContent = "Unsaved changes";
  else if (experiment.notes || experiment.outcome !== "unassessed") status.textContent = "Saved. Your assessment is self-reported.";
  function remember() { state.experimentDrafts[experiment.id] = { notes:notes.value, outcome:outcome.value }; status.textContent = "Unsaved changes"; }
  notes.addEventListener("input", remember); outcome.addEventListener("change", remember);
  const error = el("p", "rec-error"); error.id = "experiment-error"; error.hidden = true; error.setAttribute("role","alert"); root.appendChild(error);
  const controls = el("div", "experiment-controls");
  async function saveNotes() {
    const updated = await api("/experiment", { method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ id:experiment.id, update:{ notes:notes.value, outcome:outcome.value } }) });
    state.insights.experiments[experiment.id] = updated;
    delete state.experimentDrafts[experiment.id];
    status.textContent = "Saved. Your assessment is self-reported.";
  }
  const save = el("button", "brief-btn", "Save notes"); save.type = "button";
  save.addEventListener("click", async () => {
    save.disabled = true; error.hidden = true;
    try { await saveNotes(); } catch (failure) { error.textContent = failure.message; error.hidden = false; }
    finally { save.disabled = false; }
  });
  controls.appendChild(save);
  const review = el("button", "primary-action", "Review with Copilot"); review.type = "button"; review.id = "review-experiment";
  review.disabled = coachBusy();
  review.addEventListener("click", async () => {
    if (coachBusy()) return;
    state.reviewingExperiment = true; error.hidden = true;
    syncCoachControls();
    root.querySelectorAll("button").forEach(button => button.disabled = true);
    notes.disabled = true; outcome.disabled = true; review.textContent = "Reviewing...";
    status.textContent = "Saving notes, then analyzing this experiment...";
    try {
      await saveNotes();
      const result = await api("/experiment-review", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id:experiment.id }) });
      state.insights.experiments[experiment.id] = result.experiment;
      pushChat(result.date, result.asked, result.answer);
      renderHistory(state.insights);
    } catch (failure) { error.textContent = failure.message; error.hidden = false; }
    finally {
      state.reviewingExperiment = false;
      root.querySelectorAll("button").forEach(button => button.disabled = false);
      notes.disabled = false; outcome.disabled = false;
      status.textContent = error.hidden ? "Review saved. No status was changed automatically." : "The review did not finish; your draft remains here.";
      if (error.hidden) renderActiveExperiment();
      syncCoachControls();
    }
  });
  controls.appendChild(review);
  const mark = el("button", "brief-btn", experiment.status === "done" ? "Reset" : "Done"); mark.type = "button";
  mark.addEventListener("click", async () => {
    mark.disabled = true; error.hidden = true;
    try {
      await saveNotes();
      const updated = await api("/recommendation-status", { method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ date:experiment.sourceDate, recommendationId:experiment.id, status:experiment.status === "done" ? "new" : "done" }) });
      applyExperiment(updated.experiment); syncExperimentCards(experiment.id);
      renderFollowThrough(state.insights); renderActiveExperiment();
    } catch (failure) { error.textContent = failure.message; error.hidden = false; mark.disabled = false; }
  });
  controls.appendChild(mark);
  const close = el("button", "brief-btn", "Close"); close.type = "button";
  close.addEventListener("click", () => { state.activeExperiment = null; renderActiveExperiment(); });
  controls.appendChild(close); root.appendChild(controls);
  root.appendChild(el("p", "panel-note", "Optional review uses your notes, recorded usage and relevant session history. It consumes model usage."));
  if (experiment.review) {
    root.appendChild(el("h4", null, "Latest experiment review"));
    root.appendChild(answerContent(experiment.review.text));
    root.appendChild(el("p", "panel-note", "Saved " + new Date(experiment.review.at).toLocaleString("en-US", { timeZone:state.timeZone })));
  }
}
function pushChat(date, ...messages) {
  if (!state.insights.chats) state.insights.chats = {};
  const existing = state.insights.chats[date] || [];
  const ids = new Set(existing.map(message => message.id).filter(Boolean));
  state.insights.chats[date] = existing.concat(messages.filter(message => message && (!message.id || !ids.has(message.id))));
}
`;

export const INSIGHT_INTERACTIONS = String.raw`
["usage","insights"].forEach(view => $("#" + view + "-tab").addEventListener("click", () => setCoachExpanded(view === "insights")));
$("#reset-composer").addEventListener("click", () => {
  state.composerHeight = null; state.lastComposerHeight = null;
  persistPreferences({ composerHeight:null }); resizeQuestion();
});
window.addEventListener("pointerup", () => { if ($("#ask").getClientRects().length) resizeQuestion(); });
$("#view-nav").addEventListener("keydown", event => {
  let view;
  if (event.key === "ArrowLeft" || event.key === "Home") view = "usage";
  else if (event.key === "ArrowRight" || event.key === "End") view = "insights";
  else return;
  event.preventDefault(); setCoachExpanded(view === "insights"); $("#" + view + "-tab").focus();
});
const suggestion = el("button", null, "Where are my tokens going?");
suggestion.type = "button"; $("#suggest").appendChild(suggestion);
suggestion.addEventListener("click", () => {
  if (coachBusy()) return;
  $("#ask").value = suggestion.textContent; $("#ask").setCustomValidity(""); resizeQuestion(); $("#ask").focus();
});
$("#ask").addEventListener("input", () => { $("#ask").setCustomValidity(""); resizeQuestion(); });
$("#ask").addEventListener("keydown", event => {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !event.isComposing) {
    event.preventDefault(); $("#composer").requestSubmit();
  }
});
window.addEventListener("resize", resizeQuestion);
$("#ask-retry").addEventListener("click", () => $("#composer").requestSubmit());
$("#refresh-question-scope").addEventListener("click", async () => {
  const scope = state.askScope;
  if (!scope) return;
  await load(state.range);
  if (!state.data) return;
  state.askScope = { ...scope, snapshotId:state.data.snapshot.id };
  state.askScopeDetails = { range:state.data.range, asOf:state.data.snapshot.asOf };
  renderAskScope(); $("#question-error").hidden = true; $("#ask").focus();
});
$("#composer").addEventListener("submit", async event => {
  event.preventDefault();
  if (coachBusy()) return;
  const field = $("#ask"), question = field.value.trim();
  field.setCustomValidity(question ? "" : "Write a question first.");
  if (!field.reportValidity()) return;
  state.asking = true;
  syncCoachControls();
  $("#question-error").hidden = true;
  $("#latest-answer").hidden = true;
  $("#question-status").textContent = "Analyzing your usage and session history...";
  $("#question-status").hidden = false;
  try {
    const data = await api("/ask", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, ...(state.askScope ? { scope:state.askScope } : {}) }) });
    if (!data.answer || typeof data.answer.text !== "string" || !data.answer.text.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) throw new Error(data.error || "No complete saved answer was returned. Retry when your Copilot session is idle.");
    pushChat(data.date, data.asked, data.answer);
    state.showLatestAnswer = true;
    renderLatestAnswer(state.insights); renderHistory(state.insights);
    field.value = "";
  } catch (error) {
    $("#question-error-copy").textContent = error.message;
    $("#refresh-question-scope").hidden = !state.askScope;
    $("#question-error").hidden = false;
  } finally {
    state.asking = false;
    $("#question-status").hidden = true;
    $("#latest-answer").hidden = false;
    syncCoachControls();
    resizeQuestion();
    if (state.coachExpanded) field.focus();
  }
});
$("#generate").addEventListener("click", async () => {
  if (coachBusy()) return;
  state.generating = true;
  syncCoachControls();
  $("#coach-error").hidden = true;
  try {
    await api("/generate-brief", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    await refreshSavedInsights();
  } catch (error) {
    $("#coach-error").textContent = error.message; $("#coach-error").hidden = false;
  } finally {
    state.generating = false;
    syncCoachControls();
  }
});
connectCoachUpdates();
`;
