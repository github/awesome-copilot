import http from "node:http";
import { createCanvas, joinSession } from "@github/copilot-sdk/extension";

// In-memory state (ephemeral per provider process)
let currentColor = "#6c63ff";
let logEntries = [];
const sseClients = new Set();

function broadcast(event, data) {
	for (const res of sseClients) {
		res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
	}
}

// --- Loopback HTTP server for the iframe ---
const server = http.createServer((req, res) => {
	if (req.method === "GET" && req.url === "/") {
		res.writeHead(200, { "Content-Type": "text/html" });
		res.end(getHTML());
		return;
	}

	if (req.method === "GET" && req.url === "/events") {
		res.writeHead(200, {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		});
		// Send current state immediately
		res.write(`event: color\ndata: ${JSON.stringify({ color: currentColor })}\n\n`);
		res.write(`event: log\ndata: ${JSON.stringify({ entries: logEntries })}\n\n`);
		sseClients.add(res);
		req.on("close", () => sseClients.delete(res));
		return;
	}

	if (req.method === "POST" && req.url === "/request-change") {
		const entry = { time: new Date().toLocaleTimeString(), message: "🖱️ User clicked — requesting a color change..." };
		logEntries.push(entry);
		broadcast("log", { entries: logEntries });
		if (session) {
			session.send({
				prompt: "The user clicked the 'Ask Agent to Change Color' button on the Color Orb canvas. Pick a random, fun color and use the set_color canvas action to change the orb, then use log_message to tell them what color you chose and why.",
			});
		}
		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ ok: true }));
		return;
	}

	if (req.method === "POST" && req.url === "/clear-log") {
		logEntries = [];
		broadcast("log", { entries: logEntries });
		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ ok: true }));
		return;
	}

	res.writeHead(404);
	res.end("Not found");
});

const port = await new Promise((resolve) => {
	server.listen(0, "127.0.0.1", () => resolve(server.address().port));
});

let session;

const canvas = createCanvas({
	id: "color-orb",
	displayName: "Color Orb",
	description: "An interactive orb whose color can be changed by the agent. The user clicks a button to request a color change, then the agent sets the new color.",
	actions: [
		{
			name: "set_color",
			description: "Set the orb color. Accepts any valid CSS color (hex, named, rgb, hsl).",
			inputSchema: {
				type: "object",
				properties: {
					color: { type: "string", description: "CSS color value, e.g. '#ff6347' or 'tomato'" },
				},
				required: ["color"],
			},
			handler({ input }) {
				currentColor = input.color;
				broadcast("color", { color: currentColor });
				return { color: currentColor };
			},
		},
		{
			name: "log_message",
			description: "Append a message to the canvas log area visible to the user.",
			inputSchema: {
				type: "object",
				properties: {
					message: { type: "string", description: "The message to display in the log" },
				},
				required: ["message"],
			},
			handler({ input }) {
				const entry = { time: new Date().toLocaleTimeString(), message: input.message };
				logEntries.push(entry);
				broadcast("log", { entries: logEntries });
				return { ok: true };
			},
		},
		{
			name: "clear_log",
			description: "Clear all messages from the canvas log.",
			inputSchema: { type: "object", properties: {} },
			handler() {
				logEntries = [];
				broadcast("log", { entries: logEntries });
				return { ok: true };
			},
		},
	],
	open({ instanceId }) {
		return {
			url: `http://127.0.0.1:${port}`,
			title: "Color Orb",
			status: "ready",
		};
	},
});

session = await joinSession({ canvases: [canvas] });

function getHTML() {
	return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Outfit', sans-serif;
    background: #0b0f14;
    color: #e2e8f0;
    display: flex; flex-direction: column; align-items: center;
    padding: 3.5rem 1.5rem; min-height: 100vh;
    position: relative; overflow: hidden;
  }

  /* Ambient glow */
  body::before, body::after {
    content: ''; position: absolute; width: 500px; height: 500px;
    border-radius: 50%; pointer-events: none; z-index: 0;
  }
  body::before {
    top: -180px; right: -120px;
    background: radial-gradient(circle, rgba(255,127,80,0.15) 0%, transparent 70%);
    filter: blur(80px);
  }
  body::after {
    bottom: -200px; left: -140px;
    background: radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%);
    filter: blur(80px);
  }

  /* Grain overlay */
  body > .grain {
    position: fixed; inset: 0; pointer-events: none; z-index: 1000;
    opacity: 0.025;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }

  .content { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 420px; }

  /* Label */
  .label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px; font-weight: 500;
    text-transform: uppercase; letter-spacing: 0.7px;
    color: #64748b; margin-bottom: 2rem;
  }

  /* Orb */
  .orb-wrap { position: relative; margin-bottom: 2.5rem; }
  .orb {
    width: 140px; height: 140px; border-radius: 50%;
    background: var(--orb-color, #ff7f50);
    box-shadow: 0 0 60px var(--orb-color, #ff7f50), 0 0 120px color-mix(in srgb, var(--orb-color, #ff7f50) 40%, transparent);
    transition: background 0.5s ease, box-shadow 0.5s ease;
  }

  /* CTA */
  .actions { display: flex; gap: 0.75rem; margin-bottom: 2rem; }
  .btn {
    font-family: 'Outfit', sans-serif;
    background: linear-gradient(135deg, #ff7f50, #0ea5e9);
    color: #fff; border: none;
    padding: 10px 20px; border-radius: 9999px;
    font-size: 13px; font-weight: 600; cursor: pointer;
    box-shadow: 0 4px 12px rgba(14,165,233,0.3);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(14,165,233,0.4); }
  .btn:active { transform: translateY(0); }

  .btn-ghost {
    font-family: 'JetBrains Mono', monospace;
    background: transparent;
    color: #64748b; border: 1px solid rgba(255,255,255,0.06);
    padding: 8px 16px; border-radius: 9999px;
    font-size: 11px; font-weight: 500; cursor: pointer;
    transition: color 0.2s ease, border-color 0.2s ease;
  }
  .btn-ghost:hover { color: #e2e8f0; border-color: rgba(255,255,255,0.15); }

  /* Log — terminal block */
  .log {
    width: 100%;
    background: #111820;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px; padding: 16px 20px;
    max-height: 180px; overflow-y: auto;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px; line-height: 1.7;
    box-shadow: 0 24px 60px -12px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.02);
  }
  .log::-webkit-scrollbar { width: 4px; }
  .log::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
  .log-dots { display: flex; gap: 6px; margin-bottom: 12px; }
  .log-dots span { width: 10px; height: 10px; border-radius: 50%; }
  .log-dots .r { background: #ef4444; }
  .log-dots .y { background: #f59e0b; }
  .log-dots .g { background: #22c55e; }
  .log-entry { color: #94a3b8; margin-bottom: 4px; }
  .log-entry .time { color: #334155; margin-right: 8px; }
  .log-empty { color: #334155; font-style: italic; }
</style>
</head>
<body>
  <div class="grain"></div>
  <div class="content">
    <div class="label">color-orb</div>
    <div class="orb-wrap">
      <div class="orb" id="orb"></div>
    </div>
    <div class="actions">
      <button class="btn" id="btn">Change Color</button>
      <button class="btn-ghost" id="clear-btn">clear</button>
    </div>
    <div class="log">
      <div class="log-dots"><span class="r"></span><span class="y"></span><span class="g"></span></div>
      <div id="log-content"><div class="log-empty">waiting for input…</div></div>
    </div>
  </div>

  <script>
    const orb = document.getElementById('orb');
    const logContent = document.getElementById('log-content');
    const btn = document.getElementById('btn');
    const clearBtn = document.getElementById('clear-btn');

    const es = new EventSource('/events');
    es.addEventListener('color', (e) => {
      const { color } = JSON.parse(e.data);
      orb.style.setProperty('--orb-color', color);
      orb.style.background = color;
      orb.style.boxShadow = '0 0 60px ' + color + ', 0 0 120px ' + color + '66';
    });
    es.addEventListener('log', (e) => {
      const { entries } = JSON.parse(e.data);
      if (entries.length === 0) {
        logContent.innerHTML = '<div class="log-empty">waiting for input\\u2026</div>';
      } else {
        logContent.innerHTML = entries.map(x =>
          '<div class="log-entry"><span class="time">' + x.time + '</span>' + x.message + '</div>'
        ).join('');
        logContent.parentElement.scrollTop = logContent.parentElement.scrollHeight;
      }
    });

    btn.addEventListener('click', async () => {
      await fetch('/request-change', { method: 'POST' });
    });

    clearBtn.addEventListener('click', async () => {
      await fetch('/clear-log', { method: 'POST' });
    });
  </script>
</body>
</html>`;
}
