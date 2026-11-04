import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { isUtf8 } from "node:buffer";
import { lstat, readFile } from "node:fs/promises";
import path from "node:path";

const exec = promisify(execFile);
const BULK_CHANGE = /\b(fix(?:ing)? line endings|line-ending fixes|bulk (?:format\w*|renam\w*|(?:update|updating)\w*)|renam(?:e|ing) files|normaliz\w*|whitespace[- ]only)\b/i;
const FILE_TYPES = { agents: ".agent.md", prompts: ".prompt.md", instructions: ".instructions.md" };

export async function git(root, args, encoding = "utf8") {
    const { stdout } = await exec("git", ["--no-pager", "-c", "core.quotePath=false", ...args], {
        cwd: root, encoding, maxBuffer: 64 * 1024 * 1024, windowsHide: true,
    });
    return stdout;
}

export function body(text, file) {
    if (!file.endsWith(".md")) return text;
    const normalized = text.replace(/\r\n/g, "\n");
    const content = normalized.replace(/^---\n[\s\S]*?\n---(?:\n|$)/, "");
    return content.replace(/\s/g, "");
}

export function parseHistory(text) {
    return text.split("\x1e").slice(1).map((record) => {
        const [sha, date, message, ...fields] = record.split("\0");
        const tokens = fields.map((value) => value.replace(/^\n/, "")).filter(Boolean);
        const changes = [];
        for (let i = 0; i < tokens.length;) {
            const status = tokens[i++];
            const oldPath = tokens[i++];
            const newPath = /^[RC]/.test(status) ? tokens[i++] : oldPath;
            changes.push({ status, oldPath, newPath });
        }
        return { sha, date, message, changes };
    });
}

export async function lastMeaningfulChange(root, file) {
    const history = parseHistory(await git(root, [
        "log", "--follow", "--name-status", "-z", "--format=%x1e%H%x00%aI%x00%s%x00", "--", file,
    ]));
    for (const commit of history) {
        for (const change of commit.changes) {
            if (change.status === "A") return { sha: commit.sha, date: commit.date };
            if (change.status === "R100" || BULK_CHANGE.test(commit.message)) continue;
            if (change.status !== "M" && !/^R\d+$/.test(change.status)) continue;
            const [before, after] = await Promise.all([
                git(root, ["show", `${commit.sha}^:${change.oldPath}`], null),
                git(root, ["show", `${commit.sha}:${change.newPath}`], null),
            ]);
            const binary = !isUtf8(before) || !isUtf8(after) || before.includes(0) || after.includes(0);
            if (binary ? !before.equals(after) : body(before.toString(), change.oldPath) !== body(after.toString(), change.newPath)) {
                return { sha: commit.sha, date: commit.date };
            }
        }
    }
    return null;
}

export function classify(date, now = Date.now()) {
    if (!date) return { age: null, ageBand: "unknown" };
    const age = Math.max(0, Math.floor((now - Date.parse(date)) / 86400000));
    if (!Number.isFinite(age)) throw new Error(`Invalid resource date: ${date}`);
    return { age, ageBand: age > 30 ? "stale" : age >= 14 ? "aging" : "fresh" };
}

export function groupResources(files) {
    const groups = new Map();
    for (const file of files) {
        const [type, name] = file.split("/");
        const folder = type === "hooks" || type === "skills";
        if (!name || (!folder && (!FILE_TYPES[type] || !file.endsWith(FILE_TYPES[type])))) continue;
        if (folder && file.split("/").length < 3) continue;
        const id = folder ? `${type}/${name}` : file;
        if (!groups.has(id)) groups.set(id, { id, type, files: [] });
        groups.get(id).files.push(file);
    }
    return [...groups.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export async function fingerprint(root, files) {
    const hash = createHash("sha256");
    for (const file of [...files].sort()) {
        const absolute = path.join(root, ...file.split("/"));
        if (!(await lstat(absolute)).isFile()) throw new Error(`Not a regular resource file: ${file}`);
        hash.update(file).update("\0").update(await readFile(absolute)).update("\0");
    }
    return hash.digest("hex");
}

export async function scanInventory(root, { now = Date.now(), progress = () => {} } = {}) {
    const shallow = (await git(root, ["rev-parse", "--is-shallow-repository"])).trim() === "true";
    const files = (await git(root, ["ls-files", "-z", "--", "agents", "prompts", "instructions", "hooks", "skills"]))
        .split("\0").filter(Boolean);
    const groups = groupResources(files);
    const results = new Array(groups.length);
    let next = 0;
    let completed = 0;
    let failed = false;
    const workers = Array.from({ length: Math.min(4, groups.length) }, async () => {
        try {
            while (!failed && next < groups.length) {
                const index = next++;
                const resource = groups[index];
                let latest = null;
                for (const file of resource.files) {
                    const change = await lastMeaningfulChange(root, file);
                    if (change && (!latest || Date.parse(change.date) > Date.parse(latest.date))) latest = change;
                }
                results[index] = {
                    ...resource, fingerprint: await fingerprint(root, resource.files),
                    lastChange: latest, ...classify(latest?.date, now),
                };
                progress({ completed: ++completed, total: groups.length });
            }
        } catch (error) {
            failed = true;
            throw error;
        }
    });
    const errors = (await Promise.allSettled(workers)).filter((result) => result.status === "rejected").map((result) => result.reason);
    if (errors.length === 1) throw errors[0];
    if (errors.length) throw new AggregateError(errors, errors.map((error) => error.message).join("\n"));
    return {
        items: results.sort((a, b) => (b.age ?? -1) - (a.age ?? -1) || a.id.localeCompare(b.id)),
        warning: shallow ? "Shallow Git history: ages may be incomplete. No history was fetched automatically." : null,
    };
}
