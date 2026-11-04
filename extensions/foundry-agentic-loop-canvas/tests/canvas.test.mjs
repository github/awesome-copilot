import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { request } from "node:http";
import { Azure, projectIdentity, trustedEndpoint, foundryPortalUrl, foundryProjectUrl, azurePortalUrl } from "../lib/azure.mjs";
import { GUIDED, Model, TABS, TAXONOMY, VIEWS, links, promptFor, templateLocked, validTarget, workIqStatus } from "../lib/model.mjs";
import { readBody, startServer } from "../lib/server.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const id = "/subscriptions/11111111-1111-1111-1111-111111111111/resourceGroups/rg-demo/providers/Microsoft.CognitiveServices/accounts/demo/projects/demo-project";
const project = { id, ...projectIdentity(id), endpoint: "https://demo.services.ai.azure.com/api/projects/demo-project" };

test("project parsing and endpoint allowlist reject arbitrary hosts and credentials", () => {
    assert.equal(project.resourceGroup, "rg-demo");
    assert.equal(trustedEndpoint(project.endpoint), project.endpoint);
    for (const endpoint of ["http://localhost/api/projects/test", "https://evil.com/api/projects/test",
        "https://a.services.ai.azure.com.evil.com/api/projects/test", "https://user@demo.services.ai.azure.com/api/projects/test",
        `${project.endpoint}?api-key=secret`]) assert.throws(() => trustedEndpoint(endpoint));
    assert.throws(() => projectIdentity("/subscriptions/x"));
});

test("setup checks all tools and requires enabled skills and valid authentication", async () => {
    const calls = [];
    const azure = new Azure(async (file, args) => {
        calls.push([file, args]);
        if (args[0] === "version" && file === "az") return { "azure-cli": "2.88" };
        if (args.includes("get-access-token")) return { expiresOn: "later" };
        return "Available";
    });
    const skills = ["foundry-agentic-loop", "microsoft-foundry"].map(name => ({ name, enabled: true, source: "plugin", pluginName: "foundry-agentic-loop" }));
    const extensions = ["foundry-agentic-loop-canvas", "foundry-agentic-loop-workflow"].map(name => ({ name, status: "running", source: "user" }));
    const ready = await azure.prerequisites(skills, extensions);
    assert.equal(ready.ready, true);
    assert.equal(ready.checks.find(row => row.id === "foundry-agentic-loop").data, "Enabled (plugin foundry-agentic-loop)");
    assert(calls.some(([, args]) => args.includes("--check-status")));
    assert(calls.some(([, args]) => args.includes("get-access-token") && args.includes("--query")));
    const disabledSkill = await azure.prerequisites(skills.map(row => row.name === "foundry-agentic-loop" ? { ...row, enabled: false } : row), extensions);
    assert.equal(disabledSkill.ready, false);
    assert.match(disabledSkill.checks.find(row => row.id === "foundry-agentic-loop").error, /^foundry-agentic-loop not available to this session/);
    const withoutWorkflow = await azure.prerequisites(skills, extensions.slice(0, 1));
    assert.match(withoutWorkflow.checks.find(row => row.id === "foundry-agentic-loop-workflow").error, /Not installed/);
    const failedExtension = await azure.prerequisites(skills, [extensions[0], { ...extensions[1], status: "failed" }]);
    assert.match(failedExtension.checks.find(row => row.id === "foundry-agentic-loop-workflow").error, /^Failed \(user\)\. Check its log/);
    const disabledExtension = await azure.prerequisites(skills, [extensions[0], { ...extensions[1], status: "disabled" }]);
    assert.match(disabledExtension.checks.find(row => row.id === "foundry-agentic-loop-workflow").error, /^Disabled \(user\)\. .*new session/);
    assert.match((await azure.prerequisites(skills)).checks.find(row => row.id === "foundry-agentic-loop-canvas").error, /unavailable/);
    skills[0].enabled = false;
    assert.equal((await azure.prerequisites(skills, extensions)).ready, false);
    const failed = await new Azure(async () => { throw new Error("Not authenticated"); }).prerequisites(skills, extensions);
    assert.equal(failed.ready, false);
    assert.match(failed.checks.find(row => row.id === "az-auth").error, /Not authenticated/);
});

test("setup recognizes plugin, user and session extension copies and flags active duplicates", async () => {
    const azure = new Azure(async (file, args) => file === "az" && args[0] === "version" ? { "azure-cli": "2.88" } : args.includes("get-access-token") ? { expiresOn: "later" } : "Available");
    const skills = ["foundry-agentic-loop", "microsoft-foundry"].map(name => ({ name, enabled: true, source: "plugin" }));
    const check = (result, id) => result.checks.find(row => row.id === id);
    const plugin = [
        { id: "plugin:foundry-agentic-loop:foundry-agentic-loop-canvas", name: "foundry-agentic-loop:foundry-agentic-loop-canvas", source: "plugin", status: "running" },
        { id: "plugin:foundry-agentic-loop:foundry-agentic-loop-workflow", name: "foundry-agentic-loop-workflow", source: "plugin", status: "running" },
    ];
    const installed = await azure.prerequisites(skills, plugin);
    assert.equal(installed.ready, true);
    assert.equal(check(installed, "foundry-agentic-loop-canvas").data, "Running (plugin)");
    assert.equal(check(installed, "foundry-agentic-loop-workflow").data, "Running (plugin)");
    const session = await azure.prerequisites(skills, [plugin[0], { id: "session:foundry-agentic-loop-workflow", name: "foundry-agentic-loop-workflow", source: "session", status: "starting" }]);
    assert.equal(check(session, "foundry-agentic-loop-workflow").data, "Starting (session)");
    const lookalike = await azure.prerequisites(skills, [{ id: "user:my-foundry-agentic-loop-canvas", name: "my-foundry-agentic-loop-canvas", source: "user", status: "running" }, plugin[1]]);
    assert.match(check(lookalike, "foundry-agentic-loop-canvas").error, /^Not installed/);
    const userCopy = { id: "user:foundry-agentic-loop-canvas", name: "foundry-agentic-loop-canvas", source: "user", status: "running" };
    const disabledPlugin = await azure.prerequisites(skills, [{ ...plugin[0], status: "disabled" }, userCopy, plugin[1]]);
    assert.equal(check(disabledPlugin, "foundry-agentic-loop-canvas").data, "Running (user)");
    const duplicate = await azure.prerequisites(skills, [...plugin, userCopy]);
    assert.equal(duplicate.ready, true);
    assert.equal(check(duplicate, "foundry-agentic-loop-canvas").data, "Running (plugin). Duplicate copy from user: remove it, then reload");
});

test("Azure pagination is complete and refuses cross-origin continuations", async () => {
    const url = "https://management.azure.com/test?api-version=1";
    let count = 0;
    const azure = new Azure(async () => ++count === 1 ? { value: [1], nextLink: `${url}&page=2` } : { value: [2] });
    assert.deepEqual(await azure.pages(url), [1, 2]);
    const evil = new Azure(async () => ({ value: [], nextLink: "https://evil.com/test" }));
    await assert.rejects(evil.pages(url), /unsafe/);
});

test("monitoring does not mistake a same-resource-group resource for a project connection", async () => {
    const empty = new Azure(async () => ({ value: [] }));
    assert.equal((await empty.monitoring(project)).connected, false);
    const connected = new Azure(async () => ({ value: [{ name: "telemetry", properties: { category: "AppInsights" } }] }));
    assert.deepEqual(await connected.monitoring(project), { connected: true, names: ["telemetry"] });
    await assert.rejects(new Azure(async () => { throw new Error("Forbidden"); }).monitoring(project), /Forbidden/);
});

test("Foundry portal links encode project scope, resource names and agent versions", () => {
    const prefix = "https://ai.azure.com/nextgen/r/EREREREREREREREREREREQ,rg-demo,,demo,demo-project/build";
    assert.equal(foundryPortalUrl(id, "agent", "support-agent", "4"),
        `${prefix}/agents/support-agent/build?version=4`);
    assert.equal(foundryPortalUrl(id, "agent", "support-agent"),
        `${prefix}/agents/support-agent/build`);
    assert.equal(foundryPortalUrl(id, "model", "gpt-4o"),
        `${prefix}/models/deployments/gpt-4o/playground`);
    assert.equal(foundryPortalUrl(id, "toolbox", "support-tools"),
        `${prefix}/toolboxes/support-tools`);
    assert.equal(foundryPortalUrl(id, "toolbox", "tools /?&#"),
        `${prefix}/toolboxes/tools%20%2F%3F%26%23`);
    const escaped = new URL(foundryPortalUrl(id, "agent", "name /?&#", "1&other=value"));
    assert(escaped.pathname.endsWith("/agents/name%20%2F%3F%26%23/build"));
    assert.deepEqual([...escaped.searchParams], [["version", "1&other=value"]]);
    const scoped = foundryPortalUrl(id.replace("rg-demo", "rg, special").replace("demo-project", "project#one"), "model", "a/b");
    assert(scoped.includes(",rg%2C%20special,,demo,project%23one/"));
    assert(scoped.endsWith("/models/deployments/a%2Fb/playground"));
    assert.throws(() => foundryPortalUrl(id, "agent", ""));
    assert.throws(() => foundryPortalUrl(id, "agent", ".."));
    assert.throws(() => foundryPortalUrl(id, "unsupported", "tools"));
    assert.throws(() => foundryPortalUrl(id.replace(project.subscriptionId, "bad"), "model", "model"));
});

test("Foundry project links open the project home in the subscription's directory", () => {
    const home = "https://ai.azure.com/nextgen/r/EREREREREREREREREREREQ,rg-demo,,demo,demo-project/home";
    const tenantId = "33333333-3333-3333-3333-333333333333";
    assert.equal(foundryProjectUrl(id), home);
    assert.equal(foundryProjectUrl(id, tenantId), `${home}?tid=${tenantId}`);
    assert.equal(foundryProjectUrl(id, "not-a-tenant&tid=other"), home, "a malformed tenant is dropped, not encoded");
    assert(foundryProjectUrl(id.replace("rg-demo", "rg, special").replace("demo-project", "project#one")).endsWith(",rg%2C%20special,,demo,project%23one/home"));
    assert.throws(() => foundryProjectUrl(id.replace(project.subscriptionId, "1111")), /invalid subscription ID/);
    assert.throws(() => foundryProjectUrl("/subscriptions/x"), /Not a Microsoft Foundry project/);
});

test("discovered projects carry a portal link in their subscription's directory", async t => {
    const directory = await mkdtemp(path.join(tmpdir(), "foundry-agentic-loop-test-"));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const tenantId = "33333333-3333-3333-3333-333333333333";
    const unaddressable = { ...project, id: id.replace(project.subscriptionId, "1111"), name: "unaddressable" };
    const model = new Model({
        azure: { subscriptions: async () => [{ id: project.subscriptionId, tenantId }], projects: async () => ({ projects: [project, unaddressable], warnings: [] }) },
        scenarios: [], storage: path.join(directory, "settings.json"),
    });
    const result = await model.discover();
    assert.equal(result.selected.portalUrl, `${foundryProjectUrl(id)}?tid=${tenantId}`);
    assert.equal(result.projects[1].portalUrl, null, "a project the portal cannot address stays listed without a link");
    assert.equal(project.portalUrl, undefined, "discovery does not mutate the Azure rows");
});

test("Azure portal links use the full resource ID and encode fragment delimiters", () => {
    const resourceId = `/subscriptions/${project.subscriptionId}/resourceGroups/rg-demo/providers/Microsoft.Insights/components/monitoring`;
    assert.equal(azurePortalUrl(resourceId), `https://portal.azure.com/#resource${resourceId}/overview`);
    const nested = `${resourceId}/providers/Microsoft.Insights/diagnosticSettings/logs`;
    assert.equal(azurePortalUrl(nested), `https://portal.azure.com/#resource${nested}/overview`);
    assert.equal(azurePortalUrl(resourceId.replace("monitoring", "name #?&%")),
        `https://portal.azure.com/#resource${resourceId.replace("monitoring", "name%20%23%3F%26%25")}/overview`);
    for (const invalid of [undefined, "", "https://evil.example", "/subscriptions/bad", `${resourceId}/..`]) {
        assert.throws(() => azurePortalUrl(invalid), /invalid resource ID/);
    }
});

test("inventory exposes structured metadata and per-resource testing links while preserving partial errors", async () => {
    const azure = new Azure(async (_file, args) => {
        const url = args[args.indexOf("--url") + 1] ?? "";
        if (url.includes("/agents?")) return { data: [
            { name: "support", versions: { latest: { version: "7", definition: { kind: "hosted" } } } },
            { name: "prompt-agent", versions: { latest: { definition: { kind: "prompt" } } } },
        ] };
        if (url.includes("/deployments?")) return { value: [
            { name: "chat-production", properties: { model: { name: "gpt-4o", version: "2024-08-06" } }, sku: { name: "GlobalStandard" } },
            { name: "embedding-production" },
        ] };
        if (url.includes("/toolboxes?")) throw new Error("Toolbox access denied");
        return [{ id: `${project.accountId}/deployments/chat-production`, name: "chat-production", type: "Microsoft.CognitiveServices/accounts/deployments" }];
    });
    const result = await azure.explore(project);
    assert.equal(result.agents.status, "ready");
    assert.equal(result.agents.data[0].version, "7");
    assert.equal(result.agents.data[1].version, null);
    assert.deepEqual(result.agents.data[0].metadata, [{ label: "Type", value: "hosted" }]);
    assert.equal(new URL(result.agents.data[0].playgroundUrl).searchParams.get("version"), "7");
    assert(result.agents.data[1].playgroundUrl.endsWith("/agents/prompt-agent/build"));
    assert.deepEqual(result.models.data[0].metadata, [
        { label: "Model", value: "gpt-4o" }, { label: "Version", value: "2024-08-06" }, { label: "SKU", value: "GlobalStandard" },
    ]);
    assert(result.models.data[0].playgroundUrl.endsWith("/models/deployments/chat-production/playground"));
    assert.deepEqual(result.models.data[1].metadata, []);
    assert.equal(result.tools.status, "error");
    assert.equal(result.tools.error, "Toolbox access denied");
    assert.equal(result.resources.data[0].playgroundUrl, undefined);
    assert.equal(result.resources.data[0].portalUrl, azurePortalUrl(`${project.accountId}/deployments/chat-production`));
});

test("toolbox inventory links to the named toolbox in the selected project", async () => {
    const azure = new Azure(async (_file, args) => {
        const url = args[args.indexOf("--url") + 1] ?? "";
        if (url.includes("/toolboxes?")) return { value: [{ name: "support-tools", description: "Customer tools" }] };
        return args[0] === "resource" ? [] : { value: [] };
    });
    const result = await azure.explore(project);
    assert.equal(result.tools.status, "ready");
    assert.deepEqual(result.tools.data, [{
        name: "support-tools", detail: "Customer tools",
        portalUrl: foundryPortalUrl(project.id, "toolbox", "support-tools"),
    }]);
});

test("Optimize prompts include official guidance, selected project and operation-specific safeguards", () => {
    for (const kind of ["optimizer", "evaluations", "insightsScan"]) {
        const prompt = promptFor(kind, { project });
        assert(prompt.startsWith("[Agentic Loop canvas action]"));
        assert(prompt.includes("microsoft-foundry"));
        assert(prompt.includes(links[kind]));
        assert(prompt.includes(id));
        assert(prompt.includes(project.endpoint));
        assert(prompt.endsWith("Use resource group rg-demo for additional solution resources."));
        assert.throws(() => promptFor(kind), /Select a Foundry project/);
    }
    const optimizer = promptFor("optimizer", { project });
    assert(optimizer.includes("prompt or hosted agent"));
    assert(optimizer.includes("optimizer readiness"));
    assert(optimizer.includes("tool side effects"));
    assert(optimizer.includes("Ask before billable runs"));
    assert(optimizer.includes("do not silently replace the running agent"));
    const evaluations = promptFor("evaluations", { project });
    assert(evaluations.includes("CI on changes"));
    assert(evaluations.includes("scheduled/continuous"));
    assert(evaluations.includes("acceptance thresholds"));
    assert(evaluations.includes("enabling recurring execution"));
    const scan = promptFor("insightsScan", { project });
    assert(scan.includes("on-demand"));
    assert(scan.includes("required user/project managed-identity access"));
    assert(scan.includes("Do not enable sensitive-content capture"));
    assert(scan.includes("do not enable a recurring schedule"));
    assert(scan.includes("bounded polling"));
    assert.throws(() => promptFor("cost", { project }), /valid prompt/);
    assert(promptFor("insights", { project }).includes("connect it to this Foundry project"));
});

test("Optimize sends one Chat prompt per action and surfaces missing context or delivery errors", async () => {
    const sent = [];
    const model = new Model({ scenarios: [], session: { send: async input => { sent.push(input); return "message-1"; } } });
    for (const kind of ["optimizer", "evaluations", "insightsScan"]) {
        await assert.rejects(model.send({ kind }), /Select a Foundry project/);
    }
    assert.equal(sent.length, 0);
    model.projects = [project];
    model.state.projectId = project.id;
    for (const kind of ["optimizer", "evaluations", "insightsScan"]) {
        assert.equal((await model.send({ kind })).messageId, "message-1");
        assert.equal(sent.at(-1).prompt, promptFor(kind, { project }));
    }
    assert.equal(sent.length, 3);
    model.session.send = async () => { throw new Error("Chat unavailable"); };
    await assert.rejects(model.send({ kind: "optimizer" }), /Chat unavailable/);
});

test("saved settings migrate: retired tabs map to the shared tabs, retired keys go, invalid values reset", async t => {
    const directory = await mkdtemp(path.join(tmpdir(), "foundry-agentic-loop-migration-"));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const storage = path.join(directory, "settings.json");
    assert.deepEqual(TABS, ["start", "build", "explore", "optimize"]);
    for (const [tab, expected] of [["setup", "start"], ["resources", "start"], ["workflow", "build"], ["cost", "optimize"], ["explore", "explore"], ["unknown", "start"]]) {
        await writeFile(storage, JSON.stringify({ tab, scope: "user", projectId: id, draft: "Keep my draft", estimate: { inputMillions: 5 }, mode: "turbo", target: { location: "East US" }, workiq: "yes" }));
        const model = new Model({ storage });
        await model.load();
        assert.equal(model.state.tab, expected, tab);
        assert.equal(model.state.workiq, false, "only a boolean opts in to Work IQ");
        assert.equal(model.state.projectId, id);
        assert.equal(model.state.draft, "Keep my draft");
        assert.equal(model.state.template, GUIDED, "a brief saved before prompt templates becomes the Shape it with Copilot idea");
        assert.equal(model.state.started, false);
        assert.equal(model.state.view, "gallery");
        assert(!Object.hasOwn(model.state, "estimate"));
        assert(!Object.hasOwn(model.state, "scope"));
        assert.equal(model.state.mode, null);
        assert.deepEqual(model.state.target, validTarget());
        assert.deepEqual(JSON.parse(await readFile(storage, "utf8")), model.state);
        const restored = new Model({ storage });
        await restored.load();
        assert.deepEqual(restored.state, model.state);
    }
    await writeFile(storage, JSON.stringify({ tab: "build", workiq: true }));
    const kept = new Model({ storage });
    await kept.load();
    assert.equal(kept.state.tab, "build");
    assert.equal(kept.state.workiq, true);
    assert.deepEqual([kept.state.template, kept.state.started, kept.state.draft], [null, false, ""]);
    const scenarios = [{ id: "retail-returns", industry: "Retail", prompt: "Build a returns assistant." }];
    for (const [saved, expected] of [
        [{ template: "retired-scenario", started: true, view: "carousel" }, [null, false, "", "gallery"]],
        [{ template: "retired-scenario", started: true, draft: "My notes" }, [GUIDED, false, "My notes", "gallery"]],
        [{ started: true, draft: "" }, [null, false, "", "gallery"]],
        [{ template: GUIDED, started: "yes", draft: 42 }, [GUIDED, false, "", "gallery"]],
        [{ template: "retail-returns", started: true, draft: "Edited", view: "list" }, ["retail-returns", true, "Edited", "list"]],
    ]) {
        await writeFile(storage, JSON.stringify(saved));
        const model = new Model({ scenarios, storage });
        await model.load();
        assert.deepEqual([model.state.template, model.state.started, model.state.draft, model.state.view], expected, JSON.stringify(saved));
    }
});

test("prompt templates: choosing one resets its draft, sending locks it, and unlocking keeps the text", async t => {
    const directory = await mkdtemp(path.join(tmpdir(), "foundry-agentic-loop-template-"));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const storage = path.join(directory, "settings.json");
    const scenarios = [
        { id: "retail-returns", industry: "Retail", prompt: "Build a returns assistant." },
        { id: "claims-triage", industry: "Insurance", prompt: "Build a claims triage agent." },
    ];
    const sent = [];
    const model = new Model({ scenarios, storage, session: { send: async input => { sent.push(input.prompt); return `message-${sent.length}`; } } });
    await model.load();
    assert.deepEqual(VIEWS, ["gallery", "list"]);
    assert.deepEqual([model.state.template, model.state.started, model.state.view], [null, false, "gallery"]);
    await assert.rejects(model.preferences({ template: "unknown" }), /available prompt template/);
    await model.preferences({ draft: "Orphan" });
    assert.equal(model.state.draft, "", "a draft needs a template");
    await model.preferences({ template: "retail-returns", draft: "Edited returns brief" });
    assert.equal(model.state.draft, "Edited returns brief");
    await model.preferences({ template: "retail-returns" });
    assert.equal(model.state.draft, "Edited returns brief", "choosing the same template keeps its draft");
    await model.preferences({ template: "claims-triage" });
    assert.equal(model.state.draft, "", "switching templates resets the draft");
    await model.preferences({ draft: "Claims idea", view: "list" });
    await assert.rejects(model.send({ kind: "scenario", scenarioId: "claims-triage", text: "Claims idea" }, "rapid"), /Select a Foundry project on Start/);
    assert.deepEqual([sent.length, model.state.started], [0, false], "a rapid brief without a project sends nothing and does not lock");
    model.projects = [project];
    model.state.projectId = project.id;

    const { prompt: _prompt, ...result } = await model.send({ kind: "scenario", scenarioId: "claims-triage", text: "  Claims idea  " }, "rapid");
    assert.deepEqual(result, { messageId: "message-1", template: "claims-triage", started: true });
    assert(sent[0].includes("Claims idea\n\nIndustry: Insurance") && !sent[0].includes("Build a claims triage agent."));
    assert.deepEqual([model.state.template, model.state.started, model.state.draft, model.state.view], ["claims-triage", true, "Claims idea", "list"]);
    for (const input of [{ template: "retail-returns" }, { template: "" }]) {
        await assert.rejects(model.preferences(input), error => error.code === "template_locked", JSON.stringify(input));
    }
    await assert.rejects(model.send({ kind: "guided" }, "rapid"), error => error.code === "template_locked");
    await assert.rejects(model.send({ kind: "scenario", scenarioId: "retail-returns" }, "rapid"), error => error.code === "template_locked");
    assert.equal(sent.length, 1, "a locked template sends nothing");
    const setup = await model.send({ kind: "workiq" }, "rapid");
    assert(!Object.hasOwn(setup, "template"), "prompts that are not briefs neither lock nor change the template");
    assert.equal(model.state.draft, "Claims idea");
    await model.preferences({ draft: "Rerun notes", tab: "build" });
    assert.deepEqual([model.state.tab, model.state.draft], ["build", "Rerun notes"], "a started template keeps an editable draft for reruns");
    await model.send({ kind: "scenario", scenarioId: "claims-triage" }, "sdd");
    assert(sent.at(-1).includes("Build a claims triage agent.") && sent.at(-1).includes("Workflow scenarioId: claims-triage"), "a rerun can send the locked template again");
    assert.equal(model.state.draft, "", "an unedited send stores no draft");

    await model.preferences({ started: false, draft: "Back to editing" });
    assert.deepEqual([model.state.template, model.state.started, model.state.draft], ["claims-triage", false, "Back to editing"]);
    await model.preferences({ started: true });
    assert.equal(model.state.started, false, "only sending locks a template");
    await model.preferences({ started: false, template: "retail-returns" });
    assert.deepEqual([model.state.template, model.state.draft], ["retail-returns", ""], "unlocking and switching resets the draft");
    await model.preferences({ template: "" });
    assert.deepEqual([model.state.template, model.state.draft], [null, ""]);
    const reloaded = new Model({ scenarios, storage });
    await reloaded.load();
    assert.deepEqual(reloaded.state, model.state);
    assert.equal(templateLocked().code, "template_locked");
});

test("mode defaults to rapid, follows workflow runs, and an explicit choice wins until cleared", async t => {
    const directory = await mkdtemp(path.join(tmpdir(), "foundry-agentic-loop-mode-"));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const model = new Model({ storage: path.join(directory, "settings.json") });
    await model.load();
    assert.equal(model.mode(false), "rapid");
    assert.equal(model.mode(true), "sdd");
    await model.setMode("rapid");
    assert.equal(model.mode(true), "rapid");
    assert.equal(model.mode(true, "sdd"), "sdd", "an AGENTS.md lock wins over an explicit choice");
    await model.setMode(null);
    assert.equal(model.mode(true), "sdd");
    assert.equal(model.mode(true, "rapid"), "rapid", "an AGENTS.md lock wins over workflow runs");
    await assert.rejects(model.setMode("fast"), /rapid prototyping or SDD/);
});

test("rapid prompts carry scenario and project context; SDD prompts carry the Azure target instead", () => {
    const scenario = { prompt: "Build a manufacturing assistant.", industry: "Manufacturing" };
    const rapid = promptFor("scenario", { scenario, project });
    assert(rapid.includes("rapid prototyping mode to build this complete solution in the selected Foundry project."));
    assert(rapid.includes(scenario.prompt));
    assert(rapid.includes(id));
    assert(rapid.endsWith("Use resource group rg-demo for additional solution resources."));
    for (const kind of ["scenario", "custom", "guided"]) {
        assert.throws(() => promptFor(kind, { scenario, text: "x" }), /Select a Foundry project on Start before sending a rapid prototyping prompt/, `rapid ${kind} needs a project`);
    }
    const subscriptionId = "11111111-1111-1111-1111-111111111111";
    const sdd = promptFor("scenario", { scenario, project, mode: "sdd", target: { subscriptionId, location: "eastus2", environmentName: "mfg-demo" }, subscriptions: [{ id: subscriptionId, name: "Demo" }] });
    assert(sdd.includes("Start the foundry-agentic-loop-workflow"));
    assert(sdd.includes(scenario.prompt));
    assert(sdd.includes(`Azure subscription: Demo (${subscriptionId})`));
    assert(sdd.includes("Azure region: eastus2"));
    assert(sdd.endsWith("azd environment: mfg-demo"));
    assert(!sdd.includes(id), "SDD provisions its own Foundry project, so the selected one is not injected");
    const auto = promptFor("custom", { text: "  A claims triage agent.  ", mode: "sdd" });
    assert(auto.includes("A claims triage agent.\n\n"));
    assert(auto.includes("confirm the current az/azd default with me"));
    assert(auto.includes("recommend one from live model, quota and hosted-agent availability"));
    assert.throws(() => promptFor("custom", { text: "x", mode: "sdd", target: { location: "East US" } }), /valid Azure region/);
    assert.throws(() => promptFor("custom", { text: "x", mode: "sdd", target: { subscriptionId: "nope" } }), /valid Azure subscription/);
    assert.throws(() => promptFor("custom", { text: "x", mode: "sdd", target: { environmentName: "-bad" } }), /azd environment/);
    assert.throws(() => promptFor("scenario", { scenario, mode: "fast" }), /rapid prototyping or SDD/);
    assert.throws(() => promptFor("custom", { text: "   ", project }), /valid prompt/);
    assert.throws(() => promptFor("scenario", { project }));
    assert.throws(() => promptFor("foundry"));
    const named = { id: "transform-factory-operations-with-ai", prompt: "Use the factory-operations-triage skill.", industry: "Manufacturing", runSkills: ["factory-operations-triage"] };
    const listed = { ...named, prompt: "Build a sales assistant.", runSkills: ["roundup", "tldr-prompt"] };
    assert(promptFor("scenario", { scenario: listed, project }).includes("Industry: Manufacturing\nRun skills to reuse: roundup, tldr-prompt.\nSelected Foundry project:"));
    assert(!promptFor("scenario", { scenario: named, project }).includes("Run skills to reuse"), "skills already named in the prompt are not repeated");
    const tagged = promptFor("scenario", { scenario: listed, mode: "sdd", target: { environmentName: "mfg-demo" } });
    assert(tagged.includes(`Workflow scenarioId: ${listed.id}\nAzure subscription:`));
    assert(tagged.endsWith("azd environment: mfg-demo"));
});

test("guided prompts name the mode; only rapid prompts carry the selected project", () => {
    assert.throws(() => promptFor("guided"), /Select a Foundry project on Start/);
    assert(promptFor("guided", { project }).startsWith("[Agentic Loop canvas action]\nUse the foundry-agentic-loop skill in rapid prototyping mode to guide me through creating a complete agentic solution in the selected Foundry project: clarify the use case, one or more agents, and the user experience. Ask focused questions and obtain approval before provisioning.\nSelected Foundry project: "));
    assert(promptFor("guided", { project }).includes(id));
    assert(promptFor("guided", { mode: "sdd" }).includes("SDD mode"), "SDD provisions its own project, so none is required");
    const sdd = promptFor("guided", { project, mode: "sdd" });
    assert(sdd.includes("SDD mode") && sdd.includes("foundry-agentic-loop-workflow"));
    assert(!sdd.includes(id));
});

test("edited prompt templates keep their industry, run skills and workflow tag; guided ideas follow the mode", () => {
    const scenario = { id: "retail-sales", prompt: "Build a sales assistant.", industry: "Retail", runSkills: ["roundup"] };
    const edited = promptFor("scenario", { scenario, project, text: "  Build a returns assistant instead.  " });
    assert(edited.includes("\n\nBuild a returns assistant instead.\n\nIndustry: Retail\nRun skills to reuse: roundup.\nSelected Foundry project:"));
    assert(!edited.includes(scenario.prompt), "edited text replaces the template prompt");
    assert.equal(promptFor("scenario", { scenario, project, text: "   " }), promptFor("scenario", { scenario, project }), "blank text falls back to the template");
    const sdd = promptFor("scenario", { scenario, text: "Edited brief", mode: "sdd" });
    assert(sdd.includes("\n\nEdited brief\n\nIndustry: Retail\nRun skills to reuse: roundup.\n\nWorkflow scenarioId: retail-sales\n"));
    const idea = promptFor("guided", { text: "  A claims triage agent.  ", project });
    assert(idea.includes("Ask focused questions and obtain approval before provisioning.\n\nMy idea:\nA claims triage agent.\nSelected Foundry project:"));
    assert(promptFor("guided", { text: "A claims triage agent.", project }).includes("My idea:\nA claims triage agent.\nSelected Foundry project:"));
    assert(promptFor("guided", { text: "A claims triage agent.", mode: "sdd" }).includes("then start the foundry-agentic-loop-workflow.\n\nMy idea:\nA claims triage agent.\n\n"));
    assert.equal(promptFor("guided", { text: "   ", project }), promptFor("guided", { project }));
});

test("change requests target the paused checkpoint and never resume the run", () => {
    const runId = "run_123";
    const spec = promptFor("changes", { runId, checkpoint: "approve-spec-v1", text: "Add a Spanish locale." });
    assert(spec.includes("docs/spec.md") && spec.includes("Add a Spanish locale.") && spec.includes("Do not resume the run"));
    const verify = promptFor("changes", { runId, checkpoint: "blocked-verify-r1" });
    assert(verify.includes("docs/verify.md") && verify.includes("(round 1)") && verify.includes("Resuming runs Verify again.") && !verify.includes("Guidance:"));
    assert(verify.includes("Read every issue in the Verify round 1 entry of phases in .agentic-loop/runs/run_123.json"), "the fixer reads every gate issue, not just the first in the log");
    const implement = promptFor("changes", { runId, checkpoint: "blocked-implement-r2", text: "Use eastus2." });
    assert(implement.includes("docs/implementation.md") && implement.includes("(round 2)") && implement.includes("Do not resume the run") && implement.includes("Use eastus2."));
    const deploy = promptFor("changes", { runId, checkpoint: "approve-deploy-v1", text: "Use swedencentral." });
    assert(deploy.includes("Do not deploy anything.") && deploy.includes("Use swedencentral."));
    const again = promptFor("changes", { runId, checkpoint: "approve-deploy-r1-a2-v1", text: "Use swedencentral." });
    assert(again.includes("Do not deploy anything.") && again.includes("Do not resume the run"));
    assert(promptFor("changes", { runId, checkpoint: "approve-spec-r2-v1", text: "Add a Spanish locale." }).includes("Apply this feedback to docs/spec.md"));
    assert.throws(() => promptFor("changes", { runId, checkpoint: "blocked-record-x", text: "x" }), /checkpoint/);
    const failed = promptFor("changes", { runId, checkpoint: "failed", text: "Try swedencentral." });
    assert(failed.includes("stopped before finishing") && failed.includes("docs/LOOP.md") && failed.includes("Do not resume or restart the run") && failed.includes("Try swedencentral."));
    assert(!promptFor("changes", { runId, checkpoint: "failed" }).includes("Guidance:"));
    assert.throws(() => promptFor("changes", { runId, checkpoint: "approve-spec-v1" }), /valid prompt/);
    assert.throws(() => promptFor("changes", { runId, checkpoint: "unknown", text: "x" }), /checkpoint/);
    assert.throws(() => promptFor("changes", { runId, checkpoint: "blocked-plan-r1", text: "x" }), /checkpoint/);
    assert.throws(() => promptFor("changes", { runId: "../etc", checkpoint: "approve-spec-v1", text: "x" }), /Invalid workflow run/);
    assert(promptFor("improve", { runId }).includes(`foundry-agentic-loop-workflow run ${runId}`));
    assert(!promptFor("improve", { runId, project }).includes(id));
    const ship = promptFor("deploy", { runId, project });
    assert(ship.includes(`foundry-agentic-loop-workflow run ${runId} verified`) && ship.includes("ask for my approval before azd up"));
    assert(!ship.includes(id), "deploy uses the workflow's own Azure target");
    assert.throws(() => promptFor("deploy", { mode: "sdd" }), /valid prompt/, "SDD deploys only a verified run");
    const quick = promptFor("deploy", { project });
    assert(quick.includes("Run the `deploy` short command from the Agentic Loop section of the root AGENTS.md") && quick.includes("ask for my approval before deploying the app"));
    assert(!quick.includes(id), "short commands read the project from the workspace");
});

test("rapid short commands route through AGENTS.md and are rapid-only", () => {
    for (const kind of ["run", "test", "convert"]) {
        const prompt = promptFor(kind, { project });
        assert(prompt.startsWith("[Agentic Loop canvas action]\nRun the `"), kind);
        assert(prompt.includes("short command from the Agentic Loop section of the root AGENTS.md"), kind);
        assert(!prompt.includes(id), `${kind} reads the project from the workspace`);
        assert.throws(() => promptFor(kind, { mode: "sdd" }), /valid prompt/, kind);
    }
    assert(promptFor("run").includes("upsert the verified LOCAL_FRONTEND in .env"));
    assert(promptFor("test").includes("ask before changing code"));
    assert(promptFor("convert").includes("`convert to SDD` short command") && promptFor("convert").includes("confirm the switch with me first"));
});

test("Work IQ context is added only to briefs, and only when enabled", () => {
    const marker = "use the Work IQ MCP server (workiq)";
    const scenario = { id: "retail-returns", industry: "Retail", prompt: "Build a returns assistant." };
    const target = { subscriptionId: project.subscriptionId };
    const briefs = [["custom", { text: "Build a claims agent." }], ["scenario", { scenario }], ["guided", {}],
        ["custom", { text: "Build a claims agent.", mode: "sdd", target }], ["guided", { mode: "sdd", target }], ["sdd", { text: "Build a claims agent.", mode: "sdd", target }]];
    for (const [kind, options] of briefs) {
        const grounded = promptFor(kind, { ...options, project, workiq: true });
        assert(grounded.includes(marker) && grounded.includes("Never copy confidential content"), `${kind} ${options.mode ?? "rapid"}`);
        assert(!promptFor(kind, { ...options, project }).includes("Work IQ"), `${kind} ${options.mode ?? "rapid"} without Work IQ`);
    }
    for (const kind of ["improve", "deploy", "run", "plugin", "optimizer"]) assert(!promptFor(kind, { project, workiq: true }).includes(marker), kind);
    const setup = promptFor("workiq", { project });
    assert(setup.includes(links.workiq) && setup.includes("make sure it is enabled") && setup.includes("admin consent"));
    assert(!setup.includes(id), "Work IQ setup is not project-scoped");
});

test("Work IQ status prefers an enabled server and reports missing or unreadable configuration", () => {
    assert.deepEqual(workIqStatus({ status: "error", error: "listConfigured is not a function" }), { status: "error", error: "listConfigured is not a function" });
    assert.deepEqual(workIqStatus({ status: "ready", data: {} }), { status: "missing" });
    assert.deepEqual(workIqStatus({ status: "ready", data: { servers: [{ name: "github", enabled: true }] } }), { status: "missing" });
    const servers = [{ name: "workiq", enabled: false }, { name: "m365", sourcePlugin: "workiq", enabled: true, live: { status: "connected" } }];
    assert.deepEqual(workIqStatus({ status: "ready", data: { servers } }), { status: "ready", data: { name: "m365", enabled: true, live: "connected", error: null } });
    assert.deepEqual(workIqStatus({ status: "ready", data: { servers: servers.slice(0, 1) } }), { status: "ready", data: { name: "workiq", enabled: false, live: null, error: null } });
});

test("local inspection requests verify the selected agent and include its project and latest version", async () => {
    const sent = [];
    const model = new Model({
        azure: { agents: async selected => {
            assert.equal(selected.id, id);
            return [{ name: "support-agent", version: "7" }];
        } },
        session: { send: async input => { sent.push(input); return "inspection-message"; } },
    });
    model.projects = [project];
    model.state.projectId = id;
    assert.deepEqual(await model.inspectAgent({ projectId: id, agentName: "support-agent" }),
        { messageId: "inspection-message", agentName: "support-agent" });
    const prompt = sent[0].prompt;
    assert(prompt.includes("Launch Agent Inspector") && prompt.includes("runs the agent from local source (azd ai agent run)"));
    assert(prompt.includes('Agent name: "support-agent"'));
    assert(prompt.includes('Agent version: "7"'));
    assert(prompt.includes(project.id));
    assert(prompt.includes(project.endpoint));
    assert(prompt.includes("locate the source that matches this agent and version"));
    assert(prompt.includes("do not substitute another agent, scaffold or redeploy."));
    assert(prompt.includes("Ask before installing tools or sending test prompts"));
    await assert.rejects(model.inspectAgent({ projectId: `${id}-stale`, agentName: "support-agent" }), /project changed/);
    await assert.rejects(model.inspectAgent({ projectId: id, agentName: "deleted-agent" }), /no longer available/);
    await assert.rejects(model.inspectAgent({ projectId: id, agentName: "" }), /Choose an agent/);
    assert.equal(sent.length, 1);
    assert.throws(() => promptFor("inspect", { agent: { name: "support-agent" } }), /Select a Foundry project/);
    assert.throws(() => promptFor("inspect", { project }), /valid prompt/);
    assert(promptFor("inspect", { project, agent: { name: "support-agent", version: null } }).includes("Resolve the latest version"));
});

test("a locked workspace that records the selected project gets short project-scoped prompts", async () => {
    const recorded = promptFor("inspect", { project, agent: { name: "support-agent", version: "1" }, recorded: true });
    assert(recorded.endsWith(`Foundry project: ${project.name} (FOUNDRY_PROJECT in .env).`));
    assert(recorded.includes("use its source in this workspace") && !recorded.includes(id) && !recorded.includes(project.endpoint));
    for (const kind of ["optimizer", "custom"]) {
        const prompt = promptFor(kind, { project, text: "Build a claims agent.", recorded: true });
        assert(!prompt.includes(id) && !prompt.includes("Use resource group"), kind);
    }
    const directory = await mkdtemp(path.join(tmpdir(), "al-recorded-"));
    const session = { rpc: { metadata: { snapshot: async () => ({ workingDirectory: directory }) } }, send: async input => { sent.push(input.prompt); return "m"; } };
    const sent = [];
    const model = new Model({ session, azure: { agents: async () => [{ name: "support-agent", version: "1" }] } });
    model.projects = [project];
    model.state.projectId = id;
    await writeFile(path.join(directory, ".env"), `FOUNDRY_PROJECT=${id.toUpperCase()}\n`);
    assert.equal(await model.recorded("rapid"), true, "ARM IDs compare case-insensitively");
    assert.equal(await model.recorded(null), false, "an unlocked workspace keeps the full project context");
    await model.send({ kind: "custom", text: "Build a claims agent." }, "rapid", null, "rapid");
    await model.inspectAgent({ projectId: id, agentName: "support-agent" }, "rapid");
    assert(sent.every(prompt => !prompt.includes(id)), "both prompts name the recorded project only");
    await writeFile(path.join(directory, ".env"), `FOUNDRY_PROJECT=${id}-other\n`);
    assert.equal(await model.recorded("rapid"), false, "a different FOUNDRY_PROJECT keeps the full context");
    await rm(directory, { recursive: true, force: true });
});

test("local inspection does not send requests after discovery failure or a project switch", async () => {
    let sends = 0;
    const model = new Model({
        azure: { agents: async () => { throw new Error("Agent access denied"); } },
        session: { send: async () => { sends++; } },
    });
    model.projects = [project];
    model.state.projectId = id;
    const input = { projectId: id, agentName: "support-agent" };
    await assert.rejects(model.inspectAgent(input), /Agent access denied/);
    model.azure.agents = async () => {
        model.state.projectId = null;
        return [{ name: "support-agent" }];
    };
    await assert.rejects(model.inspectAgent(input), /project changed/);
    assert.equal(sends, 0);
    model.state.projectId = id;
    model.azure.agents = async () => [{ name: "support-agent" }];
    model.session.send = async () => { throw new Error("Chat unavailable"); };
    await assert.rejects(model.inspectAgent(input), /Chat unavailable/);
});

test("quickstart prompts end after Application Insights without selected project context", () => {
    const prompt = promptFor("quickstart", { project });
    assert(prompt.endsWith("Configure Application Insights for the project."));
    assert.equal(prompt, promptFor("quickstart"));
    assert(!prompt.includes(id));
});

test("landing zone prompts end before selected project context", () => {
    const prompt = promptFor("landingZone", { project });
    assert(prompt.endsWith("Clarify governance, networking, identity, subscriptions, region and cost before provisioning."));
    assert.equal(prompt, promptFor("landingZone"));
    assert(!prompt.includes(id));
});

test("project choice persists across panel instances and reloads; prompts use session.send", async t => {
    const directory = await mkdtemp(path.join(tmpdir(), "foundry-agentic-loop-test-"));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const second = { ...project, id: `${id}-two`, name: "second" };
    const sent = [];
    const options = {
        azure: { subscriptions: async () => [{ id: project.subscriptionId }], projects: async () => ({ projects: [project, second], warnings: [] }) },
        session: { send: async input => { sent.push(input); return "message-1"; } },
        scenarios: [], storage: path.join(directory, "settings.json"),
    };
    const first = new Model(options);
    await first.load();
    assert.equal((await first.discover()).selected.id, id);
    await first.select(second.id);
    const reloaded = new Model(options);
    await reloaded.load();
    assert.equal((await reloaded.discover()).selected.id, second.id);
    await reloaded.send({ kind: "guided" });
    assert(sent[0].prompt.includes(second.id));
    await reloaded.send({ kind: "optimizer" });
    assert(sent[1].prompt.includes(links.optimizer));
    assert(sent[1].prompt.includes(second.id));
    assert(!sent[0].prompt.includes("Work IQ"));
    reloaded.state.workiq = true;
    await reloaded.send({ kind: "custom", text: "Build a claims agent." });
    assert(sent[2].prompt.includes("use the Work IQ MCP server (workiq)"), "send passes the saved Work IQ preference");
    await assert.rejects(reloaded.select("not-discovered"), /available/);
    await assert.rejects(reloaded.discover("not-accessible"), /accessible/);
    assert.equal(reloaded.project.id, second.id, "a failed refresh keeps the current list and selection");
    assert.equal(reloaded.projects.length, 2);
});

test("rechecking setup reloads newly installed skills and surfaces discovery failures", async () => {
    let reloaded = false;
    const model = new Model({
        azure: { prerequisites: async skills => ({ ready: skills.length === 2 }) },
        session: { rpc: { skills: {
            reload: async () => { reloaded = true; return { errors: [], warnings: [] }; },
            list: async () => { assert(reloaded); return { skills: [{ name: "foundry-agentic-loop" }, { name: "microsoft-foundry" }] }; },
        } } },
    });
    const first = await model.setup();
    assert.equal(first.ready, true);
    assert.equal(first.workiq.status, "error", "without mcp.listConfigured Work IQ is unknown but never blocks readiness");
    model.session.rpc.mcp = { listConfigured: async () => ({ servers: [{ name: "workiq", enabled: true, live: { status: "connected" } }] }) };
    const withWorkIq = await model.setup();
    assert.equal(withWorkIq.ready, true);
    assert.deepEqual(withWorkIq.workiq, { status: "ready", data: { name: "workiq", enabled: true, live: "connected", error: null } });
    model.session.rpc.skills.reload = async () => ({ errors: ["Skill definition is invalid"], warnings: [] });
    const failed = await model.setup();
    assert.equal(failed.ready, false);
    assert.match(failed.discoveryError, /invalid/);
});

test("cost queries are scoped to the selected resource group and preserve currency", async () => {
    let args;
    const azure = new Azure(async (_file, input) => {
        args = input;
        return { properties: { columns: [{ name: "Currency" }, { name: "PreTaxCost" }, { name: "ServiceName" }], rows: [["EUR", 12.5, "Azure AI"]] } };
    });
    const cost = await azure.cost(project);
    assert.deepEqual(cost.rows, [{ service: "Azure AI", amount: 12.5, currency: "EUR" }]);
    assert(args.includes("post"));
    assert(args.some(value => value.includes("/resourceGroups/rg-demo/providers/Microsoft.CostManagement/query")));
    assert.equal(JSON.parse(args[args.indexOf("--body") + 1]).timeframe, "MonthToDate");
});

test("server protects actions and state while serving only allowlisted scenario images", async t => {
    const scenarios = JSON.parse(await readFile(path.join(root, "assets/scenarios.json"), "utf8"));
    const entry = await startServer({
        assets: path.join(root, "public"), images: path.join(root, "assets/images"), scenarios,
        snapshot: async () => ({ marker: "private" }), dispatch: async (action, input) => ({ action, input }),
    });
    t.after(() => entry.close());
    const url = new URL(entry.url);
    assert.equal(url.hostname, "127.0.0.1");
    const html = await (await fetch(entry.url)).text();
    assert(!html.includes("__CANVAS_TOKEN__"));
    assert.equal((await fetch(url.origin)).status, 403);
    assert.equal((await fetch(`${url.origin}/api/state`)).status, 403);
    const headers = { "X-Canvas-Token": url.searchParams.get("key"), "Content-Type": "application/json" };
    assert.equal((await fetch(`${url.origin}/api/state`, { headers })).status, 200);
    assert.equal((await fetch(`${url.origin}/api/action`, { method: "POST", headers: { ...headers, Origin: "https://evil.com" }, body: "{}" })).status, 403);
    const response = await fetch(`${url.origin}/api/action`, { method: "POST", headers, body: JSON.stringify({ action: "setup", input: {} }) });
    assert.deepEqual(await response.json(), { action: "setup", input: {} });
    const image = await fetch(`${url.origin}/${scenarios[0].image}`);
    assert.equal(image.status, 200);
    assert.equal(image.headers.get("content-type"), "image/webp");
    assert.equal((await fetch(`${url.origin}/images/not-allowed.jpg`)).status, 403);
    const modules = ["coalesce.mjs", "escape.mjs", "live-conn.mjs", "tab-policy.mjs", "target-save.mjs"];
    for (const file of ["deck.html", "deck.js", "deck.css", "app.js", "app.css", "enablement.json", ...modules]) {
        const response = await fetch(`${url.origin}/${file}?theme=dark`);
        assert.equal(response.status, 200, file);
        assert.match(response.headers.get("content-security-policy"), /frame-src 'self'/);
        if (file.endsWith(".mjs")) assert.equal(response.headers.get("content-type"), "text/javascript; charset=utf-8", file);
    }
    const imports = [...(await readFile(path.join(root, "public", "app.js"), "utf8")).matchAll(/^import .* from "\.\/([^"]+)";$/gm)].map(match => match[1]);
    assert.deepEqual(imports.sort(), modules, "app.js imports exactly the allowlisted modules");
    for (const file of ["lib/server.mjs", "public/other.mjs", "other.mjs", "package.json"]) assert.equal((await fetch(`${url.origin}/${file}`)).status, 403, file);
    assert.equal((await fetch(`${url.origin}/api/live?v=0`)).status, 403);
    const rebound = await new Promise((resolve, reject) => {
        request(`${url.origin}/deck.html`, { headers: { Host: "evil.com" } }, response => { response.resume(); resolve(response.statusCode); })
            .on("error", reject).end();
    });
    assert.equal(rebound, 403, "DNS-rebinding hosts are rejected even for static files");
});

test("request bodies decode UTF-8 once, after all chunks arrive, and oversized bodies drain before a 413", async () => {
    const payload = Buffer.from(JSON.stringify({ action: "preferences", input: { draft: "é智🙂" } }));
    const split = payload.indexOf(Buffer.from("智")) + 1;
    assert.deepEqual(await readBody([payload.subarray(0, split), payload.subarray(split)]), { action: "preferences", input: { draft: "é智🙂" } });
    let read = 0;
    const chunks = function* () { for (let i = 0; i < 5; i++) { read++; yield Buffer.alloc(40_000, 32); } };
    await assert.rejects(readBody(chunks()), error => error.status === 413 && /128 KB/.test(error.message));
    assert.equal(read, 5, "the whole oversized body is consumed");
});

test("server accepts a full-length CJK draft, rejects oversized bodies and forged tokens, and maps mode and template locks to 409", async t => {
    const scenarios = JSON.parse(await readFile(path.join(root, "assets/scenarios.json"), "utf8"));
    const entry = await startServer({
        assets: path.join(root, "public"), images: path.join(root, "assets/images"), scenarios,
        snapshot: async () => ({}),
        dispatch: async (action, input) => {
            if (action === "mode") throw Object.assign(new Error("Locked to SDD."), { code: "mode_locked" });
            if (action === "prompt") throw templateLocked();
            if (action === "setup") throw Object.assign(new Error("Setup failed."), { code: "internal_detail" });
            return { action, input };
        },
    });
    t.after(() => entry.close());
    const url = new URL(entry.url);
    const key = url.searchParams.get("key");
    const headers = { "X-Canvas-Token": key, "Content-Type": "application/json" };
    const post = (body, extra = {}) => fetch(`${url.origin}/api/action`, { method: "POST", headers: { ...headers, ...extra }, body });
    const draft = "智能体解决方案".repeat(2_286).slice(0, 16_000);
    assert.equal(draft.length, 16_000);
    assert(Buffer.byteLength(draft) > 32_768, "the draft exceeds the old 32 KB cap");
    const accepted = await post(JSON.stringify({ action: "preferences", input: { draft } }));
    assert.equal(accepted.status, 200);
    assert.equal((await accepted.json()).input.draft, draft);
    const oversized = await post(JSON.stringify({ action: "preferences", input: { draft: "x".repeat(200_000) } }));
    assert.equal(oversized.status, 413);
    assert.match((await oversized.json()).error, /128 KB/);
    const locked = await post(JSON.stringify({ action: "mode", input: { mode: "rapid" } }));
    assert.equal(locked.status, 409);
    assert.deepEqual(await locked.json(), { error: "Locked to SDD.", code: "mode_locked" });
    const template = await post(JSON.stringify({ action: "prompt", input: { kind: "guided" } }));
    assert.equal(template.status, 409);
    assert.deepEqual(await template.json(), { error: templateLocked().message, code: "template_locked" });
    const failed = await post(JSON.stringify({ action: "setup", input: {} }));
    assert.equal(failed.status, 400);
    assert.deepEqual(await failed.json(), { error: "Setup failed." }, "only lock codes reach the panel");
    assert.equal((await post("{not json")).status, 400);
    const forged = `${key.slice(0, -1)}${key.endsWith("0") ? "1" : "0"}`;
    for (const token of [forged, key.slice(0, 8), `${key}0`]) {
        assert.equal((await post("{}", { "X-Canvas-Token": token })).status, 403, token);
        assert.equal((await fetch(`${url.origin}/?key=${token}`)).status, 403, token);
    }
});

test("packaged prompt templates and enablement cards are complete and self-contained", async () => {
    const scenarios = JSON.parse(await readFile(path.join(root, "assets/scenarios.json"), "utf8"));
    assert(scenarios.length >= 60);
    assert.equal(new Set(scenarios.map(row => row.id)).size, scenarios.length);
    assert(!scenarios.some(row => row.id === GUIDED), "the Shape it with Copilot id is reserved");
    const allowed = Object.fromEntries(Object.entries(TAXONOMY).map(([key, rows]) => [key, new Set(rows.map(([value]) => value))]));
    for (const row of scenarios) {
        for (const key of ["id", "name", "industry", "description", "prompt", "image"]) assert(typeof row[key] === "string" && row[key].trim(), `${row.id}.${key}`);
        for (const key of ["description", "prompt"]) assert.match(row[key], /\S[.!?]$/, `${row.id}.${key} ends with a full sentence, so appended text reads cleanly`);
        assert.doesNotMatch(row.description, /\(\d+ characters\)/, `${row.id}.description has an authoring note`);
        assert.match(row.image, /^images\/[a-z0-9-]+\.webp$/);
        await readFile(path.join(root, "assets", row.image));
        for (const [key, values] of Object.entries(allowed)) {
            assert(Array.isArray(row[key]) && row[key].length, `${row.id}.${key} needs at least one value`);
            assert.equal(new Set(row[key]).size, row[key].length, `${row.id}.${key} repeats a value`);
            for (const value of row[key]) assert(values.has(value), `${row.id}.${key}: ${value} is not in the taxonomy`);
        }
    }
    for (const [key, values] of Object.entries(allowed)) {
        for (const value of values) assert(scenarios.some(row => row[key].includes(value)), `${key}: no template uses ${value}`);
    }
    const { version, cards } = JSON.parse(await readFile(path.join(root, "public/enablement.json"), "utf8"));
    assert.equal(version, 1);
    assert(cards.length >= 12);
    assert.equal(new Set(cards.map(card => card.id)).size, cards.length);
    for (const card of cards) {
        assert(card.title && card.body && card.topic, card.id);
        assert(["specify", "implement", "verify", "deploy", "any"].includes(card.phase), card.id);
        assert(["foundry", "azure", "github", "loop"].includes(card.source), card.id);
        assert(card.mode === undefined || ["rapid", "sdd"].includes(card.mode), card.id);
        assert(card.loop === undefined || (typeof card.loop === "string" && card.loop.length <= 120), card.id);
        assert(card.link.label, card.id);
        assert.match(card.link.url, /^https:\/\/(learn\.microsoft\.com|github\.com|docs\.github\.com)\//, card.id);
    }
});
