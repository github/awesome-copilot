// Single source of truth for turning links, routes and plain-language requests into explorer targets.
import { normalizeRunFilters } from "./github.mjs";

const NAME = "[A-Za-z0-9_.-]+";
const REPO = `(${NAME})\\/(${NAME})`;
const GITHUB_HOSTS = new Set(["github.com", "www.github.com"]);
const VIEW_VERSION = 1;

export class TargetError extends Error {
  constructor(message) {
    super(message);
    this.name = "TargetError";
  }
}

function validRepository(owner, name) {
  const repository = `${owner}/${name}`;
  if (owner === "." || owner === ".." || name === "." || name === "..") return null;
  return repository;
}

function positive(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

export function pullUrl(repository, number) {
  return `https://github.com/${repository}/pull/${number}`;
}

export function issueUrl(repository, number) {
  return `https://github.com/${repository}/issues/${number}`;
}

export function artifactUrl(repository, artifactId, runId = null) {
  return runId
    ? `https://github.com/${repository}/actions/runs/${runId}/artifacts/${artifactId}`
    : `https://github.com/${repository}/actions/artifacts/${artifactId}`;
}

export function runUrl(repository, runId) {
  return `https://github.com/${repository}/actions/runs/${runId}`;
}

// Only the filters that GitHub's own Actions page understands are carried into the public link.
const GITHUB_STATUS_QUALIFIERS = {
  success: "success",
  failure: "failure",
  cancelled: "cancelled",
  skipped: "skipped",
  in_progress: "in_progress",
  queued: "queued",
  waiting: "waiting",
};

export function runsUrl(target) {
  const base = target.workflow
    ? `https://github.com/${target.repository}/actions/workflows/${encodeURIComponent(target.workflow)}`
    : `https://github.com/${target.repository}/actions`;
  const qualifiers = [];
  if (target.event) qualifiers.push(`event:${target.event}`);
  if (target.branch && !/\s/.test(target.branch)) qualifiers.push(`branch:${target.branch}`);
  if (GITHUB_STATUS_QUALIFIERS[target.status]) qualifiers.push(`is:${GITHUB_STATUS_QUALIFIERS[target.status]}`);
  return qualifiers.length ? `${base}?${new URLSearchParams({ query: qualifiers.join(" ") })}` : base;
}

// Hiding PR runs and showing only runs with artifacts are on unless a link says otherwise, so only an explicit 0/1 is kept.
function explicitToggle(value) {
  if (value === true || value === "1" || value === "true") return true;
  if (value === false || value === "0" || value === "false") return false;
  return undefined;
}

function runFilters(source) {
  const filters = normalizeRunFilters({ ...source, excludePullRequests: false });
  const result = {};
  if (filters.event) result.event = filters.event;
  if (filters.status) result.status = filters.status;
  if (filters.branch) result.branch = filters.branch;
  if (filters.workflow) result.workflow = filters.workflow;
  const excludePullRequests = explicitToggle(source.excludePullRequests);
  if (excludePullRequests !== undefined) result.excludePullRequests = excludePullRequests;
  const hasArtifacts = explicitToggle(source.hasArtifacts);
  if (hasArtifacts !== undefined) result.hasArtifacts = hasArtifacts;
  if (filters.page > 1) result.page = filters.page;
  return result;
}

function runsQueryString(target) {
  const query = new URLSearchParams();
  if (target.event) query.set("event", target.event);
  if (target.status) query.set("status", target.status);
  if (target.branch) query.set("branch", target.branch);
  if (target.workflow) query.set("workflow", target.workflow);
  if (target.excludePullRequests !== undefined) query.set("nopr", target.excludePullRequests ? "1" : "0");
  if (target.hasArtifacts !== undefined) query.set("artifacts", target.hasArtifacts ? "1" : "0");
  if (target.page > 1) query.set("page", String(target.page));
  return query.toString();
}

function filtersFromGitHubQuery(raw) {
  const filters = {};
  for (const token of String(raw ?? "").split(/\s+/).filter(Boolean)) {
    const [key, ...rest] = token.split(":");
    const value = rest.join(":");
    if (!value) continue;
    if (key === "event") filters.event = value;
    else if (key === "branch") filters.branch = value;
    else if (key === "is") filters.status = value;
  }
  return runFilters(filters);
}

export function canonicalUrl(target) {
  switch (target?.kind) {
    case "pull":
      return pullUrl(target.repository, target.number);
    case "issue":
      return issueUrl(target.repository, target.number);
    case "artifact":
      return artifactUrl(target.repository, target.artifactId, target.runId);
    case "run":
      return runUrl(target.repository, target.runId);
    case "runs":
      return runsUrl(target);
    case "repository":
      return `https://github.com/${target.repository}`;
    case "url":
      return target.url;
    default:
      return null;
  }
}

function fromGitHubUrl(url) {
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const repository = validRepository(parts[0], parts[1].replace(/\.git$/, ""));
  if (!repository || !new RegExp(`^${REPO}$`).test(repository)) return null;
  if (parts.length === 2) return { kind: "repository", repository };
  if (parts[2] === "pull" && positive(parts[3])) {
    return { kind: "pull", repository, number: positive(parts[3]) };
  }
  if ((parts[2] === "issues" || parts[2] === "issue") && positive(parts[3])) {
    return { kind: "issue", repository, number: positive(parts[3]) };
  }
  if (parts[2] === "actions" && parts[3] === "runs" && positive(parts[4]) && parts[5] === "artifacts" && positive(parts[6])) {
    return { kind: "artifact", repository, artifactId: positive(parts[6]), runId: positive(parts[4]) };
  }
  if (parts[2] === "actions" && parts[3] === "artifacts" && positive(parts[4])) {
    return { kind: "artifact", repository, artifactId: positive(parts[4]) };
  }
  if (parts[2] === "actions" && parts[3] === "runs" && positive(parts[4])) {
    return { kind: "run", repository, runId: positive(parts[4]) };
  }
  if (parts[2] === "actions") {
    const filters = filtersFromGitHubQuery(url.searchParams.get("query"));
    if (parts[3] === "workflows" && parts[4]) {
      const workflow = runFilters({ workflow: parts[4] }).workflow;
      if (workflow) filters.workflow = workflow;
    }
    return { kind: "runs", repository, ...filters };
  }
  return { kind: "repository", repository };
}

function fromExplorerRoute(input) {
  const full = input.replace(/^#/, "");
  const queryIndex = full.indexOf("?");
  const route = queryIndex >= 0 ? full.slice(0, queryIndex) : full;
  const query = new URLSearchParams(queryIndex >= 0 ? full.slice(queryIndex + 1) : "");
  const target = fromExplorerPath(route, query);
  if (target && query.has("v")) {
    const view = decodeView(query.get("v"));
    if (view) target.view = view;
  }
  return target;
}

function safeRepository(raw) {
  let repository;
  try {
    repository = decodeURIComponent(raw);
  } catch {
    throw new TargetError("That explorer route has an invalid repository.");
  }
  const match = repository.match(new RegExp(`^${REPO}$`));
  const valid = match ? validRepository(match[1], match[2]) : null;
  if (!valid) throw new TargetError("That explorer route has an invalid repository.");
  return valid;
}

function safeId(raw, { allowZero = false } = {}) {
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
    throw new TargetError("That explorer route has an invalid number.");
  }
  return value;
}

function fromExplorerPath(route, query) {
  if (route === "/browser") {
    const view = decodeView(query.get("v"));
    return view ? { kind: "url", url: view.url ?? null, view } : null;
  }
  let match = route.match(/^\/pull\/([^/]+)\/(\d+)$/);
  if (match) return { kind: "pull", repository: safeRepository(match[1]), number: safeId(match[2]) };
  match = route.match(/^\/issue\/([^/]+)\/(\d+)$/);
  if (match) return { kind: "issue", repository: safeRepository(match[1]), number: safeId(match[2]) };
  match = route.match(/^\/artifact\/([^/]+)\/(\d+)\/(\d+)$/);
  if (match) {
    const target = { kind: "artifact", repository: safeRepository(match[1]), artifactId: safeId(match[3]) };
    const pullNumber = safeId(match[2], { allowZero: true });
    if (pullNumber > 0) target.pullNumber = pullNumber;
    if (query.get("run")) target.runId = safeId(query.get("run"));
    if (query.get("file")) {
      target.file = query.get("file");
      if (query.get("view") === "raw") target.mode = "raw";
    }
    return target;
  }
  match = route.match(/^\/pulls\/([^/]+)$/);
  if (match) return { kind: "repository", repository: safeRepository(match[1]) };
  match = route.match(/^\/runs\/([^/]+)$/);
  if (match) {
    return {
      kind: "runs",
      repository: safeRepository(match[1]),
      ...runFilters({
        event: query.get("event"),
        status: query.get("status"),
        branch: query.get("branch"),
        workflow: query.get("workflow"),
        excludePullRequests: query.get("nopr"),
        hasArtifacts: query.get("artifacts"),
        page: query.get("page"),
      }),
    };
  }
  match = route.match(/^\/run\/([^/]+)\/(\d+)$/);
  if (match) return { kind: "run", repository: safeRepository(match[1]), runId: safeId(match[2]) };
  if (route === "/cache") return { kind: "cache" };
  if (route === "/docs" || route.startsWith("/docs/")) return { kind: "docs", section: route.slice(6) || null };
  return null;
}

function webUrl(input) {
  let url;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) throw new TargetError("URLs with embedded credentials are not supported.");
  return url;
}

function bareHost(input) {
  const match = input.match(/^(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?(\/\S*)?$/i);
  return match ? `http://${input}` : null;
}

const PRESETS = "mobile|tablet|desktop|native";
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 5;

function presetView(token) {
  const size = token.match(/^(\d{3,4})\s*[x×]\s*(\d{3,4})$/);
  if (size) {
    const width = Number(size[1]);
    const height = Number(size[2]);
    if (width < 200 || height < 200 || width > 4000 || height > 4000) return null;
    return { preset: "custom", width, height };
  }
  return { preset: token };
}

// Bounded browser vocabulary only: anything else falls through to target parsing.
function browserCommand(text) {
  const lower = text.toLowerCase().replace(/[?!.]+$/, "").trim().replace(/^please\s+/, "");
  let match = lower.match(/^(?:go\s+)?(back|forward)(?:\s+a\s+page)?$/);
  if (match) return { kind: "command", command: match[1] };
  if (/^(?:refresh|reload)(?:\s+the)?(?:\s+page)?$/.test(lower)) return { kind: "command", command: "refresh" };
  match = lower.match(/^zoom(?:\s+to)?\s+(\d{2,3})\s*%$/);
  if (match) {
    const zoom = Number(match[1]) / 100;
    if (zoom < ZOOM_MIN || zoom > ZOOM_MAX) throw new TargetError("Zoom must be between 25% and 500%.");
    return { kind: "command", command: "zoom", zoom };
  }
  if (/^zoom\s+(?:to\s+)?fit$|^fit(?:\s+to\s+window)?$/.test(lower)) return { kind: "command", command: "zoom", fit: true };
  match = lower.match(/^zoom\s+(in|out)$/);
  if (match) return { kind: "command", command: "zoom", step: match[1] === "in" ? 1 : -1 };
  if (/^(?:take\s+a\s+)?screenshot(?:\s+of\s+(?:the\s+)?page)?$/.test(lower)) return { kind: "command", command: "screenshot" };
  if (/^rotate(?:\s+the)?(?:\s+(?:screen|device|view))?$/.test(lower)) return { kind: "command", command: "rotate" };
  match = lower.match(new RegExp(`^(?:switch\\s+to\\s+|use\\s+|set\\s+)?(${PRESETS}|\\d{3,4}\\s*[x×]\\s*\\d{3,4})(?:\\s+(?:view|size|preset|viewport))?$`));
  if (match) {
    const view = presetView(match[1]);
    if (!view) throw new TargetError("Custom sizes must be 200–4000 pixels.");
    return { kind: "command", command: "viewport", ...view };
  }
  match = text.trim().match(new RegExp(`^(?:please\\s+)?(?:(?:show|open|preview|view|browse|go\\s+to)\\s+)?(\\S+?)\\s+(?:on|in|as|at)\\s+(?:a\\s+|an\\s+)?(${PRESETS}|\\d{3,4}\\s*[x×]\\s*\\d{3,4})(?:\\s+(?:view|size|preset|viewport))?(?:\\s+(?:at|with)\\s+(\\d{2,3})\\s*%(?:\\s+zoom)?)?$`, "i"));
  if (match) {
    const url = webUrl(match[1]) ?? webUrl(bareHost(match[1]) ?? "");
    if (!url || GITHUB_HOSTS.has(url.hostname.toLowerCase())) return null;
    const view = presetView(match[2].toLowerCase());
    if (!view) throw new TargetError("Custom sizes must be 200–4000 pixels.");
    if (match[3]) {
      const zoom = Number(match[3]) / 100;
      if (zoom < ZOOM_MIN || zoom > ZOOM_MAX) throw new TargetError("Zoom must be between 25% and 500%.");
      view.zoom = zoom;
    }
    return { kind: "url", url: url.href, view };
  }
  return null;
}

function naturalLanguage(text) {
  const lower = text.toLowerCase().replace(/[?!.]+$/, "").trim();
  if (/^(?:please )?(?:show|open|go to|take) ?(?:me )?(?:to )?(?:the )?(?:docs|documentation|help|how to use)(?: tab| page)?$|^(?:docs|documentation|help)$/.test(lower)) {
    return { kind: "docs", section: null };
  }
  if (/^(?:please )?(?:(?:show|open|go to|list) ?(?:me )?(?:the )?)?(?:artifact )?cache(?: tab| page)?$/.test(lower)) {
    return { kind: "cache" };
  }
  const repoMatch = text.match(new RegExp(`(?:^|[\\s(])(${NAME}\\/${NAME})(?=$|[\\s,.;)#])`));
  const [repoOwner, repoName] = repoMatch ? repoMatch[1].split("/") : [];
  const repository = repoMatch && validRepository(repoOwner, repoName) ? repoMatch[1] : null;
  const kindMatch = lower.match(/\b(pull request|pull|pr|issue|artifact|run)\b\s*(?:number\s*|no\.?\s*|id\s*)?#?(\d+)/);
  if (kindMatch) {
    const number = positive(kindMatch[2]);
    if (kindMatch[1] === "artifact") return { kind: "artifact", repository, artifactId: number };
    if (kindMatch[1] === "run") return { kind: "run", repository, runId: number };
    return { kind: kindMatch[1] === "issue" ? "issue" : "pull", repository, number };
  }
  if (/\b(?:open|show|go to|browse|view|list|find|see)\b/.test(lower) && /\b(?:actions|workflow runs?|workflows|runs|cron|scheduled|schedule|nightly)\b/.test(lower)) {
    const filters = {};
    if (/\b(?:cron|scheduled|schedule|nightly)\b/.test(lower)) filters.event = "schedule";
    else if (/\b(?:manual|manually|dispatch|dispatched)\b/.test(lower)) filters.event = "workflow_dispatch";
    else if (/\breleases?\b/.test(lower)) filters.event = "release";
    else if (/\bpush(?:es)?\b/.test(lower)) filters.event = "push";
    if (/\b(?:fail|failed|failing|failures?)\b/.test(lower)) filters.status = "failure";
    if (/\b(?:without|no|not|non)[\s-]+(?:from\s+)?(?:a\s+)?(?:pr|prs|pull requests?)\b/.test(lower)) filters.excludePullRequests = true;
    else if (/\b(?:including|with|and|all)\b.*\b(?:pr|prs|pull requests?)\b|\ball (?:workflow )?runs\b/.test(lower)) filters.excludePullRequests = false;
    if (/\b(?:with|that have|having)\s+artifacts?\b/.test(lower)) filters.hasArtifacts = true;
    else if (/\b(?:all (?:workflow )?runs|without artifacts?|even without artifacts?|no artifacts?)\b/.test(lower)) filters.hasArtifacts = false;
    return { kind: "runs", repository, ...runFilters(filters) };
  }
  if (repository && /\b(?:open|show|go to|browse|view|pulls?)\b/.test(lower)) {
    const hash = text.match(/#(\d+)/);
    if (hash) return { kind: "pull", repository, number: positive(hash[1]) };
    return { kind: "repository", repository };
  }
  return null;
}

/**
 * Resolves any supported input. Throws TargetError when nothing matches.
 * Missing repository (for "pr 12") is left null so callers can apply the current context.
 */
export function parseTarget(value, { defaultRepository = null } = {}) {
  const input = String(value ?? "").trim();
  if (!input) throw new TargetError("Enter a link, repository, pull request, artifact or URL.");
  if (input.startsWith("#/") || input.startsWith("/")) {
    const target = fromExplorerRoute(input);
    if (target) return target;
  }
  const url = webUrl(input) ?? webUrl(bareHost(input) ?? "");
  if (url) {
    if (GITHUB_HOSTS.has(url.hostname.toLowerCase())) {
      const target = fromGitHubUrl(url);
      if (target) return target;
      throw new TargetError("That GitHub link is not a repository, pull request, issue or artifact.");
    }
    return { kind: "url", url: url.href };
  }
  let match = input.match(new RegExp(`^${REPO}#(\\d+)$`));
  if (match && validRepository(match[1], match[2])) {
    return { kind: "pull", repository: `${match[1]}/${match[2]}`, number: Number(match[3]), ambiguous: true };
  }
  match = input.match(new RegExp(`^${REPO}$`));
  if (match && validRepository(match[1], match[2])) {
    return { kind: "repository", repository: `${match[1]}/${match[2]}` };
  }
  match = input.match(new RegExp(`^${REPO}(?:\\s+|:)artifact[:\\s#]*(\\d+)$`, "i"));
  if (match && validRepository(match[1], match[2])) {
    return { kind: "artifact", repository: `${match[1]}/${match[2]}`, artifactId: Number(match[3]) };
  }
  match = input.match(new RegExp(`^${REPO}(?:\\s+|:)run[:\\s#]*(\\d+)$`, "i"));
  if (match && validRepository(match[1], match[2])) {
    return { kind: "run", repository: `${match[1]}/${match[2]}`, runId: Number(match[3]) };
  }
  match = input.match(new RegExp(`^${REPO}(?:\\s+|:)(?:actions|runs|workflow runs)$`, "i"));
  if (match && validRepository(match[1], match[2])) {
    return { kind: "runs", repository: `${match[1]}/${match[2]}` };
  }
  match = input.match(/^#(\d+)$/);
  if (match && defaultRepository) {
    return { kind: "pull", repository: defaultRepository, number: Number(match[1]), ambiguous: true };
  }
  const browser = browserCommand(input);
  if (browser) return browser;
  const nl = naturalLanguage(input);
  if (nl) {
    const repository = nl.repository ?? defaultRepository;
    if (nl.kind !== "docs" && nl.kind !== "cache" && !repository) {
      throw new TargetError("Name a repository (owner/name) so I know where to look.");
    }
    return { ...nl, repository };
  }
  throw new TargetError(`I could not understand "${input.slice(0, 80)}".`);
}

export function routeFor(target) {
  switch (target?.kind) {
    case "repository":
      return `#/pulls/${encodeURIComponent(target.repository)}`;
    case "pull":
      return `#/pull/${encodeURIComponent(target.repository)}/${target.number}`;
    case "issue":
      return `#/issue/${encodeURIComponent(target.repository)}/${target.number}`;
    case "artifact": {
      const params = [];
      if (target.file) {
        params.push(`file=${encodeURIComponent(target.file)}`);
        if (target.mode === "raw") params.push("view=raw");
      }
      if (target.runId) params.push(`run=${target.runId}`);
      return `#/artifact/${encodeURIComponent(target.repository)}/${target.pullNumber ?? 0}/${target.artifactId}${params.length ? `?${params.join("&")}` : ""}`;
    }
    case "run":
      return `#/run/${encodeURIComponent(target.repository)}/${target.runId}`;
    case "runs": {
      const query = runsQueryString(target);
      return `#/runs/${encodeURIComponent(target.repository)}${query ? `?${query}` : ""}`;
    }
    case "url":
      return target.url ? `#/browser?v=${encodeView({ ...target.view, url: target.url })}` : null;
    case "cache":
      return "#/cache";
    case "docs":
      return target.section ? `#/docs/${target.section}` : "#/docs";
    default:
      return null;
  }
}

// Shareable view: never includes tokens, ports or local paths.
export function encodeView(view) {
  const clean = {
    v: VIEW_VERSION,
    ...(view.url ? { url: view.url } : {}),
    ...(view.preset ? { preset: view.preset } : {}),
    ...(view.width ? { w: view.width } : {}),
    ...(view.height ? { h: view.height } : {}),
    ...(view.zoom ? { z: view.zoom } : {}),
    ...(view.orientation ? { o: view.orientation } : {}),
  };
  return Buffer.from(JSON.stringify(clean)).toString("base64url");
}

export function decodeView(fragment) {
  try {
    const value = JSON.parse(Buffer.from(String(fragment), "base64url").toString("utf8"));
    if (value?.v !== VIEW_VERSION) return null;
    const url = value.url ? webUrl(value.url)?.href : undefined;
    return {
      url,
      preset: typeof value.preset === "string" ? value.preset : undefined,
      width: positive(value.w) ?? undefined,
      height: positive(value.h) ?? undefined,
      zoom: Number.isFinite(value.z) ? value.z : undefined,
      orientation: value.o === "landscape" || value.o === "portrait" ? value.o : undefined,
    };
  } catch {
    return null;
  }
}

export function describeShare(target, view = null) {
  const merged = view ?? target?.view ?? null;
  const hasView = merged && Object.values(merged).some((value) => value !== undefined && value !== null);
  let route;
  if (target?.kind === "url") {
    route = target.url ? `#/browser?v=${encodeView({ ...merged, url: target.url })}` : null;
  } else {
    route = routeFor(target);
    if (route && hasView) route += `${route.includes("?") ? "&" : "?"}v=${encodeView(merged)}`;
  }
  const url = target?.kind === "artifact" && !target.runId ? null : target?.kind === "url" && hasView ? null : canonicalUrl(target);
  return {
    target,
    url,
    route,
    view: hasView ? encodeView(merged) : null,
    text: url ?? route,
  };
}
