import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { test } from "node:test";
import { BoardStore } from "../.github/extensions/external-plugin-review-board/lib/state.mjs";
import {
    buildReviewPrompt,
    buildRereviewPrompt,
} from "../.github/extensions/external-plugin-review-board/lib/review-prompt.mjs";

test("external-plugin review prompts and guidance assess Copilot workflows across modalities", async () => {
    const prompts = [
        buildReviewPrompt({ items: [], instanceId: "board-1", canvasId: "external-plugin-review-board", guidancePath: "guidance.md", history: [] }),
        buildRereviewPrompt({
            item: { number: 1, title: "Example", author: "someone", queueId: "q-1" },
            instanceId: "board-1",
            canvasId: "external-plugin-review-board",
            guidancePath: "guidance.md",
            history: [],
            repo: "github/awesome-copilot",
        }),
    ];
    for (const prompt of prompts) {
        assert.match(prompt, /not only coding or text-based developer tasks/);
        assert.match(prompt, /Image, video, audio, other media-generation, and creative work/);
        assert.match(prompt, /modality or non-coding use alone is not a rejection reason/);
        assert.match(prompt, /knowledge uplift, provenance, product\/vendor-funnel evidence, responsible use/);
        assert.match(prompt, /validation appropriate to the workflow/);
        assert.match(prompt, /paid or credit-based acquisition paths without standalone user value/);
        assert.match(prompt, /duplicates of native Copilot features/);
        assert.match(prompt, /generic content with no meaningful uplift/);
    }

    const guidance = await readFile(
        new URL("../.github/extensions/external-plugin-review-board/review-guidance.md", import.meta.url),
        "utf8",
    );
    assert.match(guidance, /Assess Copilot value across workflows/);
    assert.match(guidance, /non-coding use alone is not a reason to reject/);
    assert.match(guidance, /validation evidence appropriate to the workflow/);
    assert.match(guidance, /duplicates of native Copilot features/);
});

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
        ui: { approve: button(), reject: button(), requestFixes: button(), commentPost: button() },
        bulkBusy: false,
        selected: 42,
        findItem: () => ({ pendingDecision: { kind: "approve" } }),
        updatePreview() {},
    });
    vm.runInContext(source.slice(start, end), context);

    context.resetConfirm();

    assert.equal(context.ui.approve.disabled, true);
    assert.equal(context.ui.reject.disabled, true);
    assert.equal(context.ui.requestFixes.disabled, true);
    assert.equal(context.ui.commentPost.disabled, false);
});

test("stripCommand only removes a complete command token", async () => {
    const source = await readFile(
        new URL("../.github/extensions/external-plugin-review-board/extension.mjs", import.meta.url),
        "utf8",
    );
    const start = source.indexOf("function stripCommand(");
    const end = source.indexOf("\nasync function postDecision(", start);
    assert.notEqual(start, -1);
    assert.notEqual(end, -1);

    const context = vm.createContext({});
    vm.runInContext(`${source.slice(start, end)}; globalThis.stripCommand = stripCommand;`, context);

    assert.equal(context.stripCommand("/reject Missing LICENSE", "reject"), "Missing LICENSE");
    assert.equal(context.stripCommand("/reject-extra Missing LICENSE", "reject"), "/reject-extra Missing LICENSE");
});
