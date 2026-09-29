import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  COMMENT_MARKERS,
  REVIEW_ROUTING_CONFIG_PATH,
  addBusinessDays,
  computeReviewLoad,
  formatResultsSummary,
  hasHumanReview,
  isBusinessDay,
  loadReviewRoutingConfig,
  normalizeReviewRoutingConfig,
  pickReviewer,
  planEscalation,
  planRouting,
  resolveWorkflowRunArtifact,
  runEscalationSweep,
  runRoutingSweep,
  selectPool,
  slaMilestones,
} from "./review-routing.mjs";

function rawConfig(overrides = {}) {
  return {
    version: 1,
    dry_run: false,
    sla: { first_review_business_days: 2, escalation_business_days: 4, holidays: [] },
    labels: {
      needs_reviewer: "needs-reviewer",
      due_prefix: "review-due:",
      overdue: "review-overdue",
      escalated: "review-escalated",
    },
    escalation_pool: "core-maintainers",
    default_pool: "core-maintainers",
    pools: {
      "core-maintainers": { team: "github/core", reviewers: ["core1", "core2"], backup: [] },
      canvas: { team: "github/canvas", reviewers: ["canvas1", "canvas2", "canvas3"], backup: ["canvasBackup"] },
      plugin: { team: "github/plugin", reviewers: ["plugin1"], backup: [] },
      content: { team: "github/content", reviewers: [], backup: [] },
      "workflow-security": { team: "github/security", reviewers: ["sec1"], backup: ["secBackup"] },
    },
    routes: [
      { label: "workflow", pool: "workflow-security" },
      { label: "hooks", pool: "workflow-security" },
      { label: "canvas-extension", pool: "canvas" },
      { label: "plugin", pool: "plugin" },
      { label: "skills", pool: "content" },
    ],
    unavailable: [],
    skip_authors: [],
    skip_labels: ["do-not-merge"],
    ...overrides,
  };
}

function config(overrides) {
  const { config: normalized, errors } = normalizeReviewRoutingConfig(rawConfig(overrides));
  assert.deepEqual(errors, []);
  return normalized;
}

function pr({ number = 42, author = "contributor", labels = [], requested = [], teams = [], draft = false, state = "open" } = {}) {
  return {
    number,
    state,
    draft,
    user: { login: author, type: "User" },
    labels: labels.map((name) => ({ name })),
    requested_reviewers: requested.map((login) => ({ login })),
    requested_teams: teams.map((slug) => ({ slug })),
  };
}

function review(login, submittedAt = "2026-09-30T12:00:00Z", state = "COMMENTED") {
  return { user: { login, type: login.endsWith("[bot]") ? "Bot" : "User" }, state, submitted_at: submittedAt };
}

// 2026-09-28 is a Monday.
const MONDAY = new Date("2026-09-28T10:00:00Z");

describe("configuration", () => {
  test("repository config file is valid", () => {
    const loaded = loadReviewRoutingConfig(REVIEW_ROUTING_CONFIG_PATH);
    assert.equal(loaded.sla.firstReviewBusinessDays, 2);
    assert.equal(loaded.sla.escalationBusinessDays, 4);
    assert.ok(loaded.pools[loaded.escalationPool]);
    for (const label of ["canvas-extension", "plugin", "skills", "agent", "instructions", "workflow", "hooks"]) {
      assert.ok(loaded.routes.some((route) => route.label === label), `missing route for ${label}`);
    }
  });

  test("rejects unknown pools, bad logins, and inverted SLAs", () => {
    const { config: normalized, errors } = normalizeReviewRoutingConfig(
      rawConfig({
        sla: { first_review_business_days: 4, escalation_business_days: 2 },
        routes: [{ label: "skills", pool: "missing" }],
        pools: { "core-maintainers": { team: "not a team", reviewers: ["@bad login"] } },
        default_pool: "nope",
      })
    );
    assert.equal(normalized, null);
    assert.ok(errors.some((error) => error.includes("escalation_business_days")));
    assert.ok(errors.some((error) => error.includes("unknown pool")));
    assert.ok(errors.some((error) => error.includes("invalid GitHub login")));
    assert.ok(errors.some((error) => error.includes("<org>/<team-slug>")));
    assert.ok(errors.some((error) => error.includes("default_pool")));
  });
});

describe("business days", () => {
  test("weekends and holidays are not business days", () => {
    assert.equal(isBusinessDay("2026-10-02"), true); // Friday
    assert.equal(isBusinessDay("2026-10-03"), false); // Saturday
    assert.equal(isBusinessDay("2026-10-04"), false); // Sunday
    assert.equal(isBusinessDay("2026-10-05", ["2026-10-05"]), false);
  });

  test("addBusinessDays skips weekends and holidays", () => {
    assert.equal(addBusinessDays("2026-09-28", 2), "2026-09-30"); // Mon -> Wed
    assert.equal(addBusinessDays("2026-10-01", 2), "2026-10-05"); // Thu -> Mon
    assert.equal(addBusinessDays("2026-10-02", 2), "2026-10-06"); // Fri -> Tue
    assert.equal(addBusinessDays("2026-10-03", 2), "2026-10-06"); // Sat -> Tue
    assert.equal(addBusinessDays("2026-10-02", 1, ["2026-10-05"]), "2026-10-06");
    assert.equal(addBusinessDays("2026-10-06", -2), "2026-10-02");
    assert.equal(addBusinessDays(new Date("2026-09-28T23:59:00Z"), 0), "2026-09-28");
  });

  test("slaMilestones derives routing, overdue, and escalation dates", () => {
    assert.deepEqual(slaMilestones("2026-09-30", config()), {
      routedOn: "2026-09-28",
      dueDate: "2026-09-30",
      overdueOn: "2026-10-01",
      escalateOn: "2026-10-05",
    });
  });
});

describe("reviewer selection", () => {
  test("selectPool honors route priority and falls back to the default pool", () => {
    const cfg = config();
    assert.equal(selectPool(["skills", "plugin"], cfg), "plugin");
    assert.equal(selectPool(["plugin", "canvas-extension"], cfg), "canvas");
    assert.equal(selectPool(["canvas-extension", "workflow"], cfg), "workflow-security");
    assert.equal(selectPool(["website-update"], cfg), "core-maintainers");
  });

  test("computeReviewLoad counts open review requests case-insensitively", () => {
    const load = computeReviewLoad([pr({ requested: ["Canvas1", "canvas2"] }), pr({ requested: ["canvas1"] })]);
    assert.equal(load.get("canvas1"), 2);
    assert.equal(load.get("canvas2"), 1);
  });

  test("pickReviewer prefers the lowest load and rotates ties by seed", () => {
    const load = new Map([["canvas1", 3], ["canvas2", 1], ["canvas3", 1]]);
    assert.equal(pickReviewer(["canvas1", "canvas2", "canvas3"], { load, seed: 0 }), "canvas2");
    assert.equal(pickReviewer(["canvas1", "canvas2", "canvas3"], { load, seed: 1 }), "canvas3");
    assert.equal(pickReviewer(["canvas1", "canvas2"], { load, exclude: new Set(["canvas2"]) }), "canvas1");
    assert.equal(pickReviewer(["copilot[bot]"], {}), null);
    assert.equal(pickReviewer([], {}), null);
  });

  test("hasHumanReview ignores the author, bots, pending, and older reviews", () => {
    assert.equal(hasHumanReview([review("contributor")], "contributor"), false);
    assert.equal(hasHumanReview([review("copilot-pull-request-reviewer[bot]")], "contributor"), false);
    assert.equal(hasHumanReview([review("core1", "2026-09-30T00:00:00Z", "PENDING")], "contributor"), false);
    assert.equal(hasHumanReview([review("core1", "2026-09-20T00:00:00Z")], "contributor", "2026-09-28"), false);
    assert.equal(hasHumanReview([review("core1", "2026-09-29T00:00:00Z")], "contributor", "2026-09-28"), true);
  });
});

describe("planRouting", () => {
  test("requests the least-loaded pool reviewer, excluding the author, and sets a due label", () => {
    const plan = planRouting({
      pr: pr({ author: "canvas2", labels: ["canvas-extension", "plugin"] }),
      load: new Map([["canvas1", 2], ["canvas3", 0]]),
      config: config(),
      now: MONDAY,
    });
    assert.equal(plan.action, "route");
    assert.equal(plan.pool, "canvas");
    assert.deepEqual(plan.reviewers, ["canvas3"]);
    assert.deepEqual(plan.teamReviewers, []);
    assert.deepEqual(plan.addLabels, ["review-due:2026-09-30"]);
    assert.deepEqual(plan.removeLabels, []);
  });

  test("uses intent labels from the artifact before they are applied", () => {
    const plan = planRouting({ pr: pr(), intentLabels: ["workflow"], config: config(), now: MONDAY });
    assert.equal(plan.pool, "workflow-security");
    assert.deepEqual(plan.reviewers, ["sec1"]);
  });

  test("falls back to backup, then escalation pool, then the team", () => {
    const cfg = config();
    assert.deepEqual(planRouting({ pr: pr({ author: "sec1", labels: ["hooks"] }), config: cfg, now: MONDAY }).reviewers, ["secBackup"]);
    const content = planRouting({ pr: pr({ labels: ["skills"] }), config: cfg, now: MONDAY });
    assert.equal(content.source, "escalation-pool");
    assert.ok(["core1", "core2"].includes(content.reviewers[0]));

    const empty = config({
      pools: { ...rawConfig().pools, "core-maintainers": { team: "github/core", reviewers: [] }, content: { team: "github/content" } },
    });
    const teamPlan = planRouting({ pr: pr({ labels: ["skills"] }), config: empty, now: MONDAY });
    assert.deepEqual(teamPlan.reviewers, []);
    assert.deepEqual(teamPlan.teamReviewers, ["content"]);
    assert.equal(teamPlan.source, "team");
  });

  test("skips drafts, closed PRs, skip labels, and already-routed or reviewed PRs", () => {
    const cfg = config();
    assert.equal(planRouting({ pr: pr({ draft: true }), config: cfg }).reason, "draft");
    assert.equal(planRouting({ pr: pr({ state: "closed" }), config: cfg }).reason, "not-open");
    assert.equal(planRouting({ pr: pr({ labels: ["do-not-merge"] }), config: cfg }).reason, "skipped-label");
    assert.equal(planRouting({ pr: pr({ labels: ["review-due:2026-09-30"] }), config: cfg }).reason, "already-routed");
    assert.equal(planRouting({ pr: pr(), reviews: [review("core1")], config: cfg }).reason, "already-reviewed");
  });

  test("keeps an existing individual request instead of adding another", () => {
    const plan = planRouting({ pr: pr({ labels: ["plugin"], requested: ["someone"] }), config: config(), now: MONDAY });
    assert.equal(plan.source, "existing-request");
    assert.deepEqual(plan.reviewers, []);
    assert.deepEqual(plan.addLabels, ["review-due:2026-09-30"]);
  });

  test("needs-reviewer re-routes, resets the SLA, and removes the request label", () => {
    const plan = planRouting({
      pr: pr({
        labels: ["canvas-extension", "needs-reviewer", "review-due:2026-09-10", "review-overdue", "review-escalated"],
        requested: ["canvas1"],
      }),
      reviews: [review("canvas1", "2026-09-09T00:00:00Z")],
      config: config(),
      now: MONDAY,
    });
    assert.equal(plan.action, "route");
    assert.equal(plan.reason, "needs-reviewer");
    assert.ok(["canvas2", "canvas3"].includes(plan.reviewers[0]));
    assert.deepEqual(plan.addLabels, ["review-due:2026-09-30"]);
    assert.deepEqual(plan.removeLabels.sort(), ["needs-reviewer", "review-due:2026-09-10", "review-escalated", "review-overdue"]);
  });
});

describe("planEscalation", () => {
  const routed = (extra = {}) => pr({ labels: ["canvas-extension", "review-due:2026-09-30", ...(extra.labels ?? [])], requested: extra.requested ?? ["canvas1"] });

  test("is on track through the due date", () => {
    assert.equal(planEscalation({ pr: routed(), config: config(), now: new Date("2026-09-30T20:00:00Z") }).state, "on-track");
  });

  test("marks overdue and requests a backup the next business day", () => {
    const plan = planEscalation({ pr: routed(), config: config(), now: new Date("2026-10-01T14:00:00Z") });
    assert.equal(plan.action, "overdue");
    assert.deepEqual(plan.reviewers, ["canvasBackup"]);
    assert.deepEqual(plan.addLabels, ["review-overdue"]);
    assert.ok(plan.comment.startsWith(COMMENT_MARKERS.overdue));
    assert.match(plan.comment, /@canvasBackup/);
    assert.match(plan.comment, /2026-10-05/);
  });

  test("does not repeat the overdue action and skips weekends", () => {
    const cfg = config();
    assert.equal(planEscalation({ pr: routed({ labels: ["review-overdue"] }), config: cfg, now: new Date("2026-10-02T14:00:00Z") }).state, "overdue");
    // Saturday and Sunday are still before the escalation date (Monday).
    assert.equal(planEscalation({ pr: routed({ labels: ["review-overdue"] }), config: cfg, now: new Date("2026-10-04T14:00:00Z") }).state, "overdue");
  });

  test("escalates to the core pool after four business days", () => {
    const plan = planEscalation({ pr: routed({ labels: ["review-overdue"] }), config: config(), now: new Date("2026-10-05T14:00:00Z") });
    assert.equal(plan.action, "escalate");
    assert.equal(plan.reviewers.length, 1);
    assert.ok(["core1", "core2"].includes(plan.reviewers[0]));
    assert.deepEqual(plan.teamReviewers, ["core"]);
    assert.deepEqual(plan.addLabels, ["review-escalated"]);
    assert.ok(plan.comment.startsWith(COMMENT_MARKERS.escalated));
  });

  test("adds both labels when overdue was skipped, and does not repeat escalation", () => {
    const cfg = config();
    assert.deepEqual(planEscalation({ pr: routed(), config: cfg, now: new Date("2026-10-07T14:00:00Z") }).addLabels, ["review-escalated", "review-overdue"]);
    assert.equal(planEscalation({ pr: routed({ labels: ["review-escalated"] }), config: cfg, now: new Date("2026-10-07T14:00:00Z") }).state, "escalated");
  });

  test("clears SLA labels once a human review arrives after routing", () => {
    const plan = planEscalation({
      pr: routed({ labels: ["review-overdue"] }),
      reviews: [review("canvas1", "2026-10-02T09:00:00Z", "APPROVED")],
      config: config(),
      now: new Date("2026-10-05T14:00:00Z"),
    });
    assert.equal(plan.action, "reviewed");
    assert.deepEqual(plan.removeLabels, ["review-due:2026-09-30", "review-overdue"]);
  });

  test("ignores unrouted PRs", () => {
    assert.equal(planEscalation({ pr: pr({ labels: ["skills"] }), config: config(), now: MONDAY }).reason, "not-routed");
  });
});

function fakeGithub({ pulls = [], reviews = {}, repoLabels = [] } = {}) {
  const calls = [];
  const record = (name) => async (params) => {
    calls.push({ name, params });
    return { data: {} };
  };
  const rest = {
    pulls: {
      list: Symbol("pulls.list"),
      listReviews: Symbol("pulls.listReviews"),
      get: async ({ pull_number }) => ({ data: pulls.find((pull) => pull.number === pull_number) }),
      requestReviewers: record("requestReviewers"),
    },
    issues: {
      listLabelsForRepo: Symbol("issues.listLabelsForRepo"),
      addLabels: record("addLabels"),
      removeLabel: record("removeLabel"),
      createLabel: record("createLabel"),
      createComment: record("createComment"),
      deleteLabel: record("deleteLabel"),
    },
  };
  return {
    calls,
    rest,
    async paginate(method, params) {
      if (method === rest.pulls.list) return params.head ? pulls.filter((pull) => `${pull.head?.repo?.full_name.split("/")[0]}:${pull.head?.ref}` === params.head) : pulls;
      if (method === rest.pulls.listReviews) return reviews[params.pull_number] ?? [];
      if (method === rest.issues.listLabelsForRepo) return repoLabels.map((name) => ({ name }));
      throw new Error("unexpected paginate call");
    },
  };
}

describe("sweeps", () => {
  test("routing sweep spreads requests across the pool and respects dry run", async () => {
    const pulls = [pr({ number: 1, labels: ["canvas-extension"] }), pr({ number: 2, labels: ["canvas-extension"] }), pr({ number: 3, labels: ["review-due:2026-09-30"] })];
    const github = fakeGithub({ pulls });
    const results = await runRoutingSweep({ github, owner: "o", repo: "r", config: config(), now: MONDAY });
    assert.equal(results.length, 2);
    const requested = github.calls.filter((call) => call.name === "requestReviewers").map((call) => call.params.reviewers[0]);
    assert.equal(new Set(requested).size, 2);
    assert.ok(github.calls.some((call) => call.name === "createLabel" && call.params.name === "review-due:2026-09-30"));

    const dryGithub = fakeGithub({ pulls });
    await runRoutingSweep({ github: dryGithub, owner: "o", repo: "r", config: config({ dry_run: true }), now: MONDAY });
    assert.deepEqual(dryGithub.calls, []);
  });

  test("escalation sweep acts on overdue PRs and deletes stale unused due labels", async () => {
    const pulls = [pr({ number: 7, labels: ["plugin", "review-due:2026-09-30"], requested: ["plugin1"] })];
    const github = fakeGithub({ pulls, repoLabels: ["review-due:2026-09-01", "review-due:2026-09-30", "review-due:2026-09-25"] });
    const results = await runEscalationSweep({ github, owner: "o", repo: "r", config: config(), now: new Date("2026-10-01T14:00:00Z") });
    assert.equal(results[0].action, "overdue");
    assert.ok(github.calls.some((call) => call.name === "addLabels" && call.params.labels.includes("review-overdue")));
    assert.ok(github.calls.some((call) => call.name === "createComment"));
    const deleted = github.calls.filter((call) => call.name === "deleteLabel").map((call) => call.params.name);
    assert.deepEqual(deleted, ["review-due:2026-09-01"]);
  });
});

describe("resolveWorkflowRunArtifact", () => {
  const sha = "a".repeat(40);
  const openPr = {
    number: 5,
    state: "open",
    base: { repo: { full_name: "o/r" } },
    head: { sha, ref: "feature", repo: { full_name: "fork/r" } },
  };
  const workflowRun = { id: 99, event: "pull_request", head_sha: sha, head_branch: "feature", head_repository: { full_name: "fork/r" }, pull_requests: [] };

  test("accepts a matching intent artifact and returns intent labels", async () => {
    const github = fakeGithub({ pulls: [openPr] });
    const result = await resolveWorkflowRunArtifact({
      github,
      owner: "o",
      repo: "r",
      workflowRun,
      artifact: { schema_version: "label-pr-intent-result/v1", event: "pull_request", pr_number: 5, head_sha: sha, run_id: "99", desired_labels: ["skills"], managed_labels: [] },
    });
    assert.deepEqual(result, { prNumber: 5, intentLabels: ["skills"] });
  });

  test("rejects forged or mismatched artifacts", async () => {
    const github = fakeGithub({ pulls: [openPr] });
    const base = { schema_version: "review-routing-request/v1", event: "pull_request", pr_number: 5, head_sha: sha, run_id: "99" };
    await assert.rejects(resolveWorkflowRunArtifact({ github, owner: "o", repo: "r", workflowRun, artifact: { ...base, run_id: "1" } }), /run_id/);
    await assert.rejects(
      resolveWorkflowRunArtifact({ github, owner: "o", repo: "r", workflowRun, artifact: { ...base, schema_version: "label-pr-intent-result/v1", desired_labels: ["approved"] } }),
      /unexpected desired label/
    );
    await assert.rejects(resolveWorkflowRunArtifact({ github, owner: "o", repo: "r", workflowRun: { ...workflowRun, head_branch: "other" }, artifact: base }), /head did not match/);
    assert.deepEqual(await resolveWorkflowRunArtifact({ github, owner: "o", repo: "r", workflowRun, artifact: base }), { prNumber: 5, intentLabels: [] });
  });
});

test("formatResultsSummary renders a table", () => {
  const summary = formatResultsSummary([{ prNumber: 1, action: "route", pool: "canvas", reviewers: ["a"], teamReviewers: ["t"], addLabels: ["x"], removeLabels: [], source: "pool" }], {
    title: "Review routing",
    dryRun: true,
  });
  assert.match(summary, /Review routing \(dry run\)/);
  assert.match(summary, /\| #1 \| route \| canvas \| a, team:t \| x \|/);
});
