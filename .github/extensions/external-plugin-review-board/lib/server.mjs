import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const STATIC_FILES = {
    "/app.js": { file: "app.js", type: "text/javascript; charset=utf-8" },
    "/styles.css": { file: "styles.css", type: "text/css; charset=utf-8" },
};

const CSP = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https: data:",
    "media-src https:",
    "connect-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "object-src 'none'",
    // The Copilot host loads canvases as a top-level webview (see extensions/sentry-triage/server.mjs),
    // so framing is never legitimate and denying it blocks clickjacking of the approve/reject controls.
    "frame-ancestors 'none'",
].join("; ");

const MAX_BODY = 64 * 1024;

export function expectedError(message, status) {
    return Object.assign(new Error(message), { publicMessage: message, status });
}

function readJson(req) {
    return new Promise((resolve, reject) => {
        let size = 0;
        const chunks = [];
        req.on("data", (chunk) => {
            size += chunk.length;
            if (size > MAX_BODY) {
                reject(expectedError("Request body too large", 413));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on("end", () => {
            if (!chunks.length) return resolve({});
            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
            } catch {
                reject(expectedError("Invalid JSON body", 400));
            }
        });
        req.on("error", reject);
    });
}

function sendJson(res, status, payload) {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(JSON.stringify(payload));
}

function reportError(api, error) {
    const logger = api.logger ?? console;
    if (typeof logger.error === "function") {
        logger.error("External plugin review board server error", error);
    }
}

function clientErrorMessage(error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    if (status >= 400 && status < 500) return error?.publicMessage || "Request failed";
    return "Internal server error";
}

/**
 * Starts a loopback server for one canvas instance.
 * `api` provides: snapshot(), subscribe(fn) => unsubscribe, and route handlers keyed by "METHOD /path".
 */
export async function startBoardServer({ publicDir, api }) {
    const token = randomBytes(24).toString("hex");
    const sseClients = new Set();
    let port = 0;

    const unsubscribe = api.subscribe((snapshot) => {
        const frame = `event: board\ndata: ${JSON.stringify(snapshot)}\n\n`;
        for (const client of sseClients) client.write(frame);
    });

    const server = createServer(async (req, res) => {
        try {
            const host = req.headers.host ?? "";
            if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) {
                res.writeHead(421).end("Misdirected request");
                return;
            }
            const url = new URL(req.url ?? "/", `http://${host}`);

            if (req.method === "GET" && url.pathname === "/") {
                const html = await readFile(path.join(publicDir, "index.html"), "utf8");
                res.writeHead(200, {
                    "Content-Type": "text/html; charset=utf-8",
                    "Content-Security-Policy": CSP,
                    "X-Frame-Options": "DENY",
                    "Cache-Control": "no-store",
                });
                res.end(html.replace("__BOARD_TOKEN__", token));
                return;
            }

            const asset = req.method === "GET" && STATIC_FILES[url.pathname];
            if (asset) {
                const body = await readFile(path.join(publicDir, asset.file));
                res.writeHead(200, { "Content-Type": asset.type, "Cache-Control": "no-store" });
                res.end(body);
                return;
            }

            if (!url.pathname.startsWith("/api/") && url.pathname !== "/events") {
                res.writeHead(404).end("Not found");
                return;
            }

            if (url.searchParams.get("token") !== token && req.headers["x-board-token"] !== token) {
                sendJson(res, 403, { error: "Invalid board token" });
                return;
            }

            if (req.method === "GET" && url.pathname === "/events") {
                res.writeHead(200, {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-store",
                    Connection: "keep-alive",
                });
                res.write(`event: board\ndata: ${JSON.stringify(api.snapshot())}\n\n`);
                sseClients.add(res);
                const keepAlive = setInterval(() => res.write(": ping\n\n"), 25000);
                req.on("close", () => {
                    clearInterval(keepAlive);
                    sseClients.delete(res);
                });
                return;
            }

            const routeKey = `${req.method} ${url.pathname.replace(/\/\d+$/, "/:number")}`;
            const handler = api.routes[routeKey];
            if (!handler) {
                sendJson(res, 404, { error: `No route for ${req.method} ${url.pathname}` });
                return;
            }
            const numberMatch = url.pathname.match(/\/(\d+)$/);
            const body = req.method === "POST" ? await readJson(req) : {};
            const result = await handler({ body, number: numberMatch ? Number(numberMatch[1]) : undefined });
            sendJson(res, 200, result ?? {});
        } catch (error) {
            if (!res.headersSent) {
                const status = Number.isInteger(error?.status) ? error.status : 500;
                if (status >= 500) reportError(api, error);
                sendJson(res, status, { error: clientErrorMessage(error) });
            } else {
                reportError(api, error);
                try {
                    res.end();
                } catch {}
            }
        }
    });

    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    port = server.address().port;

    return {
        url: `http://127.0.0.1:${port}/`,
        async close() {
            unsubscribe();
            for (const client of sseClients) client.end();
            sseClients.clear();
            await new Promise((resolve) => server.close(() => resolve()));
        },
    };
}
