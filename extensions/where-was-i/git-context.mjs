import { execFile } from "node:child_process";
import { lstat, readFile, readlink } from "node:fs/promises";
import { basename, isAbsolute, relative, resolve, sep } from "node:path";

const STATUS_ARGS = ["status", "--porcelain=v1", "-z", "--untracked-files=all"];

function runGit(cwd, args, { optional = false, input } = {}) {
    return new Promise((resolve, reject) => {
        const child = execFile(
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
        if (input !== undefined) child.stdin.end(input);
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

// Returns the index of the first graph row that can be collapsed as base-branch history.
// `--topo-order` may interleave newer base commits above branch commits, so only the
// suffix after the final branch commit is collapsible. Returns -1 when nothing can be split.
export function splitCommitGraph(graph, branchHashes, baseRef) {
    if (!baseRef || !branchHashes?.size || !graph?.length) return -1;
    let lastBranchRow = -1;
    graph.forEach((row, index) => {
        if (row.hash && branchHashes.has(row.hash)) lastBranchRow = index;
    });
    if (lastBranchRow === -1) return -1;
    const firstBaseRow = graph.findIndex((row, index) => index > lastBranchRow && row.hash);
    return firstBaseRow;
}

function assertRepositoryPath(root, path) {
    const absolutePath = resolve(root, path);
    const relativePath = relative(root, absolutePath);
    if (
        !relativePath
        || relativePath === ".."
        || relativePath.startsWith(`..${sep}`)
        || isAbsolute(relativePath)
    ) {
        throw new Error("The requested file must be inside the current worktree.");
    }
    return {
        absolutePath,
        relativePath: process.platform === "win32"
            ? relativePath.replaceAll("\\", "/")
            : relativePath,
    };
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
    const mode = (fileStat.mode & 0o111) !== 0 ? "100755" : "100644";
    return renderNewFilePatch(relativePath, mode, addedLines);
}

export async function getFileDiff(cwd, requestedPath, requestedCode = null) {
    const root = await runGit(cwd, ["rev-parse", "--show-toplevel"]);
    const { relativePath } = assertRepositoryPath(root, requestedPath);
    // Filtering status by only the destination path makes Git report a rename as an add.
    // Read the full status first so the original path remains available for the patch.
    const status = await runGit(root, STATUS_ARGS);
    // The same path can appear twice (e.g. a staged deletion plus an untracked re-creation),
    // so prefer the record whose status code the caller selected.
    const matches = parseStatusOutput(status).filter((item) => item.path === relativePath);
    const entry = (requestedCode && matches.find((item) => item.code === requestedCode)) || matches[0];
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
        const staged = await runGit(root, [
            "--literal-pathspecs", "diff", "--cached", "--no-ext-diff", "--", ...diffPaths,
        ]);
        if (staged) patches.push({ kind: "Staged", content: staged });
    }
    if (entry.code[1] && entry.code[1] !== " ") {
        const unstaged = await runGit(root, [
            "--literal-pathspecs", "diff", "--no-ext-diff", "--", ...diffPaths,
        ]);
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
    const emptyTree = hasHead
        ? ""
        : await runGit(worktreeRoot, ["hash-object", "-t", "tree", "--stdin"], { input: "" });
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
            hasHead
                ? runGit(worktreeRoot, ["diff", "--stat", "HEAD"])
                : runGit(worktreeRoot, ["diff", "--stat", emptyTree]),
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
    const branchCommits = lines(branchLog);
    const commitGraph = lines(graphLog).map(parseGraphLine);
    const branchHashes = new Set(branchCommits.map((commit) => commit.split(" ")[0]));

    return {
        worktreeRoot,
        worktreeName: basename(worktreeRoot),
        branch,
        head,
        baseRef,
        ahead,
        behind,
        branchCommits,
        recentCommits: lines(recentLog),
        commitGraph,
        baseGraphStart: splitCommitGraph(commitGraph, branchHashes, baseRef),
        uncommitted: changes.map(formatStatusEntry),
        changes,
        diffStat,
        stagedDiffStat,
        unstagedDiffStat,
    };
}
