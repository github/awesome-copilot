import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { AZD_MINIMUM, foundryProjectUrl, outcome, projectIdentity } from "./azure.mjs";
import { frontendStatus } from "./frontends.mjs";
import { ARTIFACTS, LESSONS, checkpointInfo, flightRecordPath } from "./live.mjs";

export const links = {
    devpack: "https://learn.microsoft.com/azure/foundry/how-to/develop/install-cli-sdk?tabs=macos%2Cpython%2Cazd-ai#install-foundry-devpack",
    quickstart: "https://learn.microsoft.com/azure/foundry/tutorials/quickstart-create-foundry-resources?tabs=azurecli",
    landingZone: "https://azure.github.io/AI-Landing-Zones/",
    optimizer: "https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/agent-optimizer-overview",
    evaluations: "https://learn.microsoft.com/en-us/azure/foundry/observability/how-to/evaluate-agent?tabs=python",
    insightsScan: "https://learn.microsoft.com/en-us/azure/foundry/observability/how-to/agent-insights",
    workiq: "https://github.com/microsoft/work-iq",
};

export const MODES = Object.freeze(["rapid", "sdd"]);
export const TABS = Object.freeze(["start", "build", "explore", "optimize"]);
export const VIEWS = Object.freeze(["gallery", "list"]);
// Prompt template facets in display order, with their descriptions; every scenario value must come from here.
export const TAXONOMY = Object.freeze({
    capabilities: [
        ["Frontier Models", "GPT, Claude, Llama, Phi"], ["Image Generation", "GPT Image 2, MAI-Image-2.5"], ["Text to Speech", "Neural voices"],
        ["Speech to Text", "Real-time transcription"], ["Real-Time Conversations", "Voice-first agents"], ["Forms Recognition", "Document intelligence"],
        ["Foundry IQ", "Grounded knowledge & retrieval"],
    ],
    buildingBlocks: [
        ["Observability", "Traces, evals, monitoring"], ["AI Gateway", "Routing, quotas, policies"], ["Identity & Access", "Entra, RBAC, scopes"],
        ["Private Networking", "VNet, Private Endpoints"], ["Data Persistence", "Cosmos DB, Postgres"], ["Storage", "Blobs, files, vectors"],
    ],
    patterns: [
        ["Workflow Automation", "Multi-step orchestration"], ["Domain-Specific Agents", "Vertical specialization"], ["Knowledge Grounding", "Trusted enterprise data"],
        ["Multi-Agent Orchestration", "Coordinated agent teams"], ["Human-in-the-Loop", "Review & approval gates"],
    ],
});
// The pinned "Shape it with Copilot" prompt template; the others are packaged scenario ids.
export const GUIDED = "guided";
export const templateLocked = () => Object.assign(new Error("The prompt template is locked because the build started from it."), { code: "template_locked" });
const RETIRED_TABS = { setup: "start", resources: "start", workflow: "build", cost: "optimize" };
const ENV_RETRY = 30_000;
const ENV_RETRY_MAX = 300_000;
const projectKinds = ["insights", "foundry", "inspect", "optimizer", "evaluations", "insightsScan"];
const unscoped = ["quickstart", "landingZone", "plugin", "devpack", "auth", "workiq", "sdd", "changes", "improve", "deploy", "run", "test", "convert"];
const briefKinds = ["guided", "scenario", "custom", "sdd"];
const WORKIQ_CONTEXT = "Work IQ context: before asking clarifying questions, use the Work IQ MCP server (workiq) to find Microsoft 365 context relevant to this brief, such as meetings, emails, documents and people. Fold only the requirements that matter into the brief, citing each by source type (for example, a design review meeting), and confirm them with me. Never copy confidential content, personal data or secrets into the workspace. If Work IQ is unavailable or needs consent, say so and continue without it.";
const shortCommand = name => `Run the \`${name}\` short command from the Agentic Loop section of the root AGENTS.md:`;

// Work IQ is optional context, so its state never affects readiness. Configured, enabled servers win over disabled ones.
export function workIqStatus(result) {
    if (result.status === "error") return { status: "error", error: result.error };
    const matches = (result.data?.servers ?? []).filter(row => /workiq|work-iq/i.test(`${row.name} ${row.sourcePlugin ?? ""}`));
    const server = matches.find(row => row.enabled) ?? matches[0];
    if (!server) return { status: "missing" };
    return { status: "ready", data: { name: server.name, enabled: server.enabled, live: server.live?.status ?? null, error: server.live?.error ?? null } };
}

export function validTarget(target = {}) {
    const result = { subscriptionId: null, location: "auto", environmentName: "" };
    if (target.subscriptionId != null && target.subscriptionId !== "") {
        if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(target.subscriptionId)) throw new Error("Choose a valid Azure subscription.");
        result.subscriptionId = target.subscriptionId;
    }
    if (target.location != null && target.location !== "") {
        if (!/^(?:auto|[a-z][a-z0-9]{2,30})$/.test(target.location)) throw new Error("Choose a valid Azure region.");
        result.location = target.location;
    }
    if (target.environmentName) {
        if (!/^[a-zA-Z][a-zA-Z0-9-]{1,19}$/.test(target.environmentName)) throw new Error("Use 2-20 letters, digits or hyphens for the azd environment name, starting with a letter.");
        result.environmentName = target.environmentName;
    }
    return result;
}

function azureTarget(target = {}, subscriptions = []) {
    const { subscriptionId, location, environmentName } = validTarget(target);
    const subscription = subscriptions.find(row => row.id === subscriptionId);
    return [
        `Azure subscription: ${subscriptionId ? `${subscription?.name ? `${subscription.name} ` : ""}(${subscriptionId})` : "confirm the current az/azd default with me"}`,
        `Azure region: ${location === "auto" ? "recommend one from live model, quota and hosted-agent availability" : location}`,
        `azd environment: ${environmentName || "derive a short name from the solution"}`,
    ].join("\n");
}

// A project the portal cannot address (such as a malformed subscription ID) is still listed, just without a portal link.
function projectPortalUrl(projectId, tenantId) {
    try { return foundryProjectUrl(projectId, tenantId); }
    catch { return null; }
}

function changeRequest(runId, checkpoint, feedback) {
    const hold = "Do not resume the run: I will continue it from the Foundry Agentic Loop canvas.";
    const pause = checkpointInfo(checkpoint);
    if (pause?.kind === "blocked") {
        const files = [...ARTIFACTS[pause.phase], LESSONS].join(", ");
        return `The foundry-agentic-loop-workflow run ${runId} is paused because ${pause.phase} could not pass its gate (round ${pause.round}). Read every issue in the ${pause.phase} round ${pause.round} entry of phases in ${flightRecordPath(runId)}, then ${files}. Fix each issue at its root cause in the workspace, Azure configuration, quota or region, and rerun the failing checks. Record the evidence in ${ARTIFACTS[pause.phase].at(-1)} and the cause and fix in ${LESSONS}. ${hold} Resuming runs ${pause.phase} again.${feedback ? `\n\nGuidance:\n${feedback}` : ""}`;
    }
    switch (pause?.kind === "approve" ? `approve-${pause.phase}` : checkpoint) {
        case "approve-Specify": return feedback && `The foundry-agentic-loop-workflow run ${runId} is paused for spec approval. Apply this feedback to docs/spec.md, and to .azure/deployment-plan.md when affected. Keep the EARS acceptance criteria, contract, workstreams and verification mapping consistent. Summarize what changed. ${hold}\n\nFeedback:\n${feedback}`;
        case "approve-Deploy": return feedback && `The foundry-agentic-loop-workflow run ${runId} is paused for deployment approval. Apply this feedback to .azure/deployment-plan.md and the azd configuration when affected. Summarize what changed, including cost, security and region impact. Do not deploy anything. ${hold}\n\nFeedback:\n${feedback}`;
        case "failed": return `The foundry-agentic-loop-workflow run ${runId} stopped before finishing. Inspect its error and progress log, find the root cause in the workspace, Azure configuration, quota or region, fix it and verify the fix. Add the cause and fix to ${LESSONS}. Do not resume or restart the run: I will continue from the Foundry Agentic Loop canvas.${feedback ? `\n\nGuidance:\n${feedback}` : ""}`;
        default: throw new Error("Request changes while the run waits at a checkpoint or after it fails.");
    }
}

// recorded: AGENTS.md locks the workspace and FOUNDRY_PROJECT in .env names the selected project, so the workspace already
// carries the project ID, endpoint and resource group (.env and .azure/deployment-plan.md) and prompts name it only.
export function promptFor(kind, { project, scenario, text, agent, mode = "rapid", target, subscriptions, runId, checkpoint, workiq = false, recorded = false } = {}) {
    if (!MODES.includes(mode)) throw new Error("Choose rapid prototyping or SDD mode.");
    if (runId != null && !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(runId)) throw new Error("Invalid workflow run.");
    const context = !project || unscoped.includes(kind) || (mode === "sdd" && ["guided", "scenario", "custom"].includes(kind)) ? ""
        : recorded ? `\nFoundry project: ${project.name ?? project.id.split("/").at(-1)} (FOUNDRY_PROJECT in .env).`
            : `\nSelected Foundry project: ${project.id}\nEndpoint: ${project.endpoint ?? "resolve from Azure"}\nUse resource group ${project.resourceGroup} for additional solution resources.`;
    // Edited template text replaces the scenario prompt; its industry, run skills and workflow scenarioId still apply.
    const body = scenario ? `${text?.trim() || scenario.prompt}\n\nIndustry: ${scenario.industry}` : text?.trim();
    // Name the scenario's run skills so the reuse rule applies even when the prompt text does not mention them.
    const runSkills = scenario?.runSkills?.some(name => !body.includes(name)) ? `\nRun skills to reuse: ${scenario.runSkills.join(", ")}.` : "";
    const brief = scenario ? `${body}${runSkills}` : body;
    const idea = kind === "guided" && text?.trim() ? `\n\nMy idea:\n${text.trim()}` : "";
    // Rapid prototyping builds in the selected project; SDD provisions its own.
    if (mode === "rapid" && ["guided", "scenario", "custom"].includes(kind) && !project) throw new Error("Select a Foundry project on Start before sending a rapid prototyping prompt.");
    const where = "in the selected Foundry project";
    const rapid = brief ? `Use the foundry-agentic-loop skill in rapid prototyping mode to build this complete solution ${where}.\n\n${brief}` : null;
    const sdd = brief ? `Use the foundry-agentic-loop skill in SDD mode. Start the foundry-agentic-loop-workflow to specify, implement, verify and deploy this solution end to end; Implement provisions a new Foundry project and the solution resources with azd. Run preflight and ask only the clarifying questions that change the spec before starting the workflow.\n\n${brief}\n\n${scenario?.id ? `Workflow scenarioId: ${scenario.id}\n` : ""}${azureTarget(target, subscriptions)}` : null;
    const prompts = {
        plugin: `Install or enable the missing Agentic Loop prerequisites. Check copilot plugin list and install only what is missing: copilot plugin install foundry-agentic-loop@awesome-copilot (skill, canvas and workflow) and copilot plugin install azure@awesome-copilot (Azure skills, including microsoft-foundry). If the marketplace is unknown, run copilot plugin marketplace add github/awesome-copilot first. Then reload skills and extensions and confirm the foundry-agentic-loop skill, foundry-agentic-loop-canvas and foundry-agentic-loop-workflow are available. Ask before installing anything, and do not edit Copilot settings files. If an extension is listed as disabled, tell me how to re-enable it. Tell me if a new session is required.`,
        devpack: `Guide me through installing missing or outdated az, azd (${AZD_MINIMUM} or later), and azd ai tools using Foundry DevPack: ${links.devpack}. Check my OS and installed tools first. DevPack may not include Azure CLI; if az is still missing, use Microsoft's Azure CLI installation instructions. Ask before installing anything.`,
        auth: "Check Azure CLI and Azure Developer CLI availability and current sign-in. Authenticate only installed CLIs that need it, using az login or azd auth login as appropriate. Confirm the intended tenant and subscription; do not expose tokens.",
        workiq: `Set up the Work IQ MCP server (${links.workiq}) so the Agentic Loop can use Microsoft 365 context when building. Check copilot plugin list and the configured MCP servers first; if workiq is already configured, make sure it is enabled and confirm it connects. Otherwise ask before installing: add the marketplace with copilot plugin marketplace add microsoft/work-iq if it is unknown, run copilot plugin install workiq@work-iq, reload and confirm the workiq MCP server is configured. Work IQ is in preview and may need Microsoft 365 tenant admin consent on first use; if consent is missing, say who must grant it. Tell me if a new session is required.`,
        quickstart: `Guide me through creating a Microsoft Foundry project using ${links.quickstart}. Clarify subscription, region, resource group and names, check permissions, estimate cost, and ask for approval before provisioning. Configure Application Insights for the project.`,
        landingZone: `Guide me through a production-ready enterprise AI deployment using Azure AI Landing Zones: ${links.landingZone}. Clarify governance, networking, identity, subscriptions, region and cost before provisioning.`,
        insights: "Create or reuse an Azure Application Insights resource and connect it to this Foundry project. Verify the project connection, managed-identity permissions and telemetry configuration. Ask before creating billable resources.",
        guided: mode === "sdd"
            ? `Use the foundry-agentic-loop skill in SDD mode to guide me from idea to a deployed agentic solution. Clarify the use case, agents, data, tools and user experience with focused questions, then start the foundry-agentic-loop-workflow.${idea}\n\n${azureTarget(target, subscriptions)}`
            : `Use the foundry-agentic-loop skill in rapid prototyping mode to guide me through creating a complete agentic solution ${where}: clarify the use case, one or more agents, and the user experience. Ask focused questions and obtain approval before provisioning.${idea}`,
        scenario: scenario ? (mode === "sdd" ? sdd : rapid) : null,
        custom: mode === "sdd" ? sdd : rapid,
        sdd,
        changes: kind === "changes" && runId ? changeRequest(runId, checkpoint, text?.trim()) : null,
        improve: `Use the foundry-agentic-loop skill in improve mode. Analyze ${runId ? `foundry-agentic-loop-workflow run ${runId} and ` : ""}recent Agentic Loop evidence: .agentic-loop/runs flight records, ${LESSONS} lessons, workflow run history and session history. Find recurring failures, slow phases and manual fixes, propose the smallest evidence-backed changes to the foundry-agentic-loop skill and workflow, check them against the skill evals, and ask before applying them.`,
        deploy: runId ? `Use the foundry-agentic-loop skill in SDD mode to deploy the solution that foundry-agentic-loop-workflow run ${runId} verified without deploying. Follow its Deploy phase guide (references/deploy.md) in Chat: run its preflight, summarize the resources, region, cost and security impact from .azure/deployment-plan.md and docs/verify.md, and ask for my approval before azd up. Pass its gate, write docs/deploy.md and add lessons to ${LESSONS}.`
            : mode === "rapid" ? `${shortCommand("deploy")} redeploy the changed agents and MCP servers, rerun their probes, then ask for my approval before deploying the app.` : null,
        run: mode === "rapid" ? `${shortCommand("run")} verify that both dev servers respond and upsert the verified LOCAL_FRONTEND in .env.` : null,
        test: mode === "rapid" ? `${shortCommand("test")} report the root cause of each failure and ask before changing code.` : null,
        convert: mode === "rapid" ? `${shortCommand("convert to SDD")} confirm the switch with me first.` : null,
        foundry: "Open the existing Microsoft Foundry Canvas in its Manage view for my use. Reuse its public canvas API, then synchronize the selected project using set_canvas_selected_foundry_project with the verified project ID and endpoint below. Resolve the tenant from the selected subscription before synchronization, especially when switching directories. Do not create or deploy anything. Keep this Agentic Loop panel available.",
        inspect: agent ? `Launch Agent Inspector for this existing Foundry agent using microsoft-foundry. Inspector runs the agent from local source (azd ai agent run), so ${recorded ? "use its source in this workspace" : "locate the source that matches this agent and version, and explain any missing prerequisites"}; do not substitute another agent, scaffold or redeploy. Verify Inspector responds and open it in the integrated browser. Ask before installing tools or sending test prompts that may incur charges.\nAgent name: ${JSON.stringify(agent.name)}\nAgent version: ${agent.version == null ? "Resolve the latest version; none was returned by discovery." : JSON.stringify(agent.version)}` : null,
        optimizer: `Use the microsoft-foundry skill to help me improve an existing agent with Foundry Agent Optimizer: ${links.optimizer}. Confirm the target agent and baseline version/configuration in the selected project; ask if ambiguous. Check preview availability and whether this is a prompt or hosted agent. For hosted agents, inspect optimizer readiness before proposing the required integration. Reuse representative evaluation data and available evaluator/optimization model deployments; agree on quality criteria, optimization targets and a bounded run budget. Protect against tool side effects with test endpoints or approved mocks. Ask before billable runs, new resources, or applying/promoting a candidate and redeploying. Compare candidates against the baseline and report evidence, trade-offs and available measured usage; do not silently replace the running agent.`,
        evaluations: `Use the microsoft-foundry skill to create automatic evaluations for an existing agent following ${links.evaluations}. Confirm the target agent/version in the selected project and verify installed SDK compatibility, permissions, judge-model deployment and regional support. Reuse or create a representative, privacy-reviewed dataset; generate and review an agent-specific rubric with suitable quality, safety and tool-use evaluators. Define acceptance thresholds and a repeatable evaluation workflow that records run IDs, scores and failures. Clarify whether automation should run in CI on changes or through a supported scheduled/continuous evaluation workflow before configuring its trigger, cadence, sampling and budget. Protect against tool side effects. Ask before billable runs, data uploads, new resources or enabling recurring execution. Do not substitute a one-off evaluation for the agreed automation.`,
        insightsScan: `Use the microsoft-foundry skill to run an on-demand Foundry agent Insights scan following ${links.insightsScan}. Confirm the target agent/version and analysis window in the selected project; ask if ambiguous. Check preview availability, connected Application Insights, recent representative traces, a supported judge-model deployment, and the required user/project managed-identity access to telemetry and the model. Do not enable sensitive-content capture or broaden protected-data access without approval. Agree on scope and billable analysis before starting; do not enable a recurring schedule. Follow the asynchronous run to a terminal result with bounded polling and report its run ID, status and available usage. Review supporting traces before accepting findings, summarize affected versions and recommended evaluations or optimizations, and ask before applying fixes.`,
    };
    if (typeof prompts[kind] !== "string" || !prompts[kind].trim()) throw new Error("Choose a valid prompt.");
    if (projectKinds.includes(kind) && !project) throw new Error("Select a Foundry project first.");
    const grounding = workiq && briefKinds.includes(kind) ? `\n\n${WORKIQ_CONTEXT}` : "";
    return `[Agentic Loop canvas action]\n${prompts[kind]}${grounding}${context}`;
}

export class Model {
    constructor({ azure, session, scenarios, storage }) {
        this.azure = azure;
        this.session = session;
        this.scenarios = scenarios;
        this.storage = storage;
        this.state = { tab: "start", subscriptionId: null, projectId: null, draft: "", mode: null, target: validTarget(), workiq: false, template: null, started: false, view: "gallery" };
        this.projects = [];
        this.subscriptions = [];
        this.projectWarnings = [];
        this.writes = Promise.resolve();
        this.envProjectKey = undefined;
        this.envProjectError = null;
        this.envProjectRetryAt = 0;
        this.envProjectBackoff = ENV_RETRY;
        this.envSyncToken = 0;
        // Explicit project and subscription choices; a .env synchronization started before one does not apply.
        this.revision = 0;
    }

    async load() {
        try { Object.assign(this.state, JSON.parse(await readFile(this.storage, "utf8"))); }
        catch (error) { if (error.code !== "ENOENT") throw error; }
        let migrated = false;
        if (Object.hasOwn(RETIRED_TABS, this.state.tab)) { this.state.tab = RETIRED_TABS[this.state.tab]; migrated = true; }
        else if (!TABS.includes(this.state.tab)) { this.state.tab = "start"; migrated = true; }
        if (typeof this.state.workiq !== "boolean") { this.state.workiq = false; migrated = true; }
        for (const key of ["estimate", "scope"]) if (Object.hasOwn(this.state, key)) { delete this.state[key]; migrated = true; }
        if (this.state.mode != null && !MODES.includes(this.state.mode)) { this.state.mode = null; migrated = true; }
        try { this.state.target = validTarget(this.state.target ?? {}); }
        catch { this.state.target = validTarget(); migrated = true; }
        if (this.state.template != null && !this.isTemplate(this.state.template)) { Object.assign(this.state, { template: null, started: false }); migrated = true; }
        // A brief saved before prompt templates existed becomes the idea of the guided template.
        if (this.state.template == null && typeof this.state.draft === "string" && this.state.draft.trim()) { this.state.template = GUIDED; migrated = true; }
        if (typeof this.state.draft !== "string") { this.state.draft = ""; migrated = true; }
        if (typeof this.state.started !== "boolean" || (this.state.started && this.state.template == null)) { this.state.started = false; migrated = true; }
        if (!VIEWS.includes(this.state.view)) { this.state.view = "gallery"; migrated = true; }
        if (migrated) await this.save();
    }

    isTemplate(id) { return id === GUIDED || (this.scenarios ?? []).some(row => row.id === id); }

    // Choosing a template resets its draft unless one is given, and a draft needs a template. Sending from a template
    // locks it; started: false unlocks it with its text kept, which the extension allows only before the build leaves a trace.
    async preferences(input) {
        const next = input.started === false ? { started: false } : {};
        const current = { template: this.state.template, started: this.state.started, ...next };
        for (const key of ["tab", "workiq", "view", "draft"]) if (Object.hasOwn(input, key)) next[key] = input[key];
        if (Object.hasOwn(input, "template")) {
            const template = input.template || null;
            if (template !== null && !this.isTemplate(template)) throw new Error("Choose an available prompt template.");
            if (current.started && template !== current.template) throw templateLocked();
            if (template !== current.template && !Object.hasOwn(input, "draft")) next.draft = "";
            next.template = template;
        }
        if ((Object.hasOwn(next, "template") ? next.template : current.template) == null) next.draft = "";
        Object.assign(this.state, next);
        await this.save();
        return this.state;
    }

    // An AGENTS.md lock wins over an explicit choice, which wins over the run-based default.
    mode(hasRuns, lock = null) { return lock ?? this.state.mode ?? (hasRuns ? "sdd" : "rapid"); }

    async setMode(mode) {
        if (mode != null && !MODES.includes(mode)) throw new Error("Choose rapid prototyping or SDD mode.");
        this.state.mode = mode;
        await this.save();
        return this.state;
    }

    async setTarget(input) {
        this.state.target = validTarget({ ...this.state.target, ...input });
        await this.save();
        return this.state.target;
    }

    async targets() {
        this.subscriptions = await this.azure.subscriptions();
        if (this.state.target.subscriptionId && !this.subscriptions.some(row => row.id === this.state.target.subscriptionId)) {
            this.state.target = { ...this.state.target, subscriptionId: null };
            await this.save();
        }
        return { subscriptions: this.subscriptions, target: this.state.target };
    }

    async save() {
        const content = JSON.stringify(this.state, null, 2);
        this.writes = this.writes.catch(() => {}).then(async () => {
            await mkdir(path.dirname(this.storage), { recursive: true });
            await writeFile(`${this.storage}.tmp`, content, { mode: 0o600 });
            await rename(`${this.storage}.tmp`, this.storage);
        });
        await this.writes;
    }

    get project() { return this.projects.find(project => project.id === this.state.projectId) ?? null; }

    async setup() {
        const [result, extensions, servers] = await Promise.all([outcome(async () => {
            const diagnostics = await this.session.rpc.skills.reload();
            if (diagnostics.errors.length) throw new Error(diagnostics.errors.join("; "));
            return this.session.rpc.skills.list();
        }), outcome(() => this.session.rpc.extensions.list()),
        // listConfigured reads configuration only; mcp.list could start servers.
        outcome(() => this.session.rpc.mcp.listConfigured())]);
        const setup = await this.azure.prerequisites(result.data?.skills ?? [], extensions.data?.extensions ?? null);
        if (result.status === "error") {
            setup.ready = false;
            setup.discoveryError = result.error;
        }
        setup.workiq = workIqStatus(servers);
        return setup;
    }

    resourceState() {
        return { projects: this.projects, subscriptions: this.subscriptions, selected: this.project, subscriptionId: this.state.subscriptionId, warnings: this.projectWarnings };
    }

    // Reads .env and runs Azure discovery outside `serial` (the extension's mutation queue), so a poll never delays a
    // user action; only applying the discovered selection waits for it, and an explicit choice made meanwhile wins.
    async frontends(retry = false, serial = work => work()) {
        const result = await frontendStatus(this.session);
        // A .env that cannot be read or parsed only warns; the selection and discovery are left as they are.
        if (!result.envError) await this.syncEnvProject(result.foundryProject, retry, serial);
        return { ...result, projectSync: {
            ...this.resourceState(),
            error: result.envError ? null : this.envProjectError,
        } };
    }

    async syncEnvProject(target, retry, serial) {
        const key = target.id?.toLowerCase() ?? target.error;
        if (key !== this.envProjectKey || retry) this.envProjectBackoff = ENV_RETRY;
        if (key === this.envProjectKey && !(this.envProjectError && (retry || Date.now() >= this.envProjectRetryAt))) return;
        this.envProjectKey = key;
        this.envProjectError = target.error;
        const token = ++this.envSyncToken;
        if (target.id) {
            const revision = this.revision;
            const sync = await outcome(async () => {
                const data = await this.fetchProjects(projectIdentity(target.id).subscriptionId, target.id);
                await serial(async () => { if (token === this.envSyncToken && revision === this.revision) await this.applyDiscovery(data); });
            });
            if (token !== this.envSyncToken) return;
            this.envProjectError = sync.status === "error" ? sync.error : null;
        }
        // Failed discovery backs off exponentially; Refresh (retry) or a changed .env starts again at 30 s.
        this.envProjectRetryAt = Date.now() + this.envProjectBackoff;
        this.envProjectBackoff = target.id && this.envProjectError ? Math.min(this.envProjectBackoff * 2, ENV_RETRY_MAX) : ENV_RETRY;
    }

    // Keeps the current list and selection until a refresh succeeds, so a failed refresh does not empty them.
    async discover(subscriptionId, requiredProjectId) {
        const data = await this.fetchProjects(subscriptionId, requiredProjectId);
        // A subscription the user chose outranks a .env synchronization still in flight.
        if (subscriptionId) this.revision++;
        return this.applyDiscovery(data);
    }

    // Azure reads only; nothing changes until applyDiscovery.
    async fetchProjects(subscriptionId, requiredProjectId) {
        const subscriptions = await this.azure.subscriptions();
        const requested = subscriptionId ?? this.state.subscriptionId ?? subscriptions[0]?.id;
        const subscription = subscriptions.find(row => row.id.toLowerCase() === requested?.toLowerCase());
        const id = subscription?.id;
        if (!requested) throw new Error("No enabled Azure subscriptions found. Sign in and recheck access.");
        if (!id) throw new Error("The selected subscription is no longer accessible. Select another subscription.");
        const result = await this.azure.projects(id);
        const projects = result.projects.map(project => ({ ...project, portalUrl: projectPortalUrl(project.id, subscription.tenantId) }));
        if (requiredProjectId && !projects.some(project => project.id.toLowerCase() === requiredProjectId.toLowerCase())) {
            throw new Error(`The FOUNDRY_PROJECT in .env could not be found or accessed.${result.warnings.length ? ` ${result.warnings.join("; ")}` : ""}`);
        }
        return { result, subscriptions, id, projects, requiredProjectId };
    }

    async applyDiscovery({ result, subscriptions, id, projects, requiredProjectId }) {
        const preferredId = requiredProjectId ?? this.state.projectId;
        const selected = projects.find(project => project.id.toLowerCase() === preferredId?.toLowerCase());
        const previous = { subscriptions: this.subscriptions, projects: this.projects, warnings: this.projectWarnings, state: { ...this.state } };
        this.subscriptions = subscriptions;
        this.projects = projects;
        this.projectWarnings = result.warnings;
        this.state.subscriptionId = id;
        this.state.projectId = selected?.id ?? this.projects[0]?.id ?? null;
        try { await this.save(); }
        catch (error) {
            this.subscriptions = previous.subscriptions;
            this.projects = previous.projects;
            this.projectWarnings = previous.warnings;
            this.state = previous.state;
            throw error;
        }
        return { ...result, ...this.resourceState() };
    }

    async select(projectId) {
        if (!this.projects.some(project => project.id === projectId)) throw new Error("Refresh resources and select an available project.");
        this.revision++;
        this.state.projectId = projectId;
        await this.save();
        return this.project;
    }

    async send(input, mode = this.mode(false), checkpoint = null, lock = null) {
        const scenario = input.scenarioId ? this.scenarios.find(row => row.id === input.scenarioId) : undefined;
        if (input.scenarioId && !scenario) throw new Error("Unknown scenario.");
        const template = input.kind === "guided" ? GUIDED : input.kind === "scenario" ? scenario?.id : null;
        if (template && this.state.started && template !== this.state.template) throw templateLocked();
        const prompt = promptFor(input.kind, {
            project: this.project, scenario, text: input.text, mode, runId: input.runId, checkpoint,
            target: this.state.target, subscriptions: this.subscriptions, workiq: this.state.workiq === true,
            recorded: await this.recorded(lock),
        });
        const messageId = await this.session.send({ prompt });
        if (!template) return { messageId, prompt };
        // The message is already in Chat, so a failed save must not report the send as failed; the next save persists it.
        Object.assign(this.state, { template, started: true, draft: input.text?.trim() ?? "" });
        await this.save().catch(() => {});
        return { messageId, prompt, template, started: true };
    }

    // Whether a locked workspace's FOUNDRY_PROJECT names the selected project; an unreadable .env counts as not recorded.
    async recorded(lock) {
        const id = this.project?.id;
        if (!lock || !id) return false;
        try { return (await frontendStatus(this.session)).foundryProject.id?.toLowerCase() === id.toLowerCase(); }
        catch { return false; }
    }

    async inspectAgent({ projectId, agentName }, lock = null) {
        const project = this.project;
        if (!project || project.id !== projectId) throw new Error("The selected project changed. Refresh Explore before inspecting this agent.");
        if (typeof agentName !== "string" || !agentName.trim()) throw new Error("Choose an agent to inspect.");
        const agents = await this.azure.agents(project);
        const agent = agents.find(row => row.name === agentName);
        if (!agent) throw new Error("This agent is no longer available in the selected project. Refresh Explore.");
        if (this.project?.id !== project.id) throw new Error("The selected project changed. Refresh Explore before inspecting this agent.");
        const prompt = promptFor("inspect", { project, agent, recorded: await this.recorded(lock) });
        const messageId = await this.session.send({ prompt });
        return { messageId, agentName: agent.name };
    }
}
