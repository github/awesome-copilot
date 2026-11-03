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
    store, number: 1, kind: "approve", comment: "Reviewed.", headRefOid: "first", refresh: async () => {},
    github: {
      approveAndEnableAutoMerge: async (repo, number, input) => {
        options = input;
        return { status: "auto-merge-enabled" };
      },
    },
  });
  assert.deepEqual(options, { body: "Reviewed.", headRefOid: "first" });
});

test("approval rejects a missing or previously displayed SHA after a scheduled sync without writing", async (t) => {
  const store = await createStore(t);
  await store.syncPullRequests([pr("second")]);
  let writes = 0;
  for (const headRefOid of [undefined, "", "first"]) {
    await assert.rejects(applyDecisionOnGitHub({
      store, number: 1, kind: "approve", headRefOid, refresh: async () => {},
      github: { approveAndEnableAutoMerge: async () => { writes++; } },
    }), /changed since it was displayed/);
  }
  assert.equal(writes, 0);
  assert.equal(store.getItem(1).decision, null);
});

test("a review finishing after a head sync retains its queued commit and remains stale", async (t) => {
  const store = await createStore(t);
  const { queued } = await store.markQueued([1]);
  await store.syncPullRequests([pr("second")]);
  await store.recordReviews([{
    number: 1, queueId: queued[0].queueId, recommendation: "approve",
    rationale: "Reviewed the first commit.", headRefOid: "second",
  }]);
  assert.equal(store.getItem(1).review.headRefOid, "first", "Payload cannot overwrite queue provenance");
  assert.equal(store.snapshot().items[0].reviewStale, true);
  const next = await store.markQueued([1]);
  await store.recordReviews([{ number: 1, queueId: next.queued[0].queueId, recommendation: "approve" }]);
  assert.equal(store.getItem(1).review.headRefOid, "second");
  assert.equal(store.snapshot().items[0].reviewStale, false);
});

test("manual approval provenance survives refresh and is renewed only by an explicit move", async (t) => {
  const store = await createStore(t);
  await store.moveItem(1, "approve", "first");
  assert.equal(store.snapshot().items[0].approvalStale, false);
  await store.syncPullRequests([pr("second")]);
  assert.equal(store.getItem(1).manualColumn, "approve");
  assert.equal(store.getItem(1).manualHeadRefOid, "first");
  assert.equal(store.snapshot().items[0].approvalStale, true);
  await store.moveItem(1, "approve", "second");
  assert.equal(store.snapshot().items[0].approvalStale, false);
  const { previous } = await store.markQueued([1]);
  await store.restoreQueueState(previous);
  assert.equal(store.getItem(1).queueHeadRefOid, previous[0].queueHeadRefOid);
});

test("legacy approval choices without commit provenance cannot silently authorize bulk approval", async (t) => {
  const store = await createStore(t);
  store.getItem(1).review = { recommendation: "approve", reviewedAt: "2099-01-01" };
  assert.equal(store.snapshot().items[0].reviewStale, true);
  store.getItem(1).manualColumn = "approve";
  assert.equal(store.snapshot().items[0].approvalStale, true);
});

test("sync before a delayed manual move retains the client's original commit", async (t) => {
  const store = await createStore(t);
  await store.syncPullRequests([pr("second")]);
  await store.moveItem(1, "approve", "first");
  assert.equal(store.getItem(1).manualHeadRefOid, "first");
  assert.equal(store.snapshot().items[0].approvalStale, true);
  await store.moveItem(1, "approve");
  assert.equal(store.snapshot().items[0].approvalStale, true, "Missing client provenance fails closed");
});

for (const kind of ["comment", "request-changes"]) {
  test(`${kind} rejects feedback dispatched after the displayed head has changed`, async (t) => {
    const store = await createStore(t);
    await store.syncPullRequests([pr("second")]);
    let writes = 0;
    for (const headRefOid of ["first", undefined]) {
      await assert.rejects(applyDecisionOnGitHub({
        store, number: 1, kind, comment: "Feedback on first", headRefOid,
        github: { submitPullRequestReview: async () => { writes++; } },
        refresh: async () => {},
      }), /changed since it was displayed/);
    }
    assert.equal(writes, 0);
    assert.equal(store.getItem(1).decision, null);
  });

  test(`a delayed ${kind} response retains the action head when polling discovers new commits`, async (t) => {
    const store = await createStore(t);
    const pending = deferred();
    const action = applyDecisionOnGitHub({
      store, number: 1, kind, comment: "Feedback on first", headRefOid: "first",
      github: { submitPullRequestReview: async () => { await pending.promise; return { status: "submitted" }; } },
      refresh: () => store.syncPullRequests([pr("second")]),
    });
    await store.syncPullRequests([pr("second")]);
    pending.resolve();
    await action;
    assert.equal(store.getItem(1).decision, null);
    assert.equal(store.snapshot().items[0].column, "unreviewed");
    assert.equal(store.state.history[0].kind, kind);
  });

  for (const currentState of ["queued", "reviewed", "manual"]) {
    test(`obsolete ${kind} feedback preserves the newer head's ${currentState} state`, async (t) => {
      const store = await createStore(t);
      const pending = deferred();
      const action = applyDecisionOnGitHub({
        store, number: 1, kind, comment: "Feedback on first", headRefOid: "first",
        github: { submitPullRequestReview: async () => { await pending.promise; return { status: "submitted" }; } },
        refresh: () => store.syncPullRequests([pr("second")]),
      });
      await store.syncPullRequests([pr("second")]);
      const { queued } = await store.markQueued([1]);
      if (currentState === "reviewed") {
        await store.recordReviews([{ number: 1, queueId: queued[0].queueId, recommendation: "approve" }]);
      } else if (currentState === "manual") {
        await store.moveItem(1, "needs-insight", "second");
      }
      const before = structuredClone(store.getItem(1));
      pending.resolve();
      await action;
      assert.deepEqual(store.getItem(1), before, "Obsolete feedback must not replace current review or move state");
      assert.equal(store.state.history[0].kind, kind);
      if (currentState === "queued") {
        const [result] = await store.recordReviews([{
          number: 1, queueId: queued[0].queueId, recommendation: "approve",
        }]);
        assert.equal(result.status, "recorded", "The newer head's queue token remains valid");
      }
    });
  }

  for (const oldState of ["queued", "reviewed", "manual"]) {
    test(`obsolete ${kind} feedback clears the old head's ${oldState} state`, async (t) => {
      const store = await createStore(t);
      const { queued } = await store.markQueued([1]);
      if (oldState === "reviewed") {
        await store.recordReviews([{ number: 1, queueId: queued[0].queueId, recommendation: "request-changes" }]);
      } else if (oldState === "manual") {
        await store.moveItem(1, "close", "first");
      }
      const pending = deferred();
      const action = applyDecisionOnGitHub({
        store, number: 1, kind, comment: "Feedback on first", headRefOid: "first",
        github: { submitPullRequestReview: async () => { await pending.promise; return { status: "submitted" }; } },
        refresh: () => store.syncPullRequests([pr("second")]),
      });
      await store.syncPullRequests([pr("second")]);
      pending.resolve();
      await action;
      assert.equal(store.snapshot().items[0].column, "unreviewed");
      assert.equal(store.getItem(1).review, null);
      assert.equal(store.getItem(1).manualColumn, null);
      assert.equal(store.getItem(1).queueId, null);
      assert.equal(store.state.history[0].kind, kind);
    });
  }

  test(`obsolete ${kind} feedback clears an old review while preserving the new head's queue`, async (t) => {
    const store = await createStore(t);
    const old = await store.markQueued([1]);
    await store.recordReviews([{ number: 1, queueId: old.queued[0].queueId, recommendation: "request-changes" }]);
    await store.syncPullRequests([pr("second")]);
    const current = await store.markQueued([1]);
    await store.recordDecision(1, { kind, headRefOid: "first" });
    assert.equal(store.getItem(1).review, null);
    assert.equal(store.getItem(1).queueId, current.queued[0].queueId);
    assert.equal(store.snapshot().items[0].column, "reviewing");
  });
}

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
  assert.match(REVIEW_FIELDS_SCHEMA.properties.rationale.description, /one sentence/i);
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
  const args = { store, number: 1, comment: "Feedback", headRefOid: "first", github, refresh: async () => {} };
  const first = applyDecisionOnGitHub({ ...args, kind: "comment" });
  await assert.rejects(applyDecisionOnGitHub({ ...args, kind: "close" }), /in progress/);
  assert.equal(calls, 1);
  waiting.resolve();
  await first;
  await assert.rejects(applyDecisionOnGitHub({ ...args, kind: "close" }), /already actioned/);
});

test("decision lock is released on failure and independent repositories can proceed", async (t) => {
  const store = await createStore(t);
  const args = { store, number: 1, kind: "comment", comment: "Feedback", headRefOid: "first", refresh: async () => {} };
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

test("GitHub 422 decision failures are shown as actionable notices and not recorded", async (t) => {
  const store = await createStore(t);
  let refreshes = 0;
  await assert.rejects(applyDecisionOnGitHub({
    store,
    number: 1,
    kind: "comment",
    comment: "Feedback",
    headRefOid: "first",
    github: { submitPullRequestReview: async () => { throw new Error("gh: Unprocessable Entity (HTTP 422)"); } },
    refresh: async () => { refreshes++; },
  }), (error) => {
    assert.equal(error.handoff, false);
    assert.match(error.message, /GitHub rejected this action \(HTTP 422\)/);
    assert.match(error.message, /Refresh the board/);
    return true;
  });
  assert.equal(refreshes, 0);
  assert.equal(store.getItem(1).decision, null);
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
          number, title: "Example", labels: [], createdAt: "2026-10-01", column: "unreviewed", headRefOid: "first",
        })) };
      },
      state: () => ({ detail, detailError, detailErrorHandoff, activeTab, previewHeadRefOid }),
      render: renderDrawerBody,
    };
  `, context);
  return { context, ui: context.ui, nodes, tabs, document };
}

test("a refreshed PR head reloads the preview and blocks approval until the new detail arrives", async () => {
  const { context, ui, nodes } = await createUI();
  const requests = [];
  const messages = [];
  context.notify = (message, options) => messages.push({ message, options });
  vm.runInContext("toast = notify", context);
  ui.select(1);
  context.nextRequest = deferred();
  const initial = ui.loadDetail(1);
  context.nextRequest.resolve({ headRefOid: "first", files: [{ filename: "old.js" }] });
  await initial;
  assert.equal(ui.state().previewHeadRefOid, "first");
  nodes.get("decision-comment").value = "Keep this feedback";
  context.nextRequest = deferred();
  const pending = context.nextRequest;
  context.applySnapshot({
    columns: [], items: [{ number: 1, title: "New head", labels: [], headRefOid: "second" }],
  });
  assert.equal(ui.state().detail, null);
  assert.equal(ui.state().previewHeadRefOid, null);
  await ui.submitDecision(nodes.get("decision-approve"), "approve");
  assert.match(messages[0].message, /preview is loading or changed/);
  assert.equal(messages[0].options.handoff, false);
  assert.equal(nodes.get("decision-comment").value, "Keep this feedback");
  pending.resolve({ headRefOid: "second", files: [{ filename: "new.js" }] });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(ui.state().previewHeadRefOid, "second");
  assert.equal(ui.state().detail.files[0].filename, "new.js");
  context.request = async (...args) => { requests.push(args); throw new Error("stop after request"); };
  vm.runInContext("api = request", context);
  await ui.submitDecision(nodes.get("decision-approve"), "approve");
  await ui.submitDecision(nodes.get("decision-approve"), "approve");
  assert.equal(requests.length, 1);
  assert.equal(requests[0][1].body.headRefOid, "second");
});

test("a cached preview from another commit cannot authorize approval", async () => {
  const { context, ui } = await createUI();
  ui.select(1);
  context.nextRequest = deferred();
  const pending = ui.loadDetail(1);
  context.nextRequest.resolve({ headRefOid: "older", files: [] });
  await pending;
  assert.equal(ui.state().previewHeadRefOid, null);
  assert.equal(ui.state().detail, null);
  assert.match(ui.state().detailError, /changed while loading/);
  assert.equal(ui.state().detailErrorHandoff, false);
});

test("a successful same-head refresh retries a failed preview without disturbing the draft", async () => {
  const { context, ui, nodes } = await createUI();
  ui.select(1);
  context.nextRequest = deferred();
  const failed = ui.loadDetail(1);
  context.nextRequest.reject(new Error("Transient GitHub error"));
  await failed;
  assert.match(ui.state().detailError, /Transient/);
  nodes.get("decision-comment").value = "Keep my feedback";
  context.nextRequest = deferred();
  context.applySnapshot({
    updatedAt: "new-refresh", columns: [],
    items: [{ number: 1, title: "Example", labels: [], headRefOid: "first" }],
  });
  assert.equal(ui.state().detailError, null);
  context.nextRequest.resolve({ headRefOid: "first", files: [] });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(ui.state().previewHeadRefOid, "first");
  assert.equal(nodes.get("decision-comment").value, "Keep my feedback");
});

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

test("partial decision failures retain a repair handoff without retrying the action", async () => {
  const { ui, context, nodes } = await createUI();
  ui.select(1);
  context.nextRequest = deferred();
  vm.runInContext("globalThis.notices = []; toast = (text, options) => notices.push({text, options});", context);
  const button = nodes.get("decision-comment");
  await ui.submitDecision(button, "comment");
  const submitting = ui.submitDecision(button, "comment");
  context.nextRequest.resolve({ status: "comment-submitted", warning: "Comment posted but local receipt failed." });
  await submitting;
  assert.equal(context.notices[0].options.error, true);
  assert.notEqual(context.notices[0].options.handoff, false);
  assert.match(context.notices[0].text, /local receipt failed/);
});

test("failed post-reset reloads retain handoff without repeating reset", async () => {
  const { context, nodes } = await createUI();
  context.nextRequest = deferred();
  vm.runInContext("globalThis.notices = []; toast = (text, options) => notices.push({text, options});", context);
  const button = nodes.get("reset-button");
  await button.listeners.click({ currentTarget: button });
  const resetting = button.listeners.click({ currentTarget: button });
  context.nextRequest.resolve({ warning: "Board cleared but open PR reload failed." });
  await resetting;
  assert.equal(context.notices[0].options.error, true);
  assert.notEqual(context.notices[0].options.handoff, false);
});

test("stale approvals remain expected notices while GitHub failures remain eligible", async () => {
  const { approveAndEnableAutoMerge } = await import("../.github/extensions/open-pr-board/lib/github.mjs");
  await assert.rejects(() => approveAndEnableAutoMerge("github/awesome-copilot", 42),
    error => error.handoff === false);
  await assert.rejects(() => approveAndEnableAutoMerge("github/awesome-copilot", 42, { headRefOid: "old" },
    async () => JSON.stringify({ state: "open", head: { sha: "new" } })),
  error => error.handoff === false);
  await assert.rejects(() => approveAndEnableAutoMerge("github/awesome-copilot", 42, { headRefOid: "old" },
    async () => { throw new Error("Offline"); }),
  error => error.handoff !== false && error.message === "Offline");
});

test("drawer bucket changes retain expected-notice classification and restore selection", async () => {
  const { ui, context, nodes } = await createUI();
  ui.select(1);
  vm.runInContext('board.items[0].column = "unreviewed"; globalThis.notices = []; toast = (text, options) => notices.push({text, options});', context);
  context.nextRequest = deferred();
  const select = nodes.get("drawer-column");
  select.value = "close";
  const moving = select.listeners.change({ target: select });
  context.nextRequest.reject(Object.assign(new Error("Already actioned."), { handoff: false }));
  await moving;
  assert.equal(select.value, "unreviewed");
  assert.equal(context.notices[0].options.handoff, false);
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

test("all public-comment prompt surfaces separate author feedback from internal maintainer advice", () => {
  const surfaces = [
    ["record_review schema", REVIEW_FIELDS_SCHEMA.properties.suggestedComment.description],
    ["initial review", buildReviewPrompt({
      ...promptArgs, items: [promptItem],
      decisions: [{ number: 2, kind: "close", comment: "Internal calibration context" }],
    }).split("--- Agent brief ---")[1]],
    ["re-review", buildRereviewPrompt({
      ...promptArgs, item: promptItem,
      guidance: "Have a maintainer confirm the required approval.",
      previousReview: { recommendation: "needs-insight", rationale: "Unresolved policy", reviewedAt: "2026-10-01" },
    }).split("--- Agent brief ---")[1]],
  ];
  for (const [name, text] of surfaces) {
    assert.ok(text, name);
    for (const requirement of [
      /ready to post verbatim as the maintainer addressing the PR author directly/,
      /natural maintainer voice, not an agent report to the maintainer/,
      /concrete evidence \(files, lines, or links where available\) and actionable changes/,
      /clear evidence-backed decision/,
      /internal fields such as `rationale`, `risks`, and `checkNext`, not in the public comment/,
      /Do not tell the maintainer what to do/,
      /I recommend closing this submission/,
      /Have a maintainer confirm/,
      /Confirm the required approval/,
      /Do not mention board buckets, queue tokens, internal calibration, or internal recommendation labels/,
      /Preserve uncertainty: distinguish observed facts from unresolved questions/,
      /ask the author only for information they can reasonably provide/,
      /do not turn a tentative internal recommendation into a settled public decision/,
      /Do not invent claims of completed remote actions/,
      /recording a review performs none of them/,
      /omit `suggestedComment` or use an empty string/,
      /do not manufacture a comment/,
    ]) {
      assert.match(text, requirement, `${name}: ${requirement}`);
    }
  }
  for (const field of ["rationale", "risks", "checkNext"]) {
    assert.match(REVIEW_FIELDS_SCHEMA.properties[field].description, /^Internal:/, field);
  }
  assert.ok(!REVIEW_FIELDS_SCHEMA.required.includes("suggestedComment"), "No public comment is required");
  assert.equal(REVIEW_FIELDS_SCHEMA.properties.suggestedComment.minLength, undefined, "Empty comments remain valid");
});

test("initial and re-review agent briefs accept valid YAML scalar styles while preserving metadata checks", () => {
  const prompts = [
    buildReviewPrompt({ ...promptArgs, items: [promptItem], decisions: [] }),
    buildRereviewPrompt({ ...promptArgs, item: promptItem }),
  ];
  for (const prompt of prompts) {
    const [, brief] = prompt.split("--- Agent brief ---");
    assert.match(brief, /Frontmatter must be valid YAML/);
    assert.match(brief, /required metadata fields, types, lengths, and naming rules/);
    assert.match(brief, /Accept plain, single-quoted, double-quoted, literal, and folded scalars/);
    assert.match(brief, /Do not request changes solely because a value is not single-quoted/);
    assert.match(brief, /For skills, review SKILL\.md against the Agent Skills specification at https:\/\/agentskills\.io\/specification/);
    assert.match(brief, /repository's additional skill checks/);
    assert.match(brief, /Valid YAML alone is not enough/);
    assert.match(brief, /`metadata` must map string keys to string values/);
    assert.match(brief, /`allowed-tools` must be a space-separated string, not a YAML sequence/);
  }
});

test("review prompts assess Copilot workflows across modalities and retain independent quality gates", () => {
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
    assert.match(prompt, /Do not limit repository fit to coding or text-based developer tasks/);
    assert.match(prompt, /image, video, audio, other media generation, and creative work/);
    assert.match(prompt, /Modality or non-coding use alone is not a rejection reason/);
    assert.match(prompt, /validation appropriate to the workflow/);
    assert.match(prompt, /paid or credit-based acquisition paths without standalone user value/);
    assert.match(prompt, /duplicates of native Copilot features/);
    assert.match(prompt, /generic content with no meaningful knowledge uplift/);
    assert.match(prompt, /AI-only synthetic evaluations/);
    assert.match(prompt, /weak repo fit or a vendor funnel is `close`/);
    assert.match(prompt, /gh pr view <number> --json state/);
    assert.match(prompt, /stale review result/);
  }
});

test("review guidance and canonical skill don't treat non-coding workflows as out of scope", async () => {
  const guidance = await readFile(
    new URL("../.github/extensions/open-pr-board/review-guidance.md", import.meta.url),
    "utf8",
  );
  const skill = await readFile(
    new URL("../.github/skills/code-review/SKILL.md", import.meta.url),
    "utf8",
  );
  for (const content of [guidance, skill]) {
    assert.match(content, /alone is not a rejection\s+reason|alone is not a reason to reject/);
    assert.match(content, /image, video/);
    assert.match(content, /knowledge uplift/);
    assert.match(content, /responsible use/);
    assert.match(content, /validation appropriate to the workflow|workflow-appropriate validation/);
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
