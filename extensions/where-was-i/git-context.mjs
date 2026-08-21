import { execFile } from "node:child_process";
import { lstat, readFile, readlink } from "node:fs/promises";
import { basename, isAbsolute, relative, resolve } from "node:path";

// Hash of Git's empty tree, used to diff the worktree when HEAD is unborn.
const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
const STATUS_ARGS = ["status", "--porcelain=v1", "-z", "--untracked-files=all"];

function runGit(cwd, args, { optional = false } = {}) {
    return new Promise((resolve, reject) => {
        execFile(
            "git",
            args,
            { cwd, timeout: 15000, maxBuffer: 1024 * 1024, encoding: "utf8" },
            (error, stdout, stderr) => {
                if (error) {
                    if (optional) {
                        resolve("");
                        return;
                    }
                    reject(new Error((stderr || error.message || "Git command failed").trim()));
                    return;
                }
                resolve((stdout || "").trimEnd());
            },
        );
    });
}

async function resolveBaseRef(cwd, branch) {
    const remoteDefault = await runGit(
        cwd,
        ["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"],
        { optional: true },
    );
    const candidates = [remoteDefault, "origin/main", "origin/master", "main", "master"]
        .filter(Boolean)
        .filter((ref, index, refs) => refs.indexOf(ref) === index && ref !== branch);

    for (const ref of candidates) {
        const commit = await runGit(cwd, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], {
            optional: true,
        });
        if (commit) return ref;
    }
    return null;
}

function lines(value) {
    return value.split("\n").map((line) => line.trimEnd()).filter(Boolean);
}

// Parses `git status --porcelain=v1 -z` output. Each entry is `XY PATH\0`; renames and
// copies are followed by a second `ORIG_PATH\0` field. Paths are never quoted in -z mode.
export function parseStatusOutput(output) {
    const fields = output.split("\0");
    const entries = [];
    for (let index = 0; index < fields.length; index += 1) {
        const field = fields[index];
        if (!field) continue;
        const code = field.slice(0, 2);
        const path = field.slice(3);
        const isRenameOrCopy = /[RC]/.test(code);
        const originalPath = isRenameOrCopy ? fields[index + 1] || null : null;
        if (isRenameOrCopy) index += 1;
        entries.push({ code, path, originalPath });
    }
    return entries;
}

export function formatStatusEntry(entry) {
    const rename = entry.originalPath ? `${entry.originalPath} -> ` : "";
    return `${entry.code} ${rename}${entry.path}`;
}

function parseGraphLine(line) {
    const [graphAndHash, subject = "", refs = ""] = line.split("\t");
    const hashMatch = graphAndHash.match(/([0-9a-f]{7,})$/);
    return {
        graph: hashMatch ? graphAndHash.slice(0, hashMatch.index) : graphAndHash,
        hash: hashMatch?.[1] || "",
        subject,
        refs,
    };
}

function assertRepositoryPath(root, path) {
    const absolutePath = resolve(root, path);
    const relativePath = relative(root, absolutePath);
    if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath)) {
        throw new Error("The requested file must be inside the current worktree.");
    }
    return { absolutePath, relativePath: relativePath.replaceAll("\\", "/") };
}

function renderNewFilePatch(relativePath, mode, addedLines) {
    return [
        `diff --git a/${relativePath} b/${relativePath}`,
        `new file mode ${mode}`,
        "--- /dev/null",
        `+++ b/${relativePath}`,
        `@@ -0,0 +1,${addedLines.length} @@`,
        ...addedLines.map((line) => `+${line}`),
    ].join("\n");
}

async function renderUntrackedFile(root, path) {
    const { absolutePath, relativePath } = assertRepositoryPath(root, path);
    // lstat never follows symlinks, so a link pointing outside the worktree cannot be
    // dereferenced into reading an arbitrary file on disk.
    const fileStat = await lstat(absolutePath);
    if (fileStat.isSymbolicLink()) {
        // Mirror Git: a symlink's "content" is its link target, not the file it points to.
        const target = await readlink(absolutePath);
        return renderNewFilePatch(relativePath, "120000", [target]);
    }
    if (!fileStat.isFile()) throw new Error("Only untracked files can be previewed.");
    if (fileStat.size > 512 * 1024) throw new Error("This untracked file is too large to preview.");

    const content = await readFile(absolutePath);
    if (content.includes(0)) return `Binary file ${relativePath} is untracked.`;

    const text = content.toString("utf8");
    const addedLines = text.split(/\r?\n/);
    if (addedLines.at(-1) === "") addedLines.pop();
    return renderNewFilePatch(relativePath, "100644", addedLines);
}

export async function getFileDiff(cwd, requestedPath) {
    const root = await runGit(cwd, ["rev-parse", "--show-toplevel"]);
    const { relativePath } = assertRepositoryPath(root, requestedPath);
    // Filtering status by only the destination path makes Git report a rename as an add.
    // Read the full status first so the original path remains available for the patch.
    const status = await runGit(root, STATUS_ARGS);
    const entry = parseStatusOutput(status).find((item) => item.path === relativePath);
    if (!entry) throw new Error("This file no longer has uncommitted changes.");

    if (entry.code === "??") {
        return {
            ...entry,
            diff: await renderUntrackedFile(root, relativePath),
        };
    }

    const patches = [];
    const diffPaths = entry.originalPath
        ? [entry.originalPath, relativePath]
        : [relativePath];
    if (entry.code[0] && entry.code[0] !== " ") {
        const staged = await runGit(root, ["diff", "--cached", "--no-ext-diff", "--", ...diffPaths]);
        if (staged) patches.push({ kind: "Staged", content: staged });
    }
    if (entry.code[1] && entry.code[1] !== " ") {
        const unstaged = await runGit(root, ["diff", "--no-ext-diff", "--", ...diffPaths]);
        if (unstaged) patches.push({ kind: "Unstaged", content: unstaged });
    }

    return {
        ...entry,
        diff: patches
            .map((patch) => patches.length > 1 ? `# ${patch.kind}\n${patch.content}` : patch.content)
            .join("\n\n"),
    };
}

export async function gatherGitContext(cwd) {
    const worktreeRoot = await runGit(cwd, ["rev-parse", "--show-toplevel"]);
    const [branch, head] = await Promise.all([
        runGit(worktreeRoot, ["branch", "--show-current"]),
        // Empty on an unborn branch (fresh `git init`), where no commit exists yet.
        runGit(worktreeRoot, ["rev-parse", "--short", "--verify", "--quiet", "HEAD"], { optional: true }),
    ]);
    const hasHead = Boolean(head);
    const baseRef = hasHead ? await resolveBaseRef(worktreeRoot, branch) : null;
    const mergeBase = baseRef
        ? await runGit(worktreeRoot, ["merge-base", "HEAD", baseRef], { optional: true })
        : "";

    const branchRange = mergeBase ? `${mergeBase}..HEAD` : null;
    const graphRefs = ["HEAD"];
    if (baseRef) graphRefs.push(baseRef);
    const none = Promise.resolve("");
    const [branchLog, recentLog, graphLog, status, diffStat, stagedDiffStat, unstagedDiffStat, divergence] =
        await Promise.all([
            branchRange
                ? runGit(worktreeRoot, ["log", "--format=%h %s", branchRange])
                : none,
            hasHead ? runGit(worktreeRoot, ["log", "-10", "--format=%h %s", "HEAD"]) : none,
            hasHead
                ? runGit(worktreeRoot, [
                    "log",
                    "--graph",
                    "--decorate=short",
                    "--topo-order",
                    "--format=%h%x09%s%x09%D",
                    "--max-count=40",
                    ...graphRefs,
                ])
                : none,
            runGit(worktreeRoot, STATUS_ARGS),
            runGit(worktreeRoot, ["diff", "--stat", hasHead ? "HEAD" : EMPTY_TREE]),
            runGit(worktreeRoot, ["diff", "--cached", "--stat"]),
            runGit(worktreeRoot, ["diff", "--stat"]),
            baseRef
                ? runGit(worktreeRoot, ["rev-list", "--left-right", "--count", `${baseRef}...HEAD`], {
                    optional: true,
                })
                : none,
        ]);

    const [behind = 0, ahead = 0] = divergence
        .split(/\s+/)
        .filter(Boolean)
        .map((value) => Number.parseInt(value, 10) || 0);
    const changes = parseStatusOutput(status);

    return {
        worktreeRoot,
        worktreeName: basename(worktreeRoot),
        branch,
        head,
        baseRef,
        ahead,
        behind,
        branchCommits: lines(branchLog),
        recentCommits: lines(recentLog),
        commitGraph: lines(graphLog).map(parseGraphLine),
        uncommitted: changes.map(formatStatusEntry),
        changes,
        diffStat,
        stagedDiffStat,
        unstagedDiffStat,
    };
}
