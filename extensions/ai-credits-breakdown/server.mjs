// Loopback-only HTTP server that serves the dashboard UI and the locally built usage ledger.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { randomBytes, timingSafeEqual } from "node:crypto";

const read = (name) => readFileSync(new URL(`./ui/${name}`, import.meta.url), "utf8");
const ASSETS = {
    "": { type: "text/html; charset=utf-8", body: read("index.html") },
    "app.js": { type: "text/javascript; charset=utf-8", body: read("app.js") },
    "styles.css": { type: "text/css; charset=utf-8", body: read("styles.css") },
};

const SECURITY_HEADERS = {
    "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
};
const CSP = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'";
const PREFERRED_PORTS = [47820, 47821, 47822, 47823, 47824, 47825, 47826, 47827, 47828, 47829];

// Every server has its own secret path prefix and only answers on 127.0.0.1. The page and /data.json
// both need the prefix, so other local users and web pages (DNS rebinding) cannot read your usage.
export async function startServer({ getLedger, onError = () => {}, ports = PREFERRED_PORTS }) {
    const token = randomBytes(24).toString("base64url");
    const prefix = `/${token}/`;
    let origin = "";
    const authorized = (req, url) => {
        if (!origin || req.headers.host !== new URL(origin).host) return false;
        if (req.headers.origin && req.headers.origin !== origin) return false;
        const got = Buffer.from(url.pathname.slice(0, prefix.length)), want = Buffer.from(prefix);
        return got.length === want.length && timingSafeEqual(got, want);
    };
    const reply = (res, status, type, body, extra = {}) => {
        res.writeHead(status, { "Content-Type": type, ...SECURITY_HEADERS, ...extra });
        res.end(body);
    };
    const server = createServer(async (req, res) => {
        let url;
        try { url = new URL(req.url, "http://127.0.0.1"); } catch { return reply(res, 400, "text/plain; charset=utf-8", "Bad request"); }
        if (req.method !== "GET" || !authorized(req, url)) return reply(res, 403, "text/plain; charset=utf-8", "Forbidden");
        const route = url.pathname.slice(prefix.length);
        if (route === "data.json") {
            try {
                return reply(res, 200, "application/json", JSON.stringify(await getLedger()));
            } catch (error) {
                onError(error);
                return reply(res, 500, "application/json", JSON.stringify({ error: error.message }));
            }
        }
        const asset = Object.hasOwn(ASSETS, route) ? ASSETS[route] : null;
        if (!asset) return reply(res, 404, "text/plain; charset=utf-8", "Not found");
        reply(res, 200, asset.type, asset.body, route === "" ? { "Content-Security-Policy": CSP } : {});
    });
    const listen = (port) => new Promise((resolve, reject) => {
        const onFail = (e) => { server.off("listening", onListening); reject(e); };
        const onListening = () => { server.off("error", onFail); resolve(); };
        server.once("error", onFail);
        server.once("listening", onListening);
        server.listen(port, "127.0.0.1");
    });
    // Prefer a stable port so a restored panel keeps its address; otherwise let the OS choose.
    let bound = false;
    for (const port of ports) {
        try { await listen(port); bound = true; break; } catch { /* port in use */ }
    }
    if (!bound) await listen(0);
    origin = `http://127.0.0.1:${server.address().port}`;
    return { server, url: origin + prefix, origin, prefix };
}

export async function stopServer(entry) {
    entry.server.closeAllConnections?.();
    await new Promise((resolve) => entry.server.close(() => resolve()));
}
