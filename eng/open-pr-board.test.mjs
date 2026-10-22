import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { test } from "node:test";
import { BoardStore } from "../.github/extensions/open-pr-board/lib/state.mjs";
import { applyDecisionOnGitHub } from "../.github/extensions/open-pr-board/lib/decisions.mjs";
import { approveAndEnableAutoMerge, listOpenPullRequests } from "../.github/extensions/open-pr-board/lib/github.mjs";
import { REVIEW_FIELDS_SCHEMA, buildReviewPrompt, buildRereviewPrompt } from "../.github/extensions/open-pr-board/lib/review-prompt.mjs";

const pr = (headRefOid = "first") => ({
  number: 1, title: "Example", url: "https://github.com/example/repo/pull/1",
  headRefOid, updatedAt: "2026-10-01T00:00:00Z", labels: [],
});

async function createStore(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "open-pr-board-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const store = new BoardStore({ file: path.join(dir, "state.json"), repo: "example/repo" });
  await store.syncPullRequests([pr()]);
  return store;
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test("approval passes the board's commit SHA to the GitHub helper", async (t) => {
  const store = await createStore(t);
  let options;
  await applyDecisionOnGitHub({
    store, number: 1, kind: "approve", comment: "Reviewed.", refresh: async () => {},
    github: {
      approveAndEnableAutoMerge: async (repo, number, input) => {
        options = input;
        return { status: "auto-merge-enabled" };
      },
    },
  });
  assert.deepEqual(options, { body: "Reviewed.", headRefOid: "first" });
});

test("approval and auto-merge are pinned to the reviewed commit", async () => {
  const headRefOid = "a".repeat(40);
  const calls = [];
  const result = await approveAndEnableAutoMerge("example/repo", 1, { body: "Reviewed.", headRefOid },
    async (args, options) => {
      calls.push({ args, options });
      if (calls.length === 1) return JSON.stringify({ state: "open", head: { sha: headRefOid } });
      if (args[1] === "view") return JSON.stringify({ state: "OPEN", autoMergeRequest: {} });
      return "";
    });
  assert.equal(result.status, "auto-merge-enabled");
  assert.deepEqual(calls[1].args, ["api", "repos/example/repo/pulls/1/reviews", "--method", "POST", "--input", "-"]);
  assert.deepEqual(JSON.parse(calls[1].options.input), { event: "APPROVE", commit_id: headRefOid, body: "Reviewed." });
  assert.deepEqual(calls[2].args, ["pr", "merge", "1", "-R", "example/repo", "--auto", "--merge", "--match-head-commit", headRefOid]);
});

test("open pull requests fetch checks with bounded concurrency, preserve order, and tolerate a failed check request", async () => {
  const numbers = [41, 7, 23, 4, 99, 12, 68, 51];
  let active = 0;
  let peak = 0;
  const requested = [];
  const restPullRequests = numbers.map((number) => ({
    number,
    title: `PR ${number}`,
    html_url: `https://github.com/example/repo/pull/${number}`,
    user: { login: `author-${number}` },
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-02T00:00:00Z",
    draft: false,
    labels: [],
    base: { ref: "main" },
    head: { ref: `branch-${number}`, sha: `sha-${number}` },
  }));
  const runner = async (args) => {
    if (args[0] === "api") {
      assert.deepEqual(args, ["api", "--paginate", "--slurp", "repos/example/repo/pulls?state=open&per_page=100"]);
      return JSON.stringify([restPullRequests.slice(0, 4), restPullRequests.slice(4)]);
    }
    if (args[1] === "view") {
      const number = Number(args[2]);
      requested.push(number);
      active++;
      peak = Math.max(peak, active);
      try {
        await new Promise((resolve) => setTimeout(resolve, 10));
        if (number === 23) throw new Error("check request failed");
        return JSON.stringify({
          additions: 3,
          deletions: 1,
          changedFiles: 2,
          reviewDecision: "REVIEW_REQUIRED",
          mergeStateStatus: "CLEAN",
          statusCheckRollup: [{ name: `check-${number}`, status: "COMPLETED", conclusion: "SUCCESS" }],
        });
      } finally {
        active--;
      }
    }
    throw new Error(`Unexpected gh command: ${args.join(" ")}`);
  };

  const pullRequests = await listOpenPullRequests("example/repo", runner);

  assert.ok(peak <= 6, "check requests should not exceed the six-request limit");
  assert.ok(peak > 1, "check requests should run concurrently");
  assert.deepEqual(pullRequests.map(({ number }) => number), numbers, "results should preserve list order");
  assert.deepEqual(requested.sort((a, b) => a - b), [...numbers].sort((a, b) => a - b), "every PR should request checks");
  for (const pullRequest of pullRequests) {
    assert.equal(pullRequest.url, `https://github.com/example/repo/pull/${pullRequest.number}`);
    assert.equal(pullRequest.author, `author-${pullRequest.number}`);
    assert.equal(pullRequest.headRefOid, `sha-${pullRequest.number}`);
    if (pullRequest.number === 23) {
      assert.deepEqual(pullRequest.checks, []);
      assert.equal(pullRequest.checksState, "none");
      assert.equal(pullRequest.reviewDecision, "NONE");
      assert.equal(pullRequest.additions, 0);
    } else {
      assert.deepEqual(pullRequest.checks.map(({ name }) => name), [`check-${pullRequest.number}`]);
      assert.equal(pullRequest.checksState, "success");
      assert.equal(pullRequest.reviewDecision, "REVIEW_REQUIRED");
      assert.equal(pullRequest.additions, 3);
    }
  }
});

test("approval refuses a missing SHA, changed head, or closed pull request without writing", async () => {
  let calls = 0;
  const runner = async () => { calls++; throw new Error("must not run"); };
  await assert.rejects(approveAndEnableAutoMerge("example/repo", 1, {}, runner), /no commit SHA/);
  assert.equal(calls, 0);
  for (const current of [{ state: "open", head: { sha: "second" } }, { state: "closed", head: { sha: "first" } }]) {
    calls = 0;
    await assert.rejects(approveAndEnableAutoMerge("example/repo", 1, { headRefOid: "first" }, async () => {
      calls++;
      return JSON.stringify(current);
    }), /Refresh and review/);
    assert.equal(calls, 1);
  }
});

test("a head change after approval reports partial success instead of retrying the merge", async () => {
  let calls = 0;
  const result = await approveAndEnableAutoMerge("example/repo", 1, { headRefOid: "first" }, async () => {
    calls++;
    if (calls === 1) return JSON.stringify({ state: "open", head: { sha: "first" } });
    if (calls === 3) throw new Error("Head commit changed");
    return "";
  });
  assert.equal(calls, 3);
  assert.equal(result.status, "approval-submitted");
  assert.match(result.warning, /Head commit changed/);
});

test("review schema requires a nonempty queue token and a one-sentence rationale", () => {
  assert.ok(REVIEW_FIELDS_SCHEMA.required.includes("queueId"));
  assert.equal(REVIEW_FIELDS_SCHEMA.properties.queueId.minLength, 1);
  assert.match(REVIEW_FIELDS_SCHEMA.properties.rationale.description, /One sentence/);
});

test("only the current token records a review; moves, rereviews, and reset invalidate old results", async (t) => {
  const store = await createStore(t);
  const payload = { number: 1, recommendation: "approve", rationale: "Ready." };
  assert.equal((await store.recordReviews([payload]))[0].status, "skipped");
  const { queued } = await store.markQueued([1]);
  const token = queued[0].queueId;
  for (const queueId of [undefined, "", "wrong"]) {
    assert.equal((await store.recordReviews([{ ...payload, queueId }]))[0].status, "skipped");
    assert.equal(store.getItem(1).queueId, token);
  }
  await store.moveItem(1, "needs-insight");
  assert.equal((await store.recordReviews([{ ...payload, queueId: token }]))[0].status, "skipped");
  assert.equal(store.getItem(1).manualColumn, "needs-insight");
  const next = (await store.markQueued([1])).queued[0].queueId;
  assert.equal((await store.recordReviews([{ ...payload, queueId: token }]))[0].status, "skipped");
  assert.equal((await store.recordReviews([{ ...payload, queueId: next }]))[0].status, "recorded");
  assert.equal((await store.recordReviews([{ ...payload, queueId: next }]))[0].status, "skipped");
  const beforeReset = (await store.markQueued([1])).queued[0].queueId;
  await store.reset();
  await store.syncPullRequests([pr()]);
  assert.equal((await store.recordReviews([{ ...payload, queueId: beforeReset }]))[0].status, "skipped");
  assert.equal(store.snapshot().counts.unreviewed, 1);
});

test("a transient persistence failure rejects its caller but does not poison later writes", async (t) => {
  const store = await createStore(t);
  const goodFile = store.file;
  const blocker = path.join(path.dirname(goodFile), "not-a-directory");
  await writeFile(blocker, "block");
  store.file = path.join(blocker, "state.json");
  await assert.rejects(store.persist());
  store.file = goodFile;
  await store.moveItem(1, "needs-insight");
  const disk = JSON.parse(await readFile(goodFile, "utf8"));
  assert.equal(disk.items["1"].manualColumn, "needs-insight");
});

for (const kind of ["comment", "request-changes", "approve", "close"]) {
  test(`${kind} decisions reopen on new commits only when nonterminal`, async (t) => {
    const store = await createStore(t);
    await store.recordDecision(1, { kind, comment: "Feedback" });
    await store.syncPullRequests([{ ...pr(), updatedAt: "2099-01-01T00:00:00Z" }]);
    assert.equal(store.getItem(1).decision.kind, kind, "metadata updates must not reopen a PR");
    await store.syncPullRequests([pr("second")]);
    const nonterminal = kind === "comment" || kind === "request-changes";
    assert.equal(store.getItem(1).decision === null, nonterminal);
    assert.equal(store.snapshot().items[0].column, nonterminal ? "unreviewed" : "actioned");
    assert.equal(store.state.history.length, 1);
  });
}

test("legacy nonterminal decisions learn the current commit and reopen on the next commit", async (t) => {
  const store = await createStore(t);
  store.getItem(1).decision = { kind: "comment" };
  delete store.getItem(1).headRefOid;
  await store.syncPullRequests([pr()]);
  assert.equal(store.getItem(1).decision.headRefOid, "first");
  await store.syncPullRequests([pr("second")]);
  assert.equal(store.getItem(1).decision, null);
});

test("concurrent GitHub decisions for the same repo/PR cannot both write", async (t) => {
  const store = await createStore(t);
  const waiting = deferred();
  let calls = 0;
  const github = {
    submitPullRequestReview: async () => { calls++; await waiting.promise; return { status: "comment-submitted" }; },
    closePullRequest: async () => { calls++; throw new Error("must not be reached"); },
  };
  const args = { store, number: 1, comment: "Feedback", github, refresh: async () => {} };
  const first = applyDecisionOnGitHub({ ...args, kind: "comment" });
  await assert.rejects(applyDecisionOnGitHub({ ...args, kind: "close" }), /in progress/);
  assert.equal(calls, 1);
  waiting.resolve();
  await first;
  await assert.rejects(applyDecisionOnGitHub({ ...args, kind: "close" }), /already actioned/);
});

test("decision lock is released on failure and independent repositories can proceed", async (t) => {
  const store = await createStore(t);
  const args = { store, number: 1, kind: "comment", comment: "Feedback", refresh: async () => {} };
  await assert.rejects(applyDecisionOnGitHub({
    ...args, github: { submitPullRequestReview: async () => { throw new Error("offline"); } },
  }), /offline/);
  const waiting = deferred();
  const first = applyDecisionOnGitHub({
    ...args, github: { submitPullRequestReview: async () => { await waiting.promise; return { status: "comment-submitted" }; } },
  });
  const other = new BoardStore({ file: path.join(path.dirname(store.file), "other.json"), repo: "example/other" });
  await other.syncPullRequests([pr()]);
  await applyDecisionOnGitHub({
    ...args, store: other, github: { submitPullRequestReview: async () => ({ status: "comment-submitted" }) },
  });
  waiting.resolve();
  await first;
});

class Element {
  constructor() {
    this.listeners = {};
    this.attributes = {};
    this.dataset = {};
    this.style = { setProperty() {} };
    this.classes = new Set();
    this.classList = {
      add: (value) => this.classes.add(value),
      remove: (value) => this.classes.delete(value),
      contains: (value) => this.classes.has(value),
    };
  }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  setAttribute(name, value) { this.attributes[name] = value; }
  replaceChildren() {}
  append() {}
  getClientRects() { return [1]; }
  focus() { this.document.activeElement = this; }
  click() { this.listeners.click?.({ currentTarget: this }); }
}

async function createUI() {
  const nodes = new Map();
  const document = new Element();
  document.activeElement = null;
  document.getElementById = (id) => {
    if (!nodes.has(id)) {
      const node = new Element();
      node.document = document;
      nodes.set(id, node);
    }
    return nodes.get(id);
  };
  document.querySelector = (selector) => selector === ".toolbar" ? document.getElementById("toolbar") : { content: "" };
  document.createElement = () => new Element();
  const drawer = document.getElementById("drawer");
  const tabs = ["review", "description", "conversation", "files", "checks"].map((tab) => {
    const node = document.getElementById(`tab-${tab}`);
    node.dataset.tab = tab;
    return node;
  });
  const decisions = ["close", "comment", "request-changes", "approve"].map((kind) => {
    const node = document.getElementById(`decision-${kind}`);
    node.dataset.decision = kind;
    return node;
  });
  drawer.querySelectorAll = (selector) => selector === ".tab" ? tabs : selector === "[data-decision]" ? decisions : [
    document.getElementById("drawer-close"), document.getElementById("decision-approve"),
  ];
  document.getElementById("board").querySelector = () => document.getElementById("origin-card");
  const source = await readFile(new URL("../.github/extensions/open-pr-board/public/app.js", import.meta.url), "utf8");
  const context = vm.createContext({ document, setTimeout, clearTimeout });
  vm.runInContext(source.slice(0, source.indexOf("const events = new EventSource")), context);
  vm.runInContext(`
    renderBoard = () => {};
    reviewTab = conversationTab = filesTab = checksTab = markdownBlock = () => null;
    api = () => globalThis.nextRequest.promise;
    globalThis.ui = {
      openDrawer, closeDrawer, loadDetail, submitDecision,
      select(number) {
        selectedNumber = number;
        board = { columns: [], items: [1, 2].map(number => ({
          number, title: "Example", labels: [], createdAt: "2026-10-01", column: "unreviewed",
        })) };
      },
      state: () => ({ detail, detailError, activeTab }),
      render: renderDrawerBody,
    };
  `, context);
  return { context, ui: context.ui, nodes, tabs, document };
}

test("older PR detail responses and errors cannot overwrite a newer selected PR", async () => {
  const { context, ui } = await createUI();
  for (const fail of [false, true]) {
    const old = deferred(), current = deferred();
    ui.select(1);
    context.nextRequest = old;
    const loadingOld = ui.loadDetail(1);
    ui.select(2);
    context.nextRequest = current;
    const loadingCurrent = ui.loadDetail(2);
    current.resolve({ number: 2, bodyHtml: "Current" });
    await loadingCurrent;
    if (fail) old.reject(new Error("Old failure"));
    else old.resolve({ number: 1 });
    await loadingOld;
    assert.equal(ui.state().detail.number, 2);
    assert.equal(ui.state().detailError, null);
  }
});

test("latest forced detail request wins, and closing invalidates pending detail", async () => {
  const { context, ui } = await createUI();
  ui.select(1);
  const first = deferred(), latest = deferred();
  context.nextRequest = first;
  const loadingFirst = ui.loadDetail(1);
  context.nextRequest = latest;
  const loadingLatest = ui.loadDetail(1, { force: true });
  latest.resolve({ number: 1, version: "latest" });
  await loadingLatest;
  first.resolve({ number: 1, version: "old" });
  await loadingFirst;
  assert.equal(ui.state().detail.version, "latest");
  const pending = deferred();
  context.nextRequest = pending;
  const loading = ui.loadDetail(1);
  ui.closeDrawer();
  pending.resolve({ number: 1 });
  await loading;
  assert.equal(ui.state().detail, null);
});

test("drawer focuses its close button, traps focus, and restores the card on close", async () => {
  const { ui, document, nodes } = await createUI();
  ui.select(1);
  ui.openDrawer(1);
  assert.equal(document.activeElement, nodes.get("drawer-close"));
  assert.equal(nodes.get("board").inert, true);
  const last = nodes.get("decision-approve");
  last.focus();
  let prevented = false;
  document.listeners.keydown({ key: "Tab", preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(document.activeElement, nodes.get("drawer-close"));
  document.listeners.keydown({ key: "Tab", shiftKey: true, preventDefault() {} });
  assert.equal(document.activeElement, last);
  document.listeners.keydown({ key: "Escape", preventDefault() {} });
  assert.equal(document.activeElement, nodes.get("origin-card"));
  assert.equal(nodes.get("board").inert, false);
  assert.equal(nodes.get("drawer").inert, true);
});

test("tabs use roving focus with arrows and Home/End, and label their panel", async () => {
  const { ui, tabs, nodes, document, context } = await createUI();
  ui.select(1);
  ui.render();
  const key = (tab, value) => tab.listeners.keydown({ key: value, preventDefault() {} });
  // Keep detail requests local and already satisfied while exercising tab navigation.
  vm.runInContext('detail = { number: 1 };', context);
  key(tabs[0], "End");
  assert.equal(document.activeElement, tabs[4]);
  assert.equal(ui.state().activeTab, "checks");
  assert.equal(nodes.get("drawer-body").attributes["aria-labelledby"], "tab-checks");
  assert.equal(tabs[4].tabIndex, 0);
  assert.equal(tabs[0].tabIndex, -1);
  key(tabs[4], "ArrowRight");
  assert.equal(ui.state().activeTab, "review");
  key(tabs[0], "ArrowLeft");
  assert.equal(ui.state().activeTab, "checks");
  key(tabs[4], "Home");
  assert.equal(ui.state().activeTab, "review");
  assert.equal(tabs.filter(tab => tab.tabIndex === 0).length, 1);
});

test("all decision buttons stay disabled while an action is pending", async () => {
  const { ui, context, nodes } = await createUI();
  ui.select(1);
  const request = deferred();
  context.nextRequest = request;
  vm.runInContext("toast = () => {}; loadDetail = async () => {};", context);
  const comment = nodes.get("decision-comment");
  await ui.submitDecision(comment, "comment");
  const submitting = ui.submitDecision(comment, "comment");
  for (const kind of ["close", "comment", "request-changes", "approve"]) {
    assert.equal(nodes.get(`decision-${kind}`).disabled, true);
  }
  await ui.submitDecision(nodes.get("decision-close"), "close");
  request.resolve({ status: "comment-submitted" });
  await submitting;
  assert.equal(comment.disabled, false);
});

const promptItem = {
  number: 5074, title: "Add headshot skills", queueId: "q-1", author: "someone", isDraft: false,
  labels: [], additions: 10, deletions: 0, changedFiles: 2, checkCounts: { total: 0 },
  reviewDecision: "REVIEW_REQUIRED", mergeStateStatus: "CLEAN", url: "https://github.com/example/repo/pull/5074",
};
const promptArgs = { instanceId: "board-1", repo: "example/repo", guidancePath: "guidance.md" };

test("review prompts include vendor-funnel, author-batch, and recording checks", () => {
  const prompts = [
    buildReviewPrompt({ ...promptArgs, items: [promptItem], decisions: [] }),
    buildRereviewPrompt({ ...promptArgs, item: promptItem }),
  ];
  for (const prompt of prompts) {
    assert.match(prompt, /gh pr list -R example\/repo --author <login> --state all/);
    assert.match(prompt, /LICENSE copyright holder/);
    assert.match(prompt, /repos\/<owner>\/<repo>\/readme/);
    assert.match(prompt, /UTM or referral links/);
    assert.match(prompt, /vendor funnel is `close`, not `request-changes`/);
    assert.match(prompt, /non-developer domains/);
    assert.match(prompt, /AI-only synthetic evaluations/);
    assert.match(prompt, /weak repo fit or a vendor funnel is `close`/);
    assert.match(prompt, /gh pr view <number> --json state/);
    assert.match(prompt, /stale review result/);
  }
});

test("re-review prompt frames maintainer guidance as a prior to verify", () => {
  const prompt = buildRereviewPrompt({ ...promptArgs, item: promptItem, guidance: "thinly veiled product integration" });
  assert.match(prompt, /strong prior — verify it against the evidence[^\n]*\nthinly veiled product integration/);
  assert.doesNotMatch(buildRereviewPrompt({ ...promptArgs, item: promptItem }), /strong prior/);
});

test("review prompts delegate to background agents instead of the main session", () => {
  const batch = buildReviewPrompt({ ...promptArgs, items: [promptItem, { ...promptItem, number: 2, queueId: "q-2" }], decisions: [] });
  const single = buildRereviewPrompt({ ...promptArgs, item: promptItem });
  for (const prompt of [batch, single]) {
    const [coordinator, brief] = prompt.split("--- Agent brief ---");
    assert.ok(brief, "prompt separates coordinator instructions from the agent brief");
    assert.match(coordinator, /do not review in the main session/);
    assert.match(coordinator, /mode: "background"/);
    assert.match(coordinator, /instanceId `board-1`/);
    assert.match(brief, /record_review/);
    assert.match(brief, /#5074/);
  }
  assert.match(batch, /in parallel, one per pull request/);
  assert.match(single, /one background agent for this pull request/);
});
