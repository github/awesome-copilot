import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { unsafePatternReason } from "./pattern.mjs";

export const CANVAS_ID = "agent-session-board";
export const FORMAT = "agent-session-board/board";
export const VERSION = 1;
export const DEMO_KEY = "demo";

export class StoreError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}

function copilotHome() {
    const env = process.env.COPILOT_HOME;
    return env && env.length > 0 ? env : path.join(os.homedir(), ".copilot");
}

export function dataDir() {
    return path.join(copilotHome(), "extension-data", CANVAS_ID);
}

// One file per repository keeps boards independent; "owner__name" cannot collide with the demo key.
export function boardFileName(key) {
    if (key === DEMO_KEY) return "demo.json";
    const [owner, name, extra] = String(key).toLowerCase().split("/");
    if (extra !== undefined || !owner || !name || !/^[a-z0-9-]+$/.test(owner) || !/^[a-z0-9_.-]+$/.test(name) || /^\.+$/.test(name)) {
        throw new StoreError("invalid_repo", `Cannot derive a board file name from ${JSON.stringify(key)}.`);
    }
    return `${owner}__${name}.json`;
}

export function defaultBoard() {
    return {
        sessions: [],
        tracks: [],
        epics: [],
        decisionLabel: "",
        coordinationIssue: 0,
        lockPrefixes: { lock: "merge lock:", reserve: "merge reserve:", release: "merge lock release:" },
        lockAuthors: [],
        localResources: { enabled: false, heavyPattern: "", maxHeavy: 2 },
        idleMinutes: 90,
        language: "en",
        decisions: [],
        answers: {},
    };
}

function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Refuses anything this extension did not write, so a foreign or newer file is never overwritten.
export function validateDocument(data, where = "board file") {
    if (!isObject(data) || data.format !== FORMAT) {
        throw new StoreError("store_unrecognized", `Unrecognized data in ${where}; leaving it untouched.`);
    }
    if (data.version !== VERSION) {
        throw new StoreError("store_version", `Unsupported version ${JSON.stringify(data.version)} in ${where}.`);
    }
    const board = data.board;
    if (!isObject(board)) throw new StoreError("store_corrupt", `${where} has no board object.`);
    for (const key of ["sessions", "tracks", "epics", "decisions", "lockAuthors"]) {
        if (board[key] !== undefined && !Array.isArray(board[key])) {
            throw new StoreError("store_corrupt", `${where}: board.${key} must be an array.`);
        }
    }
    for (const key of ["answers", "lockPrefixes", "localResources"]) {
        if (board[key] !== undefined && !isObject(board[key])) {
            throw new StoreError("store_corrupt", `${where}: board.${key} must be an object.`);
        }
    }
    return data;
}

export function parseDocument(raw, where) {
    let data;
    try {
        data = JSON.parse(raw);
    } catch {
        throw new StoreError("store_corrupt", `${where} is not valid JSON; leaving it untouched.`);
    }
    return validateDocument(data, where);
}

function mergeBoard(stored) {
    const base = defaultBoard();
    return {
        ...base,
        ...stored,
        lockPrefixes: { ...base.lockPrefixes, ...(stored?.lockPrefixes || {}) },
        localResources: { ...base.localResources, ...(stored?.localResources || {}) },
    };
}

export async function getBoard(key) {
    const file = path.join(dataDir(), boardFileName(key));
    const where = path.basename(file);
    let raw;
    try {
        raw = await fs.readFile(file, "utf8");
    } catch (error) {
        if (error.code === "ENOENT") return defaultBoard();
        throw new StoreError("store_read", `Could not read ${where}: ${error.message}`);
    }
    return mergeBoard(parseDocument(raw, where).board);
}

async function writeBoard(key, board) {
    const dir = dataDir();
    const file = path.join(dir, boardFileName(key));
    const doc = validateDocument({ format: FORMAT, version: VERSION, key, updatedAt: new Date().toISOString(), board }, path.basename(file));
    await fs.mkdir(dir, { recursive: true });
    const tmp = `${file}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`;
    try {
        await fs.writeFile(tmp, JSON.stringify(doc, null, 2), { encoding: "utf8", mode: 0o600 });
        await fs.rename(tmp, file);
    } catch (error) {
        await fs.rm(tmp, { force: true }).catch(() => {});
        throw new StoreError("store_write", `Could not write ${path.basename(file)}: ${error.message}`);
    }
}

const LOCK_STALE_MS = 5 * 60 * 1000;
const LOCK_WAIT_MS = 10 * 1000;
const TAKEOVER_STALE_MS = 30 * 1000;

async function readLock(lockPath) {
    try {
        const [text, stat] = await Promise.all([fs.readFile(lockPath, "utf8"), fs.stat(lockPath)]);
        const [pid, token] = text.trim().split(" ");
        return { pid: Number(pid), token: token || "", mtimeMs: stat.mtimeMs };
    } catch {
        return null;
    }
}

function processAlive(pid) {
    if (!Number.isInteger(pid) || pid <= 0) return false;
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return error.code === "EPERM";
    }
}

// A lock is abandoned when its writer process is gone, or when it is far older than any write takes.
// A lock without a token (written by an interrupted writer) has no owner to ask, so it gets a grace period.
function abandoned(lock) {
    if (!lock.token) return Date.now() - lock.mtimeMs > TAKEOVER_STALE_MS;
    return !processAlive(lock.pid) || Date.now() - lock.mtimeMs > LOCK_STALE_MS;
}

/**
 * Remove an abandoned lock. Takeovers are serialized through `<lock>.takeover`, and the lock is removed only
 * if it still carries the token that was judged abandoned, so a live replacement lock is never deleted.
 */
async function takeOver(lockPath, judged) {
    const takeoverPath = `${lockPath}.takeover`;
    let handle;
    try {
        handle = await fs.open(takeoverPath, "wx", 0o600);
    } catch (error) {
        if (error.code !== "EEXIST") return false;
        const stat = await fs.stat(takeoverPath).catch(() => null);
        if (stat && Date.now() - stat.mtimeMs > TAKEOVER_STALE_MS) await fs.rm(takeoverPath, { force: true });
        return false;
    }
    try {
        const current = await readLock(lockPath);
        if (current && current.token === judged.token && current.mtimeMs === judged.mtimeMs) {
            await fs.rm(lockPath, { force: true });
            return true;
        }
        return false;
    } finally {
        await handle.close().catch(() => {});
        await fs.rm(takeoverPath, { force: true }).catch(() => {});
    }
}

/**
 * Hold `<board>.lock` for the whole read-modify-write. Several Copilot sessions (separate processes)
 * may supervise the same repository, and an atomic rename alone would still let one overwrite another.
 */
async function withFileLock(key, fn) {
    const dir = dataDir();
    await fs.mkdir(dir, { recursive: true });
    const lockPath = path.join(dir, `${boardFileName(key)}.lock`);
    const token = crypto.randomBytes(12).toString("hex");
    const deadline = Date.now() + LOCK_WAIT_MS;
    // The lock content is written to a private file first and then hard-linked into place. link() fails if the
    // lock exists, so acquiring is atomic and a lock file is never visible empty.
    const draft = `${lockPath}.${token}.tmp`;
    await fs.writeFile(draft, `${process.pid} ${token}\n`, { mode: 0o600 });
    try {
        for (;;) {
            try {
                await fs.link(draft, lockPath);
                break;
            } catch (error) {
                if (error.code !== "EEXIST") throw new StoreError("store_lock", `Could not lock ${path.basename(lockPath)}: ${error.message}`);
                const lock = await readLock(lockPath);
                // Retry at once only after actually removing an abandoned lock; otherwise fall through to the deadline and backoff.
                if (lock && abandoned(lock) && (await takeOver(lockPath, lock))) continue;
                if (Date.now() > deadline) throw new StoreError("store_busy", `${path.basename(lockPath)} is held by another session; try again.`);
                await new Promise((resolve) => setTimeout(resolve, 40 + Math.floor(Math.random() * 60)));
            }
        }
    } finally {
        await fs.rm(draft, { force: true }).catch(() => {});
    }
    try {
        return await fn();
    } finally {
        // Release only our own lock, never one that replaced it.
        const current = await readLock(lockPath);
        if (current && current.token === token) await fs.rm(lockPath, { force: true }).catch(() => {});
    }
}

// Within one process, updates also queue per board so they do not spin on each other's lock file.
const queues = new Map();

export function updateBoard(key, mutate) {
    const previous = queues.get(key) || Promise.resolve();
    const next = previous.catch(() => {}).then(() => withFileLock(key, async () => {
        const board = await getBoard(key);
        const updated = mergeBoard(await mutate(board));
        await writeBoard(key, updated);
        return updated;
    }));
    queues.set(key, next);
    return next.finally(() => {
        if (queues.get(key) === next) queues.delete(key);
    });
}

// ---------------------------------------------------------------------------
// Input validation for configure_board, set_decisions and answers
// ---------------------------------------------------------------------------

const ID_RE = /^[a-z0-9][a-z0-9-]{0,60}$/;

function invalid(message) {
    return new StoreError("invalid_input", message);
}

function text(value, max) {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function httpsUrl(value) {
    return typeof value === "string" && /^https:\/\/github\.com\//.test(value) ? value.slice(0, 300) : "";
}

function pattern(value, where) {
    if (value === undefined || value === "") return "";
    if (typeof value !== "string" || value.length > 200) throw invalid(`${where} must be a regular expression of at most 200 characters.`);
    try {
        new RegExp(value, "i");
    } catch {
        throw invalid(`${where} is not a valid regular expression.`);
    }
    const unsafe = unsafePatternReason(value);
    if (unsafe) throw invalid(`${where} could backtrack catastrophically: ${unsafe}.`);
    return value;
}

function labelName(value, where) {
    if (typeof value !== "string" || !value.trim() || value.length > 50 || /["\n\r]/.test(value)) {
        throw invalid(`${where} must be a single label name (1-50 characters, no quotes).`);
    }
    return value.trim();
}

function list(value, where, max) {
    if (!Array.isArray(value)) throw invalid(`${where} must be an array.`);
    if (value.length > max) throw invalid(`${where} accepts at most ${max} entries.`);
    return value;
}

function sanitizeSessions(value) {
    const ids = new Set();
    return list(value, "sessions", 30).map((s, i) => {
        if (!isObject(s) || typeof s.id !== "string" || !ID_RE.test(s.id)) throw invalid(`sessions[${i}].id must be a kebab-case id.`);
        if (ids.has(s.id)) throw invalid(`Duplicate session id ${s.id}.`);
        ids.add(s.id);
        const patterns = (key) => list(s[key] ?? [], `sessions[${i}].${key}`, 20).map((p, j) => pattern(p, `sessions[${i}].${key}[${j}]`)).filter(Boolean);
        return {
            id: s.id,
            name: text(s.name, 80) || s.id,
            note: text(s.note, 200),
            link: httpsUrl(s.link),
            branchPatterns: patterns("branchPatterns"),
            titlePatterns: patterns("titlePatterns"),
            prs: list(s.prs ?? [], `sessions[${i}].prs`, 100).filter((n) => Number.isInteger(n) && n > 0),
        };
    });
}

function sanitizeTracks(value) {
    const labels = new Set();
    return list(value, "tracks", 30).map((t, i) => {
        if (!isObject(t)) throw invalid(`tracks[${i}] must be an object.`);
        const label = labelName(t.label, `tracks[${i}].label`);
        if (labels.has(label)) throw invalid(`Duplicate track label ${label}.`);
        labels.add(label);
        return { label, name: text(t.name, 60), note: text(t.note, 160), group: text(t.group, 40), titlePattern: pattern(t.titlePattern, `tracks[${i}].titlePattern`) };
    });
}

function sanitizeEpics(value) {
    return list(value, "epics", 40).map((e, i) => {
        if (!isObject(e) || !Number.isInteger(e.number) || e.number < 1) throw invalid(`epics[${i}].number must be a positive integer.`);
        return { number: e.number, name: text(e.name, 80), group: text(e.group, 40) };
    });
}

function sanitizeLockPrefixes(value, current) {
    if (!isObject(value)) throw invalid("lockPrefixes must be an object.");
    const next = { ...current };
    for (const key of ["lock", "reserve", "release"]) {
        if (value[key] === undefined) continue;
        if (typeof value[key] !== "string" || !value[key].trim() || value[key].length > 40 || /[\n\r]/.test(value[key])) {
            throw invalid(`lockPrefixes.${key} must be 1-40 characters on one line.`);
        }
        next[key] = value[key].trim();
    }
    const lowered = Object.values(next).map((p) => p.toLowerCase());
    if (new Set(lowered).size !== lowered.length) throw invalid("lockPrefixes must be distinct.");
    return next;
}

function sanitizeLocalResources(value, current) {
    if (!isObject(value)) throw invalid("localResources must be an object.");
    const next = { ...current };
    if (value.enabled !== undefined) {
        if (typeof value.enabled !== "boolean") throw invalid("localResources.enabled must be a boolean.");
        next.enabled = value.enabled;
    }
    if (value.heavyPattern !== undefined) next.heavyPattern = pattern(value.heavyPattern, "localResources.heavyPattern");
    if (value.maxHeavy !== undefined) {
        if (!Number.isInteger(value.maxHeavy) || value.maxHeavy < 0 || value.maxHeavy > 64) throw invalid("localResources.maxHeavy must be an integer from 0 to 64.");
        next.maxHeavy = value.maxHeavy;
    }
    return next;
}

/** Validate a configure_board input against the current board and return the fields to change. */
export function configPatch(input, board) {
    if (!isObject(input)) throw invalid("Input must be an object.");
    const patch = {};
    if (input.sessions !== undefined) patch.sessions = sanitizeSessions(input.sessions);
    if (input.tracks !== undefined) patch.tracks = sanitizeTracks(input.tracks);
    if (input.epics !== undefined) patch.epics = sanitizeEpics(input.epics);
    if (input.decisionLabel !== undefined) patch.decisionLabel = input.decisionLabel === "" ? "" : labelName(input.decisionLabel, "decisionLabel");
    if (input.coordinationIssue !== undefined) {
        if (!Number.isInteger(input.coordinationIssue) || input.coordinationIssue < 0) throw invalid("coordinationIssue must be a non-negative integer (0 disables the lock lane).");
        patch.coordinationIssue = input.coordinationIssue;
    }
    if (input.lockPrefixes !== undefined) patch.lockPrefixes = sanitizeLockPrefixes(input.lockPrefixes, board.lockPrefixes);
    if (input.lockAuthors !== undefined) {
        patch.lockAuthors = list(input.lockAuthors, "lockAuthors", 50).map((a, i) => {
            if (typeof a !== "string" || !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})(?:\[bot\])?$/.test(a)) throw invalid(`lockAuthors[${i}] must be a GitHub login.`);
            return a;
        });
    }
    if (input.localResources !== undefined) patch.localResources = sanitizeLocalResources(input.localResources, board.localResources);
    if (input.language !== undefined) {
        if (input.language !== "en" && input.language !== "ko") throw invalid('language must be "en" or "ko".');
        patch.language = input.language;
    }
    if (input.idleMinutes !== undefined) {
        if (!Number.isInteger(input.idleMinutes) || input.idleMinutes < 5 || input.idleMinutes > 1440) throw invalid("idleMinutes must be an integer from 5 to 1440.");
        patch.idleMinutes = input.idleMinutes;
    }
    return patch;
}

export function sanitizeDecisions(value) {
    const ids = new Set();
    return list(value, "items", 50).map((item, i) => {
        if (!isObject(item) || typeof item.title !== "string" || !item.title.trim()) throw invalid(`items[${i}].title is required.`);
        // Without an id, derive one from the title so separate calls never reuse the same id for different questions.
        const id = item.id === undefined ? `q-${crypto.createHash("sha256").update(item.title.trim()).digest("hex").slice(0, 10)}` : item.id;
        if (typeof id !== "string" || !ID_RE.test(id) || id.startsWith("gh-")) throw invalid(`items[${i}].id must be kebab-case and must not start with "gh-".`);
        if (ids.has(id)) throw invalid(`Duplicate item id ${id}.`);
        ids.add(id);
        return {
            id,
            title: text(item.title, 200),
            detail: text(item.detail, 600),
            url: httpsUrl(item.url),
            options: list(item.options ?? [], `items[${i}].options`, 8).map((o) => text(String(o), 120)).filter(Boolean),
        };
    });
}

/** An answer from the board page: a known id shape, the question revision it answers, and 1-1000 characters. */
export function validAnswer(body) {
    const id = typeof body?.id === "string" ? body.id : "";
    const rev = typeof body?.rev === "string" ? body.rev : "";
    const answer = typeof body?.answer === "string" ? body.answer.trim() : "";
    if (!(ID_RE.test(id) || /^gh-\d{1,7}$/.test(id)) || !/^[0-9a-f]{64}$/.test(rev) || !answer || answer.length > 1000) return null;
    return { id, rev, answer };
}
