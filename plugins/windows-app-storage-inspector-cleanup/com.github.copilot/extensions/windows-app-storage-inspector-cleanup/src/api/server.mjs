import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { renderHtml } from "../ui/renderer.mjs";
import { assertWindowsPlatform, createWindowsOnlyError, isWindowsPlatform } from "../core/platform.mjs";

const MAX_BODY_BYTES = 1_048_576;
const GITHUB_MARK = readFileSync(new URL("../../assets/github-mark-16.svg", import.meta.url));

function sendJson(response, statusCode, value) {
    response.writeHead(statusCode, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
    });
    response.end(JSON.stringify(value));
}

function sendError(response, error) {
    sendJson(response, error.statusCode ?? 400, {
        code: error.code ?? "storage_inspector_error",
        message: error.message ?? String(error),
    });
}

async function readJson(request) {
    let bytes = 0;
    const chunks = [];
    for await (const chunk of request) {
        bytes += chunk.length;
        if (bytes > MAX_BODY_BYTES) {
            const error = new Error("Request body is too large");
            error.code = "request_too_large";
            error.statusCode = 413;
            throw error;
        }
        chunks.push(chunk);
    }
    if (chunks.length === 0) {
        return {};
    }
    try {
        return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
        const error = new Error("Request body must contain valid JSON");
        error.code = "request_json_invalid";
        throw error;
    }
}

function authorized(request, url, token) {
    return request.headers["x-storage-inspector-token"] === token || url.searchParams.get("token") === token;
}

export async function startCanvasServer(service, requestAgentInvestigation, cancelAgentInvestigation) {
    assertWindowsPlatform();
    const token = randomBytes(32).toString("hex");
    let expectedHost;
    const clients = new Set();
    const unsubscribe = service.subscribe((state) => {
        const payload = `data: ${JSON.stringify(state)}\n\n`;
        for (const client of clients) {
            client.write(payload);
        }
    });

    const server = createServer(async (request, response) => {
        if (!isWindowsPlatform()) {
            sendError(response, createWindowsOnlyError());
            return;
        }
        if (request.headers.host !== expectedHost) {
            sendJson(response, 403, { code: "request_forbidden", message: "Canvas request host is invalid" });
            return;
        }
        const url = new URL(request.url ?? "/", "http://127.0.0.1");
        response.setHeader("content-security-policy", "default-src 'self'; connect-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'");
        response.setHeader("referrer-policy", "no-referrer");

        if (request.method === "GET" && url.pathname === "/") {
            if (url.searchParams.get("token") !== token) {
                sendJson(response, 403, { code: "request_forbidden", message: "Canvas request token is missing or invalid" });
                return;
            }
            response.writeHead(200, {
                "content-type": "text/html; charset=utf-8",
                "cache-control": "no-store",
                "x-content-type-options": "nosniff",
            });
            response.end(renderHtml(token));
            return;
        }

        if (request.method === "GET" && url.pathname === "/assets/github-mark-16.svg") {
            response.writeHead(200, {
                "content-type": "image/svg+xml",
                "cache-control": "public, max-age=3600",
                "x-content-type-options": "nosniff",
            });
            response.end(GITHUB_MARK);
            return;
        }

        if (!authorized(request, url, token)) {
            sendJson(response, 403, { code: "request_forbidden", message: "Canvas request token is missing or invalid" });
            return;
        }

        try {
            if (request.method === "GET" && url.pathname === "/events") {
                response.writeHead(200, {
                    "content-type": "text/event-stream",
                    "cache-control": "no-store",
                    connection: "keep-alive",
                });
                clients.add(response);
                response.write(`data: ${JSON.stringify(service.getState())}\n\n`);
                request.on("close", () => clients.delete(response));
                return;
            }
            if (request.method === "GET" && url.pathname === "/api/state") {
                sendJson(response, 200, service.getState());
                return;
            }
            if (request.method === "GET" && url.pathname === "/api/results") {
                sendJson(response, 200, service.getResults());
                return;
            }
            if (request.method === "GET" && url.pathname === "/api/categorizers") {
                sendJson(response, 200, await service.listCategorizers());
                return;
            }
            if (request.method === "POST" && url.pathname === "/api/categorizers") {
                sendJson(response, 202, await service.addCategorizer(await readJson(request)));
                return;
            }
            if (request.method === "POST" && url.pathname === "/api/categorizers/remove") {
                const input = await readJson(request);
                sendJson(response, 202, await service.removeCategorizer(input.id));
                return;
            }
            if (request.method === "POST" && url.pathname === "/api/investigate") {
                const input = await readJson(request);
                sendJson(response, 200, await service.inspectStorageItem(input.path));
                return;
            }
            if (request.method === "POST" && url.pathname === "/api/investigate/request") {
                const input = await readJson(request);
                sendJson(response, 202, await requestAgentInvestigation(input.path));
                return;
            }
            if (request.method === "POST" && url.pathname === "/api/investigate/cancel") {
                await readJson(request);
                sendJson(response, 200, await cancelAgentInvestigation());
                return;
            }
            if (request.method === "GET" && url.pathname === "/api/analyzers") {
                sendJson(response, 200, service.listCustomAnalyzers());
                return;
            }
            if (request.method === "POST" && url.pathname === "/api/analyzers/run") {
                const input = await readJson(request);
                sendJson(response, 200, await service.analyzeCustomAnalyzer(input.analyzerId));
                return;
            }
            if (request.method === "POST" && url.pathname === "/api/analyzers/command") {
                const input = await readJson(request);
                sendJson(response, 200, await service.executeAnalyzerCommand(
                    input.analyzerId,
                    input.commandId,
                    input.confirmed,
                ));
                return;
            }
            if (request.method === "POST" && url.pathname === "/api/analyzers/command/cancel") {
                sendJson(response, 200, service.cancelAnalyzerCommand());
                return;
            }
            if (request.method === "POST" && url.pathname === "/api/safety") {
                sendJson(response, 200, await service.setCleanupSafety(await readJson(request)));
                return;
            }
            if (request.method === "POST" && url.pathname === "/api/scan") {
                sendJson(response, 202, await service.startScan(await readJson(request)));
                return;
            }
            if (request.method === "POST" && url.pathname === "/api/cancel") {
                await readJson(request);
                sendJson(response, 202, service.cancelScan());
                return;
            }
            if (request.method === "POST" && url.pathname === "/api/cleanup/preview") {
                const input = await readJson(request);
                sendJson(response, 200, await service.previewCleanup(input));
                return;
            }
            if (request.method === "POST" && url.pathname === "/api/cleanup/execute") {
                const input = await readJson(request);
                sendJson(response, 200, await service.executeCleanup(input.previewId, input.confirmed));
                return;
            }
            sendJson(response, 404, { code: "route_not_found", message: "Canvas route not found" });
        } catch (error) {
            sendError(response, error);
        }
    });

    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    expectedHost = `127.0.0.1:${port}`;

    return {
        server,
        url: `http://127.0.0.1:${port}/?token=${token}`,
        async close() {
            unsubscribe();
            for (const client of clients) {
                client.end();
            }
            clients.clear();
            await new Promise((resolve) => server.close(resolve));
        },
    };
}
