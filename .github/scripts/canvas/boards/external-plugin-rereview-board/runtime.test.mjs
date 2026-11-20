import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";

const directory = fileURLToPath(new URL("../../../../extensions/external-plugin-rereview-board/", import.meta.url));
const fakeIssue = { number: 12, title: "Queue", body: "Snapshot", html_url: "https://github.com/github/awesome-copilot/issues/12", state: "open" };
const fakeRow = {
    id: 8, name: "example", repo: "owner/example", version: "2.0.0", closedDate: "2026-05-19", days: 0,
    url: "https://github.com/github/awesome-copilot/issues/8",
    evidence: {
        hash: "evidence", reasons: [], plugin: { name: "example" }, comments: [],
        issue: { body: "Submission", title: "Example", closedAt: "2026-05-19T00:00:00Z", labels: [] },
    },
};
async function load(t, failure = false) {
    const root = await mkdtemp(path.resolve(".rereview-runtime-test-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    let canvas;
    const starts = [];
    const posts = [];
    const github = {
        load: async () => ({ issue: structuredClone(fakeIssue), items: [structuredClone(fakeRow)] }),
        preflight: async () => ({ issue: structuredClone(fakeIssue), evidence: structuredClone(fakeRow.evidence) }),
        maintainer: async () => "maintainer",
        post: async (id, body) => {
            const result = { body, html_url: `https://github.com/github/awesome-copilot/issues/${id}#issuecomment-99`, user: { login: "maintainer" } };
            posts.push(result);
            return result;
        },
    };
    const sdk = {
        createCanvas: (definition) => definition,
        CanvasError: class extends Error {
            constructor(code, message) { super(message); this.code = code; }
        },
        joinSession: async (options) => {
            [canvas] = options.canvases;
            return {
                workspacePath: root, log() {},
                send: () => { throw new Error("Foreground reviews are forbidden"); },
                rpc: { tasks: { startAgent: async (request) => {
                    if (failure) throw new Error("Dispatch unavailable");
                    starts.push(request);
                    return { agentId: "native-worker" };
                } } },
            };
        },
    };
    const context = vm.createContext();
    const filename = path.join(directory, "extension.mjs");
    const module = new vm.SourceTextModule(await readFile(filename, "utf8"), {
        context, initializeImportMeta(meta) { meta.url = pathToFileURL(filename).href; },
    });
    await module.link(async (specifier) => {
        const exports = specifier === "@github/copilot-sdk/extension" ? sdk :
            specifier === "./lib/github.mjs" ? { createGitHub: () => github } :
                await import(specifier.startsWith(".") ? pathToFileURL(path.resolve(directory, specifier)).href : specifier);
        return new vm.SyntheticModule(Object.keys(exports), function () {
            for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
        }, { context });
    });
    await module.evaluate();
    const act = (name, input = {}) => {
        const action = canvas.actions.find((action) => action.name === name);
        assert.ok(action, name);
        return action.handler({ input, instanceId: "test-panel" });
    };
    t.after(() => canvas.onClose({ instanceId: "test-panel" }));
    await act("import_report", { number: 12 });
    const panel = await canvas.open({ instanceId: "test-panel" });
    const html = await (await fetch(panel.url)).text();
    const token = /name="board-token" content="([^"]+)"/.exec(html)[1];
    async function ui(name, body) {
        const response = await fetch(new URL(`api/${name}`, panel.url), {
            method: body === undefined ? "GET" : "POST",
            headers: { "content-type": "application/json", "x-board-token": token },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        return { status: response.status, value: await response.json() };
    }
    return { canvas, act, starts, posts, ui, panel, html };
}

test("runtime serves authenticated UI and only exposes read/import/background actions to agents", async (t) => {
    const { canvas, ui, act, posts, panel, html } = await load(t);
    for (const forbidden of ["publish", "preview", "update", "move_item", "cancel", "reconcile", "followup"]) {
        assert.ok(!canvas.actions.some((action) => action.name === forbidden));
    }
    assert.ok(html.includes('id="confirmation"'));
    assert.ok(path.isAbsolute(canvas.icon));
    assert.equal((await readFile(canvas.icon)).subarray(1, 4).toString(), "PNG", "the createCanvas icon must resolve to a PNG file");
    const denied = await fetch(new URL("api/board", panel.url));
    assert.equal(denied.status, 403);
    const item = (await ui("board")).value.items[0];
    const result = await ui("update", {
        number: 12, id: 8, expectedRevision: item.revision, column: "remove", note: "PRIVATE-NOTE", reason: "PUBLIC-DRAFT",
    });
    assert.equal(result.status, 200);
    assert.equal((await act("get_board")).items[0].note, undefined);
    assert.equal((await act("get_board")).items[0].reason, undefined);
    assert.equal((await ui("board")).value.items[0].note, "PRIVATE-NOTE");
    assert.equal(posts.length, 0);
    const preview = await ui("preview", { number: 12, id: 8 });
    assert.match(preview.value.body, /^\/re-review-remove\n\nPUBLIC-DRAFT/);
    assert.equal(posts.length, 0);
    const published = await ui("publish", { token: preview.value.token });
    assert.equal(published.status, 200);
    assert.equal(posts.length, 1);
    assert.equal(posts[0].html_url, "https://github.com/github/awesome-copilot/issues/8#issuecomment-99");
    assert.ok(!posts[0].body.includes("PRIVATE-NOTE"));
});

test("background worker is dispatched natively and records only matching queue results without changing decisions", async (t) => {
    const { act, starts, ui } = await load(t);
    const queued = await act("start_review", { number: 12, id: 8, guidance: "Compatibility" });
    assert.equal(starts.length, 1);
    assert.equal(queued.agentId, "native-worker");
    assert.equal(starts[0].agentType, "general-purpose");
    await assert.rejects(act("record_review", {
        number: 12, id: 8, queueId: "wrong", recommendation: "keep", rationale: "Stale result",
    }), /Stale/);
    assert.equal((await act("get_board")).items[0].queueId, queued.queueId, "a mistyped token must leave the assignment available for correction");
    await act("record_review", {
        number: 12, id: 8, queueId: queued.queueId, recommendation: "keep", rationale: "Pinned README provides evidence.",
    });
    const item = (await act("get_board")).items[0];
    assert.equal(item.review.recommendation, "keep");
    assert.equal(item.column, "unreviewed");
    assert.equal(item.reviewError, null);
    const retry = await act("start_review", { number: 12, id: 8 });
    assert.equal((await ui("cancel", { number: 12, id: 8 })).status, 200);
    await assert.rejects(act("fail_review", { number: 12, id: 8, queueId: retry.queueId, error: "Late failure" }), /Stale/);
});

test("failed background dispatch clears its queue and records an explicit error", async (t) => {
    const { act } = await load(t, true);
    await assert.rejects(act("start_review", { number: 12, id: 8 }), /Dispatch unavailable/);
    const item = (await act("get_board")).items[0];
    assert.equal(item.queueId, null);
    assert.match(item.reviewError, /Could not dispatch review/);
});
