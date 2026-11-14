import http from "node:http";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { executeSchema, operationSchema, remoteSchema, TagError, validate } from "./schemas.mjs";

const assets = new Map([
    ["/", ["index.html", "text/html; charset=utf-8"]],
    ["/client.js", ["client.js", "text/javascript; charset=utf-8"]],
    ["/theme.js", ["theme.js", "text/javascript; charset=utf-8"]],
    ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
]);

async function readBody(request) {
    if (request.headers["content-type"] !== "application/json") throw new TagError("invalid_input", "Use application/json.");
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
        size += chunk.length;
        if (size > 16384) throw new TagError("invalid_input", "Request exceeds 16 KB.");
        chunks.push(chunk);
    }
    try {
        return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
        throw new TagError("invalid_input", "Invalid JSON request.");
    }
}

export async function startServer(manager, log = () => {}) {
    const token = randomBytes(32).toString("hex");
    const files = new Map(await Promise.all([...assets].map(async ([route, [name, type]]) =>
        [route, { type, body: (await readFile(new URL(`./public/${name}`, import.meta.url), "utf8")).replace("{{TOKEN}}", token) }]
    )));
    const entry = { manager, url: null, server: null };
    const server = http.createServer(async (request, response) => {
        const json = (status, body) => {
            response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
            response.end(JSON.stringify(body));
        };
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("Referrer-Policy", "no-referrer");
        response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors *");
        try {
            const navigation = request.method === "GET" && request.url === "/" && request.headers["sec-fetch-mode"] === "navigate";
            if (request.headers.host !== new URL(entry.url).host ||
                (request.headers.origin && request.headers.origin !== entry.url) ||
                (request.headers["sec-fetch-site"] === "cross-site" && !navigation)) {
                throw new TagError("forbidden", "Cross-origin requests are not allowed.");
            }
            const route = request.url;
            if (request.method === "GET" && files.has(route)) {
                const asset = files.get(route);
                response.writeHead(200, { "Content-Type": asset.type });
                response.end(asset.body);
                return;
            }
            if (request.method === "GET" && route === "/api/state") {
                json(200, entry.manager.state());
                return;
            }
            if (request.method !== "POST" || request.headers["x-canvas-token"] !== token) {
                throw new TagError("forbidden", "This request is not authorized.");
            }
            const input = await readBody(request);
            let result;
            if (route === "/api/refresh") {
                validate(input, { properties: {}, required: [] });
                result = await entry.manager.refresh();
            } else if (route === "/api/remote") {
                validate(input, remoteSchema);
                result = await entry.manager.selectRemote(input.remote);
            } else if (route === "/api/prepare") {
                validate(input, operationSchema);
                result = await entry.manager.prepare(input);
            } else if (route === "/api/execute") {
                validate(input, executeSchema);
                result = await entry.manager.execute(input.id, input.confirmation);
            } else if (route === "/api/cancel") {
                validate(input, { properties: { id: { type: "string", minLength: 1 } }, required: ["id"] });
                result = entry.manager.cancel(input.id);
            } else {
                throw new TagError("not_found", "Unknown endpoint.");
            }
            json(200, result);
        } catch (error) {
            log(error.message);
            json(error.code === "forbidden" ? 403 : error.code === "not_found" ? 404 : 400, {
                code: error.code ?? "server_failed", message: error.message,
            });
        }
    });
    server.requestTimeout = 15000;
    entry.server = server;
    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });
    entry.url = `http://127.0.0.1:${server.address().port}`;
    return entry;
}

export async function stopServer(entry) {
    entry.server.closeAllConnections();
    await new Promise((resolve, reject) => entry.server.close(error => error ? reject(error) : resolve()));
}
