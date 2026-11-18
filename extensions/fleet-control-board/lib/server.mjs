import http from "node:http";
import { PAGE_HTML } from "./page.mjs";

const SECURITY_HEADERS = {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'",
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
 * Serve one board on 127.0.0.1 with an ephemeral port. No secret goes in the URL; instead the Host
 * header must name this server (blocks DNS rebinding) and writes must be same-origin JSON.
 * `handlers.state(force)` returns the view model, `handlers.answer(id, text)` stores an answer.
 */
export function startServer(handlers) {
    return new Promise((resolve, reject) => {
        let port = 0;
        const server = http.createServer(async (req, res) => {
            try {
                const allowedHosts = [`127.0.0.1:${port}`, `localhost:${port}`];
                if (!allowedHosts.includes(req.headers.host || "")) return send(res, 403, "text/plain; charset=utf-8", "Forbidden");
                const url = new URL(req.url, `http://127.0.0.1:${port}`);
                if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
                    return send(res, 200, "text/html; charset=utf-8", PAGE_HTML);
                }
                if (req.method === "GET" && url.pathname === "/api/state") {
                    const state = await handlers.state(url.searchParams.get("force") === "1");
                    return send(res, 200, "application/json; charset=utf-8", JSON.stringify(state));
                }
                if (req.method === "POST" && url.pathname === "/api/answer") {
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
            resolve({ server, url: `http://127.0.0.1:${port}/` });
        });
    });
}
