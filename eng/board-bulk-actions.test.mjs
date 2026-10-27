import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { test } from "node:test";

async function createUI(boardName, items, { confirm = true, request } = {}) {
    const nodes = new Map();
    const node = () => ({
        content: "", value: "", dataset: {},
        listeners: {},
        addEventListener(name, handler) { this.listeners[name] = handler; },
        setAttribute() {},
        querySelectorAll: () => [],
    });
    const document = {
        querySelector: node,
        querySelectorAll: () => [],
        getElementById(id) {
            if (!nodes.has(id)) nodes.set(id, node());
            return nodes.get(id);
        },
        addEventListener() {},
    };
    const calls = [], messages = [], confirmations = [];
    const context = vm.createContext({
        document, setTimeout, clearTimeout,
        confirm: (text) => { confirmations.push(text); return confirm; },
    });
    const source = await readFile(new URL(`../.github/extensions/${boardName}/public/app.js`, import.meta.url), "utf8");
    const end = boardName === "open-pr-board" ? "const events = new EventSource" : "function connect()";
    vm.runInContext(source.slice(0, source.indexOf(end)), context);
    context.items = items;
    context.request = async (...args) => {
        calls.push(args);
        return request ? request(...args) : { message: "Queued", status: "submitted" };
    };
    context.notify = (text, options) => messages.push({ text, options });
    vm.runInContext(`
        board = { items, columns: [] };
        renderBoard = renderDrawer = renderDrawerHeader = () => {};
        toast = notify;
        api = request;
    `, context);
    return { context, calls, messages, confirmations, nodes };
}

for (const boardName of ["open-pr-board", "external-plugin-review-board"]) {
    const isPR = boardName === "open-pr-board";
    const reject = isPR ? "request-changes" : "reject";
    const item = (number, extra = {}) => ({
        number, column: "test", headRefOid: "first",
        review: { suggestedComment: isPR ? `Feedback ${number}` : `/reject Feedback ${number}` },
        ...(!isPR ? { reviewEligible: true } : {}),
        ...extra,
    });
    const payload = (args) => isPR ? args[1].body : args[2];

    test(`${boardName}: bulk rejection uses each staged comment, including hidden search results`, async () => {
        const ui = await createUI(boardName, [item(1), item(2)]);
        vm.runInContext('stagedComments.set(1, "Edited feedback"); filterText = filter = "no matches";', ui.context);
        await ui.context.bulkAction("test", reject);
        assert.deepEqual(ui.calls.map(args => ({ ...payload(args) })), [
            { number: 1, kind: reject, comment: "Edited feedback", ...(isPR ? { headRefOid: "first" } : {}) },
            { number: 2, kind: reject, comment: "Feedback 2", ...(isPR ? { headRefOid: "first" } : {}) },
        ]);
        assert.match(ui.confirmations[0], /Edited feedback/);
        assert.match(ui.confirmations[0], /hidden search results/);
    });

    test(`${boardName}: missing feedback blocks the entire batch before confirmation`, async () => {
        const ui = await createUI(boardName, [item(1), item(2, { review: null })]);
        await ui.context.bulkAction("test", reject);
        assert.equal(ui.calls.length, 0);
        assert.equal(ui.confirmations.length, 0);
        assert.match(ui.messages[0].text, /#2/);
    });

    test(`${boardName}: cancelling confirmation never calls an API`, async () => {
        const ui = await createUI(boardName, [item(1)], { confirm: false });
        await ui.context.bulkAction("test", "approve");
        assert.equal(ui.calls.length, 0);
    });

    test(`${boardName}: rereview sends one batch and excludes queued and actioned items`, async () => {
        const items = [item(1), item(2), item(3, { reviewStatus: "queued" }), item(4, { decision: { kind: "approve" } })];
        if (!isPR) items.push(item(5, { pendingDecision: { kind: "reject" } }));
        const ui = await createUI(boardName, items);
        await ui.context.bulkAction("test", "rereview");
        assert.equal(ui.calls.length, 1);
        assert.deepEqual([...payload(ui.calls[0]).numbers], [1, 2]);
        assert.match(ui.confirmations[0], /GitHub is not changed/);
    });

    test(`${boardName}: individual failures are reported and successful items are never retried`, async () => {
        const ui = await createUI(boardName, [item(1), item(2)], {
            request: async (...args) => {
                if (payload(args).number === 1) throw new Error("Offline");
                return { warning: isPR ? "Approval posted but auto-merge failed" : null };
            },
        });
        await ui.context.bulkAction("test", "approve");
        assert.equal(ui.calls.length, 2);
        assert.match(ui.messages.at(-1).text, /1\/2/);
        assert.match(ui.messages.at(-1).text, /#1: Offline/);
        if (isPR) assert.match(ui.messages.at(-1).text, /auto-merge failed/);
        assert.equal(ui.messages.at(-1).options.error, true);
    });

    test(`${boardName}: an in-flight batch cannot be submitted twice`, async () => {
        let release;
        const waiting = new Promise(resolve => { release = resolve; });
        const ui = await createUI(boardName, [item(1)], {
            request: async () => { await waiting; return {}; },
        });
        const first = ui.context.bulkAction("test", "approve");
        await ui.context.bulkAction("test", "approve");
        assert.equal(ui.calls.length, 1);
        release();
        await first;
    });

    test(`${boardName}: draft edits are kept when switching cards`, async () => {
        const ui = await createUI(boardName, [item(1)]);
        vm.runInContext(isPR ? "selectedNumber = 1" : "selected = 1", ui.context);
        ui.nodes.get("decision-comment").value = "My staged reason";
        ui.nodes.get("decision-comment").listeners.input();
        assert.equal(ui.context.stagedComment(ui.context.items[0]), "My staged reason");
    });
}

test("external-plugin-review-board: pending review count excludes posted decisions", async () => {
    const ui = await createUI("external-plugin-review-board", [
        { number: 1, reviewEligible: true, reviewStatus: "unreviewed" },
        { number: 2, reviewEligible: true, reviewStatus: "unreviewed", pendingDecision: { kind: "approve" } },
        { number: 3, reviewStatus: "reviewed" },
        { number: 4, reviewStatus: "queued" },
        { number: 5, decision: { kind: "reject" } },
        { number: 6, reviewEligible: false, reviewStatus: "unreviewed" },
    ]);

    assert.equal(ui.context.pendingReviewCount(), 1);
});

for (const kind of ["approve", "rereview"]) {
    test(`external-plugin-review-board: bulk ${kind} excludes pending intake cards`, async () => {
        const ui = await createUI("external-plugin-review-board", [
            { number: 1, column: "test", reviewEligible: true },
            { number: 2, column: "test", reviewEligible: false },
        ]);

        await ui.context.bulkAction("test", kind);

        assert.equal(ui.calls.length, 1);
        if (kind === "rereview") {
            assert.deepEqual([...ui.calls[0][2].numbers], [1]);
        } else {
            assert.equal(ui.calls[0][2].number, 1);
        }
        assert.doesNotMatch(ui.confirmations[0], /#2/);
    });
}

test("PR bulk close requires and posts the staged reason", async () => {
    const ui = await createUI("open-pr-board", [{ number: 1, column: "close", review: { suggestedComment: "Duplicate" } }]);
    await ui.context.bulkAction("close", "close");
    assert.deepEqual({ ...ui.calls[0][1].body }, { number: 1, kind: "close", comment: "Duplicate" });
});

test("PR changed during a batch is skipped, not approved at a new commit", async () => {
    const items = [1, 2].map(number => ({ number, column: "approve", headRefOid: "first" }));
    const ui = await createUI("open-pr-board", items, {
        request: async () => { items[1].headRefOid = "second"; return {}; },
    });

    await ui.context.bulkAction("approve", "approve");
    assert.equal(ui.calls.length, 1);
    assert.match(ui.messages.at(-1).text, /#2: PR moved, changed/);
});

test("bulk approvals send the displayed commit and refuse stale AI reviews", async () => {
    const ui = await createUI("open-pr-board", [
        { number: 1, column: "approve", headRefOid: "displayed" },
        { number: 2, column: "approve", headRefOid: "new", reviewStale: true },
        { number: 3, column: "approve", headRefOid: "new", manualColumn: "approve", approvalStale: true },
    ]);
    await ui.context.bulkAction("approve", "approve");
    assert.equal(ui.calls.length, 1);
    assert.equal(ui.calls[0][1].body.headRefOid, "displayed");
    assert.match(ui.messages.at(-1).text, /changed since its AI review/);
});
