import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { armSegment } from "./armClient.mjs";

const here = new URL(".", import.meta.url);

test("ARM path segments reject traversal aliases", () => {
    assert.throws(() => armSegment("."), /Invalid ARM resource identifier/);
    assert.throws(() => armSegment(".."), /Invalid ARM resource identifier/);
    assert.equal(armSegment("valid.name"), "valid.name");
});

test("namespace creation is create-only and reports provisioning timeout", async () => {
    const source = await readFile(new URL("armClient.mjs", here), "utf8");
    assert.match(source, /"If-None-Match": "\*"/);
    assert.match(source, /Provisioning timed out/);
    assert.match(source, /console\.error\(`\\nSign in to Azure/);
    assert.match(source, /child\.on\("error", \(\) => \{\}\)/);
});

test("installer preserves capability tokens and persists a stable proxy", async () => {
    const source = await readFile(new URL("install.mjs", here), "utf8");
    const fallbacks = source.match(/return installConnector\(config, apiName, displayName, callbackBase, scope, capabilityToken\)/g);
    assert.equal(fallbacks?.length, 2);
    assert.match(source, /args: \[STABLE_MCP_PROXY_PATH\]/);
    assert.match(source, /await fs\.copyFile\(MCP_PROXY_PATH, STABLE_MCP_PROXY_PATH\)/);
    assert.match(source, /const cacheKey = `\$\{sub\}:\$\{location\}:\$\{apiName\}:\$\{requireSwagger\}`/);
    assert.match(source, /catch \(error\) \{\s*await deleteConnection\(config, connName\)/);
});

test("smoke cleanup runs from finally and reports cleanup failures", async () => {
    const source = await readFile(new URL("test/smoke.mjs", here), "utf8");
    assert.match(source, /finally \{\s*if \(record\.cleanup\)/);
    assert.match(source, /record\.cleanupError/);
    assert.match(source, /failed\.length > 0 \|\| orchestrationErrors\.length > 0/);
});

test("auth cache permissions are tightened after every write", async () => {
    const source = await readFile(new URL("armClient.mjs", here), "utf8");
    assert.match(source, /chmodSync\(TOKEN_FILE, 0o600\)/);
});

test("test reports do not persist successful tool response content", async () => {
    const source = await readFile(new URL("test/mcp-probe.mjs", here), "utf8");
    assert.doesNotMatch(source, /toolsCall\.preview\s*=/);
    assert.match(source, /toolsCall\.result = "response received"/);
});

test("obsolete in-memory add and remove canvas actions are not advertised", async () => {
    const source = await readFile(new URL("extension.mjs", here), "utf8");
    assert.doesNotMatch(source, /name: "add_connector"/);
    assert.doesNotMatch(source, /name: "remove_connector"/);
    assert.doesNotMatch(source, /name: "list_connectors"/);
    assert.match(source, /name: "open_sandbox"/);
});
