import http from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { PAGE_HTML } from "./page.mjs";

const SECURITY_HEADERS = {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    // The Copilot host loads canvases as a top-level webview, so framing is never legitimate.
    "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    "x-frame-options": "DENY",
};

function send(res, status, type, body) {
    res.writeHead(status, { "content-type": type, ...SECURITY_HEADERS });
    res.end(body);
}

function readJsonBody(req, limit = 8192) {
    return new Promise((resolve, reject) => {
        let size = 0;
        const chunks = [];
        req.on("data", (chunk) => {
            size += chunk.length;
            if (size > limit) {
                reject(new Error("body too large"));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on("end", () => {
            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
            } catch {
                reject(new Error("invalid JSON"));
            }
        });
        req.on("error", reject);
    });
}

/**
 * Serve one board on 127.0.0.1 with an ephemeral port.
 * Every route sits under a random per-panel key that only the canvas host receives (from open()),
 * so other local users and web pages cannot read the board or post answers. The key unlocks this
 * one local board only; it is not a GitHub credential. The Host header must also name this server
 * (blocks DNS rebinding) and answers must be same-origin JSON.
 * `handlers.state(force)` returns the view model, `handlers.answer(body)` stores an answer.
 */
export function startServer(handlers) {
    const key = randomBytes(24).toString("base64url");
    const prefix = Buffer.from(`/${key}/`);
    const authorized = (pathname) => {
        const got = Buffer.from(pathname.slice(0, prefix.length));
        return got.length === prefix.length && timingSafeEqual(got, prefix);
    };
    return new Promise((resolve, reject) => {
        let port = 0;
        const server = http.createServer(async (req, res) => {
            try {
                const allowedHosts = [`127.0.0.1:${port}`, `localhost:${port}`];
                if (!allowedHosts.includes(req.headers.host || "")) return send(res, 403, "text/plain; charset=utf-8", "Forbidden");
                const url = new URL(req.url, `http://127.0.0.1:${port}`);
                if (!authorized(url.pathname)) return send(res, 404, "text/plain; charset=utf-8", "Not found");
                const route = url.pathname.slice(prefix.length - 1);
                if (req.method === "GET" && (route === "/" || route === "/index.html")) {
                    return send(res, 200, "text/html; charset=utf-8", PAGE_HTML);
                }
                if (req.method === "GET" && route === "/api/state") {
                    const state = await handlers.state(url.searchParams.get("force") === "1");
                    return send(res, 200, "application/json; charset=utf-8", JSON.stringify(state));
                }
                if (req.method === "POST" && route === "/api/answer") {
                    const origin = req.headers.origin;
                    const site = req.headers["sec-fetch-site"];
                    if ((origin && !allowedHosts.some((h) => origin === `http://${h}`)) || (site && site !== "same-origin")) {
                        return send(res, 403, "text/plain; charset=utf-8", "Cross-origin request refused");
                    }
                    if (!String(req.headers["content-type"] || "").startsWith("application/json")) {
                        return send(res, 415, "text/plain; charset=utf-8", "application/json required");
                    }
                    const result = await handlers.answer(await readJsonBody(req));
                    return send(res, result.status, "application/json; charset=utf-8", JSON.stringify(result.body));
                }
                return send(res, 404, "text/plain; charset=utf-8", "Not found");
            } catch (error) {
                handlers.log?.(`request failed: ${error.message}`);
                return send(res, 500, "text/plain; charset=utf-8", error.message);
            }
        });
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
            port = server.address().port;
            resolve({ server, url: `http://127.0.0.1:${port}/${key}/` });
        });
    });
}
