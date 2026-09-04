import { createReadStream, existsSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { createInterface } from "node:readline";
import { DatabaseSync } from "node:sqlite";

const BILLION = 1_000_000_000;
const RANGE_LABELS = {
    "24h": "Last 24 hours",
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    all: "All recorded usage",
};

function number(value) {
    return Number(value || 0);
}

function credits(nanoAiu) {
    return number(nanoAiu) / BILLION;
}

function normalizeAggregate(row = {}) {
    return {
        aiCredits: credits(row.total_nano_aiu),
        apiDurationMs: number(row.duration_ms),
        cacheReadTokens: number(row.cache_read_tokens),
        cacheWriteTokens: number(row.cache_write_tokens),
        calls: number(row.calls),
        inputTokens: number(row.input_tokens),
        outputTokens: number(row.output_tokens),
        reasoningTokens: number(row.reasoning_tokens),
        sessions: number(row.sessions),
        subagents: number(row.subagents),
        totalNanoAiu: number(row.total_nano_aiu),
    };
}

function runtimeAggregate(metrics) {
    if (!metrics) {
        return undefined;
    }

    const aggregate = {
        aiCredits: credits(metrics.totalNanoAiu),
        apiDurationMs: number(metrics.totalApiDurationMs),
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        sessions: 1,
        subagents: 0,
        totalNanoAiu: number(metrics.totalNanoAiu),
    };

    for (const metric of Object.values(metrics.modelMetrics || {})) {
        if (!metric) {
            continue;
        }
        aggregate.calls += number(metric.requests?.count);
        aggregate.inputTokens += number(metric.usage?.inputTokens);
        aggregate.outputTokens += number(metric.usage?.outputTokens);
        aggregate.reasoningTokens += number(metric.usage?.reasoningTokens);
        aggregate.cacheReadTokens += number(metric.usage?.cacheReadTokens);
        aggregate.cacheWriteTokens += number(metric.usage?.cacheWriteTokens);
    }
    return aggregate;
}

function cutoffFor(range) {
    const duration = {
        "24h": 24 * 60 * 60 * 1000,
        "7d": 7 * 24 * 60 * 60 * 1000,
        "30d": 30 * 24 * 60 * 60 * 1000,
    }[range];
    return duration ? new Date(Date.now() - duration).toISOString() : undefined;
}

function statusFor(event) {
    if (event.type === "subagent.failed") {
        return "failed";
    }
    if (event.type === "subagent.completed") {
        return event.data.cancelled ? "cancelled" : "completed";
    }
    return "running";
}

export class AgentMetadataStore {
    constructor(copilotHome) {
        this.copilotHome = copilotHome;
        this.cache = new Map();
    }

    seed(sessionId, events) {
        const map = this.cache.get(sessionId) || new Map();
        for (const event of events) {
            this.apply(map, event);
        }
        this.cache.set(sessionId, map);
    }

    update(sessionId, event) {
        const map = this.cache.get(sessionId) || new Map();
        this.apply(map, event);
        this.cache.set(sessionId, map);
    }

    apply(map, event) {
        if (
            !event?.agentId ||
            !["subagent.started", "subagent.completed", "subagent.failed"].includes(event.type)
        ) {
            return;
        }
        const existing = map.get(event.agentId) || {};
        map.set(event.agentId, {
            ...existing,
            agentId: event.agentId,
            displayName: event.data?.agentDisplayName || existing.displayName || "Sub-agent",
            internalName: event.data?.agentName || existing.internalName,
            model: event.data?.model || existing.model,
            status: statusFor(event),
        });
    }

    async get(sessionId) {
        if (this.cache.has(sessionId)) {
            return this.cache.get(sessionId);
        }

        const map = new Map();
        const sessionStateRoot = resolve(this.copilotHome, "session-state");
        const eventPath = resolve(sessionStateRoot, sessionId, "events.jsonl");
        const relativeEventPath = relative(sessionStateRoot, eventPath);
        if (
            isAbsolute(relativeEventPath) ||
            relativeEventPath === ".." ||
            relativeEventPath.startsWith(`..${sep}`)
        ) {
            throw new Error("Invalid session ID.");
        }
        if (existsSync(eventPath)) {
            const lines = createInterface({
                crlfDelay: Infinity,
                input: createReadStream(eventPath, { encoding: "utf8" }),
            });
            for await (const line of lines) {
                if (!line.includes('"type":"subagent.')) {
                    continue;
                }
                try {
                    this.apply(map, JSON.parse(line));
                } catch (error) {
                    if (!(error instanceof SyntaxError)) {
                        throw error;
                    }
                    // Ignore an incomplete trailing JSONL record while the session is writing.
                }
            }
        }
        this.cache.set(sessionId, map);
        return map;
    }
}

export class UsageInsightsStore {
    constructor(copilotHome) {
        const sessionStorePath = join(copilotHome, "session-store.db");
        if (!existsSync(sessionStorePath)) {
            throw new Error(`Copilot session store was not found at ${sessionStorePath}`);
        }
        this.sessionDb = new DatabaseSync(sessionStorePath, { readOnly: true });

        const appDbPath = join(copilotHome, "data.db");
        this.appDb = existsSync(appDbPath)
            ? new DatabaseSync(appDbPath, { readOnly: true })
            : undefined;
    }

    queryAggregate(whereSql = "", params = []) {
        const row = this.sessionDb
            .prepare(`
                SELECT
                    COUNT(*) AS calls,
                    COUNT(DISTINCT session_id) AS sessions,
                    COUNT(DISTINCT CASE WHEN NULLIF(agent_id, '') IS NOT NULL THEN agent_id END) AS subagents,
                    SUM(COALESCE(input_tokens, 0)) AS input_tokens,
                    SUM(COALESCE(output_tokens, 0)) AS output_tokens,
                    SUM(COALESCE(reasoning_tokens, 0)) AS reasoning_tokens,
                    SUM(COALESCE(cache_read_tokens, 0)) AS cache_read_tokens,
                    SUM(COALESCE(cache_write_tokens, 0)) AS cache_write_tokens,
                    SUM(COALESCE(total_nano_aiu, 0)) AS total_nano_aiu,
                    SUM(COALESCE(duration_ms, 0)) AS duration_ms
                FROM assistant_usage_events
                ${whereSql}
            `)
            .get(...params);
        return normalizeAggregate(row);
    }

    getSessionInfo(sessionId) {
        const local =
            this.sessionDb
                .prepare(`
                    SELECT id, summary, repository, branch, cwd, created_at, updated_at
                    FROM sessions
                    WHERE id = ?
                `)
                .get(sessionId) || {};
        const app =
            this.appDb
                ?.prepare(`
                    SELECT title, agent, model, mode, created_at, updated_at
                    FROM sessions
                    WHERE id = ?
                `)
                .get(sessionId) || {};
        return {
            agent: app.agent || "Copilot",
            branch: local.branch,
            createdAt: app.created_at || local.created_at,
            cwd: local.cwd,
            id: sessionId,
            mode: app.mode,
            model: app.model,
            repository: local.repository,
            summary: local.summary,
            title: app.title || local.summary || `Session ${sessionId.slice(0, 8)}`,
            updatedAt: app.updated_at || local.updated_at,
        };
    }

    getSessionAgents(sessionId, metadata) {
        const rows = this.sessionDb
            .prepare(`
                SELECT
                    COALESCE(NULLIF(agent_id, ''), 'root') AS agent_id,
                    GROUP_CONCAT(DISTINCT model) AS models,
                    COUNT(*) AS calls,
                    SUM(COALESCE(input_tokens, 0)) AS input_tokens,
                    SUM(COALESCE(output_tokens, 0)) AS output_tokens,
                    SUM(COALESCE(reasoning_tokens, 0)) AS reasoning_tokens,
                    SUM(COALESCE(cache_read_tokens, 0)) AS cache_read_tokens,
                    SUM(COALESCE(cache_write_tokens, 0)) AS cache_write_tokens,
                    SUM(COALESCE(total_nano_aiu, 0)) AS total_nano_aiu,
                    SUM(COALESCE(duration_ms, 0)) AS duration_ms,
                    MAX(created_at) AS last_seen
                FROM assistant_usage_events
                WHERE session_id = ?
                GROUP BY COALESCE(NULLIF(agent_id, ''), 'root')
                ORDER BY total_nano_aiu DESC
            `)
            .all(sessionId);

        return rows.map((row) => {
            const meta = metadata.get(row.agent_id);
            return {
                ...normalizeAggregate(row),
                agentId: row.agent_id,
                displayName: row.agent_id === "root" ? "Root agent" : meta?.displayName || "Sub-agent",
                internalName: meta?.internalName,
                lastSeen: row.last_seen,
                models: row.models ? String(row.models).split(",") : [],
                status: row.agent_id === "root" ? "primary" : meta?.status || "recorded",
            };
        });
    }

    getSessionModels(sessionId) {
        return this.sessionDb
            .prepare(`
                SELECT
                    model,
                    COUNT(*) AS calls,
                    SUM(COALESCE(input_tokens, 0)) AS input_tokens,
                    SUM(COALESCE(output_tokens, 0)) AS output_tokens,
                    SUM(COALESCE(reasoning_tokens, 0)) AS reasoning_tokens,
                    SUM(COALESCE(cache_read_tokens, 0)) AS cache_read_tokens,
                    SUM(COALESCE(cache_write_tokens, 0)) AS cache_write_tokens,
                    SUM(COALESCE(total_nano_aiu, 0)) AS total_nano_aiu,
                    SUM(COALESCE(duration_ms, 0)) AS duration_ms
                FROM assistant_usage_events
                WHERE session_id = ?
                GROUP BY model
                ORDER BY total_nano_aiu DESC
            `)
            .all(sessionId)
            .map((row) => ({ ...normalizeAggregate(row), model: row.model }));
    }

    getSessionTimeline(sessionId) {
        const calls = this.sessionDb
            .prepare(`
                SELECT
                    id,
                    COALESCE(NULLIF(agent_id, ''), 'root') AS agent_id,
                    model,
                    input_tokens,
                    output_tokens,
                    reasoning_tokens,
                    total_nano_aiu,
                    duration_ms,
                    initiator,
                    created_at
                FROM assistant_usage_events
                WHERE session_id = ?
                ORDER BY created_at, id
            `)
            .all(sessionId)
            .map((row) => {
                const endedAtMs = Date.parse(row.created_at);
                const durationMs = Math.max(1, number(row.duration_ms));
                return {
                    agentId: row.agent_id,
                    aiCredits: credits(row.total_nano_aiu),
                    createdAt: row.created_at,
                    durationMs,
                    endedAtMs,
                    id: row.id,
                    initiator: row.initiator,
                    inputTokens: number(row.input_tokens),
                    model: row.model,
                    outputTokens: number(row.output_tokens),
                    reasoningTokens: number(row.reasoning_tokens),
                    startedAtMs: endedAtMs - durationMs,
                };
            })
            .filter((call) => Number.isFinite(call.endedAtMs));

        if (!calls.length) {
            return { calls: [], durationMs: 0 };
        }

        const startedAtMs = Math.min(...calls.map((call) => call.startedAtMs));
        const endedAtMs = Math.max(...calls.map((call) => call.endedAtMs));
        return {
            calls,
            durationMs: Math.max(1, endedAtMs - startedAtMs),
            endedAt: new Date(endedAtMs).toISOString(),
            endedAtMs,
            startedAt: new Date(startedAtMs).toISOString(),
            startedAtMs,
        };
    }

    getRange(range) {
        const cutoff = cutoffFor(range);
        const whereSql = cutoff ? "WHERE created_at >= ?" : "";
        const params = cutoff ? [cutoff] : [];
        const totals = this.queryAggregate(whereSql, params);

        const split = this.sessionDb
            .prepare(`
                SELECT
                    CASE WHEN NULLIF(agent_id, '') IS NULL THEN 'root' ELSE 'subagents' END AS segment,
                    COUNT(*) AS calls,
                    SUM(COALESCE(input_tokens, 0)) AS input_tokens,
                    SUM(COALESCE(output_tokens, 0)) AS output_tokens,
                    SUM(COALESCE(reasoning_tokens, 0)) AS reasoning_tokens,
                    SUM(COALESCE(cache_read_tokens, 0)) AS cache_read_tokens,
                    SUM(COALESCE(cache_write_tokens, 0)) AS cache_write_tokens,
                    SUM(COALESCE(total_nano_aiu, 0)) AS total_nano_aiu,
                    SUM(COALESCE(duration_ms, 0)) AS duration_ms
                FROM assistant_usage_events
                ${whereSql}
                GROUP BY segment
            `)
            .all(...params)
            .map((row) => ({ ...normalizeAggregate(row), segment: row.segment }));

        const models = this.sessionDb
            .prepare(`
                SELECT
                    model,
                    COUNT(*) AS calls,
                    SUM(COALESCE(input_tokens, 0)) AS input_tokens,
                    SUM(COALESCE(output_tokens, 0)) AS output_tokens,
                    SUM(COALESCE(reasoning_tokens, 0)) AS reasoning_tokens,
                    SUM(COALESCE(cache_read_tokens, 0)) AS cache_read_tokens,
                    SUM(COALESCE(cache_write_tokens, 0)) AS cache_write_tokens,
                    SUM(COALESCE(total_nano_aiu, 0)) AS total_nano_aiu,
                    SUM(COALESCE(duration_ms, 0)) AS duration_ms
                FROM assistant_usage_events
                ${whereSql}
                GROUP BY model
                ORDER BY total_nano_aiu DESC
                LIMIT 8
            `)
            .all(...params)
            .map((row) => ({ ...normalizeAggregate(row), model: row.model }));

        const topSessions = this.sessionDb
            .prepare(`
                SELECT
                    e.session_id,
                    MAX(e.created_at) AS last_seen,
                    s.summary,
                    s.repository,
                    COUNT(*) AS calls,
                    SUM(COALESCE(e.input_tokens, 0)) AS input_tokens,
                    SUM(COALESCE(e.output_tokens, 0)) AS output_tokens,
                    SUM(COALESCE(e.reasoning_tokens, 0)) AS reasoning_tokens,
                    SUM(COALESCE(e.cache_read_tokens, 0)) AS cache_read_tokens,
                    SUM(COALESCE(e.cache_write_tokens, 0)) AS cache_write_tokens,
                    SUM(COALESCE(e.total_nano_aiu, 0)) AS total_nano_aiu,
                    SUM(COALESCE(e.duration_ms, 0)) AS duration_ms
                FROM assistant_usage_events e
                LEFT JOIN sessions s ON s.id = e.session_id
                ${cutoff ? "WHERE e.created_at >= ?" : ""}
                GROUP BY e.session_id, s.summary, s.repository
                ORDER BY total_nano_aiu DESC
                LIMIT 8
            `)
            .all(...params)
            .map((row) => {
                const app =
                    this.appDb
                        ?.prepare("SELECT title, agent, model FROM sessions WHERE id = ?")
                        .get(row.session_id) || {};
                return {
                    ...normalizeAggregate(row),
                    agent: app.agent,
                    id: row.session_id,
                    lastSeen: row.last_seen,
                    model: app.model,
                    repository: row.repository,
                    title: app.title || row.summary || `Session ${String(row.session_id).slice(0, 8)}`,
                };
            });

        return {
            id: range,
            label: RANGE_LABELS[range],
            models,
            split,
            topSessions,
            totals,
        };
    }

    buildDashboard({
        currentRuntime,
        currentSessionId,
        range,
        selectedSessionId,
        agentMetadata,
    }) {
        const dbTotals = this.queryAggregate("WHERE session_id = ?", [selectedSessionId]);
        const liveWindow =
            selectedSessionId === currentSessionId && currentRuntime
                ? runtimeAggregate(currentRuntime)
                : undefined;
        const selectedTotals = liveWindow || dbTotals;
        const agents = this.getSessionAgents(selectedSessionId, agentMetadata);
        const selectedNanoAiu = selectedTotals.totalNanoAiu || dbTotals.totalNanoAiu;
        for (const agent of agents) {
            agent.share =
                selectedNanoAiu > 0 ? Math.min(1, agent.totalNanoAiu / selectedNanoAiu) : 0;
        }

        return {
            aiCreditScale: BILLION,
            currentSessionId,
            generatedAt: new Date().toISOString(),
            range: this.getRange(range),
            ranges: Object.entries(RANGE_LABELS).map(([id, label]) => ({ id, label })),
            selected: {
                agents,
                info: this.getSessionInfo(selectedSessionId),
                isCurrent: selectedSessionId === currentSessionId,
                models: this.getSessionModels(selectedSessionId),
                timeline: this.getSessionTimeline(selectedSessionId),
                totals: selectedTotals,
            },
        };
    }
}
