import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { joinSession, createCanvas, CanvasError } from "@github/copilot-sdk/extension";
import { Azure } from "./lib/azure.mjs";
import { Model, TABS, TAXONOMY, VIEWS, templateLocked } from "./lib/model.mjs";
import { startServer } from "./lib/server.mjs";
import { openFrontend } from "./lib/frontends.mjs";
import { assertSession, sessionUsage } from "./lib/usage.mjs";
import { Live, OPENABLE, lockMessage } from "./lib/live.mjs";
import { openArtifact, workingDirectory } from "./lib/artifacts.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const scenarios = JSON.parse(await readFile(path.join(root, "assets", "scenarios.json"), "utf8"));
const images = path.join(root, "assets", "images");
const servers = new Map();
const tabs = [...TABS];
const promptKinds = ["plugin", "devpack", "auth", "workiq", "quickstart", "landingZone", "insights", "guided", "scenario", "custom", "sdd", "changes", "improve", "deploy", "run", "test", "convert", "foundry", "optimizer", "evaluations", "insightsScan"];
let model;
let live;
let liveStarted;
let resolveReady;
let rejectReady;
const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
let mutation = Promise.resolve();

const objectSchema = properties => ({ type: "object", properties, additionalProperties: false });
const runId = { type: "string", maxLength: 128 };
const schemas = {
    setup: objectSchema({}),
    discover: objectSchema({ subscriptionId: { type: "string" } }),
    select: { ...objectSchema({ projectId: { type: "string" } }), required: ["projectId"] },
    monitoring: objectSchema({}),
    explore: objectSchema({}),
    inspect_agent: { ...objectSchema({ projectId: { type: "string" }, agentName: { type: "string", maxLength: 256 } }), required: ["projectId", "agentName"] },
    frontends: objectSchema({ retry: { type: "boolean" } }),
    open_frontend: { ...objectSchema({ frontend: { enum: ["local", "deployed"] } }), required: ["frontend"] },
    usage: objectSchema({}),
    cost: objectSchema({}),
    preferences: objectSchema({
        tab: { enum: tabs }, draft: { type: "string", maxLength: 16000 }, workiq: { type: "boolean" },
        template: { type: "string", maxLength: 128 }, view: { enum: [...VIEWS] }, started: { enum: [false] },
    }),
    mode: { ...objectSchema({ mode: { enum: ["rapid", "sdd", "auto"] } }), required: ["mode"] },
    targets: objectSchema({}),
    target: objectSchema({ subscriptionId: { type: "string", maxLength: 36 }, location: { type: "string", maxLength: 32 }, environmentName: { type: "string", maxLength: 40 } }),
    live: objectSchema({}),
    workflow_select: { ...objectSchema({ runId }), required: ["runId"] },
    workflow_resume: { ...objectSchema({ runId, raiseLimit: { type: "boolean" } }), required: ["runId"] },
    workflow_pause: { ...objectSchema({ runId }), required: ["runId"] },
    workflow_cancel: { ...objectSchema({ runId }), required: ["runId"] },
    open_artifact: { ...objectSchema({ path: { enum: OPENABLE } }), required: ["path"] },
    refresh_foundry: objectSchema({}),
    prompt: { ...objectSchema({
        kind: { enum: promptKinds },
        scenarioId: { type: "string", maxLength: 128 }, text: { type: "string", maxLength: 16000 }, runId,
    }), required: ["kind"] },
};

export function validate(action, input) {
    const schema = schemas[action];
    if (!schema || !input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid canvas action.");
    for (const key of schema.required ?? []) if (!(key in input)) throw new Error(`${key} is required.`);
    for (const [key, value] of Object.entries(input)) {
        const rule = schema.properties[key];
        if (!rule || (rule.type && typeof value !== rule.type) || (rule.enum && !rule.enum.includes(value)) ||
            (rule.maxLength && value.length > rule.maxLength)) throw new Error(`Invalid ${key}.`);
    }
}

function ensureLive() {
    liveStarted ??= live.start().catch(error => { liveStarted = null; throw error; });
    return liveStarted;
}

function liveSnapshot() {
    return { ...live.snapshot(), mode: model.mode(live.runs.length > 0, live.lock), modeOverride: model.state.mode };
}

function knownRun(id) {
    const run = live.runs.find(row => row.runId === id);
    if (!run) throw new Error("This workflow run is no longer available. Refresh the Build tab.");
    return run;
}

// Resume returns when the attempt settles, so report only pre-execution failures and let live updates show progress.
// raiseLimit applies only the runtime's suggested value for the limit this run actually hit.
async function resumeRun(id, raiseLimit = false) {
    const run = knownRun(id);
    if (!run.canResume) throw new Error("This run cannot be resumed.");
    const failure = live.run?.runId === id ? live.run.failure : null;
    if (raiseLimit && !(failure?.type === "workflow_limit_reached" && Number.isFinite(failure.suggestedValue))) throw new Error("This run has no limit to raise.");
    const limits = raiseLimit ? { [failure.kind]: failure.suggestedValue } : undefined;
    const pending = model.session.workflow.resume(id, { notifyOnComplete: true, logPhaseNames: true, ...(limits ? { limits } : {}) });
    pending.then(() => live.schedule(), () => live.schedule());
    const early = await Promise.race([
        pending.then(() => null, error => error),
        new Promise(resolve => setTimeout(() => resolve(null), 1500).unref?.()),
    ]);
    if (early && !["already_active", "workflow_already_running"].includes(early.code)) throw early;
    live.schedule();
    return { runId: id, resumed: true };
}

async function perform(action, input) {
    await ready;
    validate(action, input);
    const project = model.project;
    switch (action) {
        case "setup": return model.setup();
        case "discover": return model.discover(input.subscriptionId);
        case "select": return model.select(input.projectId);
        case "usage": return sessionUsage(model.session, model.session.sessionId);
        // Reads and Azure discovery run outside the queue; only applying their result waits for it.
        case "frontends": return model.frontends(input.retry, serial);
        case "open_frontend": return openFrontend(model.session, input.frontend);
        case "inspect_agent": await ensureLive(); return model.inspectAgent(input, live.lock);
        case "refresh_foundry": {
            const open = await model.session.rpc.canvas.listOpen();
            const panel = open.openCanvases.find(row => row.canvasId === "agent-builder");
            if (!panel) throw new Error("Open Microsoft Foundry Canvas first using the button above.");
            return model.session.rpc.canvas.action.invoke({ instanceId: panel.instanceId, actionName: "refreshWorkspaceState" });
        }
        case "preferences": {
            // Unlocking is for a template sent by mistake: once the build leaves a trace, the template stays.
            if (input.started === false && model.state.started) {
                await ensureLive();
                await live.refreshStrict();
                if (live.lock || live.runs.length || live.busy) throw templateLocked();
            }
            return model.preferences(input);
        }
        case "mode": {
            await ensureLive();
            await live.refreshStrict();
            if (live.lock && input.mode !== "auto" && input.mode !== live.lock) throw Object.assign(new Error(lockMessage(live.lock)), { code: "mode_locked" });
            await model.setMode(input.mode === "auto" ? null : input.mode);
            live.bump();
            return liveSnapshot();
        }
        case "targets": return model.targets();
        case "target": return model.setTarget(input);
        case "live": await ensureLive(); await live.refresh(); return liveSnapshot();
        case "workflow_select": await ensureLive(); await live.select(input.runId); return liveSnapshot();
        case "workflow_resume": await ensureLive(); return resumeRun(input.runId, input.raiseLimit === true);
        case "workflow_pause": {
            await ensureLive();
            knownRun(input.runId);
            const result = await model.session.workflow.pause(input.runId);
            live.schedule();
            return { runId: input.runId, status: result.status };
        }
        case "workflow_cancel": {
            await ensureLive();
            knownRun(input.runId);
            const result = await model.session.workflow.cancel(input.runId);
            live.schedule();
            return { runId: input.runId, status: result.status };
        }
        case "open_artifact": return openArtifact(model.session, input.path);
        case "prompt": {
            await ensureLive();
            await live.refreshStrict();
            const run = input.runId ? knownRun(input.runId) : null;
            return model.send(input, model.mode(live.runs.length > 0, live.lock), run?.checkpoint ?? (["error", "halted"].includes(run?.status) ? "failed" : null), live.lock);
        }
        default:
            if (!project) throw new Error("Select a Foundry project on Start first.");
            if (action === "monitoring") return model.azure.monitoring(project);
            if (action === "explore") return model.azure.explore(project);
            if (action === "cost") return model.azure.cost(project);
            throw new Error("Unknown action.");
    }
}

function serial(work) {
    const result = mutation.then(work);
    mutation = result.catch(() => {});
    return result;
}

function dispatch(action, input = {}) {
    // Serialize state changes; a slow subscription discovery cannot overwrite a later selection.
    if (["discover", "select", "preferences", "prompt", "inspect_agent", "mode", "targets", "target"].includes(action)) return serial(() => perform(action, input));
    return perform(action, input);
}

const descriptions = {
    setup: "Check the foundry-agentic-loop and microsoft-foundry plugins, the canvas and workflow extensions, CLI tools and Azure authentication, and whether the optional Work IQ MCP server is configured.",
    discover: "Discover accessible Foundry projects and default to the first available.",
    select: "Select a discovered project and persist it for this session.",
    monitoring: "Check the selected project's Application Insights connections.",
    explore: "List agents, model deployments, toolboxes and resource-group resources.",
    inspect_agent: "Ask Copilot in Chat to launch local Agent Inspector for a verified agent in the selected project; starts a Copilot turn.",
    frontends: "Read frontend URLs and synchronize changed FOUNDRY_PROJECT from workspace .env; retry failed project discovery on request.",
    open_frontend: "Open a configured frontend in the integrated browser, rereading its URL from .env.",
    usage: "Get usage for the bound Copilot session, with its ID, session accounting and runtime model counters.",
    cost: "Query resource-group month-to-date actual Azure spend.",
    preferences: "Save the active tab, the prompt template gallery view, the selected prompt template and its draft text, and whether briefs ask Copilot to use Work IQ context. Sending from a template locks it; started: false unlocks it, keeping its text, only before an AGENTS.md mode lock, a workflow run or a Copilot turn exists.",
    mode: "Show rapid prototyping or SDD workflow views; auto selects SDD when this session has foundry-agentic-loop-workflow runs. An Agentic Loop section in the workspace AGENTS.md locks the mode and rejects a switch away from it.",
    targets: "List enabled Azure subscriptions and the saved SDD deployment target.",
    target: "Save the SDD deployment target: subscription, region (or auto) and azd environment name.",
    live: "Read busy state, the effective mode, the AGENTS.md mode lock and foundry-agentic-loop-workflow runs with phases, gates, agents and artifacts.",
    workflow_select: "Show a specific foundry-agentic-loop-workflow run.",
    workflow_resume: "Resume a paused foundry-agentic-loop-workflow run, for example to approve a spec or deployment checkpoint.",
    workflow_pause: "Pause a running foundry-agentic-loop-workflow run.",
    workflow_cancel: "Cancel a foundry-agentic-loop-workflow run.",
    open_artifact: "Open an existing workflow artifact such as docs/spec.md, or the workspace AGENTS.md or README.md, in the Editor canvas.",
    refresh_foundry: "Reuse the existing Foundry canvas public refreshWorkspaceState action.",
    prompt: "Send a canvas prompt to Chat; this starts a Copilot turn. On Start the user picks a prompt template and reviews or edits its text before sending: kind guided is Shape it with Copilot, with an optional idea as text; kind scenario sends scenarioId with the edited prompt as text. Sending from a template locks it for this session. changes adds the user's feedback to a fixed change request; the other kinds send a fixed prompt for their step directly. With Work IQ context on, brief prompts ask Copilot to use the Work IQ MCP server first.",
};

const session = await joinSession({
    canvases: [createCanvas({
        id: "foundry-agentic-loop-canvas",
        displayName: "Foundry Agentic Loop",
        description: "Build agentic solutions on Microsoft Foundry: rapid prototyping in an existing project, or spec-driven development with live foundry-agentic-loop-workflow phases, gates and artifacts.",
        inputSchema: objectSchema({ tab: { enum: tabs }, mode: { enum: ["rapid", "sdd", "auto"] } }),
        actions: Object.entries(schemas).map(([name, inputSchema]) => ({
            name, inputSchema, description: descriptions[name],
            handler: async ctx => {
                try {
                    await ready;
                    assertSession(session, ctx.sessionId);
                    return await dispatch(name, ctx.input ?? {});
                }
                catch (error) {
                    const code = typeof error.code === "string" && /^[a-z][a-z0-9_]*$/.test(error.code) ? error.code : "foundry_agentic_loop_error";
                    throw new CanvasError(code, error.message);
                }
            },
        })),
        open: async ctx => {
            await ready;
            assertSession(session, ctx.sessionId);
            await ensureLive();
            // Reopens and reloads repeat the same input; apply it only when it changes so the user's later choices stay.
            const openInput = JSON.stringify([ctx.input?.mode ?? null, ctx.input?.tab ?? null]);
            if (openInput !== model.state.openInput) {
                // An AGENTS.md lock wins over the requested mode; the canvas still opens, in the locked mode.
                // Unreadable workspace state also opens it, without recording the input so the next open retries it.
                let applied = true;
                if (ctx.input?.mode) {
                    try { await dispatch("mode", { mode: ctx.input.mode }); }
                    catch (error) {
                        if (error.code === "live_unavailable") applied = false;
                        else if (error.code !== "mode_locked") throw error;
                    }
                }
                if (ctx.input?.tab) await dispatch("preferences", { tab: ctx.input.tab });
                if (applied) {
                    model.state.openInput = openInput;
                    await model.save();
                }
            }
            let entry = servers.get(ctx.instanceId);
            if (!entry) {
                entry = await startServer({
                    assets: path.join(root, "public"), images, scenarios,
                    dispatch: (action, input) => {
                        assertSession(session, ctx.sessionId);
                        return dispatch(action, input);
                    },
                    snapshot: async () => ({
                        state: model.state, scenarios, taxonomy: TAXONOMY, project: model.project,
                        sessionId: session.sessionId, live: liveSnapshot(),
                    }),
                    live: { wait: (version, options) => live.wait(version, options), snapshot: liveSnapshot },
                });
                servers.set(ctx.instanceId, entry);
            }
            return { title: "Foundry Agentic Loop", url: entry.url };
        },
        onClose: async ctx => {
            const entry = servers.get(ctx.instanceId);
            if (!entry) return;
            servers.delete(ctx.instanceId);
            await entry.close();
            if (!servers.size && liveStarted) { live.stop(); liveStarted = null; }
        },
    })],
});

try {
    if (!session.workspacePath) throw new Error("The runtime did not provide session storage. Upgrade Copilot before opening Foundry Agentic Loop.");
    model = new Model({
        azure: new Azure(), session, scenarios,
        storage: path.join(session.workspacePath, "foundry-agentic-loop", "settings.json"),
    });
    await model.load();
    live = new Live({ session, workspace: () => workingDirectory(session) });
    live.onNewRun = async () => { if (model.state.mode) await model.setMode(null); };
    resolveReady();
} catch (error) { rejectReady(error); }
// Keep the extension running so the reason reaches the timeline; open and actions reject with the same error.
ready.catch(error => session.log(`Foundry Agentic Loop canvas failed to start: ${error.message}`, { level: "error" }).catch(() => {}));
