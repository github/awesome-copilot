import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CanvasError, createCanvas, joinSession } from "@github/copilot-sdk/extension";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gameRoot = path.join(__dirname, "game");
const assetsRoot = path.join(__dirname, "assets");
const indexPath = path.join(gameRoot, "index.html");
const gameJsPath = path.join(gameRoot, "game.js");
const alienOnslaughtJsPath = path.join(gameRoot, "scenes", "AlienOnslaught.js");
const galaxyBlasterJsPath = path.join(gameRoot, "scenes", "GalaxyBlaster.js");

const games = [
    { key: "cosmic-rocks", label: "Cosmic Rocks", icon: "☄️" },
    { key: "alien-onslaught", label: "Alien Onslaught", icon: "👾" },
    { key: "galaxy-blaster", label: "Galaxy Blaster", icon: "🚀" },
    { key: "ninja-runner", label: "Ninja Runner", icon: "🥷" },
    { key: "defender", label: "Planet Guardian", icon: "🛡️" },
];

const gameKeys = new Set(games.map((game) => game.key));
const defaultGame = "ninja-runner";
const canvasBackgroundGames = ["cosmic-rocks", "alien-onslaught", "galaxy-blaster", "defender"];
const servers = new Map();

function normalizeGameKey(value) {
    return typeof value === "string" && gameKeys.has(value) ? value : defaultGame;
}

function contentType(filePath) {
    switch (path.extname(filePath).toLowerCase()) {
        case ".html":
            return "text/html; charset=utf-8";
        case ".js":
            return "text/javascript; charset=utf-8";
        case ".css":
            return "text/css; charset=utf-8";
        case ".json":
            return "application/json; charset=utf-8";
        case ".png":
            return "image/png";
        case ".webp":
            return "image/webp";
        case ".xml":
            return "application/xml; charset=utf-8";
        case ".mp3":
            return "audio/mpeg";
        case ".ogg":
            return "audio/ogg";
        case ".m4a":
            return "audio/mp4";
        case ".wav":
            return "audio/wav";
        default:
            return "application/octet-stream";
    }
}

function resolveUnder(root, requestPath) {
    const resolved = path.resolve(root, `.${requestPath}`);
    if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
        throw new CanvasError("invalid_path", "Requested path is outside the arcade assets.");
    }
    return resolved;
}

function sendJson(res, value) {
    res.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
    });
    res.end(JSON.stringify(value));
}

function sendNotFound(res) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
}

function sendSse(res, event, data) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function broadcast(entry, event, data) {
    for (const client of entry.clients) {
        sendSse(client, event, data);
    }
}

async function renderIndex(entry) {
    const html = await readFile(indexPath, "utf8");
    const bootstrap = `<script>
(() => {
  const selectedGame = ${JSON.stringify(entry.selectedGame)};
  const games = ${JSON.stringify(games)};
  const canvasBackgroundGames = ${JSON.stringify(canvasBackgroundGames)};
  let switchingGames = false;
  try {
    localStorage.setItem("agentArcade_pauseKey", "Escape");
    localStorage.setItem("agentArcade_unpauseKey", "Ctrl+Escape");
  } catch {}

  function storeGame(gameKey) {
    try { localStorage.setItem("agentArcade_lastGame", gameKey); } catch {}
  }

  function selectGame(gameKey) {
    if (!games.some((game) => game.key === gameKey)) return;
    storeGame(gameKey);
    applyCanvasBackdrop(gameKey);
    setTimeout(() => applyCanvasBackdrop(gameKey), 150);
    const selector = document.getElementById("game-select");
    if (selector) selector.value = gameKey;
    if (window.__agentArcadeSwitchGame) {
      markSwitchingGame();
      window.__agentArcadeSwitchGame(gameKey);
      return;
    }
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (window.__agentArcadeSwitchGame) {
        clearInterval(timer);
        markSwitchingGame();
        window.__agentArcadeSwitchGame(gameKey);
      } else if (attempts > 40) {
        clearInterval(timer);
      }
    }, 100);
  }

  function applyCanvasBackdrop(gameKey) {
    try {
      const useSpaceBackground = canvasBackgroundGames.includes(gameKey);
      document.body.classList.toggle("canvas-space-background", useSpaceBackground);
      localStorage.setItem("agentArcade_bgDefault_v2", "1");
      localStorage.setItem("agentArcade_bgTransparency", useSpaceBackground ? "0" : "100");
      const scenes = window.__phaserGame?.scene?.scenes ?? [];
      for (const scene of scenes) {
        if (typeof scene.setBackdropAlpha === "function") {
          scene.setBackdropAlpha(useSpaceBackground ? 0 : 100);
        }
        scene._backdrop?.setAlpha?.(useSpaceBackground ? 0 : 1);
      }
    } catch {}
  }

  function isHudOverlayOpen() {
    return document.getElementById("settings-overlay")?.classList.contains("show")
      || document.getElementById("help-overlay")?.classList.contains("show");
  }

  function isTextInput(target) {
    const el = target;
    return !!el?.closest?.("input, textarea, select, [contenteditable='true']");
  }

  function markSwitchingGame() {
    switchingGames = true;
    setTimeout(() => { switchingGames = false; }, 600);
  }

  function pauseCanvas() {
    if (document.body.classList.contains("paused")) return;
    window.__agentArcadePauseScene?.(true);
    document.getElementById("hud")?.classList.add("paused");
    document.body.classList.add("paused");
    document.getElementById("gameover-overlay")?.style.setProperty("display", "none");
    document.getElementById("wave-banner")?.style.setProperty("display", "none");
    document.getElementById("help-overlay")?.classList.remove("show");
    document.getElementById("ready-overlay")?.remove();
  }

  function resumeCanvas() {
    if (!document.body.classList.contains("paused") && !document.getElementById("hud")?.classList.contains("paused")) return;
    if (!switchingGames) {
      window.__agentArcadePauseScene?.(false);
    }
    document.getElementById("hud")?.classList.remove("paused");
    document.body.classList.remove("paused");
    setTimeout(() => document.querySelector("#game canvas")?.focus?.(), 50);
  }

  window.agentArcade = {
    setClickThrough: () => {},
    setPaused: (paused) => paused ? pauseCanvas() : resumeCanvas(),
    onResumeRequest: () => {},
    quitApp: () => {},
    hideApp: () => {},
  };

  function handleCanvasHotkey(event) {
    if (event.__agentArcadeCanvasHandled) return;
    if (event.code !== "Escape" || isTextInput(event.target) || isHudOverlayOpen()) return;
    event.__agentArcadeCanvasHandled = true;
    if (event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
      event.preventDefault();
      event.stopPropagation();
      resumeCanvas();
      return;
    }
    if (!event.altKey && !event.metaKey) {
      event.preventDefault();
      event.stopPropagation();
      pauseCanvas();
    }
  }

  window.addEventListener("keydown", handleCanvasHotkey, true);
  document.addEventListener("keydown", handleCanvasHotkey, true);

  document.getElementById("resume-btn")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    resumeCanvas();
  }, true);

  document.getElementById("game-select")?.addEventListener("change", () => {
    markSwitchingGame();
  }, true);

  storeGame(selectedGame);
  applyCanvasBackdrop(selectedGame);
  setTimeout(() => selectGame(selectedGame), 300);
  setTimeout(() => applyCanvasBackdrop(selectedGame), 800);

  const style = document.createElement("style");
  style.textContent = \`
    html, body, body.paused, #game {
      background-color: #02040d !important;
    }
    body.canvas-space-background,
    body.canvas-space-background.paused,
    body.canvas-space-background #game {
      background-image:
        radial-gradient(circle at 50% 35%, rgba(18, 34, 88, 0.35), rgba(2, 4, 13, 0.18) 42%, rgba(2, 4, 13, 0.78) 100%),
        url('/assets/canvas-background.webp') !important;
      background-position: center, center !important;
      background-repeat: no-repeat, no-repeat !important;
      background-size: cover, cover !important;
    }
    canvas { background: transparent !important; }
    #bg-transparency { display: none !important; }
    #bg-transparency-value::before { content: 'Canvas backdrop'; }
    #bg-transparency-value { font-size: 0 !important; }
    #bg-transparency-value::before { font-size: 12px !important; }
    #hud { top: 12px !important; max-width: calc(100vw - 32px); gap: 12px !important; transform: translateX(-50%); transform-origin: top center; }
    #minimize-btn, #close-btn, #drag-handle { display: none !important; }
    #update-banner { display: none !important; }
    @media (max-width: 760px) {
      #hud { left: 12px !important; right: 12px !important; transform: none !important; justify-content: center; flex-wrap: wrap; white-space: normal !important; }
      .hud-divider, .hud-spacer { display: none !important; }
    }
  \`;
  document.head.appendChild(style);

  window.__agentArcadeCanvasSelectGame = selectGame;
  window.__agentArcadeCanvasGames = games;

  const events = new EventSource("/events");
  events.addEventListener("selectGame", (event) => {
    try { selectGame(JSON.parse(event.data).gameKey); } catch {}
  });
  events.addEventListener("reload", () => window.location.reload());
})();
</script>`;
    return html.replace('<script src="./hud.js"></script>', `${bootstrap}\n  <script src="./hud.js"></script>`);
}

async function renderGameJs() {
    const js = await readFile(gameJsPath, "utf8");
    return js
        .replaceAll("newW > 800 && newH > 400", "newW > 320 && newH > 220")
        .replaceAll("game && newH > 400", "game && newH > 220")
        .replaceAll("window.innerWidth > 800 && window.innerHeight > 400", "window.innerWidth > 320 && window.innerHeight > 220");
}

async function renderAlienOnslaughtJs() {
    const js = await readFile(alienOnslaughtJsPath, "utf8");
    const layoutH = "Math.min(H, W * 3 / 4)";
    const layoutY = `((H - ${layoutH}) / 2)`;
    return js
        .replace("this.playerY = H * 0.92;", `this.playerY = ${layoutY} + ${layoutH} * 0.95;`)
        .replace("this.alienGridY = Math.max(H * 0.20, 120);", `this.alienGridY = Math.max(${layoutY} + ${layoutH} * 0.10, 80);`)
        .replace("const targetShieldH = H * 0.055;", `const targetShieldH = ${layoutH} * 0.065;`)
        .replace("SCALE = Math.min(W / 1920, H / 1080);", "SCALE = Math.max(1.25, Math.min(W / 1920, H / 1080));")
        .replace("this.alienCellW = Math.round(W * 0.055);", "this.alienCellW = Math.round(W * 0.068);");
}

async function renderGalaxyBlasterJs() {
    const js = await readFile(galaxyBlasterJsPath, "utf8");
    return js
        .replaceAll("SCALE = Math.min(CONV_X, CONV_Y);", "SCALE = Math.max(1.7, Math.min(CONV_X, CONV_Y));")
        .replaceAll("OPPONENT_SIZE = Math.min(32 * SCALE, W / 35);", "OPPONENT_SIZE = Math.max(54, Math.min(32 * SCALE, W / 24));");
}

async function streamFile(res, filePath) {
    const fileStat = await stat(filePath).catch(() => undefined);
    if (!fileStat?.isFile()) {
        sendNotFound(res);
        return;
    }

    res.writeHead(200, {
        "content-type": contentType(filePath),
        "cache-control": "no-cache",
    });
    const stream = createReadStream(filePath);
    stream.on("error", () => {
        if (!res.headersSent) {
            sendNotFound(res);
        } else {
            res.destroy();
        }
    });
    stream.pipe(res);
}

async function handleSelectGame(entry, req, res) {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
        body += chunk;
    });
    req.on("end", () => {
        let input;
        try {
            input = JSON.parse(body || "{}");
        } catch {
            res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
            res.end("Invalid JSON request body");
            return;
        }
        entry.selectedGame = normalizeGameKey(input.gameKey);
        broadcast(entry, "selectGame", { gameKey: entry.selectedGame });
        sendJson(res, { selectedGame: entry.selectedGame });
    });
}

async function handleRequest(entry, req, res) {
    const url = new URL(req.url ?? "/", entry.url);

    if (url.pathname === "/events") {
        res.writeHead(200, {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-cache",
            connection: "keep-alive",
        });
        entry.clients.add(res);
        sendSse(res, "selectGame", { gameKey: entry.selectedGame });
        req.on("close", () => entry.clients.delete(res));
        return;
    }

    if (url.pathname === "/state") {
        sendJson(res, { games, selectedGame: entry.selectedGame });
        return;
    }

    if (url.pathname === "/favicon.ico") {
        await streamFile(res, path.join(assetsRoot, "icon.png"));
        return;
    }

    if (url.pathname === "/select-game" && req.method === "POST") {
        await handleSelectGame(entry, req, res);
        return;
    }

    try {
        if (url.pathname === "/" || url.pathname === "/index.html" || url.pathname === "/game" || url.pathname === "/game/") {
            res.writeHead(200, {
                "content-type": "text/html; charset=utf-8",
                "cache-control": "no-cache",
            });
            res.end(await renderIndex(entry));
            return;
        }

        if (url.pathname === "/game.js" || url.pathname === "/game/game.js") {
            res.writeHead(200, {
                "content-type": "text/javascript; charset=utf-8",
                "cache-control": "no-cache",
            });
            res.end(await renderGameJs());
            return;
        }

        if (url.pathname === "/scenes/AlienOnslaught.js" || url.pathname === "/game/scenes/AlienOnslaught.js") {
            res.writeHead(200, {
                "content-type": "text/javascript; charset=utf-8",
                "cache-control": "no-cache",
            });
            res.end(await renderAlienOnslaughtJs());
            return;
        }

        if (url.pathname === "/scenes/GalaxyBlaster.js" || url.pathname === "/game/scenes/GalaxyBlaster.js") {
            res.writeHead(200, {
                "content-type": "text/javascript; charset=utf-8",
                "cache-control": "no-cache",
            });
            res.end(await renderGalaxyBlasterJs());
            return;
        }

        const staticPath = url.pathname.startsWith("/assets/")
            ? resolveUnder(assetsRoot, url.pathname.slice("/assets".length))
            : resolveUnder(gameRoot, url.pathname.startsWith("/game/") ? url.pathname.slice("/game".length) : url.pathname);
        await streamFile(res, staticPath);
    } catch (error) {
        if (error instanceof CanvasError) {
            res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
            res.end(error.message);
            return;
        }
        throw error;
    }
}

async function startServer(instanceId, selectedGame) {
    const entry = {
        clients: new Set(),
        selectedGame,
        server: undefined,
        url: undefined,
    };
    const server = createServer((req, res) => {
        handleRequest(entry, req, res).catch((error) => {
            res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
            res.end(error instanceof Error ? error.message : "Arcade canvas server error");
        });
    });
    entry.server = server;

    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    entry.url = `http://127.0.0.1:${port}/`;
    servers.set(instanceId, entry);
    return entry;
}

function getOpenEntry(instanceId) {
    const entry = servers.get(instanceId);
    if (!entry) {
        throw new CanvasError("arcade_not_open", "Open the Arcade canvas before invoking this action.");
    }
    return entry;
}

await joinSession({
    canvases: [
        createCanvas({
            id: "arcade-canvas",
            displayName: "Agent Arcade",
            description: "A retro arcade canvas with five mini-games for waiting while agents work.",
            inputSchema: {
                type: "object",
                properties: {
                    defaultGame: {
                        type: "string",
                        enum: games.map((game) => game.key),
                        description: "Game to show first.",
                    },
                },
                additionalProperties: false,
            },
            actions: [
                {
                    name: "list_games",
                    description: "List the mini-games available in the arcade canvas.",
                    handler: (ctx) => {
                        const entry = servers.get(ctx.instanceId);
                        return {
                            games,
                            selectedGame: entry?.selectedGame ?? defaultGame,
                        };
                    },
                },
                {
                    name: "select_game",
                    description: "Switch the open arcade canvas to a specific mini-game.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            gameKey: {
                                type: "string",
                                enum: games.map((game) => game.key),
                            },
                        },
                        required: ["gameKey"],
                        additionalProperties: false,
                    },
                    handler: (ctx) => {
                        const entry = getOpenEntry(ctx.instanceId);
                        entry.selectedGame = normalizeGameKey(ctx.input?.gameKey);
                        broadcast(entry, "selectGame", { gameKey: entry.selectedGame });
                        return {
                            selectedGame: entry.selectedGame,
                        };
                    },
                },
                {
                    name: "restart_game",
                    description: "Reload the open arcade canvas to restart the selected game.",
                    handler: (ctx) => {
                        const entry = getOpenEntry(ctx.instanceId);
                        broadcast(entry, "reload", {});
                        return {
                            selectedGame: entry.selectedGame,
                        };
                    },
                },
            ],
            open: async (ctx) => {
                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    entry = await startServer(ctx.instanceId, normalizeGameKey(ctx.input?.defaultGame));
                } else if (ctx.input?.defaultGame) {
                    entry.selectedGame = normalizeGameKey(ctx.input.defaultGame);
                }
                return {
                    title: "Agent Arcade",
                    status: games.find((game) => game.key === entry.selectedGame)?.label ?? "Ready",
                    url: entry.url,
                };
            },
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (!entry) return;

                servers.delete(ctx.instanceId);
                for (const client of entry.clients) {
                    client.end();
                }
                await new Promise((resolve) => entry.server.close(() => resolve()));
            },
        }),
    ],
});
