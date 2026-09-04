import { createServer } from "node:http";
import { homedir } from "node:os";
import { join } from "node:path";
import { createCanvas, CanvasError, joinSession } from "@github/copilot-sdk/extension";
import { AgentMetadataStore, UsageInsightsStore } from "./stats.mjs";
import { renderDashboardHtml } from "./renderer.mjs";

const RANGE_VALUES = ["24h", "7d", "30d", "all"];
const servers = new Map();
const copilotHome = process.env.COPILOT_HOME || join(homedir(), ".copilot");
const statsStore = new UsageInsightsStore(copilotHome);
const agentMetadata = new AgentMetadataStore(copilotHome);
let session;

function normalizeRange(value) {
    return RANGE_VALUES.includes(value) ? value : "7d";
}

function json(res, status, value) {
    res.writeHead(status, {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
    });
    res.end(JSON.stringify(value));
}

function notifyCanvases() {
    for (const entry of servers.values()) {
        for (const client of entry.clients) {
            client.write("event: refresh\ndata: {}\n\n");
        }
    }
}

async function buildDashboardData({ range = "7d", sessionId } = {}) {
    if (!session) {
        throw new CanvasError("session_not_ready", "The session metrics provider is still starting.");
    }

    const selectedSessionId = sessionId || session.sessionId;
    const currentRuntime =
        selectedSessionId === session.sessionId
            ? await session.rpc.usage.getMetrics()
            : undefined;
    const metadata = await agentMetadata.get(selectedSessionId);

    return statsStore.buildDashboard({
        currentSessionId: session.sessionId,
        currentRuntime,
        range: normalizeRange(range),
        selectedSessionId,
        agentMetadata: metadata,
    });
}

async function startServer(instanceId, defaults) {
    const clients = new Set();
    const server = createServer(async (req, res) => {
        const url = new URL(req.url || "/", "http://127.0.0.1");

        if (req.method === "GET" && url.pathname === "/") {
            try {
                const initialData = await buildDashboardData(defaults);
                res.writeHead(200, {
                    "Cache-Control": "no-store",
                    "Content-Type": "text/html; charset=utf-8",
                });
                res.end(renderDashboardHtml({ instanceId, defaults, initialData }));
            } catch (error) {
                res.writeHead(500, {
                    "Cache-Control": "no-store",
                    "Content-Type": "text/plain; charset=utf-8",
                });
                res.end(error instanceof Error ? error.message : "Unable to load session metrics.");
            }
            return;
        }

        if (req.method === "GET" && url.pathname === "/api/stats") {
            try {
                const data = await buildDashboardData({
                    range: url.searchParams.get("range") || defaults.range,
                    sessionId: url.searchParams.get("sessionId") || defaults.sessionId,
                });
                json(res, 200, data);
            } catch (error) {
                json(res, 500, {
                    error: error instanceof Error ? error.message : "Unable to load session metrics.",
                });
            }
            return;
        }

        if (req.method === "GET" && url.pathname === "/events") {
            res.writeHead(200, {
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
                "Content-Type": "text/event-stream",
            });
            res.write("event: ready\ndata: {}\n\n");
            clients.add(res);
            req.on("close", () => clients.delete(res));
            return;
        }

        json(res, 404, { error: "Not found" });
    });

    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    return { clients, server, url: `http://127.0.0.1:${port}/` };
}

const usageInsightsCanvas = createCanvas({
    id: "usage-insights",
    displayName: "Usage Insights",
    description: "Inspect live token and AI-credit usage for the current session, its agents, and recent history.",
    inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
            range: { type: "string", enum: RANGE_VALUES },
            sessionId: { type: "string", minLength: 1 },
        },
    },
    actions: [
        {
            name: "refresh",
            description: "Return fresh metrics for the current or selected session and time range.",
            inputSchema: {
                type: "object",
                additionalProperties: false,
                properties: {
                    range: { type: "string", enum: RANGE_VALUES },
                    sessionId: { type: "string", minLength: 1 },
                },
            },
            handler: async (ctx) => buildDashboardData(ctx.input),
        },
        {
            name: "inspect_session",
            description: "Return the overall and per-agent metrics for one local session.",
            inputSchema: {
                type: "object",
                additionalProperties: false,
                required: ["sessionId"],
                properties: {
                    sessionId: { type: "string", minLength: 1 },
                    range: { type: "string", enum: RANGE_VALUES },
                },
            },
            handler: async (ctx) => buildDashboardData(ctx.input),
        },
    ],
    open: async (ctx) => {
        let entry = servers.get(ctx.instanceId);
        if (!entry) {
            const defaults = {
                range: normalizeRange(ctx.input?.range),
                sessionId: ctx.input?.sessionId || "",
            };
            entry = await startServer(ctx.instanceId, defaults);
            servers.set(ctx.instanceId, entry);
        }
        return {
            title: "Usage Insights",
            status: "Live",
            url: entry.url,
        };
    },
    onClose: async (ctx) => {
        const entry = servers.get(ctx.instanceId);
        if (!entry) {
            return;
        }
        servers.delete(ctx.instanceId);
        for (const client of entry.clients) {
            client.end();
        }
        await new Promise((resolve) => entry.server.close(resolve));
    },
});

session = await joinSession({ canvases: [usageInsightsCanvas] });

const initialEvents = await session.getEvents();
agentMetadata.seed(session.sessionId, initialEvents);

session.on("assistant.usage", notifyCanvases);
session.on("session.usage_checkpoint", notifyCanvases);
session.on("subagent.started", (event) => {
    agentMetadata.update(session.sessionId, event);
    notifyCanvases();
});
session.on("subagent.completed", (event) => {
    agentMetadata.update(session.sessionId, event);
    notifyCanvases();
});
session.on("subagent.failed", (event) => {
    agentMetadata.update(session.sessionId, event);
    notifyCanvases();
});
