import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, appendFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

// Fabricated data only. The collector reads COPILOT_HOME and VSCODE_APPDATA at import time.
const root = mkdtempSync(path.join(os.tmpdir(), "agent-radar-test-"));
process.env.COPILOT_HOME = root;
process.env.VSCODE_APPDATA = path.join(root, "vscode");
const { createdSession, resolveSessionRelations, collectBackgroundShells, matchesProcessStat, collectSnapshot } = await import("./collector.mjs");
test.after(() => rmSync(root, { recursive: true, force: true }));

const PARENT = "00000000-0000-0000-0000-000000000001";
const CHILD = "00000000-0000-0000-0000-000000000002";
const PROJECT = "00000000-0000-0000-0000-000000000003";
const APP = "00000000-0000-0000-0000-000000000004";

test("created session identity comes from identity fields only", () => {
    const cases = [
        [{ content: `Created session 'Example'\nid: ${CHILD}\nurl: copilot://sessions/${CHILD}` }, CHILD, true],
        [{ content: `Created session 'Example' (id: ${CHILD}) in project 'Demo'.` }, CHILD, true],
        [{ content: `Created session 'Example ${PROJECT}' (id: ${CHILD}) in project 'Demo'.` }, CHILD, true],
        [{ project_id: PROJECT, session_id: CHILD, created: true }, CHILD, true],
        [{ id: APP, copilot_session_id: CHILD, created: true }, CHILD, true],
        [{ content: [{ type: "text", text: JSON.stringify({ sessionId: CHILD, created: true }) }] }, CHILD, true],
        [{ session_id: CHILD, created: false }, CHILD, false],
        [{ content: `Project ${PROJECT} not found` }, undefined, false],
        [{ arguments: { id: PROJECT } }, undefined, false],
        [{ isError: true, session_id: CHILD }, undefined, false],
    ];
    for (const [result, id, created] of cases) {
        const [ref, isNew] = createdSession(result);
        assert.equal(ref?.id, id, JSON.stringify(result));
        assert.equal(isNew, created, JSON.stringify(result));
    }
});

test("paired IDs resolve to one node, and a message never supplies ownership", () => {
    const parent = { id: PARENT, peers: [{ to: APP, kind: "message" }] }, child = { id: CHILD, peers: [] };
    const p = { children: new Map([[CHILD, { id: CHILD, aliases: [APP] }]]) };
    resolveSessionRelations([parent, child], new Map([[PARENT, p]]));
    assert.deepEqual(parent.childSessions, [CHILD]);
    assert.equal(parent.peers[0].to, CHILD);
    const other = { id: PROJECT, peers: [{ to: CHILD, kind: "message" }] };
    resolveSessionRelations([other, child], new Map([[PROJECT, { children: new Map() }]]));
    assert.equal(other.childSessions, undefined);
});

function shellDir(record, name = "worker.json") {
    const dir = mkdtempSync(path.join(root, "shells-"));
    mkdirSync(path.join(dir, "detached-shells"));
    writeFileSync(path.join(dir, "detached-shells", name), typeof record === "string" ? record : JSON.stringify(record));
    return dir;
}
const shellRecord = (o = {}) => ({ version: 1, sessionId: "session", shellId: "worker", state: "active", createdUnixMs: 1000,
    supervisor: { pid: 123, startTicks: 456, bootId: "fabricated" }, command: "secret command", ...o });

test("background shell records", async () => {
    const cases = [
        [{}, true, 1], [{}, false, 0], [{ state: "completed" }, true, 0], [{ sessionId: "other" }, true, 0],
        [{ version: 2 }, true, 0], [{ shellId: undefined }, true, 0], [{ createdUnixMs: undefined }, true, 0],
    ];
    for (const [change, alive, want] of cases) {
        const got = await collectBackgroundShells(shellDir(shellRecord(change)), "session", async () => alive);
        assert.equal(got.length, want, JSON.stringify(change));
        if (want) assert.deepEqual(got, [{ id: "worker", pid: 123, startedAt: 1000 }]);
        assert.ok(!JSON.stringify(got).includes("secret"));
    }
    assert.deepEqual(await collectBackgroundShells(shellDir("{not json"), "session", async () => true), []);
});

test("process stat matches the start time after the command name", () => {
    const stat = (state, ticks) => `123 (a) b (c)) ${state} ${"1 ".repeat(18)}${ticks} 0 0`;
    assert.ok(matchesProcessStat(stat("S", 456), 456));
    assert.ok(!matchesProcessStat(stat("S", 457), 456));
    assert.ok(!matchesProcessStat(stat("Z", 456), 456));
    assert.ok(!matchesProcessStat("no command", 456));
});

function writeSession(id, lines) {
    const dir = path.join(root, "session-state", id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "events.jsonl"), lines.map((l) => JSON.stringify(l) + "\n").join(""));
    writeFileSync(path.join(dir, `inuse.${process.pid}.lock`), "");
    return path.join(dir, "events.jsonl");
}

test("an idle creator keeps its child, and a resumed sub-agent runs again", async () => {
    const old = new Date(Date.now() - 24 * 3600e3).toISOString(), now = new Date().toISOString();
    writeSession(PARENT, [
        { type: "tool.execution_start", timestamp: old, data: { toolCallId: "create", toolName: "create_session", arguments: {} } },
        { type: "tool.execution_complete", timestamp: old, data: { toolCallId: "create", success: true, result: { content: `Created session 'Child' (id: ${CHILD}) in project 'Demo'.` } } },
        { type: "assistant.turn_end", timestamp: old, data: {} },
    ]);
    const childLog = writeSession(CHILD, [
        { type: "subagent.started", agentId: "worker-id", timestamp: now, data: { toolCallId: "task", agentDisplayName: "Worker", executionMode: "background" } },
        { type: "subagent.completed", agentId: "worker-id", timestamp: now, data: { toolCallId: "task" } },
    ]);
    let snap = await collectSnapshot();
    const find = (id) => snap.sessions.find((s) => s.id === id);
    assert.deepEqual(find(PARENT).childSessions, [CHILD]);
    assert.equal(find(PARENT).busy, false);
    assert.equal(find(CHILD).subagents[0].running, false);
    assert.equal(find(CHILD).busy, false);

    appendFileSync(childLog, [
        { type: "user.message", agentId: "worker-id", timestamp: now, data: { content: "Inspect another fabricated fixture" } },
        { type: "tool.execution_start", agentId: "worker-id", timestamp: now, data: { toolCallId: "scan", toolName: "grep", arguments: { pattern: "example" } } },
    ].map((l) => JSON.stringify(l) + "\n").join(""));
    snap = await collectSnapshot();
    const sub = find(CHILD).subagents[0];
    assert.equal(sub.id, "worker-id");
    assert.equal(sub.running, true);
    assert.equal(sub.endedAt, undefined);
    assert.equal(sub.doing, "grep: example");
    assert.equal(find(CHILD).busy, true);
    assert.ok(!("turnOpen" in sub) && !("lifecycleOpen" in sub));
    assert.deepEqual(find(PARENT).childSessions, [CHILD]);
});

test("ownership and a resumed sub-agent before the initial tail are restored", async () => {
    const OWNER = "00000000-0000-0000-0000-000000000005", now = new Date().toISOString();
    writeSession(OWNER, [
        { type: "tool.execution_start", timestamp: now, data: { toolCallId: "create", toolName: "create_session", arguments: {} } },
        { type: "tool.execution_complete", timestamp: now, data: { toolCallId: "create", success: true, result: { content: `Created session 'Example' (id: ${CHILD}) in project 'Demo'.` } } },
        { type: "subagent.started", agentId: "bg", timestamp: now, data: { toolCallId: "task", agentDisplayName: "Background" } },
        { type: "subagent.completed", agentId: "bg", timestamp: now, data: { toolCallId: "task" } },
        { type: "assistant.turn_start", agentId: "bg", timestamp: now, data: {} },
        { type: "tool.execution_start", agentId: "bg", timestamp: now, data: { toolCallId: "late", toolName: "view", arguments: { path: "/tmp/fixture" } } },
        { type: "other", data: "x".repeat(9 * 1024 * 1024) },
        { type: "assistant.turn_end", timestamp: now, data: {} },
    ]);
    const s = (await collectSnapshot()).sessions.find((x) => x.id === OWNER);
    assert.deepEqual(s.childSessions, [CHILD]);
    assert.equal(s.subagents[0].running, true);
    assert.deepEqual(s.runningTools.map((t) => [t.id, t.agentId]), [["late", "bg"]]);
});
