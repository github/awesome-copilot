import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { BoardStore } from "../.github/extensions/duplicate-review-board/lib/state.mjs";

const group = `#### Group 1: Similar resources

- [ ] Reviewed - these are intentionally separate

| Resource | Type | Description |
|----------|------|-------------|
| \`agents/example.agent.md\` | Agent | Example agent |
| \`skills/example/SKILL.md\` | Skill | Example skill |

**Why flagged:** Similar responsibilities.
`;
const issue = {
    number: 42,
    title: "Duplicate Resource Review",
    html_url: "https://github.com/github/awesome-copilot/issues/42",
    state: "open",
    body: group,
};

test("v1 state without a sequence loads as zero and persists monotonically across mutations", async (t) => {
    const root = path.resolve(`.duplicate-review-board-state-test-${randomUUID()}`);
    const file = path.join(root, "board.json");
    t.after(() => rm(root, { recursive: true, force: true }));
    await mkdir(root, { recursive: true });
    await writeFile(file, JSON.stringify({ version: 1, reports: {}, selected: null }));
    const store = await new BoardStore(file).load();
    assert.equal(store.snapshot().snapshotSequence, 0);
    const eventSequences = [];
    store.subscribe((eventSnapshot) => eventSequences.push(eventSnapshot.snapshotSequence));

    await store.import(issue);
    assert.equal(store.snapshot().snapshotSequence, 1);
    const id = store.snapshot().items[0].id;
    await store.select(42);
    assert.equal(store.snapshot().snapshotSequence, 2);
    let item = store.item(42, id);
    await store.update(42, id, {
        column: "consolidate", note: "Private note", draft: item.draft, expectedRevision: item.revision,
    });
    assert.equal(store.snapshot().snapshotSequence, 3);
    const queued = await store.queue(42, id);
    assert.equal(store.snapshot().snapshotSequence, 4);
    await store.attachAgent(42, id, queued.queueId, "agent-1");
    assert.equal(store.snapshot().snapshotSequence, 5);
    await store.finish(42, id, queued.queueId, { recommendation: "separate", rationale: "Distinct purpose." });
    assert.equal(store.snapshot().snapshotSequence, 6);
    await store.cancel(42, id);
    assert.equal(store.snapshot().snapshotSequence, 7);
    assert.deepEqual(eventSequences, [1, 2, 3, 4, 5, 6, 7]);

    const persisted = JSON.parse(await readFile(file, "utf8"));
    assert.equal(persisted.snapshotSequence, 7);
    assert.equal((await new BoardStore(file).load()).snapshot().snapshotSequence, 7);
    await assert.rejects(store.update(42, id, {
        column: "separate", note: "stale", draft: store.item(42, id).draft, expectedRevision: "stale-revision",
    }), /Local triage changed/);
    assert.equal(store.snapshot().snapshotSequence, 7);
});

test("changed evidence preserves the saved consolidation draft but invalidates review and decision", async (t) => {
    const fixtureRoot = path.resolve(`.duplicate-review-board-state-test-${randomUUID()}`);
    t.after(() => rm(fixtureRoot, { recursive: true, force: true }));
    const store = await new BoardStore(path.join(fixtureRoot, "board.json")).load();
    await store.import(issue);
    let item = store.snapshot().items[0];
    const draft = { title: "Maintainer's proposed title", body: "Carefully edited resolution." };
    await store.update(42, item.id, {
        column: "consolidate", note: "Keep this note", draft, expectedRevision: item.revision,
    });
    const queued = await store.queue(42, item.id);
    await store.finish(42, item.id, queued.queueId, { recommendation: "consolidate", rationale: "A shared implementation is justified." });
    item = store.item(42, item.id);

    await store.import({ ...issue, body: group.replace("Similar responsibilities.", "New evidence about ownership.") });
    item = store.item(42, item.id);
    assert.deepEqual(item.draft, draft);
    assert.equal(item.note, "Keep this note");
    assert.equal(item.column, "unreviewed");
    assert.equal(item.review, null);
    assert.equal(item.queueId, null);
    assert.equal(item.changed, true);

    const reloaded = await new BoardStore(path.join(fixtureRoot, "board.json")).load();
    assert.deepEqual(reloaded.item(42, item.id).draft, draft);
    assert.ok(reloaded.snapshot().snapshotSequence > 0);
});

test("invalid stored snapshot sequences are rejected", async (t) => {
    const fixtureRoot = path.resolve(`.duplicate-review-board-state-test-${randomUUID()}`);
    t.after(() => rm(fixtureRoot, { recursive: true, force: true }));
    await mkdir(fixtureRoot, { recursive: true });
    const invalidFile = path.join(fixtureRoot, "board.json");
    for (const snapshotSequence of [-1, null, 1.5]) {
        await writeFile(invalidFile, JSON.stringify({ version: 1, snapshotSequence, reports: {}, selected: null }));
        await assert.rejects(new BoardStore(invalidFile).load(), /snapshot sequence/);
    }
});
