import { execFile } from "node:child_process";
import { basename, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const FIELD_SEPARATOR = "\x1f";
const RECORD_SEPARATOR = "\x1e";

export class CommandError extends Error {
    constructor(command, args, cause) {
        const detail = String(cause?.stderr || cause?.message || "command failed").trim();
        super(`${command} ${args.join(" ")}: ${detail}`);
        this.name = "CommandError";
        this.command = command;
        this.args = args;
        this.code = cause?.code;
        this.stderr = String(cause?.stderr || "").trim();
    }
}

export async function runCommand(command, args, cwd, options = {}) {
    try {
        const { stdout, stderr } = await execFileAsync(command, args, {
            cwd,
            encoding: "utf8",
            timeout: options.timeout ?? 15_000,
            maxBuffer: options.maxBuffer ?? 2 * 1024 * 1024,
            windowsHide: true,
        });
        return { stdout: stdout.trimEnd(), stderr: stderr.trimEnd() };
    } catch (error) {
        if (options.allowFailure) {
            return {
                stdout: String(error?.stdout || "").trimEnd(),
                stderr: String(error?.stderr || error?.message || "").trimEnd(),
                error,
            };
        }
        throw new CommandError(command, args, error);
    }
}

export function parseWorktreePorcelain(output) {
    if (!output.trim()) return [];
    return output.trim().split(/\r?\n\r?\n/).map((block) => {
        const worktree = {
            path: "",
            head: null,
            branch: null,
            detached: false,
            bare: false,
            locked: false,
            prunable: false,
        };

        for (const line of block.split(/\r?\n/)) {
            const separator = line.indexOf(" ");
            const key = separator === -1 ? line : line.slice(0, separator);
            const value = separator === -1 ? "" : line.slice(separator + 1);
            if (key === "worktree") worktree.path = value;
            else if (key === "HEAD") worktree.head = value;
            else if (key === "branch") worktree.branch = value.replace(/^refs\/heads\//, "");
            else if (key === "detached") worktree.detached = true;
            else if (key === "bare") worktree.bare = true;
            else if (key === "locked") worktree.locked = value || true;
            else if (key === "prunable") worktree.prunable = value || true;
        }
        return worktree;
    }).filter((worktree) => worktree.path);
}

export function parseTracking(value) {
    const ahead = Number(value.match(/ahead (\d+)/)?.[1] || 0);
    const behind = Number(value.match(/behind (\d+)/)?.[1] || 0);
    return { ahead, behind, gone: value.includes("[gone]") };
}

export function parseBranchRecords(output) {
    if (!output.trim()) return [];
    return output.split(/\r?\n/).filter(Boolean).map((record) => {
        const [ref, name, sha, upstream, tracking, updatedAt, subject] = record.split(FIELD_SEPARATOR);
        const remote = ref.startsWith("refs/remotes/");
        return {
            ref,
            name,
            sha,
            upstream: upstream || null,
            tracking: parseTracking(tracking || ""),
            updatedAt: updatedAt || null,
            subject: subject || "",
            remote,
        };
    }).filter((branch) => branch.ref && branch.name && !branch.name.endsWith("/HEAD"));
}

export function parseCommitRecords(output) {
    if (!output.trim()) return [];
    return output.split(RECORD_SEPARATOR).map((record) => record.replace(/^[\r\n]+|[\r\n]+$/g, "")).filter(Boolean)
        .map((record) => {
            const [sha, shortSha, parents, authorName, authorEmail, authoredAt, committedAt, subject] =
                record.split(FIELD_SEPARATOR);
            return {
                sha,
                shortSha,
                parents: parents ? parents.split(" ") : [],
                author: { name: authorName, email: authorEmail },
                authoredAt,
                committedAt,
                subject: subject || "(no subject)",
            };
        });
}

export function parseDivergence(output) {
    const [behindValue, aheadValue] = String(output || "").trim().split(/\s+/);
    const behind = Number(behindValue);
    const ahead = Number(aheadValue);
    if (!Number.isFinite(behind) || !Number.isFinite(ahead)) return null;
    return { ahead, behind };
}

export function resolveDefaultBranch(symbolicRef, branches) {
    if (symbolicRef) return symbolicRef;
    const refs = new Set(branches.filter((branch) => branch.remote).map((branch) => branch.ref));
    const preferred = [
        "refs/remotes/origin/main",
        "refs/remotes/origin/master",
    ];
    for (const ref of preferred) {
        if (refs.has(ref)) return ref;
    }
    return branches.find((branch) =>
        branch.remote && /\/(?:main|master)$/.test(branch.ref)
    )?.ref || null;
}

export function normalizeRemoteUrl(rawUrl) {
    const raw = String(rawUrl || "").trim();
    if (!raw) return null;

    let host;
    let repoPath;
    const scpMatch = raw.match(/^[^@]+@([^:]+):(.+)$/);
    if (scpMatch) {
        [, host, repoPath] = scpMatch;
    } else {
        try {
            const parsed = new URL(raw);
            host = parsed.hostname;
            repoPath = parsed.pathname.replace(/^\/+/, "");
        } catch {
            return null;
        }
    }

    repoPath = repoPath.replace(/\.git$/, "").replace(/\/+$/, "");
    const parts = repoPath.split("/").filter(Boolean);
    if (!host || parts.length !== 2) return null;
    const [owner, repo] = parts;
    const github = host.toLowerCase() === "github.com";
    return {
        raw,
        host: host.toLowerCase(),
        owner,
        repo,
        github,
        webUrl: `https://${host}/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    };
}

export function parseStatus(output) {
    const lines = output.split(/\r?\n/).filter(Boolean);
    const branchLine = lines.find((line) => line.startsWith("## "));
    const files = lines.filter((line) => !line.startsWith("## ")).map((line) => ({
        status: line.slice(0, 2),
        path: line.slice(3),
    }));
    return { branchSummary: branchLine?.slice(3) || "", files };
}

function branchId(name) {
    return `branch:${name}`;
}

function worktreeId(path) {
    return `worktree:${path}`;
}

function enrichBranches(branches, worktrees, pullRequests) {
    const prsByBranch = new Map();
    for (const pullRequest of pullRequests) {
        const existing = prsByBranch.get(pullRequest.headRefName) || [];
        existing.push(pullRequest);
        prsByBranch.set(pullRequest.headRefName, existing);
    }

    return branches.filter((branch) => !branch.remote).map((branch) => ({
        ...branch,
        id: branchId(branch.name),
        worktrees: worktrees.filter((worktree) => worktree.branch === branch.name).map((worktree) => worktree.path),
        pullRequests: prsByBranch.get(branch.name) || [],
    }));
}

async function addDefaultDivergence(branches, defaultBranch, cwd, commandRunner) {
    if (!defaultBranch) {
        return branches.map((branch) => ({ ...branch, defaultTracking: null }));
    }
    return Promise.all(branches.map(async (branch) => {
        const result = await commandRunner("git", [
            "rev-list",
            "--left-right",
            "--count",
            `${defaultBranch}...${branch.ref}`,
            "--",
        ], cwd, { allowFailure: true });
        return {
            ...branch,
            defaultTracking: result.error ? null : parseDivergence(result.stdout),
        };
    }));
}

async function gatherGitHub(remote, cwd, commandRunner) {
    if (!remote?.github) {
        return { status: "not-github", message: "The origin remote is not hosted on github.com.", pullRequests: [] };
    }

    const result = await commandRunner("gh", [
        "pr", "list",
        "--repo", `${remote.owner}/${remote.repo}`,
        "--state", "all",
        "--limit", "100",
        "--json", "number,title,url,state,isDraft,headRefName,baseRefName,updatedAt",
    ], cwd, { allowFailure: true, timeout: 20_000 });

    if (result.error) {
        const unavailable = result.error.code === "ENOENT";
        return {
            status: unavailable ? "unavailable" : "unauthenticated",
            message: unavailable
                ? "GitHub CLI is not installed; showing local Git data."
                : "GitHub CLI could not load pull requests; showing local Git data.",
            pullRequests: [],
        };
    }

    try {
        return {
            status: "ready",
            message: "GitHub pull request context is available.",
            pullRequests: JSON.parse(result.stdout || "[]"),
        };
    } catch {
        return {
            status: "error",
            message: "GitHub CLI returned an unreadable response; showing local Git data.",
            pullRequests: [],
        };
    }
}

export async function gatherRepository(startCwd, options = {}) {
    const commandRunner = options.commandRunner || runCommand;
    const rootResult = await commandRunner("git", ["rev-parse", "--show-toplevel"], startCwd);
    const root = resolve(rootResult.stdout);

    const [commonDirResult, headResult, originResult, defaultBranchResult, statusResult, worktreeResult, branchResult] = await Promise.all([
        commandRunner("git", ["rev-parse", "--git-common-dir"], root),
        commandRunner("git", ["rev-parse", "--verify", "HEAD"], root, { allowFailure: true }),
        commandRunner("git", ["remote", "get-url", "origin"], root, { allowFailure: true }),
        commandRunner("git", ["symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"], root, { allowFailure: true }),
        commandRunner("git", ["status", "--porcelain=v1", "--branch", "--untracked-files=normal"], root),
        commandRunner("git", ["worktree", "list", "--porcelain"], root),
        commandRunner("git", [
            "for-each-ref",
            `--format=%(refname)%1f%(refname:short)%1f%(objectname)%1f%(upstream:short)%1f%(upstream:track)%1f%(committerdate:iso-strict)%1f%(subject)`,
            "refs/heads",
            "refs/remotes",
        ], root),
    ]);

    const remote = normalizeRemoteUrl(originResult.stdout);
    const github = await gatherGitHub(remote, root, commandRunner);
    const status = parseStatus(statusResult.stdout);
    const worktrees = parseWorktreePorcelain(worktreeResult.stdout);
    const allBranches = parseBranchRecords(branchResult.stdout);
    const defaultBranch = resolveDefaultBranch(defaultBranchResult.stdout || null, allBranches);
    const localBranches = enrichBranches(allBranches, worktrees, github.pullRequests);
    const branches = await addDefaultDivergence(
        localBranches,
        defaultBranch,
        root,
        commandRunner,
    );
    const assignedBranches = new Set(worktrees.map((worktree) => worktree.branch).filter(Boolean));
    const unassignedBranchIds = branches.filter((branch) => !assignedBranches.has(branch.name)).map((branch) => branch.id);

    const normalizedWorktrees = worktrees.map((worktree) => ({
        ...worktree,
        id: worktreeId(worktree.path),
        name: basename(worktree.path) || worktree.path,
        current: resolve(worktree.path) === root,
        branchIds: worktree.branch
            ? [branchId(worktree.branch)]
            : worktree.detached
                ? [`detached:${worktree.path}`]
                : [],
    }));
    if (unassignedBranchIds.length) {
        normalizedWorktrees.push({
            id: "worktree:unassigned",
            path: null,
            name: "Unassigned branches",
            head: null,
            branch: null,
            current: false,
            virtual: true,
            detached: false,
            bare: false,
            locked: false,
            prunable: false,
            branchIds: unassignedBranchIds,
        });
    }

    const detachedBranches = worktrees.filter((worktree) => worktree.detached).map((worktree) => ({
        id: `detached:${worktree.path}`,
        ref: worktree.head,
        name: `Detached at ${worktree.head?.slice(0, 8) || "unknown"}`,
        sha: worktree.head,
        upstream: null,
        tracking: { ahead: 0, behind: 0 },
        updatedAt: null,
        subject: "Detached worktree",
        remote: false,
        detached: true,
        worktrees: [worktree.path],
        pullRequests: [],
        defaultTracking: null,
    }));

    return {
        repository: {
            id: "repository",
            name: basename(root) || root,
            root,
            commonDir: resolve(root, commonDirResult.stdout),
            head: headResult.stdout || null,
            empty: Boolean(headResult.error),
            dirty: status.files.length > 0,
            changedFiles: status.files,
            branchSummary: status.branchSummary,
            defaultBranch,
            remote,
        },
        worktrees: normalizedWorktrees,
        branches: [...branches, ...detachedBranches],
        remoteBranches: allBranches.filter((branch) => branch.remote),
        github: {
            status: github.status,
            message: github.message,
            pullRequestCount: github.pullRequests.length,
        },
        gatheredAt: new Date().toISOString(),
    };
}

export async function gatherCommits(cwd, ref, baseRef, offset = 0, limit = 50, options = {}) {
    const commandRunner = options.commandRunner || runCommand;
    const boundedLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const boundedOffset = Math.max(Number(offset) || 0, 0);
    const format = [
        "%H", "%h", "%P", "%an", "%ae", "%aI", "%cI", "%s",
    ].join("%x1f") + "%x1e";
    const revisions = [ref];
    if (baseRef && baseRef !== ref) revisions.push("--not", baseRef);
    const result = await commandRunner("git", [
        "log",
        `--skip=${boundedOffset}`,
        `--max-count=${boundedLimit + 1}`,
        `--format=${format}`,
        ...revisions,
        "--",
    ], cwd);
    const records = parseCommitRecords(result.stdout);
    return {
        commits: records.slice(0, boundedLimit),
        offset: boundedOffset,
        nextOffset: records.length > boundedLimit ? boundedOffset + boundedLimit : null,
        comparisonBase: baseRef || null,
        comparisonUnavailable: !baseRef,
    };
}

export async function gatherGraphCommits(cwd, refs, offset = 0, limit = 100, options = {}) {
    const commandRunner = options.commandRunner || runCommand;
    const boundedLimit = Math.min(Math.max(Number(limit) || 100, 1), 250);
    const boundedOffset = Math.max(Number(offset) || 0, 0);
    const revisions = [...new Set(refs)].filter((ref) =>
        typeof ref === "string"
        && (ref.startsWith("refs/heads/") || /^[0-9a-f]{40}$/i.test(ref))
    );
    if (!revisions.length) {
        return { commits: [], offset: boundedOffset, nextOffset: null };
    }
    const format = [
        "%H", "%h", "%P", "%an", "%ae", "%aI", "%cI", "%s",
    ].join("%x1f") + "%x1e";
    const result = await commandRunner("git", [
        "log",
        "--topo-order",
        "--date-order",
        `--skip=${boundedOffset}`,
        `--max-count=${boundedLimit + 1}`,
        `--format=${format}`,
        ...revisions,
        "--",
    ], cwd);
    const records = parseCommitRecords(result.stdout);
    return {
        commits: records.slice(0, boundedLimit),
        offset: boundedOffset,
        nextOffset: records.length > boundedLimit ? boundedOffset + boundedLimit : null,
    };
}

export async function gatherCommitDetails(cwd, sha, remote, options = {}) {
    if (!/^[0-9a-f]{7,40}$/i.test(sha)) {
        throw new Error("Invalid commit SHA.");
    }
    const commandRunner = options.commandRunner || runCommand;
    const format = ["%H", "%h", "%P", "%an", "%ae", "%aI", "%cI", "%s", "%b"].join("%x1f");
    const [metadata, files, summary] = await Promise.all([
        commandRunner("git", ["show", "--no-patch", `--format=${format}`, sha], cwd),
        commandRunner("git", ["diff-tree", "--root", "--no-commit-id", "--name-status", "-r", "-M", sha], cwd),
        commandRunner("git", ["show", "--stat", "--oneline", "--format=", sha], cwd),
    ]);
    const [fullSha, shortSha, parents, authorName, authorEmail, authoredAt, committedAt, subject, ...bodyParts] =
        metadata.stdout.split(FIELD_SEPARATOR);
    return {
        sha: fullSha,
        shortSha,
        parents: parents ? parents.split(" ") : [],
        author: { name: authorName, email: authorEmail },
        authoredAt,
        committedAt,
        subject,
        body: bodyParts.join(FIELD_SEPARATOR).trim(),
        files: files.stdout.split(/\r?\n/).filter(Boolean).map((line) => {
            const [status, ...paths] = line.split("\t");
            return { status, path: paths.join(" -> ") };
        }),
        summary: summary.stdout,
        githubUrl: remote?.github ? `${remote.webUrl}/commit/${encodeURIComponent(fullSha)}` : null,
    };
}
