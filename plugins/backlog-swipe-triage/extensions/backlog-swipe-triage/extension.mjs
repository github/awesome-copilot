import { createServer } from "node:http";
import { joinSession, createCanvas } from "@github/copilot-sdk/extension";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const servers = new Map();
const extensionDir = fileURLToPath(new URL(".", import.meta.url));
const artifactsDir = path.join(extensionDir, "artifacts");
const stateFile = path.join(artifactsDir, "backlog-triage-state.json");
const decisions = ["assign_agent", "needs_info", "not_now", "close", "ignore"];
const execFileAsync = promisify(execFile);
const MAX_SYNC_ISSUES = 200;
const defaultFilters = {
    timeWindow: "any",
    labels: [],
    assignees: [],
    query: "",
    sortBy: "updated-desc",
};
const filterSchema = {
    type: "object",
    properties: {
        timeWindow: { type: "string", enum: ["any", "1d", "3d", "7d", "14d", "30d", "90d"] },
        labels: { type: "array", items: { type: "string" } },
        assignees: { type: "array", items: { type: "string" } },
        query: { type: "string" },
        sortBy: { type: "string", enum: ["updated-desc", "updated-asc", "created-desc", "created-asc", "title-asc", "random"] },
    },
    additionalProperties: false,
};
let activeSession = null;
const MAX_REQUEST_BODY_BYTES = 1024 * 1024;

let storage = { boards: {} };
let storageLoaded = false;
let persistStorageQueue = Promise.resolve();

async function ensureStorageLoaded() {
    if (storageLoaded) {
        return;
    }
    await fs.mkdir(artifactsDir, { recursive: true });
    try {
        const raw = await fs.readFile(stateFile, "utf8");
        storage = JSON.parse(raw);
    } catch (error) {
        if (error && error.code !== "ENOENT") {
            throw error;
        }
        storage = { boards: {} };
    }
    storageLoaded = true;
}

async function persistStorage() {
    await fs.mkdir(artifactsDir, { recursive: true });
    const snapshot = JSON.stringify(storage, null, 2);
    persistStorageQueue = persistStorageQueue
        .catch(() => undefined)
        .then(async () => {
            const tempStateFile = `${stateFile}.tmp-${process.pid}-${Date.now()}`;
            await fs.writeFile(tempStateFile, snapshot, "utf8");
            await fs.rename(tempStateFile, stateFile);
        });
    await persistStorageQueue;
}

function normalizeText(value, fallback = "") {
    return typeof value === "string" ? value.trim() : fallback;
}

function captureCwd(ctx) {
    const dir = ctx?.session?.workingDirectory;
    return typeof dir === "string" && dir.trim() ? dir : null;
}

function cwdForContext(ctx) {
    return captureCwd(ctx) || servers.get(ctx?.instanceId)?.cwd || null;
}

function escapeHtml(value) {
    return normalizeText(value).replace(/[&<>"']/g, (char) => {
        if (char === "&") return "&amp;";
        if (char === "<") return "&lt;";
        if (char === ">") return "&gt;";
        if (char === '"') return "&quot;";
        return "&#39;";
    });
}

function normalizeStringArray(values) {
    if (!Array.isArray(values)) {
        return [];
    }
    return values.map((value) => normalizeText(value)).filter(Boolean);
}

function normalizeFilters(raw, fallback = defaultFilters) {
    const merged = raw && typeof raw === "object" ? { ...fallback, ...raw } : { ...fallback };
    const legacyAssignee = normalizeText(merged.assignee);
    return {
        timeWindow: ["any", "1d", "3d", "7d", "14d", "30d", "90d"].includes(merged.timeWindow) ? merged.timeWindow : "any",
        labels: normalizeStringArray(merged.labels),
        assignees: legacyAssignee ? [legacyAssignee] : normalizeStringArray(merged.assignees),
        query: normalizeText(merged.query).toLowerCase(),
        sortBy: ["updated-desc", "updated-asc", "created-desc", "created-asc", "title-asc", "random"].includes(merged.sortBy)
            ? merged.sortBy
            : "updated-desc",
    };
}

function parseDateToMs(value) {
    const timestamp = Date.parse(value || "");
    return Number.isFinite(timestamp) ? timestamp : 0;
}

function getTimeWindowMs(timeWindow) {
    if (timeWindow === "1d") return 1 * 24 * 60 * 60 * 1000;
    if (timeWindow === "3d") return 3 * 24 * 60 * 60 * 1000;
    if (timeWindow === "7d") return 7 * 24 * 60 * 60 * 1000;
    if (timeWindow === "14d") return 14 * 24 * 60 * 60 * 1000;
    if (timeWindow === "30d") return 30 * 24 * 60 * 60 * 1000;
    if (timeWindow === "90d") return 90 * 24 * 60 * 60 * 1000;
    return 0;
}

function getIssueLabels(issue) {
    return Array.isArray(issue?.labels) ? issue.labels.map((label) => normalizeText(label?.name).toLowerCase()).filter(Boolean) : [];
}

function getIssueAssignees(issue) {
    return Array.isArray(issue?.assignees)
        ? issue.assignees.map((assignee) => normalizeText(assignee?.login).toLowerCase()).filter(Boolean)
        : [];
}

function issueMatchesFilters(issue, filters) {
    const now = Date.now();
    const cutoffWindow = getTimeWindowMs(filters.timeWindow);
    if (cutoffWindow > 0) {
        const updatedAtMs = parseDateToMs(issue.updatedAt);
        if (!updatedAtMs || now - updatedAtMs > cutoffWindow) {
            return false;
        }
    }

    const issueLabels = getIssueLabels(issue);
    const requiredLabels = filters.labels.map((label) => label.toLowerCase());
    if (requiredLabels.length > 0) {
        if (!requiredLabels.some((label) => issueLabels.includes(label))) {
            return false;
        }
    }

    const assigneeFilters = normalizeStringArray(filters.assignees).map((assignee) => assignee.toLowerCase());
    if (assigneeFilters.length > 0) {
        const assignees = getIssueAssignees(issue);
        const isUnassignedMatch = assigneeFilters.includes("unassigned") && assignees.length === 0;
        const hasNamedMatch = assigneeFilters.some((wanted) => wanted !== "unassigned" && assignees.includes(wanted));
        if (!isUnassignedMatch && !hasNamedMatch) {
            return false;
        }
    }

    if (filters.query) {
        const haystack = `${normalizeText(issue.title)} ${normalizeText(issue.body || "")}`.toLowerCase();
        if (!haystack.includes(filters.query)) {
            return false;
        }
    }

    return true;
}

function sortIssues(issues, sortBy) {
    const sorted = [...issues];
    if (sortBy === "random") {
        for (let i = sorted.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
        }
        return sorted;
    }
    sorted.sort((left, right) => {
        if (sortBy === "created-asc") {
            return parseDateToMs(left.createdAt) - parseDateToMs(right.createdAt);
        }
        if (sortBy === "created-desc") {
            return parseDateToMs(right.createdAt) - parseDateToMs(left.createdAt);
        }
        if (sortBy === "updated-asc") {
            return parseDateToMs(left.updatedAt) - parseDateToMs(right.updatedAt);
        }
        if (sortBy === "title-asc") {
            return normalizeText(left.title).localeCompare(normalizeText(right.title));
        }
        return parseDateToMs(right.updatedAt) - parseDateToMs(left.updatedAt);
    });
    return sorted;
}

function normalizeItem(raw, index) {
    const idFromInput = normalizeText(raw?.id);
    const title = normalizeText(raw?.title, `Item ${index + 1}`);
    const id = idFromInput || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `item-${index + 1}`;
    return {
        id,
        title,
        description: normalizeText(raw?.description),
        details: normalizeText(raw?.details),
        repo: normalizeText(raw?.repo),
        number: normalizeText(raw?.number),
        url: normalizeText(raw?.url),
        labels: normalizeStringArray(raw?.labels),
        assignees: normalizeStringArray(raw?.assignees),
        createdAt: normalizeText(raw?.createdAt),
        updatedAt: normalizeText(raw?.updatedAt),
        author: normalizeText(raw?.author),
    };
}

function getOrCreateBoard(boardId) {
    if (!storage.boards[boardId]) {
        storage.boards[boardId] = {
            id: boardId,
            title: "Backlog Triage",
            items: [],
            decisions: {},
            workStatus: {},
            filters: { ...defaultFilters },
            updatedAt: new Date().toISOString(),
        };
    }
    if (!storage.boards[boardId].workStatus || typeof storage.boards[boardId].workStatus !== "object") {
        storage.boards[boardId].workStatus = {};
    }
    return storage.boards[boardId];
}

function setBoardItems(board, items, replace = true) {
    const normalized = Array.isArray(items) ? items.map((item, index) => normalizeItem(item, index)) : [];
    const repoFromItems = normalized.find((item) => normalizeText(item.repo));
    if (repoFromItems) {
        board.repo = repoFromItems.repo;
    }
    if (replace) {
        board.items = normalized;
    } else {
        const existingById = new Map(board.items.map((item) => [item.id, item]));
        for (const item of normalized) {
            existingById.set(item.id, item);
        }
        board.items = [...existingById.values()];
    }
    board.updatedAt = new Date().toISOString();
}

function applyBoardDecision(board, itemId, decision, extra = {}) {
    if (!decisions.includes(decision)) {
        throw new Error(`Unsupported decision "${decision}"`);
    }
    const item = board.items.find((candidate) => candidate.id === itemId);
    if (!item) {
        throw new Error(`Item "${itemId}" not found on board "${board.id}"`);
    }
    board.decisions[itemId] = {
        decision,
        agent: normalizeText(extra.agent),
        note: normalizeText(extra.note),
        at: new Date().toISOString(),
    };
    board.updatedAt = new Date().toISOString();
}

function resetBoardDecisions(board) {
    board.decisions = {};
    board.updatedAt = new Date().toISOString();
}

function buildItemWorkStatus(board, item) {
    const statuses = [];
    const assignees = normalizeStringArray(item?.assignees);
    if (assignees.length > 0) {
        statuses.push({ label: `Assigned: ${assignees.join(", ")}` });
    }
    const decision = board.decisions?.[item.id];
    const triageAgent = normalizeText(decision?.decision === "assign_agent" ? decision?.agent : "");
    if (assignees.length === 0 && triageAgent) {
        statuses.push({ label: `Assigned in triage: ${triageAgent}` });
    }
    const work = board.workStatus?.[item.id];
    if (work?.sessionState === "active") {
        const sessionName = normalizeText(work.sessionName);
        statuses.push({ label: sessionName ? `Session active: ${sessionName}` : "Session active" });
    } else if (work?.sessionState === "starting") {
        statuses.push({ label: "Session starting" });
    } else if (work?.sessionState === "requested") {
        const sessionName = normalizeText(work.sessionName);
        statuses.push({ label: sessionName ? `Session requested: ${sessionName}` : "Session requested" });
    }
    return statuses;
}

function buildBoardState(board) {
    const allLabels = [...new Set(board.items.flatMap((item) => (Array.isArray(item.labels) ? item.labels : [])))].sort((a, b) =>
        a.localeCompare(b),
    );
    const hasUnassigned = board.items.some((item) => !Array.isArray(item.assignees) || item.assignees.length === 0);
    const allAssignees = [
        ...new Set(board.items.flatMap((item) => (Array.isArray(item.assignees) ? item.assignees : []))),
    ].sort((a, b) => a.localeCompare(b));
    if (hasUnassigned) {
        allAssignees.unshift("unassigned");
    }
    const pending = [];
    const resolved = [];
    for (const item of board.items) {
        const itemWithStatus = { ...item, workStatus: buildItemWorkStatus(board, item) };
        const result = board.decisions[item.id];
        if (result) {
            resolved.push({ ...itemWithStatus, result });
        } else {
            pending.push(itemWithStatus);
        }
    }
    return {
        boardId: board.id,
        title: board.title,
        repo: normalizeText(board.repo),
        syncedAt: normalizeText(board.syncedAt),
        filters: normalizeFilters(board.filters, defaultFilters),
        availableLabels: allLabels,
        availableAssignees: allAssignees,
        pending,
        resolved,
        decisionCounts: resolved.reduce((counts, item) => {
            const key = item.result.decision;
            counts[key] = (counts[key] || 0) + 1;
            return counts;
        }, {}),
        updatedAt: board.updatedAt,
    };
}

function buildIssueDetails(issue) {
    const parts = [];
    const author = normalizeText(issue.author?.login);
    if (author) {
        parts.push(`Author: ${author}`);
    }
    if (normalizeText(issue.createdAt)) {
        parts.push(`Created: ${normalizeText(issue.createdAt).slice(0, 10)}`);
    }
    if (normalizeText(issue.updatedAt)) {
        parts.push(`Updated: ${normalizeText(issue.updatedAt).slice(0, 10)}`);
    }
    return parts.join(" | ");
}

function buildIssueDescription(issue) {
    const body = normalizeText(issue.body);
    if (!body) {
        return "";
    }
    const normalized = body
        .replace(/\r/g, "")
        .replace(/!\[.*?\]\(.*?\)/g, "")
        .replace(/\n{2,}/g, "\n\n")
        .trim();
    if (normalized.length <= 2200) {
        return normalized;
    }
    return `${normalized.slice(0, 2197).trimEnd()}...`;
}

async function runGhJson(args, cwd) {
    const result = await execFileAsync("gh", args, {
        cwd,
        windowsHide: true,
        maxBuffer: 8 * 1024 * 1024,
    });
    return JSON.parse(result.stdout);
}

async function runGh(args, cwd) {
    const result = await execFileAsync("gh", args, {
        cwd,
        windowsHide: true,
        maxBuffer: 8 * 1024 * 1024,
    });
    return result.stdout;
}

async function closeGithubIssue(board, item, note, cwd = process.cwd()) {
    const issueNumber = normalizeText(item?.number);
    const repo = normalizeText(board?.repo || item?.repo);
    if (!issueNumber || !repo) {
        throw new Error("Cannot close issue on GitHub because repo or issue number is missing.");
    }
    const args = ["issue", "close", issueNumber, "--repo", repo];
    const comment = normalizeText(note);
    if (comment) {
        args.push("--comment", comment);
    }
    try {
        await runGh(args, cwd);
    } catch (error) {
        const stderr = normalizeText(error?.stderr || "");
        if (stderr.toLowerCase().includes("already closed")) {
            return;
        }
        throw new Error(stderr || `Failed to close issue #${issueNumber} in ${repo}.`);
    }
}

async function commentGithubIssue(board, item, note, cwd = process.cwd()) {
    const repo = normalizeText(board?.repo || item?.repo);
    const issueNumber = extractIssueNumber(item);
    const comment = normalizeText(note);
    if (!repo || !issueNumber) {
        throw new Error("Cannot comment on issue because repo or issue number is missing.");
    }
    if (!comment) {
        return;
    }
    try {
        await runGh(["issue", "comment", issueNumber, "--repo", repo, "--body", comment], cwd);
    } catch (error) {
        const stderr = normalizeText(error?.stderr || "");
        throw new Error(stderr || `Failed to comment on issue #${issueNumber} in ${repo}.`);
    }
}

function extractIssueNumber(item) {
    const explicit = normalizeText(item?.number);
    if (/^\d+$/.test(explicit)) {
        return explicit;
    }
    const idMatch = normalizeText(item?.id).match(/^issue-(\d+)$/i);
    if (idMatch) {
        return idMatch[1];
    }
    const titleMatch = normalizeText(item?.title).match(/^#(\d+)\b/);
    if (titleMatch) {
        return titleMatch[1];
    }
    return "";
}

async function startImplementationSession(board, item, agent, note) {
    if (!activeSession) {
        throw new Error("Copilot session is unavailable for starting implementation sessions.");
    }
    const repo = normalizeText(board?.repo || item?.repo);
    const issueNumber = extractIssueNumber(item);
    if (!repo || !issueNumber) {
        throw new Error("Cannot start implementation session because repo or issue number is missing.");
    }
    const rawTitle = normalizeText(item?.title);
    const issueTitle = rawTitle.replace(new RegExp(`^#${issueNumber}\\s*`), "").trim() || rawTitle || `Issue #${issueNumber}`;
    const summary = normalizeText(item?.description);
    const kickoffLines = [
        `Implement GitHub issue #${issueNumber}: ${issueTitle}`,
        `Repository: ${repo}`,
    ];
    if (summary) {
        kickoffLines.push(`Context: ${summary}`);
    }
    if (normalizeText(note)) {
        kickoffLines.push(`Triage note: ${normalizeText(note)}`);
    }
    kickoffLines.push(
        "Deliver a complete fix with code changes, run relevant validation, and open a PR-ready branch state with a concise summary.",
    );
    const kickoffPrompt = kickoffLines.join("\n");
    const sessionRequest = [
        `Create a new implementation project session for GitHub issue #${issueNumber} in ${repo}.`,
        "Use the open_issue_session tool with these exact fields:",
        `- repo_full_name: ${JSON.stringify(repo)}`,
        `- issue_number: ${Number(issueNumber)}`,
        `- issue_title: ${JSON.stringify(issueTitle)}`,
        '- kickoff_mode: "autopilot"',
        '- coordinate_with_creator: true',
        '- notify_on_idle: "once"',
        `- kickoff_prompt: ${JSON.stringify(kickoffPrompt)}`,
        "",
        "After the tool call succeeds, reply with a one-line confirmation including the new session name.",
    ].join("\n");
    await activeSession.send({
        prompt: sessionRequest,
        mode: "immediate",
        displayPrompt: `Start implementation session for #${issueNumber}`,
    });
    return {
        sessionState: "requested",
        sessionName: `Issue #${issueNumber}`,
        issueNumber,
        agent: normalizeText(agent),
        requestedAt: new Date().toISOString(),
    };
}

function pruneDecisionsForCurrentItems(board) {
    const currentIds = new Set(board.items.map((item) => item.id));
    for (const itemId of Object.keys(board.decisions)) {
        if (!currentIds.has(itemId)) {
            delete board.decisions[itemId];
        }
    }
    if (board.workStatus && typeof board.workStatus === "object") {
        for (const itemId of Object.keys(board.workStatus)) {
            if (!currentIds.has(itemId)) {
                delete board.workStatus[itemId];
            }
        }
    }
}

async function syncBoardFromRepo(board, filtersInput, cwd = null) {
    const commandCwd = cwd || process.cwd();
    let repo = normalizeText(board.repo);
    if (!repo && cwd) {
        const repoData = await runGhJson(["repo", "view", "--json", "nameWithOwner"], cwd);
        repo = normalizeText(repoData?.nameWithOwner);
    }
    if (!repo) {
        throw new Error("Repository is not configured. Open the canvas with a repo or call sync_from_repo with { repo: \"owner/name\" }.");
    }
    const filters = normalizeFilters(filtersInput, board.filters || defaultFilters);

    const issues = await runGhJson(
        [
            "issue",
            "list",
            "--repo",
            repo,
            "--state",
            "open",
            "--limit",
            String(MAX_SYNC_ISSUES),
            "--json",
            "number,title,url,labels,assignees,createdAt,updatedAt,author,body",
        ],
        commandCwd,
    );

    const filteredIssues = Array.isArray(issues) ? sortIssues(issues.filter((issue) => issueMatchesFilters(issue, filters)), filters.sortBy) : [];
    const items = filteredIssues.map((issue) => ({
              id: `issue-${issue.number}`,
              title: `#${issue.number} ${normalizeText(issue.title, "Untitled issue")}`,
              description: buildIssueDescription(issue),
              details: buildIssueDetails(issue),
              repo,
              number: String(issue.number),
              url: normalizeText(issue.url),
              labels: Array.isArray(issue.labels) ? issue.labels.map((label) => normalizeText(label?.name)).filter(Boolean) : [],
              assignees: Array.isArray(issue.assignees) ? issue.assignees.map((assignee) => normalizeText(assignee?.login)).filter(Boolean) : [],
              createdAt: normalizeText(issue.createdAt),
              updatedAt: normalizeText(issue.updatedAt),
              author: normalizeText(issue.author?.login),
          }));

    setBoardItems(board, items, true);
    pruneDecisionsForCurrentItems(board);
    board.source = "repo";
    board.repo = repo;
    board.filters = filters;
    board.syncedAt = new Date().toISOString();
}

function renderHtml(instanceId, title) {
    const safeTitle = escapeHtml(title || "Backlog Swipe Triage");
    const safeInstanceId = escapeHtml(instanceId || "default");
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${safeTitle}</title>
    <style>
      :root {
        color-scheme: light dark;
      }
      body {
        margin: 0;
        background:
          radial-gradient(circle at 15% -10%, rgba(9, 105, 218, 0.10), transparent 35%),
          radial-gradient(circle at 95% 0%, rgba(130, 80, 223, 0.08), transparent 30%),
          var(--background-color-default, #fff);
        color: var(--text-color-default, #1f2328);
        font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
        font-size: var(--text-body-medium, 14px);
        line-height: var(--leading-body-medium, 20px);
      }
      .wrap {
        max-width: 940px;
        margin: 0 auto;
        padding: 18px;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 14px;
        margin-bottom: 12px;
        border: 1px solid var(--border-color-default, #d0d7de);
        border-radius: 12px;
        padding: 12px;
        background: color-mix(in srgb, var(--background-color-default, #fff) 88%, var(--color-canvas-subtle, #f6f8fa));
        box-shadow: 0 3px 14px rgba(0, 0, 0, 0.06);
      }
      .title-wrap {
        min-width: 0;
      }
      .subline {
        margin-top: 4px;
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        font-size: 12px;
      }
      .counts {
        border: 1px solid var(--border-color-default, #d0d7de);
        border-radius: 999px;
        padding: 4px 10px;
        background: var(--background-color-default, #fff);
        white-space: nowrap;
      }
      .filterbar {
        display: grid;
        grid-template-columns: repeat(12, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 14px;
        padding: 12px;
        border: 1px solid var(--border-color-default, #d0d7de);
        border-radius: 12px;
        background: color-mix(in srgb, var(--color-canvas-subtle, #f6f8fa) 65%, var(--background-color-default, #fff));
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
      }
      .filter-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .field-time { grid-column: span 2; }
      .field-labels { grid-column: span 3; }
      .field-assignee { grid-column: span 3; }
      .field-query { grid-column: span 2; }
      .field-sort { grid-column: span 2; }
      .filter-field label {
        font-size: 11px;
        color: var(--text-color-muted, #57606a);
      }
      .filter-field input,
      .filter-field select {
        border: 1px solid var(--border-color-default, #d0d7de);
        border-radius: 8px;
        padding: 7px 9px;
        background: var(--background-color-default, #fff);
        color: var(--text-color-default, #1f2328);
        transition: border-color 120ms ease, box-shadow 120ms ease;
      }
      .filter-field input:focus,
      .filter-field select:focus {
        border-color: var(--color-focus-outline, #0969da);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-focus-outline, #0969da) 22%, transparent);
        outline: none;
      }
      .multi-select {
        position: relative;
      }
      .multi-select > summary {
        list-style: none;
        border: 1px solid var(--border-color-default, #d0d7de);
        border-radius: 8px;
        padding: 7px 9px;
        background: var(--background-color-default, #fff);
        color: var(--text-color-default, #1f2328);
        cursor: pointer;
        user-select: none;
      }
      .multi-select > summary::-webkit-details-marker {
        display: none;
      }
      .multi-select[open] > summary {
        border-color: var(--color-focus-outline, #0969da);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-focus-outline, #0969da) 22%, transparent);
      }
      .multi-options {
        position: absolute;
        z-index: 40;
        top: calc(100% + 6px);
        left: 0;
        right: 0;
        max-height: 220px;
        overflow: auto;
        border: 1px solid var(--border-color-default, #d0d7de);
        border-radius: 10px;
        background: var(--background-color-default, #fff);
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.16);
        padding: 8px;
        display: grid;
        gap: 6px;
      }
      .multi-option {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
      }
      .multi-option input {
        margin: 0;
      }
      .filter-actions {
        display: flex;
        gap: 8px;
        align-items: flex-start;
        justify-content: flex-end;
        grid-column: 1 / -1;
        grid-row: 2;
        margin-top: 2px;
      }
      h1 {
        margin: 0;
        font-size: var(--text-title-medium, 22px);
      }
      .muted {
        color: var(--text-color-muted, #57606a);
      }
      .stack {
        position: relative;
        height: 430px;
      }
      .stack::before {
        content: "";
        position: absolute;
        inset: 12px;
        border-radius: 14px;
        background: linear-gradient(165deg, rgba(9, 105, 218, 0.07), rgba(130, 80, 223, 0.05));
        border: 1px dashed color-mix(in srgb, var(--border-color-default, #d0d7de) 80%, transparent);
      }
      .card {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 28px;
        right: 28px;
        max-width: 860px;
        margin-inline: auto;
        border: 1px solid var(--border-color-default, #d0d7de);
        border-radius: 14px;
        background:
          radial-gradient(circle at 95% 0%, rgba(9, 105, 218, 0.16), transparent 32%),
          radial-gradient(circle at 10% 100%, rgba(130, 80, 223, 0.12), transparent 28%),
          var(--color-canvas-subtle, #f6f8fa);
        padding: 16px;
        user-select: none;
        touch-action: none;
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.13);
        transition: transform 120ms ease-out, opacity 120ms ease-out;
        display: grid;
        grid-template-rows: auto minmax(170px, 1fr) auto auto;
      }
      .card.card-hidden {
        opacity: 0 !important;
        transform: translate(0, 12px) scale(0.985) !important;
      }
      .card-top {
        display: flex;
        justify-content: space-between;
        gap: 10px;
      }
      .card h2 {
        margin: 0 0 8px 0;
        font-size: 18px;
      }
      .issue-pill {
        border: 1px solid var(--border-color-default, #d0d7de);
        border-radius: 999px;
        padding: 3px 10px;
        font-size: 12px;
        white-space: nowrap;
        align-self: flex-start;
        background: var(--background-color-default, #fff);
      }
      #itemDetails {
        margin-top: 6px;
        overflow: auto;
        padding-right: 4px;
        line-height: 1.45;
      }
      #itemDetails p,
      #itemDetails ul,
      #itemDetails ol,
      #itemDetails pre,
      #itemDetails blockquote,
      #itemDetails h3,
      #itemDetails h4 {
        margin: 0 0 10px 0;
      }
      #itemDetails ul,
      #itemDetails ol {
        padding-left: 18px;
      }
      #itemDetails li {
        margin: 0 0 4px 0;
      }
      #itemDetails code {
        font-family: var(--font-mono, "SFMono-Regular", Consolas, "Liberation Mono", monospace);
        font-size: 12px;
        padding: 1px 5px;
        border-radius: 6px;
        background: color-mix(in srgb, var(--background-color-default, #fff) 84%, var(--color-canvas-subtle, #f6f8fa));
        border: 1px solid color-mix(in srgb, var(--border-color-default, #d0d7de) 74%, transparent);
      }
      #itemDetails pre {
        overflow: auto;
        padding: 10px;
        border-radius: 8px;
        border: 1px solid var(--border-color-default, #d0d7de);
        background: var(--background-color-default, #fff);
      }
      #itemDetails pre code {
        border: none;
        background: transparent;
        padding: 0;
      }
      #itemDetails blockquote {
        border-left: 3px solid color-mix(in srgb, var(--true-color-blue, #0969da) 40%, transparent);
        margin-left: 0;
        padding-left: 10px;
        color: var(--text-color-muted, #57606a);
      }
      #itemDetails a {
        color: var(--true-color-blue, #0969da);
      }
      .pillbar {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        align-content: flex-start;
        gap: 6px;
      }
      .status-strip {
        margin-top: 8px;
        min-height: 24px;
      }
      .status-pill {
        border-color: color-mix(in srgb, var(--true-color-blue, #0969da) 24%, var(--border-color-default, #d0d7de));
        background: color-mix(in srgb, var(--true-color-blue-muted, #dbeafe) 45%, var(--background-color-default, #fff));
      }
      .meta-stack {
        margin-top: auto;
        padding-top: 12px;
        display: flex;
        flex-direction: column;
        gap: 7px;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        border: 1px solid color-mix(in srgb, var(--border-color-default, #d0d7de) 78%, transparent);
        border-radius: 999px;
        padding: 3px 10px;
        font-size: 12px;
        background: color-mix(in srgb, var(--background-color-default, #fff) 86%, var(--color-canvas-subtle, #f6f8fa));
        box-shadow: inset 0 1px 0 color-mix(in srgb, var(--color-white, #fff) 75%, transparent);
        text-decoration: none;
        color: inherit;
      }
      .issue-link {
        pointer-events: auto;
      }
      .controls {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 8px;
        margin-top: 12px;
      }
      .action-feedback {
        margin-top: 10px;
        border: 1px solid var(--border-color-default, #d0d7de);
        border-radius: 10px;
        padding: 8px 10px;
        background: var(--background-color-default, #fff);
        opacity: 0;
        transform: translateY(-4px);
        transition: opacity 180ms ease, transform 180ms ease;
      }
      .action-feedback.show {
        opacity: 1;
        transform: translateY(0);
      }
      .action-feedback.success {
        border-color: var(--true-color-blue-muted, #bfd8ff);
      }
      .action-feedback.error {
        border-color: var(--true-color-red-muted, #ffc9c9);
      }
      .busy-indicator {
        position: absolute;
        inset: 0;
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 38;
        pointer-events: none;
      }
      .busy-indicator.show {
        display: flex;
      }
      .busy-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        border: 1px solid var(--border-color-default, #d0d7de);
        background: color-mix(in srgb, var(--background-color-default, #fff) 90%, var(--color-canvas-subtle, #f6f8fa));
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
        font-size: 12px;
        color: var(--text-color-default, #1f2328);
      }
      .busy-spinner {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid color-mix(in srgb, var(--border-color-default, #d0d7de) 90%, transparent);
        border-top-color: var(--true-color-blue, #0969da);
        animation: spinner-rotate 0.8s linear infinite;
      }
      @keyframes spinner-rotate {
        to {
          transform: rotate(360deg);
        }
      }
      .celebrate-fx {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        pointer-events: none;
        opacity: 0;
        transition: opacity 140ms ease;
      }
      .celebrate-fx.show {
        opacity: 1;
      }
      .celebrate-badge {
        min-width: 86px;
        height: 86px;
        border-radius: 999px;
        border: 1px solid color-mix(in srgb, var(--true-color-blue, #0969da) 28%, var(--border-color-default, #d0d7de));
        background: color-mix(in srgb, var(--background-color-default, #fff) 88%, var(--true-color-blue-muted, #dbeafe));
        display: grid;
        place-items: center;
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.16);
        transform: scale(0.72);
      }
      .celebrate-fx.show .celebrate-badge {
        animation: pop-in 460ms cubic-bezier(0.2, 0.9, 0.3, 1);
      }
      .celebrate-icon {
        font-size: 28px;
        line-height: 1;
      }
      .celebrate-text {
        margin-top: 2px;
        font-size: 11px;
        font-weight: 600;
        color: var(--text-color-default, #1f2328);
      }
      @keyframes pop-in {
        0% { transform: scale(0.68); opacity: 0; }
        35% { transform: scale(1.04); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      .card.card-exit-left {
        transform: translate(-120%, 8px) rotate(-16deg) !important;
        opacity: 0.15;
      }
      .card.card-exit-right {
        transform: translate(120%, 8px) rotate(16deg) !important;
        opacity: 0.15;
      }
      .card.card-exit-up {
        transform: translate(0, -120%) rotate(-2deg) !important;
        opacity: 0.15;
      }
      .card.card-exit-down {
        transform: translate(0, 120%) rotate(2deg) !important;
        opacity: 0.15;
      }
      button {
        border: 1px solid var(--border-color-default, #d0d7de);
        background: var(--background-color-default, #fff);
        color: var(--text-color-default, #1f2328);
        border-radius: 10px;
        padding: 9px 10px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 80ms ease, box-shadow 120ms ease, border-color 120ms ease;
      }
      button:hover {
        border-color: color-mix(in srgb, var(--color-focus-outline, #0969da) 35%, var(--border-color-default, #d0d7de));
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.09);
      }
      button:active {
        transform: translateY(1px);
      }
      #btnAssign {
        border-color: color-mix(in srgb, var(--true-color-blue, #0969da) 30%, var(--border-color-default, #d0d7de));
        background: color-mix(in srgb, var(--true-color-blue-muted, #dbeafe) 42%, var(--background-color-default, #fff));
      }
      #btnClose {
        border-color: color-mix(in srgb, var(--true-color-red, #cf222e) 26%, var(--border-color-default, #d0d7de));
        background: color-mix(in srgb, var(--true-color-red-muted, #ffe5e8) 40%, var(--background-color-default, #fff));
      }
      #btnIgnore {
        border-color: color-mix(in srgb, var(--text-color-muted, #57606a) 28%, var(--border-color-default, #d0d7de));
      }
      button:focus-visible {
        outline: 2px solid var(--color-focus-outline, #0969da);
      }
      .choices {
        display: none;
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: min(760px, calc(100% - 52px));
        max-height: 58%;
        overflow: auto;
        padding: 10px;
        border: 1px solid var(--border-color-default, #d0d7de);
        border-radius: 10px;
        background: var(--color-canvas-subtle, #f6f8fa);
        box-shadow: 0 14px 30px rgba(0, 0, 0, 0.20);
        flex-wrap: wrap;
        gap: 8px;
        z-index: 35;
      }
      .choices.show {
        display: flex;
      }
      .choice-title {
        width: 100%;
        font-weight: 600;
      }
      .choice-btn {
        font-size: 12px;
        padding: 7px 10px;
      }
      .summary {
        margin-top: 14px;
        border: 1px solid var(--border-color-default, #d0d7de);
        border-radius: 10px;
        padding: 10px 12px;
        background: color-mix(in srgb, var(--color-canvas-subtle, #f6f8fa) 45%, var(--background-color-default, #fff));
      }
      .help {
        margin-top: 12px;
        font-size: 12px;
        padding: 0 2px;
      }
      @media (max-width: 980px) {
        .field-time,
        .field-assignee,
        .field-sort {
          grid-column: span 3;
        }
        .field-labels,
        .field-query {
          grid-column: span 6;
        }
        .filter-actions {
          grid-column: span 3;
          grid-row: auto;
          justify-content: flex-start;
          align-items: flex-end;
          margin-top: 0;
        }
      }
      @media (max-width: 760px) {
        .wrap {
          padding: 12px;
        }
        .header {
          flex-direction: column;
          gap: 8px;
        }
        .controls {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .stack {
          height: 460px;
        }
        .card {
          left: 10px;
          right: 10px;
        }
        .choices {
          width: calc(100% - 28px);
          top: 50%;
          bottom: auto;
          transform: translate(-50%, -50%);
          max-height: 64%;
        }
        .field-time,
        .field-labels,
        .field-assignee {
          grid-column: span 12;
        }
        .field-query {
          grid-column: span 5;
        }
        .field-sort {
          grid-column: span 3;
        }
        .filter-actions {
          grid-column: span 4;
          grid-row: auto;
          justify-content: flex-start;
          align-items: flex-end;
          margin-top: 0;
          gap: 6px;
        }
        .filter-actions button {
          padding: 8px 9px;
          white-space: nowrap;
        }
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="header">
        <div class="title-wrap">
          <h1>${safeTitle}</h1>
          <div class="subline muted">
            <span>Instance: <code>${safeInstanceId}</code></span>
            <span id="boardMeta">Loading board…</span>
          </div>
        </div>
        <div id="counts" class="counts muted"></div>
      </div>
      <div class="filterbar">
        <div class="filter-field field-time">
          <label for="filterTime">Time window</label>
          <select id="filterTime">
            <option value="any">Any time</option>
            <option value="1d">Last 24h</option>
            <option value="3d">Last 3 days</option>
            <option value="7d">Last 7 days</option>
            <option value="14d">Last 14 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
        <div class="filter-field field-labels">
          <label>Labels</label>
          <details id="labelsDropdown" class="multi-select">
            <summary id="labelsSummary">All labels</summary>
            <div id="labelsOptions" class="multi-options"></div>
          </details>
        </div>
        <div class="filter-field field-assignee">
          <label>Assignees</label>
          <details id="assigneesDropdown" class="multi-select">
            <summary id="assigneesSummary">All assignees</summary>
            <div id="assigneesOptions" class="multi-options"></div>
          </details>
        </div>
        <div class="filter-field field-query">
          <label for="filterQuery">Title contains</label>
          <input id="filterQuery" placeholder="keyword search" />
        </div>
        <div class="filter-field field-sort">
          <label for="filterSort">Sort</label>
          <select id="filterSort">
            <option value="updated-desc">Updated: newest first</option>
            <option value="updated-asc">Updated: oldest first</option>
            <option value="created-desc">Created: newest first</option>
            <option value="created-asc">Created: oldest first</option>
            <option value="title-asc">Title: A→Z</option>
            <option value="random">Random</option>
          </select>
        </div>
        <div class="filter-actions">
          <button id="btnApplyFilters" title="Apply filters and sync">Apply filters</button>
          <button id="btnResetFilters" title="Clear filters and sync">Reset</button>
        </div>
      </div>
      <div class="stack">
        <div id="card" class="card">
          <div class="card-top">
            <h2 id="itemTitle"></h2>
            <div id="issuePill" class="issue-pill muted">Issue</div>
          </div>
          <div id="itemDetails" class="muted"></div>
            <div id="workStatus" class="pillbar status-strip"></div>
            <div class="meta-stack">
              <div id="metaTop" class="pillbar"></div>
              <div id="meta" class="pillbar"></div>
            </div>
        </div>
        <div id="celebrateFx" class="celebrate-fx">
            <div class="celebrate-badge">
              <div>
                <div id="celebrateIcon" class="celebrate-icon">✨</div>
                <div id="celebrateText" class="celebrate-text">Done</div>
              </div>
            </div>
        </div>
        <div id="busyIndicator" class="busy-indicator" aria-live="polite">
          <div class="busy-pill">
            <span class="busy-spinner" aria-hidden="true"></span>
            <span>Applying action…</span>
          </div>
        </div>
        <div id="choices" class="choices">
          <div class="choice-title">Swipe-up quick responses</div>
          <button class="choice-btn" data-decision="needs_info" data-note="Need clearer repro steps.">Need repro steps</button>
          <button class="choice-btn" data-decision="needs_info" data-note="Need acceptance criteria.">Need acceptance criteria</button>
          <button class="choice-btn" data-decision="needs_info" data-note="Waiting on dependency confirmation.">Needs dependency details</button>
          <button class="choice-btn" data-decision="not_now" data-note="Revisit next sprint.">Not now: next sprint</button>
          <button class="choice-btn" data-decision="not_now" data-note="Queue after current release.">Not now: post-release</button>
          <button class="choice-btn" data-decision="not_now" data-note="Low priority backlog item.">Not now: low priority</button>
          <button class="choice-btn" data-decision="close" data-note="Closing as duplicate.">Close: duplicate</button>
          <button class="choice-btn" data-decision="close" data-note="Closing as out of scope.">Close: out of scope</button>
          <button class="choice-btn" data-decision="ignore" data-note="Ignore for now; not actionable.">Ignore: not actionable</button>
        </div>
      </div>
      <div class="controls">
        <button id="btnSync" title="Load open issues from repo">Sync from repo</button>
        <button id="btnClose" title="Swipe left">Left: Close</button>
        <button id="btnOptions" title="Swipe up">Up: Quick responses</button>
        <button id="btnIgnore" title="Swipe down">Down: Ignore</button>
        <button id="btnAssign" title="Swipe right">Right: Assign agent</button>
      </div>
      <div id="actionFeedback" class="action-feedback muted"></div>
      <div class="summary">
        <strong>Decision summary</strong>
        <div id="summaryText" class="muted"></div>
      </div>
      <div class="help muted">
        Swipe mappings: <strong>left</strong>=close, <strong>right</strong>=assign agent,
        <strong>up</strong>=more options, <strong>down</strong>=ignore. Arrow keys work too.
      </div>
    </div>
    <script>
      let state = null;
      let activeItem = null;
      let dragStart = null;
      let isAnimating = false;
      let isAutoSyncing = false;
      let needsAutoResync = false;
      let autoSyncTimer = null;
      let feedbackTimeoutId = null;
      const card = document.getElementById("card");
      const counts = document.getElementById("counts");
      const itemTitle = document.getElementById("itemTitle");
      const itemDetails = document.getElementById("itemDetails");
      const issuePill = document.getElementById("issuePill");
      const workStatus = document.getElementById("workStatus");
      const metaTop = document.getElementById("metaTop");
      const meta = document.getElementById("meta");
      const summaryText = document.getElementById("summaryText");
      const choices = document.getElementById("choices");
      const actionFeedback = document.getElementById("actionFeedback");
      const busyIndicator = document.getElementById("busyIndicator");
      const celebrateFx = document.getElementById("celebrateFx");
      const celebrateIcon = document.getElementById("celebrateIcon");
      const celebrateText = document.getElementById("celebrateText");
      const boardMeta = document.getElementById("boardMeta");
      const filterTime = document.getElementById("filterTime");
      const labelsDropdown = document.getElementById("labelsDropdown");
      const labelsSummary = document.getElementById("labelsSummary");
      const labelsOptions = document.getElementById("labelsOptions");
      const assigneesDropdown = document.getElementById("assigneesDropdown");
      const assigneesSummary = document.getElementById("assigneesSummary");
      const assigneesOptions = document.getElementById("assigneesOptions");
      const filterQuery = document.getElementById("filterQuery");
      const filterSort = document.getElementById("filterSort");
      let selectedLabels = [];
      let selectedAssignees = [];

      function normalizeSelection(values) {
        return Array.isArray(values) ? values.map((value) => String(value || "").trim()).filter(Boolean) : [];
      }

      function formatSelectionSummary(selected, total, allText) {
        if (selected.length === 0 || selected.length >= total) {
          return allText;
        }
        if (selected.length === 1) {
          return selected[0];
        }
        return selected[0] + " +" + (selected.length - 1);
      }

      function renderMultiOptions(container, summaryEl, selected, options, allText, fieldName) {
        const normalizedOptions = normalizeSelection(options);
        const selectedSet = new Set(normalizeSelection(selected).filter((value) => normalizedOptions.includes(value)));
        const allChecked = selectedSet.size === 0 || selectedSet.size === normalizedOptions.length;
        const rows = [];
        rows.push(
          "<label class=\\"multi-option\\"><input type=\\"checkbox\\" data-field=\\"" +
            fieldName +
            "\\" data-all=\\"true\\" " +
            (allChecked ? "checked" : "") +
            " />All</label>",
        );
        for (const option of normalizedOptions) {
          rows.push(
            "<label class=\\"multi-option\\"><input type=\\"checkbox\\" data-field=\\"" +
              fieldName +
              "\\" value=\\"" +
              escapeHtml(option) +
              "\\" " +
              (selectedSet.has(option) ? "checked" : "") +
              " />" +
              escapeHtml(option) +
              "</label>",
          );
        }
        container.innerHTML = rows.join("");
        summaryEl.textContent = formatSelectionSummary([...selectedSet], normalizedOptions.length, allText);
      }

      function syncSelectionsFromDom(container, options) {
        const normalizedOptions = normalizeSelection(options);
        const allInput = container.querySelector("input[data-all='true']");
        if (allInput && allInput.checked) {
          return [];
        }
        const selected = [];
        const inputs = container.querySelectorAll("input[type='checkbox'][data-field][value]");
        for (const input of inputs) {
          if (input.checked && normalizedOptions.includes(input.value)) {
            selected.push(input.value);
          }
        }
        if (selected.length >= normalizedOptions.length) {
          return [];
        }
        return selected;
      }

      function currentFilters() {
        return {
          timeWindow: filterTime.value || "any",
          labels: selectedLabels,
          assignees: selectedAssignees,
          query: (filterQuery.value || "").trim(),
          sortBy: filterSort.value || "updated-desc",
        };
      }

      function setFilters(filters, availableLabels, availableAssignees) {
        const value = filters || {};
        const labelOptions = normalizeSelection(availableLabels);
        const assigneeOptions = normalizeSelection(availableAssignees);
        filterTime.value = value.timeWindow || "any";
        selectedLabels = normalizeSelection(value.labels).filter((label) => labelOptions.includes(label));
        selectedAssignees = normalizeSelection(value.assignees).filter((assignee) => assigneeOptions.includes(assignee));
        renderMultiOptions(labelsOptions, labelsSummary, selectedLabels, labelOptions, "All labels", "labels");
        renderMultiOptions(assigneesOptions, assigneesSummary, selectedAssignees, assigneeOptions, "All assignees", "assignees");
        filterQuery.value = value.query || "";
        filterSort.value = value.sortBy || "updated-desc";
      }

      function toggleAllCheckboxBehavior(container, event) {
        const target = event.target;
        if (!target || target.type !== "checkbox") {
          return;
        }
        if (target.dataset.all === "true" && target.checked) {
          const others = container.querySelectorAll("input[type='checkbox'][value]");
          for (const input of others) {
            input.checked = false;
          }
          return;
        }
        if (target.dataset.all !== "true" && target.checked) {
          const allInput = container.querySelector("input[data-all='true']");
          if (allInput) {
            allInput.checked = false;
          }
        }
      }

      async function syncAndRefresh() {
        await syncWithFilters();
        await loadState();
      }

      function queueAutoSync(delay = 220) {
        if (autoSyncTimer) {
          clearTimeout(autoSyncTimer);
          autoSyncTimer = null;
        }
        autoSyncTimer = setTimeout(async () => {
          if (isAutoSyncing) {
            needsAutoResync = true;
            return;
          }
          isAutoSyncing = true;
          try {
            await syncAndRefresh();
          } finally {
            isAutoSyncing = false;
            if (needsAutoResync) {
              needsAutoResync = false;
              queueAutoSync(80);
            }
          }
        }, delay);
      }

      labelsOptions.addEventListener("change", (event) => {
        toggleAllCheckboxBehavior(labelsOptions, event);
        selectedLabels = syncSelectionsFromDom(labelsOptions, (state && state.availableLabels) || []);
        renderMultiOptions(labelsOptions, labelsSummary, selectedLabels, (state && state.availableLabels) || [], "All labels", "labels");
        queueAutoSync(150);
      });
      assigneesOptions.addEventListener("change", (event) => {
        toggleAllCheckboxBehavior(assigneesOptions, event);
        selectedAssignees = syncSelectionsFromDom(assigneesOptions, (state && state.availableAssignees) || []);
        renderMultiOptions(
          assigneesOptions,
          assigneesSummary,
          selectedAssignees,
          (state && state.availableAssignees) || [],
          "All assignees",
          "assignees",
        );
        queueAutoSync(150);
      });

      function wait(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }

      function showActionFeedback(message, tone) {
        if (feedbackTimeoutId) {
          clearTimeout(feedbackTimeoutId);
          feedbackTimeoutId = null;
        }
        actionFeedback.textContent = message;
        actionFeedback.classList.remove("error", "success");
        actionFeedback.classList.add(tone || "success", "show");
        feedbackTimeoutId = setTimeout(() => {
          actionFeedback.classList.remove("show");
        }, 1200);
      }

      function setBusy(value) {
        if (!busyIndicator) return;
        busyIndicator.classList.toggle("show", !!value);
      }

      function decisionLabel(decision) {
        if (decision === "assign_agent") return "Assigned to agent";
        if (decision === "needs_info") return "Marked needs info";
        if (decision === "not_now") return "Marked not now";
        if (decision === "close") return "Marked close";
        if (decision === "ignore") return "Marked ignore";
        return decision;
      }

      function decisionAnimationClass(decision) {
        if (decision === "assign_agent") return "card-exit-right";
        if (decision === "needs_info" || decision === "not_now") return "card-exit-up";
        if (decision === "close") return "card-exit-left";
        if (decision === "ignore") return "card-exit-down";
        return "card-exit-up";
      }

      function decisionCelebrate(decision) {
        if (decision === "assign_agent") return { icon: "🚀", text: "Assigned" };
        if (decision === "needs_info") return { icon: "📝", text: "Needs info" };
        if (decision === "not_now") return { icon: "⏳", text: "Not now" };
        if (decision === "close") return { icon: "✅", text: "Closed" };
        if (decision === "ignore") return { icon: "🫥", text: "Ignored" };
        return { icon: "✨", text: "Done" };
      }

      async function playJingle() {
        try {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (!AudioCtx) return;
          const ctx = new AudioCtx();
          if (ctx.state === "suspended") {
            await ctx.resume();
          }
          const sequence = [659.25, 783.99, 987.77];
          const start = ctx.currentTime;
          sequence.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, start + i * 0.1);
            gain.gain.setValueAtTime(0.0001, start + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.06, start + i * 0.1 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + i * 0.1 + 0.14);
            osc.connect(gain).connect(ctx.destination);
            osc.start(start + i * 0.1);
            osc.stop(start + i * 0.1 + 0.15);
          });
          setTimeout(() => ctx.close().catch(() => {}), 420);
        } catch {
        }
      }

      async function playCelebrateMoment(decision) {
        const fx = decisionCelebrate(decision);
        celebrateIcon.textContent = fx.icon;
        celebrateText.textContent = fx.text;
        celebrateFx.classList.add("show");
        await playJingle();
        await wait(760);
        celebrateFx.classList.remove("show");
      }

      function actionMessage(item, decision, extra) {
        const title = (item && item.title ? item.title : "").replace(/^#\\d+\\s*/, "");
        const suffix = title ? (": " + title) : "";
        if (decision === "assign_agent") {
          return "Started implementation session" + suffix;
        }
        return decisionLabel(decision) + suffix;
      }

      function escapeHtml(value) {
        return String(value || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }

      function renderMarkdown(markdown) {
        const raw = String(markdown || "").replace(/\\r/g, "").trim();
        if (!raw) {
          return "<p class=\\"muted\\">No issue description was provided.</p>";
        }
        const limited = raw.length > 2200 ? (raw.slice(0, 2197).trimEnd() + "...") : raw;
        const codeBlocks = [];
        const withTokens = limited.replace(/\\x60{3}([\\s\\S]*?)\\x60{3}/g, (_, code) => {
          const codeText = String(code || "").trim();
          const index = codeBlocks.push(codeText.length > 900 ? (codeText.slice(0, 897) + "...") : codeText) - 1;
          return "@@CODEBLOCK" + index + "@@";
        });

        const inline = (text) => escapeHtml(text)
          .replace(/\\[([^\\]]+)\\]\\((https?:\\/\\/[^)\\s]+)\\)/g, "<a target=\\"_blank\\" rel=\\"noreferrer\\" href=\\"$2\\">$1</a>")
          .replace(/\\*\\*([^*]+)\\*\\*/g, "<strong>$1</strong>")
          .replace(/__([^_]+)__/g, "<strong>$1</strong>")
          .replace(/\\*([^*\\n]+)\\*/g, "<em>$1</em>")
          .replace(/_([^_\\n]+)_/g, "<em>$1</em>")
          .replace(/\\x60([^\\x60]+)\\x60/g, "<code>$1</code>");

        const blocks = withTokens.split(/\\n{2,}/).map((part) => part.trim()).filter(Boolean);
        const html = blocks.map((block) => {
          const codeMatch = block.match(/^@@CODEBLOCK(\\d+)@@$/);
          if (codeMatch) {
            const code = codeBlocks[Number(codeMatch[1])] || "";
            return "<pre><code>" + escapeHtml(code) + "</code></pre>";
          }
          if (/^#{1,6}\\s/.test(block)) {
            const level = Math.min(4, Math.max(3, (block.match(/^#{1,6}/) || ["###"])[0].length));
            const text = block.replace(/^#{1,6}\\s+/, "");
            return "<h" + level + ">" + inline(text) + "</h" + level + ">";
          }
          const lines = block.split("\\n").map((line) => line.trim()).filter(Boolean);
          if (lines.length > 0 && lines.every((line) => /^[-*]\\s+/.test(line))) {
            return "<ul>" + lines.map((line) => "<li>" + inline(line.replace(/^[-*]\\s+/, "")) + "</li>").join("") + "</ul>";
          }
          if (lines.length > 0 && lines.every((line) => /^\\d+\\.\\s+/.test(line))) {
            return "<ol>" + lines.map((line) => "<li>" + inline(line.replace(/^\\d+\\.\\s+/, "")) + "</li>").join("") + "</ol>";
          }
          if (lines.length > 0 && lines.every((line) => /^>\\s?/.test(line))) {
            return "<blockquote>" + inline(lines.map((line) => line.replace(/^>\\s?/, "")).join(" ")) + "</blockquote>";
          }
          return "<p>" + inline(lines.join(" ")) + "</p>";
        }).join("");
        return html || "<p class=\\"muted\\">No issue description was provided.</p>";
      }

      function displayItem(item) {
        activeItem = item || null;
        if (!item) {
          itemTitle.textContent = "No pending backlog items";
          issuePill.textContent = "All done";
          itemDetails.textContent = "All items are triaged.";
          workStatus.innerHTML = "";
          metaTop.innerHTML = "";
          meta.innerHTML = "";
          return;
        }
        itemTitle.textContent = item.title;
        issuePill.textContent = item.number ? ("Issue #" + item.number) : "Issue";
        itemDetails.innerHTML = renderMarkdown(item.description);
        const statusEntries = Array.isArray(item.workStatus) ? item.workStatus : [];
        workStatus.innerHTML = statusEntries
          .map((entry) => "<span class=\\"pill status-pill\\">" + escapeHtml(entry && entry.label ? entry.label : "") + "</span>")
          .join("");
        const detailParts = (item.details || "")
          .split("|")
          .map((part) => part.trim())
          .filter(Boolean);
        metaTop.innerHTML = detailParts
          .map((part) => "<span class=\\"pill\\">" + escapeHtml(part) + "</span>")
          .join("");
        const pills = [];
        if (item.repo) pills.push({ label: "Repo", value: item.repo });
        if (Array.isArray(item.labels) && item.labels.length > 0) {
          pills.push({ label: "Labels", value: item.labels.join(", ") });
        }
        if (Array.isArray(item.assignees) && item.assignees.length > 0) {
          pills.push({ label: "Assignees", value: item.assignees.join(", ") });
        }
        meta.innerHTML = pills
          .map((p) => "<span class=\\"pill\\">" + escapeHtml(p.label) + ": " + escapeHtml(p.value) + "</span>")
          .join("");
        if (item.url) {
          meta.innerHTML += "<a class=\\"pill issue-link\\" target=\\"_blank\\" rel=\\"noreferrer\\" href=\\"" + escapeHtml(item.url) + "\\">Open issue ↗</a>";
        }
      }

      function refreshView() {
        const pending = state ? state.pending || [] : [];
        const resolved = state ? state.resolved || [] : [];
        counts.textContent = "Pending: " + pending.length + " | Triaged: " + resolved.length;
        const repoText = state && state.repo ? state.repo : "No repo";
        const syncedText = state && state.syncedAt ? ("Synced " + state.syncedAt.slice(0, 16).replace("T", " ")) : "Not synced yet";
        boardMeta.textContent = repoText + " • " + syncedText;
        displayItem(pending[0]);
        const c = state && state.decisionCounts ? state.decisionCounts : {};
        summaryText.textContent = "assign_agent=" + (c.assign_agent || 0) +
          " | needs_info=" + (c.needs_info || 0) +
          " | not_now=" + (c.not_now || 0) +
          " | close=" + (c.close || 0) +
          " | ignore=" + (c.ignore || 0);
      }

      async function loadState() {
        const res = await fetch("/state");
        state = await res.json();
        setFilters(state.filters || {}, state.availableLabels || [], state.availableAssignees || []);
        refreshView();
      }

      async function syncWithFilters(options) {
        const opts = options || {};
        const payload = { filters: currentFilters() };
        if (opts.resetDecisions) {
          payload.resetDecisions = true;
        }
        await fetch("/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      async function triage(decision, extra) {
        if (!activeItem || isAnimating) return;
        isAnimating = true;
        setBusy(true);
        let busyCleared = false;
        const currentItem = activeItem;
        const payload = Object.assign({ itemId: activeItem.id, decision: decision }, extra || {});
        try {
          const response = await fetch("/decision", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText || "Failed to apply action");
          }
          const animationClass = decisionAnimationClass(decision);
          showActionFeedback(actionMessage(currentItem, decision, extra), "success");
          choices.classList.remove("show");
          card.classList.add(animationClass);
          await wait(380);
          card.classList.add("card-hidden");
          card.classList.remove(animationClass);
          card.style.transform = "translate(0, 0) rotate(0deg)";
          setBusy(false);
          busyCleared = true;
          await playCelebrateMoment(decision);
          await loadState();
          requestAnimationFrame(() => card.classList.remove("card-hidden"));
        } catch (error) {
          showActionFeedback(error && error.message ? error.message : "Failed to apply action", "error");
          card.classList.remove("card-hidden");
          card.style.transform = "translate(0, 0) rotate(0deg)";
        } finally {
          if (!busyCleared) {
            setBusy(false);
          }
          isAnimating = false;
        }
      }

      document.getElementById("btnSync").onclick = async () => {
        await syncAndRefresh();
      };
      document.getElementById("btnApplyFilters").onclick = async () => {
        await syncAndRefresh();
      };
      document.getElementById("btnResetFilters").onclick = async () => {
        setFilters(
          { timeWindow: "any", labels: [], assignees: [], query: "", sortBy: "updated-desc" },
          (state && state.availableLabels) || [],
          (state && state.availableAssignees) || [],
        );
        await syncWithFilters({ resetDecisions: true });
        await loadState();
      };
      filterTime.addEventListener("change", () => queueAutoSync(120));
      filterSort.addEventListener("change", () => queueAutoSync(120));
      filterQuery.addEventListener("input", () => queueAutoSync(300));
      document.getElementById("btnClose").onclick = () => triage("close");
      document.getElementById("btnIgnore").onclick = () => triage("ignore");
      document.getElementById("btnAssign").onclick = async () => {
        if (!activeItem) return;
        await triage("assign_agent");
      };
      document.getElementById("btnOptions").onclick = () => choices.classList.toggle("show");
      choices.addEventListener("click", async (event) => {
        const target = event.target;
        if (!target || !target.dataset || !target.dataset.decision) return;
        const decision = target.dataset.decision;
        const note = target.dataset.note || "";
        await triage(decision, { note, quickResponse: true });
      });

      document.addEventListener("keydown", async (event) => {
        if (event.key === "ArrowLeft") await triage("close");
        else if (event.key === "ArrowRight") {
          await triage("assign_agent");
        } else if (event.key === "ArrowUp") choices.classList.toggle("show");
        else if (event.key === "ArrowDown") await triage("ignore");
      });

      card.addEventListener("pointerdown", (event) => {
        const target = event.target;
        if (target && target.closest && target.closest("a, button, input, select, summary, label")) {
          dragStart = null;
          return;
        }
        dragStart = { x: event.clientX, y: event.clientY };
        card.setPointerCapture(event.pointerId);
      });
      card.addEventListener("pointermove", (event) => {
        if (!dragStart) return;
        const dx = event.clientX - dragStart.x;
        const dy = event.clientY - dragStart.y;
        card.style.transform = "translate(" + dx + "px, " + dy + "px) rotate(" + (dx / 20) + "deg)";
      });
      card.addEventListener("pointerup", async (event) => {
        if (!dragStart) return;
        const dx = event.clientX - dragStart.x;
        const dy = event.clientY - dragStart.y;
        dragStart = null;
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 110) {
          if (dx > 0) {
            await triage("assign_agent");
          } else {
            await triage("close");
          }
          return;
        }
        if (Math.abs(dy) > 110) {
          if (dy < 0) choices.classList.toggle("show");
          else await triage("ignore");
          card.style.transform = "translate(0, 0) rotate(0deg)";
          return;
        }
        card.style.transform = "translate(0, 0) rotate(0deg)";
      });

      loadState();
    </script>
  </body>
</html>`;
}

function readJson(req, maxBytes = MAX_REQUEST_BODY_BYTES) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let totalBytes = 0;
        let settled = false;
        req.on("data", (chunk) => {
            if (settled) {
                return;
            }
            totalBytes += chunk.length;
            if (totalBytes > maxBytes) {
                settled = true;
                const error = new Error(`Request body exceeds ${maxBytes} bytes.`);
                error.statusCode = 413;
                req.destroy(error);
                reject(error);
                return;
            }
            chunks.push(chunk);
        });
        req.on("end", () => {
            if (settled) {
                return;
            }
            const raw = Buffer.concat(chunks).toString("utf8");
            if (!raw) {
                resolve({});
                return;
            }
            try {
                resolve(JSON.parse(raw));
            } catch (error) {
                error.statusCode = 400;
                reject(error);
            }
        });
        req.on("error", (error) => {
            if (settled) {
                return;
            }
            settled = true;
            reject(error);
        });
    });
}

async function handleServerRequest(instanceId, req, res) {
    const entry = servers.get(instanceId);
    if (!entry) {
        res.statusCode = 404;
        res.end("Instance not found");
        return;
    }

    await ensureStorageLoaded();
    const board = getOrCreateBoard(entry.boardId);
    board.title = entry.title;
    const cwd = entry.cwd || null;

    if (req.method === "GET" && req.url === "/") {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(renderHtml(instanceId, board.title));
        return;
    }

    if (req.method === "GET" && req.url === "/state") {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify(buildBoardState(board)));
        return;
    }

    if (req.method === "POST" && req.url === "/sync") {
        try {
            const payload = await readJson(req);
            const repo = normalizeText(payload?.repo);
            if (repo) {
                board.repo = repo;
            }
            if (payload?.resetDecisions === true) {
                resetBoardDecisions(board);
            }
            await syncBoardFromRepo(board, payload?.filters, cwd);
            await persistStorage();
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify(buildBoardState(board)));
        } catch (error) {
            res.statusCode = error?.statusCode || 500;
            res.end(error instanceof Error ? error.message : "Failed to sync from repo");
        }
        return;
    }

    if (req.method === "POST" && req.url === "/decision") {
        let payload;
        try {
            payload = await readJson(req);
        } catch (error) {
            res.statusCode = error?.statusCode || 400;
            res.end(
                error?.statusCode === 413
                    ? "Request body too large"
                    : "Invalid JSON payload",
            );
            return;
        }

        const itemId = normalizeText(payload?.itemId);
        const decision = normalizeText(payload?.decision);
        const item = board.items.find((candidate) => candidate.id === itemId);
        if (!itemId || !decision) {
            res.statusCode = 400;
            res.end("itemId and decision are required");
            return;
        }
        if (!item) {
            res.statusCode = 404;
            res.end(`Item "${itemId}" not found`);
            return;
        }
        if (decision === "close") {
            await closeGithubIssue(board, item, payload?.note, cwd || process.cwd());
        }
        if (payload?.quickResponse === true && decision !== "close" && normalizeText(payload?.note)) {
            await commentGithubIssue(board, item, payload?.note, cwd || process.cwd());
        }
        if (decision === "assign_agent") {
            const sessionStatus = await startImplementationSession(board, item, payload?.agent, payload?.note);
            board.workStatus[itemId] = {
                ...sessionStatus,
                agent: normalizeText(payload?.agent),
            };
        }

        applyBoardDecision(board, itemId, decision, {
            agent: payload?.agent,
            note: payload?.note,
        });
        await persistStorage();
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify(buildBoardState(board)));
        return;
    }

    res.statusCode = 404;
    res.end("Not found");
}

async function startServer(instanceId, cwd) {
    const server = createServer((req, res) => {
        handleServerRequest(instanceId, req, res).catch((error) => {
            if (res.headersSent) {
                res.end();
                return;
            }
            res.statusCode = error?.statusCode || 500;
            res.end(error instanceof Error ? error.message : "Internal server error");
        });
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    return { server, url: `http://127.0.0.1:${port}/`, cwd };
}

const session = await joinSession({
    canvases: [
        createCanvas({
            id: "backlog-swipe-triage",
            displayName: "Backlog Swipe Triage",
            description: "Tinder-style backlog triage with swipe directions for assign, needs info, not now, close, and ignore.",
            inputSchema: {
                type: "object",
                properties: {
                    boardId: { type: "string", minLength: 1 },
                    title: { type: "string", minLength: 1 },
                    syncFromRepo: { type: "boolean" },
                    repo: { type: "string", minLength: 1 },
                    filters: filterSchema,
                    items: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                title: { type: "string" },
                                details: { type: "string" },
                                repo: { type: "string" },
                                number: { type: "string" },
                                url: { type: "string" },
                            },
                            required: ["title"],
                            additionalProperties: true,
                        },
                    },
                },
                additionalProperties: false,
            },
            actions: [
                {
                    name: "sync_from_repo",
                    description: "Load open issues from the current repository into the triage board.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            boardId: { type: "string", minLength: 1 },
                            title: { type: "string" },
                            repo: { type: "string", minLength: 1 },
                            filters: filterSchema,
                        },
                        required: ["boardId"],
                        additionalProperties: false,
                    },
                    handler: async (ctx) => {
                        const cwd = cwdForContext(ctx);
                        await ensureStorageLoaded();
                        const board = getOrCreateBoard(normalizeText(ctx.input?.boardId, "default"));
                        const title = normalizeText(ctx.input?.title);
                        if (title) {
                            board.title = title;
                        }
                        const repo = normalizeText(ctx.input?.repo);
                        if (repo) {
                            board.repo = repo;
                        }
                        await syncBoardFromRepo(board, ctx.input?.filters, cwd);
                        await persistStorage();
                        return buildBoardState(board);
                    },
                },
                {
                    name: "seed_backlog",
                    description: "Seed or update backlog items for a triage board.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            boardId: { type: "string", minLength: 1 },
                            title: { type: "string" },
                            replace: { type: "boolean" },
                            items: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        title: { type: "string" },
                                        details: { type: "string" },
                                        repo: { type: "string" },
                                        number: { type: "string" },
                                        url: { type: "string" },
                                    },
                                    required: ["title"],
                                    additionalProperties: true,
                                },
                            },
                        },
                        required: ["boardId", "items"],
                        additionalProperties: false,
                    },
                    handler: async (ctx) => {
                        await ensureStorageLoaded();
                        const boardId = normalizeText(ctx.input?.boardId, "default");
                        const board = getOrCreateBoard(boardId);
                        const title = normalizeText(ctx.input?.title);
                        if (title) {
                            board.title = title;
                        }
                        setBoardItems(board, ctx.input?.items, ctx.input?.replace !== false);
                        await persistStorage();
                        return buildBoardState(board);
                    },
                },
                {
                    name: "apply_decision",
                    description: "Apply a triage decision to a backlog item.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            boardId: { type: "string", minLength: 1 },
                            itemId: { type: "string", minLength: 1 },
                            decision: { type: "string", enum: decisions },
                            agent: { type: "string" },
                            note: { type: "string" },
                            commentOnIssue: { type: "boolean" },
                        },
                        required: ["boardId", "itemId", "decision"],
                        additionalProperties: false,
                    },
                    handler: async (ctx) => {
                        const cwd = cwdForContext(ctx);
                        await ensureStorageLoaded();
                        const board = getOrCreateBoard(normalizeText(ctx.input?.boardId, "default"));
                        const itemId = normalizeText(ctx.input?.itemId);
                        const item = board.items.find((candidate) => candidate.id === itemId);
                        const decision = normalizeText(ctx.input?.decision);
                        if (!item) {
                            throw new Error(`Item "${itemId}" not found`);
                        }
                        if (decision === "close") {
                            await closeGithubIssue(board, item, ctx.input?.note, cwd || process.cwd());
                        }
                        if (ctx.input?.commentOnIssue === true && decision !== "close" && normalizeText(ctx.input?.note)) {
                            await commentGithubIssue(board, item, ctx.input?.note, cwd || process.cwd());
                        }
                        if (decision === "assign_agent") {
                            const sessionStatus = await startImplementationSession(board, item, ctx.input?.agent, ctx.input?.note);
                            board.workStatus[itemId] = {
                                ...sessionStatus,
                                agent: normalizeText(ctx.input?.agent),
                            };
                        }
                        applyBoardDecision(board, itemId, decision, {
                            agent: ctx.input?.agent,
                            note: ctx.input?.note,
                        });
                        await persistStorage();
                        return buildBoardState(board);
                    },
                },
                {
                    name: "get_board",
                    description: "Get pending and triaged items for a triage board.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            boardId: { type: "string", minLength: 1 },
                        },
                        required: ["boardId"],
                        additionalProperties: false,
                    },
                    handler: async (ctx) => {
                        await ensureStorageLoaded();
                        const board = getOrCreateBoard(normalizeText(ctx.input?.boardId, "default"));
                        return buildBoardState(board);
                    },
                },
            ],
            open: async (ctx) => {
                let entry = servers.get(ctx.instanceId);
                const cwd = cwdForContext(ctx);
                await ensureStorageLoaded();
                const boardId = normalizeText(ctx.input?.boardId, "default");
                const board = getOrCreateBoard(boardId);
                const title = normalizeText(ctx.input?.title, board.title || "Backlog Triage");
                board.title = title;
                const repo = normalizeText(ctx.input?.repo);
                if (repo) {
                    board.repo = repo;
                }
                if (ctx.input?.filters && typeof ctx.input.filters === "object") {
                    board.filters = normalizeFilters(ctx.input.filters, board.filters || defaultFilters);
                } else if (!board.filters) {
                    board.filters = { ...defaultFilters };
                }
                const syncFromRepo = ctx.input?.syncFromRepo !== false;
                if (Array.isArray(ctx.input?.items) && ctx.input.items.length > 0) {
                    setBoardItems(board, ctx.input.items, true);
                    await persistStorage();
                } else if (syncFromRepo) {
                    await syncBoardFromRepo(board, board.filters, cwd);
                    await persistStorage();
                }

                if (!entry) {
                    entry = await startServer(ctx.instanceId, cwd);
                    servers.set(ctx.instanceId, entry);
                }
                entry.boardId = boardId;
                entry.title = title;
                entry.cwd = cwd;
                return {
                    title,
                    status: "Swipe to triage backlog",
                    url: entry.url,
                };
            },
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (entry) {
                    servers.delete(ctx.instanceId);
                    await new Promise((resolve) => entry.server.close(() => resolve()));
                }
            },
        }),
    ],
});
activeSession = session;
