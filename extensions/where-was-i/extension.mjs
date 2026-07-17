// Extension: where-was-i
// Interrupt Recovery canvas — helps developers resume mental context after interruption.

import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { joinSession, createCanvas, CanvasError } from "@github/copilot-sdk/extension";
import { gatherGitContext } from "./git-context.mjs";

const servers = new Map();
const sseClients = new Map(); // instanceId → Set<res>
const contextCache = new Map(); // instanceId → contextData

let workspaceCwd = null;

function captureCwd(ctx) {
    const dir = ctx?.session?.workingDirectory;
    if (typeof dir === "string" && dir.trim()) workspaceCwd = dir;
}

async function activeCwd(ctx) {
    captureCwd(ctx);
    if (!workspaceCwd && sessionRef) {
        const snapshot = await sessionRef.rpc.metadata.snapshot();
        const dir = snapshot?.workingDirectory;
        if (typeof dir === "string" && dir.trim()) workspaceCwd = dir;
    }
    if (!workspaceCwd) {
        throw new CanvasError(
            "workspace_unavailable",
            "No repository working directory is attached to this session.",
        );
    }
    return workspaceCwd;
}

function runGhJson(cwd, args) {
    return new Promise((resolve, reject) => {
        execFile("gh", args, { cwd, timeout: 15000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error((stderr || error.message || "GitHub CLI command failed").trim()));
                return;
            }
            try {
                resolve({
                    data: JSON.parse(stdout || "[]"),
                    warning: (stderr || "").trim(),
                });
            } catch (parseError) {
                reject(new Error(`GitHub CLI returned invalid JSON: ${parseError.message}`));
            }
        });
    });
}

async function gatherContext(cwd) {
    const gitContext = await gatherGitContext(cwd);
    const [prs, issues] = await Promise.allSettled([
        runGhJson(cwd, [
            "pr", "list", "--author=@me", "--state=open", "--limit=10",
            "--json", "number,title,url,updatedAt,comments",
        ]),
        runGhJson(cwd, [
            "issue", "list", "--assignee=@me", "--state=open", "--limit=10",
            "--json", "number,title,url,updatedAt",
        ]),
    ]);

    return {
        ...gitContext,
        openPrs: prs.status === "fulfilled" ? prs.value.data : [],
        assignedIssues: issues.status === "fulfilled" ? issues.value.data : [],
        warnings: [prs, issues]
            .map((result) => result.status === "fulfilled" ? result.value.warning : result.reason.message)
            .filter(Boolean),
        gatheredAt: new Date().toISOString(),
    };
}

// --- Persistence ---

async function saveContext(workspacePath, data) {
    if (!workspacePath) return;
    const dir = join(workspacePath, "files");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "where-was-i-context.json"), JSON.stringify(data, null, 2));
}

// --- SSE ---

function broadcast(instanceId, data) {
    const clients = sseClients.get(instanceId);
    if (!clients) return;
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const res of clients) {
        try {
            res.write(payload);
        } catch {
            clients.delete(res);
        }
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
.branch-bar .worktree-name {
  font-family: var(--mono);
  font-size: 0.8rem;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.branch-bar .divider {
  width: 1px;
  height: 20px;
  background: var(--border);
}
.branch-bar .divergence {
  margin-left: auto;
  font-family: var(--mono);
  font-size: 0.75rem;
  color: var(--muted);
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

.git-graph {
  overflow-x: auto;
}
.graph-row {
  display: grid;
  grid-template-columns: 72px 72px minmax(220px, 1fr) auto;
  align-items: center;
  min-height: 34px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 65%, transparent);
}
.graph-row:last-child { border-bottom: none; }
.graph-row.worktree-commit {
  background: color-mix(in srgb, var(--azure) 5%, transparent);
}
.graph-lines {
  color: var(--azure);
  font-family: var(--mono);
  font-size: 0.9rem;
  font-weight: 600;
  white-space: pre;
}
.graph-hash {
  color: var(--meta);
  font-family: var(--mono);
  font-size: 0.72rem;
}
.graph-subject {
  color: var(--text);
  font-size: 0.84rem;
  overflow: hidden;
  padding-right: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.graph-refs {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
  white-space: nowrap;
}
.graph-ref {
  background: var(--azure-tint);
  border: 1px solid color-mix(in srgb, var(--azure) 20%, transparent);
  border-radius: var(--radius-pill);
  color: var(--azure);
  font-family: var(--mono);
  font-size: 0.65rem;
  padding: 2px 7px;
}

.file-list { list-style: none; }
.file-list li {
  align-items: center;
  border-radius: 6px;
  display: flex;
  gap: 8px;
  font-family: var(--mono);
  font-size: 0.8rem;
  padding: 7px 8px;
  color: var(--muted);
}
.file-list .status-badge {
  display: inline-block;
  border-radius: var(--radius-pill);
  font-weight: 600;
  min-width: 76px;
  padding: 2px 8px;
  text-align: center;
}
.file-list .status-badge.modified { background: #fff7ed; color: #b45309; }
.file-list .status-badge.added { background: var(--sage-tint); color: #4d7c0f; }
.file-list .status-badge.deleted { background: #fef2f2; color: #dc2626; }
.file-list .status-badge.untracked { background: var(--coral-tint); color: #c2410c; }
.file-list .status-badge.renamed { background: var(--azure-tint); color: var(--azure); }
.file-list .file-path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

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

.warnings {
  color: #b45309;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: var(--radius-compact);
  padding: 10px 14px;
  font-size: 0.78rem;
  margin-bottom: 1.5rem;
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

function describeStatus(code) {
  if (code === "??") return { label: "Untracked", kind: "untracked" };
  const index = code[0];
  const worktree = code[1];
  if (index === "R") return { label: worktree === " " ? "Renamed" : "Renamed + edited", kind: "renamed" };
  if (index === "A") return { label: worktree === " " ? "Staged add" : "Added + edited", kind: "added" };
  if (index === "D" || worktree === "D") return { label: index !== " " && worktree !== " " ? "Staged + deleted" : "Deleted", kind: "deleted" };
  if (index !== " " && worktree !== " ") return { label: "Staged + edited", kind: "modified" };
  if (index !== " ") return { label: "Staged", kind: "modified" };
  return { label: "Modified", kind: "modified" };
}

function render(data) {
  contextData = data;
  const app = document.getElementById("app");

  const worktreeCommits = data.branchCommits || [];
  const commitSource = worktreeCommits.length ? worktreeCommits : (data.recentCommits || []);
  const commits = commitSource.map(c => {
    const parts = c.split(" ");
    const hash = parts[0] || "";
    const msg = parts.slice(1).join(" ");
    return { hash, msg };
  });

  const files = data.changes || (data.uncommitted || []).map(f => ({
    code: f.substring(0, 2),
    path: f.substring(3)
  }));
  const branchHashes = new Set(worktreeCommits.map(commit => commit.split(" ")[0]));
  const graph = data.commitGraph || [];

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
      <span class="label">Worktree</span>
      <span class="worktree-name" title="\${escapeHtml(data.worktreeRoot)}">\${escapeHtml(data.worktreeName || data.worktreeRoot) || "unknown"}</span>
      <span class="divider"></span>
      <span class="label">Branch</span>
      <span class="branch-name">\${escapeHtml(data.branch) || "detached HEAD"}</span>
      \${data.baseRef ? \`<span class="divergence">\${data.ahead || 0} ahead · \${data.behind || 0} behind \${escapeHtml(data.baseRef)}</span>\` : ""}
    </div>

    \${(data.warnings || []).length ? \`
      <div class="warnings">\${data.warnings.map(escapeHtml).join("<br>")}</div>
    \` : ""}

    \${graph.length ? \`
    <div class="section">
      <div class="section-title">Git graph</div>
      <div class="card git-graph">
        \${graph.map(row => row.hash ? \`
          <div class="graph-row \${branchHashes.has(row.hash) ? "worktree-commit" : ""}">
            <span class="graph-lines">\${escapeHtml(row.graph || "* ")}</span>
            <span class="graph-hash">\${escapeHtml(row.hash)}</span>
            <span class="graph-subject" title="\${escapeHtml(row.subject)}">\${escapeHtml(row.subject)}</span>
            <span class="graph-refs">
              \${(row.refs || "").split(",").map(ref => ref.trim()).filter(Boolean).map(ref => \`<span class="graph-ref">\${escapeHtml(ref)}</span>\`).join("")}
            </span>
          </div>
        \` : \`
          <div class="graph-row">
            <span class="graph-lines">\${escapeHtml(row.graph)}</span>
          </div>
        \`).join("")}
      </div>
    </div>
    \` : commits.length ? \`
      <div class="section">
        <div class="section-title">Recent commits</div>
        <div class="card"><ul class="commit-list">
          \${commits.map(c => \`<li><span class="commit-hash">\${escapeHtml(c.hash)}</span><span class="commit-msg">\${escapeHtml(c.msg)}</span></li>\`).join("")}
        </ul></div>
      </div>
    \` : ""}

    \${files.length ? \`
    <div class="section">
      <div class="section-title">Uncommitted Changes</div>
      <div class="card">
        <ul class="file-list">
          \${files.map(f => {
            const status = describeStatus(f.code);
            return \`
            <li>
              <span class="status-badge \${status.kind}">\${status.label}</span>
              <span class="file-path">\${escapeHtml(f.path)}</span>
            </li>
          \`;
          }).join("")}
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
    if (!res.ok) throw new Error(data.error || "Unable to refresh context.");
    render(data);
  } catch (error) {
    const app = document.getElementById("app");
    app.insertAdjacentHTML("afterbegin", \`<div class="warnings">\${escapeHtml(error.message)}</div>\`);
  }
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
fetch("/context")
  .then(r => r.json())
  .then(render)
  .catch((error) => {
    document.getElementById("app").innerHTML = \`<div class="warnings">\${escapeHtml(error.message)}</div>\`;
  });
</script>
</body>
</html>`;
}

// --- Server ---

async function startServer(instanceId, cwd, workspacePath) {
    const entry = { server: null, url: "", cwd };
    entry.server = createServer(async (req, res) => {
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
            try {
                const data = await gatherContext(entry.cwd);
                contextCache.set(instanceId, data);
                await saveContext(workspacePath, data);
                broadcast(instanceId, data);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(data));
            } catch (error) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: error.message || "Unable to refresh context." }));
            }
            return;
        }

        if (url.pathname === "/resume" && req.method === "POST") {
            let body = "";
            for await (const chunk of req) body += chunk;
            let thread = null;
            try {
                thread = JSON.parse(body).thread;
            } catch {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "The resume request body must be valid JSON." }));
                return;
            }

            const ctx = contextCache.get(instanceId) || {};
            const commits = ctx.branchCommits?.length ? ctx.branchCommits : (ctx.recentCommits || []);
            let prompt;
            if (thread) {
                prompt = `I was working on ${thread} and got interrupted. Here's my current context:\n\n` +
                    `**Worktree:** ${ctx.worktreeRoot || "unknown"}\n` +
                    `**Branch:** ${ctx.branch || "unknown"}\n` +
                    `**Worktree commits:** ${commits.join(", ")}\n` +
                    `**Uncommitted changes:** ${(ctx.uncommitted || []).join(", ")}\n` +
                    `**Open PRs:** ${(ctx.openPrs || []).map(p => "#" + p.number + " " + p.title).join(", ")}\n\n` +
                    `Help me pick up where I left off on this specific thread.`;
            } else {
                prompt = `I got interrupted and need to resume my work. Here's my full context:\n\n` +
                    `**Worktree:** ${ctx.worktreeRoot || "unknown"}\n` +
                    `**Branch:** ${ctx.branch || "unknown"}\n` +
                    `**Worktree commits:**\n${commits.map(c => "- " + c).join("\n")}\n\n` +
                    `**Uncommitted changes:**\n${(ctx.uncommitted || []).map(f => "- " + f).join("\n")}\n\n` +
                    `**Diff stat:**\n${ctx.diffStat || "none"}\n\n` +
                    `**Open PRs:** ${(ctx.openPrs || []).map(p => "#" + p.number + " " + p.title).join(", ") || "none"}\n` +
                    `**Assigned issues:** ${(ctx.assignedIssues || []).map(i => "#" + i.number + " " + i.title).join(", ") || "none"}\n\n` +
                    `Help me pick up where I left off. What should I focus on first?`;
            }

            try {
                if (!sessionRef) throw new Error("The Copilot session is unavailable.");
                await sessionRef.send(prompt);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ ok: true }));
            } catch (error) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: error.message || "Unable to send the resume prompt." }));
            }
            return;
        }

        // Default: serve HTML
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(renderHtml(instanceId));
    });

    await new Promise((resolve) => entry.server.listen(0, "127.0.0.1", resolve));
    const address = entry.server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    entry.url = `http://127.0.0.1:${port}/`;
    return entry;
}

// --- Extension ---

let sessionRef = null;

const session = await joinSession({
    canvases: [
        createCanvas({
            id: "where-was-i",
            displayName: "Where Was I?",
            description: "Reconstruct your dev context (branch, commits, uncommitted work, PR clues) and trigger a resume prompt to continue quickly.",
            actions: [
                {
                    name: "refresh",
                    description: "Re-gather all git/project context and push updates to the canvas",
                    handler: async (ctx) => {
                        const cwd = await activeCwd(ctx);
                        const entry = servers.get(ctx.instanceId);
                        if (entry) entry.cwd = cwd;
                        const data = await gatherContext(cwd);
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
                        const commits = data.branchCommits?.length
                            ? data.branchCommits
                            : (data.recentCommits || []);
                        let prompt;
                        if (thread) {
                            prompt = `I was working on ${thread} and got interrupted. Context: worktree=${data.worktreeRoot}, branch=${data.branch}, worktree commits: ${commits.join("; ")}. Help me resume.`;
                        } else {
                            prompt = `Help me resume. Worktree: ${data.worktreeRoot}. Branch: ${data.branch}. Commits: ${commits.join("; ")}. Uncommitted: ${(data.uncommitted || []).join("; ")}.`;
                        }
                        if (sessionRef) await sessionRef.send(prompt);
                        return { sent: true };
                    },
                },
            ],
            open: async (ctx) => {
                const cwd = await activeCwd(ctx);
                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    entry = await startServer(ctx.instanceId, cwd, sessionRef?.workspacePath);
                    servers.set(ctx.instanceId, entry);
                } else {
                    entry.cwd = cwd;
                }

                const data = await gatherContext(cwd);
                await saveContext(sessionRef?.workspacePath, data);
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
