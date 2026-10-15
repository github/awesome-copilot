import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { test } from "node:test";
import { BoardStore, reviewBlockedReason } from "../.github/extensions/external-plugin-review-board/lib/state.mjs";

const appSource = await readFile(
    new URL("../.github/extensions/external-plugin-review-board/public/app.js", import.meta.url),
    "utf8",
);

function button() {
    return {
        disabled: false,
        textContent: "",
        classList: { remove() {} },
    };
}

function createContext(item, { bulkBusy = false } = {}) {
    const ui = {
        drawerKicker: {},
        drawerTitle: {},
        drawerMeta: {},
        drawerLink: {},
        drawerMove: { replaceChildren() {} },
        drawerRereview: {},
        drawerBlocked: {},
        tabs: [],
        drawerFooter: {},
        approve: button(),
        reject: button(),
    };
    const context = vm.createContext({
        board: { columns: [] },
        bulkBusy,
        clearTimeout() {},
        details: new Map(),
        findItem: () => item,
        h: (...args) => args,
        hideRereview() {},
        itemName: () => "Submission",
        pendingConfirm: { timer: null, kind: null },
        relativeTime: () => "now",
        renderTab() {},
        selected: item.number,
        ui,
        updatePreview() {},
    });
    return { context, ui };
}

function element(tag, attrs = {}, ...children) {
    return {
        tag, attrs, children: children.flat(),
        append(...more) { this.children.push(...more); },
        addEventListener() {},
    };
}

function text(el) {
    if (el == null || el === false) return "";
    return typeof el === "object" ? el.children.map(text).join(" ") : String(el);
}

function evaluateFunction(context, source, signature, nextSignature) {
    const start = source.indexOf(signature);
    const end = source.indexOf(nextSignature, start);
    assert.notEqual(start, -1, `Expected to find ${signature}`);
    assert.notEqual(end, -1, `Expected to find ${nextSignature}`);
    vm.runInContext(source.slice(start, end), context);
}

test("Approve is disabled for submissions that are not review-eligible", () => {
    const item = { number: 42, author: "contributor", labels: ["awaiting-review"], reviewEligible: false };
    const { context, ui } = createContext(item);

    evaluateFunction(context, appSource, "function renderDrawer()", "function renderTab(");
    context.renderDrawer();

    assert.equal(ui.approve.disabled, true);
    assert.equal(ui.reject.disabled, false);

    evaluateFunction(context, appSource, "function resetConfirm()", "async function decide(");
    context.resetConfirm();

    assert.equal(ui.approve.disabled, true);
    assert.equal(ui.reject.disabled, false);
});

test("Approve retains its existing eligible, pending-decision, and bulk-busy states", () => {
    const eligible = { number: 42, author: "contributor", labels: [], reviewEligible: true };

    const available = createContext(eligible);
    evaluateFunction(available.context, appSource, "function renderDrawer()", "function renderTab(");
    available.context.renderDrawer();
    assert.equal(available.ui.approve.disabled, false);

    const pending = createContext({ ...eligible, pendingDecision: { kind: "approve" } });
    evaluateFunction(pending.context, appSource, "function renderDrawer()", "function renderTab(");
    pending.context.renderDrawer();
    assert.equal(pending.ui.approve.disabled, true);

    const busy = createContext(eligible, { bulkBusy: true });
    evaluateFunction(busy.context, appSource, "function renderDrawer()", "function renderTab(");
    busy.context.renderDrawer();
    assert.equal(busy.ui.approve.disabled, true);

    const reset = createContext({ ...eligible, pendingDecision: { kind: "approve" } });
    evaluateFunction(reset.context, appSource, "function resetConfirm()", "async function decide(");
    reset.context.resetConfirm();
    assert.equal(reset.ui.approve.disabled, true);
});

for (const labels of [["requires-submitter-fixes"], ["awaiting-review"], []]) {
    test(`blocked cards and drawer explain intake status: ${labels.join(", ") || "missing ready label"}`, () => {
        const item = {
            number: 42, author: "contributor", labels, reviewEligible: false,
            reviewBlockedReason: reviewBlockedReason(labels), reviewStatus: "unreviewed",
        };
        const { context, ui } = createContext(item);
        context.h = element;
        evaluateFunction(context, appSource, "function signalPills(", "function matchesFilter(");
        evaluateFunction(context, appSource, "function renderCard(", "function wireDropTarget(");
        evaluateFunction(context, appSource, "function renderReview(", "function markdownBlock(");
        evaluateFunction(context, appSource, "function renderDrawer()", "function renderTab(");

        const card = context.renderCard(item);
        assert.match(text(card), /Blocked by intake/);
        assert.ok(text(card).includes(item.reviewBlockedReason));
        assert.equal(card.attrs.draggable, "true");
        context.renderDrawer();
        assert.equal(ui.drawerBlocked.hidden, false);
        assert.ok(ui.drawerBlocked.textContent.includes(item.reviewBlockedReason));
        assert.equal(ui.drawerRereview.disabled, true);
        assert.equal(ui.approve.disabled, true);
        assert.equal(ui.reject.disabled, false);
        assert.equal(ui.drawerRereview.title, item.reviewBlockedReason);
        assert.match(text(context.renderReview(item)), /Review is blocked until intake completes/);
        assert.doesNotMatch(text(context.renderReview(item)), /Use .*Perform review/);

        item.labels = ["ready-for-review"];
        item.reviewEligible = true;
        item.reviewBlockedReason = null;
        context.renderDrawer();
        assert.equal(ui.drawerBlocked.hidden, true);
        assert.equal(ui.drawerBlocked.textContent, "");
        assert.equal(ui.approve.disabled, false);
        assert.equal(ui.drawerRereview.disabled, false);
        assert.doesNotMatch(text(context.renderCard(item)), /Blocked by intake/);
    });
}

test("toolbar shows zero queueable reviews for nine visible blocked submissions, including while searching", () => {
    const store = new BoardStore("unused", "github/awesome-copilot");
    store.state.items = Object.fromEntries(Array.from({ length: 9 }, (_, index) => [
        index + 1, { number: index + 1, labels: ["requires-submitter-fixes"], reviewStatus: "unreviewed" },
    ]));
    const { context, ui } = createContext(store.getItem(1));
    context.board = store.snapshot();
    context.filter = "no matches";
    context.h = element;
    context.renderCard = element;
    context.renderColumnActions = element;
    context.matchesFilter = () => false;
    context.wireDropTarget = () => {};
    ui.board = { querySelectorAll: () => [], replaceChildren() {} };
    ui.meta = {};
    ui.review = {};
    ui.reviewStatus = {};
    evaluateFunction(context, appSource, "function pendingReviewCount()", "// ---------- board");
    evaluateFunction(context, appSource, "function renderBoard()", "function columnItems(");
    context.renderBoard();
    assert.equal(ui.review.disabled, true);
    assert.match(ui.reviewStatus.textContent, /No submissions can be queued/);
    assert.match(ui.reviewStatus.textContent, /9 blocked by intake/);

    store.getItem(1).labels = ["ready-for-review"];
    context.board = store.snapshot();
    context.renderBoard();
    assert.equal(ui.review.disabled, false);
    assert.equal(ui.review.textContent, "Perform review (1)");
    assert.match(ui.reviewStatus.textContent, /1 submission\(s\) ready to queue/);
    assert.match(ui.reviewStatus.textContent, /8 blocked by intake/);
});

test("blocked reviewed cards retain their review without suggesting an unavailable new review", () => {
    const item = {
        number: 42, labels: ["requires-submitter-fixes"], reviewEligible: false,
        reviewBlockedReason: reviewBlockedReason(["requires-submitter-fixes"]),
        reviewStatus: "reviewed", review: { recommendation: "needs-review", rationale: "Original review" },
    };
    const { context } = createContext(item);
    context.h = element;
    context.RECOMMENDATION_LABELS = { "needs-review": "Needs review" };
    evaluateFunction(context, appSource, "function renderReview(", "function markdownBlock(");
    assert.match(text(context.renderReview(item)), /Original review/);
});
