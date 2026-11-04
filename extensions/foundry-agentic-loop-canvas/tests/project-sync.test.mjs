import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Model } from "../lib/model.mjs";
import { projectIdentity } from "../lib/azure.mjs";
import { readFrontends } from "../lib/frontends.mjs";

const subscription = "11111111-1111-1111-1111-111111111111";
const otherSubscription = "22222222-2222-2222-2222-222222222222";
function project(name, sub = subscription) {
    const id = `/subscriptions/${sub}/resourceGroups/rg-${name}/providers/Microsoft.CognitiveServices/accounts/account/projects/${name}`;
    return { id, ...projectIdentity(id), endpoint: `https://account.services.ai.azure.com/api/projects/${name}`, location: "eastus" };
}
const first = project("first");
const second = project("second");
const third = project("third", otherSubscription);

async function fixture(t) {
    const directory = await mkdtemp(path.join(tmpdir(), "foundry-agentic-loop-project-sync-"));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const calls = [];
    const available = [first, second, third];
    const options = {
        azure: {
            subscriptions: async () => [{ id: subscription, name: "First subscription" }, { id: otherSubscription, name: "Second subscription" }],
            projects: async id => {
                calls.push(id);
                return { projects: available.filter(row => row.subscriptionId === id), warnings: [] };
            },
        },
        session: { rpc: { metadata: { snapshot: async () => ({ workingDirectory: directory }) } } },
        scenarios: [],
        storage: path.join(directory, "settings.json"),
    };
    const model = new Model(options);
    const file = path.join(directory, ".env");
    return { directory, file, calls, available, model, options };
}

test("only a validated project ARM ID is exposed from env; malformed values stay private", async t => {
    const { directory, file } = await fixture(t);
    assert.deepEqual((await readFrontends(directory)).foundryProject, { id: null, error: null });
    await writeFile(file, `export FOUNDRY_PROJECT='${second.id}' # selected\nSECRET=never-expose\n`);
    const result = await readFrontends(directory);
    assert.deepEqual(result.foundryProject, { id: second.id, error: null });
    assert(!JSON.stringify(result).includes("never-expose"));
    for (const invalid of ["private-secret", second.endpoint, second.id + "?token=private-secret",
        second.id.replace(subscription, "bad"), second.id.replace("/second", "/.."), "${PROJECT_ID}"]) {
        await writeFile(file, `FOUNDRY_PROJECT='${invalid}'\n`);
        const config = await readFrontends(directory);
        assert.equal(config.foundryProject.id, null);
        assert.match(config.foundryProject.error, /full Microsoft Foundry project ARM/);
        assert(!JSON.stringify(config).includes("private-secret"));
    }
});

test("env project overrides saved selection on open and persists canonical cross-subscription discovery", async t => {
    const { file, model, options } = await fixture(t);
    await model.discover();
    await writeFile(file, `FOUNDRY_PROJECT=${third.id.toUpperCase()}\n`);
    const reloaded = new Model(options);
    await reloaded.load();
    const result = await reloaded.frontends();
    assert.equal(result.projectSync.selected.id, third.id);
    assert.equal(result.projectSync.subscriptionId, otherSubscription);
    assert.equal(result.projectSync.error, null);
    const saved = JSON.parse(await readFile(options.storage, "utf8"));
    assert.equal(saved.projectId, third.id);
    assert.equal(saved.subscriptionId, otherSubscription);
});

test("creation and atomic replacement synchronize, while unchanged values preserve manual selection", async t => {
    const { file, model, calls } = await fixture(t);
    await model.frontends();
    await model.discover();
    await writeFile(file, `FOUNDRY_PROJECT=${second.id}\n`);
    assert.equal((await model.frontends()).projectSync.selected.id, second.id);
    const reads = calls.length;
    await model.frontends();
    assert.equal(calls.length, reads);
    await model.select(first.id);
    await writeFile(file, `FOUNDRY_PROJECT=${second.id}\nOTHER_SETTING=changed\n`);
    assert.equal((await model.frontends()).projectSync.selected.id, first.id);
    assert.equal(calls.length, reads);
    await writeFile(file + ".next", `FOUNDRY_PROJECT=${third.id}\n`);
    await rename(file + ".next", file);
    assert.equal((await model.frontends()).projectSync.selected.id, third.id);
    await writeFile(file, "FOUNDRY_PROJECT=\n");
    assert.equal((await model.frontends()).projectSync.selected.id, third.id);
    await rm(file);
    assert.equal((await model.frontends()).projectSync.selected.id, third.id);
});

test("invalid, unavailable and inaccessible targets keep the selection; explicit retry finds newly created projects", async t => {
    const { file, model, calls, available } = await fixture(t);
    await model.discover();
    const missing = project("new-project", otherSubscription);
    await writeFile(file, `FOUNDRY_PROJECT=${missing.id}\n`);
    let result = await model.frontends();
    assert.match(result.projectSync.error, /could not be found or accessed/);
    assert.equal(result.projectSync.selected.id, first.id);
    assert.equal(result.projectSync.subscriptionId, subscription);
    const reads = calls.length;
    await model.frontends();
    assert.equal(calls.length, reads, "failed discovery has a retry cooldown");
    available.push(missing);
    result = await model.frontends(true);
    assert.equal(result.projectSync.error, null);
    assert.equal(result.projectSync.selected.id, missing.id);
    await writeFile(file, "FOUNDRY_PROJECT=not-an-arm-id\n");
    result = await model.frontends();
    assert.match(result.projectSync.error, /full Microsoft Foundry/);
    assert.equal(result.projectSync.selected.id, missing.id);
    const inaccessible = second.id.replace(subscription, "33333333-3333-3333-3333-333333333333");
    await writeFile(file, `FOUNDRY_PROJECT=${inaccessible}\n`);
    result = await model.frontends();
    assert.match(result.projectSync.error, /subscription is no longer accessible/);
    assert.equal(result.projectSync.selected.id, missing.id);
    await writeFile(file, `FOUNDRY_PROJECT=${second.id}\n`);
    model.azure.projects = async () => { throw new Error("Azure access denied"); };
    result = await model.frontends();
    assert.match(result.projectSync.error, /Azure access denied/);
    assert.equal(result.projectSync.selected.id, missing.id);
});

test("selection persistence failures are visible and roll back env-driven selection", async t => {
    const { file, model } = await fixture(t);
    await model.discover();
    await writeFile(file, `FOUNDRY_PROJECT=${third.id}\n`);
    model.save = async () => { throw new Error("Settings storage is unavailable"); };
    const result = await model.frontends();
    assert.match(result.projectSync.error, /Settings storage is unavailable/);
    assert.equal(result.projectSync.selected.id, first.id);
    assert.equal(result.projectSync.subscriptionId, subscription);
});

test("partial subscription discovery warnings survive successful env synchronization", async t => {
    const { file, model } = await fixture(t);
    model.azure.projects = async () => ({ projects: [second], warnings: ["Another account could not be listed"] });
    await writeFile(file, `FOUNDRY_PROJECT=${second.id}\n`);
    const result = await model.frontends();
    assert.equal(result.projectSync.selected.id, second.id);
    assert.equal(result.projectSync.error, null);
    assert.deepEqual(result.projectSync.warnings, ["Another account could not be listed"]);
});

test("failed env synchronization backs off to five minutes and an explicit retry resets the backoff", async t => {
    const { file, model, calls } = await fixture(t);
    await model.discover();
    await writeFile(file, `FOUNDRY_PROJECT=${project("missing", otherSubscription).id}\n`);
    let now = 1_000_000;
    t.mock.method(Date, "now", () => now);
    const delays = [];
    for (let attempt = 0; attempt < 6; attempt++) {
        const reads = calls.length;
        assert.match((await model.frontends()).projectSync.error, /could not be found or accessed/);
        assert.equal(calls.length, reads + 1, "a due retry discovers once");
        delays.push(model.envProjectRetryAt - now);
        now = model.envProjectRetryAt - 1;
        await model.frontends();
        assert.equal(calls.length, reads + 1, "no discovery before the retry is due");
        now += 1;
    }
    assert.deepEqual(delays, [30_000, 60_000, 120_000, 240_000, 300_000, 300_000]);
    const reads = calls.length;
    await model.frontends(true);
    assert.equal(calls.length, reads + 1);
    assert.equal(model.envProjectRetryAt - now, 30_000, "an explicit retry starts again at 30 seconds");
    assert.equal(model.envProjectBackoff, 60_000);
});

test("a refresh keeps the current projects and selection while pending and after it fails", async t => {
    const { model } = await fixture(t);
    await model.discover();
    await model.select(second.id);
    let started;
    let fail;
    const requested = new Promise(resolve => { started = resolve; });
    model.azure.projects = () => { started(); return new Promise((resolve, reject) => { fail = reject; }); };
    const pending = model.discover();
    await requested;
    assert.equal(model.project.id, second.id, "the list stays while the refresh is pending");
    assert.equal(model.resourceState().projects.length, 2);
    fail(new Error("Azure is unavailable"));
    await assert.rejects(pending, /Azure is unavailable/);
    assert.equal(model.project.id, second.id);
    assert.deepEqual(model.projects.map(row => row.id), [first.id, second.id]);
});

test("env discovery runs outside the mutation queue and a selection made meanwhile wins", async t => {
    const { file, model, options } = await fixture(t);
    await model.discover();
    await writeFile(file, `FOUNDRY_PROJECT=${third.id}\n`);
    let release;
    const projects = options.azure.projects;
    options.azure.projects = async id => { if (id === otherSubscription) await new Promise(resolve => { release = resolve; }); return projects(id); };
    let queue = Promise.resolve();
    const queued = [];
    const serial = work => { queued.push("apply"); const result = queue.then(work); queue = result.catch(() => {}); return result; };
    const poll = model.frontends(false, serial);
    while (!release) await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(queued, [], "discovery holds no queue slot");
    await serial(() => model.select(second.id));
    release();
    const result = await poll;
    assert.equal(model.state.projectId, second.id, "the user's selection during discovery is kept");
    assert.equal(result.projectSync.error, null);
    assert.equal((await model.frontends(false, serial)).projectSync.selected.id, second.id, "the consumed .env value does not re-apply");
    await writeFile(file, `FOUNDRY_PROJECT=${first.id}\n`);
    assert.equal((await model.frontends(false, serial)).projectSync.selected.id, first.id, "a changed .env applies again");
});

test("a .env problem only warns: the selection stays and discovery is not blocked", async t => {
    const { file, model } = await fixture(t);
    await model.discover();
    await model.select(second.id);
    await writeFile(file, `FOUNDRY_PROJECT=${third.id}\n#${"x".repeat(70_000)}\n`);
    const result = await model.frontends();
    assert.match(result.envError, /larger than 64 KB/);
    assert.deepEqual([result.projectSync.error, result.projectSync.selected.id], [null, second.id]);
    assert.equal((await model.discover()).selected.id, second.id, "discovery still runs");
    await writeFile(file, `FOUNDRY_PROJECT=${third.id}\n`);
    assert.equal((await model.frontends()).projectSync.selected.id, third.id, "a fixed .env synchronizes");
});
