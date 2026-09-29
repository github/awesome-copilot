#!/usr/bin/env node
// Submission gate: aggregate check evaluation, merge-risk tiers, approval policy,
// PR state machine, status comment rendering, and PR commands.
// Used by .github/workflows/submission-gate*.yml and pr-commands.yml.
// See docs/maintainers/submission-gate.md.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as yaml from "js-yaml";

export const GATE_CHECK_NAME = "submission-gate";
export const GATE_WORKFLOW_FILE = "submission-gate.yml";
export const STATUS_MARKER = "<!-- submission-gate-status -->";
export const RISK_TIERS = ["low", "medium", "high"];
export const RISK_LABELS = RISK_TIERS.map((tier) => `merge-risk:${tier}`);
export const STATE_LABELS = [
  "awaiting-automation",
  "requires-submitter-fixes",
  "ready-for-review",
  "review-in-progress",
  "approved",
];
export const PR_EVENTS = new Set(["pull_request", "pull_request_review"]);
// PRs carrying these labels have their state labels managed by another workflow.
export const STATE_LABEL_OWNERS = ["external-plugin"];

const WRITE_PERMISSIONS = new Set(["admin", "maintain", "write"]);
const MAINTAINER_PERMISSIONS = new Set(["admin", "maintain"]);
const RERUNNABLE_CONCLUSIONS = new Set(["failure", "cancelled", "timed_out", "startup_failure"]);

const STATE_DISPLAY = {
  "awaiting-automation": { icon: "⏳", text: "Awaiting automation" },
  "requires-submitter-fixes": { icon: "🛠️", text: "Requires submitter fixes" },
  "ready-for-review": { icon: "👀", text: "Ready for review" },
  "review-in-progress": { icon: "💬", text: "Review in progress" },
  approved: { icon: "✅", text: "Approved" },
};

// ---------------------------------------------------------------------------
// Configuration and path matching
// ---------------------------------------------------------------------------

/** Convert a GitHub Actions style path glob to a RegExp. */
export function globToRegExp(glob) {
  let source = "";
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
    if (char === "*") {
      if (glob[i + 1] === "*") {
        if (glob[i + 2] === "/") {
          source += "(?:.*/)?";
          i += 2;
        } else {
          source += ".*";
          i += 1;
        }
      } else {
        source += "[^/]*";
      }
    } else if (char === "?") {
      source += "[^/]";
    } else {
      source += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${source}$`);
}

const globCache = new Map();
export function matchesAny(filePath, globs = []) {
  return globs.some((glob) => {
    if (!globCache.has(glob)) globCache.set(glob, globToRegExp(glob));
    return globCache.get(glob).test(filePath);
  });
}

function readYamlIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return yaml.load(fs.readFileSync(filePath, "utf8"));
}

/** Load the gate, risk-tier, and (optional) review-routing configuration. */
export function loadGateConfig(rootDir = process.cwd()) {
  const gate = readYamlIfExists(path.join(rootDir, ".github", "submission-gate.yml"));
  const tiers = readYamlIfExists(path.join(rootDir, ".github", "risk-tiers.yml"));
  if (!gate || !Array.isArray(gate.checks)) throw new Error(".github/submission-gate.yml is missing or has no checks");
  if (!tiers || !tiers.high || !tiers.medium || !tiers.low) throw new Error(".github/risk-tiers.yml is missing a tier");

  let routing = null;
  try {
    routing = readYamlIfExists(path.join(rootDir, ".github", "review-routing.yml"));
  } catch (error) {
    routing = null;
    console.warn(`Ignoring unreadable .github/review-routing.yml: ${error.message}`);
  }
  return { gate, tiers, routing };
}

function fileNames(files) {
  const names = [];
  for (const file of files) {
    names.push(file.filename);
    if (file.previous_filename) names.push(file.previous_filename);
  }
  return names;
}

/** Checks that apply to this PR, mirroring each workflow's branch and path filters. */
export function selectApplicableChecks(checks, files, baseRef) {
  const names = fileNames(files);
  return checks.filter((check) => {
    const branches = check.branches;
    if (Array.isArray(branches) && branches.length > 0 && !branches.includes("*") && !branches.includes(baseRef)) {
      return false;
    }
    if (Array.isArray(check.paths) && check.paths.length > 0) {
      return names.some((name) => matchesAny(name, check.paths));
    }
    return true;
  });
}

// ---------------------------------------------------------------------------
// Risk tiers
// ---------------------------------------------------------------------------

function addedLines(patch) {
  if (typeof patch !== "string") return [];
  return patch
    .split("\n")
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.slice(1));
}

/**
 * Classify a PR into exactly one merge-risk tier.
 * @returns {{tier: 'low'|'medium'|'high', reasons: string[]}}
 */
export function classifyRisk({ files, labels = [], contributorRisk = null, tiers }) {
  const high = tiers.high || {};
  const low = tiers.low || {};
  const reasons = [];

  for (const file of files) {
    for (const name of fileNames([file])) {
      if (matchesAny(name, high.exclude_paths || [])) continue;
      if (matchesAny(name, high.paths || [])) {
        reasons.push(`\`${name}\` is a high-risk path (automation, scripts, MCP config, hooks, or review policy)`);
        break;
      }
    }
  }

  for (const capability of high.capabilities || []) {
    const pattern = new RegExp(capability.pattern);
    for (const file of files) {
      if (Array.isArray(capability.files) && !matchesAny(file.filename, capability.files)) continue;
      if (addedLines(file.patch).some((line) => pattern.test(line))) {
        reasons.push(`${capability.description} in \`${file.filename}\``);
      }
    }
  }

  for (const label of high.labels || []) {
    if (labels.includes(label)) reasons.push(`Label \`${label}\` flags a high contributor-risk signal`);
  }
  if (String(contributorRisk || "").toUpperCase() === "HIGH" && !reasons.some((r) => r.includes("contributor-risk"))) {
    reasons.push("Contributor reputation check reported a high contributor-risk signal");
  }

  if (reasons.length > 0) return { tier: "high", reasons: [...new Set(reasons)] };

  const names = fileNames(files);
  if (names.every((name) => matchesAny(name, low.paths || []))) {
    return { tier: "low", reasons: ["Only documentation, metadata, or generated files changed"] };
  }

  const small = low.small_update || {};
  const maxLines = Number(small.max_changed_lines ?? 0);
  const totalChanges = files.reduce((sum, file) => sum + Number(file.changes ?? (file.additions || 0) + (file.deletions || 0)), 0);
  const onlyModifiesResources = files.every(
    (file) =>
      file.status === "modified" &&
      (matchesAny(file.filename, low.paths || []) || matchesAny(file.filename, small.resource_paths || []))
  );
  if (onlyModifiesResources && totalChanges <= maxLines) {
    return {
      tier: "low",
      reasons: [`Small update (${totalChanges} changed lines) to existing resources with no added or removed files`],
    };
  }

  const mediumReasons = [];
  const added = files.filter((file) => file.status === "added").map((file) => file.filename);
  if (added.length > 0) mediumReasons.push(`Adds ${added.length} file(s), e.g. \`${added[0]}\``);
  if (files.some((file) => ["removed", "renamed"].includes(file.status))) mediumReasons.push("Removes or renames files");
  if (totalChanges > maxLines) mediumReasons.push(`Changes ${totalChanges} lines (low-risk limit is ${maxLines})`);
  if (mediumReasons.length === 0) mediumReasons.push("Changes files outside the low-risk documentation and resource paths");
  return { tier: "medium", reasons: mediumReasons };
}

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------

/** Normalize review-routing.yml into a Map of pool key -> Set of lowercase logins. */
export function normalizeRouting(routing) {
  const pools = new Map();
  const source = routing?.pools || routing?.teams || {};
  if (!source || typeof source !== "object") return pools;
  for (const [key, value] of Object.entries(source)) {
    const logins = new Set();
    const add = (list) => {
      if (!Array.isArray(list)) return;
      for (const entry of list) {
        const login = typeof entry === "string" ? entry : entry?.login;
        if (typeof login === "string" && login.trim()) logins.add(login.trim().replace(/^@/, "").toLowerCase());
      }
    };
    if (Array.isArray(value)) add(value);
    else {
      add(value?.reviewers);
      add(value?.members);
      add(value?.backup);
    }
    pools.set(key, logins);
  }
  return pools;
}

function unionPools(pools, keys) {
  const union = new Set();
  for (const key of keys) for (const login of pools.get(key) || []) union.add(login);
  return union;
}

/** Domain areas touched by the PR (used to pick the domain reviewer pool). */
export function touchedDomains(files, domains = {}) {
  const names = fileNames(files);
  return Object.entries(domains)
    .filter(([, domain]) => names.some((name) => matchesAny(name, domain.paths || [])))
    .map(([id, domain]) => ({ id, pools: domain.pools || [] }));
}

/**
 * Evaluate reviews against the approval policy of a tier.
 * `permissions` maps lowercase login -> repository permission (admin|maintain|write|triage|read|none).
 */
export function evaluateApprovals({ tier, tiers, reviews = [], author, permissions = new Map(), routing = null, files = [] }) {
  const policy = tiers[tier]?.approvals || {};
  const required = Number(policy.required || 1);
  const pools = normalizeRouting(routing);
  const allPoolMembers = unionPools(pools, [...pools.keys()]);
  const authorLogin = String(author || "").toLowerCase();

  const qualified = (login) => WRITE_PERMISSIONS.has(permissions.get(login)) || allPoolMembers.has(login);

  const latest = new Map();
  const reviewed = new Set();
  const sorted = [...reviews].sort((a, b) => new Date(a.submitted_at || 0) - new Date(b.submitted_at || 0));
  for (const review of sorted) {
    const login = String(review.user?.login || "").toLowerCase();
    if (!login || login === authorLogin || review.user?.type === "Bot") continue;
    if (review.state === "PENDING") continue;
    reviewed.add(login);
    if (["APPROVED", "CHANGES_REQUESTED", "DISMISSED"].includes(review.state)) latest.set(login, review.state);
  }

  const approvers = [...latest].filter(([login, state]) => state === "APPROVED" && qualified(login)).map(([login]) => login);
  const changesRequestedBy = [...latest]
    .filter(([login, state]) => state === "CHANGES_REQUESTED" && qualified(login))
    .map(([login]) => login);
  const reviewers = [...reviewed].filter(qualified);

  const missing = [];
  const notes = [];
  const requirements = [`${required} approval${required === 1 ? "" : "s"} from reviewers with write access`];
  if (approvers.length < required) missing.push(`${required - approvers.length} more approval(s)`);

  const coreMembers = unionPools(pools, tiers.core_pools || []);
  if (policy.require_domain) {
    const domainPoolKeys = touchedDomains(files, tiers.domains).flatMap((domain) => domain.pools);
    const domainMembers = unionPools(pools, domainPoolKeys);
    if (domainMembers.size > 0) {
      requirements.push(`including a domain reviewer (${[...new Set(domainPoolKeys)].join(", ")})`);
      if (!approvers.some((login) => domainMembers.has(login) || coreMembers.has(login))) {
        missing.push(`an approval from the ${[...new Set(domainPoolKeys)].join("/")} reviewer pool`);
      }
    } else {
      notes.push("No staffed domain reviewer pool matches this PR yet; any reviewer with write access satisfies the domain requirement.");
    }
  }

  if (policy.require_core) {
    if (coreMembers.size > 0) {
      requirements.push("including a core or security maintainer");
      if (!approvers.some((login) => coreMembers.has(login))) missing.push("an approval from a core or security maintainer");
    } else {
      requirements.push("including a maintainer with admin or maintain permission");
      notes.push("Core/security reviewer pools are not staffed yet; an approver with admin or maintain permission is required instead.");
      if (!approvers.some((login) => MAINTAINER_PERMISSIONS.has(permissions.get(login)))) {
        missing.push("an approval from a maintainer with admin or maintain permission");
      }
    }
  }

  if (changesRequestedBy.length > 0) missing.push(`resolution of changes requested by ${changesRequestedBy.join(", ")}`);

  return {
    tier,
    required,
    requirement: requirements.join(", "),
    approvers,
    changesRequestedBy,
    reviewers,
    missing,
    notes,
    satisfied: missing.length === 0,
  };
}

// ---------------------------------------------------------------------------
// Check evaluation
// ---------------------------------------------------------------------------

function toRegExps(patterns = []) {
  return patterns.map((pattern) => new RegExp(pattern));
}

/** Decide whether a failed workflow run is an infrastructure or a contribution failure. */
export function classifyFailure(check, jobs, infrastructureSteps = []) {
  if (check.failure_kind === "infrastructure") {
    return { category: "infrastructure", detail: "The workflow did not complete successfully" };
  }
  if (!Array.isArray(jobs)) {
    return { category: "contribution", detail: "The check reported a failure" };
  }
  const contributionPatterns = toRegExps(check.contribution_steps);
  const infraPatterns = toRegExps(infrastructureSteps);
  const failedJobs = jobs.filter((job) => ["failure", "timed_out", "cancelled", "startup_failure"].includes(job.conclusion));
  if (failedJobs.length === 0) {
    return { category: "infrastructure", detail: "The workflow failed before any job ran" };
  }

  let infraDetail = null;
  for (const job of failedJobs) {
    if (job.conclusion !== "failure") {
      infraDetail ??= `Job \`${job.name}\` ${job.conclusion.replace("_", " ")}`;
      continue;
    }
    const step = (job.steps || []).find((candidate) => candidate.conclusion === "failure");
    if (!step) {
      infraDetail ??= `Job \`${job.name}\` failed outside of a step`;
      continue;
    }
    if (contributionPatterns.some((pattern) => pattern.test(step.name))) {
      return { category: "contribution", detail: `Failed step: \`${step.name}\`` };
    }
    if (infraPatterns.some((pattern) => pattern.test(step.name))) {
      infraDetail ??= `Failed step: \`${step.name}\``;
      continue;
    }
    return { category: "contribution", detail: `Failed step: \`${step.name}\`` };
  }
  return { category: "infrastructure", detail: infraDetail || "The workflow did not complete successfully" };
}

/**
 * Evaluate one applicable check.
 * `observation` is {found, status, conclusion, url, jobs}. `gaveUp` means the gate stopped waiting.
 */
export function evaluateCheck(check, observation, { gaveUp = false, infrastructureSteps = [] } = {}) {
  const base = {
    id: check.id,
    title: check.title || check.id,
    required: check.required !== false,
    url: observation?.url || null,
    hint: check.hint || null,
    category: null,
  };

  if (!observation || !observation.found) {
    if (!gaveUp) return { ...base, outcome: "pending", detail: "Waiting for the check to start" };
    if (check.optional) return { ...base, outcome: "skipped", detail: "Not reported for this commit" };
    return {
      ...base,
      outcome: "failure",
      category: "infrastructure",
      detail: "The check did not report a result for this commit",
    };
  }

  if (observation.status !== "completed") {
    if (!gaveUp) return { ...base, outcome: "pending", detail: observation.status === "queued" ? "Queued" : "Running" };
    return { ...base, outcome: "failure", category: "infrastructure", detail: "Did not finish before the gate stopped waiting" };
  }

  switch (observation.conclusion) {
    case "success":
    case "neutral":
      return { ...base, outcome: "pass", detail: "Passed" };
    case "skipped":
      return { ...base, outcome: "skipped", detail: "Skipped by its workflow" };
    case "action_required":
      return {
        ...base,
        outcome: "failure",
        category: "infrastructure",
        detail: "Waiting for a maintainer to approve workflow runs for this PR",
      };
    case "cancelled":
    case "timed_out":
    case "startup_failure":
    case "stale":
      return {
        ...base,
        outcome: "failure",
        category: "infrastructure",
        detail: `Workflow ${String(observation.conclusion).replace("_", " ")}`,
      };
    case "failure": {
      const { category, detail } = classifyFailure(check, observation.jobs, infrastructureSteps);
      return { ...base, outcome: "failure", category, detail };
    }
    default:
      return {
        ...base,
        outcome: "failure",
        category: "infrastructure",
        detail: `Unexpected conclusion \`${observation.conclusion}\``,
      };
  }
}

/** Group check results into gate-relevant buckets. */
export function summarizeChecks(results) {
  const failures = results.filter((result) => result.outcome === "failure");
  return {
    results,
    passed: results.filter((result) => result.outcome === "pass" || result.outcome === "skipped"),
    pending: results.filter((result) => result.outcome === "pending"),
    contributionFailures: failures.filter((result) => result.required && result.category === "contribution"),
    infrastructureFailures: failures.filter((result) => result.required && result.category === "infrastructure"),
    warnings: failures.filter((result) => !result.required),
  };
}

/** PR state machine. Returns one of STATE_LABELS. */
export function computeState({ automation, approvals }) {
  if (automation.contributionFailures.length > 0 || approvals.changesRequestedBy.length > 0) {
    return "requires-submitter-fixes";
  }
  if (automation.pending.length > 0 || automation.infrastructureFailures.length > 0) return "awaiting-automation";
  if (approvals.satisfied) return "approved";
  if (approvals.reviewers.length > 0) return "review-in-progress";
  return "ready-for-review";
}

/** Human-readable reasons the gate is not passing. */
export function gateFailureSummary(evaluation) {
  const lines = [];
  const { automation, approvals } = evaluation;
  if (automation.contributionFailures.length > 0) {
    lines.push(`Contribution failures: ${automation.contributionFailures.map((r) => r.title).join(", ")}`);
  }
  if (automation.infrastructureFailures.length > 0) {
    lines.push(
      `Infrastructure failures (not caused by the contribution; comment /rerun-checks): ${automation.infrastructureFailures
        .map((r) => r.title)
        .join(", ")}`
    );
  }
  if (automation.pending.length > 0) lines.push(`Still pending: ${automation.pending.map((r) => r.title).join(", ")}`);
  if (!approvals.satisfied) lines.push(`Waiting on review (merge-risk:${evaluation.risk.tier}): needs ${approvals.missing.join("; ")}`);
  return lines;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/** Neutralize untrusted text for inclusion in markdown (mentions, tables, HTML). */
export function sanitize(text, maxLength = 300) {
  let value = String(text ?? "")
    .replace(/@/g, "@\u200b")
    .replace(/[<>]/g, (char) => (char === "<" ? "&lt;" : "&gt;"))
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ");
  if (value.length > maxLength) value = `${value.slice(0, maxLength - 1)}…`;
  return value;
}

function outcomeCell(result) {
  if (result.outcome === "pass") return "✅ Passed";
  if (result.outcome === "skipped") return "⏭️ Skipped";
  if (result.outcome === "pending") return "⏳ Pending";
  if (!result.required) return "⚠️ Failed (advisory, non-blocking)";
  return result.category === "contribution" ? "❌ Contribution failure" : "🔧 Infrastructure failure";
}

export function renderStatusComment(evaluation, { gateRunUrl = null } = {}) {
  const { state, risk, automation, approvals, reviewAssignment, headSha } = evaluation;
  const display = STATE_DISPLAY[state];
  const tierDescription = evaluation.tierDescription || "";
  const lines = [
    STATUS_MARKER,
    `## 🚦 Submission status: ${display.icon} ${display.text}`,
    "",
    `**Risk tier:** \`merge-risk:${risk.tier}\`${tierDescription ? ` — ${tierDescription}` : ""}`,
    `**Required to merge:** passing \`${GATE_CHECK_NAME}\` checks plus ${approvals.requirement}.`,
    "",
    "<details><summary>Why this tier</summary>",
    "",
    ...risk.reasons.slice(0, 15).map((reason) => `- ${sanitize(reason, 200)}`),
    ...(risk.reasons.length > 15 ? [`- …and ${risk.reasons.length - 15} more`] : []),
    "",
    "</details>",
    "",
    "### Automated checks",
    "",
  ];

  if (automation.results.length === 0) {
    lines.push("_No automated checks apply to this PR._");
  } else {
    lines.push("| Check | Status | Details |", "|---|---|---|");
    for (const result of automation.results) {
      const detail = result.url ? `${sanitize(result.detail)} · [logs](${result.url})` : sanitize(result.detail);
      lines.push(`| ${sanitize(result.title)} | ${outcomeCell(result)} | ${detail} |`);
    }
  }

  const actions = [];
  for (const result of automation.contributionFailures) {
    actions.push(`- **${sanitize(result.title)}** failed. ${result.hint ? sanitize(result.hint, 400) : "See the logs for details."}`);
  }
  if (approvals.changesRequestedBy.length > 0) {
    actions.push(`- Address the changes requested by ${approvals.changesRequestedBy.map((login) => `\`${login}\``).join(", ")}, then push an update.`);
  }
  if (automation.infrastructureFailures.length > 0) {
    actions.push(
      `- 🔧 ${automation.infrastructureFailures.map((r) => sanitize(r.title)).join(", ")} hit an automation problem that is **not** caused by your contribution. Comment \`/rerun-checks\` to retry; maintainers are notified if it keeps failing.`
    );
  }
  if (automation.warnings.length > 0) {
    actions.push(`- ⚠️ Advisory checks did not complete (${automation.warnings.map((r) => sanitize(r.title)).join(", ")}). This does not block the PR.`);
  }
  if (actions.length > 0) lines.push("", "### Action needed", "", ...actions);

  const reviewerLinks = [
    ...reviewAssignment.users.map((login) => `[${sanitize(login, 60)}](https://github.com/${encodeURIComponent(login)})`),
    ...reviewAssignment.teams.map((slug) => `team \`${sanitize(slug, 80)}\``),
  ];
  lines.push(
    "",
    "### Review",
    "",
    `- **Approvals:** ${approvals.approvers.length}/${approvals.required}${approvals.approvers.length > 0 ? ` (${approvals.approvers.map((login) => `\`${login}\``).join(", ")})` : ""}`,
    `- **Assigned reviewer:** ${reviewerLinks.length > 0 ? reviewerLinks.join(", ") : "not assigned yet — comment `/request-review` to ask for one"}`,
    `- **Review target date:** ${reviewAssignment.due ? sanitize(reviewAssignment.due, 40) : "not set"}`
  );
  if (!approvals.satisfied && approvals.missing.length > 0) lines.push(`- **Still needed:** ${approvals.missing.map((item) => sanitize(item, 200)).join("; ")}`);
  for (const note of approvals.notes) lines.push(`- _${sanitize(note, 300)}_`);

  lines.push(
    "",
    "### Commands",
    "",
    "| Command | Who | What it does |",
    "|---|---|---|",
    "| `/rerun-checks` | PR author, maintainers | Re-runs failed or incomplete checks and re-evaluates this gate |",
    "| `/request-review` | PR author, maintainers | Asks the review rotation to assign a reviewer (adds `needs-reviewer`) |",
    "",
    `<sub>Updated for ${headSha ? `\`${headSha.slice(0, 7)}\`` : "the latest commit"}${gateRunUrl ? ` · [gate run](${gateRunUrl})` : ""} · This comment is maintained automatically — see [submission gate docs](https://github.com/github/awesome-copilot/blob/main/docs/maintainers/submission-gate.md).</sub>`
  );
  return `${lines.join("\n")}\n`;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/** Parse a PR command from the first non-empty line of a comment. */
export function parsePrCommand(body) {
  const firstLine = String(body || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return null;
  const match = /^\/(rerun-checks|request-review)(?:\s|$)/i.exec(firstLine);
  return match ? { command: match[1].toLowerCase() } : null;
}

/** Whether a commenter may run PR commands: the PR author or a user with write access. */
export function canRunPrCommand({ commenter, prAuthor, permission }) {
  if (!commenter) return false;
  if (String(commenter).toLowerCase() === String(prAuthor || "").toLowerCase()) return true;
  return WRITE_PERMISSIONS.has(permission);
}

// ---------------------------------------------------------------------------
// GitHub API orchestration
// ---------------------------------------------------------------------------

function workflowFile(run) {
  return path.posix.basename(String(run.path || "").split("@")[0]);
}

/** Latest workflow run per workflow file for a commit, limited to PR-triggered runs. */
export function latestRunsByWorkflow(runs) {
  const latest = new Map();
  for (const run of runs) {
    if (!PR_EVENTS.has(run.event)) continue;
    const file = workflowFile(run);
    const previous = latest.get(file);
    const newer =
      !previous ||
      new Date(run.created_at) > new Date(previous.created_at) ||
      (run.created_at === previous.created_at && run.id > previous.id);
    if (newer) latest.set(file, run);
  }
  return latest;
}

export async function listRunsForSha(github, { owner, repo, headSha }) {
  return github.paginate(github.rest.actions.listWorkflowRunsForRepo, {
    owner,
    repo,
    head_sha: headSha,
    per_page: 100,
  });
}

export async function observeChecks(github, { owner, repo, headSha, checks }) {
  const latest = latestRunsByWorkflow(await listRunsForSha(github, { owner, repo, headSha }));
  const observations = new Map();

  for (const check of checks) {
    if (check.workflow) {
      const run = latest.get(check.workflow);
      if (!run) {
        observations.set(check.id, { found: false });
        continue;
      }
      const observation = { found: true, status: run.status, conclusion: run.conclusion, url: run.html_url, runId: run.id };
      if (run.status === "completed" && run.conclusion === "failure" && check.failure_kind !== "infrastructure") {
        observation.jobs = await github.paginate(github.rest.actions.listJobsForWorkflowRun, {
          owner,
          repo,
          run_id: run.id,
          filter: "latest",
          per_page: 100,
        });
      }
      observations.set(check.id, observation);
    } else if (check.check_name) {
      const { data } = await github.rest.checks.listForRef({
        owner,
        repo,
        ref: headSha,
        check_name: check.check_name,
        filter: "latest",
        per_page: 100,
      });
      const checkRun = [...(data.check_runs || [])].sort(
        (a, b) => new Date(b.started_at || 0) - new Date(a.started_at || 0)
      )[0];
      if (!checkRun) {
        observations.set(check.id, { found: false });
        continue;
      }
      const observation = {
        found: true,
        status: checkRun.status,
        conclusion: checkRun.conclusion,
        url: checkRun.html_url,
      };
      if (checkRun.status === "completed" && checkRun.conclusion === "failure") {
        try {
          const { data: job } = await github.rest.actions.getJobForWorkflowRun({ owner, repo, job_id: checkRun.id });
          observation.jobs = [job];
        } catch {
          observation.jobs = undefined;
        }
      }
      observations.set(check.id, observation);
    } else {
      observations.set(check.id, { found: false });
    }
  }
  return { observations, latestRuns: latest };
}

function evaluateObservations(applicable, observations, { elapsedMs, timeoutMs, graceMs, finalized, infrastructureSteps }) {
  const found = [...observations.values()].filter((observation) => observation.found);
  const othersDone = found.every((observation) => observation.status === "completed");
  const timedOut = elapsedMs >= timeoutMs;
  const graceOver = finalized || (elapsedMs >= graceMs && othersDone);
  return applicable.map((check) => {
    const observation = observations.get(check.id);
    const gaveUp = timedOut || (!observation?.found && graceOver);
    return evaluateCheck(check, observation, { gaveUp, infrastructureSteps });
  });
}

/** Download the contributor reputation artifact (raise-only signal) with the gh CLI. */
export function readContributorRiskArtifact({ owner, repo, runId, headSha, token }) {
  if (!runId) return null;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "contributor-check-"));
  try {
    execFileSync(
      "gh",
      ["run", "download", String(runId), "--repo", `${owner}/${repo}`, "--name", "contributor-check-result", "--dir", dir],
      { env: { ...process.env, GH_TOKEN: token || process.env.GH_TOKEN || process.env.GITHUB_TOKEN }, stdio: "pipe", timeout: 60_000 }
    );
    const resultPath = path.join(dir, "result.json");
    if (!fs.existsSync(resultPath) || fs.statSync(resultPath).size > 64 * 1024) return null;
    const result = JSON.parse(fs.readFileSync(resultPath, "utf8"));
    if (result.schema_version !== "contributor-check-result/v1" || result.head_sha !== headSha) return null;
    const risk = String(result.overall_risk || "").toUpperCase();
    return ["HIGH", "MEDIUM", "LOW", "NONE", "UNKNOWN"].includes(risk) ? risk : null;
  } catch {
    return null;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function lookupPermissions(github, { owner, repo, reviews, author }) {
  const permissions = new Map();
  const authorLogin = String(author || "").toLowerCase();
  for (const review of reviews) {
    const login = String(review.user?.login || "").toLowerCase();
    if (!login || login === authorLogin || permissions.has(login)) continue;
    try {
      const { data } = await github.rest.repos.getCollaboratorPermissionLevel({ owner, repo, username: review.user.login });
      permissions.set(login, data.role_name === "maintain" ? "maintain" : data.permission);
    } catch {
      const association = review.author_association;
      permissions.set(login, association === "OWNER" || association === "COLLABORATOR" ? "write" : "read");
    }
  }
  return permissions;
}

/** Requested reviewers plus the review-due label maintained by reviewer routing. */
export function reviewAssignmentFrom(pr, labels) {
  const dueLabel = labels.find((label) => label.startsWith("review-due:"));
  return {
    users: (pr.requested_reviewers || []).map((user) => user.login),
    teams: (pr.requested_teams || []).map((team) => team.slug),
    due: dueLabel ? dueLabel.slice("review-due:".length) : null,
    overdue: labels.includes("review-overdue"),
    escalated: labels.includes("review-escalated"),
  };
}

/**
 * Evaluate a PR end to end.
 * @param {object} options
 * @param {boolean} [options.wait] poll until applicable checks finish (gate mode)
 * @param {boolean|"auto"} [options.finalized] treat unreported checks as final: true after the gate
 *   completed (writer), "auto" when the gate run for the head commit has completed (sweeps)
 */
export async function evaluateSubmission(github, options) {
  const {
    owner,
    repo,
    pullNumber,
    config,
    wait = false,
    finalized = false,
    token = null,
    log = () => {},
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now = () => Date.now(),
    readContributorRisk = readContributorRiskArtifact,
  } = options;

  const { data: initialPr } = await github.rest.pulls.get({ owner, repo, pull_number: pullNumber });
  const headSha = initialPr.head.sha;
  const files = await github.paginate(github.rest.pulls.listFiles, { owner, repo, pull_number: pullNumber, per_page: 100 });
  const applicable = selectApplicableChecks(config.gate.checks, files, initialPr.base.ref);

  const waitConfig = config.gate.wait || {};
  const timeoutMs = Number(waitConfig.timeout_minutes ?? 40) * 60_000;
  const intervalMs = Number(waitConfig.interval_seconds ?? 30) * 1000;
  const graceMs = Number(waitConfig.report_grace_minutes ?? 8) * 60_000;
  const infrastructureSteps = config.gate.infrastructure_steps || [];
  const start = now();

  let results;
  let latestRuns;
  for (;;) {
    const observed = await observeChecks(github, { owner, repo, headSha, checks: applicable });
    latestRuns = observed.latestRuns;
    const elapsedMs = now() - start;
    const isFinal =
      finalized === true || (finalized === "auto" && latestRuns.get(GATE_WORKFLOW_FILE)?.status === "completed");
    results = evaluateObservations(applicable, observed.observations, {
      elapsedMs: wait ? elapsedMs : 0,
      timeoutMs: wait ? timeoutMs : Number.POSITIVE_INFINITY,
      graceMs,
      finalized: isFinal,
      infrastructureSteps,
    });
    const pending = results.filter((result) => result.outcome === "pending");
    const blockingContribution = results.some((result) => result.required && result.category === "contribution");
    if (!wait || pending.length === 0 || blockingContribution || elapsedMs >= timeoutMs) break;
    log(`Waiting for ${pending.map((result) => result.title).join(", ")}`);
    await sleep(intervalMs);
  }

  // Re-read PR state after waiting: labels and reviews may have changed.
  const { data: pr } = await github.rest.pulls.get({ owner, repo, pull_number: pullNumber });
  if (pr.head.sha !== headSha) log(`PR head moved from ${headSha} to ${pr.head.sha} while evaluating.`);
  const labels = (pr.labels || []).map((label) => label.name);
  const reviews = await github.paginate(github.rest.pulls.listReviews, { owner, repo, pull_number: pullNumber, per_page: 100 });

  const contributorRun = latestRuns?.get("contributor-check.yml");
  const contributorRisk =
    contributorRun?.status === "completed"
      ? readContributorRisk({ owner, repo, runId: contributorRun.id, headSha, token })
      : null;

  const risk = classifyRisk({ files, labels, contributorRisk, tiers: config.tiers });
  const permissions = await lookupPermissions(github, { owner, repo, reviews, author: pr.user?.login });
  const approvals = evaluateApprovals({
    tier: risk.tier,
    tiers: config.tiers,
    reviews,
    author: pr.user?.login,
    permissions,
    routing: config.routing,
    files,
  });
  const automation = summarizeChecks(results);
  const state = computeState({ automation, approvals });

  return {
    pr,
    headSha,
    files,
    labels,
    risk,
    tierDescription: config.tiers[risk.tier]?.description || "",
    automation,
    approvals,
    state,
    passed: state === "approved",
    reviewAssignment: reviewAssignmentFrom(pr, labels),
    gateRun: latestRuns?.get(GATE_WORKFLOW_FILE) || null,
  };
}

/** Apply exactly one risk label and one state label, and upsert the status comment. */
export async function syncPullRequestStatus(github, { owner, repo, evaluation, gateRunUrl = null, log = () => {} }) {
  const issueNumber = evaluation.pr.number;
  const current = new Set(evaluation.labels);
  // External plugin intake (external-plugin-pr-quality-gates-writer.yml) owns the shared
  // state labels on its PRs; only the risk label and comment are managed there.
  const manageState = !STATE_LABEL_OWNERS.some((label) => current.has(label));
  const desired = new Set([`merge-risk:${evaluation.risk.tier}`, ...(manageState ? [evaluation.state] : [])]);
  const managed = new Set([...RISK_LABELS, ...(manageState ? STATE_LABELS : [])]);

  const toAdd = [...desired].filter((label) => !current.has(label));
  const toRemove = [...current].filter((label) => managed.has(label) && !desired.has(label));
  if (toAdd.length > 0) await github.rest.issues.addLabels({ owner, repo, issue_number: issueNumber, labels: toAdd });
  for (const name of toRemove) {
    try {
      await github.rest.issues.removeLabel({ owner, repo, issue_number: issueNumber, name });
    } catch (error) {
      if (error.status !== 404) throw error;
    }
  }

  const body = renderStatusComment(evaluation, { gateRunUrl });
  const comments = await github.paginate(github.rest.issues.listComments, {
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  });
  const existing = comments.find(
    (comment) => comment.user?.login === "github-actions[bot]" && String(comment.body || "").includes(STATUS_MARKER)
  );
  if (existing) {
    if (existing.body !== body) await github.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body });
  } else {
    await github.rest.issues.createComment({ owner, repo, issue_number: issueNumber, body });
  }
  log(`PR #${issueNumber}: state=${evaluation.state} risk=${evaluation.risk.tier} (+${toAdd.join(",") || "none"} -${toRemove.join(",") || "none"})`);
}

/**
 * Resolve the open PR for a workflow_run without trusting any artifact content,
 * mirroring label-pr-intent-writer.yml. Returns the PR number or null.
 */
export async function resolvePullRequestForWorkflowRun(github, { owner, repo, workflowRun }) {
  const expectedBase = `${owner}/${repo}`.toLowerCase();
  const headRepository = String(workflowRun.head_repository?.full_name || "");
  const headBranch = String(workflowRun.head_branch || "");
  const [headOwner] = headRepository.split("/");
  if (!headOwner || !headBranch) return null;

  const candidates = [];
  for (const pullRequest of workflowRun.pull_requests || []) candidates.push(pullRequest.number);
  if (candidates.length === 0) {
    const open = await github.paginate(github.rest.pulls.list, {
      owner,
      repo,
      state: "open",
      head: `${headOwner}:${headBranch}`,
      per_page: 100,
    });
    for (const pullRequest of open) candidates.push(pullRequest.number);
  }

  const matches = [];
  for (const number of new Set(candidates)) {
    const { data: pr } = await github.rest.pulls.get({ owner, repo, pull_number: number });
    if (
      pr.state === "open" &&
      pr.head.sha === workflowRun.head_sha &&
      String(pr.head?.ref || "") === headBranch &&
      String(pr.head?.repo?.full_name || "").toLowerCase() === headRepository.toLowerCase() &&
      String(pr.base?.repo?.full_name || "").toLowerCase() === expectedBase
    ) {
      matches.push(number);
    }
  }
  return matches.length === 1 ? matches[0] : null;
}

/** Re-run failed or incomplete PR workflows for the head commit, then re-evaluate the gate. */
export async function rerunChecks(github, { owner, repo, headSha }) {
  const latest = latestRunsByWorkflow(await listRunsForSha(github, { owner, repo, headSha }));
  const rerun = [];
  const skipped = [];
  for (const [file, run] of latest) {
    const label = run.name || file;
    if (file === GATE_WORKFLOW_FILE) continue;
    if (run.status !== "completed") continue;
    if (run.conclusion === "action_required") {
      skipped.push({ name: label, reason: "waiting for a maintainer to approve workflow runs" });
      continue;
    }
    if (!RERUNNABLE_CONCLUSIONS.has(run.conclusion)) continue;
    try {
      await github.rest.actions.reRunWorkflowFailedJobs({ owner, repo, run_id: run.id });
      rerun.push(label);
    } catch {
      try {
        await github.rest.actions.reRunWorkflow({ owner, repo, run_id: run.id });
        rerun.push(label);
      } catch (error) {
        skipped.push({ name: label, reason: `could not be re-run (${error.status || error.message})` });
      }
    }
  }

  const gateRun = latest.get(GATE_WORKFLOW_FILE);
  if (!gateRun) {
    skipped.push({ name: "Submission Gate", reason: "has not run for this commit yet" });
  } else if (gateRun.status !== "completed") {
    skipped.push({ name: gateRun.name || "Submission Gate", reason: "is already running and will pick up the re-runs" });
  } else if (gateRun.conclusion === "action_required") {
    skipped.push({ name: gateRun.name || "Submission Gate", reason: "waiting for a maintainer to approve workflow runs" });
  } else {
    try {
      await github.rest.actions.reRunWorkflow({ owner, repo, run_id: gateRun.id });
      rerun.push(gateRun.name || "Submission Gate");
    } catch (error) {
      skipped.push({ name: gateRun.name || "Submission Gate", reason: `could not be re-run (${error.status || error.message})` });
    }
  }
  return { rerun, skipped };
}
