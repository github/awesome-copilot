import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { execFile } from "node:child_process";
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
    const dir = path.join(home, "extension-data", "fleet-control-board");
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
    assert.deepEqual(validAnswer({ id: "gh-12", answer: " yes " }), { id: "gh-12", answer: "yes" });
    assert.equal(validAnswer({ id: "../x", answer: "y" }), null);
    assert.equal(validAnswer({ id: "x", answer: "" }), null);
});

test("updateBoard keeps every update when separate processes write the same board", async (t) => {
    const home = await mkdtemp(path.join(os.tmpdir(), "fcb-mp-"));
    t.after(() => rm(home, { recursive: true, force: true }));
    const storeUrl = new URL("../lib/store.mjs", import.meta.url).href;
    const worker = (name) => new Promise((resolve, reject) => {
        const script = `const { updateBoard } = await import(${JSON.stringify(storeUrl)});
for (let i = 0; i < 15; i += 1) await updateBoard("octo/app", (b) => ({ ...b, decisions: [...b.decisions, { id: "${name}-" + i, title: "t", detail: "", url: "", options: [] }] }));`;
        execFile(process.execPath, ["--input-type=module", "-e", script], { env: { ...process.env, COPILOT_HOME: home } }, (error, stdout, stderr) => (error ? reject(new Error(stderr || error.message)) : resolve()));
    });
    await Promise.all([worker("a"), worker("b"), worker("c")]);
    const saved = JSON.parse(await readFile(path.join(home, "extension-data", "fleet-control-board", "octo__app.json"), "utf8"));
    assert.equal(saved.board.decisions.length, 45);
});
