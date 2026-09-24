// Tests for how drawings are kept on disk: ids, the element limit, loading, and failed writes.
// Run `node --test` in the extension folder.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { MAX_ELEMENTS } from "./lib/model.mjs";
import { DrawingStore, StoreError } from "./store.mjs";

const rect = (id) => ({ id, type: "rect", x: 0, y: 0, w: 100, h: 60, text: id });

// A store on a temp folder. When the test ends, pending writes finish and the folder is removed.
async function openStore(t) {
    const dir = await mkdtemp(path.join(os.tmpdir(), "draw-store-test-"));
    const store = new DrawingStore(dir);
    await store.ready;
    t.after(async () => {
        await store.flush().catch(() => {});
        await rm(dir, { recursive: true, force: true, maxRetries: 3 });
    });
    return store;
}

// Puts a folder where a drawing's file should be, so writing or deleting the file fails.
async function blockFile(file) {
    await rm(file, { force: true });
    await mkdir(file);
    await writeFile(path.join(file, "keep"), "");
}

test("a failed save warns once, keeps retrying and clears when a write works", async (t) => {
    const store = await openStore(t);
    const doc = store.create("Plan");
    await store.flush();
    const events = [];
    store.on("save", (id, error) => events.push({ id, error }));
    const file = store.filePath(doc.id);
    await blockFile(file);

    store.replace(doc.id, [rect("a")], "test");
    // Each flush is one more failed try. The message stays the same, so the user is only warned once.
    await assert.rejects(store.flush(), (err) => err instanceof StoreError && err.code === "save_failed" && err.status === 500);
    await assert.rejects(store.flush(), { code: "save_failed" });
    assert.equal(events.length, 1);
    assert.equal(events[0].id, doc.id);
    assert.equal(store.saveError(doc.id), events[0].error);
    assert.ok(!events[0].error.includes(".tmp"), `the message names the temp file: ${events[0].error}`);

    await rm(file, { recursive: true });
    await store.flush();
    assert.deepEqual(events[1], { id: doc.id, error: null });
    assert.equal(store.saveError(doc.id), null);
    assert.deepEqual(JSON.parse(await readFile(file, "utf8")).elements.map((e) => e.id), ["a"]);
});

test("a drawing whose file cannot be deleted is kept", async (t) => {
    const store = await openStore(t);
    const doc = store.create("Plan");
    await store.flush();
    const file = store.filePath(doc.id);
    await blockFile(file);

    await assert.rejects(store.remove(doc.id), { code: "delete_failed", status: 500 });
    assert.equal(store.get(doc.id), doc);
    assert.deepEqual(store.list().map((d) => d.id), [doc.id]);
    await rm(file, { recursive: true });
});

test("ids are short, unique and safe to use as file names", async (t) => {
    const store = await openStore(t);
    const name = "A very long drawing name ".repeat(8);
    const ids = Array.from({ length: 12 }, () => store.create(name).id);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) {
        assert.ok(id.length <= 48, id);
        assert.match(id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
    assert.equal(store.create("Ünïcödé / name?").id, "unicode-name");
    assert.equal(store.create("???").id, "drawing");
});

test("changes past the element limit are refused and leave the drawing alone", async (t) => {
    const store = await openStore(t);
    const doc = store.create("Plan");
    store.replace(doc.id, [rect("a")], "test");
    const many = Array.from({ length: MAX_ELEMENTS + 1 }, (_, i) => rect(`r${i}`));
    assert.throws(() => store.replace(doc.id, many, "test"), { code: "too_many_elements", status: 400 });
    assert.equal(doc.rev, 1);
    assert.deepEqual(doc.elements.map((e) => e.id), ["a"]);
    store.replace(doc.id, many.slice(0, MAX_ELEMENTS), "test");
    assert.equal(doc.elements.length, MAX_ELEMENTS);
});

test("drawings load back from disk, and unreadable files are skipped", async (t) => {
    const store = await openStore(t);
    const doc = store.create("Plan");
    store.replace(doc.id, [rect("a"), rect("b")], "test");
    store.bindInstance("panel", doc.id);
    await store.flush();
    await writeFile(path.join(store.dir, "broken.json"), "{ not json");
    await writeFile(path.join(store.dir, "Not A Slug.json"), JSON.stringify({ elements: [] }));

    const logs = [];
    const again = new DrawingStore(store.dir, { log: (message) => logs.push(message) });
    await again.ready;
    assert.deepEqual(again.list().map((d) => d.id), [doc.id]);
    assert.deepEqual(again.get(doc.id).elements, doc.elements);
    assert.equal(again.drawingForInstance("panel").id, doc.id);
    assert.ok(logs.some((message) => message.includes("broken.json")));
});
