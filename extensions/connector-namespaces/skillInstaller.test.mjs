import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { installBundledSkill } from "./skillInstaller.mjs";

test("installBundledSkill installs once into the user skills directory", () => {
    const copilotHome = mkdtempSync(join(tmpdir(), "connector-sandbox-skill-"));
    try {
        const first = installBundledSkill(copilotHome);
        const second = installBundledSkill(copilotHome);
        assert.equal(first.installed, true);
        assert.equal(second.installed, false);
        assert.match(readFileSync(first.path, "utf-8"), /^---\r?\nname: connector-sandbox/m);
    } finally {
        rmSync(copilotHome, { recursive: true, force: true });
    }
});

test("installBundledSkill preserves an existing user skill", () => {
    const copilotHome = mkdtempSync(join(tmpdir(), "connector-sandbox-skill-"));
    const skillPath = join(copilotHome, "skills", "connector-sandbox", "SKILL.md");
    try {
        mkdirSync(join(copilotHome, "skills", "connector-sandbox"), { recursive: true });
        writeFileSync(skillPath, "user customization\n", "utf-8");

        const result = installBundledSkill(copilotHome);

        assert.equal(result.installed, false);
        assert.equal(readFileSync(skillPath, "utf-8"), "user customization\n");
    } finally {
        rmSync(copilotHome, { recursive: true, force: true });
    }
});
