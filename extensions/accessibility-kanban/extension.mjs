import { CanvasError, createCanvas, joinSession } from "@github/copilot-sdk/extension";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_NAME = "accessibility-kanban";
const STATE_FILE = "signalbox-accessibility-kanban-state.json";
const COLUMNS = ["backlog", "plan", "ready", "implement", "done"];
const VALID_COLUMNS = new Set(COLUMNS);

const defaultIssues = [
  {
    number: 39,
    title: "Add keyboard trap prevention for modal-like interactions",
    url: "https://github.com/sethjuarez/SignalBox/issues/39",
    labels: ["signalbox-mvp", "frontend", "accessibility"],
    column: "backlog",
    priority: "high",
  },
  {
    number: 38,
    title: "Ensure color contrast meets WCAG AA for all text",
    url: "https://github.com/sethjuarez/SignalBox/issues/38",
    labels: ["signalbox-mvp", "product-polish", "accessibility"],
    column: "backlog",
    priority: "high",
  },
  {
    number: 37,
    title: "Add aria-live region for form submission feedback",
    url: "https://github.com/sethjuarez/SignalBox/issues/37",
    labels: ["signalbox-mvp", "frontend", "accessibility"],
    column: "backlog",
    priority: "high",
  },
  {
    number: 36,
    title: "Add focus-visible outline to all interactive elements",
    url: "https://github.com/sethjuarez/SignalBox/issues/36",
    labels: ["signalbox-mvp", "frontend", "accessibility"],
    column: "backlog",
    priority: "high",
  },
  {
    number: 35,
    title: "Add aria-hidden to decorative SVG icons in AuthPage",
    url: "https://github.com/sethjuarez/SignalBox/issues/35",
    labels: ["signalbox-mvp", "frontend", "accessibility"],
    column: "backlog",
    priority: "medium",
  },
  {
    number: 20,
    title: "Audit and fix form field label association and aria-describedby",
    url: "https://github.com/sethjuarez/SignalBox/issues/20",
    labels: ["signalbox-mvp", "frontend", "product-polish", "accessibility"],
    column: "backlog",
    priority: "medium",
  },
  {
    number: 19,
    title: "Ensure consistent keyboard focus styles across the intake form",
    url: "https://github.com/sethjuarez/SignalBox/issues/19",
    labels: ["enhancement", "good first issue", "ready-for-implementation", "frontend", "accessibility"],
    column: "backlog",
    priority: "medium",
  },
  {
    number: 17,
    title: "Add accessible client-side validation errors to the intake form",
    url: "https://github.com/sethjuarez/SignalBox/issues/17",
    labels: ["enhancement", "good first issue", "ready-for-implementation", "frontend", "accessibility"],
    column: "backlog",
    priority: "medium",
  },
  {
    number: 16,
    title: "Improve page landmark and heading structure for screen reader navigation",
    url: "https://github.com/sethjuarez/SignalBox/issues/16",
    labels: ["good first issue", "signalbox-mvp", "frontend", "product-polish", "accessibility"],
    column: "backlog",
    priority: "medium",
  },
];

// ─── State persistence ───

function copilotHome() {
  return process.env.COPILOT_HOME || path.join(os.homedir(), ".copilot");
}

function getStatePath() {
  return path.join(copilotHome(), "extensions", EXTENSION_NAME, "artifacts", STATE_FILE);
}

function defaultState() {
  return {
    repo: "sethjuarez/SignalBox",
    updatedAt: new Date().toISOString(),
    generation: Date.now(),
    columns: COLUMNS,
    issues: defaultIssues.map((issue, index) => ({ ...issue, order: index })),
  };
}

function ensureStateDirectory() {
  fs.mkdirSync(path.dirname(getStatePath()), { recursive: true });
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(getStatePath(), "utf8"));
  } catch {
    return null;
  }
}

function saveState(state) {
  ensureStateDirectory();
  fs.writeFileSync(getStatePath(), JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2));
}

function currentState() {
  const state = loadState();
  if (state) return state;
  const initial = defaultState();
  saveState(initial);
  return initial;
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
  // Clear agent status when moved to done or backlog
  if (column === "done" || column === "backlog") {
    issue.agentActive = false;
    issue.agentStatus = column === "done" ? "Complete" : "";
  }
  saveState(state);
  broadcast("state", currentState());
  return { issue, prevColumn };
}

function updateIssueStatus(issueNumber, status, logEntry) {
  const state = currentState();
  const issue = state.issues.find((i) => i.number === issueNumber);
  if (!issue) {
    throw new CanvasError("not_found", `Issue #${issueNumber} not found on the board`);
  }
  // Don't update agent status on issues that have been reset to backlog
  if (issue.column === "backlog") {
    return issue;
  }
  if (status !== undefined) issue.agentStatus = status;
  if (logEntry) {
    if (!issue.logs) issue.logs = [];
    issue.logs.push({ timestamp: new Date().toISOString(), message: logEntry });
  }
  issue.agentActive = true;
  saveState(state);
  broadcast("state", currentState());
  return issue;
}

function clearAgentStatus(issueNumber) {
  const state = currentState();
  const issue = state.issues.find((i) => i.number === issueNumber);
  if (!issue) return;
  issue.agentActive = false;
  saveState(state);
  broadcast("state", currentState());
}

function replaceIssues(issues) {
  const existing = currentState();
  const existingByNumber = new Map(existing.issues.map((i) => [i.number, i]));
  const next = {
    ...existing,
    issues: issues
      .filter((i) => i && Number.isInteger(i.number) && i.title)
      .map((issue, idx) => {
        const prev = existingByNumber.get(issue.number);
        const labels = Array.isArray(issue.labels)
          ? issue.labels.map((l) => (typeof l === "string" ? l : l.name)).filter(Boolean)
          : [];
        return {
          number: issue.number,
          title: issue.title,
          url: issue.url || `https://github.com/sethjuarez/SignalBox/issues/${issue.number}`,
          labels,
          column: VALID_COLUMNS.has(issue.column) ? issue.column : prev?.column || "backlog",
          priority: issue.priority || prev?.priority || "medium",
          order: Number.isInteger(issue.order) ? issue.order : prev?.order ?? idx,
        };
      }),
  };
  saveState(next);
  broadcast("state", currentState());
  return currentState();
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
    json(res, 200, currentState());
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/move") {
    const input = await readJson(req);
    const { issue, prevColumn } = moveIssue(input.issue_number, input.column);

    // When an issue moves INTO "plan", send a prompt to the agent
    if (input.column === "plan" && prevColumn !== "plan") {
      if (issue.number === 35) {
        // Fast path for demo — issue 35 is trivial, skip full analysis
        session.send({
          prompt: `The accessibility kanban board just moved issue #35 ("Add aria-hidden to decorative SVG icons in AuthPage") into the Plan column. This is a simple fix — just add aria-hidden="true" to the two decorative blur divs and the Microsoft logo SVG in src/components/AuthPage.tsx. Use the kanban_update_status tool to post a brief status update ("Analyzing..."), then after a moment post the plan summary, then move the issue to "ready" using kanban_move_issue. Keep it quick — no need to read the GitHub issue or deeply analyze the codebase. The plan is: add aria-hidden="true" to lines ~47-48 (decorative background circles) and the SVG element at lines ~6-17.`,
        });
      } else {
        session.send({
          prompt: `The accessibility kanban board just moved issue #${issue.number} ("${issue.title}") into the Plan column. Please start planning the implementation for this issue in a background agent. Read the issue details from GitHub, analyze the codebase to understand what needs to change, and produce a concrete implementation plan. When planning is complete, move the issue to "ready" on the canvas using the move_issue canvas action.`,
        });
      }
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

  if (req.method === "GET" && url.pathname.startsWith("/api/logs/")) {
    const num = parseInt(url.pathname.split("/").pop(), 10);
    const state = currentState();
    const issue = state.issues.find((i) => i.number === num);
    if (!issue) { json(res, 404, { error: "not found" }); return; }
    json(res, 200, { issue_number: num, title: issue.title, logs: issue.logs || [] });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/reset") {
    const s = defaultState();
    saveState(s);
    broadcast("state", currentState());
    json(res, 200, currentState());
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
function getPort() { return server.address().port; }

// ─── Canvas declaration ───

const canvas = createCanvas({
  id: "accessibility-kanban",
  displayName: "Accessibility Kanban",
  description: "Kanban board for triaging open SignalBox accessibility issues into backlog, plan, ready, implement, and done lanes. Moving an issue to plan triggers a background planning agent.",
  actions: [
    {
      name: "get_state",
      description: "Get the current Kanban board state including all issues and their columns.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      handler() {
        return currentState();
      },
    },
    {
      name: "move_issue",
      description: "Move an issue to a different column on the Kanban board.",
      inputSchema: {
        type: "object",
        properties: {
          issue_number: { type: "number", description: "GitHub issue number" },
          column: { type: "string", enum: COLUMNS, description: "Target column" },
        },
        required: ["issue_number", "column"],
        additionalProperties: false,
      },
      handler({ input }) {
        const { issue } = moveIssue(input.issue_number, input.column);
        return { issue, state: currentState() };
      },
    },
    {
      name: "refresh_issues",
      description: "Replace the board with fresh issue data supplied by the agent.",
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
                labels: { type: "array", items: { oneOf: [{ type: "string" }, { type: "object", properties: { name: { type: "string" } }, required: ["name"] }] } },
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
      handler({ input }) {
        return replaceIssues(input.issues);
      },
    },
    {
      name: "reset_state",
      description: "Reset the board to the default issue list with everything in backlog.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      handler() {
        const s = defaultState();
        saveState(s);
        broadcast("state", currentState());
        return currentState();
      },
    },
  ],
  open() {
    const state = currentState();
    broadcast("state", state);
    return {
      url: `http://127.0.0.1:${getPort()}`,
      title: "Accessibility Kanban",
      status: `${state.issues.length} issues across ${COLUMNS.length} columns`,
    };
  },
});

// ─── Join session (tools + canvas) ───

const session = await joinSession({
  canvases: [canvas],
  tools: [
    {
      name: "kanban_move_issue",
      description: "Move an issue on the accessibility Kanban board to a new column (backlog, plan, ready, implement, done). Use after completing a planning or implementation step to advance the issue.",
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
      description: "Update the agent status line and log on a Kanban card. Use this to report progress while planning or implementing an issue. The status appears under the card title and a glow indicates active work.",
      parameters: {
        type: "object",
        properties: {
          issue_number: { type: "number", description: "GitHub issue number" },
          status: { type: "string", description: "Short status text shown on the card (e.g. 'Reading issue...', 'Analyzing codebase...', 'Plan complete')" },
          log: { type: "string", description: "Detailed log entry appended to the issue's agent log (viewable in modal)" },
          done: { type: "boolean", description: "Set true to stop the active glow (agent finished working)" },
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
