import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { test } from "node:test";

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
