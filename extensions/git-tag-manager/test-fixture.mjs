import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { git } from "./git.mjs";
import { TagManager } from "./manager.mjs";

export async function fixture(t) {
    const root = await mkdtemp(path.join(os.tmpdir(), "git-tag-manager-test-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    const repository = path.join(root, "work");
    const remote = path.join(root, "remote.git");
    const directory = path.join(root, "preferences");
    await mkdir(repository);
    await git(root, ["init", "--bare", remote]);
    await git(repository, ["init"]);
    await git(repository, ["config", "user.name", "Tag Manager Test"]);
    await git(repository, ["config", "user.email", "tag-manager@example.invalid"]);
    await git(repository, ["config", "tag.gpgSign", "false"]);
    await git(repository, ["config", "commit.gpgSign", "false"]);
    await writeFile(path.join(repository, "file.txt"), "first\n");
    await git(repository, ["add", "file.txt"]);
    await git(repository, ["commit", "-m", "Initial fixture"]);
    await git(repository, ["remote", "add", "origin", remote]);
    const manager = await TagManager.open({ repository }, directory);
    const remoteGit = args => git(root, ["--git-dir", remote, ...args]);
    return { root, repository: manager.repository, remote, remoteGit, directory, manager };
}
