import { createServer } from "node:http";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const imageTypes = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };
const MAX_BODY = 131_072;
const digest = value => createHash("sha256").update(value).digest();

// Drain an oversized body instead of aborting it, so the client receives the 413 rather than a reset connection.
export async function readBody(req) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        size += chunk.length;
        if (size <= MAX_BODY) chunks.push(chunk);
    }
    if (size > MAX_BODY) throw Object.assign(new Error("Request body exceeds 128 KB."), { status: 413 });
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

export async function startServer({ assets, images, scenarios, dispatch, snapshot, live }) {
    const token = randomBytes(32).toString("hex");
    const expected = digest(token);
    const trusted = value => typeof value === "string" && timingSafeEqual(digest(value), expected);
    const imagePaths = new Set(scenarios.map(row => `/${row.image}`));
    const staticFiles = new Map([
        ["/", ["index.html", "text/html; charset=utf-8"]],
        ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
        ...["coalesce", "escape", "live-conn", "tab-policy", "target-save"].map(name => [`/${name}.mjs`, [`${name}.mjs`, "text/javascript; charset=utf-8"]]),
        ["/app.css", ["app.css", "text/css; charset=utf-8"]],
        ["/deck.html", ["deck.html", "text/html; charset=utf-8"]],
        ["/deck.js", ["deck.js", "text/javascript; charset=utf-8"]],
        ["/deck.css", ["deck.css", "text/css; charset=utf-8"]],
        ["/enablement.json", ["enablement.json", "application/json; charset=utf-8"]],
    ]);
    const waits = new Set();
    let origin;
    const server = createServer(async (req, res) => {
        const json = (status, value) => {
            if (res.headersSent || res.destroyed) return;
            res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
            res.end(JSON.stringify(value));
        };
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Referrer-Policy", "no-referrer");
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self'; frame-src 'self'; base-uri 'none'; form-action 'none'");
        try {
            if (req.headers.host !== new URL(origin).host) return json(403, { error: "Untrusted host." });
            const url = new URL(req.url, origin);
            const file = staticFiles.get(url.pathname);
            if (file && req.method === "GET") {
                let content = await readFile(path.join(assets, file[0]));
                if (url.pathname === "/") {
                    if (!trusted(url.searchParams.get("key"))) return json(403, { error: "Open this panel through Copilot." });
                    content = content.toString().replace("__CANVAS_TOKEN__", token);
                }
                res.writeHead(200, { "Content-Type": file[1] });
                return res.end(content);
            }
            if (imagePaths.has(url.pathname) && req.method === "GET") {
                const name = path.basename(url.pathname);
                const type = imageTypes[path.extname(name).toLowerCase()];
                if (url.pathname !== `/images/${name}` || !type) return json(404, { error: "Unknown image." });
                const content = await readFile(path.join(images, name));
                res.writeHead(200, { "Content-Type": type, "Cache-Control": "private, max-age=3600" });
                return res.end(content);
            }
            if (!trusted(req.headers["x-canvas-token"]) || (req.headers.origin && req.headers.origin !== origin)) {
                return json(403, { error: "Untrusted canvas request." });
            }
            if (url.pathname === "/api/state" && req.method === "GET") return json(200, await snapshot());
            if (url.pathname === "/api/live" && req.method === "GET" && live) {
                const version = Number.parseInt(url.searchParams.get("v") ?? "-1", 10);
                const controller = new AbortController();
                waits.add(controller);
                res.on("close", () => controller.abort());
                try { await live.wait(Number.isSafeInteger(version) ? version : -1, { signal: controller.signal }); }
                finally { waits.delete(controller); }
                return json(200, await live.snapshot());
            }
            if (url.pathname === "/api/action" && req.method === "POST") {
                if (!req.headers["content-type"]?.startsWith("application/json")) return json(415, { error: "JSON required." });
                const { action, input } = await readBody(req);
                return json(200, await dispatch(action, input ?? {}));
            }
            json(404, { error: "Not found." });
        } catch (error) {
            const locked = ["mode_locked", "template_locked"].includes(error.code);
            json(error.status === 413 ? 413 : locked ? 409 : 400, { error: error.message, ...(locked ? { code: error.code } : {}) });
        }
    });
    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });
    origin = `http://127.0.0.1:${server.address().port}`;
    return {
        server, url: `${origin}/?key=${token}`,
        close: () => new Promise((resolve, reject) => {
            for (const controller of waits) controller.abort();
            server.close(error => error ? reject(error) : resolve());
            server.closeAllConnections();
        }),
    };
}
