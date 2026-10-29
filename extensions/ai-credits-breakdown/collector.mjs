// Builds a per-day / per-session / per-model ledger of GitHub Copilot AI credits
// from the telemetry the Copilot CLI and Copilot app already keep on this machine.
//
// Everything here is read-only and local. Sources (all optional):
//   1. <home>/session-store.db  assistant_usage_events  per-call metered nano-AIU
//   2. <home>/session-state/*/events.jsonl  session.shutdown       cumulative per-session metrics
//                                           session.usage_checkpoint  prompt-cache lifetimes
//   3. <home>/data.db           Copilot app per-session totals, automations, projects
//
// 1 AI credit = 1 AIU = $0.01.  total_nano_aiu / 1e9 = credits.
// No prompts, session titles, file paths or URLs are read into the ledger.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

// node:sqlite needs Node 22.13+. It is loaded with process.getBuiltinModule (Node 22.3+) rather than a
// static import: Node 22's module.builtinModules omits "node:"-only modules, so the repository's canvas
// smoke test, which runs on Node 22, would report a static import of it as an undeclared dependency.
const sqlite = process.getBuiltinModule?.("node:sqlite");
if (!sqlite) throw new Error("AI Credits Breakdown needs Node 22.13 or later (it reads your usage with node:sqlite).");
const { DatabaseSync } = sqlite;

export const CREDIT_USD = 0.01;
const EV_MIN_RESIDUAL = 1.0; // credits; ignore smaller disagreements between sources

// $/1M tokens (input, cached input, cache write, output). Used only where per-call telemetry
// has not revealed a model's own rates, and to split session totals into what they paid for.
// Published table: https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing
const FALLBACK_RATES = {
    "claude-opus-4.8": [5, 0.5, 6.25, 25],
    "claude-opus-5": [5, 0.5, 6.25, 25],
    "claude-opus-5.5": [4, 0.2, 5, 20],
    "claude-sonnet-5": [2, 0.2, 2.5, 10],
    "claude-sonnet-5.5": [2, 0.2, 2.5, 10],
    "claude-sonnet-4.6": [3, 0.3, 3.75, 15],
    "claude-haiku-4.5": [1, 0.1, 1.25, 5],
    "gpt-5.3-codex": [1.75, 0.175, 0, 14],
    "gpt-5.4": [2.5, 0.25, 0, 15],
    "gpt-5.4-mini": [0.75, 0.075, 0, 4.5],
    "gpt-5.5": [5, 0.5, 0, 30],
    "gpt-5.6-sol": [4, 0.4, 5, 20],
    "gpt-5.6-terra": [2, 0.2, 2.5, 12],
    "gpt-5.6-luna": [0.2, 0.02, 0.25, 1.2],
    "gpt-6-astra": [10, 1, 12.5, 50],
    "gpt-6-sol": [2, 0.2, 2.5, 10],
    "gpt-6.1-sol": [2, 0.1, 2.5, 10],
    "mai-code-1.1-flash": [0.2, 0.02, 0, 1.2],
    "kimi-k2.7-code": [3, 0.3, 0, 15],
    // Not in the published table: priced like the nearest published sibling.
    "claude-opus-4.6": [5, 0.5, 6.25, 25],
    "claude-opus-4.6-1m": [5, 0.5, 6.25, 25],
    "claude-opus-4.7": [5, 0.5, 6.25, 25],
    "claude-opus-4.7-xhigh": [5, 0.5, 6.25, 25],
    "gpt-5.2": [1.75, 0.175, 0, 14],
    "gpt-5-mini": [0.25, 0.025, 0, 2],
};
const ASSUMED_RATE_MODELS = [
    "claude-opus-4.6", "claude-opus-4.6-1m", "claude-opus-4.7", "claude-opus-4.7-xhigh", "gpt-5.2",
];

const SURFACE_BY_APP_TYPE = {
    project: "Copilot app · project session",
    workspace: "Copilot app · project session",
    general_chat: "Copilot app · chat",
    workflow: "Copilot app · automation",
    workflow_workspace: "Copilot app · automation",
    cli_session: "Copilot CLI",
};
const KIND_BY_INITIATOR = {
    user: "Your prompt",
    agent: "Agent turn",
    "sub-agent": "Sub-agent",
    compaction: "Context compaction",
};

// What each per-call metered model call found in the prompt cache (see cacheStates()); display order.
export const CACHE_STATES = [
    ["warm", "Cache reused"],
    ["expired", "Expired after a pause"],
    ["rebuilt", "Rebuilt mid-conversation"],
    ["new", "New conversation"],
    ["none", "Not itemised"],
];
const CACHE_IDX = Object.fromEntries(CACHE_STATES.map(([id], i) => [id, i]));
const CACHE_REUSE_MIN = 0.5; // share of the previous call's prompt that must come back as cache reads
// Prompt-cache lifetimes (seconds) used when the CLI has recorded none for a model's family.
const DEFAULT_CACHE_TTL = { claude: 300, other: 1800 };
const TOKEN_TYPES = ["input", "cache_read", "cache_write", "output"];

export function copilotHome() {
    return process.env.COPILOT_HOME || path.join(os.homedir(), ".copilot");
}

export function localTimeZone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function family(model) {
    const m = model.toLowerCase();
    if (m.includes("opus")) return "Claude Opus";
    if (m.includes("sonnet") || m.includes("haiku")) return "Claude Sonnet & Haiku";
    if (m.startsWith("gpt")) return "GPT";
    return "Other";
}

// Lookup in a table keyed by values read from local telemetry, which must never reach inherited
// properties such as "constructor".
const ownValue = (table, key) => (Object.hasOwn(table, key) ? table[key] : undefined);

const PRETTY = { gpt: "GPT", mai: "MAI", kimi: "Kimi", claude: "Claude" };
export function prettyModel(id) {
    return id.replace("-1m", " (1M)").split("-").map((part) => {
        const lower = part.toLowerCase();
        if (ownValue(PRETTY, lower)) return PRETTY[lower];
        if (/^\d/.test(part) || part.startsWith("(")) return part;
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    }).join(" ");
}

const isoDay = (ts) => ts.slice(0, 10);
const round3 = (x) => Math.round(x * 1000) / 1000;
const zeros = () => [0, 0, 0, 0];

// Most frequent key of a Map<key, count>; the first one seen wins a tie.
function mode(counter) {
    let best, bestCount = -1;
    for (const [key, count] of counter) {
        if (count > bestCount) { best = key; bestCount = count; }
    }
    return best;
}
function bump(map, key, by = 1) {
    map.set(key, (map.get(key) || 0) + by);
}
function nested(map, key, make) {
    let value = map.get(key);
    if (value === undefined) { value = make(); map.set(key, value); }
    return value;
}

// Weekday (Mon=0) and hour of a timestamp in a time zone. The UTC offset is looked up once per
// 15-minute bucket, because zone transitions never fall inside one.
export function createLocalClock(timeZone) {
    const format = new Intl.DateTimeFormat("en-US", {
        timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric",
        hour: "numeric", minute: "numeric", second: "numeric",
    });
    const offsets = new Map();
    const BUCKET = 15 * 60 * 1000;
    const offsetFor = (ms) => {
        const bucket = Math.floor(ms / BUCKET);
        let offset = offsets.get(bucket);
        if (offset === undefined) {
            const start = bucket * BUCKET;
            const p = Object.fromEntries(format.formatToParts(new Date(start)).map((x) => [x.type, Number(x.value)]));
            offset = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - start;
            offsets.set(bucket, offset);
        }
        return offset;
    };
    return (ms) => {
        const local = new Date(ms + offsetFor(ms));
        return { weekday: (local.getUTCDay() + 6) % 7, hour: local.getUTCHours() };
    };
}

function openReadOnly(file) {
    if (!fs.existsSync(file)) return null;
    try {
        const db = new DatabaseSync(file, { readOnly: true });
        // The Copilot CLI and app may be writing right now; wait briefly rather than fail.
        db.exec("PRAGMA busy_timeout = 3000");
        return db;
    } catch {
        return null;
    }
}

function tableColumns(db, table) {
    try {
        return new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name));
    } catch {
        return new Set();
    }
}

// Per-call events grouped by session, and the per-token rates each model's calls revealed.
export function loadEvents(db) {
    const bySession = new Map();
    const ratesSeen = new Map();
    const have = tableColumns(db, "assistant_usage_events");
    const required = ["session_id", "model", "total_nano_aiu", "created_at"];
    if (required.some((column) => !have.has(column))) return { bySession, ratesSeen };
    const wanted = ["session_id", "model", "input_tokens", "output_tokens", "cache_read_tokens", "cache_write_tokens",
        "total_nano_aiu", "initiator", "token_details_json", "created_at", "id", "agent_id", "duration_ms"];
    const select = wanted.map((column) => (have.has(column) ? column : `NULL AS ${column}`)).join(", ");
    for (const row of db.prepare(`SELECT ${select} FROM assistant_usage_events`).iterate()) {
        const timestamp = String(row.created_at ?? "").trim().replace(" ", "T");
        const startMs = Date.parse(/[zZ]$|[+-]\d{2}:\d{2}$/.test(timestamp) ? timestamp : `${timestamp}Z`);
        if (!row.session_id || !row.model || Number.isNaN(startMs)) continue;
        row.created_at = new Date(startMs).toISOString();
        const comps = { input: 0, cache_read: 0, cache_write: 0, output: 0 };
        const tok = { input: 0, cache_read: 0, cache_write: 0, output: 0 };
        let itemised = false;
        try {
            for (const t of JSON.parse(row.token_details_json || "[]")) {
                if (!Object.hasOwn(comps, t.tokenType)) continue;
                const rate = t.costPerBatch / t.batchSize / 1e9; // credits per token
                if (!Number.isFinite(rate)) continue;
                itemised = true;
                comps[t.tokenType] += t.tokenCount * rate;
                tok[t.tokenType] += t.tokenCount;
                if (t.tokenCount > 0) {
                    const byType = nested(ratesSeen, row.model, () => new Map());
                    bump(nested(byType, t.tokenType, () => new Map()), Math.round(rate * 1e10) / 1e4);
                }
            }
        } catch { /* malformed token details: keep the call's credits without a split */ }
        // The token details are what the credits are priced from, so they win. Without them (absent,
        // empty or malformed) the call's own counters still give its token counts; input_tokens includes
        // the cached tokens, so fresh input is what is left after them.
        if (!itemised) {
            tok.cache_read = row.cache_read_tokens ?? 0;
            tok.cache_write = row.cache_write_tokens ?? 0;
            tok.output = row.output_tokens ?? 0;
            tok.input = row.input_tokens == null ? 0 : Math.max(0, row.input_tokens - tok.cache_read - tok.cache_write);
        }
        nested(bySession, row.session_id, () => []).push({
            model: row.model,
            credits: (row.total_nano_aiu || 0) / 1e9,
            comps, tok,
            kind: ownValue(KIND_BY_INITIATOR, row.initiator || "") || "Background",
            ts: row.created_at,
            // created_at is when the call finished; the request went out duration_ms earlier.
            start: startMs / 1000 - (row.duration_ms || 0) / 1000,
            id: row.id,
            // The main agent, each sub-agent and the background calls hold separate conversations.
            stream: `${row.agent_id || ""}\u0000${row.initiator ? "main" : "background"}`,
            prompt: row.input_tokens ?? tok.input + tok.cache_read + tok.cache_write,
            cached: row.cache_read_tokens ?? tok.cache_read,
        });
    }
    return { bySession, ratesSeen };
}

// Prompt-cache lifetime in seconds per model: the CLI's own record, else what it recorded for the
// model's provider family (Claude or the others), else that family's default.
export function cacheTtlFor(recorded) {
    const ttl = new Map([...recorded].map(([model, counter]) => [model, mode(counter)]));
    const group = (model) => (model.startsWith("claude") ? "claude" : "other");
    const summary = {};
    for (const g of Object.keys(DEFAULT_CACHE_TTL)) {
        const seen = new Map();
        for (const [model, seconds] of ttl) if (group(model) === g) bump(seen, seconds);
        summary[g] = seen.size ? mode(seen) : DEFAULT_CACHE_TTL[g];
    }
    return { ttlFor: (model) => ttl.get(model) || summary[group(model)], summary };
}

// Tag every per-call event with what it found in the prompt cache (event.cs, an index into CACHE_STATES).
// Calls are taken in request order within a conversation. A call reused the cache when at least half of
// the previous call's prompt (same conversation and model) came back as cache reads. Otherwise the prompt
// was written to the cache again: "expired" when that previous call went out longer ago than the model's
// cache lifetime, "rebuilt" when it was recent or there was none on this model (a model switch,
// compaction or a changed prompt). The first call of a conversation is "new".
export function cacheStates(bySession, ttlFor) {
    for (const events of bySession.values()) {
        const seen = new Set();
        const last = new Map();
        const ordered = [...events].sort((a, b) => a.start - b.start || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
        for (const e of ordered) {
            const key = `${e.stream}\u0001${e.model}`;
            const prev = last.get(key);
            let state;
            if (!seen.has(e.stream)) state = "new";
            else if (prev && e.cached >= CACHE_REUSE_MIN * prev.prompt) state = "warm";
            else if (prev && e.start - prev.start >= ttlFor(e.model)) state = "expired";
            else state = "rebuilt";
            e.cs = CACHE_IDX[state];
            seen.add(e.stream);
            last.set(key, { start: e.start, prompt: e.prompt });
        }
    }
}

// Credits per 1M tokens (input, cache_read, cache_write, output): the modal rate each model's calls
// revealed, else the published table.
export function buildRates(ratesSeen) {
    const rates = new Map();
    for (const [model, byType] of ratesSeen) {
        const fallback = ownValue(FALLBACK_RATES, model);
        rates.set(model, TOKEN_TYPES.map((type, i) => {
            const counter = byType.get(type);
            if (counter) return mode(counter);
            return fallback ? fallback[i] * 100 : 0;
        }));
    }
    for (const [model, fallback] of Object.entries(FALLBACK_RATES)) {
        if (!rates.has(model)) rates.set(model, fallback.map((x) => x * 100));
    }
    return rates;
}

function price(model, tok, rates) {
    const r = rates.get(model);
    if (!r) return null;
    return { input: tok.input * r[0] / 1e6, cache_read: tok.cache_read * r[1] / 1e6, cache_write: tok.cache_write * r[2] / 1e6, output: tok.output * r[3] / 1e6 };
}

// Scan one events.jsonl buffer for lines that start with a given JSON prefix, in file order.
function* linesStartingWith(buffer, needle) {
    let pos = 0;
    while ((pos = buffer.indexOf(needle, pos)) !== -1) {
        if (pos === 0 || buffer[pos - 1] === 10) {
            let end = buffer.indexOf(10, pos);
            if (end === -1) end = buffer.length;
            yield buffer.toString("utf8", pos, end);
            pos = end;
        } else {
            pos += needle.length;
        }
    }
}
const SHUTDOWN_LINE = Buffer.from('{"type":"session.shutdown"');
const CHECKPOINT_LINE = Buffer.from('{"type":"session.usage_checkpoint"');

// What one transcript contributes: the prompt-cache lifetimes its usage checkpoints recorded, and its
// shutdown records as [timestamp, totalCredits, {model: {credits, tok, calls}}] in file order.
function parseTranscript(buffer) {
    const ttls = [];
    for (const line of linesStartingWith(buffer, CHECKPOINT_LINE)) {
        try {
            for (const state of JSON.parse(line).data.modelCacheState || []) {
                if (state.modelId && state.cacheTtlSeconds) ttls.push([state.modelId, Math.trunc(Number(state.cacheTtlSeconds))]);
            }
        } catch { /* skip malformed checkpoint */ }
    }
    const seq = [];
    for (const line of linesStartingWith(buffer, SHUTDOWN_LINE)) {
        let event;
        try { event = JSON.parse(line); } catch { continue; }
        const d = event.data || {};
        const models = Object.create(null);
        for (const [model, mm] of Object.entries(d.modelMetrics || {})) {
            const td = mm.tokenDetails || {};
            const u = mm.usage || {};
            const tok = {
                input: td.input?.tokenCount ?? 0,
                cache_read: td.cache_read?.tokenCount ?? u.cacheReadTokens ?? 0,
                cache_write: td.cache_write?.tokenCount ?? u.cacheWriteTokens ?? 0,
                output: td.output?.tokenCount ?? u.outputTokens ?? 0,
            };
            if (Object.keys(td).length === 0) {
                tok.input = Math.max(0, (u.inputTokens || 0) - tok.cache_read - tok.cache_write);
            }
            models[model] = { credits: (mm.totalNanoAiu || 0) / 1e9, tok, calls: mm.requests?.count ?? 0 };
        }
        seq.push([event.timestamp, (d.totalNanoAiu || 0) / 1e9, models]);
    }
    return { ttls, seq };
}

// Transcripts only grow, and most are finished long ago, so what was parsed from each file is kept by
// its identity (inode, size and modification time) and only changed files are read again. Entries for
// files that have gone are dropped on the next load. `reads` counts file reads, for the tests.
const transcriptCache = new Map(); // events.jsonl path -> { key, parsed }
export const transcriptStats = { reads: 0 };

// Per session: the shutdown records of its transcript, in file order. Also the prompt-cache lifetimes
// the CLI recorded: Map<model, Map<seconds, count>>. Files are read asynchronously and the loop yields
// regularly, so a large history does not block the extension's other work.
export async function loadShutdowns(home) {
    const out = new Map();
    const cacheTtls = new Map();
    const root = path.join(home, "session-state");
    let dirs = [];
    try { dirs = await fs.promises.readdir(root); } catch { return { shutdowns: out, cacheTtls }; }
    const seen = new Set();
    let processed = 0;
    for (const dir of dirs) {
        if (++processed % 64 === 0) await new Promise((resolve) => setImmediate(resolve));
        const file = path.join(root, dir, "events.jsonl");
        let parsed;
        try {
            const stat = await fs.promises.stat(file, { bigint: true });
            if (!stat.isFile()) continue;
            const key = `${stat.ino}:${stat.size}:${stat.mtimeNs}`;
            const cached = transcriptCache.get(file);
            if (cached?.key === key) {
                parsed = cached.parsed;
            } else {
                transcriptStats.reads++;
                parsed = parseTranscript(await fs.promises.readFile(file));
                // The key is taken before the read, so a file that grew meanwhile is read again next time.
                transcriptCache.set(file, { key, parsed });
            }
        } catch { continue; }
        seen.add(file);
        for (const [model, seconds] of parsed.ttls) bump(nested(cacheTtls, model, () => new Map()), seconds);
        if (parsed.seq.length) out.set(dir, parsed.seq);
    }
    for (const file of transcriptCache.keys()) {
        if (file.startsWith(root + path.sep) && !seen.has(file)) transcriptCache.delete(file);
    }
    return { shutdowns: out, cacheTtls };
}

// Dated increments from cumulative shutdown metrics.
// Shutdown totals are cumulative across resumes; repeats are ignored and a lower value (seen in some
// older CLI builds) never subtracts: the running maximum is what counts. This matched the Copilot app's
// own per-session totals to within 4% on the sessions where both exist (a per-segment reading overshot
// by about 30%). Returns [[timestamp, credits, {model: {credits, tok, calls}}]].
export function shutdownIncrements(seq) {
    const out = [];
    let prevTotal = 0;
    const best = new Map();
    for (const [ts, total, models] of seq) {
        if (total <= prevTotal + 1e-9) continue;
        const delta = Object.create(null);
        for (const [model, cur] of Object.entries(models)) {
            const base = best.get(model);
            const dc = cur.credits - (base ? base.credits : 0);
            if (dc <= 1e-9) continue;
            delta[model] = {
                credits: dc,
                tok: Object.fromEntries(TOKEN_TYPES.map((k) => [k, Math.max(0, cur.tok[k] - (base ? base.tok[k] : 0))])),
                calls: Math.max(0, cur.calls - (base ? base.calls : 0)),
            };
        }
        const sd = total - prevTotal;
        const msum = Object.values(delta).reduce((a, v) => a + v.credits, 0);
        if (msum > 0) {
            const scale = sd / msum;
            for (const v of Object.values(delta)) v.credits *= scale;
        }
        out.push([ts, sd, delta]);
        prevTotal = total;
        for (const [model, cur] of Object.entries(models)) {
            const b = best.get(model);
            if (!b || cur.credits > b.credits) best.set(model, cur);
        }
    }
    return out;
}

// Automation names and run-session links only; never read automation prompts or session titles.
export function loadAutomations(db) {
    const names = new Map();
    for (const row of db.prepare("SELECT id, name FROM workflows").all()) {
        names.set(row.id, row.name || "Unnamed automation");
    }
    const bySession = new Map();
    const runs = db.prepare(
        "SELECT r.task_id AS task_id, COALESCE(NULLIF(r.session_id, ''), w.session_id) AS session_id " +
        "FROM workflow_runs r LEFT JOIN workspaces w ON w.id = r.workspace_id").all();
    for (const { task_id: id, session_id: sid } of runs) {
        if (!names.has(id)) names.set(id, `Deleted automation (${id.slice(0, 8)})`);
        if (!sid) continue;
        if (bySession.has(sid) && bySession.get(sid) !== id) {
            throw new Error("An automation run session is linked to more than one automation");
        }
        bySession.set(sid, id);
    }
    return { names, bySession };
}

function loadAppSessions(db) {
    const app = new Map();
    const have = tableColumns(db, "sessions");
    if (!["id", "session_type", "created_at", "updated_at", "total_nano_aiu"].every((c) => have.has(c))) return app;
    const col = (name) => (have.has(name) ? name : `NULL AS ${name}`);
    const rows = db.prepare(`SELECT id, session_type, ${col("model")}, created_at, updated_at, total_nano_aiu FROM sessions`).all();
    for (const r of rows) {
        app.set(r.id, {
            type: r.session_type, model: r.model || "", created: r.created_at, updated: r.updated_at,
            credits: (r.total_nano_aiu || 0) / 1e9,
        });
    }
    return app;
}

function loadProjectRepos(db) {
    const repos = new Map();
    try {
        const rows = db.prepare(
            "SELECT w.session_id AS session_id, p.github_owner AS owner, p.github_repo AS repo " +
            "FROM workspaces w JOIN projects p ON p.id = w.project_id WHERE w.session_id IS NOT NULL").all();
        for (const r of rows) if (r.owner && r.repo) repos.set(r.session_id, `${r.owner}/${r.repo}`);
    } catch { /* older Copilot app schema */ }
    return repos;
}

const emptyBreakdown = () => ({ credits: 0, comps: zeros(), tok: zeros(), calls: 0 });

// Sources that count the same usage disagree a little, and that is forgiven, but only against usage
// that is already counted. A total with nothing counted yet is real usage however small it is.
const exceedsCounted = (extra, best, counted) => extra > (counted > 0 ? Math.max(EV_MIN_RESIDUAL, 0.02 * best) : 1e-9);

// Build the whole ledger. Returns a compact, column-oriented object that the dashboard filters in the browser.
export async function buildLedger({ home = copilotHome(), timeZone = localTimeZone(), now = new Date() } = {}) {
    const store = openReadOnly(path.join(home, "session-store.db"));
    const appDb = openReadOnly(path.join(home, "data.db"));
    try {
        let automationNames = new Map();
        let automationBySession = new Map();
        let automationsUnavailable = null;
        if (appDb) {
            try {
                ({ names: automationNames, bySession: automationBySession } = loadAutomations(appDb));
            } catch (error) {
                automationsUnavailable = error.message;
                automationNames = new Map();
                automationBySession = new Map();
            }
        }

        const { bySession: eventsBySession, ratesSeen } = store ? loadEvents(store) : { bySession: new Map(), ratesSeen: new Map() };
        const rates = buildRates(ratesSeen);
        const { shutdowns, cacheTtls } = await loadShutdowns(home);
        const { ttlFor, summary: cacheTtl } = cacheTtlFor(cacheTtls);
        cacheStates(eventsBySession, ttlFor);

        // Session metadata ----------------------------------------------------------------------
        const meta = new Map();
        const newMeta = (extra = {}) => ({ repo: "", created: null, updated: null, surface: "Copilot CLI", ...extra });
        if (store && tableColumns(store, "sessions").has("repository")) {
            for (const r of store.prepare("SELECT id, repository, created_at, updated_at FROM sessions").all()) {
                meta.set(r.id, newMeta({ repo: r.repository || "", created: r.created_at, updated: r.updated_at }));
            }
        }
        const app = appDb ? loadAppSessions(appDb) : new Map();
        const projectRepo = appDb ? loadProjectRepos(appDb) : new Map();
        for (const [sid, a] of app) {
            const m = nested(meta, sid, () => newMeta({ created: a.created, updated: a.updated }));
            m.surface = ownValue(SURFACE_BY_APP_TYPE, a.type) || "Copilot app · project session";
            if (!m.repo && projectRepo.has(sid)) m.repo = projectRepo.get(sid);
            if (!m.created) { m.created = a.created; m.updated = a.updated; }
        }

        // Fact rows: [day, session, model, kind, tier, credits, comps[4], tok[4], calls, cache state]
        // tier 0 = metered per call, 1 = metered per session total.
        const facts = [];
        const hourly = new Map(); // day|session|model|kind|cache|weekday|hour -> credits
        const sourcesTotal = { events: 0, shutdown: 0, app: 0 };
        const tierTotal = [0, 0];
        const clock = createLocalClock(timeZone);

        const add = (day, sid, model, kind, tier, credits, comps, tok, calls, cs = CACHE_IDX.none) => {
            if (credits <= 0) return;
            facts.push([day, sid, model, kind, tier, credits, comps, tok, calls, cs]);
            tierTotal[tier] += credits;
        };

        const allIds = new Set([...eventsBySession.keys(), ...shutdowns.keys()]);
        for (const [sid, a] of app) if (a.credits > 0) allIds.add(sid);

        for (const sid of [...allIds].sort()) {
            const evs = eventsBySession.get(sid) || [];
            const m = nested(meta, sid, () => newMeta());
            if (!m.created) {
                const first = evs.length ? evs[0].ts : (shutdowns.has(sid) ? shutdowns.get(sid)[0][0] : null);
                m.created = m.updated = first;
            }
            const evTotal = evs.reduce((a, e) => a + e.credits, 0);
            const incs = shutdowns.has(sid) ? shutdownIncrements(shutdowns.get(sid)) : [];
            const shTotal = incs.reduce((a, i) => a + i[1], 0);
            const appTotal = app.has(sid) ? app.get(sid).credits : 0;
            sourcesTotal.events += evTotal;
            sourcesTotal.shutdown += shTotal;
            sourcesTotal.app += appTotal;
            const best = Math.max(evTotal, shTotal, appTotal);
            const createdDay = (m.created || "").slice(0, 10) || (m.updated || "").slice(0, 10);
            if (!createdDay) continue;
            const appModel = app.get(sid)?.model || "unknown";

            // (1) per-call events: exact day, model, call type, cache state
            const agg = new Map();
            for (const e of evs) {
                const day = isoDay(e.ts);
                const key = [day, e.model, e.kind, e.cs].join("\u0000");
                const a = nested(agg, key, () => ({ day, model: e.model, kind: e.kind, cs: e.cs, ...emptyBreakdown() }));
                a.credits += e.credits;
                a.calls += 1;
                TOKEN_TYPES.forEach((type, i) => { a.comps[i] += e.comps[type]; a.tok[i] += e.tok[type]; });
                const local = clock(Date.parse(e.ts));
                bump(hourly, [day, sid, e.model, e.kind, e.cs, local.weekday, local.hour].join("\u0000"), e.credits);
            }
            for (const a of agg.values()) add(a.day, sid, a.model, a.kind, 0, a.credits, a.comps, a.tok, a.calls, a.cs);

            // (2) residual not covered by per-call events
            const residual = best - evTotal;
            if (!exceedsCounted(residual, best, evTotal)) continue;
            if (evs.length) {
                // Per-call events start where the CLI began recording them; anything older is dated at session creation.
                const evModels = new Map();
                for (const e of evs) bump(evModels, e.model, e.credits);
                const resModels = new Map();
                if (incs.length) {
                    const final = new Map();
                    for (const [, , byModel] of incs) {
                        for (const [model, v] of Object.entries(byModel)) {
                            nested(final, model, () => ({ credits: 0 })).credits += v.credits;
                        }
                    }
                    for (const [model, v] of final) {
                        const extra = v.credits - (evModels.get(model) || 0);
                        if (extra > 0) resModels.set(model, extra);
                    }
                }
                if (resModels.size) {
                    const tot = [...resModels.values()].reduce((a, v) => a + v, 0);
                    for (const [model, extra] of resModels) {
                        add(createdDay, sid, model, "Earlier usage", 1, residual * extra / tot, zeros(), zeros(), 0);
                    }
                } else {
                    add(createdDay, sid, appModel, "Earlier usage", 1, residual, zeros(), zeros(), 0);
                }
            } else {
                let placed = 0;
                for (const [ts, sd, byModel] of incs) {
                    for (const [model, v] of Object.entries(byModel)) {
                        const tok = TOKEN_TYPES.map((t) => v.tok[t]);
                        const est = price(model, v.tok, rates);
                        let comps = est ? TOKEN_TYPES.map((t) => est[t]) : zeros();
                        const esum = comps.reduce((a, c) => a + c, 0);
                        if (esum > 0) comps = comps.map((c) => c * v.credits / esum);
                        add(isoDay(ts), sid, model, "Session total", 1, v.credits, comps, tok, v.calls);
                        placed += v.credits;
                    }
                    if (!Object.keys(byModel).length) {
                        add(isoDay(ts), sid, appModel, "Session total", 1, sd, zeros(), zeros(), 0);
                        placed += sd;
                    }
                }
                const gap = best - placed;
                if (exceedsCounted(gap, best, placed)) {
                    add(createdDay, sid, appModel, "Session total", 1, gap, zeros(), zeros(), 0);
                }
            }
        }

        // Dimensions -----------------------------------------------------------------------------
        const models = [...new Set(facts.map((f) => f[2]))].sort();
        const kinds = [...new Set(facts.map((f) => f[3]))].sort();
        const surfaces = [...new Set(facts.map((f) => meta.get(f[1]).surface))].sort();
        const repos = [...new Set(facts.map((f) => meta.get(f[1]).repo))].sort();
        const sessionIds = [...new Set(facts.map((f) => f[1]))].sort();
        for (const sid of sessionIds) {
            if (!automationBySession.has(sid) && meta.get(sid).surface === "Copilot app · automation") {
                automationBySession.set(sid, "unattributed");
                automationNames.set("unattributed", "Unattributed automation sessions");
            }
        }
        const automationIds = [...automationNames.keys()].sort();
        const index = (list) => new Map(list.map((v, i) => [v, i]));
        const ai = index(automationIds), mi = index(models), ki = index(kinds), si = index(surfaces);
        const ri = index(repos), sx = index(sessionIds);
        const days = [...new Set(facts.map((f) => f[0]))].sort();
        const di = index(days);

        const outFacts = facts.map(([day, sid, model, kind, tier, credits, comps, tok, calls, cs]) =>
            [di.get(day), sx.get(sid), mi.get(model), ki.get(kind), tier, round3(credits), ...comps.map(round3), ...tok, calls, cs]);
        const sessions = sessionIds.map((sid) => ({
            id: sid.slice(0, 8),
            repo: ri.get(meta.get(sid).repo),
            surface: si.get(meta.get(sid).surface),
            automation: automationBySession.has(sid) ? ai.get(automationBySession.get(sid)) ?? null : null,
        }));
        const hourlyRows = [];
        for (const [key, credits] of hourly) {
            const [day, sid, model, kind, cs, weekday, hour] = key.split("\u0000");
            if (credits > 0 && di.has(day) && sx.has(sid)) {
                hourlyRows.push([di.get(day), sx.get(sid), mi.get(model), ki.get(kind), Number(weekday), Number(hour), round3(credits), Number(cs)]);
            }
        }
        let eventsStart = null;
        for (const evs of eventsBySession.values()) for (const e of evs) if (!eventsStart || e.ts < eventsStart) eventsStart = e.ts;

        return {
            meta: {
                generated: now.toISOString(),
                timeZone,
                creditUsd: CREDIT_USD,
                total: round3(facts.reduce((a, f) => a + f[5], 0)),
                periodStart: days[0] ?? null,
                periodEnd: days[days.length - 1] ?? null,
                tierTotals: { 0: round3(tierTotal[0]), 1: round3(tierTotal[1]) },
                sourceTotals: Object.fromEntries(Object.entries(sourcesTotal).map(([k, v]) => [k, round3(v)])),
                assumedRateModels: ASSUMED_RATE_MODELS.filter((m) => models.includes(m)),
                eventsStart,
                cacheTtl,
                cacheReuseMin: CACHE_REUSE_MIN,
                automationsUnavailable,
                sources: { sessionStore: Boolean(store), appDatabase: Boolean(appDb), sessionLogs: shutdowns.size },
            },
            dims: {
                models: models.map((id) => ({ id, name: prettyModel(id), family: family(id) })),
                kinds, surfaces, repos, days,
                caches: CACHE_STATES.map(([id, name]) => ({ id, name })),
                automations: automationIds.map((id) => ({ id, name: automationNames.get(id) })),
            },
            sessions,
            factColumns: ["day", "session", "model", "kind", "tier", "credits", "c_input", "c_cache_read", "c_cache_write",
                "c_output", "t_input", "t_cache_read", "t_cache_write", "t_output", "calls", "cache"],
            facts: outFacts,
            hourlyColumns: ["day", "session", "model", "kind", "weekday", "hour", "credits", "cache"],
            hourly: hourlyRows,
        };
    } finally {
        store?.close();
        appDb?.close();
    }
}

// A compact, privacy-light summary of a ledger for the agent: totals and top entries, no session ids.
export function summarizeLedger(ledger, { from, to } = {}) {
    const { dims, facts } = ledger;
    const start = from || ledger.meta.periodStart;
    const end = to || ledger.meta.periodEnd;
    const rows = facts.filter((f) => {
        const day = dims.days[f[0]];
        return day >= start && day <= end;
    });
    const group = (pick) => {
        const totals = new Map();
        for (const f of rows) bump(totals, pick(f), f[5]);
        return [...totals].sort((a, b) => b[1] - a[1]);
    };
    const total = rows.reduce((a, f) => a + f[5], 0);
    const top = (entries, name, limit = 10) => entries.slice(0, limit).map(([key, credits]) => ({
        [name]: key, credits: round3(credits), usd: round3(credits * CREDIT_USD), share: total ? round3(credits / total) : 0,
    }));
    const byDay = group((f) => dims.days[f[0]]);
    const calls = new Map();
    for (const f of rows) bump(calls, f[15], f[14]);
    return {
        period: { from: start, to: end, basis: "UTC days" },
        totalCredits: round3(total),
        totalUsd: round3(total * CREDIT_USD),
        activeDays: byDay.length,
        sessions: new Set(rows.map((f) => f[1])).size,
        models: top(group((f) => dims.models[f[2]].name), "model"),
        repositories: top(group((f) => dims.repos[ledger.sessions[f[1]].repo] || "(no repository)"), "repository"),
        surfaces: top(group((f) => dims.surfaces[ledger.sessions[f[1]].surface]), "surface"),
        callTypes: top(group((f) => dims.kinds[f[3]]), "callType"),
        promptCache: group((f) => f[15]).map(([i, credits]) => ({
            state: dims.caches[i].name, credits: round3(credits), usd: round3(credits * CREDIT_USD), calls: calls.get(i) || 0,
        })),
        busiestDays: top(byDay, "day", 5),
        generated: ledger.meta.generated,
    };
}

// `node collector.mjs [out.json]` prints a one-line summary, and writes the full ledger when given a path.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const ledger = await buildLedger();
    if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(ledger));
    console.log(`${ledger.facts.length} fact rows, ${ledger.sessions.length} sessions, ${ledger.meta.total} credits, ${ledger.meta.periodStart ?? "no data"} to ${ledger.meta.periodEnd ?? "no data"}`);
}
