import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ReviewStore, normalizeUrl, splitHunks } from "./review.mjs";
import { startServer } from "./server.mjs";

const url = "https://github.com/example/project/pull/42";
const base = "a".repeat(40);
const head = "b".repeat(40);
const files = [
    { filename: "src/feature.js", status: "modified", additions: 1, deletions: 1,
        patch: "@@ -1 +1 @@\n-old\n+new", patchNote: "Synthetic test fixture, not provider evidence." },
    { filename: "test/feature.test.js", status: "added", additions: 1, deletions: 0,
        patch: "@@ -0,0 +1 @@\n+test", patchNote: "Synthetic test fixture, not provider evidence." },
];
const groups = [{ id: "feature", title: "Feature and coverage", rationale: "A behavior and its test.", files: files.map((file) => file.filename) }];

function fixture(t) {
    const root = mkdtempSync(join(tmpdir(), "pr-review-test-"));
    t.after(() => rmSync(root, { recursive: true }));
    const store = new ReviewStore(root);
    const doc = store.get(url);
    return { store, doc, root };
}

function stage(store, doc) {
    const request = store.start(doc, "load");
    store.setMetadata(doc, {
        requestId: request.id, url, title: "Synthetic PR", author: "example",
        headSha: head, baseSha: base, changedFileCount: files.length,
    });
    return request.id;
}

function finish(store, doc, requestId) {
    return store.finish(doc, {
        requestId, confirmedHeadSha: head, confirmedBaseSha: base, summary: "Synthetic review.", groups,
    });
}

function published(t) {
    const fixtureData = fixture(t);
    const { store, doc } = fixtureData;
    const requestId = stage(store, doc);
    store.addFiles(doc, { requestId, files });
    finish(store, doc, requestId);
    return fixtureData;
}

test("URL input accepts enterprise PR links and rejects credentials and unrelated hosts", () => {
    assert.equal(normalizeUrl(" https://msft.ghe.com/devdiv/project/pull/12/files?x=1#diff "), "https://msft.ghe.com/devdiv/project/pull/12");
    for (const invalid of ["http://github.com/a/b/pull/1", "https://github.com.evil.test/a/b/pull/1",
        "https://user:secret@github.com/a/b/pull/1", "https://github.com:444/a/b/pull/1",
        "https://github.com/a/b/issues/1", "https://github.com/a/b/pull/0", "file:///C:/x"]) {
        assert.throws(() => normalizeUrl(invalid));
    }
});

test("publication rejects incomplete enumeration, duplicate files, and mixed revisions", (t) => {
    const { store, doc } = fixture(t);
    const requestId = stage(store, doc);
    store.addFiles(doc, { requestId, files: [files[0]] });
    assert.throws(() => finish(store, doc, requestId), /every changed file/);
    assert.throws(() => store.addFiles(doc, { requestId, files: [files[0]] }), /Duplicate/);
    store.addFiles(doc, { requestId, files: [files[1]] });
    assert.throws(() => store.finish(doc, {
        requestId, confirmedHeadSha: "c".repeat(40), confirmedBaseSha: base, summary: "x", groups,
    }), /changed during analysis/);
    assert.equal(doc.snapshot, null);
    assert.equal(finish(store, doc, requestId).files, 2);
});

test("group coverage must be complete and exclusive", (t) => {
    const { store, doc } = fixture(t);
    const requestId = stage(store, doc);
    store.addFiles(doc, { requestId, files });
    const input = { requestId, confirmedHeadSha: head, confirmedBaseSha: base, summary: "x" };
    assert.throws(() => store.finish(doc, { ...input, groups: [{ ...groups[0], files: [files[0].filename] }] }), /every changed file/i);
    assert.throws(() => store.finish(doc, {
        ...input, groups: [groups[0], { ...groups[0], id: "duplicate" }],
    }), /multiply grouped/);
    assert.throws(() => store.finish(doc, {
        ...input, groups: [{ ...groups[0], files: ["unknown.js"] }],
    }), /Unknown/);
});

test("scoped questions include only the selected hunk and reject stale answers", (t) => {
    const { store, doc } = published(t);
    const selection = { kind: "hunk", filename: files[0].filename, hunkIndex: 0 };
    const request = store.start(doc, "question", selection, "Why?");
    const context = store.requestContext(doc, request.id).context;
    assert.equal(context.files.length, 1);
    assert.equal(context.files[0].patch, files[0].patch);
    assert.throws(() => store.answer(doc, { requestId: request.id, headSha: base, answer: "x" }), /different PR revision/);
    store.fail(doc, { requestId: request.id, error: "Stopped waiting." });
    const next = store.start(doc, "question", selection, "Explain again.");
    assert.throws(() => store.answer(doc, { requestId: request.id, headSha: head, answer: "late" }), /no longer active/);
    store.answer(doc, { requestId: next.id, headSha: head, answer: "Pinned explanation." });
    assert.equal(doc.questions.at(-1).answer, "Pinned explanation.");
    assert.throws(() => store.context(doc, { ...selection, hunkIndex: 2 }), /Invalid diff hunk/);
});

test("reload restores URL-owned state and view binding; unfinished work becomes an explicit error", (t) => {
    const { store, doc, root } = published(t);
    store.mark(doc, "feature", true, head);
    store.bindView("panel-one", url);
    const request = store.start(doc, "question", { kind: "group", groupId: "feature" }, "Explain.");
    const restoredStore = new ReviewStore(root);
    const restored = restoredStore.get(url);
    assert.equal(restoredStore.viewUrl("panel-one"), url);
    assert.equal(restored.snapshot.groups[0].reviewed, true);
    assert.equal(restored.pending, null);
    assert.match(restored.error, /restarted/);
    assert.equal(restored.questions.find((q) => q.id === request.id).error, restored.error);
    assert.equal(restoredStore.get(url), restored);
});

test("hunk parsing preserves patch content and bounded context exposes truncation", (t) => {
    const patch = "@@ -1 +1 @@\n-x\n+y\n@@ -10 +10 @@\n-a\n+b";
    assert.equal(splitHunks(patch).length, 2);
    assert.equal(splitHunks(patch).join("\n"), patch);
    const { store, doc } = published(t);
    doc.snapshot.files[0].patch = "x".repeat(90000);
    const context = store.context(doc, { kind: "group", groupId: "feature" });
    assert.equal(context.files[0].patch.length, 80000);
    assert.equal(context.files[0].contextTruncated, true);
    assert.equal(context.files[1].contextTruncated, true);
});

test("loopback UI requires token and same-origin writes, and queues real action targets", async (t) => {
    const { store, doc } = fixture(t);
    const messages = [];
    const panel = await startServer({
        store, instanceId: "test-panel",
        send: async (message) => { messages.push(message); },
        log: async () => {},
    });
    t.after(() => panel.close());
    const endpoint = new URL(panel.url);
    const token = endpoint.pathname.split("/")[1];
    assert.equal((await fetch(endpoint.origin + "/state")).status, 404);
    const response = await fetch(panel.url);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /GitHub pull request link/);
    const request = {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }),
    };
    assert.equal((await fetch(panel.url + "load", request)).status, 403);
    request.headers.Origin = endpoint.origin;
    request.headers["X-PR-Review"] = token;
    assert.equal((await fetch(panel.url + "load", request)).status, 200);
    assert.equal(messages.length, 1);
    assert.equal(messages[0].mode, "enqueue");
    assert.match(messages[0].prompt, /test-panel/);
    assert.match(messages[0].prompt, new RegExp(doc.pending.id));
    assert.match(messages[0].prompt, /Never fabricate/);
    const state = await (await fetch(panel.url + "state")).json();
    assert.equal(state.url, url);
    assert.equal(state.pending.kind, "load");
});

test("failed queueing is visible and does not leave an indefinite pending request", async (t) => {
    const { store, doc } = fixture(t);
    const panel = await startServer({
        store, instanceId: "failed-panel", send: async () => { throw new Error("disconnected"); }, log: async () => {},
    });
    t.after(() => panel.close());
    await assert.rejects(panel.load(url), /disconnected/);
    assert.equal(doc.pending, null);
    assert.match(doc.error, /Could not queue Copilot/);
});
