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

const games = [
    { key: "cosmic-rocks", label: "Cosmic Rocks", icon: "☄️" },
    { key: "alien-onslaught", label: "Alien Onslaught", icon: "👾" },
    { key: "galaxy-blaster", label: "Galaxy Blaster", icon: "🚀" },
    { key: "ninja-runner", label: "Ninja Runner", icon: "🥷" },
    { key: "defender", label: "Planet Guardian", icon: "🛡️" },
];

const gameKeys = new Set(games.map((game) => game.key));
const defaultGame = "ninja-runner";
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

  function storeGame(gameKey) {
    try { localStorage.setItem("agentArcade_lastGame", gameKey); } catch {}
  }

  function selectGame(gameKey) {
    if (!games.some((game) => game.key === gameKey)) return;
    storeGame(gameKey);
    const selector = document.getElementById("game-select");
    if (selector) selector.value = gameKey;
    if (window.__agentArcadeSwitchGame) {
      window.__agentArcadeSwitchGame(gameKey);
      return;
    }
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (window.__agentArcadeSwitchGame) {
        clearInterval(timer);
        window.__agentArcadeSwitchGame(gameKey);
      } else if (attempts > 40) {
        clearInterval(timer);
      }
    }, 100);
  }

  storeGame(selectedGame);
  setTimeout(() => selectGame(selectedGame), 300);

  const style = document.createElement("style");
  style.textContent = \`
    html, body { background: var(--background-color-default, #050814) !important; }
    #hud { top: 12px !important; max-width: calc(100vw - 32px); gap: 12px !important; transform: translateX(-50%) scale(0.92); transform-origin: top center; }
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
