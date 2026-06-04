import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { dirname } from "node:path";
import { joinSession, createCanvas } from "@github/copilot-sdk/extension";

const servers = new Map();
let workspacePath = null;

// Example demo issues to show the board layout
const DEMO_ISSUES = [
    { number: 1908, title: "GitHub Copilot Modernization Plugin", labels: [{ name: 'ready-for-review' }], pr_url: null },
    { number: 1901, title: "Add 42Crunch API Security Testing plugin", labels: [{ name: 'approved' }], pr_url: "https://github.com/github/awesome-copilot/pull/1234" },
    { number: 1890, title: "UI5 Plugin for TypeScript conversion", labels: [{ name: 'requires-submitter-fixes' }], pr_url: null },
    { number: 1889, title: "UI5 Plugin for coding best practices", labels: [{ name: 'ready-for-review' }], pr_url: null },
    { number: 1881, title: "Trident", labels: [{ name: 'rejected' }], pr_url: null },
];

// Using demo mode by default - can be extended to use live gh data when available
const USE_DEMO_MODE = true;

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
        cursor: move;
      }
      .issue-number { font-weight: 600; color: var(--text-color-muted, #656d76); font-size: 12px; }
      .issue-title { margin: 0.25rem 0; font-size: 12px; }
      .issue-link { color: #0969da; text-decoration: none; margin-top: 0.5rem; font-size: 12px; }
      .issue-link:hover { text-decoration: underline; }
      .loading { text-align: center; padding: 2rem; color: var(--text-color-muted, #656d76); }
      .error { color: #cf222e; padding: 1rem; background: var(--background-color-secondary, #f6f8fa); border-radius: 6px; }
    </style>
  </head>
  <body>
    <h1>External Plugins Board</h1>
    <div id="content"><div class="loading">Loading issues...</div></div>
    <script>
      const STATES = [
        { key: 'requires-submitter-fixes', label: 'Requires Submitter Fixes' },
        { key: 'ready-for-review', label: 'Ready for Review' },
        { key: 'approved', label: 'Approved' },
        { key: 'rejected', label: 'Rejected' }
      ];
      let draggedIssue = null;

      async function loadIssues() {
        try {
          const response = await fetch('/api/issues');
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Failed to load');
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
            
            card.addEventListener('dragstart', () => {
              draggedIssue = issue.number;
              card.style.opacity = '0.5';
            });
            card.addEventListener('dragend', () => {
              card.style.opacity = '1';
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

      loadIssues();
    </script>
  </body>
</html>`;
}

async function startServer(instanceId, cwd) {
    const useDemo = USE_DEMO_MODE;
    
    const server = createServer(async (req, res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        
        if (req.url === "/" && req.method === "GET") {
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.end(renderHtml());
        } else if (req.url === "/api/issues" && req.method === "GET") {
            try {
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(DEMO_ISSUES));
            } catch (err) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: err.message }));
            }
        } else if (req.url === "/api/issues/update" && req.method === "POST") {
            let body = "";
            req.on("data", chunk => { body += chunk; });
            req.on("end", async () => {
                try {
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({ ok: true, note: "Demo mode - changes are not persisted" }));
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
