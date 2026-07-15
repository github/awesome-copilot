import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("proxy serializes requests so initialization establishes the session first", async () => {
    const source = await readFile(new URL("mcp-unwrap-proxy.mjs", import.meta.url), "utf8");
    assert.match(source, /return new Promise\(\(resolve\) =>/);
    assert.match(source, /let requestQueue = Promise\.resolve\(\)/);
    assert.match(source, /requestQueue = requestQueue\.then\(\(\) => forward\(trimmed\)\)/);
    assert.match(source, /requestQueue\.finally\(\(\) => process\.exit\(0\)\)/);
    assert.match(source, /Upstream returned no JSON-RPC response/);
    assert.match(source, /Upstream returned an invalid JSON-RPC response/);
    assert.match(source, /r\.setTimeout\(UPSTREAM_TIMEOUT_MS/);
});
