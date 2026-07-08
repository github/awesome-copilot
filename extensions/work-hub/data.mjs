import { execFile } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const MOODS = ["focused", "low-energy", "maintenance", "creative", "urgent"];
export const BUSYNESS = ["busy", "normal", "open"];
export const MINUTE_OPTIONS = [15, 30, 60, 120];
export const FOCUS_INTENTS = ["balanced", "prs", "new-code", "issue-triage", "maintenance"];

const DEFAULT_PREFERENCES = { mood: "focused", minutes: 30, busyness: "normal", focusIntent: "balanced" };
const DEFAULT_CONFIG = { repos: [], onboarded: false };

const CACHE_TTL_MS = 2 * 60 * 1000;
const COMMAND_TIMEOUT_MS = 18 * 1000;
const PROJECTS_DIR = path.join(os.homedir(), "Projects");
const LOCAL_PROJECT_DIRS = [
    PROJECTS_DIR,
    path.join(os.homedir(), "src"),
    path.join(os.homedir(), "source"),
    path.join(os.homedir(), "code"),
    path.join(os.homedir(), "GitHub"),
];
const WORKTREES_DIR = path.join(PROJECTS_DIR, "copilot-worktrees");
const SESSION_STORE_PATH = path.join(os.homedir(), ".copilot", "session-store.db");
const ARTIFACT_DIR = path.join(os.homedir(), ".copilot", "extensions", "work-hub", "artifacts");
const PREFERENCES_PATH = path.join(ARTIFACT_DIR, "preferences.json");
const CONFIG_PATH = path.join(ARTIFACT_DIR, "config.json");

let cachedModel = null;
let cachedAt = 0;
let refreshPromise = null;
let discoveryCache = { at: 0, value: null };

function nowMs() {
    return Date.now();
}

export function daysSince(dateLike) {
    if (!dateLike) return null;
    const time = new Date(dateLike).getTime();
    if (!Number.isFinite(time)) return null;
    return Math.max(0, Math.floor((nowMs() - time) / 86400000));
}

export function ageLabel(days) {
    if (days === null || days === undefined) return "unknown";
    if (days === 0) return "today";
    if (days === 1) return "1 day";
    if (days < 30) return `${days} days`;
    const months = Math.floor(days / 30);
    if (months < 18) return `${months} mo`;
    return `${Math.floor(days / 365)} yr`;
}

function isHumanLogin(login) {
    if (!login) return false;
    return !/\[bot\]$/i.test(login) && !/-bot$/i.test(login) && login.toLowerCase() !== "github-actions";
}

function normalizeLogin(entity) {
    if (!entity) return "";
    if (typeof entity === "string") return entity;
    return entity.login || entity.name || entity.slug || "";
}

function knownUserLogins(extraLogin) {
    return new Set([extraLogin].filter(Boolean).map((value) => value.toLowerCase()));
}

function ownerOf(slug) {
    return String(slug || "").split("/")[0] || "";
}

function nameOf(slug) {
    return String(slug || "").split("/")[1] || "";
}

function ownerEnv(owner) {
    const token = process.env[`COPILOT_GH_ACCOUNT_github_2E_com_${owner}`];
    if (owner && token) {
        return { GH_HOST: "github.com", GH_TOKEN: token };
    }
    return {};
}

function parseRepoSlugFromRemote(remote) {
    const value = String(remote || "").trim();
    if (!value) return null;
    const ssh = /^git@[^:]+:([^/\s]+)\/([^/\s]+?)(?:\.git)?$/i.exec(value);
    if (ssh) return `${ssh[1]}/${ssh[2]}`;
    try {
        const url = new URL(value);
        const parts = url.pathname.replace(/^\/+/, "").replace(/\.git$/i, "").split("/");
        if (parts.length >= 2 && parts[0] && parts[1]) return `${parts[0]}/${parts[1]}`;
    } catch {
        // Not a URL; fall through to owner/repo parsing.
    }
    const slug = value.replace(/\.git$/i, "");
    return /^[^/\s]+\/[^/\s]+$/.test(slug) ? slug : null;
}

function guessLocalPath(slug) {
    const owner = ownerOf(slug);
    const name = nameOf(slug);
    const candidates = [
        path.join(PROJECTS_DIR, name),
        path.join(PROJECTS_DIR, `${owner}_${name}`),
    ];
    for (const candidate of candidates) {
        if (existsSync(candidate)) return candidate;
    }
    return null;
}

function run(command, args, options = {}) {
    return new Promise((resolve) => {
        execFile(
            command,
            args,
            {
                cwd: options.cwd,
                env: { ...process.env, ...(options.env || {}) },
                timeout: options.timeoutMs || COMMAND_TIMEOUT_MS,
                maxBuffer: 1024 * 1024 * 8,
            },
            (error, stdout, stderr) => {
                if (error) {
                    resolve({ ok: false, stdout: stdout || "", stderr: stderr || "", message: (stderr || error.message || "Command failed").trim(), code: error.code });
                    return;
                }
                resolve({ ok: true, stdout: stdout || "", stderr: stderr || "" });
            },
        );
    });
}

async function ghJson(args, owner, label, options = {}) {
    const result = await run("gh", args, { env: ownerEnv(owner), timeoutMs: options.timeoutMs });
    if (!result.ok) {
        return { ok: false, value: null, error: { source: label, message: result.message } };
    }
    try {
        return { ok: true, value: result.stdout.trim() ? JSON.parse(result.stdout) : null, error: null };
    } catch (error) {
        return { ok: false, value: null, error: { source: label, message: `Invalid JSON from gh: ${error.message}` } };
    }
}

/* ---------------- preferences ---------------- */

export function normalizePreferences(input) {
    const source = input && typeof input === "object" ? input : {};
    const mood = MOODS.includes(source.mood) ? source.mood : DEFAULT_PREFERENCES.mood;
    const busyness = BUSYNESS.includes(source.busyness) ? source.busyness : DEFAULT_PREFERENCES.busyness;
    const focusIntent = FOCUS_INTENTS.includes(source.focusIntent) ? source.focusIntent : DEFAULT_PREFERENCES.focusIntent;
    const minutesNumber = Number(source.minutes);
    const minutes = MINUTE_OPTIONS.includes(minutesNumber) ? minutesNumber : DEFAULT_PREFERENCES.minutes;
    return { mood, busyness, minutes, focusIntent };
}

export async function readPreferences() {
    try {
        const raw = await readFile(PREFERENCES_PATH, "utf8");
        return normalizePreferences(JSON.parse(raw));
    } catch (error) {
        if (error && error.code === "ENOENT") return { ...DEFAULT_PREFERENCES };
        return { ...DEFAULT_PREFERENCES };
    }
}

export async function writePreferences(input) {
    const preferences = normalizePreferences(input);
    await mkdir(ARTIFACT_DIR, { recursive: true });
    await writeFile(PREFERENCES_PATH, `${JSON.stringify(preferences, null, 2)}\n`, "utf8");
    return preferences;
}

export async function setFocusContext(input) {
    const normalized = await writePreferences(input);
    invalidateCache();
    return normalized;
}

/* ---------------- repo config ---------------- */

function normalizeRepoEntry(entry) {
    if (!entry) return null;
    const slug = typeof entry === "string" ? entry.trim() : String(entry.slug || "").trim();
    if (!/^[^/\s]+\/[^/\s]+$/.test(slug)) return null;
    const weightNumber = Number(entry && entry.weight);
    const weight = Number.isFinite(weightNumber) && weightNumber > 0 ? Math.min(3, weightNumber) : 1;
    const resolvedPath = entry && typeof entry.path === "string" && entry.path ? entry.path : guessLocalPath(slug);
    return { slug, name: nameOf(slug), owner: ownerOf(slug), weight, path: resolvedPath || null };
}

function normalizeRepoList(list) {
    const seen = new Set();
    const repos = [];
    for (const entry of Array.isArray(list) ? list : []) {
        const normalized = normalizeRepoEntry(entry);
        if (!normalized || seen.has(normalized.slug.toLowerCase())) continue;
        seen.add(normalized.slug.toLowerCase());
        repos.push(normalized);
    }
    return repos;
}

export async function readConfig() {
    try {
        const raw = await readFile(CONFIG_PATH, "utf8");
        const parsed = JSON.parse(raw);
        const repos = normalizeRepoList(parsed.repos);
        return { repos, onboarded: Boolean(parsed.onboarded) || repos.length > 0 };
    } catch (error) {
        if (!(error && error.code === "ENOENT")) {
            // fall through to seed
        }
    }
    await writeConfig(DEFAULT_CONFIG);
    return { ...DEFAULT_CONFIG };
}

export async function writeConfig(config) {
    const repos = normalizeRepoList(config && config.repos);
    const onboarded = Boolean(config && config.onboarded);
    await mkdir(ARTIFACT_DIR, { recursive: true });
    await writeFile(CONFIG_PATH, `${JSON.stringify({ repos, onboarded }, null, 2)}\n`, "utf8");
    return { repos, onboarded };
}

export async function setTrackedRepos(slugs, onboarded = true) {
    const config = await writeConfig({ repos: Array.isArray(slugs) ? slugs : [], onboarded });
    invalidateCache();
    return config;
}

export async function addRepos(slugs) {
    const config = await readConfig();
    const existing = new Set(config.repos.map((repo) => repo.slug.toLowerCase()));
    const merged = [...config.repos];
    for (const slug of Array.isArray(slugs) ? slugs : [slugs]) {
        const normalized = normalizeRepoEntry(slug);
        if (normalized && !existing.has(normalized.slug.toLowerCase())) {
            existing.add(normalized.slug.toLowerCase());
            merged.push(normalized);
        }
    }
    const written = await writeConfig({ repos: merged, onboarded: merged.length > 0 || config.onboarded });
    invalidateCache();
    return written;
}

export async function removeRepos(slugs) {
    const config = await readConfig();
    const drop = new Set((Array.isArray(slugs) ? slugs : [slugs]).map((slug) => String(slug).toLowerCase()));
    const repos = config.repos.filter((repo) => !drop.has(repo.slug.toLowerCase()));
    const written = await writeConfig({ repos, onboarded: config.onboarded && repos.length > 0 });
    invalidateCache();
    return written;
}

async function listLocalProjects(tracked) {
    const seenPaths = new Set();
    const projects = [];
    for (const root of LOCAL_PROJECT_DIRS) {
        if (!existsSync(root)) continue;
        let entries = [];
        try {
            entries = await readdir(root, { withFileTypes: true });
        } catch {
            continue;
        }
        for (const entry of entries.filter((item) => item.isDirectory()).slice(0, 200)) {
            const projectPath = path.join(root, entry.name);
            if (seenPaths.has(projectPath) || !existsSync(path.join(projectPath, ".git"))) continue;
            seenPaths.add(projectPath);
            const remote = await run("git", ["-C", projectPath, "remote", "get-url", "origin"], { timeoutMs: 4000 });
            const slug = remote.ok ? parseRepoSlugFromRemote(remote.stdout) : null;
            if (!slug) continue;
            projects.push({
                slug,
                name: entry.name,
                path: projectPath,
                source: "local",
                description: projectPath,
                tracked: tracked.has(slug.toLowerCase()),
            });
        }
    }
    projects.sort((a, b) => a.slug.localeCompare(b.slug));
    return projects;
}

export async function listAvailableRepos(force = false) {
    if (!force && discoveryCache.value && nowMs() - discoveryCache.at < 5 * 60 * 1000) {
        return discoveryCache.value;
    }
    const config = await readConfig();
    const currentLogin = await getCurrentLogin();
    const owners = new Set([currentLogin, ...config.repos.map((repo) => repo.owner)].filter(Boolean));
    const tracked = new Set(config.repos.map((repo) => repo.slug.toLowerCase()));
    const errors = [];
    const repos = [];
    await Promise.all(
        [...owners].map(async (owner) => {
            const result = await ghJson(
                ["repo", "list", owner, "--limit", "100", "--json", "nameWithOwner,description,pushedAt,isArchived,isPrivate,isFork,stargazerCount"],
                owner,
                `discover:${owner}`,
                { timeoutMs: 12000 },
            );
            if (!result.ok) {
                if (result.error) errors.push(result.error);
                return;
            }
            for (const item of Array.isArray(result.value) ? result.value : []) {
                repos.push({
                    slug: item.nameWithOwner,
                    owner,
                    description: item.description || "",
                    pushedAt: item.pushedAt || null,
                    pushedAgeDays: daysSince(item.pushedAt),
                    isArchived: Boolean(item.isArchived),
                    isPrivate: Boolean(item.isPrivate),
                    isFork: Boolean(item.isFork),
                    stars: Number(item.stargazerCount || 0),
                    tracked: tracked.has(String(item.nameWithOwner).toLowerCase()),
                });
            }
        }),
    );
    repos.sort((a, b) => (b.pushedAt || "").localeCompare(a.pushedAt || ""));
    const projects = await listLocalProjects(tracked);
    const value = { owners: [...owners], repos, projects, errors };
    discoveryCache = { at: nowMs(), value };
    return value;
}

/* ---------------- sessions ---------------- */

async function getCopilotSessions(repos) {
    if (!existsSync(SESSION_STORE_PATH)) {
        return { sessions: [], errors: [{ source: "copilot-sessions", message: "Session store was not found." }] };
    }
    const repoList = repos.map((repo) => `'${repo.slug.replaceAll("'", "''")}'`).join(",") || "''";
    const query = [
        "SELECT id,cwd,repository,branch,summary,created_at,updated_at",
        "FROM sessions",
        `WHERE repository IN (${repoList})`,
        `OR cwd LIKE '${WORKTREES_DIR.replaceAll("'", "''")}/%'`,
        "ORDER BY updated_at DESC",
        "LIMIT 120",
    ].join(" ");
    const result = await run("sqlite3", ["-json", SESSION_STORE_PATH, query], { timeoutMs: 8000 });
    if (!result.ok) {
        if (/spawn sqlite3 ENOENT/i.test(result.message)) return { sessions: [], errors: [] };
        return { sessions: [], errors: [{ source: "copilot-sessions", message: result.message }] };
    }
    try {
        const rows = result.stdout.trim() ? JSON.parse(result.stdout) : [];
        const normalized = rows.map((row) => ({
            id: row.id,
            cwd: row.cwd,
            repository: normalizeSessionRepo(row.repository, row.cwd, repos),
            branch: row.branch,
            summary: row.summary || row.branch || "Open session",
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            ageDays: daysSince(row.updated_at),
        }));
        const seen = new Set();
        const perRepoCounts = new Map();
        const sessions = [];
        for (const item of normalized) {
            if (!item.repository) continue;
            if (item.ageDays !== null && item.ageDays > 14) continue;
            const key = `${item.repository}|${item.branch || ""}|${item.summary || ""}`;
            const count = perRepoCounts.get(item.repository) || 0;
            if (seen.has(key) || count >= 3) continue;
            seen.add(key);
            perRepoCounts.set(item.repository, count + 1);
            sessions.push(item);
        }
        return { sessions, errors: [] };
    } catch (error) {
        return { sessions: [], errors: [{ source: "copilot-sessions", message: `Invalid session store JSON: ${error.message}` }] };
    }
}

function normalizeSessionRepo(repository, cwd, repos) {
    if (repository) return repository;
    if (!cwd) return null;
    const match = repos.find((repo) => repo.path && (cwd === repo.path || cwd.startsWith(`${repo.path}/`)));
    return match ? match.slug : null;
}

function stalenessBucket(ageDays) {
    if (ageDays === null) return "unknown";
    if (ageDays < 2) return "fresh";
    if (ageDays < 7) return "aging";
    if (ageDays < 30) return "stale";
    return "ancient";
}

// Full session inventory for the cleanup tab: no age filter, no per-repo cap.
async function getSessionInventory(repos) {
    if (!existsSync(SESSION_STORE_PATH)) {
        return { inventory: [], errors: [{ source: "copilot-sessions", message: "Session store was not found." }] };
    }
    const repoList = repos.map((repo) => `'${repo.slug.replaceAll("'", "''")}'`).join(",") || "''";
    const query = [
        "SELECT id,cwd,repository,branch,summary,created_at,updated_at",
        "FROM sessions",
        `WHERE repository IN (${repoList})`,
        `OR cwd LIKE '${WORKTREES_DIR.replaceAll("'", "''")}/%'`,
        "ORDER BY updated_at DESC",
        "LIMIT 400",
    ].join(" ");
    const result = await run("sqlite3", ["-json", SESSION_STORE_PATH, query], { timeoutMs: 8000 });
    if (!result.ok) {
        if (/spawn sqlite3 ENOENT/i.test(result.message)) return { inventory: [], errors: [] };
        return { inventory: [], errors: [{ source: "copilot-sessions", message: result.message }] };
    }
    try {
        const rows = result.stdout.trim() ? JSON.parse(result.stdout) : [];
        const seen = new Set();
        const inventory = [];
        for (const row of rows) {
            const repository = normalizeSessionRepo(row.repository, row.cwd, repos);
            const ageDays = daysSince(row.updated_at);
            const isWorktree = Boolean(row.cwd && row.cwd.startsWith(`${WORKTREES_DIR}/`));
            const exists = Boolean(row.cwd && existsSync(row.cwd));
            const key = `${repository || row.cwd || ""}|${row.branch || ""}|${row.summary || ""}`;
            if (seen.has(key)) continue;
            seen.add(key);
            inventory.push({
                id: row.id,
                cwd: row.cwd || "",
                repository: repository || "(unmapped)",
                branch: row.branch || "",
                summary: (row.summary || row.branch || "Open session").split("\n")[0].slice(0, 100),
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                ageDays,
                ageLabel: ageDays === null ? "unknown" : ageLabel(ageDays),
                bucket: stalenessBucket(ageDays),
                isWorktree,
                orphaned: isWorktree && !exists,
            });
        }
        return { inventory, errors: [] };
    } catch (error) {
        return { inventory: [], errors: [{ source: "copilot-sessions", message: `Invalid session store JSON: ${error.message}` }] };
    }
}

/* ---------------- local git ---------------- */

async function getLocalGitState(repo) {
    if (!repo.path || !existsSync(repo.path)) {
        return { available: false };
    }
    const [statusResult, commitResult] = await Promise.all([
        run("git", ["-C", repo.path, "status", "--short", "--branch", "--untracked-files=no"], { timeoutMs: 8000 }),
        run("git", ["-C", repo.path, "log", "-1", "--format=%cI"], { timeoutMs: 8000 }),
    ]);
    const state = { available: true, path: repo.path };
    if (statusResult.ok) {
        const lines = statusResult.stdout.trim().split("\n").filter(Boolean);
        state.branchLine = lines[0] || "";
        state.dirtyCount = lines.slice(1).length;
        state.ahead = /ahead (\d+)/.exec(state.branchLine)?.[1] ? Number(/ahead (\d+)/.exec(state.branchLine)[1]) : 0;
        state.behind = /behind (\d+)/.exec(state.branchLine)?.[1] ? Number(/behind (\d+)/.exec(state.branchLine)[1]) : 0;
    } else {
        state.error = statusResult.message;
    }
    if (commitResult.ok) {
        state.lastCommitAt = commitResult.stdout.trim() || null;
        state.lastCommitAgeDays = daysSince(state.lastCommitAt);
    }
    return state;
}

/* ---------------- repo collection ---------------- */

async function collectRepo(repo, userLogins, sessionsByRepo) {
    const errors = [];
    const [metadataResult, releaseResult, tagsResult, prsResult, issuesResult, localGit, deployments] = await Promise.all([
        ghJson(["api", `repos/${repo.slug}`], repo.owner, `${repo.slug}:metadata`),
        ghJson(["api", `repos/${repo.slug}/releases/latest`], repo.owner, `${repo.slug}:latest-release`),
        ghJson(["api", `repos/${repo.slug}/tags?per_page=1`], repo.owner, `${repo.slug}:latest-tag`),
        ghJson(
            ["pr", "list", "--repo", repo.slug, "--state", "open", "--limit", "50", "--json", "number,title,author,updatedAt,createdAt,isDraft,reviewDecision,url,headRefName,baseRefName,statusCheckRollup,labels,assignees"],
            repo.owner,
            `${repo.slug}:prs`,
        ),
        ghJson(
            ["issue", "list", "--repo", repo.slug, "--state", "open", "--limit", "50", "--json", "number,title,author,updatedAt,createdAt,url,labels,assignees,comments"],
            repo.owner,
            `${repo.slug}:issues`,
        ),
        getLocalGitState(repo),
        getDeployments(repo),
    ]);

    for (const result of [metadataResult, prsResult, issuesResult]) {
        if (!result.ok && result.error) errors.push(result.error);
    }
    if (!releaseResult.ok && releaseResult.error && !/Not Found/i.test(releaseResult.error.message)) errors.push(releaseResult.error);
    if (!tagsResult.ok && tagsResult.error) errors.push(tagsResult.error);
    if (localGit.error) errors.push({ source: `${repo.slug}:local-git`, message: localGit.error });
    if (deployments.error) errors.push(deployments.error);

    const metadata = metadataResult.value || {};
    const prs = Array.isArray(prsResult.value) ? prsResult.value.map((pr) => normalizePr(repo, pr, userLogins)) : [];
    const issues = Array.isArray(issuesResult.value) ? issuesResult.value.map((issue) => normalizeIssue(repo, issue, userLogins)) : [];
    const latestRelease = releaseResult.ok && releaseResult.value ? normalizeRelease(releaseResult.value, "release") : null;
    const latestTag = tagsResult.ok && Array.isArray(tagsResult.value) && tagsResult.value[0] ? normalizeRelease(tagsResult.value[0], "tag") : null;
    const release = latestRelease || latestTag;
    const releaseAgeDays = release ? daysSince(release.publishedAt) : null;
    const pushedAgeDays = daysSince(metadata.pushed_at);
    const activeSessions = sessionsByRepo.get(repo.slug) || [];
    const needsHumanPrs = prs.filter((pr) => pr.needsHumanReview || pr.requestedFromJames || pr.failingChecks);
    const humanIssues = issues.filter((issue) => issue.assignedToJames || issue.isHumanAuthored);
    const latestDeploy = deployments.latest || null;
    const failedDeploy = deployments.environments.some((env) => ["failure", "error"].includes(env.state));

    const status = summarizeRepoStatus({ errors, prs, releaseAgeDays, pushedAgeDays, activeSessions, metadata, needsHumanPrs, latestDeploy, failedDeploy });

    return {
        ...repo,
        url: metadata.html_url || `https://github.com/${repo.slug}`,
        description: metadata.description || repo.description || "",
        defaultBranch: metadata.default_branch || "main",
        isArchived: Boolean(metadata.archived),
        isPrivate: Boolean(metadata.private),
        language: metadata.language || "",
        stars: Number(metadata.stargazers_count || 0),
        pushedAt: metadata.pushed_at || null,
        pushedAgeDays,
        latestRelease: release,
        releaseAgeDays,
        releaseAgeLabel: ageLabel(releaseAgeDays),
        deployments: deployments.environments,
        latestDeploy,
        deployAgeDays: latestDeploy ? latestDeploy.ageDays : null,
        deployAgeLabel: ageLabel(latestDeploy ? latestDeploy.ageDays : null),
        failedDeploy,
        openPrCount: prs.length,
        openIssueCount: issues.length,
        needsHumanPrCount: needsHumanPrs.length,
        humanIssueCount: humanIssues.length,
        prs,
        issues,
        localGit,
        activeSessions,
        status,
        errors,
    };
}

async function getDeployments(repo) {
    const list = await ghJson(["api", `repos/${repo.slug}/deployments?per_page=30`], repo.owner, `${repo.slug}:deployments`);
    if (!list.ok) {
        const error = list.error && /Not Found/i.test(list.error.message) ? null : list.error;
        return { environments: [], latest: null, error };
    }
    const rows = Array.isArray(list.value) ? list.value : [];
    const byEnv = new Map();
    for (const deploy of rows) {
        const env = deploy.environment || "unknown";
        const current = byEnv.get(env);
        if (!current || new Date(deploy.created_at) > new Date(current.created_at)) byEnv.set(env, deploy);
    }
    const latestPerEnv = [...byEnv.values()].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4);
    const environments = await Promise.all(
        latestPerEnv.map(async (deploy) => {
            const statusResult = await ghJson(["api", `repos/${repo.slug}/deployments/${deploy.id}/statuses?per_page=1`], repo.owner, `${repo.slug}:deploy-status`);
            const statusRow = statusResult.ok && Array.isArray(statusResult.value) && statusResult.value[0] ? statusResult.value[0] : null;
            return {
                environment: deploy.environment || "unknown",
                ref: deploy.ref || "",
                createdAt: deploy.created_at,
                ageDays: daysSince(deploy.created_at),
                state: statusRow ? String(statusRow.state || "unknown") : "unknown",
                url: statusRow ? statusRow.environment_url || "" : "",
                isProduction: Boolean(deploy.production_environment) || /prod|pages|release/i.test(deploy.environment || ""),
            };
        }),
    );
    return { environments, latest: environments[0] || null, error: null };
}

function normalizeRelease(value, kind) {
    return {
        kind,
        name: value.name || value.tag_name || "Latest tag",
        tagName: value.tag_name || value.name || "",
        publishedAt: value.published_at || value.created_at || value.commit?.committer?.date || null,
        url: value.html_url || "",
    };
}

function normalizePr(repo, pr, userLogins) {
    const authorLogin = normalizeLogin(pr.author);
    const assignees = Array.isArray(pr.assignees) ? pr.assignees.map(normalizeLogin).filter(Boolean) : [];
    const labels = Array.isArray(pr.labels) ? pr.labels.map((label) => label.name || label).filter(Boolean) : [];
    const failingChecks = Array.isArray(pr.statusCheckRollup)
        ? pr.statusCheckRollup.some((check) => ["FAILURE", "ERROR", "TIMED_OUT", "CANCELLED"].includes(String(check.conclusion || check.status || "").toUpperCase()))
        : false;
    const assignedToJames = assignees.some((login) => userLogins.has(login.toLowerCase()));
    const reviewRequired = pr.reviewDecision === "REVIEW_REQUIRED" || pr.reviewDecision === "CHANGES_REQUESTED";
    const isHumanAuthored = isHumanLogin(authorLogin);
    return {
        repo: repo.slug,
        type: "pr",
        number: pr.number,
        title: pr.title || `PR #${pr.number}`,
        url: pr.url || `https://github.com/${repo.slug}/pull/${pr.number}`,
        author: authorLogin,
        isHumanAuthored,
        createdAt: pr.createdAt,
        updatedAt: pr.updatedAt,
        updatedAgeDays: daysSince(pr.updatedAt),
        isDraft: Boolean(pr.isDraft),
        reviewDecision: pr.reviewDecision || "UNKNOWN",
        assignedToJames,
        requestedFromJames: assignedToJames && reviewRequired,
        needsHumanReview: isHumanAuthored && reviewRequired,
        failingChecks,
        labels,
        headRefName: pr.headRefName || "",
        baseRefName: pr.baseRefName || "",
    };
}

function normalizeIssue(repo, issue, userLogins) {
    const authorLogin = normalizeLogin(issue.author);
    const assignees = Array.isArray(issue.assignees) ? issue.assignees.map(normalizeLogin).filter(Boolean) : [];
    const labels = Array.isArray(issue.labels) ? issue.labels.map((label) => label.name || label).filter(Boolean) : [];
    const assignedToJames = assignees.some((login) => userLogins.has(login.toLowerCase()));
    const isHumanAuthored = isHumanLogin(authorLogin);
    return {
        repo: repo.slug,
        type: "issue",
        number: issue.number,
        title: issue.title || `Issue #${issue.number}`,
        url: issue.url || `https://github.com/${repo.slug}/issues/${issue.number}`,
        author: authorLogin,
        isHumanAuthored,
        assignedToJames,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        updatedAgeDays: daysSince(issue.updatedAt),
        labels,
        comments: Number(issue.comments || 0),
    };
}

function summarizeRepoStatus(input) {
    if (input.metadata.archived) return { tone: "muted", label: "Archived", detail: "Repository is archived." };
    if (input.errors.length >= 3) return { tone: "danger", label: "Needs setup", detail: "Several data sources failed." };
    if (input.failedDeploy) return { tone: "danger", label: "Deploy failed", detail: `Latest ${input.latestDeploy ? input.latestDeploy.environment : "deployment"} did not succeed.` };
    if (input.needsHumanPrs.length > 0) return { tone: "attention", label: "Review needed", detail: `${input.needsHumanPrs.length} PRs need human attention.` };
    if (input.prs.some((pr) => pr.failingChecks)) return { tone: "danger", label: "Checks failing", detail: "Open PR checks need attention." };
    const recentGoodDeploy = input.latestDeploy && input.latestDeploy.state === "success" && input.latestDeploy.ageDays !== null && input.latestDeploy.ageDays <= 30;
    if ((input.releaseAgeDays === null || input.releaseAgeDays > 120) && recentGoodDeploy) {
        return { tone: "active", label: "Deploying", detail: `Deployed to ${input.latestDeploy.environment} ${ageLabel(input.latestDeploy.ageDays)} ago.` };
    }
    if (input.releaseAgeDays === null) return { tone: "neutral", label: "No release", detail: "No release or tag was found." };
    if (input.releaseAgeDays > 120) return { tone: "attention", label: "Release stale", detail: `Last release/tag was ${ageLabel(input.releaseAgeDays)} ago.` };
    if (input.pushedAgeDays !== null && input.pushedAgeDays > 90) return { tone: "neutral", label: "Quiet", detail: `Default branch activity is ${ageLabel(input.pushedAgeDays)} old.` };
    if (input.activeSessions.length > 0) return { tone: "active", label: "Recent work", detail: `${input.activeSessions.length} recent session signals.` };
    return { tone: "good", label: "Healthy", detail: "No urgent signal detected." };
}

/* ---------------- focus + recommendations ---------------- */

function buildFocusItems(repos, sessions) {
    const items = [];
    for (const repo of repos) {
        for (const pr of repo.prs) {
            let score = 20 * repo.weight;
            const reasons = [];
            const tags = [];
            if (pr.requestedFromJames) { score += 70; reasons.push("assigned review"); tags.push("needs-review"); }
            else if (pr.needsHumanReview) { score += 45; reasons.push("human review needed"); tags.push("needs-review"); }
            if (pr.failingChecks) { score += 30; reasons.push("checks failing"); tags.push("failing-checks"); }
            if (pr.isHumanAuthored) tags.push("human");
            if (!pr.isDraft) score += 10; else tags.push("draft");
            if (pr.updatedAgeDays !== null && pr.updatedAgeDays <= 2) { score += 12; reasons.push("recently active"); tags.push("recent"); }
            items.push({
                id: `${repo.slug}#pr-${pr.number}`,
                kind: "pr",
                repo: repo.slug,
                number: pr.number,
                title: pr.title,
                url: pr.url,
                score: Math.round(score),
                minutes: pr.failingChecks ? 60 : 30,
                energy: pr.failingChecks ? "focused" : "medium",
                reasons,
                what: `Review PR #${pr.number} and decide whether it needs feedback, fixes, or merge attention.`,
                how: pr.failingChecks ? "Open the PR detail, inspect failing checks first, then request a Copilot review or jump into an implementation session if the failure needs code." : "Open the PR detail, scan the summary and comments, then approve/request changes or ask Copilot for a review.",
                tags,
                updatedAgeDays: pr.updatedAgeDays,
                detail: `PR #${pr.number} by ${pr.author || "unknown"} · ${pr.reviewDecision}`,
            });
        }
        for (const issue of repo.issues) {
            let score = 12 * repo.weight;
            const reasons = [];
            const tags = [];
            if (issue.assignedToJames) { score += 55; reasons.push("assigned to you"); tags.push("assigned"); }
            if (issue.isHumanAuthored) { score += 18; reasons.push("human issue"); tags.push("human"); }
            if (issue.comments > 0) score += Math.min(14, issue.comments * 2);
            if (issue.updatedAgeDays !== null && issue.updatedAgeDays <= 3) { score += 10; tags.push("recent"); }
            items.push({
                id: `${repo.slug}#issue-${issue.number}`,
                kind: "issue",
                repo: repo.slug,
                number: issue.number,
                title: issue.title,
                url: issue.url,
                score: Math.round(score),
                minutes: 30,
                energy: "medium",
                reasons,
                what: `Triage issue #${issue.number} and choose whether it is ready for implementation, needs clarification, or should become a cloud session.`,
                how: issue.assignedToJames ? "Because it is assigned to you, start by reading the latest comments, then assign it to a cloud session or open a local implementation plan." : "Read the description and recent comments, refine the spec if it is fuzzy, or assign it when it is actionable.",
                tags,
                updatedAgeDays: issue.updatedAgeDays,
                detail: `Issue #${issue.number} by ${issue.author || "unknown"} · ${issue.comments} comments`,
            });
        }
        if (repo.releaseAgeDays === null || repo.releaseAgeDays > 120) {
            const staleScore = repo.releaseAgeDays === null ? 24 : Math.min(65, 20 + Math.floor(repo.releaseAgeDays / 12));
            items.push({
                id: `${repo.slug}#release`,
                kind: "release",
                repo: repo.slug,
                title: repo.releaseAgeDays === null ? "Establish release baseline" : `Review stale release cadence (${ageLabel(repo.releaseAgeDays)})`,
                url: repo.url,
                score: Math.round(staleScore * repo.weight),
                minutes: 60,
                energy: "focused",
                reasons: [repo.releaseAgeDays === null ? "no release/tag" : "release stale"],
                what: repo.releaseAgeDays === null ? "Create a release baseline so the repo has a known published state." : "Review whether the release cadence is stale and decide if current main is ready to ship.",
                how: "Check recent commits, tags, and deployments, then either cut a release/tag or record what is blocking the next one.",
                tags: ["stale-release"],
                updatedAgeDays: repo.releaseAgeDays,
                detail: repo.latestRelease ? `Latest ${repo.latestRelease.kind}: ${repo.latestRelease.tagName || repo.latestRelease.name}` : "No release or tag detected",
            });
        }
        if (repo.failedDeploy && repo.latestDeploy) {
            items.push({
                id: `${repo.slug}#deploy`,
                kind: "deploy",
                repo: repo.slug,
                title: `Fix failed deployment to ${repo.latestDeploy.environment}`,
                url: repo.latestDeploy.url || repo.url,
                score: Math.round(75 * repo.weight),
                minutes: 60,
                energy: "focused",
                reasons: ["deployment failed"],
                what: `Investigate the failed ${repo.latestDeploy.environment} deployment and decide if it blocks shipping.`,
                how: "Open the deployment, inspect the failed status/logs, then create a fix session if the failure points to code or configuration.",
                tags: ["failing-deploy"],
                updatedAgeDays: repo.latestDeploy.ageDays,
                detail: `${repo.latestDeploy.environment} · ${repo.latestDeploy.state} · ${ageLabel(repo.latestDeploy.ageDays)} ago`,
            });
        }
    }
    for (const recentSession of sessions.filter((entry) => entry.repository)) {
        if (recentSession.ageDays !== null && recentSession.ageDays > 7) continue;
        const staleSession = recentSession.ageDays !== null && recentSession.ageDays >= 2;
        const sessionLabel = (recentSession.summary || "open session").split("\n")[0].trim().slice(0, 80);
        items.push({
            id: `${recentSession.id}#session`,
            kind: "session",
            repo: recentSession.repository,
            sessionId: recentSession.id,
            branch: recentSession.branch || "",
            title: `Triage session: ${sessionLabel}`,
            url: "",
            score: Math.max(18, 46 - (recentSession.ageDays || 0) * 4) + (staleSession ? 10 : 0),
            minutes: 15,
            energy: "low",
            reasons: [staleSession ? "session left open, needs triage" : "recent session to triage"],
            what: "Triage an existing coding session so active work does not go stale.",
            how: "Jump to the session, read the latest agent state, then decide whether to continue, close, or clean it up.",
            tags: staleSession ? ["triage", "active-session", "stale-session"] : ["triage", "active-session"],
            updatedAgeDays: recentSession.ageDays,
            detail: `${recentSession.branch || "unknown branch"} · updated ${ageLabel(recentSession.ageDays)} ago`,
        });
    }
    return items.sort((a, b) => b.score - a.score);
}

function adjustScore(item, preferences) {
    let score = item.score;
    if (preferences.focusIntent === "prs") {
        if (item.kind === "pr") score += 45;
        if (item.tags.includes("needs-review") || item.tags.includes("failing-checks")) score += 18;
        if (item.kind === "issue") score -= 8;
    }
    if (preferences.focusIntent === "new-code") {
        if (item.kind === "issue") score += 40;
        if (item.tags.includes("assigned")) score += 15;
        if (item.kind === "deploy" || item.kind === "release") score += 8;
        if (item.kind === "pr" && !item.tags.includes("failing-checks")) score -= 10;
    }
    if (preferences.focusIntent === "issue-triage") {
        if (item.kind === "issue") score += 45;
        if (item.tags.includes("human") || item.tags.includes("recent")) score += 12;
        if (item.kind === "pr") score -= 12;
    }
    if (preferences.focusIntent === "maintenance") {
        if (["release", "deploy", "session"].includes(item.kind)) score += 42;
        if (item.tags.includes("stale-session") || item.tags.includes("stale-release")) score += 15;
        if (item.kind === "issue" && !item.tags.includes("assigned")) score -= 10;
    }
    if (preferences.mood === "low-energy") {
        if (item.minutes <= 15 || item.energy === "low") score += 25;
        if (item.kind === "release" || item.energy === "focused") score -= 20;
    }
    if (preferences.mood === "maintenance" && ["issue", "release", "session"].includes(item.kind)) score += 22;
    if (preferences.mood === "creative") {
        if (["release", "session"].includes(item.kind)) score += 18;
        if (item.kind === "pr") score -= 6;
    }
    if (preferences.mood === "urgent") {
        if (item.kind === "pr" || item.tags.includes("failing-checks")) score += 32;
        if (item.minutes > preferences.minutes) score -= 10;
    }
    if (preferences.mood === "focused" && item.energy === "focused") score += 16;
    if (preferences.busyness === "busy") {
        if (item.minutes <= 15) score += 24;
        if (item.minutes >= 60) score -= 24;
    }
    if (preferences.busyness === "open" && item.minutes >= 60) score += 12;
    return Math.round(score);
}

function buildRecommendations(items, preferences) {
    const adjusted = items.map((item) => ({ ...item, adjustedScore: adjustScore(item, preferences) })).sort((a, b) => b.adjustedScore - a.adjustedScore);
    const maxItems = preferences.minutes <= 15 ? 2 : preferences.minutes <= 30 ? 3 : preferences.minutes <= 60 ? 4 : 6;
    let remaining = preferences.minutes;
    const picks = [];
    for (const item of adjusted) {
        if (picks.length >= maxItems) break;
        const cost = Math.min(item.minutes, remaining);
        if (cost <= 0) break;
        if (item.minutes > remaining && preferences.minutes !== 15) continue;
        picks.push({ ...item, plannedMinutes: cost });
        remaining -= cost;
    }
    if (picks.length === 0 && adjusted[0]) {
        picks.push({ ...adjusted[0], plannedMinutes: Math.min(preferences.minutes, adjusted[0].minutes) });
    }
    return picks;
}

function summarizeDashboard(repos, sessions, focusItems, errors, inventory = []) {
    return {
        repoCount: repos.length,
        openPrCount: repos.reduce((sum, repo) => sum + repo.openPrCount, 0),
        openIssueCount: repos.reduce((sum, repo) => sum + repo.openIssueCount, 0),
        needsHumanPrCount: repos.reduce((sum, repo) => sum + repo.needsHumanPrCount, 0),
        humanIssueCount: repos.reduce((sum, repo) => sum + repo.humanIssueCount, 0),
        staleReleaseCount: repos.filter((repo) => repo.releaseAgeDays === null || repo.releaseAgeDays > 120).length,
        failedDeployCount: repos.filter((repo) => repo.failedDeploy).length,
        deployedRepoCount: repos.filter((repo) => repo.latestDeploy).length,
        activeSessionCount: sessions.filter((entry) => entry.repository && (entry.ageDays === null || entry.ageDays <= 14)).length,
        sessionInventoryCount: inventory.length,
        staleSessionCount: inventory.filter((s) => s.bucket === "stale" || s.bucket === "ancient" || s.orphaned).length,
        topFocusCount: focusItems.length,
        errorCount: errors.length,
    };
}

/* ---------------- item detail + actions ---------------- */

function normalizeComments(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.slice(-8).map((c) => ({
        author: normalizeLogin(c.author),
        body: String(c.body || "").slice(0, 2000),
        createdAt: c.createdAt || c.created_at || null,
        ageDays: daysSince(c.createdAt || c.created_at),
        url: c.url || "",
    }));
}

export async function getItemDetail({ repo, type, number } = {}) {
    const slug = String(repo || "");
    const owner = ownerOf(slug);
    const num = Number(number);
    if (!slug.includes("/") || !num || !["pr", "issue"].includes(type)) {
        throw new Error("A repo slug, item type (pr|issue), and number are required.");
    }
    if (type === "pr") {
        const fields = "number,title,body,state,author,url,isDraft,reviewDecision,labels,assignees,additions,deletions,changedFiles,mergeable,mergeStateStatus,comments,createdAt,updatedAt,headRefName,baseRefName,statusCheckRollup";
        const result = await ghJson(["pr", "view", String(num), "--repo", slug, "--json", fields], owner, `${slug}#pr-${num}:detail`);
        if (!result.ok || !result.value) throw new Error(result.error?.message || "Could not load pull request.");
        const pr = result.value;
        const checks = Array.isArray(pr.statusCheckRollup) ? pr.statusCheckRollup : [];
        const failing = checks.filter((c) => ["FAILURE", "ERROR", "TIMED_OUT", "CANCELLED"].includes(String(c.conclusion || c.status || "").toUpperCase()));
        return {
            type: "pr",
            repo: slug,
            number: pr.number,
            title: pr.title || `PR #${num}`,
            body: String(pr.body || "").slice(0, 6000),
            state: pr.state,
            isDraft: Boolean(pr.isDraft),
            author: normalizeLogin(pr.author),
            url: pr.url,
            reviewDecision: pr.reviewDecision || "UNKNOWN",
            labels: (pr.labels || []).map((l) => l.name || l).filter(Boolean),
            assignees: (pr.assignees || []).map(normalizeLogin).filter(Boolean),
            additions: pr.additions ?? null,
            deletions: pr.deletions ?? null,
            changedFiles: pr.changedFiles ?? null,
            mergeable: pr.mergeable || "UNKNOWN",
            mergeStateStatus: pr.mergeStateStatus || "",
            headRefName: pr.headRefName || "",
            baseRefName: pr.baseRefName || "",
            checksTotal: checks.length,
            checksFailing: failing.length,
            createdAt: pr.createdAt,
            updatedAt: pr.updatedAt,
            ageDays: daysSince(pr.updatedAt),
            comments: normalizeComments(pr.comments),
        };
    }
    const fields = "number,title,body,state,author,url,labels,assignees,comments,createdAt,updatedAt";
    const result = await ghJson(["issue", "view", String(num), "--repo", slug, "--json", fields], owner, `${slug}#issue-${num}:detail`);
    if (!result.ok || !result.value) throw new Error(result.error?.message || "Could not load issue.");
    const issue = result.value;
    return {
        type: "issue",
        repo: slug,
        number: issue.number,
        title: issue.title || `Issue #${num}`,
        body: String(issue.body || "").slice(0, 6000),
        state: issue.state,
        author: normalizeLogin(issue.author),
        url: issue.url,
        labels: (issue.labels || []).map((l) => l.name || l).filter(Boolean),
        assignees: (issue.assignees || []).map(normalizeLogin).filter(Boolean),
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        ageDays: daysSince(issue.updatedAt),
        comments: normalizeComments(issue.comments),
    };
}

const ITEM_ACTIONS = {
    comment: { verb: "comment", needsBody: true, both: true },
    close: { verb: "close", both: true },
    reopen: { verb: "reopen", both: true },
    "assign-me": { verb: "edit", issueOnly: true, extra: ["--add-assignee", "@me"] },
    "unassign-me": { verb: "edit", issueOnly: true, extra: ["--remove-assignee", "@me"] },
    "request-me": { verb: "edit", prOnly: true, extra: ["--add-reviewer", "@me"] },
    "copilot-review": { prOnly: true, api: true },
    ready: { verb: "ready", prOnly: true },
    approve: { verb: "review", prOnly: true, extra: ["--approve"] },
    merge: { verb: "merge", prOnly: true, extra: ["--squash"] },
};

export async function runItemAction({ repo, type, number, action, body } = {}) {
    const slug = String(repo || "");
    const owner = ownerOf(slug);
    const num = Number(number);
    if (!slug.includes("/") || !num || !["pr", "issue"].includes(type)) {
        throw new Error("A repo slug, item type (pr|issue), and number are required.");
    }
    const spec = ITEM_ACTIONS[action];
    if (!spec) throw new Error(`Unknown action: ${action}`);
    if (spec.prOnly && type !== "pr") throw new Error("That action only applies to pull requests.");
    if (spec.issueOnly && type !== "issue") throw new Error("That action only applies to issues.");
    if (spec.api && action === "copilot-review") {
        const apiArgs = ["api", "--method", "POST", `repos/${slug}/pulls/${num}/requested_reviewers`, "-f", "reviewers[]=copilot-pull-request-reviewer[bot]"];
        const apiResult = await run("gh", apiArgs, { env: ownerEnv(owner) });
        if (!apiResult.ok) throw new Error(apiResult.message || "Could not request a Copilot review. Copilot code review may not be enabled for this repo.");
        invalidateCache();
        return { ok: true, action, output: "Requested a review from Copilot." };
    }
    const args = [type, spec.verb, String(num), "--repo", slug];
    if (spec.needsBody) {
        const text = String(body || "").trim();
        if (!text) throw new Error("A comment body is required.");
        args.push("--body", text);
    }
    if (spec.extra) args.push(...spec.extra);
    const result = await run("gh", args, { env: ownerEnv(owner) });
    if (!result.ok) throw new Error(result.message || "Action failed.");
    invalidateCache();
    return { ok: true, action, output: (result.stdout || "").trim() || `${action} succeeded.` };
}

/* ---------------- orchestration ---------------- */

export function invalidateCache() {
    cachedModel = null;
    cachedAt = 0;
}

export async function collectDashboardState(force = false) {
    if (!force && cachedModel && nowMs() - cachedAt < CACHE_TTL_MS) return cachedModel;
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
        const [preferences, config] = await Promise.all([readPreferences(), readConfig()]);
        const [currentLogin, sessionState] = await Promise.all([getCurrentLogin(), getCopilotSessions(config.repos)]);
        const sessionInventoryState = await getSessionInventory(config.repos);
        const userLogins = knownUserLogins(currentLogin);
        const sessionsByRepo = new Map();
        for (const recentSession of sessionState.sessions) {
            if (!recentSession.repository) continue;
            const list = sessionsByRepo.get(recentSession.repository) || [];
            list.push(recentSession);
            sessionsByRepo.set(recentSession.repository, list);
        }
        const repos = await Promise.all(config.repos.map((repo) => collectRepo(repo, userLogins, sessionsByRepo)));
        const focusItems = buildFocusItems(repos, sessionState.sessions);
        const recommendations = buildRecommendations(focusItems, preferences);
        const errors = [...sessionState.errors, ...repos.flatMap((repo) => repo.errors.map((error) => ({ ...error, repo: repo.slug })))];
        cachedModel = {
            generatedAt: new Date().toISOString(),
            onboarded: config.onboarded && config.repos.length > 0,
            preferences,
            currentLogin,
            options: { moods: MOODS, busyness: BUSYNESS, minutes: MINUTE_OPTIONS, focusIntents: FOCUS_INTENTS },
            summary: summarizeDashboard(repos, sessionState.sessions, focusItems, errors, sessionInventoryState.inventory),
            repos,
            sessions: sessionState.sessions,
            sessionInventory: sessionInventoryState.inventory,
            focusItems,
            recommendations,
            errors,
        };
        cachedAt = nowMs();
        refreshPromise = null;
        return cachedModel;
    })();
    try {
        return await refreshPromise;
    } catch (error) {
        refreshPromise = null;
        throw error;
    }
}

async function getCurrentLogin() {
    const result = await ghJson(["api", "user"], "", "current-user", { timeoutMs: 8000 });
    return result.ok && result.value && result.value.login ? result.value.login : null;
}
