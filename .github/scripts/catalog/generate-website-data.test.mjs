import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { generateAgentsData } from "./generate-website-data.mjs";

function createAgent(t, toolsField) {
  const agentsDir = fs.mkdtempSync(path.join(os.tmpdir(), "website-agents-"));
  t.after(() => fs.rmSync(agentsDir, { recursive: true, force: true }));
  fs.writeFileSync(
    path.join(agentsDir, "sample.agent.md"),
    `---\nname: Sample\ndescription: Sample agent\n${toolsField}\n---\n`
  );
  return agentsDir;
}

for (const [name, field, expected] of [
  ["scalar MCP wildcard", "tools: new-relic-mcp-server/*", ["new-relic-mcp-server/*"]],
  ["comma-separated tools", "tools: ' read, new-relic-mcp-server/*, edit, '", ["read", "new-relic-mcp-server/*", "edit"]],
  ["YAML list", "tools:\n  - read\n  - new-relic-mcp-server/*", ["read", "new-relic-mcp-server/*"]],
  ["omitted tools", "", []],
  ["empty list", "tools: []", []],
  ["empty string", "tools: ''", []],
  ["null tools", "tools:", []],
]) {
  test(`generates agent tools and filter facets for ${name}`, (t) => {
    const agentsDir = createAgent(t, field);
    const data = generateAgentsData(new Map(), agentsDir);

    assert.equal(data.items.length, 1);
    assert.deepEqual(data.items[0].tools, expected);
    assert.deepEqual(data.filters.tools, [...expected].sort());
  });
}

for (const field of [
  "tools: false",
  "tools: 42",
  "tools: {read: true}",
  "tools: [read, 42]",
]) {
  test(`reports invalid ${field} with the source filename`, (t) => {
    const agentsDir = createAgent(t, field);

    assert.throws(() => generateAgentsData(new Map(), agentsDir), {
      name: "TypeError",
      message: /Invalid tools in .*sample\.agent\.md: expected a string or an array of strings/,
    });
  });
}
