import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { after, test } from "node:test";
import { runCanvasStructureGate, runVersionMatchGate } from "./external-plugin-quality-gates.mjs";

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

// Regression tests for issue #2397: a tag-name locator (e.g. "v1.0.0") must be
// readable by the version-match and canvas-structure gates. `git fetch origin <tag>`
// only updates FETCH_HEAD and never creates a local `refs/tags/<tag>`, so reading via
// `git show <tag>:...` used to die with "fatal: invalid object name" and roll up to a
// bogus infra_error/fail even though the referenced content was valid.

function initRemoteRepo() {
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), "external-plugin-quality-remote-"));
  tempDirs.push(repoDir);
  runGit(repoDir, "init", "-q");
  runGit(repoDir, "config", "user.name", "Copilot Test");
  runGit(repoDir, "config", "user.email", "copilot@example.com");
  // Mirror github.com: allow the submission repo to shallow-fetch an arbitrary SHA.
  runGit(repoDir, "config", "uploadpack.allowAnySHA1InWant", "true");
  return repoDir;
}

function writeValidPluginContent(repoDir) {
  fs.mkdirSync(path.join(repoDir, ".github", "plugin"), { recursive: true });
  fs.writeFileSync(
    path.join(repoDir, ".github", "plugin", "plugin.json"),
    `${JSON.stringify({ name: "tag-plugin", version: "1.0.0" }, null, 2)}\n`,
  );
  fs.mkdirSync(path.join(repoDir, "extensions"), { recursive: true });
  fs.writeFileSync(path.join(repoDir, "extensions", "extension.mjs"), "export default {};\n");
}

// Mirrors cloneSubmissionRepository in external-plugin-quality-gates.mjs: fetch only the
// primary locator and detach HEAD onto it. The tag ref is deliberately never created
// locally, reproducing the CI environment where `git show <tag>:...` fails.
function cloneSubmissionRepo(remoteDir, primaryFetchSpec) {
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), "external-plugin-quality-sub-"));
  tempDirs.push(repoDir);
  runGit(repoDir, "init", "-q");
  runGit(repoDir, "remote", "add", "origin", remoteDir);
  runGit(repoDir, "fetch", "--depth=1", "origin", primaryFetchSpec);
  runGit(repoDir, "checkout", "--detach", "FETCH_HEAD");
  return repoDir;
}

test("runVersionMatchGate passes for a tag ref alongside a sha", () => {
  const remoteDir = initRemoteRepo();
  writeValidPluginContent(remoteDir);
  const sha = commitAll(remoteDir, "Add plugin manifest");
  runGit(remoteDir, "tag", "-a", "v1.0.0", "-m", "release 1.0.0");

  const repoDir = cloneSubmissionRepo(remoteDir, sha);
  const plugin = {
    name: "tag-plugin",
    version: "1.0.0",
    source: { source: "github", repo: "owner/repo", ref: "v1.0.0", sha },
  };

  const result = runVersionMatchGate(repoDir, plugin, sha);
  assert.equal(result.status, "pass", result.output);
  // Both the tag ref and the sha must be verified.
  assert.match(result.output, /- v1\.0\.0: matched version "1\.0\.0"/);
  assert.match(result.output, new RegExp(`- ${sha}: matched version "1\\.0\\.0"`));
});

test("runCanvasStructureGate passes for a tag ref alongside a sha", () => {
  const remoteDir = initRemoteRepo();
  writeValidPluginContent(remoteDir);
  const sha = commitAll(remoteDir, "Add canvas extension container");
  runGit(remoteDir, "tag", "-a", "v1.0.0", "-m", "release 1.0.0");

  const repoDir = cloneSubmissionRepo(remoteDir, sha);
  const plugin = {
    name: "tag-plugin",
    keywords: ["canvas"],
    source: { source: "github", repo: "owner/repo", ref: "v1.0.0", sha },
  };

  const result = runCanvasStructureGate(repoDir, plugin, sha);
  assert.equal(result.status, "pass", result.output);
  assert.match(result.output, /- v1\.0\.0: found "extensions"/);
  assert.match(result.output, new RegExp(`- ${sha}: found "extensions"`));
});

test("runVersionMatchGate passes when the primary locator is a tag ref", () => {
  const remoteDir = initRemoteRepo();
  writeValidPluginContent(remoteDir);
  commitAll(remoteDir, "Add plugin manifest");
  runGit(remoteDir, "tag", "-a", "v1.0.0", "-m", "release 1.0.0");

  const repoDir = cloneSubmissionRepo(remoteDir, "v1.0.0");
  const plugin = {
    name: "tag-plugin",
    version: "1.0.0",
    source: { source: "github", repo: "owner/repo", ref: "v1.0.0" },
  };

  const result = runVersionMatchGate(repoDir, plugin, "v1.0.0");
  assert.equal(result.status, "pass", result.output);
  assert.match(result.output, /- v1\.0\.0: matched version "1\.0\.0"/);
});

test("runCanvasStructureGate passes when the primary locator is a tag ref", () => {
  const remoteDir = initRemoteRepo();
  writeValidPluginContent(remoteDir);
  commitAll(remoteDir, "Add canvas extension container");
  runGit(remoteDir, "tag", "-a", "v1.0.0", "-m", "release 1.0.0");

  const repoDir = cloneSubmissionRepo(remoteDir, "v1.0.0");
  const plugin = {
    name: "tag-plugin",
    keywords: ["canvas"],
    source: { source: "github", repo: "owner/repo", ref: "v1.0.0" },
  };

  const result = runCanvasStructureGate(repoDir, plugin, "v1.0.0");
  assert.equal(result.status, "pass", result.output);
  assert.match(result.output, /- v1\.0\.0: found "extensions"/);
});
