import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
    CACHE_STATES, buildLedger, buildRates, cacheStates, cacheTtlFor, createLocalClock, family,
    loadAutomations, prettyModel, shutdownIncrements, summarizeLedger, transcriptStats,
} from "./collector.mjs";
import { SENTINELS, writeSampleHome } from "./sample-data.mjs";

const state = (e) => CACHE_STATES[e.cs][0];
const call = (id, startSeconds, prompt, cached, extra = {}) => ({
    id, model: "claude-sonnet-5.5", stream: "main", start: startSeconds, prompt, cached, ...extra,
});

function tempHome() {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "ai-credits-"));
    return { home, cleanup: () => fs.rmSync(home, { recursive: true, force: true }) };
}

// ---------------------------------------------------------------------------------------------
// Automation attribution (names and run-session links only)
// ---------------------------------------------------------------------------------------------
function automationDb() {
    const db = new DatabaseSync(":memory:");
    db.exec(`
        CREATE TABLE workflows (id TEXT, name TEXT, prompt TEXT);
        CREATE TABLE workflow_runs (task_id TEXT, session_id TEXT, workspace_id TEXT);
        CREATE TABLE workspaces (id TEXT, session_id TEXT);
        INSERT INTO workflows VALUES ('daily', 'Daily report', 'PRIVATE PROMPT');
        INSERT INTO workflows VALUES ('idle', 'Not run yet', 'PRIVATE PROMPT');
        INSERT INTO workspaces VALUES ('workspace', 'workspace-session');`);
    return db;
}

test("includes every automation without reading prompts", () => {
    const db = automationDb();
    const { names, bySession } = loadAutomations(db);
    assert.deepEqual(Object.fromEntries(names), { daily: "Daily report", idle: "Not run yet" });
    assert.equal(bySession.size, 0);
});

test("repeated runs are attributed once per session", () => {
    const db = automationDb();
    db.exec(`INSERT INTO workflow_runs VALUES ('daily', 'run-1', NULL);
             INSERT INTO workflow_runs VALUES ('daily', 'run-1', NULL);
             INSERT INTO workflow_runs VALUES ('daily', 'run-2', NULL);`);
    assert.deepEqual(Object.fromEntries(loadAutomations(db).bySession), { "run-1": "daily", "run-2": "daily" });
});

test("a workspace is only a fallback for the run's own session", () => {
    const db = automationDb();
    db.exec(`INSERT INTO workflow_runs VALUES ('daily', NULL, 'workspace');
             INSERT INTO workflow_runs VALUES ('daily', '', 'workspace');
             INSERT INTO workflow_runs VALUES ('daily', 'explicit-session', 'workspace');
             INSERT INTO workflow_runs VALUES ('daily', NULL, NULL);`);
    assert.deepEqual(Object.fromEntries(loadAutomations(db).bySession), { "workspace-session": "daily", "explicit-session": "daily" });
});

test("keeps a deleted automation without guessing a title", () => {
    const db = automationDb();
    db.exec("INSERT INTO workflow_runs VALUES ('deleted-1234', 'old-session', NULL)");
    const { names, bySession } = loadAutomations(db);
    assert.equal(names.get("deleted-1234"), "Deleted automation (deleted-)");
    assert.equal(bySession.get("old-session"), "deleted-1234");
});

test("conflicting links fail instead of misattributing spend", () => {
    const db = automationDb();
    db.exec(`INSERT INTO workflow_runs VALUES ('daily', 'shared-session', NULL);
             INSERT INTO workflow_runs VALUES ('idle', 'shared-session', NULL);`);
    assert.throws(() => loadAutomations(db), /more than one automation/);
});

// ---------------------------------------------------------------------------------------------
// Session-level totals
// ---------------------------------------------------------------------------------------------
const tok = (input, cache_read = 0, cache_write = 0, output = 0) => ({ input, cache_read, cache_write, output });

test("shutdown totals are cumulative: repeats are ignored and a lower value never subtracts", () => {
    const m = (credits, t, calls) => ({ "claude-sonnet-5.5": { credits, tok: t, calls } });
    const seq = [
        ["2026-10-01T01:00:00Z", 10, m(10, tok(100, 1000), 5)],
        ["2026-10-01T02:00:00Z", 10, m(10, tok(100, 1000), 5)], // repeat
        ["2026-10-02T01:00:00Z", 25, m(25, tok(250, 2500), 12)],
        ["2026-10-03T01:00:00Z", 20, m(20, tok(200, 2000), 9)], // dips: ignored
        ["2026-10-04T01:00:00Z", 30, m(30, tok(300, 3000), 15)],
    ];
    const incs = shutdownIncrements(seq);
    assert.deepEqual(incs.map((i) => i[0]), ["2026-10-01T01:00:00Z", "2026-10-02T01:00:00Z", "2026-10-04T01:00:00Z"]);
    assert.deepEqual(incs.map((i) => i[1]), [10, 15, 5]);
    assert.equal(incs.reduce((a, i) => a + i[1], 0), 30);
    assert.equal(incs[1][2]["claude-sonnet-5.5"].calls, 7);
});

test("per-model credits are scaled to the session increment", () => {
    const seq = [["2026-10-01T01:00:00Z", 10, {
        a: { credits: 6, tok: tok(1), calls: 1 }, b: { credits: 6, tok: tok(1), calls: 1 },
    }]];
    const [, total, byModel] = shutdownIncrements(seq)[0];
    assert.equal(total, 10);
    assert.equal(byModel.a.credits + byModel.b.credits, 10);
});

// ---------------------------------------------------------------------------------------------
// Prompt cache
// ---------------------------------------------------------------------------------------------
test("classifies every call by what it found in the prompt cache", () => {
    const ttl = () => 300;
    const events = [
        call("1", 0, 20000, 0),             // first call of the conversation
        call("2", 10, 21000, 20000),        // read the previous prompt back
        call("3", 20, 22000, 21000),        // read it back again
        call("4", 1000, 23000, 0),          // long pause, whole prompt written again
        call("5", 1010, 40000, 1000),       // recent, but most of the prompt was rewritten
        call("6", 1020, 5000, 0, { stream: "sub-1" }), // a sub-agent is a separate conversation
    ];
    cacheStates(new Map([["s", events]]), ttl);
    assert.deepEqual(events.map(state), ["new", "warm", "warm", "expired", "rebuilt", "new"]);
});

test("the same model is tracked per conversation, and a model switch is rebuilt", () => {
    const events = [
        call("1", 0, 20000, 0),
        call("2", 10, 21000, 0, { model: "gpt-5.6-sol" }),
    ];
    cacheStates(new Map([["s", events]]), () => 300);
    assert.deepEqual(events.map(state), ["new", "rebuilt"]);
});

test("cache lifetimes: the CLI's record, then its family, then a default", () => {
    const { ttlFor, summary } = cacheTtlFor(new Map([
        ["claude-sonnet-5.5", new Map([[300, 5]])],
        ["gpt-5.6-sol", new Map([[3600, 2], [1800, 1]])],
    ]));
    assert.equal(ttlFor("claude-sonnet-5.5"), 300);
    assert.equal(ttlFor("claude-opus-5.5"), 300);
    assert.equal(ttlFor("gpt-5.6-sol"), 3600);
    assert.equal(ttlFor("mai-code-1.1-flash"), 3600);
    assert.deepEqual(summary, { claude: 300, other: 3600 });
    assert.deepEqual(cacheTtlFor(new Map()).summary, { claude: 300, other: 1800 });
});

test("rates come from what calls revealed, else the published table", () => {
    const rates = buildRates(new Map([["claude-sonnet-5.5", new Map([["input", new Map([[123.4, 9]])]])]]));
    assert.equal(rates.get("claude-sonnet-5.5")[0], 123.4);
    assert.equal(rates.get("claude-sonnet-5.5")[3], 1000);
    assert.equal(rates.get("gpt-5.4")[0], 250);
    assert.equal(rates.has("no-such-model"), false);
});

// ---------------------------------------------------------------------------------------------
// Names and time
// ---------------------------------------------------------------------------------------------
test("model names and families", () => {
    assert.equal(prettyModel("claude-sonnet-5.5"), "Claude Sonnet 5.5");
    assert.equal(prettyModel("gpt-5.4-mini"), "GPT 5.4 Mini");
    assert.equal(prettyModel("claude-opus-4.6-1m"), "Claude Opus 4.6 (1M)");
    assert.equal(family("claude-opus-5"), "Claude Opus");
    assert.equal(family("claude-haiku-4.5"), "Claude Sonnet & Haiku");
    assert.equal(family("gpt-6-sol"), "GPT");
    assert.equal(family("kimi-k2.7-code"), "Other");
});

test("weekday (Mon=0) and hour follow the local time zone, including daylight saving", () => {
    const utc = createLocalClock("UTC");
    assert.deepEqual(utc(Date.parse("2026-10-28T12:34:00Z")), { weekday: 2, hour: 12 });
    const sydney = createLocalClock("Australia/Sydney");
    assert.deepEqual(sydney(Date.parse("2026-10-28T12:00:00Z")), { weekday: 2, hour: 23 }); // AEDT, UTC+11
    assert.deepEqual(sydney(Date.parse("2026-10-28T13:00:00Z")), { weekday: 3, hour: 0 });
    assert.deepEqual(sydney(Date.parse("2026-06-10T12:00:00Z")), { weekday: 2, hour: 22 }); // AEST, UTC+10
    const newYork = createLocalClock("America/New_York");
    assert.deepEqual(newYork(Date.parse("2026-07-01T03:00:00Z")), { weekday: 1, hour: 23 }); // Tuesday 23:00 EDT, UTC-4
});

// ---------------------------------------------------------------------------------------------
// Whole ledger, built from fictional telemetry
// ---------------------------------------------------------------------------------------------
test("builds a consistent ledger from local telemetry", async () => {
    const { home, cleanup } = tempHome();
    try {
        const sample = writeSampleHome(home);
        const ledger = await buildLedger({ home, timeZone: "UTC", now: new Date("2026-10-28T12:00:00Z") });
        const { dims, meta } = ledger;

        assert.ok(ledger.facts.length > 100);
        assert.equal(ledger.facts[0].length, ledger.factColumns.length);
        assert.equal(ledger.hourly[0].length, ledger.hourlyColumns.length);
        assert.equal(meta.timeZone, "UTC");
        assert.equal(meta.generated, "2026-10-28T12:00:00.000Z");

        // Per-call credits are exactly what the fictional telemetry recorded.
        assert.ok(Math.abs(meta.tierTotals[0] - sample.eventCredits) < 1);
        assert.ok(meta.tierTotals[1] > 0, "older sessions are placed from their shutdown records");
        const total = ledger.facts.reduce((a, f) => a + f[5], 0);
        assert.ok(Math.abs(total - meta.total) < 1);
        assert.ok(Math.abs(meta.tierTotals[0] + meta.tierTotals[1] - meta.total) < 1);

        // Every dimension index resolves.
        for (const f of ledger.facts) {
            assert.ok(dims.days[f[0]] && ledger.sessions[f[1]] && dims.models[f[2]] && dims.kinds[f[3]] && dims.caches[f[15]]);
        }
        assert.deepEqual(dims.caches.map((c) => c.id), CACHE_STATES.map(([id]) => id));
        assert.deepEqual(dims.automations.map((a) => a.name).sort(), ["Daily standup summary", "Docs link audit", "Weekly dependency check"]);
        assert.ok(dims.surfaces.includes("Copilot app · automation"));
        assert.ok(ledger.sessions.some((s) => s.automation !== null));
        assert.ok(dims.repos.includes("contoso/storefront"));

        // The per-call prompt-cache states all show up in the sample, and cost components add up.
        const cacheCredits = Object.fromEntries(dims.caches.map((c) => [c.id, 0]));
        for (const f of ledger.facts) cacheCredits[dims.caches[f[15]].id] += f[5];
        for (const id of ["warm", "expired", "rebuilt", "new"]) assert.ok(cacheCredits[id] > 0, id);
        for (const f of ledger.facts.filter((row) => row[4] === 0)) {
            assert.ok(Math.abs(f[6] + f[7] + f[8] + f[9] - f[5]) < 0.05, "per-call components add up to the call credits");
        }
        assert.ok(meta.cacheTtl.claude === 300 && meta.cacheTtl.other === 1800);
    } finally {
        cleanup();
    }
});

test("never reads prompts, titles or file paths into the ledger", async () => {
    const { home, cleanup } = tempHome();
    try {
        writeSampleHome(home);
        const ledger = await buildLedger({ home, timeZone: "UTC" });
        const text = JSON.stringify(ledger);
        for (const secret of SENTINELS) assert.equal(text.includes(secret), false, secret);
        assert.ok(ledger.sessions.every((s) => s.id.length <= 8), "session ids are shortened");
    } finally {
        cleanup();
    }
});

test("summaries are privacy-light and consistent with the ledger", async () => {
    const { home, cleanup } = tempHome();
    try {
        writeSampleHome(home);
        const ledger = await buildLedger({ home, timeZone: "UTC" });
        const all = summarizeLedger(ledger);
        assert.ok(Math.abs(all.totalCredits - ledger.meta.total) < 1);
        assert.equal(all.totalUsd, Math.round(all.totalCredits * 10) / 1000);
        assert.ok(all.models.length > 0 && all.repositories.length > 0 && all.busiestDays.length === 5);
        assert.deepEqual(all.models.map((m) => m.credits), [...all.models.map((m) => m.credits)].sort((a, b) => b - a));
        assert.equal(JSON.stringify(all).includes(ledger.sessions[0].id), false, "no session ids");

        const oneDay = ledger.dims.days[ledger.dims.days.length - 1];
        const day = summarizeLedger(ledger, { from: oneDay, to: oneDay });
        assert.equal(day.period.from, oneDay);
        assert.ok(day.totalCredits > 0 && day.totalCredits < all.totalCredits);
    } finally {
        cleanup();
    }
});

test("an empty or missing Copilot home gives an empty ledger instead of an error", async () => {
    const { home, cleanup } = tempHome();
    try {
        const ledger = await buildLedger({ home: path.join(home, "nothing-here"), timeZone: "UTC" });
        assert.equal(ledger.facts.length, 0);
        assert.equal(ledger.meta.periodStart, null);
        assert.equal(ledger.meta.total, 0);
        assert.deepEqual(ledger.meta.sources, { sessionStore: false, appDatabase: false, sessionLogs: 0 });
        assert.equal(summarizeLedger(ledger).totalCredits, 0);
    } finally {
        cleanup();
    }
});

test("works without the Copilot app database and degrades on conflicting automation links", async () => {
    const { home, cleanup } = tempHome();
    try {
        writeSampleHome(home);
        const appPath = path.join(home, "data.db");
        const app = new DatabaseSync(appPath);
        const [session] = app.prepare("SELECT session_id FROM workflow_runs LIMIT 1").all().map((r) => r.session_id);
        app.prepare("INSERT INTO workflow_runs VALUES ('conflict', 'wf-deps', NULL, ?)").run(session);
        app.prepare("INSERT INTO workflow_runs VALUES ('conflict2', 'wf-docs', NULL, ?)").run(session);
        app.close();
        const degraded = await buildLedger({ home, timeZone: "UTC" });
        assert.match(degraded.meta.automationsUnavailable, /more than one automation/);
        assert.ok(degraded.facts.length > 0);

        fs.rmSync(appPath);
        const noApp = await buildLedger({ home, timeZone: "UTC" });
        assert.equal(noApp.meta.sources.appDatabase, false);
        assert.ok(noApp.facts.length > 0);
        assert.equal(noApp.dims.automations.length, 0);
    } finally {
        cleanup();
    }
});

test("tolerates an older per-call schema and malformed log lines", async () => {
    const { home, cleanup } = tempHome();
    try {
        fs.mkdirSync(path.join(home, "session-state", "old-1"), { recursive: true });
        const store = new DatabaseSync(path.join(home, "session-store.db"));
        store.exec(`
            CREATE TABLE sessions (id TEXT, repository TEXT, created_at TEXT, updated_at TEXT);
            CREATE TABLE assistant_usage_events (id INTEGER, session_id TEXT, model TEXT, total_nano_aiu INTEGER, created_at TEXT);
            INSERT INTO sessions VALUES ('old-1', 'contoso/app', '2026-10-01T10:00:00Z', '2026-10-01T11:00:00Z');
            INSERT INTO assistant_usage_events VALUES (1, 'old-1', 'claude-sonnet-5.5', 5000000000, '2026-10-01T10:05:00Z');
            INSERT INTO assistant_usage_events VALUES (2, 'old-1', 'claude-sonnet-5.5', 1000000000, 'not a date');`);
        store.close();
        fs.writeFileSync(path.join(home, "session-state", "old-1", "events.jsonl"),
            '{"type":"session.shutdown","data":{broken\n{"type":"session.usage_checkpoint","data":{"modelCacheState":null}}\n');
        const ledger = await buildLedger({ home, timeZone: "UTC" });
        assert.equal(ledger.meta.total, 5);
        assert.equal(ledger.facts.length, 1);
        assert.equal(ledger.dims.repos[0], "contoso/app");
    } finally {
        cleanup();
    }
});

// ---------------------------------------------------------------------------------------------
// Small hand-made telemetry homes
// ---------------------------------------------------------------------------------------------
const EVENT_COLUMNS = "id INTEGER, session_id TEXT, model TEXT, input_tokens INTEGER, output_tokens INTEGER, " +
    "cache_read_tokens INTEGER, cache_write_tokens INTEGER, total_nano_aiu INTEGER, initiator TEXT, " +
    "token_details_json TEXT, created_at TEXT, agent_id TEXT, duration_ms INTEGER";
const details = (input, cacheRead, cacheWrite, output) => JSON.stringify([
    ["input", input], ["cache_read", cacheRead], ["cache_write", cacheWrite], ["output", output],
].map(([tokenType, tokenCount]) => ({ tokenType, tokenCount, batchSize: 1000000, costPerBatch: 1e9 })));

// events: [session, model, created_at, nanoAiu, columns?, detailsJson?, initiator?]
function eventsHome(home, events) {
    const store = new DatabaseSync(path.join(home, "session-store.db"));
    store.exec(`CREATE TABLE sessions (id TEXT, repository TEXT, created_at TEXT, updated_at TEXT);
        CREATE TABLE assistant_usage_events (${EVENT_COLUMNS});`);
    const insert = store.prepare("INSERT INTO assistant_usage_events VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    events.forEach(([sid, model, createdAt, nano, c = {}, json = null, initiator = "user"], i) => {
        insert.run(i + 1, sid, model, c.input ?? null, c.output ?? null, c.cacheRead ?? null, c.cacheWrite ?? null,
            nano, initiator, json, createdAt, "", 1000);
    });
    store.close();
}
function shutdownLine(timestamp, credits, model = "claude-sonnet-5.5") {
    return JSON.stringify({
        type: "session.shutdown", timestamp,
        data: { totalNanoAiu: credits * 1e9, modelMetrics: { [model]: { totalNanoAiu: credits * 1e9, requests: { count: 3 },
            tokenDetails: { input: { tokenCount: 100 }, output: { tokenCount: 10 } } } } },
    });
}
function writeTranscript(home, sid, lines) {
    fs.mkdirSync(path.join(home, "session-state", sid), { recursive: true });
    fs.writeFileSync(path.join(home, "session-state", sid, "events.jsonl"), lines.join("\n") + "\n");
}
const sumColumn = (ledger, column) => ledger.facts.reduce((a, f) => a + f[column], 0);

test("unzoned SQLite timestamps are UTC whatever the machine's time zone is", async () => {
    const { home, cleanup } = tempHome();
    const before = process.env.TZ;
    try {
        eventsHome(home, [["s1", "claude-sonnet-5.5", "2026-10-28 12:34:00", 2e9]]);
        process.env.TZ = "America/New_York"; // Date.parse() reads an unzoned time in this zone
        const ledger = await buildLedger({ home, timeZone: "UTC" });
        assert.equal(ledger.dims.days[ledger.facts[0][0]], "2026-10-28");
        assert.equal(ledger.hourly.length, 1);
        assert.deepEqual(ledger.hourly[0].slice(4, 6), [2, 12], "Wednesday 12:00 UTC, not 16:00");
        assert.equal(ledger.meta.eventsStart, "2026-10-28T12:34:00.000Z");
    } finally {
        if (before === undefined) delete process.env.TZ; else process.env.TZ = before;
        cleanup();
    }
});

test("token counts fall back to the call's own counters only when it has no usable token details", async () => {
    const { home, cleanup } = tempHome();
    try {
        const counters = { input: 1000, cacheRead: 600, cacheWrite: 100, output: 50 };
        eventsHome(home, [
            ["none", "claude-sonnet-5.5", "2026-10-01T10:00:00Z", 1e9, counters, null],
            ["bad", "claude-sonnet-5.5", "2026-10-02T10:00:00Z", 1e9, counters, "not json"],
            ["empty", "claude-sonnet-5.5", "2026-10-03T10:00:00Z", 1e9, counters, "[]"],
            // The billed details win when they disagree with the counters.
            ["billed", "claude-sonnet-5.5", "2026-10-04T10:00:00Z", 1e9, counters, details(250, 600, 450, 50)],
        ]);
        const ledger = await buildLedger({ home, timeZone: "UTC" });
        const bySession = Object.fromEntries(ledger.facts.map((f) => [ledger.dims.days[f[0]], f.slice(10, 14)]));
        assert.deepEqual(bySession["2026-10-01"], [300, 600, 100, 50], "fresh input = input minus cached tokens");
        assert.deepEqual(bySession["2026-10-02"], [300, 600, 100, 50]);
        assert.deepEqual(bySession["2026-10-03"], [300, 600, 100, 50]);
        assert.deepEqual(bySession["2026-10-04"], [250, 600, 450, 50]);
        assert.ok(ledger.facts.every((f) => f[6] + f[7] + f[8] + f[9] <= f[5] + 1e-6));
    } finally {
        cleanup();
    }
});

test("a session whose whole total is one credit or less is still counted", async () => {
    const { home, cleanup } = tempHome();
    try {
        writeTranscript(home, "shutdown-only", [shutdownLine("2026-10-05T10:00:00Z", 0.4)]);
        fs.mkdirSync(home, { recursive: true });
        const app = new DatabaseSync(path.join(home, "data.db"));
        app.exec(`CREATE TABLE sessions (id TEXT, title TEXT, session_type TEXT, model TEXT, created_at TEXT, updated_at TEXT, total_nano_aiu INTEGER);
            INSERT INTO sessions VALUES ('app-only', NULL, 'project', 'claude-sonnet-5.5', '2026-10-06T10:00:00Z', '2026-10-06T11:00:00Z', 300000000);`);
        app.close();
        const ledger = await buildLedger({ home, timeZone: "UTC" });
        assert.equal(ledger.sessions.length, 2);
        assert.ok(Math.abs(ledger.meta.total - 0.7) < 1e-6, String(ledger.meta.total));
        assert.deepEqual(ledger.dims.kinds.sort(), ["Session total"]);
    } finally {
        cleanup();
    }
});

test("the tolerance still forgives small disagreements against usage already counted", async () => {
    const { home, cleanup } = tempHome();
    try {
        eventsHome(home, [["s1", "claude-sonnet-5.5", "2026-10-01T10:00:00Z", 100e9]]);
        writeTranscript(home, "s1", [shutdownLine("2026-10-01T11:00:00Z", 100.6)]);
        const ledger = await buildLedger({ home, timeZone: "UTC" });
        assert.ok(Math.abs(ledger.meta.total - 100) < 1e-6, "0.6 credits of disagreement is not added on top");
        assert.equal(ledger.meta.tierTotals[1], 0);
    } finally {
        cleanup();
    }
});

test("session logs are read once while they are unchanged, and again when they change or go", async () => {
    const { home, cleanup } = tempHome();
    try {
        writeTranscript(home, "a", [shutdownLine("2026-10-01T10:00:00Z", 5)]);
        writeTranscript(home, "b", [shutdownLine("2026-10-02T10:00:00Z", 7)]);
        const reads = () => transcriptStats.reads;
        const start = reads();
        assert.equal((await buildLedger({ home, timeZone: "UTC" })).meta.total, 12);
        assert.equal(reads() - start, 2);
        assert.equal((await buildLedger({ home, timeZone: "UTC" })).meta.total, 12);
        assert.equal(reads() - start, 2, "unchanged files are not read again");

        fs.appendFileSync(path.join(home, "session-state", "a", "events.jsonl"), shutdownLine("2026-10-03T10:00:00Z", 9) + "\n");
        assert.equal((await buildLedger({ home, timeZone: "UTC" })).meta.total, 16, "the grown log is read again");
        assert.equal(reads() - start, 3);

        fs.rmSync(path.join(home, "session-state", "b"), { recursive: true });
        assert.equal((await buildLedger({ home, timeZone: "UTC" })).meta.total, 9, "a removed log no longer counts");
        assert.equal(reads() - start, 3);
    } finally {
        cleanup();
    }
});

test("values that look like inherited object properties are treated as ordinary names", async () => {
    const { home, cleanup } = tempHome();
    try {
        eventsHome(home, [["s1", "constructor", "2026-10-01T10:00:00Z", 3e9, {}, details(10, 0, 0, 5), "constructor"]]);
        const app = new DatabaseSync(path.join(home, "data.db"));
        app.exec(`CREATE TABLE sessions (id TEXT, title TEXT, session_type TEXT, model TEXT, created_at TEXT, updated_at TEXT, total_nano_aiu INTEGER);
            INSERT INTO sessions VALUES ('s1', NULL, 'toString', 'constructor', '2026-10-01T10:00:00Z', '2026-10-01T11:00:00Z', 3000000000);`);
        app.close();
        const ledger = await buildLedger({ home, timeZone: "UTC" });
        assert.equal(ledger.meta.total, 3);
        assert.deepEqual(ledger.dims.models, [{ id: "constructor", name: "Constructor", family: "Other" }]);
        assert.deepEqual(ledger.dims.kinds, ["Background"]);
        assert.deepEqual(ledger.dims.surfaces, ["Copilot app · project session"]);
        assert.ok(Number.isFinite(sumColumn(ledger, 5)) && Number.isFinite(sumColumn(ledger, 6)));
    } finally {
        cleanup();
    }
});
