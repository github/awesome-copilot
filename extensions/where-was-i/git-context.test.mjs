import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { gatherGitContext, getFileDiff, splitCommitGraph } from "./git-context.mjs";

function git(cwd, ...args) {
    return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function write(cwd, path, content) {
    writeFileSync(join(cwd, path), content, "utf8");
}

test("gathers branch commits and every worktree change", async (t) => {
    const cwd = mkdtempSync(join(tmpdir(), "where-was-i-"));
    t.after(() => rmSync(cwd, { recursive: true, force: true }));

    git(cwd, "init", "-b", "main");
    git(cwd, "config", "user.name", "Canvas Tester");
    git(cwd, "config", "user.email", "canvas@example.com");
    write(cwd, "staged.txt", "initial\n");
    write(cwd, "unstaged.txt", "initial\n");
    git(cwd, "add", ".");
    git(cwd, "commit", "-m", "Seed repository");

    git(cwd, "switch", "-c", "feature/context");
    write(cwd, "first.txt", "first\n");
    git(cwd, "add", "first.txt");
    git(cwd, "commit", "-m", "Add first feature commit");
    git(cwd, "config", "user.name", "Another Contributor");
    git(cwd, "config", "user.email", "another@example.com");
    write(cwd, "second.txt", "second\n");
    git(cwd, "add", "second.txt");
    git(cwd, "commit", "-m", "Add second feature commit");

    write(cwd, "staged.txt", "staged change\n");
    git(cwd, "add", "staged.txt");
    write(cwd, "unstaged.txt", "unstaged change\n");
    write(cwd, "untracked.txt", "untracked change\n");

    const context = await gatherGitContext(cwd);

    assert.equal(context.worktreeRoot.replaceAll("\\", "/"), cwd.replaceAll("\\", "/"));
    assert.equal(context.worktreeName, cwd.split(/[\\/]/).at(-1));
    assert.equal(context.branch, "feature/context");
    assert.equal(context.baseRef, "main");
    assert.equal(context.ahead, 2);
    assert.equal(context.behind, 0);
    assert.deepEqual(
        context.branchCommits.map((commit) => commit.replace(/^[0-9a-f]+ /, "")),
        ["Add second feature commit", "Add first feature commit"],
    );
    assert.equal(context.commitGraph[0].subject, "Add second feature commit");
    assert.match(context.commitGraph[0].refs, /HEAD -> feature\/context/);
    assert.deepEqual(
        context.changes.map((change) => [change.code, change.path]),
        [
            ["M ", "staged.txt"],
            [" M", "unstaged.txt"],
            ["??", "untracked.txt"],
        ],
    );
    assert.match(context.uncommitted.join("\n"), /M  staged\.txt/);
    assert.match(context.uncommitted.join("\n"), / M unstaged\.txt/);
    assert.match(context.uncommitted.join("\n"), /\?\? untracked\.txt/);
    assert.match(context.diffStat, /staged\.txt/);
    assert.match(context.diffStat, /unstaged\.txt/);
    assert.match(context.stagedDiffStat, /staged\.txt/);
    assert.match(context.unstagedDiffStat, /unstaged\.txt/);

    const stagedDiff = await getFileDiff(cwd, "staged.txt");
    assert.equal(stagedDiff.code, "M ");
    assert.match(stagedDiff.diff, /\+staged change/);

    const unstagedDiff = await getFileDiff(cwd, "unstaged.txt");
    assert.equal(unstagedDiff.code, " M");
    assert.match(unstagedDiff.diff, /\+unstaged change/);

    const untrackedDiff = await getFileDiff(cwd, "untracked.txt");
    assert.equal(untrackedDiff.code, "??");
    assert.match(untrackedDiff.diff, /new file mode 100644/);
    assert.match(untrackedDiff.diff, /\+untracked change/);
});

test("preserves spaces and rename paths from porcelain status", async (t) => {
    const cwd = mkdtempSync(join(tmpdir(), "where-was-i-paths-"));
    t.after(() => rmSync(cwd, { recursive: true, force: true }));

    git(cwd, "init", "-b", "main");
    git(cwd, "config", "user.name", "Canvas Tester");
    git(cwd, "config", "user.email", "canvas@example.com");
    write(cwd, "before name.txt", "tracked\n");
    git(cwd, "add", ".");
    git(cwd, "commit", "-m", "Seed repository");

    git(cwd, "mv", "before name.txt", "after name.txt");
    write(cwd, "notes draft.md", "draft\n");

    const context = await gatherGitContext(cwd);
    assert.deepEqual(
        context.changes.map(({ code, path, originalPath }) => ({ code, path, originalPath })),
        [
            { code: "R ", path: "after name.txt", originalPath: "before name.txt" },
            { code: "??", path: "notes draft.md", originalPath: null },
        ],
    );

    const diff = await getFileDiff(cwd, "notes draft.md");
    assert.match(diff.diff, /\+draft/);

    const renameDiff = await getFileDiff(cwd, "after name.txt");
    assert.equal(renameDiff.code, "R ");
    assert.equal(renameDiff.originalPath, "before name.txt");
    assert.match(renameDiff.diff, /rename from before name\.txt/);
    assert.match(renameDiff.diff, /rename to after name\.txt/);
});

test("treats status-derived filenames as literal Git pathspecs", async (t) => {
    const cwd = mkdtempSync(join(tmpdir(), "where-was-i-literal-"));
    t.after(() => rmSync(cwd, { recursive: true, force: true }));

    git(cwd, "init", "-b", "main");
    git(cwd, "config", "user.name", "Canvas Tester");
    git(cwd, "config", "user.email", "canvas@example.com");
    write(cwd, "[ab].txt", "initial bracket\n");
    write(cwd, "a.txt", "initial a\n");
    git(cwd, "add", ".");
    git(cwd, "commit", "-m", "Seed repository");

    write(cwd, "[ab].txt", "changed bracket\n");
    write(cwd, "a.txt", "changed a\n");

    const diff = await getFileDiff(cwd, "[ab].txt");
    assert.match(diff.diff, /changed bracket/);
    assert.doesNotMatch(diff.diff, /changed a/);
});

test("allows repository filenames beginning with two dots", async (t) => {
    const cwd = mkdtempSync(join(tmpdir(), "where-was-i-dots-"));
    t.after(() => rmSync(cwd, { recursive: true, force: true }));

    git(cwd, "init", "-b", "main");
    write(cwd, "..notes", "valid repository file\n");

    const diff = await getFileDiff(cwd, "..notes");
    assert.match(diff.diff, /valid repository file/);
});

test("gathers staged and untracked work from an unborn branch", async (t) => {
    const cwd = mkdtempSync(join(tmpdir(), "where-was-i-unborn-"));
    t.after(() => rmSync(cwd, { recursive: true, force: true }));

    git(cwd, "init", "-b", "main");
    write(cwd, "staged.txt", "staged\n");
    git(cwd, "add", "staged.txt");
    write(cwd, "untracked.txt", "untracked\n");

    const context = await gatherGitContext(cwd);
    assert.equal(context.head, "");
    assert.equal(context.baseRef, null);
    assert.deepEqual(context.branchCommits, []);
    assert.deepEqual(context.recentCommits, []);
    assert.deepEqual(context.commitGraph, []);
    assert.deepEqual(
        context.changes.map((change) => [change.code, change.path]),
        [
            ["A ", "staged.txt"],
            ["??", "untracked.txt"],
        ],
    );
    assert.match(context.diffStat, /staged\.txt/);
});

test("gathers an unborn SHA-256 repository without a SHA-1 empty tree", async (t) => {
    const cwd = mkdtempSync(join(tmpdir(), "where-was-i-sha256-"));
    t.after(() => rmSync(cwd, { recursive: true, force: true }));

    git(cwd, "init", "--object-format=sha256", "-b", "main");
    write(cwd, "staged.txt", "staged\n");
    git(cwd, "add", "staged.txt");
    write(cwd, "staged.txt", "staged\nthen modified\n");

    const context = await gatherGitContext(cwd);
    assert.equal(context.head, "");
    assert.match(context.diffStat, /staged\.txt/);
    assert.match(context.diffStat, /2 insertions/);
});

test("does not dereference untracked symlinks", async (t) => {
    const cwd = mkdtempSync(join(tmpdir(), "where-was-i-link-"));
    const outside = mkdtempSync(join(tmpdir(), "where-was-i-secret-"));
    t.after(() => {
        rmSync(cwd, { recursive: true, force: true });
        rmSync(outside, { recursive: true, force: true });
    });

    git(cwd, "init", "-b", "main");
    write(outside, "secret.txt", "must not be exposed\n");
    const target = join(outside, "secret.txt");
    try {
        symlinkSync(target, join(cwd, "external-link.txt"), "file");
    } catch (error) {
        if (error.code === "EPERM") {
            t.skip("Creating symlinks requires Windows Developer Mode or elevated privileges.");
            return;
        }
        throw error;
    }

    const diff = await getFileDiff(cwd, "external-link.txt");
    assert.match(diff.diff, /new file mode 120000/);
    assert.match(diff.diff, new RegExp(target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(diff.diff, /must not be exposed/);
});

test("preserves executable mode for untracked files", async (t) => {
    if (process.platform === "win32") {
        t.skip("Windows does not expose POSIX execute bits.");
        return;
    }

    const cwd = mkdtempSync(join(tmpdir(), "where-was-i-mode-"));
    t.after(() => rmSync(cwd, { recursive: true, force: true }));

    git(cwd, "init", "-b", "main");
    write(cwd, "run.sh", "#!/bin/sh\necho hello\n");
    chmodSync(join(cwd, "run.sh"), 0o755);

    const diff = await getFileDiff(cwd, "run.sh");
    assert.match(diff.diff, /new file mode 100755/);
});

test("collapses only base history after the final branch commit in a diverged graph", () => {
    const row = (hash, extra = {}) => ({ graph: "* ", hash, subject: hash, refs: "", ...extra });
    const branchHashes = new Set(["b2", "b1"]);
    // --topo-order can place a newer base commit above the branch's own commits.
    const graph = [
        row("base3"),
        row("b2"),
        row("base2"),
        row("b1"),
        { graph: "|/", hash: "", subject: "", refs: "" },
        row("base1"),
        row("root"),
    ];
    const start = splitCommitGraph(graph, branchHashes, "main");
    assert.equal(start, 5, "the split must begin after the last branch commit");
    assert.deepEqual(graph.slice(start).map((item) => item.hash), ["base1", "root"]);

    assert.equal(splitCommitGraph(graph, branchHashes, null), -1, "no base ref means no split");
    assert.equal(splitCommitGraph(graph, new Set(), "main"), -1, "no branch commits means no split");
    assert.equal(splitCommitGraph([row("b1")], branchHashes, "main"), -1, "nothing after the last branch commit");
});

test("gathered context reports a graph split that keeps diverged branch commits visible", async (t) => {
    const cwd = mkdtempSync(join(tmpdir(), "where-was-i-diverged-"));
    t.after(() => rmSync(cwd, { recursive: true, force: true }));

    git(cwd, "init", "-b", "main");
    git(cwd, "config", "user.name", "Canvas Tester");
    git(cwd, "config", "user.email", "canvas@example.com");
    write(cwd, "a.txt", "a\n");
    git(cwd, "add", ".");
    git(cwd, "commit", "-m", "root");
    git(cwd, "switch", "-c", "feature");
    write(cwd, "b.txt", "b\n");
    git(cwd, "add", ".");
    git(cwd, "commit", "-m", "feature 1");
    git(cwd, "switch", "main");
    write(cwd, "c.txt", "c\n");
    git(cwd, "add", ".");
    git(cwd, "commit", "-m", "main moved on");
    git(cwd, "switch", "feature");

    const context = await gatherGitContext(cwd);
    assert.equal(context.behind, 1);
    assert.equal(context.ahead, 1);
    const branchHashes = new Set(context.branchCommits.map((commit) => commit.split(" ")[0]));
    const lastBranchRow = context.commitGraph.reduce(
        (last, item, index) => (item.hash && branchHashes.has(item.hash) ? index : last),
        -1,
    );
    assert.ok(lastBranchRow >= 0);
    assert.ok(context.baseGraphStart > lastBranchRow, "branch commits must never land in the collapsed base section");
    // Same-second commits make the relative order of "main moved on" and "feature 1" under
    // --topo-order nondeterministic, so only assert what must always hold.
    const subjects = (rows) => rows.filter((item) => item.hash).map((item) => item.subject);
    const collapsed = subjects(context.commitGraph.slice(context.baseGraphStart));
    const focused = subjects(context.commitGraph.slice(0, context.baseGraphStart));
    assert.ok(collapsed.includes("root"));
    assert.ok(!collapsed.includes("feature 1"));
    assert.ok(focused.includes("feature 1"));
});

test("selects the requested status record when a path appears twice", async (t) => {
    const cwd = mkdtempSync(join(tmpdir(), "where-was-i-dupe-"));
    t.after(() => rmSync(cwd, { recursive: true, force: true }));

    git(cwd, "init", "-b", "main");
    git(cwd, "config", "user.name", "Canvas Tester");
    git(cwd, "config", "user.email", "canvas@example.com");
    write(cwd, "file.txt", "tracked\n");
    git(cwd, "add", ".");
    git(cwd, "commit", "-m", "seed");
    // Leaves a staged deletion and an untracked file with the same path.
    git(cwd, "rm", "--cached", "file.txt");
    write(cwd, "file.txt", "recreated\n");

    const context = await gatherGitContext(cwd);
    assert.deepEqual(
        context.changes.filter((change) => change.path === "file.txt").map((change) => change.code).sort(),
        ["??", "D "],
    );

    const staged = await getFileDiff(cwd, "file.txt", "D ");
    assert.equal(staged.code, "D ");
    assert.match(staged.diff, /-tracked/);

    const untracked = await getFileDiff(cwd, "file.txt", "??");
    assert.equal(untracked.code, "??");
    assert.match(untracked.diff, /\+recreated/);

    const fallback = await getFileDiff(cwd, "file.txt", "ZZ");
    assert.ok(["D ", "??"].includes(fallback.code), "an unknown code falls back to the first record");
});
