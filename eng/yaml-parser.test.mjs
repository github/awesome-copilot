import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { parseSkillMetadata } from "./yaml-parser.mjs";

const tempDirs = [];

after(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function createSkill(files) {
  const skillPath = fs.mkdtempSync(path.join(os.tmpdir(), "skill-"));
  tempDirs.push(skillPath);
  for (const [relativePath, contents] of Object.entries(files)) {
    const target = path.join(skillPath, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents);
  }
  return skillPath;
}

const SKILL_MD = `---
name: sample-skill
description: A sample skill used to exercise bundled asset discovery.
---

# Sample skill
`;

test("lists bundled assets from the spec-defined subdirectories", () => {
  const skillPath = createSkill({
    "SKILL.md": SKILL_MD,
    "references/guide.md": "guide",
    "scripts/run.py": "run",
    "assets/logo.png": "logo",
  });

  const metadata = parseSkillMetadata(skillPath);

  assert.deepEqual(metadata.assets, [
    "assets/logo.png",
    "references/guide.md",
    "scripts/run.py",
  ]);
});

test("recurses into nested and non-spec subdirectories instead of listing the directory", () => {
  const skillPath = createSkill({
    "SKILL.md": SKILL_MD,
    "templates/report.md": "report",
    "references/skeletons/threat-model.md": "skeleton",
    "nested/deep/tool.sh": "tool",
  });

  const metadata = parseSkillMetadata(skillPath);

  assert.deepEqual(metadata.assets, [
    "nested/deep/tool.sh",
    "references/skeletons/threat-model.md",
    "templates/report.md",
  ]);
  for (const asset of metadata.assets) {
    assert.ok(
      fs.statSync(path.join(skillPath, asset)).isFile(),
      `expected "${asset}" to be a file, not a directory`
    );
  }
});

test("excludes only the root SKILL.md, keeping nested ones as bundled assets", () => {
  const skillPath = createSkill({
    "SKILL.md": SKILL_MD,
    "scaling-qps/SKILL.md": SKILL_MD,
    "scaling-data-volume/tenant-scaling/SKILL.md": SKILL_MD,
  });

  const metadata = parseSkillMetadata(skillPath);

  assert.deepEqual(metadata.assets, [
    "scaling-data-volume/tenant-scaling/SKILL.md",
    "scaling-qps/SKILL.md",
  ]);
  assert.ok(
    !metadata.assets.includes("SKILL.md"),
    "the skill's own SKILL.md must not be listed as a bundled asset"
  );
});
