import { DatabaseSync } from "node:sqlite";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { calendarDate, calendarHour, shiftDate, timeZone } from "./time.mjs";
import { readUsageWindow, makeSeries, buildPulse } from "./analytics.mjs";

export function resolveDbPath() {
    return path.join(process.env.COPILOT_HOME || path.join(os.homedir(), ".copilot"),
        "session-store.db");
}

function openDb() {
    if (!fs.existsSync(resolveDbPath())) {
        throw Object.assign(new Error(
            "No local Chronicle session store yet. Run a Copilot CLI session, then refresh.",
        ), { code: "NO_DB", statusCode: 404 });
    }
    const db = new DatabaseSync(resolveDbPath(), { readOnly: true });
    try {
        const zone = timeZone();
        const dates = new Map();
        db.function("calendar_date", value => {
            if (!dates.has(value)) dates.set(value, calendarDate(value, zone));
            return dates.get(value);
        });
        db.function("calendar_hour", value => calendarHour(value, zone));
        const required = {
            sessions: ["id", "created_at", "repository"],
            turns: ["session_id", "timestamp"],
            session_files: ["session_id", "file_path", "tool_name", "first_seen_at"],
            session_refs: ["session_id", "ref_type", "created_at"],
        };
        for (const [table, fields] of Object.entries(required)) {
            const columns = new Set(db.prepare(`PRAGMA table_info(${table})`)
                .all().map(row => row.name));
            if (fields.some(field => !columns.has(field))) {
                throw Object.assign(new Error(
                    `The local Chronicle schema is missing fields in ${table}. Update Copilot CLI and refresh.`,
                ), { code: "UNSUPPORTED_DB", statusCode: 409 });
            }
        }
        db.exec("BEGIN");
        return db;
    } catch (error) {
        db.close();
        throw error;
    }
}

const number = value => Number(value) || 0;
function windowCounts(db, start, end, now) {
    const args = [start, end, now.toISOString()];
    const predicate = field => `calendar_date(${field}) >= ? AND calendar_date(${field}) < ? AND julianday(${field}) <= julianday(?)`;
    const sessions = db.prepare(`SELECT COUNT(*) sessions,
        COUNT(DISTINCT NULLIF(repository,'')) repositories
        FROM sessions WHERE ${predicate("created_at")}`).get(...args);
    const turns = db.prepare(`SELECT COUNT(*) turns FROM turns
        WHERE ${predicate("timestamp")}`).get(...args);
    const files = db.prepare(`SELECT COUNT(*) files FROM (
        SELECT DISTINCT session_id, file_path FROM session_files
        WHERE ${predicate("first_seen_at")})`).get(...args);
    return {
        sessions: number(sessions.sessions), turns: number(turns.turns),
        repositories: number(sessions.repositories), files: number(files.files),
    };
}

export function computeSnapshot(range = "all", now = new Date()) {
    if (!["all", "30", "90"].includes(range)) {
        throw Object.assign(new Error("Range must be 30, 90, or all."),
            { code: "INVALID_RANGE", statusCode: 400 });
    }
    const db = openDb();
    try {
        const zone = timeZone();
        const today = calendarDate(now, zone);
        const start = range === "all" ? "0000-01-01" : shiftDate(today, 1 - Number(range));
        const end = shiftDate(today, 1);
        const args = [start, end, now.toISOString()];
        const predicate = field => `calendar_date(${field}) >= ? AND calendar_date(${field}) < ? AND julianday(${field}) <= julianday(?)`;
        const counts = windowCounts(db, start, end, now);
        const usage = readUsageWindow(db, start, end, now, { details: true });
        const dayMap = {};
        const dayRows = (table, field) => db.prepare(`SELECT calendar_date(${field}) day,
            COUNT(*) count FROM ${table} WHERE ${predicate(field)} GROUP BY day`).all(...args);
        for (const [table, field, key] of [
            ["sessions", "created_at", "s"], ["turns", "timestamp", "t"],
            ...(usage.coverage.status === "unavailable" ? []
                : [["assistant_usage_events", "created_at", "u"]]),
        ]) {
            for (const row of dayRows(table, field)) {
                (dayMap[row.day] ||= { s: 0, t: 0, u: 0 })[key] = number(row.count);
            }
        }
        const hours = new Array(24).fill(0);
        for (const row of db.prepare(`SELECT calendar_hour(created_at) hour, COUNT(*) count
            FROM sessions WHERE ${predicate("created_at")} GROUP BY hour`).all(...args)) {
            if (row.hour != null) hours[row.hour] = number(row.count);
        }
        const repos = db.prepare(`SELECT repository, COUNT(*) sessions FROM sessions
            WHERE repository IS NOT NULL AND repository <> '' AND ${predicate("created_at")}
            GROUP BY repository ORDER BY sessions DESC LIMIT 8`).all(...args);
        const distribution = (table, field, dateField) => db.prepare(`SELECT
            COALESCE(NULLIF(${field},''),'unknown') label, COUNT(*) count FROM ${table}
            WHERE ${predicate(dateField)} GROUP BY ${field} ORDER BY count DESC`).all(...args);
        const dates = Object.keys(dayMap).sort();
        const stats = {
            range, generatedAt: now.toISOString(), timeZone: zone, today,
            window: { start: range === "all" ? dates[0] || today : start, end, includesPartialToday: true },
            span: { first: dates[0] || null, last: dates.at(-1) || null },
            kpis: {
                sessions: counts.sessions, turns: counts.turns, repos: counts.repositories,
                files: counts.files, activeDays: dates.length,
                aiu: usage.aiu, tokens: usage.tokens, requests: usage.requests,
                avgTtftMs: usage.avgTtftMs, avgDurationMs: usage.avgDurationMs,
            },
            tokenComposition: usage.tokenComposition, metrics: usage.metrics,
            usageCoverage: usage.coverage, attribution: usage.attribution,
            series: makeSeries(usage.daily || [], start, end),
            dayMap, hours, models: usage.models, repos, effort: usage.effort,
            initiator: usage.initiator,
            refs: distribution("session_refs", "ref_type", "created_at"),
            tools: distribution("session_files", "tool_name", "first_seen_at"),
            hasUsage: usage.requests > 0,
        };
        const comparisonWindow = range === "all" ? null
            : { start, end: today, previousStart: shiftDate(start, 1 - Number(range)) };
        const current = comparisonWindow ? readUsageWindow(db, start, today, now) : null;
        const previous = comparisonWindow
            ? readUsageWindow(db, comparisonWindow.previousStart, start, now) : null;
        stats.pulse = buildPulse(stats, current, previous, comparisonWindow);
        return { stats, sessionGroups: usage.sessionGroups || [],
            modelDays: usage.modelDays || [] };
    } finally {
        db.close();
    }
}

export function computeStats(range = "all", now = new Date()) {
    return computeSnapshot(range, now).stats;
}

export function computeUsagePeriod(startAt, endAt) {
    const start = new Date(startAt), end = new Date(endAt);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end) {
        throw Object.assign(new Error("Usage periods require valid, ordered timestamps."), { statusCode: 400 });
    }
    const db = openDb();
    try {
        const usage = readUsageWindow(db, calendarDate(start), shiftDate(calendarDate(end), 1),
            end, { startAt: start.toISOString(), endAt: end.toISOString() });
        return {
            startAt: start.toISOString(), endAt: end.toISOString(), timeZone: timeZone(),
            requests: usage.requests, activeDays: usage.activeDays, metrics: usage.metrics,
            models: usage.models.map(row => ({ model: row.model, requests: row.requests, metrics: row.metrics })),
            usageCoverage: usage.coverage,
        };
    } finally {
        db.close();
    }
}

function compactWindow(db, start, end, now) {
    const counts = windowCounts(db, start, end, now);
    const usage = readUsageWindow(db, start, end, now);
    return {
        ...counts, requests: usage.requests, aiu: usage.aiu, tokens: usage.tokens,
        avgTtftMs: usage.avgTtftMs,
        models: usage.models.slice(0, 5).map(model => ({
            model: model.model, requests: model.reqs, aiu: model.aiu,
        })),
        efforts: usage.effort, metrics: usage.metrics, usageCoverage: usage.coverage,
    };
}

function percentChange(current, previous) {
    if (current == null || previous == null) return null;
    if (!previous) return current ? null : 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function computeCoachingContext(now = new Date()) {
    const db = openDb();
    try {
        const date = calendarDate(now);
        const end = shiftDate(date, 1);
        const weekStart = shiftDate(date, -6);
        const today = compactWindow(db, date, end, now);
        const current7Days = compactWindow(db, weekStart, end, now);
        const previous7Days = compactWindow(db, shiftDate(weekStart, -7), weekStart, now);
        const last30Days = compactWindow(db, shiftDate(date, -29), end, now);
        return {
            date, timeZone: timeZone(), generatedAt: now.toISOString(),
            windows: { today, current7Days, previous7Days, last30Days },
            changes: Object.fromEntries(["sessions", "turns", "aiu", "tokens", "files"]
                .map(key => [`${key}Pct`, percentChange(current7Days[key], previous7Days[key])])),
            guidance: {
                evidenceRule: "Ground local usage totals and comparisons in these aggregates. Native Chronicle observations must cite observed history and distinguish different sources, periods or coverage. Local usage is not account-wide billing or a measure of productivity.",
                privacyRule: "Native Chronicle may analyze relevant session history. Do not quote raw prompts, transcripts or private code, or include repository, branch, session or file identifiers in the saved output.",
                interpretationRule: "A null percentage indicates missing usage data or a zero baseline. Report absolute values, not an invented percentage. Current windows include a partial today.",
                tokenRule: "Total tokens = input + output. Cache and reasoning counters may overlap those totals; do not add them again.",
            },
        };
    } finally {
        db.close();
    }
}
