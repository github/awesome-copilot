// renderer.mjs — Single-page cockpit UI served by each instance's loopback server.
// The client script is authored as a real function (clientMain) and serialized to
// a string at render time, so its own template literals / ${} are NOT evaluated by
// this module's template literal. Only CSS and a boot blob are interpolated.

const CSS = `
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--background-color-default, #ffffff);
  color: var(--text-color-default, #1f2328);
  font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
  font-size: var(--text-body-medium, 14px);
  line-height: var(--leading-body-medium, 20px);
}
a { color: var(--true-color-blue, #0969da); }
.muted { color: var(--text-color-muted, #656d76); }
header.top {
  position: sticky; top: 0; z-index: 5;
  background: var(--background-color-default, #fff);
  border-bottom: 1px solid var(--border-color-default, #d0d7de);
  padding: 14px 18px 0;
}
.title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
h1 {
  font-size: var(--text-title-medium, 18px);
  font-weight: var(--font-weight-semibold, 600);
  margin: 0; letter-spacing: .2px;
}
.spacer { flex: 1; }
.repo { font-family: var(--font-mono, monospace); font-size: 12px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 12px; }
.chip {
  display: inline-flex; align-items: center; gap: 5px;
  border: 1px solid var(--border-color-default, #d0d7de);
  border-radius: 999px; padding: 3px 10px; font-size: 12px;
  background: var(--background-color-muted, #f6f8fa);
}
.chip b { font-weight: 600; }
.badge { border-radius: 999px; padding: 2px 9px; font-size: 11px; font-weight: 600; border: 1px solid transparent; white-space: nowrap; }
.b-green { color: #fff; background: var(--true-color-green, #1a7f37); }
.b-amber { color: #fff; background: var(--true-color-orange, #9a6700); }
.b-red   { color: #fff; background: var(--true-color-red, #cf222e); }
.b-gray  { color: var(--text-color-default,#1f2328); background: var(--background-color-muted,#eaeef2); border-color: var(--border-color-default,#d0d7de); }
.b-blue  { color: #fff; background: var(--true-color-blue, #0969da); }
nav.tabs { display: flex; gap: 2px; margin-top: 6px; flex-wrap: wrap; }
nav.tabs button {
  background: none; border: none; border-bottom: 2px solid transparent;
  padding: 8px 12px; font-size: 13px; cursor: pointer; color: var(--text-color-muted,#656d76);
  font-family: inherit;
}
nav.tabs button.active { color: var(--text-color-default,#1f2328); border-bottom-color: var(--true-color-blue,#0969da); font-weight: 600; }
nav.tabs button:hover { color: var(--text-color-default,#1f2328); border-bottom-color: var(--border-color-default,#d0d7de); }
nav.tabs button.active:hover { border-bottom-color: var(--true-color-blue,#0969da); }
nav.tabs button:focus-visible { outline: 2px solid var(--color-focus-outline, var(--true-color-blue,#0969da)); outline-offset: -2px; border-radius: 4px; }
nav.tabs button .count { font-size: 11px; color: var(--text-color-muted,#656d76); }
main { padding: 16px 18px 40px; max-width: 980px; }
.card {
  border: 1px solid var(--border-color-default, #d0d7de);
  border-radius: 10px; padding: 14px 16px; margin-bottom: 12px;
  background: var(--background-color-default, #fff);
}
.card h2 { font-size: 14px; margin: 0 0 10px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.card.relevant { border-color: var(--true-color-blue, #0969da); box-shadow: 0 0 0 1px var(--true-color-blue-muted, rgba(9,105,218,.25)); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px,1fr)); gap: 10px; }
.kv { display: flex; flex-direction: column; gap: 2px; }
.kv .k { font-size: 11px; text-transform: uppercase; letter-spacing: .4px; color: var(--text-color-muted,#656d76); }
.kv .v { font-size: 14px; font-weight: 600; }
button.btn {
  font-family: inherit; font-size: 12.5px; cursor: pointer;
  border: 1px solid var(--border-color-default, #d0d7de);
  background: var(--background-color-muted, #f6f8fa);
  color: var(--text-color-default, #1f2328);
  border-radius: 7px; padding: 6px 12px;
}
button.btn:not(.primary):not(:disabled):hover {
  background: var(--background-color-muted, #eaeef2);
  border-color: var(--border-color-muted, #afb8c1);
  box-shadow: inset 0 0 0 999px rgba(140,149,159,.14);
}
button.btn.primary { background: var(--true-color-blue, #0969da); color: #fff; border-color: transparent; }
button.btn.primary:not(:disabled):hover { filter: brightness(1.08); box-shadow: 0 1px 2px rgba(31,35,40,.18); }
button.btn:focus-visible { outline: 2px solid var(--color-focus-outline, var(--true-color-blue, #0969da)); outline-offset: 1px; }
button.btn:disabled { opacity: .55; cursor: default; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
.progress { height: 8px; border-radius: 999px; background: var(--background-color-muted,#eaeef2); overflow: hidden; }
.progress > span { display: block; height: 100%; background: var(--true-color-green,#1a7f37); }
ul.steps { list-style: none; margin: 0; padding: 0; }
ul.steps li { display: flex; align-items: flex-start; gap: 9px; padding: 6px 0; border-bottom: 1px solid var(--border-color-muted, #eaeef2); }
ul.steps li:last-child { border-bottom: none; }
.dot { width: 16px; height: 16px; border-radius: 50%; flex: 0 0 auto; margin-top: 2px; border: 2px solid; }
.dot.done { background: var(--true-color-green,#1a7f37); border-color: var(--true-color-green,#1a7f37); }
.dot.in_progress { background: var(--true-color-orange,#9a6700); border-color: var(--true-color-orange,#9a6700); }
.dot.failed { background: var(--true-color-red,#cf222e); border-color: var(--true-color-red,#cf222e); }
.dot.pending { background: transparent; border-color: var(--border-color-default,#8c959f); }
.task { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border-color-muted,#eaeef2); }
.task:last-child { border-bottom: none; }
.task .body { flex: 1; }
.task .name { font-weight: 600; font-size: 13px; }
.task .sum { font-size: 12.5px; color: var(--text-color-muted,#656d76); margin-top: 2px; }
.cat { font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: var(--text-color-muted,#656d76); margin: 14px 0 4px; font-weight: 600; }
.empty { text-align: center; padding: 26px 16px; color: var(--text-color-muted,#656d76); }
.empty .big { font-size: 15px; color: var(--text-color-default,#1f2328); margin-bottom: 6px; font-weight: 600; }
.toast {
  position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%);
  background: var(--true-color-blue,#0969da); color: #fff; padding: 9px 16px;
  border-radius: 8px; font-size: 13px; opacity: 0; transition: opacity .2s; pointer-events: none; z-index: 20;
  max-width: 90%;
}
.toast.show { opacity: 1; }
.banner { background: var(--true-color-blue-muted, #ddf4ff); border: 1px solid var(--true-color-blue,#0969da); color: var(--text-color-default,#1f2328); padding: 8px 12px; border-radius: 8px; font-size: 12.5px; margin-bottom: 12px; display: flex; gap: 8px; align-items: center; }
.md { font-size: 13px; line-height: 1.55; }
.md h1,.md h2,.md h3 { font-size: 15px; margin: 14px 0 6px; }
.md code { font-family: var(--font-mono,monospace); background: var(--background-color-muted,#f6f8fa); padding: 1px 4px; border-radius: 4px; font-size: 12px; }
.md ul { padding-left: 20px; }
.spin { width:13px; height:13px; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; display:inline-block; animation: sp .7s linear infinite; }
@keyframes sp { to { transform: rotate(360deg); } }

/* journey stepper */
.stepper { display: flex; align-items: center; flex-wrap: wrap; gap: 2px; }
.stepper .step { display: flex; align-items: center; gap: 7px; }
.stepper .ix { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--border-color-default,#8c959f); color: var(--text-color-muted,#656d76); display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; flex: 0 0 auto; }
.stepper .lbl { font-size: 12.5px; color: var(--text-color-muted,#656d76); }
.stepper .step.done .ix { background: var(--true-color-green,#1a7f37); border-color: var(--true-color-green,#1a7f37); color: #fff; }
.stepper .step.done .lbl { color: var(--text-color-default,#1f2328); }
.stepper .step.current .ix { border-color: var(--true-color-blue,#0969da); color: var(--true-color-blue,#0969da); }
.stepper .step.current .lbl { color: var(--text-color-default,#1f2328); font-weight: 600; }
.stepper .bar { width: 24px; height: 2px; background: var(--border-color-default,#d0d7de); margin: 0 5px; flex: 0 0 auto; }
.stepper .bar.done { background: var(--true-color-green,#1a7f37); }

/* hero next-step */
.hero { border: 1px solid var(--true-color-blue,#0969da); background: var(--true-color-blue-muted,#ddf4ff); border-radius: 10px; padding: 14px 16px; margin-bottom: 12px; }
.hero .eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: .5px; font-weight: 700; color: var(--true-color-blue,#0969da); }
.hero .htitle { font-size: 16px; font-weight: 700; margin: 3px 0 4px; }
.hero .hbody { font-size: 13px; color: var(--text-color-default,#1f2328); margin: 0 0 10px; }

/* findings */
.sevrow { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.finding { border: 1px solid var(--border-color-default,#d0d7de); border-left-width: 4px; border-radius: 8px; padding: 11px 13px; margin-bottom: 9px; }
.finding.sev-P0 { border-left-color: var(--true-color-red,#cf222e); }
.finding.sev-P1 { border-left-color: var(--true-color-orange,#9a6700); }
.finding.sev-P2 { border-left-color: var(--true-color-blue,#0969da); }
.finding.sev-P3 { border-left-color: var(--border-color-default,#8c959f); }
.finding .ftitle { font-weight: 600; font-size: 13.5px; display: flex; align-items: center; gap: 8px; }
.finding .fdetail { font-size: 12.5px; color: var(--text-color-default,#1f2328); margin: 6px 0 0; }
.finding .ffiles { font-size: 11.5px; color: var(--text-color-muted,#656d76); margin-top: 7px; display: flex; flex-wrap: wrap; gap: 4px; }
.finding .ffiles code { font-family: var(--font-mono,monospace); background: var(--background-color-muted,#f6f8fa); padding: 1px 5px; border-radius: 4px; word-break: break-all; }

/* plan & progress steps */
.legend { display: flex; gap: 16px; margin-top: 11px; font-size: 11.5px; color: var(--text-color-muted,#656d76); }
.legend > span { display: inline-flex; align-items: center; }
.legend .dot { width: 12px; height: 12px; margin: 0 5px 0 0; }
ul.steps li { align-items: center; }
ul.steps li .stext { flex: 1; }
ul.steps li .srhs { flex: 0 0 auto; margin-left: 10px; }
.smuted { font-size: 11.5px; color: var(--text-color-muted,#656d76); white-space: nowrap; }
ul.steps li.locked .stext { opacity: .55; }
ul.steps li.locked .dot { opacity: .5; }
.card.locked { border-style: dashed; }
.card.locked > h2 { color: var(--text-color-muted,#656d76); }
.finding.locked { opacity: .72; }
.finding.locked .ftitle { opacity: .8; }
/* environment doctor / readiness checks */
ul.checks { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 9px; }
ul.checks li { display: flex; gap: 10px; align-items: flex-start; }
ul.checks .ci { width: 18px; height: 18px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex: 0 0 auto; margin-top: 1px; }
.chk.ok .ci { background: rgba(26,127,55,.15); color: var(--true-color-green,#1a7f37); }
.chk.warn .ci { background: rgba(154,103,0,.18); color: #9a6700; }
.chk.fail .ci { background: rgba(207,34,46,.15); color: var(--true-color-red,#cf222e); }
.chk.info .ci { background: var(--background-color-muted,#eaeef2); color: var(--text-color-muted,#656d76); }
ul.checks .cbody { display: flex; flex-direction: column; gap: 1px; flex: 1 1 auto; min-width: 0; }
ul.checks .clabel { font-weight: 600; }
ul.checks .cdetail { font-size: 12px; color: var(--text-color-muted,#656d76); }
ul.checks .cfix { font-size: 12px; color: #9a6700; margin-top: 2px; }
ul.checks .crhs { flex: 0 0 auto; }
.chk.fail .clabel { color: var(--true-color-red,#cf222e); }
.banner-red { border-color: var(--true-color-red,#cf222e); background: rgba(207,34,46,.08); }
nav.tabs button .count.c-red { color: var(--true-color-red,#cf222e); font-weight: 700; }
nav.tabs button .count.c-amber { color: #9a6700; font-weight: 700; }
.lockwhy { margin-right: 8px; }
/* recommended-approach guide */
.card.guide { background: var(--background-color-muted, #f6f8fa); }
.flow { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.flow .fstep { font-size: 12px; padding: 3px 9px; border-radius: 999px; border: 1px solid var(--border-color-default,#d0d7de); background: var(--background-color-default,#fff); color: var(--text-color-muted,#656d76); }
.flow .fstep.on { border-color: var(--true-color-blue,#0969da); color: var(--true-color-blue,#0969da); font-weight: 600; }
.flow .fstep.past { color: var(--true-color-green,#1a7f37); border-color: var(--true-color-green,#1a7f37); }
.flow .farrow { color: var(--text-color-muted,#8c959f); font-size: 12px; }
/* autopilot */
.banner-auto { border-color: var(--true-color-blue,#0969da); background: var(--true-color-blue-muted,#ddf4ff); align-items: center; }
.card.autopilot { border-color: var(--true-color-blue,#0969da); }
.badge.b-blue { background: var(--true-color-blue-muted,#ddf4ff); color: var(--true-color-blue,#0969da); }
.apc { font-size: 11.5px; color: var(--text-color-muted,#656d76); margin-left: 6px; }
ul.aplog { list-style: none; margin: 8px 0 12px; padding: 8px 12px; border: 1px solid var(--border-color-default,#d0d7de); border-radius: 8px; background: var(--background-color-muted,#f6f8fa); display: flex; flex-direction: column; gap: 4px; font-size: 12.5px; }
ul.aplog li { display: block; }
.apok { color: var(--true-color-green,#1a7f37); font-weight: 700; }
.apno { color: var(--true-color-red,#cf222e); font-weight: 700; }
`;

function clientMain() {
    const boot = window.__APPMOD__ || {};
    // The host embeds a per-instance token in the iframe URL; echo it back on every
    // request so the loopback server accepts us. Empty in unit harnesses (no guard).
    const apiToken = boot.token || "";
    const tokenQuery = apiToken ? "?token=" + encodeURIComponent(apiToken) : "";
    let state = null;
    let activeTab = boot.initialTab || "overview";
    let pending = null;
    let autopilotRunning = false;

    const $ = (sel) => document.querySelector(sel);
    const esc = (s) =>
        String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
            ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
        );

    function toast(msg) {
        const t = $("#toast");
        t.textContent = msg;
        t.classList.add("show");
        clearTimeout(toast._t);
        toast._t = setTimeout(() => t.classList.remove("show"), 2600);
    }

    function statusBadge(status) {
        const map = {
            completed: ["b-green", "Completed"],
            in_progress: ["b-amber", "In progress"],
            not_started: ["b-gray", "Not started"],
            done: ["b-green", "Done"],
            pending: ["b-gray", "Pending"],
            failed: ["b-red", "Failed"],
            not_run: ["b-gray", "Not run"],
            pass: ["b-green", "Pass"],
        };
        const [cls, label] = map[status] || ["b-gray", status || "—"];
        return '<span class="badge ' + cls + '">' + esc(label) + "</span>";
    }

    function btn(label, kind, payload, opts) {
        opts = opts || {};
        const cls = "btn" + (opts.primary ? " primary" : "");
        // While Autopilot runs, freeze manual actions so a stray click can't inject
        // a competing prompt into the same session — except Stop and tab navigation.
        const frozen = autopilotRunning && kind !== "autopilot_stop" && kind !== "autopilot_dismiss" && String(kind).indexOf("goto:") !== 0;
        const dis = pending || frozen ? " disabled" : "";
        return (
            '<button class="' + cls + '" data-kind="' + esc(kind) + '" data-payload="' +
            esc(JSON.stringify(payload || {})) + '"' + dis + ">" + esc(label) + "</button>"
        );
    }

    // ---- tab renderers -------------------------------------------------------

    function overviewTab(s) {
        let html = "";

        // Environment readiness nudge — surfaces a blocker before the user starts.
        const d = s.doctor;
        if (d && d.overall === "blocked") {
            html += '<div class="banner banner-red">⚠ Your environment isn\'t ready — a required tool is missing. ' + btn("Open Readiness →", "goto:readiness") + "</div>";
        } else if (d && d.overall === "caution") {
            html += '<div class="banner">Some environment items need a look before you go further. ' + btn("Open Readiness →", "goto:readiness") + "</div>";
        }

        // Journey stepper — always shows where you are in the workflow.
        html += '<div class="card"><h2>Your modernization journey</h2>' + journeyHtml(s) + "</div>";

        // One adaptive "do this next" hero so the next click is never ambiguous.
        const hero = heroNext(s);
        html +=
            '<div class="hero"><div class="eyebrow">' + esc(hero.eyebrow) + "</div>" +
            '<div class="htitle">' + esc(hero.title) + "</div>" +
            '<div class="hbody">' + hero.body + "</div>" +
            '<div class="actions">' + hero.actions + "</div></div>";

        // Autopilot nudge — once there's a checklist with work left, offer to run it
        // hands-free. Hidden while a run is already active (the strip covers that).
        const planSteps = (s.progress && s.progress.steps.length ? s.progress.steps : (s.plan ? s.plan.steps : [])) || [];
        const pendingSteps = planSteps.filter((x) => x.status !== "done").length;
        const envBlocked = d && d.overall === "blocked";
        if (pendingSteps > 0 && !(s.autopilot && s.autopilot.running)) {
            const cta = envBlocked
                ? btn("Open Readiness →", "goto:readiness")
                : btn("▶ Run on autopilot", "autopilot_start", { scope: "phase" }, { primary: true }) + btn("See in Plan →", "goto:plan");
            html +=
                '<div class="card autopilot"><h2>⚡ Run on autopilot <span class="badge b-blue">beta</span></h2>' +
                '<p class="muted" style="margin:0 0 10px">Instead of clicking each step, let Copilot work the ' + pendingSteps +
                " remaining step(s) in order and update this dashboard live. It pauses at the end of the phase and does not commit.</p>" +
                '<div class="actions">' + cta + "</div></div>";
        }

        // Findings snapshot (only once an assessment has been run).
        const rep = s.report;
        if (rep && rep.findings && rep.findings.length) {
            const by = sevCounts(rep.findings);
            html += '<div class="card"><h2>Assessment findings <span class="spacer"></span>' + btn("Open Assessment →", "goto:assessment") + "</h2>";
            if (rep.summary) html += '<p class="muted" style="margin:0 0 10px">' + esc(rep.summary) + "</p>";
            html += '<div class="sevrow">' + sevChip("P0", by.P0) + sevChip("P1", by.P1) + sevChip("P2", by.P2) + sevChip("P3", by.P3) + "</div></div>";
        }

        // Stack facts.
        const a = s.assessment || {};
        const jv = a.javaVersion ? "Java " + a.javaVersion : "Java (unknown)";
        html +=
            '<div class="card"><h2>Stack</h2><div class="grid">' +
            kv("Build tool", a.buildTool || "—") +
            kv("Java version", esc(jv)) +
            kv("Spring Boot", a.springBoot ? "Yes" + (a.springVersion ? " " + esc(a.springVersion) : "") : "No") +
            kv("Container", a.hasDockerfile ? "Dockerfile ✓" : "None") +
            kv("Git branch", s.git && s.git.branch ? esc(s.git.branch) : "—") +
            kv("Working tree", s.git ? (s.git.dirty ? s.git.changedFiles + " changed" : "clean") : "—") +
            "</div></div>";

        const rel = (s.tasks || []).filter((t) => t.relevant);
        if (rel.length) {
            html += '<div class="card relevant"><h2>Detected in this repo <span class="badge b-blue">' + rel.length + "</span></h2>";
            rel.forEach((t) => (html += taskRow(t)));
            html += "</div>";
        }
        return html;
    }

    function assessmentTab(s) {
        const rep = s.report;
        if (!rep || !(rep.findings && rep.findings.length)) {
            return emptyState(
                "No assessment yet",
                "Run an assessment to scan this repo for its Java runtime, dependencies, vulnerabilities, and Azure cloud-readiness gaps. Findings land here as a prioritized, clickable checklist — nothing in your code changes.",
                btn("Run assessment", "start_assessment", {}, { primary: true })
            );
        }
        const by = sevCounts(rep.findings);
        let html = '<div class="card"><h2>Assessment results';
        if (rep.generatedAt) html += ' <span class="muted" style="font-weight:400">' + esc(fmtDate(rep.generatedAt)) + "</span>";
        html += '<span class="spacer"></span>' + btn("Re-run", "start_assessment") + "</h2>";
        if (rep.headline) html += '<p style="margin:0 0 6px;font-weight:600">' + esc(rep.headline) + "</p>";
        if (rep.summary) html += '<p class="muted" style="margin:0 0 10px">' + esc(rep.summary) + "</p>";
        if (rep.stack) {
            const st = rep.stack;
            html += '<div class="grid" style="margin-bottom:10px">' +
                (st.buildTool ? kv("Build", esc(st.buildTool)) : "") +
                (st.java ? kv("Java", esc(st.java)) : "") +
                (st.framework ? kv("Framework", esc(st.framework)) : "") +
                (st.database ? kv("Database", esc(st.database)) : "") +
                (st.container ? kv("Container", esc(st.container)) : "") +
                "</div>";
        }
        html += '<div class="sevrow">' + sevChip("P0", by.P0) + sevChip("P1", by.P1) + sevChip("P2", by.P2) + sevChip("P3", by.P3) + "</div></div>";

        ["P0", "P1", "P2", "P3"].forEach((sev) => {
            const items = rep.findings.filter((x) => x.severity === sev);
            if (!items.length) return;
            html += '<div class="cat">' + esc(sevName(sev)) + "</div>";
            items.forEach((x) => (html += findingCard(x, s.ordering)));
        });

        if (rep.strengths && rep.strengths.length) {
            html += '<div class="card"><h2>Already done well <span class="badge b-green">' + rep.strengths.length + "</span></h2><ul class=\"steps\">";
            rep.strengths.forEach((x) => (html += '<li><span class="dot done"></span><span>' + esc(x) + "</span></li>"));
            html += "</ul></div>";
        }
        return html;
    }

    // ---- assessment helpers --------------------------------------------------

    function journeyHtml(s) {
        const labels = ["Assess", "Remediate", "Validate", "Ship"];
        const hasPlan = !!((s.report && s.report.findings) || (s.plan && s.plan.exists) || (s.progress && s.progress.exists));
        const gates = s.gates || {};
        const anyGate = Object.keys(gates).some((k) => gates[k] && gates[k] !== "not_run");
        const done = s.status === "completed";
        let cur;
        if (done) cur = 4;
        else if (anyGate) cur = 2;
        else if (hasPlan) cur = 1;
        else cur = 0;
        let h = '<div class="stepper">';
        labels.forEach((label, i) => {
            if (i > 0) h += '<span class="bar' + (i <= cur ? " done" : "") + '"></span>';
            const cls = i < cur ? "done" : i === cur ? "current" : "";
            const mark = i < cur ? "✓" : String(i + 1);
            h += '<div class="step ' + cls + '"><span class="ix">' + mark + '</span><span class="lbl">' + esc(label) + "</span></div>";
        });
        return h + "</div>";
    }

    function heroNext(s) {
        const rep = s.report;
        const findings = rep && rep.findings ? rep.findings : [];
        const hasReport = findings.length > 0;
        const p0 = findings.filter((f) => f.severity === "P0");
        const p1 = findings.filter((f) => f.severity === "P1");
        const gates = s.gates || {};
        const anyGate = Object.keys(gates).some((k) => gates[k] && gates[k] !== "not_run");
        const hasPlan = !!((s.plan && s.plan.exists) || (s.progress && s.progress.exists));

        if (s.status === "completed") {
            return {
                eyebrow: "Final step",
                title: "Ship your changes",
                body: "Validations are complete. Open a pull request to hand off the modernized service.",
                actions: btn("Open a pull request", "open_pr", {}, { primary: true }) + btn("View summary", "goto:summary"),
            };
        }
        if (!hasReport && !hasPlan) {
            return {
                eyebrow: "Start here",
                title: "Assess the project",
                body: "Scan the repo for its Java runtime, dependencies, known CVEs, and Azure cloud-readiness gaps. Nothing changes in your code — you get a prioritized list of findings to work through.",
                actions: btn("Run assessment", "start_assessment", {}, { primary: true }),
            };
        }
        if (p0.length) {
            return {
                eyebrow: "Blocker — fix this first",
                title: p0[0].title,
                body: esc(p0[0].detail || "A P0 issue is blocking modernization. Resolve it before moving on."),
                actions: heroAction(p0[0]) + btn("See all findings", "goto:assessment"),
            };
        }
        if (hasReport && !anyGate) {
            if (p1.length) {
                return {
                    eyebrow: "Recommended next",
                    title: "Start remediation: " + p1[0].title,
                    body: esc(p1[0].detail || "Work through the high-priority findings first."),
                    actions: heroAction(p1[0]) + btn("See all findings", "goto:assessment"),
                };
            }
            return {
                eyebrow: "Recommended next",
                title: "Work through the findings",
                body: "Open the Assessment tab and resolve findings by priority. Each one has a button that hands the fix to the agent.",
                actions: btn("Open Assessment", "goto:assessment", {}, { primary: true }),
            };
        }
        return {
            eyebrow: "Recommended next",
            title: "Validate your changes",
            body: "Build the project, run unit tests, and re-check CVEs to confirm the migration holds.",
            actions: btn("Build & run tests", "run_build_tests", {}, { primary: true }) + btn("Open Validation", "goto:validation"),
        };
    }

    function heroAction(f) {
        const act = f.action;
        if (act && act.kind && act.kind !== "fix_finding") {
            return btn(act.label || "Run this step", act.kind, act.payload || {}, { primary: true });
        }
        return btn((act && act.label) || "Help me fix this", "fix_finding", findingCtx(f), { primary: true });
    }

    function findingCard(x, ord) {
        const locked = isFindingLocked(x, ord);
        let h = '<div class="finding sev-' + esc(x.severity || "P3") + (locked ? " locked" : "") + '">';
        h += '<div class="ftitle"><span class="badge ' + sevBadgeClass(x.severity) + '">' + esc(x.severity || "—") + "</span>" + esc(x.title) + "</div>";
        if (x.detail) h += '<div class="fdetail">' + esc(x.detail) + "</div>";
        if (x.files && x.files.length) {
            h += '<div class="ffiles">' + x.files.map((p) => "<code>" + esc(p) + "</code>").join("") + "</div>";
        }
        h += '<div class="actions">' + findingActions(x, ord) + "</div>";
        return h + "</div>";
    }

    function sevRank(sev) {
        const m = { P0: 1, P1: 2, P2: 3, P3: 4 };
        return m[sev] != null ? m[sev] : null;
    }
    function isFindingLocked(x, ord) {
        if (!ord || ord.activeRank == null) return false;
        const r = sevRank(x.severity);
        return r != null && r > ord.activeRank;
    }

    function findingActions(x, ord) {
        const act = x.action;
        if (isFindingLocked(x, ord)) {
            const why = '<span class="smuted lockwhy">🔒 fix ' + esc(shortPhase(ord.activePhase)) + " issues first</span>";
            if (act && act.kind && act.kind !== "fix_finding") {
                return why + btn(act.label || "Run this step", act.kind, act.payload || {}) + btn("Help me fix this", "fix_finding", findingCtx(x));
            }
            return why + btn((act && act.label) || "Help me fix this", "fix_finding", findingCtx(x));
        }
        if (act && act.kind && act.kind !== "fix_finding") {
            return btn(act.label || "Run this step", act.kind, act.payload || {}, { primary: true }) + btn("Help me fix this", "fix_finding", findingCtx(x));
        }
        return btn((act && act.label) || "Help me fix this", "fix_finding", findingCtx(x), { primary: true });
    }

    function findingCtx(x) {
        return { title: x.title, detail: x.detail, files: x.files, severity: x.severity };
    }
    function sevCounts(f) {
        const c = { P0: 0, P1: 0, P2: 0, P3: 0 };
        (f || []).forEach((x) => { if (c[x.severity] != null) c[x.severity]++; });
        return c;
    }
    function sevBadgeClass(sev) {
        return { P0: "b-red", P1: "b-amber", P2: "b-blue", P3: "b-gray" }[sev] || "b-gray";
    }
    function sevChip(sev, n) {
        return '<span class="badge ' + sevBadgeClass(sev) + '">' + esc(sev) + " · " + (n || 0) + "</span>";
    }
    function sevName(sev) {
        return { P0: "P0 · Blockers", P1: "P1 · High priority", P2: "P2 · Medium priority", P3: "P3 · Low / platform" }[sev] || sev;
    }
    function fmtDate(iso) {
        try {
            const d = new Date(iso);
            if (isNaN(d.getTime())) return iso;
            return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
        } catch (e) {
            return iso;
        }
    }

    // ---- autopilot -----------------------------------------------------------

    // Live status strip for an Autopilot run, shown above the active tab body.
    function autopilotStrip(s) {
        const a = s && s.autopilot;
        if (!a) return "";
        if (a.running) {
            const scopeLabel = a.scope === "all" ? "all phases" : "this phase";
            const now = a.current
                ? "Working: " + esc(a.current.title) + (a.current.section ? ' <span class="smuted">' + esc(a.current.section) + "</span>" : "")
                : "Selecting the next step…";
            return (
                '<div class="banner banner-auto"><span class="spin"></span>' +
                "<span><b>Autopilot running</b> · " + esc(scopeLabel) + " · " + now +
                ' <span class="apc">' + a.completed.length + " done</span></span>" +
                '<span class="spacer"></span>' +
                btn("■ Stop", "autopilot_stop", {}) +
                "</div>" + autopilotLog(a)
            );
        }
        const labels = {
            completed: "finished — every eligible step is done",
            phase_done: "finished this phase",
            stuck: "paused — a step needs your input",
            cancelled: "stopped",
            capped: "reached its step limit",
            error: "stopped on an error",
        };
        const label = labels[a.status] || "finished";
        const bad = a.status === "error" || a.status === "stuck";
        let note = "Review the changes (nothing was committed), then continue.";
        if (a.stuck) note = "Stuck on: " + esc(a.stuck) + ". Open it in Plan &amp; Progress to finish it yourself, then resume.";
        if (a.error) note = esc(a.error);
        const more =
            btn("▶ Continue (next phase)", "autopilot_start", { scope: "phase" }, { primary: true }) +
            btn("Dismiss", "autopilot_dismiss", {});
        return (
            '<div class="banner ' + (bad ? "banner-red" : "banner-auto") + '">' +
            "<span><b>Autopilot " + esc(label) + ".</b> Completed " + a.completed.length + " step(s). " + note + "</span>" +
            '<span class="spacer"></span>' + more +
            "</div>" + autopilotLog(a)
        );
    }

    function autopilotLog(a) {
        if (!a || !a.completed || !a.completed.length) return "";
        let h = '<ul class="aplog">';
        a.completed.forEach((c) => {
            h +=
                "<li>" + (c.done ? '<span class="apok">✓</span>' : '<span class="apno">•</span>') +
                " " + esc(c.title) +
                (c.section ? ' <span class="smuted">' + esc(c.section) + "</span>" : "") +
                (c.error ? ' <span class="apno">' + esc(c.error) + "</span>" : "") +
                "</li>";
        });
        return h + "</ul>";
    }

    // Autopilot launch card on the Plan tab.
    function autopilotCard(s) {
        const running = !!(s.autopilot && s.autopilot.running);
        const blocked = s.doctor && s.doctor.overall === "blocked";
        let body =
            '<p class="muted" style="margin:0 0 10px">Let Copilot work the checklist for you. Autopilot runs each eligible step <b>in order</b>, ' +
            "updates <code>progress.md</code>, and streams results here live. It pauses at the end of the phase, stops if a step needs a decision, " +
            "and <b>does not commit</b> — so you stay in control and can review the diff.</p>";
        let actions;
        if (running) {
            actions = btn("■ Stop autopilot", "autopilot_stop", {});
        } else if (blocked) {
            actions = '<span class="smuted">Environment is not ready. </span>' + btn("Open Readiness →", "goto:readiness");
        } else {
            actions =
                btn("▶ Run this phase", "autopilot_start", { scope: "phase" }, { primary: true }) +
                btn("Run all phases", "autopilot_start", { scope: "all" });
        }
        return '<div class="card autopilot"><h2>⚡ Autopilot <span class="badge b-blue">beta</span></h2>' + body + '<div class="actions">' + actions + "</div></div>";
    }

    function planTab(s) {
        const usingProgress = !!(s.progress && s.progress.steps.length);
        const steps = (usingProgress ? s.progress.steps : (s.plan ? s.plan.steps : [])) || [];
        if (!steps.length) {
            return emptyState(
                "No plan yet",
                "Run an assessment or generate an upgrade plan. App Modernization writes <code>plan.md</code> and a <code>progress.md</code> checklist, and your steps land here — each unchecked one becomes a button that hands that exact step to the agent.",
                btn("Run assessment", "start_assessment", {}, { primary: true }) + btn("Generate upgrade plan", "generate_plan", { targetJava: 21 })
            );
        }
        const src = usingProgress ? "progress.md" : "plan.md";
        const total = steps.length;
        const done = steps.filter((x) => x.status === "done").length;
        const ord = s.ordering || { activeRank: null, activePhase: null };

        // Intro + overall progress + legend.
        let html = '<div class="card"><h2>Plan &amp; Progress <span class="muted" style="font-weight:400">' + esc(src) + "</span><span class=\"spacer\"></span>" + statusBadge(s.status) + "</h2>";
        html += '<p class="muted" style="margin:0 0 10px">Your live modernization checklist. Each unchecked step has a <b>Work on this</b> button that hands just that step to the agent in this session — it checks the box here when the step is done.</p>';
        html += '<div class="progress"><span style="width:' + (s.percent || 0) + '%"></span></div>';
        html += '<p class="muted" style="margin:6px 0 0">' + done + " of " + total + " steps done · " + (s.percent || 0) + "% complete</p>";
        html += '<div class="legend"><span><span class="dot done"></span>Done</span><span><span class="dot in_progress"></span>In progress</span><span><span class="dot pending"></span>To do</span><span>🔒 Do later</span></div>';
        html += "</div>";

        // Recommended-order guide so users don't work steps out of sequence.
        html += approachGuide(ord);

        // Autopilot: hand the whole phase to the agent instead of clicking each step.
        html += autopilotCard(s);

        // "Continue here" — the recommended next step: first not-done step in the
        // active phase (falls back to the first not-done step overall).
        const next = steps.find((x) => x.status !== "done" && (ord.activeRank == null || x.rank === ord.activeRank)) || steps.find((x) => x.status !== "done");
        if (next) {
            html +=
                '<div class="hero"><div class="eyebrow">Continue here · recommended next step</div>' +
                '<div class="htitle">' + esc(next.title) + "</div>" +
                (next.section ? '<div class="hbody">Phase: ' + esc(next.section) + "</div>" : "") +
                '<div class="actions">' + stepAction(next) + (next.section && /validation|gates/i.test(next.section) ? btn("Open Validation", "goto:validation") : "") + "</div></div>";
        } else {
            html += '<div class="banner">✓ Every step is checked off. Re-run the validation gates, then open a pull request.</div>';
        }

        // Steps grouped by their phase/section.
        const groups = [];
        const idx = {};
        steps.forEach((st) => {
            const key = st.section || "Steps";
            if (idx[key] == null) { idx[key] = groups.length; groups.push({ name: key, items: [], rank: st.rank }); }
            groups[idx[key]].items.push(st);
        });

        groups.forEach((g) => {
            const gdone = g.items.filter((x) => x.status === "done").length;
            const isValidation = /validation|gates/i.test(g.name);
            const gLocked = ord.activeRank != null && g.rank != null && g.rank > ord.activeRank;
            html += '<div class="card' + (gLocked ? " locked" : "") + '"><h2>' + (gLocked ? "🔒 " : "") + esc(g.name) + ' <span class="badge ' + (gdone === g.items.length && g.items.length ? "b-green" : "b-gray") + '">' + gdone + "/" + g.items.length + "</span>";
            if (isValidation) html += '<span class="spacer"></span>' + btn("Open Validation →", "goto:validation");
            else if (gLocked) html += '<span class="spacer"></span><span class="smuted">after ' + esc(shortPhase(ord.activePhase)) + "</span>";
            html += '</h2><ul class="steps">';
            g.items.forEach((st) => {
                const locked = ord.activeRank != null && st.rank != null && st.rank > ord.activeRank;
                html +=
                    '<li' + (locked ? ' class="locked"' : "") + '><span class="dot ' + esc(st.status) + '"></span>' +
                    '<span class="stext">' + esc(st.title) + "</span>" +
                    '<span class="srhs">' + stepRowAction(st, isValidation, locked, ord) + "</span></li>";
            });
            html += "</ul></div>";
        });

        return html;
    }

    function approachGuide(ord) {
        const order = ["Assessment", "P0 Build", "P1 Security", "P2 Runtime", "P3 Observability", "Validate"];
        const activeIdx = ord && ord.activeRank != null ? ord.activeRank : -1;
        const flow = order
            .map((name, i) => '<span class="fstep' + (i === activeIdx ? " on" : i < activeIdx ? " past" : "") + '">' + esc(name) + "</span>")
            .join('<span class="farrow">›</span>');
        let body = "Work top-down and finish each phase before the next — e.g. don't upgrade the Java runtime (P2) while the build is still broken (P0). Steps in later phases are marked 🔒 until the current phase is done; <b>Continue here</b> always points to the safe next step.";
        if (ord && ord.activePhase) body += " You're in <b>" + esc(ord.activePhase) + "</b>.";
        return '<div class="card guide"><h2>Recommended approach</h2><div class="flow">' + flow + "</div><p class=\"muted\" style=\"margin:10px 0 0\">" + body + "</p></div>";
    }
    function shortPhase(name) {
        if (!name) return "the current phase";
        const m = String(name).match(/\bP[0-3]\b/i);
        return m ? m[0].toUpperCase() : name;
    }

    function stepAction(st) {
        const label = st.status === "in_progress" ? "Resume this step" : "Work on this step";
        return btn(label, "work_step", { title: st.title, section: st.section }, { primary: true });
    }
    function stepRowAction(st, isValidation, locked, ord) {
        if (st.status === "done") return '<span class="smuted">✓ Done</span>';
        if (isValidation) return '<span class="smuted">run from Validation →</span>';
        if (locked) {
            return '<span class="smuted lockwhy">🔒 after ' + esc(shortPhase(ord && ord.activePhase)) + "</span>" + btn("Do anyway", "work_step", { title: st.title, section: st.section });
        }
        const label = st.status === "in_progress" ? "Resume" : "Work on this";
        return btn(label, "work_step", { title: st.title, section: st.section });
    }

    function validationTab(s) {
        const gates = s.gates || {};
        const labels = { build: "Build", tests: "Unit Tests", cve: "CVE Check", consistency: "Consistency", completeness: "Completeness" };
        let html = '<div class="card"><h2>Validation gates</h2><div class="grid">';
        Object.keys(labels).forEach((k) => {
            html += '<div class="kv"><span class="k">' + esc(labels[k]) + "</span><span class=v>" + statusBadge(gates[k] || "not_run") + "</span></div>";
        });
        html += "</div></div>";
        html +=
            '<div class="card"><h2>Run validations</h2><div class="actions">' +
            btn("Build & unit tests", "run_build_tests", {}, { primary: true }) +
            btn("Scan CVEs", "run_cve") +
            btn("Generate unit tests", "generate_tests") +
            btn("Consistency check", "run_consistency") +
            btn("Completeness check", "run_completeness") +
            "</div><p class=muted style='margin:10px 0 0'>CVE scan uses <code>#appmod-validate-cves-for-java</code>; test generation uses <code>#appmod-generate-tests-for-java</code>.</p></div>";
        return html;
    }

    function doctorTab(s) {
        const d = s.doctor;
        if (!d) {
            return emptyState(
                "Environment readiness",
                "Check that your machine has the tools the App Modernization workflow needs — a JDK, your build tool, git, and (optionally) Docker and the Azure CLI. This only reads version numbers; nothing is installed or changed.",
                btn("Check my environment", "recheck_env", {}, { primary: true })
            );
        }
        const tone = d.overall === "ready" ? "b-green" : d.overall === "caution" ? "b-amber" : "b-red";
        const head =
            d.overall === "ready" ? "Your environment is ready" :
            d.overall === "caution" ? "Almost ready — a couple of things to check" :
            "Not ready yet — resolve the blockers below";
        const sub =
            d.overall === "ready" ? "All required tools are installed. You're clear to start modernizing." :
            d.overall === "caution" ? "The required tools are present; some optional or recommended items need attention." :
            "One or more required tools are missing. Fix these before building the project or running tasks.";

        const notAssessed = d.groups.some((g) => g.checks.some((c) => c.id === "assessed" && c.status !== "ok"));
        let heroActions = btn("Re-check environment", "recheck_env", {}, { primary: true });
        if (notAssessed) heroActions += btn("Run assessment", "start_assessment", {});

        let html =
            '<div class="hero"><div class="eyebrow">Environment readiness</div>' +
            '<div class="htitle">' + esc(head) + ' <span class="badge ' + tone + '">' + esc(d.overall) + "</span></div>" +
            '<div class="hbody">' + esc(sub) + "</div>" +
            '<div class="actions">' + heroActions + "</div></div>";

        d.groups.forEach((g) => {
            html += '<div class="card"><h2>' + esc(g.name) + "</h2><ul class=\"checks\">";
            g.checks.forEach((c) => {
                html +=
                    '<li class="chk ' + esc(c.status) + '">' +
                    '<span class="ci">' + checkIcon(c.status) + "</span>" +
                    '<span class="cbody"><span class="clabel">' + esc(c.label) + "</span>" +
                    '<span class="cdetail">' + esc(c.detail || "") + "</span>" +
                    (c.fix ? '<span class="cfix">Fix: ' + esc(c.fix) + "</span>" : "") +
                    "</span>" +
                    '<span class="crhs">' + checkAction(c) + "</span></li>";
            });
            html += "</ul></div>";
        });

        html += '<p class="muted" style="margin:2px 2px 0">Probed locally on your machine — version numbers only. Nothing was installed or modified.</p>';
        return html;
    }

    function checkIcon(status) {
        if (status === "ok") return "✓";
        if (status === "warn") return "!";
        if (status === "fail") return "✕";
        return "•";
    }
    function checkAction(c) {
        if (!c.action) return "";
        const opts = c.status === "fail" ? { primary: true } : {};
        return btn(c.action.label || "Fix", c.action.kind, c.action.payload || {}, opts);
    }

    function tasksTab(s) {
        let html = "";
        // Custom skills
        html += '<div class="card"><h2>Custom skills <span class="muted" style="font-weight:400">.github/skills</span></h2>';
        if (!s.skills || !s.skills.length) {
            html += '<p class="muted" style="margin:0 0 10px">No custom skills found. Capture an org-specific migration as a reusable skill.</p>' +
                '<div class="actions">' + btn("Create a custom skill", "create_skill") + "</div>";
        } else {
            s.skills.forEach((sk) => {
                html +=
                    '<div class="task"><div class="body"><div class="name">' + esc(sk.name) + "</div>" +
                    '<div class="sum">' + esc(sk.description || sk.folder) + "</div></div>" +
                    '<div>' + btn("Run", "run_skill", { folder: sk.folder }, { primary: true }) + "</div></div>";
            });
        }
        html += "</div>";

        // Predefined catalog grouped by category, relevant first
        const tasks = (s.tasks || []).slice().sort((a, b) => (b.relevant ? 1 : 0) - (a.relevant ? 1 : 0));
        const cats = {};
        tasks.forEach((t) => {
            (cats[t.category] = cats[t.category] || []).push(t);
        });
        html += '<div class="card"><h2>Microsoft predefined tasks</h2>';
        Object.keys(cats).forEach((cat) => {
            html += '<div class="cat">' + esc(cat) + "</div>";
            cats[cat].forEach((t) => (html += taskRow(t)));
        });
        html += "</div>";
        return html;
    }

    function summaryTab(s) {
        let html = "";
        if (s.summary && s.summary.exists && s.summary.markdown) {
            html += '<div class="card"><h2>summary.md</h2><div class="md">' + miniMd(s.summary.markdown) + "</div></div>";
        } else {
            html += emptyState("No summary yet", "App Modernization writes <code>summary.md</code> after validations pass.", "");
        }
        const g = s.git || {};
        html +=
            '<div class="card"><h2>Branch & PR</h2><div class="grid">' +
            kv("Branch", g.branch ? esc(g.branch) : "—") +
            kv("Migration branch", g.isMigrationBranch ? "Yes" : "No") +
            kv("Changed files", g.changedFiles != null ? String(g.changedFiles) : "—") +
            "</div><div class=actions style='margin-top:12px'>" +
            btn("Open a pull request", "open_pr", {}, { primary: true }) +
            btn("Refresh", "refresh") +
            "</div></div>";
        return html;
    }

    // ---- helpers -------------------------------------------------------------

    function nextTarget(v) {
        const ladder = [11, 17, 21, 25];
        for (const t of ladder) if (t > v) return t;
        return 25;
    }
    function kv(k, v) {
        return '<div class="kv"><span class="k">' + esc(k) + '</span><span class="v">' + v + "</span></div>";
    }
    function taskRow(t) {
        return (
            '<div class="task"><div class="body"><div class="name">' + esc(t.name) +
            (t.relevant ? ' <span class="badge b-blue">relevant</span>' : "") +
            '</div><div class="sum">' + esc(t.summary) + "</div></div>" +
            "<div>" + btn("Run", "run_task", { taskId: t.id }) + "</div></div>"
        );
    }
    function emptyState(big, sub, action) {
        return '<div class="card"><div class="empty"><div class="big">' + esc(big) + "</div><div>" + sub + "</div>" + (action ? '<div class="actions" style="justify-content:center;margin-top:14px">' + action + "</div>" : "") + "</div></div>";
    }
    function miniMd(md) {
        const lines = esc(md).split(/\r?\n/);
        let out = "";
        let inList = false;
        for (let line of lines) {
            if (/^\s*[-*]\s+/.test(line)) {
                if (!inList) { out += "<ul>"; inList = true; }
                out += "<li>" + line.replace(/^\s*[-*]\s+/, "") + "</li>";
                continue;
            }
            if (inList) { out += "</ul>"; inList = false; }
            const h = line.match(/^(#{1,3})\s+(.*)/);
            if (h) { out += "<h" + h[1].length + ">" + h[2] + "</h" + h[1].length + ">"; continue; }
            if (line.trim() === "") { out += "<br>"; continue; }
            out += "<p style='margin:4px 0'>" + line + "</p>";
        }
        if (inList) out += "</ul>";
        return out.replace(/`([^`]+)`/g, "<code>$1</code>");
    }

    // ---- shell ---------------------------------------------------------------

    function render() {
        if (!state) {
            $("#app").innerHTML = '<div class="empty"><span class="spin"></span> Loading…</div>';
            return;
        }
        if (!state.ok) {
            $("#app").innerHTML = emptyState("Repo not available", esc(state.error || "Could not read the repository."), btn("Retry", "refresh", {}, { primary: true }));
            renderHeader();
            return;
        }
        renderHeader();
        autopilotRunning = !!(state.autopilot && state.autopilot.running);
        const tabs = { overview: overviewTab, readiness: doctorTab, assessment: assessmentTab, plan: planTab, validation: validationTab, tasks: tasksTab, summary: summaryTab };
        let body = "";
        try {
            body = autopilotStrip(state);
            body += pending ? '<div class="banner"><span class="spin"></span> Sent to the agent: <b>' + esc(pending) + "</b>. Watch the chat; this view refreshes when the turn finishes.</div>" : "";
            body += (tabs[activeTab] || overviewTab)(state);
        } catch (e) {
            // A tab renderer threw — show the error instead of silently leaving the
            // previous tab's content on screen (which looks like a dead click).
            body = '<div class="banner banner-red">This view hit an error: ' + esc(e && e.message ? e.message : String(e)) + " " + btn("Reload", "refresh", {}, { primary: true }) + "</div>";
        }
        $("#app").innerHTML = body;
    }

    function renderHeader() {
        const s = state || {};
        const a = s.assessment || {};
        $("#status").innerHTML = s.status ? statusBadge(s.status) : "";
        $("#repo").textContent = s.repoPath ? s.repoPath.split(/[\\/]/).slice(-2).join("/") : "";
        const chips = $("#chips");
        if (!s.ok) { chips.innerHTML = ""; }
        else {
            chips.innerHTML = [
                a.buildTool ? '<span class="chip"><b>' + esc(a.buildTool) + "</b></span>" : "",
                a.javaVersion ? '<span class="chip">Java <b>' + esc(a.javaVersion) + "</b></span>" : "",
                a.springBoot ? '<span class="chip">Spring Boot</span>' : "",
                a.hasDockerfile ? '<span class="chip">Docker</span>' : "",
                s.git && s.git.branch ? '<span class="chip">⎇ <b>' + esc(s.git.branch) + "</b></span>" : "",
            ].join("");
        }
        const counts = {
            assessment: s.report && s.report.findings ? s.report.findings.length : 0,
            plan: s.progress && s.progress.steps.length ? s.progress.steps.length : (s.plan ? s.plan.steps.length : 0),
            tasks: (s.tasks ? s.tasks.length : 0) + (s.skills ? s.skills.length : 0),
        };
        document.querySelectorAll("nav.tabs button").forEach((b) => {
            b.classList.toggle("active", b.dataset.tab === activeTab);
            const c = b.querySelector(".count");
            if (!c) return;
            if (b.dataset.tab === "readiness") {
                const ov = s.doctor && s.doctor.overall;
                c.textContent = ov === "blocked" ? "⚠" : ov === "caution" ? "!" : "";
                c.className = "count " + (ov === "blocked" ? "c-red" : ov === "caution" ? "c-amber" : "");
            } else {
                c.textContent = counts[b.dataset.tab] ? "(" + counts[b.dataset.tab] + ")" : "";
            }
        });
    }

    async function loadState() {
        try {
            const r = await fetch("/state" + tokenQuery);
            state = await r.json();
            render();
        } catch (e) {
            toast("Failed to load state");
        }
    }

    async function doAction(kind, payload) {
        if (kind === "refresh") { toast("Refreshing…"); await loadState(); return; }
        if (kind.indexOf("goto:") === 0) { activeTab = kind.slice(5); render(); window.scrollTo(0, 0); return; }
        // Autopilot controls stream their results over SSE, so they must not set the
        // blocking "pending" banner that freezes the whole view for a one-shot send.
        const isAutopilot = kind.indexOf("autopilot_") === 0;
        try {
            const r = await fetch("/action" + tokenQuery, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ kind, payload }),
            });
            const res = await r.json();
            if (res.ok) {
                if (res.state) {
                    // Local, synchronous actions (refresh, recheck_env) hand back a
                    // fresh snapshot inline. Apply it now and clear any spinner instead
                    // of waiting on an SSE broadcast that can be missed if the provider
                    // restarts or the connection drops — which would spin forever.
                    state = res.state;
                    pending = null;
                } else if (!isAutopilot) {
                    pending = res.label || kind;
                }
                toast(res.message || "Sent to the agent");
                render();
            } else {
                toast(res.error || "Action failed");
            }
        } catch (e) {
            toast("Action failed");
        }
    }

    // event delegation for all action buttons + tabs
    document.addEventListener("click", (e) => {
        const tabBtn = e.target.closest("nav.tabs button");
        if (tabBtn) { activeTab = tabBtn.dataset.tab; render(); return; }
        const b = e.target.closest("[data-kind]");
        if (b && !b.disabled) {
            let payload = {};
            try { payload = JSON.parse(b.dataset.payload || "{}"); } catch {}
            doAction(b.dataset.kind, payload);
        }
    });

    // live updates: server pushes a fresh snapshot when the agent finishes a turn
    try {
        const ev = new EventSource("/events" + tokenQuery);
        // Resync whenever the stream (re)connects. If the provider restarted while an
        // action was in flight, its "done" broadcast was lost; re-fetching state here
        // clears any stuck spinner and shows the real result.
        ev.onopen = () => { loadState(); };
        ev.onmessage = (m) => {
            try {
                const data = JSON.parse(m.data);
                if (data && data.type === "state") { state = data.state; pending = null; render(); }
                else if (data && data.type === "autopilot" && state) { state.autopilot = data.autopilot; render(); }
            } catch {}
        };
    } catch {}

    render();
    loadState();
}

export function renderHtml({ instanceId, initialTab, token } = {}) {
    // Escape `<` so a stray "</script>" in any field can't break out of the inline
    // <script> tag below. (instanceId is runtime-validated, but stay robust anyway.)
    const boot = JSON.stringify({ instanceId: instanceId || "", initialTab: initialTab || "overview", token: token || "" }).replace(/</g, "\\u003c");
    return (
        "<!doctype html><html><head><meta charset=\"utf-8\" />" +
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />" +
        "<title>Java Modernization Studio</title><style>" + CSS + "</style></head><body>" +
        '<header class="top"><div class="title-row">' +
        "<h1>Java Modernization Studio</h1><span id=\"status\"></span><span class=\"spacer\"></span>" +
        '<span id="repo" class="repo muted"></span>' +
        '<button class="btn" data-kind="refresh" data-payload="{}">↻ Refresh</button>' +
        "</div>" +
        '<div id="chips" class="chips"></div>' +
        '<nav class="tabs">' +
        '<button data-tab="overview">Overview</button>' +
        '<button data-tab="readiness">Readiness <span class="count"></span></button>' +
        '<button data-tab="assessment">Assessment <span class="count"></span></button>' +
        '<button data-tab="plan">Plan &amp; Progress <span class="count"></span></button>' +
        '<button data-tab="validation">Validation</button>' +
        '<button data-tab="tasks">Tasks &amp; Skills <span class="count"></span></button>' +
        '<button data-tab="summary">Summary</button>' +
        "</nav></header>" +
        '<main id="app"></main><div id="toast" class="toast"></div>' +
        "<script>window.__APPMOD__=" + boot + ";(" + clientMain.toString() + ")();</script>" +
        "</body></html>"
    );
}
