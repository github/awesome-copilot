// Collects a live snapshot of Copilot agents on this machine:
//  - Copilot app / CLI / VS Code agent-host sessions: $COPILOT_HOME/session-state/*
//  - VS Code Copilot Chat panel sessions: <editor>/User/workspaceStorage/*/chatSessions/*.jsonl
//    and <editor>/User/globalStorage/emptyWindowChatSessions/*.jsonl
//  - VS Code windows connected to Copilot: $COPILOT_HOME/ide/*.lock
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const HOME = os.homedir();
const COPILOT_HOME = process.env.COPILOT_HOME || path.join(HOME, ".copilot");
const STATE_DIR = path.join(COPILOT_HOME, "session-state");
const IDE_DIR = path.join(COPILOT_HOME, "ide");
// The application-data folder of VS Code. VSCODE_APPDATA overrides the platform default.
export function vscodeAppData(env = process.env, platform = process.platform, home = HOME) {
    const abs = (v) => v && path.isAbsolute(v) ? v : "";
    return abs(env.VSCODE_APPDATA)
        || (platform === "win32" ? abs(env.APPDATA) || path.join(home, "AppData", "Roaming")
            : platform === "darwin" ? path.join(home, "Library", "Application Support")
                : abs(env.XDG_CONFIG_HOME) || path.join(home, ".config"));
}
const VSCODE_USER_DIRS = ["Code", "Code - Insiders", "Cursor", "VSCodium"].map((n) => path.join(vscodeAppData(), n, "User"));

const RECENT_MS = 15 * 60 * 1000;
// An open VS Code request with no file change for this time is not active (window closed or crashed).
const VSCODE_ACTIVE_MS = 30 * 60 * 1000;

// Compare paths with "/" separators. Drive letters and Windows paths do not use case.
function normPath(p) {
    let n = String(p || "").replace(/\\/g, "/").replace(/\/+$/, "");
    if (/^[A-Za-z]:(\/|$)/.test(n)) n = n.toLowerCase();
    return n;
}
export function inFolder(cwd, folder) {
    const c = normPath(cwd), f = normPath(folder);
    return !!c && !!f && (c === f || c.startsWith(f + "/"));
}
// A multi-root VS Code window has more than one root folder.
export const sessionRoots = (s) => (s.folders?.length ? s.folders : [s.cwd]).filter(Boolean);
const FLOW_WINDOW_MS = 120 * 1000;
const WAITING_WINDOW_MS = 6 * 3600 * 1000;
// A process can write its lock file some seconds after its first events.
const LOCK_SLACK_MS = 30 * 1000;

const pidAlive = (pid) => {
    try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; }
};

function parseYaml(text) {
    const o = {};
    let block = null;
    for (const line of text.split(/\r?\n/)) {
        if (block && /^\s+/.test(line)) { o[block] += (o[block] ? " " : "") + line.trim(); continue; }
        block = null;
        const m = line.match(/^([A-Za-z_]+):\s*(.*)$/);
        if (!m) continue;
        if (/^[|>][-+]?$/.test(m[2])) { block = m[1]; o[m[1]] = ""; }
        else o[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
    }
    return o;
}

// A token or call count from a log. Other values count as 0.
const num = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0;
const isObj = (x) => !!x && typeof x === "object";

const trunc = (s, n = 140) => {
    if (s == null) return "";
    s = String(s).replace(/\s+/g, " ").trim();
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
};

// ---- Sink classification: where does a tool call send / fetch data? ----
const BASH_SINKS = [
    [/^(gh)\b/, "GitHub"], [/^(git)\b/, "Git"], [/^(curl|wget|http)\b/, "Web"],
    [/^(ssh|scp|rsync|mosh)\b/, "SSH hosts"], [/^(docker|podman|kubectl|helm)\b/, "Containers"],
    [/^(go|cargo|npm|npx|yarn|pnpm|make|bazel|python3?|pip|node|ruby|bundle|rake)\b/, "Build / run"],
];
const FILE_TOOLS = new Set(["view", "edit", "create", "apply_patch", "grep", "glob", "rg", "str_replace_editor", "read_file", "write_file"]);
const AGENT_TOOLS = new Set(["task", "read_agent", "write_agent", "list_agents"]);
const SESSION_TOOLS = new Set(["send_session_message", "create_session", "open_pr_session", "open_issue_session", "get_session", "get_sessions_status", "list_sessions_and_chats", "answer_session_input", "respond_to_session_plan_v2"]);

function firstCmd(cmd) {
    let c = String(cmd || "").trim().replace(/^(cd\s+\S+\s*(&&|;)\s*)+/, "").replace(/^(sudo|env\s+\S+=\S+)\s+/, "");
    return c;
}

// The MCP server of a tool name "<server>-<tool>" without data.mcpServerName: the longest server
// name that the session used before, else the name up to a "-mcp-server-" or "-mcp-" marker.
export function mcpServerOf(name, known = []) {
    let best = "";
    for (const k of known) if (k.length > best.length && name.startsWith(k + "-")) best = k;
    if (best) return best;
    const m = name.match(/^(.+?-mcp(?:-server)?)-./);
    return m ? m[1] : "";
}

// mcpServer is the MCP server name from the event (data.mcpServerName), if known. Explicit MCP
// metadata comes first, because an MCP tool can have the name of a built-in tool.
// known is the list of MCP server names that the session used before.
export function classifyTool(name, args = {}, mcpServer = "", known = []) {
    if (!name) return null;
    if (typeof mcpServer === "string" && mcpServer) return "MCP: " + mcpServer;
    if (name === "bash" || name === "powershell" || name === "shell" || name === "run_in_terminal") {
        const c = firstCmd(args.command);
        for (const [re, sink] of BASH_SINKS) if (re.test(c)) return sink;
        return "Shell";
    }
    if (FILE_TOOLS.has(name)) return "Filesystem";
    if (name === "web_fetch" || name === "web_search" || name === "fetch_webpage") return "Web";
    if (name === "lexical_code_search" || name === "semantic_code_search") return "GitHub";
    if (AGENT_TOOLS.has(name)) return null; // modelled as subagent edges
    if (SESSION_TOOLS.has(name)) return null; // modelled as session edges
    if (name === "ask_user") return "You";
    if (name === "sql" || name === "session_store_sql") return "Session DB";
    // Copilot Memory of the CLI and the app is hosted by GitHub.
    if (name === "store_memory" || name === "vote_memory") return "Copilot Memory";
    if (name.indexOf("-") > 0) return "MCP: " + (mcpServerOf(name, known) || "unknown server");
    return null;
}

function describeArgs(name, a = {}) {
    if (!a || typeof a !== "object") return "";
    if (typeof a.command === "string") return "$ " + a.command;
    if (a.pattern && a.path) return trunc(`${a.pattern}  in ${a.path}`, 400);
    return trunc(a.path || a.url || a.query || a.pattern || a.description || a.prompt || a.message || a.title || JSON.stringify(a), 400);
}

// ---- Copilot (app / CLI / VS Code agent-host) sessions ----
// Parsed incrementally: each poll reads only bytes appended since the last poll.
const sessionState = new Map(); // id -> { offset, ino, partial, st (parse state), ws, wsMtime }
const INITIAL_TAIL = 8 * 1024 * 1024;
const MAX_FLOWS = 200;
const MAX_LLM = 5000;

function newParseState() {
    return {
        model: "", lastEventAt: 0, lastUser: "", lastAssistant: "", intent: "",
        toolStarts: new Map(), subs: new Map(), turnOpen: false, perms: new Map(), inputs: new Map(), seq: 0,
        flows: [], llm: [], peers: [], children: new Map(), tokens: { in: 0, out: 0 }, modelTokens: {}, mcpServers: new Set(),
    };
}

// The open work of the session stops: tools, questions, and sub-agents that still run.
function clearPending(p, ts) {
    p.toolStarts.clear(); p.perms.clear(); p.inputs.clear();
    for (const a of p.subs.values()) {
        a.turnOpen = false; a.lifecycleOpen = false;
        if (a.running) { a.running = false; a.endedAt = ts; }
    }
}

// ---- Session relations ----
const UUID_RE = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const FULL_UUID = new RegExp(`^${UUID_RE}$`, "i");
const SESSION_RESULT_ID = new RegExp(`^(?:id|session id|copilot session id):\\s*(${UUID_RE})\\s*$`, "im");
const CREATED_SESSION_RESULT_ID = new RegExp(`^Created session '[^\\r\\n]*' \\(id:\\s*(${UUID_RE})\\)`, "im");
const SESSION_ID_KEYS = ["copilot_session_id", "copilotSessionId", "session_id", "sessionId", "id", "project_session_id", "projectSessionId"];
const SPAWN_TOOL = /^(create_session|open_pr_session|open_issue_session)$/;

// Read identity fields, never the first UUID in arbitrary tool output (which can be a project ID).
// Returns [{ id, aliases } | null, created].
export function createdSession(result) {
    const read = (v, depth) => {
        if (depth > 6) return [null, false];
        if (Array.isArray(v)) {
            for (const item of v) { const r = read(item, depth + 1); if (r[0]) return r; }
        } else if (isObj(v)) {
            if (v.isError === true) return [null, false];
            const ids = SESSION_ID_KEYS.map((k) => v[k]).filter((id) => typeof id === "string" && FULL_UUID.test(id)).map((id) => id.toLowerCase());
            if (ids.length) return [{ id: ids[0], aliases: ids.slice(1) }, v.created === true];
            for (const k of ["content", "text"]) { const r = read(v[k], depth + 1); if (r[0]) return r; }
        } else if (typeof v === "string") {
            let inner, parsed = false;
            try { inner = JSON.parse(v); parsed = true; } catch {}
            if (parsed) return read(inner, depth + 1);
            let m = v.match(CREATED_SESSION_RESULT_ID);
            if (m) return [{ id: m[1].toLowerCase(), aliases: [] }, true];
            m = v.match(SESSION_RESULT_ID);
            if (m) return [{ id: m[1].toLowerCase(), aliases: [] }, v.trim().startsWith("Created session")];
        }
        return [null, false];
    };
    return read(result, 0);
}

// Resolve explicitly paired app and CLI IDs onto existing collector sessions. Never create alias nodes.
export function resolveSessionRelations(sessions, parseStates) {
    const exists = new Set(sessions.map((s) => s.id));
    const aliases = new Map();
    for (const s of sessions) {
        const p = parseStates.get(s.id);
        if (!p) continue;
        for (const ref of p.children.values()) {
            const ids = [ref.id, ...ref.aliases];
            let canonical = "";
            for (const id of ids) {
                if (!exists.has(id)) continue;
                if (canonical && canonical !== id) { canonical = ""; break; }
                canonical = id;
            }
            if (!canonical) continue;
            for (const id of ids) {
                if (!aliases.has(id)) aliases.set(id, canonical);
                else if (aliases.get(id) !== canonical) aliases.set(id, "");
            }
        }
    }
    const resolve = (id) => exists.has(id) ? id : aliases.get(id) || "";
    for (const s of sessions) {
        const p = parseStates.get(s.id);
        if (!p) continue;
        const children = new Set();
        for (const ref of p.children.values()) {
            const id = resolve(ref.id);
            if (id && id !== s.id) children.add(id);
        }
        if (children.size) s.childSessions = [...children].sort();
        else delete s.childSessions;
        s.peers = s.peers.map((pe) => ({ ...pe, to: resolve(pe.to) || pe.to }));
    }
}

// ---- Detached background shells ----
// A detached shell is a process, not an agent or a pending tool call. Its record is in
// session-state/<id>/detached-shells/*.json.
export function matchesProcessStat(stat, startTicks) {
    // comm can contain spaces and parentheses. The fields after its final ")" start at the state.
    const end = stat.lastIndexOf(")");
    if (end < 0) return false;
    const f = stat.slice(end + 1).trim().split(/\s+/);
    return f.length >= 20 && f[0] !== "Z" && f[0] !== "X" && /^\d+$/.test(f[19]) && Number(f[19]) === startTicks;
}

async function detachedProcessAlive(s) {
    const pid = s?.pid;
    if (!Number.isSafeInteger(pid) || pid <= 0) return false;
    if (process.platform !== "linux") return pidAlive(pid);
    // Linux: reject stale records after a reboot and reused PIDs.
    if (!Number.isSafeInteger(s.startTicks) || s.startTicks <= 0 || typeof s.bootId !== "string" || !s.bootId) return false;
    try {
        if ((await fs.readFile("/proc/sys/kernel/random/boot_id", "utf8")).trim() !== s.bootId) return false;
        return matchesProcessStat(await fs.readFile(`/proc/${pid}/stat`, "utf8"), s.startTicks);
    } catch { return false; }
}

export async function collectBackgroundShells(dir, sessionId, alive = detachedProcessAlive) {
    dir = path.join(dir, "detached-shells");
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return []; }
    const shells = [], seen = new Set();
    for (const e of entries) {
        if (!e.isFile() || !e.name.endsWith(".json")) continue;
        let r;
        try {
            const fh = await fs.open(path.join(dir, e.name), "r");
            try {
                const buf = Buffer.alloc(64 * 1024);
                const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
                r = JSON.parse(buf.toString("utf8", 0, bytesRead));
            } finally { await fh.close(); }
        } catch { continue; }
        if (!isObj(r) || r.version !== 1 || r.sessionId !== sessionId || typeof r.shellId !== "string" || !r.shellId ||
            r.state !== "active" || !(num(r.createdUnixMs) > 0) || seen.has(r.shellId) || !(await alive(r.supervisor))) continue;
        // Heartbeats belong to the owner, and can stop while the detached process continues.
        seen.add(r.shellId);
        shells.push({ id: r.shellId, pid: r.supervisor.pid, startedAt: r.createdUnixMs });
    }
    return shells.sort((a, b) => a.startedAt - b.startedAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
// Remove a completed request. Without an ID, remove the oldest open request.
function endPending(m, id) {
    if (id != null && m.delete(id)) return;
    if (id == null) { const k = m.keys().next(); if (!k.done) m.delete(k.value); }
}

function applyEvent(p, e) {
    const d = e.data || {};
    const ts = Date.parse(e.timestamp) || 0;
    if (ts > p.lastEventAt) p.lastEventAt = ts;
    const agentId = e.agentId || d.parentToolCallId || null;
    const sa = agentId && p.subs.get(agentId);
    if (sa && ts > sa.lastAt) sa.lastAt = ts;
    switch (e.type) {
        case "user.message":
            if (!agentId) { p.lastUser = trunc(d.content, 200); p.turnOpen = true; p.intent = ""; }
            if (sa) sa.turnOpen = true;
            break;
        case "assistant.turn_start": if (!agentId) p.turnOpen = true; if (sa) sa.turnOpen = true; break;
        case "session.start": case "session.resume":
            if (d.selectedModel && !agentId) p.model = d.selectedModel;
            if (e.type === "session.resume" && !agentId) {
                // The new process continues the pending work of the old process. Mark it, so that the
                // lock-age filter keeps it.
                if (d.continuePendingWork) {
                    for (const t of p.toolStarts.values()) t.carriedAt = ts;
                    for (const m of [p.perms, p.inputs]) for (const k of m.keys()) m.set(k, ts);
                    for (const a of p.subs.values()) if (a.running) a.lastAt = Math.max(a.lastAt, ts);
                // A new process opened a session that no process held and did not continue its work.
                } else if (d.alreadyInUse === false && !d.sessionWasActive) {
                    clearPending(p, ts); p.turnOpen = false;
                }
            }
            break;
        case "session.model_change": if (d.newModel && !agentId) p.model = d.newModel; break;
        // session.idle is not written to the log, and session.task_complete is optional.
        case "assistant.turn_end": if (!agentId) p.turnOpen = false; if (sa) sa.turnOpen = false; break;
        case "session.idle": case "session.task_complete": case "abort": case "session.shutdown":
            if (!agentId) {
                p.turnOpen = false;
                if (e.type !== "session.task_complete") clearPending(p, ts);
            }
            if (sa) {
                sa.turnOpen = false; sa.lifecycleOpen = false;
                for (const [k, t] of p.toolStarts) if (t.agentId === agentId) p.toolStarts.delete(k);
            }
            break;
        case "assistant.message":
            if (d.model && !agentId) p.model = d.model;
            if (d.content && !agentId) p.lastAssistant = trunc(d.content, 240);
            if (sa && d.content) sa.said = trunc(d.content, 160);
            for (const r of Array.isArray(d.toolRequests) ? d.toolRequests : []) if (typeof r?.mcpServerName === "string" && r.mcpServerName) p.mcpServers.add(r.mcpServerName);
            break;
        case "tool.execution_start": {
            const name = d.toolName, args = d.arguments || {};
            if (d.model && !agentId) p.model = d.model;
            if (typeof d.mcpServerName === "string" && d.mcpServerName) p.mcpServers.add(d.mcpServerName);
            p.toolStarts.set(d.toolCallId, { id: d.toolCallId, name, desc: describeArgs(name, args), startedAt: ts, agentId, sink: classifyTool(name, args, d.mcpServerName, p.mcpServers), detached: args.detached === true });
            if (name === "report_intent" && !agentId) p.intent = trunc(args.intent, 80);
            if (name === "send_session_message" && args.session_id)
                p.peers.push({ id: d.toolCallId, to: args.session_id, at: ts, kind: "message", text: trunc(args.message, 160) });
            break;
        }
        case "tool.execution_complete": {
            if (d.model && !agentId) p.model = d.model;
            const t = p.toolStarts.get(d.toolCallId);
            if (!t) break;
            p.toolStarts.delete(d.toolCallId);
            if (t.sink) p.flows.push({ sink: t.sink, tool: t.name, desc: t.desc, at: t.startedAt, endAt: ts, ok: d.success !== false, agentId: t.agentId });
            if (SPAWN_TOOL.test(t.name) && !t.detached && d.success !== false) {
                const [ref, created] = createdSession(d.result);
                if (ref && (t.name === "create_session" || created)) {
                    p.children.set(ref.id, ref);
                    p.peers.push({ to: ref.id, at: ts, kind: "spawn", text: t.desc });
                }
            }
            break;
        }
        case "subagent.started": {
            const id = e.agentId || d.toolCallId;
            p.subs.set(id, {
                id, name: d.agentDisplayName || d.agentName, type: d.agentType || d.agentName,
                model: d.model, startedAt: ts, lastAt: ts, mode: d.executionMode, said: "", running: true, lifecycleOpen: true,
            });
            break;
        }
        case "subagent.completed": case "subagent.failed": {
            const s = p.subs.get(e.agentId || d.toolCallId);
            if (s) { s.turnOpen = false; s.lifecycleOpen = false; s.running = false; s.endedAt = ts; s.failed = e.type === "subagent.failed"; }
            for (const [k, t] of p.toolStarts) if (t.agentId === (e.agentId || d.toolCallId)) p.toolStarts.delete(k);
            break;
        }
        case "permission.requested": p.perms.set(d.requestId ?? "#" + p.seq++, ts); break;
        case "permission.completed": endPending(p.perms, d.requestId); break;
        case "elicitation.requested": case "user_input.requested": p.inputs.set(d.requestId ?? "#" + p.seq++, ts); break;
        case "elicitation.completed": case "user_input.completed": endPending(p.inputs, d.requestId); break;
        case "session.usage_record": {
            const u = d.usage || {};
            const rawName = String(u.modelDisplayName || u.model || "model").replace(/^[0-9a-f]{8}-[0-9a-f-]{27}\//i, "");
            const mname = u.isByok ? rawName + " · BYOK" : rawName, tin = num(u.inputTokens), tout = num(u.outputTokens);
            p.llm.push({ sink: "LLM: " + mname, tool: "model", model: mname, tin, tout, desc: `${tin} in / ${tout} out tokens`, at: ts - num(u.duration), endAt: ts, ok: true, agentId, tokens: tin + tout });
            p.tokens.in += tin; p.tokens.out += tout;
            const mt = p.modelTokens[mname] ||= { in: 0, out: 0, calls: 0 };
            mt.in += tin; mt.out += tout; mt.calls++;
            break;
        }
    }
    // A background sub-agent can resume after it completed. It runs while its lifecycle,
    // a turn, or a tool is open.
    if (sa) {
        let running = sa.lifecycleOpen || sa.turnOpen;
        for (const t of p.toolStarts.values()) running ||= t.agentId === sa.id;
        sa.running = running;
        if (running) { delete sa.endedAt; delete sa.failed; } else if (!sa.endedAt) sa.endedAt = ts;
    }
    // Model calls are kept by time, not by count, so that the 2-minute token rates stay correct.
    if (p.flows.length > MAX_FLOWS) p.flows.splice(0, p.flows.length - MAX_FLOWS);
    while (p.llm.length && p.llm[0].endAt < p.lastEventAt - FLOW_WINDOW_MS) p.llm.shift();
    if (p.llm.length > MAX_LLM) p.llm.splice(0, p.llm.length - MAX_LLM);
    if (p.peers.length > 50) p.peers.splice(0, p.peers.length - 50);
}

// The initial tail can start after a sub-agent started or after the model was selected.
// Scan the older bytes for sub-agent lifecycle and activity, model, and session creation lines
// only, so that tools in the tail resolve to a named sub-agent, the session shows its current
// model, and old child sessions stay under their creator.
// Only lines that contain a type name or a JSON escape (the type name can be escaped) are parsed.
// Returns the start of the line that contains `end`, where the tail reader must start.
const PRESCAN_TYPES = new Set(["session.start", "session.resume", "session.model_change"]);
const PRESCAN_MARKS = ["subagent.", ...PRESCAN_TYPES, "\\u", "create_session", "open_pr_session", "open_issue_session",
    "tool.execution_complete", '"agentId"', '"parentToolCallId"'].map((t) => Buffer.from(t));
const AGENT_ACTIVITY = new Set(["user.message", "assistant.turn_start", "assistant.turn_end", "tool.execution_start",
    "tool.execution_complete", "session.idle", "session.task_complete", "abort", "session.shutdown"]);
// Restore the lifecycle, resumed turns and tools, the model, and session ownership.
function prescanApplies(p, e) {
    if (prescanType(e?.type)) return true;
    const d = e.data || {};
    const t = p.toolStarts.get(d.toolCallId);
    if (e.type === "tool.execution_start" && SPAWN_TOOL.test(d.toolName)) return true;
    if (e.type === "tool.execution_complete" && t && SPAWN_TOOL.test(t.name)) return true;
    return !!(e.agentId || d.parentToolCallId) && AGENT_ACTIVITY.has(e.type);
}
const prescanType = (t) => typeof t === "string" && (PRESCAN_TYPES.has(t) || t.startsWith("subagent."));
async function prescanSubagents(file, p, end) {
    const fh = await fs.open(file, "r");
    let boundary = 0;
    try {
        const CHUNK = 4 * 1024 * 1024;
        let carry = Buffer.alloc(0), carryAt = 0;
        for (let pos = 0; pos < end; pos += CHUNK) {
            const len = Math.min(CHUNK, end - pos);
            const buf = Buffer.alloc(len);
            await fh.read(buf, 0, len, pos);
            const data = carry.length ? Buffer.concat([carry, buf]) : buf, base = carry.length ? carryAt : pos;
            let start = 0, nl;
            while ((nl = data.indexOf(10, start)) !== -1) {
                const line = data.subarray(start, nl);
                if (PRESCAN_MARKS.some((x) => line.includes(x))) {
                    try { const e = JSON.parse(line.toString("utf8")); if (isObj(e) && prescanApplies(p, e)) applyEvent(p, e); } catch {}
                }
                start = nl + 1;
                boundary = base + start;
            }
            // Keep only a short carry: a line longer than 64KB is never a lifecycle or model event.
            carry = data.subarray(start); carryAt = base + start;
            if (carry.length > 65536) carry = Buffer.alloc(0);
        }
    } finally { await fh.close(); }
    return boundary;
}

// Split appended bytes into full lines. Keep the bytes of an unfinished line, so that a
// UTF-8 character across two reads stays correct.
function takeLines(entry, buf) {
    let data = entry.partial.length ? Buffer.concat([entry.partial, buf]) : buf;
    if (entry.skipFirst) {
        const first = data.indexOf(10);
        if (first < 0) { entry.partial = Buffer.alloc(0); return []; }
        data = data.subarray(first + 1);
        entry.skipFirst = false;
    }
    const nl = data.lastIndexOf(10);
    entry.partial = Buffer.from(data.subarray(nl + 1));
    return nl < 0 ? [] : data.toString("utf8", 0, nl).split("\n");
}

async function readAppended(file, entry, size, ino) {
    if (!entry.p || ino !== entry.ino || size < entry.offset) {
        entry.p = newParseState(); entry.ino = ino; entry.partial = Buffer.alloc(0);
        entry.offset = Math.max(0, size - INITIAL_TAIL);
        entry.skipFirst = false;
        if (entry.offset > 0) {
            // Start the tail at a full line, so that the line across the boundary is not lost.
            // A very long line there is never a lifecycle event: skip it, as before.
            const boundary = await prescanSubagents(file, entry.p, entry.offset);
            if (entry.offset - boundary <= 1024 * 1024) entry.offset = boundary;
            else entry.skipFirst = true;
        }
    }
    if (size === entry.offset) return;
    const fh = await fs.open(file, "r");
    try {
        const len = Math.min(size - entry.offset, 32 * 1024 * 1024);
        const buf = Buffer.alloc(len);
        await fh.read(buf, 0, len, entry.offset);
        entry.offset += len;
        for (const line of takeLines(entry, buf)) {
            if (!line || line[0] !== "{") continue;
            try { applyEvent(entry.p, JSON.parse(line)); } catch {}
        }
    } finally { await fh.close(); }
}

async function collectCopilotSession(id, now) {
    const dir = path.join(STATE_DIR, id);
    const eventsFile = path.join(dir, "events.jsonl");
    let st;
    try { st = await fs.stat(eventsFile); } catch { return null; }
    let entries;
    try { entries = await fs.readdir(dir); } catch { return null; }
    // A process makes its lock file when it opens the session. Pending work from before the
    // oldest live lock belongs to a process that stopped (crash, then resume).
    let live = false, since = Infinity;
    await Promise.all(entries.map(async (e) => {
        const m = e.match(/^inuse\.(\d+)\.lock$/);
        if (!m || !pidAlive(+m[1])) return;
        live = true;
        try { const ls = await fs.stat(path.join(dir, e)); since = Math.min(since, ls.birthtimeMs || ls.mtimeMs); } catch {}
    }));
    const current = (t) => !(t < since - LOCK_SLACK_MS);
    const backgroundShells = await collectBackgroundShells(dir, id);
    if (!live && !backgroundShells.length && now - st.mtimeMs > RECENT_MS) { sessionState.delete(id); return null; }

    let entry = sessionState.get(id);
    if (!entry) { entry = {}; sessionState.set(id, entry); }
    try {
        const wst = await fs.stat(path.join(dir, "workspace.yaml"));
        if (wst.mtimeMs !== entry.wsMtime) {
            entry.ws = parseYaml(await fs.readFile(path.join(dir, "workspace.yaml"), "utf8"));
            entry.wsMtime = wst.mtimeMs;
        }
    } catch { entry.ws ||= {}; }
    await readAppended(eventsFile, entry, st.size, st.ino);

    const p = entry.p, ws = entry.ws;
    const quietMs = now - p.lastEventAt;
    const client = ws.client_name || "unknown";
    // Keep all completed sub-agents. The UI shows them only with "show idle".
    const subagents = [];
    for (const o of p.subs.values()) {
        const { turnOpen, lifecycleOpen, ...a } = o;
        a.running = live && o.running && current(o.lastAt) && now - o.lastAt < 20 * 60e3;
        if (a.running || !o.running || now - (a.endedAt || a.lastAt) < 5 * 60e3) subagents.push(a);
    }
    // Ignore orphaned tool starts (crashed/abandoned turns). A question to the user stays
    // pending for the full waiting window, because it can wait a long time for an answer.
    const runningTools = [...p.toolStarts.values()].filter((t) => live && current(t.carriedAt ?? t.startedAt) && (t.name === "ask_user"
        ? quietMs < WAITING_WINDOW_MS
        : now - t.startedAt < 30 * 60e3 || quietMs < 10 * 60e3));
    for (const t of runningTools) {
        const sa = t.agentId && subagents.find((a) => a.id === t.agentId);
        if (sa) sa.doing = t.desc ? `${t.name}: ${t.desc}` : t.name;
    }
    const open = (m) => [...m.values()].some(current);
    const waiting = live && (open(p.perms) || open(p.inputs) || runningTools.some((t) => t.name === "ask_user")) && quietMs < WAITING_WINDOW_MS;
    const busy = live && !waiting && (runningTools.length > 0 || subagents.some((a) => a.running) || (p.turnOpen && quietMs < 3 * 60e3));
    const surface = client === "vscode-agent-host" ? "VS Code agent" : client === "github/autopilot" ? "Copilot app" : /cli/i.test(client) ? "Copilot CLI" : client;
    return {
        kind: "copilot", id, live, client, surface,
        name: trunc(ws.name || ws.summary || p.lastUser || id.slice(0, 8), 90),
        cwd: ws.cwd || "", repo: ws.cwd ? path.basename(ws.cwd) : "",
        model: p.model, busy, waiting, lastEventAt: p.lastEventAt,
        lastUser: p.lastUser, lastAssistant: p.lastAssistant, intent: p.intent,
        runningTools: runningTools.map(({ carriedAt, detached, ...t }) => t), subagents,
        ...(backgroundShells.length ? { backgroundShells } : {}),
        flows: [...p.flows, ...p.llm].filter((f) => now - f.endAt < FLOW_WINDOW_MS),
        peers: p.peers.slice(-30), tokens: { ...p.tokens }, modelTokens: structuredClone(p.modelTokens),
    };
}

async function collectCopilotSessions(now) {
    let ids = [];
    try { ids = await fs.readdir(STATE_DIR); } catch { return []; }
    const out = [];
    await Promise.all(ids.map(async (id) => {
        if (!/^[0-9a-f-]{36}$/.test(id)) return;
        try {
            const s = await collectCopilotSession(id, now);
            if (s) out.push(s);
        } catch {}
    }));
    resolveSessionRelations(out, new Map([...sessionState].filter(([, e]) => e.p).map(([id, e]) => [id, e.p])));
    return out;
}

// ---- VS Code Copilot Chat panel sessions ----
// A chat file is a mutation log: {kind:0,v} sets the full state, {kind:1,k,v} sets the value
// at path k, {kind:2,k,v,i} cuts the array at index i and appends v, {kind:3,k} deletes path k.
// We replay each file incrementally. The old format (.json) is one full JSON object.
const vscodeCache = new Map(); // file -> { ino, offset, mtimeMs, partial, replay, state, tools, usage, llm, folder, folders, initialDone, lastTrackAt }
const MAX_VSCODE_FILE = 64 * 1024 * 1024;

// A path key must be a string or a number, and must not reach the prototype of an object.
const BAD_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const safeKey = (x) => typeof x === "number" || (typeof x === "string" && !BAD_KEYS.has(x));
function mutate(root, e) {
    if (e.kind === 0) return e.v;
    const k = Array.isArray(e.k) ? e.k : [];
    if (!k.every(safeKey)) return root;
    if (!k.length) return e.kind === 1 ? e.v : root;
    let o = root;
    for (let i = 0; i < k.length - 1; i++) {
        if (o[k[i]] == null || typeof o[k[i]] !== "object") o[k[i]] = typeof k[i + 1] === "number" ? [] : {};
        o = o[k[i]];
    }
    const last = k[k.length - 1];
    if (e.kind === 1) o[last] = e.v;
    else if (e.kind === 2) {
        if (!Array.isArray(o[last])) o[last] = [];
        if (typeof e.i === "number") o[last].length = Math.min(o[last].length, e.i);
        if (Array.isArray(e.v)) o[last].push(...e.v);
    } else if (e.kind === 3) delete o[last];
    return root;
}

// Reset only the reader. The state, the tool times, and the seen token totals of the session stay
// until the reader parses a full-state line of the new log (replay). Thus a poll during a rewrite
// does not show old work as new, and a rewrite does not change the times of known tools or count the tokens again.
const resetVSCodeLog = (entry, ino) => Object.assign(entry, {
    ino, offset: 0, partial: Buffer.alloc(0), replay: true, tools: entry.tools || new Map(), llm: entry.llm || [], head: Buffer.alloc(0), tail: Buffer.alloc(0),
});
const CHECK_BYTES = 4096;
async function sameBytes(fh, pos, want) {
    if (!want?.length) return true;
    const buf = Buffer.alloc(want.length);
    const { bytesRead } = await fh.read(buf, 0, want.length, pos);
    return bytesRead === want.length && buf.equals(want);
}

async function readVSCodeLog(file, entry, st) {
    if (entry.ino !== st.ino || st.size < entry.offset) resetVSCodeLog(entry, st.ino);
    // The old .json format is one object that VS Code writes again in place. Use the time, not the size.
    if (file.endsWith(".json")) {
        if (entry.mtimeMs === st.mtimeMs && entry.offset === st.size) return;
        let v;
        try { v = JSON.parse(await fs.readFile(file, "utf8")); } catch { return; }
        entry.state = v; entry.replay = false;
        entry.offset = st.size;
        entry.mtimeMs = st.mtimeMs;
        return;
    }
    if (entry.mtimeMs === st.mtimeMs && st.size === entry.offset) return;
    const fh = await fs.open(file, "r");
    try {
        // VS Code can replace the log with one full-state line on the same inode. Then the size does
        // not grow while the time changes, or the bytes at the start or before the read position are different.
        if (entry.offset && (st.size === entry.offset || !(await sameBytes(fh, 0, entry.head) && await sameBytes(fh, entry.offset - entry.tail.length, entry.tail))))
            resetVSCodeLog(entry, st.ino);
        entry.mtimeMs = st.mtimeMs;
        const len = st.size - entry.offset;
        if (!len) return;
        const buf = Buffer.alloc(len);
        await fh.read(buf, 0, len, entry.offset);
        if (entry.head.length < CHECK_BYTES) entry.head = Buffer.concat([entry.head, buf.subarray(0, CHECK_BYTES - entry.head.length)]);
        entry.tail = Buffer.from(len >= CHECK_BYTES ? buf.subarray(-CHECK_BYTES) : Buffer.concat([entry.tail, buf]).subarray(-CHECK_BYTES));
        entry.offset += len;
        for (const line of takeLines(entry, buf)) {
            if (!line || line[0] !== "{") continue;
            try {
                const e = JSON.parse(line);
                if (!entry.replay) entry.state = mutate(entry.state, e);
                else if (e?.kind === 0) { entry.state = e.v; entry.replay = false; }
            } catch {}
        }
    } finally { await fh.close(); }
}

// Built-in VS Code chat tools and the destinations of their data. null means no destination.
const VSCODE_TOOL_SINKS = {
    run_in_terminal: "Shell", "Run in Terminal": "Shell", send_to_terminal: "Shell", get_terminal_output: "Shell",
    kill_terminal: "Shell", await_terminal: "Shell", terminal_last_command: "Shell",
    runTests: "Build / run", install_python_packages: "Build / run", configure_python_environment: "Build / run",
    copilot_readFile: "Filesystem", copilot_findTextInFiles: "Filesystem", copilot_createFile: "Filesystem", copilot_replaceString: "Filesystem",
    copilot_multiReplaceString: "Filesystem", copilot_applyPatch: "Filesystem", copilot_insertEdit: "Filesystem", copilot_listDirectory: "Filesystem",
    copilot_findFiles: "Filesystem", copilot_getErrors: "Filesystem", copilot_viewImage: "Filesystem",
    // The codebase search can use a remote semantic index, thus it is not a local destination.
    copilot_searchCodebase: "Codebase search",
    copilot_createDirectory: "Filesystem", copilot_getChangedFiles: "Filesystem", copilot_readProjectStructure: "Filesystem",
    copilot_searchWorkspaceSymbols: "Filesystem", copilot_findTestFiles: "Filesystem", copilot_editNotebook: "Filesystem",
    copilot_memory: "Memory (local)",
    copilot_fetchWebPage: "Web", vscode_fetchWebPage_internal: "Web", open_browser_page: "Web", navigate_page: "Web",
    screenshot_page: "Web", read_page: "Web", click_element: "Web", run_playwright_code: "Web", copilot_openSimpleBrowser: "Web",
    copilot_githubTextSearch: "GitHub", copilot_githubRepo: "GitHub",
    copilot_sessionStoreSql: "Session DB",
    vscode_askQuestions: "You", copilot_askQuestions: "You",
    manage_todo_list: null, tool_search: null, task_complete: null, runSubagent: null,
};

const msgText = (m) => String((m && typeof m === "object" ? m.value : m) || "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
const terminalCommand = (t) => {
    const c = t.toolSpecificData?.kind === "terminal" ? t.toolSpecificData.commandLine : null;
    return c ? String(c.userEdited ?? c.toolEdited ?? c.original ?? c.forDisplay ?? "") : "";
};

function classifyVSCodeTool(t) {
    const id = String(t.toolId || "");
    if (t.source?.type === "mcp" && t.source.label) return "MCP: " + t.source.label;
    const m = id.match(/^mcp_([^_]+)_/);
    if (m) return "MCP: " + m[1];
    if (/subagent/i.test(id) || t.toolSpecificData?.kind === "subagent") return null;
    const sink = VSCODE_TOOL_SINKS[id];
    if (sink === "Shell") return classifyTool("bash", { command: terminalCommand(t) });
    return sink ?? null;
}

function describeVSCodeTool(t) {
    const cmd = terminalCommand(t);
    if (cmd) return "$ " + cmd;
    const sd = t.toolSpecificData;
    if (sd?.kind === "subagent") return trunc(sd.description || sd.prompt, 400);
    return trunc(msgText(t.invocationMessage) || msgText(t.pastTenseMessage), 400);
}

const isToolPart = (x) => x && (x.kind === "toolInvocationSerialized" || x.kind === "toolInvocation") && x.toolCallId;
const reqEnd = (r) => r.modelState?.completedAt || (r.timestamp && r.elapsedMs ? r.timestamp + r.elapsedMs : 0)
    || (r.result?.timings?.totalElapsed ? r.timestamp + r.result.timings.totalElapsed : 0);
const reqPending = (r) => r && (r.modelState?.value === 0 || r.modelState?.value === 4
    || (r.modelState == null && !r.result && !reqEnd(r) && !r.isCanceled));
// VS Code writes unfinished tools with isComplete: true and summary.kind "incomplete".
const vscodeToolDone = (t) => !!t.isComplete && t.summary?.kind !== "incomplete";
// ToolConfirmKind: 0 is Denied and 5 is Skipped. Old files store a denial as isConfirmed: false.
const toolRejected = (t) => t.isConfirmed === false || t.isConfirmed?.type === 0 || t.isConfirmed?.type === 5;
const modelName = (id) => String(id || "").replace(/^copilot\//, "");

// Token use of one request for each model. VS Code stores whole-request totals for each model
// in `modelTotals`. Older records have only the request counters, for the model of the request.
const tokenCount = (v) => Number.isFinite(v) && v >= 0;
function requestUsage(r, mname) {
    const totals = (Array.isArray(r.modelTotals) ? r.modelTotals : []).filter((t) => t?.model && tokenCount(t.inputTokens) && tokenCount(t.outputTokens));
    if (totals.length) return totals.map((t) => ({ m: modelName(t.model), tin: t.inputTokens, tout: t.outputTokens }));
    return [{ m: mname, tin: num(r.promptTokens ?? r.result?.metadata?.promptTokens), tout: num(r.completionTokens ?? r.result?.metadata?.outputTokens) }];
}

// VS Code stores only the token totals of each request, and they grow while the request runs.
// Each increase is recorded as a token observation at the poll that sees it, so that the 2-minute
// rates show recent use only. VS Code does not record model calls, so the call count is null (unknown).
// At the first read of a file, the totals of requests that started before the first VS Code scan
// are old use. Requests that started later (for example in a new chat) are recent use.
// The seen totals stay after VS Code writes the log again, so that they are not counted twice.
let vscodeScanStart = 0;
function trackUsage(entry, now) {
    const reqs = Array.isArray(entry.state?.requests) ? entry.state.requests : [];
    const first = !entry.usage, exact = !first && now - (entry.lastTrackAt || 0) <= TRACK_GAP_MS;
    const since = entry.lastTrackAt || 0, seen = new Set();
    entry.usage ||= new Map(); entry.llm ||= [];
    reqs.forEach((r, i) => {
        if (!isObj(r)) return;
        for (const { m, tin, tout } of requestUsage(r, modelName(r.modelId))) {
            if (!m) continue;
            const key = (r.requestId || "#" + i) + "\n" + m, prev = entry.usage.get(key) || { tin: 0, tout: 0 };
            seen.add(key);
            const deltaIn = Math.max(0, tin - prev.tin), deltaOut = Math.max(0, tout - prev.tout);
            entry.usage.set(key, { tin: Math.max(tin, prev.tin), tout: Math.max(tout, prev.tout) });
            if (!(deltaIn || deltaOut) || (first && !(vscodeScanStart && (r.timestamp || 0) > vscodeScanStart))) continue;
            const end = reqEnd(r), endAt = exact || !(end > 0 && end >= since && end <= now) ? now : end;
            entry.llm.push({ sink: "LLM: " + m, tool: "model", model: m, tin: deltaIn, tout: deltaOut, desc: `${deltaIn} in / ${deltaOut} out tokens`,
                observation: true, calls: null, at: Math.max(r.timestamp || 0, Math.min(since, endAt)), endAt, ok: r.modelState?.value !== 3, tokens: deltaIn + deltaOut });
        }
    });
    for (const k of entry.usage.keys()) if (!seen.has(k)) entry.usage.delete(k);
    entry.llm = entry.llm.filter((f) => now - f.endAt < FLOW_WINDOW_MS).slice(-MAX_LLM);
}

// Tool parts have no timestamps. On the first read, we use the times of the request.
// After that, we record the poll time when a tool part appears and when it completes.
// After a gap in the collection (no poll), we use the request times again, but not before the last collection.
const TRACK_GAP_MS = 15 * 1000;
function trackTools(entry, now) {
    const reqs = Array.isArray(entry.state?.requests) ? entry.state.requests : [];
    const exact = entry.initialDone && now - (entry.lastTrackAt || 0) <= TRACK_GAP_MS;
    const since = entry.initialDone ? entry.lastTrackAt || 0 : 0;
    const seen = new Set();
    for (const r of reqs) {
        if (!isObj(r) || !Array.isArray(r.response)) continue;
        for (const t of r.response) {
            if (!isToolPart(t)) continue;
            seen.add(t.toolCallId);
            let rec = entry.tools.get(t.toolCallId);
            if (!rec) {
                rec = { startedAt: exact ? now : Math.max(r.timestamp || now, since) };
                entry.tools.set(t.toolCallId, rec);
            }
            if (vscodeToolDone(t) && !rec.endAt) rec.endAt = exact ? now : reqEnd(r) || Math.max(rec.startedAt, since);
        }
    }
    for (const k of entry.tools.keys()) if (!seen.has(k)) entry.tools.delete(k);
    entry.initialDone = true;
    entry.lastTrackAt = now;
}

function deriveVSCodeChat(file, entry, editor, mtimeMs, now) {
    const s = isObj(entry.state) ? entry.state : {};
    const reqs = (Array.isArray(s.requests) ? s.requests : []).filter(isObj);
    const last = reqs[reqs.length - 1];
    const flows = [], runningTools = [], subs = new Map();
    const tokens = { in: 0, out: 0 }, modelTokens = {};
    let model = modelName(s.inputState?.selectedModel?.identifier || s.inputState?.selectedModel?.id || ""), lastAssistant = "", unconfirmed = false;
    for (const r of reqs) {
        const mname = modelName(r.modelId);
        if (mname) model = mname;
        for (const { m, tin, tout } of requestUsage(r, mname)) {
            if (!m || !(tin || tout)) continue;
            tokens.in += tin; tokens.out += tout;
            const mt = modelTokens[m] ||= { in: 0, out: 0, calls: null };
            mt.in += tin; mt.out += tout;
        }
        const pending = r === last && reqPending(r);
        for (const t of Array.isArray(r.response) ? r.response : []) {
            if (!isObj(t)) continue;
            if (!t.kind && typeof t.value === "string" && t.value.trim()) lastAssistant = t.value;
            if (!isToolPart(t)) continue;
            const rec = entry.tools.get(t.toolCallId) || { startedAt: r.timestamp || now };
            const agentId = t.subAgentInvocationId || null;
            const sd = t.toolSpecificData;
            if (sd?.kind === "subagent") {
                const running = pending && !vscodeToolDone(t);
                subs.set(t.toolCallId, {
                    id: t.toolCallId, name: sd.agentDisplayName || sd.agentName || "subagent", type: sd.agentName || "subagent",
                    model: modelName(sd.modelId || sd.modelName),
                    startedAt: rec.startedAt, lastAt: rec.endAt || now, running, said: trunc(sd.description, 160),
                    endedAt: rec.endAt, failed: false,
                });
                continue;
            }
            const sink = classifyVSCodeTool(t), desc = describeVSCodeTool(t), name = String(t.toolId || "tool");
            const done = vscodeToolDone(t);
            if (!done && pending) {
                runningTools.push({ id: t.toolCallId, name, desc, startedAt: rec.startedAt, agentId, sink });
                if (t.isConfirmed == null) unconfirmed = true;
            } else if (done && sink && rec.endAt && now - rec.endAt < FLOW_WINDOW_MS) {
                flows.push({ sink, tool: name, desc, at: rec.startedAt, endAt: rec.endAt, ok: !toolRejected(t) && !t.resultError, agentId });
            }
        }
    }
    const subagents = [...subs.values()].filter((a) => a.running || now - (a.endedAt || a.lastAt) < 5 * 60e3);
    for (const t of runningTools) {
        const sa = t.agentId && subagents.find((a) => a.id === t.agentId);
        if (sa) sa.doing = t.desc ? `${t.name}: ${t.desc}` : t.name;
    }
    const fresh = now - mtimeMs < VSCODE_ACTIVE_MS;
    const pendingReq = reqPending(last) || (Array.isArray(s.pendingRequests) && s.pendingRequests.length > 0);
    const waiting = fresh && (last?.modelState?.value === 4 || unconfirmed);
    const busy = fresh && !waiting && pendingReq;
    const running = runningTools[runningTools.length - 1];
    const folder = entry.folder || "", folders = entry.folders || [];
    return {
        kind: "vscode-chat", id: path.basename(file).replace(/\.jsonl?$/, ""), surface: `${editor} chat`, live: true,
        name: trunc(s.customTitle || last?.message?.text || "VS Code chat", 90),
        cwd: folder, folders, repo: folder ? path.basename(folder) : "",
        model, busy, waiting, lastEventAt: mtimeMs,
        lastUser: trunc(last?.message?.text, 200), lastAssistant: trunc(lastAssistant, 240),
        intent: running ? trunc(running.desc || running.name, 120) : "",
        runningTools: busy || waiting ? runningTools : [], subagents,
        flows: [...flows.slice(-MAX_FLOWS), ...entry.llm.filter((f) => now - f.endAt < FLOW_WINDOW_MS)], peers: [], tokens, modelTokens,
    };
}

// Parse JSON with comments and trailing commas (.code-workspace files). Strings stay as they are.
function parseJsonc(text) {
    return JSON.parse(text.replace(/^\uFEFF/, "")
        .replace(/("(?:[^"\\]|\\.)*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (m, s) => s ?? "")
        .replace(/("(?:[^"\\]|\\.)*")|,(\s*[}\]])/g, (m, s, end) => s ?? end));
}

// The root folders of a VS Code window. A multi-root window refers to a .code-workspace file.
async function workspaceRoots(wsDir) {
    try {
        const w = JSON.parse(await fs.readFile(path.join(wsDir, "workspace.json"), "utf8"));
        if (w.folder) {
            const uri = String(w.folder);
            return [uri.startsWith("file:") ? fileURLToPath(uri) : decodeURIComponent(uri)];
        }
        if (!String(w.workspace || "").startsWith("file:")) return [];
        const file = fileURLToPath(String(w.workspace));
        const cfg = parseJsonc(await fs.readFile(file, "utf8"));
        const roots = [];
        for (const f of Array.isArray(cfg.folders) ? cfg.folders : []) {
            if (typeof f?.path === "string") roots.push(path.resolve(path.dirname(file), f.path));
            else if (typeof f?.uri === "string" && f.uri.startsWith("file:")) roots.push(fileURLToPath(f.uri));
        }
        return roots;
    } catch { return []; }
}

// VS Code copies chat files when a window moves to a new workspace and keeps the originals.
// A session can also have a legacy .json file and a .jsonl file. Use one file for each
// session ID: the newest file, then .jsonl before .json, then the first path.
const preferChatFile = (a, b) => (b.st.mtimeMs - a.st.mtimeMs) || (b.file.endsWith(".jsonl") - a.file.endsWith(".jsonl")) || (a.file < b.file ? -1 : a.file > b.file ? 1 : 0);

async function collectVSCodeChats(now) {
    vscodeScanStart ||= now;
    const byId = new Map(), seen = new Set();
    for (const userDir of VSCODE_USER_DIRS) {
        const wsRoot = path.join(userDir, "workspaceStorage");
        let wsIds = [];
        try { wsIds = await fs.readdir(wsRoot); } catch {}
        const editor = path.basename(path.dirname(userDir));
        const dirs = wsIds.map((w) => ({ dir: path.join(wsRoot, w, "chatSessions"), wsDir: path.join(wsRoot, w) }));
        dirs.push({ dir: path.join(userDir, "globalStorage", "emptyWindowChatSessions"), wsDir: null });
        await Promise.all(dirs.map(async ({ dir, wsDir }) => {
            let files;
            try { files = await fs.readdir(dir); } catch { return; }
            for (const f of files) {
                if (!/\.jsonl?$/.test(f)) continue;
                const file = path.join(dir, f);
                let st;
                try { st = await fs.stat(file); } catch { continue; }
                if (now - st.mtimeMs > VSCODE_ACTIVE_MS || st.size > MAX_VSCODE_FILE) continue;
                const id = f.replace(/\.jsonl?$/, "");
                if (!byId.has(id)) byId.set(id, []);
                byId.get(id).push({ file, st, wsDir, editor });
            }
        }));
    }
    const out = [];
    await Promise.all([...byId.values()].map(async (cands) => {
        const { file, st, wsDir, editor } = cands.sort(preferChatFile)[0];
        seen.add(file);
        let entry = vscodeCache.get(file);
        if (!entry) {
            entry = { offset: 0 };
            if (wsDir) {
                entry.folders = await workspaceRoots(wsDir);
                entry.folder = entry.folders[0];
            }
            vscodeCache.set(file, entry);
        }
        try {
            await readVSCodeLog(file, entry, st);
            // Until the full-state line of a new or rewritten log is parsed, keep the tracking data as it is.
            if (!entry.replay) { trackUsage(entry, now); trackTools(entry, now); }
            out.push(deriveVSCodeChat(file, entry, editor, st.mtimeMs, now));
        } catch { vscodeCache.delete(file); }
    }));
    for (const k of vscodeCache.keys()) if (!seen.has(k)) vscodeCache.delete(k);
    return out;
}

// ---- VS Code windows bridged to Copilot ----
async function collectIDEs() {
    let files;
    try { files = await fs.readdir(IDE_DIR); } catch { return []; }
    const out = [];
    for (const f of files) {
        if (!f.endsWith(".lock")) continue;
        try {
            const j = JSON.parse(await fs.readFile(path.join(IDE_DIR, f), "utf8"));
            if (!j.pid || !pidAlive(j.pid)) continue;
            out.push({ id: f.replace(/\.lock$/, ""), ide: j.ideName || "IDE", pid: j.pid, folders: j.workspaceFolders || [] });
        } catch {}
    }
    return out;
}

// The poller and the snapshot action both collect. The incremental readers keep file
// offsets, so two collections at the same time would apply the same events twice.
let collectQueue = Promise.resolve();
export function collectSnapshot(opts) {
    const run = collectQueue.then(() => collectOnce(opts));
    collectQueue = run.catch(() => {});
    return run;
}

async function collectOnce({ includeIdle = true } = {}) {
    const now = Date.now();
    const [copilot, vscode, ides] = await Promise.all([collectCopilotSessions(now), collectVSCodeChats(now), collectIDEs()]);
    let sessions = [...copilot, ...vscode];
    if (!includeIdle) sessions = sessions.filter((s) => s.busy || s.waiting || s.backgroundShells?.length || now - s.lastEventAt < 5 * 60e3);
    sessions.sort((a, b) => (b.busy - a.busy) || (b.lastEventAt - a.lastEventAt));
    return { now, sessions, ides };
}
