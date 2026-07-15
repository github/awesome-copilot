// MCP stdio <-> streamable-HTTP proxy that unwraps Azure Logic Apps "$content" envelopes.
//
// The Azure Connector-Gateway MCP endpoint returns post-initialize responses
// (tools/list, tools/call, ...) double-wrapped in a Logic Apps binary envelope:
//   Content-Type: application/json
//   { "$content-encoding": "identity", "$content-type": "text/event-stream", "$content": "<base64 SSE>" }
// A spec-compliant MCP client (the Copilot CLI) parses that JSON, finds no
// jsonrpc/id, and fails tools/list with a zod invalid_union error -> no tools load.
//
// This proxy speaks plain newline-delimited JSON-RPC to the CLI over stdio and
// forwards each request to the HTTPS endpoint, unwrapping the envelope (and the
// raw SSE framing) before emitting clean JSON-RPC back. It never opens the
// standalone GET SSE stream, so the endpoint's 404 on that stream is irrelevant.
//
// Config (env):
//   MCP_TARGET_URL  - required, the .../mcp endpoint URL
//   MCP_API_KEY     - optional, sent as X-API-Key
//   MCP_HEADERS     - optional JSON object of extra headers

import { request as httpsRequest } from "node:https";
import { createInterface } from "node:readline";

const targetUrl = process.env.MCP_TARGET_URL;
const UPSTREAM_TIMEOUT_MS = 60_000;
if (!targetUrl) {
    process.stderr.write("[mcp-unwrap-proxy] MCP_TARGET_URL is required\n");
    process.exit(1);
}
// Defense in depth: the endpoint comes from an authenticated ARM read of the
// user's own gateway, but validate it anyway before we POST the API key.
// Requires https, rejects embedded credentials, and blocks obvious
// internal/link-local hosts. This is a string-level host check; it does not
// resolve DNS, which is acceptable given the value's trusted ARM origin.
function assertSafeTarget(u) {
    if (u.protocol !== "https:") {
        process.stderr.write("[mcp-unwrap-proxy] MCP_TARGET_URL must be https\n");
        process.exit(1);
    }
    if (u.username || u.password) {
        process.stderr.write("[mcp-unwrap-proxy] MCP_TARGET_URL must not embed credentials\n");
        process.exit(1);
    }
    const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    const isIpv6 = host.includes(":");
    const blocked =
        host === "localhost" || host.endsWith(".localhost") ||
        host === "metadata.google.internal" || host === "0.0.0.0" ||
        (isIpv6 && (host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd"))) ||
        /^(127|10)\./.test(host) ||
        /^169\.254\./.test(host) ||
        /^192\.168\./.test(host) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(host);
    if (blocked) {
        process.stderr.write(`[mcp-unwrap-proxy] MCP_TARGET_URL host not allowed: ${host}\n`);
        process.exit(1);
    }
}

const url = new URL(targetUrl);
assertSafeTarget(url);
const driver = httpsRequest;

const baseHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
};
if (process.env.MCP_API_KEY) baseHeaders["X-API-Key"] = process.env.MCP_API_KEY;
if (process.env.MCP_HEADERS) {
    try {
        Object.assign(baseHeaders, JSON.parse(process.env.MCP_HEADERS));
    } catch {
        process.stderr.write("[mcp-unwrap-proxy] ignoring malformed MCP_HEADERS\n");
    }
}

let sessionId = null;

function emit(msg) {
    process.stdout.write(JSON.stringify(msg) + "\n");
}

function log(s) {
    process.stderr.write(`[mcp-unwrap-proxy] ${s}\n`);
}

// Pull JSON-RPC messages out of an SSE body (data: lines, possibly multi-event).
function parseSse(body) {
    const out = [];
    for (const block of body.split(/\r?\n\r?\n/)) {
        const data = block
            .split(/\r?\n/)
            .filter((l) => l.startsWith("data:"))
            .map((l) => l.slice(5).trim())
            .join("\n");
        if (!data) continue;
        try {
            out.push(JSON.parse(data));
        } catch {
            log(`could not parse SSE data chunk: ${data.slice(0, 120)}`);
        }
    }
    return out;
}

// Turn any HTTP response body into a list of JSON-RPC messages.
function extractMessages(contentType, body) {
    const ct = (contentType || "").toLowerCase();
    if (ct.includes("text/event-stream")) return parseSse(body);

    let parsed;
    try {
        parsed = JSON.parse(body);
    } catch {
        return [];
    }
    // Logic Apps $content envelope -> decode and recurse on the inner payload.
    if (parsed && typeof parsed === "object" && typeof parsed["$content"] === "string") {
        const inner = Buffer.from(parsed["$content"], "base64").toString("utf8");
        const innerCt = parsed["$content-type"] || "";
        if (innerCt.includes("text/event-stream") || /^\s*event:|\bdata:/.test(inner)) {
            return parseSse(inner);
        }
        try {
            return [JSON.parse(inner)];
        } catch {
            return [];
        }
    }
    return [parsed];
}

function forward(line) {
    let req;
    try {
        req = JSON.parse(line);
    } catch {
        return Promise.resolve();
    }
    const isNotification = req.id === undefined || req.id === null;

    return new Promise((resolve) => {
        const headers = { ...baseHeaders };
        if (sessionId) headers["Mcp-Session-Id"] = sessionId;

        const r = driver(
            {
                method: "POST",
                hostname: url.hostname,
                port: url.port || undefined,
                path: url.pathname + url.search,
                headers,
            },
            (res) => {
                const sid = res.headers["mcp-session-id"];
                if (sid) sessionId = sid;
                let body = "";
                res.setEncoding("utf8");
                res.on("data", (c) => (body += c));
                res.on("end", () => {
                    if (res.statusCode >= 400) {
                        log(`HTTP ${res.statusCode} for ${req.method}: ${body.slice(0, 200)}`);
                        if (!isNotification) {
                            emit({
                                jsonrpc: "2.0",
                                id: req.id,
                                error: { code: -32000, message: `Upstream HTTP ${res.statusCode}` },
                            });
                        }
                    } else if (res.statusCode === 202 || body.length === 0) {
                        if (!isNotification) {
                            emit({
                                jsonrpc: "2.0",
                                id: req.id,
                                error: { code: -32000, message: "Upstream returned no JSON-RPC response" },
                            });
                        }
                    } else {
                        const messages = extractMessages(res.headers["content-type"], body);
                        if (!isNotification && messages.length === 0) {
                            emit({
                                jsonrpc: "2.0",
                                id: req.id,
                                error: { code: -32000, message: "Upstream returned an invalid JSON-RPC response" },
                            });
                        } else {
                            for (const msg of messages) emit(msg);
                        }
                    }
                    resolve();
                });
            },
        );
        r.on("error", (e) => {
            log(`request error for ${req.method}: ${e}`);
            if (!isNotification) {
                emit({ jsonrpc: "2.0", id: req.id, error: { code: -32000, message: String(e) } });
            }
            resolve();
        });
        r.setTimeout(UPSTREAM_TIMEOUT_MS, () => {
            r.destroy(new Error(`Upstream request timed out after ${UPSTREAM_TIMEOUT_MS}ms`));
        });
        r.write(line);
        r.end();
    });
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
let requestQueue = Promise.resolve();
rl.on("line", (line) => {
    const trimmed = line.trim();
    if (trimmed) requestQueue = requestQueue.then(() => forward(trimmed));
});
rl.on("close", () => requestQueue.finally(() => process.exit(0)));
