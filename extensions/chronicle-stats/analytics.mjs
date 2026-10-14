import { calendarDate, shiftDate } from "./time.mjs";

export const COUNTERS = ["aiu", "tokens", "input", "output", "cacheRead", "cacheWrite", "reasoning"];
const FIELDS = {
    aiu: "total_nano_aiu", input: "input_tokens", output: "output_tokens",
    cacheRead: "cache_read_tokens", cacheWrite: "cache_write_tokens", reasoning: "reasoning_tokens",
};
const iso = value => value == null ? null
    : new Date(Math.round((value - 2440587.5) * 86400000)).toISOString();

function metric(value, recordedCalls, completeCalls, totalCalls) {
    return { value: value == null ? null : Number(value), recordedCalls, completeCalls,
        totalCalls, complete: totalCalls > 0 && completeCalls === totalCalls };
}

function decode(row) {
    const requests = Number(row.requests);
    const metrics = Object.fromEntries(COUNTERS.map(key => [key, metric(
        row[key], Number(row[`${key}Recorded`]), Number(row[`${key}Complete`]), requests,
    )]));
    metrics.requests = metric(requests, requests, requests, requests);
    return {
        requests, activeDays: Number(row.activeDays), metrics,
        aiu: metrics.aiu.value, tokens: metrics.tokens.value,
        tokenComposition: Object.fromEntries(COUNTERS.slice(2).map(key => [key, metrics[key].value])),
        avgTtftMs: row.ttft == null ? null : Math.round(row.ttft),
        avgDurationMs: row.duration == null ? null : Math.round(row.duration),
        first: iso(row.first), last: iso(row.last),
    };
}

export function readUsageWindow(db, start, end, now, { details = false, startAt, endAt } = {}) {
    const columns = new Set(db.prepare("PRAGMA table_info(assistant_usage_events)")
        .all().map(row => row.name));
    if (!columns.has("created_at")) {
        const metrics = Object.fromEntries([...COUNTERS, "requests"].map(key =>
            [key, metric(key === "requests" ? 0 : null, 0, 0, 0)]));
        return {
            requests: 0, activeDays: 0, aiu: null, tokens: null, metrics, tokenComposition: {},
            models: [], effort: [], initiator: [], series: [], sessionGroups: [],
            avgTtftMs: null, avgDurationMs: null, first: null, last: null,
            coverage: { status: "unavailable", first: null, last: null,
                recordingSince: null, missingFields: ["assistant_usage_events.created_at"],
                message: "Detailed usage is not recorded in this store. Activity history is still available." },
            attribution: { supported: false, matchedCalls: 0, unattributedCalls: 0 },
        };
    }
    const field = name => columns.has(name) ? `u.${name}` : "NULL";
    const input = field("input_tokens"), output = field("output_tokens");
    const anyTokens = `(${input} IS NOT NULL OR ${output} IS NOT NULL)`;
    const bothTokens = `(${input} IS NOT NULL AND ${output} IS NOT NULL)`;
    const select = ["COUNT(*) requests", "COUNT(DISTINCT calendar_date(u.created_at)) activeDays",
        "MIN(julianday(u.created_at)) first",
        "MAX(julianday(u.created_at)) last"];
    for (const key of COUNTERS) {
        const expr = key === "tokens"
            ? `CASE WHEN ${anyTokens} THEN COALESCE(${input},0)+COALESCE(${output},0) END`
            : field(FIELDS[key]);
        const recorded = key === "tokens" ? anyTokens : `${expr} IS NOT NULL`;
        const complete = key === "tokens" ? bothTokens : recorded;
        select.push(`SUM(${expr})${key === "aiu" ? "/1e9" : ""} ${key}`,
            `COUNT(CASE WHEN ${recorded} THEN 1 END) ${key}Recorded`,
            `COUNT(CASE WHEN ${complete} THEN 1 END) ${key}Complete`);
    }
    select.push(`AVG(${field("time_to_first_token_ms")}) ttft`,
        `AVG(${field("duration_ms")}) duration`);
    const metricSql = select.join(", ");
    let predicate = "calendar_date(u.created_at) >= ? AND calendar_date(u.created_at) < ? AND julianday(u.created_at) <= julianday(?)";
    const args = [start, end, now.toISOString()];
    if (startAt) { predicate += " AND julianday(u.created_at) >= julianday(?)"; args.push(startAt); }
    if (endAt) { predicate += " AND julianday(u.created_at) < julianday(?)"; args.push(endAt); }
    const from = `FROM assistant_usage_events u WHERE ${predicate}`;
    const modelExpr = `COALESCE(NULLIF(${field("model")},''), 'unknown')`;
    const row = db.prepare(`SELECT ${metricSql} ${from}`).get(...args);
    const summary = decode(row);
    const models = db.prepare(`SELECT ${modelExpr} modelKey, ${metricSql} ${from}
        GROUP BY modelKey ORDER BY aiu DESC`).all(...args).map(value => ({
        model: value.modelKey, reqs: Number(value.requests), ...decode(value),
    }));
    const distribution = name => columns.has(name) ? db.prepare(`SELECT
        COALESCE(NULLIF(u.${name},''), 'unknown') label, COUNT(*) count ${from}
        GROUP BY label ORDER BY count DESC`).all(...args) : [];
    const global = db.prepare(`SELECT MIN(julianday(created_at)) first,
        MAX(julianday(created_at)) last FROM assistant_usage_events
        WHERE julianday(created_at) <= julianday(?)`).get(now.toISOString());
    const invalid = db.prepare(`SELECT COUNT(*) count FROM assistant_usage_events
        WHERE julianday(created_at) IS NULL`).get();
    const coverage = {
        status: summary.requests ? "available" : "empty", first: summary.first, last: summary.last,
        recordingSince: iso(global.first), latestRecorded: iso(global.last),
        invalidTimestampCalls: Number(invalid.count),
        missingFields: [...Object.values(FIELDS), "model", "session_id",
            "reasoning_effort", "initiator", "time_to_first_token_ms", "duration_ms"]
            .filter(name => !columns.has(name)),
        message: "Local recorded calls only, not account-wide billing. Gaps may mean inactivity or missing recording.",
    };
    const result = { ...summary, models, effort: distribution("reasoning_effort"),
        initiator: distribution("initiator"), coverage };
    if (!details) return result;
    const daily = db.prepare(`SELECT calendar_date(u.created_at) date, ${metricSql} ${from}
        GROUP BY date ORDER BY date`).all(...args).map(value => ({ date: value.date, ...decode(value) }));
    const modelDays = db.prepare(`SELECT ${modelExpr} modelKey,
        calendar_date(u.created_at) date, ${metricSql} ${from}
        GROUP BY modelKey, date ORDER BY date`).all(...args)
        .map(value => ({ model: value.modelKey, date: value.date, ...decode(value) }));
    let sessionGroups = [];
    if (columns.has("session_id")) {
        sessionGroups = db.prepare(`SELECT ${modelExpr} modelKey,
            s.id sessionKey, MIN(julianday(s.created_at)) started,
            MAX(s.repository) repository, ${metricSql}
            FROM assistant_usage_events u LEFT JOIN sessions s ON s.id=u.session_id
            WHERE ${predicate} GROUP BY modelKey, sessionKey LIMIT 20001`).all(...args);
        if (sessionGroups.length > 20000) {
            throw Object.assign(new Error("This range is too large for session inspection. Choose a narrower range."),
                { code: "RANGE_TOO_LARGE", statusCode: 413 });
        }
        sessionGroups = sessionGroups.map(value => ({
            model: value.modelKey, sessionId: value.sessionKey,
            startedAt: iso(value.started), repository: value.repository || null,
            beforeRange: value.started != null && calendarDate(iso(value.started)) < start,
            ...decode(value),
        }));
    }
    const matchedCalls = sessionGroups.filter(value => value.sessionId != null)
        .reduce((sum, value) => sum + value.requests, 0);
    return { ...result, daily, modelDays, sessionGroups,
        attribution: { supported: columns.has("session_id"), matchedCalls,
            unattributedCalls: summary.requests - matchedCalls } };
}

export function combineMetrics(rows) {
    const totalCalls = rows.reduce((sum, row) => sum + row.requests, 0);
    const metrics = Object.fromEntries(COUNTERS.map(key => {
        const values = rows.map(row => row.metrics[key]);
        const known = values.filter(value => value.value != null);
        return [key, metric(known.length ? known.reduce((sum, value) => sum + value.value, 0) : null,
            values.reduce((sum, value) => sum + value.recordedCalls, 0),
            values.reduce((sum, value) => sum + value.completeCalls, 0), totalCalls)];
    }));
    metrics.requests = metric(totalCalls, totalCalls, totalCalls, totalCalls);
    return metrics;
}

export function makeSeries(daily, start, end) {
    if (!daily.length) return { points: [], granularity: "day" };
    const first = start === "0000-01-01" ? daily[0].date : start;
    const dayCount = Math.round((Date.parse(`${end}T12:00:00Z`) -
        Date.parse(`${first}T12:00:00Z`)) / 86400000);
    const granularity = dayCount <= 120 ? "day" : dayCount <= 1825 ? "week" : "month";
    const bucket = date => {
        if (granularity === "month") return `${date.slice(0, 7)}-01`;
        if (granularity === "week") {
            return shiftDate(date, -((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7));
        }
        return date;
    };
    const groups = new Map();
    for (const row of daily) {
        const key = bucket(row.date);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row);
    }
    const points = [];
    for (let date = first; date < end;) {
        const key = bucket(date);
        const metrics = combineMetrics(groups.get(key) || []);
        points.push({ date: key, metrics, aiu: metrics.aiu.value,
            tokens: metrics.tokens.value, requests: metrics.requests.value });
        if (granularity === "month") {
            const next = new Date(`${key}T12:00:00Z`);
            next.setUTCMonth(next.getUTCMonth() + 1);
            date = next.toISOString().slice(0, 10);
        } else {
            date = shiftDate(key, granularity === "week" ? 7 : 1);
        }
    }
    return { points, granularity };
}

export const PULSE_RULES = Object.freeze({
    minimumCalls: 20, minimumActiveDays: 3, minimumAiuBaseline: 1,
    minimumChangePct: 20, concentrationShare: 0.7,
});

export function buildPulse(stats, current, previous, comparisonWindow) {
    const evidence = [
        `${stats.range === "all" ? "All recorded history" : `${stats.range} calendar days`}; snapshot as of ${stats.generatedAt}.`,
        `${stats.kpis.requests} recorded model calls. These are not premium requests or a productivity score.`,
        stats.usageCoverage.message,
    ];
    if (stats.usageCoverage.recordingSince) {
        evidence.push(`Earliest retained usage: ${stats.usageCoverage.recordingSince}. This is not proof of uninterrupted coverage.`);
    }
    const ready = value => value.requests >= PULSE_RULES.minimumCalls &&
        value.activeDays >= PULSE_RULES.minimumActiveDays;
    if (comparisonWindow) {
        evidence.push(`Comparison excludes partial today: ${comparisonWindow.start} to ${shiftDate(comparisonWindow.end, -1)} versus ${comparisonWindow.previousStart} to ${shiftDate(comparisonWindow.start, -1)}.`);
        evidence.push(`Samples: ${current.requests} calls on ${current.activeDays} active recording days versus ${previous.requests} calls on ${previous.activeDays} days. Gates: 20 calls and 3 active days in each period.`);
        const retainedBaseline = stats.usageCoverage.recordingSince &&
            calendarDate(stats.usageCoverage.recordingSince) <= comparisonWindow.previousStart;
        if (!retainedBaseline) evidence.push("Retained usage begins after the previous period starts; a partial baseline cannot support a comparison.");
        if (retainedBaseline && ready(current) && ready(previous)) {
            const costReady = current.metrics.aiu.complete && previous.metrics.aiu.complete &&
                previous.aiu >= PULSE_RULES.minimumAiuBaseline;
            const key = costReady ? "aiu" : "requests";
            const before = previous[key], after = current[key];
            const change = before ? (after - before) / before * 100 : null;
            if (change != null && Math.abs(change) >= PULSE_RULES.minimumChangePct - Number.EPSILON * 100) {
                const label = key === "aiu" ? "Recorded AIU" : "Recorded model calls";
                return { kind: "change",
                    headline: `${label} ${change > 0 ? "rose" : "fell"} ${Math.abs(change).toFixed(0)}% across comparable days`,
                    summary: `${current.requests} calls versus ${previous.requests} in the preceding period. This describes recorded consumption, not efficiency or quality.`,
                    comparison: { key, current: after, previous: before, change, window: comparisonWindow },
                    evidence: [...evidence, `${label}: ${after} versus ${before}. Percentage gate: at least 20% change; AIU baseline must be at least 1 with complete counters.`] };
            }
        }
    } else {
        evidence.push("All-time has no previous-period comparison.");
    }
    const ranked = stats.models.filter(row => row.aiu != null).slice().sort((a, b) => b.aiu - a.aiu);
    if (stats.kpis.requests >= PULSE_RULES.minimumCalls && stats.metrics.aiu.complete &&
        ranked.length >= 2 && stats.kpis.aiu > 0 &&
        ranked[0].aiu / stats.kpis.aiu >= PULSE_RULES.concentrationShare) {
        const share = ranked[0].aiu / stats.kpis.aiu;
        return { kind: "concentration", headline: `${ranked[0].model} accounts for ${(share * 100).toFixed(0)}% of recorded AIU`,
            driver: { model: ranked[0].model, value: ranked[0].aiu, total: stats.kpis.aiu, share },
            summary: "Explore its contributing sessions before deciding whether to change anything. Model mix alone does not establish value or waste.",
            evidence: [...evidence, `${ranked[0].aiu} of ${stats.kpis.aiu} AIU. Gates: at least 2 models, 20 calls, complete AIU, and 70% contribution.`] };
    }
    if (!stats.hasUsage) {
        return { kind: "unavailable", headline: "Your activity is here; detailed usage needs a baseline",
            summary: "Browse recorded activity or use local Copilot sessions, then refresh. Missing token counters are not zero usage.",
            evidence };
    }
    return { kind: "baseline", headline: "Your recorded usage is taking shape",
        summary: `${stats.kpis.requests} model calls in this view. There is not yet a qualifying comparison or multi-model concentration signal.`,
        evidence: [...evidence, "No claim passed the conservative evidence gates. Missing counters and sparse or partial periods cannot establish a trend."] };
}
