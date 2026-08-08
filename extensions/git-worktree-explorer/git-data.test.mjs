import assert from "node:assert/strict";
import test from "node:test";
import {
    gatherCommitDetails,
    gatherCommits,
    gatherGraphCommits,
    gatherRepository,
    normalizeRemoteUrl,
    parseBranchRecords,
    parseCommitRecords,
    parseDivergence,
    parseTracking,
    parseWorktreePorcelain,
    resolveDefaultBranch,
} from "./git-data.mjs";

test("parses linked, detached, and locked worktrees", () => {
    const worktrees = parseWorktreePorcelain([
        "worktree C:/repos/main",
        "HEAD 1111111111111111111111111111111111111111",
        "branch refs/heads/main",
        "",
        "worktree C:/repos/feature",
        "HEAD 2222222222222222222222222222222222222222",
        "detached",
        "locked in use",
        "",
    ].join("\n"));

    assert.deepEqual(worktrees, [
        {
            path: "C:/repos/main",
            head: "1111111111111111111111111111111111111111",
            branch: "main",
            detached: false,
            bare: false,
            locked: false,
            prunable: false,
        },
        {
            path: "C:/repos/feature",
            head: "2222222222222222222222222222222222222222",
            branch: null,
            detached: true,
            bare: false,
            locked: "in use",
            prunable: false,
        },
    ]);
});

test("parses branch tracking and excludes symbolic remote HEAD", () => {
    const separator = "\x1f";
    const branches = parseBranchRecords([
        ["refs/heads/main", "main", "a".repeat(40), "origin/main", "[ahead 2, behind 3]", "2026-01-02T03:04:05Z", "Main"].join(separator),
        ["refs/remotes/origin/HEAD", "origin/HEAD", "a".repeat(40), "", "", "", ""].join(separator),
        ["refs/remotes/origin/main", "origin/main", "a".repeat(40), "", "", "2026-01-02T03:04:05Z", "Main"].join(separator),
    ].join("\n"));

    assert.equal(branches.length, 2);
    assert.deepEqual(branches[0].tracking, { ahead: 2, behind: 3, gone: false });
    assert.equal(branches[1].remote, true);
    assert.deepEqual(parseTracking("[gone]"), { ahead: 0, behind: 0, gone: true });
});

test("parses commit records with parents and timestamps", () => {
    const separator = "\x1f";
    const recordSeparator = "\x1e";
    const output = [
        "a".repeat(40),
        "aaaaaaaa",
        `${"b".repeat(40)} ${"c".repeat(40)}`,
        "Ada",
        "ada@example.com",
        "2026-01-01T00:00:00Z",
        "2026-01-01T01:00:00Z",
        "Merge topic",
    ].join(separator) + recordSeparator;
    const [commit] = parseCommitRecords(output);
    assert.equal(commit.shortSha, "aaaaaaaa");
    assert.equal(commit.parents.length, 2);
    assert.equal(commit.subject, "Merge topic");
});

test("parses branch divergence from git rev-list output", () => {
    assert.deepEqual(parseDivergence("3\t7"), { ahead: 7, behind: 3 });
    assert.equal(parseDivergence("invalid"), null);
});

test("resolves a remote default branch when origin HEAD is unavailable", () => {
    const branches = [
        { ref: "refs/heads/main", remote: false },
        { ref: "refs/remotes/origin/main", remote: true },
    ];
    assert.equal(resolveDefaultBranch(null, branches), "refs/remotes/origin/main");
    assert.equal(resolveDefaultBranch("refs/remotes/upstream/trunk", branches), "refs/remotes/upstream/trunk");
    assert.equal(resolveDefaultBranch(null, [{ ref: "refs/heads/main", remote: false }]), null);
});

test("normalizes supported GitHub remote URL forms", () => {
    assert.deepEqual(normalizeRemoteUrl("git@github.com:octo/repo.git"), {
        raw: "git@github.com:octo/repo.git",
        host: "github.com",
        owner: "octo",
        repo: "repo",
        github: true,
        webUrl: "https://github.com/octo/repo",
    });
    assert.equal(normalizeRemoteUrl("https://github.com/octo/repo.git").repo, "repo");
    assert.equal(normalizeRemoteUrl("not a remote"), null);
    assert.equal(normalizeRemoteUrl("https://github.com/too/many/parts"), null);
});

test("repository snapshot creates a virtual group for branches without worktrees", async () => {
    const root = process.cwd();
    const sha = "a".repeat(40);
    const separator = "\x1f";
    const runner = async (command, args) => {
        const key = `${command} ${args.join(" ")}`;
        if (key === "git rev-parse --show-toplevel") return { stdout: root, stderr: "" };
        if (key === "git rev-parse --git-common-dir") return { stdout: ".git", stderr: "" };
        if (key === "git rev-parse --verify HEAD") return { stdout: sha, stderr: "" };
        if (key === "git remote get-url origin") return { stdout: "git@github.com:octo/repo.git", stderr: "" };
        if (key === "git symbolic-ref --quiet refs/remotes/origin/HEAD") {
            return { stdout: "refs/remotes/origin/main", stderr: "" };
        }
        if (key.startsWith("git status ")) return { stdout: "## main...origin/main\n M file.txt", stderr: "" };
        if (key === "git worktree list --porcelain") {
            return { stdout: `worktree ${root}\nHEAD ${sha}\nbranch refs/heads/main\n`, stderr: "" };
        }
        if (key.startsWith("git for-each-ref ")) {
            return {
                stdout: [
                    ["refs/heads/main", "main", sha, "origin/main", "", "2026-01-01T00:00:00Z", "Main"].join(separator),
                    ["refs/heads/topic", "topic", sha, "", "", "2026-01-01T00:00:00Z", "Topic"].join(separator),
                ].join("\n"),
                stderr: "",
            };
        }
        if (key.startsWith("git rev-list --left-right --count ")) {
            return { stdout: key.includes("refs/heads/topic") ? "4\t2" : "0\t0", stderr: "" };
        }
        if (key.startsWith("gh pr list ")) {
            const error = new Error("not found");
            error.code = "ENOENT";
            return { stdout: "", stderr: "not found", error };
        }
        throw new Error(`Unexpected command: ${key}`);
    };

    const snapshot = await gatherRepository(root, { commandRunner: runner });
    assert.equal(snapshot.repository.dirty, true);
    assert.equal(snapshot.repository.defaultBranch, "refs/remotes/origin/main");
    assert.equal(snapshot.github.status, "unavailable");
    assert.equal(snapshot.worktrees.length, 2);
    assert.deepEqual(snapshot.worktrees[1].branchIds, ["branch:topic"]);
    assert.equal(snapshot.branches[0].worktrees[0], root);
    assert.deepEqual(snapshot.branches[1].defaultTracking, { ahead: 2, behind: 4 });
});

test("commit pagination returns a cursor only when more records exist", async () => {
    const separator = "\x1f";
    const recordSeparator = "\x1e";
    const output = Array.from({ length: 51 }, (_, index) => [
        String(index).padStart(40, "a"),
        String(index).padStart(8, "a"),
        "",
        "Ada",
        "ada@example.com",
        "2026-01-01T00:00:00Z",
        "2026-01-01T00:00:00Z",
        `Commit ${index}`,
    ].join(separator) + recordSeparator).join("");
    let receivedArgs;
    const runner = async (_command, args) => {
        receivedArgs = args;
        return { stdout: output, stderr: "" };
    };
    const page = await gatherCommits(
        process.cwd(),
        "refs/heads/topic",
        "refs/remotes/origin/main",
        0,
        50,
        { commandRunner: runner },
    );
    assert.equal(page.commits.length, 50);
    assert.equal(page.nextOffset, 50);
    assert.equal(page.comparisonBase, "refs/remotes/origin/main");
    assert.equal(page.comparisonUnavailable, false);
    assert.deepEqual(receivedArgs.slice(-4), [
        "refs/heads/topic",
        "--not",
        "refs/remotes/origin/main",
        "--",
    ]);
});

test("combined graph uses all local branch refs in topological order", async () => {
    let receivedArgs;
    const runner = async (_command, args) => {
        receivedArgs = args;
        return { stdout: "", stderr: "" };
    };
    const page = await gatherGraphCommits(
        process.cwd(),
        ["refs/heads/main", "refs/heads/topic", "refs/remotes/origin/main"],
        0,
        100,
        { commandRunner: runner },
    );
    assert.equal(page.commits.length, 0);
    assert.ok(receivedArgs.includes("--topo-order"));
    assert.ok(receivedArgs.includes("--date-order"));
    assert.ok(receivedArgs.includes("refs/heads/main"));
    assert.ok(receivedArgs.includes("refs/heads/topic"));
    assert.ok(!receivedArgs.includes("refs/remotes/origin/main"));
});

test("combined graph accepts pinned commit tips for stable pagination", async () => {
    const tip = "a".repeat(40);
    let receivedArgs;
    const runner = async (_command, args) => {
        receivedArgs = args;
        return { stdout: "", stderr: "" };
    };
    await gatherGraphCommits(process.cwd(), [tip, "--all"], 100, 100, { commandRunner: runner });
    assert.ok(receivedArgs.includes(tip));
    assert.ok(!receivedArgs.includes("--all"));
    assert.ok(receivedArgs.includes("--skip=100"));
});

test("commit details reject non-SHA revisions before executing Git", async () => {
    await assert.rejects(
        gatherCommitDetails(process.cwd(), "--all", null, {
            commandRunner: async () => {
                throw new Error("should not run");
            },
        }),
        /Invalid commit SHA/,
    );
});
