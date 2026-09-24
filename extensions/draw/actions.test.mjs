// Tests for the agent actions, run against a real store on a temp folder.
// Run `node --test` in the extension folder.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { makeActions } from "./actions.mjs";
import { DrawingStore } from "./store.mjs";

class CanvasError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}

// The actions for one panel, with a stand-in for the server that has no canvas open.
async function setup(t) {
    const dir = await mkdtemp(path.join(os.tmpdir(), "draw-actions-test-"));
    const store = new DrawingStore(dir);
    await store.ready;
    const doc = store.create("Plan");
    await store.flush();
    const server = { ensureDrawing: () => store.get(doc.id), hasClient: () => false, selection: () => [] };
    const actions = makeActions({ runtime: async () => ({ store, server }), CanvasError });
    const run = (name, input) => actions.find((a) => a.name === name).handler({ instanceId: "panel", input });
    t.after(async () => {
        await store.flush().catch(() => {});
        await rm(dir, { recursive: true, force: true, maxRetries: 3 });
    });
    return { store, doc, run, server };
}

test("a change the agent makes is on disk when the action returns", async (t) => {
    const { store, doc, run } = await setup(t);
    const result = await run("add_elements", { nodes: [{ id: "api", label: "API" }] });
    assert.equal(result.ok, true);
    assert.equal(result.warning, undefined);
    const saved = JSON.parse(await readFile(store.filePath(doc.id), "utf8"));
    assert.deepEqual(saved.elements.map((e) => e.id), ["api"]);
});

test("a change that cannot be saved is reported by the action that made it", async (t) => {
    const { store, doc, run } = await setup(t);
    // A folder where the drawing's file should be makes the write fail.
    const file = store.filePath(doc.id);
    await rm(file);
    await mkdir(file);
    await writeFile(path.join(file, "keep"), "");

    const result = await run("add_elements", { nodes: [{ id: "api", label: "API" }] });
    assert.equal(result.ok, true);
    assert.match(result.warning, /could not be saved to disk/);
    assert.ok(result.warning.includes(store.saveError(doc.id)));
    await rm(file, { recursive: true });
});

test("a shape that grows to fit a longer label keeps its center, even at the size limit", async (t) => {
    const { store, doc, run } = await setup(t);
    store.replace(doc.id, [{ id: "a", type: "rect", x: 0, y: 1000, w: 20, h: 100 }], "test");
    await run("update_elements", { updates: [{ id: "a", label: "ab ".repeat(1300), size: "xl" }] });
    const [a] = store.get(doc.id).elements;
    assert.equal(a.h, 5000);
    assert.equal(a.y + a.h / 2, 1050);
});

test("get_drawing reads the biggest drawing in parts of limited size", async (t) => {
    const { store, doc, run, server } = await setup(t);
    // The most a drawing can hold: 5,000 shapes with 4,000 character labels.
    const label = "x".repeat(4000);
    const all = Array.from({ length: 5000 }, (_, i) => `r${i}`);
    store.replace(doc.id, all.map((id, i) => ({ id, type: "rect", x: (i % 100) * 200, y: Math.floor(i / 100) * 100, text: label })), "test");
    const listed = (result) => [...result.outline.matchAll(/^- (r\d+) /gm)].map((m) => m[1]);

    const seen = [];
    let start = 0;
    for (;;) {
        const result = await run("get_drawing", { start });
        const size = JSON.stringify(result).length;
        assert.ok(size < 40000, `a part has ${size} characters`);
        seen.push(...listed(result));
        if (result.nextStart === undefined) break;
        assert.equal(result.nextStart, seen.length);
        start = result.nextStart;
    }
    assert.deepEqual(seen, all);

    // Chosen elements come with their JSON, where labels are not cut.
    const chosen = await run("get_drawing", { ids: ["r7", "gone"], includeElements: true });
    assert.deepEqual(chosen.elements.map((e) => [e.id, e.text.length]), [["r7", 4000]]);
    assert.deepEqual(chosen.missingIds, ["gone"]);
    assert.equal(chosen.nextStart, undefined);

    // A selection too big to list is counted, and selectedOnly reads it in parts too.
    server.selection = () => all;
    const counted = await run("get_drawing", {});
    assert.equal(counted.selectedIds, undefined);
    assert.equal(counted.selectedCount, 5000);
    assert.ok(JSON.stringify(counted).length < 40000);
    server.selection = () => ["r3", "r1"];
    const selected = await run("get_drawing", { selectedOnly: true });
    assert.deepEqual(selected.selectedIds, ["r3", "r1"]);
    assert.deepEqual(listed(selected), ["r1", "r3"]);
});

test("an action that names another drawing than the one shown changes nothing", async (t) => {
    const { store, doc, run } = await setup(t);
    const nodes = [{ id: "api", label: "API" }];
    await assert.rejects(run("add_elements", { drawingId: "old-plan", nodes }), (err) => {
        assert.equal(err.code, "drawing_changed");
        assert.ok(err.message.includes(`id ${doc.id}`));
        return true;
    });
    assert.equal(store.get(doc.id).elements.length, 0);
    assert.equal((await run("add_elements", { drawingId: doc.id, nodes })).ok, true);
    assert.equal(store.get(doc.id).elements.length, 1);
});

test("every action on the shown drawing can name the drawing it means", () => {
    const actions = makeActions({ runtime: async () => ({}), CanvasError });
    const unpinned = actions.filter((a) => !a.inputSchema.properties.drawingId).map((a) => a.name);
    assert.deepEqual(unpinned.sort(), ["list_drawings", "open_drawing", "set_theme"]);
});
