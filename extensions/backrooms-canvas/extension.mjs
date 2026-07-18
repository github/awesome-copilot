/**
 * Copilot canvas entry point for BackViews.
 *
 * The game itself is the prebuilt browser bundle at game/webview.js (an
 * esbuild IIFE that already carries the WebGL renderer, the procedural maze
 * engine, and the whole first-person world). This file is only the host: a
 * tiny local HTTP server that serves that bundle plus its photo materials,
 * and a canvas registration that lets an agent drive the game through actions.
 *
 * The bundle was written for a VSCode webview and talks to its host through
 * `acquireVsCodeApi()` + `window.postMessage`. game/index.html shims that API
 * against this server's Server-Sent Events stream, so the same bundle runs
 * unchanged inside the canvas. The message shapes below match the bundle's
 * expectations exactly (see the original src/shared/settings.ts):
 *
 *   host -> game :  { type: 'config',      settings }
 *                   { type: 'jobStatus',   job }        // CopilotJob
 *                   { type: 'chatSession', session }     // ChatSessionSnapshot
 *                   { type: 'relocate' }
 *   game -> host :  { type: 'ready' }                    // handled in the shim
 *                   { type: 'updateSetting', key, value } // handled in the shim
 */
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CanvasError, createCanvas, joinSession } from "@github/copilot-sdk/extension";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gameRoot = path.join(__dirname, "game");
const materialsRoot = path.join(__dirname, "materials");
const assetsRoot = path.join(__dirname, "assets");
const indexPath = path.join(gameRoot, "index.html");

/**
 * Default settings, mirrored from the bundle's own DEFAULT_SETTINGS. The shim
 * merges any per-open overrides and the player's saved menu choices on top of
 * these before handing the game its first `config` message.
 */
const DEFAULT_SETTINGS = {
    seed: 0,
    moveSpeed: 2.2,
    renderDistance: 14,
    cameraShake: true,
    filmGrain: true,
    vhsHud: true,
    furniture: true,
    wallpaperShifts: false,
    mouseLook: true,
    invertTurn: false,
    invertStrafe: false,
    invertForward: false,
    materialPreset: "classic",
    materialHueShift: 0,
    materialBrightness: 1,
    monsterEnabled: true,
    monsterSpeed: 2.6,
    monsterSpawnMin: 1,
    monsterSpawnMax: 5,
    monsterForm: "random",
    copilotGhostWriter: true,
};

const MATERIAL_PRESETS = ["classic", "office", "pool", "concrete", "panel"];
const MONSTER_FORMS = ["spider", "humanoid", "cloud", "random"];

/** Idle Copilot job; the walls stay quiet and the HUD counter fades out. */
const IDLE_JOB = { working: false, status: "", tokens: 0 };

const servers = new Map();

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
        case ".map":
            return "application/json; charset=utf-8";
        case ".png":
            return "image/png";
        case ".jpg":
        case ".jpeg":
            return "image/jpeg";
        case ".svg":
            return "image/svg+xml";
        case ".webp":
            return "image/webp";
        default:
            return "application/octet-stream";
    }
}

/** Resolves a request path under a root, refusing anything that escapes it. */
function resolveUnder(root, requestPath) {
    const resolved = path.resolve(root, `.${requestPath}`);
    if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
        throw new CanvasError("invalid_path", "Requested path is outside the backrooms assets.");
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

function randomSeed() {
    return Math.floor(Math.random() * 999_999) + 1;
}

/** Coerces one enum-ish value, falling back to the default when unknown. */
function pickEnum(value, allowed, fallback) {
    return typeof value === "string" && allowed.includes(value) ? value : fallback;
}

/** Coerces a finite number into [min, max], or returns the fallback. */
function clampNumber(value, min, max, fallback) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return fallback;
    }
    return Math.min(max, Math.max(min, value));
}

/**
 * Turns arbitrary open-input into a partial settings override the shim can
 * merge over the defaults. Only the settings that make sense to preset from an
 * agent are honored; everything else stays on its default or saved value.
 */
function normalizeOverrides(input) {
    const overrides = {};
    if (!input || typeof input !== "object") {
        return overrides;
    }
if (input.seed !== undefined) {
        const seed = Math.trunc(clampNumber(input.seed, 0, Number.MAX_SAFE_INTEGER, 0));
        overrides.seed = seed === 0 ? randomSeed() : seed;
    }
    if (input.materialPreset !== undefined) {
        overrides.materialPreset = pickEnum(input.materialPreset, MATERIAL_PRESETS, "classic");
    }
    if (input.monsterEnabled !== undefined) {
        overrides.monsterEnabled = input.monsterEnabled === true;
    }
    if (input.monsterForm !== undefined) {
        overrides.monsterForm = pickEnum(input.monsterForm, MONSTER_FORMS, "random");
    }
    if (input.copilotGhostWriter !== undefined) {
        overrides.copilotGhostWriter = input.copilotGhostWriter !== false;
    }
    return overrides;
}

/** Coerces report_job input into a CopilotJob the game understands. */
function normalizeJob(input) {
    if (!input || typeof input !== "object") {
        return { ...IDLE_JOB };
    }
    const done = input.done === true;
    return {
        working: !done,
        status: typeof input.status === "string" ? input.status.slice(0, 120) : "",
        tokens:
            typeof input.tokens === "number" && Number.isFinite(input.tokens)
                ? Math.max(0, Math.floor(input.tokens))
                : 0,
    };
}

/**
 * Coerces ghost_write input into a ChatSessionSnapshot. The game ghost-writes
 * `current` onto the wall ahead as it grows, and the token count drives the
 * HUD odometer. `done` settles the writing in place and stops the counter.
 */
function normalizeSession(input) {
    const text = typeof input?.text === "string" ? input.text : "";
    const done = input?.done === true;
    const tokens =
        typeof input?.tokens === "number" && Number.isFinite(input.tokens)
            ? Math.max(0, Math.floor(input.tokens))
            : Math.ceil(text.length / 4);
    return { working: !done && text.length > 0, history: [], current: text, tokens };
}

async function renderIndex(entry) {
    const html = await readFile(indexPath, "utf8");
    // Handed to the shim so it can build the game's first `config` message and
    // replay any job that is already running when the panel opens.
    const init = {
        defaults: DEFAULT_SETTINGS,
        overrides: entry.overrides,
        materials: {
            wallpaper: "/materials/wallpaper.jpg",
            ceiling: "/materials/ceiling.jpg",
            carpet: "/materials/carpet.jpg",
        },
        job: entry.job,
        session: entry.session,
    };
return html.replace("__BACKROOMS_INIT__", JSON.stringify(init).replace(/</g, "\\u003c"));
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

async function handleRequest(entry, req, res) {
    const url = new URL(req.url ?? "/", entry.url);

    if (url.pathname === "/events") {
        res.writeHead(200, {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-cache",
            connection: "keep-alive",
        });
        entry.clients.add(res);
        // Catch a fresh (or reconnecting) client up to the live state.
        sendSse(res, "jobStatus", { job: entry.job });
        if (entry.session) {
            sendSse(res, "chatSession", { session: entry.session });
        }
        req.on("close", () => entry.clients.delete(res));
        return;
    }

    if (url.pathname === "/favicon.ico") {
        await streamFile(res, path.join(assetsRoot, "icon.png"));
        return;
    }

    try {
        if (url.pathname === "/" || url.pathname === "/index.html") {
            res.writeHead(200, {
                "content-type": "text/html; charset=utf-8",
                "cache-control": "no-cache",
            });
            res.end(await renderIndex(entry));
            return;
        }

        const staticPath = url.pathname.startsWith("/materials/")
            ? resolveUnder(materialsRoot, url.pathname.slice("/materials".length))
            : url.pathname.startsWith("/assets/")
              ? resolveUnder(assetsRoot, url.pathname.slice("/assets".length))
              : resolveUnder(gameRoot, url.pathname);
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

async function startServer(instanceId, overrides) {
    const entry = {
        clients: new Set(),
        overrides,
        job: { ...IDLE_JOB },
        session: null,
        server: undefined,
        url: undefined,
    };
    const server = createServer((req, res) => {
        handleRequest(entry, req, res).catch((error) => {
            res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
            res.end(error instanceof Error ? error.message : "Backrooms canvas server error");
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
        throw new CanvasError("backrooms_not_open", "Open the Backrooms canvas before invoking this action.");
    }
    return entry;
}

await joinSession({
    canvases: [
        createCanvas({
            id: "backrooms-canvas",
            displayName: "BackViews",
            description:
                "An endless first-person backrooms to wander while agents work. The agent's status ghost-writes on the walls.",
            inputSchema: {
                type: "object",
                properties: {
                    seed: {
                        type: "number",
                        description: "Maze seed. The same seed always rebuilds the same halls. 0 rolls a random seed.",
                    },
                    materialPreset: {
                        type: "string",
                        enum: MATERIAL_PRESETS,
                        description: "Wall material set to start with.",
                    },
                    monsterEnabled: {
                        type: "boolean",
                        description: "Whether something else walks the halls.",
                    },
                },
                additionalProperties: false,
            },
            actions: [
                {
                    name: "report_job",
                    description:
                        "Report your current job status to the backrooms. Call it when you start a chat request, again on each new step, and once more with done=true when finished. The status text is scrawled on the walls and the token count drives a camcorder-style HUD counter.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            status: {
                                type: "string",
                                description:
                                    "Short status text to scrawl on the walls (e.g. 'reading the codebase', 'rewriting the parser').",
                            },
                            tokens: {
                                type: "number",
                                description: "Approximate tokens consumed by the current job so far.",
                            },
                            done: {
                                type: "boolean",
                                description: "Set true when the job is finished; the walls stop updating and the counter fades out.",
                            },
                        },
                        required: ["status"],
                        additionalProperties: false,
                    },
                    handler: (ctx) => {
                        const entry = getOpenEntry(ctx.instanceId);
                        entry.job = normalizeJob(ctx.input);
                        broadcast(entry, "jobStatus", { job: entry.job });
                        return { job: entry.job };
                    },
                },
                {
                    name: "ghost_write",
                    description:
                        "Ghost-write a block of text onto the walls ahead, character by character as it grows, like a streaming chat response. Call repeatedly with the full text so far, then once with done=true to settle it in place.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            text: {
                                type: "string",
                                description: "The full response text so far. Send the growing text on each call; the walls reveal the new characters.",
                            },
                            tokens: {
                                type: "number",
                                description: "Approximate tokens of the response so far. Defaults to text length / 4.",
                            },
                            done: {
                                type: "boolean",
                                description: "Set true when the response is complete; the writing settles onto the wall and the counter stops.",
                            },
                        },
                        required: ["text"],
                        additionalProperties: false,
                    },
                    handler: (ctx) => {
                        const entry = getOpenEntry(ctx.instanceId);
                        entry.session = normalizeSession(ctx.input);
                        broadcast(entry, "chatSession", { session: entry.session });
                        return { working: entry.session.working, tokens: entry.session.tokens };
                    },
                },
                {
                    name: "relocate",
                    description: "Drop the wanderer into a fresh random seed, wiping any writing already on the walls.",
                    handler: (ctx) => {
                        const entry = getOpenEntry(ctx.instanceId);
                        const seed = randomSeed();
                        broadcast(entry, "relocate", { seed });
                        return { seed };
                    },
                },
            ],
            open: async (ctx) => {
                const overrides = normalizeOverrides(ctx.input);
                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    entry = await startServer(ctx.instanceId, overrides);
                } else {
                    entry.overrides = { ...entry.overrides, ...overrides };
                }
                return {
                    title: "BackViews",
                    status: entry.job.working && entry.job.status ? entry.job.status : "Wandering",
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
