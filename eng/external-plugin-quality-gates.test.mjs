import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { after, test } from "node:test";
import {
  formatQualityGateLog,
  inspectAgentPluginSpecCompliance,
  runCanvasStructureGate,
  runRefShaConsistencyGate,
  runVallyLintGate,
  runVersionMatchGate,
  toOverallStatus,
} from "./external-plugin-quality-gates.mjs";
import {
  aggregateResultStatus,
  runExternalPluginPrQualityGates,
} from "./external-plugin-pr-quality-gates.mjs";

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

function createPluginFixture() {
  const pluginRoot = fs.mkdtempSync(path.join(os.tmpdir(), "external-plugin-lint-"));
  tempDirs.push(pluginRoot);
  fs.writeFileSync(path.join(pluginRoot, "plugin.json"), JSON.stringify({
    $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
    name: "example-plugin",
    version: "1.0.0",
    description: "An example plugin for quality gate tests.",
  }));
  return pluginRoot;
}

function writeSkillFixture(pluginRoot, { name = "example-skill", body = "Follow these instructions." } = {}) {
  const skillRoot = path.join(pluginRoot, "skills", "example-skill");
  fs.mkdirSync(skillRoot, { recursive: true });
  fs.writeFileSync(path.join(skillRoot, "SKILL.md"), [
    "---",
    `name: ${name}`,
    "description: 'An example skill for quality gate tests.'",
    "---",
    body,
    "",
  ].join("\n"));
}

test("manifest compliance passes for an Agent Plugins v1.0.0 manifest", () => {
  const result = inspectAgentPluginSpecCompliance(createPluginFixture());
  assert.equal(result.status, "pass", result.output);
});

for (const [name, update, expectedOutput] of [
  ["missing manifest", (root) => fs.unlinkSync(path.join(root, "plugin.json")), /No plugin.json found/],
  ["legacy manifest location", (root) => {
    fs.mkdirSync(path.join(root, ".github", "plugin"), { recursive: true });
    fs.renameSync(path.join(root, "plugin.json"), path.join(root, ".github", "plugin", "plugin.json"));
  }, /expected "plugin.json" at plugin root/],
  ["invalid JSON", (root) => fs.writeFileSync(path.join(root, "plugin.json"), "{"), /not valid JSON/],
  ["invalid manifest type", (root) => fs.writeFileSync(path.join(root, "plugin.json"), "null"), /must be a JSON object/],
  ["noncompliant fields", (root) => fs.writeFileSync(path.join(root, "plugin.json"), JSON.stringify({
    name: "Invalid Name",
    skills: ["./skills"],
  })), /manifest errors/],
]) {
  test(`manifest compliance blocks ${name} instead of warning`, () => {
    const pluginRoot = createPluginFixture();
    update(pluginRoot);
    const result = inspectAgentPluginSpecCompliance(pluginRoot);
    assert.equal(result.status, "fail", result.output);
    assert.match(result.output, expectedOutput);
  });
}

const passingQualityResult = {
  spec_compliance_status: "pass",
  vally_lint_status: "pass",
  smoke_status: "pass",
  version_match_status: "pass",
  ref_sha_consistency_status: "not_run",
  canvas_structure_status: "not_run",
};

test("overall quality passes when all applicable gates pass", () => {
  assert.equal(toOverallStatus(passingQualityResult), "pass");
});

for (const gate of Object.keys(passingQualityResult)) {
  for (const status of ["fail", "warning", "infra_error"]) {
    test(`overall quality blocks ${gate}=${status}`, () => {
      assert.equal(
        toOverallStatus({ ...passingQualityResult, [gate]: status }),
        status === "infra_error" ? "infra_error" : "fail",
      );
    });
  }
}

test("overall quality does not pass when every gate was skipped", () => {
  assert.equal(toOverallStatus(Object.fromEntries(
    Object.keys(passingQualityResult).map((gate) => [gate, "not_run"]),
  )), "not_run");
});

test("vally lint passes for compliant bundled skills", async () => {
  const pluginRoot = createPluginFixture();
  writeSkillFixture(pluginRoot);
  const result = await runVallyLintGate(pluginRoot);
  assert.equal(result.status, "pass", result.output);
});

test("vally lint blocks Agent Skills spec violations", async () => {
  const pluginRoot = createPluginFixture();
  writeSkillFixture(pluginRoot, { name: "Invalid-Name" });
  const result = await runVallyLintGate(pluginRoot);
  assert.equal(result.status, "fail", result.output);
  assert.match(result.logOutput, /spec-compliance/);
});

test("vally lint blocks broken skill file references", async () => {
  const pluginRoot = createPluginFixture();
  writeSkillFixture(pluginRoot, { body: "Read [the reference](references/missing.md)." });
  const result = await runVallyLintGate(pluginRoot);
  assert.equal(result.status, "fail", result.output);
  assert.match(result.logOutput, /missing/);
});

test("vally lint allows plugins without skills", async () => {
  const result = await runVallyLintGate(createPluginFixture());
  assert.equal(result.status, "pass", result.output);
});

test("formatQualityGateLog preserves full vally output for artifacts", () => {
  const fullVallyOutput = `lint failure\n${"x".repeat(13000)}`;
  const log = formatQualityGateLog(
    { name: "example-plugin" },
    {
      summary: "- vally lint: fail",
      spec_compliance_output: "spec output",
      vally_lint_output: "truncated output",
      smoke_output: "smoke output",
      version_match_output: "version output",
      ref_sha_consistency_output: "ref output",
      canvas_structure_output: "canvas output",
    },
    { vallyLintOutput: fullVallyOutput },
  );

  assert.match(log, /External plugin quality gate log: example-plugin/);
  assert.match(log, /lint failure/);
  assert.equal(log.includes("x".repeat(13000)), true);
  assert.equal(log.includes("truncated output"), false);
});

test("runExternalPluginPrQualityGates writes logs for validation failures", async () => {
  const logsDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "external-plugin-pr-logs-"));
  tempDirs.push(logsDirectory);

  const result = await runExternalPluginPrQualityGates(
    [{ name: "Invalid Plugin", source: {} }],
    { logsDirectory },
  );

  assert.equal(result.overall_status, "fail");
  const logFiles = fs.readdirSync(logsDirectory);
  assert.deepEqual(logFiles, ["01-invalid-plugin.log"]);
  assert.match(
    fs.readFileSync(path.join(logsDirectory, logFiles[0]), "utf8"),
    /External plugin entry validation/,
  );
});

test("runCanvasStructureGate passes when a named extension exists", () => {
  const repoDir = createTempRepo();
  fs.mkdirSync(path.join(repoDir, "com.github.copilot", "extensions", "canvas-plugin"), { recursive: true });
  fs.writeFileSync(
    path.join(repoDir, "com.github.copilot", "extensions", "canvas-plugin", "extension.mjs"),
    "export default {};\n",
  );
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
  assert.match(result.output, /found "com\.github\.copilot\/extensions"/);
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
  assert.match(result.output, /missing required canvas extension directory "com\.github\.copilot\/extensions"/);
});

test("runCanvasStructureGate fails when the named extension entrypoint path is a directory", () => {
  const repoDir = createTempRepo();
  fs.mkdirSync(path.join(repoDir, "com.github.copilot", "extensions", "canvas-plugin", "extension.mjs"), { recursive: true });
  fs.writeFileSync(
    path.join(repoDir, "com.github.copilot", "extensions", "canvas-plugin", "extension.mjs", "placeholder.txt"),
    "not-a-module\n",
  );
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
  assert.match(result.output, /"com\.github\.copilot\/extensions\/<extension>\/extension\.mjs" must be a file/);
});

test("runCanvasStructureGate fails when the Copilot namespace is missing", () => {
  const repoDir = createTempRepo();
  fs.mkdirSync(path.join(repoDir, "extensions", "modernize-dashboard"), { recursive: true });
  fs.writeFileSync(path.join(repoDir, "extensions", "modernize-dashboard", "extension.mjs"), "export default {};\n");
  const sha = commitAll(repoDir, "Add extension outside Copilot namespace");

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
  assert.match(result.output, /missing required canvas extension directory "com\.github\.copilot\/extensions"/);
});

test("runCanvasStructureGate fails when no extension.mjs exists in a named directory", () => {
  const repoDir = createTempRepo();
  fs.mkdirSync(path.join(repoDir, "com.github.copilot", "extensions", "modernize-dashboard"), { recursive: true });
  fs.writeFileSync(
    path.join(repoDir, "com.github.copilot", "extensions", "modernize-dashboard", "index.mjs"),
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
      "com.github.copilot",
      "extensions",
      `filler-directory-that-pads-the-tree-listing-${String(index).padStart(4, "0")}`,
    );
    fs.mkdirSync(filler, { recursive: true });
    fs.writeFileSync(path.join(filler, "readme.txt"), "filler\n");
  }
  fs.mkdirSync(path.join(repoDir, "com.github.copilot", "extensions", "zzz-real-extension"), { recursive: true });
  fs.writeFileSync(
    path.join(repoDir, "com.github.copilot", "extensions", "zzz-real-extension", "extension.mjs"),
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
  assert.match(result.output, /entry point "com\.github\.copilot\/extensions\/zzz-real-extension\/extension\.mjs"/);
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
  fs.mkdirSync(path.join(repoDir, "com.github.copilot", "extensions", "tag-plugin"), { recursive: true });
  fs.writeFileSync(
    path.join(repoDir, "com.github.copilot", "extensions", "tag-plugin", "extension.mjs"),
    "export default {};\n",
  );
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
  assert.match(result.output, /- v1\.0\.0: found "com\.github\.copilot\/extensions"/);
  assert.match(result.output, new RegExp(`- ${sha}: found "com\\.github\\.copilot/extensions"`));
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
  assert.match(result.output, /- v1\.0\.0: found "com\.github\.copilot\/extensions"/);
});

test("runRefShaConsistencyGate fails when ref and sha point to different commits", () => {
  const remoteDir = initRemoteRepo();
  writeValidPluginContent(remoteDir);
  const firstSha = commitAll(remoteDir, "Add plugin manifest v1");
  runGit(remoteDir, "tag", "-a", "v1.0.0", "-m", "release 1.0.0");
  fs.writeFileSync(path.join(remoteDir, "README.md"), "v2\n");
  const secondSha = commitAll(remoteDir, "Add plugin manifest v2");

  const repoDir = cloneSubmissionRepo(remoteDir, secondSha);
  const plugin = {
    name: "tag-plugin",
    source: { source: "github", repo: "owner/repo", ref: "v1.0.0", sha: secondSha },
  };

  const result = runRefShaConsistencyGate(repoDir, plugin, secondSha);
  assert.equal(result.status, "fail", result.output);
  assert.match(result.output, new RegExp(`resolves to "${firstSha}"`));
});

test("runRefShaConsistencyGate passes when ref and sha point to the same commit", () => {
  const remoteDir = initRemoteRepo();
  writeValidPluginContent(remoteDir);
  const sha = commitAll(remoteDir, "Add plugin manifest");
  runGit(remoteDir, "tag", "-a", "v1.0.0", "-m", "release 1.0.0");

  const repoDir = cloneSubmissionRepo(remoteDir, sha);
  const plugin = {
    name: "tag-plugin",
    source: { source: "github", repo: "owner/repo", ref: "v1.0.0", sha },
  };

  const result = runRefShaConsistencyGate(repoDir, plugin, sha);
  assert.equal(result.status, "pass", result.output);
});

test("aggregateResultStatus requires every changed plugin to pass", () => {
  const entry = (status) => ({ quality: { overall_status: status } });

  assert.deepEqual(aggregateResultStatus([]), { overallStatus: "not_run", failureClass: "none" });
  assert.deepEqual(aggregateResultStatus([entry("pass"), entry("pass")]), {
    overallStatus: "pass",
    failureClass: "none",
  });
  assert.deepEqual(aggregateResultStatus([entry("pass"), entry("fail")]), {
    overallStatus: "fail",
    failureClass: "submitter_fixes",
  });
  assert.deepEqual(aggregateResultStatus([entry("pass"), entry("infra_error")]), {
    overallStatus: "infra_error",
    failureClass: "infra",
  });
  assert.deepEqual(aggregateResultStatus([entry("fail"), entry("infra_error")]), {
    overallStatus: "fail",
    failureClass: "submitter_fixes",
  });
  for (const status of ["warning", "not_run", undefined]) {
    assert.deepEqual(aggregateResultStatus([entry("pass"), entry(status)]), {
      overallStatus: "fail",
      failureClass: "submitter_fixes",
    });
  }
});