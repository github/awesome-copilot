import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { after, test } from "node:test";
import { runCanvasStructureGate } from "./external-plugin-quality-gates.mjs";

const tempDirs = [];

after(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function runGit(repoDir, ...args) {
  const result = spawnSync("git", args, { cwd: repoDir, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stdout}\n${result.stderr}`);
  }
  return String(result.stdout ?? "").trim();
}

function createTempRepo() {
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), "external-plugin-quality-"));
  tempDirs.push(repoDir);

  runGit(repoDir, "init", "-q");
  runGit(repoDir, "config", "user.name", "Copilot Test");
  runGit(repoDir, "config", "user.email", "copilot@example.com");
  return repoDir;
}

function commitAll(repoDir, message) {
  runGit(repoDir, "add", "-A");
  runGit(repoDir, "commit", "-m", message, "--quiet");
  return runGit(repoDir, "rev-parse", "HEAD");
}

test("runCanvasStructureGate passes when extensions/extension.mjs exists", () => {
  const repoDir = createTempRepo();
  fs.mkdirSync(path.join(repoDir, "extensions"), { recursive: true });
  fs.writeFileSync(path.join(repoDir, "extensions", "extension.mjs"), "export default {};\n");
  const sha = commitAll(repoDir, "Add canvas extension container");

  const plugin = {
    name: "canvas-plugin",
    keywords: ["canvas"],
    source: {
      source: "github",
      repo: "owner/repo",
      sha,
    },
  };

  const result = runCanvasStructureGate(repoDir, plugin, sha);
  assert.equal(result.status, "pass");
  assert.match(result.output, /found "extensions"/);
});

test("runCanvasStructureGate fails when extension entrypoint is only at repo root", () => {
  const repoDir = createTempRepo();
  fs.writeFileSync(path.join(repoDir, "extension.mjs"), "export default {};\n");
  const sha = commitAll(repoDir, "Add root extension entrypoint");

  const plugin = {
    name: "canvas-plugin",
    keywords: ["canvas"],
    source: {
      source: "github",
      repo: "owner/repo",
      sha,
    },
  };

  const result = runCanvasStructureGate(repoDir, plugin, sha);
  assert.equal(result.status, "fail");
  assert.match(result.output, /missing required canvas extension directory "extensions"/);
});

test("runCanvasStructureGate fails when extension entrypoint path is a directory", () => {
  const repoDir = createTempRepo();
  fs.mkdirSync(path.join(repoDir, "extensions", "extension.mjs"), { recursive: true });
  fs.writeFileSync(path.join(repoDir, "extensions", "extension.mjs", "placeholder.txt"), "not-a-module\n");
  const sha = commitAll(repoDir, "Add invalid extension entrypoint directory");

  const plugin = {
    name: "canvas-plugin",
    keywords: ["canvas"],
    source: {
      source: "github",
      repo: "owner/repo",
      sha,
    },
  };

  const result = runCanvasStructureGate(repoDir, plugin, sha);
  assert.equal(result.status, "fail");
  assert.match(result.output, /"extensions\/extension\.mjs" must be a file/);
});
