import { coalesce } from "./coalesce.mjs";
import { escape, isLoopback } from "./escape.mjs";
import { LiveConnection } from "./live-conn.mjs";
import { autoSwitch } from "./tab-policy.mjs";
import { TargetSaver } from "./target-save.mjs";

const $ = id => document.getElementById(id);
const token = document.querySelector('meta[name="canvas-token"]').content;
const number = value => new Intl.NumberFormat().format(value ?? 0);
const money = (value, currency = "USD") => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);
// Live updates re-render often; unchanged text is left alone so live regions are not announced again.
const setText = (node, text) => { if (node.textContent !== text) node.textContent = text; };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const toTime = value => typeof value === "number" ? value : Date.parse(value ?? "");
const clock = (value, seconds = false) => Number.isFinite(toTime(value)) ? new Date(toTime(value)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", ...(seconds ? { second: "2-digit" } : {}) }) : "";
const iso = value => Number.isFinite(toTime(value)) ? new Date(toTime(value)).toISOString() : "";
function setMark(id, text, label = "", tone = "") {
    const mark = $(id);
    mark.textContent = text;
    mark.dataset.tone = tone;
    if (text && label) { mark.setAttribute("role", "img"); mark.setAttribute("aria-label", label); }
    else { mark.removeAttribute("role"); mark.removeAttribute("aria-label"); }
}

const TABS = ["start", "build", "explore", "optimize"];
const PHASES = ["Specify", "Implement", "Verify", "Deploy"];
const LESSONS = "docs/LOOP.md";
const PHASE_COPY = {
    Specify: "EARS acceptance criteria, a frozen contract, workstreams and a deployment plan, checked by an independent reviewer.",
    Implement: "azd provisions the Foundry project and a hosted checkpoint proves the integration before agents, tools and app are built in parallel.",
    Verify: "Every acceptance criterion tested end to end, plus hosted invocations, traces and agent evaluations, with bounded fix loops.",
    Deploy: "azd up ships agents and apps with keyless auth and monitoring, then reruns the end-to-end tests against the deployed endpoints.",
};
const BLOCKED_COPY = {
    Specify: "Preflight or the spec review found a blocker, such as missing access, quota or an unresolved question.",
    Implement: "Provisioning or the build hit a blocker that its agents could not resolve.",
    Verify: "Fix loops ended before every acceptance check passed.",
    Deploy: "Deployment, health checks or the deployed end-to-end tests did not pass.",
};
const MODE_HINT = {
    rapid: "Builds fast in a Foundry project you already have.",
    sdd: "A workflow specifies, implements, verifies and deploys, pausing at gates for your decision.",
};
// AGENTS.md records the build mode chosen when the loop started; Chat commands and the workflow follow it.
const LOCK_HINT = {
    rapid: "Locked by AGENTS.md. To move to SDD, ask Copilot in Chat to convert this prototype.",
    sdd: "Locked by AGENTS.md. To switch modes, ask Copilot in Chat.",
};
const LOCK_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
const START = {
    rapid: {
        title: "Start with an outcome",
        intro: "Confirm readiness, choose a Foundry project and pick a prompt template. Copilot builds a working agentic solution in that project.",
        guided: "Answer a few focused questions about agents, data, tools and the user experience.",
        send: "Send to Chat",
        hint: "Opens in Chat with your selected project. Copilot asks before creating or changing resources. Track milestones on the Build tab.",
    },
    sdd: {
        title: "Specify what to deliver",
        intro: "Confirm readiness, set the deployment target and pick a prompt template. The workflow writes a spec for your approval, builds it in a new Foundry project, verifies it and deploys it to Azure.",
        guided: "Copilot asks only the questions that shape the spec, then starts the workflow.",
        send: "Start SDD workflow",
        hint: "Copilot runs preflight in Chat, then starts the workflow. Follow every phase on the Build tab.",
    },
};
// Short commands from the Agentic Loop section of AGENTS.md; typing one in Chat runs that step.
const COMMANDS = { rapid: ["run", "test", "add agent", "deploy", "improve"], sdd: ["status", "approve", "deploy", "improve"] };
const TARGET_HELP = "The workflow creates a resource group and a Foundry project here. Nothing deploys until you approve it.";
// The pinned first prompt template: Copilot shapes the solution with the user instead of starting from a scenario.
const GUIDED = "guided";
const GUIDED_NAME = "Shape it with Copilot";
const GUIDED_META = "Guided · Any industry";
const GUIDED_PLACEHOLDER = "Optional. Describe the idea in a sentence or two, such as who it helps and the data it uses. Copilot asks about the rest.";
const GUIDED_ART = '<span class="guided-art" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M10 14h18a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H19l-7 6v-6h-2a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4Z"/><path d="M12 22h12M12 27h8"/><path class="spark" d="m38 4 1.6 4.4L44 10l-4.4 1.6L38 16l-1.6-4.4L32 10l4.4-1.6Z"/><path class="spark" d="m42.5 19 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z"/></svg></span>';
const FACETS = [["industry", "Industry"], ["capabilities", "Capabilities"], ["buildingBlocks", "Building blocks"], ["patterns", "Patterns"]];
const EMPTY_RESULTS = { search: ["this search", "Clear search"], filters: ["these filters", "Clear filters"], both: ["this search and these filters", "Clear search and filters"] };
const TEMPLATE_HINT = {
    building: "Copilot is building from this template in Chat. Follow progress on Build.",
    unlockable: "Sent to Chat. Unlock to edit the prompt or choose another template until Copilot starts building.",
    locked: "The template stays locked for this session. Keep the loop going from Build.",
};
const CHEVRON = '<svg class="facet-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const CLOSE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
const WF_EMPTY_INTRO = $("wf-empty-intro").textContent;

let snapshot;
let projects = [];
let resourceSubscription = "";
let selected = null;
let activeTab = "start";
let selectionRevision = 0;
let discovering = false;
let usageLoading = false;
// Prompt templates: the selected template (null, GUIDED or a scenario id), whether a send locked it, and gallery state.
let template = null;
let templateStarted = false;
let galleryReturn = null;
let heroKey = "";
let draftSave;
let awaitingTurn = false;
let awaitingTimer;
const filters = Object.fromEntries(FACETS.map(([key]) => [key, new Set()]));
const universals = {};
const haystacks = new Map();
// Edits to templates the user left, kept for this page so reopening one restores them.
const drafts = new Map();
let frontendsSignature;
let frontendState = null;
// Undefined until the first .env read, so only a transition during this session switches to Explore.
let rapidFinished;
let resourcesSignature;
let projectSyncError = false;
let inventory = null;
let mode = "rapid";
let modePending = false;
let lock = null;
let modeHintKey = "";
let started = false;
let envProjectId = null;
let subscriptions = [];
let target = { subscriptionId: null, location: "auto", environmentName: "" };
let targetsLoading = null;
let live = null;
let liveVersion = -1;
let liveReceivedAt = Date.now();
let knownRuns = null;
// The current run's last status, so only a run completing in this session switches to Explore.
let lastRunStatus = null;
let completedRun = null;
let lastCheckpoint = null;
let setupLoading = null;
let setupDone = false;
let setupReady = false;
// Azure listings that failed (projects in rapid, subscriptions in SDD) are retried by Check again once Azure CLI is signed in.
let azureSignedIn = false;
let discoveryFailed = false;
let targetsFailed = false;
let workIq = null;
let whereSelected = false;
const regions = {};
const collapsedInventory = new Set(["resources"]);
const inventoryGroups = {
    agents: { title: "Agents", scope: "Project", empty: "No agents in this project yet.", hint: "Deploy an agent to see it here.", icon: '<rect x="4" y="7" width="16" height="13" rx="3"/><path d="M12 3v4M8 12h.01M16 12h.01M9 16h6"/>' },
    models: { title: "Model deployments", scope: "Foundry account", empty: "No model deployments in this account.", hint: "Deploy a model or select an account with an existing deployment.", icon: '<path d="m12 3 9 5v8l-9 5-9-5V8l9-5Zm0 9 9-4M12 12 3 8m9 4v9"/>' },
    tools: { title: "Toolboxes", scope: "Project", empty: "No toolboxes connected yet.", hint: "Publish tools and skills in a Foundry toolbox to make them available to agents.", icon: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4M3 12h18m-12-2v4m6-4v4"/>' },
    resources: { title: "Azure resources", scope: "Resource group", empty: "No resources returned for this resource group.", hint: "Check the selected project and refresh the inventory.", icon: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>' },
};
const loaded = new Set();

function duration(ms) {
    const total = Math.max(0, Math.round((ms || 0) / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor(total / 60) % 60;
    const seconds = total % 60;
    if (hours) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
    return minutes ? `${minutes}m ${String(seconds).padStart(2, "0")}s` : `${seconds}s`;
}

async function api(action, input = {}) {
    const response = await fetch("/api/action", {
        method: "POST", headers: { "Content-Type": "application/json", "X-Canvas-Token": token },
        body: JSON.stringify({ action, input }),
    });
    const value = await response.json();
    if (!response.ok) throw Object.assign(new Error(value.error || `Request failed (${response.status}).`), { code: value.code, status: response.status });
    return value;
}

const announcing = {};

// Persistent live regions announce reliably; clearing first lets a repeated message be announced again.
function announce(message, error = false) {
    const id = error ? "announce-alert" : "announce-status";
    clearTimeout(announcing[id]);
    $(id).textContent = "";
    announcing[id] = setTimeout(() => { $(id).textContent = message; }, 100);
}

function notice(message, error = false, action = null) {
    const node = $("notice");
    node.hidden = false;
    node.className = error ? "error" : "";
    const text = document.createElement("span");
    text.className = "notice-text";
    text.textContent = message;
    node.replaceChildren(text);
    announce(message, error);
    if (action) {
        const button = document.createElement("button");
        button.className = "quiet";
        button.dataset.go = action.go;
        button.textContent = action.label;
        node.append(button);
    }
    const close = document.createElement("button");
    close.className = "quiet icon-button notice-close";
    close.dataset.dismiss = "";
    close.ariaLabel = "Dismiss message";
    close.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    node.append(close);
}

// Buttons with work in flight; renderSendState leaves them disabled until busy() hands them back.
const working = new Set();

async function busy(button, work) {
    if (button.disabled) return;
    button.disabled = true;
    working.add(button);
    try { await work(); }
    catch (error) { notice(error.message, true); }
    finally {
        working.delete(button);
        if (button.isConnected) button.disabled = button.hasAttribute("data-requires-project") && !activeProject();
        if (button.id === "send-prompt") renderSendState();
    }
}

function failure(container, error) {
    container.innerHTML = `<p class="error">${escape(error.message)} Refresh to retry.</p>`;
}

// SDD only trusts the project the workflow wrote to FOUNDRY_PROJECT; rapid uses the project chosen on Start.
function activeProject() {
    if (mode !== "sdd") return selected;
    return selected && envProjectId && selected.id.toLowerCase() === envProjectId.toLowerCase() ? selected : null;
}

function renderProjectBar() {
    const project = activeProject();
    const sdd = mode === "sdd";
    $("project-name").textContent = sdd
        ? project?.name ?? (envProjectId ? envProjectId.split("/").at(-1) : "Not created yet")
        : selected?.name ?? "Choose a project";
    $("project-note").hidden = !sdd;
    $("project-note").textContent = project || envProjectId ? "created by the workflow" : "the workflow creates it";
    $("project-bar").title = !sdd ? `${selected ? "Change the" : "Choose a"} Microsoft Foundry project`
        : project ? "Explore the project's resources" : "Follow the workflow on Build";
    renderPortalLink(project);
    fitProjectBar();
    for (const button of document.querySelectorAll("[data-requires-project]")) button.disabled = !project;
    $("brief-project-hint").hidden = mode !== "rapid" || Boolean(selected);
    renderSendState();
    $("optimize-project-hint").hidden = Boolean(project);
    $("optimize-project-hint").textContent = mode === "sdd"
        ? "The SDD workflow creates your Foundry project during Implement. Project actions unlock once it exists."
        : "Select a project on Start to enable project actions.";
}

// Without a linkable project the anchor drops its href, so it leaves the tab order but stays announced as a dimmed link.
function renderPortalLink(project) {
    const link = $("project-portal");
    if (project?.portalUrl) {
        link.href = project.portalUrl;
        link.removeAttribute("role");
        link.removeAttribute("aria-disabled");
        link.ariaLabel = `Open ${project.name} in Foundry Portal (opens in a new tab)`;
        link.title = `Open ${project.name} in Foundry Portal`;
        return;
    }
    link.removeAttribute("href");
    link.setAttribute("role", "link");
    link.setAttribute("aria-disabled", "true");
    link.ariaLabel = "Open in Foundry Portal";
    link.title = project ? "This project can't be opened in Foundry Portal"
        : mode !== "sdd" ? "Choose a project to open it in Foundry Portal"
        : envProjectId ? "Available once the canvas can access this project" : "Available once the workflow creates the project";
}

// Picks the most explicit field that keeps the project name whole, comparing the text's room with its natural width.
// When no level can, it keeps the most explicit label that still leaves the name readable, since the name is cut anyway.
function fitProjectBar() {
    const bar = $("project-bar");
    const run = bar.querySelector(".project-text");
    const readable = 10 * parseFloat(getComputedStyle(run).fontSize);
    let fallback = "name";
    for (const fit of ["all", "label", "short", "name"]) {
        bar.dataset.fit = fit;
        const room = run.getBoundingClientRect().width;
        run.style.flexShrink = "0";
        const needed = run.getBoundingClientRect().width;
        run.style.removeProperty("flex-shrink");
        if (needed <= room) return;
        if (fallback === "name" && fit !== "all" && room >= readable) fallback = fit;
    }
    bar.dataset.fit = fallback;
}

function applyMode(next, preferredTab) {
    next = next === "sdd" ? "sdd" : "rapid";
    const changed = next !== mode;
    mode = next;
    document.body.dataset.mode = mode;
    for (const button of document.querySelectorAll(".mode [data-mode]")) {
        const on = button.dataset.mode === mode;
        button.setAttribute("aria-checked", String(on));
        button.tabIndex = on ? 0 : -1;
    }
    renderModeHint();
    if (changed) {
        whereSelected = whereReady();
        $("step-where").open = !whereSelected;
        if (started) updateDock();
    }
    $("rapid-progress").hidden = mode !== "rapid";
    $("sdd-progress").hidden = mode !== "sdd";
    renderStart();
    renderBuild();
    renderProjectBar();
    if (changed && started) onModeChanged(preferredTab);
    return changed;
}

// Re-render only on change so a focused "Open AGENTS.md" button keeps focus across live updates.
function renderModeHint() {
    const key = `${lock}:${mode}`;
    if (key === modeHintKey) return;
    modeHintKey = key;
    document.querySelector(".mode").toggleAttribute("data-locked", Boolean(lock));
    for (const button of document.querySelectorAll(".mode [data-mode]")) {
        if (lock && button.dataset.mode !== lock) { button.setAttribute("aria-disabled", "true"); button.title = "Locked by AGENTS.md"; }
        else { button.removeAttribute("aria-disabled"); button.removeAttribute("title"); }
    }
    const hint = $("mode-hint");
    hint.classList.toggle("locked", Boolean(lock));
    if (!lock) { hint.textContent = MODE_HINT[mode]; return; }
    hint.innerHTML = `${LOCK_ICON}<span>${escape(LOCK_HINT[lock])}</span><button class="quiet" data-artifact="AGENTS.md">Open AGENTS.md</button>`;
}

function onModeChanged(preferredTab) {
    loaded.delete("explore");
    loaded.delete("optimize");
    if (preferredTab) selectTab(preferredTab).catch(error => notice(error.message, true));
    else if (["explore", "optimize"].includes(activeTab)) loadTab(activeTab).catch(error => notice(error.message, true));
    if (mode === "sdd") loadTargets();
    if (mode === "rapid" && !projects.length && !discovering) discover();
}

async function chooseMode(next, preferredTab) {
    if (next === mode) return;
    if (lock && next !== lock) { notice(LOCK_HINT[lock]); return; }
    const previous = mode;
    modePending = true;
    applyMode(next, preferredTab);
    try {
        const result = await api("mode", { mode: next });
        modePending = false;
        applyLive(result);
    } catch (error) {
        modePending = false;
        applyMode(previous);
        notice(error.message, true);
    }
}

function renderStart() {
    const copy = START[mode];
    $("start-title").textContent = copy.title;
    $("start-intro").textContent = copy.intro;
    $("where-rapid").hidden = mode !== "rapid";
    $("target").hidden = mode !== "sdd";
    renderTargetSummary();
    renderWhere();
    renderStartMark();
    if (snapshot) {
        renderGallery();
        renderTemplateView();
    }
}

const capitalize = text => text.charAt(0).toUpperCase() + text.slice(1);

// Step markers keep their number visible; a corner badge shows the state.
const BADGES = {
    done: "m4.6 8.2 2.3 2.3 4.5-4.8",
    attention: "M8 4.4v4.2m0 3.1v.01",
    paused: "M6.3 5v6m3.4-6v6",
    failed: "m5.6 5.6 4.8 4.8m0-4.8-4.8 4.8",
    skipped: "M5 8h6",
};
const stepBadge = kind => kind ? `<svg class="step-badge" data-kind="${kind}" viewBox="0 0 16 16" aria-hidden="true"><path d="${BADGES[kind]}"/></svg>` : "";

function stepGlyph(id, state) {
    const glyph = $(id);
    if (glyph.dataset.state === state) return;
    glyph.dataset.state = state;
    glyph.querySelector(".step-badge")?.remove();
    glyph.insertAdjacentHTML("beforeend", stepBadge({ ready: "done", attention: "attention" }[state]));
}

// Collapsing a step first moves focus from its body to its summary, so keyboard focus never lands on a hidden control.
function setStepOpen(id, open) {
    const step = $(id);
    if (step.open === open) return;
    if (!open && step.querySelector(".step-body").contains(document.activeElement)) step.querySelector("summary").focus({ preventScroll: true });
    step.open = open;
}

function whereReady() { return Boolean(mode === "sdd" ? target.subscriptionId : selected); }

// Step 2 is the Foundry project in rapid mode and the deployment target in SDD. A restored choice collapses the step; one the user just picked stays in view.
function renderWhere(picked = false) {
    const sdd = mode === "sdd";
    const has = whereReady();
    $("where-title").textContent = sdd ? "Deployment target" : "Foundry project";
    $("where-summary").textContent = sdd ? capitalize(targetSummary())
        : selected ? `${selected.name} · ${selected.resourceGroup}` : discovering ? "Discovering projects…" : "Choose a project";
    stepGlyph("where-glyph", has ? "ready" : "");
    if (has === whereSelected) return;
    whereSelected = has;
    if (!has) $("step-where").open = true;
    else if (!picked) setStepOpen("step-where", false);
}

function renderStartMark() {
    if (setupReady && (mode === "sdd" || selected)) setMark("start-mark", "✓", "Ready to build", "success");
    else if (setupDone && !setupReady) setMark("start-mark", "!", "Readiness needs attention", "warning");
    else setMark("start-mark", "");
}

function renderBuild() {
    renderBuildMark();
    renderTemplateCta();
    if (mode === "rapid") renderRapidProgress();
    const hint = $("build-commands-hint");
    hint.hidden = lock !== mode;
    if (!hint.hidden) hint.innerHTML = `Type a short command in Chat to run a step: ${COMMANDS[mode].map(name => `<code>${escape(name)}</code>`).join(", ")}.`;
}

function renderBuildMark() {
    const mark = $("build-mark");
    mark.removeAttribute("title");
    if (mode === "sdd") {
        const run = live?.run;
        const [text, tone, label] = !run ? ["", "", ""]
            : run.status === "paused" ? ["!", "warning", run.checkpoint ? "Needs you" : "Paused"]
                : isLive(run) ? ["●", "accent", "Running"]
                    : run.status === "completed" ? ["✓", "success", "Completed"]
                        : run.status === "error" || run.status === "halted" ? ["✕", "error", STATUS[run.status][0]] : ["", "", STATUS[run.status]?.[0] ?? run.status];
        setMark("build-mark", text, label, tone);
    } else if (lock === "rapid" && live?.busy) setMark("build-mark", "●", "Copilot is working", "accent");
    else if (frontendState?.configured) {
        setMark("build-mark", "✓", "Frontend configured", "success");
        mark.title = "Based on LOCAL_FRONTEND or DEPLOYED_FRONTEND in workspace .env; not a health check.";
    } else setMark("build-mark", "");
}

// Rapid milestones come from workspace evidence: the AGENTS.md lock, FOUNDRY_PROJECT and the frontend URLs in .env, and
// the README.md contract, hosted checkpoint verdict and agent-only marker the skill records.
function renderRapidProgress() {
    const locked = lock === "rapid";
    const linked = envProjectId && !frontendState?.foundryProject?.error ? envProjectId : null;
    const projectName = linked && (selected?.id.toLowerCase() === linked.toLowerCase() ? selected.name : linked.split("/").at(-1));
    const { contract = false, checkpoint = null, appless = false } = frontendState?.milestones ?? {};
    const url = key => frontendState?.frontends.find(row => row.key === key && row.configured && !row.error)?.url ?? null;
    const local = url("local");
    const deployed = url("deployed");
    const working = locked && Boolean(live?.busy);
    $("rapid-start").hidden = locked;
    $("rapid-commands").hidden = !locked;
    const open = (key, value, label) => `<button data-frontend="${key}" data-key="frontend:${key}" aria-label="Open ${label} in the integrated browser">${escape(value.replace(/^https?:\/\//, ""))}</button>`;
    const readme = '<button data-artifact="README.md" data-key="artifact:readme">README.md</button>';
    const agentOnly = appless && !local;
    const steps = [
        { title: "Loop started", done: locked, todo: "Send a prompt template from Start. Copilot locks rapid prototyping in AGENTS.md and adds short commands.", detail: "AGENTS.md locks rapid prototyping and lists the short commands.", extra: '<button data-artifact="AGENTS.md" data-key="artifact:agents">AGENTS.md</button>' },
        { title: "Project linked", done: Boolean(projectName), todo: "Copilot validates your Foundry project and your access, then records it in .env and .azure/deployment-plan.md.", detail: `${projectName}, recorded in .env and the deployment plan.`, extra: '<button data-artifact=".azure/deployment-plan.md" data-key="artifact:plan">deployment-plan.md</button>' },
        { title: "Solution designed", done: contract, todo: "Copilot clarifies the use case, writes the architecture and implementation contract to README.md, then asks before creating resources.", detail: "README.md holds the architecture and the implementation contract.", extra: readme },
        { title: "Hosted checkpoint", done: checkpoint === "passed", blocked: checkpoint === "blocked", todo: "Copilot scaffolds a minimal agent from the Foundry Basic sample, runs it locally, deploys it and proves its model, skill and tool calls with traces.", detail: "A deployed agent answered, with traces as evidence in README.md.", blockedDetail: "Copilot recorded the blocker in README.md. Resolve it in Chat to continue.", extra: readme },
        { title: "Running locally", done: Boolean(local), skipped: agentOnly, todo: "Copilot builds the remaining agents, tools and app, deploys the agents and runs the end-to-end tests on this machine.", detail: "The app runs on this machine.", skippedDetail: "Agent-only solution: try the agent from Explore.", extra: local ? open("local", local, "the local app") : "" },
        { title: "Deployed to Azure", done: Boolean(deployed), optional: true, skipped: agentOnly && !deployed, todo: "Optional. After local acceptance, Copilot asks before deploying the app to Azure Container Apps.", detail: "The app runs in Azure Container Apps.", skippedDetail: "No app to deploy; the agents already run in Foundry.", extra: deployed ? open("deployed", deployed, "the deployed app") : "" },
    ];
    const next = steps.findIndex(step => !step.done && !step.skipped && !step.optional);
    const current = steps.findIndex(step => !step.done && !step.skipped);
    region("rapid", $("rapid-steps"), [locked, working, projectName, contract, checkpoint, appless, local, deployed], () => steps.map((step, index) => {
        const [view, label, badge, text] = step.done ? ["completed", "Done", "done", step.detail]
            : step.skipped ? ["skipped", "Not applicable", "skipped", step.skippedDetail]
                : step.blocked ? ["failed", "Blocked", "failed", step.blockedDetail]
                    : index === next ? [working ? "active" : "pending", working ? "In progress" : "Next", "", step.todo]
                        : ["pending", step.optional ? "Optional" : "Not started", "", step.todo];
        return `<li class="phase" data-view="${view}"${index === current ? ' aria-current="step"' : ""}>
        <span class="phase-icon" aria-hidden="true">${index + 1}${stepBadge(badge)}</span>
        <div class="phase-body">
            <div class="phase-head"><h3>${escape(step.title)}</h3><span class="phase-state">${label}</span></div>
            <p class="muted">${escape(text)}</p>
            ${(step.done || step.blocked) && step.extra ? `<div class="artifacts">${step.extra}</div>` : ""}
        </div></li>`;
    }).join(""));
}

function regionLabel(location) {
    return [...$("target-location").options].find(option => option.value === location)?.text ?? location;
}

function targetSummary() {
    const subscription = subscriptions.find(row => row.id === target.subscriptionId);
    return [
        subscription?.name ?? (target.subscriptionId || "subscription confirmed in Chat"),
        target.location === "auto" ? "region recommended by Copilot" : regionLabel(target.location),
        target.environmentName ? `azd environment ${target.environmentName}` : "azd environment named from the solution",
    ].join(" · ");
}

function renderTargetSummary() {
    $("review-target").hidden = mode !== "sdd";
    $("review-target").textContent = mode === "sdd" ? `Deploys to ${targetSummary()}` : "";
}

// `force` also overwrites the environment name being typed, to restore the server's target after a failed save.
function applyTarget(value, picked = false, force = false) {
    target = { ...target, ...value };
    const location = target.location || "auto";
    if (![...$("target-location").options].some(option => option.value === location)) $("target-location").add(new Option(location, location));
    $("target-location").value = location;
    if (force || document.activeElement !== $("target-env")) $("target-env").value = target.environmentName ?? "";
    $("target-subscription").value = subscriptions.some(row => row.id === target.subscriptionId) ? target.subscriptionId : "";
    renderTargetSummary();
    renderWhere(picked);
}

function loadTargets(force = false) {
    if (targetsLoading && !force) return targetsLoading;
    $("target-subscription").disabled = true;
    targetsLoading = api("targets").then(result => {
        targetsFailed = false;
        subscriptions = [...result.subscriptions].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name));
        $("target-subscription").innerHTML = '<option value="">Confirm in Chat</option>' +
            subscriptions.map(row => `<option value="${escape(row.id)}">${escape(row.name)}${row.isDefault ? " · default" : ""}</option>`).join("");
        // Replaces an earlier listing failure, but keeps an environment-name validation error.
        if (!$("target-help").classList.contains("error")) $("target-help").textContent = TARGET_HELP;
        applyTarget(result.target);
    }).catch(error => {
        targetsLoading = null;
        targetsFailed = true;
        $("target-help").textContent = `Could not list subscriptions: ${error.message} Copilot confirms the subscription in Chat.`;
    }).finally(() => { $("target-subscription").disabled = false; });
    return targetsLoading;
}

function resetTargetHelp() {
    $("target-env").setAttribute("aria-invalid", "false");
    $("target-help").textContent = TARGET_HELP;
    $("target-help").classList.remove("error");
}

// One save at a time; an SDD send waits for it, and a failed save puts the server's target back into the controls.
const targetSaver = new TargetSaver({
    save: async input => {
        applyTarget(await api("target", input), true);
        if ($("target-env").getAttribute("aria-invalid") !== "true") resetTargetHelp();
    },
    restore: async error => {
        notice(`Could not save the deployment target: ${error.message} The saved target is shown again.`, true);
        const response = await fetch("/api/state", { headers: { "X-Canvas-Token": token } });
        const value = await response.json();
        if (!response.ok) throw new Error(value.error);
        applyTarget(value.state.target, true, true);
        resetTargetHelp();
    },
    onChange: () => renderSendState(),
});

const NEEDS_PROJECT = "Select a Foundry project on Start to send a rapid prototyping prompt.";

// Rapid briefs need a selected project; an SDD brief waits until the target has saved.
function renderSendState() {
    const send = $("send-prompt");
    const needsProject = mode === "rapid" && !selected;
    const visible = Boolean(template) && !send.hidden;
    $("send-pick-project").hidden = !(visible && needsProject);
    if (visible && templateState() === "open") setText($("send-hint"), needsProject ? NEEDS_PROJECT : START[mode].hint);
    if (!working.has(send)) send.disabled = needsProject || (mode === "sdd" && targetSaver.saving);
}

function pickProject() {
    $("step-where").open = true;
    const switching = selectTab("start");
    $("step-where").scrollIntoView({ block: "start", behavior: "instant" });
    ($("project").disabled ? $("step-where").querySelector("summary") : $("project")).focus({ preventScroll: true });
    switching.catch(error => notice(error.message, true));
}

// frontends() polls every 5 seconds, so the banner is announced only when its message changes.
function envError(message) {
    const node = $("project-env-error");
    if (message && message !== node.textContent) announce(message, true);
    node.hidden = !message;
    node.textContent = message;
}

// Polls share one request; a forced refresh during a poll runs again right after it, so its result is never stale.
const frontends = coalesce(async retry => {
    try {
        const selection = selectionRevision;
        const result = await api("frontends", retry ? { retry: true } : {});
        const nextEnvProject = result.foundryProject?.id ?? null;
        if (nextEnvProject !== envProjectId) { envProjectId = nextEnvProject; renderProjectBar(); }
        // A .env that cannot be read only warns; project discovery and the current selection are unaffected.
        if (result.envError) envError(`Could not read the workspace .env: ${result.envError} Current selection kept.`);
        if (result.projectSync && selection === selectionRevision && !discovering) {
            const sync = result.projectSync;
            projectSyncError = Boolean(sync.error);
            if (!result.envError) envError(sync.error ? `Could not synchronize FOUNDRY_PROJECT from .env: ${sync.error} Current selection kept. Refresh to retry.` : "");
            const signature = JSON.stringify({ ...sync, error: null });
            if (signature !== resourcesSignature) {
                resourcesSignature = signature;
                applyResources(sync);
                await monitoring();
                if (activeTab === "explore") await explore();
                if (activeTab === "optimize") await costs();
            }
        }
        const signature = JSON.stringify(result);
        if (signature === frontendsSignature) return;
        frontendsSignature = signature;
        frontendState = result;
        renderBuild();
        const configured = result.frontends.filter(row => row.configured);
        $("frontend-links").innerHTML = configured.map(row => `<div class="inventory-row"><strong>${escape(row.label)}</strong>${row.error
            ? `<p class="error">${escape(row.error)}</p>`
            : `<span class="frontend-url">${escape(row.url)}</span><div class="actions"><button data-frontend="${escape(row.key)}" aria-label="Open ${escape(row.label)} in integrated browser">Open in integrated browser</button>${isLoopback(row.url) ? "" : `<a href="${escape(row.url)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${escape(row.label)} in external browser">Open in external browser ↗</a>`}</div>`}</div>`).join("") ||
            `<p class="muted">${mode === "sdd" ? "No frontend yet. The workflow records it during Implement and Deploy." : "No frontend configured. Finish the build first."}</p>`;
        if (live) renderWorkflow(live);
        // A rapid build finishes when the app runs locally, or when an agent-only solution passes its hosted checkpoint.
        const milestones = result.milestones ?? {};
        const finished = result.frontends.some(row => row.key === "local" && row.configured && !row.error) || (milestones.checkpoint === "passed" && milestones.appless);
        const justFinished = rapidFinished === false && finished;
        rapidFinished = finished;
        if (justFinished && mode === "rapid") autoTab("explore", "The prototype is ready. Try it from Explore.", "Open Explore");
    } catch (error) {
        // Check again retries the request; discovery stays available meanwhile.
        projectSyncError = true;
        envError(`Could not read project configuration: ${error.message} Current selection kept. Refresh to retry.`);
        frontendsSignature = undefined;
        failure($("frontend-links"), error);
    }
});

const SKELETON = '<div class="skeleton"><span></span><span></span><span></span><p class="visually-hidden">Checking skills, extensions, tools and Azure sign-in…</p></div>';

// Concurrent callers share one readiness check.
function setup() {
    setupLoading ??= checkReadiness().finally(() => { setupLoading = null; });
    return setupLoading;
}

// Signing in fixes Azure listings that failed earlier, so Check again retries them instead of leaving their errors until Refresh.
async function retryAzure() {
    if (!azureSignedIn) return;
    if (projectSyncError) await frontends(true);
    if (mode === "sdd" && targetsFailed) await loadTargets();
    if (mode === "rapid" && discoveryFailed && !projects.length) await discover();
}

async function checkReadiness() {
    const toolsOpen = $("setup-tools")?.open ?? false;
    const skillsOpen = $("setup-skills")?.open ?? false;
    $("setup-actions").hidden = true;
    $("checks").innerHTML = SKELETON;
    stepGlyph("ready-glyph", "checking");
    $("ready-summary").textContent = "Checking skills, extensions, tools and Azure sign-in…";
    try {
        const result = await api("setup");
        setupDone = true;
        setupReady = result.ready && !result.discoveryError;
        azureSignedIn = result.checks.some(check => check.id === "az-auth" && check.status === "ready");
        const toolIds = new Set(["az", "azd", "azd-ai", "az-auth", "azd-auth"]);
        const tools = result.checks.filter(check => toolIds.has(check.id));
        const skills = result.checks.filter(check => !toolIds.has(check.id));
        const renderCheck = check => `<div class="check"><span class="${check.status === "ready" ? "status-ok" : "status-warn"}" role="img" aria-label="${check.status === "ready" ? "Ready" : "Needs attention"}">${check.status === "ready" ? "✓" : "!"}</span><div><strong>${escape(check.label)}</strong><p class="muted">${escape(check.status === "ready" ? check.data : check.error)}</p></div></div>`;
        const renderGroup = (id, title, checks, open) => {
            if (!checks.length) return "";
            const count = checks.filter(check => check.status === "ready").length;
            const ready = count === checks.length;
            return `<details id="${id}" class="setup-group"${open || !ready ? " open" : ""}><summary><span class="${ready ? "status-ok" : "status-warn"}" aria-hidden="true">${ready ? "✓" : "!"}</span><span class="group-label">${title} <span class="muted">${count}/${checks.length} ready${ready ? "" : ` · ${checks.length - count} need attention`}</span></span><svg class="step-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></summary><div class="setup-group-checks">${checks.map(renderCheck).join("")}</div></details>`;
        };
        $("checks").innerHTML = renderGroup("setup-skills", "Skills and extensions", skills, skillsOpen) +
            renderGroup("setup-tools", "Azure tools and sign-in", tools, toolsOpen) +
            (result.discoveryError ? `<p class="error">${escape(result.discoveryError)} Check again to retry skill discovery before installing skills.</p>` : "") +
            `<p class="muted">Checked ${escape(new Date(result.checkedAt).toLocaleTimeString())}</p>`;
        const missingPlugin = result.discoveryError ? [] : skills.filter(check => check.status !== "ready");
        const missingTools = tools.filter(check => ["az", "azd", "azd-ai"].includes(check.id) && check.status !== "ready");
        const missingAuth = tools.filter(check => ["az-auth", "azd-auth"].includes(check.id) && check.status !== "ready" &&
            tools.some(tool => tool.id === check.id.replace("-auth", "") && tool.status === "ready"));
        for (const [section, description, missing] of [
            ["setup-plugin-help", "setup-missing-plugin", missingPlugin],
            ["setup-cli-help", "setup-missing-tools", missingTools],
            ["setup-auth-help", "setup-missing-auth", missingAuth],
        ]) {
            $(section).hidden = missing.length === 0;
            $(description).textContent = missing.length ? `Needs attention: ${missing.map(check => check.label).join(", ")}.` : "";
        }
        $("setup-actions").hidden = !missingPlugin.length && !missingTools.length && !missingAuth.length;
        const pending = result.checks.filter(check => check.status !== "ready").length;
        stepGlyph("ready-glyph", setupReady ? "ready" : "attention");
        $("ready-summary").textContent = result.discoveryError ? "Skill discovery failed. Check again."
            : setupReady ? "All set: skills, extensions, CLIs and Azure sign-in" : `${pending} of ${result.checks.length} checks need attention`;
        setStepOpen("step-ready", !setupReady);
        renderWorkIq(result.workiq ?? { status: "missing" });
        if (result.discoveryError) announce(`Skill discovery failed: ${result.discoveryError}`, true);
        else announce(pending ? `Readiness checked: ${pending} of ${result.checks.length} checks need attention.` : "Readiness checked: everything is ready.");
    } catch (error) {
        setupDone = true;
        setupReady = false;
        azureSignedIn = false;
        stepGlyph("ready-glyph", "attention");
        $("ready-summary").textContent = "Couldn't check readiness";
        setStepOpen("step-ready", true);
        failure($("checks"), error);
        renderWorkIq({ status: "error", error: error.message });
        announce(`Readiness check failed: ${error.message}`, true);
    }
    renderStartMark();
}

// Work IQ is optional context: its state never blocks building, and Copilot continues without it.
function renderWorkIq(result = workIq) {
    workIq = result;
    const on = $("workiq-toggle").checked;
    let text;
    let action = null;
    if (!result) text = "Checking Work IQ…";
    else if (result.status === "ready" && result.data.enabled && !result.data.error) {
        const state = result.data.live;
        text = `${state === "connected" ? "Work IQ connected." : state ? `Work IQ configured (${state}).` : "Work IQ configured."} ${on
            ? "Copilot adds relevant Microsoft 365 meetings, email and documents to the prompt and confirms them with you."
            : "Turn it on to add relevant Microsoft 365 meetings, email and documents to the prompt."}`;
    } else if (result.status === "ready" && !result.data.enabled) { text = "Work IQ is installed but turned off."; action = "Fix in Chat"; }
    else if (result.status === "ready") { text = `Work IQ can't connect: ${result.data.error}`; action = "Fix in Chat"; }
    else if (result.status === "missing") { text = "Work IQ isn't set up. It adds Microsoft 365 meetings, email and documents to the prompt."; action = "Set up Work IQ"; }
    else { text = `Couldn't check Work IQ: ${result.error}`; action = "Set up Work IQ"; }
    if (action && on) text += ` Copilot continues without it until it's ${action === "Fix in Chat" ? "fixed" : "set up"}.`;
    $("workiq-status").textContent = text;
    $("workiq-setup").hidden = !action;
    if (action) $("workiq-setup").textContent = action;
}

function updateProject(project, picked = false) {
    if (selected?.id !== project?.id) {
        inventory = null;
        $("inventory-toolbar").hidden = true;
        $("inventory").replaceChildren();
        $("inventory-updated").textContent = "";
        $("inventory-search").value = "";
        $("inventory-kind").value = "";
        $("azure-cost").replaceChildren();
        $("monitoring").replaceChildren();
        collapsedInventory.clear();
        collapsedInventory.add("resources");
    }
    selected = project;
    selectionRevision++;
    loaded.delete("explore");
    loaded.delete("optimize");
    renderProjectBar();
    renderWhere(picked);
    renderStartMark();
    renderBuild();
    renderProjects();
}

function applyResources(result, picked = false) {
    projects = result.projects;
    $("subscription").innerHTML = result.subscriptions.map(row => `<option value="${escape(row.id)}">${escape(row.name)}</option>`).join("");
    resourceSubscription = result.subscriptionId ?? result.selected?.subscriptionId ?? "";
    $("subscription").value = resourceSubscription;
    updateProject(result.selected, picked);
    if (result.warnings?.length) notice(`Some resources could not be listed: ${result.warnings.join("; ")}`, true);
}

const PROJECT_INTRO = "Copilot builds in this project. Its resource group brings the rest of your solution together.";
let projectOptions = "";

// A native dropdown keeps the picker compact: projects are grouped by resource group, and typing a name jumps to it.
// status is "loading" while discovery runs, or the Error when discovery found nothing to keep.
function renderProjects(status) {
    const select = $("project");
    const loading = status === "loading";
    const error = status instanceof Error ? status : null;
    const listed = !loading && projects.some(project => project.id === selected?.id);
    let markup;
    if (loading || !projects.length) {
        markup = `<option value="">${loading ? "Discovering projects…" : error ? "Projects unavailable" : "No projects found"}</option>`;
    } else {
        const groups = new Map(), names = new Map();
        for (const project of [...projects].sort((a, b) => a.resourceGroup.localeCompare(b.resourceGroup) || a.name.localeCompare(b.name))) {
            groups.set(project.resourceGroup, [...(groups.get(project.resourceGroup) ?? []), project]);
            names.set(project.name, (names.get(project.name) ?? 0) + 1);
        }
        // Same-named projects in different Foundry resources are told apart by their account.
        const label = project => escape(project.name) + (names.get(project.name) > 1 ? ` · ${escape(project.account)}` : "");
        markup = (listed ? "" : '<option value="" disabled>Choose a project</option>') +
            [...groups].map(([group, rows]) => `<optgroup label="${escape(group)}">${rows.map(project =>
                `<option value="${escape(project.id)}">${label(project)}</option>`).join("")}</optgroup>`).join("");
    }
    // Unchanged options are not rewritten, so the 5-second project sync leaves an open dropdown alone.
    if (markup !== projectOptions) {
        select.innerHTML = markup;
        projectOptions = markup;
    }
    // Also reverts a choice the server rejected.
    select.value = listed ? selected.id : "";
    select.disabled = loading || !projects.length;
    const help = $("project-help");
    help.classList.toggle("error", Boolean(error));
    help.innerHTML = error ? `${escape(error.message)} Refresh to retry.`
        : !loading && !projects.length ? "No Foundry projects in this subscription. Create one below or choose another subscription."
        : listed ? `Application Insights, Container Apps and other solution resources deploy to resource group <strong>${escape(selected.resourceGroup)}</strong>${selected.location ? ` (${escape(selected.location)})` : ""}.`
        : PROJECT_INTRO;
}

async function monitoring() {
    const revision = selectionRevision;
    if (!activeProject()) { $("monitoring").innerHTML = ""; return; }
    $("monitoring").innerHTML = '<p class="loading">Checking Application Insights connection…</p>';
    try {
        const result = await api("monitoring");
        if (revision !== selectionRevision) return;
        $("monitoring").innerHTML = result.connected
            ? `<p class="status-ok">✓ Application Insights connected: ${escape(result.names.join(", "))}</p><p class="muted">Connection detected; end-to-end telemetry still needs verification in your application.</p>`
            : '<div class="warning"><strong>Application Insights is not connected</strong><p>Add a project connection so traces and diagnostics have a home.</p><button data-prompt="insights">Connect in Chat</button></div>';
    } catch (error) {
        if (revision === selectionRevision) $("monitoring").innerHTML = `<div class="warning"><strong>Monitoring connection could not be verified</strong><p>${escape(error.message)}</p><button data-prompt="insights">Investigate in Chat</button></div>`;
    }
}

async function discover(subscriptionId) {
    if (discovering) return;
    discovering = true;
    const refocus = document.activeElement === $("subscription");
    $("subscription").disabled = true;
    renderWhere();
    renderProjects("loading");
    try {
        const result = await api("discover", subscriptionId ? { subscriptionId } : {});
        discoveryFailed = false;
        // A subscription the user chose counts as a pick, so step 2 stays open on the project discovery selects.
        applyResources(result, Boolean(subscriptionId));
        announce(`${projects.length} Foundry ${projects.length === 1 ? "project" : "projects"} found.`);
        await monitoring();
    } catch (error) {
        discoveryFailed = true;
        // A failed refresh keeps the server's list, subscription and selection, so the panel keeps showing them.
        $("subscription").value = resourceSubscription;
        if (projects.length) {
            renderProjects();
            notice(`Could not refresh Foundry projects: ${error.message} Current selection kept.`, true);
        } else {
            updateProject(null);
            renderProjects(error);
            announce(`Could not discover Foundry projects: ${error.message}`, true);
            $("monitoring").innerHTML = "";
        }
    } finally {
        discovering = false;
        $("subscription").disabled = false;
        renderWhere();
        // Disabling the focused subscription dropdown drops focus to the page; return it so keyboard users keep their place.
        if (refocus && (!document.activeElement || document.activeElement === document.body)) $("subscription").focus({ preventScroll: true });
    }
}

// The industry facet groups by sector, the text before ":" (for example "Government: Ops and infra").
function sector(industry) {
    return industry.split(":")[0].trim();
}

const templateRow = id => id && id !== GUIDED ? snapshot.scenarios.find(row => row.id === id) ?? null : null;
const valuesOf = (row, key) => key === "industry" ? [sector(row.industry)] : row[key] ?? [];
const searchTokens = () => $("template-search").value.toLowerCase().split(/\s+/).filter(Boolean);
const facetFiltered = () => FACETS.some(([key]) => filters[key].size);
const listText = values => values.length < 2 ? values.join("") : `${values.slice(0, -1).join(", ")} and ${values.at(-1)}`;

function searchable(row) {
    if (!haystacks.has(row.id)) {
        haystacks.set(row.id, [row.name, row.description, row.industry, ...(row.tags ?? []), ...FACETS.slice(1).flatMap(([key]) => valuesOf(row, key))].join(" ").toLowerCase());
    }
    return haystacks.get(row.id);
}

// Filters combine with OR inside a facet and AND across facets; skip leaves one facet out so its options can be counted.
function matchesFacets(row, skip) {
    return FACETS.every(([key]) => key === skip || !filters[key].size || valuesOf(row, key).some(value => filters[key].has(value)));
}

// A value every template has, such as Frontier Models, cannot narrow the results, so its menu notes it instead of offering it.
function buildFacets() {
    const rows = snapshot.scenarios;
    $("facets").innerHTML = FACETS.map(([key, label]) => {
        const values = key === "industry"
            ? [...new Set(rows.map(row => sector(row.industry)))].sort((a, b) => a.localeCompare(b)).map(value => [value, ""])
            : (snapshot.taxonomy?.[key] ?? []).filter(([value]) => rows.some(row => valuesOf(row, key).includes(value)));
        universals[key] = values.filter(([value]) => rows.every(row => valuesOf(row, key).includes(value))).map(([value]) => value);
        const options = values.filter(([value]) => !universals[key].includes(value));
        if (!options.length) return "";
        return `<details class="facet" data-facet="${key}"><summary><span>${label}</span><span class="facet-badge" hidden></span>${CHEVRON}</summary>
            <div class="facet-menu" role="group" aria-label="${label}">${options.map(([value, detail]) => `<label class="option"><input type="checkbox" data-facet-option="${key}" value="${escape(value)}"><span class="option-text">${escape(value)}${detail ? `<small>${escape(detail)}</small>` : ""}</span><span class="option-count"></span></label>`).join("")}${universals[key].length ? `<p class="facet-note">Every template includes ${escape(listText(universals[key]))}.</p>` : ""}</div></details>`;
    }).join("");
}

// Option counts follow the search and the other facets; an option that would show nothing is disabled unless checked.
function renderFacets(base) {
    for (const input of $("facets").querySelectorAll("[data-facet-option]")) {
        const key = input.dataset.facetOption;
        const count = base.filter(row => matchesFacets(row, key) && valuesOf(row, key).includes(input.value)).length;
        input.checked = filters[key].has(input.value);
        input.disabled = !count && !input.checked;
        setText(input.closest(".option").querySelector(".option-count"), String(count));
    }
    for (const facet of $("facets").querySelectorAll(".facet")) {
        const size = filters[facet.dataset.facet].size;
        const badge = facet.querySelector(".facet-badge");
        badge.hidden = !size;
        badge.innerHTML = size ? `${size}<span class="visually-hidden"> selected</span>` : "";
    }
}

function renderChips() {
    const chosen = FACETS.flatMap(([key]) => [...filters[key]].map(value => [key, value]));
    $("chips").hidden = !chosen.length;
    region("chips", $("chips"), chosen, () => chosen.map(([key, value]) =>
        `<button class="chip" data-chip="${key}" data-value="${escape(value)}" data-key="chip:${key}:${escape(value)}" aria-label="Remove ${escape(value)} filter">${escape(value)}${CLOSE_ICON}</button>`).join("") +
        (chosen.length ? '<button class="quiet" data-clear-filters data-key="clear-filters">Clear filters</button>' : ""));
}

const cardText = (id, name, description, meta) =>
    `<span class="template-text"><span class="template-name">${escape(name)}</span><span id="${escape(id)}-d" class="template-description">${escape(description)}</span><span id="${escape(id)}-m" class="template-meta">${escape(meta)}</span></span>`;

function templateCard(row) {
    const id = `t-${row.id}`;
    const meta = [sector(row.industry), valuesOf(row, "capabilities").find(value => !universals.capabilities?.includes(value)), row.patterns?.[0]].filter(Boolean).join(" · ");
    return `<li><button class="template" data-template="${escape(row.id)}" data-key="template:${escape(row.id)}" aria-label="${escape(row.name)}" aria-describedby="${escape(id)}-d ${escape(id)}-m"><img src="/${escape(row.image)}" alt="" loading="lazy" width="480" height="270">${cardText(id, row.name, row.description, meta)}</button></li>`;
}

// Shape it with Copilot stays first and visible whatever the filters, since it fits any idea.
function renderGallery() {
    const tokens = searchTokens();
    const base = snapshot.scenarios.filter(row => tokens.every(token => searchable(row).includes(token)));
    const rows = base.filter(row => matchesFacets(row));
    const sort = $("template-sort").value;
    if (sort !== "featured") rows.sort((a, b) => sort === "industry" ? a.industry.localeCompare(b.industry) || a.name.localeCompare(b.name) : (sort === "reverse" ? -1 : 1) * a.name.localeCompare(b.name));
    renderFacets(base);
    renderChips();
    const total = snapshot.scenarios.length;
    setText($("template-count"), `${tokens.length || facetFiltered() ? `${rows.length} of ` : ""}${total} prompt templates`);
    const empty = rows.length ? null : EMPTY_RESULTS[tokens.length && facetFiltered() ? "both" : tokens.length ? "search" : "filters"];
    region("templates", $("templates"), [mode, rows.map(row => row.id), empty], () =>
        `<li><button class="template guided-template" data-template="${GUIDED}" data-key="template:${GUIDED}" aria-label="${GUIDED_NAME}" aria-describedby="t-${GUIDED}-d t-${GUIDED}-m">${GUIDED_ART}${cardText(`t-${GUIDED}`, GUIDED_NAME, START[mode].guided, GUIDED_META)}</button></li>` +
        rows.map(templateCard).join("") +
        (empty ? `<li class="templates-empty"><p>No prompt templates match ${empty[0]}.</p><button class="quiet" data-clear-filters="all" data-key="clear-all">${empty[1]}</button></li>` : ""));
}

function setLayout(next, save = false) {
    const layout = next === "list" ? "list" : "gallery";
    $("templates").dataset.layout = layout;
    for (const button of document.querySelectorAll(".layout-toggle [data-layout]")) button.setAttribute("aria-pressed", String(button.dataset.layout === layout));
    if (save) api("preferences", { view: layout }).catch(error => notice(error.message, true));
}

function clearFilters(search) {
    for (const [key] of FACETS) filters[key].clear();
    if (search) $("template-search").value = "";
    renderGallery();
    $("template-search").focus();
}

// Focus moves to the next chip, then Clear filters, then search, so keyboard users keep their place.
function removeChip(button) {
    const index = [...$("chips").querySelectorAll("[data-chip]")].indexOf(button);
    filters[button.dataset.chip].delete(button.dataset.value);
    renderGallery();
    const chips = [...$("chips").querySelectorAll("[data-chip]")];
    (chips[index] ?? (chips.length ? $("chips").querySelector("[data-clear-filters]") : $("template-search"))).focus();
}

// A scenario's draft is "" while its prompt is unedited, so the server sends the packaged prompt; a guided draft is the idea.
function draftValue() {
    const text = $("prompt-text").value;
    const row = templateRow(template);
    return row && text.trim() === row.prompt.trim() ? "" : text;
}

// open: review and edit; building: Copilot works from it; unlockable: sent, with no build trace yet;
// rerun: an SDD template ready to send again; locked: rapid prototyping continues from Build.
function templateState() {
    if (!template || !templateStarted) return "open";
    if (awaitingTurn || live?.busy || (mode === "sdd" && ["running", "pending", "paused"].includes(live?.run?.status))) return "building";
    if (!live?.lock && !live?.runs?.length) return "unlockable";
    return mode === "sdd" ? "rerun" : "locked";
}

function renderReset() {
    const row = templateRow(template);
    $("template-reset").hidden = !row || $("prompt-text").readOnly || $("prompt-text").value.trim() === row.prompt.trim();
}

function renderTemplateView() {
    const active = document.activeElement;
    $("gallery").hidden = Boolean(template);
    $("template-view").hidden = !template;
    setText($("brief-title"), !template ? "Choose a prompt template" : templateStarted ? "Your prompt template" : "Review and send");
    if (template) {
        const row = templateRow(template);
        if (heroKey !== `${template}:${mode}`) {
            heroKey = `${template}:${mode}`;
            $("template-art").innerHTML = row ? `<img src="/${escape(row.image)}" alt="" width="480" height="270">` : GUIDED_ART;
            $("template-industry").textContent = row?.industry ?? GUIDED_META;
            $("prompt-title").textContent = row?.name ?? GUIDED_NAME;
            $("template-description").textContent = row?.description ?? START[mode].guided;
            $("template-tags").hidden = !row;
            $("template-tags").innerHTML = row ? FACETS.slice(1).filter(([key]) => valuesOf(row, key).length).map(([key, label]) =>
                `<div><dt>${label}</dt><dd>${valuesOf(row, key).map(value => `<span class="tag">${escape(value)}</span>`).join("")}</dd></div>`).join("") : "";
            $("prompt-label").textContent = row ? "Prompt" : "Your idea (optional)";
            $("prompt-text").placeholder = row ? "" : GUIDED_PLACEHOLDER;
        }
        const state = templateState();
        const editable = state === "open" || state === "rerun";
        const runs = live?.runs?.length ?? 0;
        $("prompt-text").readOnly = !editable;
        $("template-back").hidden = templateStarted;
        $("template-lock").hidden = !templateStarted;
        $("send-prompt").hidden = !editable;
        setText($("send-prompt"), state === "rerun" && runs ? "Start a new run" : START[mode].send);
        $("template-unlock").hidden = state !== "unlockable";
        $("track-build").hidden = !templateStarted;
        $("workiq-switch").hidden = !editable;
        $("workiq-line").hidden = !editable;
        setText($("send-hint"), state === "open" ? START[mode].hint
            : state === "rerun" ? `Edit the prompt if needed and ${runs ? "start a new run" : "send it again"}. The template stays locked for this session.`
                : TEMPLATE_HINT[state]);
        renderReset();
        renderSendState();
    }
    // A control hidden under keyboard focus hands focus to the next useful one.
    if (active?.closest("#gallery, #template-view") && active.closest("[hidden]")) {
        const next = template ? ["send-prompt", "template-unlock", "track-build"].map($).find(node => !node.hidden) ?? $("prompt-title") : $("template-search");
        next.focus({ preventScroll: true });
    }
}

function renderTemplateCta() {
    for (const button of document.querySelectorAll("[data-template-cta]")) {
        setText(button, !template ? "Start with a prompt template" : templateStarted ? "View prompt template" : "Continue with your prompt template");
        button.classList.toggle("primary", !templateStarted);
    }
    setText($("wf-empty-intro"), templateStarted ? "Copilot runs preflight in Chat; the workflow appears here when it starts." : WF_EMPTY_INTRO);
}

function showTemplate() {
    const switching = selectTab("start");
    $("brief-step").scrollIntoView({ block: "start", behavior: "instant" });
    (template ? $("prompt-title") : $("template-search")).focus({ preventScroll: true });
    switching.catch(error => notice(error.message, true));
}

function applyTemplateState(state, text = false) {
    if (text || (state.template ?? null) !== template) $("prompt-text").value = state.draft || (templateRow(state.template)?.prompt ?? "");
    template = state.template ?? null;
    templateStarted = state.started === true;
    renderTemplateView();
    renderTemplateCta();
}

// After a lock conflict, show the server's template, lock and text.
async function syncTemplate() {
    try {
        const response = await fetch("/api/state", { headers: { "X-Canvas-Token": token } });
        const value = await response.json();
        if (response.ok) applyTemplateState(value.state, true);
    } catch { /* The notice already reports the conflict. */ }
}

function openTemplate(id) {
    if (templateStarted) return;
    clearTimeout(draftSave);
    galleryReturn = { id, scrollY: window.scrollY };
    template = id;
    $("prompt-text").value = drafts.get(id) ?? templateRow(id)?.prompt ?? "";
    renderTemplateView();
    renderTemplateCta();
    $("brief-step").scrollIntoView({ block: "start", behavior: "instant" });
    $("prompt-title").focus({ preventScroll: true });
    api("preferences", { template: id, draft: draftValue() }).catch(error => { notice(error.message, true); syncTemplate(); });
}

function closeTemplate() {
    clearTimeout(draftSave);
    const id = template;
    if (draftValue()) drafts.set(id, $("prompt-text").value);
    else drafts.delete(id);
    template = null;
    renderTemplateView();
    renderTemplateCta();
    const card = $("templates").querySelector(`[data-template="${CSS.escape(id)}"]`);
    (card ?? $("template-search")).focus({ preventScroll: true });
    if (galleryReturn?.id === id) window.scrollTo({ top: galleryReturn.scrollY, behavior: "instant" });
    else card?.scrollIntoView({ block: "center", behavior: "instant" });
    galleryReturn = null;
    api("preferences", { template: "" }).catch(error => { notice(error.message, true); syncTemplate(); });
}

// Sending starts a Copilot turn; the template stays read-only until live updates report it, or for 10 seconds.
function expectTurn() {
    if (live?.busy) return;
    awaitingTurn = true;
    clearTimeout(awaitingTimer);
    awaitingTimer = setTimeout(() => { awaitingTurn = false; renderTemplateView(); }, 10_000);
}

function table(headers, rows, label) {
    return `<div class="table-scroll" tabindex="0" role="region" aria-label="${escape(label)}"><table><thead><tr>${headers.map(header => `<th scope="col">${escape(header)}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${escape(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

const external = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/></svg>';

function renderInventory() {
    if (!inventory) return;
    const project = activeProject();
    const query = $("inventory-search").value.trim().toLowerCase();
    const kind = $("inventory-kind").value;
    let count = 0;
    let errors = 0;
    const groups = Object.entries(inventoryGroups).filter(([key]) => !kind || key === kind).map(([key, group]) => {
        const list = inventory[key];
        const failed = list.status === "error";
        const rows = failed ? [] : list.data.filter(row =>
            `${row.name} ${row.detail ?? ""} ${(row.metadata ?? []).map(item => `${item.label} ${item.value}`).join(" ")}`.toLowerCase().includes(query))
            .sort((a, b) => a.name.localeCompare(b.name));
        count += rows.length;
        if (failed) errors++;
        if (query && !rows.length && !failed) return "";
        const expanded = failed || query || !collapsedInventory.has(key);
        const portal = key === "resources" ? "Azure" : "Foundry";
        const content = failed
            ? `<div class="inventory-empty"><p class="error">${escape(list.error)}</p><button data-inventory-retry>Retry resource discovery</button></div>`
            : rows.length ? `<ul class="resource-list">${rows.map(row => `<li class="resource-item"><div class="resource-content"><strong class="resource-name">${escape(row.name)}</strong>${row.metadata?.length
                ? `<dl class="resource-metadata">${row.metadata.map(item => `<div><dt>${escape(item.label)}</dt><dd>${escape(item.value)}</dd></div>`).join("")}</dl>`
                : `<p class="resource-description">${escape(row.detail)}</p>`}</div><div class="resource-actions">${row.playgroundUrl
                    ? `<a class="resource-test" href="${escape(row.playgroundUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Test ${escape(row.name)} in Foundry (opens in a new tab)">Test in Foundry ${external}</a>` : ""}${row.portalUrl
                    ? `<a class="resource-test" href="${escape(row.portalUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${escape(row.name)} in ${portal} Portal (opens in a new tab)">Open in ${portal} Portal ${external}</a>` : ""}${key === "agents" && project
                    ? `<button class="resource-test" data-inspect-agent="${escape(row.name)}" data-inspect-project="${escape(project.id)}" title="Ask Copilot in Chat to launch Agent Inspector for this agent" aria-label="Inspect ${escape(row.name)} locally via Chat">Inspect locally</button>` : ""}</div></li>`).join("")}</ul>`
            : `<div class="inventory-empty"><strong>${escape(group.empty)}</strong><p>${escape(group.hint)}</p></div>`;
        return `<details class="inventory-section" data-inventory-group="${key}" ${expanded ? "open" : ""}>
            <summary><svg class="resource-icon" viewBox="0 0 24 24" aria-hidden="true">${group.icon}</svg><span class="inventory-heading"><span class="inventory-title">${group.title}</span><span class="inventory-scope">${group.scope}</span></span><span class="${failed ? "inventory-unavailable" : "inventory-badge"}">${failed ? "Unavailable" : query ? `${rows.length} / ${list.data.length}` : list.data.length}</span><svg class="inventory-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></summary>
            ${content}</details>`;
    }).join("");
    $("inventory-count").textContent = `${count} ${query ? "matching " : ""}${count === 1 ? "entry" : "entries"}${errors ? ` · ${errors} unavailable ${errors === 1 ? "section" : "sections"}` : ""}`;
    $("inventory").innerHTML = groups || '<div class="inventory-empty"><strong>No matching resources</strong><p>Try another name or clear the filters to see all resources.</p></div>';
}

const noProject = what => mode === "sdd"
    ? `<p class="muted">The SDD workflow creates your Foundry project during Implement. ${what} appear here once it exists.</p>`
    : `<p class="muted">Select a project on Start to ${what === "Azure charges" ? "query Azure spend" : "explore its resources"}.</p>`;

async function explore() {
    const revision = selectionRevision;
    $("inventory-toolbar").hidden = true;
    $("inventory-updated").textContent = "";
    inventory = null;
    if (!activeProject()) { $("inventory").innerHTML = noProject("Its agents, models and resources"); return; }
    $("inventory").innerHTML = '<p class="loading">Reading your Foundry project…</p>';
    try {
        const result = await api("explore");
        if (revision !== selectionRevision) return;
        inventory = result;
        $("inventory-toolbar").hidden = false;
        renderInventory();
        $("inventory-updated").textContent = `Retrieved ${new Date(result.checkedAt).toLocaleTimeString()}. Private endpoints require network access. Testing in Foundry requires sign-in and can incur model or agent usage charges.`;
    } catch (error) { if (revision === selectionRevision) failure($("inventory"), error); }
}

async function usage() {
    if (usageLoading) return;
    usageLoading = true;
    try {
        const metrics = await api("usage");
        if (!snapshot.sessionId || metrics.sessionId !== snapshot.sessionId) {
            throw new Error("Usage belongs to a different or unidentified session. Reopen this canvas from the intended session.");
        }
        const count = value => typeof value === "number" && Number.isFinite(value) ? number(value) : "—";
        const rows = Object.entries(metrics.modelMetrics).filter(([, value]) => value).map(([name, value]) => [
            name, count(value.usage?.inputTokens), count(value.usage?.outputTokens), count(value.usage?.cacheReadTokens),
            count(value.usage?.cacheWriteTokens), count(value.usage?.reasoningTokens), count(value.requests?.count),
        ]);
        const tokens = Object.entries(metrics.tokenDetails ?? {}).filter(([, value]) => value)
            .map(([kind, value]) => [kind.replaceAll("_", " "), count(value.tokenCount)]);
        $("usage").innerHTML = `<p class="muted">Copilot session <span class="usage-session-id">${escape(metrics.sessionId)}</span>${metrics.sessionStartTime ? ` · Started ${escape(new Date(metrics.sessionStartTime).toLocaleString())}` : ""}</p>` +
            `<h4>Session accounting</h4><p>${metrics.totalNanoAiu == null ? "AI credits unavailable" : `${count(metrics.totalNanoAiu / 1e9)} AI credits`}</p>` +
            (tokens.length ? table(["Token category", "Reported tokens"], tokens, "Session token accounting") : '<p class="muted">Session token accounting is unavailable from this runtime.</p>') +
            '<h4>Live model breakdown</h4>' +
            (rows.length ? table(["Model", "Input", "Output", "Cache read", "Cache write", "Reasoning", "Calls"], rows, "Live model usage breakdown") : '<p class="muted">No model breakdown returned by the runtime. This does not establish zero session usage.</p>') +
            `<p class="muted">${count(metrics.totalUserRequests)} runtime-reported user requests · ${metrics.totalApiDurationMs == null ? "API time unavailable" : `${(metrics.totalApiDurationMs / 1000).toFixed(1)}s model API time`}</p>` +
            '<p class="muted">After resume, token, request and model counters may cover different periods from session credits; they are not guaranteed lifetime totals. Missing history is not treated as zero. Accounting categories and live token counters are separate measures, not additive. Copilot credits are not USD or Azure usage.</p>' +
            `<p class="muted">Updated ${escape(new Date(metrics.checkedAt).toLocaleTimeString())}. Refreshes every 15 seconds while Optimize is visible.</p>`;
    } catch (error) { failure($("usage"), error); }
    finally { usageLoading = false; }
}

async function costs() {
    const revision = selectionRevision;
    const usagePromise = usage();
    if (!activeProject()) { $("azure-cost").innerHTML = noProject("Azure charges"); await usagePromise; return; }
    $("azure-cost").innerHTML = '<p class="loading">Querying Azure Cost Management…</p>';
    try {
        const result = await api("cost");
        if (revision !== selectionRevision) return;
        $("azure-cost").innerHTML = result.rows.length ? table(["Service", "Actual cost"], result.rows.map(row => [row.service, money(row.amount, row.currency)]), "Azure spend by service, month to date") : '<p class="muted">Azure returned no charges for this period. This does not guarantee zero cost.</p>';
        $("azure-cost").innerHTML += `<p class="muted">Retrieved ${escape(new Date(result.checkedAt).toLocaleTimeString())}</p>`;
    } catch (error) { if (revision === selectionRevision) failure($("azure-cost"), error); }
    await usagePromise;
}

const STATUS = {
    pending: ["Starting", "accent"], running: ["Running", "accent"], paused: ["Paused", "warning"],
    completed: ["Completed", "success"], halted: ["Halted", "warning"], error: ["Failed", "error"], cancelled: ["Cancelled", "muted"],
};
const VIEW = {
    pending: ["", "Not started"], active: ["", "In progress"], waiting: ["attention", "Waiting for you"], paused: ["paused", "Paused"],
    completed: ["done", "Done"], failed: ["failed", "Needs attention"], stopped: ["skipped", "Stopped"], skipped: ["skipped", "Skipped"],
};
const isLive = run => run?.status === "running" || run?.status === "pending";
const statusOf = run => run.status === "paused" && run.checkpoint ? ["Needs you", "warning"] : STATUS[run.status] ?? [run.status, "muted"];

// Re-render a region only when its data changes, keeping keyboard focus on the same control.
function region(key, node, value, html) {
    const signature = JSON.stringify(value);
    if (regions[key] === signature) return false;
    regions[key] = signature;
    const focused = node.contains(document.activeElement) ? document.activeElement.dataset.key : null;
    node.innerHTML = typeof html === "function" ? html() : html;
    if (focused) node.querySelector(`[data-key="${CSS.escape(focused)}"]`)?.focus({ preventScroll: true });
    return true;
}

function phaseView(phase, run) {
    if (run.pause?.phase === phase.title) return "waiting";
    if (phase.status === "active") {
        if (isLive(run)) return "active";
        if (run.status === "paused") return "paused";
        if (run.status === "error" || run.status === "halted") return "failed";
        if (run.status === "cancelled") return "stopped";
        return "completed";
    }
    if (phase.status === "completed") return phase.gate && phase.gate.status !== "passed" ? "failed" : "completed";
    if (phase.status === "pending" && run.status === "completed") return "skipped";
    return phase.status === "skipped" ? "skipped" : "pending";
}

const artifactExists = (run, file) => file === LESSONS ? run.loop : run.phases.some(phase => phase.artifacts.some(row => row.path === file && row.exists));
const artifactButton = (run, file, label, key = `artifact:${file}`) => `<button data-artifact="${escape(file)}" data-key="${escape(key)}"${artifactExists(run, file) ? "" : ' disabled title="Not written yet"'}>${escape(label)}</button>`;

const RUNNING = new Set(["running", "active"]);
const elapsed = value => Number.isFinite(toTime(value)) ? ` · <span class="since" data-since="${toTime(value)}" title="Time on this step">${duration(Date.now() - toTime(value))}</span>` : "";

// What the phase is doing right now: the running agents with their elapsed time, then the last completed step.
function nowLines(phase, run) {
    const latest = run.log.findLast(row => row.kind === "log" && !/^(Brief|\w+ gate):/.test(row.text));
    const last = latest ? `<p class="now"><span class="muted">Last</span> ${escape(latest.text)}</p>` : "";
    const running = phase.agents.filter(agent => RUNNING.has(agent.status));
    const name = agent => String(agent.label ?? "").replace(`${phase.title} · `, "");
    if (running.length === 1) {
        const [agent] = running;
        return `<p class="now"><span class="muted">Now</span> ${escape(name(agent))}${agent.activity ? ` · ${escape(agent.activity)}` : ""}${elapsed(agent.startedAt)}</p>${last}`;
    }
    if (running.length > 1) return `<p class="now"><span class="muted">Now</span> ${running.length} agents in parallel: ${escape(running.map(name).join(", "))}</p>${last}`;
    return latest ? `<p class="now"><span class="muted">Now</span> ${escape(latest.text)}</p>` : "";
}

function renderPhase(phase, index, run) {
    const view = phaseView(phase, run);
    const [badge, label] = VIEW[view];
    const started = view !== "pending" && view !== "skipped";
    const gate = phase.gate ? `<p class="gate"><span class="badge" data-gate="${escape(phase.gate.status)}">Gate ${escape(phase.gate.status)}</span>${phase.gate.summary ? ` ${escape(phase.gate.summary)}` : ""}</p>` : "";
    const now = view === "active" ? nowLines(phase, run) : "";
    const agents = phase.agents.slice(0, 6).map(agent => `<li class="agent" data-status="${escape(agent.status)}" title="${escape([agent.model, agent.activity].filter(Boolean).join(" · ") || agent.status)}"><span class="dot" aria-hidden="true"></span>${escape(agent.label)}<span class="visually-hidden">, ${escape(agent.status)}</span></li>`).join("") +
        (phase.agents.length > 6 ? `<li class="agent more">+${phase.agents.length - 6} more</li>` : "");
    const artifacts = started && phase.artifacts.length ? `<div class="artifacts">${phase.artifacts.map(row => artifactButton(run, row.path, row.path.split("/").at(-1))).join("")}</div>` : "";
    return `<li class="phase" data-view="${view}"${view === "active" || view === "waiting" ? ' aria-current="step"' : ""}>
        <span class="phase-icon" aria-hidden="true">${index + 1}${stepBadge(badge)}</span>
        <div class="phase-body">
            <div class="phase-head"><h3>${escape(phase.title)}</h3><span class="phase-state">${label}${started ? ` · <span data-duration="${index}">${duration(phase.activeMs)}</span>` : ""}</span></div>
            ${started && (phase.gate || phase.agents.length || now) ? "" : `<p class="muted">${escape(PHASE_COPY[phase.title])}</p>`}
            ${gate}
            ${now}
            ${agents ? `<ul class="agents" aria-label="${escape(phase.title)} agents">${agents}</ul>` : ""}
            ${artifacts}
        </div></li>`;
}

const LIMIT_TEXT = {
    maxTotalSubagents: ["agent limit", value => `${value} agents`],
    timeoutSeconds: ["time limit", value => duration(value * 1000)],
    maxAiCredits: ["AI credit limit", value => `${value} AI credits`],
};
const raisable = failure => failure?.type === "workflow_limit_reached" && Number.isFinite(failure.suggestedValue) && LIMIT_TEXT[failure.kind];

function formatFailure(failure) {
    if (failure?.type === "workflow_limit_reached") {
        const [label, format] = LIMIT_TEXT[failure.kind] ?? ["limit", String];
        return `The run reached its ${label} (${format(failure.value)}). Nothing was lost; resume to continue from the last completed step.`;
    }
    if (failure?.type === "workflow_resume_declined") return `Resume was declined: ${failure.reason}`;
    return null;
}

function feedbackBlock(label, placeholder, send) {
    return `<div id="wf-changes" class="changes" hidden>
        <label for="wf-feedback">${label}</label>
        <textarea id="wf-feedback" data-key="feedback" rows="4" maxlength="8000" placeholder="${escape(placeholder)}"></textarea>
        <div class="actions"><button data-wf="changes-send" data-key="changes-send" disabled>${send}</button></div>
        <p class="muted">Copilot applies the changes in Chat and leaves the run paused. Approve here when you are satisfied.</p>
    </div>`;
}

// The next decision the run will ask for, from its arguments in the flight record.
function nextDecision(run, phase) {
    const plan = run.plan;
    const fixes = Number.isInteger(plan?.maxFixLoops) ? ` after ${plan.maxFixLoops} automatic ${plan.maxFixLoops === 1 ? "fix" : "fixes"}` : " after its automatic fixes";
    const stuck = `If a gate still fails${fixes}, the run pauses here and lists the issues.`;
    if (!plan) return `The run pauses here when it needs a decision. ${stuck}`;
    if (phase === "Deploy") return "Nothing more. The endpoints appear here when Deploy finishes.";
    const specPending = run.phases.find(row => row.title === "Specify")?.gate?.status !== "passed";
    const end = plan.to ?? (plan.skipDeploy ? "Verify" : "Deploy");
    if (plan.autonomy === "gated" && specPending && end !== "Specify") return `Approve the spec when Specify passes. Nothing is provisioned before then. ${stuck}`;
    if (end === "Verify") return `Nothing until the run ends after Verify; you deploy later from Chat. ${stuck}`;
    if (end !== "Deploy") return `Nothing until the run ends after ${end}, as requested. ${stuck}`;
    return `Approve deployment when Verify passes. ${stuck}`;
}

function calloutHtml(run) {
    const phase = run.phases.find(row => row.status === "active")?.title ?? run.phase ?? "the next phase";
    const cancel = '<button data-wf="cancel" data-key="cancel" class="danger-quiet">Cancel run</button>';
    const improve = `<button data-prompt="improve" data-run="${escape(run.runId)}" data-key="improve">Improve the loop</button>`;
    const box = (tone, title, body) => `<div class="callout" data-tone="${tone}" role="group" aria-labelledby="wf-callout-title"><h3 id="wf-callout-title">${title}</h3>${body}</div>`;
    if (isLive(run)) {
        const agents = run.metrics.liveAgents;
        const working = agents ? `${agents} ${agents === 1 ? "agent is" : "agents are"} working in the background` : "The run continues in the background";
        return box("accent", `Working on ${escape(phase)}`, `<p><strong>No input needed.</strong> ${working}; keep using Chat.</p>
            <p><strong>Next for you:</strong> ${escape(nextDecision(run, phase))}</p>
            <div class="actions"><button data-wf="pause" data-key="pause">Pause</button>${cancel}</div>`);
    }
    const since = run.changes ? `<p><strong>Since you approved it, these changed:</strong> ${escape(run.changes)}</p>` : "";
    if (run.status === "paused" && run.pause?.kind === "approve" && run.pause.phase === "Specify") {
        const intro = run.pause.again
            ? "The spec or deployment plan changed after you approved it. Implement does not continue on a changed spec until you approve it again."
            : "The spec and deployment plan are ready. Approving starts Implement, which provisions the Foundry project and the resources in the plan. Ask for changes first if anything is off.";
        return box("warning", run.pause.again ? "Approve the spec again" : "Review the spec", `<p>${intro}</p>${since}
            <div class="actions">${artifactButton(run, "docs/spec.md", "Open spec")}${artifactButton(run, ".azure/deployment-plan.md", "Open deployment plan")}</div>
            <div class="actions"><button class="primary" data-wf="resume" data-key="approve">${run.pause.again ? "Approve spec again" : "Approve spec and continue"}</button><button data-wf="changes-toggle" data-key="changes" aria-expanded="false" aria-controls="wf-changes">Request changes</button>${cancel}</div>
            ${feedbackBlock("What should change in the spec?", "For example: add an escalation agent for refunds over $500; keep the web UI read-only.", "Send changes to Chat")}`);
    }
    if (run.status === "paused" && run.pause?.kind === "blocked") {
        const { phase: blocked, round } = run.pause;
        const row = run.phases.find(item => item.title === blocked);
        const blocker = run.blocker;
        const fixes = blocker?.fixes ? ` after ${blocker.fixes} automatic ${blocker.fixes === 1 ? "fix" : "fixes"}` : "";
        const title = blocker?.status === "failed" ? `${blocked} still fails its gate${fixes}` : blocker ? `${blocked} is blocked` : `${blocked} needs you`;
        const issues = blocker?.issues ?? [];
        const list = issues.length ? `<p class="issues-head">${issues.length === 1 ? "Fix this issue" : `Fix these ${issues.length} issues`}, then resume:</p><ol class="issues">${issues.map(issue => `<li>${escape(issue)}</li>`).join("")}</ol>` : "";
        const files = (row?.artifacts ?? []).map(file => artifactButton(run, file.path, `Open ${file.path.split("/").at(-1)}`)).join("");
        return box("warning", escape(title), `<p>${escape(blocker?.summary || row?.gate?.summary || BLOCKED_COPY[blocked])}</p>${list}
            <div class="actions">${files}${run.loop ? artifactButton(run, LESSONS, "Open LOOP.md") : ""}</div>
            <details class="guidance"><summary>Add guidance for the fix</summary><label for="wf-feedback" class="visually-hidden">Guidance for the fix</label><textarea id="wf-feedback" data-key="feedback" rows="3" maxlength="8000" placeholder="Optional: point Copilot at the cause, a region with quota or an acceptable trade-off."></textarea></details>
            <div class="actions"><button class="primary" data-wf="fix" data-key="fix">Fix in Chat</button><button data-wf="resume" data-key="retry">Resume and retry ${escape(blocked)}</button>${cancel}</div>
            <p class="muted">Fixing in Chat leaves the run paused. Resume when Copilot reports the fix; ${escape(blocked)} then runs again as attempt ${round + 1}, and its review first confirms these issues are resolved.</p>`);
    }
    if (run.status === "paused" && run.pause?.kind === "approve" && run.pause.phase === "Deploy") {
        const intro = run.pause.again
            ? "The deployment plan or verification report changed after you approved deployment. Deploy does not run on a changed plan until you approve it again."
            : "Verify passed. Deploying runs azd up, which publishes the agents and apps and adds billable compute. Check the region, resources and cost estimate in the deployment plan first.";
        return box("warning", run.pause.again ? "Approve deployment again" : "Approve deployment", `<p>${intro}</p>${since}
            <div class="actions">${artifactButton(run, ".azure/deployment-plan.md", "Open deployment plan")}${artifactButton(run, "docs/verify.md", "Open verification report")}</div>
            <div class="actions"><button class="primary" data-wf="resume" data-key="approve">${run.pause.again ? "Approve deployment again" : "Approve deployment"}</button><button data-wf="changes-toggle" data-key="changes" aria-expanded="false" aria-controls="wf-changes">Request changes</button>${cancel}</div>
            ${feedbackBlock("What should change before deployment?", "For example: deploy to Sweden Central; use the S0 tier for search.", "Send changes to Chat")}`);
    }
    if (run.status === "paused" && run.pause?.kind === "record") {
        return box("warning", "The flight record could not be saved", `<p>${escape(run.needs || "Needs you: the flight record could not be written. Fix the cause (disk space, permissions or a link in .agentic-loop), then resume.")}</p>
            <p class="muted">The run does not continue without its flight record. Resume after fixing the cause; the run picks up where it stopped.</p>
            <div class="actions"><button class="primary" data-wf="resume" data-key="resume">Resume</button>${cancel}</div>`);
    }
    if (run.status === "paused") {
        return box("warning", `Paused during ${escape(phase)}`, run.canResume
            ? `<p>Resume continues from the last completed step.</p><div class="actions"><button class="primary" data-wf="resume" data-key="resume">Resume</button>${cancel}</div>`
            : `<p>This run cannot be resumed. Start a new run from the Start tab.</p><div class="actions"><button data-go="start">Start a new run</button></div>`);
    }
    if (run.status === "completed") {
        const deployed = frontendState?.frontends.find(row => row.key === "deployed" && row.configured && !row.error);
        const endpoints = run.outcome?.endpoints?.length
            ? `<ul class="endpoints" aria-label="Endpoints">${run.outcome.endpoints.map(row => isLoopback(row.url)
                ? `<li>${escape(row.name)} <code>${escape(row.url)}</code></li>`
                : `<li><a href="${escape(row.url)}" target="_blank" rel="noopener noreferrer">${escape(row.name)} <span aria-hidden="true">↗</span><span class="visually-hidden"> (opens in a new tab)</span></a></li>`).join("")}</ul>` : "";
        if (["specified", "implemented"].includes(run.outcome?.status)) {
            const end = run.outcome.status === "specified" ? "Specify" : "Implement";
            return box("success", `Stopped after ${end}`, `<p>The run ended after ${end}, as requested, and its gate passed. Start a run from the next phase in Chat to continue.</p>${endpoints}
                <div class="actions">${artifactButton(run, "docs/spec.md", "Open spec")}${improve}</div>`);
        }
        if (run.outcome?.status === "verified") {
            return box("success", "Verified, ready to deploy", `<p>Specified, implemented and verified. This run skipped Deploy; Copilot asks for your approval before azd up.</p>${endpoints}
                <div class="actions"><button class="primary" data-prompt="deploy" data-run="${escape(run.runId)}" data-key="deploy">Deploy from Chat</button>${artifactButton(run, "docs/verify.md", "Open verification report")}${artifactButton(run, ".azure/deployment-plan.md", "Open deployment plan")}${improve}</div>`);
        }
        return box("success", "Delivered", `<p>${run.outcome?.status === "deployed" ? "Specified, implemented, verified and deployed." : "The run completed."} Every phase left its evidence in the workspace.</p>${endpoints}
            <div class="actions">${deployed ? '<button class="primary" data-frontend="deployed" data-key="deployed">Open deployed app</button>' : ""}${artifactButton(run, "docs/deploy.md", "Open deployment report")}<button data-go="explore" data-key="explore">Explore resources</button>${improve}${run.loop ? artifactButton(run, LESSONS, "Open LOOP.md") : ""}</div>`);
    }
    if (run.status === "error" || run.status === "halted") {
        const message = run.error || formatFailure(run.failure) || run.reason || "The run stopped before finishing.";
        const title = run.status === "error" ? "Workflow failed" : "Workflow halted";
        const tone = run.status === "error" ? "error" : "warning";
        if (run.canResume && raisable(run.failure)) {
            const [, format] = LIMIT_TEXT[run.failure.kind];
            return box(tone, title, `<p>${escape(message)}</p>
                <div class="actions"><button class="primary" data-wf="raise" data-key="raise">Resume with ${escape(format(run.failure.suggestedValue))}</button>${improve}<button data-go="start" data-key="new">Start a new run</button></div>`);
        }
        return box(tone, title, `<p>${escape(message)}</p>
            <details class="guidance"><summary>Add guidance for the fix</summary><label for="wf-feedback" class="visually-hidden">Guidance for the fix</label><textarea id="wf-feedback" data-key="feedback" rows="3" maxlength="8000" placeholder="Optional: point Copilot at the cause, a region with quota or an acceptable trade-off."></textarea></details>
            <div class="actions"><button class="primary" data-wf="fix" data-key="fix">Fix in Chat</button>${run.canResume ? '<button data-wf="resume" data-key="resume">Resume</button>' : ""}${improve}<button data-go="start" data-key="new">Start a new run</button></div>
            ${run.canResume ? '<p class="muted">Fixing in Chat leaves the run stopped. Resume when Copilot reports the fix.</p>' : ""}`);
    }
    return box("muted", "Run cancelled", `<p>Nothing else runs for this workflow. Artifacts written so far stay in your workspace.</p><div class="actions"><button data-go="start" data-key="new">Start a new run</button></div>`);
}

function renderWorkflow(snap) {
    const run = snap.run;
    $("wf-error").hidden = !snap.error;
    $("wf-error").textContent = snap.error ? `Workflow status could not be refreshed: ${snap.error}` : "";
    $("wf-empty").hidden = Boolean(run);
    $("wf-run").hidden = !run;
    if (!run) return;
    $("wf-picker-row").hidden = snap.runs.length < 2;
    region("picker", $("wf-picker"), [snap.runs.map(row => [row.runId, row.status, row.checkpoint]), run.runId], () => snap.runs.map(row => {
        const created = new Date(toTime(row.createdAt));
        return `<option value="${escape(row.runId)}"${row.runId === run.runId ? " selected" : ""}>${escape(created.toLocaleDateString([], { month: "short", day: "numeric" }))} ${escape(clock(created))} · ${escape(statusOf(row)[0])}</option>`;
    }).join(""));
    $("wf-brief").textContent = run.brief ?? "SDD workflow run";
    const [label, tone] = statusOf(run);
    $("wf-status").textContent = label;
    $("wf-status").dataset.tone = tone;
    const credits = run.metrics.credits;
    $("wf-meta").innerHTML = `Started ${escape(clock(run.createdAt))} · Active <span data-duration="run">${duration(run.metrics.activeMs)}</span> · ${number(run.metrics.subagents)} ${run.metrics.subagents === 1 ? "agent" : "agents"}${credits ? ` · ${credits.toLocaleString(undefined, { maximumFractionDigits: 2 })} AI credits` : ""}`;
    $("wf-meta").title = "AI credits are Copilot usage by this run's agents. Azure charges are separate; see Optimize.";
    const prior = $("wf-changes");
    const draft = { key: `${run.runId}:${run.checkpoint}`, value: $("wf-feedback")?.value ?? "", open: prior ? !prior.hidden : false, details: document.querySelector("#wf-callout details")?.open ?? false };
    const deployed = Boolean(frontendState?.frontends.some(row => row.key === "deployed" && row.configured && !row.error));
    const calloutKey = [run.runId, run.status, run.checkpoint, run.canResume, run.phase, run.metrics.liveAgents, run.outcome, run.plan, run.blocker, run.needs, run.changes, run.error, run.failure, run.reason, run.loop, deployed,
        run.phases.map(row => [row.gate, row.artifacts])];
    if (region("callout", $("wf-callout"), calloutKey, () => calloutHtml(run)) && draft.key === regions.draftKey) {
        if ($("wf-feedback")) $("wf-feedback").value = draft.value;
        if (draft.open && $("wf-changes")) toggleChanges(true, false);
        const details = document.querySelector("#wf-callout details");
        if (details && draft.details) details.open = true;
        const send = $("wf-callout").querySelector('[data-wf="changes-send"]');
        if (send) send.disabled = !draft.value.trim();
    }
    regions.draftKey = `${run.runId}:${run.checkpoint}`;
    const latest = run.log.findLast(row => row.kind === "log")?.seq;
    const stable = run.phases.map(row => ({ ...row, activeMs: 0, agents: row.agents.map(agent => ({ ...agent, activeMs: 0 })) }));
    region("phases", $("wf-phases"), [run.runId, run.status, run.checkpoint, latest, stable],
        () => run.phases.map((phase, index) => renderPhase(phase, index, run)).join(""));
    $("wf-log-count").textContent = run.log.length ? `· ${run.log.length} ${run.log.length === 1 ? "entry" : "entries"}` : "";
    region("log", $("wf-log"), [run.runId, run.log.at(-1)?.seq], () => [...run.log].reverse().map(row =>
        `<li${row.kind === "phase" ? ' class="phase-line"' : ""}><time datetime="${escape(iso(row.at))}">${escape(clock(row.at, true))}</time><span>${escape(row.text)}</span></li>`).join("") ||
        '<li class="muted">No activity yet.</li>');
    tick();
}

// Durations advance locally between live snapshots while a run is executing.
function tick() {
    const run = live?.run;
    if (!run) return;
    const extra = isLive(run) ? Date.now() - liveReceivedAt : 0;
    const runNode = document.querySelector('#wf-meta [data-duration="run"]');
    if (runNode) runNode.textContent = duration(run.metrics.activeMs + extra);
    run.phases.forEach((phase, index) => {
        const node = document.querySelector(`#wf-phases [data-duration="${index}"]`);
        if (node) node.textContent = duration(phase.activeMs + (phase.status === "active" ? extra : 0));
    });
    if (isLive(run)) document.querySelectorAll("#wf-phases [data-since]").forEach(node => { node.textContent = duration(Date.now() - Number(node.dataset.since)); });
}

function applyLive(snap, initial = false) {
    if (!snap || typeof snap.version !== "number" || snap.version < liveVersion) return;
    liveVersion = snap.version;
    liveReceivedAt = Date.now();
    live = snap;
    const fresh = knownRuns ? snap.runs.find(row => !knownRuns.has(row.runId)) : null;
    knownRuns = new Set(snap.runs.map(row => row.runId));
    const started = !initial && !lock && Boolean(snap.lock) && activeTab === "start";
    const openBuild = !initial && activeTab !== "build" && ((Boolean(fresh) && (snap.mode ?? mode) === "sdd") || started);
    const finished = snap.run?.status === "completed" ? snap.run.runId : null;
    const openExplore = !initial && !openBuild && finished && finished !== completedRun && lastRunStatus === `${finished}:live` && activeTab !== "explore";
    completedRun = finished ?? completedRun;
    lastRunStatus = snap.run ? `${snap.run.runId}:${snap.run.status === "completed" ? "completed" : "live"}` : null;
    lock = snap.lock ?? null;
    if (!modePending && snap.mode && snap.mode !== mode) applyMode(snap.mode);
    if (openBuild) autoTab("build", "A build started. Follow it on Build.", "Open Build", false);
    if (openExplore) autoTab("explore", "The workflow completed. Try the solution from Explore.", "Open Explore");
    renderModeHint();
    const checkpoint = snap.run?.checkpoint ? `${snap.run.runId}:${snap.run.checkpoint}` : null;
    if (!initial && !openBuild && checkpoint && checkpoint !== lastCheckpoint && activeTab !== "build") {
        notice(`${snap.run.pause?.phase ?? "The workflow"} needs your decision.`, false, { go: "build", label: "Review" });
    }
    lastCheckpoint = checkpoint;
    document.body.classList.toggle("is-busy", Boolean(snap.busy));
    if (snap.busy) {
        awaitingTurn = false;
        clearTimeout(awaitingTimer);
    }
    renderWorkflow(snap);
    renderBuild();
    if (snapshot) renderTemplateView();
    updateDock();
}

const liveConnection = new LiveConnection();

// After about 15 s of failed polls a banner says so until a poll succeeds; leaving the page aborts the poll in flight.
function liveLoop() {
    return liveConnection.run({
        request: async signal => {
            const response = await fetch(`/api/live?v=${liveVersion}`, { headers: { "X-Canvas-Token": token }, cache: "no-store", signal });
            const value = await response.json();
            if (!response.ok) throw new Error(value.error || `Live updates failed (${response.status}).`);
            return value;
        },
        apply: applyLive,
        sleep,
        onState: disconnected => { $("live-status").hidden = !disconnected; },
    });
}
addEventListener("pagehide", () => liveConnection.stop());
addEventListener("pageshow", event => { if (event.persisted) liveLoop(); });

function toggleChanges(open, focus = true) {
    const toggle = $("wf-callout").querySelector('[data-wf="changes-toggle"]');
    if (!toggle || !$("wf-changes")) return;
    $("wf-changes").hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    if (open && focus) $("wf-feedback").focus();
}

const RESUMED = {
    "approve-spec-v1": "Spec approved. Implement is starting.",
    "approve-deploy-v1": "Deployment approved. azd up is deploying your solution.",
};
const resumedText = pause => RESUMED[pause?.key]
    ?? (pause?.kind === "approve" && pause.again ? (pause.phase === "Specify" ? "Spec approved again. Implement continues." : "Deployment approved again. azd up is deploying your solution.")
        : pause?.kind === "blocked" ? `Resumed. ${pause.phase} runs again.`
            : pause?.kind === "record" ? "Resumed. The run retries saving its flight record." : "Resumed.");
let cancelTimer;

function workflowAction(button) {
    const run = live?.run;
    if (!run) return;
    const runId = run.runId;
    const action = button.dataset.wf;
    if (action === "changes-toggle") { toggleChanges($("wf-changes").hidden); return; }
    if (action === "cancel" && !button.dataset.confirm) {
        button.dataset.confirm = "1";
        button.classList.add("danger");
        button.textContent = "Confirm cancel";
        clearTimeout(cancelTimer);
        cancelTimer = setTimeout(() => {
            if (!button.isConnected) return;
            delete button.dataset.confirm;
            button.classList.remove("danger");
            button.textContent = "Cancel run";
        }, 4000);
        return;
    }
    busy(button, async () => {
        if (action === "resume") {
            await api("workflow_resume", { runId });
            notice(resumedText(run.pause));
        } else if (action === "raise") {
            await api("workflow_resume", { runId, raiseLimit: true });
            notice("Resumed with a higher limit.");
        } else if (action === "pause") {
            await api("workflow_pause", { runId });
            notice("Pausing. The current step finishes first.");
        } else if (action === "cancel") {
            clearTimeout(cancelTimer);
            await api("workflow_cancel", { runId });
            notice("Run cancelled. Artifacts written so far stay in your workspace.");
        } else if (action === "changes-send" || action === "fix") {
            const text = $("wf-feedback")?.value.trim() ?? "";
            if (action === "changes-send" && !text) { $("wf-feedback")?.focus(); throw new Error("Describe the changes first."); }
            await api("prompt", { kind: "changes", runId, ...(text ? { text } : {}) });
            if ($("wf-feedback")) $("wf-feedback").value = "";
            regions.draftKey = null;
            if (action === "changes-send") toggleChanges(false);
            notice(action === "changes-send" ? "Sent to Chat. The run stays paused until you approve here."
                : run.canResume ? "Sent to Chat. Resume here after Copilot reports the fix." : "Sent to Chat. Start a new run after Copilot reports the fix.");
        }
    });
}

// Enablement dock: rotating tips matched to the build mode and active phase, shown after 30 seconds of Copilot work.
const DOCK_DELAY = 30_000;
const DOCK_SOURCES = { foundry: "Microsoft Foundry", azure: "Azure", github: "GitHub", loop: "Agentic Loop" };
const dock = { cards: [], pool: [], index: -1, key: undefined, swap: null, busySeen: null };

function shuffle(list) {
    for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
}

function currentPhase() {
    const run = live?.run;
    return mode === "sdd" && isLive(run) ? run.phases.find(row => row.status === "active") ?? null : null;
}

async function loadEnablement() {
    try {
        const response = await fetch("/enablement.json");
        if (!response.ok) return;
        const value = await response.json();
        dock.cards = (value.cards ?? []).filter(card => card.title && card.body);
        updateDock();
    } catch { /* Tips are optional; the dock keeps its status line. */ }
}

function renderCard(card) {
    const source = DOCK_SOURCES[card.source] ? card.source : "foundry";
    $("dock-source").dataset.source = source;
    $("dock-source").textContent = DOCK_SOURCES[source];
    $("dock-count").textContent = `${dock.index + 1} / ${dock.pool.length}`;
    $("dock-title").textContent = card.title;
    $("dock-body").textContent = card.body;
    $("dock-loop-note").hidden = !card.loop;
    $("dock-loop-note").lastChild.textContent = card.loop ?? "";
    $("dock-snippet").hidden = !card.snippet;
    $("dock-snippet").firstElementChild.textContent = card.snippet ?? "";
    $("dock-topic").textContent = card.topic ?? "";
    $("dock-link").hidden = !card.link?.url;
    if (card.link?.url) {
        $("dock-link").href = card.link.url;
        $("dock-link").textContent = `${card.link.label} ↗`;
        $("dock-link").ariaLabel = `${card.link.label} (opens in a new tab)`;
    }
    $("dock-card").hidden = $("dock").dataset.collapsed === "true";
}

function restartProgress() {
    const bar = $("dock-progress");
    bar.style.animation = "none";
    void bar.offsetWidth;
    bar.style.animation = "";
}

function nextCard(immediate = false) {
    if (!dock.pool.length) return;
    dock.index = (dock.index + 1) % dock.pool.length;
    const card = dock.pool[dock.index];
    restartProgress();
    clearTimeout(dock.swap);
    if (immediate || reducedMotion.matches || $("dock-card").hidden) { renderCard(card); return; }
    $("dock-card").classList.add("is-swapping");
    dock.swap = setTimeout(() => { renderCard(card); $("dock-card").classList.remove("is-swapping"); }, 180);
}

function updateDock() {
    const phase = currentPhase()?.title.toLowerCase() ?? "any";
    const key = `${mode}:${phase}`;
    if (dock.cards.length && key !== dock.key) {
        dock.key = key;
        // An active SDD phase narrows the tips to that phase; otherwise every tip for the build mode rotates.
        const pool = dock.cards.filter(card => (!card.mode || card.mode === mode) && (phase === "any" || card.phase === phase || card.phase === "any"));
        dock.pool = shuffle(pool.length ? pool : [...dock.cards]);
        dock.index = -1;
        nextCard(true);
    }
    updateDockStatus();
}

function busyStart() {
    const times = [toTime(live.busySince), toTime(currentPhase()?.startedAt), dock.busySeen].filter(Number.isFinite);
    return times.length ? Math.min(...times) : Date.now();
}

function updateDockStatus() {
    const busy = Boolean(live?.busy);
    dock.busySeen = busy ? dock.busySeen ?? Date.now() : null;
    document.body.classList.toggle("show-dock", busy && Date.now() - busyStart() >= DOCK_DELAY);
    if (!busy) return;
    const phase = currentPhase();
    const since = value => Number.isFinite(toTime(value)) ? ` · ${duration(Date.now() - toTime(value))}` : "";
    const agents = live.run?.metrics.liveAgents ?? 0;
    $("dock-status").textContent = phase
        ? `${phase.title} phase${agents ? ` · ${agents} ${agents === 1 ? "agent" : "agents"} working` : ""}${since(phase.startedAt)}`
        : `Copilot is working${since(live.busySince)}`;
}

function setDockPaused(paused) {
    $("dock").dataset.paused = String(paused);
    $("dock-pause").setAttribute("aria-pressed", String(paused));
    $("dock-pause").title = paused ? "Resume tips" : "Pause tips";
}

$("dock-progress").addEventListener("animationend", () => nextCard());
$("dock-pause").onclick = () => setDockPaused($("dock").dataset.paused !== "true");
$("dock-next").onclick = () => nextCard();
$("dock-hide").onclick = () => {
    const collapsed = $("dock").dataset.collapsed !== "true";
    $("dock").dataset.collapsed = String(collapsed);
    $("dock-card").hidden = collapsed || dock.index < 0;
    $("dock-hide").setAttribute("aria-expanded", String(!collapsed));
    $("dock-hide").textContent = collapsed ? "Show tips" : "Hide tips";
    if (!collapsed) restartProgress();
};
setDockPaused(reducedMotion.matches);

// Host theme variables do not reach the iframe, so the deck gets the resolved scheme instead.
function hostTheme() {
    const context = document.createElement("canvas").getContext("2d");
    context.fillStyle = getComputedStyle(document.body).backgroundColor;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128 ? "dark" : "light";
}

// The deck lives in an iframe; Escape inside it posts deck-close because the dialog cannot see that key.
$("how").onclick = () => {
    const frame = $("deck-frame");
    const theme = hostTheme();
    if (!frame.getAttribute("src")) {
        frame.addEventListener("load", () => frame.contentWindow?.focus(), { once: true });
        frame.src = `/deck.html?theme=${theme}`;
    } else frame.contentWindow?.postMessage({ type: "deck-theme", theme }, location.origin);
    $("deck-dialog").showModal();
    frame.focus();
};
$("deck-close").onclick = () => $("deck-dialog").close();
$("deck-dialog").addEventListener("close", () => $("how").focus());
$("deck-dialog").addEventListener("click", event => { if (event.target === $("deck-dialog")) $("deck-dialog").close(); });
window.addEventListener("message", event => {
    if (event.origin === location.origin && event.data?.type === "deck-close" && $("deck-dialog").open) $("deck-dialog").close();
});

async function loadTab(tab, force = false) {
    if (["build", "explore"].includes(tab) || force) await frontends(force);
    if (tab === "build") { applyLive(await api("live")); return; }
    if (tab === "start" && force && mode === "sdd") await loadTargets(true);
    if (loaded.has(tab) && !force) {
        if (tab === "optimize") await usage();
        return;
    }
    loaded.add(tab);
    if (tab === "start") await Promise.all([setup(), mode === "rapid" && (force || !projects.length) ? discover() : null]);
    if (tab === "explore") await explore();
    if (tab === "optimize") await costs();
}

async function selectTab(tab) {
    if (!TABS.includes(tab)) tab = "start";
    activeTab = tab;
    for (const button of document.querySelectorAll("[data-tab]")) {
        const current = button.dataset.tab === tab;
        button.ariaSelected = String(current);
        button.tabIndex = current ? 0 : -1;
        $(button.dataset.tab).hidden = !current;
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    // Remembering the tab is best effort; the tab loads either way.
    api("preferences", { tab }).catch(error => notice(`Couldn't remember this tab: ${error.message}`, true));
    await loadTab(tab);
}

// Build opens when a build starts and Explore when it finishes, unless the user is typing or in a dialog: then a notice
// offers the tab instead. A switch moves focus to the new tab and announces why; `show` also leaves the message visible.
function autoTab(tab, message, label, show = true) {
    const decision = autoSwitch({ current: activeTab, target: tab, active: document.activeElement, dialogOpen: Boolean(document.querySelector("dialog[open]")) });
    if (decision === "none") return;
    if (decision === "notice") { notice(message, false, { go: tab, label }); return; }
    const loading = selectTab(tab);
    $(`tab-${tab}`).focus({ preventScroll: true });
    // Announced once the tab has loaded, so status messages from loading it do not cut the reason short.
    loading.then(() => show ? notice(message) : announce(message),
        error => notice(`Could not finish switching to ${tab[0].toUpperCase()}${tab.slice(1)}: ${error.message}`, true));
}

const SENT = {
    plugin: "Sent to Chat. Copilot installs what is missing with your approval; check readiness again on Start afterwards.",
    devpack: "Sent to Chat. Copilot checks your tools and asks before installing anything.",
    auth: "Sent to Chat. Complete sign-in there, then check readiness again on Start.",
    workiq: "Sent to Chat. Copilot checks Work IQ and asks before installing anything; check readiness again on Start afterwards.",
    quickstart: "Sent to Chat. Copilot plans the project and asks before creating it.",
    landingZone: "Sent to Chat. Copilot plans the landing zone with you.",
    insights: "Sent to Chat. Copilot connects Application Insights with your approval.",
    foundry: "Sent to Chat. Copilot opens Microsoft Foundry Canvas for your project.",
    optimizer: "Sent to Chat. Copilot confirms the agent and baseline before any run.",
    evaluations: "Sent to Chat. Copilot confirms the agent, data and thresholds first.",
    insightsScan: "Sent to Chat. Copilot confirms scope before starting the scan.",
    improve: "Sent to Chat. Copilot analyzes past runs and proposes changes for your review.",
    deploy: { rapid: "Sent to Chat. Copilot redeploys changed agents, then asks before deploying the app.", sdd: "Sent to Chat. Copilot runs the deploy preflight and asks for approval before azd up." },
    guided: { rapid: "Sent to Chat. Answer Copilot's questions there.", sdd: "Sent to Chat. Copilot asks a few questions, then starts the workflow." },
    run: "Sent to Chat. Copilot starts the dev servers and reports their URLs.",
    test: "Sent to Chat. Copilot runs the local tests and asks before changing code.",
    convert: "Sent to Chat. Copilot confirms with you before switching to SDD.",
};

document.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.tab) { selectTab(button.dataset.tab).catch(error => notice(error.message, true)); return; }
    if (button.dataset.go) {
        if (button.closest("#notice")) $("notice").hidden = true;
        selectTab(button.dataset.go).catch(error => notice(error.message, true));
        return;
    }
    if (button.dataset.mode && button.closest(".mode")) { chooseMode(button.dataset.mode); return; }
    if (button.hasAttribute("data-dismiss")) { $("notice").hidden = true; return; }
    if (button.dataset.template) { openTemplate(button.dataset.template); return; }
    if (button.hasAttribute("data-template-cta") || button.hasAttribute("data-show-template")) { showTemplate(); return; }
    if (button.dataset.layout) { setLayout(button.dataset.layout, true); return; }
    if (button.dataset.chip) { removeChip(button); return; }
    if (button.hasAttribute("data-clear-filters")) { clearFilters(button.dataset.clearFilters === "all"); return; }
    if (button.dataset.wf) { workflowAction(button); return; }
    if (button.dataset.artifact) { busy(button, () => api("open_artifact", { path: button.dataset.artifact })); return; }
    if (button.hasAttribute("data-inventory-retry")) { busy(button, explore); return; }
    if (button.hasAttribute("data-inspect-agent")) {
        busy(button, async () => {
            await api("inspect_agent", { agentName: button.dataset.inspectAgent, projectId: button.dataset.inspectProject });
            notice("Inspection request sent to Chat. Copilot checks prerequisites and launches Agent Inspector for this agent.");
        });
        return;
    }
    if (button.dataset.frontend) {
        busy(button, async () => {
            await api("open_frontend", { frontend: button.dataset.frontend });
            notice("App opened in the integrated browser.");
        });
        return;
    }
    if (button.dataset.prompt) busy(button, async () => {
        const kind = button.dataset.prompt;
        await api("prompt", { kind, ...(button.dataset.run ? { runId: button.dataset.run } : {}) });
        const sent = SENT[kind];
        notice((typeof sent === "object" ? sent[mode] : sent) ?? "Sent to Chat. Continue there.");
    });
});

document.querySelector("nav").addEventListener("keydown", event => {
    const buttons = [...document.querySelectorAll("[data-tab]")].filter(button => !button.hidden);
    const index = buttons.indexOf(document.activeElement);
    if (index < 0) return;
    let next;
    if (event.key === "ArrowRight") next = (index + 1) % buttons.length;
    if (event.key === "ArrowLeft") next = (index + buttons.length - 1) % buttons.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = buttons.length - 1;
    if (next !== undefined) { event.preventDefault(); buttons[next].focus(); selectTab(buttons[next].dataset.tab).catch(error => notice(error.message, true)); }
});
document.querySelector(".mode").addEventListener("keydown", event => {
    const buttons = [...document.querySelectorAll(".mode [data-mode]")];
    const index = buttons.indexOf(document.activeElement);
    if (index < 0) return;
    let next;
    if (["ArrowRight", "ArrowDown"].includes(event.key)) next = (index + 1) % buttons.length;
    if (["ArrowLeft", "ArrowUp"].includes(event.key)) next = (index + buttons.length - 1) % buttons.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = buttons.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    const choice = buttons[next].dataset.mode;
    if (lock && choice !== lock) { notice(LOCK_HINT[lock]); return; }
    buttons[next].focus();
    chooseMode(choice);
});
$("project-bar").onclick = () => {
    if (mode === "sdd") { selectTab(activeProject() ? "explore" : "build").catch(error => notice(error.message, true)); return; }
    pickProject();
};
for (const button of document.querySelectorAll("[data-pick-project]")) button.onclick = pickProject;
// The field's width comes from the header grid, not its content, so refitting never resizes what is observed.
new ResizeObserver(fitProjectBar).observe(document.querySelector(".project"));
// Passing readiness collapses step 1 under the button, so its summary takes focus and scrolls back into view to show the result.
$("recheck").onclick = () => busy($("recheck"), async () => {
    await setup();
    const step = $("step-ready"), summary = step.querySelector("summary");
    if (!step.open) {
        if (!document.activeElement || document.activeElement === document.body) summary.focus({ preventScroll: true });
        if (document.activeElement === summary) step.scrollIntoView({ block: "nearest", behavior: "instant" });
    }
    await retryAzure();
});
$("workiq-toggle").onchange = () => {
    const on = $("workiq-toggle").checked;
    renderWorkIq();
    api("preferences", { workiq: on }).catch(error => {
        $("workiq-toggle").checked = !on;
        renderWorkIq();
        notice(error.message, true);
    });
};
$("refresh").onclick = () => busy($("refresh"), () => loadTab(activeTab, true));
$("refresh-foundry").onclick = () => busy($("refresh-foundry"), async () => {
    await api("refresh_foundry");
    notice("Microsoft Foundry Canvas workspace state refreshed.");
});
$("subscription").onchange = () => discover($("subscription").value);
// The server serializes selections, so responses arrive in order and the last one wins.
$("project").onchange = () => {
    const projectId = $("project").value;
    if (!projectId || projectId === selected?.id) return;
    api("select", { projectId })
        .then(project => { updateProject(project, true); return monitoring(); })
        .catch(error => { renderProjects(); notice(error.message, true); });
};
$("inventory-search").oninput = renderInventory;
$("inventory-kind").onchange = renderInventory;
$("inventory-reset").onclick = () => {
    $("inventory-search").value = "";
    $("inventory-kind").value = "";
    renderInventory();
    $("inventory-search").focus();
};
$("inventory").addEventListener("toggle", event => {
    const key = event.target.dataset.inventoryGroup;
    if (!key || $("inventory-search").value.trim()) return;
    if (event.target.open) collapsedInventory.delete(key);
    else collapsedInventory.add(key);
}, true);
$("wf-picker").onchange = () => api("workflow_select", { runId: $("wf-picker").value }).then(applyLive).catch(error => notice(error.message, true));
$("wf-callout").addEventListener("input", event => {
    if (event.target.id !== "wf-feedback") return;
    const send = $("wf-callout").querySelector('[data-wf="changes-send"]');
    if (send) send.disabled = !event.target.value.trim();
});
$("target-subscription").onchange = () => { targetSaver.schedule({ subscriptionId: $("target-subscription").value }); targetSaver.flush(); };
$("target-location").onchange = () => { targetSaver.schedule({ location: $("target-location").value }); targetSaver.flush(); };
$("target-env").oninput = () => {
    const value = $("target-env").value.trim();
    const valid = !value || /^[a-zA-Z][a-zA-Z0-9-]{1,19}$/.test(value);
    $("target-env").setAttribute("aria-invalid", String(!valid));
    $("target-help").textContent = valid ? TARGET_HELP : "Use 2 to 20 letters, digits or hyphens, starting with a letter.";
    $("target-help").classList.toggle("error", !valid);
    if (valid) targetSaver.schedule({ environmentName: value });
    else targetSaver.discard("environmentName");
};
$("template-search").oninput = renderGallery;
$("template-sort").onchange = renderGallery;
// A menu that would overflow the panel aligns to its button's right edge, or stays inside the panel when that is not enough.
function placeMenu(menu) {
    menu.style.left = "";
    const edge = document.documentElement.clientWidth - 8;
    const { left, right, width } = menu.getBoundingClientRect();
    if (right <= edge) return;
    const end = menu.parentElement.getBoundingClientRect().right - width;
    menu.style.left = `${(end >= 8 ? end : Math.max(8, edge - width)) - left}px`;
}
// Summary clicks, including Enter and Space, open one menu at a time and place it before it paints; the toggle event comes too late.
$("facets").addEventListener("click", event => {
    const facet = event.target.closest(".facet > summary")?.parentElement;
    if (!facet) return;
    event.preventDefault();
    for (const other of $("facets").querySelectorAll(".facet[open]")) if (other !== facet) other.open = false;
    facet.open = !facet.open;
    if (facet.open) placeMenu(facet.querySelector(".facet-menu"));
});
addEventListener("resize", () => {
    const menu = $("facets").querySelector(".facet[open] .facet-menu");
    if (menu) placeMenu(menu);
});
$("facets").addEventListener("keydown", event => {
    const facet = event.key === "Escape" ? event.target.closest(".facet[open]") : null;
    if (!facet) return;
    event.preventDefault();
    facet.open = false;
    facet.querySelector("summary").focus();
});
$("facets").addEventListener("change", event => {
    const input = event.target.closest("[data-facet-option]");
    if (!input) return;
    const values = filters[input.dataset.facetOption];
    if (input.checked) values.add(input.value);
    else values.delete(input.value);
    renderGallery();
});
// Tabbing away closes a menu; a click on a non-focusable spot has no related target, so the click handler decides.
$("facets").addEventListener("focusout", event => {
    const facet = event.target.closest(".facet[open]");
    if (facet && event.relatedTarget && !facet.contains(event.relatedTarget)) facet.open = false;
});
document.addEventListener("click", event => {
    for (const facet of $("facets").querySelectorAll(".facet[open]")) if (!facet.contains(event.target)) facet.open = false;
});
$("template-back").onclick = closeTemplate;
$("template-reset").onclick = () => {
    const row = templateRow(template);
    if (!row) return;
    clearTimeout(draftSave);
    $("prompt-text").value = row.prompt;
    drafts.delete(template);
    renderReset();
    $("prompt-text").focus();
    api("preferences", { draft: "" }).catch(error => notice(error.message, true));
};
$("prompt-text").oninput = () => {
    renderReset();
    clearTimeout(draftSave);
    draftSave = setTimeout(() => api("preferences", { draft: draftValue() }).catch(error => notice(error.message, true)), 300);
};
$("template-unlock").onclick = () => busy($("template-unlock"), async () => {
    try {
        applyTemplateState(await api("preferences", { started: false }));
    } catch (error) {
        if (error.code === "template_locked") syncTemplate();
        throw error;
    }
    $("prompt-text").focus();
    announce("Prompt template unlocked.");
});
$("send-prompt").onclick = () => busy($("send-prompt"), async () => {
    const row = templateRow(template);
    if (row && !$("prompt-text").value.trim()) {
        $("prompt-text").focus();
        throw new Error("The prompt is empty. Reset it to the template or write your own.");
    }
    if (mode === "sdd") {
        if ($("target-env").getAttribute("aria-invalid") === "true") {
            $("target-env").focus();
            throw new Error("Fix the azd environment name before sending.");
        }
        const saved = await targetSaver.flush();
        if (!saved.ok) throw saved.error;
    }
    clearTimeout(draftSave);
    const text = draftValue().trim();
    const input = row ? { kind: "scenario", scenarioId: row.id } : { kind: "guided" };
    if (text) input.text = text;
    let result;
    try {
        result = await api("prompt", input);
    } catch (error) {
        if (error.code === "template_locked") syncTemplate();
        throw error;
    }
    drafts.delete(template);
    templateStarted = result.started === true;
    expectTurn();
    renderTemplateView();
    renderTemplateCta();
    const project = activeProject();
    await selectTab("build").catch(() => {});
    notice(!row ? SENT.guided[mode] : mode === "sdd" ? "Sent to Chat. Copilot runs preflight, then starts the workflow."
        : project ? `Sent to Chat with ${project.name}. Continue there.` : "Sent to Chat. Continue there.");
});

async function start() {
    const response = await fetch("/api/state", { headers: { "X-Canvas-Token": token } });
    snapshot = await response.json();
    if (!response.ok) throw new Error(snapshot.error);
    target = { ...target, ...snapshot.state.target };
    lock = snapshot.live?.lock ?? null;
    template = snapshot.state.template ?? null;
    templateStarted = snapshot.state.started === true;
    $("prompt-text").value = snapshot.state.draft || (templateRow(template)?.prompt ?? "");
    setLayout(snapshot.state.view);
    buildFacets();
    applyMode(snapshot.live?.mode ?? snapshot.state.mode);
    $("workiq-toggle").checked = snapshot.state.workiq === true;
    renderWorkIq(null);
    if (snapshot.live) applyLive(snapshot.live, true);
    const run = snapshot.live?.run;
    const saved = snapshot.state.tab;
    const initialTab = mode === "sdd" && run && ["running", "pending", "paused"].includes(run.status) ? "build"
        : TABS.includes(saved) ? saved : "start";
    // Always run readiness and project discovery on open, including restored tabs.
    loaded.add("start");
    const initial = Promise.all([setup(), (async () => {
        await frontends();
        if (mode === "rapid" && !projects.length) await discover();
    })()]);
    const deferred = ["explore", "optimize"].includes(initialTab);
    // Live updates and polling start even when a tab fails to load; the tab shows its own error.
    liveLoop();
    const tabFailed = error => notice(error.message, true);
    await selectTab(deferred ? "start" : initialTab).catch(tabFailed);
    loadEnablement();
    if (mode === "sdd") loadTargets();
    await initial.catch(tabFailed);
    started = true;
    if (deferred) await selectTab(initialTab).catch(tabFailed);
    setInterval(() => { if (activeTab === "optimize" && !document.hidden) usage(); }, 15_000);
    setInterval(() => { if (!document.hidden) frontends(); }, 5_000);
    setInterval(() => { tick(); updateDockStatus(); }, 1000);
    const refreshVisible = () => {
        if (document.hidden) return;
        frontends();
        if (activeTab === "optimize") usage();
    };
    window.addEventListener("focus", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
}
start().catch(error => notice(`Canvas initialization failed: ${error.message}`, true));
