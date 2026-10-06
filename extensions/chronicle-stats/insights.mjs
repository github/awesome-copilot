import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { calendarDate, timeZone, validDate } from "./time.mjs";

const MAX_DAYS = 90;
const MAX_MESSAGES_PER_DAY = 60;
const STATUSES = new Set(["new", "trying", "done"]);
const OUTCOMES = new Set(["unassessed", "helped", "no-change", "worse", "inconclusive"]);
export const DEFAULT_PREFERENCES = Object.freeze({
    range: "30", metric: "aiu", coachExpanded: false, hideRepositories: true, trendStart: null, composerHeight: null,
});

function validatePreferences(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        throw invalid("Preferences must be an object.");
    }
    const checks = {
        range: value => ["30", "90", "all"].includes(value),
        metric: value => ["aiu", "tokens", "requests"].includes(value),
        coachExpanded: value => typeof value === "boolean",
        hideRepositories: value => typeof value === "boolean",
        trendStart: value => value === null || validDate(value),
        composerHeight: value => value === null || Number.isInteger(value) && value >= 140 && value <= 300,
    };
    for (const [key, value] of Object.entries(input)) {
        if (!Object.hasOwn(checks, key) || !checks[key](value)) throw invalid(`Invalid preference: ${key}.`);
    }
    return input;
}

function artifactsDir() {
    const home = process.env.COPILOT_HOME || path.join(os.homedir(), ".copilot");
    // Hidden directories are excluded by the extension's built-in Gist share flow.
    return path.join(home, "extensions", "chronicle-stats", "artifacts", ".private");
}

export function insightsPath() {
    return path.join(artifactsDir(), "insights.json");
}

function invalid(message, statusCode = 400) {
    return Object.assign(new Error(message), { statusCode });
}

function assertDate(date) {
    if (!validDate(date)) throw invalid("Date must be a valid YYYY-MM-DD calendar date.");
}

function assertId(id) {
    if (typeof id !== "string" || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) {
        throw invalid("Recommendation ID must contain lowercase letters, digits, or hyphens.");
    }
}

function text(value, label, limit = 400) {
    if (typeof value !== "string" || !value.trim() || value.length > limit) {
        throw invalid(`${label} must be a nonempty string of at most ${limit} characters.`);
    }
    return value.trim();
}

function withWriteLock(update) {
    const directory = artifactsDir();
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const lock = path.join(directory, ".write-lock");
    let fd;
    try {
        fd = fs.openSync(lock, "wx", 0o600);
    } catch (error) {
        if (error.code !== "EEXIST") throw error;
        throw invalid("Insight storage is busy. Retry shortly; if this persists after a crash, see README.md: Troubleshooting.", 409);
    }
    try {
        return update();
    } finally {
        fs.closeSync(fd);
        fs.unlinkSync(lock);
    }
}

export function initializeInsights() {
    const legacy = path.join(path.dirname(artifactsDir()), "insights.json");
    if (!fs.existsSync(legacy)) return;
    withWriteLock(() => {
        if (!fs.existsSync(legacy)) return;
        if (fs.existsSync(insightsPath())) {
            throw new Error("Both legacy and private insight stores exist. Back them up and reconcile them before sharing.");
        }
        fs.renameSync(legacy, insightsPath());
        fs.chmodSync(insightsPath(), 0o600);
    });
}

function emptyStore() {
    return { version: 1, briefs: [], chats: {}, experiments: Object.create(null) };
}

function readStore() {
    initializeInsights();
    if (!fs.existsSync(insightsPath())) return emptyStore();
    const parsed = JSON.parse(fs.readFileSync(insightsPath(), "utf8"));
    if (parsed?.version !== 1 || !Array.isArray(parsed.briefs) ||
        (parsed.chats != null && (typeof parsed.chats !== "object" || Array.isArray(parsed.chats)))) {
        throw new Error("Invalid insight store. Back up the file and restore a valid store; see README.md: Troubleshooting.");
    }
    if (parsed.experiments != null && (typeof parsed.experiments !== "object" || Array.isArray(parsed.experiments))) {
        throw new Error("Invalid experiment store. Back up the file; see README.md: Troubleshooting.");
    }
    return { ...parsed, chats: parsed.chats || {},
        experiments: experimentCatalog(parsed),
        preferences: { ...DEFAULT_PREFERENCES,
            ...validatePreferences(parsed.preferences === undefined ? {} : parsed.preferences) } };
}

function experimentCatalog(store) {
    const catalog = Object.assign(Object.create(null), store.experiments || {});
    for (const [id, item] of Object.entries(catalog)) {
        assertId(id);
        const timestamp = value => value === null || typeof value === "string" && Number.isFinite(Date.parse(value));
        const metric = value => value && (value.value === null || Number.isFinite(value.value) && value.value >= 0) &&
            [value.recordedCalls, value.completeCalls, value.totalCalls].every(count => Number.isInteger(count) && count >= 0) &&
            value.completeCalls <= value.recordedCalls && value.recordedCalls <= value.totalCalls && typeof value.complete === "boolean";
        const baseline = value => value === null || value && timestamp(value.startAt) && timestamp(value.endAt) &&
            Date.parse(value.startAt) < Date.parse(value.endAt) && value.metrics &&
            ["aiu","tokens","requests","input","output","cacheRead","cacheWrite","reasoning"].every(key => metric(value.metrics[key])) &&
            typeof value.usageCoverage?.message === "string";
        if (!item || item.id !== id || !STATUSES.has(item.status) || !OUTCOMES.has(item.outcome) ||
            !validDate(item.sourceDate) ||
            [item.title, item.action, item.why, item.evidence].some(value => typeof value !== "string" || !value.trim()) ||
            typeof item.notes !== "string" || item.notes.length > 2000 ||
            !timestamp(item.startedAt) || !timestamp(item.statusUpdatedAt) || !baseline(item.baseline) ||
            item.review !== null && (!item.review || typeof item.review.text !== "string" ||
                !item.review.text.trim() || item.review.text.length > 10000 || !timestamp(item.review.at) || item.review.at === null)) {
            throw new Error("Invalid experiment state. Back up the file; see README.md: Troubleshooting.");
        }
    }
    for (const brief of store.briefs.slice().sort((a, b) => a.date.localeCompare(b.date))) {
        for (const rec of brief.recommendations || []) {
            assertId(rec.id);
            const existing = catalog[rec.id];
            if (existing) {
                if (!STATUSES.has(existing.status) || !OUTCOMES.has(existing.outcome)) {
                    throw new Error("Invalid experiment state. Back up the file; see README.md: Troubleshooting.");
                }
                if (existing.status === "new" && !existing.startedAt) {
                    Object.assign(existing, { title:rec.title, action:rec.action, why:rec.why, evidence:rec.evidence, sourceDate:brief.date });
                }
                continue;
            }
            const historical = store.briefs.flatMap(item => (item.recommendations || [])
                .filter(value => value.id === rec.id && value.statusUpdatedAt));
            const latest = historical.sort((a, b) => String(b.statusUpdatedAt).localeCompare(String(a.statusUpdatedAt)))[0];
            const status = STATUSES.has(latest?.status) ? latest.status : "new";
            const started = historical.filter(item => item.status === "trying")
                .sort((a, b) => String(a.statusUpdatedAt).localeCompare(String(b.statusUpdatedAt)))[0];
            catalog[rec.id] = {
                id: rec.id, title: rec.title, action: rec.action, why: rec.why, evidence: rec.evidence,
                sourceDate: brief.date, status, statusUpdatedAt: latest?.statusUpdatedAt || null,
                startedAt: started?.statusUpdatedAt || null,
                baseline: null, notes: "", outcome: "unassessed", review: null,
            };
        }
    }
    return catalog;
}

function writeStore(store) {
    const file = insightsPath();
    const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
    try {
        fs.writeFileSync(temporary, `${JSON.stringify(store, null, 2)}\n`,
            { encoding: "utf8", mode: 0o600 });
        fs.renameSync(temporary, file);
    } finally {
        if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
}

function pruneChats(chats, briefs) {
    const dates = [...new Set([...Object.keys(chats), ...briefs.map(brief => brief.date)])]
        .sort((a, b) => b.localeCompare(a)).slice(0, MAX_DAYS);
    return Object.fromEntries(dates.filter(date => Array.isArray(chats[date]))
        .map(date => [date, chats[date]]));
}

export function listBriefs() {
    const store = readStore();
    const experiments = store.experiments || {};
    return { ...store, experiments,
        briefs: store.briefs.map(brief => ({ ...brief, recommendations: (brief.recommendations || []).map(rec => ({
            ...rec, status: experiments[rec.id]?.status || rec.status,
            statusUpdatedAt: experiments[rec.id]?.statusUpdatedAt || rec.statusUpdatedAt,
        })) })),
        preferences: store.preferences || { ...DEFAULT_PREFERENCES },
        retentionDays: MAX_DAYS, today: calendarDate(), timeZone: timeZone() };
}

export function savePreferences(input) {
    validatePreferences(input);
    initializeInsights();
    return withWriteLock(() => {
        const store = readStore();
        store.preferences = { ...DEFAULT_PREFERENCES, ...store.preferences, ...input };
        writeStore(store);
        return store.preferences;
    });
}

function validateBrief(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        throw invalid("A daily brief object is required.");
    }
    assertDate(input.date);
    if (input.analysisSource !== undefined &&
        !["local-aggregates", "native-chronicle"].includes(input.analysisSource)) {
        throw invalid("Unsupported insight analysis source.");
    }
    const signals = (items, label, min) => {
        if (!Array.isArray(items) || items.length < min || items.length > 3) {
            throw invalid(`${label} must contain ${min} to 3 items.`);
        }
        return items.map(item => ({
            title: text(item?.title, `${label} title`, 120),
            evidence: text(item?.evidence, `${label} evidence`),
        }));
    };
    if (!Array.isArray(input.recommendations) || input.recommendations.length < 1 ||
        input.recommendations.length > 4) {
        throw invalid("A brief must contain 1 to 4 recommendations.");
    }
    const ids = new Set();
    const recommendations = input.recommendations.map(item => {
        assertId(item?.id);
        if (ids.has(item.id)) throw invalid("Recommendation IDs must be unique within a brief.");
        ids.add(item.id);
        return {
            id: item.id, title: text(item.title, "Recommendation title", 120),
            why: text(item.why, "Recommendation why"),
            evidence: text(item.evidence, "Recommendation evidence"),
            action: text(item.action, "Recommendation action"),
        };
    });
    return {
        date: input.date, analysisSource: input.analysisSource || "local-aggregates",
        headline: text(input.headline, "Headline", 100),
        summary: text(input.summary, "Summary"),
        wins: signals(input.wins, "Wins", 1),
        watchouts: signals(input.watchouts, "Watchouts", 0), recommendations,
    };
}

export function saveDailyBrief(input) {
    const validated = validateBrief(input);
    initializeInsights();
    return withWriteLock(() => {
        const store = readStore();
        const previous = store.briefs.find(brief => brief.date === validated.date);
        const previousById = new Map(
            (previous?.recommendations || []).map(item => [item.id, item]),
        );
        const brief = {
            ...validated, generatedAt: new Date().toISOString(),
            dataSource: "local-chronicle", timeZone: timeZone(),
            recommendations: validated.recommendations.map(item => {
                const old = store.experiments?.[item.id] || previousById.get(item.id);
                return { ...item, status: STATUSES.has(old?.status) ? old.status : "new",
                    statusUpdatedAt: old?.statusUpdatedAt || null };
            }),
        };
        const briefs = store.briefs.filter(item => item.date !== brief.date).concat(brief)
            .sort((a, b) => b.date.localeCompare(a.date)).slice(0, MAX_DAYS);
        const experiments = experimentCatalog({ ...store, briefs });
        if (Object.keys(experiments).length > 1000) {
            throw invalid("Your store has reached 1,000 experiments. Back it up and archive finished experiments before adding more.", 409);
        }
        writeStore({ ...store, version: 1, briefs, experiments, chats: pruneChats(store.chats, briefs) });
        return brief;
    });
}

export function appendChatMessage(date, role, value, scope = null) {
    assertDate(date);
    if (!["user", "coach"].includes(role)) throw invalid("Unsupported chat role.");
    const body = text(value, "Chat message", 10000);
    if (scope != null && (typeof scope.label !== "string" || scope.label.length > 100 ||
        typeof scope.asOf !== "string" || !Number.isFinite(Date.parse(scope.asOf)))) {
        throw invalid("Chat scope must include a label and a valid timestamp.");
    }
    initializeInsights();
    return withWriteLock(() => {
        const store = readStore();
        const message = { id: randomUUID(), role, text: body, at: new Date().toISOString() };
        if (scope) message.scope = { label: scope.label, asOf: scope.asOf };
        const thread = Array.isArray(store.chats[date]) ? store.chats[date] : [];
        store.chats[date] = thread.concat(message).slice(-MAX_MESSAGES_PER_DAY);
        writeStore({ ...store, chats: pruneChats(store.chats, store.briefs) });
        return message;
    });
}

export function updateRecommendationStatus(date, recommendationId, status, baseline = null, now = new Date()) {
    assertDate(date);
    assertId(recommendationId);
    if (!STATUSES.has(status)) throw invalid("Unsupported recommendation status.");
    initializeInsights();
    return withWriteLock(() => {
        const store = readStore();
        const brief = store.briefs.find(item => item.date === date);
        const experiment = store.experiments[recommendationId];
        const recommendation = brief?.recommendations.find(item => item.id === recommendationId) ||
            (experiment?.sourceDate === date ? { ...experiment } : null);
        if (!recommendation) throw invalid("Recommendation not found.", 404);
        if (status === "trying" && experiment.status !== "trying") {
            experiment.startedAt = now.toISOString();
            experiment.baseline = baseline;
            experiment.review = null;
            experiment.outcome = "unassessed";
        }
        experiment.status = status;
        experiment.statusUpdatedAt = now.toISOString();
        recommendation.status = status;
        recommendation.statusUpdatedAt = experiment.statusUpdatedAt;
        writeStore(store);
        return { ...recommendation, experiment };
    });
}

export function updateExperiment(id, input) {
    assertId(id);
    if (!input || typeof input !== "object" || Array.isArray(input) ||
        !Object.keys(input).length ||
        Object.keys(input).some(key => !["notes", "outcome"].includes(key))) {
        throw invalid("Experiment updates accept notes and outcome only.");
    }
    if (input.notes !== undefined && (typeof input.notes !== "string" || input.notes.length > 2000)) {
        throw invalid("Experiment notes must contain at most 2,000 characters.");
    }
    if (input.outcome !== undefined && !OUTCOMES.has(input.outcome)) throw invalid("Unsupported experiment outcome.");
    initializeInsights();
    return withWriteLock(() => {
        const store = readStore(), experiment = store.experiments[id];
        if (!Object.hasOwn(store.experiments, id)) throw invalid("Experiment not found.", 404);
        if (input.notes !== undefined) experiment.notes = input.notes.trim();
        if (input.outcome !== undefined) experiment.outcome = input.outcome;
        experiment.notesUpdatedAt = new Date().toISOString();
        writeStore(store);
        return experiment;
    });
}

export function getExperiment(id) {
    assertId(id);
    const catalog = readStore().experiments;
    if (!Object.hasOwn(catalog, id)) throw invalid("Experiment not found.", 404);
    return catalog[id];
}

export function saveExperimentReview(id, review) {
    assertId(id);
    if (!review || typeof review !== "object" || !Number.isFinite(Date.parse(review.at))) {
        throw invalid("Experiment review requires a valid timestamp.");
    }
    initializeInsights();
    return withWriteLock(() => {
        const store = readStore(), experiment = store.experiments[id];
        if (!Object.hasOwn(store.experiments, id)) throw invalid("Experiment not found.", 404);
        experiment.review = {
            text: text(review.text, "Experiment review", 10000),
            at: text(review.at, "Review timestamp", 100),
        };
        writeStore(store);
        return experiment;
    });
}
