/**
 * Copilot canvas entry point for Flight Map.
 *
 * The simulator itself is the same page the VS Code extension ships: a
 * plain Three.js document under game/ that loads satellite tiles, flies a
 * first-person camera over them, and reads its render configuration off
 * `window.__flightMapConfig`. This file is only the host. It runs a
 * loopback HTTP server that serves that page, and registers a canvas so
 * an agent can steer the flight and report what it is working on.
 *
 * The page carries a `<!--{{HOST_HEAD}}-->` placeholder that each host
 * fills with whatever only it can supply. The VS Code panel puts a
 * content security policy, webview asset URIs, and the render config
 * there. This server puts a policy, the render config, and a shim that
 * stands in for `acquireVsCodeApi()`, so the page runs unchanged in both.
 *
 * Messages the shim relays, matching the commands the page already
 * registers through media/hostBridge.js:
 *
 *   host -> page :  { command: 'flyTo',     destination }
 *                   { command: 'jobStatus', job }
 *   page -> host :  { command: 'ready' }
 *                   { command: 'exportConfig', json }   // handled in the shim
 */
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

import { CanvasError, createCanvas, joinSession } from "@github/copilot-sdk/extension";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gameRoot = path.join(__dirname, "game");
const assetsRoot = path.join(__dirname, "assets");
const indexPath = path.join(gameRoot, "index.html");

/** Idle agent job; the status strip hides itself. */
const IDLE_JOB = { working: false, status: "", tokens: 0 };

/**
 * Nominatim asks every client to identify itself. The canvas makes at most
 * one lookup per fly_to, well inside the one-request-per-second policy.
 */
const USER_AGENT = "flight-map-canvas (https://github.com/isocialPractice/vscode-flight-map)";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";

/**
 * The tile imagery the page flies over is Web Mercator, which runs out of
 * projection at about 85.0511 degrees. Past that there are no tiles to
 * fetch, so a latitude beyond it is rejected rather than flown to a blank.
 */
const MAX_LATITUDE = 85.0511;

const servers = new Map();

/**
 * The capitals the page ships with, read out of its own data file rather
 * than duplicated here. game/capitals.js is a plain script that assigns
 * one `var`, so evaluating it and returning that binding keeps this
 * server and the page reading from a single list.
 */
const CAPITALS = await (async () => {
    const source = await readFile(path.join(gameRoot, "capitals.js"), "utf8");
    const regions = new Function(`${source}\nreturn CAPITALS_BY_REGION;`)();
    return regions.flatMap((region) =>
        region.capitals.map((capital) => ({ ...capital, region: region.region })),
    );
})();

/** The render configuration the page starts on, or defaults when absent. */
async function readRenderConfig() {
    try {
        return JSON.parse(await readFile(path.join(__dirname, "renderMap.json"), "utf8"));
    } catch {
        // Missing or malformed: the page falls back to its own defaults
        return {};
    }
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
        throw new CanvasError("invalid_path", "Requested path is outside the flight map assets.");
    }
    return resolved;
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

/* ============================================================
   Destination resolution
   ============================================================ */

function normalizeText(value) {
    return typeof value === "string" ? value.trim() : "";
}

function randomCapital() {
    return CAPITALS[Math.floor(Math.random() * CAPITALS.length)];
}

function asDestination(capital) {
    return {
        capital: capital.capital,
        country: capital.country,
        lat: capital.lat,
        lng: capital.lng,
        label: `${capital.capital}, ${capital.country}`,
    };
}

/** Matches a name against the shipped capitals, by city or by country. */
function findCapital(name) {
    const needle = name.toLowerCase();
    return (
        CAPITALS.find((c) => c.capital.toLowerCase() === needle) ??
        CAPITALS.find((c) => c.country.toLowerCase() === needle) ??
        CAPITALS.find((c) => c.capital.toLowerCase().includes(needle)) ??
        CAPITALS.find((c) => c.country.toLowerCase().includes(needle))
    );
}

/**
 * Forward geocodes typed fields the same way the page's own destination
 * dialog does: structured Nominatim parameters rather than one
 * concatenated string, so a city that also exists elsewhere does not
 * outrank the intended match.
 */
async function geocode(fields) {
    const params = new URLSearchParams({ format: "jsonv2", addressdetails: "1", limit: "1" });
    for (const key of ["city", "state", "country"]) {
        if (fields[key]) params.set(key, fields[key]);
    }

    let response;
    try {
        response = await fetch(`${NOMINATIM}?${params}`, {
            headers: { "user-agent": USER_AGENT, accept: "application/json" },
        });
    } catch (error) {
        throw new CanvasError("geocode_unreachable", `Could not reach the geocoding service: ${error.message}`);
    }

    if (!response.ok) {
        throw new CanvasError("geocode_failed", `Geocoding failed with status ${response.status}.`);
    }

    const [match] = await response.json();
    if (!match) {
        return null;
    }

    const address = match.address ?? {};
    const city = address.city || address.town || address.village || address.municipality || match.name;
    const state = address.state || address.province || address.region || address.county;
    const code = address.country_code ? address.country_code.toUpperCase() : "";
    const label = [state, city && city !== state ? city : null, code].filter(Boolean).join(", ");

    return {
        capital: city || "Destination",
        country: address.country || "",
        lat: Number.parseFloat(match.lat),
        lng: Number.parseFloat(match.lon),
        label: label || match.display_name,
    };
}

/**
 * Turns fly_to / open input into a destination the page can load.
 *
 *   lat + lng          flown to directly
 *   capital            matched against the shipped capitals
 *   city/state/country geocoded
 *   nothing            a random capital, so "take me somewhere" works
 */
async function resolveDestination(input) {
    const fields = {
        capital: normalizeText(input?.capital),
        city: normalizeText(input?.city),
        state: normalizeText(input?.state),
        country: normalizeText(input?.country),
    };

    const lat = typeof input?.lat === "number" ? input.lat : undefined;
    const lng = typeof input?.lng === "number" ? input.lng : undefined;

    if (lat !== undefined || lng !== undefined) {
        if (lat === undefined || lng === undefined) {
            throw new CanvasError("incomplete_coordinates", "Give both lat and lng, or neither.");
        }
        if (!Number.isFinite(lat) || lat < -MAX_LATITUDE || lat > MAX_LATITUDE) {
            throw new CanvasError(
                "invalid_latitude",
                `lat must be between -${MAX_LATITUDE} and ${MAX_LATITUDE}, the limit of the Web Mercator tile imagery.`,
            );
        }
        if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
            throw new CanvasError("invalid_longitude", "lng must be between -180 and 180.");
        }
        return {
            capital: fields.city || fields.capital || "Waypoint",
            country: fields.country,
            lat,
            lng,
            label: fields.city || fields.capital
                ? `${fields.city || fields.capital}${fields.country ? `, ${fields.country}` : ""}`
                : `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? "N" : "S"}  ` +
                  `${Math.abs(lng).toFixed(4)}°${lng >= 0 ? "E" : "W"}`,
        };
    }

    if (fields.capital) {
        const capital = findCapital(fields.capital);
        if (capital) return asDestination(capital);
        // Not one of the shipped capitals: treat it as a place name
        fields.city ||= fields.capital;
    }

    if (fields.city || fields.state || fields.country) {
        const resolved = await geocode(fields);
        if (resolved) return resolved;

        // A country with no city still has a capital in the shipped list
        const fallback = fields.country && findCapital(fields.country);
        if (fallback) return asDestination(fallback);

        throw new CanvasError("destination_not_found", "No destination matched that description.");
    }

    return asDestination(randomCapital());
}

/* ============================================================
   Page serving
   ============================================================ */

/**
 * Builds the head the page's placeholder expects: a policy, the render
 * configuration, and the host shim. The shim must run before the page's
 * own scripts, which is why it goes in the head rather than after them.
 */
function buildHead(entry, nonce) {
    const csp = [
        "default-src 'self'",
        // Satellite tiles are remote images; the terrain fill samples the
        // canvas, so the tile textures are read back and need to be clean
        "img-src 'self' https: data: blob:",
        "style-src 'self' 'unsafe-inline'",
        `script-src 'self' 'nonce-${nonce}'`,
        // 'self' for the event stream below, https: for the geocoder the
        // page's own destination dialog calls
        "connect-src 'self' https:",
    ].join("; ");

    const init = {
        config: entry.config,
        job: entry.job,
        destination: entry.destination,
    };

    return (
        `<meta http-equiv="Content-Security-Policy" content="${csp}">\n` +
        `  <script nonce="${nonce}">\n${hostShim(init)}\n  </script>`
    );
}

/**
 * Stands in for the VS Code webview host. The page reaches its host
 * through `acquireVsCodeApi()` and a window `message` listener, so
 * defining that API and translating the server's Server-Sent Events into
 * those messages is the whole port.
 */
function hostShim(init) {
    return `  (function () {
    var init = ${JSON.stringify(init).replace(/</g, "\\u003c")};

    // The page reads its render configuration off this global
    window.__flightMapConfig = init.config;

    function dispatch(message) {
      window.postMessage(message, '*');
    }

    window.acquireVsCodeApi = function () {
      return {
        postMessage: function (message) {
          if (!message || typeof message !== 'object') return;

          if (message.command === 'ready') {
            // Replay the opening state once the page is listening
            setTimeout(function () {
              if (init.destination) dispatch({ command: 'flyTo', destination: init.destination });
              if (init.job) dispatch({ command: 'jobStatus', job: init.job });
            }, 0);
          } else if (message.command === 'exportConfig') {
            // No save dialog in a canvas, so the export falls back to the
            // same browser download the standalone page uses
            try {
              var blob = new Blob([message.json], { type: 'application/json' });
              var url = URL.createObjectURL(blob);
              var a = document.createElement('a');
              a.href = url;
              a.download = 'renderMap.json';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            } catch (e) {
              // Downloads blocked by the host: the live config panel still works
            }
          }
        },
        getState: function () { return undefined; },
        setState: function () {}
      };
    };

    // Live host -> page channel for agent activity
    try {
      var events = new EventSource('/events');
      events.addEventListener('flyTo', function (event) {
        try { dispatch({ command: 'flyTo', destination: JSON.parse(event.data).destination }); } catch (e) {}
      });
      events.addEventListener('jobStatus', function (event) {
        try { dispatch({ command: 'jobStatus', job: JSON.parse(event.data).job }); } catch (e) {}
      });
    } catch (e) {
      // No EventSource: the simulator still flies, just without agent activity
    }
  })();`;
}

async function renderIndex(entry) {
    const html = await readFile(indexPath, "utf8");
    const nonce = randomBytes(16).toString("base64url");
    return html.replace("<!--{{HOST_HEAD}}-->", buildHead(entry, nonce));
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
        // Catch a fresh or reconnecting client up to the live state
        sendSse(res, "jobStatus", { job: entry.job });
        if (entry.destination) {
            sendSse(res, "flyTo", { destination: entry.destination });
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

        const staticPath = url.pathname.startsWith("/assets/")
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

async function startServer(instanceId, destination) {
    const entry = {
        clients: new Set(),
        config: await readRenderConfig(),
        job: { ...IDLE_JOB },
        destination,
        server: undefined,
        url: undefined,
    };

    const server = createServer((req, res) => {
        handleRequest(entry, req, res).catch((error) => {
            res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
            res.end(error instanceof Error ? error.message : "Flight map canvas server error");
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
        throw new CanvasError("flight_map_not_open", "Open the Flight Map canvas before invoking this action.");
    }
    return entry;
}

/**
 * Coerces report_job input into the job shape the status strip reads.
 * A call that omits tokens keeps the count already on screen, so the
 * final done=true call settles the job without wiping its total.
 */
function normalizeJob(input, previous) {
    if (!input || typeof input !== "object") {
        return { ...IDLE_JOB };
    }
    return {
        working: input.done !== true,
        status: typeof input.status === "string" ? input.status.slice(0, 120) : "",
        tokens:
            typeof input.tokens === "number" && Number.isFinite(input.tokens)
                ? Math.max(0, Math.floor(input.tokens))
                : (previous?.tokens ?? 0),
    };
}

const DESTINATION_PROPERTIES = {
    capital: {
        type: "string",
        description:
            "A world capital to fly to, by city or country name (e.g. 'Wellington', 'New Zealand'). Matched against the capitals the canvas ships with.",
    },
    city: {
        type: "string",
        description: "City name for anywhere that is not a shipped capital. Geocoded on the way in.",
    },
    state: {
        type: "string",
        description: "State, region, province, or district that narrows the city.",
    },
    country: {
        type: "string",
        description: "Country that narrows the city.",
    },
    lat: {
        type: "number",
        description: `Latitude in degrees, -${MAX_LATITUDE} to ${MAX_LATITUDE} (the limit of the Web Mercator tile imagery). Give lng as well to skip the geocoder entirely.`,
        minimum: -MAX_LATITUDE,
        maximum: MAX_LATITUDE,
    },
    lng: {
        type: "number",
        description: "Longitude in degrees, -180 to 180. Give lat as well.",
        minimum: -180,
        maximum: 180,
    },
};

await joinSession({
    canvases: [
        createCanvas({
            id: "flight-map-canvas",
            displayName: "Flight Map",
            description:
                "Fly a first-person satellite terrain map of the world while agents work. The agent can send the flight anywhere and report what it is doing.",
            inputSchema: {
                type: "object",
                properties: DESTINATION_PROPERTIES,
                additionalProperties: false,
            },
            actions: [
                {
                    name: "fly_to",
                    description:
                        "Send the flight to a destination. Give a capital by name, a city with an optional state and country, or a raw lat/lng. Called with no input it picks a random world capital, which is the way to say 'take me somewhere else'.",
                    inputSchema: {
                        type: "object",
                        properties: DESTINATION_PROPERTIES,
                        additionalProperties: false,
                    },
                    handler: async (ctx) => {
                        const entry = getOpenEntry(ctx.instanceId);
                        const destination = await resolveDestination(ctx.input);
                        // Held so a reload, or a client that connects later,
                        // arrives at the same place the agent sent the flight
                        entry.destination = destination;
                        broadcast(entry, "flyTo", { destination });
                        return destination;
                    },
                },
                {
                    name: "report_job",
                    description:
                        "Report your current job status to the flight map. Call it when you start a chat request, again on each new step, and once more with done=true when finished. The status shows on a strip under the HUD and the token count runs beside it.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            status: {
                                type: "string",
                                description:
                                    "Short status text to show under the HUD (e.g. 'reading the codebase', 'rewriting the parser').",
                            },
                            tokens: {
                                type: "number",
                                description: "Approximate tokens consumed by the current job so far.",
                            },
                            done: {
                                type: "boolean",
                                description:
                                    "Set true when the job is finished; the activity indicator stills and the last status stays readable.",
                            },
                        },
                        required: ["status"],
                        additionalProperties: false,
                    },
                    handler: (ctx) => {
                        const entry = getOpenEntry(ctx.instanceId);
                        entry.job = normalizeJob(ctx.input, entry.job);
                        broadcast(entry, "jobStatus", { job: entry.job });
                        return { job: entry.job };
                    },
                },
            ],
            open: async (ctx) => {
                const hasInput = ctx.input && Object.keys(ctx.input).length > 0;
                // Only resolve when asked for somewhere; otherwise the page
                // opens on its own welcome screen and the menu picks
                const destination = hasInput ? await resolveDestination(ctx.input) : undefined;

                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    entry = await startServer(ctx.instanceId, destination);
                } else if (destination) {
                    entry.destination = destination;
                    broadcast(entry, "flyTo", { destination });
                }

                return {
                    title: "Flight Map",
                    status: entry.job.working && entry.job.status
                        ? entry.job.status
                        : (entry.destination?.label ?? "Pick a destination"),
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
