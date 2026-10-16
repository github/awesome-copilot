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
const VSCODE_USER_DIRS = [
    "Code", "Code - Insiders", "Cursor", "VSCodium",
].map((n) => process.platform === "darwin"
    ? path.join(HOME, "Library", "Application Support", n, "User")
    : process.platform === "win32"
        ? path.join(process.env.APPDATA || "", n, "User")
        : path.join(HOME, ".config", n, "User"));

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

const pidAlive = (pid) => {
    try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; }
};

function parseYaml(text) {
    const o = {};
    let block = null;
    for (const line of text.split("\n")) {
        if (block && /^\s+/.test(line)) { o[block] += (o[block] ? " " : "") + line.trim(); continue; }
        block = null;
        const m = line.match(/^([A-Za-z_]+):\s*(.*)$/);
        if (!m) continue;
        if (/^[|>][-+]?$/.test(m[2])) { block = m[1]; o[m[1]] = ""; }
        else o[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
    }
    return o;
}

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

// mcpServer is the MCP server name from the event (data.mcpServerName), if known.
export function classifyTool(name, args = {}, mcpServer = "") {
    if (!name) return null;
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
    if (mcpServer) return "MCP: " + mcpServer;
    const dash = name.indexOf("-");
    if (dash > 0) return "MCP: " + name.slice(0, dash);
    return null;
}

function describeArgs(name, a = {}) {
    if (!a || typeof a !== "object") return "";
    if (typeof a.command === "string") return trunc("$ " + a.command.replace(/\s*\n\s*/g, " ⏎ "), 600);
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
        toolStarts: new Map(), subs: new Map(), turnOpen: false, pendingPerm: 0, pendingInput: 0,
        flows: [], llm: [], peers: [], tokens: { in: 0, out: 0 }, modelTokens: {},
    };
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
            break;
        case "assistant.turn_start": if (!agentId) p.turnOpen = true; break;
        case "session.start": case "session.resume": if (d.selectedModel && !agentId) p.model = d.selectedModel; break;
        case "session.model_change": if (d.newModel && !agentId) p.model = d.newModel; break;
        // session.idle is not written to the log, and session.task_complete is optional.
        case "assistant.turn_end": if (!agentId) p.turnOpen = false; break;
        case "session.idle": case "session.task_complete": case "abort": case "session.shutdown":
            if (!agentId) {
                p.turnOpen = false;
                if (e.type !== "session.task_complete") { p.toolStarts.clear(); p.pendingPerm = 0; p.pendingInput = 0; }
            }
            break;
        case "assistant.message":
            if (d.model && !agentId) p.model = d.model;
            if (d.content && !agentId) p.lastAssistant = trunc(d.content, 240);
            if (sa && d.content) sa.said = trunc(d.content, 160);
            break;
        case "tool.execution_start": {
            const name = d.toolName, args = d.arguments || {};
            if (d.model && !agentId) p.model = d.model;
            p.toolStarts.set(d.toolCallId, { id: d.toolCallId, name, desc: describeArgs(name, args), startedAt: ts, agentId, sink: classifyTool(name, args, d.mcpServerName) });
            if (name === "report_intent" && !agentId) p.intent = trunc(args.intent, 80);
            if (name === "send_session_message" && args.session_id)
                p.peers.push({ to: args.session_id, at: ts, kind: "message", text: trunc(args.message, 160) });
            break;
        }
        case "tool.execution_complete": {
            if (d.model && !agentId) p.model = d.model;
            const t = p.toolStarts.get(d.toolCallId);
            if (!t) break;
            p.toolStarts.delete(d.toolCallId);
            if (t.sink) p.flows.push({ sink: t.sink, tool: t.name, desc: t.desc, at: t.startedAt, endAt: ts, ok: d.success !== false, agentId: t.agentId });
            if (/^(create_session|open_pr_session|open_issue_session)$/.test(t.name)) {
                const content = typeof d.result?.content === "string" ? d.result.content : JSON.stringify(d.result || "");
                const m = content.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
                if (m) p.peers.push({ to: m[1], at: ts, kind: "spawn", text: t.desc });
            }
            break;
        }
        case "subagent.started": {
            const id = e.agentId || d.toolCallId;
            p.subs.set(id, {
                id, name: d.agentDisplayName || d.agentName, type: d.agentType || d.agentName,
                model: d.model, startedAt: ts, lastAt: ts, mode: d.executionMode, said: "", running: true,
            });
            break;
        }
        case "subagent.completed": case "subagent.failed": {
            const s = p.subs.get(e.agentId || d.toolCallId);
            if (s) { s.running = false; s.endedAt = ts; s.failed = e.type === "subagent.failed"; }
            for (const [k, t] of p.toolStarts) if (t.agentId === (e.agentId || d.toolCallId)) p.toolStarts.delete(k);
            break;
        }
        case "permission.requested": p.pendingPerm++; break;
        case "permission.completed": p.pendingPerm = Math.max(0, p.pendingPerm - 1); break;
        case "elicitation.requested": case "user_input.requested": p.pendingInput++; break;
        case "elicitation.completed": case "user_input.completed": p.pendingInput = Math.max(0, p.pendingInput - 1); break;
        case "session.usage_record": {
            const u = d.usage || {};
            const rawName = String(u.modelDisplayName || u.model || "model").replace(/^[0-9a-f]{8}-[0-9a-f-]{27}\//i, "");
            const mname = u.isByok ? rawName + " · BYOK" : rawName, tin = u.inputTokens || 0, tout = u.outputTokens || 0;
            p.llm.push({ sink: "LLM: " + mname, tool: "model", model: mname, tin, tout, desc: `${tin} in / ${tout} out tokens`, at: ts - (u.duration || 0), endAt: ts, ok: true, agentId, tokens: tin + tout });
            p.tokens.in += tin; p.tokens.out += tout;
            const mt = p.modelTokens[mname] ||= { in: 0, out: 0, calls: 0 };
            mt.in += tin; mt.out += tout; mt.calls++;
            break;
        }
    }
    // Model calls are kept by time, not by count, so that the 2-minute token rates stay correct.
    if (p.flows.length > MAX_FLOWS) p.flows.splice(0, p.flows.length - MAX_FLOWS);
    while (p.llm.length && p.llm[0].endAt < p.lastEventAt - FLOW_WINDOW_MS) p.llm.shift();
    if (p.llm.length > MAX_LLM) p.llm.splice(0, p.llm.length - MAX_LLM);
    if (p.peers.length > 50) p.peers.splice(0, p.peers.length - 50);
}

// The initial tail can start after a sub-agent started or after the model was selected.
// Scan the older bytes for sub-agent lifecycle and model lines only, so that tools in the
// tail resolve to a named sub-agent and the session shows its current model.
// Returns the start of the line that contains `end`, where the tail reader must start.
const PRESCAN_PREFIXES = ["subagent.", "session.start", "session.resume", "session.model_change"].map((t) => Buffer.from('{"type":"' + t));
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
                if (PRESCAN_PREFIXES.some((x) => data.subarray(start, start + x.length).equals(x))) {
                    try { applyEvent(p, JSON.parse(data.toString("utf8", start, nl))); } catch {}
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
    const live = entries.some((e) => { const m = e.match(/^inuse\.(\d+)\.lock$/); return m && pidAlive(+m[1]); });
    if (!live && now - st.mtimeMs > RECENT_MS) { sessionState.delete(id); return null; }

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
    const subagents = [...p.subs.values()]
        .map((a) => ({ ...a, running: live && a.running && now - a.lastAt < 20 * 60e3 }))
        .filter((a) => a.running || now - (a.endedAt || a.lastAt) < 5 * 60e3);
    // Ignore orphaned tool starts (crashed/abandoned turns). A question to the user stays
    // pending for the full waiting window, because it can wait a long time for an answer.
    const runningTools = [...p.toolStarts.values()].filter((t) => live && (t.name === "ask_user"
        ? quietMs < WAITING_WINDOW_MS
        : now - t.startedAt < 30 * 60e3 || quietMs < 10 * 60e3));
    for (const t of runningTools) {
        const sa = t.agentId && subagents.find((a) => a.id === t.agentId);
        if (sa) sa.doing = t.desc ? `${t.name}: ${t.desc}` : t.name;
    }
    const waiting = live && (p.pendingPerm > 0 || p.pendingInput > 0 || runningTools.some((t) => t.name === "ask_user")) && quietMs < WAITING_WINDOW_MS;
    const busy = live && !waiting && (runningTools.length > 0 || subagents.some((a) => a.running) || (p.turnOpen && quietMs < 3 * 60e3));
    const surface = client === "vscode-agent-host" ? "VS Code agent" : client === "github/autopilot" ? "Copilot app" : /cli/i.test(client) ? "Copilot CLI" : client;
    return {
        kind: "copilot", id, live, client, surface,
        name: trunc(ws.name || ws.summary || p.lastUser || id.slice(0, 8), 90),
        cwd: ws.cwd || "", repo: ws.cwd ? path.basename(ws.cwd) : "",
        model: p.model, busy, waiting, lastEventAt: p.lastEventAt,
        lastUser: p.lastUser, lastAssistant: p.lastAssistant, intent: p.intent,
        runningTools, subagents,
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
    return out;
}

// ---- VS Code Copilot Chat panel sessions ----
// A chat file is a mutation log: {kind:0,v} sets the full state, {kind:1,k,v} sets the value
// at path k, {kind:2,k,v,i} cuts the array at index i and appends v, {kind:3,k} deletes path k.
// We replay each file incrementally. The old format (.json) is one full JSON object.
const vscodeCache = new Map(); // file -> { ino, offset, partial, state, tools, folder, folders, initialDone, lastTrackAt }
const MAX_VSCODE_FILE = 64 * 1024 * 1024;

function mutate(root, e) {
    if (e.kind === 0) return e.v;
    const k = Array.isArray(e.k) ? e.k : [];
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

async function readVSCodeLog(file, entry, st) {
    if (entry.ino !== st.ino || st.size < entry.offset) {
        Object.assign(entry, { ino: st.ino, offset: 0, partial: Buffer.alloc(0), state: {}, tools: new Map(), initialDone: false });
    }
    // The old .json format is one object that VS Code writes again in place. Use the time, not the size.
    if (file.endsWith(".json")) {
        if (entry.mtimeMs === st.mtimeMs && entry.offset === st.size) return;
        entry.state = JSON.parse(await fs.readFile(file, "utf8"));
        entry.offset = st.size;
        entry.mtimeMs = st.mtimeMs;
        return;
    }
    if (st.size === entry.offset) return;
    const fh = await fs.open(file, "r");
    try {
        const len = st.size - entry.offset;
        const buf = Buffer.alloc(len);
        await fh.read(buf, 0, len, entry.offset);
        entry.offset += len;
        for (const line of takeLines(entry, buf)) {
            if (!line || line[0] !== "{") continue;
            try { entry.state = mutate(entry.state, JSON.parse(line)); } catch {}
        }
    } finally { await fh.close(); }
}

// Built-in VS Code chat tools and the destinations of their data. null means no destination.
const VSCODE_TOOL_SINKS = {
    run_in_terminal: "Shell", "Run in Terminal": "Shell", send_to_terminal: "Shell", get_terminal_output: "Shell",
    kill_terminal: "Shell", await_terminal: "Shell", terminal_last_command: "Shell",
    runTests: "Build / run", install_python_packages: "Build / run", configure_python_environment: "Build / run",
    copilot_readFile: "Filesystem", findTextInFiles: "Filesystem", createFile: "Filesystem", replaceString: "Filesystem",
    multiReplaceString: "Filesystem", applyPatch: "Filesystem", listDirectory: "Filesystem", findFiles: "Filesystem",
    getErrors: "Filesystem", viewImage: "Filesystem", searchCodebase: "Filesystem", createDirectory: "Filesystem",
    getChangedFiles: "Filesystem",
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
    if (cmd) return trunc("$ " + cmd.replace(/\s*\n\s*/g, " ⏎ "), 600);
    const sd = t.toolSpecificData;
    if (sd?.kind === "subagent") return trunc(sd.description || sd.prompt, 400);
    return trunc(msgText(t.invocationMessage) || msgText(t.pastTenseMessage), 400);
}

const isToolPart = (x) => x && (x.kind === "toolInvocationSerialized" || x.kind === "toolInvocation") && x.toolCallId;
const reqEnd = (r) => r.modelState?.completedAt || (r.timestamp && r.elapsedMs ? r.timestamp + r.elapsedMs : 0)
    || (r.result?.timings?.totalElapsed ? r.timestamp + r.result.timings.totalElapsed : 0);
const reqPending = (r) => r && (r.modelState?.value === 0 || r.modelState?.value === 4
    || (r.modelState == null && !r.result && !reqEnd(r)));
// VS Code writes unfinished tools with isComplete: true and summary.kind "incomplete".
const vscodeToolDone = (t) => !!t.isComplete && t.summary?.kind !== "incomplete";
const modelName = (id) => String(id || "").replace(/^copilot\//, "");

// Token use of one request for each model. VS Code stores whole-request totals for each model
// in `modelTotals`. Older records have only the request counters, for the model of the request.
const tokenCount = (v) => Number.isFinite(v) && v >= 0;
function requestUsage(r, mname) {
    const totals = (Array.isArray(r.modelTotals) ? r.modelTotals : []).filter((t) => t?.model && tokenCount(t.inputTokens) && tokenCount(t.outputTokens));
    if (totals.length) return totals.map((t) => ({ m: modelName(t.model), tin: t.inputTokens, tout: t.outputTokens }));
    return [{ m: mname, tin: r.promptTokens ?? r.result?.metadata?.promptTokens ?? 0, tout: r.completionTokens ?? r.result?.metadata?.outputTokens ?? 0 }];
}

// Tool parts have no timestamps. On the first read, we use the times of the request.
// After that, we record the poll time when a tool part appears and when it completes.
// After a gap in the collection (no poll), we use the request times again, but not before the last collection.
const TRACK_GAP_MS = 15 * 1000;
function trackTools(entry, now) {
    const reqs = Array.isArray(entry.state.requests) ? entry.state.requests : [];
    const exact = entry.initialDone && now - (entry.lastTrackAt || 0) <= TRACK_GAP_MS;
    const since = entry.initialDone ? entry.lastTrackAt || 0 : 0;
    for (const r of reqs) {
        if (!Array.isArray(r.response)) continue;
        for (const t of r.response) {
            if (!isToolPart(t)) continue;
            let rec = entry.tools.get(t.toolCallId);
            if (!rec) {
                rec = { startedAt: exact ? now : Math.max(r.timestamp || now, since) };
                entry.tools.set(t.toolCallId, rec);
            }
            if (vscodeToolDone(t) && !rec.endAt) rec.endAt = exact ? now : reqEnd(r) || Math.max(rec.startedAt, since);
        }
    }
    entry.initialDone = true;
    entry.lastTrackAt = now;
}

function deriveVSCodeChat(file, entry, editor, mtimeMs, now) {
    const s = entry.state || {};
    const reqs = Array.isArray(s.requests) ? s.requests : [];
    const last = reqs[reqs.length - 1];
    const flows = [], llm = [], runningTools = [], subs = new Map();
    const tokens = { in: 0, out: 0 }, modelTokens = {};
    let model = modelName(s.inputState?.selectedModel?.identifier || s.inputState?.selectedModel?.id || ""), lastAssistant = "", unconfirmed = false;
    for (const r of reqs) {
        const mname = modelName(r.modelId);
        if (mname) model = mname;
        for (const { m, tin, tout } of requestUsage(r, mname)) {
            if (!m || !(tin || tout)) continue;
            tokens.in += tin; tokens.out += tout;
            const mt = modelTokens[m] ||= { in: 0, out: 0, calls: 0 };
            mt.in += tin; mt.out += tout; mt.calls++;
            const endAt = reqEnd(r);
            if (endAt && now - endAt < FLOW_WINDOW_MS)
                llm.push({ sink: "LLM: " + m, tool: "model", model: m, tin, tout, desc: `${tin} in / ${tout} out tokens`, at: r.timestamp || endAt, endAt, ok: r.modelState?.value !== 3, tokens: tin + tout });
        }
        const pending = r === last && reqPending(r);
        for (const t of Array.isArray(r.response) ? r.response : []) {
            if (!t) continue;
            if (!t.kind && typeof t.value === "string" && t.value.trim()) lastAssistant = t.value;
            if (!isToolPart(t)) continue;
            const rec = entry.tools.get(t.toolCallId) || { startedAt: r.timestamp || now };
            const agentId = t.subAgentInvocationId || null;
            const sd = t.toolSpecificData;
            if (sd?.kind === "subagent") {
                const running = pending && !vscodeToolDone(t);
                subs.set(t.toolCallId, {
                    id: t.toolCallId, name: sd.agentName || "subagent", type: sd.agentName || "subagent",
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
                flows.push({ sink, tool: name, desc, at: rec.startedAt, endAt: rec.endAt, ok: t.isConfirmed?.type !== 0 && !t.resultError, agentId });
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
        flows: [...flows.slice(-MAX_FLOWS), ...llm], peers: [], tokens, modelTokens,
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
            trackTools(entry, now);
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
    if (!includeIdle) sessions = sessions.filter((s) => s.busy || s.waiting || now - s.lastEventAt < 5 * 60e3);
    sessions.sort((a, b) => (b.busy - a.busy) || (b.lastEventAt - a.lastEventAt));
    return { now, sessions, ides };
}
