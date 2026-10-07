import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { normalizeUrl } from "./review.mjs";

const execFileAsync = promisify(execFile);
const MAX_DIFF_BYTES = 20 * 1024 * 1024;
const MAX_CHANGED_FILES = 3000;

function decodeAccountName(value) {
    return value.replace(/_([0-9a-f]{2})_/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
}

function cleanGhEnvironment() {
    const env = { ...process.env };
    delete env.GH_TOKEN;
    delete env.GITHUB_TOKEN;
    return env;
}

async function ghTokens(hostname) {
    const tokens = [];
    const add = (token) => {
        const value = token?.trim();
        if (value && !tokens.includes(value)) tokens.push(value);
    };

    if (hostname === "github.com") {
        add(process.env.GH_TOKEN);
        add(process.env.GITHUB_TOKEN);
    }
    const prefix = "COPILOT_GH_ACCOUNT_";
    for (const [name, value] of Object.entries(process.env)) {
        if (!name.startsWith(prefix) || !value) continue;
        const account = decodeAccountName(name.slice(prefix.length));
        if (account.toLowerCase().startsWith(`${hostname.toLowerCase()}_`)) add(value);
    }

    let status = "";
    try {
        const result = await execFileAsync("gh", ["auth", "status"], {
            timeout: 8000, env: cleanGhEnvironment(), windowsHide: true,
        });
        status = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    } catch (error) {
        if (error?.code !== "ENOENT") status = `${error?.stdout ?? ""}\n${error?.stderr ?? ""}`;
    }
    const accounts = new Set();
    for (const match of status.matchAll(/Logged in to (\S+) account (\S+)/g)) {
        if (match[1].toLowerCase() === hostname.toLowerCase()) accounts.add(match[2]);
    }
    for (const login of accounts) {
        try {
            const result = await execFileAsync("gh", ["auth", "token", "--hostname", hostname, "--user", login], {
                timeout: 8000, env: cleanGhEnvironment(), windowsHide: true,
            });
            add(result.stdout);
        } catch (error) {
            if (error?.code === "ENOENT") break;
        }
    }
    if (!tokens.length) {
        throw new Error(`No GitHub credentials are available for ${hostname}. Sign in with GitHub CLI or reconnect your GitHub account.`);
    }
    return tokens;
}

function parsePrUrl(input) {
    const canonicalUrl = normalizeUrl(input);
    const parsed = new URL(canonicalUrl);
    const [, owner, repository, , pullNumber] = parsed.pathname.split("/");
    return {
        canonicalUrl,
        hostname: parsed.hostname,
        apiBase: parsed.hostname === "github.com" ? "https://api.github.com" : `${parsed.origin}/api/v3`,
        owner,
        repository,
        pullNumber: Number(pullNumber),
    };
}

async function readBoundedText(response, maxBytes) {
    if (!response.ok) {
        const detail = (await response.text()).slice(0, 1000);
        throw new Error(`GitHub request failed (${response.status})${detail ? `: ${detail}` : "."}`);
    }
    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
        throw new Error(`GitHub diff exceeds the ${Math.floor(maxBytes / 1024 / 1024)} MB local snapshot limit.`);
    }
    if (!response.body) return "";
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) {
            await reader.cancel();
            throw new Error(`GitHub diff exceeds the ${Math.floor(maxBytes / 1024 / 1024)} MB local snapshot limit.`);
        }
        chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return new TextDecoder().decode(bytes);
}

function unquoteGitToken(line, offset) {
    if (line[offset] !== '"') {
        let end = line.indexOf(" ", offset);
        if (end < 0) end = line.length;
        return { value: line.slice(offset, end), next: end };
    }
    const bytes = [];
    let index = offset + 1;
    while (index < line.length && line[index] !== '"') {
        if (line[index] !== "\\") {
            const codePoint = line.codePointAt(index);
            const encoded = new TextEncoder().encode(String.fromCodePoint(codePoint));
            bytes.push(...encoded);
            index += codePoint > 0xffff ? 2 : 1;
            continue;
        }
        index++;
        const octal = /^[0-7]{3}/.exec(line.slice(index));
        if (octal) {
            bytes.push(Number.parseInt(octal[0], 8));
            index += 3;
            continue;
        }
        const escapes = { t: 9, n: 10, r: 13, b: 8, f: 12, v: 11, "\\": 92, '"': 34 };
        if (!(line[index] in escapes)) throw new Error("GitHub returned an invalid quoted diff path.");
        bytes.push(escapes[line[index++]]);
    }
    if (line[index] !== '"') throw new Error("GitHub returned an unterminated diff path.");
    return { value: new TextDecoder().decode(new Uint8Array(bytes)), next: index + 1 };
}

function parseDiffHeader(line) {
    const start = "diff --git ".length;
    const oldToken = unquoteGitToken(line, start);
    const newPath = unquoteGitToken(line, oldToken.next + 1).value;
    const oldPath = oldToken.value;
    return [oldPath.startsWith("a/") ? oldPath.slice(2) : oldPath, newPath.startsWith("b/") ? newPath.slice(2) : newPath];
}

export function mapUnifiedDiff(diff, files) {
    const sections = diff.split(/(?=^diff --git )/m).filter((section) => section.startsWith("diff --git "));
    const byName = new Map();
    for (const file of files) {
        byName.set(file.filename, file);
        if (file.previousFilename) byName.set(file.previousFilename, file);
    }
    const patches = new Map();
    for (const section of sections) {
        const header = section.split("\n", 1)[0];
        const [oldPath, newPath] = parseDiffHeader(header);
        const file = byName.get(newPath) ?? byName.get(oldPath);
        if (!file) throw new Error(`GitHub diff contains an unrecognized file path: ${oldPath}.`);
        if (patches.has(file.filename)) throw new Error(`GitHub diff contains duplicate sections for ${file.filename}.`);
        patches.set(file.filename, section.replace(/\n+$/, ""));
    }
    return patches;
}

async function jsonRequest(fetchImpl, url, token, signal) {
    const response = await fetchImpl(url, {
        headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "github-copilot-pr-review",
        },
        signal,
    });
    if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw Object.assign(new Error(body?.message || `GitHub request failed (${response.status}).`), { status: response.status });
    }
    return response.json();
}

export function createGitHubClient({ fetchImpl = fetch, tokenProvider = ghTokens } = {}) {
    async function withPullRequest(url, signal, operation) {
        const target = parsePrUrl(url);
        const tokens = await tokenProvider(target.hostname);
        let lastError;
        for (const token of tokens) {
            try {
                const endpoint = `${target.apiBase}/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repository)}/pulls/${target.pullNumber}`;
                const pull = await jsonRequest(fetchImpl, endpoint, token, signal);
                return await operation({ target, token, endpoint, pull });
            } catch (error) {
                if (signal?.aborted) throw error;
                lastError = error;
                if (![401, 403, 404].includes(error.status)) throw error;
            }
        }
        throw new Error(`No available GitHub account can read this pull request${lastError ? `: ${lastError.message}` : "."}`);
    }

    async function listFiles(endpoint, token, pull, signal) {
        if (!Number.isInteger(pull.changed_files) || pull.changed_files < 0 || pull.changed_files > MAX_CHANGED_FILES) {
            throw new Error(`Pull request changed-file count is outside the supported range (0-${MAX_CHANGED_FILES}).`);
        }
        const files = [];
        const pages = Math.max(1, Math.ceil(pull.changed_files / 100));
        for (let page = 1; page <= pages; page++) {
            const batch = await jsonRequest(fetchImpl, `${endpoint}/files?per_page=100&page=${page}`, token, signal);
            if (!Array.isArray(batch)) throw new Error("GitHub returned an invalid changed-file page.");
            files.push(...batch);
        }
        if (files.length !== pull.changed_files) {
            throw new Error(`GitHub reported ${pull.changed_files} changed files but returned ${files.length}. Reload the pull request.`);
        }
        const names = new Set();
        for (const file of files) {
            if (!file || typeof file.filename !== "string" || !file.filename || names.has(file.filename)) {
                throw new Error("GitHub returned an invalid or duplicate changed-file record.");
            }
            if (!["added", "removed", "modified", "renamed", "copied", "changed", "unchanged"].includes(file.status) ||
                !Number.isInteger(file.additions) || file.additions < 0 ||
                !Number.isInteger(file.deletions) || file.deletions < 0) {
                throw new Error(`GitHub returned invalid change metadata for ${file.filename}.`);
            }
            names.add(file.filename);
        }
        return files.map((file) => ({
            filename: file.filename,
            ...(file.previous_filename ? { previousFilename: file.previous_filename } : {}),
            status: file.status,
            additions: file.additions,
            deletions: file.deletions,
            patchExpected: typeof file.patch === "string",
            patch: "",
            patchNote: "GitHub did not return a text patch for this file.",
        }));
    }

    async function getFullDiff(endpoint, token, signal) {
        const response = await fetchImpl(endpoint, {
            headers: {
                Accept: "application/vnd.github.diff",
                Authorization: `Bearer ${token}`,
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "github-copilot-pr-review",
            },
            signal,
        });
        return readBoundedText(response, MAX_DIFF_BYTES);
    }

    return {
        async load(input, { signal } = {}) {
            return withPullRequest(input, signal, async ({ target, token, endpoint, pull }) => {
                const files = await listFiles(endpoint, token, pull, signal);
                const diff = await getFullDiff(endpoint, token, signal);
                const patches = mapUnifiedDiff(diff, files);
                const completeFiles = files.map((file) => {
                    const patch = patches.get(file.filename);
                    if (!patch && file.patchExpected) {
                        throw new Error(`The full GitHub diff omitted ${file.filename}, which has a text patch in the file list. Refusing a partial snapshot.`);
                    }
                    const { patchExpected, ...record } = file;
                    if (!patch) return record;
                    const binary = patch.includes("\nBinary files ") || patch.includes("\nGIT binary patch");
                    return {
                        ...record,
                        patch,
                        patchNote: binary ? "GitHub reports a binary-file change; no text patch is available." :
                            "Full diff section loaded directly from GitHub.",
                    };
                });
                return {
                    metadata: {
                        url: target.canonicalUrl,
                        title: pull.title || "Untitled pull request",
                        author: pull.user?.login || "unknown",
                        baseSha: pull.base?.sha,
                        headSha: pull.head?.sha,
                        changedFileCount: pull.changed_files,
                    },
                    files: completeFiles,
                };
            });
        },
        async revision(input, { signal } = {}) {
            return withPullRequest(input, signal, ({ pull }) => ({
                baseSha: pull.base?.sha,
                headSha: pull.head?.sha,
            }));
        },
    };
}
