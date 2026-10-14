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
  limitTargets,
  MAX_MATRIX_TARGETS,
  loadReviewRoutingConfig,
  normalizeReviewRoutingConfig,
  pickReviewer,
  planEscalation,
  planRouting,
  resolveWorkflowRunArtifact,
  cleanupStaleDueLabels,
  coveringReviewers,
  effectiveLabelNames,
  escalatePullRequest,
  planEscalationSweep,
  planRoutingSweep,
  routePullRequest,
  selectPool,
  slaMilestones,
  validateIntentLabels,
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
      workshops: { team: "github/workshops", reviewers: ["workshop1"], backup: [] },
      automation: { team: "github/automation", reviewers: ["auto1"], backup: ["autoBackup"] },
    },
    routes: [
      { label: "workshops", pool: "workshops" },
      { label: "workflow", pool: "automation" },
      { label: "hooks", pool: "automation" },
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
    // Pin the routing contract: label -> pool, in priority order.
    assert.deepEqual(
      loaded.routes.map((route) => [route.label, route.pool]),
      [
        ["workshops", "workshops"],
        ["canvas-extension", "canvas"],
        ["external-plugin", "plugin"],
        ["plugin", "plugin"],
        ["skills", "content"],
        ["agent", "content"],
        ["instructions", "content"],
        ["workflow", "content"],
        ["hooks", "content"],
        ["website-update", "core-maintainers"],
      ]
    );
    assert.deepEqual(Object.keys(loaded.pools).sort(), ["canvas", "content", "core-maintainers", "plugin", "workshops"]);
    assert.equal(loaded.defaultPool, "core-maintainers");
    assert.equal(loaded.escalationPool, "core-maintainers");
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
      escalateOn: "2026-10-02",
    });
  });
});

describe("reviewer selection", () => {
  test("selectPool honors route priority and falls back to the default pool", () => {
    const cfg = config();
    assert.equal(selectPool(["skills", "plugin"], cfg), "plugin");
    assert.equal(selectPool(["plugin", "canvas-extension"], cfg), "canvas");
    assert.equal(selectPool(["canvas-extension", "workflow"], cfg), "automation");
    assert.equal(selectPool(["website-update", "workshops"], cfg), "workshops");
    assert.equal(selectPool(["website-update"], cfg), "core-maintainers");
  });

  test("effectiveLabelNames treats artifact intent labels as authoritative", () => {
    const labels = [{ name: "workflow" }, { name: "needs-reviewer" }, { name: "review-due:2026-09-30" }];
    assert.deepEqual([...effectiveLabelNames(labels, null)].sort(), ["needs-reviewer", "review-due:2026-09-30", "workflow"]);
    assert.deepEqual([...effectiveLabelNames(labels, ["skills"])].sort(), ["needs-reviewer", "review-due:2026-09-30", "skills"]);
    assert.deepEqual([...effectiveLabelNames(labels, [])].sort(), ["needs-reviewer", "review-due:2026-09-30"]);
  });

  test("validateIntentLabels rejects unknown labels", () => {
    assert.deepEqual(validateIntentLabels(["skills", "plugin"]), ["skills", "plugin"]);
    assert.throws(() => validateIntentLabels(["approved"]), /unexpected desired label/);
    assert.throws(() => validateIntentLabels("skills"), /invalid desired_labels/);
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

  test("hasHumanReview ignores the author, bots, pending, and reviews before the boundary", () => {
    assert.equal(hasHumanReview([review("contributor")], "contributor"), false);
    assert.equal(hasHumanReview([review("copilot-pull-request-reviewer[bot]")], "contributor"), false);
    assert.equal(hasHumanReview([review("core1", "2026-09-30T00:00:00Z", "PENDING")], "contributor"), false);
    assert.equal(hasHumanReview([review("core1", "2026-09-20T00:00:00Z")], "contributor", "2026-09-28"), false);
    assert.equal(hasHumanReview([review("core1", "2026-09-29T00:00:00Z")], "contributor", "2026-09-28"), true);
    assert.equal(hasHumanReview([review("core1", "2026-09-28T10:00:00Z")], "contributor", "2026-09-28T15:00:00Z"), false);
    assert.equal(hasHumanReview([review("core1", "2026-09-28T16:00:00Z")], "contributor", "2026-09-28T15:00:00Z"), true);
  });

  test("coveringReviewers counts pool, backup, and core individuals who are requested or reviewed", () => {
    const cfg = config();
    const target = pr({ labels: ["plugin"], requested: ["canvas1", "core2"] });
    assert.deepEqual(coveringReviewers(target, [review("plugin1")], "plugin", cfg), ["core2", "plugin1"]);
    assert.deepEqual(coveringReviewers(pr({ requested: ["canvas1"] }), [], "automation", cfg), []);
  });

  test("coveringReviewers ignores pending requests for unavailable reviewers but keeps their submitted reviews", () => {
    const cfg = config({ unavailable: ["plugin1"] });
    assert.deepEqual(coveringReviewers(pr({ labels: ["plugin"], requested: ["plugin1"] }), [], "plugin", cfg), []);
    assert.deepEqual(coveringReviewers(pr({ labels: ["plugin"] }), [review("plugin1")], "plugin", cfg), ["plugin1"]);
  });

  test("limitTargets caps matrix targets and reports the deferred count", () => {
    const many = Array.from({ length: MAX_MATRIX_TARGETS + 5 }, (_, index) => ({ pr: index + 1 }));
    const limited = limitTargets(many);
    assert.equal(limited.targets.length, MAX_MATRIX_TARGETS);
    assert.equal(limited.deferred, 5);
    assert.deepEqual(limitTargets([{ pr: 1 }]), { targets: [{ pr: 1 }], deferred: 0 });
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

  test("artifact intent labels replace stale current intent labels", () => {
    const cfg = config();
    const stale = pr({ labels: ["workflow"] });
    assert.equal(planRouting({ pr: stale, intentLabels: ["plugin"], config: cfg, now: MONDAY }).pool, "plugin");
    assert.equal(planRouting({ pr: stale, intentLabels: [], config: cfg, now: MONDAY }).pool, "core-maintainers");
    assert.equal(planRouting({ pr: stale, intentLabels: null, config: cfg, now: MONDAY }).pool, "automation");
  });

  test("falls back to backup, then escalation pool, then the team", () => {
    const cfg = config();
    assert.deepEqual(planRouting({ pr: pr({ author: "auto1", labels: ["hooks"] }), config: cfg, now: MONDAY }).reviewers, ["autoBackup"]);
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

  test("skips drafts, closed PRs, skip labels, covered routed PRs, and reviewed unrouted PRs", () => {
    const cfg = config();
    assert.equal(planRouting({ pr: pr({ draft: true }), config: cfg }).reason, "draft");
    assert.equal(planRouting({ pr: pr({ state: "closed" }), config: cfg }).reason, "not-open");
    assert.equal(planRouting({ pr: pr({ labels: ["do-not-merge"] }), config: cfg }).reason, "skipped-label");
    assert.equal(planRouting({ pr: pr({ labels: ["review-due:2026-09-30"], requested: ["core1"] }), config: cfg }).reason, "already-routed");
    assert.equal(planRouting({ pr: pr(), reviews: [review("core1")], config: cfg }).reason, "already-reviewed");
  });

  test("a covering reviewer already requested is kept; a non-pool request still gets a pool reviewer", () => {
    const covered = planRouting({ pr: pr({ labels: ["plugin"], requested: ["plugin1"] }), config: config(), now: MONDAY });
    assert.equal(covered.source, "covered");
    assert.deepEqual(covered.reviewers, []);
    assert.deepEqual(covered.addLabels, ["review-due:2026-09-30"]);

    const manual = planRouting({ pr: pr({ labels: ["plugin"], requested: ["someone"] }), config: config(), now: MONDAY });
    assert.deepEqual(manual.reviewers, ["plugin1"]);
  });

  test("re-routes an already-routed PR when a new head changes the pool, keeping the SLA", () => {
    const routed = pr({ labels: ["canvas-extension", "review-due:2026-09-30"], requested: ["canvas1"] });
    const plan = planRouting({ pr: routed, intentLabels: ["canvas-extension", "workflow"], config: config(), now: new Date("2026-09-29T10:00:00Z") });
    assert.equal(plan.action, "route");
    assert.equal(plan.reason, "pool-changed");
    assert.equal(plan.pool, "automation");
    assert.deepEqual(plan.reviewers, ["auto1"]);
    assert.deepEqual(plan.addLabels, []);
    assert.deepEqual(plan.removeLabels, []);
    assert.equal(plan.dueDate, "2026-09-30");

    const unchanged = planRouting({ pr: routed, intentLabels: ["canvas-extension"], config: config() });
    assert.equal(unchanged.reason, "already-routed");
  });

  test("does not re-request a team after someone reviewed when no individuals are configured", () => {
    const empty = config({
      pools: { ...rawConfig().pools, "core-maintainers": { team: "github/core", reviewers: [] }, content: { team: "github/content" } },
    });
    const routed = pr({ labels: ["skills", "review-due:2026-09-30"] });
    assert.equal(planRouting({ pr: routed, reviews: [review("someone")], config: empty }).reason, "already-routed");
    assert.deepEqual(planRouting({ pr: routed, config: empty }).teamReviewers, ["content"]);
  });

  test("needs-reviewer re-routes, restarts the SLA, and removes the request label", () => {
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

  test("needs-reviewer skips reviewers who already submitted a review", () => {
    const plan = planRouting({
      pr: pr({ labels: ["canvas-extension", "needs-reviewer", "review-due:2026-09-10"], requested: ["canvas1"] }),
      reviews: [review("canvas2", "2026-09-09T00:00:00Z")],
      config: config(),
      now: MONDAY,
    });
    assert.equal(plan.action, "route");
    assert.deepEqual(plan.reviewers, ["canvas3"]);
  });

  test("needs-reviewer with no new reviewer to request leaves labels and the SLA unchanged", () => {
    const plan = planRouting({
      pr: pr({ labels: ["plugin", "needs-reviewer", "review-due:2026-09-10"], requested: ["plugin1"], teams: ["plugin"] }),
      config: config({ unavailable: ["core1", "core2"] }),
      now: MONDAY,
    });
    assert.equal(plan.action, "skip");
    assert.equal(plan.reason, "no-reviewer-available");
    assert.equal(plan.addLabels, undefined);
    assert.equal(plan.removeLabels, undefined);
  });

  test("needs-reviewer removes and re-adds a same-date due label to mark a new SLA cycle", () => {
    const plan = planRouting({ pr: pr({ labels: ["plugin", "needs-reviewer", "review-due:2026-09-30"] }), config: config(), now: MONDAY });
    assert.deepEqual(plan.removeLabels, ["review-due:2026-09-30", "needs-reviewer"]);
    assert.deepEqual(plan.addLabels, ["review-due:2026-09-30"]);
  });
});

describe("planEscalation", () => {
  const routed = (extra = {}) =>
    pr({ labels: [extra.pool ?? "canvas-extension", `review-due:${extra.due ?? "2026-09-30"}`, ...(extra.labels ?? [])], requested: extra.requested ?? ["canvas1"] });

  test("is on track through the due date", () => {
    assert.equal(planEscalation({ pr: routed(), config: config(), now: new Date("2026-09-30T20:00:00Z") }).state, "on-track");
  });

  test("marks overdue and requests a backup the next business day", () => {
    const plan = planEscalation({ pr: routed(), config: config(), now: new Date("2026-10-01T14:00:00Z") });
    assert.equal(plan.action, "overdue");
    assert.deepEqual(plan.reviewers, ["canvasBackup"]);
    assert.deepEqual(plan.addLabels, ["review-overdue"]);
    assert.ok(plan.comment.startsWith(COMMENT_MARKERS.overdue));
    assert.match(plan.comment, /Requesting backup reviewer @canvasBackup/);
    assert.match(plan.comment, /2026-10-02/);
  });

  test("falls back to a team when no backup individual is available, and says so", () => {
    const noBackups = config({ unavailable: ["core1", "core2"], pools: { ...rawConfig().pools, canvas: { team: "github/canvas", reviewers: ["canvas1"] } } });
    const now = new Date("2026-10-01T14:00:00Z");
    const plan = planEscalation({ pr: routed(), config: noBackups, now });
    assert.deepEqual(plan.reviewers, []);
    assert.deepEqual(plan.teamReviewers, ["canvas"]);
    assert.match(plan.comment, /requesting the @github\/canvas team/);

    const allRequested = planEscalation({ pr: { ...routed(), requested_teams: [{ slug: "canvas" }, { slug: "core" }] }, config: noBackups, now });
    assert.deepEqual(allRequested.reviewers, []);
    assert.deepEqual(allRequested.teamReviewers, []);
    assert.match(allRequested.comment, /No additional reviewer is available/);
  });

  test("does not repeat the overdue action and skips weekends", () => {
    const cfg = config();
    // Routed Wednesday 2026-09-30: due Friday, overdue Monday, escalates Tuesday.
    const wednesday = (labels = []) => routed({ due: "2026-10-02", labels });
    assert.equal(planEscalation({ pr: wednesday(), config: cfg, now: new Date("2026-10-03T14:00:00Z") }).state, "on-track");
    assert.equal(planEscalation({ pr: wednesday(), config: cfg, now: new Date("2026-10-04T14:00:00Z") }).state, "on-track");
    assert.equal(planEscalation({ pr: wednesday(), config: cfg, now: new Date("2026-10-05T14:00:00Z") }).action, "overdue");
    assert.equal(planEscalation({ pr: wednesday(["review-overdue"]), config: cfg, now: new Date("2026-10-05T20:00:00Z") }).state, "overdue");
    assert.equal(planEscalation({ pr: wednesday(["review-overdue"]), config: cfg, now: new Date("2026-10-06T14:00:00Z") }).action, "escalate");
  });

  test("escalates to the core pool four business days after routing", () => {
    const plan = planEscalation({ pr: routed({ labels: ["review-overdue"] }), config: config(), now: new Date("2026-10-02T14:00:00Z") });
    assert.equal(plan.action, "escalate");
    assert.equal(plan.escalateOn, "2026-10-02");
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
      reviews: [review("canvas1", "2026-10-01T09:00:00Z", "APPROVED")],
      config: config(),
      now: new Date("2026-10-02T14:00:00Z"),
    });
    assert.equal(plan.action, "reviewed");
    assert.deepEqual(plan.removeLabels, ["review-due:2026-09-30", "review-overdue"]);
  });

  test("uses the exact routing time so earlier same-day reviews do not count", () => {
    const args = { pr: routed(), config: config(), now: new Date("2026-10-01T14:00:00Z"), routedAt: "2026-09-28T15:00:00Z" };
    assert.equal(planEscalation({ ...args, reviews: [review("canvas1", "2026-09-28T10:00:00Z")] }).action, "overdue");
    assert.equal(planEscalation({ ...args, reviews: [review("canvas1", "2026-09-28T16:00:00Z")] }).action, "reviewed");
  });

  test("comments show the actual routing date when routing happened on a non-business day", () => {
    // Routed Saturday 2026-09-26: due Tuesday 2026-09-29, overdue Wednesday.
    const plan = planEscalation({ pr: routed({ due: "2026-09-29" }), config: config(), now: new Date("2026-09-30T14:00:00Z"), routedAt: "2026-09-26T12:00:00Z" });
    assert.equal(plan.action, "overdue");
    assert.match(plan.comment, /pool on 2026-09-26;/);
  });

  test("ignores unrouted PRs", () => {
    assert.equal(planEscalation({ pr: pr({ labels: ["skills"] }), config: config(), now: MONDAY }).reason, "not-routed");
  });
});

function fakeGithub({ pulls = [], reviews = {}, events = {}, repoLabels = [], failRequest = false } = {}) {
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
      requestReviewers: async (params) => {
        calls.push({ name: "requestReviewers", params });
        if (failRequest) throw Object.assign(new Error("Reviews may only be requested from collaborators"), { status: 422 });
        return { data: {} };
      },
    },
    issues: {
      listEvents: Symbol("issues.listEvents"),
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
      if (method === rest.issues.listEvents) return events[params.issue_number] ?? [];
      if (method === rest.issues.listLabelsForRepo) return repoLabels.map((name) => ({ name }));
      throw new Error("unexpected paginate call");
    },
  };
}

const writeCalls = (github) => github.calls.map((call) => call.name);

describe("GitHub runners", () => {
  test("planRoutingSweep is read-only and returns route plans", async () => {
    const pulls = [pr({ number: 1, labels: ["canvas-extension"] }), pr({ number: 2, labels: ["review-due:2026-09-30"], requested: ["core1"] }), pr({ number: 3, draft: true })];
    const github = fakeGithub({ pulls });
    const plans = await planRoutingSweep({ github, owner: "o", repo: "r", config: config(), now: MONDAY });
    assert.deepEqual(plans.map((plan) => [plan.prNumber, plan.action]), [[1, "route"], [2, "skip"]]);
    assert.deepEqual(github.calls, []);
  });

  test("routePullRequest requests, creates the due label, and respects dry run", async () => {
    const pulls = [pr({ number: 1, labels: ["canvas-extension"] })];
    const github = fakeGithub({ pulls });
    const plan = await routePullRequest({ github, owner: "o", repo: "r", config: config(), prNumber: 1, now: MONDAY });
    assert.equal(plan.action, "route");
    assert.deepEqual(writeCalls(github), ["requestReviewers", "createLabel", "addLabels"]);

    const dry = fakeGithub({ pulls });
    await routePullRequest({ github: dry, owner: "o", repo: "r", config: config({ dry_run: true }), prNumber: 1, now: MONDAY });
    assert.deepEqual(dry.calls, []);
  });

  test("a failed reviewer request leaves labels untouched so the next run retries", async () => {
    const pulls = [pr({ number: 1, labels: ["canvas-extension", "needs-reviewer"] })];
    const github = fakeGithub({ pulls, failRequest: true });
    const plan = await routePullRequest({ github, owner: "o", repo: "r", config: config(), prNumber: 1, now: MONDAY });
    assert.match(plan.requestError, /collaborators/);
    assert.deepEqual(writeCalls(github), ["requestReviewers"]);
  });

  test("routePullRequest skips when the PR head moved after the intent artifact", async () => {
    const pulls = [{ ...pr({ number: 1 }), head: { sha: "b".repeat(40) } }];
    const github = fakeGithub({ pulls });
    const plan = await routePullRequest({ github, owner: "o", repo: "r", config: config(), prNumber: 1, intentLabels: ["skills"], expectedHeadSha: "a".repeat(40) });
    assert.equal(plan.reason, "stale-head");
    assert.deepEqual(github.calls, []);
  });

  test("escalation uses the due label's labeled event as the review boundary", async () => {
    const pulls = [pr({ number: 7, labels: ["plugin", "review-due:2026-09-30"], requested: ["plugin1"] })];
    const events = { 7: [{ event: "labeled", label: { name: "review-due:2026-09-30" }, created_at: "2026-09-28T15:00:00Z" }] };
    const reviews = { 7: [review("plugin1", "2026-09-28T10:00:00Z")] };
    const now = new Date("2026-10-01T14:00:00Z");

    const plans = await planEscalationSweep({ github: fakeGithub({ pulls, events, reviews }), owner: "o", repo: "r", config: config(), now });
    assert.equal(plans[0].action, "overdue");
    assert.equal(plans[0].routedAt, "2026-09-28T15:00:00Z");

    const github = fakeGithub({ pulls, events, reviews });
    const plan = await escalatePullRequest({ github, owner: "o", repo: "r", config: config(), prNumber: 7, now });
    assert.equal(plan.action, "overdue");
    assert.ok(github.calls.some((call) => call.name === "addLabels" && call.params.labels.includes("review-overdue")));
    assert.ok(github.calls.some((call) => call.name === "createComment"));
  });

  test("a failed escalation request does not add labels or comments", async () => {
    const pulls = [pr({ number: 7, labels: ["plugin", "review-due:2026-09-30"], requested: ["plugin1"] })];
    const github = fakeGithub({ pulls, failRequest: true });
    const plan = await escalatePullRequest({ github, owner: "o", repo: "r", config: config(), prNumber: 7, now: new Date("2026-10-02T14:00:00Z") });
    assert.equal(plan.action, "escalate");
    assert.ok(plan.requestError);
    assert.deepEqual(writeCalls(github), ["requestReviewers"]);
  });

  test("cleanupStaleDueLabels deletes only old, unused due labels", async () => {
    const pulls = [pr({ number: 7, labels: ["review-due:2026-09-01"] })];
    const github = fakeGithub({ pulls, repoLabels: ["review-due:2026-09-01", "review-due:2026-09-02", "review-due:2026-09-30", "plugin"] });
    const deleted = await cleanupStaleDueLabels({ github, owner: "o", repo: "r", config: config(), now: new Date("2026-10-01T14:00:00Z") });
    assert.deepEqual(deleted, ["review-due:2026-09-02"]);
    assert.deepEqual(writeCalls(github), ["deleteLabel"]);
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

  test("accepts a matching intent artifact and returns authoritative intent labels", async () => {
    const github = fakeGithub({ pulls: [openPr] });
    const result = await resolveWorkflowRunArtifact({
      github,
      owner: "o",
      repo: "r",
      workflowRun,
      artifact: { schema_version: "label-pr-intent-result/v1", event: "pull_request", pr_number: 5, head_sha: sha, run_id: "99", desired_labels: ["skills"], managed_labels: [] },
    });
    assert.deepEqual(result, { prNumber: 5, headSha: sha, intentLabels: ["skills"] });
  });

  test("rejects forged or mismatched artifacts; request artifacts carry no intent labels", async () => {
    const github = fakeGithub({ pulls: [openPr] });
    const base = { schema_version: "review-routing-request/v1", event: "pull_request", pr_number: 5, head_sha: sha, run_id: "99" };
    await assert.rejects(resolveWorkflowRunArtifact({ github, owner: "o", repo: "r", workflowRun, artifact: { ...base, run_id: "1" } }), /run_id/);
    await assert.rejects(
      resolveWorkflowRunArtifact({ github, owner: "o", repo: "r", workflowRun, artifact: { ...base, schema_version: "label-pr-intent-result/v1", desired_labels: ["approved"] } }),
      /unexpected desired label/
    );
    await assert.rejects(resolveWorkflowRunArtifact({ github, owner: "o", repo: "r", workflowRun: { ...workflowRun, head_branch: "other" }, artifact: base }), /head did not match/);
    assert.deepEqual(await resolveWorkflowRunArtifact({ github, owner: "o", repo: "r", workflowRun, artifact: base }), { prNumber: 5, headSha: sha, intentLabels: null });
  });
});

test("formatResultsSummary renders a table", () => {
  const summary = formatResultsSummary(
    [{ prNumber: 1, action: "route", pool: "canvas", reviewers: ["a"], teamReviewers: ["t"], addLabels: ["x"], removeLabels: [], source: "pool", requestError: "boom" }],
    { title: "Review routing", dryRun: true }
  );
  assert.match(summary, /Review routing \(dry run\)/);
  assert.match(summary, /\| #1 \| route \| canvas \| a, team:t \| x \|/);
  assert.match(summary, /request failed: boom/);
});
