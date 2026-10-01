import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
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
  publishGateCheck,
  GATE_CHECK_EXTERNAL_ID,
  parsePrCommand,
  renderStatusComment,
  rerunChecks,
  resolvePullRequestForWorkflowRun,
  riskLabelSignature,
  runPrCommand,
  validatePrCommandRequest,
  PR_COMMAND_SCHEMA,
  sanitize,
  selectApplicableChecks,
  STATUS_MARKER,
  summarizeChecks,
  syncPullRequestStatus,
} from "./submission-gate.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = loadGateConfig(repoRoot);
const tiers = config.tiers;

const file = (filename, extra = {}) => ({ filename, status: "modified", additions: 1, deletions: 1, changes: 2, patch: "+x\n-y", ...extra });
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
    // A workflow without a path filter reports on every PR, so the gate may narrow where it applies.
    if (trigger?.paths) {
      assert.deepEqual([...(check.paths || [])].sort(), [...trigger.paths].sort(), `${check.id}: paths drifted from ${check.workflow}`);
    }
    // validate-agentic-workflows-pr.yml rejects any `.github/**` change, so it can't trigger on its own file.
    const selfPathExempt = ["validate-submission-gate.yml", "validate-agentic-workflows-pr.yml"];
    if (check.paths && !selfPathExempt.includes(check.workflow)) {
      assert.ok(
        check.paths.includes(`.github/workflows/${check.workflow}`),
        `${check.id}: paths should include its own workflow file`
      );
    }
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

test("repository workflows, scripts, MCP config, and policy files are high risk", () => {
  for (const name of [
    ".github/workflows/ci.yml",
    ".github/CODEOWNERS",
    ".github/review-routing.yml",
    ".github/risk-tiers.yml",
    "hooks/x/check.sh",
    "hooks/x/check.py",
    "plugins/p/hooks/run.ps1",
    "skills/foo/scripts/run.py",
    "skills/foo/tool.sh",
    "plugins/p/mcp.json",
    "eng/update-readme.mjs",
    "plugins/external.json",
  ]) {
    assert.equal(classifyRisk({ files: [file(name)], tiers }).tier, "high", name);
  }
});

test("agentic workflow sources and hook metadata are content, but hook commands are high risk", () => {
  assert.equal(classifyRisk({ files: [file("workflows/daily.md", { status: "added" })], tiers }).tier, "medium");
  assert.equal(classifyRisk({ files: [file("hooks/x/README.md", { status: "added" })], tiers }).tier, "medium");
  const hookCommand = classifyRisk({
    files: [file("hooks/x/hooks.json", { status: "added", patch: '+{ "type": "command", "bash": "hooks/x/check.sh" }' })],
    tiers,
  });
  assert.equal(hookCommand.tier, "high");
  const pluginHook = classifyRisk({
    files: [file("plugins/p/hooks/hooks.json", { patch: '+  "powershell": "run.ps1"' })],
    tiers,
  });
  assert.equal(pluginHook.tier, "high");
  assert.equal(classifyRisk({ files: [file("hooks/x/hooks.json", { patch: '+  "timeoutSec": 30' })], tiers }).tier, "medium");
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

test("high tier requires two approvals including a core maintainer", () => {
  const permissions = new Map([["alice", "write"], ["bob", "write"], ["corea", "write"], ["admin1", "admin"]]);
  const files = [file(".github/workflows/x.yml")];
  const base = { tier: "high", tiers, author: "author", permissions, routing, files };
  assert.equal(evaluateApprovals({ ...base, reviews: [review("corea", "APPROVED")] }).satisfied, false);
  assert.equal(evaluateApprovals({ ...base, reviews: [review("alice", "APPROVED"), review("bob", "APPROVED")] }).satisfied, false);
  assert.equal(evaluateApprovals({ ...base, reviews: [review("alice", "APPROVED"), review("corea", "APPROVED")] }).satisfied, true);

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
  const skipped = evaluateCheck(check, { found: true, status: "completed", conclusion: "skipped" });
  assert.equal(skipped.outcome, "failure", "a skipped required check validated nothing");
  assert.equal(skipped.category, "infrastructure");
  const skippedOk = { found: true, status: "completed", conclusion: "skipped" };
  assert.equal(evaluateCheck({ ...check, allow_skip: true }, skippedOk).outcome, "skipped");
  assert.equal(evaluateCheck({ ...check, optional: true }, skippedOk).outcome, "skipped");
  assert.equal(evaluateCheck({ ...check, required: false }, skippedOk).outcome, "skipped");
  assert.equal(config.gate.checks.find((c) => c.id === "contributor-reputation").allow_skip, true, "skips for bot authors");
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

test("parsePrCommand only accepts supported commands at the start of the comment", () => {
  assert.deepEqual(parsePrCommand("/rerun-checks"), { command: "rerun-checks" });
  assert.deepEqual(parsePrCommand("/Request-Review please\nthanks"), { command: "request-review" });
  assert.equal(parsePrCommand("\n/rerun-checks"), null, "matches the workflow's startsWith filter");
  assert.equal(parsePrCommand("  /rerun-checks"), null);
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

function fakeGithub({ pr, files = [], reviews = [], runs = [], jobs = {}, checkRuns = [], comments = [], reactions = [], permissions = {} }) {
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
      createWorkflowDispatch: record("actions.createWorkflowDispatch", async () => ({})),
    },
    checks: {
      listForRef: record("checks.listForRef", async ({ check_name }) => ({
        data: { check_runs: checkRuns.filter((checkRun) => !check_name || checkRun.name === check_name) },
      })),
      create: record("checks.create", async () => ({ data: { id: 999 } })),
      update: record("checks.update", async () => ({ data: {} })),
    },
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
      getComment: record("issues.getComment", async ({ comment_id }) => {
        const found = comments.find((comment) => comment.id === comment_id);
        if (!found) throw Object.assign(new Error("Not Found"), { status: 404 });
        return { data: found };
      }),
    },
    reactions: {
      listForIssueComment: "reactions.listForIssueComment",
      createForIssueComment: record("reactions.createForIssueComment", async () => ({})),
    },
  };
  const pages = {
    "pulls.listFiles": files,
    "pulls.listReviews": reviews,
    "pulls.list": [pr],
    "actions.listWorkflowRunsForRepo": runs,
    "issues.listComments": comments,
    "reactions.listForIssueComment": reactions,
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
      run(90, "codespell.yml", "success"),
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
      run(90, "codespell.yml", "success"),
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
    run(90, "codespell.yml", "success"),
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

// --- review hardening ------------------------------------------------------------

test("text files without a scannable diff or a truncated file list fail closed to high", () => {
  const noPatch = classifyRisk({ files: [file("extensions/x/extension.mjs", { patch: undefined })], tiers });
  assert.equal(noPatch.tier, "high");
  assert.match(noPatch.reasons.join("\n"), /no diff available/);
  assert.equal(classifyRisk({ files: [file("skills/x/guide.pdf", { patch: undefined, status: "added" })], tiers }).tier, "medium");
  assert.equal(classifyRisk({ files: [file("docs/a.md", { patch: undefined })], tiers }).tier, "low", "outside capability scope");
  assert.equal(classifyRisk({ files: [file("docs/a.md")], tiers, incompleteFiles: true }).tier, "high");
});

test("low tier requires an approval from an owner of the changed resource", () => {
  const permissions = new Map([["alice", "write"], ["canvasa", "write"], ["corea", "write"]]);
  const base = { tier: "low", tiers, author: "author", permissions, routing };
  const canvas = { ...base, files: [file("extensions/x/README.md")] };
  assert.equal(evaluateApprovals({ ...canvas, reviews: [review("alice", "APPROVED")] }).satisfied, false);
  assert.equal(evaluateApprovals({ ...canvas, reviews: [review("canvasa", "APPROVED")] }).satisfied, true);
  const docs = { ...base, files: [file("docs/a.md")] };
  assert.equal(evaluateApprovals({ ...docs, reviews: [review("alice", "APPROVED")] }).satisfied, false, "core pools own docs");
  assert.equal(evaluateApprovals({ ...docs, reviews: [review("corea", "APPROVED")] }).satisfied, true);
  const unstaffed = evaluateApprovals({ ...base, files: [file("skills/x/SKILL.md")], reviews: [review("alice", "APPROVED")] });
  assert.equal(unstaffed.satisfied, true, "unstaffed content pool falls back to any writer");
});

test("approvals fail closed when a reviewer's permission can't be read", async () => {
  const github = fakeGithub({ pr: basePr, files: [file("docs/a.md")], reviews: [review("alice", "APPROVED", undefined, { author_association: "COLLABORATOR" })] });
  github.rest.repos.getCollaboratorPermissionLevel = async () => {
    throw Object.assign(new Error("forbidden"), { status: 403 });
  };
  const evaluation = await evaluateSubmission(github, { owner: "github", repo: "awesome-copilot", pullNumber: 7, config, finalized: true, readContributorRisk: () => null });
  assert.deepEqual(evaluation.approvals.approvers, []);
});

test("evaluateSubmission blocks when GitHub truncates the changed file list", async () => {
  const github = fakeGithub({ pr: { ...basePr, changed_files: 3001 }, files: [file("docs/a.md")] });
  const evaluation = await evaluateSubmission(github, { owner: "github", repo: "awesome-copilot", pullNumber: 7, config, finalized: true, readContributorRisk: () => null });
  assert.equal(evaluation.risk.tier, "high");
  const truncated = evaluation.automation.infrastructureFailures.find((result) => result.id === "changed-files");
  assert.ok(truncated);
  assert.equal(evaluation.passed, false);
});

test("evaluateSubmission is stale when the head differs from the expected or re-read head", async () => {
  const expected = await evaluateSubmission(fakeGithub({ pr: basePr }), {
    owner: "github", repo: "awesome-copilot", pullNumber: 7, config, expectedHeadSha: "b".repeat(40), readContributorRisk: () => null,
  });
  assert.equal(expected.stale, true);

  const github = fakeGithub({ pr: basePr, files: [file("docs/a.md")] });
  let gets = 0;
  github.rest.pulls.get = async ({ pull_number }) => {
    gets += 1;
    return { data: { ...basePr, number: pull_number, head: { ...basePr.head, sha: gets === 1 ? basePr.head.sha : "c".repeat(40) } } };
  };
  const moved = await evaluateSubmission(github, { owner: "github", repo: "awesome-copilot", pullNumber: 7, config, readContributorRisk: () => null });
  assert.equal(moved.stale, true);
  assert.notEqual(moved.passed, true);
});

test("a submission-gate check not published by the writer is flagged as tampering", async () => {
  const github = fakeGithub({
    pr: basePr,
    files: [file("docs/a.md")],
    reviews: [review("alice", "APPROVED")],
    permissions: { alice: "write" },
    checkRuns: [{ id: 5, name: "submission-gate", external_id: "", html_url: "https://example.test/impostor" }],
    runs: [run(1, "check-line-endings.yml", "success"), run(90, "codespell.yml", "success"), run(2, "validate-readme.yml", "success"), run(3, "contributor-check.yml", "success")],
  });
  const evaluation = await evaluateSubmission(github, { owner: "github", repo: "awesome-copilot", pullNumber: 7, config, finalized: true, readContributorRisk: () => null });
  assert.equal(evaluation.risk.tier, "high");
  assert.ok(evaluation.automation.contributionFailures.some((result) => result.id === "gate-integrity"));
  assert.equal(evaluation.passed, false);

  await publishGateCheck(github, { owner: "github", repo: "awesome-copilot", evaluation });
  const created = github.calls.find((call) => call.name === "checks.create");
  assert.equal(created.params.name, "submission-gate");
  assert.equal(created.params.external_id, GATE_CHECK_EXTERNAL_ID);
  assert.equal(created.params.conclusion, "failure");
});

test("publishGateCheck updates the writer's check run and reports pending as in progress", async () => {
  const ours = { id: 42, name: "submission-gate", external_id: GATE_CHECK_EXTERNAL_ID };
  const github = fakeGithub({ pr: basePr, checkRuns: [ours] });
  const evaluation = {
    headSha: basePr.head.sha,
    state: "approved",
    passed: true,
    risk: { tier: "low" },
    automation: summarizeChecks([]),
    approvals: { satisfied: true, missing: [] },
  };
  await publishGateCheck(github, { owner: "github", repo: "awesome-copilot", evaluation, detailsUrl: "https://example.test/run" });
  const updated = github.calls.find((call) => call.name === "checks.update");
  assert.equal(updated.params.check_run_id, 42);
  assert.equal(updated.params.conclusion, "success");
  assert.equal(updated.params.details_url, "https://example.test/run");

  const pending = { ...evaluation, state: "awaiting-automation", passed: false, automation: summarizeChecks([{ id: "x", title: "X", required: true, outcome: "pending" }]) };
  const github2 = fakeGithub({ pr: basePr });
  await publishGateCheck(github2, { owner: "github", repo: "awesome-copilot", evaluation: pending });
  const created = github2.calls.find((call) => call.name === "checks.create");
  assert.equal(created.params.status, "in_progress");
  assert.equal(created.params.conclusion, undefined);
});

test("syncPullRequestStatus does not write when the head or reviews changed", async () => {
  const evaluation = {
    pr: basePr,
    headSha: "b".repeat(40),
    labels: [],
    reviewsSignature: "",
    risk: { tier: "low", reasons: [] },
    automation: summarizeChecks([]),
    approvals: { required: 1, requirement: "1 approval", approvers: [], changesRequestedBy: [], reviewers: [], missing: [], notes: [], satisfied: true },
    state: "approved",
    passed: true,
    reviewAssignment: { users: [], teams: [], due: null },
  };
  const moved = fakeGithub({ pr: basePr });
  assert.deepEqual(await syncPullRequestStatus(moved, { owner: "github", repo: "awesome-copilot", evaluation, publishCheck: true }), {
    updated: false,
    reason: "head-changed",
  });
  assert.ok(!moved.calls.some((call) => /addLabels|removeLabel|Comment|checks\.(create|update)/.test(call.name)));

  const reviewed = fakeGithub({ pr: basePr, reviews: [review("alice", "CHANGES_REQUESTED")] });
  const result = await syncPullRequestStatus(reviewed, {
    owner: "github",
    repo: "awesome-copilot",
    evaluation: { ...evaluation, headSha: basePr.head.sha },
    publishCheck: true,
  });
  assert.equal(result.reason, "reviews-changed");
  assert.ok(!reviewed.calls.some((call) => /addLabels|checks\.create/.test(call.name)));
});

test("syncPullRequestStatus publishes the gate check even when label or comment writes fail", async () => {
  const evaluation = {
    pr: basePr,
    headSha: basePr.head.sha,
    labels: [],
    reviewsSignature: "",
    risk: { tier: "low", reasons: [] },
    automation: summarizeChecks([]),
    approvals: { required: 1, requirement: "1 approval", approvers: [], changesRequestedBy: [], reviewers: [], missing: ["1 more approval"], notes: [], satisfied: false },
    state: "review-in-progress",
    passed: false,
    reviewAssignment: { users: [], teams: [], due: null },
  };
  const github = fakeGithub({ pr: basePr });
  github.rest.issues.addLabels = async () => {
    throw Object.assign(new Error("Resource not accessible"), { status: 403 });
  };
  github.rest.issues.createComment = async () => {
    throw Object.assign(new Error("Server Error"), { status: 502 });
  };
  await assert.rejects(
    syncPullRequestStatus(github, { owner: "github", repo: "awesome-copilot", evaluation, publishCheck: true }),
    /labels: Resource not accessible; status comment: Server Error/
  );
  assert.ok(github.calls.some((call) => call.name === "checks.create"), "check is published before label and comment writes");
});

test("a successful contributor check with an unreadable artifact fails closed", async () => {
  const runs = [
    run(1, "check-line-endings.yml", "success"),
    run(90, "codespell.yml", "success"),
    run(2, "validate-readme.yml", "success"),
    run(3, "contributor-check.yml", "success"),
  ];
  const approved = { reviews: [review("alice", "APPROVED")], permissions: { alice: "write" } };
  const options = { owner: "github", repo: "awesome-copilot", pullNumber: 7, config, finalized: true, readContributorRisk: () => null };

  const lost = await evaluateSubmission(
    fakeGithub({ pr: basePr, files: [file("docs/a.md")], runs, jobs: { 3: [{ name: "pr-check", conclusion: "success" }] }, ...approved }),
    options
  );
  assert.deepEqual(lost.automation.infrastructureFailures.map((r) => r.id), ["contributor-risk-signal"]);
  assert.equal(lost.passed, false);

  const skipped = await evaluateSubmission(
    fakeGithub({ pr: basePr, files: [file("docs/a.md")], runs, jobs: { 3: [{ name: "pr-check", conclusion: "skipped" }] }, ...approved }),
    options
  );
  assert.equal(skipped.automation.infrastructureFailures.length, 0, "a skipped PR job carries no signal");
  assert.equal(skipped.passed, true);
});

test("evaluation and final write are discarded when the base branch or risk labels change", async () => {
  const github = fakeGithub({ pr: basePr, files: [file("docs/a.md")] });
  let gets = 0;
  github.rest.pulls.get = async ({ pull_number }) => {
    gets += 1;
    return { data: { ...basePr, number: pull_number, base: { ...basePr.base, ref: gets === 1 ? "main" : "staged" } } };
  };
  const retargeted = await evaluateSubmission(github, { owner: "github", repo: "awesome-copilot", pullNumber: 7, config, readContributorRisk: () => null });
  assert.equal(retargeted.stale, true);

  const evaluation = await evaluateSubmission(fakeGithub({ pr: basePr, files: [file("docs/a.md")] }), {
    owner: "github", repo: "awesome-copilot", pullNumber: 7, config, finalized: true, readContributorRisk: () => null,
  });
  assert.equal(evaluation.baseRef, "main");
  assert.equal(evaluation.riskLabelSignature, "");

  const rebased = fakeGithub({ pr: { ...basePr, base: { ...basePr.base, ref: "staged" } } });
  assert.equal((await syncPullRequestStatus(rebased, { owner: "github", repo: "awesome-copilot", evaluation })).reason, "base-changed");

  const flagged = fakeGithub({ pr: { ...basePr, labels: [...basePr.labels, { name: "needs-review:HIGH" }] } });
  assert.equal((await syncPullRequestStatus(flagged, { owner: "github", repo: "awesome-copilot", evaluation })).reason, "labels-changed");
  assert.ok(!flagged.calls.some((call) => /addLabels|removeLabel|Comment|checks\./.test(call.name)));

  assert.equal(riskLabelSignature(["b", "needs-review:HIGH", "a"], ["needs-review:HIGH"]), "needs-review:HIGH");
});

test("publishGateCheck corrects copies of the writer's check that claim success for a failing evaluation", async () => {
  const older = { id: 10, name: "submission-gate", external_id: GATE_CHECK_EXTERNAL_ID, conclusion: "failure" };
  const forged = { id: 11, name: "submission-gate", external_id: GATE_CHECK_EXTERNAL_ID, conclusion: "success" };
  const github = fakeGithub({ pr: basePr, checkRuns: [older, forged] });
  const evaluation = {
    headSha: basePr.head.sha,
    state: "review-in-progress",
    passed: false,
    risk: { tier: "high" },
    automation: summarizeChecks([]),
    approvals: { satisfied: false, missing: ["1 more approval"] },
  };
  const logs = [];
  await publishGateCheck(github, { owner: "github", repo: "awesome-copilot", evaluation, log: (line) => logs.push(line) });
  const updates = github.calls.filter((call) => call.name === "checks.update");
  assert.deepEqual(updates.map((call) => call.params.check_run_id), [11]);
  assert.equal(updates[0].params.conclusion, "failure");
  assert.ok(logs.some((line) => /Correcting 1/.test(line)));
});

test("validatePrCommandRequest only accepts well-formed requests from the triggering run", () => {
  const request = { schema_version: PR_COMMAND_SCHEMA, pr_number: 7, comment_id: 55, run_id: "123" };
  assert.deepEqual(validatePrCommandRequest(request, { workflowRunId: 123 }), { prNumber: 7, commentId: 55 });
  assert.throws(() => validatePrCommandRequest({ ...request, run_id: "124" }, { workflowRunId: 123 }), /run_id/);
  assert.throws(() => validatePrCommandRequest({ ...request, pr_number: "7" }, { workflowRunId: 123 }), /pr_number/);
  assert.throws(() => validatePrCommandRequest({ ...request, comment_id: 0 }, { workflowRunId: 123 }), /comment_id/);
  assert.throws(() => validatePrCommandRequest({ ...request, schema_version: "x" }, { workflowRunId: 123 }), /schema_version/);
  assert.throws(() => validatePrCommandRequest(null, { workflowRunId: 123 }), /not an object/);
});

const commandComment = (body, login = "author", extra = {}) => ({
  id: 55,
  body,
  user: { login, type: "User" },
  issue_url: "https://api.github.com/repos/github/awesome-copilot/issues/7",
  ...extra,
});
const commandOptions = { owner: "github", repo: "awesome-copilot", prNumber: 7, commentId: 55, config };

test("runPrCommand re-reads the comment, PR, and permission before writing", async () => {
  const request = fakeGithub({ pr: basePr, comments: [commandComment("/request-review")] });
  assert.deepEqual(await runPrCommand(request, commandOptions), { status: "handled", command: "request-review" });
  assert.deepEqual(request.calls.find((call) => call.name === "issues.addLabels").params.labels, ["needs-reviewer"]);
  const dispatched = request.calls.find((call) => call.name === "actions.createWorkflowDispatch");
  assert.equal(dispatched.params.workflow_id, "review-routing.yml");
  assert.deepEqual(dispatched.params.inputs, { pr_number: "7" });
  assert.ok(request.calls.some((call) => call.name === "reactions.createForIssueComment"));
  assert.ok(request.calls.some((call) => call.name === "issues.createComment"));
  const order = request.calls.map((call) => (call.name === "reactions.createForIssueComment" ? `reaction:${call.params.content}` : call.name));
  assert.ok(order.indexOf("reaction:eyes") < order.indexOf("issues.addLabels"), "claim marker is written before acting");
  assert.ok(order.indexOf("reaction:rocket") > order.indexOf("issues.createComment"), "done marker is written after the reply");

  const rerun = fakeGithub({ pr: basePr, comments: [commandComment("/rerun-checks", "maint")], permissions: { maint: "maintain" } });
  assert.equal((await runPrCommand(rerun, commandOptions)).command, "rerun-checks");
  assert.equal(rerun.calls.find((call) => call.name === "actions.createWorkflowDispatch").params.workflow_id, "submission-gate-writer.yml");
});

test("runPrCommand ignores outsiders, closed PRs, edits, replays, and mismatched comments", async () => {
  const writes = /addLabels|createComment|createForIssueComment|createWorkflowDispatch|reRun/;

  const outsider = fakeGithub({ pr: basePr, comments: [commandComment("/rerun-checks", "stranger")] });
  assert.equal((await runPrCommand(outsider, commandOptions)).status, "ignored");
  assert.ok(!outsider.calls.some((call) => writes.test(call.name)));

  const closed = fakeGithub({ pr: { ...basePr, state: "closed" }, comments: [commandComment("/rerun-checks")] });
  assert.equal((await runPrCommand(closed, commandOptions)).reason, "PR is not open");

  const edited = fakeGithub({ pr: basePr, comments: [commandComment("thanks!")] });
  assert.equal((await runPrCommand(edited, commandOptions)).reason, "no supported command");

  const replay = fakeGithub({
    pr: basePr,
    comments: [commandComment("/request-review")],
    reactions: [
      { content: "eyes", user: { login: "github-actions[bot]" } },
      { content: "rocket", user: { login: "github-actions[bot]" } },
    ],
  });
  assert.equal((await runPrCommand(replay, commandOptions)).reason, "already handled");
  assert.ok(!replay.calls.some((call) => writes.test(call.name)));

  const elsewhere = fakeGithub({
    pr: basePr,
    comments: [commandComment("/request-review", "author", { issue_url: "https://api.github.com/repos/github/awesome-copilot/issues/70" })],
  });
  await assert.rejects(runPrCommand(elsewhere, commandOptions), /does not belong/);
});
test("runPrCommand retries a command that was claimed but never completed", async () => {
  const claimedOnly = fakeGithub({
    pr: basePr,
    comments: [commandComment("/request-review")],
    reactions: [{ content: "eyes", user: { login: "github-actions[bot]" } }],
  });
  assert.equal((await runPrCommand(claimedOnly, commandOptions)).status, "handled");

  const failing = fakeGithub({ pr: basePr, comments: [commandComment("/request-review")] });
  failing.rest.issues.createComment = async () => {
    throw Object.assign(new Error("boom"), { status: 502 });
  };
  await assert.rejects(runPrCommand(failing, commandOptions), /boom/);
  const reactionsWritten = failing.calls.filter((call) => call.name === "reactions.createForIssueComment").map((call) => call.params.content);
  assert.deepEqual(reactionsWritten, ["eyes"], "a failed run leaves only the claim marker, so it can be retried");
});

test("advisory checks that are still pending do not hold the gate", () => {
  const advisory = evaluateCheck({ id: "quality", required: false }, { found: true, status: "in_progress" });
  const required = evaluateCheck({ id: "build" }, { found: true, status: "completed", conclusion: "success" });
  const automation = summarizeChecks([advisory, required]);
  assert.equal(automation.pending.length, 0);
  assert.equal(automation.advisoryPending.length, 1);
  const approvals = { satisfied: true, reviewers: [], changesRequestedBy: [] };
  assert.equal(computeState({ automation, approvals }), "approved");

  const requiredPending = summarizeChecks([evaluateCheck({ id: "build" }, { found: true, status: "queued" })]);
  assert.equal(computeState({ automation: requiredPending, approvals }), "awaiting-automation");
});

test("loadGateConfig fails closed on an unparsable review-routing.yml but tolerates a missing one", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gate-config-"));
  try {
    fs.mkdirSync(path.join(dir, ".github"));
    for (const name of ["submission-gate.yml", "risk-tiers.yml"]) {
      fs.copyFileSync(path.join(repoRoot, ".github", name), path.join(dir, ".github", name));
    }
    assert.equal(loadGateConfig(dir).routing, null, "missing routing file falls back");

    const routingPath = path.join(dir, ".github", "review-routing.yml");
    fs.writeFileSync(routingPath, "pools: [unclosed\n");
    assert.throws(() => loadGateConfig(dir), /review-routing\.yml could not be parsed/);

    fs.writeFileSync(routingPath, "pools:\n  - core\n");
    assert.throws(() => loadGateConfig(dir), /`pools` must be a mapping/);

    fs.writeFileSync(routingPath, "- just\n- a list\n");
    assert.throws(() => loadGateConfig(dir), /must be a mapping/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});