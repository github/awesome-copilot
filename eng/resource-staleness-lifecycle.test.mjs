import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { BoardStore } from "../.github/extensions/resource-staleness-board/lib/state.mjs";
import { buildWorkPrompt } from "../.github/extensions/resource-staleness-board/lib/work.mjs";

const item = {
    id: "agents/example.agent.md",
    type: "agents",
    files: ["agents/example.agent.md"],
    fingerprint: "source-v1",
    age: 100,
    ageBand: "stale",
    lastChange: null,
};
const review = {
    recommendation: "refresh",
    rationale: "The tool name is obsolete.",
    improvements: "Replace it with the current API.",
    capabilityEvidence: "The resource retains repository-specific guidance.",
    stalenessAssessment: "The named tool is no longer current.",
};

async function localDirectory(t) {
    const directory = await mkdtemp(path.join(process.cwd(), ".resource-staleness-lifecycle-"));
    t.after(() => rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
    return directory;
}

test("subscribed stores reload another provider's atomic state replacement and clean up polling", async (t) => {
    const directory = await localDirectory(t);
    const file = path.join(directory, "state.json");
    const first = await new BoardStore(file, directory).load();
    const second = await new BoardStore(file, directory).load();
    let observed;
    let resolveObserved;
    const changed = new Promise((resolve) => { resolveObserved = resolve; });
    const unsubscribe = second.subscribe((snapshot) => {
        observed = snapshot;
        if (snapshot.items[0]?.fingerprint === "source-v2") resolveObserved();
    });
    try {
        await first.sync({ items: [item], warning: null });
        await first.sync({
            items: [{ ...item, fingerprint: "source-v2", age: 0, ageBand: "fresh" }],
            warning: "Inventory warning",
        });
        let timeout;
        try {
            await Promise.race([
                changed,
                new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error("Other provider update was not observed.")), 3000); }),
            ]);
        } finally {
            clearTimeout(timeout);
        }
        assert.equal(observed.items[0].fingerprint, "source-v2");
        assert.equal(observed.warning, "Inventory warning");
        assert.equal(second.pollTimer !== null, true);
    } finally {
        unsubscribe();
    }
    assert.equal(second.pollTimer, null);
    assert.equal(JSON.parse(await readFile(file, "utf8")).items[0].fingerprint, "source-v2");
});

test("shared-state reload errors are exposed and clear after a valid replacement", async (t) => {
    const directory = await localDirectory(t);
    const file = path.join(directory, "state.json");
    const store = await new BoardStore(file, directory).load();
    await store.sync({ items: [item], warning: null });
    const errorObserved = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Invalid shared state did not surface an error.")), 3000);
        const unsubscribe = store.subscribe((snapshot) => {
            if (!snapshot.syncError) return;
            clearTimeout(timeout);
            unsubscribe();
            resolve(snapshot);
        });
        t.after(unsubscribe);
    });
    await writeFile(file, "{invalid");
    const failedSnapshot = await errorObserved;
    assert.match(failedSnapshot.syncError, /Unable to reload shared board state/);
    await writeFile(file, `${JSON.stringify(store.state)}\n`);
    const recovered = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Valid shared state did not clear the reload error.")), 3000);
        const unsubscribe = store.subscribe((snapshot) => {
            if (snapshot.syncError) return;
            clearTimeout(timeout);
            unsubscribe();
            resolve(snapshot);
        });
        t.after(unsubscribe);
    });
    assert.equal(recovered.items[0].fingerprint, "source-v1");
});

test("a transaction that fails after reloading another provider's completed review notifies subscribers", async (t) => {
    const directory = await localDirectory(t);
    const file = path.join(directory, "state.json");
    const first = await new BoardStore(file, directory).load();
    const second = await new BoardStore(file, directory).load();
    await first.sync({ items: [item], warning: null });
    const work = await first.queue(item.id, "review");
    await first.recordSession(item.id, work.pending.token, "child");
    await first.result({ id: item.id, token: work.pending.token, review });

    let emissions = 0;
    let observed;
    const unsubscribe = second.subscribe((snapshot) => {
        emissions++;
        observed = snapshot;
    });
    t.after(unsubscribe);
    await assert.rejects(second.transaction(() => { throw new Error("intentional failed transaction"); }), /intentional failed transaction/);
    assert.equal(observed.items[0].review.rationale, review.rationale);
    assert.equal(emissions, 1);
});

test("load emits when clearing a reload error, but not when disk state is unchanged", async (t) => {
    const directory = await localDirectory(t);
    const file = path.join(directory, "state.json");
    const store = await new BoardStore(file, directory).load();
    await store.sync({ items: [item], warning: null });
    let emissions = 0;
    const unsubscribe = store.subscribe(() => { emissions++; });
    t.after(unsubscribe);

    store.syncError = "Unable to reload shared board state: test";
    await store.load();
    assert.equal(store.syncError, null);
    assert.equal(emissions, 1);
    await store.load();
    assert.equal(emissions, 1);
});

test("an older provider scan cannot overwrite the latest inventory or its review and work state", async (t) => {
    const directory = await localDirectory(t);
    const store = await new BoardStore(path.join(directory, "state.json"), directory).load();
    await store.sync({ items: [{ ...item, fingerprint: "current" }], warning: null });

    let work = await store.queue(item.id, "review");
    await store.recordSession(item.id, work.pending.token, "retained-child");
    await store.result({ id: item.id, token: work.pending.token, review });
    work = await store.queue(item.id, "prepare-refresh");
    await store.result({
        id: item.id, token: work.pending.token, summary: "Prepared content",
        diffHash: "d".repeat(64), baseSha: "b".repeat(40),
    });
    work = await store.queue(item.id, "prepare-refresh");
    const pendingToken = work.pending.token;

    const olderProvider = await new BoardStore(store.file, directory).load();
    const newerProvider = await new BoardStore(store.file, directory).load();
    const oldScan = await olderProvider.beginScan();
    const newScan = await newerProvider.beginScan();
    assert.equal(newScan, oldScan + 1);
    await newerProvider.sync({
        items: [{ ...item, fingerprint: "current" }], warning: null, generation: newScan,
    });
    await olderProvider.load();
    const beforeStaleCompletion = olderProvider.snapshot();

    await olderProvider.sync({
        items: [{ ...item, fingerprint: "older" }], warning: "older scan", generation: oldScan,
    });
    const afterStaleCompletion = olderProvider.snapshot();
    assert.equal(afterStaleCompletion.scanGeneration, newScan);
    assert.equal(afterStaleCompletion.items[0].fingerprint, beforeStaleCompletion.items[0].fingerprint);
    assert.deepEqual(afterStaleCompletion.items[0].review, beforeStaleCompletion.items[0].review);
    assert.deepEqual(afterStaleCompletion.items[0].prepared, beforeStaleCompletion.items[0].prepared);
    assert.equal(afterStaleCompletion.items[0].pending.token, pendingToken);
    assert.equal(afterStaleCompletion.warning, beforeStaleCompletion.warning);
});

test("changed resources report invalidation only when saved review, preparation, or pending work is lost", async (t) => {
    const directory = await localDirectory(t);
    const store = await new BoardStore(path.join(directory, "state.json"), directory).load();
    const resources = ["unreviewed", "failed", "reviewed", "prepared", "pending"]
        .map((name) => ({ ...item, id: `agents/${name}.agent.md` }));
    await store.sync({ items: resources, warning: null });
    let work = await store.queue(resources[1].id, "review");
    await store.result({ id: work.id, token: work.pending.token, error: "Existing failure" });
    for (const resource of resources.slice(2, 4)) {
        work = await store.queue(resource.id, "review");
        await store.recordSession(resource.id, work.pending.token, `child-${resource.id}`);
        await store.result({ id: resource.id, token: work.pending.token, review });
    }
    work = await store.queue(resources[3].id, "prepare-refresh");
    await store.result({
        id: work.id, token: work.pending.token, summary: "Prepared content",
        diffHash: "d".repeat(64), baseSha: "b".repeat(40),
    });
    await store.queue(resources[4].id, "review");

    await store.sync({
        items: resources.map((resource) => ({ ...resource, fingerprint: "source-v2" })),
        warning: null,
    });
    assert.equal(store.item(resources[0].id).error, null);
    assert.equal(store.item(resources[1].id).error, "Existing failure");
    for (const resource of resources.slice(2)) {
        const changed = store.item(resource.id);
        assert.match(changed.error, /Content changed.*invalidated/);
        assert.equal(changed.review, null);
        assert.equal(changed.prepared, null);
        assert.equal(changed.pending, null);
    }
});

test("published lifecycle blocks stale follow-up work and prompts verify target main ancestry", async (t) => {
    const directory = await localDirectory(t);
    const store = await new BoardStore(path.join(directory, "state.json"), directory).load();
    await store.sync({ items: [item], warning: null });

    let work = await store.queue(item.id, "review");
    await store.recordSession(item.id, work.pending.token, "child");
    await store.result({ id: item.id, token: work.pending.token, review });

    work = await store.queue(item.id, "prepare-refresh");
    await store.result({
        id: item.id,
        token: work.pending.token,
        summary: "Focused refresh",
        diffHash: "d".repeat(64),
        baseSha: "b".repeat(40),
    });
    work = await store.queue(item.id, "publish", true, "d".repeat(64));
    await store.result({
        id: item.id,
        token: work.pending.token,
        url: "https://github.com/github/awesome-copilot/pull/123",
    });

    await assert.rejects(store.queue(item.id, "review"), /published its prepared work/);
    await assert.rejects(store.queueReviews([item.id]), /published its prepared work/);
    assert.equal(store.item(item.id).prepared.baseSha, "b".repeat(40));
    assert.ok(store.item(item.id).publication);

    const publishPrompt = buildWorkPrompt({
        item: {
            ...store.item(item.id),
            pending: { kind: "publish", token: "publish-token" },
        },
        instanceId: "panel",
        root: directory,
    });
    const assignment = publishPrompt.split("CHILD ASSIGNMENT (")[1].split("END CHILD ASSIGNMENT")[0];
    assert.match(assignment, /fetch its refs\/heads\/main into a temporary local ref/);
    assert.match(assignment, /git merge-base --is-ancestor prepared\.baseSha/);
    assert.match(assignment, /preserve all local staged and unstaged\s+work/);

    const reviewPrompt = buildWorkPrompt({
        item: { ...item, pending: { kind: "review", token: "review-token" } },
        instanceId: "panel",
        root: directory,
    });
    assert.match(reviewPrompt, /No external requests or remote Git operations are authorized except the specifically confirmed publication task above/);
    assert.doesNotMatch(reviewPrompt.split("CHILD ASSIGNMENT (")[1].split("END CHILD ASSIGNMENT")[0], /fetch github\/awesome-copilot\/main/);
});
