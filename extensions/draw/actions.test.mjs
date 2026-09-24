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
    return { store, doc, run };
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
