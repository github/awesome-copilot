import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("proxy gates initialization then forwards established-session requests concurrently", async () => {
    const source = await readFile(new URL("mcp-unwrap-proxy.mjs", import.meta.url), "utf8");
    assert.match(source, /return new Promise\(\(resolve\) =>/);
    assert.match(source, /let startupQueue = Promise\.resolve\(\)/);
    assert.match(source, /startupQueue = startupQueue\.then\(\(\) => startForward\(trimmed\)\)/);
    assert.match(source, /method === "initialize"/);
    assert.match(source, /sessionEstablished = true/);
    assert.match(source, /else \{\s*startForward\(trimmed\)/);
    assert.match(source, /Promise\.allSettled\(\[\.\.\.activeRequests\]\)/);
    assert.match(source, /Upstream returned no JSON-RPC response/);
    assert.match(source, /Upstream returned an invalid JSON-RPC response/);
    assert.match(source, /isMatchingJsonRpcResponse/);
    assert.match(source, /Object\.is\(message\.id, requestId\)/);
    assert.match(source, /isJsonRpcNotification/);
    assert.match(source, /r\.setTimeout\(UPSTREAM_TIMEOUT_MS/);
});
