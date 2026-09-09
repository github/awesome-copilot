import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { getWorkflowState } from "./state.mjs";
import { renderHtml } from "./renderer.mjs";

function sendJson(res, status, value) {
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(value));
}

async function readJson(req) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        size += chunk.length;
        if (size > 64 * 1024) throw new Error("Request body is too large.");
        chunks.push(chunk);
    }
    return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

export async function pushState(rec, state) {
    const payload = `event: state\ndata: ${JSON.stringify(state)}\n\n`;
    for (const client of rec.clients) client.write(payload);
}

export async function createInstanceServer(options) {
    const token = randomBytes(24).toString("hex");
    const clients = new Set();
    let rec;

    const server = createServer(async (req, res) => {
        const url = new URL(req.url, "http://127.0.0.1");
        try {
            if (req.method === "GET" && url.pathname === "/") {
                const state = await getWorkflowState(options.workspace, options.stateId);
                res.writeHead(200, {
                    "Content-Type": "text/html; charset=utf-8",
                    "Cache-Control": "no-store",
                    "Content-Security-Policy": "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:",
                    "X-Content-Type-Options": "nosniff",
                    "Referrer-Policy": "no-referrer",
                });
                res.end(renderHtml(state, token));
                return;
            }

            if (req.method === "GET" && url.pathname === "/events") {
                res.writeHead(200, {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                });
                clients.add(res);
                req.on("close", () => clients.delete(res));
                return;
            }

            if (req.method !== "POST" || req.headers["x-canvas-token"] !== token) {
                sendJson(res, 403, { error: "Request rejected." });
                return;
            }

            const input = await readJson(req);
            let state;
            if (url.pathname === "/api/configure") {
                state = await options.onConfigure(input);
            } else if (url.pathname === "/api/step") {
                state = await options.onSetStep(input.step, input.status);
            } else if (url.pathname === "/api/refresh") {
                state = await options.onRefresh();
            } else {
                sendJson(res, 404, { error: "Not found." });
                return;
            }

            await pushState(rec, state);
            sendJson(res, 200, state);
        } catch (error) {
            sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
        }
    });

    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    rec = {
        ...options,
        server,
        clients,
        url: `http://127.0.0.1:${address.port}/`,
    };

    if (Object.keys(options.initialConfig).some((key) =>
        ["language", "source", "goal", "planName"].includes(key))) {
        await options.onConfigure(options.initialConfig);
    }
    return rec;
}
