import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { isReusableExtensionRegistered, validateMcpConfig } from "./validate-plugins.mjs";

const MCP_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json";

function makePluginDir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "plugin-mcp-"));
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), typeof content === "string" ? content : JSON.stringify(content));
  }
  return dir;
}


test("accepts a reusable extension bundled only by a parent plugin", () => {
  assert.equal(
    isReusableExtensionRegistered(
      "daily-focus-board",
      new Set(["ember"]),
      new Set(["daily-focus-board"])
    ),
    true
  );
});

test("accepts a spec-compliant mcp.json at the plugin root", () => {
  const dir = makePluginDir({
    "mcp.json": {
      $schema: MCP_SCHEMA,
      mcpServers: { demo: { type: "stdio", command: "docker" } },
    },
  });
  assert.deepEqual(validateMcpConfig(dir), []);
});

test("accepts a plugin with no mcp.json", () => {
  assert.deepEqual(validateMcpConfig(makePluginDir({})), []);
});

test("rejects a legacy .mcp.json location", () => {
  const dir = makePluginDir({
    ".mcp.json": { mcpServers: {} },
  });
  assert.deepEqual(validateMcpConfig(dir), [
    "MCP configuration must live at mcp.json in the plugin root, not .mcp.json",
  ]);
});

test("rejects mcp.json with a wrong $schema and an unknown top-level field", () => {
  const dir = makePluginDir({
    "mcp.json": { mcpServers: {}, inputs: [] },
  });
  const errors = validateMcpConfig(dir);
  assert.equal(errors.length, 2);
  assert.match(errors[0], /\$schema must be/);
  assert.match(errors[1], /must not contain the top-level field "inputs"/);
});

test("rejects a server entry missing required transport fields", () => {
  const dir = makePluginDir({
    "mcp.json": {
      $schema: MCP_SCHEMA,
      mcpServers: {
        bad: { type: "streamable-http" },
        worse: { type: "http" },
      },
    },
  });
  const errors = validateMcpConfig(dir);
  assert.match(errors[0], /\.url is required for streamable-http servers/);
  assert.match(errors[1], /\.type must be one of/);
});

test("accepts a same-named standalone extension plugin", () => {
  assert.equal(
    isReusableExtensionRegistered(
      "daily-focus-board",
      new Set(["daily-focus-board"]),
      new Set()
    ),
    true
  );
});

test("rejects an orphaned reusable extension", () => {
  assert.equal(
    isReusableExtensionRegistered(
      "daily-focus-board",
      new Set(["ember"]),
      new Set()
    ),
    false
  );
});
