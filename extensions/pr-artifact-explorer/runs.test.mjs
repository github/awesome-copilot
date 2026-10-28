import assert from "node:assert/strict";
import test from "node:test";

import {
  getWorkflowRun,
  listBranches,
  listRunArtifactCounts,
  listWorkflowRuns,
  listWorkflows,
  normalizeBranchQuery,
  normalizeRunFilters,
} from "./github.mjs";
import { prepareRerun } from "./rerun.mjs";

const json = (payload, status = 200) => ({
  headers: { get: () => "application/json" },
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(payload),
});

function mockFetch(t, handler) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    const target = new URL(url);
    calls.push(target);
    return handler(target);
  };
  t.after(() => {
    globalThis.fetch = original;
  });
  return calls;
}

const rawRun = (id, overrides = {}) => ({
  id,
  name: "Nightly",
  display_title: `Nightly ${id}`,
  run_number: id - 100,
  run_attempt: 1,
  event: "schedule",
  status: "completed",
  conclusion: "success",
  head_branch: "main",
  head_sha: "a".repeat(40),
  workflow_id: 7,
  actor: { login: "octo", avatar_url: "https://avatars.githubusercontent.com/u/1" },
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:05:00Z",
  html_url: `https://github.com/o/r/actions/runs/${id}`,
  pull_requests: [],
  ...overrides,
});

test("run filters are normalized and unsafe values are dropped", () => {
  assert.deepEqual(
    normalizeRunFilters({
      event: "Schedule",
      status: "FAILURE",
      branch: "  feature/x\u0000y  ",
      workflow: "ci.yml",
      excludePullRequests: "1",
      page: "3",
    }),
    { event: "schedule", status: "failure", workflow: "ci.yml", branch: "feature/xy", excludePullRequests: true, page: 3 },
  );
  const bad = normalizeRunFilters({ event: "a&b=c", status: "bogus", workflow: "../x", page: "-4" });
  assert.deepEqual(bad, { event: "", status: "", workflow: "", branch: "", excludePullRequests: false, page: 1 });
  assert.equal(normalizeRunFilters({ page: "9999" }).page, 34);
  assert.equal(normalizeRunFilters({ workflow: "12345" }).workflow, "12345");
});

test("listWorkflowRuns queries the repository runs endpoint with filters and maps runs", async (t) => {
  const calls = mockFetch(t, () =>
    json({
      total_count: 61,
      workflow_runs: [rawRun(101, { pull_requests: [{ number: 9 }] }), rawRun(102, { event: "workflow_dispatch" })],
    }),
  );
  const result = await listWorkflowRuns("token", "o/r", {
    event: "schedule",
    status: "success",
    branch: "main",
    excludePullRequests: true,
    page: 2,
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].pathname, "/repos/o/r/actions/runs");
  assert.equal(calls[0].searchParams.get("event"), "schedule");
  assert.equal(calls[0].searchParams.get("status"), "success");
  assert.equal(calls[0].searchParams.get("branch"), "main");
  assert.equal(calls[0].searchParams.has("exclude_pull_requests"), false, "GitHub's flag only empties pull_requests, so it is not used");
  assert.equal(calls[0].searchParams.get("page"), "2");
  assert.equal(calls[0].searchParams.get("per_page"), "30");
  assert.equal(result.totalCount, 61);
  assert.equal(result.page, 2);
  assert.equal(result.hasPrevious, true);
  assert.equal(result.hasMore, true);
  // Run 101 is linked to PR 9, so hiding pull request runs drops it; paging and counts still follow the unfiltered page.
  assert.deepEqual(result.runs.map((run) => run.id), [102]);
  assert.equal(result.scannedCount, 2);
  assert.equal(result.hiddenPullRequestRuns, 1);
  assert.equal(result.totalCount, 61);
  assert.equal(result.runs[0].title, "Nightly 102");
  assert.equal(result.runs[0].branch, "main");
  assert.equal(result.runs[0].actor, "octo");
  assert.deepEqual(result.runs[0].pullRequests, []);
});

test("listWorkflowRuns scopes to a workflow and reports paging limits", async (t) => {
  const calls = mockFetch(t, () => json({ total_count: 5000, workflow_runs: [rawRun(101)] }));
  const result = await listWorkflowRuns("token", "o/r", { workflow: "nightly.yml" });
  assert.equal(calls[0].pathname, "/repos/o/r/actions/workflows/nightly.yml/runs");
  assert.equal(calls[0].searchParams.has("exclude_pull_requests"), false);
  assert.equal(result.hasMore, true);
  assert.equal(result.capped, true);
  assert.equal(result.hasPrevious, false);

  const secondLast = await listWorkflowRuns("token", "o/r", { page: 33 });
  assert.equal(secondLast.hasMore, true, "the final partial page of the 1,000 reachable runs is still reachable");
  const last = await listWorkflowRuns("token", "o/r", { page: 34 });
  assert.equal(last.hasMore, false);
});

test("hiding pull request runs filters by event and linked PRs, and keeps everything when not asked", async (t) => {
  mockFetch(t, () =>
    json({
      total_count: 4,
      workflow_runs: [
        rawRun(101, { event: "pull_request" }),
        rawRun(102, { event: "push", pull_requests: [{ number: 3 }] }),
        rawRun(103, { event: "push" }),
        rawRun(104, { event: "schedule" }),
      ],
    }),
  );
  const hidden = await listWorkflowRuns("token", "o/r", { excludePullRequests: true });
  assert.deepEqual(hidden.runs.map((run) => run.id), [103, 104]);
  assert.equal(hidden.hiddenPullRequestRuns, 2);
  const shown = await listWorkflowRuns("token", "o/r", {});
  assert.equal(shown.runs.length, 4);
  assert.equal(shown.hiddenPullRequestRuns, 0);
  const explicit = await listWorkflowRuns("token", "o/r", { excludePullRequests: true, event: "pull_request" });
  assert.equal(explicit.runs.length, 4, "asking for pull_request runs overrides hiding them");
});

test("listWorkflows exposes a file name or id reference for filtering", async (t) => {
  mockFetch(t, () =>
    json({
      workflows: [
        { id: 1, name: "CI", path: ".github/workflows/ci.yml", state: "active" },
        { id: 2, name: "Copilot", path: "dynamic/copilot-swe-agent/copilot", state: "active" },
        { id: 3, name: "CI Tests", path: ".github/workflows/CI Tests.yml", state: "active" },
      ],
    }),
  );
  const workflows = await listWorkflows("token", "o/r");
  assert.deepEqual(workflows.map((workflow) => workflow.ref), ["ci.yml", "2", "3"]);
  // Every selector must survive the runs filter, otherwise choosing the workflow would silently list all of them.
  for (const workflow of workflows) assert.equal(normalizeRunFilters({ workflow: workflow.ref }).workflow, workflow.ref);
});

test("workflow lists are fetched across pages", async (t) => {
  const page = (start, count) => Array.from({ length: count }, (_, index) => ({ id: start + index, name: `W${start + index}`, path: `.github/workflows/w${start + index}.yml`, state: "active" }));
  const calls = mockFetch(t, (url) => {
    const number = Number(url.searchParams.get("page"));
    return json({ total_count: 130, workflows: number === 1 ? page(1, 100) : number === 2 ? page(101, 30) : [] });
  });
  const workflows = await listWorkflows("token", "o/r");
  assert.equal(workflows.length, 130);
  assert.equal(workflows.at(-1).ref, "w130.yml");
  assert.equal(calls.length, 2);
});

test("getWorkflowRun returns the run and its artifacts in the shared payload shape", async (t) => {
  mockFetch(t, (url) => {
    if (url.pathname === "/repos/o/r/actions/runs/101") return json(rawRun(101));
    if (url.pathname === "/repos/o/r/actions/runs/101/artifacts") {
      return json({
        total_count: 2,
        artifacts: [
          { id: 1, name: "report", size_in_bytes: 10, expired: false, created_at: "2026-10-01T00:01:00Z", updated_at: "2026-10-01T00:01:00Z", expires_at: "2026-12-01T00:00:00Z" },
          { id: 2, name: "logs", size_in_bytes: 20, expired: true, created_at: "2026-10-01T00:02:00Z", updated_at: "2026-10-01T00:02:00Z", expires_at: "2026-10-02T00:00:00Z" },
        ],
      });
    }
    return json({ message: "Not Found" }, 404);
  });
  const payload = await getWorkflowRun("token", "o/r", "101");
  assert.equal(payload.run.id, 101);
  assert.equal(payload.runCount, 1);
  assert.equal(payload.runsTruncated, false);
  assert.deepEqual(payload.artifacts.map((artifact) => artifact.name), ["logs", "report"]);
  assert.equal(payload.artifacts[0].expired, true);
  assert.equal(payload.artifacts[1].run.id, 101);
  assert.equal(payload.artifacts[1].run.event, "schedule");
  assert.equal(payload.artifactCount, 2);
  await assert.rejects(() => getWorkflowRun("token", "o/r", "nope"), /positive integer/);
});

test("artifact counts are bounded, tolerate per-run failures and never throw for GitHub errors", async (t) => {
  const calls = mockFetch(t, (url) => {
    if (url.pathname.includes("/runs/3/")) return json({ message: "Not Found" }, 404);
    return json({ total_count: url.pathname.includes("/runs/2/") ? 0 : 4, artifacts: [] });
  });
  const counts = await listRunArtifactCounts("token", "o/r", [1, 2, 3, 1, "x", -5]);
  assert.deepEqual(counts, { 1: 4, 2: 0, 3: null });
  assert.equal(calls.length, 3);
  assert.ok(calls.every((call) => call.searchParams.get("per_page") === "1"));

  const many = await listRunArtifactCounts("token", "o/r", Array.from({ length: 80 }, (_, index) => index + 1));
  assert.equal(Object.keys(many).length, 30);
});

test("branch suggestions list the default branch first and match by prefix", async (t) => {
  const calls = mockFetch(t, (url) => {
    if (url.pathname === "/repos/o/r") return json({ default_branch: "main" });
    if (url.pathname === "/repos/o/r/branches") {
      return json([{ name: "alpha", protected: false }, { name: "main", protected: true }, { name: "zeta", protected: false }]);
    }
    if (url.pathname === "/repos/o/r/git/matching-refs/heads/release/1") {
      return json([{ ref: "refs/heads/release/1.0" }, { ref: "refs/heads/release/1.1" }]);
    }
    if (url.pathname.startsWith("/repos/o/r/git/matching-refs/heads/nope")) return json({ message: "Not Found" }, 404);
    return json({ message: "unexpected" }, 500);
  });
  const listed = await listBranches("token", "o/r");
  assert.deepEqual(listed.branches.map((branch) => branch.name), ["main", "alpha", "zeta"]);
  assert.equal(listed.branches[0].isDefault, true);
  assert.equal(listed.branches[0].protected, true);
  assert.equal(listed.defaultBranch, "main");

  const matched = await listBranches("token", "o/r", " release/1 ");
  assert.deepEqual(matched.branches.map((branch) => branch.name), ["release/1.0", "release/1.1"]);
  assert.equal(calls.at(-1).searchParams.get("per_page"), "30");

  assert.deepEqual((await listBranches("token", "o/r", "nope")).branches, []);
});

test("branch queries that could traverse the API path are rejected without a request", async (t) => {
  const calls = mockFetch(t, () => json([]));
  for (const query of ["../x", "a/../b", "./x", "a/./b", "..", "x\u0000y/../z"]) {
    assert.deepEqual(await listBranches("token", "o/r", query), { branches: [], defaultBranch: null }, query);
  }
  assert.equal(normalizeBranchQuery("  feature/x \u0007"), "feature/x");
  assert.equal(normalizeBranchQuery("a".repeat(300)).length, 100);
  await listBranches("token", "o/r", "my branch/é#?");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].pathname, "/repos/o/r/git/matching-refs/heads/my%20branch/%C3%A9%23%3F");
});

test("re-run context works for a run that has no pull request or artifact", async (t) => {
  mockFetch(t, (url) => {
    if (url.pathname === "/repos/o/r/actions/runs/101") return json({ ...rawRun(101), created_at: new Date().toISOString(), repository: { full_name: "o/r" } });
    if (url.pathname === "/repos/o/r") return json({ permissions: { push: true } });
    return json({ message: "unexpected" }, 500);
  });
  const context = await prepareRerun("token", { repository: "o/r", runId: 101, artifactId: null, pullNumber: null });
  assert.equal(context.run.event, "schedule");
  assert.equal(context.eligible, true);
  assert.equal(context.pullHeadSha, null);
  assert.equal(context.newerHead, false);
});
