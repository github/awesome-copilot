import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { basename, isAbsolute, relative, resolve } from "node:path";

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

export function parseStatusEntry(line) {
    const code = line.slice(0, 2);
    const rawPath = line.slice(3);
    const renameMarker = rawPath.lastIndexOf(" -> ");
    return {
        code,
        path: renameMarker >= 0 ? rawPath.slice(renameMarker + 4) : rawPath,
        originalPath: renameMarker >= 0 ? rawPath.slice(0, renameMarker) : null,
    };
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
    return { absolutePath, relativePath };
}

async function renderUntrackedFile(root, path) {
    const { absolutePath, relativePath } = assertRepositoryPath(root, path);
    const fileStat = await stat(absolutePath);
    if (!fileStat.isFile()) throw new Error("Only untracked files can be previewed.");
    if (fileStat.size > 512 * 1024) throw new Error("This untracked file is too large to preview.");

    const content = await readFile(absolutePath);
    if (content.includes(0)) return `Binary file ${relativePath} is untracked.`;

    const text = content.toString("utf8");
    const addedLines = text.split(/\r?\n/);
    if (addedLines.at(-1) === "") addedLines.pop();
    return [
        `diff --git a/${relativePath} b/${relativePath}`,
        "new file mode 100644",
        "--- /dev/null",
        `+++ b/${relativePath}`,
        `@@ -0,0 +1,${addedLines.length} @@`,
        ...addedLines.map((line) => `+${line}`),
    ].join("\n");
}

export async function getFileDiff(cwd, requestedPath) {
    const root = await runGit(cwd, ["rev-parse", "--show-toplevel"]);
    const { relativePath } = assertRepositoryPath(root, requestedPath);
    const status = await runGit(root, [
        "status", "--short", "--untracked-files=all", "--", relativePath,
    ]);
    const entry = lines(status).map(parseStatusEntry).find((item) => item.path === relativePath);
    if (!entry) throw new Error("This file no longer has uncommitted changes.");

    if (entry.code === "??") {
        return {
            ...entry,
            diff: await renderUntrackedFile(root, relativePath),
        };
    }

    const patches = [];
    if (entry.code[0] && entry.code[0] !== " ") {
        const staged = await runGit(root, ["diff", "--cached", "--no-ext-diff", "--", relativePath]);
        if (staged) patches.push({ kind: "Staged", content: staged });
    }
    if (entry.code[1] && entry.code[1] !== " ") {
        const unstaged = await runGit(root, ["diff", "--no-ext-diff", "--", relativePath]);
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
        runGit(worktreeRoot, ["rev-parse", "--short", "HEAD"]),
    ]);
    const baseRef = await resolveBaseRef(worktreeRoot, branch);
    const mergeBase = baseRef
        ? await runGit(worktreeRoot, ["merge-base", "HEAD", baseRef], { optional: true })
        : "";

    const branchRange = mergeBase ? `${mergeBase}..HEAD` : null;
    const graphRefs = ["HEAD"];
    if (baseRef) graphRefs.push(baseRef);
    const [branchLog, recentLog, graphLog, status, diffStat, stagedDiffStat, unstagedDiffStat, divergence] =
        await Promise.all([
            branchRange
                ? runGit(worktreeRoot, ["log", "--format=%h %s", branchRange])
                : Promise.resolve(""),
            runGit(worktreeRoot, ["log", "-10", "--format=%h %s", "HEAD"]),
            runGit(worktreeRoot, [
                "log",
                "--graph",
                "--decorate=short",
                "--topo-order",
                "--format=%h%x09%s%x09%D",
                "--max-count=40",
                ...graphRefs,
            ]),
            runGit(worktreeRoot, ["status", "--short", "--untracked-files=all"]),
            runGit(worktreeRoot, ["diff", "--stat", "HEAD"]),
            runGit(worktreeRoot, ["diff", "--cached", "--stat"]),
            runGit(worktreeRoot, ["diff", "--stat"]),
            baseRef
                ? runGit(worktreeRoot, ["rev-list", "--left-right", "--count", `${baseRef}...HEAD`], {
                    optional: true,
                })
                : Promise.resolve(""),
        ]);

    const [behind = 0, ahead = 0] = divergence
        .split(/\s+/)
        .filter(Boolean)
        .map((value) => Number.parseInt(value, 10) || 0);

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
        uncommitted: lines(status),
        changes: lines(status).map(parseStatusEntry),
        diffStat,
        stagedDiffStat,
        unstagedDiffStat,
    };
}
