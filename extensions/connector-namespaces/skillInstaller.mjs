import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BUNDLED_SKILL = fileURLToPath(new URL("./skills/connector-sandbox/SKILL.md", import.meta.url));

export function getUserSkillPath(copilotHome = process.env.COPILOT_HOME || join(homedir(), ".copilot")) {
    return join(copilotHome, "skills", "connector-sandbox", "SKILL.md");
}

export function installBundledSkill(copilotHome) {
    const destination = getUserSkillPath(copilotHome);
    const bundled = readFileSync(BUNDLED_SKILL, "utf-8");
    if (existsSync(destination)) return { installed: false, path: destination };

    mkdirSync(dirname(destination), { recursive: true, mode: 0o700 });
    writeFileSync(destination, bundled, { encoding: "utf-8", mode: 0o600 });
    return { installed: true, path: destination };
}
