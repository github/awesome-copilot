import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { PHASES } from "./args.mjs";

export const SKILLS = Object.freeze({
    router: "foundry-agentic-loop",
    foundry: "microsoft-foundry",
});

export function phaseGuide(phase) {
    return path.join("references", `${phase.toLowerCase()}.md`);
}

// A partial override or an older copy of a skill must not shadow a complete one.
const REQUIRED = Object.freeze({
    router: ["SKILL.md", path.join("references", "sdd.md"), ...PHASES.map(phaseGuide)],
    foundry: ["SKILL.md"],
});

async function isFile(file) {
    try { return (await stat(file)).isFile(); }
    catch { return false; }
}

async function directories(folder) {
    try { return (await readdir(folder, { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name).sort(); }
    catch { return []; }
}

// Project overrides (written by improve mode) win, then the plugin that ships this extension,
// then a repository checkout, other installed plugins and personal skills.
export async function candidates(name, { cwd, extensionDir, home }) {
    const installed = path.join(home, ".copilot", "installed-plugins");
    const plugins = [];
    for (const marketplace of await directories(installed)) {
        for (const plugin of await directories(path.join(installed, marketplace))) plugins.push(path.join(installed, marketplace, plugin, "skills", name));
    }
    return [
        ["project", path.join(cwd, ".github", "skills", name)],
        ["project", path.join(cwd, ".agents", "skills", name)],
        ["plugin", path.resolve(extensionDir, "..", "..", "..", "skills", name)],
        ["repository", path.resolve(extensionDir, "..", "..", "skills", name)],
        ...plugins.map(folder => ["installed", folder]),
        ["personal", path.join(home, ".copilot", "skills", name)],
        ["personal", path.join(home, ".agents", "skills", name)],
    ];
}

async function complete(dir, files) {
    for (const file of files) if (!(await isFile(path.join(dir, file)))) return false;
    return true;
}

export async function resolveSkills(options) {
    const resolved = {};
    for (const [key, name] of Object.entries(SKILLS)) {
        resolved[key] = { name, dir: null, source: "skill-tool" };
        for (const [source, dir] of await candidates(name, options)) {
            if (await complete(dir, REQUIRED[key])) { resolved[key] = { name, dir, source }; break; }
        }
    }
    return resolved;
}

export function missingSkills(skills) {
    return Object.values(skills).filter(skill => !skill.dir).map(skill => skill.name);
}

const KINDS = Object.freeze({ project: "project-override", plugin: "plugin", installed: "plugin" });

// Version of the nearest plugin manifest above a skill folder (plugin.json or .github/plugin/plugin.json), within four levels.
async function pluginVersion(dir) {
    let folder = dir;
    for (let level = 0; level < 4; level += 1) {
        folder = path.dirname(folder);
        for (const manifest of [path.join(folder, "plugin.json"), path.join(folder, ".github", "plugin", "plugin.json")]) {
            try {
                const version = JSON.parse(await readFile(manifest, "utf8"))?.version;
                return typeof version === "string" ? version.slice(0, 40) : null;
            } catch {
                // Not a plugin root; keep walking up.
            }
        }
    }
    return null;
}

async function hash(file) {
    try { return createHash("sha256").update(await readFile(file)).digest("hex"); }
    catch { return null; }
}

// Where each skill came from and the hashes of the files the phases follow, so the record shows exactly which guidance ran.
export async function skillProvenance(skills) {
    const provenance = {};
    for (const [key, skill] of Object.entries(skills)) {
        if (!skill.dir) {
            provenance[skill.name] = { source: skill.source, kind: "other", path: null, version: null, files: {} };
            continue;
        }
        const files = {};
        for (const file of REQUIRED[key] ?? ["SKILL.md"]) files[file.split(path.sep).join("/")] = await hash(path.join(skill.dir, file));
        provenance[skill.name] = { source: skill.source, kind: KINDS[skill.source] ?? "other", path: skill.dir, version: await pluginVersion(skill.dir), files };
    }
    return provenance;
}

// Hash changes between the recorded provenance and the files on disk now, one row per changed file.
export function skillDrift(recorded, current) {
    const drift = [];
    for (const [name, now] of Object.entries(current ?? {})) {
        const before = recorded?.[name];
        if (!before) continue;
        if (before.path !== now.path) {
            drift.push({ skill: name, file: null, change: `source moved from ${before.path ?? "skill tool"} to ${now.path ?? "skill tool"}` });
            continue;
        }
        for (const file of new Set([...Object.keys(before.files ?? {}), ...Object.keys(now.files ?? {})])) {
            if (before.files?.[file] !== now.files?.[file]) drift.push({ skill: name, file, change: `sha256 ${String(before.files?.[file] ?? "none").slice(0, 12)} → ${String(now.files?.[file] ?? "none").slice(0, 12)}` });
        }
    }
    return drift;
}
