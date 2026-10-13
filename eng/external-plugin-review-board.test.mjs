import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { test } from "node:test";
import { BoardStore } from "../.github/extensions/external-plugin-review-board/lib/state.mjs";

test("external-plugin-review-board excludes items with pending decisions from AI review", () => {
    const store = new BoardStore("unused", "github/awesome-copilot");
    store.state.items = {
        "1": { number: 1, labels: ["ready-for-review"], reviewStatus: "unreviewed" },
        "2": { number: 2, labels: ["ready-for-review"], reviewStatus: "unreviewed", pendingDecision: { kind: "approve" } },
        "3": { number: 3, reviewStatus: "queued" },
        "4": { number: 4, reviewStatus: "unreviewed", decision: { kind: "reject" } },
    };

    assert.deepEqual(store.pendingReview().map(({ number }) => number), [1]);
    assert.deepEqual(store.pendingReview([1, 2, 3, 4]).map(({ number }) => number), [1]);
});

test("resetConfirm keeps decision buttons disabled while a decision is pending", async () => {
    const source = await readFile(
        new URL("../.github/extensions/external-plugin-review-board/public/app.js", import.meta.url),
        "utf8",
    );
    const start = source.indexOf("function resetConfirm()");
    const end = source.indexOf("async function decide(", start);
    assert.notEqual(start, -1);
    assert.notEqual(end, -1);

    const button = () => ({
        disabled: false,
        textContent: "",
        classList: { remove() {} },
    });
    const context = vm.createContext({
        clearTimeout() {},
        pendingConfirm: { timer: null, kind: "approve" },
        ui: { approve: button(), reject: button() },
        bulkBusy: false,
        selected: 42,
        findItem: () => ({ pendingDecision: { kind: "approve" } }),
        updatePreview() {},
    });
    vm.runInContext(source.slice(start, end), context);

    context.resetConfirm();

    assert.equal(context.ui.approve.disabled, true);
    assert.equal(context.ui.reject.disabled, true);
});
