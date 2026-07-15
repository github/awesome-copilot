// MCP probe — drives the REAL mcp-unwrap-proxy.mjs over stdio.
//
// This is deliberately not a raw HTTP probe. The recurring production failures
// (the Logic Apps `$content` base64 envelope, SSE framing, Mcp-Session-Id
// tracking) are exactly what the proxy exists to fix, so spawning the proxy and
// speaking JSON-RPC to its stdin is the faithful test of the path the Copilot
// CLI actually uses. We send: initialize → notifications/initialized →
// tools/list → tools/call, and assert on each step.

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { pickSafeTool } from "./safe-tools.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROXY_PATH = join(HERE, "..", "mcp-unwrap-proxy.mjs");

const PROTOCOL_VERSION = "2025-06-18";

// A tiny JSON-RPC-over-stdio client for one spawned proxy process. Responses are
// newline-delimited JSON on stdout; we match them to requests by `id`.
class ProxyClient {
    constructor(url, key) {
        this.child = spawn(process.execPath, [PROXY_PATH], {
            env: { ...process.env, MCP_TARGET_URL: url, MCP_API_KEY: key },
            stdio: ["pipe", "pipe", "pipe"],
        });
        this.buf = "";
        this.waiters = new Map(); // id → { resolve, reject, timer }
        this.stderr = "";
        this.exited = false;

        this.child.stdout.on("data", (chunk) => this._onData(chunk));
        this.child.stderr.on("data", (chunk) => {
            this.stderr += chunk.toString();
            if (this.stderr.length > 8000) this.stderr = this.stderr.slice(-8000);
        });
        this.child.on("exit", (code) => {
            this.exited = true;
            for (const [, w] of this.waiters) {
                clearTimeout(w.timer);
                w.reject(new Error(`proxy exited (code ${code}) before responding`));
            }
            this.waiters.clear();
        });
        this.child.on("error", (err) => {
            this.exited = true;
            for (const [, w] of this.waiters) {
                clearTimeout(w.timer);
                w.reject(err);
            }
            this.waiters.clear();
        });
    }

    _onData(chunk) {
        this.buf += chunk.toString();
        let nl;
        while ((nl = this.buf.indexOf("\n")) >= 0) {
            const line = this.buf.slice(0, nl).trim();
            this.buf = this.buf.slice(nl + 1);
            if (!line) continue;
            let msg;
            try {
                msg = JSON.parse(line);
            } catch {
                continue; // not a JSON-RPC line (defensive; proxy keeps logs on stderr)
            }
            if (msg.id !== undefined && msg.id !== null && this.waiters.has(msg.id)) {
                const w = this.waiters.get(msg.id);
                this.waiters.delete(msg.id);
                clearTimeout(w.timer);
                w.resolve(msg);
            }
        }
    }

    notify(method, params = {}) {
        this.child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`);
    }

    request(id, method, params = {}, timeoutMs = 30000) {
        return new Promise((resolve, reject) => {
            if (this.exited) {
                reject(new Error("proxy already exited"));
                return;
            }
            const timer = setTimeout(() => {
                this.waiters.delete(id);
                reject(new Error(`timeout after ${timeoutMs}ms waiting for ${method}`));
            }, timeoutMs);
            this.waiters.set(id, { resolve, reject, timer });
            this.child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
        });
    }

    kill() {
        try {
            this.child.stdin.end();
        } catch { /* ignore */ }
        try {
            this.child.kill();
        } catch { /* ignore */ }
    }
}

function summarizeResult(result) {
    // tools/call returns { content: [...], isError? }. Pull a short text preview.
    if (!result || typeof result !== "object") return "";
    if (Array.isArray(result.content)) {
        const text = result.content
            .map((c) => (typeof c?.text === "string" ? c.text : ""))
            .join(" ")
            .trim();
        return text.slice(0, 200);
    }
    return JSON.stringify(result).slice(0, 200);
}

// Probe one server end-to-end.
// server: { apiName, displayName, configName, url, key }
// → structured result with per-step pass/fail + latency.
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
        proxyStderrTail: "",
    };

    const client = new ProxyClient(server.url, server.key);
    try {
        // 1. initialize (first call is the slow one — generous timeout)
        const t0 = Date.now();
        const init = await client.request(1, "initialize", {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: {},
            clientInfo: { name: "mcp-smoke", version: "1.0.0" },
        }, 45000);
        out.steps.initialize.latencyMs = Date.now() - t0;
        if (init.error) throw new Error(`initialize error: ${JSON.stringify(init.error).slice(0, 300)}`);
        const info = init.result?.serverInfo;
        if (!init.result || !(info || init.result.protocolVersion)) {
            throw new Error("initialize returned no serverInfo / protocolVersion");
        }
        out.steps.initialize.ok = true;
        out.serverInfo = info ? `${info.name || "?"}@${info.version || "?"}` : "(no serverInfo)";

        // 2. notifications/initialized (no response)
        client.notify("notifications/initialized");

        // 3. tools/list
        const t1 = Date.now();
        const list = await client.request(2, "tools/list", {}, 30000);
        out.steps.toolsList.latencyMs = Date.now() - t1;
        if (list.error) throw new Error(`tools/list error: ${JSON.stringify(list.error).slice(0, 300)}`);
        const tools = list.result?.tools || [];
        out.toolCount = tools.length;
        out.toolNames = tools.map((t) => t?.name).filter(Boolean);
        if (tools.length < 1) throw new Error("tools/list returned 0 tools");
        out.steps.toolsList.ok = true;

        // 4. tools/call (safe tool, or SKIPPED)
        const pick = pickSafeTool(server, tools);
        if (!pick || pick.skip) {
            out.steps.toolsCall.status = "skipped";
            out.steps.toolsCall.ok = true; // not a failure — tools proven to load
            out.steps.toolsCall.note = pick?.reason || "no safe read-only tool found";
            out.toolSource = pick?.source || null;
        } else {
            out.toolCalled = pick.tool;
            out.toolSource = pick.source;
            const t2 = Date.now();
            const call = await client.request(3, "tools/call", { name: pick.tool, arguments: pick.args }, 45000);
            out.steps.toolsCall.latencyMs = Date.now() - t2;
            if (call.error) {
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
    } catch (err) {
        out.error = err.message;
    } finally {
        out.proxyStderrTail = client.stderr.slice(-600);
        client.kill();
    }

    out.ok = out.steps.initialize.ok && out.steps.toolsList.ok && out.steps.toolsCall.ok && !out.error;
    return out;
}
