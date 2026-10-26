import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";
import { test } from "node:test";
import { BoardStore } from "../.github/extensions/resource-staleness-board/lib/state.mjs";
import { body, classify, fingerprint, git, groupResources, lastMeaningfulChange, scanInventory } from "../.github/extensions/resource-staleness-board/lib/inventory.mjs";
import { buildBatchReviewPrompt, buildWorkPrompt, childName } from "../.github/extensions/resource-staleness-board/lib/work.mjs";
import { MAX_PREVIEW_BYTES, readResourceFile } from "../.github/extensions/resource-staleness-board/lib/preview.mjs";

const exec = promisify(execFile);
const extensionDir = fileURLToPath(new URL("../.github/extensions/resource-staleness-board/", import.meta.url));
const resource = {
    id: "agents/example.agent.md", type: "agents", files: ["agents/example.agent.md"],
    fingerprint: "source", age: 100, ageBand: "stale", lastChange: null,
};
const review = {
    recommendation: "refresh", rationale: "Old tool names need replacing.",
    improvements: "Replace the named deprecated tool and validate its current schema.",
    capabilityEvidence: "Native planning exists, but this resource still adds repository-specific constraints.",
    stalenessAssessment: "100 days since meaningful change. Deprecated tool names make this materially outdated.",
};
const diffHash = "d".repeat(64);
const baseSha = "b".repeat(40);
const MAX_REVIEW_BATCH_SIZE = 10;

async function directory(t) {
    const root = await mkdtemp(path.join(os.tmpdir(), "resource-staleness-"));
    t.after(() => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
    return root;
}

async function fixture(t) {
    const root = await directory(t);
    await git(root, ["init", "--quiet", "--initial-branch=main"]);
    await git(root, ["config", "user.name", "Fixture"]);
    await git(root, ["config", "user.email", "fixture@example.invalid"]);
    await git(root, ["config", "commit.gpgsign", "false"]);
    await git(root, ["config", "core.autocrlf", "false"]);
    async function write(file, contents) {
        const absolute = path.join(root, ...file.split("/"));
        await mkdir(path.dirname(absolute), { recursive: true });
        await writeFile(absolute, contents);
    }
    async function commit(date, message) {
        await git(root, ["add", "--all"]);
        await exec("git", ["-c", "core.hooksPath=", "commit", "--quiet", "-m", message,
            "-m", "Co-authored-by: Copilot App <223556219+Copilot@users.noreply.github.com>"], {
            cwd: root, windowsHide: true,
            env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
        });
    }
    return { root, write, commit };
}

async function storeFixture(t) {
    const root = await directory(t);
    const store = await new BoardStore(path.join(root, "state.json"), root).load();
    await store.sync({ items: [resource], warning: null });
    return store;
}

async function queue(store, kind = "review", confirmed, hash) {
    const item = await store.queue(resource.id, kind, confirmed, hash);
    if (!item.childSessionId) await store.recordSession(item.id, item.pending.token, "child-1");
    return { id: item.id, token: item.pending.token };
}

test("age thresholds use whole days and include unknown history explicitly", () => {
    const now = Date.parse("2026-10-22T00:00:00Z");
    const at = (days) => new Date(now - days * 86400000).toISOString();
    for (const [days, band] of [[0, "fresh"], [13, "fresh"], [14, "aging"], [30, "aging"], [31, "stale"]]) {
        assert.deepEqual(classify(at(days), now), { age: days, ageBand: band });
    }
    assert.deepEqual(classify(null, now), { age: null, ageBand: "unknown" });
    assert.throws(() => classify("not a date", now), /Invalid resource date/);
    assert.equal(body("---\ndescription: changed\n---\nKeep  this.\r\n", "example.md"), "Keepthis.");
    assert.equal(body("---\nnot frontmatter\n---\n", "example.txt"), "---\nnot frontmatter\n---\n");
});

test("resource groups cover all five types and bundle hook/skill assets once", () => {
    const groups = groupResources([
        "agents/a.agent.md", "agents/not-an-agent.md", "prompts/a.prompt.md", "instructions/a.instructions.md",
        "hooks/one/README.md", "hooks/one/hooks.json", "skills/two/SKILL.md", "skills/two/scripts/run.js",
        "skills/README.md", "extensions/other/extension.mjs",
    ]);
    assert.equal(groups.length, 5);
    assert.deepEqual(groups.find((item) => item.id === "hooks/one").files, ["hooks/one/README.md", "hooks/one/hooks.json"]);
    assert.equal(groups.find((item) => item.id === "skills/two").files.length, 2);
});

test("meaningful history ignores metadata, whitespace, renames and bulk changes, following old paths", async (t) => {
    const f = await fixture(t);
    const original = "agents/old.agent.md";
    await f.write(original, "---\ndescription: initial\n---\nInitial guidance.\n");
    await f.commit("2025-01-01T00:00:00Z", "Add resource");
    await f.write(original, "---\ndescription: initial\n---\nSubstantive guidance.\n");
    await f.commit("2025-02-01T00:00:00Z", "Improve guidance");
    await f.write(original, "---\ndescription: initial\n---\nSubstantive   guidance. \r\n");
    await f.commit("2025-03-01T00:00:00Z", "Formatting");
    await f.write(original, "---\ndescription: changed\nname: example\n---\nSubstantive   guidance. \n");
    await f.commit("2025-04-01T00:00:00Z", "Update metadata");
    await f.write(original, "---\ndescription: changed\nname: example\n---\nBulk updated guidance.\n");
    await f.commit("2025-04-15T00:00:00Z", "bulk updating resources");
    await git(f.root, ["mv", original, resource.id]);
    await f.commit("2025-05-01T00:00:00Z", "Rename file");
    await f.write(resource.id, "---\ndescription: changed\nname: example\n---\nBulk generated content.\n");
    await f.commit("2025-06-01T00:00:00Z", "bulk formatting across repository");
    const change = await lastMeaningfulChange(f.root, resource.id);
    assert.equal(change.date.slice(0, 10), "2025-02-01");
});

test("inventory uses addition fallback, folder assets, binary changes, and unknown staged files", async (t) => {
    const f = await fixture(t);
    await f.write(resource.id, "Keep this.\n");
    await f.write("skills/example/SKILL.md", "---\nname: example\n---\nGuidance.\n");
    await f.write("skills/example/asset.bin", Buffer.from([0, 128, 3]));
    await f.commit("2025-01-01T00:00:00Z", "Add resources");
    await f.write("skills/example/asset.bin", Buffer.from([0, 129, 3]));
    await f.commit("2025-02-01T00:00:00Z", "Improve bundled asset");
    await f.write("prompts/new.prompt.md", "Not committed yet.\n");
    await git(f.root, ["add", "--", "prompts/new.prompt.md"]);
    const result = await scanInventory(f.root, { now: Date.parse("2025-03-01T00:00:00Z") });
    assert.equal(result.items.length, 3);
    assert.equal(result.items.find((item) => item.id === resource.id).lastChange.date.slice(0, 10), "2025-01-01");
    assert.equal(result.items.find((item) => item.id === "skills/example").lastChange.date.slice(0, 10), "2025-02-01");
    assert.equal(result.items.find((item) => item.id === "prompts/new.prompt.md").ageBand, "unknown");
    assert.equal(result.warning, null);
    const first = await fingerprint(f.root, [resource.id]);
    await f.write(resource.id, "Working tree change.\n");
    assert.notEqual(await fingerprint(f.root, [resource.id]), first);
    await rm(path.join(f.root, ...resource.id.split("/")));
    await assert.rejects(scanInventory(f.root), /ENOENT/);
});

test("shallow inventory reports incomplete history without fetching", async (t) => {
    const f = await fixture(t);
    await f.write(resource.id, "Original.\n");
    await f.commit("2025-01-01T00:00:00Z", "Add resource");
    const parent = await directory(t);
    const clone = path.join(parent, "shallow");
    await git(parent, ["clone", "--quiet", "--depth=1", pathToFileURL(f.root).href, clone]);
    assert.match((await scanInventory(clone)).warning, /Shallow Git history/);
});

test("state survives new stores and preserves child context while invalidating changed content", async (t) => {
    const store = await storeFixture(t);
    const request = await queue(store);
    await store.result({ ...request, review });
    const reloaded = await new BoardStore(store.file, store.root).load();
    assert.deepEqual(reloaded.item(resource.id).review.rationale, review.rationale);
    assert.equal(reloaded.item(resource.id).childSessionId, "child-1");
    await reloaded.sync({ items: [{ ...resource, fingerprint: "changed" }], warning: null });
    assert.equal(reloaded.item(resource.id).review, null);
    assert.equal(reloaded.item(resource.id).childSessionId, "child-1");
    assert.match(reloaded.item(resource.id).error, /Content changed/);
});

test("queue tokens reject duplicate work, replaced children and late/cancelled results", async (t) => {
    const store = await storeFixture(t);
    const request = await queue(store);
    await assert.rejects(store.queue(resource.id, "review"), /pending work/);
    await assert.rejects(store.recordSession(request.id, request.token, "child-2"), /Reuse the existing/);
    await store.cancel(request.id, request.token);
    await assert.rejects(store.result({ ...request, review }), /Stale work token/);
    const next = await queue(store);
    assert.notEqual(next.token, request.token);
    await assert.rejects(store.result({ ...next, review: { recommendation: "remove", rationale: "It is old" } }), /capability evidence/);
    await store.result({ ...next, error: "Child unavailable." });
    assert.equal(store.item(resource.id).pending, null);
    assert.equal(store.item(resource.id).error, "Child unavailable.");
});

test("failed child creation can release a queue before any session was recorded", async (t) => {
    const store = await storeFixture(t);
    const item = await store.queue(resource.id, "review");
    await store.result({ id: resource.id, token: item.pending.token, error: "Could not create child session." });
    assert.equal(store.item(resource.id).pending, null);
    assert.equal(store.item(resource.id).childSessionId, null);
    assert.match(store.item(resource.id).error, /Could not create/);
});

test("publication requires a child, prepared exact diff and explicit boolean confirmation", async (t) => {
    const store = await storeFixture(t);
    await assert.rejects(store.queue(resource.id, "publish", true, diffHash), /Publishing requires/);
    await assert.rejects(store.queue(resource.id, "prepare-refresh"), /Review this resource/);
    await store.result({ ...await queue(store), review });
    const prepare = await queue(store, "prepare-refresh");
    await assert.rejects(store.result({ ...prepare, summary: "Updated the tool name" }), /SHA-256/);
    await store.result({ ...prepare, summary: "Updated only the tool name", diffHash, baseSha });
    const rereview = await queue(store, "review");
    await store.result({ ...rereview, review });
    assert.equal(store.item(resource.id).prepared.diffHash, diffHash, "reviewing the source baseline must not discard prepared edits");
    const followup = await queue(store, "prepare-refresh");
    await store.cancel(followup.id, followup.token);
    await assert.rejects(store.queue(resource.id, "publish", "true", diffHash), /Publishing requires/);
    await assert.rejects(store.queue(resource.id, "publish", true, "a".repeat(64)), /Publishing requires/);
    const publication = await queue(store, "publish", true, diffHash);
    for (const url of [
        "javascript:alert(1)", "https://example.com/github/awesome-copilot/pull/123",
        "https://github.com/other/repo/pull/123", "https://github.com/github/awesome-copilot/pull/123?tab=files",
        "https://github.com/github/awesome-copilot/pull/0",
    ]) {
        await assert.rejects(store.result({ ...publication, url }), /canonical HTTPS GitHub pull request URL/);
    }
    await store.result({ ...publication, url: "https://github.com/github/awesome-copilot/pull/123" });
    assert.match(store.item(resource.id).publication.url, /\/pull\/123$/);
    await assert.rejects(store.queue(resource.id, "publish", true, diffHash), /follow-up work is disabled/);
});

test("independent writers serialize and reload state instead of overwriting each other", async (t) => {
    const first = await storeFixture(t);
    const second = await new BoardStore(first.file, first.root).load();
    const outcomes = await Promise.allSettled([first.queue(resource.id, "review"), second.queue(resource.id, "review")]);
    assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
    assert.match(outcomes.find((outcome) => outcome.status === "rejected").reason.message, /pending work/);
});

test("locked queue and result reject fingerprints observed before another provider's state update", async (t) => {
    const staleQueue = await storeFixture(t);
    const scanner = await new BoardStore(staleQueue.file, staleQueue.root).load();
    await scanner.sync({ items: [{ ...resource, fingerprint: "revision-b" }], warning: null });
    await assert.rejects(
        staleQueue.queue(resource.id, "review", undefined, undefined, resource.fingerprint),
        /changed since it was observed/,
    );

    const staleResult = await storeFixture(t);
    const first = await queue(staleResult);
    const competing = await new BoardStore(staleResult.file, staleResult.root).load();
    await competing.sync({ items: [{ ...resource, fingerprint: "revision-b" }], warning: null });
    const replacement = await competing.queue(resource.id, "review", undefined, undefined, "revision-b");
    await assert.rejects(
        staleResult.result({ id: resource.id, token: replacement.pending.token, review }, resource.fingerprint),
        /changed since it was observed/,
    );
    assert.equal((await competing.load()).item(resource.id).pending.token, replacement.pending.token);
    assert.notEqual(first.token, replacement.pending.token);
});

test("batch reviews queue atomically, retain children, and reject overlapping requests", async (t) => {
    const store = await storeFixture(t);
    const second = { ...resource, id: "agents/second.agent.md" };
    await store.sync({ items: [resource, second], warning: null });
    const firstRequest = await queue(store);
    await store.result({ ...firstRequest, review });
    for (const ids of [[], [resource.id, resource.id], [resource.id, ""], [42]]) {
        await assert.rejects(store.queueReviews(ids), /unique resource IDs/);
    }
    await assert.rejects(store.queueReviews([resource.id, "agents/missing.agent.md"]), /not on this board/);
    assert.equal(store.item(resource.id).pending, null, "a late invalid ID cannot leave earlier items queued");

    const competing = await new BoardStore(store.file, store.root).load();
    const results = await Promise.allSettled([
        store.queueReviews([resource.id, second.id]), competing.queueReviews([second.id, resource.id]),
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.match(results.find((result) => result.status === "rejected").reason.message, /pending work/);
    const requests = results.find((result) => result.status === "fulfilled").value;
    assert.equal(new Set(requests.map((item) => item.pending.token)).size, 2);
    await store.load();
    assert.equal(store.item(resource.id).childSessionId, "child-1");
    assert.equal(store.item(resource.id).review.recommendation, "refresh", "keep prior evidence while a new review runs");
    const pending = new Map(requests.map((item) => [item.id, item.pending.token]));
    await assert.rejects(store.result({
        id: resource.id, token: pending.get(resource.id), review: { ...review, stalenessAssessment: "" },
    }), /staleness assessment/);
    await store.result({ id: resource.id, token: pending.get(resource.id), review });
    await store.recordSession(second.id, pending.get(second.id), "child-2");
    await store.cancel(second.id, pending.get(second.id));
    const newer = await store.queue(second.id, "review");
    await store.cancelReviews(requests, "Batch dispatch was uncertain.");
    assert.equal(store.item(resource.id).error, null, "do not overwrite completed results");
    assert.equal(store.item(second.id).pending.token, newer.pending.token, "do not cancel a replacement token");
    await store.cancelReviews([newer], "Batch dispatch was uncertain.");
    assert.equal(store.item(second.id).pending, null);
    assert.match(store.item(second.id).error, /uncertain/);
});

test("batch review fingerprint checks are atomic against reloaded state", async (t) => {
    const store = await storeFixture(t);
    const second = { ...resource, id: "agents/second.agent.md" };
    await store.sync({ items: [resource, second], warning: null });
    const competing = await new BoardStore(store.file, store.root).load();
    await competing.sync({ items: [{ ...resource, fingerprint: "revision-b" }, second], warning: null });
    await assert.rejects(
        store.queueReviews([resource.id, second.id], new Map([[resource.id, resource.fingerprint], [second.id, second.fingerprint]])),
        /changed since it was observed/,
    );
    await competing.load();
    assert.equal(competing.item(resource.id).pending, null);
    assert.equal(competing.item(second.id).pending, null);
});

test("corrupt state is surfaced and failed writes do not report success", async (t) => {
    const store = await storeFixture(t);
    await writeFile(store.file, "{corrupt");
    await assert.rejects(store.load(), /JSON|Unexpected|Expected/);
    await assert.rejects(store.queue(resource.id, "review"), /JSON|Unexpected|Expected/);
    assert.equal(store.item(resource.id).pending, null);
    await assert.rejects(readFile(`${store.file}.lock`), /ENOENT/);
});

test("work instructions require child reuse, concrete improvements and capability evidence", () => {
    const item = { ...resource, pending: { kind: "review", token: "token-1" } };
    const prompt = buildWorkPrompt({ item, instanceId: "panel-1", root: "fixture" });
    assert.match(prompt, /list_sessions_and_chats/);
    assert.match(prompt, /create_session/);
    assert.match(prompt, /mode: "autopilot"/);
    assert.match(prompt, /stalenessAssessment: string/);
    assert.match(prompt, /time since the last meaningful update/);
    assert.match(prompt, /Do not set base_branch/);
    assert.match(prompt, /record_session/);
    assert.match(prompt, /Age or a claim that models are smarter is NOT evidence/);
    assert.match(prompt, /improvements: string, capabilityEvidence/);
    assert.match(prompt, /No external requests or remote Git operations are authorized/);
    const assignment = prompt.split("CHILD ASSIGNMENT (")[1].split("END CHILD ASSIGNMENT")[0];
    assert.match(assignment, /verify this child's resource content matches the supplied fingerprint/);
    assert.match(assignment, /enumerate the child's tracked files.*set to equal the supplied files list/s);
    assert.match(assignment, /raw file bytes.*must equal the supplied fingerprint/s);
    assert.ok(childName(resource.id).length <= 40);
    const repeat = buildWorkPrompt({ item: { ...item, childSessionId: "existing-child" }, instanceId: "panel-1", root: "fixture" });
    assert.match(repeat, /Reuse child session "existing-child"/);
    assert.match(repeat, /mode: "autopilot" and delivery_mode: "immediate"/);
    assert.match(repeat, /without navigating to the child or waiting/);
    assert.doesNotMatch(repeat, /call create_session/);
    const publish = buildWorkPrompt({
        item: { ...item, childSessionId: "existing-child", prepared: { diffHash, baseSha }, pending: { kind: "publish", token: "token-2" } },
        instanceId: "panel-1", root: "fixture",
    });
    assert.match(publish, /HEAD to equal prepared.baseSha/);
    assert.match(publish, /git diff --cached --binary/);
    assert.match(publish, /Do not merge it/);
    assert.doesNotMatch(publish, /mode: "autopilot"/);
    const publishAssignment = publish.split("CHILD ASSIGNMENT (")[1].split("END CHILD ASSIGNMENT")[0];
    assert.match(publishAssignment, /For publication, require git rev-parse HEAD/);
    assert.doesNotMatch(publishAssignment, /original source file set at prepared\.baseSha/);
    const preparedWork = buildWorkPrompt({
        item: { ...item, childSessionId: "existing-child", prepared: { diffHash, baseSha }, pending: { kind: "prepare-refresh", token: "token-4" } },
        instanceId: "panel-1", root: "fixture",
    });
    const preparedAssignment = preparedWork.split("CHILD ASSIGNMENT (")[1].split("END CHILD ASSIGNMENT")[0];
    assert.match(preparedAssignment, /git rev-parse HEAD to equal b{40}/);
    assert.match(preparedAssignment, /git diff --cached --binary to equal d{64}/);
    assert.match(preparedAssignment, /leave all prepared\s+edits\s+untouched/);
    assert.match(preparedWork, /Read the recorded review below/);
    const prepare = buildWorkPrompt({
        item: { ...item, pending: { kind: "prepare-refresh", token: "token-3" } },
        instanceId: "panel-1", root: "fixture",
    });
    assert.match(prepare, /mode: "interactive"/);
});

test("batch prompts route independent background children and require all three review dimensions", () => {
    const items = [
        { ...resource, pending: { kind: "review", token: "first-token" }, childSessionId: "retained" },
        { ...resource, id: "agents/second.agent.md", pending: { kind: "review", token: "second-token" } },
    ];
    const prompt = buildBatchReviewPrompt({ items, instanceId: "panel-1", root: "fixture" });
    assert.match(prompt, /exactly 2 resources/);
    assert.match(prompt, /Start all requested reviews without waiting/);
    assert.match(prompt, /continue routing the remaining items/);
    assert.match(prompt, /Reuse child session "retained"/);
    assert.match(prompt, /time since meaningful update, usefulness beyond current model capabilities/);
    assert.match(prompt, /recommended course of action/);
    assert.match(prompt, /separate work token and retained child/);
    for (const item of items) {
        assert.ok(prompt.includes(item.id));
        assert.ok(prompt.includes(item.pending.token));
    }
});

async function loadCanvas(t, f, { send, scanInventoryOverride } = {}) {
    let canvas;
    const prompts = [];
    const context = vm.createContext({
        process: { env: { COPILOT_HOME: path.join(f.root, "home") }, platform: process.platform },
    });
    const sdk = {
        createCanvas: (definition) => definition,
        joinSession: async ({ canvases }) => {
            [canvas] = canvases;
            return { send: async ({ prompt }) => { prompts.push(prompt); if (send) await send(prompt); }, log() {} };
        },
        CanvasError: class extends Error {
            constructor(code, message) { super(message); this.code = code; }
        },
    };
    const filename = path.join(extensionDir, "extension.mjs");
    const module = new vm.SourceTextModule(await readFile(filename, "utf8"), {
        context,
        initializeImportMeta(meta) { meta.url = pathToFileURL(filename).href; },
    });
    await module.link(async (specifier) => {
        let exports;
        if (specifier === "@github/copilot-sdk/extension") exports = sdk;
        else {
            exports = await import(specifier.startsWith(".")
                ? pathToFileURL(path.resolve(extensionDir, specifier)).href : specifier);
            if (specifier === "./lib/inventory.mjs") {
                exports = {
                    ...exports,
                    git: (_root, args, encoding) => git(f.root, args, encoding),
                    ...(scanInventoryOverride ? { scanInventory: scanInventoryOverride } : {}),
                };
            }
        }
        return new vm.SyntheticModule(Object.keys(exports), function () {
            for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
        }, { context });
    });
    await module.evaluate();
    const action = (name, input = {}) => canvas.actions.find((entry) => entry.name === name)
        .handler({ instanceId: "test-panel", input });
    t.after(() => canvas.onClose({ instanceId: "test-panel" }));
    return { canvas, action, prompts };
}

test("scan progress broadcasts are throttled without dropping final board notifications", async (t) => {
    const f = await fixture(t);
    await f.write(resource.id, "A resource.\n");
    await f.commit("2025-01-01T00:00:00Z", "Add resource");
    const emitted = [];
    const originalEmit = BoardStore.prototype.emit;
    BoardStore.prototype.emit = function () {
        emitted.push(this.progress ? { ...this.progress } : null);
        return originalEmit.call(this);
    };
    try {
        const { action } = await loadCanvas(t, f, {
            scanInventoryOverride: async (_root, { progress }) => {
                for (let completed = 1; completed <= 100; completed++) progress({ completed, total: 100 });
                return { items: [resource], warning: null };
            },
        });
        await action("scan");
    } finally {
        BoardStore.prototype.emit = originalEmit;
    }
    const progress = emitted.filter(Boolean);
    assert.ok(progress.length < 10, `expected fewer than 10 progress broadcasts, got ${progress.length}`);
    assert.equal(progress.at(-1).completed, 100, "the final sync contains the last progress value");
    assert.equal(emitted.at(-1), null, "finally broadcasts the completed scan state");
});

test("canvas routes use local history, protected loopback HTTP and reusable persistent state", async (t) => {
    const f = await fixture(t);
    await f.write(resource.id, "A resource.\n");
    await f.commit("2025-01-01T00:00:00Z", "Add resource");
    const { canvas, action, prompts } = await loadCanvas(t, f);
    const [opened, initial] = await Promise.all([
        canvas.open({ instanceId: "test-panel", input: {} }), action("get_board"),
    ]);
    assert.match(opened.url, /^http:\/\/127\.0\.0\.1:\d+\/$/);
    assert.equal(initial.items.length, 0);
    assert.equal((await canvas.open({ instanceId: "test-panel", input: {} })).url, opened.url);
    const html = await (await fetch(opened.url)).text();
    const token = html.match(/name="board-token" content="([^"]+)"/)[1];
    assert.notEqual(token, "__BOARD_TOKEN__");
    assert.equal((await fetch(`${opened.url}api/get_board`)).status, 403);
    const headers = { "X-Board-Token": token, "Content-Type": "application/json" };
    const scanResponse = await fetch(`${opened.url}api/scan`, { method: "POST", headers, body: "{}" });
    assert.equal(scanResponse.status, 200);
    assert.ok(Array.isArray((await scanResponse.json()).items), "HTTP renderer route retains the full snapshot");
    assert.equal(prompts.length, 0);
    assert.equal((await action("get_board")).items.length, 1);
    const compactScan = await action("scan");
    assert.equal(compactScan.total, 1);
    assert.ok(compactScan.counts);
    assert.equal(compactScan.items, undefined);
    const queued = await action("request_work", { id: resource.id, kind: "review" });
    assert.deepEqual(canvas.actions.find((entry) => entry.name === "request_work").inputSchema.properties.kind.enum,
        ["review", "prepare-refresh", "prepare-removal"]);
    assert.match(queued.instructions, /create_session/);
    assert.equal(prompts.length, 0, "RPC returns instructions without sending duplicate work");
    const sessionSaved = await action("record_session", { id: resource.id, token: queued.token, childSessionId: "retained-child" });
    assert.equal(sessionSaved.item.childSessionId, "retained-child");
    assert.equal(sessionSaved.items, undefined);
    const reviewSaved = await action("record_result", { id: resource.id, token: queued.token, review });
    assert.equal(reviewSaved.item.recommendation, "refresh");
    assert.equal(reviewSaved.items, undefined);
    const response = await fetch(`${opened.url}api/request_work`, {
        method: "POST", headers, body: JSON.stringify({ id: resource.id, kind: "prepare-refresh" }),
    });
    assert.equal(response.status, 200);
    assert.equal(prompts.length, 1);
    assert.match(prompts[0], /Reuse child session "retained-child"/);
    assert.match(prompts[0], /Do NOT commit, push/);
    const pending = (await action("get_item", { id: resource.id })).item.pending;
    await action("record_result", {
        id: resource.id, token: pending.token, summary: "One focused edit", baseSha, diffHash,
    });
    const denied = await fetch(`${opened.url}api/request_work`, {
        method: "POST", headers, body: JSON.stringify({ id: resource.id, kind: "publish", confirmed: true, diffHash: "wrong" }),
    });
    assert.equal(denied.status, 400);
    assert.equal(prompts.length, 1);
    await assert.rejects(action("request_work", {
        id: resource.id, kind: "publish", confirmed: true, diffHash,
    }), /only through the UI after confirming/);
    assert.equal(prompts.length, 1, "canvas RPC cannot queue publication using a supplied confirmation boolean");
    const confirmed = await fetch(`${opened.url}api/request_work`, {
        method: "POST", headers, body: JSON.stringify({ id: resource.id, kind: "publish", confirmed: true, diffHash }),
    });
    assert.equal(confirmed.status, 200);
    assert.equal(prompts.length, 2);
    assert.match(prompts[1], /The user explicitly confirmed "Publish PR"/);
    await f.write(resource.id, "Changed after scanning.\n");
    await assert.rejects(action("request_work", { id: resource.id, kind: "review" }), /resource changed/);
    const reloaded = await loadCanvas(t, f);
    const retained = await reloaded.action("get_item", { id: resource.id });
    assert.equal(retained.item.childSessionId, "retained-child");
    assert.equal(retained.item.prepared.diffHash, diffHash);
    assert.deepEqual((await git(f.root, ["status", "--porcelain", "--", "agents"])).trim(), "M agents/example.agent.md");
});

test("changed folder membership and content reject results before they can be persisted", async (t) => {
    const f = await fixture(t);
    await f.write("skills/example/SKILL.md", "Example skill.\n");
    await f.commit("2025-01-01T00:00:00Z", "Add skill");
    const { action } = await loadCanvas(t, f);
    await action("scan");
    const id = "skills/example";
    const { token } = await action("request_work", { id, kind: "review" });
    await action("record_session", { id, token, childSessionId: "child" });
    await f.write("skills/example/new.txt", "New behavior.\n");
    await git(f.root, ["add", "--", "skills/example/new.txt"]);
    await assert.rejects(action("record_result", { id, token, review }), /resource changed/);
    await action("scan");
    await assert.rejects(action("record_result", { id, token, review }), /Stale work token/);
});

test("canvas cancellation returns only counts and the affected item", async (t) => {
    const f = await fixture(t);
    await f.write(resource.id, "Example.\n");
    await f.commit("2025-01-01T00:00:00Z", "Add resource");
    const { action } = await loadCanvas(t, f);
    await action("scan");
    const queued = await action("request_work", { id: resource.id, kind: "review" });
    const cancelled = await action("cancel_work", { id: resource.id, token: queued.token });
    assert.ok(cancelled.counts);
    assert.equal(cancelled.item.pending, null);
    assert.equal(cancelled.items, undefined);
});

test("dispatch failures are explicit, release the local queue and never retry automatically", async (t) => {
    const f = await fixture(t);
    await f.write(resource.id, "Example.\n");
    await f.commit("2025-01-01T00:00:00Z", "Add resource");
    const { canvas, action, prompts } = await loadCanvas(t, f, {
        send: async () => { throw new Error("Connection lost"); },
    });
    await action("scan");
    const opened = await canvas.open({ instanceId: "test-panel", input: {} });
    const html = await (await fetch(opened.url)).text();
    const token = html.match(/name="board-token" content="([^"]+)"/)[1];
    const response = await fetch(`${opened.url}api/request_work`, {
        method: "POST", headers: { "X-Board-Token": token, "Content-Type": "application/json" },
        body: JSON.stringify({ id: resource.id, kind: "review" }),
    });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /Connection lost/);
    const item = (await action("get_board")).items[0];
    assert.equal(item.pending, null);
    assert.equal(item.error, "Error recorded; inspect the HTTP dashboard for details.");
    assert.equal(prompts.length, 1);
});

test("batch HTTP and RPC routes queue once, retain per-item results, and reject stale input before queuing", async (t) => {
    const f = await fixture(t);
    const second = "agents/second.agent.md";
    await f.write(resource.id, "First resource.\n");
    await f.write(second, "Second resource.\n");
    await f.commit("2025-01-01T00:00:00Z", "Add resources");
    const { canvas, action, prompts } = await loadCanvas(t, f);
    await action("scan");
    const ids = [resource.id, second];
    for (const invalid of [[], [resource.id, resource.id], [resource.id, 1]]) {
        await assert.rejects(action("request_reviews", { ids: invalid }), /unique resource IDs/);
    }
    const queued = await action("request_reviews", { ids });
    assert.equal(queued.requests.length, 2);
    assert.equal(prompts.length, 0, "RPC returns instructions without dispatching duplicate work");
    for (const [index, request] of queued.requests.entries()) {
        await action("record_session", { ...request, childSessionId: `child-${index}` });
        await action("record_result", { ...request, review });
    }
    const opened = await canvas.open({ instanceId: "test-panel", input: {} });
    assert.equal((await fetch(`${opened.url}api/request_reviews`, { method: "POST", body: "{}" })).status, 403);
    const html = await (await fetch(opened.url)).text();
    const token = html.match(/name="board-token" content="([^"]+)"/)[1];
    const response = await fetch(`${opened.url}api/request_reviews`, {
        method: "POST", headers: { "X-Board-Token": token, "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
    });
    assert.equal(response.status, 200);
    assert.equal(prompts.length, 1, "one coordinator dispatch for the batch");
    assert.match(prompts[0], /Reuse child session "child-0"/);
    assert.match(prompts[0], /Reuse child session "child-1"/);
    const requests = (await response.json()).requests;
    await action("record_result", { ...requests[0], review });
    await action("record_result", { ...requests[1], error: "Child busy with unrelated work." });
    assert.equal((await action("get_board")).items.filter((item) => item.pending).length, 0);
    assert.equal((await action("get_board")).items.find((item) => item.id === second).error,
        "Error recorded; inspect the HTTP dashboard for details.");

    await f.write(second, "Changed after scanning.\n");
    await assert.rejects(action("request_reviews", { ids }), /resource changed/);
    assert.equal((await action("get_board")).items.filter((item) => item.pending).length, 0);
    assert.equal(prompts.length, 1);
});

test("batch review limit is enforced by canvas schema and HTTP before queueing", async (t) => {
    const f = await fixture(t);
    const ids = Array.from({ length: MAX_REVIEW_BATCH_SIZE + 1 }, (_, index) => `agents/resource-${index}.agent.md`);
    for (const id of ids) await f.write(id, `Resource ${id}.\n`);
    await f.commit("2025-01-01T00:00:00Z", "Add batch resources");
    const { canvas, action, prompts } = await loadCanvas(t, f);
    await action("scan");
    const schema = canvas.actions.find((entry) => entry.name === "request_reviews").inputSchema;
    assert.equal(schema.properties.ids.maxItems, MAX_REVIEW_BATCH_SIZE);
    await assert.rejects(action("request_reviews", { ids }), /at most 10 resources per batch/i);
    const opened = await canvas.open({ instanceId: "test-panel", input: {} });
    const token = (await (await fetch(opened.url)).text()).match(/name="board-token" content="([^"]+)"/)[1];
    const response = await fetch(`${opened.url}api/request_reviews`, {
        method: "POST", headers: { "X-Board-Token": token, "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
    });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /at most 10 resources per batch/i);
    assert.equal((await action("get_board")).items.filter((item) => item.pending).length, 0);
    assert.equal(prompts.length, 0);
});

test("failed batch dispatch releases every current token without automatic retry", async (t) => {
    const f = await fixture(t);
    const second = "agents/second.agent.md";
    await f.write(resource.id, "First.\n");
    await f.write(second, "Second.\n");
    await f.commit("2025-01-01T00:00:00Z", "Add resources");
    const { canvas, action, prompts } = await loadCanvas(t, f, {
        send: async () => { throw new Error("Connection lost"); },
    });
    await action("scan");
    const opened = await canvas.open({ instanceId: "test-panel", input: {} });
    const token = (await (await fetch(opened.url)).text()).match(/name="board-token" content="([^"]+)"/)[1];
    const response = await fetch(`${opened.url}api/request_reviews`, {
        method: "POST", headers: { "X-Board-Token": token, "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [resource.id, second] }),
    });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /Connection lost/);
    for (const item of (await action("get_board")).items) {
        assert.equal(item.pending, null);
        assert.equal(item.error, "Error recorded; inspect the HTTP dashboard for details.");
    }
    assert.equal(prompts.length, 1);
});

async function rendererFixture(items = [{
    ...resource, review: { ...review, improvements: "<img src=x onerror=alert(1)>" },
    childSessionId: "child-1", prepared: { summary: "Focused change", diffHash, baseSha },
}], { holdBoardResponses = false, holdPreviewResponses = false } = {}) {
    let currentPreview = { id: resource.id, file: resource.id, size: 9, binary: false, truncated: false, content: "<script>" };
    let actionError = null;
    let document;
    class Node {
        constructor(tag = "div") {
            this.tag = tag; this.children = []; this.handlers = {}; this.value = ""; this.hidden = false;
            this.content = "token"; this.textContent = ""; this.disabled = false;
        }
        append(...nodes) {
            for (const child of nodes) {
                child.parent = this;
                this.children.push(child);
            }
        }
        replaceChildren(...nodes) {
            if (this.contains(document?.activeElement)) document.activeElement = document.body;
            for (const child of this.children) child.parent = null;
            this.children = [];
            this.append(...nodes);
        }
        setAttribute(name, value) { this[name] = value; }
        getAttribute(name) { return this[name]; }
        querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
        querySelectorAll(selector) {
            const [, attribute, value] = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/) ?? [];
            if (!attribute) return [];
            const matches = [];
            const visit = (parent) => {
                for (const child of parent.children) {
                    if (child.getAttribute(attribute) !== undefined &&
                        (value === undefined || child.getAttribute(attribute) === value)) matches.push(child);
                    visit(child);
                }
            };
            visit(this);
            return matches;
        }
        contains(target) {
            if (this === target) return true;
            return this.children.some((child) => child.contains(target));
        }
        addEventListener(name, handler) { this.handlers[name] = handler; }
        showModal() { this.open = true; }
        close() { this.open = false; }
        focus() { if (!this.disabled) document.activeElement = this; }
        click() { if (!this.disabled) return this.handlers.click?.(); }
    }
    const nodes = new Map();
    const body = new Node("body");
    document = {
        body,
        activeElement: body,
        querySelector: (selector) => selector === 'meta[name="board-token"]'
            ? Object.assign(new Node("meta"), { content: "token" })
            : body.querySelector(selector),
        getElementById: (id) => node(id),
        createElement: (tag) => new Node(tag),
    };
    const node = (id) => {
        if (!nodes.has(id)) {
            nodes.set(id, new Node());
            body.append(nodes.get(id));
        }
        return nodes.get(id);
    };
    node("age").value = "all";
    node("type").value = "all";
    node("recommendation").value = "all";
    node("oldest-count").value = "10";
    for (const id of ["scan", "select-matching", "clear-selection", "review-selected", "oldest-count", "review-oldest"]) {
        node(id).setAttribute("data-focus-key", id);
    }
    const state = {
        items,
        counts: { stale: 1 }, updatedAt: "2026-10-22T00:00:00Z", scanGeneration: 1,
    };
    const requests = [];
    const events = {};
    const pendingBoardResponses = [];
    const pendingPreviewResponses = [];
    const context = vm.createContext({
        URL,
        document,
        EventSource: class {
            addEventListener(name, handler) { events[name] = handler; }
            set onerror(handler) { events.error = handler; }
        },
        fetch: async (url, options) => {
            requests.push({ url, options });
            if (actionError && !url.endsWith("get_board") && !url.endsWith("read_file")) {
                return { ok: false, json: async () => ({ error: actionError }) };
            }
            if (url.endsWith("request_work")) {
                const input = JSON.parse(options.body);
                state.items.find((item) => item.id === input.id).pending = { kind: input.kind, at: "now", token: "work-token" };
            }
            if (url.endsWith("cancel_work")) {
                state.items.find((item) => item.id === JSON.parse(options.body).id).pending = null;
            }
            if (url.endsWith("request_reviews")) {
                for (const id of JSON.parse(options.body).ids) {
                    state.items.find((item) => item.id === id).pending = { kind: "review", at: "now" };
                }
            }
            if (url.endsWith("get_board")) {
                const snapshot = JSON.parse(JSON.stringify(state));
                const response = { ok: true, json: async () => snapshot };
                if (holdBoardResponses) return new Promise((resolve) => pendingBoardResponses.push(() => resolve(response)));
                return response;
            }
            if (url.endsWith("read_file")) {
                const preview = currentPreview;
                const response = { ok: true, json: async () => preview };
                if (holdPreviewResponses) {
                    return new Promise((resolve) => pendingPreviewResponses.push(() => resolve(response)));
                }
                if (preview instanceof Error) throw preview;
                return response;
            }
            return { ok: true, json: async () => state };
        },
    });
    vm.runInContext(await readFile(path.join(extensionDir, "public", "app.js"), "utf8"), context);
    await new Promise((resolve) => setImmediate(resolve));
    return {
        node, requests, state, document, emit: () => events.board({ data: JSON.stringify(state) }),
        disconnect: () => events.error(),
        previewKeys: () => [...vm.runInContext("previews.keys()", context)],
        releaseBoardResponse: () => {
            const release = pendingBoardResponses.shift();
            if (!release) return false;
            release();
            return true;
        },
        releasePreviewResponse: (index = 0) => {
            const release = pendingPreviewResponses.splice(index, 1)[0];
            if (!release) return false;
            release();
            return true;
        },
        setPreview: (value) => { currentPreview = value; },
        setActionError: (value) => { actionError = value; },
        setHoldBoardResponses: (value) => { holdBoardResponses = value; },
    };
}

test("initial renderer snapshot cannot replace a newer SSE board", async () => {
    const item = { ...resource, review: null };
    const { node, state, emit, releaseBoardResponse } = await rendererFixture([item], { holdBoardResponses: true });
    state.items[0].review = review;
    emit();
    assert.equal(releaseBoardResponse(), true);
    await new Promise((resolve) => setImmediate(resolve));
    assert.match(node("review-progress").textContent, /^1 with saved reviews/);
});

test("post-mutation renderer snapshot cannot replace a newer SSE board", async () => {
    const item = { ...resource, review: null };
    const { node, state, emit, setHoldBoardResponses, releaseBoardResponse } = await rendererFixture([item]);
    setHoldBoardResponses(true);
    const scan = node("scan").click();
    await new Promise((resolve) => setImmediate(resolve));
    state.items[0].review = review;
    emit();
    assert.equal(releaseBoardResponse(), true);
    await scan;
    assert.match(node("review-progress").textContent, /^1 with saved reviews/);
});

test("preview cache refreshes on completed scans without refetching progress snapshots", async () => {
    const { node, state, emit, requests, setPreview } = await rendererFixture();
    node("resources").children[0].children[1].click();
    await new Promise((resolve) => setImmediate(resolve));
    const contents = () => node("detail").children.find((entry) => entry.className === "file-contents")?.textContent;
    assert.equal(contents(), "<script>");
    assert.equal(requests.filter((entry) => entry.url.endsWith("read_file")).length, 1);

    setPreview({ id: resource.id, file: resource.id, size: 10, binary: false, truncated: false, content: "Restored source" });
    state.progress = { completed: 1, total: 2 };
    emit();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(requests.filter((entry) => entry.url.endsWith("read_file")).length, 1);

    state.progress = null;
    state.scanGeneration++;
    emit();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(contents(), "Restored source");
    assert.equal(requests.filter((entry) => entry.url.endsWith("read_file")).length, 2);
});

test("preview errors are retried after a completed scan", async () => {
    const { node, state, emit, requests, setPreview } = await rendererFixture(undefined, {
        holdPreviewResponses: false,
    });
    setPreview(new Error("Preview unavailable"));
    node("resources").children[0].children[1].click();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(node("detail").children.some((entry) => entry.textContent === "Preview unavailable"), true);
    assert.equal(requests.filter((entry) => entry.url.endsWith("read_file")).length, 1);

    setPreview({ id: resource.id, file: resource.id, size: 8, binary: false, truncated: false, content: "Available again" });
    state.scanGeneration++;
    emit();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(node("detail").children.find((entry) => entry.className === "file-contents")?.textContent, "Available again");
    assert.equal(requests.filter((entry) => entry.url.endsWith("read_file")).length, 2);
});

test("stale in-flight preview responses cannot replace a newer scan preview", async () => {
    const { node, state, emit, requests, releasePreviewResponse, setPreview, previewKeys } = await rendererFixture(undefined, {
        holdPreviewResponses: true,
    });
    node("resources").children[0].children[1].click();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(requests.filter((entry) => entry.url.endsWith("read_file")).length, 1);

    setPreview({ id: resource.id, file: resource.id, size: 12, binary: false, truncated: false, content: "New scan content" });
    state.scanGeneration++;
    emit();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(requests.filter((entry) => entry.url.endsWith("read_file")).length, 2);
    assert.equal(releasePreviewResponse(1), true);
    await new Promise((resolve) => setImmediate(resolve));
    const contents = () => node("detail").children.find((entry) => entry.className === "file-contents")?.textContent;
    assert.equal(contents(), "New scan content");

    assert.equal(releasePreviewResponse(), true);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(contents(), "New scan content");
    assert.equal(previewKeys().length, 1);
    assert.ok(previewKeys()[0].endsWith(`\0${state.scanGeneration}`));
});

test("preview cache retains only the current generation across repeated scans", async () => {
    const { node, state, emit, previewKeys } = await rendererFixture();
    node("resources").children[0].children[1].click();
    await new Promise((resolve) => setImmediate(resolve));
    for (let generation = 2; generation <= 30; generation++) {
        state.scanGeneration = generation;
        emit();
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(previewKeys().length, 1);
        assert.ok(previewKeys()[0].endsWith(`\0${generation}`));
    }
});

test("fresh SSE boards clear connection warnings but preserve action and sync errors", async () => {
    const { node, state, emit, disconnect, setActionError } = await rendererFixture();
    disconnect();
    assert.match(node("error").textContent, /Live updates disconnected/);
    assert.equal(node("error").hidden, false);
    emit();
    assert.equal(node("error").hidden, true);

    setActionError("Review could not start.");
    await node("scan").click();
    disconnect();
    emit();
    assert.equal(node("error").hidden, false);
    assert.equal(node("error").textContent, "Review could not start.");

    state.syncError = "Unable to reload shared board state.";
    emit();
    disconnect();
    emit();
    assert.equal(node("error").hidden, false);
    assert.equal(node("error").textContent, state.syncError);
});

test("keyboard actions restore an enabled control after failed work", async () => {
    const { node, document, setActionError } = await rendererFixture();
    node("resources").children[0].children[1].click();
    await new Promise((resolve) => setImmediate(resolve));
    const key = "action-Prepare%20refresh%20locally";
    const action = () => node("detail").querySelector(`[data-focus-key="${key}"]`);
    action().focus();
    setActionError("Preparation failed.");
    await action().click();
    assert.equal(document.activeElement, action());
    assert.equal(document.activeElement.disabled, false);
});

test("keyboard review, preparation, and cancellation fall back to the selected resource", async () => {
    for (const [label, item] of [
        ["Review in child", { ...resource, review: null }],
        ["Prepare refresh locally", { ...resource, review: { ...review } }],
        ["Prepare removal locally", { ...resource, review: { ...review } }],
        ["Cancel local wait", { ...resource, review: { ...review }, pending: { kind: "review", token: "work-token", at: "now" } }],
    ]) {
        const { node, document } = await rendererFixture([item]);
        node("resources").children[0].children[1].click();
        await new Promise((resolve) => setImmediate(resolve));
        const action = node("detail").querySelector(`[data-focus-key="action-${encodeURIComponent(label)}"]`);
        assert.ok(action);
        action.focus();
        await action.click();
        const selectedButton = node("resources").children[0].children[1];
        assert.equal(document.activeElement, selectedButton, label);
        assert.equal(document.activeElement.disabled, false);
    }
});

test("keyboard batch review falls back when the submitted selection is cleared", async () => {
    const { node, document } = await rendererFixture([{ ...resource, review: null }]);
    node("resources").children[0].children[1].click();
    node("select-matching").click();
    node("review-selected").focus();
    await node("review-selected").click();
    assert.equal(document.activeElement, node("resources").children[0].children[1]);
    assert.equal(node("review-selected").disabled, true);
});

test("scan progress is busy during updates and clears when the final status is announced", async () => {
    const { node, state, emit } = await rendererFixture();
    const html = await readFile(path.join(extensionDir, "public", "index.html"), "utf8");
    assert.match(html, /id="notice" role="status" aria-live="polite" aria-busy="false"/);

    state.progress = { completed: 1, total: 3 };
    emit();
    assert.equal(node("notice").getAttribute("aria-busy"), "true");
    assert.match(node("notice").textContent, /1\/3 resources/);

    state.progress = null;
    emit();
    assert.equal(node("notice").getAttribute("aria-busy"), "false");
    assert.match(node("notice").textContent, /Last scan/);
});

test("publication confirmation dialog labels its heading", async () => {
    const html = await readFile(path.join(extensionDir, "public", "index.html"), "utf8");
    const dialog = html.match(/<dialog id="confirm"([^>]*)>([\s\S]*?)<\/dialog>/);
    const heading = dialog?.[2].match(/<h2 id="([^"]+)">/);
    assert.ok(dialog);
    assert.equal(dialog[1].match(/aria-labelledby="([^"]+)"/)?.[1], heading?.[1]);
});

test("renderer confirmation sends the exact prepared hash and renders untrusted evidence as text", async () => {
    const { node, requests } = await rendererFixture();
    node("resources").children[0].children[1].click();
    const evidence = node("detail").children.find((entry) => entry.textContent.includes("<img"));
    assert.equal(evidence.tag, "p");
    assert.equal(evidence.children.length, 0);
    await new Promise((resolve) => setImmediate(resolve));
    const read = requests.find((entry) => entry.url.endsWith("read_file"));
    assert.deepEqual(JSON.parse(read.options.body), { id: resource.id, file: resource.id });
    const contents = node("detail").children.find((entry) => entry.className === "file-contents");
    assert.equal(contents.tag, "pre");
    assert.equal(contents.textContent, "<script>");
    const actions = node("detail").children.find((entry) => entry.className === "actions");
    actions.children.find((entry) => entry.textContent === "Publish PR...").click();
    assert.equal(node("confirm").open, true);
    assert.equal(requests.filter((entry) => entry.url.endsWith("request_work")).length, 0);
    node("publish-confirm").click();
    await new Promise((resolve) => setImmediate(resolve));
    const publication = requests.find((entry) => entry.url.endsWith("request_work"));
    assert.deepEqual(JSON.parse(publication.options.body), {
        id: resource.id, kind: "publish", confirmed: true, diffHash,
    });
    assert.equal(node("confirm").open, false);
});

test("detail rebuild restores focus and preview scroll for file contents and published PR links", async () => {
    const item = {
        ...resource, review: { ...review }, childSessionId: "child-1",
        prepared: { summary: "Focused change", diffHash, baseSha },
        publication: { url: "https://github.com/github/awesome-copilot/pull/1" },
    };
    const { node, document, state, emit } = await rendererFixture([item]);
    assert.equal(node("resources").children[0].children[0].disabled, true);
    assert.equal(node("select-matching").disabled, true);
    assert.equal(node("review-oldest").disabled, true);
    node("resources").children[0].children[1].click();
    await new Promise((resolve) => setImmediate(resolve));
    let preview = node("detail").querySelector('[data-focus-key="file-preview-agents%2Fexample.agent.md"]');
    assert.ok(preview);
    preview.scrollTop = 47;
    preview.focus();
    emit();
    preview = node("detail").querySelector('[data-focus-key="file-preview-agents%2Fexample.agent.md"]');
    assert.equal(document.activeElement, preview);
    assert.equal(preview.scrollTop, 47);
    let link = node("detail").querySelector('[data-focus-key="published-pr-link"]');
    assert.ok(link);
    link.focus();
    emit();
    link = node("detail").querySelector('[data-focus-key="published-pr-link"]');
    assert.equal(document.activeElement, link);
    const actions = node("detail").children.find((entry) => entry.className === "actions");
    assert.ok(actions.children.every((entry) => entry.disabled), "published work cannot be reviewed, prepared, or republished");
    state.syncError = "Unable to reload shared board state: invalid JSON.";
    emit();
    assert.equal(node("error").hidden, false);
    assert.equal(node("error").textContent, state.syncError);
    delete state.syncError;
    emit();
    assert.equal(node("error").hidden, true);
});

test("renderer sends only the next bounded batch and retains remaining selection", async () => {
    const items = Array.from({ length: MAX_REVIEW_BATCH_SIZE + 2 }, (_, index) => ({
        ...resource, id: `agents/resource-${index}.agent.md`,
    }));
    const { node, requests } = await rendererFixture(items);
    node("select-matching").click();
    assert.match(node("batch-selection").textContent, /at most 10.*remaining selection waits/i);
    await node("review-selected").click();
    const batch = requests.find((request) => request.url.endsWith("request_reviews"));
    assert.deepEqual(JSON.parse(batch.options.body).ids, items.slice(0, MAX_REVIEW_BATCH_SIZE).map((item) => item.id));
    assert.match(node("batch-selection").textContent, /^2 selected/);
});

test("oldest batch uses matching unreviewed known ages, skips pending work, and reports live progress", async () => {
    const items = [
        { ...resource, id: "agents/younger.agent.md", age: 20 },
        { ...resource, id: "agents/oldest.agent.md", age: 80 },
        { ...resource, id: "agents/next.agent.md", age: 60 },
        { ...resource, id: "agents/unknown.agent.md", age: null, ageBand: "unknown" },
        { ...resource, id: "agents/reviewed.agent.md", age: 90, review },
        { ...resource, id: "agents/pending.agent.md", age: 100, pending: { kind: "review", at: "now" } },
        { ...resource, id: "skills/filtered", type: "skills", age: 200 },
    ];
    const { node, requests, state, emit } = await rendererFixture(items);
    node("type").value = "agents";
    node("type").handlers.input();
    for (const invalid of ["0", "-1", "1.5", ""]) {
        node("oldest-count").value = invalid;
        node("oldest-count").handlers.input();
        assert.equal(node("review-oldest").disabled, true);
    }
    node("oldest-count").value = "2";
    node("oldest-count").handlers.input();
    assert.equal(node("review-oldest").textContent, "Review 2 oldest");
    await node("review-oldest").click();
    const batch = requests.filter((request) => request.url.endsWith("request_reviews"));
    assert.equal(batch.length, 1);
    assert.deepEqual(JSON.parse(batch[0].options.body).ids, [items[1].id, items[2].id]);
    assert.match(node("review-progress").textContent, /3 background reviews queued or running/);
    state.items[1].pending = null;
    state.items[1].review = review;
    state.items[2].pending = null;
    state.items[2].error = "Child unavailable";
    emit();
    assert.match(node("review-progress").textContent, /2 with saved reviews \| 1 background reviews queued or running \| 1 items needing attention/);
    assert.equal(requests.filter((request) => request.url.endsWith("request_reviews")).length, 1, "SSE updates do not retry work");
    node("oldest-count").value = "10";
    node("oldest-count").handlers.input();
    assert.equal(node("review-oldest").textContent, "Review 2 oldest", "cap to available candidates, excluding unknown ages");
});

test("checkbox batch selection survives filters, includes unknown history, and never selects pending work", async () => {
    const items = [
        { ...resource, age: null, ageBand: "unknown" },
        { ...resource, id: "skills/example", type: "skills" },
        { ...resource, id: "agents/pending.agent.md", pending: { kind: "review", at: "now" } },
    ];
    const { node, requests, state, emit } = await rendererFixture(items);
    node("select-matching").click();
    assert.equal(node("review-selected").textContent, "Review selected (2)");
    assert.equal(node("resources").children[2].children[0].disabled, true);
    node("clear-selection").click();
    assert.equal(node("review-selected").disabled, true);
    for (const row of node("resources").children.slice(0, 2)) {
        row.children[0].checked = true;
        row.children[0].handlers.change();
    }
    node("type").value = "agents";
    node("type").handlers.input();
    assert.match(node("batch-selection").textContent, /2 selected \(1 hidden by filters\)/);
    await node("review-selected").click();
    const batch = requests.find((request) => request.url.endsWith("request_reviews"));
    assert.deepEqual(JSON.parse(batch.options.body).ids, [items[0].id, items[1].id]);
    assert.equal(node("review-selected").disabled, true);
    state.items[0].pending = null;
    state.items[0].review = review;
    emit();
    node("resources").children[0].children[1].click();
    assert.ok(node("detail").children.some((entry) => entry.textContent === "Staleness assessment"));
    assert.ok(node("detail").children.some((entry) => entry.textContent === review.stalenessAssessment));
});

test("file preview reads only listed working-tree files, caps size, and flags binaries", async (t) => {
    const root = await directory(t);
    await mkdir(path.join(root, "skills", "demo"), { recursive: true });
    await writeFile(path.join(root, "skills", "demo", "SKILL.md"), "# Demo\n");
    await writeFile(path.join(root, "skills", "demo", "logo.png"), Buffer.from([137, 80, 0, 1]));
    await writeFile(path.join(root, "skills", "demo", "big.txt"), "x".repeat(MAX_PREVIEW_BYTES + 10));
    await writeFile(path.join(root, "secret.txt"), "nope");
    const item = { id: "skills/demo", files: ["skills/demo/SKILL.md", "skills/demo/logo.png", "skills/demo/big.txt", "../secret.txt"] };
    const text = await readResourceFile(root, item, "skills/demo/SKILL.md");
    assert.deepEqual([text.content, text.binary, text.truncated], ["# Demo\n", false, false]);
    assert.equal((await readResourceFile(root, item, "skills/demo/logo.png")).binary, true);
    const big = await readResourceFile(root, item, "skills/demo/big.txt");
    assert.equal(big.truncated, true);
    assert.equal(big.content.length, MAX_PREVIEW_BYTES);
    await assert.rejects(readResourceFile(root, item, "secret.txt"), /not part of this resource/);
    await assert.rejects(readResourceFile(root, item, "../secret.txt"), /outside the checkout/);
});