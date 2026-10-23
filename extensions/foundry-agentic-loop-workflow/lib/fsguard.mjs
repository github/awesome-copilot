import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";

export class ContainmentError extends Error {
    constructor(message) {
        super(message);
        this.name = "ContainmentError";
    }
}

// Resolves a workspace-relative path for the workflow's own files (AGENTS.md, .agentic-loop/...). Every existing component
// is checked with lstat, so a symbolic link anywhere on the way, or a path that would resolve outside the workspace, fails closed.
export async function contained(cwd, rel) {
    const parts = String(rel ?? "").split("/").filter(Boolean);
    if (!parts.length || parts.some(part => part === "." || part === ".." || part.includes("\\"))) throw new ContainmentError(`Refusing path ${rel}: it must be a plain workspace-relative path.`);
    const root = await realpath(cwd);
    let current = root;
    for (const [index, part] of parts.entries()) {
        current = path.join(current, part);
        let info;
        try { info = await lstat(current); }
        catch (error) {
            if (error?.code === "ENOENT") break;
            throw error;
        }
        if (info.isSymbolicLink()) {
            const name = parts.slice(0, index + 1).join("/");
            throw new ContainmentError(`${name} is a symbolic link. Agentic Loop reads and writes its files only inside the workspace (${root}): replace the link with a real ${index < parts.length - 1 ? "folder" : "file"}, then try again.`);
        }
    }
    const target = path.join(root, ...parts);
    if (!target.startsWith(`${root}${path.sep}`)) throw new ContainmentError(`Refusing path ${rel}: it resolves outside the workspace (${root}).`);
    return target;
}

// Reads a contained workspace file of bounded size; null when it is missing.
export async function readContained(cwd, rel, maxBytes = 1_048_576) {
    const file = await contained(cwd, rel);
    let info;
    try { info = await lstat(file); }
    catch (error) {
        if (error?.code === "ENOENT") return null;
        throw error;
    }
    if (!info.isFile()) throw new ContainmentError(`${rel} is not a regular file.`);
    if (info.size > maxBytes) throw new ContainmentError(`${rel} is larger than ${maxBytes} bytes.`);
    return { file, text: await readFile(file, "utf8"), mtimeMs: info.mtimeMs };
}
