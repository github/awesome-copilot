// Reviewer routing and SLA escalation for pull requests.
//
// Configuration lives in .github/review-routing.yml. The pure planning
// functions (planRouting, planEscalation, business-day helpers) are unit
// tested in review-routing.test.mjs; the async runners wrap them with the
// GitHub REST calls made by the Review Routing and Review Escalation workflows.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const REVIEW_ROUTING_CONFIG_PATH = path.join(__dirname, "..", ".github", "review-routing.yml");

export const INTENT_LABELS = Object.freeze([
  "agent",
  "canvas-extension",
  "external-plugin",
  "hooks",
  "instructions",
  "new-submission",
  "plugin",
  "skills",
  "workshops",
  "website-update",
  "workflow",
]);

export const INTENT_ARTIFACT_SCHEMA = "label-pr-intent-result/v1";
export const ROUTING_REQUEST_ARTIFACT_SCHEMA = "review-routing-request/v1";

export const COMMENT_MARKERS = Object.freeze({
  overdue: "<!-- review-routing:overdue -->",
  escalated: "<!-- review-routing:escalated -->",
});

const LOGIN_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const TEAM_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DUE_LABEL_RETENTION_DAYS = 14;

/** GitHub Actions allows at most 256 jobs per matrix. */
export const MAX_MATRIX_TARGETS = 256;

/**
 * Cap sweep targets to what one matrix can run. The remainder is picked up by
 * the next scheduled run (planning is idempotent), so nothing is lost.
 */
export function limitTargets(targets, max = MAX_MATRIX_TARGETS) {
  return { targets: targets.slice(0, max), deferred: Math.max(0, targets.length - max) };
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateLoginList(value, where, errors) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    errors.push(`${where} must be a list of GitHub logins`);
    return [];
  }
  const logins = [];
  for (const entry of value) {
    if (typeof entry !== "string" || !LOGIN_PATTERN.test(entry)) {
      errors.push(`${where} contains an invalid GitHub login: ${JSON.stringify(entry)}`);
      continue;
    }
    logins.push(entry);
  }
  return logins;
}

/**
 * Validate and normalize a parsed review-routing.yml document.
 * @returns {{ config: object|null, errors: string[] }}
 */
export function normalizeReviewRoutingConfig(raw) {
  const errors = [];
  if (!isPlainObject(raw)) {
    return { config: null, errors: ["configuration must be a YAML mapping"] };
  }
  if (raw.version !== 1) errors.push("version must be 1");

  const sla = isPlainObject(raw.sla) ? raw.sla : {};
  if (!isPlainObject(raw.sla)) errors.push("sla must be a mapping");
  const firstReviewBusinessDays = sla.first_review_business_days;
  const escalationBusinessDays = sla.escalation_business_days;
  if (!Number.isInteger(firstReviewBusinessDays) || firstReviewBusinessDays < 1) {
    errors.push("sla.first_review_business_days must be a positive integer");
  }
  if (!Number.isInteger(escalationBusinessDays) || escalationBusinessDays <= firstReviewBusinessDays) {
    errors.push("sla.escalation_business_days must be an integer greater than sla.first_review_business_days");
  }
  const holidays = [];
  for (const holiday of sla.holidays ?? []) {
    const key = holiday instanceof Date ? holiday.toISOString().slice(0, 10) : holiday;
    if (typeof key !== "string" || !DATE_KEY_PATTERN.test(key)) {
      errors.push(`sla.holidays contains an invalid date: ${JSON.stringify(holiday)}`);
    } else {
      holidays.push(key);
    }
  }

  const rawLabels = isPlainObject(raw.labels) ? raw.labels : {};
  const labels = {
    needsReviewer: rawLabels.needs_reviewer,
    duePrefix: rawLabels.due_prefix,
    overdue: rawLabels.overdue,
    escalated: rawLabels.escalated,
  };
  for (const [key, value] of Object.entries(labels)) {
    if (typeof value !== "string" || value.trim() === "") {
      errors.push(`labels.${key} must be a non-empty string`);
    }
  }

  const pools = {};
  if (!isPlainObject(raw.pools) || Object.keys(raw.pools).length === 0) {
    errors.push("pools must be a non-empty mapping");
  } else {
    for (const [name, pool] of Object.entries(raw.pools)) {
      if (!isPlainObject(pool)) {
        errors.push(`pools.${name} must be a mapping`);
        continue;
      }
      if (pool.team !== undefined && pool.team !== null && (typeof pool.team !== "string" || !TEAM_PATTERN.test(pool.team))) {
        errors.push(`pools.${name}.team must use the "<org>/<team-slug>" form`);
      }
      pools[name] = {
        name,
        team: pool.team ?? null,
        reviewers: validateLoginList(pool.reviewers, `pools.${name}.reviewers`, errors),
        backup: validateLoginList(pool.backup, `pools.${name}.backup`, errors),
      };
    }
  }

  const escalationPool = raw.escalation_pool;
  const defaultPool = raw.default_pool;
  if (!pools[escalationPool]) errors.push("escalation_pool must name a configured pool");
  if (!pools[defaultPool]) errors.push("default_pool must name a configured pool");

  const routes = [];
  if (!Array.isArray(raw.routes)) {
    errors.push("routes must be a list");
  } else {
    raw.routes.forEach((route, index) => {
      if (!isPlainObject(route) || typeof route.label !== "string" || route.label.trim() === "") {
        errors.push(`routes[${index}] must have a label`);
        return;
      }
      if (!pools[route.pool]) {
        errors.push(`routes[${index}] (${route.label}) references unknown pool ${JSON.stringify(route.pool)}`);
        return;
      }
      routes.push({ label: route.label, pool: route.pool });
    });
  }

  const skipLabels = Array.isArray(raw.skip_labels) ? raw.skip_labels.filter((label) => typeof label === "string") : [];
  if (raw.skip_labels !== undefined && raw.skip_labels !== null && !Array.isArray(raw.skip_labels)) {
    errors.push("skip_labels must be a list");
  }

  if (typeof raw.dry_run !== "boolean") {
    errors.push("dry_run must be true or false");
  }

  const config = {
    version: raw.version,
    dryRun: raw.dry_run === true,
    sla: { firstReviewBusinessDays, escalationBusinessDays, holidays },
    labels,
    pools,
    routes,
    escalationPool,
    defaultPool,
    unavailable: validateLoginList(raw.unavailable, "unavailable", errors),
    skipAuthors: Array.isArray(raw.skip_authors) ? raw.skip_authors.filter((login) => typeof login === "string") : [],
    skipLabels,
  };

  return { config: errors.length === 0 ? config : null, errors };
}

export function loadReviewRoutingConfig(filePath = REVIEW_ROUTING_CONFIG_PATH) {
  const raw = yaml.load(fs.readFileSync(filePath, "utf8"));
  const { config, errors } = normalizeReviewRoutingConfig(raw);
  if (!config) {
    throw new Error(`Invalid review routing configuration (${filePath}):\n- ${errors.join("\n- ")}`);
  }
  return config;
}

// ---------------------------------------------------------------------------
// Business-day math (UTC dates as YYYY-MM-DD keys)
// ---------------------------------------------------------------------------

export function toDateKey(value) {
  if (typeof value === "string" && DATE_KEY_PATTERN.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${value}`);
  return date.toISOString().slice(0, 10);
}

function shiftDateKey(key, days) {
  const date = new Date(`${key}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isBusinessDay(value, holidays = []) {
  const key = toDateKey(value);
  const weekday = new Date(`${key}T00:00:00.000Z`).getUTCDay();
  return weekday !== 0 && weekday !== 6 && !holidays.includes(key);
}

/**
 * Move `days` business days from `start` (negative values move backwards).
 * Weekends and configured holidays are skipped. Returns a YYYY-MM-DD key.
 */
export function addBusinessDays(start, days, holidays = []) {
  let key = toDateKey(start);
  const step = days >= 0 ? 1 : -1;
  let remaining = Math.abs(days);
  while (remaining > 0) {
    key = shiftDateKey(key, step);
    if (isBusinessDay(key, holidays)) remaining -= 1;
  }
  return key;
}

/**
 * SLA milestones for a PR whose review-due label is `dueDate`.
 * - routedOn: business day the PR was routed (dueDate - first_review_business_days)
 * - dueDate: last business day for a first review
 * - overdueOn: first business day after dueDate (backup reviewer requested)
 * - escalateOn: routedOn + escalation_business_days (core pool requested)
 */
export function slaMilestones(dueDate, config) {
  const { firstReviewBusinessDays, escalationBusinessDays, holidays } = config.sla;
  const routedOn = addBusinessDays(dueDate, -firstReviewBusinessDays, holidays);
  return {
    routedOn,
    dueDate,
    overdueOn: addBusinessDays(dueDate, 1, holidays),
    escalateOn: addBusinessDays(routedOn, escalationBusinessDays, holidays),
  };
}

// ---------------------------------------------------------------------------
// Label, reviewer, and review helpers
// ---------------------------------------------------------------------------

const lower = (value) => String(value ?? "").toLowerCase();

export function isBotLogin(login) {
  return /\[bot\]$/i.test(String(login ?? ""));
}

export function labelNames(labels = []) {
  return labels.map((label) => (typeof label === "string" ? label : label?.name)).filter(Boolean);
}

export function dueLabelName(dateKey, config) {
  return `${config.labels.duePrefix}${dateKey}`;
}

export function parseDueLabels(names, config) {
  const prefix = config.labels.duePrefix;
  return [...names]
    .filter((name) => name.startsWith(prefix))
    .map((name) => ({ name, date: name.slice(prefix.length) }))
    .filter(({ date }) => DATE_KEY_PATTERN.test(date))
    .sort((left, right) => left.date.localeCompare(right.date));
}

/**
 * Labels used for routing decisions. When `intentLabels` is an array (from a
 * Label PR Intent artifact) it is authoritative: current intent labels are
 * replaced by it, even when it is empty. `null` means "use current labels".
 */
export function effectiveLabelNames(currentLabels, intentLabels = null) {
  const current = labelNames(currentLabels);
  if (intentLabels === null || intentLabels === undefined) return new Set(current);
  return new Set([...current.filter((name) => !INTENT_LABELS.includes(name)), ...intentLabels]);
}

export function selectPool(names, config) {
  const set = new Set(names);
  const route = config.routes.find((candidate) => set.has(candidate.label));
  return route ? route.pool : config.defaultPool;
}

export function teamSlug(team) {
  return team ? team.split("/").pop() : null;
}

function isTeamRequested(pr, slug) {
  return Boolean(slug) && (pr.requested_teams ?? []).some((team) => lower(team?.slug) === lower(slug));
}

/** Count open review requests per reviewer (lower-cased login) across open PRs. */
export function computeReviewLoad(openPulls = []) {
  const load = new Map();
  for (const pull of openPulls) {
    for (const reviewer of pull.requested_reviewers ?? []) {
      const key = lower(reviewer?.login);
      if (key) load.set(key, (load.get(key) ?? 0) + 1);
    }
  }
  return load;
}

/**
 * Pick the eligible candidate with the fewest open review requests.
 * Ties rotate by `seed` (the PR number) so assignments spread across the pool.
 */
export function pickReviewer(candidates, { exclude = new Set(), load = new Map(), seed = 0 } = {}) {
  const seen = new Set();
  const eligible = [];
  for (const login of candidates) {
    const key = lower(login);
    if (!key || seen.has(key) || exclude.has(key) || isBotLogin(login)) continue;
    seen.add(key);
    eligible.push(login);
  }
  if (eligible.length === 0) return null;
  const minLoad = Math.min(...eligible.map((login) => load.get(lower(login)) ?? 0));
  const tied = eligible.filter((login) => (load.get(lower(login)) ?? 0) === minLoad);
  return tied[Math.abs(Number(seed) || 0) % tied.length];
}

function isAfterBoundary(submittedAt, since) {
  if (!since) return true;
  if (!submittedAt) return false;
  if (DATE_KEY_PATTERN.test(since)) return toDateKey(submittedAt) >= since;
  return Date.parse(submittedAt) >= Date.parse(since);
}

/**
 * True when someone other than the author (and not a bot) submitted a review
 * at or after `since` (an ISO timestamp, or a YYYY-MM-DD date key).
 */
export function hasHumanReview(reviews = [], author, since = null) {
  return reviews.some((review) => {
    const login = review?.user?.login;
    if (!login || isBotLogin(login) || review.user.type === "Bot") return false;
    if (lower(login) === lower(author)) return false;
    if (review.state === "PENDING") return false;
    return isAfterBoundary(review.submitted_at, since);
  });
}

/** Logins (other than the author and bots) who submitted a non-pending review. */
function submittedReviewers(reviews, author) {
  return reviews
    .filter((review) => review?.state !== "PENDING")
    .map((review) => review?.user?.login)
    .filter((login) => login && !isBotLogin(login) && lower(login) !== lower(author));
}

/**
 * Individuals who can satisfy a pool: its reviewers and backups, plus the
 * escalation (core) pool, who may review anything. A pending request for an
 * `unavailable` reviewer does not count; a review they already submitted does.
 */
export function coveringReviewers(pr, reviews, poolName, config) {
  const pool = config.pools[poolName];
  const escalation = config.pools[config.escalationPool];
  const cover = new Set([...pool.reviewers, ...pool.backup, ...escalation.reviewers].map(lower));
  const unavailable = new Set(config.unavailable.map(lower));
  const author = lower(pr.user?.login);
  const logins = [
    ...(pr.requested_reviewers ?? []).map((reviewer) => reviewer?.login).filter((login) => !unavailable.has(lower(login))),
    ...submittedReviewers(reviews, author),
  ];
  const result = [];
  for (const login of logins) {
    const key = lower(login);
    if (key && key !== author && cover.has(key) && !result.some((existing) => lower(existing) === key)) result.push(login);
  }
  return result;
}

function skipped(pr, reason, extra = {}) {
  return { prNumber: pr?.number, action: "skip", reason, ...extra };
}

function exclusionSet(pr, config) {
  const requested = (pr.requested_reviewers ?? []).map((reviewer) => reviewer?.login).filter(Boolean);
  return new Set([pr.user?.login, ...requested, ...config.unavailable].filter(Boolean).map(lower));
}

function commonSkip(pr, names, config) {
  if (!pr || pr.state !== "open") return skipped(pr, "not-open");
  if (pr.draft) return skipped(pr, "draft");
  const author = lower(pr.user?.login);
  if (config.skipAuthors.some((login) => lower(login) === author)) return skipped(pr, "skipped-author");
  const skipLabel = config.skipLabels.find((label) => names.has(label));
  if (skipLabel) return skipped(pr, "skipped-label", { label: skipLabel });
  return null;
}

/**
 * Choose who to request for a pool: pool reviewers, then pool backups, then
 * the escalation pool, then the pool team (unless already requested).
 */
function pickPoolRequest(pr, poolName, config, load, alsoExclude = []) {
  const pool = config.pools[poolName];
  const escalation = config.pools[config.escalationPool];
  const exclude = exclusionSet(pr, config);
  for (const login of alsoExclude) exclude.add(lower(login));
  const tiers = [
    ["pool", pool.reviewers],
    ["backup", pool.backup],
    ["escalation-pool", escalation.reviewers],
  ];
  for (const [source, candidates] of tiers) {
    const login = pickReviewer(candidates, { exclude, load, seed: pr.number });
    if (login) return { reviewers: [login], teamReviewers: [], source };
  }
  const slug = teamSlug(pool.team);
  if (slug && !isTeamRequested(pr, slug)) return { reviewers: [], teamReviewers: [slug], source: "team" };
  return { reviewers: [], teamReviewers: [], source: slug ? "existing-team-request" : "none" };
}

const hasRequest = (plan) => plan.reviewers.length > 0 || plan.teamReviewers.length > 0;

// ---------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------

/**
 * Decide how to route a PR. Pure: performs no I/O.
 * @param {object} args
 * @param {object} args.pr        Pull request (REST shape: number, state, draft, user, labels, requested_reviewers, requested_teams)
 * @param {object[]} args.reviews Reviews on the PR
 * @param {Map} args.load         Open review requests per reviewer (see computeReviewLoad)
 * @param {string[]|null} args.intentLabels Authoritative intent labels from a Label PR Intent artifact, or null
 */
export function planRouting({ pr, reviews = [], load = new Map(), config, now = new Date(), intentLabels = null }) {
  const names = effectiveLabelNames(pr?.labels, intentLabels);
  const skip = commonSkip(pr, names, config);
  if (skip) return skip;

  const author = pr.user?.login ?? "";
  const reviewRequested = names.has(config.labels.needsReviewer);
  const dueLabels = parseDueLabels(names, config);
  const routed = dueLabels.length > 0;
  const poolName = selectPool(names, config);

  if (!reviewRequested && !routed && hasHumanReview(reviews, author)) return skipped(pr, "already-reviewed", { pool: poolName });

  // needs-reviewer always asks for a fresh reviewer (someone not currently
  // requested who has not already reviewed); otherwise an individual who
  // already covers the target pool (requested or reviewed) is enough.
  let request;
  if (reviewRequested) {
    request = pickPoolRequest(pr, poolName, config, load, submittedReviewers(reviews, author));
    // Nothing new can be requested: keep needs-reviewer and the current SLA so
    // a later run retries once a reviewer becomes available.
    if (!hasRequest(request)) return skipped(pr, "no-reviewer-available", { pool: poolName });
  } else {
    const covering = coveringReviewers(pr, reviews, poolName, config);
    request = covering.length > 0 ? { reviewers: [], teamReviewers: [], source: "covered" } : pickPoolRequest(pr, poolName, config, load);
  }

  if (routed && !reviewRequested) {
    // Already routed: only act if the target pool changed and is not covered.
    // The SLA (due label) is kept as-is. With no individuals configured, a
    // review from anyone counts, so the team is not re-requested repeatedly.
    if (!hasRequest(request)) return skipped(pr, "already-routed", { pool: poolName });
    if (request.reviewers.length === 0 && hasHumanReview(reviews, author)) return skipped(pr, "already-routed", { pool: poolName });
    return {
      prNumber: pr.number,
      action: "route",
      reason: "pool-changed",
      pool: poolName,
      ...request,
      dueDate: dueLabels[dueLabels.length - 1].date,
      addLabels: [],
      removeLabels: [],
    };
  }

  const dueDate = addBusinessDays(now, config.sla.firstReviewBusinessDays, config.sla.holidays);
  const dueLabel = dueLabelName(dueDate, config);
  const removeLabels = [];
  if (reviewRequested) {
    // Remove every due label (even one with the same date) before re-adding it,
    // so the label's `labeled` event marks the start of the new SLA cycle.
    removeLabels.push(...dueLabels.map((label) => label.name));
    const prLabels = new Set(labelNames(pr.labels));
    for (const label of [config.labels.needsReviewer, config.labels.overdue, config.labels.escalated]) {
      if (prLabels.has(label)) removeLabels.push(label);
    }
  }

  return {
    prNumber: pr.number,
    action: "route",
    reason: reviewRequested ? "needs-reviewer" : "unrouted",
    pool: poolName,
    ...request,
    dueDate,
    addLabels: [dueLabel],
    removeLabels,
  };
}

function mention(login) {
  return `@${login}`;
}

const FOOTER = "_Automated by the Review Escalation workflow — see `docs/maintainers/review-routing.md`._";

/**
 * Decide whether a routed PR is overdue or must escalate. Pure: performs no I/O.
 * @param {string|null} args.routedAt ISO timestamp when the current due label was added (start of the SLA cycle)
 */
export function planEscalation({ pr, reviews = [], load = new Map(), config, now = new Date(), routedAt = null }) {
  const names = new Set(labelNames(pr?.labels));
  const skip = commonSkip(pr, names, config);
  if (skip) return skip;

  const dueLabels = parseDueLabels(names, config);
  if (dueLabels.length === 0) return skipped(pr, "not-routed");

  const author = pr.user?.login ?? "";
  const dueDate = dueLabels[dueLabels.length - 1].date;
  const milestones = slaMilestones(dueDate, config);
  const hasOverdue = names.has(config.labels.overdue);
  const hasEscalated = names.has(config.labels.escalated);
  const base = { prNumber: pr.number, ...milestones, routedAt };
  // The due label only implies a business day; prefer the actual routing time
  // (for example a weekend or holiday) for display.
  const routedOnDisplay = routedAt ? toDateKey(routedAt) : milestones.routedOn;

  if (hasHumanReview(reviews, author, routedAt ?? milestones.routedOn)) {
    const removeLabels = dueLabels.map((label) => label.name);
    if (hasOverdue) removeLabels.push(config.labels.overdue);
    if (hasEscalated) removeLabels.push(config.labels.escalated);
    return { ...base, action: "reviewed", reviewers: [], teamReviewers: [], addLabels: [], removeLabels };
  }

  const today = toDateKey(now);
  const poolName = selectPool(names, config);
  const pool = config.pools[poolName];
  const escalation = config.pools[config.escalationPool];
  const exclude = exclusionSet(pr, config);
  const escalationTeam = escalation.team;
  const escalationSlug = teamSlug(escalationTeam);

  if (today >= milestones.escalateOn) {
    if (hasEscalated) return { ...base, action: "none", state: "escalated" };
    const reviewer = pickReviewer(escalation.reviewers, { exclude, load, seed: pr.number });
    const reviewers = reviewer ? [reviewer] : [];
    const teamReviewers = escalationSlug && !isTeamRequested(pr, escalationSlug) ? [escalationSlug] : [];
    const addLabels = [config.labels.escalated];
    if (!hasOverdue) addLabels.push(config.labels.overdue);
    const requested = [...reviewers.map(mention), ...(teamReviewers.length > 0 ? [mention(escalationTeam)] : [])];
    const body = [
      COMMENT_MARKERS.escalated,
      "### 🚨 Review escalated",
      "",
      `This pull request was routed to the **${poolName}** reviewer pool on ${routedOnDisplay} and has not received a review within ${config.sla.escalationBusinessDays} business days.`,
      "",
      requested.length > 0
        ? `Escalating to the **${config.escalationPool}** pool: requested ${requested.join(", ")}.`
        : `Escalating to the **${config.escalationPool}** pool${escalationTeam ? ` (${mention(escalationTeam)})` : ""}. Its reviewers are already requested or unavailable, so no additional reviewer was requested.`,
      "",
      FOOTER,
    ].join("\n");
    return { ...base, action: "escalate", pool: poolName, reviewers, teamReviewers, addLabels, removeLabels: [], comment: body };
  }

  if (today >= milestones.overdueOn) {
    if (hasOverdue) return { ...base, action: "none", state: "overdue" };
    const backup = pickReviewer(pool.backup, { exclude, load, seed: pr.number }) ?? pickReviewer(escalation.reviewers, { exclude, load, seed: pr.number });
    const reviewers = backup ? [backup] : [];
    let teamReviewers = [];
    let fallbackTeam = null;
    if (!backup) {
      for (const team of [pool.team, escalationTeam]) {
        const slug = teamSlug(team);
        if (slug && !isTeamRequested(pr, slug)) {
          teamReviewers = [slug];
          fallbackTeam = team;
          break;
        }
      }
    }
    const currentlyRequested = (pr.requested_reviewers ?? []).map((reviewer) => reviewer?.login).filter((login) => login && !isBotLogin(login));
    let assignment;
    if (backup) assignment = `Requesting backup reviewer ${mention(backup)}.`;
    else if (fallbackTeam) assignment = `No individual backup reviewer is available; requesting the ${mention(fallbackTeam)} team.`;
    else assignment = "No additional reviewer is available: the configured backups and teams are already requested or unavailable.";
    const body = [
      COMMENT_MARKERS.overdue,
      "### ⏰ Review overdue",
      "",
      `This pull request was routed to the **${poolName}** reviewer pool on ${routedOnDisplay}; a first review was due by ${milestones.dueDate}.`,
      "",
      currentlyRequested.length > 0 ? `Currently requested: ${currentlyRequested.map(mention).join(", ")}.` : "No individual reviewer is currently requested.",
      assignment,
      "",
      `If no review arrives, this pull request escalates to the **${config.escalationPool}** pool on ${milestones.escalateOn}.`,
      "",
      FOOTER,
    ].join("\n");
    return { ...base, action: "overdue", pool: poolName, reviewers, teamReviewers, addLabels: [config.labels.overdue], removeLabels: [], comment: body };
  }

  return { ...base, action: "none", state: "on-track" };
}

// ---------------------------------------------------------------------------
// GitHub I/O
// ---------------------------------------------------------------------------

function createActions({ github, owner, repo, config, log }) {
  const dryRun = config.dryRun;
  const say = (message) => log?.info?.(message);
  const warn = (message) => (log?.warning ?? log?.info)?.(message);

  async function ensureDueLabel(name) {
    try {
      await github.rest.issues.createLabel({ owner, repo, name, color: "C5DEF5", description: "First review target date (review routing)" });
    } catch (error) {
      if (error.status !== 422) throw error;
    }
  }

  return {
    /**
     * Apply a plan. Reviewer requests happen first; if they fail, no labels or
     * comments are changed so the next run retries. Returns false on failure.
     */
    async apply(plan) {
      const prefix = `${dryRun ? "[dry-run] " : ""}PR #${plan.prNumber}`;
      if (plan.reviewers?.length || plan.teamReviewers?.length) {
        say(`${prefix}: request reviewers=${plan.reviewers.join(",") || "-"} teams=${plan.teamReviewers.join(",") || "-"}`);
        if (!dryRun) {
          try {
            await github.rest.pulls.requestReviewers({
              owner,
              repo,
              pull_number: plan.prNumber,
              reviewers: plan.reviewers,
              team_reviewers: plan.teamReviewers,
            });
          } catch (error) {
            plan.requestError = error.message;
            warn(`${prefix}: reviewer request failed; labels left unchanged so the next run retries: ${error.message}`);
            return false;
          }
        }
      }
      for (const name of plan.removeLabels ?? []) {
        say(`${prefix}: remove label ${name}`);
        if (dryRun) continue;
        try {
          await github.rest.issues.removeLabel({ owner, repo, issue_number: plan.prNumber, name });
        } catch (error) {
          if (error.status !== 404) throw error;
        }
      }
      if (plan.addLabels?.length) {
        say(`${prefix}: add labels ${plan.addLabels.join(", ")}`);
        if (!dryRun) {
          for (const name of plan.addLabels) {
            if (name.startsWith(config.labels.duePrefix)) await ensureDueLabel(name);
          }
          await github.rest.issues.addLabels({ owner, repo, issue_number: plan.prNumber, labels: plan.addLabels });
        }
      }
      if (plan.comment) {
        say(`${prefix}: post ${plan.action} comment`);
        if (!dryRun) await github.rest.issues.createComment({ owner, repo, issue_number: plan.prNumber, body: plan.comment });
      }
      return true;
    },
  };
}

async function listOpenPulls(github, owner, repo) {
  return github.paginate(github.rest.pulls.list, { owner, repo, state: "open", per_page: 100 });
}

async function listReviews(github, owner, repo, pullNumber) {
  return github.paginate(github.rest.pulls.listReviews, { owner, repo, pull_number: pullNumber, per_page: 100 });
}

/** Timestamp of the most recent `labeled` event for `labelName` on the PR, or null. */
export async function findLabelAddedAt(github, owner, repo, issueNumber, labelName) {
  const events = await github.paginate(github.rest.issues.listEvents, { owner, repo, issue_number: issueNumber, per_page: 100 });
  let latest = null;
  for (const event of events) {
    if (event?.event === "labeled" && event.label?.name === labelName && event.created_at) {
      if (!latest || Date.parse(event.created_at) > Date.parse(latest)) latest = event.created_at;
    }
  }
  return latest;
}

async function currentRoutedAt(github, owner, repo, pr, config) {
  const dueLabels = parseDueLabels(labelNames(pr.labels), config);
  if (dueLabels.length === 0) return null;
  return findLabelAddedAt(github, owner, repo, pr.number, dueLabels[dueLabels.length - 1].name);
}

/**
 * Route a single PR (read, plan, apply). Callers must serialize this per PR.
 * @param {string[]|null} intentLabels Authoritative intent labels from a Label PR Intent artifact
 * @param {string|null} expectedHeadSha Skip if the PR head moved since the artifact was produced
 */
export async function routePullRequest({ github, owner, repo, config, prNumber, intentLabels = null, expectedHeadSha = null, now = new Date(), log }) {
  const { data: pr } = await github.rest.pulls.get({ owner, repo, pull_number: prNumber });
  if (expectedHeadSha && pr.head?.sha !== expectedHeadSha) {
    log?.info?.(`PR #${prNumber}: skipped (head moved; a newer intent run will route it)`);
    return skipped(pr, "stale-head");
  }
  const [reviews, openPulls] = await Promise.all([listReviews(github, owner, repo, prNumber), listOpenPulls(github, owner, repo)]);
  const plan = planRouting({ pr, reviews, load: computeReviewLoad(openPulls), config, now, intentLabels });
  if (plan.action === "route") {
    await createActions({ github, owner, repo, config, log }).apply(plan);
  } else {
    log?.info?.(`PR #${prNumber}: skipped (${plan.reason})`);
  }
  return plan;
}

/** Read-only: plan routing for every open PR. Used to pick the PRs a sweep should route. */
export async function planRoutingSweep({ github, owner, repo, config, now = new Date() }) {
  const openPulls = await listOpenPulls(github, owner, repo);
  const load = computeReviewLoad(openPulls);
  const plans = [];
  for (const pr of openPulls) {
    if (pr.draft) continue;
    const reviews = await listReviews(github, owner, repo, pr.number);
    plans.push(planRouting({ pr, reviews, load, config, now }));
  }
  return plans;
}

/** Enforce the SLA on a single routed PR (read, plan, apply). Callers must serialize this per PR. */
export async function escalatePullRequest({ github, owner, repo, config, prNumber, now = new Date(), log }) {
  const { data: pr } = await github.rest.pulls.get({ owner, repo, pull_number: prNumber });
  const [reviews, openPulls, routedAt] = await Promise.all([
    listReviews(github, owner, repo, prNumber),
    listOpenPulls(github, owner, repo),
    currentRoutedAt(github, owner, repo, pr, config),
  ]);
  const plan = planEscalation({ pr, reviews, load: computeReviewLoad(openPulls), config, now, routedAt });
  if (["reviewed", "overdue", "escalate"].includes(plan.action)) {
    await createActions({ github, owner, repo, config, log }).apply(plan);
  } else {
    log?.info?.(`PR #${prNumber}: no action (${plan.reason ?? plan.state})`);
  }
  return plan;
}

/** Read-only: plan SLA enforcement for every routed open PR. */
export async function planEscalationSweep({ github, owner, repo, config, now = new Date() }) {
  const openPulls = await listOpenPulls(github, owner, repo);
  const load = computeReviewLoad(openPulls);
  const plans = [];
  for (const pr of openPulls) {
    if (pr.draft || parseDueLabels(labelNames(pr.labels), config).length === 0) continue;
    const [reviews, routedAt] = await Promise.all([listReviews(github, owner, repo, pr.number), currentRoutedAt(github, owner, repo, pr, config)]);
    plans.push(planEscalation({ pr, reviews, load, config, now, routedAt }));
  }
  return plans;
}

/** Delete `review-due:*` labels older than the retention window that no open PR uses. */
export async function cleanupStaleDueLabels({ github, owner, repo, config, now = new Date(), log }) {
  const openPulls = await listOpenPulls(github, owner, repo);
  const active = new Set(openPulls.flatMap((pr) => parseDueLabels(labelNames(pr.labels), config).map((label) => label.name)));
  const cutoff = shiftDateKey(toDateKey(now), -DUE_LABEL_RETENTION_DAYS);
  const repoLabels = await github.paginate(github.rest.issues.listLabelsForRepo, { owner, repo, per_page: 100 });
  const deleted = [];
  for (const { name, date } of parseDueLabels(labelNames(repoLabels), config)) {
    if (date >= cutoff || active.has(name)) continue;
    log?.info?.(`${config.dryRun ? "[dry-run] " : ""}delete stale label ${name}`);
    deleted.push(name);
    if (config.dryRun) continue;
    try {
      await github.rest.issues.deleteLabel({ owner, repo, name });
    } catch (error) {
      if (error.status !== 404) throw error;
    }
  }
  return deleted;
}

// ---------------------------------------------------------------------------
// workflow_run artifact validation
// ---------------------------------------------------------------------------

/**
 * Validate a reader-workflow artifact and confirm it belongs to an open PR
 * whose head matches the triggering workflow_run. Mirrors the checks in
 * label-pr-intent-writer.yml.
 * @returns {Promise<{ prNumber: number, headSha: string, intentLabels: string[]|null } | { skip: string }>}
 *   intentLabels is an array for Label PR Intent artifacts and null for needs-reviewer requests.
 */
export async function resolveWorkflowRunArtifact({ github, owner, repo, workflowRun, artifact }) {
  const fail = (message) => {
    throw new Error(`Invalid review routing artifact: ${message}`);
  };

  if (!isPlainObject(artifact)) fail("artifact must be an object");
  const schema = artifact.schema_version;
  if (schema !== INTENT_ARTIFACT_SCHEMA && schema !== ROUTING_REQUEST_ARTIFACT_SCHEMA) fail("unexpected schema_version");
  if (artifact.event !== "pull_request") fail("unexpected event");
  if (!Number.isInteger(artifact.pr_number) || artifact.pr_number < 1) fail("invalid pr_number");
  if (!/^[0-9a-f]{40}$/i.test(String(artifact.head_sha || ""))) fail("invalid head_sha");
  if (workflowRun?.event !== "pull_request") fail("unexpected workflow_run event");
  if (String(artifact.run_id || "") !== String(workflowRun.id)) fail("run_id did not match workflow_run");
  if (artifact.head_sha !== workflowRun.head_sha) fail("head_sha did not match workflow_run");

  let intentLabels = null;
  if (schema === INTENT_ARTIFACT_SCHEMA) {
    intentLabels = validateIntentLabels(artifact.desired_labels, fail);
  }

  const prNumber = artifact.pr_number;
  const { data: pr } = await github.rest.pulls.get({ owner, repo, pull_number: prNumber });
  if (pr.state !== "open") return { skip: `PR #${prNumber} is not open` };

  const expectedBase = `${owner}/${repo}`.toLowerCase();
  if (lower(pr.base?.repo?.full_name) !== expectedBase) fail(`PR #${prNumber} does not target this repository`);
  if (pr.head?.sha !== workflowRun.head_sha) return { skip: `stale artifact for PR #${prNumber}` };

  const runHeadRepository = String(workflowRun.head_repository?.full_name || "");
  const [headOwner, headName] = runHeadRepository.split("/");
  const runHeadRef = String(workflowRun.head_branch || "");
  if (!headOwner || !headName || !runHeadRef || lower(pr.head?.repo?.full_name) !== lower(runHeadRepository) || String(pr.head?.ref || "") !== runHeadRef) {
    fail(`PR #${prNumber} head did not match workflow_run`);
  }

  const runPulls = Array.isArray(workflowRun.pull_requests) ? workflowRun.pull_requests : [];
  if (runPulls.length > 0) {
    if (!runPulls.some((pull) => pull.number === prNumber)) fail(`PR #${prNumber} was not present in workflow_run.pull_requests`);
  } else {
    const candidates = await github.paginate(github.rest.pulls.list, {
      owner,
      repo,
      state: "open",
      head: `${headOwner}:${runHeadRef}`,
      per_page: 100,
    });
    const matches = candidates.filter(
      (candidate) =>
        candidate.head?.sha === workflowRun.head_sha &&
        String(candidate.head?.ref || "") === runHeadRef &&
        lower(candidate.head?.repo?.full_name) === lower(runHeadRepository) &&
        lower(candidate.base?.repo?.full_name) === expectedBase
    );
    if (matches.length !== 1 || matches[0].number !== prNumber) fail(`PR #${prNumber} could not be uniquely associated with workflow_run`);
  }

  return { prNumber, headSha: artifact.head_sha, intentLabels };
}

/** Validate an intent label list; throws via `fail` (default: Error) on unknown labels. */
export function validateIntentLabels(value, fail = (message) => { throw new Error(message); }) {
  if (!Array.isArray(value)) fail("invalid desired_labels");
  for (const label of value) {
    if (!INTENT_LABELS.includes(label)) fail(`unexpected desired label ${label}`);
  }
  return [...value];
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

export function formatResultsSummary(results, { title, dryRun }) {
  const lines = [`## ${title}${dryRun ? " (dry run)" : ""}`, ""];
  if (results.length === 0) {
    lines.push("_No pull requests needed action._");
    return lines.join("\n");
  }
  lines.push("| PR | Action | Pool | Reviewers | Labels added | Labels removed | Notes |", "|---:|---|---|---|---|---|---|");
  for (const result of results) {
    const reviewers = [...(result.reviewers ?? []), ...(result.teamReviewers ?? []).map((team) => `team:${team}`)].join(", ");
    const notes = [result.reason, result.source, result.state, result.requestError && `request failed: ${result.requestError}`].filter(Boolean).join("; ");
    lines.push(
      `| #${result.prNumber} | ${result.action} | ${result.pool ?? ""} | ${reviewers} | ${(result.addLabels ?? []).join(", ")} | ${(result.removeLabels ?? []).join(", ")} | ${notes} |`
    );
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// CLI: `node eng/review-routing.mjs validate [path]`
// ---------------------------------------------------------------------------

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command = "validate", filePath = REVIEW_ROUTING_CONFIG_PATH] = process.argv.slice(2);
  if (command !== "validate") {
    console.error("Usage: node eng/review-routing.mjs validate [config-path]");
    process.exit(2);
  }
  try {
    const config = loadReviewRoutingConfig(filePath);
    const pools = Object.values(config.pools)
      .map((pool) => `${pool.name}: ${pool.reviewers.length} reviewer(s), ${pool.backup.length} backup(s)`)
      .join("\n  ");
    console.log(`✓ ${path.relative(process.cwd(), filePath)} is valid${config.dryRun ? " (dry_run enabled)" : ""}\n  ${pools}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
