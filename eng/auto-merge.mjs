#!/usr/bin/env node
// Safe auto-merge automation (github/awesome-copilot#4184, phase 3).
//
// Arms GitHub auto-merge only when every policy condition in
// .github/auto-merge.yml holds and the PR matches an allowlisted eligibility
// rule. Disarms auto-merge it armed when conditions later fail. Never checks
// out or executes pull request code; everything is evaluated from API metadata.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";
import { createGitHubClient, parseLink, parseRepository } from "./lib/review-automation-github.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_FOLDER = path.resolve(__dirname, "..");
export const DEFAULT_CONFIG_PATH = path.join(ROOT_FOLDER, ".github", "auto-merge.yml");
export const COMMENT_MARKER = "<!-- auto-merge-status -->";

export const DEFAULT_CONFIG = Object.freeze({
  enabled: false,
  base_branch: "main",
  merge_method: "squash",
  required_checks: ["submission-gate"],
  required_labels: ["merge-risk:low"],
  blocking_labels: [
    "do-not-merge",
    "requires-submitter-fixes",
    "awaiting-automation",
    "merge-risk:medium",
    "merge-risk:high",
  ],
  min_approvals: 1,
  require_resolved_threads: true,
  require_up_to_date: true,
  armed_label: "auto-merge-armed",
  disarm_manual_on_blocking_label: true,
  comment: true,
  eligibility: {
    generated_output: {
      enabled: true,
      authors: ["github-actions"],
      paths: ["README.md", "docs/README.*.md", ".github/plugin/marketplace.json"],
    },
    resource_owner: {
      enabled: true,
      modified_only: true,
      sources: ["codeowners", "recorded_author"],
      min_merged_prs: 1,
      resource_roots: ["agents", "instructions", "skills", "hooks", "workflows", "plugins", "extensions"],
      generated_paths: ["README.md", "docs/README.*.md", ".github/plugin/marketplace.json"],
      excluded_paths: ["plugins/external.json", ".github/**", "eng/**", "CODEOWNERS"],
    },
  },
});

const MERGE_METHODS = new Map([
  ["squash", "SQUASH"],
  ["merge", "MERGE"],
  ["rebase", "REBASE"],
]);

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export function normalizeConfig(raw = {}) {
  const input = raw && typeof raw === "object" ? raw : {};
  const eligibility = input.eligibility && typeof input.eligibility === "object" ? input.eligibility : {};
  const generated = { ...DEFAULT_CONFIG.eligibility.generated_output, ...(eligibility.generated_output ?? {}) };
  const owner = { ...DEFAULT_CONFIG.eligibility.resource_owner, ...(eligibility.resource_owner ?? {}) };
  const config = {
    ...DEFAULT_CONFIG,
    ...input,
    eligibility: { generated_output: generated, resource_owner: owner },
  };

  config.enabled = config.enabled === true;
  config.merge_method = String(config.merge_method ?? "squash").toLowerCase();
  if (!MERGE_METHODS.has(config.merge_method)) {
    throw new Error(`Unsupported merge_method "${config.merge_method}" (expected squash, merge, or rebase).`);
  }
  for (const key of ["required_checks", "required_labels", "blocking_labels"]) {
    config[key] = toStringList(config[key]);
  }
  config.min_approvals = Math.max(0, Number.parseInt(config.min_approvals ?? 1, 10) || 0);
  generated.authors = toStringList(generated.authors).map(normalizeLogin);
  generated.paths = toStringList(generated.paths);
  owner.sources = toStringList(owner.sources);
  owner.resource_roots = toStringList(owner.resource_roots);
  owner.generated_paths = toStringList(owner.generated_paths);
  owner.excluded_paths = toStringList(owner.excluded_paths);
  owner.min_merged_prs = Math.max(0, Number.parseInt(owner.min_merged_prs ?? 0, 10) || 0);
  return config;
}

export function loadAutoMergeConfig(filePath = DEFAULT_CONFIG_PATH) {
  if (!fs.existsSync(filePath)) {
    return normalizeConfig({});
  }
  return normalizeConfig(yaml.load(fs.readFileSync(filePath, "utf8")) ?? {});
}

function toStringList(value) {
  if (value === undefined || value === null) return [];
  return (Array.isArray(value) ? value : [value]).map((item) => String(item).trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Path matching and ownership
// ---------------------------------------------------------------------------

export function normalizeLogin(login) {
  return String(login ?? "")
    .trim()
    .replace(/^@/, "")
    .replace(/^app\//i, "")
    .replace(/\[bot\]$/i, "")
    .toLowerCase();
}

export function globToRegExp(pattern) {
  let source = "";
  for (let index = 0; index < pattern.length; index++) {
    const char = pattern[index];
    if (char === "*") {
      if (pattern[index + 1] === "*") {
        const followedBySlash = pattern[index + 2] === "/";
        source += followedBySlash ? "(?:.*/)?" : ".*";
        index += followedBySlash ? 2 : 1;
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

export function matchesAnyPath(filePath, patterns) {
  return patterns.some((pattern) => globToRegExp(pattern).test(filePath));
}

// Implements the subset of CODEOWNERS syntax used by GitHub: last match wins,
// leading "/" anchors to the root, trailing "/" matches a directory, patterns
// without a slash match at any depth.
export function parseCodeowners(text) {
  const rules = [];
  for (const rawLine of String(text ?? "").split(/\r?\n/)) {
    const line = rawLine.replace(/(^|\s)#.*$/, "").trim();
    if (!line) continue;
    const [pattern, ...owners] = line.split(/\s+/);
    rules.push({ pattern, owners, regex: codeownersPatternToRegExp(pattern) });
  }
  return rules;
}

function codeownersPatternToRegExp(pattern) {
  let body = pattern;
  const anchored = body.startsWith("/") || body.replace(/\/$/, "").includes("/");
  body = body.replace(/^\//, "");
  const directory = body.endsWith("/");
  body = body.replace(/\/$/, "");
  let source = globToRegExp(body).source.slice(1, -1);
  if (!anchored) source = `(?:.*/)?${source}`;
  source += directory ? "/.*" : "(?:/.*)?";
  return new RegExp(`^${source}$`);
}

export function codeownersFor(rules, filePath) {
  let match = null;
  for (const rule of rules) {
    if (rule.regex.test(filePath)) match = rule;
  }
  return match;
}

export function loadCodeowners(rootDir = ROOT_FOLDER) {
  for (const candidate of [".github/CODEOWNERS", "CODEOWNERS", "docs/CODEOWNERS"]) {
    const filePath = path.join(rootDir, candidate);
    if (fs.existsSync(filePath)) {
      return parseCodeowners(fs.readFileSync(filePath, "utf8"));
    }
  }
  return [];
}

// Resource key: the directory (or single file) that represents one resource.
export function resourceKeyFor(filePath, resourceRoots) {
  const segments = filePath.split("/");
  if (segments.length < 2 || !resourceRoots.includes(segments[0])) return null;
  return `${segments[0]}/${segments[1]}`;
}

export function recordedAuthorFromPluginJson(pluginJson) {
  const author = pluginJson?.author;
  if (!author) return [];
  const logins = [];
  const url = typeof author === "object" ? author.url : null;
  const match = typeof url === "string" ? url.match(/^https?:\/\/github\.com\/([A-Za-z0-9-]+)\/?$/i) : null;
  if (match) logins.push(normalizeLogin(match[1]));
  const name = typeof author === "string" ? author : author.name;
  if (typeof name === "string" && /^[A-Za-z0-9-]+$/.test(name.trim())) logins.push(normalizeLogin(name));
  return [...new Set(logins)];
}

// ---------------------------------------------------------------------------
// Evaluation (pure)
// ---------------------------------------------------------------------------

function latestCheckResults(checks) {
  const byName = new Map();
  for (const check of checks ?? []) {
    const existing = byName.get(check.name);
    const time = Date.parse(check.completedAt ?? check.startedAt ?? 0) || 0;
    if (!existing || time >= existing.time) byName.set(check.name, { ...check, time });
  }
  return byName;
}

function evaluateEligibility(pr, config, context) {
  const results = [];
  const author = normalizeLogin(pr.author?.login);
  const files = pr.files ?? [];

  const generated = config.eligibility.generated_output;
  if (generated.enabled) {
    const authorOk = generated.authors.includes(author);
    const offPath = files.filter((file) => !matchesAnyPath(file.path, generated.paths));
    const ok = authorOk && files.length > 0 && offPath.length === 0;
    results.push({
      rule: "generated_output",
      ok,
      detail: !authorOk
        ? `author @${pr.author?.login ?? "unknown"} is not a configured automation account`
        : offPath.length > 0
          ? `changes non-generated files: ${summarizePaths(offPath.map((file) => file.path))}`
          : files.length === 0
            ? "no changed files"
            : "only generated output changed by an automation account",
    });
  }

  const owner = config.eligibility.resource_owner;
  if (owner.enabled) {
    const problems = [];
    if (pr.author?.type === "Bot") problems.push("author is a bot");
    if (files.length === 0) problems.push("no changed files");
    if (owner.modified_only) {
      const nonModified = files.filter((file) => file.status !== "modified" && file.status !== "changed");
      if (nonModified.length > 0) {
        problems.push(`adds, removes, or renames files: ${summarizePaths(nonModified.map((file) => `${file.path} (${file.status})`))}`);
      }
    }
    const notOwned = [];
    const excluded = files.filter((file) => matchesAnyPath(file.path, owner.excluded_paths));
    if (excluded.length > 0) problems.push(`touches paths that always need a maintainer: ${summarizePaths(excluded.map((file) => file.path))}`);
    const resourceFiles = files.filter((file) => !matchesAnyPath(file.path, owner.generated_paths));
    if (files.length > 0 && resourceFiles.length === 0) problems.push("only generated output changed");
    for (const file of resourceFiles) {
      if (matchesAnyPath(file.path, owner.excluded_paths)) continue;
      const key = resourceKeyFor(file.path, owner.resource_roots);
      if (!key) {
        notOwned.push(`${file.path} (outside resource roots)`);
        continue;
      }
      if (!isOwner(author, file.path, key, owner.sources, context)) notOwned.push(file.path);
    }
    if (notOwned.length > 0) problems.push(`author is not a recorded owner of: ${summarizePaths(notOwned)}`);
    if (owner.min_merged_prs > 0) {
      const merged = context.authorMergedPrCount;
      if (merged === undefined || merged === null) {
        problems.push("merged PR history unavailable");
      } else if (merged < owner.min_merged_prs) {
        problems.push(`author has ${merged} merged PR(s); ${owner.min_merged_prs} required`);
      }
    }
    results.push({
      rule: "resource_owner",
      ok: problems.length === 0,
      detail: problems.length === 0 ? "low-risk update from an established resource owner" : problems.join("; "),
    });
  }

  return results;
}

function isOwner(author, filePath, resourceKey, sources, context) {
  if (!author) return false;
  if (sources.includes("codeowners")) {
    const rule = codeownersFor(context.codeowners ?? [], filePath);
    if (rule && rule.pattern !== "*" && rule.owners.some((ownerLogin) => normalizeLogin(ownerLogin) === author)) {
      return true;
    }
  }
  if (sources.includes("recorded_author")) {
    const recorded = context.recordedAuthors?.get?.(resourceKey) ?? context.recordedAuthors?.[resourceKey] ?? [];
    if (recorded.map(normalizeLogin).includes(author)) return true;
  }
  return false;
}

function summarizePaths(paths, limit = 5) {
  const shown = paths.slice(0, limit).map((item) => `\`${item}\``).join(", ");
  return paths.length > limit ? `${shown}, +${paths.length - limit} more` : shown;
}

export function evaluateAutoMerge(pr, config, context = {}) {
  const conditions = [];
  const add = (id, ok, detail) => conditions.push({ id, ok: Boolean(ok), detail });
  const labels = new Set((pr.labels ?? []).map((label) => label.toLowerCase()));

  add("open", pr.state === "OPEN" && !pr.isDraft, pr.state !== "OPEN" ? `PR is ${String(pr.state).toLowerCase()}` : pr.isDraft ? "PR is a draft" : "open and ready for review");
  add("base-branch", pr.baseRefName === config.base_branch, `targets \`${pr.baseRefName}\`${pr.baseRefName === config.base_branch ? "" : ` (expected \`${config.base_branch}\`)`}`);

  const checks = latestCheckResults(pr.checks);
  for (const name of config.required_checks) {
    const check = checks.get(name);
    const ok = check?.conclusion === "SUCCESS";
    add(`check:${name}`, ok, !check ? `\`${name}\` has not reported on the head commit` : ok ? `\`${name}\` succeeded` : `\`${name}\` is ${String(check.conclusion ?? check.status ?? "pending").toLowerCase()}`);
  }

  for (const label of config.required_labels) {
    add(`label:${label}`, labels.has(label.toLowerCase()), labels.has(label.toLowerCase()) ? `has \`${label}\`` : `missing \`${label}\``);
  }

  const blocking = config.blocking_labels.filter((label) => labels.has(label.toLowerCase()));
  add("no-blocking-labels", blocking.length === 0, blocking.length === 0 ? "no blocking labels" : `blocked by ${blocking.map((label) => `\`${label}\``).join(", ")}`);

  const author = normalizeLogin(pr.author?.login);
  const reviews = pr.reviews ?? [];
  const approvals = reviews.filter((review) => review.state === "APPROVED" && review.authorType !== "Bot" && review.authorCanPush !== false && normalizeLogin(review.author) !== author);
  const changesRequested = reviews.filter((review) => review.state === "CHANGES_REQUESTED");
  const approvalsOk = approvals.length >= config.min_approvals && changesRequested.length === 0 && pr.reviewDecision !== "CHANGES_REQUESTED" && (config.min_approvals === 0 || pr.reviewDecision !== "REVIEW_REQUIRED");
  add(
    "approvals",
    approvalsOk,
    changesRequested.length > 0 || pr.reviewDecision === "CHANGES_REQUESTED"
      ? `changes requested by ${changesRequested.map((review) => `@${review.author}`).join(", ") || "a reviewer"}`
      : `${approvals.length}/${config.min_approvals} approval(s) from maintainers${pr.reviewDecision === "REVIEW_REQUIRED" ? "; branch protection still requires review" : ""}`,
  );

  if (config.require_resolved_threads) {
    const unresolved = (pr.reviewThreads ?? []).filter((thread) => !thread.isResolved).length;
    const truncated = pr.reviewThreadsTruncated === true;
    add("threads-resolved", unresolved === 0 && !truncated, truncated ? "too many review threads to verify" : unresolved === 0 ? "all review threads resolved" : `${unresolved} unresolved review thread(s)`);
  }

  if (config.require_up_to_date) {
    const behind = pr.mergeStateStatus === "BEHIND" || (typeof pr.behindBy === "number" && pr.behindBy > 0);
    const conflicting = pr.mergeable === "CONFLICTING" || pr.mergeStateStatus === "DIRTY";
    const unknown = pr.behindBy === null || pr.behindBy === undefined;
    add(
      "up-to-date",
      !behind && !conflicting && !unknown,
      conflicting ? "has merge conflicts" : behind ? `behind \`${config.base_branch}\`${typeof pr.behindBy === "number" ? ` by ${pr.behindBy} commit(s)` : ""}` : unknown ? "could not compare with base branch" : `up to date with \`${config.base_branch}\``,
    );
  }

  if (pr.filesTruncated) {
    add("files-listed", false, "too many changed files to evaluate");
  }

  const eligibility = evaluateEligibility(pr, config, context);
  const eligible = eligibility.some((rule) => rule.ok);
  const conditionsOk = conditions.every((condition) => condition.ok);
  const shouldArm = conditionsOk && eligible;
  const armedLabel = config.armed_label ? config.armed_label.toLowerCase() : null;
  const armedByAutomation = armedLabel ? labels.has(armedLabel) : false;
  const autoMergeEnabled = Boolean(pr.autoMergeRequest);

  let action = "none";
  let reason;
  if (pr.state !== "OPEN") {
    action = "none";
    reason = "PR is not open";
  } else if (shouldArm) {
    action = autoMergeEnabled ? "keep" : "arm";
    reason = autoMergeEnabled ? "auto-merge already enabled" : "all conditions satisfied";
  } else if (autoMergeEnabled && armedByAutomation) {
    action = "disarm";
    reason = "conditions no longer satisfied";
  } else if (autoMergeEnabled && blocking.length > 0 && config.disarm_manual_on_blocking_label) {
    action = "disarm";
    reason = "blocking label added";
  } else if (autoMergeEnabled) {
    action = "leave";
    reason = "auto-merge was enabled manually; only blocking labels disarm it";
  } else if (armedByAutomation) {
    action = "clear-label";
    reason = "auto-merge no longer enabled";
  } else {
    reason = !eligible ? "not on the auto-merge allowlist" : "conditions not satisfied";
  }

  return { number: pr.number, eligible, conditionsOk, shouldArm, conditions, eligibility, action, reason, blockingLabels: blocking };
}

// ---------------------------------------------------------------------------
// GitHub data access
// ---------------------------------------------------------------------------

const PR_QUERY = `
query($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $number) {
      id number title url state isDraft
      author { login __typename }
      baseRefName headRefName headRefOid
      mergeable mergeStateStatus reviewDecision
      autoMergeRequest { enabledAt mergeMethod enabledBy { login } }
      labels(first: 100) { nodes { name } }
      latestOpinionatedReviews(first: 100) {
        nodes { state authorCanPushToRepository author { login __typename } }
      }
      reviewThreads(first: 100) { totalCount nodes { isResolved } }
      commits(last: 1) {
        nodes {
          commit {
            oid
            statusCheckRollup {
              contexts(first: 100) {
                nodes {
                  __typename
                  ... on CheckRun { name status conclusion startedAt completedAt }
                  ... on StatusContext { context state createdAt }
                }
              }
            }
          }
        }
      }
    }
  }
}`;

export async function fetchPullRequestSnapshot(client, { owner, repo }, number, config) {
  const data = await client.graphql(PR_QUERY, { owner, repo, number });
  const node = data?.repository?.pullRequest;
  if (!node) throw new Error(`Pull request #${number} not found`);

  const contexts = node.commits?.nodes?.[0]?.commit?.statusCheckRollup?.contexts?.nodes ?? [];
  const checks = contexts.map((context) =>
    context.__typename === "CheckRun"
      ? { name: context.name, status: context.status, conclusion: context.conclusion, startedAt: context.startedAt, completedAt: context.completedAt }
      : { name: context.context, status: context.state === "PENDING" || context.state === "EXPECTED" ? "IN_PROGRESS" : "COMPLETED", conclusion: context.state === "SUCCESS" ? "SUCCESS" : context.state === "PENDING" || context.state === "EXPECTED" ? null : "FAILURE", completedAt: context.createdAt },
  );

  const files = await client.paginate(`/repos/${owner}/${repo}/pulls/${number}/files`, { maxPages: 30 });

  let behindBy = null;
  try {
    const compare = await client.request("GET", `/repos/${owner}/${repo}/compare/${encodeURIComponent(config.base_branch)}...${node.headRefOid}`);
    behindBy = compare.data?.behind_by ?? null;
  } catch {
    behindBy = null;
  }

  return {
    id: node.id,
    number: node.number,
    title: node.title,
    url: node.url,
    state: node.state,
    isDraft: node.isDraft,
    author: { login: node.author?.login ?? null, type: node.author?.__typename ?? "User" },
    baseRefName: node.baseRefName,
    headRefOid: node.headRefOid,
    mergeable: node.mergeable,
    mergeStateStatus: node.mergeStateStatus,
    reviewDecision: node.reviewDecision,
    autoMergeRequest: node.autoMergeRequest,
    labels: (node.labels?.nodes ?? []).map((label) => label.name),
    reviews: (node.latestOpinionatedReviews?.nodes ?? []).map((review) => ({
      state: review.state,
      author: review.author?.login ?? "ghost",
      authorType: review.author?.__typename ?? "User",
      authorCanPush: review.authorCanPushToRepository,
    })),
    reviewThreads: node.reviewThreads?.nodes ?? [],
    reviewThreadsTruncated: (node.reviewThreads?.totalCount ?? 0) > (node.reviewThreads?.nodes?.length ?? 0),
    checks,
    files: files.map((file) => ({ path: file.filename, status: file.status, previousPath: file.previous_filename })),
    filesTruncated: files.length >= 3000,
    behindBy,
  };
}

async function fetchRecordedAuthor(client, { owner, repo }, resourceKey, baseBranch, rootDir) {
  const logins = new Set();
  const [root, name] = resourceKey.split("/");
  const pluginName = root === "plugins" || root === "extensions" ? name : null;
  if (pluginName) {
    const manifestPath = path.join(rootDir, "plugins", pluginName, "plugin.json");
    if (fs.existsSync(manifestPath)) {
      try {
        for (const login of recordedAuthorFromPluginJson(JSON.parse(fs.readFileSync(manifestPath, "utf8")))) logins.add(login);
      } catch {
        // Ignore malformed manifests; validation workflows report them.
      }
    }
  }

  // The author of the oldest commit touching the resource is its recorded author.
  const route = `/repos/${owner}/${repo}/commits`;
  const first = await client.request("GET", route, { query: { path: resourceKey, sha: baseBranch, per_page: 1 }, allowStatuses: [404, 409] });
  if (first.status === 200 && Array.isArray(first.data) && first.data.length > 0) {
    const lastLink = parseLink(first.headers.get("link"), "last");
    const oldest = lastLink ? (await client.request("GET", lastLink)).data?.[0] : first.data[0];
    if (oldest?.author?.login) logins.add(normalizeLogin(oldest.author.login));
  }
  return [...logins];
}


async function countMergedPrs(client, { owner, repo }, login) {
  const data = await client.graphql(
    `query($q: String!) { search(query: $q, type: ISSUE, first: 1) { issueCount } }`,
    { q: `repo:${owner}/${repo} is:pr is:merged author:${login}` },
  );
  return data?.search?.issueCount ?? 0;
}

export async function buildEvaluationContext(client, repository, pr, config, rootDir = ROOT_FOLDER) {
  const context = { codeowners: loadCodeowners(rootDir), recordedAuthors: new Map(), authorMergedPrCount: null };
  const owner = config.eligibility.resource_owner;
  if (!owner.enabled || pr.author?.type === "Bot" || !pr.author?.login) return context;

  const keys = new Set();
  for (const file of pr.files) {
    if (matchesAnyPath(file.path, [...owner.generated_paths, ...owner.excluded_paths])) continue;
    const key = resourceKeyFor(file.path, owner.resource_roots);
    if (key) keys.add(key);
  }
  if (owner.sources.includes("recorded_author")) {
    for (const key of keys) {
      try {
        context.recordedAuthors.set(key, await fetchRecordedAuthor(client, repository, key, config.base_branch, rootDir));
      } catch (error) {
        console.warn(`Could not resolve recorded author for ${key}: ${error.message}`);
        context.recordedAuthors.set(key, []);
      }
    }
  }
  if (owner.min_merged_prs > 0) {
    try {
      context.authorMergedPrCount = await countMergedPrs(client, repository, pr.author.login);
    } catch (error) {
      console.warn(`Could not count merged PRs for @${pr.author.login}: ${error.message}`);
    }
  }
  return context;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

async function armAutoMerge(client, repository, pr, config) {
  try {
    await client.graphql(
      `mutation($id: ID!, $method: PullRequestMergeMethod!, $oid: GitObjectID) {
        enablePullRequestAutoMerge(input: { pullRequestId: $id, mergeMethod: $method, expectedHeadOid: $oid }) { clientMutationId }
      }`,
      { id: pr.id, method: MERGE_METHODS.get(config.merge_method), oid: pr.headRefOid },
    );
    return "armed";
  } catch (error) {
    // GitHub refuses to arm auto-merge when the PR is already mergeable
    // ("clean status"). Every condition holds, so merge directly at the
    // evaluated head SHA, which is what `gh pr merge --auto` does too.
    if (!/clean status|unstable status/i.test(error.message)) throw error;
    await client.request("PUT", `/repos/${repository.owner}/${repository.repo}/pulls/${pr.number}/merge`, {
      body: { merge_method: config.merge_method, sha: pr.headRefOid },
    });
    return "merged";
  }
}

async function disarmAutoMerge(client, pr) {
  await client.graphql(
    `mutation($id: ID!) { disablePullRequestAutoMerge(input: { pullRequestId: $id }) { clientMutationId } }`,
    { id: pr.id },
  );
}

async function addLabel(client, { owner, repo }, number, label) {
  await client.request("POST", `/repos/${owner}/${repo}/issues/${number}/labels`, { body: { labels: [label] } });
}

async function removeLabel(client, { owner, repo }, number, label) {
  await client.request("DELETE", `/repos/${owner}/${repo}/issues/${number}/labels/${encodeURIComponent(label)}`, { allowStatuses: [404] });
}

async function upsertComment(client, { owner, repo }, number, body) {
  const comments = await client.paginate(`/repos/${owner}/${repo}/issues/${number}/comments`, { maxPages: 10 });
  const existing = comments.find((comment) => comment.user?.type === "Bot" && comment.body?.includes(COMMENT_MARKER));
  if (existing) {
    await client.request("PATCH", `/repos/${owner}/${repo}/issues/comments/${existing.id}`, { body: { body } });
  } else {
    await client.request("POST", `/repos/${owner}/${repo}/issues/${number}/comments`, { body: { body } });
  }
}

export function renderStatusComment(result, outcome, config) {
  const headline = {
    armed: `✅ Safe auto-merge is **armed** (${config.merge_method}). GitHub will merge this PR once branch protection is satisfied.`,
    merged: `✅ All safe auto-merge conditions held, so this PR was merged (${config.merge_method}).`,
    disarmed: `⏸️ Safe auto-merge was **disarmed**: ${result.reason}.`,
  }[outcome];
  const lines = [COMMENT_MARKER, `### Safe auto-merge`, "", headline, "", "| Condition | Status | Detail |", "|---|---|---|"];
  for (const condition of result.conditions) {
    lines.push(`| ${condition.id} | ${condition.ok ? "✅" : "❌"} | ${escapeCell(condition.detail)} |`);
  }
  for (const rule of result.eligibility) {
    lines.push(`| eligibility:${rule.rule} | ${rule.ok ? "✅" : "➖"} | ${escapeCell(rule.detail)} |`);
  }
  lines.push("", "_Policy: `.github/auto-merge.yml`. Maintainers can add `do-not-merge` at any time to stop auto-merge._");
  return lines.join("\n");
}

function escapeCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ").replace(/@(?=[A-Za-z0-9])/g, "@\u200b");
}

export async function applyDecision(client, repository, pr, result, config, { dryRun }) {
  if (dryRun || !config.enabled) return result.action === "none" || result.action === "keep" || result.action === "leave" ? "no-op" : `would-${result.action}`;
  switch (result.action) {
    case "arm": {
      const outcome = await armAutoMerge(client, repository, pr, config);
      if (config.armed_label && outcome === "armed") await addLabel(client, repository, pr.number, config.armed_label);
      if (config.comment) await upsertComment(client, repository, pr.number, renderStatusComment(result, outcome, config));
      return outcome;
    }
    case "disarm": {
      await disarmAutoMerge(client, pr);
      if (config.armed_label) await removeLabel(client, repository, pr.number, config.armed_label);
      if (config.comment) await upsertComment(client, repository, pr.number, renderStatusComment(result, "disarmed", config));
      return "disarmed";
    }
    case "clear-label":
      await removeLabel(client, repository, pr.number, config.armed_label);
      return "label-cleared";
    default:
      return "no-op";
  }
}

// ---------------------------------------------------------------------------
// Candidate discovery and reporting
// ---------------------------------------------------------------------------

async function findCandidatePrs(client, { owner, repo }, config) {
  const pulls = await client.paginate(`/repos/${owner}/${repo}/pulls`, { query: { state: "open", base: config.base_branch }, maxPages: 10 });
  const interesting = new Set([...config.required_labels, config.armed_label].filter(Boolean).map((label) => label.toLowerCase()));
  return pulls
    .filter((pull) => pull.auto_merge || (pull.labels ?? []).some((label) => interesting.has(label.name.toLowerCase())))
    .map((pull) => pull.number);
}

async function findPrsForSha(client, { owner, repo }, sha) {
  const data = await client.graphql(
    `query($q: String!) { search(query: $q, type: ISSUE, first: 20) { nodes { ... on PullRequest { number } } } }`,
    { q: `repo:${owner}/${repo} is:pr is:open sha:${sha}` },
  );
  return (data?.search?.nodes ?? []).map((node) => node.number).filter(Boolean);
}

export function renderSummary(entries, config, { dryRun }) {
  const mode = !config.enabled ? "dry run (`enabled: false` in `.github/auto-merge.yml`)" : dryRun ? "dry run (`--dry-run`)" : "live";
  const lines = ["## Safe auto-merge", "", `Mode: ${mode}`, ""];
  if (entries.length === 0) {
    lines.push("No candidate pull requests to evaluate.");
    return lines.join("\n");
  }
  lines.push("| PR | Action | Outcome | Eligible | Conditions | Reason |", "|---|---|---|---|---|---|");
  for (const entry of entries) {
    if (entry.error) {
      lines.push(`| #${entry.number} | error | – | – | – | ${escapeCell(entry.error)} |`);
      continue;
    }
    const failed = entry.result.conditions.filter((condition) => !condition.ok).map((condition) => condition.id);
    lines.push(`| #${entry.number} | ${entry.result.action} | ${entry.outcome} | ${entry.result.eligible ? "yes" : "no"} | ${failed.length === 0 ? "all pass" : `failing: ${failed.join(", ")}`} | ${escapeCell(entry.result.reason)} |`);
  }
  for (const entry of entries.filter((item) => !item.error)) {
    lines.push("", `<details><summary>#${entry.number} details</summary>`, "");
    for (const condition of entry.result.conditions) lines.push(`- ${condition.ok ? "✅" : "❌"} **${condition.id}**: ${condition.detail}`);
    for (const rule of entry.result.eligibility) lines.push(`- ${rule.ok ? "✅" : "➖"} **eligibility:${rule.rule}**: ${rule.detail}`);
    lines.push("", "</details>");
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

export function parseArgs(argv) {
  const options = { prs: [], shas: [], all: false, dryRun: false, config: DEFAULT_CONFIG_PATH, repo: process.env.GITHUB_REPOSITORY, summaryFile: process.env.GITHUB_STEP_SUMMARY, jsonFile: null };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    const next = () => {
      const value = argv[++index];
      if (value === undefined) throw new Error(`Missing value for ${arg}`);
      return value;
    };
    switch (arg) {
      case "--pr":
        options.prs.push(...next().split(/[\s,]+/).filter(Boolean).map((value) => Number.parseInt(value, 10)));
        break;
      case "--sha":
        options.shas.push(next());
        break;
      case "--all":
        options.all = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--config":
        options.config = next();
        break;
      case "--repo":
        options.repo = next();
        break;
      case "--summary-file":
        options.summaryFile = next();
        break;
      case "--json":
        options.jsonFile = next();
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (options.prs.some((value) => !Number.isInteger(value) || value <= 0)) throw new Error("--pr expects positive integers");
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const config = loadAutoMergeConfig(options.config);
  const repository = parseRepository(options.repo);
  const client = createGitHubClient();

  const numbers = new Set(options.prs);
  for (const sha of options.shas) for (const number of await findPrsForSha(client, repository, sha)) numbers.add(number);
  if (options.all) for (const number of await findCandidatePrs(client, repository, config)) numbers.add(number);

  const entries = [];
  for (const number of [...numbers].sort((a, b) => a - b)) {
    try {
      const pr = await fetchPullRequestSnapshot(client, repository, number, config);
      const context = await buildEvaluationContext(client, repository, pr, config);
      const result = evaluateAutoMerge(pr, config, context);
      const outcome = await applyDecision(client, repository, pr, result, config, { dryRun: options.dryRun });
      entries.push({ number, result, outcome });
      console.log(`#${number}: action=${result.action} outcome=${outcome} (${result.reason})`);
    } catch (error) {
      entries.push({ number, error: error.message });
      console.error(`#${number}: ${error.message}`);
    }
  }

  const summary = renderSummary(entries, config, options);
  if (options.summaryFile) fs.appendFileSync(options.summaryFile, `${summary}\n`);
  else console.log(`\n${summary}`);
  if (options.jsonFile) fs.writeFileSync(options.jsonFile, `${JSON.stringify({ enabled: config.enabled, dryRun: options.dryRun, entries }, null, 2)}\n`);

  if (entries.some((entry) => entry.error)) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
