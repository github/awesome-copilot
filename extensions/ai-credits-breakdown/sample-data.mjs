// Deterministic, entirely fictional Copilot telemetry for the tests and the preview screenshot.
// writeSampleHome() lays out a fake COPILOT_HOME with the same files and tables the collector reads.
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

// Credits per 1M tokens: input, cache read, cache write, output.
const MODELS = {
    "claude-sonnet-5.5": { rates: [200, 20, 250, 1000], weight: 5, ttl: 300 },
    "claude-opus-5.5": { rates: [400, 20, 500, 2000], weight: 2, ttl: 300 },
    "gpt-5.6-sol": { rates: [400, 40, 500, 2000], weight: 2, ttl: 1800 },
    "gpt-5.6-luna": { rates: [20, 2, 25, 120], weight: 1, ttl: 1800 },
    "claude-haiku-4.5": { rates: [100, 10, 125, 500], weight: 1, ttl: 300 },
};
const TYPES = ["input", "cache_read", "cache_write", "output"];
const REPOS = [
    "contoso/storefront", "contoso/payments-api", "contoso/design-system", "fabrikam/data-pipeline",
    "fabrikam/mobile-app", "sample-user/dotfiles", "sample-user/notes", "",
];
const AUTOMATIONS = [
    ["wf-daily", "Daily standup summary"], ["wf-deps", "Weekly dependency check"], ["wf-docs", "Docs link audit"],
];
export const SENTINELS = ["SECRET-PROMPT-TEXT", "SECRET-SESSION-TITLE", "/Users/someone/secret/path"];

function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function writeSampleHome(home, { seed = 7, end = new Date("2026-10-28T12:00:00Z"), days = 100, oldSessions = 8 } = {}) {
    const rand = rng(seed);
    const between = (lo, hi) => lo + rand() * (hi - lo);
    const int = (lo, hi) => Math.floor(between(lo, hi + 1));
    const pick = (list) => list[Math.floor(rand() * list.length)];
    const weighted = () => {
        const total = Object.values(MODELS).reduce((a, m) => a + m.weight, 0);
        let x = rand() * total;
        for (const [id, m] of Object.entries(MODELS)) if ((x -= m.weight) < 0) return id;
        return "claude-sonnet-5.5";
    };
    const uuid = () => [8, 4, 4, 4, 12].map((n) => Array.from({ length: n }, () => int(0, 15).toString(16)).join("")).join("-");
    const iso = (ms) => new Date(ms).toISOString();

    fs.mkdirSync(path.join(home, "session-state"), { recursive: true });
    const store = new DatabaseSync(path.join(home, "session-store.db"));
    const app = new DatabaseSync(path.join(home, "data.db"));
    store.exec(`
        CREATE TABLE sessions (id TEXT PRIMARY KEY, repository TEXT, summary TEXT, created_at TEXT, updated_at TEXT);
        CREATE TABLE assistant_usage_events (id INTEGER PRIMARY KEY, session_id TEXT, model TEXT, input_tokens INTEGER,
            output_tokens INTEGER, cache_read_tokens INTEGER, cache_write_tokens INTEGER, total_nano_aiu INTEGER,
            initiator TEXT, token_details_json TEXT, created_at TEXT, agent_id TEXT, duration_ms INTEGER);`);
    app.exec(`
        CREATE TABLE projects (id TEXT PRIMARY KEY, name TEXT, github_owner TEXT, github_repo TEXT);
        CREATE TABLE workspaces (id TEXT PRIMARY KEY, project_id TEXT, session_id TEXT);
        CREATE TABLE sessions (id TEXT PRIMARY KEY, title TEXT, session_type TEXT, model TEXT, created_at TEXT,
            updated_at TEXT, total_nano_aiu INTEGER);
        CREATE TABLE workflows (id TEXT PRIMARY KEY, name TEXT, prompt TEXT);
        CREATE TABLE workflow_runs (id TEXT PRIMARY KEY, task_id TEXT, workspace_id TEXT, session_id TEXT);`);

    const insertSession = store.prepare("INSERT INTO sessions VALUES (?, ?, ?, ?, ?)");
    const insertEvent = store.prepare("INSERT INTO assistant_usage_events (session_id, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, total_nano_aiu, initiator, token_details_json, created_at, agent_id, duration_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    const insertApp = app.prepare("INSERT INTO sessions VALUES (?, ?, ?, ?, ?, ?, ?)");
    const insertProject = app.prepare("INSERT INTO projects VALUES (?, ?, ?, ?)");
    const insertWorkspace = app.prepare("INSERT INTO workspaces VALUES (?, ?, ?)");
    const insertRun = app.prepare("INSERT INTO workflow_runs VALUES (?, ?, ?, ?)");
    for (const [id, name] of AUTOMATIONS) app.prepare("INSERT INTO workflows VALUES (?, ?, ?)").run(id, name, SENTINELS[0]);
    store.exec("BEGIN");
    app.exec("BEGIN");
    REPOS.filter(Boolean).forEach((repo, i) => {
        const [owner, name] = repo.split("/");
        insertProject.run(`project-${i}`, name, owner, name);
    });

    const cost = (model, tok) => TYPES.reduce((sum, t, i) => sum + tok[t] * MODELS[model].rates[i] / 1e6, 0);
    const details = (model, tok) => JSON.stringify(TYPES.filter((t) => tok[t] > 0).map((t) => ({
        tokenType: t, tokenCount: tok[t], batchSize: 1000000, costPerBatch: MODELS[model].rates[TYPES.indexOf(t)] * 1e9,
    })));

    let eventCredits = 0;
    const eventsStart = end.getTime() - days * 864e5;
    const sessionsMeta = [];

    // One session of metered per-call events across a main agent, a sub-agent and background calls.
    const generateSession = (sid, model, startMs) => {
        let when = startMs;
        let credits = 0;
        const streams = [{ agent: "", prompt: int(18000, 30000), calls: int(15, 70) }];
        if (rand() < 0.5) streams.push({ agent: "sub-1", prompt: int(8000, 14000), calls: int(4, 14) });
        for (const stream of streams) {
            let t = when + (stream.agent ? int(20, 120) * 1000 : 0);
            let prevPrompt = 0;
            for (let n = 0; n < stream.calls; n++) {
                const duration = int(3000, 40000);
                let initiator = n === 0 ? "user" : "agent";
                if (stream.agent) initiator = "sub-agent";
                else if (n > 0 && rand() < 0.06) initiator = "compaction";
                else if (n > 0 && rand() < 0.05) initiator = "user";
                // A pause longer than the cache lifetime means the next call writes the whole prompt again.
                const paused = n > 0 && rand() < 0.08;
                const gap = paused ? int(MODELS[model].ttl + 30, MODELS[model].ttl + 900) * 1000 : int(500, 15000);
                if (n > 0) t += gap;
                const delta = int(800, 9000);
                const fresh = int(150, 1800);
                const first = n === 0;
                const prompt = first ? stream.prompt : initiator === "compaction" ? Math.round(stream.prompt * 0.4) : prevPrompt + delta;
                const rebuilt = initiator === "compaction";
                const tok = { input: fresh, cache_read: 0, cache_write: 0, output: int(150, 4200) };
                if (first || paused || rebuilt) tok.cache_write = Math.max(0, prompt - fresh);
                else { tok.cache_read = prevPrompt; tok.cache_write = Math.max(0, prompt - fresh - prevPrompt); }
                const finish = t + duration;
                const nano = Math.round(cost(model, tok) * 1e9);
                insertEvent.run(sid, model, tok.input + tok.cache_read + tok.cache_write, tok.output, tok.cache_read, tok.cache_write,
                    nano, initiator, details(model, tok), iso(finish), stream.agent, duration);
                credits += nano / 1e9;
                prevPrompt = prompt;
                t = finish;
            }
        }
        // Title generation and similar background calls carry no initiator.
        const tok = { input: int(300, 900), cache_read: 0, cache_write: 0, output: int(20, 80) };
        const nano = Math.round(cost("claude-haiku-4.5", tok) * 1e9);
        insertEvent.run(sid, "claude-haiku-4.5", tok.input, tok.output, 0, 0, nano, null, details("claude-haiku-4.5", tok), iso(startMs + 2000), "", 900);
        credits += nano / 1e9;
        return credits;
    };

    // Metered per-call sessions, a few busy days among many quiet ones.
    for (let d = 0; d < days; d++) {
        const dayMs = eventsStart + d * 864e5;
        const weekday = new Date(dayMs).getUTCDay();
        if ((weekday === 0 || weekday === 6) && rand() < 0.7) continue;
        const busy = rand() < 0.12 ? 3 : 1;
        const count = int(1, 3) * busy;
        for (let s = 0; s < count; s++) {
            const sid = uuid();
            const repo = pick(REPOS);
            const model = weighted();
            const startMs = dayMs + int(9, 17) * 36e5 + int(0, 59) * 6e4;
            const automationIndex = rand() < 0.18 ? int(0, AUTOMATIONS.length - 1) : -1;
            const total = generateSession(sid, model, startMs);
            eventCredits += total;
            insertSession.run(sid, repo, SENTINELS[1], iso(startMs), iso(startMs + 36e5));
            const type = automationIndex >= 0 ? "workflow_workspace" : repo && rand() < 0.5 ? "workspace" : "cli_session";
            if (type !== "cli_session") {
                insertApp.run(sid, SENTINELS[1], type, model, iso(startMs), iso(startMs + 36e5), Math.round(total * 1e9));
                if (type === "workspace" && repo) insertWorkspace.run(`ws-${sid}`, `project-${REPOS.filter(Boolean).indexOf(repo)}`, sid);
            }
            if (automationIndex >= 0) insertRun.run(uuid(), AUTOMATIONS[automationIndex][0], `ws-${sid}`, sid);
            sessionsMeta.push({ sid, repo, startMs });
        }
    }

    // Older sessions from before per-call telemetry: only shutdown records and Copilot app totals.
    for (let i = 0; i < oldSessions; i++) {
        const sid = uuid();
        const model = weighted();
        const startMs = eventsStart - int(1, 40) * 864e5 + int(9, 17) * 36e5;
        const repo = pick(REPOS);
        const dir = path.join(home, "session-state", sid);
        fs.mkdirSync(dir, { recursive: true });
        const segments = [int(30, 200), int(10, 120)];
        let tokens = { input: 0, cache_read: 0, cache_write: 0, output: 0 };
        let requests = 0;
        const lines = [JSON.stringify({ type: "session.start", data: { title: SENTINELS[1], cwd: SENTINELS[2] } })];
        segments.forEach((calls, n) => {
            tokens = { input: tokens.input + calls * 400, cache_read: tokens.cache_read + calls * 60000, cache_write: tokens.cache_write + calls * 3000, output: tokens.output + calls * 900 };
            requests += calls;
            const nano = Math.round(cost(model, tokens) * 1e9);
            lines.push(JSON.stringify({
                type: "session.shutdown", timestamp: iso(startMs + (n + 1) * 36e5),
                data: {
                    totalNanoAiu: nano,
                    modelMetrics: {
                        [model]: {
                            totalNanoAiu: nano, requests: { count: requests },
                            tokenDetails: Object.fromEntries(TYPES.map((t) => [t, { tokenCount: tokens[t] }])),
                        },
                    },
                    codeChanges: { filesModified: [SENTINELS[2]] },
                },
            }));
        });
        lines.push(JSON.stringify({ type: "session.usage_checkpoint", data: { modelCacheState: [{ modelId: model, cacheTtlSeconds: MODELS[model].ttl }] } }));
        fs.writeFileSync(path.join(dir, "events.jsonl"), lines.join("\n") + "\n");
        insertSession.run(sid, repo, SENTINELS[1], iso(startMs), iso(startMs + 72e5));
        sessionsMeta.push({ sid, repo, startMs });
    }
    store.exec("COMMIT");
    app.exec("COMMIT");
    store.close();
    app.close();
    return { sentinels: SENTINELS, eventCredits, sessions: sessionsMeta.length };
}
