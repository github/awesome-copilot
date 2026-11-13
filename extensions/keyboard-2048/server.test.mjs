import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createGameStore, startGameServer } from "./server.mjs";
import { newGame, DIRECTIONS, slide } from "./game.mjs";

async function fixture(t) {
    const directory = await mkdtemp(join(tmpdir(), "copilot-2048-test-"));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const file = join(directory, "save.json");
    const store = await createGameStore(file);
    return { directory, file, store };
}
const movable = state => DIRECTIONS.find(direction => slide(state.board, direction).changed);

test("state and one-level Undo survive provider restart", async t => {
    const { file, store } = await fixture(t);
    const before = store.snapshot();
    await store.execute("move", movable(before));
    const restored = await createGameStore(file);
    const { update: restoredUpdate, ...restoredGame } = restored.snapshot();
    const { update: originalUpdate, ...originalGame } = store.snapshot();
    assert.deepEqual(restoredGame, originalGame);
    assert.equal(restoredUpdate.motion, null);
    assert.notEqual(restoredUpdate.stream, originalUpdate.stream);
    const undone = await restored.execute("undo");
    assert.deepEqual(undone.board, before.board);
    assert.equal(undone.score, before.score);
    assert.equal(undone.moves, before.moves);
    assert.equal(undone.canUndo, false);
});

test("animation updates are ephemeral, ordered, and identical for all panels and replies", async t => {
    const { file } = await fixture(t);
    const initial = { ...newGame(), board: [2, 2, 4, ...Array(13).fill(0)] };
    await writeFile(file, JSON.stringify(initial));
    const store = await createGameStore(file);
    const firstPanel = [];
    const secondPanel = [];
    store.subscribe(state => firstPanel.push(state));
    store.subscribe(state => secondPanel.push(state));
    const before = store.snapshot();
    const plan = slide(before.board, "left");
    const moved = await store.execute("move", "left");
    assert.equal(moved.update.stream, before.update.stream);
    assert.equal(moved.update.revision, before.update.revision + 1);
    assert.deepEqual(moved.update.motion, {
        from: before.board, movements: plan.movements, merges: plan.merges,
    });
    assert.deepEqual(firstPanel, [moved]);
    assert.deepEqual(secondPanel, [moved]);
    assert.deepEqual(store.snapshot(), moved);
    const saved = JSON.parse(await readFile(file, "utf8"));
    assert.equal("update" in saved, false);
    assert.equal("motion" in saved, false);
    const undone = await store.execute("undo");
    assert.equal(undone.update.revision, moved.update.revision + 1);
    assert.equal(undone.update.motion, null);
    assert.deepEqual(undone.board, initial.board);
    const repeatedUndo = await store.execute("undo");
    assert.deepEqual(repeatedUndo, undone);
    const fresh = await store.execute("new");
    assert.equal(fresh.update.revision, undone.update.revision + 1);
    assert.equal(fresh.update.motion, null);
});

test("new game clears Undo and keeps record", async t => {
    const { file } = await fixture(t);
    await writeFile(file, JSON.stringify({
        ...newGame(), board: [2, 2, ...Array(14).fill(0)], best: 100,
    }));
    const store = await createGameStore(file);
    await store.execute("move", "left");
    const next = await store.execute("new");
    assert.equal(next.canUndo, false);
    assert.equal(next.moves, 0);
    assert.equal(next.score, 0);
    assert.equal(next.best, 100);
    assert.equal(next.board.filter(Boolean).length, 2);
});

test("invalid saved data is reported without being overwritten", async t => {
    const { file } = await fixture(t);
    await writeFile(file, '{"invalid":true}');
    await assert.rejects(createGameStore(file), /Invalid 2048 save/);
    assert.equal(await readFile(file, "utf8"), '{"invalid":true}');
});

test("failed persistence leaves live state unchanged and command queue recovers", async t => {
    const { file, store } = await fixture(t);
    const before = store.snapshot();
    await rm(file);
    await mkdir(file);
    await assert.rejects(store.execute("move", movable(before)));
    assert.deepEqual(store.snapshot(), before);
    await rm(file, { recursive: true });
    assert.equal((await store.execute("move", movable(before))).moves, 1);
});

test("commands are serialized and invalid commands do not poison the queue", async t => {
    const { store } = await fixture(t);
    await assert.rejects(store.execute("invalid"), /Invalid command/);
    const before = store.snapshot();
    await Promise.all([store.execute("move", movable(before)), store.execute("undo")]);
    assert.deepEqual(store.snapshot().board, before.board);
    assert.equal(store.snapshot().canUndo, false);
});

test("loopback server serves UI and authenticated actions with live panel updates", async t => {
    const { store } = await fixture(t);
    const server = await startGameServer(store);
    t.after(() => server.close());
    const url = new URL(server.url);
    const endpoint = path => `${url.origin}${path}${url.search}`;
    assert.equal((await fetch(url.origin)).status, 403);
    const page = await fetch(server.url);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, /<html lang="en">/);
    assert.match(html, /aria-label="Move up"/);
    assert.match(html, /New game/);
    assert.match(html, /GAME OVER!/);
    assert.match(html, /<p class="intro">Use arrows or WASD to move tiles\.<br>Merge equal tiles to reach <strong>2048<\/strong>\.<\/p>/);
    for (const path of ["/app.mjs", "/style.css"]) {
        assert.equal((await fetch(endpoint(path))).status, 200);
    }
    const script = await (await fetch(endpoint("/app.mjs"))).text();
    assert.match(script, /Intl\.NumberFormat\("en-US"\)/);
    const css = await (await fetch(endpoint("/style.css"))).text();
    assert.match(css, /content: "NEW"/);
    assert.equal((await fetch(endpoint("/missing"))).status, 404);
    const before = await (await fetch(endpoint("/state"))).json();
    assert.deepEqual(before, store.snapshot());

    const abort = new AbortController();
    t.after(() => abort.abort());
    const events = await fetch(endpoint("/events"), { signal: abort.signal });
    const reader = events.body.getReader();
    const first = new TextDecoder().decode((await reader.read()).value);
    assert.match(first, /data:/);

    const send = (body, origin = url.origin) => fetch(endpoint("/command"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin },
        body: JSON.stringify(body),
    });
    const invalid = await send({ action: "move", direction: "diagonal" });
    assert.equal(invalid.status, 400);
    assert.deepEqual(await invalid.json(), { error: "Invalid command." });
    assert.equal((await send(null)).status, 400);
    assert.equal((await send({ action: "new" }, "https://example.invalid")).status, 403);
    const moved = await (await send({ action: "move", direction: movable(before) })).json();
    assert.equal(moved.moves, before.moves + 1);
    const update = new TextDecoder().decode((await reader.read()).value);
    assert.match(update, /"canUndo":true/);
    assert.deepEqual(JSON.parse(update.trim().slice("data: ".length)), moved);
    const undone = await (await send({ action: "undo" })).json();
    assert.deepEqual(undone.board, before.board);
    assert.equal(undone.canUndo, false);
    abort.abort();
});
