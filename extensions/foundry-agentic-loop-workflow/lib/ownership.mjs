import { execFile } from "node:child_process";
import { lstat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { MAX_ITEMS, clean, scope } from "./record.mjs";

const run = promisify(execFile);
const MAX_PATHS = 2000;
const git = (cwd, args) => run("git", args, { cwd, timeout: 30_000, maxBuffer: 16 * 1024 * 1024, windowsHide: true });

async function signature(file) {
    try {
        const info = await lstat(file);
        return `${info.size}:${info.mtimeMs}`;
    } catch { return "missing"; }
}

// Dirty workspace paths (relative to cwd) with a size:mtime signature, so a later snapshot shows what changed in between.
// Null without git or outside a repository; skipped when the workspace has more dirty paths than is worth checking.
export async function snapshot(cwd) {
    let prefix;
    let output;
    try {
        prefix = (await git(cwd, ["rev-parse", "--show-prefix"])).stdout.trim();
        output = (await git(cwd, ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--", "."])).stdout;
    } catch { return null; }
    const entries = output.split("\0");
    const paths = [];
    for (let index = 0; index < entries.length; index += 1) {
        const entry = entries[index];
        if (entry.length < 4) continue;
        const file = entry.slice(3);
        if (/[RC]/.test(entry.slice(0, 2))) index += 1;
        if (file.startsWith(prefix)) paths.push(file.slice(prefix.length));
    }
    if (paths.length > MAX_PATHS) return { skipped: `${paths.length} changed paths exceed ${MAX_PATHS}` };
    const files = {};
    for (const file of paths) files[file] = await signature(path.join(cwd, ...file.split("/")));
    return { files };
}

export function changedPaths(before, after) {
    const keys = new Set([...Object.keys(before.files), ...Object.keys(after.files)]);
    return [...keys].filter(file => before.files[file] !== after.files[file] && !file.startsWith(".agentic-loop/")).sort();
}

const GLOB = /[*?[\]{}]/;

// Case-insensitive like planWorkstreams. A glob matches with path.matchesGlob; a plain path owns itself and everything below it.
export function owner(file, workstreams) {
    const target = file.toLowerCase();
    return workstreams.find(workstream => workstream.files.some(pattern => {
        const value = String(pattern).trim().replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
        if (GLOB.test(value)) return path.posix.matchesGlob(target, value) || path.posix.matchesGlob(target, `${value.replace(/\/+$/, "")}/**`);
        const plain = scope(value)?.toLowerCase();
        return Boolean(plain) && (target === plain || target.startsWith(`${plain}/`));
    }))?.name ?? null;
}

// Paths the workers changed outside every declared ownership; reported for integration, never reverted.
export function ownershipCheck(before, after, workstreams) {
    if (!before || !after) return { checked: false, reason: "git is not available or the workspace is not a repository", unowned: [] };
    if (before.skipped || after.skipped) return { checked: false, reason: before.skipped ?? after.skipped, unowned: [] };
    const unowned = changedPaths(before, after).filter(file => !owner(file, workstreams));
    return { checked: true, reason: null, unowned: unowned.slice(0, MAX_ITEMS).map(file => clean(file, 300)), total: unowned.length };
}
