import { stat } from "node:fs/promises";
import path from "node:path";
import { AGENTS, OPENABLE, README } from "./live.mjs";

export async function workingDirectory(session) {
    const { workingDirectory: directory } = await session.rpc.metadata.snapshot();
    if (!directory) throw new Error("The session has no working directory.");
    return path.resolve(directory);
}

export async function repoRoot(directory) {
    for (let current = directory; ; current = path.dirname(current)) {
        try { await stat(path.join(current, ".git")); return current; }
        catch { /* Keep walking towards the filesystem root. */ }
        if (path.dirname(current) === current) return directory;
    }
}

// Opens a known Agentic Loop artifact or the workspace AGENTS.md or README.md in the Editor canvas; arbitrary paths are rejected.
export async function openArtifact(session, file) {
    if (!OPENABLE.includes(file)) throw new Error("Choose an Agentic Loop artifact.");
    const directory = await workingDirectory(session);
    const absolute = path.join(directory, file);
    try { if (!(await stat(absolute)).isFile()) throw new Error(); }
    catch { throw new Error(`${file} does not exist yet. ${[AGENTS, README].includes(file) ? "The Agentic Loop writes it when a build starts." : "It is written by its workflow phase."}`); }
    const relative = path.relative(await repoRoot(directory), absolute).split(path.sep).join("/");
    return session.rpc.canvas.open({
        canvasId: "editor",
        instanceId: `foundry-agentic-loop-artifact-${file.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()}`,
        input: { path: relative, scope: "repo", title: `Agentic Loop · ${file}` },
    });
}
