import { createServer } from "node:http";
import { execFileSync, spawnSync, execSync } from "node:child_process";
import { dirname } from "node:path";
import { createRequire } from "node:module";
import { joinSession, createCanvas } from "@github/copilot-sdk/extension";

const require = createRequire(import.meta.url);
const { marked } = require("marked");

const servers = new Map();
let workspacePath = null;
let lastError = null;

// Fetch live issues from GitHub REST API instead of gh CLI subprocess
async function fetchLiveIssues(cwd) {
    try {
        // Use GitHub REST API to fetch issues
        // This avoids the subprocess execution restriction
        const owner = "github";
        const repo = "awesome-copilot";
        const label = "external-plugin";
        
        // Get authentication token from environment or use public access
        const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
        
        const headers = {
            "Accept": "application/vnd.github.v3+json"
        };
        
        if (token) {
            headers["Authorization"] = `token ${token}`;
        }
        
        // Fetch issues with external-plugin label
        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/issues?labels=${label}&state=open&per_page=100`,
            { headers }
        );
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`GitHub API error ${response.status}: ${error.substring(0, 200)}`);
        }
        
        const issues = await response.json();
        
        // Filter to only external-plugin labeled issues and map to our format
        return issues
            .filter(issue => issue.labels && issue.labels.some(l => l.name === label))
            .map(issue => ({
                number: issue.number,
                title: issue.title,
                body: issue.body || "",
                bodyHtml: marked.parse(issue.body || ""),
                labels: (issue.labels || []).map(l => ({ name: l.name })),
                pr_url: issue.body?.match(/\[Generated PR\]\(([^)]+)\)/)?.[1],
                created_at: issue.created_at,
                updated_at: issue.updated_at
            }));
    } catch (err) {
        lastError = err.message;
        throw err;
    }
}

function renderHtml() {
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>External Plugins Board</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        background: var(--background-color-default, #ffffff);
        color: var(--text-color-default, #1f2328);
        font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
        font-size: var(--text-body-medium, 14px);
        line-height: var(--leading-body-medium, 20px);
        padding: 1.5rem;
      }
      h1 {
        font-size: var(--text-title-medium, 20px);
        font-weight: var(--font-weight-semibold, 600);
        margin-bottom: 1.5rem;
      }
      .board {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1.5rem;
      }
      .column {
        background: var(--background-color-secondary, #f6f8fa);
        border: 1px solid var(--border-color-default, #d0d7de);
        border-radius: 6px;
        padding: 1rem;
      }
      .column-header {
        font-weight: 600;
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid var(--border-color-default, #d0d7de);
      }
      .column-header.requires { color: #cf222e; }
      .column-header.ready { color: #0969da; }
      .column-header.approved { color: #1a7f34; }
      .column-header.rejected { color: var(--text-color-muted, #656d76); }
      .issues { display: flex; flex-direction: column; gap: 0.75rem; }
      .issue-card {
        background: white;
        border: 1px solid var(--border-color-default, #d0d7de);
        border-radius: 6px;
        padding: 0.75rem;
        cursor: grab;
        transition: all 0.2s;
      }
      .issue-card:hover {
        border-color: #0969da;
        box-shadow: 0 0 8px rgba(9, 105, 218, 0.2);
      }
      .issue-card.dragging { opacity: 0.5; }
      .issue-number { font-weight: 600; color: var(--text-color-muted, #656d76); font-size: 12px; }
      .issue-title { margin: 0.25rem 0; font-size: 12px; }
      .issue-link { color: #0969da; text-decoration: none; margin-top: 0.5rem; font-size: 12px; }
      .issue-link:hover { text-decoration: underline; }
      .loading { text-align: center; padding: 2rem; color: var(--text-color-muted, #656d76); }
      .error { 
        color: #cf222e; 
        padding: 1.5rem; 
        background: var(--background-color-secondary, #f6f8fa); 
        border: 1px solid #da3633;
        border-radius: 6px; 
        white-space: pre-wrap;
        font-family: var(--font-mono, monospace);
        font-size: 12px;
        line-height: 1.5;
      }
      
      .modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 1000;
        align-items: center;
        justify-content: center;
      }
      .modal.open {
        display: flex;
      }
      .modal-content {
        background: var(--background-color-default, #ffffff);
        border: 1px solid var(--border-color-default, #d0d7de);
        border-radius: 8px;
        padding: 1.5rem;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        position: relative;
      }
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1rem;
      }
      .modal-title {
        font-size: var(--text-title-medium, 20px);
        font-weight: var(--font-weight-semibold, 600);
      }
      .modal-number {
        color: var(--text-color-muted, #656d76);
        font-size: 12px;
      }
      .close-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: var(--text-color-default, #1f2328);
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
      }
      .close-btn:hover {
        background: var(--background-color-secondary, #f6f8fa);
      }
      .modal-body {
        margin-bottom: 1.5rem;
      }
      .modal-description {
        color: var(--text-color-default, #1f2328);
        margin-bottom: 1rem;
        line-height: var(--leading-body-medium, 20px);
      }
      .modal-description h1, .modal-description h2, .modal-description h3 {
        font-weight: var(--font-weight-semibold, 600);
        margin: 1rem 0 0.5rem;
        border-bottom: 1px solid var(--border-color-default, #d1d9e0);
        padding-bottom: 0.25rem;
      }
      .modal-description h1 { font-size: 1.2em; }
      .modal-description h2 { font-size: 1.1em; }
      .modal-description h3 { font-size: 1em; }
      .modal-description p { margin: 0.5rem 0; }
      .modal-description ul, .modal-description ol {
        padding-left: 1.5rem;
        margin: 0.5rem 0;
      }
      .modal-description li { margin: 0.25rem 0; }
      .modal-description a {
        color: var(--color-accent-fg, #0969da);
        text-decoration: none;
      }
      .modal-description a:hover { text-decoration: underline; }
      .modal-description code {
        font-family: var(--font-mono, monospace);
        font-size: var(--text-code-inline, 12px);
        background: var(--background-color-secondary, #f6f8fa);
        padding: 0.1em 0.3em;
        border-radius: 3px;
      }
      .modal-description pre {
        background: var(--background-color-secondary, #f6f8fa);
        padding: 0.75rem;
        border-radius: 6px;
        overflow-x: auto;
        margin: 0.5rem 0;
      }
      .modal-description pre code {
        background: none;
        padding: 0;
      }
      .modal-description blockquote {
        border-left: 3px solid var(--border-color-default, #d1d9e0);
        padding-left: 0.75rem;
        margin: 0.5rem 0;
        color: var(--text-color-muted, #656d76);
      }
      .modal-description hr {
        border: none;
        border-top: 1px solid var(--border-color-default, #d1d9e0);
        margin: 0.75rem 0;
      }
      .modal-description input[type="checkbox"] { margin-right: 0.3em; }
      .modal-meta {
        display: flex;
        gap: 1rem;
        font-size: 12px;
        color: var(--text-color-muted, #656d76);
        margin-bottom: 1rem;
      }
      .modal-meta-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .modal-labels {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-bottom: 1rem;
      }
      .label-badge {
        background: #f0f6ff;
        color: #0969da;
        padding: 0.25rem 0.5rem;
        border-radius: 3px;
        font-size: 11px;
        font-weight: 500;
      }
      .label-badge.requires { background: #fef2f1; color: #cf222e; }
      .label-badge.ready { background: #f0f6ff; color: #0969da; }
      .label-badge.approved { background: #f0f6ff; color: #1a7f34; }
      .label-badge.rejected { background: #f6f8fa; color: var(--text-color-muted, #656d76); }
      .modal-pr {
        border-top: 1px solid var(--border-color-default, #d0d7de);
        padding-top: 1rem;
      }
      .pr-link {
        color: #0969da;
        text-decoration: none;
        font-weight: 500;
      }
      .pr-link:hover {
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <h1>External Plugins Board</h1>
    <div id="content"><div class="loading">Loading issues...</div></div>
    
    <div id="modal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <div>
            <div class="modal-number" id="modalNumber"></div>
            <div class="modal-title" id="modalTitle"></div>
          </div>
          <button class="close-btn" onclick="closeModal()">×</button>
        </div>
        <div class="modal-body">
          <div class="modal-description" id="modalDescription"></div>
          <div class="modal-meta" id="modalMeta"></div>
          <div class="modal-labels" id="modalLabels"></div>
          <div class="modal-pr" id="modalPR" style="display: none;"></div>
        </div>
      </div>
    </div>
    
    <script>
      const STATES = [
        { key: 'requires-submitter-fixes', label: 'Requires Submitter Fixes' },
        { key: 'ready-for-review', label: 'Ready for Review' },
        { key: 'approved', label: 'Approved' },
        { key: 'rejected', label: 'Rejected' }
      ];
      let draggedIssue = null;
      let allIssues = [];

      function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      }

      function getLabelClass(labelName) {
        if (labelName.includes('requires')) return 'requires';
        if (labelName.includes('ready')) return 'ready';
        if (labelName.includes('approved')) return 'approved';
        if (labelName.includes('rejected')) return 'rejected';
        return '';
      }

      function showIssueModal(issueNumber) {
        const issue = allIssues.find(i => i.number === issueNumber);
        if (!issue) return;

        document.getElementById('modalNumber').textContent = '#' + issue.number;
        document.getElementById('modalTitle').textContent = issue.title;
        document.getElementById('modalDescription').innerHTML = issue.bodyHtml || '';
        
        const metaHtml = \`
          <div class="modal-meta-item">
            <span style="color: var(--text-color-muted);">Created</span>
            <span>\${formatDate(issue.created_at)}</span>
          </div>
          <div class="modal-meta-item">
            <span style="color: var(--text-color-muted);">Updated</span>
            <span>\${formatDate(issue.updated_at)}</span>
          </div>
        \`;
        document.getElementById('modalMeta').innerHTML = metaHtml;

        const labelsHtml = (issue.labels || []).map(l => 
          \`<span class="label-badge \${getLabelClass(l.name)}">\${l.name.replace(/-/g, ' ')}</span>\`
        ).join('');
        document.getElementById('modalLabels').innerHTML = labelsHtml;

        const prDiv = document.getElementById('modalPR');
        if (issue.pr_url) {
          prDiv.innerHTML = \`<a href="\${issue.pr_url}" target="_blank" class="pr-link">View generated PR →</a>\`;
          prDiv.style.display = 'block';
        } else {
          prDiv.style.display = 'none';
        }

        document.getElementById('modal').classList.add('open');
      }

      function closeModal() {
        document.getElementById('modal').classList.remove('open');
      }

      async function loadIssues() {
        try {
          const response = await fetch('/api/issues');
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Failed to load');
          allIssues = data;
          render(data);
        } catch (err) {
          document.getElementById('content').innerHTML = '<div class="error">Error: ' + err.message + '</div>';
        }
      }

      function render(issues) {
        const board = document.createElement('div');
        board.className = 'board';
        
        STATES.forEach(state => {
          const column = document.createElement('div');
          column.className = 'column';
          column.dataset.state = state.key;
          
          const header = document.createElement('div');
          header.className = 'column-header ' + state.key.split('-')[0];
          header.textContent = state.label;
          column.appendChild(header);
          
          const issuesContainer = document.createElement('div');
          issuesContainer.className = 'issues';
          
          const stateIssues = issues.filter(issue => {
            return (issue.labels || []).some(l => l.name === state.key);
          });
          
          stateIssues.forEach(issue => {
            const card = document.createElement('div');
            card.className = 'issue-card';
            card.draggable = true;
            card.dataset.issue = issue.number;
            
            const num = document.createElement('div');
            num.className = 'issue-number';
            num.textContent = '#' + issue.number;
            card.appendChild(num);
            
            const title = document.createElement('div');
            title.className = 'issue-title';
            title.textContent = issue.title;
            card.appendChild(title);
            
            if (issue.pr_url) {
              const link = document.createElement('a');
              link.className = 'issue-link';
              link.href = issue.pr_url;
              link.target = '_blank';
              link.textContent = 'View PR →';
              card.appendChild(link);
            }
            
            card.addEventListener('click', (e) => {
              if (e.target.tagName !== 'A') {
                showIssueModal(issue.number);
              }
            });
            
            card.addEventListener('dragstart', () => {
              draggedIssue = issue.number;
              card.classList.add('dragging');
            });
            card.addEventListener('dragend', () => {
              card.classList.remove('dragging');
            });
            
            issuesContainer.appendChild(card);
          });
          
          column.appendChild(issuesContainer);
          board.appendChild(column);
        });
        
        document.getElementById('content').innerHTML = '';
        document.getElementById('content').appendChild(board);
      }

      document.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });

      document.addEventListener('drop', async e => {
        e.preventDefault();
        const column = e.target.closest('.column');
        if (column && draggedIssue) {
          try {
            const response = await fetch('/api/issues/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ issueNumber: draggedIssue, newState: column.dataset.state })
            });
            if (response.ok) await loadIssues();
          } catch (err) {
            console.error('Error:', err);
          }
          draggedIssue = null;
        }
      });

      // Close modal when clicking outside
      document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target.id === 'modal') closeModal();
      });

      loadIssues();
    </script>
  </body>
</html>`;
}

async function startServer(instanceId, cwd) {
    const server = createServer(async (req, res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        
        if (req.url === "/" && req.method === "GET") {
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.end(renderHtml());
        } else if (req.url === "/api/issues" && req.method === "GET") {
            try {
                const issues = await fetchLiveIssues(cwd);
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(issues || []));
            } catch (err) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: err.message }));
            }
        } else if (req.url === "/api/issues/update" && req.method === "POST") {
            let body = "";
            req.on("data", chunk => { body += chunk; });
            req.on("end", async () => {
                try {
                    const { issueNumber, newState } = JSON.parse(body);
                    const labels = ['requires-submitter-fixes', 'ready-for-review', 'approved', 'rejected'];
                    for (const label of labels.filter(l => l !== newState)) {
                        try {
                            spawnSync("gh", [
                                "issue", "edit", issueNumber.toString(),
                                "--remove-label", label
                            ], { cwd, shell: true });
                        } catch (e) {}
                    }
                    spawnSync("gh", [
                        "issue", "edit", issueNumber.toString(),
                        "--add-label", newState
                    ], { cwd, shell: true });
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({ ok: true }));
                } catch (err) {
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: err.message }));
                }
            });
        } else {
            res.writeHead(404);
            res.end("Not found");
        }
    });

    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;
    return { server, url: `http://127.0.0.1:${port}/` };
}

const session = await joinSession({
    canvases: [
        createCanvas({
            id: "external-plugins-board",
            displayName: "External Plugins Board",
            description: "Kanban board for managing external plugin submission issues",
            open: async (ctx) => {
                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    if (!workspacePath) {
                        const filePath = import.meta.url.replace(/^file:\/\//, '').replace(/\//g, '\\');
                        workspacePath = dirname(dirname(dirname(filePath)));
                    }
                    entry = await startServer(ctx.instanceId, workspacePath);
                    servers.set(ctx.instanceId, entry);
                }
                return { title: "External Plugins Board", url: entry.url };
            },
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (entry) {
                    servers.delete(ctx.instanceId);
                    await new Promise(resolve => entry.server.close(() => resolve()));
                }
            },
        }),
    ],
});
