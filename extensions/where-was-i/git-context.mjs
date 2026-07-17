import { execFile } from "node:child_process";
import { basename } from "node:path";

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
                resolve((stdout || "").trim());
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
    const [branchLog, recentLog, status, diffStat, stagedDiffStat, unstagedDiffStat, divergence] =
        await Promise.all([
            branchRange
                ? runGit(worktreeRoot, ["log", "--format=%h %s", branchRange])
                : Promise.resolve(""),
            runGit(worktreeRoot, ["log", "-10", "--format=%h %s", "HEAD"]),
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
        uncommitted: lines(status),
        diffStat,
        stagedDiffStat,
        unstagedDiffStat,
    };
}
