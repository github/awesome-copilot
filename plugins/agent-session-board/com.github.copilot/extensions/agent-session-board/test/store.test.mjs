import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, mkdir, utimes } from "node:fs/promises";
import { Worker } from "node:worker_threads";
import os from "node:os";
import path from "node:path";
import { FORMAT, VERSION, boardFileName, configPatch, defaultBoard, getBoard, parseDocument, sanitizeDecisions, updateBoard, validAnswer } from "../lib/store.mjs";

test("parseDocument rejects foreign, newer, malformed and non-JSON files", () => {
    assert.throws(() => parseDocument("{nope", "f"), { code: "store_corrupt" });
    assert.throws(() => parseDocument(JSON.stringify({ format: "something-else", version: 1, board: {} }), "f"), { code: "store_unrecognized" });
    assert.throws(() => parseDocument(JSON.stringify({ format: FORMAT, version: VERSION + 1, board: {} }), "f"), { code: "store_version" });
    assert.throws(() => parseDocument(JSON.stringify({ format: FORMAT, version: VERSION, board: { sessions: {} } }), "f"), { code: "store_corrupt" });
    assert.throws(() => parseDocument(JSON.stringify({ format: FORMAT, version: VERSION }), "f"), { code: "store_corrupt" });
    assert.equal(parseDocument(JSON.stringify({ format: FORMAT, version: VERSION, board: {} }), "f").version, VERSION);
});

test("boardFileName keys boards per repository and refuses unsafe names", () => {
    assert.equal(boardFileName("Octo-Org/My.Repo"), "octo-org__my.repo.json");
    assert.equal(boardFileName("demo"), "demo.json");
    assert.throws(() => boardFileName("octo/.."), { code: "invalid_repo" });
    assert.throws(() => boardFileName("a/b/c"), { code: "invalid_repo" });
});

test("updateBoard writes atomically under COPILOT_HOME and leaves a foreign file untouched", async (t) => {
    const home = await mkdtemp(path.join(os.tmpdir(), "fcb-"));
    const previous = process.env.COPILOT_HOME;
    process.env.COPILOT_HOME = home;
    t.after(async () => {
        if (previous === undefined) delete process.env.COPILOT_HOME;
        else process.env.COPILOT_HOME = previous;
        await rm(home, { recursive: true, force: true });
    });
    const dir = path.join(home, "extension-data", "agent-session-board");
    await Promise.all([
        updateBoard("octo/app", (b) => ({ ...b, idleMinutes: 30 })),
        updateBoard("octo/app", (b) => ({ ...b, decisionLabel: "needs-decision" })),
    ]);
    const saved = JSON.parse(await readFile(path.join(dir, "octo__app.json"), "utf8"));
    assert.equal(saved.format, FORMAT);
    assert.equal(saved.board.idleMinutes, 30, "concurrent updates are serialized");
    assert.equal(saved.board.decisionLabel, "needs-decision");
    assert.deepEqual((await getBoard("octo/other")).sessions, defaultBoard().sessions);

    await mkdir(dir, { recursive: true });
    const foreign = JSON.stringify({ hello: "world" });
    await writeFile(path.join(dir, "octo__foreign.json"), foreign);
    await assert.rejects(updateBoard("octo/foreign", (b) => b), { code: "store_unrecognized" });
    assert.equal(await readFile(path.join(dir, "octo__foreign.json"), "utf8"), foreign);
});

test("configPatch validates labels, regexes and lock prefixes", () => {
    const board = defaultBoard();
    assert.deepEqual(configPatch({ tracks: [{ label: "area: api", titlePattern: "^api" }] }, board).tracks[0].label, "area: api");
    assert.throws(() => configPatch({ tracks: [{ label: 'bad "label"' }] }, board), { code: "invalid_input" });
    assert.throws(() => configPatch({ sessions: [{ id: "a", branchPatterns: ["("] }] }, board), { code: "invalid_input" });
    assert.throws(() => configPatch({ sessions: [{ id: "a", titlePatterns: ["(a+)+$"] }] }, board), { code: "invalid_input" });
    assert.throws(() => configPatch({ tracks: [{ label: "x", titlePattern: "(a|aa)*" }] }, board), { code: "invalid_input" });
    assert.throws(() => configPatch({ sessions: [{ id: "a", titlePatterns: ["(a+){20}$"] }] }, board), { code: "invalid_input" });
    assert.throws(() => configPatch({ sessions: [{ id: "a", titlePatterns: ["[](a+)+$"] }] }, board), { code: "invalid_input" }, "[] closes at once in JavaScript");
    assert.throws(() => configPatch({ localResources: { heavyPattern: "(\\w+\\s?)+$" } }, board), { code: "invalid_input" });
    assert.throws(() => configPatch({ lockPrefixes: { lock: "merge reserve:" } }, board), { code: "invalid_input" });
    assert.equal(configPatch({ lockPrefixes: { lock: "lock:" } }, board).lockPrefixes.release, "merge lock release:");
    assert.deepEqual(configPatch({ lockAuthors: ["octo-cat", "ci[bot]"] }, board).lockAuthors, ["octo-cat", "ci[bot]"]);
    assert.throws(() => configPatch({ lockAuthors: ["not a login"] }, board), { code: "invalid_input" });
    assert.equal(defaultBoard().language, "en", "the board is English unless configured");
    assert.equal(configPatch({ language: "ko" }, board).language, "ko");
    assert.throws(() => configPatch({ language: "fr" }, board), { code: "invalid_input" });
});

test("sanitizeDecisions and validAnswer keep ids well-formed", () => {
    const [first] = sanitizeDecisions([{ title: "Pick one", options: ["a", "b"] }]);
    const [other] = sanitizeDecisions([{ title: "Pick another" }]);
    assert.match(first.id, /^q-[0-9a-f]{10}$/);
    assert.notEqual(first.id, other.id, "default ids differ for different questions");
    assert.throws(() => sanitizeDecisions([{ title: "Same" }, { title: "Same" }]), { code: "invalid_input" });
    assert.throws(() => sanitizeDecisions([{ id: "gh-1", title: "x" }]), { code: "invalid_input" });
    assert.equal(sanitizeDecisions([{ id: "x", title: "t", url: "javascript:alert(1)" }])[0].url, "");
    const rev = "a".repeat(64);
    assert.deepEqual(validAnswer({ id: "gh-12", rev, answer: " yes " }), { id: "gh-12", rev, answer: "yes" });
    assert.equal(validAnswer({ id: "x", answer: "yes" }), null, "an answer must name the question revision");
    assert.equal(validAnswer({ id: "x", rev: "a".repeat(12), answer: "yes" }), null, "a truncated revision is not accepted");
    assert.equal(validAnswer({ id: "../x", rev, answer: "y" }), null);
    assert.equal(validAnswer({ id: "x", rev, answer: "" }), null);
});

test("updateBoard keeps every update when independent writers share the same board", async (t) => {
    const home = await mkdtemp(path.join(os.tmpdir(), "asb-mw-"));
    t.after(() => rm(home, { recursive: true, force: true }));
    const writer = (name) => new Promise((resolve, reject) => {
        const worker = new Worker(new URL("./fixtures/board-writer.mjs", import.meta.url), { workerData: { name, count: 15 }, env: { ...process.env, COPILOT_HOME: home } });
        worker.once("error", reject);
        worker.once("exit", (code) => (code === 0 ? resolve() : reject(new Error(`writer ${name} exited with ${code}`))));
    });
    await Promise.all([writer("a"), writer("b"), writer("c")]);
    const saved = JSON.parse(await readFile(path.join(home, "extension-data", "agent-session-board", "octo__app.json"), "utf8"));
    assert.equal(saved.board.decisions.length, 45);
});

test("a lock left by a dead process is taken over, and the board stays writable", async (t) => {
    const home = await mkdtemp(path.join(os.tmpdir(), "fcb-stale-"));
    const previous = process.env.COPILOT_HOME;
    process.env.COPILOT_HOME = home;
    t.after(async () => {
        if (previous === undefined) delete process.env.COPILOT_HOME;
        else process.env.COPILOT_HOME = previous;
        await rm(home, { recursive: true, force: true });
    });
    const dir = path.join(home, "extension-data", "agent-session-board");
    await mkdir(dir, { recursive: true });
    // PID 2^22+1 is above the default pid_max on Linux and macOS, so no live process owns it.
    await writeFile(path.join(dir, "octo__app.json.lock"), "4194305 deadbeefdeadbeefdeadbeef\n");
    const started = Date.now();
    const board = await updateBoard("octo/app", (b) => ({ ...b, idleMinutes: 42 }));
    assert.equal(board.idleMinutes, 42);
    assert.ok(Date.now() - started < 5000);
    await assert.rejects(readFile(path.join(dir, "octo__app.json.lock")), { code: "ENOENT" }, "the writer released its own lock");
});

test("an empty lock left by an interrupted writer is recovered after its grace period", async (t) => {
    const home = await mkdtemp(path.join(os.tmpdir(), "fcb-empty-"));
    const previous = process.env.COPILOT_HOME;
    process.env.COPILOT_HOME = home;
    t.after(async () => {
        if (previous === undefined) delete process.env.COPILOT_HOME;
        else process.env.COPILOT_HOME = previous;
        await rm(home, { recursive: true, force: true });
    });
    const dir = path.join(home, "extension-data", "agent-session-board");
    await mkdir(dir, { recursive: true });
    const lock = path.join(dir, "octo__app.json.lock");
    await writeFile(lock, "");
    const old = new Date(Date.now() - 60 * 1000);
    await utimes(lock, old, old);
    const board = await updateBoard("octo/app", (b) => ({ ...b, idleMinutes: 7 }));
    assert.equal(board.idleMinutes, 7);
});

test("a fresh takeover marker makes writers back off to the deadline instead of spinning", async (t) => {
    const home = await mkdtemp(path.join(os.tmpdir(), "asb-takeover-"));
    const previous = process.env.COPILOT_HOME;
    process.env.COPILOT_HOME = home;
    t.after(async () => {
        if (previous === undefined) delete process.env.COPILOT_HOME;
        else process.env.COPILOT_HOME = previous;
        await rm(home, { recursive: true, force: true });
    });
    const dir = path.join(home, "extension-data", "agent-session-board");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "octo__app.json.lock"), "4194305 deadbeefdeadbeefdeadbeef\n");
    await writeFile(path.join(dir, "octo__app.json.lock.takeover"), "");
    const started = Date.now();
    let reads = 0;
    const timer = setInterval(() => { reads += 1; }, 50);
    await assert.rejects(updateBoard("octo/app", (b) => b), { code: "store_busy" });
    clearInterval(timer);
    const elapsed = Date.now() - started;
    assert.ok(elapsed >= 9500 && elapsed < 13000, `gave up after ${elapsed} ms`);
    assert.ok(reads > 100, "the event loop stayed free while waiting");
});
