#!/usr/bin/env node

import assert from "assert/strict";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

function sha256(bufferOrString) {
  return crypto.createHash("sha256").update(bufferOrString).digest("hex");
}

function hashFile(filePath) {
  return sha256(fs.readFileSync(filePath));
}

function listAllFilesRecursively(rootDir) {
  const results = [];
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listAllFilesRecursively(entryPath));
    } else {
      results.push(entryPath);
    }
  }
  return results;
}

function hashDirectory(dirPath) {
  const files = listAllFilesRecursively(dirPath)
    .map((filePath) => {
      const rel = path.relative(dirPath, filePath).replace(/\\/g, "/");
      return `${rel}:${hashFile(filePath)}`;
    })
    .sort();

  return sha256(files.join("\n"));
}

function mkdirp(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, content) {
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
}

function writeJson(filePath, value) {
  writeFile(filePath, JSON.stringify(value, null, 2) + "\n");
}

function runNodeScript(repoRoot, scriptRelativePath, args) {
  const scriptPath = path.join(repoRoot, scriptRelativePath);
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(
      `Script failed: ${scriptRelativePath}\nexit=${result.status}\nstdout=${result.stdout}\nstderr=${result.stderr}`
    );
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(
      `Expected JSON output from ${scriptRelativePath}\nstdout=${result.stdout}\nstderr=${result.stderr}`
    );
  }
}

function assertExactKeys(obj, expectedKeys, label) {
  const actualKeys = Object.keys(obj).sort();
  const sortedExpected = [...expectedKeys].sort();
  assert.deepEqual(actualKeys, sortedExpected, `${label} keys mismatch`);
}

function assertCheckerUiSummaryContract(payload) {
  assertExactKeys(payload, ["schemaVersion", "mode", "context", "counts", "buckets"], "checker root");
  assertExactKeys(payload.context, ["workspace", "index", "filters"], "checker context");
  assertExactKeys(payload.context.filters, ["include", "exclude", "filteredOutCount"], "checker filters");
  assertExactKeys(
    payload.counts,
    ["totalSelected", "filteredOut", "upToDate", "readyToUpdate", "conflicts", "unmanaged"],
    "checker counts"
  );
  assertExactKeys(payload.buckets, ["readyToUpdate", "conflicts", "unmanaged"], "checker buckets");
}

function assertApplyUiSummaryContract(payload) {
  assertExactKeys(
    payload,
    ["schemaVersion", "mode", "context", "counts", "statusCount", "buckets"],
    "apply root"
  );
  assertExactKeys(payload.context, ["workspace", "dryRun", "index", "filters"], "apply context");
  assertExactKeys(payload.context.filters, ["include", "exclude", "filteredOutCount"], "apply filters");
  assertExactKeys(
    payload.counts,
    ["totalSelected", "filteredOut", "updated", "conflicts", "skipped", "failed"],
    "apply counts"
  );
  assertExactKeys(payload.buckets, ["updated", "conflicts", "skipped", "failed"], "apply buckets");
}

function buildAgentResource(hash) {
  return {
    id: "agent/example",
    type: "agent",
    name: "example",
    sourcePath: "agents/example.agent.md",
    integrity: {
      algorithm: "sha256",
      hash,
    },
    providers: [
      {
        plugin: "example-plugin",
        pluginVersion: "1.0.0",
      },
    ],
  };
}

function buildSkillResource(hash) {
  return {
    id: "skill/demo-skill",
    type: "skill",
    name: "demo-skill",
    sourcePath: "skills/demo-skill",
    integrity: {
      algorithm: "sha256",
      hash,
    },
    providers: [
      {
        plugin: "example-plugin",
        pluginVersion: "1.0.0",
      },
    ],
  };
}

function run() {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "awesome-copilot-update-tests-"));

  const workspace = path.join(tempRoot, "workspace");
  const sourceRoot = path.join(tempRoot, "source");
  const indexPath = path.join(tempRoot, "update-index.json");
  const statePath = path.join(workspace, ".github/.copilot-metadata.json");

  mkdirp(workspace);
  mkdirp(sourceRoot);

  const workspaceAgentPath = path.join(workspace, ".github/agents/example.agent.md");
  const sourceAgentPath = path.join(sourceRoot, "agents/example.agent.md");

  writeFile(workspaceAgentPath, "---\nname: example\n---\nlocal-v1\n");
  writeFile(sourceAgentPath, "---\nname: example\n---\nupstream-v2\n");

  const index = {
    schemaVersion: "1.0.0",
    resources: [buildAgentResource(hashFile(sourceAgentPath))],
  };
  writeJson(indexPath, index);

  const checkerFiltered = runNodeScript(repoRoot, "eng/check-resource-updates.mjs", [
    "--workspace",
    workspace,
    "--index",
    indexPath,
    "--include",
    "type:agent",
    "--exclude",
    "agent/example",
    "--ui-summary",
  ]);

  assert.equal(checkerFiltered.mode, "ui-summary");
  assertCheckerUiSummaryContract(checkerFiltered);
  assert.equal(checkerFiltered.counts.totalSelected, 0);
  assert.equal(checkerFiltered.counts.filteredOut, 1);

  const checkerExactSelector = runNodeScript(repoRoot, "eng/check-resource-updates.mjs", [
    "--workspace",
    workspace,
    "--index",
    indexPath,
    "--include",
    "exact:agent/example",
    "--ui-summary",
  ]);
  assert.equal(checkerExactSelector.counts.totalSelected, 1);

  const checkerPrefixSelector = runNodeScript(repoRoot, "eng/check-resource-updates.mjs", [
    "--workspace",
    workspace,
    "--index",
    indexPath,
    "--include",
    "prefix:agent/",
    "--ui-summary",
  ]);
  assert.equal(checkerPrefixSelector.counts.totalSelected, 1);

  const checkerRegexSelector = runNodeScript(repoRoot, "eng/check-resource-updates.mjs", [
    "--workspace",
    workspace,
    "--index",
    indexPath,
    "--include",
    "regex:^agent\\/ex",
    "--ui-summary",
  ]);
  assert.equal(checkerRegexSelector.counts.totalSelected, 1);

  const checkerInvalidRegexSelector = runNodeScript(repoRoot, "eng/check-resource-updates.mjs", [
    "--workspace",
    workspace,
    "--index",
    indexPath,
    "--include",
    "regex:(",
    "--ui-summary",
  ]);
  assert.equal(checkerInvalidRegexSelector.counts.totalSelected, 0);

  const applyUnknownDrift = runNodeScript(repoRoot, "eng/apply-resource-updates.mjs", [
    "--workspace",
    workspace,
    "--index",
    indexPath,
    "--source-root",
    sourceRoot,
    "--state",
    statePath,
    "--dry-run",
    "--ui-summary",
  ]);

  assert.equal(applyUnknownDrift.mode, "ui-summary");
  assertApplyUiSummaryContract(applyUnknownDrift);
  assert.equal(applyUnknownDrift.counts.conflicts, 1);
  assert.equal(applyUnknownDrift.statusCount["skipped-conflict-unknown-drift"], 1);

  const applyPrefixSelector = runNodeScript(repoRoot, "eng/apply-resource-updates.mjs", [
    "--workspace",
    workspace,
    "--index",
    indexPath,
    "--source-root",
    sourceRoot,
    "--state",
    statePath,
    "--dry-run",
    "--include",
    "prefix:agent/",
    "--ui-summary",
  ]);
  assert.equal(applyPrefixSelector.counts.totalSelected, 1);

  const applyRegexSelector = runNodeScript(repoRoot, "eng/apply-resource-updates.mjs", [
    "--workspace",
    workspace,
    "--index",
    indexPath,
    "--source-root",
    sourceRoot,
    "--state",
    statePath,
    "--dry-run",
    "--include",
    "regex:^agent\\/ex",
    "--ui-summary",
  ]);
  assert.equal(applyRegexSelector.counts.totalSelected, 1);

  const applyExactExcludeSelector = runNodeScript(repoRoot, "eng/apply-resource-updates.mjs", [
    "--workspace",
    workspace,
    "--index",
    indexPath,
    "--source-root",
    sourceRoot,
    "--state",
    statePath,
    "--dry-run",
    "--include",
    "prefix:agent/",
    "--exclude",
    "exact:agent/example",
    "--ui-summary",
  ]);
  assert.equal(applyExactExcludeSelector.counts.totalSelected, 0);

  const applyForceDryRun = runNodeScript(repoRoot, "eng/apply-resource-updates.mjs", [
    "--workspace",
    workspace,
    "--index",
    indexPath,
    "--source-root",
    sourceRoot,
    "--state",
    statePath,
    "--dry-run",
    "--allow-unknown-drift",
    "--ui-summary",
  ]);

  assert.equal(applyForceDryRun.counts.updated, 1);
  assert.equal(applyForceDryRun.statusCount["updated-overwrite-unknown-drift"], 1);

  writeJson(statePath, {
    schemaVersion: "1.0.0",
    resources: [
      {
        id: "agent/example",
        type: "agent",
        workspacePath: ".github/agents/example.agent.md",
        sourcePath: "agents/example.agent.md",
        lastManagedHash: hashFile(workspaceAgentPath),
        lastAppliedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  });

  const applySafe = runNodeScript(repoRoot, "eng/apply-resource-updates.mjs", [
    "--workspace",
    workspace,
    "--index",
    indexPath,
    "--source-root",
    sourceRoot,
    "--state",
    statePath,
    "--ui-summary",
  ]);

  assert.equal(applySafe.counts.updated, 1);
  assert.equal(applySafe.statusCount.updated, 1);
  assert.equal(fs.readFileSync(workspaceAgentPath, "utf8"), fs.readFileSync(sourceAgentPath, "utf8"));

  const updatedState = JSON.parse(fs.readFileSync(statePath, "utf8"));
  const updatedAgentState = updatedState.resources.find((item) => item.id === "agent/example");
  assert.ok(updatedAgentState);
  assert.equal(updatedAgentState.lastManagedHash, hashFile(sourceAgentPath));

  const workspaceSkillDir = path.join(workspace, ".github/skills/demo-skill");
  const sourceSkillDir = path.join(sourceRoot, "skills/demo-skill");

  writeFile(path.join(workspaceSkillDir, "SKILL.md"), "---\nname: demo-skill\ndescription: 'old'\n---\n");
  writeFile(path.join(workspaceSkillDir, "stale.txt"), "remove me\n");

  writeFile(path.join(sourceSkillDir, "SKILL.md"), "---\nname: demo-skill\ndescription: 'new'\n---\n");
  writeFile(path.join(sourceSkillDir, "template.txt"), "keep me\n");

  index.resources.push(buildSkillResource(hashDirectory(sourceSkillDir)));
  writeJson(indexPath, index);

  const stateWithSkill = JSON.parse(fs.readFileSync(statePath, "utf8"));
  stateWithSkill.resources.push({
    id: "skill/demo-skill",
    type: "skill",
    workspacePath: ".github/skills/demo-skill",
    sourcePath: "skills/demo-skill",
    lastManagedHash: hashDirectory(workspaceSkillDir),
    lastAppliedAt: "2026-01-01T00:00:00.000Z",
  });
  writeJson(statePath, stateWithSkill);

  const applySkill = runNodeScript(repoRoot, "eng/apply-resource-updates.mjs", [
    "--workspace",
    workspace,
    "--index",
    indexPath,
    "--source-root",
    sourceRoot,
    "--state",
    statePath,
    "--include",
    "skill/demo-skill",
    "--ui-summary",
  ]);

  assert.equal(applySkill.counts.updated, 1);
  assert.equal(fs.existsSync(path.join(workspaceSkillDir, "stale.txt")), false);
  assert.equal(fs.existsSync(path.join(workspaceSkillDir, "template.txt")), true);

  console.log("All resource update tests passed.");
}

run();
