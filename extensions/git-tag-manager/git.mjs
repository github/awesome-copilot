import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { realpath } from "node:fs/promises";
import path from "node:path";
import { TagError } from "./schemas.mjs";

const exec = promisify(execFile);

function redact(text) {
    return text.replace(/(?:https?|ssh):\/\/\S+/g, "[remote]").replace(/[\w.-]+@[\w.-]+:[^\s]+/g, "[remote]");
}

export async function git(repository, args) {
    try {
        const { stdout } = await exec("git", ["--no-pager", ...args], {
            cwd: repository, timeout: 60000, maxBuffer: 16 * 1024 * 1024,
            windowsHide: true, encoding: "utf8",
            env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" },
        });
        return stdout.trimEnd();
    } catch (error) {
        const reason = redact((error.stderr || error.message).trim());
        throw new TagError("git_failed", `Git ${args.includes("push") ? "push" : "operation"} failed: ${reason}`);
    }
}

export async function resolveRepository(input) {
    if (!path.isAbsolute(input)) throw new TagError("invalid_repository", "Provide an absolute repository path.");
    const root = await git(input, ["rev-parse", "--show-toplevel"]);
    return realpath(root);
}

export async function checkTag(repository, name) {
    if (name.startsWith("-") || name.length > 200 || /[\x00-\x20\x7f]/.test(name)) {
        throw new TagError("invalid_tag", "Use a valid Git tag name without whitespace or a leading dash.");
    }
    try {
        await git(repository, ["check-ref-format", `refs/tags/${name}`]);
    } catch (error) {
        throw new TagError("invalid_tag", `Invalid Git tag name: ${name}. ${error.message}`);
    }
}

export async function snapshot(repository, remote) {
    const remotes = (await git(repository, ["remote"])).split("\n").filter(Boolean);
    if (remote && !remotes.includes(remote)) throw new TagError("remote_not_found", `Remote "${remote}" is not configured. Choose a listed remote.`);
    const local = await git(repository, [
        "for-each-ref", "--sort=-creatordate",
        "--format=%(refname:strip=2)%09%(objectname)%09%(*objectname)%09%(objecttype)%09%(creatordate:iso-strict)", "refs/tags/",
    ]);
    const tags = new Map();
    for (const line of local.split("\n").filter(Boolean)) {
        const [name, localOid, peeled, type, date] = line.split("\t");
        tags.set(name, { name, localOid, localCommit: peeled || localOid, type, date, remoteOid: null, remoteCommit: null });
    }
    if (remote) {
        const remoteRefs = await git(repository, ["ls-remote", "--tags", "--", remote]);
        for (const line of remoteRefs.split("\n").filter(Boolean)) {
            const [oid, ref] = line.split("\t");
            if (!ref?.startsWith("refs/tags/")) throw new TagError("invalid_remote_data", "Git returned an invalid remote tag reference.");
            const peeled = ref.endsWith("^{}");
            const name = ref.slice(10).replace(/\^\{\}$/, "");
            const tag = tags.get(name) ?? { name, localOid: null, localCommit: null, type: null, date: null, remoteOid: null, remoteCommit: null };
            if (peeled) tag.remoteCommit = oid;
            else tag.remoteOid = oid;
            tags.set(name, tag);
        }
    }
    return {
        repository, remote, remotes, gatheredAt: new Date().toISOString(),
        tags: [...tags.values()].map(tag => ({
            ...tag, remoteCommit: tag.remoteCommit || tag.remoteOid,
            status: !tag.localOid ? "remote-only" : !tag.remoteOid ? "local-only" : tag.localOid === tag.remoteOid ? "synced" : "diverged",
        })),
    };
}

export async function checkPushDestination(repository, remote) {
    const fetchUrl = await git(repository, ["remote", "get-url", "--", remote]);
    const pushUrls = (await git(repository, ["remote", "get-url", "--push", "--all", "--", remote])).split("\n");
    if (pushUrls.length !== 1 || pushUrls[0] !== fetchUrl) {
        throw new TagError("remote_destination_mismatch", "The remote has a different or multiple push destinations. Use a dedicated remote with matching fetch/push URLs so the preview describes the repository being changed.");
    }
}

export async function pushTag(repository, remote, name, expectedRemoteOid, sourceOid) {
    await checkPushDestination(repository, remote);
    // Disable configured mirror/followTags so an explicit refspec affects exactly one tag.
    const args = ["-c", "push.followTags=false", "-c", `remote.${remote}.mirror=false`, "push", "--porcelain"];
    if (expectedRemoteOid) {
        args.push(`--force-with-lease=refs/tags/${name}:${expectedRemoteOid}`);
        args.push("--", remote, `:refs/tags/${name}`);
    } else {
        args.push("--", remote, `${sourceOid ?? `refs/tags/${name}`}:refs/tags/${name}`);
    }
    return git(repository, args);
}
