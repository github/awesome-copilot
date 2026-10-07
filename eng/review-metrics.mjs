#!/usr/bin/env node
// Weekly review operating metrics (github/awesome-copilot#4184, phase 3).
//
// Collects read-only data from the GitHub API, computes review throughput and
// load metrics, and publishes them to a tracking issue. Labels introduced by
// other phases (state and risk tiers) are optional: missing labels are
// reported as "unlabeled" / "unclassified" instead of failing.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";
import { createGitHubClient, parseRepository } from "./lib/review-automation-github.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_FOLDER = path.resolve(__dirname, "..");
export const DEFAULT_CONFIG_PATH = path.join(ROOT_FOLDER, ".github", "review-metrics.yml");
export const TRACKING_MARKER = "<!-- review-metrics-tracking -->";
export const REPORT_MARKER = "<!-- review-metrics-report -->";
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const DEFAULT_CONFIG = Object.freeze({
  window_days: 7,
  targets_business_days: [2, 4],
  base_branch: "main",
  state_labels: ["awaiting-automation", "requires-submitter-fixes", "ready-for-review", "review-in-progress", "approved"],
  risk_labels: ["merge-risk:low", "merge-risk:medium", "merge-risk:high"],
  external_plugin_label: "external-plugin",
  external_plugin_state_labels: ["awaiting-review", "requires-submitter-fixes", "ready-for-review", "awaiting-approval"],
  automation_workflows: [],
  tracking_issue: { title: "Review operating metrics", label: "review-metrics" },
});

export function normalizeConfig(raw = {}) {
  const input = raw && typeof raw === "object" ? raw : {};
  const config = { ...DEFAULT_CONFIG, ...input, tracking_issue: { ...DEFAULT_CONFIG.tracking_issue, ...(input.tracking_issue ?? {}) } };
  config.window_days = Math.max(1, Number(config.window_days) || DEFAULT_CONFIG.window_days);
  config.targets_business_days = (Array.isArray(config.targets_business_days) ? config.targets_business_days : [config.targets_business_days])
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);
  for (const key of ["state_labels", "risk_labels", "external_plugin_state_labels", "automation_workflows"]) {
    config[key] = (Array.isArray(config[key]) ? config[key] : []).map(String);
  }
  return config;
}

export function loadMetricsConfig(filePath = DEFAULT_CONFIG_PATH) {
  if (!fs.existsSync(filePath)) return normalizeConfig({});
  return normalizeConfig(yaml.load(fs.readFileSync(filePath, "utf8")) ?? {});
}

// ---------------------------------------------------------------------------
// Statistics helpers (pure)
// ---------------------------------------------------------------------------

// Elapsed business time in days between two instants. Saturdays and Sundays
// (UTC) contribute nothing; partial weekdays count fractionally.
export function businessDaysBetween(start, end) {
  let from = new Date(start).getTime();
  const to = new Date(end).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return 0;
  let total = 0;
  while (from < to) {
    const dayStart = Math.floor(from / DAY_MS) * DAY_MS;
    const dayEnd = Math.min(dayStart + DAY_MS, to);
    const weekday = new Date(dayStart).getUTCDay();
    if (weekday !== 0 && weekday !== 6) total += (dayEnd - from) / DAY_MS;
    from = dayEnd;
  }
  return total;
}

// Linear-interpolated percentile (same method as numpy's default).
export function percentile(values, p) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const rank = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (rank - lower);
}

export function summarizeDurations(hours) {
  return {
    count: hours.length,
    median_hours: roundOrNull(percentile(hours, 50)),
    p90_hours: roundOrNull(percentile(hours, 90)),
  };
}

// Herfindahl-Hirschman index on a 0-10,000 scale plus the top reviewer share.
export function concentration(counts) {
  const values = Object.values(counts).filter((value) => value > 0);
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total === 0) return { total: 0, reviewers: 0, top_share: null, hhi: null, effective_reviewers: null };
  const shares = values.map((value) => value / total);
  const hhi = shares.reduce((sum, share) => sum + share * share, 0);
  return {
    total,
    reviewers: values.length,
    top_share: round(Math.max(...shares), 3),
    hhi: Math.round(hhi * 10000),
    effective_reviewers: round(1 / hhi, 2),
  };
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function roundOrNull(value, digits = 1) {
  return value === null ? null : round(value, digits);
}

function isBot(actor) {
  return !actor || actor.type === "Bot" || /\[bot\]$/i.test(actor.login ?? "");
}

// ---------------------------------------------------------------------------
// Metric computation (pure)
// ---------------------------------------------------------------------------

// First maintainer review submitted at or after the current review clock
// start, so reviews from before a draft/re-ready cycle are not counted.
function firstHumanReview(pr) {
  const clockStart = Date.parse(reviewClockStart(pr) ?? "");
  const reviews = (pr.reviews ?? [])
    .filter((review) => isMaintainerReview(review, pr) && review.submittedAt && review.state !== "PENDING")
    .filter((review) => !Number.isFinite(clockStart) || Date.parse(review.submittedAt) >= clockStart)
    .sort((a, b) => Date.parse(a.submittedAt) - Date.parse(b.submittedAt));
  return reviews[0] ?? null;
}

// Reviews from bots, the PR author, and users without write access do not count.
function isMaintainerReview(review, pr) {
  return !isBot(review.author) && review.author?.login !== pr.author?.login && review.authorCanPushToRepository !== false;
}

function reviewClockStart(pr) {
  return pr.readyForReviewAt ?? pr.createdAt;
}

function tally(items, labelsFor, buckets, fallback) {
  const counts = Object.fromEntries([...buckets, fallback].map((bucket) => [bucket, 0]));
  for (const item of items) {
    const labels = new Set(labelsFor(item).map((label) => label.toLowerCase()));
    const matched = buckets.filter((bucket) => labels.has(bucket.toLowerCase()));
    if (matched.length === 0) counts[fallback]++;
    for (const bucket of matched) counts[bucket]++;
  }
  return counts;
}

export function computeMetrics(data, config, { now = new Date() } = {}) {
  const nowMs = new Date(now).getTime();
  const windowStart = nowMs - config.window_days * DAY_MS;
  const inWindow = (value) => {
    const time = Date.parse(value ?? "");
    return Number.isFinite(time) && time >= windowStart && time <= nowMs;
  };

  const contributionPrs = (data.openPrs ?? []).filter((pr) => !isBot(pr.author));
  const readyPrs = contributionPrs.filter((pr) => !pr.isDraft);
  const openIssues = data.externalPluginIssues ?? [];

  const open = {
    pull_requests: {
      total: contributionPrs.length,
      drafts: contributionPrs.length - readyPrs.length,
      automation_authored_excluded: (data.openPrs ?? []).length - contributionPrs.length,
      by_state: tally(readyPrs, (pr) => pr.labels, config.state_labels, "unlabeled"),
      by_risk: tally(readyPrs, (pr) => pr.labels, config.risk_labels, "unclassified"),
    },
    external_plugin_issues: {
      total: openIssues.length,
      by_state: tally(openIssues, (issue) => issue.labels, config.external_plugin_state_labels, "unlabeled"),
    },
  };

  // Time to first review: PRs whose first human review landed in the window.
  const firstReviewHours = [];
  // Time to merge: PRs merged in the window.
  const mergeHours = [];
  const reviewsByMaintainer = {};
  const prsByMaintainer = {};
  for (const pr of data.windowPrs ?? []) {
    if (isBot(pr.author)) continue;
    const first = firstHumanReview(pr);
    if (first && inWindow(first.submittedAt)) {
      firstReviewHours.push((Date.parse(first.submittedAt) - Date.parse(reviewClockStart(pr))) / HOUR_MS);
    }
    if (pr.mergedAt && inWindow(pr.mergedAt)) {
      mergeHours.push((Date.parse(pr.mergedAt) - Date.parse(pr.createdAt)) / HOUR_MS);
    }
    for (const review of pr.reviews ?? []) {
      if (!isMaintainerReview(review, pr) || !inWindow(review.submittedAt)) continue;
      const login = review.author.login;
      reviewsByMaintainer[login] = (reviewsByMaintainer[login] ?? 0) + 1;
      (prsByMaintainer[login] ??= new Set()).add(pr.number);
    }
  }

  const maintainers = Object.keys(reviewsByMaintainer)
    .map((login) => ({ login, reviews: reviewsByMaintainer[login], pull_requests: prsByMaintainer[login].size }))
    .sort((a, b) => b.pull_requests - a.pull_requests || b.reviews - a.reviews || a.login.localeCompare(b.login));
  const prCounts = Object.fromEntries(maintainers.map((maintainer) => [maintainer.login, maintainer.pull_requests]));

  // Items waiting on a maintainer beyond the business-day targets.
  const waiting = [];
  for (const pr of readyPrs) {
    const labels = new Set(pr.labels.map((label) => label.toLowerCase()));
    if (labels.has("requires-submitter-fixes")) continue;
    if (firstHumanReview(pr)) continue;
    const since = reviewClockStart(pr);
    waiting.push({ kind: "pr", number: pr.number, title: pr.title, url: pr.url, since, business_days: round(businessDaysBetween(since, nowMs), 2) });
  }
  for (const issue of openIssues) {
    const labels = new Set(issue.labels.map((label) => label.toLowerCase()));
    if (!labels.has("ready-for-review") && !labels.has("awaiting-approval")) continue;
    const since = issue.readyAt ?? issue.createdAt;
    waiting.push({ kind: "issue", number: issue.number, title: issue.title, url: issue.url, since, business_days: round(businessDaysBetween(since, nowMs), 2) });
  }
  waiting.sort((a, b) => b.business_days - a.business_days);
  const overdue = Object.fromEntries(
    config.targets_business_days.map((target) => {
      const items = waiting.filter((item) => item.business_days > target);
      return [String(target), { count: items.length, items }];
    }),
  );

  // Automation failure rate over completed runs of the review workflows.
  const automation = [];
  const automationErrors = [];
  let failedTotal = 0;
  let consideredTotal = 0;
  for (const workflow of data.workflowRuns ?? []) {
    if (workflow.error) {
      automationErrors.push({ workflow: workflow.file, error: workflow.error });
      automation.push({ workflow: workflow.file, found: true, error: workflow.error });
      continue;
    }
    if (!workflow.found) {
      automation.push({ workflow: workflow.file, found: false });
      continue;
    }
    const runs = workflow.runs.filter((run) => run.status === "completed" && inWindow(run.created_at));
    const considered = runs.filter((run) => !["cancelled", "skipped", "neutral", "action_required", "stale"].includes(run.conclusion));
    const failed = considered.filter((run) => ["failure", "timed_out", "startup_failure"].includes(run.conclusion));
    failedTotal += failed.length;
    consideredTotal += considered.length;
    automation.push({
      workflow: workflow.file,
      name: workflow.name,
      found: true,
      runs: considered.length,
      failed: failed.length,
      failure_rate: considered.length ? round(failed.length / considered.length, 3) : null,
    });
  }

  return {
    generated_at: new Date(nowMs).toISOString(),
    window: { days: config.window_days, start: new Date(windowStart).toISOString(), end: new Date(nowMs).toISOString() },
    open,
    time_to_first_review: summarizeDurations(firstReviewHours),
    time_to_merge: summarizeDurations(mergeHours),
    reviews_per_maintainer: maintainers,
    reviewer_concentration: { ...concentration(prCounts), basis: "distinct PRs reviewed" },
    overdue,
    automation: {
      failure_rate: consideredTotal ? round(failedTotal / consideredTotal, 3) : null,
      failed: failedTotal,
      runs: consideredTotal,
      incomplete: automationErrors.length > 0,
      errors: automationErrors,
      workflows: automation,
    },
  };
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function formatHours(hours) {
  if (hours === null || hours === undefined) return "n/a";
  if (hours < 48) return `${round(hours, 1)} h`;
  return `${round(hours / 24, 1)} d`;
}

function formatPercent(value) {
  return value === null || value === undefined ? "n/a" : `${round(value * 100, 1)}%`;
}

function escapeCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ").replace(/@(?=[A-Za-z0-9])/g, "@\u200b");
}

function countsTable(title, counts) {
  const lines = [`| ${title} | Count |`, "|---|---:|"];
  for (const [key, value] of Object.entries(counts)) lines.push(`| \`${key}\` | ${value} |`);
  return lines.join("\n");
}

export function renderReport(metrics, { repository, runUrl } = {}) {
  const lines = [REPORT_MARKER, `## Review operating metrics — week ending ${metrics.window.end.slice(0, 10)}`, ""];
  lines.push(`Window: ${metrics.window.start.slice(0, 10)} → ${metrics.window.end.slice(0, 10)} (${metrics.window.days} days, UTC). Business-day targets skip weekends.`, "");

  const prs = metrics.open.pull_requests;
  lines.push("### Open contributions", "");
  lines.push(`**${prs.total}** open contribution PRs (${prs.drafts} draft, ${prs.automation_authored_excluded} automation-authored excluded) and **${metrics.open.external_plugin_issues.total}** open external plugin submissions.`, "");
  lines.push(countsTable("PR state (non-draft)", prs.by_state), "", countsTable("PR risk tier (non-draft)", prs.by_risk), "");
  lines.push(countsTable("External plugin state", metrics.open.external_plugin_issues.by_state), "");

  lines.push("### Review speed", "", "| Metric | Samples | Median | p90 |", "|---|---:|---:|---:|");
  lines.push(`| Time to first review | ${metrics.time_to_first_review.count} | ${formatHours(metrics.time_to_first_review.median_hours)} | ${formatHours(metrics.time_to_first_review.p90_hours)} |`);
  lines.push(`| Time to merge | ${metrics.time_to_merge.count} | ${formatHours(metrics.time_to_merge.median_hours)} | ${formatHours(metrics.time_to_merge.p90_hours)} |`, "");

  const conc = metrics.reviewer_concentration;
  lines.push("### Reviewer load", "");
  if (metrics.reviews_per_maintainer.length === 0) {
    lines.push("No maintainer reviews in this window.", "");
  } else {
    lines.push(`Top reviewer share: **${formatPercent(conc.top_share)}** · HHI: **${conc.hhi}** (0–10,000; >2,500 = highly concentrated) · effective reviewers: **${conc.effective_reviewers}**`, "");
    lines.push("| Maintainer | PRs reviewed | Reviews |", "|---|---:|---:|");
    for (const maintainer of metrics.reviews_per_maintainer) lines.push(`| ${escapeCell(`@${maintainer.login}`)} | ${maintainer.pull_requests} | ${maintainer.reviews} |`);
    lines.push("");
  }

  lines.push("### Waiting on maintainers", "", "| Target | Items past target |", "|---|---:|");
  for (const [target, entry] of Object.entries(metrics.overdue)) lines.push(`| ${target} business days | ${entry.count} |`);
  const targets = Object.keys(metrics.overdue);
  const firstTarget = targets[0];
  if (firstTarget && metrics.overdue[firstTarget].count > 0) {
    lines.push("", `<details><summary>Items past ${firstTarget} business days</summary>`, "", "| Item | Waiting (business days) | Title |", "|---|---:|---|");
    for (const item of metrics.overdue[firstTarget].items.slice(0, 50)) {
      lines.push(`| ${item.kind === "pr" ? "PR" : "Issue"} [#${item.number}](${item.url}) | ${item.business_days} | ${escapeCell(item.title)} |`);
    }
    if (metrics.overdue[firstTarget].items.length > 50) lines.push(`| … | | ${metrics.overdue[firstTarget].items.length - 50} more |`);
    lines.push("", "</details>");
  }
  lines.push("");

  const automation = metrics.automation;
  lines.push("### Automation health", "");
  lines.push(`Failure rate: **${formatPercent(automation.failure_rate)}${automation.incomplete ? " (incomplete)" : ""}** (${automation.failed} failed of ${automation.runs} completed runs; cancelled/skipped excluded).`, "");
  if (automation.incomplete) lines.push("⚠️ Collection was incomplete because one or more workflow APIs returned errors; affected workflows are excluded from the denominator.", "");
  lines.push("| Workflow | Runs | Failed | Failure rate |", "|---|---:|---:|---:|");
  for (const workflow of automation.workflows) {
    if (workflow.error) {
      lines.push(`| \`${workflow.workflow}\` | – | – | collection error: ${escapeCell(workflow.error)} |`);
    } else {
      lines.push(workflow.found ? `| \`${workflow.workflow}\` | ${workflow.runs} | ${workflow.failed} | ${formatPercent(workflow.failure_rate)} |` : `| \`${workflow.workflow}\` | – | – | not found |`);
    }
  }
  lines.push("", `_Generated ${metrics.generated_at}${repository ? ` for ${repository}` : ""}${runUrl ? ` by [this run](${runUrl})` : ""}. Definitions: docs/maintainers/canvas-evidence-and-metrics.md._`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Data collection
// ---------------------------------------------------------------------------

const PR_FIELDS = `
  id number title url createdAt mergedAt isDraft state
  author { login __typename }
  labels(first: 50) { nodes { name } }
  reviews(first: 100) { pageInfo { hasNextPage endCursor } nodes { state submittedAt authorCanPushToRepository author { login __typename } } }
  timelineItems(last: 1, itemTypes: [READY_FOR_REVIEW_EVENT]) { nodes { ... on ReadyForReviewEvent { createdAt } } }
`;

const REVIEW_FIELDS = "state submittedAt authorCanPushToRepository author { login __typename }";

async function searchAll(client, query, fields, maxItems = 1000) {
  const items = [];
  let cursor = null;
  do {
    const data = await client.graphql(
      `query($q: String!, $cursor: String) {
        search(query: $q, type: ISSUE, first: 50, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes { ... on PullRequest { ${fields} } ... on Issue { ${ISSUE_FIELDS} } }
        }
      }`,
      { q: query, cursor },
    );
    items.push(...(data.search.nodes ?? []).filter(Boolean));
    cursor = data.search.pageInfo.hasNextPage ? data.search.pageInfo.endCursor : null;
  } while (cursor && items.length < maxItems);
  return items;
}

async function hydrateReviewPages(client, pullRequests) {
  for (const pr of pullRequests) {
    let cursor = pr.reviews?.pageInfo?.hasNextPage ? pr.reviews.pageInfo.endCursor : null;
    while (cursor) {
      const data = await client.graphql(
        `query($id: ID!, $cursor: String) {
          node(id: $id) {
            ... on PullRequest {
              reviews(first: 100, after: $cursor) {
                pageInfo { hasNextPage endCursor }
                nodes { ${REVIEW_FIELDS} }
              }
            }
          }
        }`,
        { id: pr.id, cursor },
      );
      const page = data.node?.reviews;
      if (!page) break;
      pr.reviews.nodes.push(...(page.nodes ?? []));
      cursor = page.pageInfo?.hasNextPage ? page.pageInfo.endCursor : null;
    }
  }
  return pullRequests;
}

async function hydrateIssueLabelEventPages(client, issues) {
  for (const issue of issues) {
    let cursor = issue.timelineItems?.pageInfo?.hasPreviousPage ? issue.timelineItems.pageInfo.startCursor : null;
    while (cursor) {
      const data = await client.graphql(
        `query($id: ID!, $cursor: String) {
          node(id: $id) {
            ... on Issue {
              timelineItems(last: 100, before: $cursor, itemTypes: [LABELED_EVENT]) {
                pageInfo { hasPreviousPage startCursor }
                nodes { ... on LabeledEvent { createdAt label { name } } }
              }
            }
          }
        }`,
        { id: issue.id, cursor },
      );
      const page = data.node?.timelineItems;
      if (!page) break;
      issue.timelineItems.nodes.unshift(...(page.nodes ?? []));
      cursor = page.pageInfo?.hasPreviousPage ? page.pageInfo.startCursor : null;
    }
  }
  return issues;
}

const ISSUE_FIELDS = `
  id number title url createdAt
  labels(first: 50) { nodes { name } }
  timelineItems(last: 100, itemTypes: [LABELED_EVENT]) {
    pageInfo { hasPreviousPage startCursor }
    nodes { ... on LabeledEvent { createdAt label { name } } }
  }
`;

function normalizePr(node) {
  return {
    number: node.number,
    title: node.title,
    url: node.url,
    createdAt: node.createdAt,
    mergedAt: node.mergedAt,
    isDraft: node.isDraft,
    readyForReviewAt: node.timelineItems?.nodes?.[0]?.createdAt ?? null,
    author: node.author ? { login: node.author.login, type: node.author.__typename } : null,
    labels: (node.labels?.nodes ?? []).map((label) => label.name),
    reviews: (node.reviews?.nodes ?? []).map((review) => ({
      state: review.state,
      submittedAt: review.submittedAt,
      authorCanPushToRepository: review.authorCanPushToRepository,
      author: review.author ? { login: review.author.login, type: review.author.__typename } : null,
    })),
  };
}

function normalizeIssue(node) {
  const readyEvents = (node.timelineItems?.nodes ?? []).filter((event) => ["ready-for-review", "awaiting-approval"].includes(event?.label?.name));
  return {
    number: node.number,
    title: node.title,
    url: node.url,
    createdAt: node.createdAt,
    readyAt: readyEvents.length ? readyEvents[readyEvents.length - 1].createdAt : null,
    labels: (node.labels?.nodes ?? []).map((label) => label.name),
  };
}

async function fetchWorkflowRuns(client, { owner, repo }, file, since) {
  const probe = await client.request("GET", `/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(file)}`, { allowStatuses: [404] });
  if (probe.status === 404) return { file, found: false, runs: [] };
  const runs = await client.paginate(`/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(file)}/runs`, {
    query: { created: `>=${since.slice(0, 10)}`, exclude_pull_requests: true },
    itemsKey: "workflow_runs",
    maxPages: 10,
  });
  return {
    file,
    found: true,
    name: probe.data?.name,
    runs: runs.map((run) => ({ status: run.status, conclusion: run.conclusion, created_at: run.created_at })),
  };
}

export async function collectData(client, repository, config, { now = new Date() } = {}) {
  const repo = `${repository.owner}/${repository.repo}`;
  const since = new Date(new Date(now).getTime() - config.window_days * DAY_MS).toISOString();
  const sinceDate = since.slice(0, 10);

  const openPrNodes = await hydrateReviewPages(client, await searchAll(client, `repo:${repo} is:pr is:open base:${config.base_branch}`, PR_FIELDS));
  const windowPrNodes = await hydrateReviewPages(client, await searchAll(client, `repo:${repo} is:pr base:${config.base_branch} updated:>=${sinceDate}`, PR_FIELDS));
  const openPrs = openPrNodes.map(normalizePr);
  const windowPrs = windowPrNodes.map(normalizePr);
  let externalPluginIssues = [];
  if (config.external_plugin_label) {
    const externalPluginIssueNodes = await searchAll(
      client,
      `repo:${repo} is:issue is:open label:"${config.external_plugin_label}"`,
      PR_FIELDS,
    );
    externalPluginIssues = (await hydrateIssueLabelEventPages(client, externalPluginIssueNodes)).map(normalizeIssue);
  }
  const workflowRuns = [];
  for (const file of config.automation_workflows) {
    try {
      workflowRuns.push(await fetchWorkflowRuns(client, repository, file, since));
    } catch (error) {
      console.warn(`Could not read runs for ${file}: ${error.message}`);
      workflowRuns.push({ file, found: true, runs: [], error: error.message });
    }
  }
  return { openPrs, windowPrs, externalPluginIssues, workflowRuns };
}

// ---------------------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------------------

async function ensureLabel(client, { owner, repo }, name) {
  const existing = await client.request("GET", `/repos/${owner}/${repo}/labels/${encodeURIComponent(name)}`, { allowStatuses: [404] });
  if (existing.status === 404) {
    await client.request("POST", `/repos/${owner}/${repo}/labels`, {
      body: { name, color: "C5DEF5", description: "Weekly review operating metrics tracking issue" },
      allowStatuses: [422],
    });
  }
}

export function renderTrackingBody(report) {
  return [
    TRACKING_MARKER,
    "This issue tracks weekly review operating metrics for contribution review (#4184).",
    "It is updated automatically by `.github/workflows/review-metrics.yml`; each week's report is also posted as a comment so trends stay visible.",
    "",
    "---",
    "",
    report,
  ].join("\n");
}

export async function publishReport(client, repository, config, report) {
  const { owner, repo } = repository;
  const label = config.tracking_issue.label;
  await ensureLabel(client, repository, label);
  const issues = await client.paginate(`/repos/${owner}/${repo}/issues`, { query: { state: "open", labels: label }, maxPages: 5 });
  let issue = issues.find((candidate) => !candidate.pull_request && candidate.body?.includes(TRACKING_MARKER));
  const body = renderTrackingBody(report);
  if (issue) {
    await client.request("PATCH", `/repos/${owner}/${repo}/issues/${issue.number}`, { body: { body } });
  } else {
    issue = (await client.request("POST", `/repos/${owner}/${repo}/issues`, { body: { title: config.tracking_issue.title, body, labels: [label] } })).data;
    try {
      await client.graphql(`mutation($id: ID!) { pinIssue(input: { issueId: $id }) { issue { number } } }`, { id: issue.node_id });
    } catch (error) {
      console.warn(`Could not pin tracking issue #${issue.number}: ${error.message}`);
    }
  }
  await client.request("POST", `/repos/${owner}/${repo}/issues/${issue.number}/comments`, { body: { body: report } });
  return issue;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

export function parseArgs(argv) {
  const options = {
    config: DEFAULT_CONFIG_PATH,
    repo: process.env.GITHUB_REPOSITORY,
    dryRun: false,
    outputDir: null,
    summaryFile: process.env.GITHUB_STEP_SUMMARY,
    now: new Date(),
    windowDays: null,
    runUrl: process.env.METRICS_RUN_URL || null,
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    const next = () => {
      const value = argv[++index];
      if (value === undefined) throw new Error(`Missing value for ${arg}`);
      return value;
    };
    switch (arg) {
      case "--config":
        options.config = next();
        break;
      case "--repo":
        options.repo = next();
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--output-dir":
        options.outputDir = next();
        break;
      case "--summary-file":
        options.summaryFile = next();
        break;
      case "--now": {
        const value = new Date(next());
        if (Number.isNaN(value.getTime())) throw new Error("--now expects an ISO date");
        options.now = value;
        break;
      }
      case "--window-days":
        options.windowDays = Number(next());
        if (!Number.isFinite(options.windowDays) || options.windowDays <= 0) throw new Error("--window-days expects a positive number");
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const config = loadMetricsConfig(options.config);
  if (options.windowDays) config.window_days = options.windowDays;
  const repository = parseRepository(options.repo);
  const client = createGitHubClient();

  const data = await collectData(client, repository, config, { now: options.now });
  const metrics = computeMetrics(data, config, { now: options.now });
  const report = renderReport(metrics, { repository: `${repository.owner}/${repository.repo}`, runUrl: options.runUrl });

  if (options.outputDir) {
    fs.mkdirSync(options.outputDir, { recursive: true });
    fs.writeFileSync(path.join(options.outputDir, "metrics.json"), `${JSON.stringify(metrics, null, 2)}\n`);
    fs.writeFileSync(path.join(options.outputDir, "report.md"), `${report}\n`);
  }
  if (options.summaryFile) fs.appendFileSync(options.summaryFile, `${report}\n`);

  if (options.dryRun) {
    if (!options.summaryFile) console.log(report);
    console.log("Dry run: tracking issue not updated.");
    return;
  }
  const issue = await publishReport(client, repository, config, report);
  console.log(`Published review metrics to ${issue.html_url ?? `#${issue.number}`}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
