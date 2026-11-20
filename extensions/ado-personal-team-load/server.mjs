import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { AdoError } from "./adapter.mjs";
export async function startServer(perform, log = () => {}) {
    const key = randomBytes(32).toString("hex");
    const assets = new Map(await Promise.all(["index.html", "app.mjs", "styles.css"].map(async name => [
        `/${name}`, await readFile(new URL(`./assets/${name}`, import.meta.url), "utf8"),
    ])));
    let origin;
    const server = createServer(async (req, res) => {
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Referrer-Policy", "no-referrer");
        res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'self'");
        try {
            if (req.headers.host !== new URL(origin).host) throw new AdoError("access", "Invalid local server host.");
            const path = new URL(req.url, origin).pathname;
            if (req.method === "GET" && (path === "/" || assets.has(path))) {
                const name = path === "/" ? "/index.html" : path;
                res.setHeader("Content-Type", name.endsWith(".html") ? "text/html; charset=utf-8" : name.endsWith(".css") ? "text/css" : "text/javascript");
                res.end(assets.get(name).replace("{{CANVAS_KEY}}", key)); return;
            }
            if (path !== "/api/action" || req.method !== "POST") { res.writeHead(404); res.end(); return; }
            if (req.headers.origin !== origin || req.headers["x-canvas-key"] !== key || req.headers["content-type"] !== "application/json")
                throw new AdoError("access", "Use this canvas page for local actions.");
            let text = "";
            for await (const chunk of req) {
                text += chunk;
                if (Buffer.byteLength(text) > 128000) throw new AdoError("invalid_input", "Request is too large.");
            }
            let payload;
            try { payload = JSON.parse(text); } catch { throw new AdoError("invalid_input", "Request must contain valid JSON."); }
            if (!payload || typeof payload.name !== "string" || Object.keys(payload).some(k => !["name", "input"].includes(k)))
                throw new AdoError("invalid_input", "Invalid action request.");
            const result = await perform(payload.name, payload.input ?? {});
            res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ result }));
        } catch (e) {
            const expected = e instanceof AdoError;
            await log(expected ? e.code : "server_error");
            res.writeHead(expected && e.code === "access" ? 403 : 400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: { code: expected ? e.code : "server_error", message: expected ? e.message : "The canvas request failed. Check extension diagnostics." } }));
        }
    });
    await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    origin = `http://127.0.0.1:${server.address().port}`;
    return { url: `${origin}/`, close: () => new Promise((resolve, reject) => { server.close(e => e ? reject(e) : resolve()); server.closeIdleConnections(); }) };
}
