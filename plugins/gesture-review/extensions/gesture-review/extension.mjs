import http from "node:http";
import { execFile } from "node:child_process";
import { createCanvas, joinSession } from "@github/copilot-sdk/extension";

// The extension should query PRs from the active workspace repository.

// In-memory state
let currentPR = null;
let prList = [];
let gestureState = "idle"; // idle | detecting | approved | rejected
let lastDecision = null;
let lastLoadError = null;
const sseClients = new Set();
let loadPRsPromise = null; // in-flight guard for loadOpenPRs
let cachedHTML = null; // cached HTML string

function broadcast(event, data) {
	for (const res of sseClients) {
		res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
	}
}

function normalizeErrorMessage(error) {
	if (!error) return "Unknown error loading pull requests.";
	const message = typeof error === "string" ? error : error.message || String(error);
	const singleLine = message.split(/\r?\n/)[0].trim();
	return singleLine || "Unknown error loading pull requests.";
}

// --- Load open PRs from the repo via the gh CLI ---
function shortDescription(body) {
	if (!body) return "";
	// First non-empty, non-heading line, trimmed to a reasonable length.
	const line = body
		.split(/\r?\n/)
		.map((l) => l.trim())
		.find((l) => l && !l.startsWith("#"));
	if (!line) return "";
	return line.length > 140 ? line.slice(0, 137) + "..." : line;
}

function loadOpenPRs() {
	// De-dupe: return existing in-flight promise if one is running
	if (loadPRsPromise) return loadPRsPromise;

	loadPRsPromise = new Promise((resolve) => {
		const repoCwd = process.cwd();
		execFile(
			"gh",
			[
				"pr",
				"list",
				"--state",
				"open",
				"--limit",
				"20",
				"--json",
				"number,title,author,additions,deletions,body",
			],
			{ cwd: repoCwd, maxBuffer: 1024 * 1024 },
			(err, stdout) => {
				loadPRsPromise = null;
				if (err) {
					lastLoadError = normalizeErrorMessage(err);
					prList = [];
					currentPR = null;
					console.error("gesture-review: failed to load PRs:", lastLoadError);
					broadcast("prlist", prList);
					broadcast("load_error", { message: lastLoadError });
					resolve(false);
					return;
				}
				try {
					const raw = JSON.parse(stdout);
					lastLoadError = null;
					prList = raw.map((pr) => ({
						title: pr.title,
						number: pr.number,
						author: pr.author?.login || "unknown",
						description: shortDescription(pr.body),
						additions: pr.additions || 0,
						deletions: pr.deletions || 0,
					}));
					// Keep currentPR pointing at a still-open PR if possible.
					if (currentPR) {
						currentPR = prList.find((p) => p.number === currentPR.number) || null;
					}
					broadcast("prlist", prList);
					if (currentPR) broadcast("pr", currentPR);
					broadcast("load_error", null);
					resolve(true);
				} catch (e) {
					lastLoadError = normalizeErrorMessage(e);
					console.error("gesture-review: failed to parse PRs:", lastLoadError);
					broadcast("load_error", { message: lastLoadError });
					resolve(false);
				}
			},
		);
	});

	return loadPRsPromise;
}

// --- Loopback HTTP server for the iframe ---
const server = http.createServer((req, res) => {
	if (req.method === "GET" && req.url === "/") {
		if (!cachedHTML) cachedHTML = getHTML();
		res.writeHead(200, {
			"Content-Type": "text/html",
			"Cache-Control": "no-cache",
		});
		res.end(cachedHTML);
		return;
	}

	if (req.method === "GET" && req.url === "/events") {
		res.writeHead(200, {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		});
		// Send current state immediately
		res.write(`event: prlist\ndata: ${JSON.stringify(prList)}\n\n`);
		if (currentPR) {
			res.write(`event: pr\ndata: ${JSON.stringify(currentPR)}\n\n`);
		}
		res.write(`event: state\ndata: ${JSON.stringify({ state: gestureState })}\n\n`);
		if (lastLoadError) {
			res.write(
				`event: load_error\ndata: ${JSON.stringify({ message: lastLoadError })}\n\n`,
			);
		}
		sseClients.add(res);
		req.on("close", () => sseClients.delete(res));
		return;
	}

	if (req.method === "POST" && req.url === "/select-pr") {
		let body = "";
		req.on("data", (chunk) => (body += chunk));
		req.on("end", () => {
			const { number } = JSON.parse(body);
			const pr = prList.find((p) => p.number === number);
			if (pr) {
				currentPR = pr;
				gestureState = "idle";
				broadcast("pr", currentPR);
				broadcast("state", { state: "idle" });
			}
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ ok: true }));
		});
		return;
	}

	if (req.method === "POST" && req.url === "/gesture-decision") {
		let body = "";
		req.on("data", (chunk) => (body += chunk));
		req.on("end", () => {
			const { decision } = JSON.parse(body);
			gestureState = decision; // "approved" or "rejected"
			lastDecision = { decision, pr: currentPR, timestamp: Date.now() };
			broadcast("state", { state: gestureState });

			if (session && currentPR) {
				const action = decision === "approved" ? "approve" : "reject";
				session.send({
					prompt: `The user gave a thumbs ${decision === "approved" ? "up" : "down"} gesture to ${action} PR #${currentPR.number} ("${currentPR.title}" by ${currentPR.author}). Please ${action} this pull request accordingly.`,
				});
			}

			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ ok: true, decision }));
		});
		return;
	}

	if (req.method === "POST" && req.url === "/refresh") {
		loadOpenPRs().then(() => {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ ok: true, count: prList.length }));
		});
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
	id: "gesture-review",
	displayName: "Gesture PR Review",
	description:
		"Users review pull requests with a live camera feed and approve or reject using thumbs-up/thumbs-down gestures.",
	actions: [
		{
			name: "show_pr",
			description:
				"Display a PR for the user to gesture-review. Shows PR info and activates gesture detection.",
			inputSchema: {
				type: "object",
				properties: {
					title: { type: "string", description: "PR title" },
					number: { type: "number", description: "PR number" },
					author: { type: "string", description: "PR author username" },
					description: {
						type: "string",
						description: "Short PR description",
					},
					additions: {
						type: "number",
						description: "Lines added",
					},
					deletions: {
						type: "number",
						description: "Lines deleted",
					},
				},
				required: ["title", "number", "author"],
			},
			handler({ input }) {
				currentPR = {
					title: input.title,
					number: input.number,
					author: input.author,
					description: input.description || "",
					additions: input.additions || 0,
					deletions: input.deletions || 0,
				};
				// Add to list if not already there
				if (!prList.find((p) => p.number === currentPR.number)) {
					prList.push(currentPR);
					broadcast("prlist", prList);
				}
				gestureState = "idle";
				broadcast("pr", currentPR);
				broadcast("state", { state: "idle" });
				return { ok: true, pr: currentPR };
			},
		},
		{
			name: "get_status",
			description:
				"Returns current gesture detection state and last decision made.",
			inputSchema: { type: "object", properties: {} },
			handler() {
				return {
					gestureState,
					currentPR,
					lastDecision,
				};
			},
		},
	],
	open({ instanceId }) {
		// Refresh open PRs each time the canvas is opened so the drawer is current.
		loadOpenPRs();
		return {
			url: `http://127.0.0.1:${port}`,
			title: "Gesture PR Review",
			status: "ready",
		};
	},
});

session = await joinSession({ canvases: [canvas] });

// Populate the drawer with open PRs as soon as the extension starts.
loadOpenPRs();

function getHTML() {
	return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
<noscript><link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"></noscript>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Outfit', sans-serif;
    background: #0b0f14;
    color: #e2e8f0;
    display: flex; flex-direction: column;
    min-height: 100vh;
    position: relative; overflow: hidden;
  }

  /* Camera fills the viewport */
  .camera-wrap {
    position: relative;
    width: 100%; flex: 1; min-height: 0;
    overflow: hidden;
    transition: box-shadow 0.3s ease;
  }
  .camera-wrap.detecting-up {
    box-shadow: inset 0 0 40px rgba(34,197,94,0.3);
  }
  .camera-wrap.detecting-down {
    box-shadow: inset 0 0 40px rgba(239,68,68,0.3);
  }
  .camera-wrap.approved {
    box-shadow: inset 0 0 80px rgba(34,197,94,0.5);
  }
  .camera-wrap.rejected {
    box-shadow: inset 0 0 80px rgba(239,68,68,0.5);
  }

  #video {
    width: 100%; height: 100%; object-fit: cover;
    transform: scaleX(-1);
  }
  #canvas-overlay {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    pointer-events: none;
    transform: scaleX(-1);
  }
  /* Debug overlay (toggle with 'd') — NOT mirrored, so text reads normally */
  #debug-overlay {
    position: absolute; top: 8px; left: 8px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px; line-height: 1.5;
    color: #7dd3fc;
    background: rgba(11,15,20,0.7);
    border: 1px solid rgba(125,211,252,0.2);
    border-radius: 6px;
    padding: 6px 10px;
    pointer-events: none;
    white-space: pre;
    display: none;
  }
  #debug-overlay.visible { display: block; }

  /* PR HUD overlay — frosted glass at bottom of camera */
  .pr-hud {
    position: absolute; bottom: 0; left: 0; right: 0;
    background: rgba(11, 15, 20, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-top: 1px solid rgba(255,255,255,0.08);
    padding: 16px 20px;
    pointer-events: none;
    transition: opacity 0.3s ease, transform 0.3s ease;
  }
  .pr-hud.hidden {
    opacity: 0; transform: translateY(20px);
  }
  .pr-hud .pr-top-row {
    display: flex; align-items: baseline; gap: 10px; margin-bottom: 6px;
  }
  .pr-hud .pr-number {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px; color: #64748b;
    flex-shrink: 0;
  }
  .pr-hud .pr-title {
    font-size: 16px; font-weight: 700;
    line-height: 1.3;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .pr-hud .pr-meta {
    display: flex; align-items: center; gap: 12px;
    font-size: 12px; color: #94a3b8;
    margin-bottom: 6px;
  }
  .pr-hud .pr-meta .author { color: #e2e8f0; font-weight: 600; }
  .pr-hud .pr-stats {
    display: flex; gap: 12px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
  }
  .pr-hud .pr-stats .additions { color: #22c55e; }
  .pr-hud .pr-stats .deletions { color: #ef4444; }
  .pr-hud .pr-desc {
    font-size: 12px; color: #94a3b8;
    margin-top: 8px; line-height: 1.4;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Empty state overlay */
  .pr-empty-overlay {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    flex-direction: column; gap: 8px;
    background: rgba(11,15,20,0.7);
    backdrop-filter: blur(4px);
    color: #64748b; font-size: 14px; text-align: center;
    transition: opacity 0.3s ease;
  }
  .pr-empty-overlay.hidden { opacity: 0; pointer-events: none; }

  /* Status bar — fixed at very bottom */
  .bottom-section {
    flex-shrink: 0;
    background: #0b0f14;
    border-top: 1px solid rgba(255,255,255,0.06);
  }

  /* PR Carousel */
  .pr-carousel {
    display: flex; align-items: center; gap: 0;
    padding: 12px 8px;
  }
  .pr-carousel:empty { display: none; }

  .carousel-arrow {
    flex-shrink: 0;
    width: 36px; height: 36px;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03);
    color: #94a3b8;
    font-size: 16px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
    user-select: none;
  }
  .carousel-arrow:hover {
    background: rgba(255,255,255,0.08);
    color: #e2e8f0;
    border-color: rgba(255,255,255,0.15);
  }
  .carousel-arrow.disabled {
    opacity: 0.2; pointer-events: none;
  }

  .carousel-card-wrap {
    flex: 1; min-width: 0;
    overflow: hidden;
    padding: 0 8px;
  }
  .carousel-card {
    background: #111820;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 10px;
    padding: 12px 16px;
    transition: border-color 0.3s ease, opacity 0.3s ease;
  }
  .carousel-card.approved {
    border-color: rgba(34,197,94,0.4);
    opacity: 0.6;
  }
  .carousel-card.rejected {
    border-color: rgba(239,68,68,0.4);
    opacity: 0.6;
  }
  .carousel-card .cc-top {
    display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px;
  }
  .carousel-card .cc-number {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px; color: #64748b;
    flex-shrink: 0;
  }
  .carousel-card .cc-title {
    font-size: 14px; font-weight: 600;
    line-height: 1.3;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .carousel-card .cc-meta {
    font-size: 11px; color: #64748b;
    display: flex; gap: 10px; align-items: center;
  }
  .carousel-card .cc-meta .additions { color: #22c55e; font-family: 'JetBrains Mono', monospace; }
  .carousel-card .cc-meta .deletions { color: #ef4444; font-family: 'JetBrains Mono', monospace; }
  .carousel-card .cc-meta .author { color: #94a3b8; }
  .carousel-counter {
    text-align: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px; color: #334155;
    padding: 4px 0 0;
  }

  .status-bar {
    width: 100%;
    text-align: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px; color: #64748b;
    padding: 8px 16px;
    transition: color 0.3s ease, background 0.3s ease;
  }
  .status-bar.approve-status {
    color: #22c55e;
    background: rgba(34,197,94,0.08);
  }
  .status-bar.reject-status {
    color: #ef4444;
    background: rgba(239,68,68,0.08);
  }
  .status-bar.final {
    font-size: 14px; font-weight: 600;
  }

  /* Confetti canvas */
  #confetti-canvas {
    position: fixed; inset: 0; pointer-events: none; z-index: 9999;
  }

  /* Camera error */
  .camera-error {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    flex-direction: column; gap: 12px;
    background: #0b0f14;
    color: #64748b; font-size: 14px; text-align: center;
    padding: 2rem;
  }
  .camera-error .icon { font-size: 48px; margin-bottom: 8px; }

  /* Loading skeleton */
  .loading-overlay {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    flex-direction: column; gap: 16px;
    background: #0b0f14;
    z-index: 10;
    transition: opacity 0.4s ease;
  }
  .loading-overlay.hidden { opacity: 0; pointer-events: none; }
  .loading-spinner {
    width: 48px; height: 48px;
    border: 3px solid rgba(255,255,255,0.1);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-text {
    font-size: 13px; color: #64748b;
    font-family: 'JetBrains Mono', monospace;
    text-align: center;
  }
  .loading-progress {
    width: 200px; height: 3px;
    background: rgba(255,255,255,0.06);
    border-radius: 2px; overflow: hidden;
  }
  .loading-progress-bar {
    height: 100%; width: 0%;
    background: #3b82f6;
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  .pr-card.shake {
    animation: shake 0.5s ease;
  }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }
</style>
</head>
<body>
  <canvas id="confetti-canvas"></canvas>

  <div class="camera-wrap" id="camera-wrap">
    <video id="video" autoplay playsinline muted></video>
    <canvas id="canvas-overlay"></canvas>
    <div id="debug-overlay"></div>

    <!-- Loading skeleton -->
    <div class="loading-overlay" id="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text" id="loading-text">Initializing camera...</div>
      <div class="loading-progress"><div class="loading-progress-bar" id="loading-bar"></div></div>
    </div>

    <!-- PR info as HUD overlay at bottom of camera -->
    <div class="pr-hud hidden" id="pr-hud">
      <div class="pr-top-row">
        <span class="pr-number" id="pr-number"></span>
        <span class="pr-title" id="pr-title"></span>
      </div>
      <div class="pr-meta">
        <span>by <span class="author" id="pr-author"></span></span>
        <span class="pr-stats">
          <span class="additions" id="pr-additions"></span>
          <span class="deletions" id="pr-deletions"></span>
        </span>
      </div>
      <div class="pr-desc" id="pr-desc"></div>
    </div>

    <!-- Empty state -->
    <div class="pr-empty-overlay" id="pr-empty">
      <span style="font-size:32px;">👋</span>
      <span>Waiting for a PR to review...</span>
      <span style="font-size:12px;color:#334155;">Ask the agent to show a PR</span>
    </div>

    <div class="camera-error" id="camera-error" style="display:none">
      <span class="icon">📷</span>
      <span>Camera access required</span>
      <span style="font-size:12px;color:#334155;">Allow camera permissions to use gesture review</span>
    </div>
  </div>

  <div class="bottom-section">
    <div class="pr-carousel" id="pr-carousel">
      <div class="carousel-arrow" id="arrow-left">‹</div>
      <div class="carousel-card-wrap">
        <div class="carousel-card" id="carousel-card"></div>
        <div class="carousel-counter" id="carousel-counter"></div>
      </div>
      <div class="carousel-arrow" id="arrow-right">›</div>
    </div>
    <div class="status-bar" id="status-bar">Initializing camera...</div>
  </div>

<script type="module">
  // --- State ---
  let gestureDetectedStart = 0;
  let activeGesture = null;
  const HOLD_DURATION = 1500;
  let decided = false;
  let currentPR = null;

  const video = document.getElementById('video');
  const canvasOverlay = document.getElementById('canvas-overlay');
  const ctx = canvasOverlay.getContext('2d');
  const cameraWrap = document.getElementById('camera-wrap');
  const statusBar = document.getElementById('status-bar');
  const prHud = document.getElementById('pr-hud');
  const prEmpty = document.getElementById('pr-empty');
  const carouselCard = document.getElementById('carousel-card');
  const carouselCounter = document.getElementById('carousel-counter');
  const arrowLeft = document.getElementById('arrow-left');
  const arrowRight = document.getElementById('arrow-right');
  const prCarousel = document.getElementById('pr-carousel');
  const cameraError = document.getElementById('camera-error');
  const confettiCanvas = document.getElementById('confetti-canvas');
  const confettiCtx = confettiCanvas.getContext('2d');
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingText = document.getElementById('loading-text');
  const loadingBar = document.getElementById('loading-bar');

  let allPRs = [];
  let currentIndex = 0;
  let decisions = {}; // number -> 'approved' | 'rejected'
  let prLoadError = null;

  // --- SSE ---
  const es = new EventSource('/events');
  es.addEventListener('prlist', (e) => {
    allPRs = JSON.parse(e.data);
    if (allPRs.length > 0) prLoadError = null;
    // Keep index in range, then show the current PR (or auto-select the first
    // undecided one) so the drawer is usable the moment the canvas loads.
    if (currentIndex >= allPRs.length) currentIndex = 0;
    renderCarousel();
    if (!currentPR && allPRs.length > 0) {
      const firstUndecided = allPRs.findIndex(pr => !decisions[pr.number]);
      const idx = firstUndecided >= 0 ? firstUndecided : 0;
      currentIndex = idx;
      selectPR(allPRs[idx].number);
    }
  });
  es.addEventListener('pr', (e) => {
    currentPR = JSON.parse(e.data);
    // Sync index to current PR
    const idx = allPRs.findIndex(p => p.number === currentPR.number);
    if (idx >= 0) currentIndex = idx;
    showPR(currentPR);
    decided = false;
    activeGesture = null;
    gestureDetectedStart = 0;
    updateUI();
  });
  es.addEventListener('state', (e) => {
    const { state } = JSON.parse(e.data);
    if (state === 'idle') {
      decided = false;
      activeGesture = null;
      updateUI();
    }
  });
  es.addEventListener('load_error', (e) => {
    const payload = e.data ? JSON.parse(e.data) : null;
    prLoadError = payload?.message || null;
    updateUI();
  });

  function showPR(pr) {
    prEmpty.classList.add('hidden');
    prHud.classList.remove('hidden');
    document.getElementById('pr-number').textContent = '#' + pr.number;
    document.getElementById('pr-title').textContent = pr.title;
    document.getElementById('pr-author').textContent = '@' + pr.author;
    document.getElementById('pr-desc').textContent = pr.description || '';
    document.getElementById('pr-additions').textContent = '+' + (pr.additions || 0);
    document.getElementById('pr-deletions').textContent = '-' + (pr.deletions || 0);
    renderCarousel();
  }

  function renderCarousel() {
    if (allPRs.length === 0) {
      prCarousel.style.display = 'none';
      return;
    }
    prCarousel.style.display = 'flex';

    const pr = allPRs[currentIndex];
    let cls = 'carousel-card';
    if (decisions[pr.number]) cls += ' ' + decisions[pr.number];

    carouselCard.className = cls;

    // Safe DOM construction — no innerHTML to avoid injection
    carouselCard.textContent = '';
    const topRow = document.createElement('div');
    topRow.className = 'cc-top';
    const numSpan = document.createElement('span');
    numSpan.className = 'cc-number';
    numSpan.textContent = '#' + pr.number;
    const titleSpan = document.createElement('span');
    titleSpan.className = 'cc-title';
    titleSpan.textContent = pr.title;
    topRow.appendChild(numSpan);
    topRow.appendChild(titleSpan);

    const metaRow = document.createElement('div');
    metaRow.className = 'cc-meta';
    const authorSpan = document.createElement('span');
    authorSpan.className = 'author';
    authorSpan.textContent = '@' + pr.author;
    const addSpan = document.createElement('span');
    addSpan.className = 'additions';
    addSpan.textContent = '+' + (pr.additions || 0);
    const delSpan = document.createElement('span');
    delSpan.className = 'deletions';
    delSpan.textContent = '-' + (pr.deletions || 0);
    metaRow.appendChild(authorSpan);
    metaRow.appendChild(addSpan);
    metaRow.appendChild(delSpan);

    carouselCard.appendChild(topRow);
    carouselCard.appendChild(metaRow);

    carouselCounter.textContent = (currentIndex + 1) + ' / ' + allPRs.length;

    arrowLeft.className = 'carousel-arrow' + (currentIndex <= 0 ? ' disabled' : '');
    arrowRight.className = 'carousel-arrow' + (currentIndex >= allPRs.length - 1 ? ' disabled' : '');
  }

  function selectPR(number) {
    fetch('/select-pr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number })
    });
  }

  function navigateTo(index) {
    if (index < 0 || index >= allPRs.length) return;
    currentIndex = index;
    selectPR(allPRs[currentIndex].number);
  }

  arrowLeft.addEventListener('click', () => navigateTo(currentIndex - 1));
  arrowRight.addEventListener('click', () => navigateTo(currentIndex + 1));

  // --- Camera Setup ---
  function setLoadingProgress(pct, text) {
    loadingBar.style.width = pct + '%';
    if (text) loadingText.textContent = text;
  }

  async function setupCamera() {
    try {
      setLoadingProgress(10, 'Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      video.srcObject = stream;
      await video.play();
      canvasOverlay.width = video.videoWidth;
      canvasOverlay.height = video.videoHeight;
      setLoadingProgress(30, 'Loading hand detection model...');
      await initMediaPipe();
    } catch (err) {
      console.error('Camera error:', err);
      loadingOverlay.classList.add('hidden');
      cameraError.style.display = 'flex';
      statusBar.textContent = 'Camera access denied';
    }
  }

  // --- MediaPipe Hands (with timeout + error handling) ---
  function loadScript(src, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.crossOrigin = 'anonymous';
      const timer = setTimeout(() => {
        reject(new Error('Script load timeout: ' + src));
      }, timeoutMs);
      script.onload = () => { clearTimeout(timer); resolve(); };
      script.onerror = () => { clearTimeout(timer); reject(new Error('Script load failed: ' + src)); };
      document.head.appendChild(script);
    });
  }

  async function loadScriptWithFallback(sources, timeoutMs = 10000) {
    let lastErr;
    for (const src of sources) {
      try {
        await loadScript(src, timeoutMs);
        return;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error('Script load failed');
  }

  async function initMediaPipe() {
    const INIT_TIMEOUT = 30000;
    try {
      // Load MediaPipe scripts dynamically with timeout
      setLoadingProgress(40, 'Downloading hand tracking library...');
      await loadScriptWithFallback([
        'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js',
        'https://unpkg.com/@mediapipe/hands/hands.js'
      ], 15000);
      setLoadingProgress(60, 'Downloading camera utilities...');
      await loadScriptWithFallback([
        'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
        'https://unpkg.com/@mediapipe/camera_utils/camera_utils.js'
      ], 15000);

      setLoadingProgress(70, 'Initializing hand detection model...');

      const hands = new window.Hands({
        locateFile: (file) => \`https://cdn.jsdelivr.net/npm/@mediapipe/hands/\${file}\`
      });
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.5
      });
      hands.onResults(onResults);

      setLoadingProgress(85, 'Starting hand tracking...');

      // Frame throttling: process at ~15 FPS instead of every frame
      const TARGET_FPS = 15;
      const FRAME_INTERVAL = 1000 / TARGET_FPS;
      let lastFrameTime = 0;

      const camera = new window.Camera(video, {
        onFrame: async () => {
          const now = performance.now();
          if (now - lastFrameTime < FRAME_INTERVAL) return;
          lastFrameTime = now;
          await hands.send({ image: video });
        },
        width: 320,
        height: 240
      });

      // Await camera start with timeout
      await Promise.race([
        camera.start(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Camera start timeout')), INIT_TIMEOUT)
        )
      ]);

      setLoadingProgress(100, 'Ready!');
      // Hide loading overlay after brief pause so user sees "Ready!"
      setTimeout(() => loadingOverlay.classList.add('hidden'), 300);
      statusBar.textContent = 'Show thumbs up or thumbs down...';
    } catch (err) {
      console.error('MediaPipe init error:', err);
      setLoadingProgress(0);
      loadingText.textContent = 'Failed to load hand detection';
      loadingOverlay.querySelector('.loading-spinner').style.borderTopColor = '#ef4444';
      statusBar.textContent = 'Hand detection failed — try refreshing';
      // Add retry button
      const retryBtn = document.createElement('button');
      retryBtn.textContent = 'Retry';
      retryBtn.style.cssText = 'margin-top:12px;padding:8px 20px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#e2e8f0;cursor:pointer;font-family:inherit;font-size:13px;';
      retryBtn.onclick = () => {
        retryBtn.remove();
        loadingOverlay.querySelector('.loading-spinner').style.borderTopColor = '#3b82f6';
        setupCamera();
      };
      loadingOverlay.appendChild(retryBtn);
    }
  }

  function onResults(results) {
    ctx.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);

    if (decided) { updateDebug(null); return; }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const gesture = classifyGesture(landmarks);
      updateDebug(gesture);
      if (gesture) {
        handleGestureDetected(landmarks, gesture);
      } else {
        handleGestureLost();
      }
    } else {
      lastMetrics = null;
      updateDebug(null);
      handleGestureLost();
    }
  }

  function getHandCenter(landmarks) {
    // Use wrist (0) and middle finger MCP (9) midpoint as center
    const cx = (landmarks[0].x + landmarks[9].x) / 2;
    const cy = (landmarks[0].y + landmarks[9].y) / 2;
    return { x: cx * canvasOverlay.width, y: cy * canvasOverlay.height };
  }

  function getHandRadius(landmarks) {
    // Distance from wrist to middle fingertip gives hand size
    const dx = (landmarks[12].x - landmarks[0].x) * canvasOverlay.width;
    const dy = (landmarks[12].y - landmarks[0].y) * canvasOverlay.height;
    return Math.sqrt(dx * dx + dy * dy) * 0.7;
  }

  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  // Live metrics for the debug overlay; populated by classifyGesture.
  let lastMetrics = null;

  // Tunables for thumb gesture classification.
  const MIN_CURLED = 3;        // how many of the 4 non-thumb fingers must be folded
  const MIN_THUMB_EXT = 0.5;   // thumb length / hand width — thumb must be extended
  const VERT_DOMINANCE = 0.6;  // thumb direction must be at least this vertical

  function classifyGesture(landmarks) {
    const wrist = landmarks[0];

    // Rotation-invariant curl test: a finger is curled when its tip is closer
    // to the wrist than its PIP joint. Works regardless of hand orientation,
    // unlike comparing raw image-space y values.
    const fingers = [[8, 6], [12, 10], [16, 14], [20, 18]]; // [tip, pip]
    let curled = 0;
    for (const [tip, pip] of fingers) {
      if (dist(landmarks[tip], wrist) < dist(landmarks[pip], wrist)) curled++;
    }

    const thumbTip = landmarks[4];
    const thumbMCP = landmarks[2];
    const indexMCP = landmarks[5];
    const pinkyMCP = landmarks[17];

    // Hand width across the knuckles, used to normalize distances.
    const handScale = dist(indexMCP, pinkyMCP) || 1e-4;

    // Thumb must be extended: thumb length relative to hand width.
    const thumbExt = dist(thumbTip, thumbMCP) / handScale;

    // Thumb pointing direction (MCP -> tip). y grows downward, so negate.
    const dx = thumbTip.x - thumbMCP.x;
    const dy = thumbTip.y - thumbMCP.y;
    const len = Math.hypot(dx, dy) || 1e-4;
    const vertical = -dy / len;          // +1 = up, -1 = down
    const horiz = Math.abs(dx) / len;

    lastMetrics = {
      curled,
      thumbExt: +thumbExt.toFixed(2),
      vertical: +vertical.toFixed(2),
      horiz: +horiz.toFixed(2)
    };

    if (curled < MIN_CURLED) return null;       // not a fist
    if (thumbExt < MIN_THUMB_EXT) return null;  // thumb tucked, not a clear gesture

    if (vertical > VERT_DOMINANCE && vertical > horiz) return 'up';
    if (vertical < -VERT_DOMINANCE && -vertical > horiz) return 'down';
    return null;
  }

  // --- Debug overlay (toggle with 'd') ---
  let debugVisible = false;
  const debugOverlay = document.getElementById('debug-overlay');
  window.addEventListener('keydown', (e) => {
    if (e.key === 'd' || e.key === 'D') {
      debugVisible = !debugVisible;
      debugOverlay.classList.toggle('visible', debugVisible);
    }
  });

  function updateDebug(gesture) {
    if (!debugVisible) return;
    if (!lastMetrics) {
      debugOverlay.textContent = 'no hand detected';
      return;
    }
    const m = lastMetrics;
    debugOverlay.textContent =
      'gesture:  ' + (gesture || 'none') + '\\n' +
      'curled:   ' + m.curled + '/4 (need ' + MIN_CURLED + ')\\n' +
      'thumbExt: ' + m.thumbExt + ' (need ' + MIN_THUMB_EXT + ')\\n' +
      'vertical: ' + m.vertical + ' (need ' + VERT_DOMINANCE + ')\\n' +
      'horiz:    ' + m.horiz + '\\n' +
      'active:   ' + (activeGesture || 'none');
  }

  // Hysteresis: allow a few frames of gesture loss before aborting an active countdown
  let gestureLostFrames = 0;
  const MAX_LOST_FRAMES = 5;

  // Time-based stability: a gesture must be held steadily for this long before
  // the 1.5s countdown begins. Frame-rate independent (unlike a frame count).
  let candidateGesture = null;
  let candidateStart = 0;
  const MIN_STABLE_MS = 200;

  function handleGestureDetected(landmarks, gesture) {
    if (decided) return;

    gestureLostFrames = 0;

    const center = getHandCenter(landmarks);
    const radius = getHandRadius(landmarks);

    if (!activeGesture) {
      // No countdown running yet — require the gesture to be stable first.
      if (gesture !== candidateGesture) {
        candidateGesture = gesture;
        candidateStart = Date.now();
      }
      if (Date.now() - candidateStart < MIN_STABLE_MS) {
        // Show a "locking on" hint, but don't start the countdown.
        drawProgressCircle(center, radius, 0, gesture);
        cameraWrap.className = 'camera-wrap ' + (gesture === 'up' ? 'detecting-up' : 'detecting-down');
        statusBar.textContent = (gesture === 'up' ? '👍 Thumbs up' : '👎 Thumbs down') + ' — keep holding...';
        statusBar.className = 'status-bar ' + (gesture === 'up' ? 'approve-status' : 'reject-status');
        return;
      }
      // Stable long enough — start the countdown.
      activeGesture = gesture;
      gestureDetectedStart = Date.now();
    } else if (activeGesture !== gesture) {
      // Opposite/changed gesture cancels the countdown immediately and restarts candidacy.
      activeGesture = null;
      candidateGesture = gesture;
      candidateStart = Date.now();
      return;
    }

    const elapsed = Date.now() - gestureDetectedStart;
    const progress = Math.min(elapsed / HOLD_DURATION, 1);

    // Draw the progress circle around the hand
    drawProgressCircle(center, radius, progress, gesture);

    // Update border glow
    cameraWrap.className = 'camera-wrap ' + (gesture === 'up' ? 'detecting-up' : 'detecting-down');

    // Update status
    if (currentPR) {
      const remaining = Math.max(0, Math.ceil((HOLD_DURATION - elapsed) / 1000 * 10) / 10);
      if (progress < 1) {
        statusBar.textContent = (gesture === 'up' ? 'Thumbs up' : 'Thumbs down') + ' — hold ' + remaining.toFixed(1) + 's';
        statusBar.className = 'status-bar ' + (gesture === 'up' ? 'approve-status' : 'reject-status');
      } else {
        statusBar.textContent = gesture === 'up' ? 'APPROVED! ✅' : 'REJECTED! ❌';
        statusBar.className = 'status-bar ' + (gesture === 'up' ? 'approve-status' : 'reject-status') + ' final';
      }
    } else {
      statusBar.textContent = 'Show a PR first to begin reviewing';
      statusBar.className = 'status-bar';
    }

    // Trigger at 100%
    if (progress >= 1 && currentPR) {
      triggerDecision(gesture);
    }
  }

  function handleGestureLost() {
    if (decided) return;

    // Allow a few frames of gesture loss before aborting an active countdown (hysteresis)
    gestureLostFrames++;
    if (gestureLostFrames < MAX_LOST_FRAMES && activeGesture) return;

    activeGesture = null;
    candidateGesture = null;
    candidateStart = 0;
    gestureDetectedStart = 0;
    cameraWrap.className = 'camera-wrap';
    statusBar.textContent = currentPR ? 'Show thumbs up or thumbs down...' : 'Waiting for a PR...';
    statusBar.className = 'status-bar';
  }

  function drawProgressCircle(center, radius, progress, gesture) {
    const r = radius + 15;
    const color = gesture === 'up' ? '#22c55e' : '#ef4444';
    const glow = gesture === 'up' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)';
    const fill = gesture === 'up' ? '34, 197, 94' : '239, 68, 68';

    // Background circle
    ctx.beginPath();
    ctx.arc(center.x, center.y, r, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Progress arc
    if (progress > 0) {
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (2 * Math.PI * progress);

      ctx.beginPath();
      ctx.arc(center.x, center.y, r, startAngle, endAngle);
      ctx.strokeStyle = progress < 1 ? color : (gesture === 'up' ? '#4ade80' : '#f87171');
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Glow effect
      ctx.beginPath();
      ctx.arc(center.x, center.y, r, startAngle, endAngle);
      ctx.strokeStyle = glow;
      ctx.lineWidth = 12;
      ctx.stroke();
    }

    // Inner subtle fill
    ctx.beginPath();
    ctx.arc(center.x, center.y, r - 4, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(' + fill + ', ' + (0.03 + progress * 0.08) + ')';
    ctx.fill();

    // Countdown text in center (flip horizontally so text reads correctly despite mirrored canvas)
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.scale(-1, 1);
    if (progress < 1) {
      const remaining = Math.max(0, (HOLD_DURATION - (Date.now() - gestureDetectedStart)) / 1000);
      ctx.font = 'bold 28px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = gesture === 'up' ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)';
      ctx.fillText(remaining.toFixed(1), 0, -radius * 0.1);

      ctx.font = '12px JetBrains Mono, monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillText(gesture === 'up' ? 'APPROVING' : 'REJECTING', 0, radius * 0.35);
    } else {
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = gesture === 'up' ? '#4ade80' : '#f87171';
      ctx.fillText(gesture === 'up' ? '✓' : '×', 0, 0);
    }
    ctx.restore();
  }

  async function triggerDecision(gesture) {
    decided = true;
    const decision = gesture === 'up' ? 'approved' : 'rejected';

    if (currentPR) {
      decisions[currentPR.number] = decision;
    }

    if (decision === 'approved') {
      cameraWrap.className = 'camera-wrap approved';
      fireConfetti();
    } else {
      cameraWrap.className = 'camera-wrap rejected';
      prHud.classList.add('shake');
    }

    renderCarousel();

    await fetch('/gesture-decision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision })
    });

    // Auto-advance to next undecided PR after a short pause
    setTimeout(() => {
      const nextIndex = allPRs.findIndex((pr, i) => i > currentIndex && !decisions[pr.number]);
      if (nextIndex >= 0) {
        navigateTo(nextIndex);
      } else {
        // Try wrapping around
        const wrapIndex = allPRs.findIndex(pr => !decisions[pr.number]);
        if (wrapIndex >= 0) {
          navigateTo(wrapIndex);
        }
      }
    }, 1200);
  }

  function updateUI() {
    if (!decided) {
      cameraWrap.className = 'camera-wrap';
      statusBar.textContent = currentPR
        ? 'Show thumbs up or thumbs down...'
        : (prLoadError ? ('Unable to load PRs: ' + prLoadError) : 'Waiting for a PR...');
      statusBar.className = 'status-bar';
    }
  }

  // --- Confetti ---
  function fireConfetti() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    const particles = [];
    const colors = ['#22c55e', '#4ade80', '#86efac', '#fbbf24', '#f59e0b', '#0ea5e9', '#38bdf8'];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * confettiCanvas.width,
        y: -20 - Math.random() * 200,
        w: 6 + Math.random() * 6,
        h: 4 + Math.random() * 4,
        vx: (Math.random() - 0.5) * 6,
        vy: 2 + Math.random() * 4,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 1
      });
    }

    let frame = 0;
    function animate() {
      frame++;
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      let alive = false;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.rotation += p.rotSpeed;
        if (frame > 60) p.opacity -= 0.015;
        if (p.opacity <= 0) continue;
        alive = true;

        confettiCtx.save();
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate((p.rotation * Math.PI) / 180);
        confettiCtx.globalAlpha = p.opacity;
        confettiCtx.fillStyle = p.color;
        confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        confettiCtx.restore();
      }

      if (alive) requestAnimationFrame(animate);
    }
    animate();
  }

  // --- Init ---
  setupCamera();
</script>
</body>
</html>`;
}
