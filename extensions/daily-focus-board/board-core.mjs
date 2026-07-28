// board-core.mjs — SDK-free core for the daily-focus-board canvas extension.
//
// Everything here is independent of @github/copilot-sdk so it can be unit-tested
// headlessly (start a server, hit the API, inspect the state file). extension.mjs
// imports from here and only adds the canvas/session wiring.
//
// The board's single source of truth is a JSON state file. Both the canvas UI
// (via the local HTTP API) and the AI partner (via extension actions) read and
// mutate that same file, so the agent can "mark X done" from chat and summarize
// the day — the file-backed "close the loop" upgrade over the localStorage skill.

import { createServer } from "node:http";
import { readFile, writeFile, rename, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BOARD_HTML_PATH = join(__dirname, "assets", "board.html");
const JSON_HEADERS = { "Content-Type": "application/json" };

// --- security ---------------------------------------------------------------

// Reject a state-mutating POST that a browser marks as cross-site. Mirrors the
// workshop signals-dashboard guard: same-origin fetches from the served page
// carry an Origin equal to the host (allowed); anything else is blocked so a
// random web page can't drive the local board server.
export function isCrossSiteRequest(req) {
    const origin = req.headers.origin;
    if (origin) {
        if (origin === `http://${req.headers.host}`) return false;
        if (origin === "null") return true;
        if (/^https?:\/\//i.test(origin)) return true;
        return false;
    }
    const site = req.headers["sec-fetch-site"];
    return site === "cross-site" || site === "same-site";
}

// Task ids double as object keys and HTML data-attributes, so keep them tight.
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const TAG_COLORS = ["new", "deadline", "career"];
export function validId(s) { return typeof s === "string" && ID_RE.test(s); }
function text(s, max = 2000) { return typeof s === "string" ? s.slice(0, max) : ""; }
function num(v) {
    if (v === undefined || v === null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
}
function slug(s) {
    return text(s, 64).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

// --- state file: normalize, load, atomic write, per-file serialize ----------

export function todayKey() { return new Date().toISOString().slice(0, 10); }

function normalizeTaskDef(t) {
    const o = { id: t.id };
    if (t.emoji) o.emoji = text(t.emoji, 8);
    o.title = text(t.title, 200) || t.id;
    if (t.sub) o.sub = text(t.sub, 200);
    if (t.tag) o.tag = text(t.tag, 40);
    if (t.tagc && TAG_COLORS.includes(t.tagc)) o.tagc = t.tagc;
    if (t.due) o.due = text(t.due, 40);
    const goal = num(t.goal);
    if (goal !== undefined && goal > 0) {
        o.goal = Math.round(goal);
        o.start = Math.max(0, Math.round(num(t.start) || 0));
        const inc = num(t.inc);
        if (inc !== undefined) o.inc = Math.max(1, Math.round(inc));
        if (t.unit) o.unit = text(t.unit, 20);
    }
    return o;
}

// Coerce any parsed JSON into a well-formed board doc, and ensure every task has
// a matching progress entry so the UI and mutations can assume presence.
export function normalize(doc) {
    doc = doc && typeof doc === "object" ? doc : {};
    if (typeof doc.name !== "string") doc.name = "";
    if (typeof doc.dateKey !== "string") doc.dateKey = todayKey();
    doc.tasks = Array.isArray(doc.tasks) ? doc.tasks.filter(t => t && validId(t.id)).map(normalizeTaskDef) : [];

    const p = doc.progress && typeof doc.progress === "object" ? doc.progress : {};
    p.counters = p.counters && typeof p.counters === "object" ? p.counters : {};
    p.t = p.t && typeof p.t === "object" ? p.t : {};
    p.day = Array.isArray(p.day) ? p.day : [];
    p.brain = Array.isArray(p.brain) ? p.brain : [];
    p.focus = validId(p.focus) ? p.focus : null;
    p.rm = !!p.rm;

    for (const t of doc.tasks) {
        if (typeof t.goal === "number") {
            if (typeof p.counters[t.id] !== "number") p.counters[t.id] = t.start || 0;
        } else {
            const e = p.t[t.id] && typeof p.t[t.id] === "object" ? p.t[t.id] : {};
            if (!["todo", "doing", "done"].includes(e.status)) e.status = "todo";
            e.notes = Array.isArray(e.notes) ? e.notes.filter(n => n && typeof n.txt === "string") : [];
            e.carried = !!e.carried;
            p.t[t.id] = e;
        }
    }
    doc.progress = p;
    return doc;
}

export async function loadDoc(file) {
    let doc = {};
    try { doc = JSON.parse(await readFile(file, "utf-8")); } catch { /* missing/corrupt -> fresh */ }
    return normalize(doc);
}

async function atomicWrite(file, obj) {
    const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
    await writeFile(tmp, JSON.stringify(obj, null, 2), "utf-8");
    await rename(tmp, file);
}

// Serialize read-modify-write per state file: the UI and the agent both mutate
// the same file, so two overlapping writes could otherwise drop each other.
const locks = new Map();
function withLock(file, fn) {
    const prev = locks.get(file) || Promise.resolve();
    const run = prev.then(fn, fn);
    locks.set(file, run.then(() => {}, () => {}));
    return run;
}

// Apply a mutation under the lock against the freshest on-disk state, stamp, and
// persist. Returns { ok, state } or { error } (fn may return { error } / { id }).
export function mutate(file, fn) {
    return withLock(file, async () => {
        const doc = await loadDoc(file);
        const out = fn(doc) || {};
        if (out.error) return { ok: false, error: out.error };
        doc.updatedAt = new Date().toISOString();
        await atomicWrite(file, doc);
        return out.id ? { ok: true, state: doc, id: out.id } : { ok: true, state: doc };
    });
}

// --- pure mutation ops (operate on a normalized doc) ------------------------

function findTask(doc, id) { return doc.tasks.find(t => t.id === id); }
function isCounter(t) { return t && typeof t.goal === "number"; }
export function statusOf(doc, t) {
    if (isCounter(t)) {
        const v = doc.progress.counters[t.id] || 0;
        return v >= t.goal ? "done" : (v > (t.start || 0) ? "doing" : "todo");
    }
    return (doc.progress.t[t.id] || {}).status || "todo";
}

export function opStatus(doc, id, status) {
    const t = findTask(doc, id);
    if (!t || isCounter(t)) return;
    const e = doc.progress.t[id];
    if (status && ["todo", "doing", "done"].includes(status)) e.status = status;
    else { const o = ["todo", "doing", "done"]; e.status = o[(o.indexOf(e.status) + 1) % 3]; }
    e.carried = false;
}
export function opNote(doc, id, txt) {
    const t = findTask(doc, id);
    if (!t || isCounter(t)) return;
    txt = text(txt).trim();
    if (!txt) return;
    const e = doc.progress.t[id];
    e.notes.push({ t: Date.now(), txt });
    if (e.status === "todo") e.status = "doing";
    e.carried = false;
}
export function opNoteDel(doc, id, idx) {
    const e = doc.progress.t[id];
    if (e && Array.isArray(e.notes) && idx >= 0 && idx < e.notes.length) e.notes.splice(idx, 1);
}
export function opCount(doc, id, { value, inc } = {}) {
    const t = findTask(doc, id);
    if (!t || !isCounter(t)) return;
    let v = doc.progress.counters[id] || 0;
    const nv = num(value), ni = num(inc);
    if (nv !== undefined) v = nv;
    else if (ni !== undefined) v = v + ni;
    doc.progress.counters[id] = Math.max(0, Math.round(v || 0));
}
export function opCarry(doc, id, value) {
    const t = findTask(doc, id);
    if (!t || isCounter(t)) return;
    const e = doc.progress.t[id];
    e.carried = typeof value === "boolean" ? value : !e.carried;
}
export function opFocus(doc, id) {
    const p = doc.progress;
    if (id === null || id === undefined || id === "") { p.focus = null; return; }
    if (!findTask(doc, id)) return;
    p.focus = p.focus === id ? null : id;
}
export function opDay(doc, txt) { txt = text(txt).trim(); if (txt) doc.progress.day.unshift({ t: Date.now(), txt }); }
export function opDayDel(doc, idx) { const d = doc.progress.day; if (idx >= 0 && idx < d.length) d.splice(idx, 1); }
export function opBrain(doc, txt) { txt = text(txt).trim(); if (txt) doc.progress.brain.unshift({ t: Date.now(), txt }); }
export function opBrainDel(doc, idx) { const b = doc.progress.brain; if (idx >= 0 && idx < b.length) b.splice(idx, 1); }
export function opRM(doc, value) { doc.progress.rm = !!value; }
export function opAddTask(doc, task) {
    task = task && typeof task === "object" ? task : {};
    let id = validId(task.id) ? task.id : slug(task.title);
    if (!validId(id)) return { error: "invalid task id or title" };
    if (findTask(doc, id)) return { error: `task '${id}' already exists` };
    const def = normalizeTaskDef({ ...task, id });
    doc.tasks.push(def);
    if (def.goal !== undefined) doc.progress.counters[id] = def.start || 0;
    else doc.progress.t[id] = { status: "todo", notes: [], carried: false };
    return { id };
}

// --- end-of-day recap (Markdown the agent can journal) ----------------------

export function recapMarkdown(doc) {
    const p = doc.progress, lines = [];
    const carried = t => !isCounter(t) && (p.t[t.id] || {}).carried;
    const live = doc.tasks.filter(t => !carried(t));
    const done = live.filter(t => statusOf(doc, t) === "done");
    lines.push(`# Focus board — ${doc.name ? doc.name + " · " : ""}${doc.dateKey}`);
    lines.push("");
    lines.push(`**${done.length}/${live.length} done** for today${live.length - done.length ? `, ${live.length - done.length} still open` : ""}.`);
    lines.push("");
    lines.push("## Tasks");
    for (const t of doc.tasks) {
        const s = carried(t) ? "→ tomorrow" : statusOf(doc, t);
        const mark = s === "done" ? "x" : " ";
        let line = `- [${mark}] ${t.emoji ? t.emoji + " " : ""}${t.title} — _${s}_`;
        if (isCounter(t)) line += ` (${p.counters[t.id] || 0}/${t.goal}${t.unit ? " " + t.unit : ""})`;
        lines.push(line);
        if (!isCounter(t)) for (const n of (p.t[t.id] || {}).notes || []) lines.push(`    - ${n.txt}`);
    }
    if (p.day.length) { lines.push(""); lines.push("## Momentum"); for (const n of [...p.day].reverse()) lines.push(`- ${n.txt}`); }
    if (p.brain.length) { lines.push(""); lines.push("## Parked thoughts"); for (const n of p.brain) lines.push(`- ${n.txt}`); }
    return lines.join("\n");
}

// --- HTTP API ---------------------------------------------------------------

function readBody(req) {
    return new Promise((resolve) => {
        let d = "", n = 0;
        req.on("data", c => { n += c.length; if (n > 1e6) { req.destroy(); resolve({}); return; } d += c; });
        req.on("end", () => { try { resolve(d ? JSON.parse(d) : {}); } catch { resolve({}); } });
        req.on("error", () => resolve({}));
    });
}

export async function handleApi(stateFile, op, b) {
    switch (op) {
        case "status": return mutate(stateFile, doc => opStatus(doc, b.id, b.status));
        case "progress": return mutate(stateFile, doc => opNote(doc, b.id, b.txt));
        case "note-del": return mutate(stateFile, doc => opNoteDel(doc, b.id, Number(b.idx)));
        case "count": return mutate(stateFile, doc => opCount(doc, b.id, { value: b.value, inc: b.inc }));
        case "carry": return mutate(stateFile, doc => opCarry(doc, b.id, b.value));
        case "focus": return mutate(stateFile, doc => opFocus(doc, b.id));
        case "day": return mutate(stateFile, doc => opDay(doc, b.txt));
        case "day-del": return mutate(stateFile, doc => opDayDel(doc, Number(b.idx)));
        case "brain": return mutate(stateFile, doc => opBrain(doc, b.txt));
        case "brain-del": return mutate(stateFile, doc => opBrainDel(doc, Number(b.idx)));
        case "rm": return mutate(stateFile, doc => opRM(doc, b.value));
        case "add-task": return mutate(stateFile, doc => opAddTask(doc, b.task || b));
        default: return { ok: false, error: "unknown_op" };
    }
}

// Start the local board server bound to loopback. Serves the board HTML at / and
// the JSON state + mutation API under /api/. Returns { server, url }.
export async function startServer(stateFile) {
    let boardHtml;
    try { boardHtml = await readFile(BOARD_HTML_PATH, "utf-8"); }
    catch { boardHtml = "<!doctype html><meta charset=utf-8><p>board.html asset is missing.</p>"; }

    const server = createServer(async (req, res) => {
        try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            if (req.method === "POST" && url.pathname.startsWith("/api/") && isCrossSiteRequest(req)) {
                res.writeHead(403, JSON_HEADERS);
                res.end(JSON.stringify({ ok: false, error: "cross_site_blocked" }));
                return;
            }
            if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
                res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                res.end(boardHtml);
                return;
            }
            if (req.method === "GET" && url.pathname === "/api/state") {
                const doc = await loadDoc(stateFile);
                res.writeHead(200, JSON_HEADERS);
                res.end(JSON.stringify({ ok: true, state: doc }));
                return;
            }
            if (req.method === "POST" && url.pathname.startsWith("/api/")) {
                const body = await readBody(req);
                const result = await handleApi(stateFile, url.pathname.slice(5), body);
                res.writeHead(result && result.error ? 400 : 200, JSON_HEADERS);
                res.end(JSON.stringify(result));
                return;
            }
            res.writeHead(404, JSON_HEADERS);
            res.end(JSON.stringify({ ok: false, error: "not_found" }));
        } catch {
            if (!res.headersSent) { res.writeHead(500, JSON_HEADERS); res.end(JSON.stringify({ ok: false, error: "internal_error" })); }
            else { try { res.end(); } catch { /* already gone */ } }
        }
    });

    await new Promise((resolve, reject) => {
        const onError = (err) => { server.removeListener("listening", onListening); reject(err); };
        const onListening = () => { server.removeListener("error", onError); resolve(); };
        server.once("error", onError);
        server.once("listening", onListening);
        server.listen(0, "127.0.0.1");
    });
    const addr = server.address();
    const port = addr && typeof addr === "object" ? addr.port : 0;
    return { server, url: `http://127.0.0.1:${port}/` };
}

// --- state file resolution + demo seed --------------------------------------

export function demoSeed() {
    return {
        name: "",
        dateKey: todayKey(),
        tasks: [
            { id: "steps", emoji: "🚶", title: "Walk 10,000 steps", goal: 10000, start: 0, inc: 1000, unit: "steps", tag: "body", tagc: "new" },
            { id: "deep", emoji: "⚙️", title: "Two hours of deep work", sub: "the thing that moves the needle", tag: "anchor", tagc: "deadline" },
            { id: "read", emoji: "📖", title: "Read a chapter", tag: "mind" },
        ],
    };
}

// Resolve the state file path from (untrusted-ish) input. Defaults to a file in
// cwd; if an existing directory is given, place the file inside it.
export async function resolveStateFile(p) {
    if (typeof p === "string" && p.trim()) {
        let file = isAbsolute(p) ? p : join(process.cwd(), p);
        try { const s = await stat(file); if (s.isDirectory()) file = join(file, "focus-board-state.json"); } catch { /* not yet created */ }
        return file;
    }
    return join(process.cwd(), "focus-board-state.json");
}

// Create + seed the state file if it doesn't exist yet. Returns the resolved path.
export async function ensureStateFile(inputPath, seed) {
    const file = await resolveStateFile(inputPath);
    if (!existsSync(file)) {
        const doc = normalize(seed && typeof seed === "object" ? seed : demoSeed());
        doc.updatedAt = new Date().toISOString();
        await mkdir(dirname(file), { recursive: true }).catch(() => {});
        await atomicWrite(file, doc);
    }
    return file;
}
