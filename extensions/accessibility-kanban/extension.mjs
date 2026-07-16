import { CanvasError, createCanvas, joinSession } from "@github/copilot-sdk/extension";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_NAME = "accessibility-kanban";
const STATE_FILE_PREFIX = "repository-issues-kanban-state";
const COLUMNS = ["backlog", "plan", "ready", "implement", "done"];
const VALID_COLUMNS = new Set(COLUMNS);
const REFRESH_ISSUES_ERROR = "Unable to refresh issues right now. Please try again.";

let repoInfoCache = null;
let githubTokenCache;
let workspaceCwd = null;

// The canvas request context reports the active session's *working directory*
// (i.e. the repo checkout). Note this is different from `session.workspacePath`,
// which points at the session-state folder (~/.copilot/session-state/<id>) and is
// NOT a git repo — using it for git resolution is what caused the board to fail
// with "Unable to detect the current repository from this workspace."
function setWorkspaceCwd(dir) {
  if (typeof dir !== "string" || !dir.trim() || dir === workspaceCwd) return;
  workspaceCwd = dir;
  repoInfoCache = null;
  githubTokenCache = undefined;
}

function captureCwd(ctx) {
  setWorkspaceCwd(ctx?.session?.workingDirectory);
}

function getWorkspaceCwd() {
  return workspaceCwd || process.cwd();
}

// ─── Repo resolution ───

function runCommand(command, args, cwd = process.cwd()) {
  try {
    const result = spawnSync(command, args, { cwd, encoding: "utf8" });
    if (result.status === 0 && !result.error) {
      return (result.stdout || "").trim();
    }
  } catch {
    // Ignore and fall through to empty string.
  }
  return "";
}

function normalizeRepo(repo) {
  if (typeof repo !== "string") return null;
  const cleaned = repo
    .trim()
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\.git$/i, "");
  if (!/^[^/\s]+\/[^/\s]+$/.test(cleaned)) return null;
  return cleaned;
}

function parseRepoFromRemoteUrl(remoteUrl) {
  if (!remoteUrl) return null;
  const cleaned = remoteUrl.trim().replace(/\.git$/i, "");

  const sshMatch = cleaned.match(/^[^@]+@[^:]+:([^/]+\/[^/]+)$/);
  if (sshMatch) return sshMatch[1];

  const httpMatch = cleaned.match(/^https?:\/\/[^/]+\/([^/]+\/[^/]+)$/i);
  if (httpMatch) return httpMatch[1];

  const fallbackMatch = cleaned.match(/[:/]([^/:]+\/[^/:]+)$/);
  return fallbackMatch ? fallbackMatch[1] : null;
}

function candidateCwds(preferredCwd) {
  const candidates = [
    preferredCwd,
    workspaceCwd,
    process.cwd(),
    __dirname,
    path.dirname(__dirname),
    path.dirname(path.dirname(__dirname)),
    path.dirname(path.dirname(path.dirname(__dirname))),
  ].filter(Boolean);
  return [...new Set(candidates)];
}

function resolveRepoFromGit(cwd) {
  const gitRoot = runCommand("git", ["rev-parse", "--show-toplevel"], cwd);
  if (!gitRoot) return null;

  const fromGh = normalizeRepo(runCommand("gh", ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"], gitRoot));
  if (fromGh) return fromGh;

  const remoteUrl = runCommand("git", ["remote", "get-url", "origin"], gitRoot) || runCommand("git", ["config", "--get", "remote.origin.url"], gitRoot);
  return normalizeRepo(parseRepoFromRemoteUrl(remoteUrl));
}

function resolveCurrentRepoInfo(cwd = getWorkspaceCwd()) {
  const fromEnv = normalizeRepo(process.env.GITHUB_REPOSITORY || "");
  if (fromEnv) return { repo: fromEnv, error: null };

  for (const candidate of candidateCwds(cwd)) {
    const repo = resolveRepoFromGit(candidate);
    if (repo) return { repo, error: null };
  }

  return {
    repo: "unknown/unknown",
    error: "Unable to detect the current repository from this workspace.",
  };
}

function getRepoInfo() {
  const cwd = getWorkspaceCwd();
  if (!repoInfoCache || repoInfoCache.cwd !== cwd) {
    const resolved = resolveCurrentRepoInfo(cwd);
    repoInfoCache = { ...resolved, cwd };
  }
  return repoInfoCache;
}

// ─── State persistence ───

function copilotHome() {
  return process.env.COPILOT_HOME || path.join(os.homedir(), ".copilot");
}

function stateFileName(repo) {
  const key = String(repo || "unknown-unknown")
    .toLowerCase()
    .replace(/[^\w.-]+/g, "-");
  return `${STATE_FILE_PREFIX}-${key}.json`;
}

function getStatePath(repo) {
  return path.join(copilotHome(), "extensions", EXTENSION_NAME, "artifacts", stateFileName(repo));
}

function ensureStateDirectory(repo) {
  fs.mkdirSync(path.dirname(getStatePath(repo)), { recursive: true });
}

function defaultState(repoInfo = getRepoInfo()) {
  return {
    repo: repoInfo.repo,
    error: repoInfo.error,
    updatedAt: new Date().toISOString(),
    generation: Date.now(),
    columns: COLUMNS,
    availableLabels: [],
    selectedLabels: [],
    issues: [],
  };
}

function normalizeLabelList(labels) {
  const unique = new Set();
  for (const label of Array.isArray(labels) ? labels : []) {
    if (typeof label === "string" && label.trim()) unique.add(label.trim());
  }
  return [...unique];
}

function computeAvailableLabels(issues) {
  const labels = new Set();
  for (const issue of Array.isArray(issues) ? issues : []) {
    for (const label of normalizeLabelList(issue.labels)) labels.add(label);
  }
  return [...labels].sort((a, b) => a.localeCompare(b));
}

function normalizeIssue(issue, repo, idx) {
  if (!issue || !Number.isInteger(issue.number) || !issue.title) return null;
  return {
    number: issue.number,
    title: issue.title,
    url: issue.url || `https://github.com/${repo}/issues/${issue.number}`,
    labels: normalizeLabelList(issue.labels),
    column: VALID_COLUMNS.has(issue.column) ? issue.column : "backlog",
    priority: issue.priority || "medium",
    order: Number.isInteger(issue.order) ? issue.order : idx,
    agentStatus: typeof issue.agentStatus === "string" ? issue.agentStatus : "",
    agentActive: Boolean(issue.agentActive),
    logs: Array.isArray(issue.logs) ? issue.logs : [],
  };
}

function normalizeState(rawState, repoInfo = getRepoInfo()) {
  const repo = repoInfo.repo;
  const issues = Array.isArray(rawState?.issues)
    ? rawState.issues.map((issue, idx) => normalizeIssue(issue, repo, idx)).filter(Boolean)
    : [];
  const availableLabels = computeAvailableLabels(issues);

  return {
    repo,
    error: repoInfo.error || (rawState?.error === REFRESH_ISSUES_ERROR ? REFRESH_ISSUES_ERROR : null),
    updatedAt: rawState?.updatedAt || new Date().toISOString(),
    generation: rawState?.generation || Date.now(),
    columns: Array.isArray(rawState?.columns) && rawState.columns.length ? rawState.columns : COLUMNS,
    availableLabels,
    selectedLabels: normalizeLabelList(rawState?.selectedLabels).filter((label) => availableLabels.includes(label)),
    issues,
  };
}

function loadState(repo) {
  try {
    return JSON.parse(fs.readFileSync(getStatePath(repo), "utf8"));
  } catch {
    return null;
  }
}

function saveState(state) {
  ensureStateDirectory(state.repo);
  fs.writeFileSync(
    getStatePath(state.repo),
    JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2),
  );
}

function currentState() {
  const repoInfo = getRepoInfo();
  const loaded = loadState(repoInfo.repo);
  const normalized = normalizeState(loaded || defaultState(repoInfo), repoInfo);
  if (!loaded) saveState(normalized);
  return normalized;
}

// ─── Issue operations ───

function moveIssue(issueNumber, column) {
  if (!VALID_COLUMNS.has(column)) {
    throw new CanvasError("invalid_column", `Column must be one of: ${COLUMNS.join(", ")}`);
  }
  const state = currentState();
  const issue = state.issues.find((i) => i.number === issueNumber);
  if (!issue) {
    throw new CanvasError("not_found", `Issue #${issueNumber} not found on the board`);
  }

  const prevColumn = issue.column;
  issue.column = column;
  issue.order = state.issues.filter((i) => i.column === column).length;

  if (column === "done" || column === "backlog") {
    issue.agentActive = false;
    issue.agentStatus = column === "done" ? "Complete" : "";
  }

  saveState(state);
  broadcast("state", state);
  return { issue, prevColumn };
}

function updateIssueStatus(issueNumber, status, logEntry) {
  const state = currentState();
  const issue = state.issues.find((i) => i.number === issueNumber);
  if (!issue) {
    throw new CanvasError("not_found", `Issue #${issueNumber} not found on the board`);
  }

  if (issue.column === "backlog") return issue;

  if (status !== undefined) issue.agentStatus = status;
  if (logEntry) {
    if (!issue.logs) issue.logs = [];
    issue.logs.push({ timestamp: new Date().toISOString(), message: logEntry });
  }
  issue.agentActive = true;
  saveState(state);
  broadcast("state", state);
  return issue;
}

function clearAgentStatus(issueNumber) {
  const state = currentState();
  const issue = state.issues.find((i) => i.number === issueNumber);
  if (!issue) return;
  issue.agentActive = false;
  saveState(state);
  broadcast("state", state);
}

function replaceIssues(issues) {
  const existing = currentState();
  const existingByNumber = new Map(existing.issues.map((i) => [i.number, i]));

  const nextIssues = (Array.isArray(issues) ? issues : [])
    .filter((i) => i && Number.isInteger(i.number) && i.title)
    .map((issue, idx) => {
      const prev = existingByNumber.get(issue.number);
      const labels = Array.isArray(issue.labels)
        ? issue.labels.map((l) => (typeof l === "string" ? l : l?.name)).filter(Boolean)
        : [];
      return {
        number: issue.number,
        title: issue.title,
        url: issue.url || `https://github.com/${existing.repo}/issues/${issue.number}`,
        labels: normalizeLabelList(labels),
        column: VALID_COLUMNS.has(issue.column) ? issue.column : prev?.column || "backlog",
        priority: issue.priority || prev?.priority || "medium",
        order: Number.isInteger(issue.order) ? issue.order : prev?.order ?? idx,
        agentStatus: prev?.agentStatus || "",
        agentActive: Boolean(prev?.agentActive),
        logs: Array.isArray(prev?.logs) ? prev.logs : [],
      };
    });

  const availableLabels = computeAvailableLabels(nextIssues);
  const next = {
    ...existing,
    issues: nextIssues,
    availableLabels,
    selectedLabels: normalizeLabelList(existing.selectedLabels).filter((label) => availableLabels.includes(label)),
    error: getRepoInfo().error,
  };
  saveState(next);
  broadcast("state", next);
  return next;
}

function setSelectedLabels(labels) {
  const state = currentState();
  state.selectedLabels = normalizeLabelList(labels).filter((label) => state.availableLabels.includes(label));
  saveState(state);
  broadcast("state", state);
  return state;
}

function resetBoard() {
  const state = currentState();
  const reset = {
    ...state,
    selectedLabels: [],
    issues: state.issues.map((issue, idx) => ({
      ...issue,
      column: "backlog",
      order: idx,
      agentStatus: "",
      agentActive: false,
      logs: [],
    })),
  };
  saveState(reset);
  broadcast("state", reset);
  return reset;
}

// ─── GitHub issue sync ───

function resolveGitHubToken(cwd = getWorkspaceCwd()) {
  if (githubTokenCache !== undefined) return githubTokenCache;
  githubTokenCache = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || runCommand("gh", ["auth", "token"], cwd) || "";
  return githubTokenCache;
}

function mapGitHubIssue(issue) {
  return {
    number: issue.number,
    title: issue.title,
    url: issue.html_url,
    labels: (issue.labels || []).map((label) => (typeof label === "string" ? label : label.name)).filter(Boolean),
  };
}

async function fetchOpenIssues(repo) {
  if (!repo || repo === "unknown/unknown") {
    throw new CanvasError("repo_unavailable", "Current repository could not be detected.");
  }

  const [owner, repoName] = repo.split("/");
  const token = resolveGitHubToken();
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "repository-issues-kanban",
  };
  if (token) headers.Authorization = `token ${token}`;

  const allIssues = [];
  let page = 1;
  while (page <= 10) {
    const params = new URLSearchParams({
      state: "open",
      per_page: "100",
      page: String(page),
    });

    const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}/issues?${params}`, { headers });
    if (!response.ok) {
      const body = await response.text();
      throw new CanvasError("github_api_error", `GitHub API request failed (${response.status}): ${body.slice(0, 200)}`);
    }

    const pageItems = await response.json();
    const mapped = pageItems
      .filter((item) => !item.pull_request)
      .map(mapGitHubIssue);
    allIssues.push(...mapped);

    if (pageItems.length < 100) break;
    page += 1;
  }

  return allIssues;
}

function mergeFetchedIssues(existingState, fetchedIssues) {
  const existingByNumber = new Map(existingState.issues.map((issue) => [issue.number, issue]));

  const mergedIssues = fetchedIssues.map((issue, idx) => {
    const prev = existingByNumber.get(issue.number);
    return {
      number: issue.number,
      title: issue.title,
      url: issue.url || `https://github.com/${existingState.repo}/issues/${issue.number}`,
      labels: normalizeLabelList(issue.labels),
      column: VALID_COLUMNS.has(prev?.column) ? prev.column : "backlog",
      priority: prev?.priority || "medium",
      order: Number.isInteger(prev?.order) ? prev.order : idx,
      agentStatus: prev?.agentStatus || "",
      agentActive: Boolean(prev?.agentActive),
      logs: Array.isArray(prev?.logs) ? prev.logs : [],
    };
  });

  const availableLabels = computeAvailableLabels(mergedIssues);
  return {
    ...existingState,
    issues: mergedIssues,
    availableLabels,
    selectedLabels: normalizeLabelList(existingState.selectedLabels).filter((label) => availableLabels.includes(label)),
    error: getRepoInfo().error,
  };
}

async function refreshIssuesSafe() {
  const state = currentState();
  if (state.repo === "unknown/unknown") {
    saveState(state);
    broadcast("state", state);
    return state;
  }

  try {
    const fetchedIssues = await fetchOpenIssues(state.repo);
    const merged = mergeFetchedIssues(state, fetchedIssues);
    saveState(merged);
    broadcast("state", merged);
    return merged;
  } catch (error) {
    console.error("[accessibility-kanban] Failed to refresh issues", error);
    const failed = {
      ...state,
      error: REFRESH_ISSUES_ERROR,
    };
    saveState(failed);
    broadcast("state", failed);
    return failed;
  }
}

// ─── SSE ───

const sseClients = new Set();

function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) res.write(msg);
}

// ─── HTTP helpers ───

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => resolve(body ? JSON.parse(body) : {}));
    req.on("error", reject);
  });
}

function json(res, code, data) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

// ─── HTTP server ───

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/events") {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    sseClients.add(res);
    req.on("close", () => sseClients.delete(res));
    res.write(`event: state\ndata: ${JSON.stringify(currentState())}\n\n`);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/state") {
    json(res, 200, await refreshIssuesSafe());
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/move") {
    const input = await readJson(req);
    const { issue, prevColumn } = moveIssue(input.issue_number, input.column);

    if (input.column === "plan" && prevColumn !== "plan") {
      const repo = currentState().repo;
      session.send({
        prompt: `The Repository Issues Kanban just moved issue #${issue.number} ("${issue.title}") in ${repo} into the Plan column. Start planning the implementation for this issue in a background agent. Read the GitHub issue details, analyze the repository, and produce a concrete implementation plan. Use the kanban_update_status tool to post progress and then move the issue to "ready" with kanban_move_issue when planning is complete.`,
      });
    }

    json(res, 200, { issue, state: currentState() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/update-status") {
    const input = await readJson(req);
    const issue = updateIssueStatus(input.issue_number, input.status, input.log);
    if (input.done) clearAgentStatus(input.issue_number);
    json(res, 200, { issue, state: currentState() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/filters") {
    const input = await readJson(req);
    const state = setSelectedLabels(input.labels);
    json(res, 200, state);
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/logs/")) {
    const num = parseInt(url.pathname.split("/").pop(), 10);
    const state = currentState();
    const issue = state.issues.find((i) => i.number === num);
    if (!issue) {
      json(res, 404, { error: "not found" });
      return;
    }
    json(res, 200, { issue_number: num, title: issue.title, logs: issue.logs || [] });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/reset") {
    resetBoard();
    json(res, 200, await refreshIssuesSafe());
    return;
  }

  if (url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(fs.readFileSync(path.join(__dirname, "public", "index.html"), "utf8"));
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
function getPort() {
  return server.address().port;
}

// ─── Canvas declaration ───

const canvas = createCanvas({
  id: "accessibility-kanban",
  displayName: "Repository Issues Kanban",
  description: "Kanban board for triaging open issues from the current repository into backlog, plan, ready, implement, and done lanes.",
  actions: [
    {
      name: "get_state",
      description: "Get the current board state including open repository issues and selected label filters.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      async handler(ctx) {
        captureCwd(ctx);
        return refreshIssuesSafe();
      },
    },
    {
      name: "move_issue",
      description: "Move an issue to a different column on the kanban board.",
      inputSchema: {
        type: "object",
        properties: {
          issue_number: { type: "number", description: "GitHub issue number" },
          column: { type: "string", enum: COLUMNS, description: "Target column" },
        },
        required: ["issue_number", "column"],
        additionalProperties: false,
      },
      handler(ctx) {
        captureCwd(ctx);
        const { issue } = moveIssue(ctx.input.issue_number, ctx.input.column);
        return { issue, state: currentState() };
      },
    },
    {
      name: "refresh_issues",
      description: "Replace the board with issue data supplied by the agent.",
      inputSchema: {
        type: "object",
        properties: {
          issues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                number: { type: "number" },
                title: { type: "string" },
                url: { type: "string" },
                labels: {
                  type: "array",
                  items: {
                    oneOf: [
                      { type: "string" },
                      { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
                    ],
                  },
                },
                column: { type: "string", enum: COLUMNS },
                priority: { type: "string" },
                order: { type: "number" },
              },
              required: ["number", "title"],
              additionalProperties: true,
            },
          },
        },
        required: ["issues"],
        additionalProperties: false,
      },
      handler(ctx) {
        captureCwd(ctx);
        return replaceIssues(ctx.input.issues);
      },
    },
    {
      name: "set_filters",
      description: "Set selected label filters (OR semantics).",
      inputSchema: {
        type: "object",
        properties: {
          labels: { type: "array", items: { type: "string" } },
        },
        required: ["labels"],
        additionalProperties: false,
      },
      handler(ctx) {
        captureCwd(ctx);
        return setSelectedLabels(ctx.input.labels);
      },
    },
    {
      name: "reset_state",
      description: "Reset all cards to backlog and clear label filters, then refresh from live repo issues.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      async handler(ctx) {
        captureCwd(ctx);
        resetBoard();
        return refreshIssuesSafe();
      },
    },
  ],
  async open(ctx) {
    captureCwd(ctx);
    const state = await refreshIssuesSafe();
    broadcast("state", state);
    return {
      url: `http://127.0.0.1:${getPort()}`,
      title: "Repository Issues Kanban",
      status: `${state.issues.length} open issues in ${state.repo}`,
    };
  },
});

// ─── Join session (tools + canvas) ───

const session = await joinSession({
  canvases: [canvas],
  tools: [
    {
      name: "kanban_move_issue",
      description: "Move an issue on the repository issues kanban board to a new column (backlog, plan, ready, implement, done).",
      parameters: {
        type: "object",
        properties: {
          issue_number: { type: "number", description: "GitHub issue number" },
          column: { type: "string", enum: COLUMNS, description: "Target column to move the issue to" },
        },
        required: ["issue_number", "column"],
      },
      handler: async (args) => {
        const { issue } = moveIssue(args.issue_number, args.column);
        return JSON.stringify({ moved: true, issue, state: currentState() });
      },
    },
    {
      name: "kanban_update_status",
      description: "Update the agent status line and log on a kanban card while planning or implementing an issue.",
      parameters: {
        type: "object",
        properties: {
          issue_number: { type: "number", description: "GitHub issue number" },
          status: { type: "string", description: "Short status text shown on the card." },
          log: { type: "string", description: "Detailed log entry appended to the issue's agent log." },
          done: { type: "boolean", description: "Set true to stop the active glow." },
        },
        required: ["issue_number", "status"],
      },
      handler: async (args) => {
        const issue = updateIssueStatus(args.issue_number, args.status, args.log);
        if (args.done) clearAgentStatus(args.issue_number);
        return JSON.stringify({ updated: true, issue });
      },
    },
  ],
});
