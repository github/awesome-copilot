import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { load } from "js-yaml";

const engDir = path.dirname(fileURLToPath(import.meta.url));

async function createSkill(t, description) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "create-skill-"));
  const modulesLink = path.join(root, "node_modules");
  const scriptDir = path.join(root, "eng");
  fs.mkdirSync(scriptDir);
  for (const file of ["create-skill.mjs", "constants.mjs"]) {
    fs.copyFileSync(path.join(engDir, file), path.join(scriptDir, file));
  }
  fs.symlinkSync(
    path.join(engDir, "..", "node_modules"),
    modulesLink,
    process.platform === "win32" ? "junction" : "dir"
  );

  const child = spawn(
    process.execPath,
    [
      path.join(scriptDir, "create-skill.mjs"),
      "--name",
      "yaml-roundtrip",
      "--description",
      description,
    ],
    { cwd: root, stdio: ["pipe", "pipe", "pipe"] }
  );
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const closed = new Promise((resolve) => child.once("close", resolve));
      child.kill();
      await closed;
    }
    // Unlink the junction before recursively removing only the fixture.
    fs.unlinkSync(modulesLink);
    fs.rmSync(root, { recursive: true, force: true });
  });

  let stdout = "";
  let stderr = "";
  let answeredTitle = false;
  let answeredAssets = false;
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
    if (!answeredTitle && stdout.includes("Skill title (default:")) {
      answeredTitle = true;
      child.stdin.write("\n");
    }
    if (!answeredAssets && stdout.includes("Would you like to add bundled assets?")) {
      answeredAssets = true;
      child.stdin.end("n\n");
    }
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  assert.equal(exitCode, 0, `${stdout}\n${stderr}`);

  const content = fs.readFileSync(
    path.join(root, "skills", "yaml-roundtrip", "SKILL.md"),
    "utf8"
  );
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
  assert.ok(frontmatter, "generated skill must have YAML frontmatter");
  return load(frontmatter[1]);
}

test(
  "creates parseable frontmatter for descriptions containing a colon",
  { timeout: 10000 },
  async (t) => {
    const description = "Review API: protobuf and gRPC contracts";
    const metadata = await createSkill(t, description);

    assert.equal(metadata.name, "yaml-roundtrip");
    assert.equal(metadata.description, description);
  }
);

test(
  "preserves hashes, apostrophes, backslashes, and multiline descriptions",
  { timeout: 10000 },
  async (t) => {
    for (const description of [
      "Review developer's contracts # keep C:\\schemas\\protobuf intact",
      "Review developer's API contracts\nKeep # details and C:\\schemas\\protobuf intact",
    ]) {
      const metadata = await createSkill(t, description);

      assert.equal(metadata.description, description);
    }
  }
);
