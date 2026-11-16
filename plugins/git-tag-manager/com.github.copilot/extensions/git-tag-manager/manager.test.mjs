import test from "node:test";
import assert from "node:assert/strict";
import { writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fixture } from "./test-fixture.mjs";
import { git, pushTag } from "./git.mjs";
import { TagManager } from "./manager.mjs";
import { preferencePath } from "./storage.mjs";

test("confirmed creation pins the commit; individual push ignores mirror and followTags", async t => {
    const { manager, repository, remoteGit } = await fixture(t);
    const plan = await manager.prepare({ operation: "create", name: "v1.0.0", target: "HEAD", message: "Release", push: true });
    assert.equal((await git(repository, ["tag"])), "");
    await assert.rejects(manager.execute(plan.id, "wrong"), { code: "confirmation_required" });
    await git(repository, ["commit", "--allow-empty", "-m", "Advance HEAD"]);
    await git(repository, ["tag", "-a", "-m", "Unrelated", "unrelated"]);
    await git(repository, ["config", "push.followTags", "true"]);
    await git(repository, ["config", "remote.origin.mirror", "true"]);
    await manager.execute(plan.id, plan.name);
    assert.equal(await git(repository, ["rev-parse", "v1.0.0^{}"]), plan.targetOid);
    assert.equal(await remoteGit(["tag"]), "v1.0.0");
    assert.equal(await remoteGit(["for-each-ref", "--format=%(refname)", "refs/heads"]), "");
    assert.equal(manager.snapshot.tags.find(tag => tag.name === plan.name).status, "synced");
    await assert.rejects(manager.prepare({ operation: "push", name: plan.name }), { code: "cannot_push" });
});

test("remote-only, diverged, scoped deletion and exact expected-object guards", async t => {
    const { manager, repository, remoteGit } = await fixture(t);
    await git(repository, ["tag", "remote-only"]);
    await pushTag(repository, "origin", "remote-only");
    await git(repository, ["tag", "-d", "remote-only"]);
    await git(repository, ["tag", "diverged"]);
    await pushTag(repository, "origin", "diverged");
    await git(repository, ["commit", "--allow-empty", "-m", "Different"]);
    await git(repository, ["tag", "-f", "diverged"]);
    await manager.refresh();
    assert.equal(manager.snapshot.tags.find(tag => tag.name === "remote-only").status, "remote-only");
    assert.equal(manager.snapshot.tags.find(tag => tag.name === "diverged").status, "diverged");
    await assert.rejects(manager.prepare({ operation: "push", name: "diverged" }), { code: "cannot_push" });
    let plan = await manager.prepare({ operation: "delete", name: "remote-only", scope: "remote" });
    await manager.execute(plan.id, plan.name);
    assert.equal(await remoteGit(["tag", "--list", "remote-only"]), "");
    plan = await manager.prepare({ operation: "delete", name: "diverged", scope: "both" });
    await git(repository, ["tag", "-f", "diverged", "HEAD~1"]);
    await assert.rejects(manager.execute(plan.id, plan.name), { code: "tag_changed" });
    assert.equal(await remoteGit(["tag", "--list", "diverged"]), "diverged");
    plan = await manager.prepare({ operation: "delete", name: "diverged", scope: "both" });
    await manager.execute(plan.id, plan.name);
    assert.equal(await git(repository, ["tag", "--list", "diverged"]), "");
    assert.equal(await remoteGit(["tag", "--list", "diverged"]), "");
    await git(repository, ["tag", "local-delete"]);
    await pushTag(repository, "origin", "local-delete");
    plan = await manager.prepare({ operation: "delete", name: "local-delete", scope: "local" });
    await manager.execute(plan.id, plan.name);
    assert.equal(await remoteGit(["tag", "--list", "local-delete"]), "local-delete");
    assert.equal(manager.snapshot.tags.find(tag => tag.name === "local-delete").status, "remote-only");
});

test("remote deletion lease refuses a concurrently replaced remote tag", async t => {
    const { repository, remoteGit } = await fixture(t);
    await git(repository, ["tag", "guard"]);
    await pushTag(repository, "origin", "guard");
    const expected = await git(repository, ["rev-parse", "guard"]);
    await git(repository, ["commit", "--allow-empty", "-m", "Change remote target"]);
    const replacement = await git(repository, ["rev-parse", "HEAD"]);
    await git(repository, ["push", "--force", "origin", `${replacement}:refs/tags/guard`]);
    await assert.rejects(pushTag(repository, "origin", "guard", expected), { code: "git_failed" });
    assert.equal(await remoteGit(["rev-parse", "guard"]), replacement);
});

test("preferences survive reopen, isolate repositories and reject corruption without overwrite", async t => {
    const { manager, repository, remote, directory } = await fixture(t);
    await git(repository, ["remote", "add", "releases", remote]);
    await manager.selectRemote("releases");
    const reopened = await TagManager.open({ repository }, directory);
    assert.equal(reopened.remote, "releases");
    const file = preferencePath(repository, directory);
    await writeFile(file, '{"format":"unexpected","version":2}');
    await assert.rejects(TagManager.open({ repository }, directory), { code: "storage_corrupt" });
    assert.equal(await readFile(file, "utf8"), '{"format":"unexpected","version":2}');
    assert.notEqual(preferencePath(repository, directory), preferencePath(path.join(repository, "other"), directory));
});

test("invalid names, expired plans, local-only repositories and partial remote failure", async t => {
    const { manager, repository, remote } = await fixture(t);
    for (const name of ["-option", "space tag", "bad..tag", "refs@{x}", "evil\nvalue"]) {
        await assert.rejects(manager.prepare({ operation: "create", name }), { code: "invalid_tag" });
    }
    const plan = await manager.prepare({ operation: "create", name: "expires" });
    manager.pending.expiresAt = 0;
    await assert.rejects(manager.execute(plan.id, plan.name), { code: "plan_expired" });
    await git(repository, ["config", "remote.origin.pushurl", path.join(repository, "missing-remote.git")]);
    await assert.rejects(manager.prepare({ operation: "create", name: "wrong-destination", push: true }), { code: "remote_destination_mismatch" });
    await git(repository, ["config", "--unset", "remote.origin.pushurl"]);
    const partial = await manager.prepare({ operation: "create", name: "partial", push: true });
    await writeFile(path.join(remote, "hooks", "pre-receive"), "#!/bin/sh\necho 'Push rejected by fixture' >&2\nexit 1\n", { mode: 0o755 });
    await assert.rejects(manager.execute(partial.id, partial.name), /Completed changes: local=true, remote=false/);
    assert.equal(await git(repository, ["tag", "--list", "partial"]), "partial");
    await git(repository, ["remote", "remove", "origin"]);
    await rm(preferencePath(repository, manager.directory));
    const local = await TagManager.open({ repository }, manager.directory);
    const localPlan = await local.prepare({ operation: "create", name: "local" });
    await local.execute(localPlan.id, localPlan.name);
    await assert.rejects(local.prepare({ operation: "push", name: "local" }), { code: "remote_required" });
});
