// Extension: where-was-i
// Interrupt Recovery canvas — helps developers resume mental context after interruption.

import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { joinSession, createCanvas } from "@github/copilot-sdk/extension";

const servers = new Map();
const sseClients = new Map(); // instanceId → Set<res>
const contextCache = new Map(); // instanceId → contextData

const isWindows = process.platform === "win32";

// Derive repo root from extension location (.github/extensions/where-was-i/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..", "..");

// --- Shell helpers ---

function run(cmd, cwd) {
    const shell = isWindows ? "powershell" : "bash";
    const args = isWindows
        ? ["-NoProfile", "-NoLogo", "-Command", cmd]
        : ["-c", cmd];
    return new Promise((resolve) => {
        execFile(shell, args, { cwd, timeout: 15000, maxBuffer: 1024 * 256 }, (err, stdout) => {
            resolve(err ? "" : (stdout || "").trim());
        });
    });
}

async function gatherContext(cwd) {
    cwd = cwd || REPO_ROOT;
    const authorCmd = isWindows
        ? 'git log --oneline -5 --format="%h %s" --author="$(git config user.name)"'
        : 'git log --oneline -5 --format="%h %s" --author="$(git config user.name)"';
    const suppressErr = isWindows ? "2>$null" : "2>/dev/null";

    const [branch, log, status, diff, prs, issues] = await Promise.all([
        run("git branch --show-current", cwd),
        run(authorCmd, cwd),
        run("git status --short", cwd),
        run("git diff --stat", cwd),
        run(`gh pr list --author=@me --state=open --limit=10 --json number,title,url,updatedAt,comments ${suppressErr}`, cwd),
        run(`gh issue list --assignee=@me --state=open --limit=10 --json number,title,url,updatedAt ${suppressErr}`, cwd),
    ]);

    let parsedPrs = [];
    let parsedIssues = [];
    try { parsedPrs = JSON.parse(prs || "[]"); } catch {}
    try { parsedIssues = JSON.parse(issues || "[]"); } catch {}

    return {
        branch,
        recentCommits: log.split("\n").filter(Boolean),
        uncommitted: status.split("\n").filter(Boolean),
        diffStat: diff,
        openPrs: parsedPrs,
        assignedIssues: parsedIssues,
        gatheredAt: new Date().toISOString(),
    };
}

// --- Persistence ---

async function saveContext(workspacePath, data) {
    if (!workspacePath) return;
    const dir = join(workspacePath, "files");
    try { await mkdir(dir, { recursive: true }); } catch {}
    await writeFile(join(dir, "where-was-i-context.json"), JSON.stringify(data, null, 2));
}

async function loadContext(workspacePath) {
    if (!workspacePath) return null;
    try {
        const raw = await readFile(join(workspacePath, "files", "where-was-i-context.json"), "utf-8");
        return JSON.parse(raw);
    } catch { return null; }
}

// --- SSE ---

function broadcast(instanceId, data) {
    const clients = sseClients.get(instanceId);
    if (!clients) return;
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const res of clients) {
        try { res.write(payload); } catch {}
    }
}

// --- HTML renderer ---

function renderHtml(instanceId) {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Where Was I?</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #f8fcff;
  --surface: #ffffff;
  --text: #111827;
  --muted: #6b7280;
  --meta: #94a3b8;
  --border: #e2e8f0;
  --coral: #ff7f50;
  --azure: #0ea5e9;
  --sage: #84cc16;
  --coral-tint: #fff0eb;
  --azure-tint: #e8f7fe;
  --sage-tint: #f2fde0;
  --sans: 'DM Sans', system-ui, sans-serif;
  --mono: 'IBM Plex Mono', 'SF Mono', monospace;
  --radius-soft: 16px;
  --radius-compact: 8px;
  --radius-pill: 9999px;
}

html, body {
  font-family: var(--sans);
  font-size: 15px;
  line-height: 1.7;
  color: var(--text);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
}

body { padding: 2rem 1.5rem 3rem; max-width: 880px; margin: 0 auto; }

.header {
  margin-bottom: 2.5rem;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.header h1 {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text);
}

.time-away {
  font-family: var(--mono);
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--muted);
  background: var(--azure-tint);
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  border: 1px solid rgba(14,165,233,0.12);
}

.branch-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 2rem;
  padding: 12px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-compact);
}

.branch-bar .icon { font-size: 1.1rem; }
.branch-bar .branch-name {
  font-family: var(--mono);
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--azure);
}
.branch-bar .label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  color: var(--meta);
}

.section { margin-bottom: 2rem; }
.section-title {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--meta);
  margin-bottom: 0.75rem;
  padding-left: 2px;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-soft);
  padding: 20px 24px;
  margin-bottom: 0.75rem;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
}

.card-clickable { cursor: pointer; }
.card-clickable:active { transform: translateY(0); }

.commit-list { list-style: none; }
.commit-list li {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  padding: 6px 0;
  border-bottom: 1px solid rgba(0,0,0,0.03);
}
.commit-list li:last-child { border-bottom: none; }
.commit-hash {
  font-family: var(--mono);
  font-size: 0.78rem;
  color: var(--azure);
  flex-shrink: 0;
}
.commit-msg {
  font-size: 0.88rem;
  color: var(--text);
}

.file-list { list-style: none; }
.file-list li {
  font-family: var(--mono);
  font-size: 0.8rem;
  padding: 4px 0;
  color: var(--muted);
}
.file-list .status-badge {
  display: inline-block;
  width: 18px;
  text-align: center;
  margin-right: 6px;
  font-weight: 600;
}
.file-list .status-badge.M { color: #d97706; }
.file-list .status-badge.A { color: var(--sage); }
.file-list .status-badge.D { color: #ef4444; }
.file-list .status-badge.U { color: var(--coral); }

.thread-cards { display: grid; grid-template-columns: 1fr; gap: 0.6rem; }
.thread-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 14px 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-compact);
  cursor: pointer;
  transition: all 0.15s ease;
}
.thread-card:hover {
  border-color: var(--azure);
  background: color-mix(in srgb, var(--azure) 4%, var(--surface));
}
.thread-card .number {
  font-family: var(--mono);
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--azure);
  flex-shrink: 0;
}
.thread-card .title {
  font-size: 0.88rem;
  color: var(--text);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.thread-card .badge {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 3px 8px;
  border-radius: var(--radius-pill);
  flex-shrink: 0;
}
.badge-pr { background: var(--azure-tint); color: var(--azure); }
.badge-issue { background: var(--sage-tint); color: #4d7c0f; }

.resume-section {
  margin-top: 2.5rem;
  text-align: center;
}

.resume-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 36px;
  font-family: var(--sans);
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  background: var(--coral);
  border: none;
  border-radius: var(--radius-pill);
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(255,127,80,0.3);
  transition: all 0.2s ease;
}
.resume-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255,127,80,0.4);
}
.resume-btn:active { transform: translateY(0); }

.resume-hint {
  margin-top: 0.75rem;
  font-size: 0.78rem;
  color: var(--meta);
}

.empty-state {
  color: var(--muted);
  font-size: 0.88rem;
  font-style: italic;
  padding: 8px 0;
}

.refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  font-family: var(--sans);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted);
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: all 0.15s ease;
}
.refresh-btn:hover { border-color: var(--azure); color: var(--azure); }
.refresh-btn.spinning .icon { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.diff-stat {
  font-family: var(--mono);
  font-size: 0.78rem;
  color: var(--muted);
  white-space: pre-wrap;
  padding: 12px 16px;
  background: #f1f5f9;
  border-radius: var(--radius-compact);
  margin-top: 8px;
  line-height: 1.5;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rem 0;
  color: var(--meta);
  font-size: 0.9rem;
  gap: 0.5rem;
}
.loading .dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--azure);
  animation: pulse 1.2s ease-in-out infinite;
}
.loading .dot:nth-child(2) { animation-delay: 0.2s; }
.loading .dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes pulse { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
</style>
</head>
<body>
<div id="app">
  <div class="loading">
    <span class="dot"></span><span class="dot"></span><span class="dot"></span>
    <span style="margin-left: 8px;">Reconstructing your context…</span>
  </div>
</div>

<script>
const instanceId = "${instanceId}";
let contextData = null;

function timeAgo(isoString) {
  if (!isoString) return "";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  if (hrs < 24) return hrs + "h " + remainMins + "m ago";
  const days = Math.floor(hrs / 24);
  return days + "d " + (hrs % 24) + "h ago";
}

function timeAwayLabel(isoString) {
  if (!isoString) return "";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "You\\'re still in the zone";
  if (mins < 60) return "Away for " + mins + " minutes";
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  if (hrs < 24) return "Away for " + hrs + "h " + remainMins + "m";
  const days = Math.floor(hrs / 24);
  return "Away for " + days + " day" + (days > 1 ? "s" : "") + " " + (hrs % 24) + "h";
}

function escapeHtml(s) {
  return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function render(data) {
  contextData = data;
  const app = document.getElementById("app");

  const commits = (data.recentCommits || []).map(c => {
    const parts = c.split(" ");
    const hash = parts[0] || "";
    const msg = parts.slice(1).join(" ");
    return { hash, msg };
  });

  const files = (data.uncommitted || []).map(f => {
    const status = f.substring(0, 2).trim();
    const path = f.substring(3);
    return { status, path };
  });

  const prs = data.openPrs || [];
  const issues = data.assignedIssues || [];
  const hasThreads = prs.length > 0 || issues.length > 0;

  app.innerHTML = \`
    <div class="header">
      <h1>Where was I?</h1>
      <div style="display:flex;align-items:center;gap:0.75rem;">
        \${data.gatheredAt ? \`<span class="time-away">\${timeAwayLabel(data.gatheredAt)}</span>\` : ""}
        <button class="refresh-btn" onclick="doRefresh(this)">
          <span class="icon">↻</span> Refresh
        </button>
      </div>
    </div>

    <div class="branch-bar">
      <span class="icon">⎇</span>
      <span class="label">Branch</span>
      <span class="branch-name">\${escapeHtml(data.branch) || "detached HEAD"}</span>
    </div>

    \${commits.length ? \`
    <div class="section">
      <div class="section-title">Recent Commits</div>
      <div class="card">
        <ul class="commit-list">
          \${commits.map(c => \`
            <li>
              <span class="commit-hash">\${escapeHtml(c.hash)}</span>
              <span class="commit-msg">\${escapeHtml(c.msg)}</span>
            </li>
          \`).join("")}
        </ul>
      </div>
    </div>
    \` : ""}

    \${files.length ? \`
    <div class="section">
      <div class="section-title">Uncommitted Changes</div>
      <div class="card">
        <ul class="file-list">
          \${files.map(f => \`
            <li>
              <span class="status-badge \${escapeHtml(f.status)}">\${escapeHtml(f.status)}</span>
              \${escapeHtml(f.path)}
            </li>
          \`).join("")}
        </ul>
        \${data.diffStat ? \`<div class="diff-stat">\${escapeHtml(data.diffStat)}</div>\` : ""}
      </div>
    </div>
    \` : ""}

    \${hasThreads ? \`
    <div class="section">
      <div class="section-title">Open Threads</div>
      <div class="thread-cards">
        \${prs.map(pr => \`
          <div class="thread-card card-clickable" onclick="resumeThread('PR #\${pr.number}: \${escapeHtml(pr.title)}')">
            <span class="number">#\${pr.number}</span>
            <span class="title">\${escapeHtml(pr.title)}</span>
            <span class="badge badge-pr">PR</span>
          </div>
        \`).join("")}
        \${issues.map(iss => \`
          <div class="thread-card card-clickable" onclick="resumeThread('Issue #\${iss.number}: \${escapeHtml(iss.title)}')">
            <span class="number">#\${iss.number}</span>
            <span class="title">\${escapeHtml(iss.title)}</span>
            <span class="badge badge-issue">Issue</span>
          </div>
        \`).join("")}
      </div>
    </div>
    \` : ""}

    <div class="resume-section">
      <button class="resume-btn" onclick="doResume()">
        ↩ Resume where I left off
      </button>
      <p class="resume-hint">Sends your full context to the agent so it can help you pick up</p>
    </div>
  \`;
}

async function doRefresh(btn) {
  if (btn) btn.classList.add("spinning");
  try {
    const res = await fetch("/refresh", { method: "POST" });
    const data = await res.json();
    render(data);
  } catch (e) {}
  if (btn) setTimeout(() => btn.classList.remove("spinning"), 300);
}

async function doResume() {
  await fetch("/resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ thread: null })
  });
}

async function resumeThread(thread) {
  await fetch("/resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ thread })
  });
}

// SSE for live updates
const evtSource = new EventSource("/events");
evtSource.onmessage = (e) => {
  try {
    const data = JSON.parse(e.data);
    render(data);
  } catch {}
};

// Initial load
fetch("/context").then(r => r.json()).then(render).catch(() => {});
</script>
</body>
</html>`;
}

// --- Server ---

async function startServer(instanceId, sessionRef, cwd, workspacePath) {
    const server = createServer(async (req, res) => {
        const url = new URL(req.url, "http://localhost");

        if (url.pathname === "/events") {
            res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            });
            res.write(":\n\n");
            let clients = sseClients.get(instanceId);
            if (!clients) { clients = new Set(); sseClients.set(instanceId, clients); }
            clients.add(res);
            req.on("close", () => { clients.delete(res); });
            return;
        }

        if (url.pathname === "/context" && req.method === "GET") {
            const data = contextCache.get(instanceId) || {};
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(data));
            return;
        }

        if (url.pathname === "/refresh" && req.method === "POST") {
            const data = await gatherContext(cwd);
            contextCache.set(instanceId, data);
            await saveContext(workspacePath, data);
            broadcast(instanceId, data);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(data));
            return;
        }

        if (url.pathname === "/resume" && req.method === "POST") {
            let body = "";
            for await (const chunk of req) body += chunk;
            let thread = null;
            try { thread = JSON.parse(body).thread; } catch {}

            const ctx = contextCache.get(instanceId) || {};
            let prompt;
            if (thread) {
                prompt = `I was working on ${thread} and got interrupted. Here's my current context:\n\n` +
                    `**Branch:** ${ctx.branch || "unknown"}\n` +
                    `**Recent commits:** ${(ctx.recentCommits || []).join(", ")}\n` +
                    `**Uncommitted changes:** ${(ctx.uncommitted || []).join(", ")}\n` +
                    `**Open PRs:** ${(ctx.openPrs || []).map(p => "#" + p.number + " " + p.title).join(", ")}\n\n` +
                    `Help me pick up where I left off on this specific thread.`;
            } else {
                prompt = `I got interrupted and need to resume my work. Here's my full context:\n\n` +
                    `**Branch:** ${ctx.branch || "unknown"}\n` +
                    `**Recent commits:**\n${(ctx.recentCommits || []).map(c => "- " + c).join("\n")}\n\n` +
                    `**Uncommitted changes:**\n${(ctx.uncommitted || []).map(f => "- " + f).join("\n")}\n\n` +
                    `**Diff stat:**\n${ctx.diffStat || "none"}\n\n` +
                    `**Open PRs:** ${(ctx.openPrs || []).map(p => "#" + p.number + " " + p.title).join(", ") || "none"}\n` +
                    `**Assigned issues:** ${(ctx.assignedIssues || []).map(i => "#" + i.number + " " + i.title).join(", ") || "none"}\n\n` +
                    `Help me pick up where I left off. What should I focus on first?`;
            }

            try { await sessionRef.send(prompt); } catch {}
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true }));
            return;
        }

        // Default: serve HTML
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(renderHtml(instanceId));
    });

    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    return { server, url: `http://127.0.0.1:${port}/` };
}

// --- Extension ---

let sessionRef = null;

const session = await joinSession({
    canvases: [
        createCanvas({
            id: "where-was-i",
            displayName: "Where Was I?",
            description: "Interrupt Recovery — reconstructs your working context (branch, commits, changes, PRs) so you can resume after being pulled away.",
            actions: [
                {
                    name: "refresh",
                    description: "Re-gather all git/project context and push updates to the canvas",
                    handler: async (ctx) => {
                        const data = await gatherContext(REPO_ROOT);
                        contextCache.set(ctx.instanceId, data);
                        if (sessionRef) await saveContext(sessionRef.workspacePath, data);
                        broadcast(ctx.instanceId, data);
                        return data;
                    },
                },
                {
                    name: "get_context",
                    description: "Return the currently assembled developer context as JSON",
                    handler: async (ctx) => {
                        return contextCache.get(ctx.instanceId) || {};
                    },
                },
                {
                    name: "resume",
                    description: "Send a contextual 'resume' message to the agent with the developer's assembled state",
                    inputSchema: {
                        type: "object",
                        properties: {
                            thread: {
                                type: "string",
                                description: "Optional specific thread/topic to focus on when resuming",
                            },
                        },
                    },
                    handler: async (ctx) => {
                        const thread = ctx.input?.thread || null;
                        const data = contextCache.get(ctx.instanceId) || {};
                        let prompt;
                        if (thread) {
                            prompt = `I was working on ${thread} and got interrupted. Context: branch=${data.branch}, recent commits: ${(data.recentCommits || []).join("; ")}. Help me resume.`;
                        } else {
                            prompt = `Help me resume. Branch: ${data.branch}. Commits: ${(data.recentCommits || []).join("; ")}. Uncommitted: ${(data.uncommitted || []).join("; ")}.`;
                        }
                        if (sessionRef) await sessionRef.send(prompt);
                        return { sent: true };
                    },
                },
            ],
            open: async (ctx) => {
                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    entry = await startServer(ctx.instanceId, sessionRef, REPO_ROOT, sessionRef?.workspacePath);
                    servers.set(ctx.instanceId, entry);
                }

                // Load persisted context or gather fresh
                let data = await loadContext(sessionRef?.workspacePath);
                if (!data) {
                    data = await gatherContext(REPO_ROOT);
                    await saveContext(sessionRef?.workspacePath, data);
                }
                contextCache.set(ctx.instanceId, data);
                // Push to any waiting SSE clients
                setTimeout(() => broadcast(ctx.instanceId, data), 100);

                return { title: "Where Was I?", url: entry.url };
            },
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (entry) {
                    servers.delete(ctx.instanceId);
                    await new Promise((r) => entry.server.close(() => r()));
                }
                sseClients.delete(ctx.instanceId);
                contextCache.delete(ctx.instanceId);
            },
        }),
    ],
});

sessionRef = session;
