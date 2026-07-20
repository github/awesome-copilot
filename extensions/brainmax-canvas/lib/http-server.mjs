// Local HTTP server for one BrainMax canvas instance: serves the static
// frontend (public/), streams state updates to it over Server-Sent Events,
// and accepts interactions from the page to relay back into chat
// via session.send().

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "public");

const MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
};
const MAX_EVENT_BODY_BYTES = 16 * 1024;
const SSE_HEARTBEAT_MS = 20_000;

export async function readRequestBody(request, maxBytes = MAX_EVENT_BODY_BYTES) {
    const bodyChunks = [];
    let bodyByteLength = 0;
    for await (const chunk of request) {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bodyByteLength += bytes.length;
        if (bodyByteLength > maxBytes) return null;
        bodyChunks.push(bytes);
    }
    return Buffer.concat(bodyChunks).toString("utf8");
}

function writeHeaders(res, status, contentType, extra = {}) {
    res.writeHead(status, {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "same-origin",
        "Content-Security-Policy": "default-src 'self'; connect-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self'; base-uri 'none'; form-action 'self'",
        ...extra,
    });
}

/**
 * @param {string} instanceId
 * @param {import("./state.mjs").InstanceState} getState - fn returning current state
 * @param {(event: {type: string, [k: string]: unknown}) => void} onClientEvent
 */
export async function startInstanceServer(instanceId, getStateFn, onClientEvent) {
    /** @type {Set<import("node:http").ServerResponse>} */
    const sseClients = new Set();

    function broadcastState() {
        const payload = `data: ${JSON.stringify(getStateFn())}\n\n`;
        for (const res of sseClients) {
            res.write(payload);
        }
    }

    const heartbeat = setInterval(() => {
        for (const res of sseClients) {
            res.write(`: heartbeat ${Date.now()}\n\n`);
        }
    }, SSE_HEARTBEAT_MS);
    heartbeat.unref?.();

    const server = createServer(async (req, res) => {
        try {
            const url = new URL(req.url, "http://localhost");

            if (url.pathname === "/events" && req.method === "GET") {
                writeHeaders(res, 200, "text/event-stream", { Connection: "keep-alive" });
                res.write(`data: ${JSON.stringify(getStateFn())}\n\n`);
                sseClients.add(res);
                req.on("close", () => sseClients.delete(res));
                return;
            }

            if (url.pathname === "/state" && req.method === "GET") {
                writeHeaders(res, 200, MIME[".json"]);
                res.end(JSON.stringify(getStateFn()));
                return;
            }

            if (url.pathname === "/event" && req.method === "POST") {
                if (!String(req.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
                    writeHeaders(res, 415, MIME[".json"]);
                    res.end(JSON.stringify({ ok: false, error: "content type must be application/json" }));
                    return;
                }
                const body = await readRequestBody(req);
                if (body === null) {
                    writeHeaders(res, 413, MIME[".json"]);
                    res.end(JSON.stringify({ ok: false, error: "event payload is too large" }));
                    return;
                }
                let event;
                try {
                    event = JSON.parse(body || "{}");
                } catch {
                    writeHeaders(res, 400, MIME[".json"]);
                    res.end(JSON.stringify({ ok: false, error: "invalid JSON" }));
                    return;
                }
                if (!event || typeof event !== "object" || Array.isArray(event)) {
                    writeHeaders(res, 400, MIME[".json"]);
                    res.end(JSON.stringify({ ok: false, error: "event payload must be an object" }));
                    return;
                }
                const result = onClientEvent(event) || { ok: true };
                writeHeaders(res, result.ok === false ? 400 : 202, MIME[".json"]);
                res.end(JSON.stringify(result));
                return;
            }

            // Static file serving for everything else, defaulting to index.html.
            if (req.method !== "GET" && req.method !== "HEAD") {
                writeHeaders(res, 405, "text/plain; charset=utf-8", { Allow: "GET, HEAD" });
                res.end("Method not allowed");
                return;
            }
            let relPath = url.pathname === "/" ? "/index.html" : url.pathname;
            const filePath = path.resolve(PUBLIC_DIR, `.${relPath}`);
            const relativePath = path.relative(PUBLIC_DIR, filePath);
            if (relativePath.startsWith(`..${path.sep}`) || relativePath === ".." || path.isAbsolute(relativePath)) {
                writeHeaders(res, 403, "text/plain; charset=utf-8");
                res.end("Forbidden");
                return;
            }
            const ext = path.extname(filePath);
            const data = await readFile(filePath);
            writeHeaders(res, 200, MIME[ext] || "application/octet-stream");
            res.end(req.method === "HEAD" ? undefined : data);
        } catch (err) {
            if (err && err.code === "ENOENT") {
                writeHeaders(res, 404, "text/plain; charset=utf-8");
                res.end("Not found");
                return;
            }
            console.error(`BrainMax canvas server error for ${instanceId}`, err);
            writeHeaders(res, 500, "text/plain; charset=utf-8");
            res.end("Internal server error");
        }
    });

    try {
        await new Promise((resolve, reject) => {
            server.once("error", reject);
            server.listen(0, "127.0.0.1", () => {
                server.off("error", reject);
                resolve();
            });
        });
    } catch (error) {
        clearInterval(heartbeat);
        throw error;
    }
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    return {
        url: `http://127.0.0.1:${port}/`,
        broadcastState,
        close: () =>
            new Promise((resolve) => {
                clearInterval(heartbeat);
                for (const res of sseClients) res.end();
                server.close(() => resolve());
            }),
    };
}
