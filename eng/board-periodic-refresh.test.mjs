import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setImmediate } from "node:timers/promises";
import vm from "node:vm";
import { test } from "node:test";
import { startBoardServer } from "../.github/extensions/open-pr-board/lib/server.mjs";

const INTERVAL = 15 * 60 * 1000;
const repo = "github/awesome-copilot";

test("shared server consumers without a refresh route never poll or report refresh errors", async (t) => {
    t.mock.timers.enable({ apis: ["setInterval"] });
    const errors = [];
    let unsubscribed = false;
    const server = await startBoardServer({
        api: {
            snapshot: () => ({}), routes: {},
            subscribe: () => () => { unsubscribed = true; },
            logger: { error: (...args) => errors.push(args) },
        },
    });
    t.after(() => server.close());
    t.mock.timers.tick(INTERVAL * 3);
    await setImmediate();
    assert.deepEqual(errors, []);
    assert.equal(unsubscribed, false);
});

function item(number) {
    return {
        number, title: `Example ${number}`, author: "contributor",
        url: `https://github.com/${repo}/issues/${number}`,
        labels: ["external-plugin", "ready-for-review"],
        headRefOid: "first", updatedAt: "2026-10-01T00:00:00Z",
    };
}

async function loadBoard(t, id, { getIssueDetail, getPullRequestDetail, approveWorkflowRun } = {}) {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "board-polling-"));
    t.after(() => rm(workspacePath, { recursive: true, force: true }));
    const isPR = id === "open-pr-board";
    const column = isPR ? "needs-insight" : "needs-review";
    const review = { recommendation: isPR ? "approve" : "accept", rationale: "Ready." };
    const items = {
        1: { ...item(1), review, reviewStatus: "reviewed" },
        2: { ...item(2), manualColumn: column },
        3: { ...item(3), reviewStatus: "queued", queueId: "current-token", rereviewGuidance: "Check docs" },
        4: { ...item(4), decision: { kind: isPR ? "close" : "reject", status: "confirmed" } },
    };
    const stateFile = path.join(workspacePath, "extensions", id, "state",
        isPR ? "github__awesome-copilot.json" : "board.json");
    const initial = {
        repo, items, updatedAt: "2026-10-01", lastRefreshedAt: "2026-10-01",
        history: [{ number: 4, comment: "Previous action" }],
    };
    await mkdir(path.dirname(stateFile), { recursive: true });
    await writeFile(stateFile, JSON.stringify(initial));

    let canvas;
    let calls = 0;
    let sends = 0;
    let fetchItems = async () => [1, 2, 3, 4, 5].map(item);
    const logs = [];
    const context = vm.createContext({ setTimeout });
    const sdk = {
        createCanvas: (definition) => definition,
        joinSession: async ({ canvases }) => {
            [canvas] = canvases;
            return { workspacePath, log: (message) => logs.push(message), send: () => { sends++; } };
        },
        CanvasError: class CanvasError extends Error {
            constructor(code, message) { super(message); this.code = code; }
        },
    };
    const url = new URL(`../.github/extensions/${id}/extension.mjs`, import.meta.url);
    const module = new vm.SourceTextModule(await readFile(url, "utf8"), {
        context, initializeImportMeta: (meta) => { meta.url = url.href; },
    });
    await module.link(async (specifier) => {
        let exports;
        if (specifier === "@github/copilot-sdk/extension") exports = sdk;
        else if (specifier === "./lib/github.mjs") {
            const list = () => { calls++; return fetchItems(); };
            // Any unexpected GitHub operation (especially a write) fails the test.
            exports = { listOpenPullRequests: list, listBoardIssues: list };
            if (getIssueDetail) exports.getIssueDetail = getIssueDetail;
            if (getPullRequestDetail) exports.getPullRequestDetail = getPullRequestDetail;
        } else if (specifier === "./lib/decisions.mjs" && approveWorkflowRun) {
            const decisions = await import(new URL(specifier, url).href);
            exports = {
                ...decisions,
                approveWorkflowOnGitHub: (args) => decisions.approveWorkflowOnGitHub({
                    ...args, github: { approveWorkflowRun },
                }),
            };
        } else {
            exports = await import(specifier.startsWith(".") ? new URL(specifier, url).href : specifier);
        }
        return new vm.SyntheticModule(Object.keys(exports), function () {
            for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
        }, { context });
    });
    await module.evaluate();
    const ctx = { instanceId: "polling-board", input: {} };
    t.after(() => canvas.onClose(ctx));
    const action = (name, input = {}) => canvas.actions.find((entry) => entry.name === name)
        .handler({ ...ctx, input });
    return {
        action, open: () => canvas.open(ctx), close: () => canvas.onClose(ctx),
        calls: () => calls, sends: () => sends, logs, initial, stateFile,
        setFetch: (fn) => { fetchItems = fn; },
    };
}

test("PR workflow approval route refreshes published state and does not record a PR review approval", async (t) => {
    let writes = 0;
    const workflow = { id: 10, attempt: 1, headRefOid: "first", name: "CI" };
    const board = await loadBoard(t, "open-pr-board", {
        approveWorkflowRun: async (...args) => {
            assert.deepEqual(args, [repo, 1, { runId: 10, attempt: 1, headRefOid: "first" }]);
            writes++;
            return { status: "workflow-execution-approved" };
        },
    });
    board.setFetch(async () => [{ ...item(1), workflowApprovals: writes ? [] : [workflow] }]);
    await board.action("refresh");
    const { url } = await board.open();
    const html = await (await fetch(url)).text();
    const token = html.match(/name="board-token" content="([^"]+)"/)[1];
    const request = (confirmed) => fetch(new URL("/api/workflow-approval", url), {
        method: "POST", headers: { "X-Board-Token": token, "Content-Type": "application/json" },
        body: JSON.stringify({ number: 1, runId: 10, attempt: 1, headRefOid: "first", confirmed }),
    });
    assert.equal((await request(false)).status, 400);
    assert.equal(writes, 0);
    const response = await request(true);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, "workflow-execution-approved");
    assert.equal(writes, 1);
    const current = await board.action("get_board");
    assert.equal(current.items[0].workflowApprovals.length, 0);
    assert.equal(current.items[0].decision, null);
    const state = JSON.parse(await readFile(board.stateFile, "utf8"));
    assert.equal(state.history[0].kind, "workflow-execution");
    assert.equal(state.items[1].review.recommendation, "approve");
});

async function readFrame(reader, eventName) {
    let text = "";
    while (!text.includes(`event: ${eventName}\n`)) {
        const { value, done } = await reader.read();
        assert.equal(done, false, `Expected ${eventName} event`);
        text += new TextDecoder().decode(value);
    }
    return text;
}

test("PR agent board summaries provide provenance for manual approval choices", async (t) => {
    const board = await loadBoard(t, "open-pr-board");
    const before = (await board.action("get_board")).items.find((entry) => entry.number === 2);
    assert.equal(before.headRefOid, "first");
    await board.action("move_item", { number: 2, column: "approve", headRefOid: before.headRefOid });
    const current = (await board.action("get_board")).items.find((entry) => entry.number === 2);
    assert.equal(current.approvalStale, false);
    board.setFetch(async () => [1, 2, 3, 4].map((number) => ({ ...item(number), headRefOid: "second" })));
    await board.action("refresh");
    const updated = (await board.action("get_board")).items.find((entry) => entry.number === 2);
    assert.equal(updated.headRefOid, "second");
    assert.equal(updated.approvalStale, true);
});

for (const id of ["open-pr-board", "external-plugin-review-board"]) {
test(`${id}: server cache cannot be repopulated by a detail request invalidated by refresh`, async (t) => {
    let finish;
    let calls = 0;
    const isPR = id === "open-pr-board";
    const board = await loadBoard(t, id, {
        [isPR ? "getPullRequestDetail" : "getIssueDetail"]: () => {
            calls++;
            if (calls === 1) return new Promise((resolve) => { finish = resolve; });
            return { bodyHtml: "new", comments: [] };
        },
    });
    const action = isPR ? "get_pr" : "get_issue";
    const field = isPR ? "pullRequest" : "issue";
    const old = board.action(action, { number: 1 });
    await board.action("refresh");
    const latest = await board.action(action, { number: 1 });
    assert.equal(latest[field].bodyHtml, "new");
    finish({ bodyHtml: "old", comments: [] });
    await old;
    const reopened = await board.action(action, { number: 1 });
    assert.equal(reopened[field].bodyHtml, "new");
    assert.equal(calls, 2, "Reopening an unselected issue fetches fresh details");
    await board.action(action, { number: 1 });
    assert.equal(calls, 2, "The fresh result remains cached");
});
}

for (const id of ["open-pr-board", "external-plugin-review-board"]) {
    test(`${id}: scheduled refresh preserves state, shares manual fetches, recovers, and stops on close`,
        { timeout: 15000 }, async (t) => {
            t.mock.timers.enable({ apis: ["setInterval"] });
            const board = await loadBoard(t, id);
            const opened = await board.open();
            await board.open(); // Focusing an existing canvas must not create another timer.
            const html = await (await fetch(opened.url)).text();
            const token = html.match(/<meta name="board-token" content="([^"]+)"/)[1];
            const controller = new AbortController();
            const events = await fetch(new URL(`events?token=${token}`, opened.url), { signal: controller.signal });
            const reader = events.body.getReader();
            t.after(() => controller.abort());
            await readFrame(reader, "board");

            t.mock.timers.tick(INTERVAL - 1);
            assert.equal(board.calls(), 0, "No fetch before fifteen minutes");
            t.mock.timers.tick(1);
            // Joining via the existing action waits for the scheduled fetch, not another fetch.
            await board.action("refresh");
            assert.equal(board.calls(), 1);
            const saved = JSON.parse(await readFile(board.stateFile, "utf8"));
            assert.ok(saved.items["5"], "New matching item is discovered");
            assert.deepEqual(saved.history, board.initial.history);
            for (const [number, before] of Object.entries(board.initial.items)) {
                for (const field of ["review", "reviewStatus", "queueId", "manualColumn", "decision", "rereviewGuidance"]) {
                    assert.deepEqual(saved.items[number][field], before[field], `${number}: ${field}`);
                }
            }
            assert.match(await readFrame(reader, "board"), /Example 5/);
            await setImmediate();

            let finish;
            board.setFetch(() => new Promise((resolve) => { finish = resolve; }));
            const manual = board.action("refresh");
            t.mock.timers.tick(INTERVAL);
            await setImmediate();
            t.mock.timers.tick(INTERVAL);
            assert.equal(board.calls(), 2, "Manual and scheduled refreshes share one fetch");
            await board.action("move_item", { number: 2, column: id === "open-pr-board" ? "close" : "probably-reject" });
            await board.action("record_review", { reviews: [{
                number: 3, queueId: "current-token",
                recommendation: id === "open-pr-board" ? "approve" : "accept",
                rationale: "Finished while fetching.",
            }] });
            finish([1, 2, 3, 4, 5, 6].map(item));
            await manual;
            await setImmediate();
            const after = JSON.parse(await readFile(board.stateFile, "utf8"));
            assert.ok(after.items["6"]);
            assert.equal(after.items["2"].manualColumn, id === "open-pr-board" ? "close" : "probably-reject",
                "A user action during the fetch is not overwritten");
            assert.equal(after.items["3"].review.rationale, "Finished while fetching.",
                "An in-flight review can finish during refresh without losing its result");
            assert.equal(after.items["3"].reviewStatus, "reviewed");

            board.setFetch(async () => { throw new Error("GitHub unavailable"); });
            t.mock.timers.tick(INTERVAL);
            assert.match(await readFrame(reader, "refresh-error"), /GitHub unavailable/);
            assert.deepEqual(JSON.parse(await readFile(board.stateFile, "utf8")), after,
                "A failed refresh leaves good data intact");
            assert.ok(board.logs.some((message) => message.includes("GitHub unavailable")));
            await setImmediate();

            board.setFetch(async () => [1, 2, 3, 4, 5, 6, 7].map(item));
            t.mock.timers.tick(INTERVAL);
            await board.action("refresh");
            assert.ok(JSON.parse(await readFile(board.stateFile, "utf8")).items["7"]);
            assert.equal(board.calls(), 4, "Polling continues after an error");
            assert.equal(board.sends(), 0, "Polling never starts AI reviews");

            controller.abort();
            await board.close();
            t.mock.timers.tick(INTERVAL * 2);
            assert.equal(board.calls(), 4, "Closing the canvas cancels its timer");
            await board.open();
            t.mock.timers.tick(INTERVAL);
            await board.action("refresh");
            assert.equal(board.calls(), 5, "Reopening starts exactly one new timer");
            await setImmediate();
            board.setFetch(() => new Promise((resolve) => { finish = resolve; }));
            t.mock.timers.tick(INTERVAL);
            const closingRefresh = board.action("refresh");
            await setImmediate();
            await board.close();
            t.mock.timers.tick(INTERVAL * 2);
            assert.equal(board.calls(), 6, "Closing during a fetch prevents later scheduled fetches");
            finish([1, 2, 3, 4, 5, 6, 7].map(item));
            await closingRefresh;
        });

    test(`${id}: polling errors use the existing toast without changing the displayed board`, async () => {
        const source = await readFile(new URL(`../.github/extensions/${id}/public/app.js`, import.meta.url), "utf8");
        const handler = source.split("\n").find((line) => line.includes('events.addEventListener("refresh-error"'));
        const handlers = new Map();
        const messages = [];
        const context = vm.createContext({
            events: { addEventListener: (name, fn) => handlers.set(name, fn) },
            toast: (message, options) => messages.push({ message, error: options.error }),
            board: { items: [1, 2] }, selected: 1, selectedNumber: 1,
        });
        vm.runInContext(handler, context);
        handlers.get("refresh-error")({ data: JSON.stringify({ error: "GitHub unavailable" }) });
        assert.deepEqual(messages, [{ message: "GitHub unavailable", error: true }]);
        assert.deepEqual(context.board.items, [1, 2]);
        assert.equal(context.selected, 1);
        assert.equal(context.selectedNumber, 1);
    });
}
