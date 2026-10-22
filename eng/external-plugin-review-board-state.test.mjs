import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  BoardStore,
  effectiveColumn,
  isReadyForApproval,
  reviewBlockedReason,
} from "../.github/extensions/external-plugin-review-board/lib/state.mjs";

function issue(number, labels = []) {
  return {
    number,
    title: `[External Plugin]: Example ${number}`,
    author: "contributor",
    url: `https://github.com/github/awesome-copilot/issues/${number}`,
    labels: ["external-plugin", "ready-for-review", ...labels],
  };
}

async function createStore(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "epr-board-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return new BoardStore(path.join(dir, "board.json"), "github/awesome-copilot");
}

test("first-party submissions are fast-tracked to accept on refresh", async (t) => {
  const store = await createStore(t);
  const result = await store.syncIssues([issue(1, ["first party"]), issue(2, ["third party"]), issue(3)]);

  assert.deepEqual(result.fastTracked, [1]);
  const first = store.getItem(1);
  assert.equal(effectiveColumn(first), "accept");
  assert.equal(first.reviewStatus, "reviewed");
  assert.equal(first.review.fastTracked, true);
  assert.equal(first.review.suggestedComment, "/approve");
  assert.equal(effectiveColumn(store.getItem(2)), "unreviewed");
  assert.equal(effectiveColumn(store.getItem(3)), "unreviewed");
  assert.deepEqual(store.pendingReview().map((item) => item.number).sort(), [2, 3]);
});

test("first-party submissions are not fast-tracked while intake is pending", async (t) => {
  const store = await createStore(t);
  const pendingIssue = issue(1, ["first party", "awaiting-review"]);
  await store.syncIssues([pendingIssue]);

  const item = store.getItem(1);
  assert.equal(item.review, null);
  assert.equal(item.reviewStatus, "unreviewed");
  assert.equal(effectiveColumn(item), "unreviewed");
});

test("first-party submissions are not fast-tracked in other pending intake states", async (t) => {
  const store = await createStore(t);
  const pendingIssue = issue(1, ["first party", "requires-submitter-fixes"]);
  await store.syncIssues([pendingIssue]);

  const item = store.getItem(1);
  assert.equal(item.review, null);
  assert.equal(item.reviewStatus, "unreviewed");
  assert.equal(effectiveColumn(item), "unreviewed");
});

test("manually overridden first-party submissions are never fast-tracked", async (t) => {
  const store = await createStore(t);
  const overriddenIssue = issue(1, ["first party", "intake-manually-overridden"]);
  await store.syncIssues([overriddenIssue]);

  const item = store.getItem(1);
  assert.equal(item.review, null);
  assert.equal(item.reviewStatus, "unreviewed");
  assert.equal(effectiveColumn(item), "unreviewed");

  await store.syncIssues([issue(1, ["first party", "intake-manually-overridden"])]);
  assert.equal(store.getItem(1).review, null);

  const validationPassed = await store.syncIssues([issue(1, ["first party"])]);
  assert.deepEqual(validationPassed.fastTracked, [1]);
  assert.equal(store.getItem(1).review.fastTracked, true);
});

test("a manual override clears an existing synthetic first-party fast-track", async (t) => {
  const store = await createStore(t);
  await store.syncIssues([issue(1, ["first party"])]);

  const result = await store.syncIssues([issue(1, ["first party", "intake-manually-overridden"])]);

  assert.deepEqual(result.fastTracked, []);
  assert.equal(store.getItem(1).review, null);
  assert.equal(store.getItem(1).reviewStatus, "unreviewed");
  assert.equal(effectiveColumn(store.getItem(1)), "unreviewed");
});

test("approval requires ready status and no pending intake label", () => {
  assert.equal(isReadyForApproval(["external-plugin", "ready-for-review"]), true);
  assert.equal(isReadyForApproval(["external-plugin", "ready-for-review", "awaiting-review"]), false);
  assert.equal(
    isReadyForApproval(["external-plugin", "ready-for-review", "requires-submitter-fixes"]),
    false,
  );
  assert.equal(isReadyForApproval(["external-plugin", "rejected"]), false);
});

test("blocked reasons match eligibility, including conflicting labels and missing labels", () => {
  for (const [labels, expected] of [
    [[], /Missing ready-for-review/],
    [["awaiting-review"], /Automated intake is pending/],
    [["requires-submitter-fixes"], /Submitter fixes required/],
    [["ready-for-review", "awaiting-review"], /Automated intake is pending/],
    [["ready-for-review", "awaiting-review", "requires-submitter-fixes"], /Submitter fixes required/],
  ]) {
    assert.equal(isReadyForApproval(labels), false);
    assert.match(reviewBlockedReason(labels), expected);
  }
  assert.equal(reviewBlockedReason(["ready-for-review"]), null);
  assert.match(reviewBlockedReason(), /Missing ready-for-review/);
});

test("pending intake cards stay visible but become review-eligible only when ready", () => {
  const store = new BoardStore("unused", "github/awesome-copilot");
  const existingReview = { recommendation: "needs-review", rationale: "Keep this review." };
  const queuedReview = { recommendation: "accept", rationale: "Keep the queued card's prior review." };
  store.state.items = {
    1: { number: 1, labels: ["external-plugin", "awaiting-review"], reviewStatus: "unreviewed" },
    2: {
      number: 2,
      labels: ["external-plugin", "requires-submitter-fixes"],
      reviewStatus: "reviewed",
      review: existingReview,
    },
    3: { number: 3, labels: ["external-plugin", "ready-for-review"], reviewStatus: "unreviewed" },
    4: {
      number: 4,
      labels: ["external-plugin", "awaiting-review"],
      reviewStatus: "queued",
      review: queuedReview,
      queueId: "queued-review",
    },
  };

  const pendingSnapshot = store.snapshot();
  assert.deepEqual(pendingSnapshot.items.map((item) => item.number), [4, 3, 2, 1]);
  assert.deepEqual(
    pendingSnapshot.items.filter((item) => item.reviewEligible).map((item) => item.number),
    [3],
  );
  assert.deepEqual(store.pendingReview().map((item) => item.number), [3]);
  assert.deepEqual(store.pendingReview([1, 2, 3, 4]).map((item) => item.number), [3]);
  assert.match(pendingSnapshot.items.find((item) => item.number === 2).reviewBlockedReason, /Submitter fixes required/);
  assert.equal(pendingSnapshot.items.find((item) => item.number === 3).reviewBlockedReason, null);

  store.getItem(1).labels = ["external-plugin", "ready-for-review"];
  store.getItem(2).labels = ["external-plugin", "ready-for-review"];
  store.getItem(4).labels = ["external-plugin", "ready-for-review"];

  assert.deepEqual(store.pendingReview().map((item) => item.number), [1, 3]);
  assert.equal(store.getItem(2).review, existingReview);
  assert.equal(store.getItem(2).reviewStatus, "reviewed");
  assert.equal(store.getItem(4).review, queuedReview);
  assert.equal(store.getItem(4).reviewStatus, "queued");
  assert.equal(store.getItem(4).queueId, "queued-review");
  assert.ok(store.snapshot().items.every((item) => item.reviewBlockedReason === null));
});

test("first-party submissions are not fast-tracked without a ready-for-review label", async (t) => {
  const store = await createStore(t);
  const pendingIssue = issue(1, ["first party"]);
  pendingIssue.labels = pendingIssue.labels.filter((label) => label !== "ready-for-review");

  await store.syncIssues([pendingIssue]);

  const item = store.getItem(1);
  assert.equal(item.review, null);
  assert.equal(item.reviewStatus, "unreviewed");
});

test("an existing first-party fast-track is cleared while intake is pending", async (t) => {
  const store = await createStore(t);
  await store.syncIssues([issue(1, ["first party"])]);
  const pendingIssue = issue(1, ["first party", "awaiting-review"]);
  pendingIssue.labels = pendingIssue.labels.filter((label) => label !== "ready-for-review");

  await store.syncIssues([pendingIssue]);

  const item = store.getItem(1);
  assert.equal(item.review, null);
  assert.equal(item.reviewStatus, "unreviewed");
  assert.equal(effectiveColumn(item), "unreviewed");
});

test("fast-track applies when an existing card gains the first party label", async (t) => {
  const store = await createStore(t);
  await store.syncIssues([issue(1)]);
  const result = await store.syncIssues([issue(1, ["first party"])]);

  assert.deepEqual(result.fastTracked, [1]);
  assert.equal(effectiveColumn(store.getItem(1)), "accept");
});

test("removing the first-party label clears the synthetic fast-track", async (t) => {
  const store = await createStore(t);
  await store.syncIssues([issue(1, ["first party"])]);

  await store.syncIssues([issue(1, ["third party"])]);

  const item = store.getItem(1);
  assert.equal(item.review, null);
  assert.equal(item.reviewStatus, "unreviewed");
  assert.equal(effectiveColumn(item), "unreviewed");
  assert.deepEqual(store.pendingReview().map((pending) => pending.number), [1]);
});

test("removing the first-party label preserves decisions, manual buckets, and queued re-reviews", async (t) => {
  const store = await createStore(t);
  await store.syncIssues([
    issue(1, ["first party"]),
    issue(2, ["first party"]),
    issue(3, ["first party"]),
  ]);
  await store.recordDecision(1, { kind: "approve", at: new Date().toISOString() });
  await store.moveItem(2, "probably-reject");
  await store.markQueued([3], { rereviewGuidance: "Re-check the submission." });
  const queued = store.getItem(3);
  const queueId = queued.queueId;
  const queuedReview = queued.review;

  await store.syncIssues([issue(1, ["third party"]), issue(2, ["third party"]), issue(3, ["third party"])]);

  assert.equal(store.getItem(1).review, null);
  assert.equal(store.getItem(1).decision.kind, "approve");
  assert.equal(effectiveColumn(store.getItem(1)), "actioned");
  assert.equal(store.getItem(2).review, null);
  assert.equal(store.getItem(2).manualColumn, "probably-reject");
  assert.equal(effectiveColumn(store.getItem(2)), "probably-reject");
  assert.equal(store.getItem(3).reviewStatus, "queued");
  assert.equal(store.getItem(3).queueId, queueId);
  assert.equal(store.getItem(3).rereviewGuidance, "Re-check the submission.");
  assert.deepEqual(store.getItem(3).review, queuedReview);
});

test("pending intake refreshes preserve review, manual, queued, and fast-track dismissal state", async (t) => {
  const store = await createStore(t);
  await store.syncIssues([
    issue(1),
    issue(2),
    issue(3),
    issue(4, ["first party"]),
  ]);

  const aiReview = { recommendation: "needs-review", rationale: "Keep this review." };
  store.getItem(1).review = aiReview;
  store.getItem(1).reviewStatus = "reviewed";
  await store.moveItem(2, "probably-reject");
  await store.markQueued([3], { rereviewGuidance: "Re-check this submission." });
  await store.moveItem(4, "unreviewed");

  await store.syncIssues([
    issue(1, ["awaiting-review"]),
    issue(2, ["requires-submitter-fixes"]),
    issue(3, ["awaiting-review"]),
    issue(4, ["first party", "requires-submitter-fixes"]),
  ]);

  assert.deepEqual(store.getItem(1).review, aiReview);
  assert.equal(store.getItem(2).manualColumn, "probably-reject");
  assert.equal(store.getItem(3).reviewStatus, "queued");
  assert.equal(store.getItem(3).rereviewGuidance, "Re-check this submission.");
  assert.equal(store.getItem(4).fastTrackDismissed, true);

  const result = await store.syncIssues([
    issue(1),
    issue(2),
    issue(3),
    issue(4, ["first party"]),
  ]);

  assert.deepEqual(result.fastTracked, []);
  assert.deepEqual(store.getItem(1).review, aiReview);
  assert.equal(store.getItem(2).manualColumn, "probably-reject");
  assert.equal(store.getItem(3).reviewStatus, "queued");
  assert.equal(store.getItem(4).fastTrackDismissed, true);
  assert.equal(store.getItem(4).review, null);
});

test("fast-track does not override an existing review or manual bucket", async (t) => {
  const store = await createStore(t);
  await store.syncIssues([issue(1), issue(2)]);
  store.getItem(1).review = { recommendation: "needs-review", reviewedAt: new Date().toISOString() };
  store.getItem(1).reviewStatus = "reviewed";
  await store.moveItem(2, "probably-reject");

  const result = await store.syncIssues([issue(1, ["first party"]), issue(2, ["first party"])]);

  assert.deepEqual(result.fastTracked, []);
  assert.equal(effectiveColumn(store.getItem(1)), "needs-review");
  assert.equal(effectiveColumn(store.getItem(2)), "probably-reject");
});

test("moving a fast-tracked card to unreviewed opts it out of fast-track", async (t) => {
  const store = await createStore(t);
  await store.syncIssues([issue(1, ["first party"])]);
  await store.moveItem(1, "unreviewed");

  const result = await store.syncIssues([issue(1, ["first party"])]);

  assert.deepEqual(result.fastTracked, []);
  assert.equal(effectiveColumn(store.getItem(1)), "unreviewed");
  assert.deepEqual(store.pendingReview().map((item) => item.number), [1]);
});
