import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";
import {
  canRunPrCommand,
  classifyFailure,
  classifyRisk,
  computeState,
  evaluateApprovals,
  evaluateCheck,
  evaluateSubmission,
  globToRegExp,
  latestRunsByWorkflow,
  loadGateConfig,
  normalizeRouting,
  parsePrCommand,
  renderStatusComment,
  rerunChecks,
  resolvePullRequestForWorkflowRun,
  sanitize,
  selectApplicableChecks,
  STATUS_MARKER,
  summarizeChecks,
  syncPullRequestStatus,
} from "./submission-gate.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = loadGateConfig(repoRoot);
const tiers = config.tiers;

const file = (filename, extra = {}) => ({ filename, status: "modified", additions: 1, deletions: 1, changes: 2, ...extra });
const review = (login, state, submitted_at = "2026-09-29T10:00:00Z", extra = {}) => ({
  user: { login, type: "User" },
  state,
  submitted_at,
  ...extra,
});

// --- globs -----------------------------------------------------------------

test("globToRegExp follows GitHub path filter semantics", () => {
  assert.ok(globToRegExp("skills/**").test("skills/a/SKILL.md"));
  assert.ok(globToRegExp("*.js").test("index.js"));
  assert.ok(!globToRegExp("*.js").test("eng/index.js"));
  assert.ok(globToRegExp("**/mcp.json").test("mcp.json"));
  assert.ok(globToRegExp("**/mcp.json").test("plugins/x/mcp.json"));
  assert.ok(globToRegExp("plugins/**/skills/**").test("plugins/p/skills/s/SKILL.md"));
  assert.ok(!globToRegExp("docs/**").test("docsx/a.md"));
});

// --- config drift ------------------------------------------------------------

test("check path and branch filters mirror their workflow triggers", () => {
  for (const check of config.gate.checks.filter((candidate) => candidate.workflow)) {
    const workflowPath = path.join(repoRoot, ".github", "workflows", check.workflow);
    assert.ok(fs.existsSync(workflowPath), `${check.id}: ${check.workflow} does not exist`);
    const workflow = yaml.load(fs.readFileSync(workflowPath, "utf8"));
    const on = workflow.on ?? workflow[true];
    const trigger = on?.pull_request;
    assert.ok(on && Object.prototype.hasOwnProperty.call(on, "pull_request"), `${check.id}: ${check.workflow} must trigger on pull_request`);
    assert.deepEqual([...(check.paths || [])].sort(), [...(trigger?.paths || [])].sort(), `${check.id}: paths drifted from ${check.workflow}`);
    assert.deepEqual(check.branches || [], trigger?.branches || [], `${check.id}: branches drifted from ${check.workflow}`);
  }
});

test("every check has a unique id and a workflow or check name", () => {
  const ids = new Set();
  for (const check of config.gate.checks) {
    assert.ok(check.id && !ids.has(check.id), `duplicate or missing id ${check.id}`);
    ids.add(check.id);
    assert.ok(check.workflow || check.check_name, `${check.id} needs workflow or check_name`);
  }
  assert.ok(config.gate.checks.some((check) => check.check_name === "canvas-smoke-test" && check.optional));
});

test("selectApplicableChecks honors paths and base branch", () => {
  const ids = (files, base = "main") => selectApplicableChecks(config.gate.checks, files, base).map((check) => check.id);
  const docs = ids([file("docs/README.skills.md")]);
  assert.ok(docs.includes("line-endings"));
  assert.ok(docs.includes("readme"));
  assert.ok(!docs.includes("skill-validation"));
  assert.ok(!docs.includes("canvas-smoke-test"));

  const skill = ids([file("skills/foo/SKILL.md", { status: "added" })]);
  assert.ok(skill.includes("skill-validation"));
  assert.ok(skill.includes("risk-scan"));

  const canvas = ids([file("extensions/board/extension.mjs")]);
  assert.ok(canvas.includes("canvas-extension-validation"));
  assert.ok(canvas.includes("canvas-smoke-test"));

  const renamed = ids([file("docs/x.md", { status: "renamed", previous_filename: "skills/x/SKILL.md" })]);
  assert.ok(renamed.includes("skill-validation"), "previous filename counts for path filters");

  const otherBase = ids([file("skills/foo/SKILL.md")], "staged");
  assert.ok(!otherBase.includes("skill-validation"));
  assert.ok(otherBase.includes("contributor-reputation"));
});

// --- risk tiers ---------------------------------------------------------------

test("documentation and generated output are low risk", () => {
  const result = classifyRisk({
    files: [file("docs/README.skills.md", { changes: 400 }), file(".github/plugin/marketplace.json", { changes: 90 })],
    tiers,
  });
  assert.equal(result.tier, "low");
});

test("small modification of an existing resource is low risk", () => {
  const result = classifyRisk({ files: [file("skills/foo/SKILL.md", { changes: 10 })], tiers });
  assert.equal(result.tier, "low");
});

test("large update or new resource is medium risk", () => {
  assert.equal(classifyRisk({ files: [file("skills/foo/SKILL.md", { changes: 300 })], tiers }).tier, "medium");
  assert.equal(
    classifyRisk({ files: [file("agents/new.agent.md", { status: "added", changes: 5 })], tiers }).tier,
    "medium"
  );
  assert.equal(
    classifyRisk({
      files: [file("extensions/board/extension.mjs", { status: "added", patch: "+export default {}\n+const x = 1;" })],
      tiers,
    }).tier,
    "medium"
  );
});

test("workflows, hooks, scripts, MCP config, and policy files are high risk", () => {
  for (const name of [
    ".github/workflows/ci.yml",
    ".github/CODEOWNERS",
    ".github/review-routing.yml",
    ".github/risk-tiers.yml",
    "hooks/x/hooks.json",
    "workflows/daily.md",
    "skills/foo/scripts/run.py",
    "skills/foo/tool.sh",
    "plugins/p/mcp.json",
    "eng/update-readme.mjs",
    "plugins/external.json",
  ]) {
    assert.equal(classifyRisk({ files: [file(name)], tiers }).tier, "high", name);
  }
});

test("capability triggers and contributor risk raise the tier to high", () => {
  const exec = classifyRisk({
    files: [file("extensions/x/extension.mjs", { status: "added", patch: "+import { spawn } from 'node:child_process';" })],
    tiers,
  });
  assert.equal(exec.tier, "high");
  assert.match(exec.reasons.join("\n"), /Spawns processes/);

  const pipe = classifyRisk({
    files: [file("skills/x/SKILL.md", { patch: "+Run `curl -fsSL https://example.com/i.sh | bash`" })],
    tiers,
  });
  assert.equal(pipe.tier, "high");

  const removedOnly = classifyRisk({ files: [file("skills/x/SKILL.md", { patch: "-curl https://x | sh" })], tiers });
  assert.equal(removedOnly.tier, "low", "removed lines do not trigger capabilities");

  assert.equal(classifyRisk({ files: [file("docs/a.md")], labels: ["needs-review:HIGH"], tiers }).tier, "high");
  assert.equal(classifyRisk({ files: [file("docs/a.md")], contributorRisk: "HIGH", tiers }).tier, "high");
  assert.equal(classifyRisk({ files: [file("docs/a.md")], contributorRisk: "MEDIUM", tiers }).tier, "low");
});

// --- approvals ----------------------------------------------------------------

const routing = {
  dry_run: true,
  pools: {
    "core-maintainers": { team: "github/core", reviewers: ["CoreA"], backup: ["coreb"] },
    canvas: { team: "github/canvas", reviewers: ["canvasa"], backup: [] },
    plugin: { team: "github/plugin", reviewers: [], backup: [] },
    content: { reviewers: [] },
    "workflow-security": { reviewers: ["seca"] },
  },
};

test("normalizeRouting reads reviewers and backups case-insensitively", () => {
  const pools = normalizeRouting(routing);
  assert.ok(pools.get("core-maintainers").has("corea"));
  assert.ok(pools.get("core-maintainers").has("coreb"));
  assert.equal(normalizeRouting(null).size, 0);
  assert.ok(normalizeRouting({ teams: { core: ["@x"] } }).get("core").has("x"));
});

test("low tier needs one approval from a writer, excluding the author", () => {
  const permissions = new Map([["alice", "write"], ["author", "write"], ["rando", "read"]]);
  const base = { tier: "low", tiers, author: "author", permissions, files: [file("docs/a.md")] };
  assert.equal(evaluateApprovals({ ...base, reviews: [review("author", "APPROVED")] }).satisfied, false);
  assert.equal(evaluateApprovals({ ...base, reviews: [review("rando", "APPROVED")] }).satisfied, false);
  assert.equal(evaluateApprovals({ ...base, reviews: [review("alice", "APPROVED")] }).satisfied, true);
});

test("latest review state wins and changes requested blocks", () => {
  const permissions = new Map([["alice", "write"], ["bob", "write"]]);
  const base = { tier: "low", tiers, author: "author", permissions, files: [file("docs/a.md")] };
  const dismissed = evaluateApprovals({
    ...base,
    reviews: [review("alice", "APPROVED", "2026-09-29T10:00:00Z"), review("alice", "DISMISSED", "2026-09-29T11:00:00Z")],
  });
  assert.equal(dismissed.satisfied, false);
  const commentAfterApproval = evaluateApprovals({
    ...base,
    reviews: [review("alice", "APPROVED", "2026-09-29T10:00:00Z"), review("alice", "COMMENTED", "2026-09-29T11:00:00Z")],
  });
  assert.equal(commentAfterApproval.satisfied, true);
  const blocked = evaluateApprovals({
    ...base,
    reviews: [review("alice", "APPROVED"), review("bob", "CHANGES_REQUESTED")],
  });
  assert.equal(blocked.satisfied, false);
  assert.deepEqual(blocked.changesRequestedBy, ["bob"]);
});

test("medium tier requires a domain reviewer when the pool is staffed", () => {
  const permissions = new Map([["alice", "write"], ["canvasa", "write"]]);
  const files = [file("extensions/x/extension.mjs", { status: "added" })];
  const base = { tier: "medium", tiers, author: "author", permissions, routing, files };
  assert.equal(evaluateApprovals({ ...base, reviews: [review("alice", "APPROVED")] }).satisfied, false);
  assert.equal(evaluateApprovals({ ...base, reviews: [review("canvasa", "APPROVED")] }).satisfied, true);
  assert.equal(evaluateApprovals({ ...base, reviews: [review("corea", "APPROVED")] }).satisfied, true, "core counts as domain");

  const unstaffed = evaluateApprovals({
    ...base,
    files: [file("plugins/p/README.md", { status: "added" })],
    reviews: [review("alice", "APPROVED")],
  });
  assert.equal(unstaffed.satisfied, true, "falls back to any writer when the domain pool is empty");
  assert.ok(unstaffed.notes.length > 0);

  const noRouting = evaluateApprovals({ ...base, routing: null, reviews: [review("alice", "APPROVED")] });
  assert.equal(noRouting.satisfied, true);
});

test("high tier requires two approvals including core or security", () => {
  const permissions = new Map([["alice", "write"], ["bob", "write"], ["corea", "write"], ["admin1", "admin"]]);
  const files = [file(".github/workflows/x.yml")];
  const base = { tier: "high", tiers, author: "author", permissions, routing, files };
  assert.equal(evaluateApprovals({ ...base, reviews: [review("corea", "APPROVED")] }).satisfied, false);
  assert.equal(evaluateApprovals({ ...base, reviews: [review("alice", "APPROVED"), review("bob", "APPROVED")] }).satisfied, false);
  assert.equal(evaluateApprovals({ ...base, reviews: [review("alice", "APPROVED"), review("corea", "APPROVED")] }).satisfied, true);
  assert.equal(evaluateApprovals({ ...base, reviews: [review("alice", "APPROVED"), review("seca", "APPROVED")] }).satisfied, true);

  const fallback = { ...base, routing: null };
  assert.equal(evaluateApprovals({ ...fallback, reviews: [review("alice", "APPROVED"), review("bob", "APPROVED")] }).satisfied, false);
  assert.equal(evaluateApprovals({ ...fallback, reviews: [review("alice", "APPROVED"), review("admin1", "APPROVED")] }).satisfied, true);
});

// --- checks -------------------------------------------------------------------

const readmeCheck = config.gate.checks.find((check) => check.id === "readme");
const infraSteps = config.gate.infrastructure_steps;
const failedJob = (stepName) => [
  {
    name: "job",
    conclusion: "failure",
    steps: [
      { name: "Set up job", conclusion: "success" },
      { name: stepName, conclusion: "failure" },
    ],
  },
];

test("failed steps are classified as contribution or infrastructure failures", () => {
  assert.equal(classifyFailure(readmeCheck, failedJob("Fail workflow if files need updating"), infraSteps).category, "contribution");
  assert.equal(classifyFailure(readmeCheck, failedJob("Install dependencies"), infraSteps).category, "infrastructure");
  assert.equal(classifyFailure(readmeCheck, failedJob("Checkout code"), infraSteps).category, "infrastructure");
  assert.equal(classifyFailure(readmeCheck, failedJob("Something new"), infraSteps).category, "contribution");
  assert.equal(classifyFailure(readmeCheck, [{ name: "job", conclusion: "timed_out", steps: [] }], infraSteps).category, "infrastructure");
  assert.equal(classifyFailure({ failure_kind: "infrastructure" }, [], infraSteps).category, "infrastructure");
  assert.equal(classifyFailure(readmeCheck, [], infraSteps).category, "infrastructure");
});

test("evaluateCheck maps run states to gate outcomes", () => {
  const check = { id: "x", title: "X", hint: "fix it" };
  assert.equal(evaluateCheck(check, { found: false }).outcome, "pending");
  assert.equal(evaluateCheck(check, { found: false }, { gaveUp: true }).category, "infrastructure");
  assert.equal(evaluateCheck({ ...check, optional: true }, { found: false }, { gaveUp: true }).outcome, "skipped");
  assert.equal(evaluateCheck(check, { found: true, status: "in_progress" }).outcome, "pending");
  assert.equal(evaluateCheck(check, { found: true, status: "in_progress" }, { gaveUp: true }).category, "infrastructure");
  assert.equal(evaluateCheck(check, { found: true, status: "completed", conclusion: "success" }).outcome, "pass");
  assert.equal(evaluateCheck(check, { found: true, status: "completed", conclusion: "skipped" }).outcome, "skipped");
  assert.equal(evaluateCheck(check, { found: true, status: "completed", conclusion: "cancelled" }).category, "infrastructure");
  assert.equal(evaluateCheck(check, { found: true, status: "completed", conclusion: "action_required" }).category, "infrastructure");
  const advisory = evaluateCheck({ ...check, required: false, failure_kind: "infrastructure" }, { found: true, status: "completed", conclusion: "failure" });
  assert.equal(advisory.required, false);
  assert.equal(summarizeChecks([advisory]).warnings.length, 1);
  assert.equal(summarizeChecks([advisory]).infrastructureFailures.length, 0, "advisory failures never block");
});

test("state machine precedence", () => {
  const approvals = { changesRequestedBy: [], satisfied: false, reviewers: [] };
  const automation = (overrides = {}) => ({ contributionFailures: [], pending: [], infrastructureFailures: [], ...overrides });
  assert.equal(computeState({ automation: automation({ contributionFailures: [{}], pending: [{}] }), approvals }), "requires-submitter-fixes");
  assert.equal(computeState({ automation: automation(), approvals: { ...approvals, changesRequestedBy: ["x"] } }), "requires-submitter-fixes");
  assert.equal(computeState({ automation: automation({ pending: [{}] }), approvals: { ...approvals, satisfied: true } }), "awaiting-automation");
  assert.equal(computeState({ automation: automation({ infrastructureFailures: [{}] }), approvals }), "awaiting-automation");
  assert.equal(computeState({ automation: automation(), approvals: { ...approvals, satisfied: true } }), "approved");
  assert.equal(computeState({ automation: automation(), approvals: { ...approvals, reviewers: ["a"] } }), "review-in-progress");
  assert.equal(computeState({ automation: automation(), approvals }), "ready-for-review");
});

test("latestRunsByWorkflow keeps the newest PR-triggered run per workflow", () => {
  const latest = latestRunsByWorkflow([
    { id: 1, path: ".github/workflows/a.yml", event: "pull_request", created_at: "2026-09-29T10:00:00Z" },
    { id: 2, path: ".github/workflows/a.yml", event: "pull_request", created_at: "2026-09-29T11:00:00Z" },
    { id: 3, path: ".github/workflows/b.yml", event: "push", created_at: "2026-09-29T12:00:00Z" },
  ]);
  assert.equal(latest.get("a.yml").id, 2);
  assert.ok(!latest.has("b.yml"));
});

// --- commands and rendering ------------------------------------------------------

test("parsePrCommand only accepts supported commands on the first line", () => {
  assert.deepEqual(parsePrCommand("/rerun-checks"), { command: "rerun-checks" });
  assert.deepEqual(parsePrCommand("\n  /Request-Review please\nthanks"), { command: "request-review" });
  assert.equal(parsePrCommand("please /rerun-checks"), null);
  assert.equal(parsePrCommand("/rerun-checksx"), null);
  assert.equal(parsePrCommand(""), null);
});

test("canRunPrCommand allows the author and writers only", () => {
  assert.ok(canRunPrCommand({ commenter: "Author", prAuthor: "author", permission: "read" }));
  assert.ok(canRunPrCommand({ commenter: "m", prAuthor: "author", permission: "maintain" }));
  assert.ok(!canRunPrCommand({ commenter: "x", prAuthor: "author", permission: "triage" }));
  assert.ok(!canRunPrCommand({ commenter: "", prAuthor: "", permission: "read" }));
});

test("sanitize neutralizes mentions, HTML, and table breaks", () => {
  assert.equal(sanitize("@team <b>|x"), "@\u200bteam &lt;b&gt;\\|x");
  assert.equal(sanitize("a".repeat(10), 5).length, 5);
});

// --- orchestration with a fake GitHub client --------------------------------------

function fakeGithub({ pr, files = [], reviews = [], runs = [], jobs = {}, checkRuns = [], comments = [], permissions = {} }) {
  const calls = [];
  const record = (name, fn) => async (params) => {
    calls.push({ name, params });
    return fn(params);
  };
  const rest = {
    pulls: {
      get: record("pulls.get", async ({ pull_number }) => ({ data: { ...pr, number: pull_number } })),
      listFiles: "pulls.listFiles",
      listReviews: "pulls.listReviews",
      list: "pulls.list",
    },
    actions: {
      listWorkflowRunsForRepo: "actions.listWorkflowRunsForRepo",
      listJobsForWorkflowRun: "actions.listJobsForWorkflowRun",
      getJobForWorkflowRun: record("actions.getJobForWorkflowRun", async () => {
        throw Object.assign(new Error("nope"), { status: 404 });
      }),
      reRunWorkflowFailedJobs: record("actions.reRunWorkflowFailedJobs", async () => ({})),
      reRunWorkflow: record("actions.reRunWorkflow", async () => ({})),
    },
    checks: { listForRef: record("checks.listForRef", async () => ({ data: { check_runs: checkRuns } })) },
    repos: {
      getCollaboratorPermissionLevel: record("repos.getCollaboratorPermissionLevel", async ({ username }) => ({
        data: { permission: permissions[username] || "read" },
      })),
    },
    issues: {
      addLabels: record("issues.addLabels", async () => ({})),
      removeLabel: record("issues.removeLabel", async () => ({})),
      listComments: "issues.listComments",
      updateComment: record("issues.updateComment", async () => ({})),
      createComment: record("issues.createComment", async () => ({})),
    },
  };
  const pages = {
    "pulls.listFiles": files,
    "pulls.listReviews": reviews,
    "pulls.list": [pr],
    "actions.listWorkflowRunsForRepo": runs,
    "issues.listComments": comments,
  };
  return {
    calls,
    rest,
    paginate: async (method, params) => {
      calls.push({ name: method, params });
      if (method === "actions.listJobsForWorkflowRun") return jobs[params.run_id] || [];
      return pages[method] || [];
    },
  };
}

const basePr = {
  number: 7,
  state: "open",
  head: { sha: "a".repeat(40), ref: "feature", repo: { full_name: "fork/awesome-copilot" } },
  base: { ref: "main", repo: { full_name: "github/awesome-copilot" } },
  user: { login: "author" },
  labels: [{ name: "review-due:2026-10-01" }, { name: "merge-risk:high" }],
  requested_reviewers: [{ login: "alice" }],
  requested_teams: [],
};

const run = (id, workflow, conclusion, status = "completed") => ({
  id,
  path: `.github/workflows/${workflow}`,
  name: workflow,
  event: "pull_request",
  status,
  conclusion,
  created_at: "2026-09-29T10:00:00Z",
  html_url: `https://example.test/runs/${id}`,
});

test("evaluateSubmission reaches approved when checks pass and approvals exist", async () => {
  const github = fakeGithub({
    pr: basePr,
    files: [file("docs/a.md")],
    reviews: [review("alice", "APPROVED")],
    permissions: { alice: "write" },
    runs: [
      run(1, "check-line-endings.yml", "success"),
      run(2, "validate-readme.yml", "success"),
      run(3, "contributor-check.yml", "success"),
      run(4, "pr-duplicate-check.lock.yml", "failure"),
      run(5, "pr-quality-signal.lock.yml", "skipped"),
    ],
  });
  const evaluation = await evaluateSubmission(github, {
    owner: "github",
    repo: "awesome-copilot",
    pullNumber: 7,
    config,
    readContributorRisk: () => "LOW",
  });
  assert.equal(evaluation.risk.tier, "low");
  assert.equal(evaluation.state, "approved");
  assert.equal(evaluation.passed, true);
  assert.equal(evaluation.automation.warnings.length, 1, "duplicate-scan infra failure is advisory");
  assert.equal(evaluation.reviewAssignment.due, "2026-10-01");

  await syncPullRequestStatus(github, { owner: "github", repo: "awesome-copilot", evaluation });
  const added = github.calls.find((call) => call.name === "issues.addLabels");
  assert.deepEqual(added.params.labels.sort(), ["approved", "merge-risk:low"]);
  const removed = github.calls.filter((call) => call.name === "issues.removeLabel").map((call) => call.params.name);
  assert.deepEqual(removed, ["merge-risk:high"]);
  const created = github.calls.find((call) => call.name === "issues.createComment");
  assert.ok(created.params.body.startsWith(STATUS_MARKER));
});

test("evaluateSubmission separates contribution and infrastructure failures", async () => {
  const github = fakeGithub({
    pr: basePr,
    files: [file("skills/x/SKILL.md", { status: "added" })],
    runs: [
      run(1, "check-line-endings.yml", "success"),
      run(2, "validate-readme.yml", "failure"),
      run(3, "contributor-check.yml", "success"),
      run(4, "validate-skills.yml", "failure"),
      run(5, "skill-check.yml", "success"),
      run(6, "pr-risk-scan.yml", "cancelled"),
    ],
    jobs: {
      2: failedJob("Fail workflow if files need updating"),
      4: failedJob("Install dependencies"),
    },
  });
  const evaluation = await evaluateSubmission(github, {
    owner: "github",
    repo: "awesome-copilot",
    pullNumber: 7,
    config,
    finalized: true,
    readContributorRisk: () => null,
  });
  assert.deepEqual(evaluation.automation.contributionFailures.map((r) => r.id), ["readme"]);
  assert.deepEqual(
    evaluation.automation.infrastructureFailures.map((r) => r.id).sort(),
    ["risk-scan", "skill-validation"]
  );
  assert.equal(evaluation.state, "requires-submitter-fixes");
  const body = renderStatusComment(evaluation);
  assert.match(body, /Contribution failure/);
  assert.match(body, /Infrastructure failure/);
  assert.match(body, /npm start/);
  assert.match(body, /\/rerun-checks/);
  assert.match(body, /2026-10-01/);
});

test("evaluateSubmission waits for pending checks in gate mode", async () => {
  let clock = 0;
  let polls = 0;
  const runs = [
    run(1, "check-line-endings.yml", null, "in_progress"),
    run(3, "contributor-check.yml", "success"),
    run(4, "pr-duplicate-check.lock.yml", "success"),
    run(5, "pr-quality-signal.lock.yml", "success"),
  ];
  const github = fakeGithub({ pr: basePr, files: [file("LICENSE")], runs });
  const originalPaginate = github.paginate;
  github.paginate = async (method, params) => {
    if (method === "actions.listWorkflowRunsForRepo") {
      polls += 1;
      if (polls >= 2) runs[0] = run(1, "check-line-endings.yml", "success");
    }
    return originalPaginate(method, params);
  };
  const evaluation = await evaluateSubmission(github, {
    owner: "github",
    repo: "awesome-copilot",
    pullNumber: 7,
    config,
    wait: true,
    now: () => clock,
    sleep: async (ms) => {
      clock += ms;
    },
    readContributorRisk: () => null,
  });
  assert.equal(polls, 2);
  assert.equal(evaluation.automation.pending.length, 0);
  assert.equal(evaluation.state, "ready-for-review");
});

test("unreported required checks become infrastructure failures after the grace period", async () => {
  let clock = 0;
  const github = fakeGithub({ pr: basePr, files: [file("LICENSE")], runs: [run(3, "contributor-check.yml", "success")] });
  const evaluation = await evaluateSubmission(github, {
    owner: "github",
    repo: "awesome-copilot",
    pullNumber: 7,
    config,
    wait: true,
    now: () => clock,
    sleep: async (ms) => {
      clock += ms;
    },
    readContributorRisk: () => null,
  });
  const lineEndings = evaluation.automation.results.find((result) => result.id === "line-endings");
  assert.equal(lineEndings.category, "infrastructure");
  assert.ok(clock >= config.gate.wait.report_grace_minutes * 60_000);
  assert.ok(clock < config.gate.wait.timeout_minutes * 60_000);
});

test("rerunChecks re-runs failed workflows and the gate but skips approval-gated runs", async () => {
  const github = fakeGithub({
    pr: basePr,
    runs: [
      run(1, "validate-readme.yml", "failure"),
      run(2, "check-line-endings.yml", "success"),
      run(3, "contributor-check.yml", "action_required"),
      run(4, "submission-gate.yml", "failure"),
      run(5, "pr-risk-scan.yml", null, "in_progress"),
    ],
  });
  const result = await rerunChecks(github, { owner: "github", repo: "awesome-copilot", headSha: basePr.head.sha });
  assert.deepEqual(result.rerun, ["validate-readme.yml", "submission-gate.yml"]);
  assert.equal(result.skipped.length, 1);
  assert.ok(github.calls.some((call) => call.name === "actions.reRunWorkflow" && call.params.run_id === 4));
});

test("syncPullRequestStatus leaves state labels to external plugin intake and updates the comment in place", async () => {
  const pr = { ...basePr, labels: [{ name: "external-plugin" }, { name: "ready-for-review" }] };
  const github = fakeGithub({
    pr,
    comments: [
      { id: 1, user: { login: "someone" }, body: STATUS_MARKER },
      { id: 2, user: { login: "github-actions[bot]" }, body: `${STATUS_MARKER}\nold` },
    ],
  });
  const evaluation = {
    pr,
    headSha: pr.head.sha,
    labels: ["external-plugin", "ready-for-review"],
    risk: { tier: "high", reasons: ["`plugins/external.json` is a high-risk path"] },
    automation: summarizeChecks([]),
    approvals: { required: 2, requirement: "2 approvals", approvers: [], changesRequestedBy: [], reviewers: [], missing: ["2 more approval(s)"], notes: [], satisfied: false },
    state: "awaiting-automation",
    reviewAssignment: { users: [], teams: [], due: null },
  };
  await syncPullRequestStatus(github, { owner: "github", repo: "awesome-copilot", evaluation });
  assert.deepEqual(github.calls.find((call) => call.name === "issues.addLabels").params.labels, ["merge-risk:high"]);
  assert.ok(!github.calls.some((call) => call.name === "issues.removeLabel"));
  const updated = github.calls.find((call) => call.name === "issues.updateComment");
  assert.equal(updated.params.comment_id, 2);
  assert.ok(!github.calls.some((call) => call.name === "issues.createComment"));
});

test("resolvePullRequestForWorkflowRun requires an exact head match", async () => {
  const github = fakeGithub({ pr: basePr });
  const workflowRun = {
    head_sha: basePr.head.sha,
    head_branch: "feature",
    head_repository: { full_name: "fork/awesome-copilot" },
    pull_requests: [],
  };
  assert.equal(await resolvePullRequestForWorkflowRun(github, { owner: "github", repo: "awesome-copilot", workflowRun }), 7);
  assert.equal(
    await resolvePullRequestForWorkflowRun(github, {
      owner: "github",
      repo: "awesome-copilot",
      workflowRun: { ...workflowRun, head_sha: "b".repeat(40) },
    }),
    null
  );
});
