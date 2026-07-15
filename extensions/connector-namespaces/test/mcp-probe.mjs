// MCP probe — drives the gateway's native Streamable HTTP endpoint.

import { pickSafeTool } from "./safe-tools.mjs";

const PROTOCOL_VERSION = "2025-06-18";

function parseResponseBody(text, contentType, expectedId) {
    if (!text.trim()) return null;
    if (contentType.toLowerCase().includes("text/event-stream")) {
        const messages = [];
        for (const event of text.split(/\r?\n\r?\n/)) {
            const data = event
                .split(/\r?\n/)
                .filter((line) => line.startsWith("data:"))
                .map((line) => line.slice(5).trim())
                .join("\n");
            if (data && data !== "[DONE]") messages.push(JSON.parse(data));
        }
        return messages.find((message) => message?.id === expectedId) || null;
    }
    return JSON.parse(text);
}

class HttpClient {
    constructor(url, key) {
        this.url = url;
        this.key = key;
        this.sessionId = null;
    }

    async post(message, timeoutMs, expectedId = null) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const headers = {
                Accept: "application/json, text/event-stream",
                "Content-Type": "application/json",
                "X-API-Key": this.key,
            };
            if (this.sessionId) headers["Mcp-Session-Id"] = this.sessionId;
            const response = await fetch(this.url, {
                method: "POST",
                headers,
                body: JSON.stringify(message),
                signal: controller.signal,
            });
            const nextSessionId = response.headers.get("mcp-session-id");
            if (nextSessionId) this.sessionId = nextSessionId;
            const text = await response.text();
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
            }
            return parseResponseBody(text, response.headers.get("content-type") || "", expectedId);
        } catch (error) {
            if (error?.name === "AbortError") {
                throw new Error(`timeout after ${timeoutMs}ms`);
            }
            throw error;
        } finally {
            clearTimeout(timer);
        }
    }

    request(id, method, params = {}, timeoutMs = 30000) {
        return this.post({ jsonrpc: "2.0", id, method, params }, timeoutMs, id);
    }

    notify(method, params = {}, timeoutMs = 30000) {
        return this.post({ jsonrpc: "2.0", method, params }, timeoutMs);
    }
}

function summarizeResult(result) {
    if (!result || typeof result !== "object") return "";
    if (Array.isArray(result.content)) {
        const text = result.content
            .map((content) => (typeof content?.text === "string" ? content.text : ""))
            .join(" ")
            .trim();
        return text.slice(0, 200);
    }
    return JSON.stringify(result).slice(0, 200);
}

// Probe one server end-to-end.
// server: { apiName, displayName, configName, url, key }
// -> structured result with per-step pass/fail + latency.
export async function probe(server) {
    const out = {
        apiName: server.apiName,
        displayName: server.displayName,
        steps: {
            initialize: { ok: false },
            toolsList: { ok: false },
            toolsCall: { ok: false, status: "pending" },
        },
        toolCount: 0,
        toolNames: [],
        toolCalled: null,
        toolSource: null,
        error: null,
    };

    const client = new HttpClient(server.url, server.key);
    try {
        const t0 = Date.now();
        const init = await client.request(1, "initialize", {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: {},
            clientInfo: { name: "mcp-smoke", version: "1.0.0" },
        }, 45000);
        out.steps.initialize.latencyMs = Date.now() - t0;
        if (!init) throw new Error("initialize returned no JSON-RPC response");
        if (init.error) throw new Error(`initialize error: ${JSON.stringify(init.error).slice(0, 300)}`);
        const info = init.result?.serverInfo;
        if (!init.result || !(info || init.result.protocolVersion)) {
            throw new Error("initialize returned no serverInfo / protocolVersion");
        }
        out.steps.initialize.ok = true;
        out.serverInfo = info ? `${info.name || "?"}@${info.version || "?"}` : "(no serverInfo)";

        await client.notify("notifications/initialized");

        const t1 = Date.now();
        const list = await client.request(2, "tools/list", {}, 30000);
        out.steps.toolsList.latencyMs = Date.now() - t1;
        if (!list) throw new Error("tools/list returned no JSON-RPC response");
        if (list.error) throw new Error(`tools/list error: ${JSON.stringify(list.error).slice(0, 300)}`);
        const tools = list.result?.tools || [];
        out.toolCount = tools.length;
        out.toolNames = tools.map((tool) => tool?.name).filter(Boolean);
        if (tools.length < 1) throw new Error("tools/list returned 0 tools");
        out.steps.toolsList.ok = true;

        const pick = pickSafeTool(server, tools);
        if (!pick || pick.skip) {
            out.steps.toolsCall.status = "skipped";
            out.steps.toolsCall.ok = true;
            out.steps.toolsCall.note = pick?.reason || "no safe read-only tool found";
            out.toolSource = pick?.source || null;
        } else {
            out.toolCalled = pick.tool;
            out.toolSource = pick.source;
            const t2 = Date.now();
            const call = await client.request(3, "tools/call", { name: pick.tool, arguments: pick.args }, 45000);
            out.steps.toolsCall.latencyMs = Date.now() - t2;
            if (!call) {
                out.steps.toolsCall.status = "failed";
                out.steps.toolsCall.error = "tools/call returned no JSON-RPC response";
            } else if (call.error) {
                out.steps.toolsCall.status = "failed";
                out.steps.toolsCall.error = JSON.stringify(call.error).slice(0, 300);
            } else if (call.result?.isError) {
                out.steps.toolsCall.status = "failed";
                out.steps.toolsCall.error = summarizeResult(call.result);
            } else {
                out.steps.toolsCall.status = "passed";
                out.steps.toolsCall.ok = true;
                out.steps.toolsCall.result = "response received";
            }
        }
    } catch (error) {
        out.error = error.message;
    }

    out.ok = out.steps.initialize.ok && out.steps.toolsList.ok && out.steps.toolsCall.ok && !out.error;
    out.status = !out.ok
        ? "failed"
        : out.steps.toolsCall.status === "skipped"
            ? "skipped"
            : "passed";
    return out;
}
