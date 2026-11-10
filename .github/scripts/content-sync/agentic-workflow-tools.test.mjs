import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { ROOT_FOLDER } from "../lib/constants.mjs";
import { parseFrontmatter, parseYamlFile } from "../lib/yaml-parser.mjs";

const workflowPath = (name, extension = "md") => path.join(ROOT_FOLDER, ".github/workflows", `${name}.${extension}`);

test("preview CI covers changes to the sync helper and its regression tests", () => {
  const preview = parseYamlFile(workflowPath("deploy-website-preview", "yml"));
  for (const file of [".github/scripts/content-sync/app-for-beginners-sync.mjs", ".github/scripts/content-sync/app-for-beginners-sync.test.mjs"]) {
    assert.ok(fs.existsSync(path.join(ROOT_FOLDER, file)), `Missing sync helper: ${file}`);
    assert.ok(preview.on.pull_request.paths.some((pattern) => path.matchesGlob(file, pattern)), `Preview CI does not cover ${file}`);
  }
});

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
  const commands = Array.from(source.matchAll(/^- (https:\/\/\S+)/gm), ([, url]) => `curl -q -fsSL --max-time 30 ${url}`);
  assert.deepEqual(metadata.tools.bash?.toSorted(), commands.toSorted(), "Fetch permissions disable curlrc first and match the listed source URLs");
  const runner = compiled.jobs.agent.steps.find((step) => step.id === "agentic_execution").run;
  for (const command of commands) {
    assert.ok(runner.includes(`shell(${command})`), `Fetch command is not compiled: ${command}`);
  }
});

for (const command of ["node .github/scripts/content-sync/app-for-beginners-sync.mjs:*", "git diff:*", "git status:*", "git show:*", "git switch --detach:*"]) {
  test(`course sync argument permissions: ${command}`, () => {
    const metadata = parseFrontmatter(workflowPath("app-for-beginners-sync"));
    const compiled = parseYamlFile(workflowPath("app-for-beginners-sync", "lock.yml"));
    assert.ok(metadata.tools.bash.includes(command), `Source permission missing: ${command}`);
    assert.ok(compiled.jobs.agent.steps.find((step) => step.id === "agentic_execution").run.includes(`shell(${command})`), `Compiled permission missing: ${command}`);
  });
}

for (const name of ["learning-hub-updater", "app-for-beginners-sync"]) {
  test(`${name} rejects blanket shell permissions in source and compiled runner`, () => {
    const metadata = parseFrontmatter(workflowPath(name));
    assert.ok(!metadata.tools.bash.some((command) => ["*", ":*"].includes(command.trim())), "Unrestricted bash entry");
    const compiled = parseYamlFile(workflowPath(name, "lock.yml"));
    const runner = compiled.jobs.agent.steps.find((step) => step.id === "agentic_execution").run;
    assert.doesNotMatch(runner, /--allow-tool(?:\s+|=)(?:shell|'shell'|"shell")(?=\s|$)/, "Unrestricted shell runner flag");
    assert.doesNotMatch(runner, /--allow-all-tools(?:[=\s]|$)/, "Unrestricted all-tools runner flag");
  });
}
