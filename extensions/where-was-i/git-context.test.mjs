import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { gatherGitContext, getFileDiff } from "./git-context.mjs";

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
