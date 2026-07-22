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

test("runCanvasStructureGate passes when extension lives in a nested subfolder", () => {
  const repoDir = createTempRepo();
  fs.mkdirSync(path.join(repoDir, "extensions", "modernize-dashboard"), { recursive: true });
  fs.writeFileSync(
    path.join(repoDir, "extensions", "modernize-dashboard", "extension.mjs"),
    "export default {};\n",
  );
  const sha = commitAll(repoDir, "Add nested canvas extension");

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
  assert.match(result.output, /entry point "extensions\/modernize-dashboard\/extension\.mjs"/);
});

test("runCanvasStructureGate fails when no extension.mjs exists flat or nested", () => {
  const repoDir = createTempRepo();
  fs.mkdirSync(path.join(repoDir, "extensions", "modernize-dashboard"), { recursive: true });
  fs.writeFileSync(
    path.join(repoDir, "extensions", "modernize-dashboard", "index.mjs"),
    "export default {};\n",
  );
  const sha = commitAll(repoDir, "Add extensions directory without entry point");

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
  assert.match(result.output, /missing required canvas extension entry point/);
});

test("runCanvasStructureGate finds a nested extension listed past the legacy output cap", () => {
  const repoDir = createTempRepo();
  // Many sibling directories push the real extension past the ~12 KB stdout cap that the
  // previous truncating implementation applied, which would silently drop it from the listing.
  // Long names inflate each git ls-tree record so fewer directories are needed to exceed the cap.
  for (let index = 0; index < 160; index += 1) {
    const filler = path.join(
      repoDir,
      "extensions",
      `filler-directory-that-pads-the-tree-listing-${String(index).padStart(4, "0")}`,
    );
    fs.mkdirSync(filler, { recursive: true });
    fs.writeFileSync(path.join(filler, "readme.txt"), "filler\n");
  }
  fs.mkdirSync(path.join(repoDir, "extensions", "zzz-real-extension"), { recursive: true });
  fs.writeFileSync(
    path.join(repoDir, "extensions", "zzz-real-extension", "extension.mjs"),
    "export default {};\n",
  );
  const sha = commitAll(repoDir, "Add nested extension after many siblings");

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
  assert.match(result.output, /entry point "extensions\/zzz-real-extension\/extension\.mjs"/);
});
