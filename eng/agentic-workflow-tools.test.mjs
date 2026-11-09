import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { parseFrontmatter, parseYamlFile } from "./yaml-parser.mjs";

const workflowPath = (name, extension = "md") => fileURLToPath(new URL(`../.github/workflows/${name}.${extension}`, import.meta.url));

test("Learning Hub research sources are reachable through its declared network policy", () => {
  const sourcePath = workflowPath("learning-hub-updater");
  const source = fs.readFileSync(sourcePath, "utf8");
  const metadata = parseFrontmatter(sourcePath);
  const requiredHosts = new Set([...source.matchAll(/^- (https:\/\/\S+)/gm)].map((match) => new URL(match[1]).hostname));
  assert.ok(requiredHosts.size > 0);
  for (const hostname of requiredHosts) {
    assert.ok(metadata.network?.allowed?.includes(hostname), `Research source ${hostname} is not allowed`);
  }
});

test("Learning Hub uses a permitted fetch command instead of an unavailable offline web tool", () => {
  const sourcePath = workflowPath("learning-hub-updater");
  const source = fs.readFileSync(sourcePath, "utf8");
  const metadata = parseFrontmatter(sourcePath);
  const compiled = parseYamlFile(workflowPath("learning-hub-updater", "lock.yml"));
  assert.equal(Object.hasOwn(metadata.tools, "web-fetch"), false);
  const runner = compiled.jobs.agent.steps.find((step) => step.id === "agentic_execution").run;
  for (const [, url] of source.matchAll(/^- (https:\/\/\S+)/gm)) {
    const command = `curl -fsSL --max-time 30 ${url}`;
    assert.ok(metadata.tools.bash?.includes(command), `Fetch command is not declared: ${url}`);
    assert.ok(runner.includes(`shell(${command})`), `Fetch command is not compiled: ${url}`);
  }
  assert.ok(!metadata.tools.bash.some((command) => command.includes("*")), "Fetch permissions are limited to the listed source URLs");
});

test("the course sync helper is permitted with its required SHA and check arguments", () => {
  const metadata = parseFrontmatter(workflowPath("app-for-beginners-sync"));
  const compiled = parseYamlFile(workflowPath("app-for-beginners-sync", "lock.yml"));
  const command = "node .github/scripts/app-for-beginners-sync.mjs";
  assert.ok(metadata.tools.bash.includes(`${command}:*`));
  assert.ok(compiled.jobs.agent.steps.find((step) => step.id === "agentic_execution").run.includes(`shell(${command}:*)`));
  assert.ok(!metadata.tools.bash.includes(":*"), "Do not grant unrestricted shell access");
});
