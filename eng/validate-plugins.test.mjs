import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { isReusableExtensionRegistered, validateCompositionNamespace, validateMcpConfig } from "./validate-plugins.mjs";

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

test("rejects an mcp.json symlink outside the plugin root", (t) => {
  const dir = makePluginDir({});
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "plugin-mcp-outside-"));
  const outsideMcp = path.join(outside, "mcp.json");
  fs.writeFileSync(outsideMcp, JSON.stringify({ $schema: MCP_SCHEMA, mcpServers: {} }));
  try {
    fs.symlinkSync(outsideMcp, path.join(dir, "mcp.json"), "file");
  } catch {
    t.skip("symlink creation is not available");
    return;
  }
  assert.deepEqual(validateMcpConfig(dir), [
    "mcp.json must resolve to a file inside the plugin root",
  ]);
});

test("reports a dangling mcp.json symlink", (t) => {
  const dir = makePluginDir({});
  try {
    fs.symlinkSync(path.join(dir, "missing-mcp.json"), path.join(dir, "mcp.json"), "file");
  } catch {
    t.skip("symlink creation is not available");
    return;
  }
  assert.deepEqual(validateMcpConfig(dir), ["mcp.json is a dangling symbolic link"]);
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
  assert.match(errors[0], /must have required property '\$schema'/);
  assert.match(errors[1], /must NOT have additional properties \(inputs\)/);
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
  assert.deepEqual(errors, [
    "mcp.json /mcpServers/bad must have required property 'url'",
    "mcp.json /mcpServers/worse/type must be one of stdio, streamable-http, sse",
  ]);
});

test("rejects a stdio server with an empty command", () => {
  const dir = makePluginDir({
    "mcp.json": {
      $schema: MCP_SCHEMA,
      mcpServers: { demo: { type: "stdio", command: "" } },
    },
  });
  assert.deepEqual(validateMcpConfig(dir), [
    "mcp.json /mcpServers/demo/command must NOT have fewer than 1 characters",
  ]);
});

test("rejects an unknown field on a server entry", () => {
  const dir = makePluginDir({
    "mcp.json": {
      $schema: MCP_SCHEMA,
      mcpServers: { demo: { type: "stdio", command: "docker", timeout: 5 } },
    },
  });
  assert.deepEqual(validateMcpConfig(dir), [
    "mcp.json /mcpServers/demo must NOT have additional properties (timeout)",
  ]);
});

test("rejects a reserved PLUGIN_ROOT environment key", () => {
  const dir = makePluginDir({
    "mcp.json": {
      $schema: MCP_SCHEMA,
      mcpServers: { demo: { type: "stdio", command: "docker", env: { PLUGIN_ROOT: "/x" } } },
    },
  });
  assert.deepEqual(validateMcpConfig(dir), [
    'mcp.json /mcpServers/demo/env "PLUGIN_ROOT" is reserved',
  ]);
});

test("rejects an absolute cwd on a stdio server", () => {
  const dir = makePluginDir({
    "mcp.json": {
      $schema: MCP_SCHEMA,
      mcpServers: { demo: { type: "stdio", command: "docker", cwd: "/abs" } },
    },
  });
  const errors = validateMcpConfig(dir);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /^mcp\.json \/mcpServers\/demo\/cwd must match pattern/);
});

test("rejects non-string args on a stdio server", () => {
  const dir = makePluginDir({
    "mcp.json": {
      $schema: MCP_SCHEMA,
      mcpServers: { demo: { type: "stdio", command: "docker", args: [1] } },
    },
  });
  assert.deepEqual(validateMcpConfig(dir), [
    "mcp.json /mcpServers/demo/args/0 must be string",
  ]);
});

test("rejects a stdio server command that is an absolute path", () => {
  const dir = makePluginDir({
    "mcp.json": {
      $schema: MCP_SCHEMA,
      mcpServers: { demo: { type: "stdio", command: "/bin/tool" } },
    },
  });
  assert.deepEqual(validateMcpConfig(dir), [
    'mcp.json /mcpServers/demo/command must be a bare executable name or a plugin-relative path starting with "./"',
  ]);
});

test("rejects a plugin-relative command that escapes plugin root", () => {
  const dir = makePluginDir({
    "mcp.json": {
      $schema: MCP_SCHEMA,
      mcpServers: { demo: { type: "stdio", command: "./../../outside" } },
    },
  });
  assert.deepEqual(validateMcpConfig(dir), [
    'mcp.json /mcpServers/demo/command must be a bare executable name or a plugin-relative path starting with "./"',
  ]);
});

test("rejects a stdio server cwd that escapes plugin root", () => {
  const dir = makePluginDir({
    "mcp.json": {
      $schema: MCP_SCHEMA,
      mcpServers: { demo: { type: "stdio", command: "docker", cwd: "./../../outside" } },
    },
  });
  assert.deepEqual(validateMcpConfig(dir), [
    "mcp.json /mcpServers/demo/cwd must stay within the plugin root or plugin data directory",
  ]);
});

test("rejects traversal in plugin root and data placeholders", () => {
  const dir = makePluginDir({
    "mcp.json": {
      $schema: MCP_SCHEMA,
      mcpServers: {
        root: { type: "stdio", command: "docker", cwd: "${PLUGIN_ROOT}/../../outside" },
        data: { type: "stdio", command: "docker", cwd: "${PLUGIN_DATA}/../outside" },
      },
    },
  });
  assert.deepEqual(validateMcpConfig(dir), [
    "mcp.json /mcpServers/root/cwd must stay within the plugin root or plugin data directory",
    "mcp.json /mcpServers/data/cwd must stay within the plugin root or plugin data directory",
  ]);
});

test("rejects mixed-separator traversal in a PLUGIN_DATA placeholder", () => {
  const dir = makePluginDir({
    "mcp.json": {
      $schema: MCP_SCHEMA,
      mcpServers: {
        data: { type: "stdio", command: "docker", cwd: "${PLUGIN_DATA}/..\\outside" },
      },
    },
  });
  assert.deepEqual(validateMcpConfig(dir), [
    "mcp.json /mcpServers/data/cwd must stay within the plugin root or plugin data directory",
  ]);
});

test("rejects Windows-style traversal in plugin-relative paths", () => {
  const dir = makePluginDir({
    "mcp.json": {
      $schema: MCP_SCHEMA,
      mcpServers: {
        command: { type: "stdio", command: ".\\..\\..\\outside" },
        cwd: { type: "stdio", command: "docker", cwd: "${PLUGIN_DATA}\\..\\outside" },
      },
    },
  });
  assert.deepEqual(validateMcpConfig(dir), [
    "mcp.json /mcpServers/cwd/cwd must match pattern \"^(?:\\./|\\$\\{PLUGIN_ROOT\\}(?:/|$)|\\$\\{PLUGIN_DATA\\}(?:/|$))\"",
  ]);
});

test("rejects a backslash-prefixed stdio command", () => {
  const dir = makePluginDir({
    "mcp.json": {
      $schema: MCP_SCHEMA,
      mcpServers: { demo: { type: "stdio", command: ".\\tool" } },
    },
  });
  assert.deepEqual(validateMcpConfig(dir), [
    'mcp.json /mcpServers/demo/command must be a bare executable name or a plugin-relative path starting with "./"',
  ]);
});

test("rejects plugin-relative paths that traverse a symlink outside the root", (t) => {
  const dir = makePluginDir({});
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "plugin-mcp-outside-"));
  try {
    fs.symlinkSync(outside, path.join(dir, "linked"), "junction");
  } catch {
    t.skip("symlink creation is not available");
    return;
  }
  fs.writeFileSync(path.join(dir, "mcp.json"), JSON.stringify({
    $schema: MCP_SCHEMA,
    mcpServers: {
      command: { type: "stdio", command: "./linked/tool" },
      root: { type: "stdio", command: "docker", cwd: "${PLUGIN_ROOT}/linked" },
      data: { type: "stdio", command: "docker", cwd: "${PLUGIN_DATA}/linked" },
    },
  }));
  assert.deepEqual(validateMcpConfig(dir), [
    'mcp.json /mcpServers/command/command must be a bare executable name or a plugin-relative path starting with "./"',
    "mcp.json /mcpServers/root/cwd must stay within the plugin root or plugin data directory",
  ]);
});

test("rejects command and PLUGIN_ROOT cwd paths through a dangling symlink", (t) => {
  const dir = makePluginDir({});
  try {
    fs.symlinkSync(path.join(dir, "missing-directory"), path.join(dir, "dangling"), "junction");
  } catch {
    t.skip("symlink creation is not available");
    return;
  }
  fs.writeFileSync(path.join(dir, "mcp.json"), JSON.stringify({
    $schema: MCP_SCHEMA,
    mcpServers: {
      command: { type: "stdio", command: "./dangling/tool" },
      cwd: { type: "stdio", command: "docker", cwd: "${PLUGIN_ROOT}/dangling/work" },
    },
  }));
  assert.deepEqual(validateMcpConfig(dir), [
    'mcp.json /mcpServers/command/command must be a bare executable name or a plugin-relative path starting with "./"',
    "mcp.json /mcpServers/cwd/cwd must stay within the plugin root or plugin data directory",
  ]);
});

test("accepts PLUGIN_DATA paths without checking unrelated plugin symlinks", (t) => {
  const dir = makePluginDir({});
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "plugin-mcp-data-outside-"));
  try {
    fs.symlinkSync(outside, path.join(dir, "linked"), "junction");
  } catch {
    t.skip("symlink creation is not available");
    return;
  }
  fs.writeFileSync(path.join(dir, "mcp.json"), JSON.stringify({
    $schema: MCP_SCHEMA,
    mcpServers: {
      data: { type: "stdio", command: "docker", cwd: "${PLUGIN_DATA}/linked" },
    },
  }));
  assert.deepEqual(validateMcpConfig(dir), []);
});

test("rejects non-HTTP remote URLs", () => {
  const dir = makePluginDir({
    "mcp.json": {
      $schema: MCP_SCHEMA,
      mcpServers: { demo: { type: "sse", url: "javascript:alert(1)" } },
    },
  });
  assert.deepEqual(validateMcpConfig(dir), [
    "mcp.json /mcpServers/demo/url must be an absolute HTTP(S) URL without userinfo or fragment",
  ]);
});

test("rejects public HTTP remote URLs", () => {
  const dir = makePluginDir({
    "mcp.json": {
      $schema: MCP_SCHEMA,
      mcpServers: { demo: { type: "streamable-http", url: "http://example.com/mcp" } },
    },
  });
  assert.deepEqual(validateMcpConfig(dir), [
    "mcp.json /mcpServers/demo/url must use HTTPS for non-loopback hosts",
  ]);
});

test("rejects duplicate and invalid remote headers", () => {
  const dir = makePluginDir({
    "mcp.json": {
      $schema: MCP_SCHEMA,
      mcpServers: {
        demo: {
          type: "sse",
          url: "https://example.com/mcp",
          headers: { "X-Custom": "ok", "x-custom": "also ok", "Bad Header": "ok", "X-Bad": "bad\nvalue" },
        },
      },
    },
  });
  assert.deepEqual(validateMcpConfig(dir), [
    "mcp.json /mcpServers/demo/headers must not contain duplicate header names",
    "mcp.json /mcpServers/demo/headers/Bad Header must be a valid HTTP header name",
    "mcp.json /mcpServers/demo/headers/X-Bad must be a valid HTTP header value",
  ]);
});

test("rejects credential-bearing and API-key-style remote headers", () => {
  const dir = makePluginDir({
    "mcp.json": {
      $schema: MCP_SCHEMA,
      mcpServers: {
        demo: {
          type: "sse",
          url: "https://example.com/mcp",
          headers: {
            Authorization: "Bearer fixed",
            "Proxy-Authorization": "Basic fixed",
            "x-api-key": "<YOUR_TOKEN>",
            "api-key": "fixed",
          },
        },
      },
    },
  });
  assert.deepEqual(validateMcpConfig(dir), [
    "mcp.json /mcpServers/demo/headers/Authorization must not contain credentials or secrets",
    "mcp.json /mcpServers/demo/headers/Proxy-Authorization must not contain credentials or secrets",
    "mcp.json /mcpServers/demo/headers/x-api-key must not contain credentials or secrets",
    "mcp.json /mcpServers/demo/headers/api-key must not contain credentials or secrets",
  ]);
});

test("accepts an ordinary non-secret custom remote header", () => {
  const dir = makePluginDir({
    "mcp.json": {
      $schema: MCP_SCHEMA,
      mcpServers: {
        demo: {
          type: "streamable-http",
          url: "https://example.com/mcp",
          headers: { "X-Apimatic-Mcp-Client": "VsCode" },
        },
      },
    },
  });
  assert.deepEqual(validateMcpConfig(dir), []);
});

test("rejects mcpServers declared under extensions in plugin.json", () => {
  assert.deepEqual(
    validateCompositionNamespace({ extensions: { mcpServers: { demo: {} } } }),
    ["extensions.mcpServers is not supported; declare MCP servers in mcp.json at the plugin root"]
  );
});

test("rejects mcpServers declared under the awesome-copilot namespace", () => {
  const errors = validateCompositionNamespace({
    extensions: { "com.github.awesome-copilot": { mcpServers: "./mcp.json" } },
  });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /mcpServers is not supported; declare MCP servers in mcp\.json/);
});

test("rejects mcpServers declared under the com.github.copilot namespace", () => {
  const errors = validateCompositionNamespace({
    extensions: { "com.github.copilot": { mcpServers: { demo: {} } } },
  });
  assert.deepEqual(errors, [
    'extensions["com.github.copilot"].mcpServers is not supported; declare MCP servers in mcp.json at the plugin root',
  ]);
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
