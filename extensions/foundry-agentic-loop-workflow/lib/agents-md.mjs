import { readFile } from "node:fs/promises";
import path from "node:path";
import { contained, readContained } from "./fsguard.mjs";
import { atomicWrite } from "./record.mjs";

// The canvas (foundry-agentic-loop-canvas/lib/live.mjs) parses the same marker; the pin test keeps them in sync.
export const AGENTS = "AGENTS.md";
export const BEGIN = /<!--\s*foundry-agentic-loop:begin\s+mode=(rapid|sdd)\s*-->/;
const SECTION = /<!--\s*foundry-agentic-loop:begin\s+mode=(rapid|sdd)\s*-->[\s\S]*?<!--\s*foundry-agentic-loop:end\s*-->/;
const TEMPLATE = path.join("assets", "agents-md-sdd.md");

export const RAPID_LOCKED = "AGENTS.md locks this workspace to rapid prototyping. To switch, ask Copilot to convert the prototype to SDD: "
    + "the foundry-agentic-loop skill confirms, derives the spec with Specify reverse and rewrites the section. Then start a new run.";

// Used only when the skill is not on disk; the skill rewrites the section from its full template on its next start.
export const FALLBACK_SDD = [
    "<!-- foundry-agentic-loop:begin mode=sdd -->",
    "## Agentic Loop: SDD workflow",
    "",
    "This workspace is built with spec-driven development. For build requests and short commands such as `deploy`, `status` or `resume`, "
    + "load the `foundry-agentic-loop` skill and follow its `references/sdd.md`; it resumes a running or paused run instead of starting a second one.",
    "",
    "- Azure settings live only in `.azure/deployment-plan.md`, never here.",
    "- This section locks the build mode. Change it only when the user explicitly confirms a switch.",
    "<!-- foundry-agentic-loop:end -->",
].join("\n");

export function lockedMode(text) {
    return BEGIN.exec(String(text ?? ""))?.[1] ?? null;
}

// Appends the section after the existing content, keeping its line endings.
export function appendSection(text, section) {
    const eol = text.includes("\r\n") ? "\r\n" : "\n";
    const block = section.trim().split(/\r?\n/).join(eol);
    const body = text.replace(/\s+$/, "");
    return body ? `${body}${eol}${eol}${block}${eol}` : `${block}${eol}`;
}

async function readOptional(file) {
    try { return await readFile(file, "utf8"); }
    catch (error) {
        if (error?.code === "ENOENT") return null;
        throw error;
    }
}

async function template(routerDir) {
    const text = routerDir ? await readOptional(path.join(routerDir, TEMPLATE)).catch(() => null) : null;
    const section = text?.match(SECTION);
    return section?.[1] === "sdd" ? section[0] : FALLBACK_SDD;
}

// Locks the workspace to SDD: refuses a rapid lock, keeps an existing SDD section (the skill owns its content) and otherwise appends one.
// A symbolic-link AGENTS.md is refused rather than followed, so the lock never reads or writes outside the workspace.
export async function lockWorkspace(cwd, routerDir) {
    const current = await readContained(cwd, AGENTS);
    const text = current?.text ?? null;
    const mode = lockedMode(text);
    if (mode === "rapid") throw new Error(RAPID_LOCKED);
    if (mode === "sdd") return "kept";
    await atomicWrite(current?.file ?? await contained(cwd, AGENTS), appendSection(text ?? "", await template(routerDir)));
    return "written";
}
