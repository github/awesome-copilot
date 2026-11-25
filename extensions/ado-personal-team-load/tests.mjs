import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAdapter, AdoError } from "./adapter.mjs";
import { computeLoad, pendingReview, validateConfig } from "./model.mjs";
import { createStore, createHub } from "./hub.mjs";
import { validateAction } from "./schemas.mjs";
import { startServer } from "./server.mjs";
const alice = { id: "00000000-0000-0000-0000-000000000001", displayName: "Same name" };
const bob = { id: "00000000-0000-0000-0000-000000000002", displayName: "Same name" };
const project = "00000000-0000-0000-0000-000000000003", repo = "00000000-0000-0000-0000-000000000004";
const org = "https://dev.azure.com/test-fixture";
const wi = (id, owner, category = "InProgress") => ({ key: `wi:${id}`, id, owner, category });
const pr = (reviewers, state = "active") => ({ key: "pr:1", author: alice, reviewers, state });
test("ownership uses IDs, excludes terminal items, and never calls untracked owners unassigned", () => {
    const r = computeLoad([wi(1, alice), wi(2, bob), wi(3, alice, "Completed"), wi(4, null, "Removed"), wi(5, null)], [], [alice.id], 6);
    assert.equal(r.people[0].total, 1); assert.deepEqual(r.unassigned.map(w => w.id), [5]);
});
test("PR roles deduplicate totals while retaining authored and review columns", () => {
    const r = computeLoad([], [pr([{ ...alice, vote: 0 }, { ...alice, vote: 0 }, { ...bob, vote: 0 }])], [alice.id, bob.id], 1);
    assert.equal(r.people.find(p => p.id === alice.id).total, 1);
    assert.equal(r.people.find(p => p.id === alice.id).reviews.length, 1);
    assert.equal(r.people.find(p => p.id === bob.id).total, 1);
    assert.equal(computeLoad([], [pr([], "completed")], [alice.id], 6).people[0].total, 0);
});
test("only individual, non-declined zero votes need review", () => {
    for (const vote of [5, 10, -5, -10]) assert.equal(pendingReview({ ...alice, vote }), false);
    for (const field of ["isContainer", "hasDeclined", "inactive", "isDeletedInOrigin"]) assert.equal(pendingReview({ ...alice, vote: 0, [field]: true }), false);
    assert.equal(pendingReview({ ...alice, vote: 0 }), true);
});
test("empty data and threshold validation", () => {
    assert.deepEqual(computeLoad([], [], [], 6).unassigned, []);
    assert.equal(computeLoad([], [], [alice.id], 6).people[0].total, 0);
    assert.throws(() => validateConfig({ threshold: 0 }), AdoError);
    assert.throws(() => validateConfig({ organisation: "https://evil.test" }), AdoError);
});
test("shared UI and SDK action validation rejects unknown fields and unsafe descriptors", () => {
    assert.throws(() => validateAction("set_tracking", { config: {} }), /revision/);
    assert.throws(() => validateAction("discover", { token: "must-never-be-accepted" }), /Unsupported field/);
    assert.throws(() => validateAction("resolve_people", { descriptors: ["bad/descriptor"] }), /Invalid text/);
    assert.throws(() => validateConfig({ people: [alice.id, alice.id] }), /unique/);
});
function fixture(fetcher) {
    return createAdapter({ cli: async () => JSON.stringify({ accessToken: "unit-test-only", expires_on: Date.now() / 1000 + 3600 }), fetcher });
}
const reply = (value, headers = {}) => new Response(JSON.stringify(value), { headers: { "content-type": "application/json", ...headers } });
test("catalog follows continuation headers and detects repeated tokens", async () => {
    const a = fixture(async url => {
        const next = new URL(url).searchParams.get("continuationToken");
        return reply({ value: [{ id: next ? repo : project, name: next || "first" }] }, next ? {} : { "x-ms-continuationtoken": "next" });
    });
    assert.equal((await a.projects(org)).length, 2);
    await assert.rejects(fixture(async () => reply({ value: [] }, { "x-ms-continuationtoken": "same" })).projects(org), /repeated/);
});
test("PR skip paging reads full reviewers and excludes completed or rejected reviews", async () => {
    let pages = 0;
    const a = fixture(async url => {
        const u = new URL(url);
        if (u.pathname.endsWith("/reviewers")) return reply({ value: [{ ...bob, vote: -10 }] });
        pages++;
        return reply({ value: u.searchParams.get("$skip") === "0" ? Array.from({ length: 100 }, (_, i) => ({ pullRequestId: i + 1, status: "active", title: "Fixture", createdBy: alice })) : [] });
    });
    const prs = await a.pullRequests(org, project, repo);
    assert.equal(pages, 2); assert.equal(prs.length, 100);
    assert.equal(computeLoad([], prs, [bob.id], 6).people[0].total, 0);
});
test("project process mappings classify custom types and states, with snapshot-consistent batch reads", async () => {
    let queries = [];
    const a = fixture(async (url, options) => {
        const path = new URL(url).pathname;
        if (path.endsWith("/workitemtypes")) return reply({ value: [{ name: "Custom type" }] });
        if (path.endsWith("/states")) return reply({ value: [{ name: "Custom active", category: "InProgress" }, { name: "Custom terminal", category: "Completed" }] });
        const b = JSON.parse(options.body);
        if (path.endsWith("/wiql")) {
            queries.push(b.query);
            return reply({ asOf: "2026-11-09T00:00:00Z", workItems: queries.length === 1 ? Array.from({ length: 200 }, (_, i) => ({ id: i + 1 })) : [] });
        }
        assert.equal(b.asOf, "2026-11-09T00:00:00Z");
        return reply({ value: b.ids.map(id => ({ id, fields: { "System.WorkItemType": "Custom type", "System.State": id === 1 ? "Custom active" : "Custom terminal", "System.AssignedTo": id === 1 ? alice : null } })) });
    });
    const r = await a.workItems(org, project);
    assert.equal(r.items.length, 1);
    assert.equal(queries.length, 1); assert.match(queries[0], /Id\] >= 1/);
});
test("unknown state category and incomplete batch fail explicitly", async () => {
    const make = (category, batch) => fixture(async url => {
        const path = new URL(url).pathname;
        if (path.endsWith("/workitemtypes")) return reply({ value: [{ name: "Custom" }] });
        if (path.endsWith("/states")) return reply({ value: [{ name: "Custom", category }] });
        if (path.endsWith("/wiql")) return reply({ asOf: "2026-11-09T00:00:00Z", workItems: [{ id: 1 }] });
        return reply({ value: batch });
    });
    await assert.rejects(make("Unverified", []).workItems(org, project), /Unknown state/);
    await assert.rejects(make("InProgress", []).workItems(org, project), /incomplete/);
});
test("WIQL avoids $top because permissions can hide readable records beyond short or empty pages", async () => {
    let calls = 0;
    const a = fixture(async (url, options) => {
        const path = new URL(url).pathname;
        if (path.endsWith("/workitemtypes")) return reply({ value: [{ name: "Task" }] });
        if (path.endsWith("/states")) return reply({ value: [{ name: "Active", category: "InProgress" }] });
        const b = JSON.parse(options.body);
        if (path.endsWith("/wiql")) {
            calls++;
            assert.equal(new URL(url).searchParams.has("$top"), false);
            return reply({ asOf: "2026-11-09T00:00:00Z", workItems: [{ id: 20 }, { id: 40 }] });
        }
        return reply({ value: b.ids.map(id => ({ id, fields: { "System.WorkItemType": "Task", "System.State": "Active", "System.AssignedTo": alice } })) });
    });
    const result = await a.workItems(org, project);
    assert.equal(calls, 1); assert.equal(result.items.length, 2);
});
test("auth, access, redirect and network failures do not yield empty successful lists", async () => {
    for (const status of [401, 403, 429, 500]) await assert.rejects(fixture(async () => new Response("", { status })).projects(org), /HTTP/);
    await assert.rejects(fixture(async () => { throw new Error("secret must not leak"); }).projects(org), error => !error.message.includes("secret") && error.code === "network");
});
test("private config survives new stores, rejects corruption and detects conflicting saves", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ado-load-tests-"));
    try {
        const store = createStore("test", directory);
        const first = await store.read();
        const saved = await store.save({ threshold: 8 }, first.revision);
        assert.equal((await createStore("test", directory).read()).config.threshold, 8);
        await assert.rejects(store.save({}, first.revision), /changed/);
        await writeFile(join(directory, "test.json"), "corrupt");
        await assert.rejects(store.read(), /corrupt/);
        assert.notEqual(saved.revision, first.revision);
    } finally { await rm(directory, { recursive: true }); }
});
test("hub exposes partial coverage and preserves earlier snapshot as stale after failure", async () => {
    let fail = false;
    const config = validateConfig({ organisation: org, projects: [project], people: [alice.id] });
    const hub = createHub("test", { store: { read: async () => ({ config, revision: "one" }) }, adapter: {
        workItems: async () => { if (fail) throw new AdoError("access", "Access denied"); return { items: [wi(1, alice)], asOf: "2026-11-09T00:00:00Z" }; },
        repositories: async () => [],
    } });
    assert.equal((await hub.perform("refresh")).people[0].total, 1);
    fail = true;
    const r = await hub.perform("refresh");
    assert.equal(r.stale, true); assert.equal(r.complete, false); assert.equal(r.errors.length, 1); assert.equal(r.people[0].total, 1);
    assert.ok(r.lastSuccessfulRefresh); assert.equal(r.refreshing, false);
});
test("empty work item and PR sources are successful empty data, not seeded data", async () => {
    const a = fixture(async url => {
        const p = new URL(url).pathname;
        if (p.endsWith("/workitemtypes")) return reply({ value: [] });
        if (p.endsWith("/wiql")) return reply({ asOf: "2026-11-09T00:00:00Z", workItems: [] });
        return reply({ value: [] });
    });
    assert.equal((await a.workItems(org, project)).items.length, 0);
    assert.equal((await a.pullRequests(org, project, repo)).length, 0);
});
test("an observed owner missing from the directory can be selected by verified ID", async () => {
    let record = { config: validateConfig({ organisation: org, projects: [project] }), revision: "one" };
    const hub = createHub("test", { store: { read: async () => record, save: async (config, revision) => {
        assert.equal(revision, record.revision);
        record = { config, revision: "two" }; return record;
    } }, adapter: {
        discover: async () => ({ organisations: [{ url: org, name: "test" }], errors: [] }),
        projects: async () => [{ id: project, name: "Project" }], repositories: async () => [], people: async () => [],
        workItems: async () => ({ items: [wi(1, alice)], asOf: "2026-11-09T00:00:00Z" }),
    } });
    await hub.perform("refresh");
    const saved = await hub.perform("set_tracking", { revision: "one", config: { ...record.config, people: [alice.id] } });
    assert.deepEqual(saved.config.people, [alice.id]);
    assert.equal((await hub.perform("refresh")).people[0].total, 1);
});
test("local server protects the shared dispatcher and never enables CORS", async () => {
    const server = await startServer(async (name, input) => { validateAction(name, input); return { complete: true }; });
    try {
        const page = await fetch(server.url), html = await page.text();
        assert.match(page.headers.get("content-security-policy"), /script-src 'self'/);
        const key = html.match(/name="canvas-key" content="([a-f0-9]{64})"/)[1];
        const headers = { "Content-Type": "application/json", Origin: new URL(server.url).origin, "X-Canvas-Key": key };
        const send = h => fetch(new URL("/api/action", server.url), { method: "POST", headers: h, body: JSON.stringify({ name: "get_state", input: {} }) });
        assert.equal((await send(headers)).status, 200);
        const denied = await send({ ...headers, Origin: "https://evil.invalid" });
        assert.equal(denied.status, 403); assert.equal(denied.headers.get("access-control-allow-origin"), null);
        assert.equal((await send({ "Content-Type": "application/json" })).status, 403);
    } finally { await server.close(); }
});
test("an initial partial scan is a fresh lower bound, not a retained stale snapshot", async () => {
    const config = validateConfig({ organisation: org, projects: [project], people: [alice.id] });
    const hub = createHub("test", { store: { read: async () => ({ config, revision: "one" }) }, adapter: {
        workItems: async () => ({ items: [wi(1, alice)], asOf: "2026-11-09T00:00:00Z" }),
        repositories: async () => { throw new AdoError("access", "Repository access denied"); },
    } });
    const state = await hub.perform("refresh");
    assert.equal(state.complete, false); assert.equal(state.stale, false);
    assert.equal(state.people[0].total, 1); assert.equal(state.lastSuccessfulRefresh, null);
});
test("WIQL result-limit errors split disjoint ID ranges using the first successful ASOF", async () => {
    const queries = [];
    const a = fixture(async (url, options) => {
        const path = new URL(url).pathname;
        if (path.endsWith("/workitemtypes")) return reply({ value: [{ name: "Task" }] });
        if (path.endsWith("/states")) return reply({ value: [{ name: "Active", category: "InProgress" }] });
        const b = JSON.parse(options.body);
        if (path.endsWith("/wiql")) {
            queries.push(b.query);
            if (queries.length === 1) return new Response(JSON.stringify({ typeKey: "WorkItemTrackingQueryResultSizeLimitExceededException" }), { status: 400 });
            return reply({ asOf: "2026-11-09T00:00:00Z", workItems: queries.length === 2 ? [{ id: 20 }] : [] });
        }
        assert.equal(b.asOf, "2026-11-09T00:00:00Z");
        return reply({ value: b.ids.map(id => ({ id, fields: { "System.WorkItemType": "Task", "System.State": "Active", "System.AssignedTo": alice } })) });
    });
    assert.equal((await a.workItems(org, project)).items.length, 1);
    assert.equal(queries.length, 3);
    assert.match(queries[1], /Id\] <= 1073741824/);
    assert.match(queries[2], /Id\] >= 1073741825/);
    assert.match(queries[2], /ASOF '2026-11-09T00:00:00Z'/);
});
test("a reopened client preserves saved scope when discovery catalogs are not yet loaded", async () => {
    class Element {
        constructor(tag = "div") { this.tag = tag; this.children = []; this.listeners = {}; this.storedValue = ""; this.dataset = {}; this.checked = true; }
        get value() { return this.storedValue; }
        set value(value) { this.storedValue = this.tag === "select" && !this.children.some(c => c.value === value) ? "" : value; }
        append(...children) { this.children.push(...children); }
        prepend(...children) { this.children.unshift(...children); }
        replaceChildren(...children) { this.children = children; }
        add(child) { this.append(child); }
        setAttribute() {}
        querySelectorAll() { return []; }
        addEventListener(name, handler) { this.listeners[name] = handler; }
    }
    const elements = new Map();
    const document = {
        hidden: false,
        getElementById(id) {
            if (!elements.has(id)) elements.set(id, new Element(id === "organisation" ? "select" : "div"));
            return elements.get(id);
        },
        createElement: tag => new Element(tag),
        querySelector: () => ({ content: "test-key" }),
        querySelectorAll: () => [],
    };
    const config = validateConfig({ organisation: org, projects: [project], repositories: [repo], people: [alice.id] });
    let saved;
    const state = { profile: "fixture", revision: "saved", config, catalog: { organisations: [], projects: [], repositories: [], people: [], errors: [] },
        people: [], identities: [], unassigned: [], coverage: [], errors: [], lastDataRefresh: null, lastSuccessfulRefresh: null, sourceCounts: null };
    const code = await readFile(new URL("./assets/app.mjs", import.meta.url), "utf8");
    await runInNewContext(`(async () => { ${code}\n })()`, {
        document, Date, URL, Set, Map, Object, Number, JSON,
        Option: class extends Element { constructor(label, value) { super("option"); this.textContent = label; this.value = value; } },
        setInterval: () => 1,
        fetch: async (_url, options) => {
            const { name, input } = JSON.parse(options.body);
            if (name === "refresh") { state.lastDataRefresh = "2026-11-09T00:00:00Z"; state.catalog.repositories = [{ id: repo, name: "Fixture repository" }]; }
            if (name === "set_tracking") { saved = input.config; state.config = saved; }
            return { ok: true, json: async () => ({ result: structuredClone(state) }) };
        },
    });
    assert.equal(document.getElementById("organisation").value, org,
        `Client bootstrap: ${document.getElementById("error").textContent}; options: ${JSON.stringify(document.getElementById("organisation").children.map(c => c.value))}`);
    document.getElementById("threshold").value = "7";
    await document.getElementById("config").listeners.submit({ preventDefault() {} });
    assert.ok(saved, "Save scope dispatched");
    assert.equal(saved.organisation, org);
    assert.deepEqual([...saved.projects], [project]);
    assert.deepEqual([...saved.repositories], [repo]);
    assert.deepEqual([...saved.people], [alice.id]);
    assert.equal(saved.threshold, 7);
});
test("saved zero-work people are revalidated by descriptor rather than dropped on a fresh host", async () => {
    const initial = validateConfig({ organisation: org, projects: [project], repositories: [repo], people: [alice.id] });
    let current = { config: initial, revision: "saved" }, resolutions = 0;
    const adapter = {
        discover: async () => ({ organisations: [{ url: org, name: "Fixture" }], errors: [] }),
        projects: async () => [{ id: project, name: "Fixture project" }],
        repositories: async () => [{ id: repo, name: "Fixture repository" }],
        people: async () => [{ id: null, descriptor: "aad.fixture", displayName: "Same name" }],
        personDescriptor: async (_org, id) => { assert.equal(id, alice.id); resolutions++; return "aad.fixture"; },
        resolvePerson: async () => alice.id,
    };
    const make = () => createHub("fixture", { adapter, store: {
        read: async () => current,
        save: async (config, revision) => { assert.equal(revision, current.revision); current = { config, revision: "next" }; return current; },
    } });
    const saved = await make().perform("set_tracking", { revision: "saved", config: { ...initial, threshold: 7 } });
    assert.deepEqual(saved.config.people, [alice.id]); assert.equal(resolutions, 1);
    adapter.personDescriptor = async () => "aad.not-in-this-organisation";
    await assert.rejects(make().perform("set_tracking", { revision: "next", config: saved.config }), /actual identities/);
    assert.deepEqual(current.config.people, [alice.id]);
});
test("saved identity reverse lookup uses the official stable Graph descriptor API", async () => {
    const a = fixture(async url => {
        const u = new URL(url);
        assert.equal(u.hostname, "vssps.dev.azure.com");
        assert.ok(u.pathname.endsWith(`/graph/descriptors/${alice.id}`));
        assert.equal(u.searchParams.get("api-version"), "7.1");
        return reply({ value: "aad.fixture" });
    });
    assert.equal(await a.personDescriptor(org, alice.id), "aad.fixture");
    await assert.rejects(fixture(async () => reply({ value: "unsafe/descriptor" })).personDescriptor(org, alice.id), /saved identity/);
});
