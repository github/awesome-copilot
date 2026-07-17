import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { probe } from "./test/mcp-probe.mjs";

test("native HTTP probe carries API key and MCP session through an SSE handshake", async (t) => {
    const apiKeys = [];
    const sessionIds = [];
    const methods = [];
    const server = createServer(async (req, res) => {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const message = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        apiKeys.push(req.headers["x-api-key"]);
        sessionIds.push(req.headers["mcp-session-id"] || null);
        methods.push(message.method);

        if (message.method === "notifications/initialized") {
            res.writeHead(202);
            res.end();
            return;
        }

        let result;
        if (message.method === "initialize") {
            res.setHeader("Mcp-Session-Id", "session-1");
            result = {
                protocolVersion: "2025-06-18",
                serverInfo: { name: "test-server", version: "1.0.0" },
                capabilities: { tools: {} },
            };
        } else if (message.method === "tools/list") {
            result = { tools: [{ name: "ListTeams", inputSchema: { type: "object" } }] };
        } else {
            result = { content: [{ type: "text", text: "ok" }] };
        }

        res.setHeader("Content-Type", "text/event-stream");
        res.end(`event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", id: message.id, result })}\n\n`);
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));

    const { port } = server.address();
    const result = await probe({
        apiName: "WorkIQTeams",
        displayName: "WorkIQ Teams",
        url: `http://127.0.0.1:${port}/mcp`,
        key: "secret",
    });

    assert.equal(result.ok, true);
    assert.equal(result.toolCount, 1);
    assert.equal(result.toolCalled, "ListTeams");
    assert.deepEqual(methods, ["initialize", "notifications/initialized", "tools/list", "tools/call"]);
    assert.deepEqual(apiKeys, ["secret", "secret", "secret", "secret"]);
    assert.deepEqual(sessionIds, [null, "session-1", "session-1", "session-1"]);
});
