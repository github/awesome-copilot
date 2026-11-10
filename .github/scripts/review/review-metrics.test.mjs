import assert from "node:assert/strict";
import test from "node:test";

import {
  businessDaysBetween,
  collectData,
  computeMetrics,
  concentration,
  loadMetricsConfig,
  normalizeConfig,
  parseArgs,
  percentile,
  renderReport,
  renderTrackingBody,
  TRACKING_MARKER,
} from "./review-metrics.mjs";

test("business days skip weekends and count partial weekdays", () => {
  // 2025-01-03 is a Friday.
  assert.equal(businessDaysBetween("2025-01-03T00:00:00Z", "2025-01-06T00:00:00Z"), 1);
  assert.equal(businessDaysBetween("2025-01-04T00:00:00Z", "2025-01-06T00:00:00Z"), 0);
  assert.equal(businessDaysBetween("2025-01-03T12:00:00Z", "2025-01-06T12:00:00Z"), 1);
  assert.equal(businessDaysBetween("2025-01-06T00:00:00Z", "2025-01-13T00:00:00Z"), 5);
  assert.equal(businessDaysBetween("2025-01-06T00:00:00Z", "2025-01-06T06:00:00Z"), 0.25);
  assert.equal(businessDaysBetween("2025-01-06T00:00:00Z", "2025-01-05T00:00:00Z"), 0);
});

test("percentiles interpolate linearly and ignore invalid values", () => {
  assert.equal(percentile([], 50), null);
  assert.equal(percentile([5], 90), 5);
  assert.equal(percentile([1, 2, 3, 4], 50), 2.5);
  assert.equal(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 90), 9.1);
  assert.equal(percentile([3, NaN, 1, 2], 50), 2);
});

test("reviewer concentration reports top share and HHI", () => {
  assert.deepEqual(concentration({}), { total: 0, reviewers: 0, top_share: null, hhi: null, effective_reviewers: null });
  const single = concentration({ a: 4 });
  assert.equal(single.hhi, 10000);
  assert.equal(single.top_share, 1);
  const even = concentration({ a: 5, b: 5, c: 5, d: 5 });
  assert.equal(even.hhi, 2500);
  assert.equal(even.top_share, 0.25);
  assert.equal(even.effective_reviewers, 4);
});

const config = normalizeConfig({ automation_workflows: ["a.yml", "missing.yml"] });
const now = "2025-01-10T12:00:00Z"; // Friday
const maintainer = (login, submittedAt, state = "APPROVED") => ({ state, submittedAt, authorCanPushToRepository: true, author: { login, type: "User" } });

function fixture() {
  return {
    openPrs: [
      { number: 1, title: "Waiting a while", url: "u1", createdAt: "2025-01-03T12:00:00Z", isDraft: false, author: { login: "alice", type: "User" }, labels: ["ready-for-review", "merge-risk:low"], reviews: [] },
      { number: 2, title: "Needs fixes", url: "u2", createdAt: "2025-01-02T12:00:00Z", isDraft: false, author: { login: "bob", type: "User" }, labels: ["requires-submitter-fixes"], reviews: [] },
      { number: 3, title: "Reviewed", url: "u3", createdAt: "2025-01-02T12:00:00Z", isDraft: false, author: { login: "carol", type: "User" }, labels: [], reviews: [maintainer("m1", "2025-01-06T12:00:00Z", "COMMENTED")] },
      { number: 4, title: "Draft", url: "u4", createdAt: "2025-01-09T12:00:00Z", isDraft: true, author: { login: "dave", type: "User" }, labels: [], reviews: [] },
      { number: 5, title: "Bot PR", url: "u5", createdAt: "2025-01-09T12:00:00Z", isDraft: false, author: { login: "github-actions", type: "Bot" }, labels: [], reviews: [] },
      { number: 6, title: "Fresh", url: "u6", createdAt: "2025-01-09T12:00:00Z", isDraft: false, author: { login: "erin", type: "User" }, labels: ["merge-risk:high"], reviews: [] },
    ],
    windowPrs: [
      { number: 10, createdAt: "2025-01-06T00:00:00Z", mergedAt: "2025-01-07T00:00:00Z", author: { login: "x", type: "User" }, labels: [], reviews: [maintainer("m1", "2025-01-06T02:00:00Z"), maintainer("m1", "2025-01-06T05:00:00Z")] },
      { number: 11, createdAt: "2025-01-06T00:00:00Z", mergedAt: "2025-01-09T00:00:00Z", author: { login: "y", type: "User" }, labels: [], reviews: [maintainer("m2", "2025-01-06T10:00:00Z"), maintainer("y", "2025-01-06T01:00:00Z"), { ...maintainer("bot", "2025-01-06T00:30:00Z"), author: { login: "copilot", type: "Bot" } }] },
      { number: 12, createdAt: "2024-12-01T00:00:00Z", mergedAt: null, author: { login: "z", type: "User" }, labels: [], reviews: [maintainer("m1", "2024-12-02T00:00:00Z")] },
      { number: 13, createdAt: "2025-01-08T00:00:00Z", mergedAt: null, author: { login: "w", type: "User" }, labels: [], reviews: [{ ...maintainer("drive-by", "2025-01-08T01:00:00Z"), authorCanPushToRepository: false }] },
    ],
    externalPluginIssues: [
      { number: 20, title: "Plugin", url: "i20", createdAt: "2024-12-20T00:00:00Z", readyAt: "2025-01-03T00:00:00Z", labels: ["external-plugin", "ready-for-review"] },
      { number: 21, title: "Plugin fixes", url: "i21", createdAt: "2024-12-20T00:00:00Z", labels: ["external-plugin", "requires-submitter-fixes"] },
    ],
    workflowRuns: [
      {
        file: "a.yml",
        found: true,
        name: "A",
        runs: [
          { status: "completed", conclusion: "success", created_at: "2025-01-08T00:00:00Z" },
          { status: "completed", conclusion: "failure", created_at: "2025-01-08T00:00:00Z" },
          { status: "completed", conclusion: "startup_failure", created_at: "2025-01-08T00:00:00Z" },
          { status: "completed", conclusion: "cancelled", created_at: "2025-01-08T00:00:00Z" },
          { status: "completed", conclusion: "skipped", created_at: "2025-01-08T00:00:00Z" },
          { status: "in_progress", conclusion: null, created_at: "2025-01-08T00:00:00Z" },
          { status: "completed", conclusion: "failure", created_at: "2024-12-01T00:00:00Z" },
        ],
      },
      { file: "missing.yml", found: false, runs: [] },
    ],
  };
}

test("computes open contribution breakdowns with graceful label fallbacks", () => {
  const metrics = computeMetrics(fixture(), config, { now });
  const prs = metrics.open.pull_requests;
  assert.equal(prs.total, 5, "bot PRs are excluded");
  assert.equal(prs.drafts, 1);
  assert.equal(prs.automation_authored_excluded, 1);
  assert.equal(prs.by_state["ready-for-review"], 1);
  assert.equal(prs.by_state["requires-submitter-fixes"], 1);
  assert.equal(prs.by_state.unlabeled, 2);
  assert.equal(prs.by_risk["merge-risk:low"], 1);
  assert.equal(prs.by_risk["merge-risk:high"], 1);
  assert.equal(prs.by_risk.unclassified, 2);
  assert.equal(metrics.open.external_plugin_issues.by_state["ready-for-review"], 1);
});

test("computes review speed, maintainer load, and concentration", () => {
  const metrics = computeMetrics(fixture(), config, { now });
  // First maintainer reviews in window: #10 after 2h, #11 after 10h. Author, bot,
  // and non-maintainer reviews (#13) are ignored.
  assert.equal(metrics.time_to_first_review.count, 2);
  assert.equal(metrics.time_to_first_review.median_hours, 6);
  assert.equal(metrics.time_to_merge.count, 2);
  assert.equal(metrics.time_to_merge.median_hours, 48);
  assert.deepEqual(
    metrics.reviews_per_maintainer.map((item) => [item.login, item.pull_requests, item.reviews]),
    [["m1", 1, 2], ["m2", 1, 1]],
  );
  assert.equal(metrics.reviewer_concentration.top_share, 0.5);
  assert.equal(metrics.reviewer_concentration.hhi, 5000);
});

test("flags items past business-day targets", () => {
  const metrics = computeMetrics(fixture(), config, { now });
  // #1 waits 5 business days, #6 waits 1, issue #20 waits 5.5; #2 needs submitter fixes; #3 was reviewed.
  assert.deepEqual(metrics.overdue["2"].items.map((item) => `${item.kind}#${item.number}`), ["issue#20", "pr#1"]);
  assert.equal(metrics.overdue["4"].count, 2);
});

test("computes automation failure rate over completed, non-cancelled runs", () => {
  const metrics = computeMetrics(fixture(), config, { now });
  assert.equal(metrics.automation.runs, 3);
  assert.equal(metrics.automation.failed, 2);
  assert.equal(metrics.automation.failure_rate, 0.667);
  assert.equal(metrics.automation.workflows[1].found, false);
});

test("automation API errors are reported as incomplete instead of not found", () => {
  const data = fixture();
  data.workflowRuns.push({ file: "error.yml", found: true, runs: [], error: "server unavailable" });
  const metrics = computeMetrics(data, config, { now });
  assert.equal(metrics.automation.incomplete, true);
  assert.deepEqual(metrics.automation.errors, [{ workflow: "error.yml", error: "server unavailable" }]);
  assert.equal(metrics.automation.runs, 3);
  assert.equal(metrics.automation.failed, 2);
  assert.equal(metrics.automation.failure_rate, 0.667);
  const report = renderReport(metrics, {});
  assert.match(report, /Failure rate: \*\*66\.7% \(incomplete\)\*\*/);
  assert.match(report, /`error\.yml` \| – \| – \| collection error: server unavailable/);
});

test("collectData paginates PR reviews beyond the first 100", async () => {
  const pageOneReviews = Array.from({ length: 100 }, (_, index) => maintainer(`m${index}`, "2025-01-06T01:00:00Z"));
  const pageTwoReview = maintainer("last", "2025-01-06T02:00:00Z");
  const client = {
    graphql: async (query) => {
      if (query.includes("search(")) {
        return {
          search: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [{
              id: "PR_1",
              number: 1,
              title: "Many reviews",
              url: "https://example.test/pull/1",
              createdAt: "2025-01-06T00:00:00Z",
              mergedAt: null,
              isDraft: false,
              author: { login: "author", __typename: "User" },
              labels: { nodes: [] },
              reviews: { pageInfo: { hasNextPage: true, endCursor: "page-1" }, nodes: [...pageOneReviews] },
              timelineItems: { nodes: [] },
            }],
          },
        };
      }
      assert.match(query, /node\(id: \$id\)/);
      return {
        node: {
          reviews: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [pageTwoReview] },
        },
      };
    },
    request: async () => { throw new Error("request should not be called"); },
    paginate: async () => { throw new Error("paginate should not be called"); },
  };
  const data = await collectData(client, { owner: "o", repo: "r" }, normalizeConfig({ automation_workflows: [], external_plugin_label: "" }), { now });
  assert.equal(data.openPrs[0].reviews.length, 101);
  assert.equal(data.windowPrs[0].reviews.length, 101);
  assert.equal(data.windowPrs[0].reviews[100].author.login, "last");
});

test("collectData paginates external plugin issue label events", async () => {
  let searchCalls = 0;
  const client = {
    graphql: async (query, variables) => {
      if (query.includes("search(")) {
        searchCalls++;
        if (searchCalls <= 2) {
          return { search: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [] } };
        }
        return {
          search: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [{
              id: "ISSUE_1",
              number: 42,
              title: "Long-lived plugin",
              url: "https://example.test/issues/42",
              createdAt: "2024-01-01T00:00:00Z",
              labels: { nodes: [{ name: "external-plugin" }, { name: "ready-for-review" }] },
              timelineItems: {
                pageInfo: { hasPreviousPage: true, startCursor: "recent-page" },
                nodes: [{ createdAt: "2025-01-09T00:00:00Z", label: { name: "triage" } }],
              },
            }],
          },
        };
      }
      assert.equal(variables.id, "ISSUE_1");
      assert.equal(variables.cursor, "recent-page");
      return {
        node: {
          timelineItems: {
            pageInfo: { hasPreviousPage: false, startCursor: null },
            nodes: [{ createdAt: "2025-01-03T00:00:00Z", label: { name: "ready-for-review" } }],
          },
        },
      };
    },
    request: async () => { throw new Error("request should not be called"); },
    paginate: async () => { throw new Error("paginate should not be called"); },
  };
  const data = await collectData(
    client,
    { owner: "o", repo: "r" },
    normalizeConfig({ automation_workflows: [], external_plugin_label: "external-plugin" }),
    { now },
  );
  assert.equal(data.externalPluginIssues[0].readyAt, "2025-01-03T00:00:00Z");
});

test("handles an empty repository without errors", () => {
  const metrics = computeMetrics({}, config, { now });
  assert.equal(metrics.time_to_first_review.median_hours, null);
  assert.equal(metrics.automation.failure_rate, null);
  const report = renderReport(metrics, {});
  assert.match(report, /No maintainer reviews/);
  assert.match(report, /n\/a/);
});

test("renders a report and tracking issue body", () => {
  const metrics = computeMetrics(fixture(), config, { now });
  const report = renderReport(metrics, { repository: "o/r", runUrl: "https://example.test/run" });
  assert.match(report, /Review operating metrics — week ending 2025-01-10/);
  assert.match(report, /Time to first review \| 2 \| 6 h/);
  assert.match(report, /HHI: \*\*5000\*\*/);
  assert.match(report, /`missing.yml` \| – \| – \| not found/);
  assert.match(report, /@\u200bm1/, "mentions are neutralized");
  assert.ok(renderTrackingBody(report).startsWith(TRACKING_MARKER));
});

test("config and CLI parsing", () => {
  const loaded = loadMetricsConfig();
  assert.equal(loaded.window_days, 7);
  assert.deepEqual(loaded.targets_business_days, [2, 4]);
  assert.ok(loaded.automation_workflows.includes("canvas-smoke-test.yml"));
  assert.equal(loadMetricsConfig("does-not-exist.yml").tracking_issue.label, "review-metrics");

  const options = parseArgs(["--repo", "o/r", "--dry-run", "--now", "2025-01-10T00:00:00Z", "--window-days", "14"]);
  assert.equal(options.dryRun, true);
  assert.equal(options.windowDays, 14);
  assert.equal(options.now.toISOString(), "2025-01-10T00:00:00.000Z");
  assert.throws(() => parseArgs(["--now", "nope"]), /ISO date/);
  assert.throws(() => parseArgs(["--bogus"]), /Unknown argument/);
});

test("time to first review ignores reviews submitted before the PR was ready", () => {
  const data = {
    openPrs: [],
    externalPluginIssues: [],
    workflowRuns: [],
    windowPrs: [
      {
        number: 30,
        createdAt: "2025-01-06T00:00:00Z",
        readyForReviewAt: "2025-01-07T00:00:00Z",
        mergedAt: null,
        author: { login: "x", type: "User" },
        labels: [],
        reviews: [maintainer("m1", "2025-01-06T01:00:00Z", "COMMENTED"), maintainer("m2", "2025-01-07T04:00:00Z")],
      },
    ],
  };
  const metrics = computeMetrics(data, config, { now });
  assert.equal(metrics.time_to_first_review.count, 1);
  assert.equal(metrics.time_to_first_review.median_hours, 4);
});