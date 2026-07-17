import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { gatherGitContext } from "./git-context.mjs";

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
    assert.match(context.uncommitted.join("\n"), /M  staged\.txt/);
    assert.match(context.uncommitted.join("\n"), / M unstaged\.txt/);
    assert.match(context.uncommitted.join("\n"), /\?\? untracked\.txt/);
    assert.match(context.diffStat, /staged\.txt/);
    assert.match(context.diffStat, /unstaged\.txt/);
    assert.match(context.stagedDiffStat, /staged\.txt/);
    assert.match(context.unstagedDiffStat, /unstaged\.txt/);
});
