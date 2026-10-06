import { randomUUID } from "node:crypto";
import { computeSnapshot } from "./db.mjs";
import { combineMetrics, makeSeries } from "./analytics.mjs";
import { validDate } from "./time.mjs";

function invalid(message, code = "INVALID_INPUT", statusCode = 400) {
    return Object.assign(new Error(message), { code, statusCode });
}

function freeze(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
        Object.freeze(value);
        for (const child of Object.values(value)) freeze(child);
    }
    return value;
}

function identifier(value, label) {
    if (typeof value !== "string" || !value || value.length > 256) {
        throw invalid(`${label} is required and must be at most 256 characters.`);
    }
    return value;
}

export function createSnapshotStore({
    clock = () => new Date(), maxSnapshots = 4, ttlMs = 20 * 60 * 1000,
    currentSessionId = () => null,
} = {}) {
    const entries = new Map();
    function prune() {
        const now = clock().getTime();
        for (const [id, entry] of entries) {
            if (entry.expiresAt <= now) entries.delete(id);
        }
    }
    function get(id) {
        identifier(id, "Snapshot ID");
        prune();
        const entry = entries.get(id);
        if (!entry) throw invalid("This usage snapshot has expired or was replaced. Refresh the overview to inspect current data.",
            "SNAPSHOT_EXPIRED", 409);
        return entry;
    }
    function page(rows, { offset = 0, sort = "aiu" } = {}) {
        const first = Number(offset);
        if (!Number.isSafeInteger(first) || first < 0 || first > 200000) {
            throw invalid("Page offset must be a non-negative integer.");
        }
        if (!["aiu", "tokens", "requests"].includes(sort)) {
            throw invalid("Sort must be aiu, tokens, or requests.");
        }
        const ordered = rows.slice().sort((a, b) => {
            const left = a.metrics[sort].value, right = b.metrics[sort].value;
            if (left == null && right != null) return 1;
            if (right == null && left != null) return -1;
            return (right ?? 0) - (left ?? 0) ||
                String(b.startedAt || b.date || "").localeCompare(String(a.startedAt || a.date || ""));
        });
        return { rows: ordered.slice(first, first + 20), total: rows.length, offset: first, sort,
            previousOffset: first ? Math.max(0, first - 20) : null,
            nextOffset: first + 20 < rows.length ? first + 20 : null };
    }
    return {
        coaching(input) {
            if (!input || typeof input !== "object" || Array.isArray(input) ||
                Object.keys(input).some(key => !["kind", "snapshotId", "model", "sessionId", "metric"].includes(key))) {
                throw invalid("A valid inspection scope is required.");
            }
            const entry = get(input.snapshotId);
            const shared = {
                kind: input.kind, range: entry.stats.range, window: entry.stats.window,
                asOf: entry.stats.snapshot.asOf, date: entry.stats.today,
                timeZone: entry.stats.timeZone, usageCoverage: entry.stats.usageCoverage,
            };
            if (input.kind === "model") {
                const model = identifier(input.model, "Model");
                const row = entry.stats.models.find(item => item.model === model);
                if (!row) throw invalid("This model has no recorded calls in the snapshot.", "NOT_FOUND", 404);
                return { ...shared, model, metrics: row.metrics };
            }
            if (input.kind === "session") {
                const sessionId = identifier(input.sessionId, "Session ID");
                const model = input.model == null ? null : identifier(input.model, "Model");
                const rows = entry.sessionGroups.filter(row => row.sessionId === sessionId && (!model || row.model === model));
                if (!rows.length) throw invalid("This session has no attributable calls in the snapshot.", "NOT_FOUND", 404);
                return { ...shared, sessionId, model, metrics: combineMetrics(rows) };
            }
            if (input.kind !== "range" || (input.metric != null &&
                !["aiu", "tokens", "requests", "sessions", "turns", "activeDays"].includes(input.metric))) {
                throw invalid("Inspection scope must be range, model, or session.");
            }
            return { ...shared, metric: input.metric || null, kpis: entry.stats.kpis, metrics: entry.stats.metrics };
        },
        create(range = "30") {
            prune();
            const now = clock();
            const snapshot = computeSnapshot(range, now);
            const id = randomUUID();
            const expiresAt = now.getTime() + ttlMs;
            snapshot.stats.snapshot = { id, asOf: now.toISOString(),
                expiresAt: new Date(expiresAt).toISOString(), source: "local-chronicle" };
            for (const row of snapshot.sessionGroups) {
                row.currentSession = row.sessionId != null && row.sessionId === currentSessionId();
            }
            freeze(snapshot);
            while (entries.size >= maxSnapshots) entries.delete(entries.keys().next().value);
            entries.set(id, { ...snapshot, expiresAt });
            return snapshot.stats;
        },
        series(input) {
            const entry = get(input.snapshotId);
            if (!validDate(input.start) || input.start >= entry.stats.window.end) {
                throw invalid("Graph start must be a valid date no later than this snapshot's last day.");
            }
            const model = input.model == null ? null : identifier(input.model, "Model");
            if (model && !entry.stats.models.some(row => row.model === model)) {
                throw invalid("This model has no recorded calls in the snapshot.", "NOT_FOUND", 404);
            }
            const start = input.start < entry.stats.window.start ? entry.stats.window.start : input.start;
            const days = entry.modelDays.filter(row => row.date >= start && (model == null || row.model === model));
            return { snapshot: entry.stats.snapshot, start, model,
                ...makeSeries(days, start, entry.stats.window.end) };
        },
        model(input) {
            const entry = get(input.snapshotId);
            const model = identifier(input.model, "Model");
            const summary = entry.stats.models.find(row => row.model === model);
            if (!summary) throw invalid("This model has no recorded calls in the snapshot.", "NOT_FOUND", 404);
            const sessions = entry.sessionGroups.filter(row => row.model === model);
            const matched = sessions.filter(row => row.sessionId != null);
            const days = entry.modelDays.filter(row => row.model === model);
            const mode = matched.length ? "sessions" : "days";
            return {
                snapshot: entry.stats.snapshot, range: entry.stats.range, timeZone: entry.stats.timeZone,
                model, metrics: summary.metrics, first: summary.first, last: summary.last,
                share: entry.stats.kpis.aiu && summary.aiu != null
                    ? summary.aiu / entry.stats.kpis.aiu : null,
                series: makeSeries(days, entry.stats.series.points[0]?.date || entry.stats.window.start,
                    entry.stats.window.end),
                attribution: { matchedCalls: matched.reduce((sum, row) => sum + row.requests, 0),
                    unattributedCalls: summary.requests - matched.reduce((sum, row) => sum + row.requests, 0) },
                mode, records: page(mode === "sessions" ? sessions : days, input),
            };
        },
        session(input) {
            const entry = get(input.snapshotId);
            const sessionId = identifier(input.sessionId, "Session ID");
            const model = input.model == null ? null : identifier(input.model, "Model");
            const rows = entry.sessionGroups.filter(row => row.sessionId === sessionId &&
                (model == null || row.model === model));
            if (!rows.length) throw invalid("This session has no attributable calls in the selected snapshot.",
                "NOT_FOUND", 404);
            return {
                snapshot: entry.stats.snapshot, range: entry.stats.range, timeZone: entry.stats.timeZone,
                sessionId, model, startedAt: rows[0].startedAt, repository: rows[0].repository,
                beforeRange: rows[0].beforeRange, currentSession: rows[0].currentSession,
                metrics: combineMetrics(rows), models: rows.map(row => ({
                    model: row.model, metrics: row.metrics, first: row.first, last: row.last,
                })),
                note: "Metrics use the calls within this snapshot and model scope, not the session's whole lifetime. No conversation content is read.",
            };
        },
    };
}
