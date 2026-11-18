import { createHash } from "node:crypto";
import os from "node:os";
import { MAX_SUBJECT, evaluatePatterns, safeRegex, testPattern } from "./pattern.mjs";
import { run } from "./exec.mjs";

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const STALE_HOURS = 24;
const MAX_WARNINGS = 20;
const API_LOW = 500;

// GitHub owners are alphanumeric with hyphens; repository names also allow "." and "_" but not "." or ".." alone.
const REPO_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/(?!\.{1,2}$)[A-Za-z0-9_.-]{1,100}$/;

export const UNTRACKED = "";

export function isValidRepo(repo) {
    return typeof repo === "string" && REPO_RE.test(repo);
}

// ---------------------------------------------------------------------------
// Pure helpers (unit tested)
// ---------------------------------------------------------------------------

/** A short fingerprint of a question's content; answers must name the revision they were given for. */
export function decisionRev(decision) {
    // `body` is the full text of a label-raised issue, where its options live; it is hashed but never sent to the page.
    const content = JSON.stringify([decision.title || "", decision.detail || "", decision.options || [], decision.url || "", decision.body || ""]);
    // The full digest: the hash binds answers to contributor-controlled content, so it is not truncated.
    return createHash("sha256").update(content).digest("hex");
}

/** Explicit PR numbers win, then head-branch patterns, then title patterns. Returns a session id or null. */
export function matchSession(pr, sessions, test = testPattern) {
    const list = Array.isArray(sessions) ? sessions : [];
    for (const s of list) if (Array.isArray(s.prs) && s.prs.includes(pr.number)) return s.id;
    for (const s of list) if ((s.branchPatterns || []).some((p) => test(p, pr.headRefName))) return s.id;
    for (const s of list) if ((s.titlePatterns || []).some((p) => test(p, pr.title))) return s.id;
    return null;
}

export function referencedNumbers(pr) {
    const text = `${pr.title || ""}\n${pr.body || ""}`;
    const out = new Set();
    for (const m of text.matchAll(/(?:^|[^\w/&])#(\d{1,7})\b/g)) {
        const n = Number(m[1]);
        if (n !== pr.number) out.add(n);
    }
    // Every reference is kept; the global resolution budget in addBodyRefs counts anything it cannot resolve.
    return [...out];
}

/** The first configured track whose label appears in `labels`; configuration order is priority. */
export function pickTrack(labels, tracks) {
    const set = new Set(labels || []);
    for (const t of tracks || []) if (set.has(t.label)) return t.label;
    return null;
}

function trackFromTitles(titles, tracks, test) {
    for (const t of tracks || []) {
        if (t.titlePattern && titles.some((title) => title && test(t.titlePattern, title))) return t.label;
    }
    return null;
}

/**
 * Attribute a merged PR to a track:
 *   1. the PR's own labels,
 *   2. the labels of the issues it closes or references,
 *   3. the labels of those issues' parent (epic) issues,
 * and, only when no label matched, each track's optional titlePattern against the same titles.
 */
export function attributeTrack(pr, tracks, test = testPattern) {
    const refs = Array.isArray(pr.refs) ? pr.refs : [];
    return pickTrack(pr.labels, tracks)
        || pickTrack(refs.flatMap((r) => r.labels || []), tracks)
        || pickTrack(refs.flatMap((r) => r.parent?.labels || []), tracks)
        || trackFromTitles([pr.title, ...refs.map((r) => r.title), ...refs.map((r) => r.parent?.title)], tracks, test)
        || UNTRACKED;
}

/** Expiry written in a lock line: an ISO timestamp, or HH:MM with Z/UTC/±HH:MM (next occurrence after the comment). */
export function lockExpiry(line, createdAt) {
    const iso = line.match(/\b(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2}))/);
    if (iso) {
        const t = Date.parse(iso[1]);
        return Number.isNaN(t) ? null : new Date(t).toISOString();
    }
    const hm = line.match(/\b(\d{1,2}):(\d{2})\s*(Z|UTC|[+-]\d{2}:?\d{2})(?![\w:])/i);
    if (!hm) return null;
    const hours = Number(hm[1]);
    const minutes = Number(hm[2]);
    if (hours > 23 || minutes > 59) return null;
    let offset = 0;
    if (/^[+-]/.test(hm[3])) {
        const z = hm[3].replace(":", "");
        offset = (z[0] === "-" ? -1 : 1) * (Number(z.slice(1, 3)) * 60 + Number(z.slice(3, 5)));
    }
    const base = Date.parse(createdAt);
    if (Number.isNaN(base)) return null;
    // Take the comment's calendar date in the offset the line was written in, not in UTC.
    const local = new Date(base + offset * 60000);
    let candidate = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), hours, minutes) - offset * 60000;
    // A time up to an hour before the comment is an already-expired lock, not tomorrow's.
    while (candidate < base - HOUR) candidate += DAY;
    return new Date(candidate).toISOString();
}

/** Classify the first line of a coordination comment. Longest prefix first, so "merge lock release:" never reads as "merge lock:". */
export function parseLockLine(line, prefixes) {
    const text = String(line || "").replace(/^[*_>\s`]+/, "").trim();
    const lower = text.toLowerCase();
    const kinds = ["release", "reserve", "lock"]
        .filter((k) => typeof prefixes?.[k] === "string" && prefixes[k].trim())
        .sort((a, b) => prefixes[b].length - prefixes[a].length);
    for (const kind of kinds) {
        if (!lower.startsWith(prefixes[kind].trim().toLowerCase())) continue;
        const pr = Number((text.match(/#(\d{1,7})\b/) || [])[1]);
        return pr ? { kind, pr, text } : null;
    }
    return null;
}

/**
 * Lock lines count only from the configured `lockAuthors`, or by default from authors whose repository
 * permission was verified as write, maintain or admin. Unverified authors fail closed.
 */
export function isTrustedLockAuthor(comment, lockAuthors) {
    const allow = (lockAuthors || []).map((a) => String(a).toLowerCase());
    if (allow.length) return allow.includes(String(comment.author || "").toLowerCase());
    return comment.writeAccess === true;
}

/**
 * Replay coordination comments into the current lock holder and reservation queue.
 * `openNumbers` is the set of open PRs, or null when the open list is incomplete (then nothing is dropped as closed).
 */
export function parseLocks(comments, prefixes, openNumbers, now = Date.now(), lockAuthors = []) {
    let holder = null;
    const reservations = new Map();
    const events = [];
    let ignored = 0;
    let unverified = 0;
    const isOpen = (pr) => openNumbers === null || openNumbers.has(pr);
    const sorted = [...(comments || [])].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    for (const comment of sorted) {
        const parsed = parseLockLine(comment.line, prefixes);
        if (!parsed) continue;
        if (!isTrustedLockAuthor(comment, lockAuthors)) {
            // null means the author's permission was never checked: the lane is then uncertain, not just filtered.
            if (comment.writeAccess === null && !(lockAuthors || []).length) unverified += 1;
            else ignored += 1;
            continue;
        }
        const { kind, pr, text } = parsed;
        events.push({ kind, pr, at: comment.createdAt, author: comment.author || "", line: text.slice(0, 200), url: comment.url });
        if (kind === "release") {
            if (holder && holder.pr === pr) holder = null;
            reservations.delete(pr);
        } else if (kind === "lock") {
            holder = { pr, since: comment.createdAt, until: lockExpiry(text, comment.createdAt), line: text.slice(0, 200), url: comment.url };
            reservations.delete(pr);
        } else {
            reservations.set(pr, { pr, at: comment.createdAt, url: comment.url });
        }
    }
    if (holder) {
        holder.expired = holder.until ? Date.parse(holder.until) < now : false;
        if (!isOpen(holder.pr)) holder = null;
    }
    return {
        holder,
        reservations: [...reservations.values()].filter((r) => isOpen(r.pr)),
        events: events.slice(-12),
        ignored,
        unverified,
    };
}

export function ciFromRollup(state) {
    switch (state) {
        case "SUCCESS": return "passed";
        case "FAILURE":
        case "ERROR": return "failed";
        case "PENDING":
        case "EXPECTED": return "running";
        default: return "none";
    }
}

/** The first gate a PR still has to pass, in the order a merge would hit them. */
export function prGate(pr) {
    if (pr.isDraft) return "draft";
    if (pr.mergeable === "CONFLICTING") return "conflict";
    if (pr.ci === "failed") return "ci-failed";
    if (pr.ci === "running") return "ci-running";
    if (pr.reviewDecision === "CHANGES_REQUESTED") return "changes-requested";
    if ((pr.unresolvedThreads || 0) > 0) return "unresolved-threads";
    if (pr.threadsComplete === false) return "threads-unknown";
    if (pr.reviewDecision === "REVIEW_REQUIRED") return "review-required";
    if (!pr.headReviewed) return "no-head-review";
    // GitHub reports UNKNOWN while it computes mergeability; never call that mergeable.
    if (pr.mergeable !== "MERGEABLE") return "mergeability-unknown";
    // MERGEABLE only means conflict-free; mergeStateStatus says whether the repository's own rules allow the merge.
    if (pr.mergeStateStatus === "BEHIND") return "behind";
    if (pr.mergeStateStatus === "BLOCKED") return "blocked";
    if (pr.mergeStateStatus === "UNKNOWN") return "mergeability-unknown";
    return "mergeable";
}

export function checklist(body) {
    // [ \t]* keeps every match attempt on one line, so long bodies cannot trigger heavy backtracking.
    const boxes = String(body || "").match(/^[ \t]*[-*] \[[ xX]\]/gm) || [];
    const ticked = String(body || "").match(/^[ \t]*[-*] \[[xX]\]/gm) || [];
    return { total: boxes.length, done: ticked.length };
}

function pad(n) {
    return String(n).padStart(2, "0");
}

// Buckets follow the host's local time zone, which is the user's machine.
export function hourKey(ms) {
    const d = new Date(ms);
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}`;
}

export function dayKey(ms) {
    const d = new Date(ms);
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Local-time buckets and the exact windows they cover: 24 clock hours ending with the current hour,
 * and 7 calendar days ending today. Totals use the same windows, so every counted merge has a bar.
 */
export function mergeWindows(now) {
    // Subtract the elapsed part of the local hour instead of setMinutes(0): during the repeated hour at the end of
    // daylight saving time, setMinutes picks the earlier offset and would shift the window an hour back.
    const at = new Date(now);
    const hourStart = new Date(now - (at.getMinutes() * 60000 + at.getSeconds() * 1000 + at.getMilliseconds()));
    const hours = [];
    for (let i = 23; i >= 0; i -= 1) hours.push(hourStart.getTime() - i * HOUR);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = 6; i >= 0; i -= 1) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        days.push(d.getTime());
    }
    return { hours, days, hourSince: hours[0], daySince: days[0] };
}

const own = (object, key) => object !== null && typeof object === "object" && Object.hasOwn(object, key);

function trackProgress(track, issues, complete, merged24, merged7) {
    const rows = (issues || []).map((issue) => {
        const box = checklist(issue.body);
        const open = issue.state === "OPEN";
        const tasks = Math.max(box.total, 1);
        // A closed issue counts as fully done; an open one without a checklist counts as one unfinished task.
        const done = open ? (box.total ? box.done : 0) : tasks;
        return { number: issue.number, title: issue.title, url: issue.url, open, tasks, done };
    }).sort((a, b) => a.number - b.number);
    const total = rows.length;
    const closed = rows.filter((r) => !r.open).length;
    const tasks = rows.reduce((a, r) => a + r.tasks, 0);
    const tasksDone = rows.reduce((a, r) => a + r.done, 0);
    return {
        label: track.label,
        name: track.name || track.label,
        note: track.note || "",
        group: track.group || "",
        total,
        closed,
        open: total - closed,
        tasks,
        tasksDone,
        pct: tasks ? Math.round((tasksDone / tasks) * 100) : 0,
        // Totals from a truncated issue list are partial, so a track is never called ready on them.
        complete,
        ready: complete && total > 0 && closed === total,
        openIssues: rows.filter((r) => r.open).map(({ number, title, url }) => ({ number, title, url })),
        merged24: merged24.filter((m) => m.track === track.label).length,
        merged7: merged7.filter((m) => m.track === track.label).length,
    };
}

function capWarnings(list) {
    if (list.length <= MAX_WARNINGS) return list;
    return [...list.slice(0, MAX_WARNINGS - 1), { level: "info", code: "more_warnings", params: { count: list.length - MAX_WARNINGS + 1 } }];
}

/**
 * Turn raw repository data (from GitHub or the demo) and the stored board into the view model.
 * Pure: no I/O, `now` is injected.
 */
export function buildState(raw, board, now = Date.now(), test = testPattern) {
    const sessions = board.sessions || [];
    const tracks = board.tracks || [];
    const incomplete = raw.incomplete || {};
    const openNumbers = incomplete.openPrs ? null : new Set((raw.openPrs || []).map((pr) => pr.number));
    const lock = parseLocks(raw.lockComments || [], board.lockPrefixes, openNumbers, now, board.lockAuthors);

    const prs = (raw.openPrs || []).map((pr) => {
        const tags = [];
        if (lock.holder && lock.holder.pr === pr.number) tags.push(lock.holder.expired ? "lock-expired" : "lock");
        if (lock.reservations.some((r) => r.pr === pr.number)) tags.push("reserved");
        return {
            number: pr.number,
            title: pr.title,
            url: pr.url,
            branch: pr.headRefName,
            updatedAt: pr.updatedAt,
            session: matchSession(pr, sessions, test),
            gate: prGate(pr),
            ci: pr.ci,
            checks: pr.checks || 0,
            unresolvedThreads: pr.unresolvedThreads || 0,
            tags,
        };
    });

    const windows = mergeWindows(now);
    const mergedWeek = (raw.merged || [])
        .filter((pr) => pr.mergedAt && Date.parse(pr.mergedAt) >= windows.daySince && Date.parse(pr.mergedAt) <= now)
        .map((pr) => ({
            number: pr.number,
            title: pr.title,
            url: pr.url,
            mergedAt: pr.mergedAt,
            session: matchSession(pr, sessions, test),
            track: attributeTrack(pr, tracks, test),
        }))
        .sort((a, b) => a.mergedAt.localeCompare(b.mergedAt));
    const merged24 = mergedWeek.filter((pr) => Date.parse(pr.mergedAt) >= windows.hourSince);

    // Hours are indexed by absolute offset from the window start, so the repeated local hour at the end
    // of daylight saving time stays two separate bars; the local label is for display only.
    const hours = windows.hours.map((t) => ({ key: hourKey(t), start: new Date(t).toISOString(), counts: Object.create(null) }));
    for (const pr of merged24) {
        const bucket = hours[Math.floor((Date.parse(pr.mergedAt) - windows.hourSince) / HOUR)];
        if (bucket) bucket.counts[pr.track] = (bucket.counts[pr.track] || 0) + 1;
    }
    // Track labels are user text ("constructor", "__proto__"), so count maps have no prototype.
    const days = windows.days.map((t) => ({ key: dayKey(t), counts: Object.create(null) }));
    const dayIndex = new Map(days.map((d) => [d.key, d]));
    for (const pr of mergedWeek) {
        const bucket = dayIndex.get(dayKey(Date.parse(pr.mergedAt)));
        if (bucket) bucket.counts[pr.track] = (bucket.counts[pr.track] || 0) + 1;
    }

    const idleLimit = Number.isInteger(board.idleMinutes) && board.idleMinutes > 0 ? board.idleMinutes : 90;
    const cards = [...sessions, { id: null, name: "" }].map((s) => {
        const own = prs.filter((pr) => pr.session === s.id);
        const ownMerged = merged24.filter((pr) => pr.session === s.id);
        const times = [...own.map((pr) => pr.updatedAt), ...ownMerged.map((pr) => pr.mergedAt)].filter(Boolean).sort();
        const last = times.length ? times[times.length - 1] : "";
        const idleMinutes = last ? Math.max(0, Math.round((now - Date.parse(last)) / 60000)) : null;
        return {
            id: s.id,
            name: s.name || s.id || "",
            note: s.note || "",
            link: s.link || "",
            prs: own,
            merged24: ownMerged.length,
            lastActivity: last,
            idleMinutes,
            idle: s.id !== null && own.length > 0 && idleMinutes !== null && idleMinutes > idleLimit,
        };
    }).filter((card) => card.id !== null || card.prs.length > 0 || card.merged24 > 0);

    const trackRows = tracks.map((t) => trackProgress(t, (raw.trackIssues && Object.hasOwn(raw.trackIssues, t.label) ? raw.trackIssues[t.label] : []), !(incomplete.tracks || []).includes(t.label), merged24, mergedWeek));
    const epics = (raw.epics || []).map((e) => {
        const closed = e.state === "CLOSED";
        const pct = closed ? 100 : e.total ? Math.round((e.completed / e.total) * 100) : 0;
        return { ...e, pct };
    });
    const epicTotal = epics.reduce((a, e) => a + (e.total || 0), 0);
    const overall = epicTotal
        ? Math.round((100 * epics.reduce((a, e) => a + (e.state === "CLOSED" ? e.total || 0 : e.completed || 0), 0)) / epicTotal)
        : null;

    // With sessions configured, PR warnings focus on the configured sessions' own PRs instead of every contributor's.
    const watched = sessions.length ? prs.filter((pr) => pr.session !== null) : prs;
    const warnings = [];
    if (raw.setup) warnings.push({ level: "error", code: raw.setup, params: {} });
    for (const err of raw.errors || []) warnings.push({ level: "error", code: "collect_error", params: err });
    if (incomplete.openPrs) warnings.push({ level: "warn", code: "open_prs_incomplete", params: { shown: prs.length, total: raw.openPrTotal } });
    if (incomplete.merged) warnings.push({ level: "warn", code: "merges_incomplete", params: { shown: mergedWeek.length } });
    for (const label of incomplete.tracks || []) warnings.push({ level: "warn", code: "track_incomplete", params: { track: (tracks.find((t) => t.label === label) || {}).name || label } });
    if (incomplete.decisions) warnings.push({ level: "warn", code: "decisions_incomplete", params: { shown: (raw.decisionIssues || []).length } });
    if (lock.ignored) warnings.push({ level: "info", code: "lock_ignored", params: { count: lock.ignored } });
    if (lock.unverified) warnings.push({ level: "warn", code: "lock_unverified", params: { count: lock.unverified } });
    const skippedPatterns = [...(raw.skippedPatterns || []), ...(raw.local?.patternSkipped ? [board.localResources?.heavyPattern] : [])];
    for (const pattern of skippedPatterns) warnings.push({ level: "warn", code: "pattern_skipped", params: { pattern } });
    const attribution = incomplete.attribution || {};
    if (attribution.truncatedLabels || attribution.skippedRefs) {
        warnings.push({ level: "warn", code: "attribution_incomplete", params: { labels: attribution.truncatedLabels || 0, refs: attribution.skippedRefs || 0 } });
    }
    if (raw.rate && raw.rate.remaining < API_LOW) {
        warnings.push({ level: raw.rate.remaining < API_LOW / 5 ? "error" : "warn", code: "api_low", params: { remaining: raw.rate.remaining, limit: raw.rate.limit, resetAt: raw.rate.resetAt } });
    }
    if (lock.holder && lock.holder.expired) warnings.push({ level: "warn", code: "lock_expired", params: { pr: lock.holder.pr, until: lock.holder.until } });
    for (const pr of watched) {
        if (pr.gate === "ci-failed") warnings.push({ level: "warn", code: "ci_failed", params: { pr: pr.number, title: pr.title } });
        if (pr.gate === "conflict") warnings.push({ level: pr.tags.length ? "error" : "warn", code: pr.tags.length ? "lock_conflict" : "conflict", params: { pr: pr.number, title: pr.title } });
    }
    for (const pr of watched) {
        const hoursIdle = (now - Date.parse(pr.updatedAt)) / HOUR;
        if (pr.gate !== "draft" && hoursIdle >= STALE_HOURS) warnings.push({ level: "info", code: "stale_pr", params: { pr: pr.number, title: pr.title, hours: Math.round(hoursIdle) } });
    }
    for (const card of cards.filter((c) => c.idle)) warnings.push({ level: "info", code: "session_idle", params: { session: card.name, minutes: card.idleMinutes } });
    const local = raw.local || null;
    if (local) {
        const max = Number.isInteger(board.localResources?.maxHeavy) ? board.localResources.maxHeavy : 2;
        if (local.freePct !== null && local.freePct < 20) warnings.push({ level: local.freePct < 10 ? "error" : "warn", code: "memory_low", params: { freePct: local.freePct } });
        if (local.swapTotalMb && local.swapUsedMb / local.swapTotalMb > 0.8 && (local.freePct === null || local.freePct < 35)) {
            warnings.push({ level: "warn", code: "swap_high", params: { usedMb: local.swapUsedMb, totalMb: local.swapTotalMb } });
        }
        if (local.heavy > max) warnings.push({ level: "warn", code: "heavy_jobs", params: { count: local.heavy, max } });
    }

    const answers = board.answers || {};
    // An answer belongs to the question revision it was given for; a revised question starts unanswered.
    const answerFor = (d) => (own(answers, d.id) && answers[d.id].rev === d.rev ? answers[d.id] : null);
    const queued = new Set((board.decisions || []).map((d) => d.id));
    const decisions = [
        ...(board.decisions || []).map((d) => ({ ...d, source: "board" })),
        ...(raw.decisionIssues || [])
            .filter((issue) => !queued.has(`gh-${issue.number}`))
            .map((issue) => ({ id: `gh-${issue.number}`, title: `#${issue.number} ${issue.title}`, url: issue.url, detail: "", options: [], body: issue.body || "", source: "label" })),
    ].map(({ body, ...d }) => ({ ...d, rev: decisionRev({ ...d, body }) }))
        .map((d) => ({ ...d, answer: answerFor(d) }))
        .filter((d) => !(d.answer && d.answer.seen));

    return {
        repo: raw.repo,
        demo: !!raw.demo,
        setup: raw.setup || null,
        language: board.language === "ko" ? "ko" : "en",
        generatedAt: new Date(now).toISOString(),
        openPrTotal: raw.openPrTotal ?? prs.length,
        incomplete,
        prs,
        sessions: cards,
        tracks: trackRows,
        trackOrder: [...tracks.map((t) => ({ label: t.label, name: t.name || t.label })), { label: UNTRACKED, name: "" }],
        epics,
        overall,
        merged24,
        mergedWeek,
        hours,
        days,
        lock: { enabled: Number(board.coordinationIssue) > 0, issue: Number(board.coordinationIssue) || 0, ...lock },
        decisionLabel: board.decisionLabel || "",
        decisions,
        rate: raw.rate || null,
        local,
        warnings: capWarnings(warnings),
    };
}

const WARNING_TEXT = {
    collect_error: (p) => `Could not load ${p.source}: ${p.message}`,
    api_low: (p) => `GitHub API budget low: ${p.remaining}/${p.limit} left until ${p.resetAt}`,
    lock_expired: (p) => `Merge lock on #${p.pr} passed its expiry without a release`,
    lock_conflict: (p) => `Locked or reserved PR #${p.pr} has merge conflicts`,
    conflict: (p) => `#${p.pr} has merge conflicts`,
    ci_failed: (p) => `#${p.pr} CI failed`,
    stale_pr: (p) => `#${p.pr} has had no activity for ${p.hours}h`,
    session_idle: (p) => `${p.session}: no PR activity for ${p.minutes < 120 ? `${p.minutes} min` : `${Math.round(p.minutes / 60)}h`}`,
    memory_low: (p) => `Free memory ${p.freePct}%`,
    swap_high: (p) => `Swap ${(p.usedMb / 1024).toFixed(1)} of ${(p.totalMb / 1024).toFixed(1)} GB in use`,
    heavy_jobs: (p) => `${p.count} heavy local jobs running (limit ${p.max})`,
    more_warnings: (p) => `${p.count} more warnings`,
    open_prs_incomplete: (p) => `Showing ${p.shown} of ${p.total} open PRs; the rest were not loaded`,
    merges_incomplete: (p) => `Merge history is partial (${p.shown} loaded); totals are lower bounds`,
    track_incomplete: (p) => `${p.track}: too many issues to load; progress is partial`,
    decisions_incomplete: (p) => `More labeled decision issues exist than the ${p.shown} loaded`,
    lock_ignored: (p) => `Ignored ${p.count} lock comments from authors without verified write access`,
    lock_unverified: (p) => `Could not verify the authors of ${p.count} lock comments; the lock lane may be incomplete`,
    gh_missing: () => "The GitHub CLI (gh) is not installed. Install it from https://cli.github.com, run gh auth login, then refresh",
    gh_signed_out: () => "The GitHub CLI is not signed in to github.com. Run gh auth login, then refresh",
    pattern_skipped: (p) => `Pattern ${p.pattern} took too long and was skipped; simplify it`,
    attribution_incomplete: (p) => `Track attribution is partial: ${p.labels} items had more labels than loaded, ${p.refs} referenced issues were not resolved`,
};

export function warningText(w) {
    const fn = WARNING_TEXT[w.code];
    return fn ? fn(w.params || {}) : w.code;
}

export function summarize(state) {
    const byGate = {};
    for (const pr of state.prs) byGate[pr.gate] = (byGate[pr.gate] || 0) + 1;
    const trackName = (label) => (label === UNTRACKED ? "Untracked" : (state.trackOrder.find((t) => t.label === label) || { name: label }).name);
    const countBy = (list) => {
        const out = Object.create(null);
        for (const pr of list) out[trackName(pr.track)] = (out[trackName(pr.track)] || 0) + 1;
        return out;
    };
    return {
        repo: state.repo,
        demo: state.demo,
        generatedAt: state.generatedAt,
        openPrs: state.openPrTotal,
        prsByGate: byGate,
        merged24h: state.merged24.length,
        merged7d: state.mergedWeek.length,
        mergedByTrack24h: countBy(state.merged24),
        mergedByTrack7d: countBy(state.mergedWeek),
        tracks: state.tracks.map((t) => ({ label: t.label, pct: t.pct, issuesClosed: t.closed, issues: t.total, ready: t.ready, merged24h: t.merged24, merged7d: t.merged7, open: t.openIssues.map((i) => i.number) })),
        epics: state.epics.map((e) => ({ number: e.number, pct: e.pct, completed: e.completed, total: e.total, state: e.state })),
        overall: state.overall,
        sessions: state.sessions.map((s) => ({ id: s.id ?? "unassigned", open: s.prs.map((p) => `#${p.number}:${p.gate}`), merged24h: s.merged24, idleMinutes: s.idleMinutes, idle: s.idle })),
        lock: state.lock.enabled
            ? { holder: state.lock.holder ? { pr: state.lock.holder.pr, until: state.lock.holder.until, expired: state.lock.holder.expired } : null, reservations: state.lock.reservations.map((r) => r.pr) }
            : null,
        pendingDecisions: state.decisions.filter((d) => !d.answer).length,
        newAnswers: state.decisions.filter((d) => d.answer && !d.answer.seen).map((d) => ({ id: d.id, answer: d.answer.answer, at: d.answer.at })),
        rate: state.rate,
        local: state.local,
        setup: state.setup,
        incomplete: state.incomplete,
        warnings: state.warnings.map((w) => `${w.level}: ${warningText(w)}`),
    };
}

// ---------------------------------------------------------------------------
// GitHub collection through the gh CLI (the user's own authentication)
// ---------------------------------------------------------------------------


// Page caps keep one refresh bounded; anything beyond them is reported as incomplete instead of silently dropped.
const OPEN_PR_PAGES = 20;
const THREAD_PAGES = 10;
const MERGED_PAGES = 10;
const SEARCH_PAGES = 5;

/** Run a GraphQL query. Partial errors next to usable data go to `onError` instead of being dropped. */
async function graphql(query, vars, onError) {
    const args = ["api", "graphql", "-f", `query=${query}`];
    for (const [k, v] of Object.entries(vars)) {
        if (v === null || v === undefined) continue;
        args.push(typeof v === "number" ? "-F" : "-f", `${k}=${v}`);
    }
    // gh exits non-zero when a response carries errors, even alongside usable partial data (e.g. one missing epic).
    const out = JSON.parse(await run("gh", args, 45000, { keepOutputOnError: true }));
    if (!out.data) throw new Error(out.errors?.[0]?.message || out.message || "GitHub returned no data");
    for (const e of out.errors || []) onError(e.message || "GraphQL error", e.type);
    return out.data;
}

function requireRepository(data) {
    if (!data.repository) throw new Error("repository not found or not accessible with the current gh login");
    return data.repository;
}

const LABELS = "labels(first: 20) { totalCount nodes { name } }";
const PAGE = "pageInfo { hasNextPage endCursor }";

const OPEN_PRS_QUERY = `query($owner: String!, $name: String!, $after: String) {
  rateLimit { limit remaining resetAt }
  repository(owner: $owner, name: $name) {
    pullRequests(states: OPEN, first: 25, after: $after, orderBy: { field: UPDATED_AT, direction: DESC }) {
      totalCount
      ${PAGE}
      nodes {
        number title url isDraft headRefName headRefOid updatedAt mergeable mergeStateStatus reviewDecision
        reviewThreads(first: 100) { ${PAGE} nodes { isResolved } }
        reviews(last: 30) { nodes { state commit { oid } } }
        commits(last: 1) { nodes { commit { statusCheckRollup { state contexts(first: 1) { totalCount } } } } }
      }
    }
  }
}`;

const THREADS_QUERY = `query($owner: String!, $name: String!, $number: Int!, $after: String) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) { reviewThreads(first: 100, after: $after) { ${PAGE} nodes { isResolved } } }
  }
}`;

const MERGED_QUERY = `query($q: String!, $after: String) {
  search(query: $q, type: ISSUE, first: 100, after: $after) {
    ${PAGE}
    nodes {
      ... on PullRequest {
        number title url mergedAt headRefName body ${LABELS}
        closingIssuesReferences(first: 5) { totalCount nodes { number title ${LABELS} parent { title ${LABELS} } } }
      }
    }
  }
}`;

const ISSUE_FIELDS = "... on Issue { number title url state body }";
const DECISION_FIELDS = "... on Issue { number title url body } ... on PullRequest { number title url body }";
const searchPageQuery = (fields) => `query($q: String!, $after: String) {
  search(query: $q, type: ISSUE, first: 100, after: $after) { ${PAGE} nodes { ${fields} } }
}`;

function mapOpenPr(node, threads) {
    const rollup = node.commits?.nodes?.[0]?.commit?.statusCheckRollup;
    const reviews = node.reviews?.nodes || [];
    return {
        number: node.number,
        title: node.title,
        url: node.url,
        isDraft: node.isDraft,
        headRefName: node.headRefName,
        updatedAt: node.updatedAt,
        mergeable: node.mergeable,
        mergeStateStatus: node.mergeStateStatus,
        reviewDecision: node.reviewDecision,
        ci: ciFromRollup(rollup?.state),
        checks: rollup?.contexts?.totalCount || 0,
        unresolvedThreads: threads.unresolved,
        threadsComplete: threads.complete,
        headReviewed: reviews.some((r) => r.state !== "PENDING" && r.commit?.oid === node.headRefOid),
    };
}

// More labels than loaded means a configured track label may be missing from attribution.
function labelsTruncated(labels) {
    return (labels?.totalCount || 0) > (labels?.nodes || []).length;
}

function names(labels) {
    return (labels?.nodes || []).map((l) => l.name);
}

async function fetchOpenPrs(repo, onError) {
    const [owner, name] = repo.split("/");
    const nodes = [];
    let rate = null;
    let total = 0;
    let after = null;
    let more = false;
    for (let page = 0; page < OPEN_PR_PAGES; page += 1) {
        const data = await graphql(OPEN_PRS_QUERY, { owner, name, after }, onError);
        rate ||= data.rateLimit;
        const conn = requireRepository(data).pullRequests;
        total = conn?.totalCount ?? 0;
        nodes.push(...(conn?.nodes || []).filter((n) => n?.number));
        more = !!conn?.pageInfo?.hasNextPage;
        if (!more) break;
        after = conn.pageInfo.endCursor;
    }
    const prs = [];
    for (const node of nodes) {
        let unresolved = (node.reviewThreads?.nodes || []).filter((t) => !t.isResolved).length;
        let info = node.reviewThreads?.pageInfo;
        for (let page = 0; info?.hasNextPage && page < THREAD_PAGES; page += 1) {
            const data = await graphql(THREADS_QUERY, { owner, name, number: node.number, after: info.endCursor }, onError);
            const conn = requireRepository(data).pullRequest?.reviewThreads;
            unresolved += (conn?.nodes || []).filter((t) => !t.isResolved).length;
            info = conn?.pageInfo;
        }
        prs.push(mapOpenPr(node, { unresolved, complete: !info?.hasNextPage }));
    }
    return { prs, total, incomplete: more, rate };
}

async function searchAll(q, fields, first, onError) {
    const query = searchPageQuery(fields);
    const nodes = [...(first?.nodes || [])];
    let info = first?.pageInfo;
    for (let page = 0; info?.hasNextPage && page < SEARCH_PAGES; page += 1) {
        const data = await graphql(query, { q, after: info.endCursor }, onError);
        nodes.push(...(data.search?.nodes || []));
        info = data.search?.pageInfo;
    }
    return { nodes: nodes.filter((n) => n?.number), complete: !info?.hasNextPage };
}

async function fetchMerged(repo, now, onError) {
    // Search exactly the window the charts cover (local midnight six days ago), so no page is spent on older merges.
    const since = new Date(mergeWindows(now).daySince).toISOString().replace(/\.\d{3}Z$/, "Z");
    const q = `repo:${repo} is:pr is:merged merged:>=${since}`;
    const out = [];
    let after = null;
    let more = false;
    for (let page = 0; page < MERGED_PAGES; page += 1) {
        const data = await graphql(MERGED_QUERY, { q, after }, onError);
        for (const node of data.search?.nodes || []) {
            if (!node?.number) continue;
            out.push({
                number: node.number,
                title: node.title,
                url: node.url,
                mergedAt: node.mergedAt,
                headRefName: node.headRefName,
                body: node.body || "",
                labels: names(node.labels),
                // Closing references beyond the first five are counted, not loaded, and reported as partial attribution.
                closingRefsMissed: Math.max(0, (node.closingIssuesReferences?.totalCount || 0) - (node.closingIssuesReferences?.nodes || []).length),
                labelsTruncated: labelsTruncated(node.labels)
                    || (node.closingIssuesReferences?.nodes || []).some((r) => r && (labelsTruncated(r.labels) || labelsTruncated(r.parent?.labels))),
                refs: (node.closingIssuesReferences?.nodes || []).filter((r) => r?.number).map((r) => ({
                    number: r.number,
                    title: r.title,
                    labels: names(r.labels),
                    parent: r.parent ? { title: r.parent.title, labels: names(r.parent.labels) } : null,
                })),
            });
        }
        more = !!data.search?.pageInfo?.hasNextPage;
        if (!more) break;
        after = data.search.pageInfo.endCursor;
    }
    return { items: out, incomplete: more };
}

// Body references that are not closing references ("part of #12") still say which issue a PR served.
const REF_BATCH = 80;
const REF_BATCHES = 4;

/** Resolve body references in bounded batches. Returns how many referenced numbers were left unresolved. */
async function addBodyRefs(repo, merged, onError) {
    const wanted = new Map();
    for (const pr of merged) {
        const known = new Set(pr.refs.map((r) => r.number));
        for (const n of referencedNumbers(pr)) if (!known.has(n)) wanted.set(n, true);
    }
    const all = [...wanted.keys()];
    const numbers = all.slice(0, REF_BATCH * REF_BATCHES);
    if (!numbers.length) return { skipped: 0, truncated: 0 };
    const [owner, name] = repo.split("/");
    // "#123" in a body is only a guess at a reference, so numbers that do not exist are skipped quietly.
    const quietMissing = (message, type) => { if (type !== "NOT_FOUND") onError(message, type); };
    const found = new Map();
    let truncated = 0;
    for (let i = 0; i < numbers.length; i += REF_BATCH) {
        const batch = numbers.slice(i, i + REF_BATCH);
        const fields = batch.map((n) => `n${n}: issueOrPullRequest(number: ${n}) { ... on Issue { number title ${LABELS} parent { title ${LABELS} } } }`).join("\n");
        const data = await graphql(`query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { ${fields} } }`, { owner, name }, quietMissing);
        const repoData = requireRepository(data);
        for (const n of batch) {
            const node = repoData[`n${n}`];
            if (!node?.number) continue;
            if (labelsTruncated(node.labels) || labelsTruncated(node.parent?.labels)) truncated += 1;
            found.set(n, { number: n, title: node.title, labels: names(node.labels), parent: node.parent ? { title: node.parent.title, labels: names(node.parent.labels) } : null });
        }
    }
    for (const pr of merged) {
        const known = new Set(pr.refs.map((r) => r.number));
        for (const n of referencedNumbers(pr)) if (!known.has(n) && found.has(n)) pr.refs.push(found.get(n));
    }
    return { skipped: all.length - numbers.length, truncated };
}

async function fetchBoardData(repo, board, onError) {
    const tracks = board.tracks || [];
    const epics = board.epics || [];
    const empty = { trackIssues: {}, epics: [], decisionIssues: [], incompleteTracks: [], decisionsIncomplete: false };
    if (!tracks.length && !epics.length && !board.decisionLabel) return empty;
    const [owner, name] = repo.split("/");
    const vars = { owner, name };
    const fields = [];
    tracks.forEach((t, i) => {
        vars[`t${i}`] = `repo:${repo} is:issue label:"${t.label}"`;
        fields.push(`t${i}: search(query: $t${i}, type: ISSUE, first: 100) { ${PAGE} nodes { ${ISSUE_FIELDS} } }`);
    });
    if (board.decisionLabel) {
        vars.dq = `repo:${repo} is:open label:"${board.decisionLabel}"`;
        fields.push(`dq: search(query: $dq, type: ISSUE, first: 100) { ${PAGE} nodes { ${DECISION_FIELDS} } }`);
    }
    const repoFields = epics.map((e) => `e${e.number}: issue(number: ${Number(e.number)}) { number title url state subIssuesSummary { total completed } }`).join("\n");
    const declared = Object.keys(vars).map((k) => `$${k}: String!`).join(", ");
    const query = `query(${declared}) { ${fields.join("\n")} repository(owner: $owner, name: $name) { id ${repoFields} } }`;
    const data = await graphql(query, vars, onError);
    const repoData = requireRepository(data);
    const trackIssues = Object.create(null);
    const incompleteTracks = [];
    for (const [i, t] of tracks.entries()) {
        const result = await searchAll(vars[`t${i}`], ISSUE_FIELDS, data[`t${i}`], onError);
        trackIssues[t.label] = result.nodes;
        if (!result.complete) incompleteTracks.push(t.label);
    }
    const decisions = board.decisionLabel ? await searchAll(vars.dq, DECISION_FIELDS, data.dq, onError) : { nodes: [], complete: true };
    return {
        trackIssues,
        incompleteTracks,
        decisionIssues: decisions.nodes,
        decisionsIncomplete: !decisions.complete,
        epics: epics.map((e) => {
            const issue = repoData[`e${e.number}`];
            if (!issue) return { number: e.number, name: e.name || `#${e.number}`, group: e.group || "", missing: true, total: 0, completed: 0, state: "" };
            return {
                number: issue.number,
                name: e.name || issue.title,
                group: e.group || "",
                url: issue.url,
                state: issue.state,
                total: issue.subIssuesSummary?.total || 0,
                completed: issue.subIssuesSummary?.completed || 0,
            };
        }),
    };
}

const WRITE_ROLES = new Set(["admin", "write"]);

const MAX_AUTHOR_CHECKS = 50;

async function fetchLockComments(repo, issue, now, board, onError) {
    const since = new Date(now - 48 * HOUR).toISOString();
    const out = await run("gh", ["api", "--paginate", `repos/${repo}/issues/${Number(issue)}/comments?per_page=100&since=${since}`,
        "--jq", ".[] | {createdAt: .created_at, url: .html_url, author: (.user.login // \"\"), line: (.body | split(\"\\n\")[0] | .[0:300])}"]);
    // Only lock, reserve and release lines matter; other discussion on the issue is dropped before any lookups.
    const comments = out.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l))
        .filter((c) => parseLockLine(c.line, board.lockPrefixes));
    if ((board.lockAuthors || []).length) return comments;
    // Without an allowlist, look up each lock author's actual repository permission (needs push access to the repo).
    // Authors of the newest lock lines are checked first; anyone left unchecked stays null (unverified).
    const authors = [...new Set([...comments].reverse().map((c) => c.author).filter(Boolean))];
    const access = new Map();
    for (const author of authors.slice(0, MAX_AUTHOR_CHECKS)) {
        try {
            // `.permission` is the base access level (admin, write, read, none); `.role_name` can be a custom role name.
            const role = (await run("gh", ["api", `repos/${repo}/collaborators/${encodeURIComponent(author)}/permission`, "--jq", ".permission"], 15000)).trim();
            access.set(author, WRITE_ROLES.has(role));
        } catch (error) {
            access.set(author, null);
            onError(`could not verify ${author}'s permission (${error.message}); set lockAuthors to trust specific accounts`);
        }
    }
    return comments.map((c) => ({ ...c, writeAccess: access.has(c.author) ? access.get(c.author) : null }));
}

async function fetchLocal(settings) {
    const out = { freePct: null, swapUsedMb: null, swapTotalMb: null, heavy: 0 };
    if (process.platform === "darwin") {
        try {
            const m = (await run("memory_pressure", [], 8000)).match(/free percentage: (\d+)%/);
            if (m) out.freePct = Number(m[1]);
        } catch {
            // memory_pressure is optional.
        }
        try {
            const swap = await run("sysctl", ["-n", "vm.swapusage"], 5000);
            const used = swap.match(/used = ([\d.]+)M/);
            const total = swap.match(/total = ([\d.]+)M/);
            if (used) out.swapUsedMb = Math.round(Number(used[1]));
            if (total) out.swapTotalMb = Math.round(Number(total[1]));
        } catch {
            // vm.swapusage is optional.
        }
    }
    if (out.freePct === null) out.freePct = Math.round((os.freemem() / os.totalmem()) * 100);
    if (settings.heavyPattern && safeRegex(settings.heavyPattern) && process.platform !== "win32") {
        try {
            // Command lines go through the same length cap and deadline-bound worker as titles and branches.
            const lines = (await run("ps", ["-axo", "command="], 5000)).split("\n").map((l) => l.trim()).filter(Boolean).map((l) => l.slice(0, MAX_SUBJECT));
            const matcher = await evaluatePatterns([settings.heavyPattern], lines);
            out.heavy = lines.filter((line) => matcher.test(settings.heavyPattern, line)).length;
            if (matcher.skipped.length) out.patternSkipped = true;
        } catch {
            // ps failure leaves heavy at 0.
        }
    }
    return out;
}

/**
 * Evaluate every configured session and track pattern against the PRs in `raw` in a worker under a deadline,
 * so buildState never runs a configured regex on the main thread. Patterns that time out are reported.
 */
export async function prepareMatcher(raw, board) {
    const sessions = board.sessions || [];
    const patterns = [
        ...sessions.flatMap((s) => [...(s.branchPatterns || []), ...(s.titlePatterns || [])]),
        ...(board.tracks || []).map((t) => t.titlePattern).filter(Boolean),
    ];
    const prs = [...(raw.openPrs || []), ...(raw.merged || [])];
    const subjects = prs.flatMap((pr) => [pr.headRefName, pr.title, ...(pr.refs || []).flatMap((r) => [r.title, r.parent?.title])]).filter(Boolean);
    return evaluatePatterns(patterns, subjects);
}

/** Fetch everything the board shows. Each source fails independently and is reported as a warning. */
// Remembered once gh is found and signed in, so a working setup costs no extra calls per refresh.
let ghReady = false;

/** Why gh cannot be used ("gh_missing" or "gh_signed_out"), or null when it is ready. */
export async function checkGh() {
    if (ghReady) return null;
    try {
        await run("gh", ["--version"], 10000);
    } catch {
        return "gh_missing";
    }
    try {
        await run("gh", ["auth", "status", "--active", "--hostname", "github.com"], 15000);
    } catch {
        return "gh_signed_out";
    }
    ghReady = true;
    return null;
}

export async function collectRaw(repo, board, now = Date.now()) {
    // Without a usable gh, show one setup message instead of the same failure from every data source.
    const setup = await checkGh();
    if (setup) {
        return { repo, setup, openPrs: [], openPrTotal: 0, merged: [], lockComments: [], rate: null, local: null, errors: [], trackIssues: {}, epics: [], decisionIssues: [], incomplete: {} };
    }
    const errors = [];
    const seen = new Set();
    const report = (source) => (message) => {
        const key = `${source}\n${message}`;
        if (seen.has(key) || errors.length >= 10) return;
        seen.add(key);
        errors.push({ source, message: String(message).slice(0, 240) });
    };
    const safe = async (source, fn, fallback) => {
        try {
            return await fn(report(source));
        } catch (error) {
            // The GraphQL error that caused the failure is usually reported already; add the failure only if not.
            if (!errors.some((e) => e.source === source)) report(source)(error.message);
            return fallback;
        }
    };
    const emptyBoard = { trackIssues: {}, epics: [], decisionIssues: [], incompleteTracks: [], decisionsIncomplete: false };
    const [open, merged, boardData, lockComments, local] = await Promise.all([
        safe("open pull requests", (onError) => fetchOpenPrs(repo, onError), null),
        safe("merged pull requests", (onError) => fetchMerged(repo, now, onError), { items: [], incomplete: false }),
        safe("tracks, epics and decisions", (onError) => fetchBoardData(repo, board, onError), emptyBoard),
        board.coordinationIssue > 0 ? safe("merge lock comments", (onError) => fetchLockComments(repo, board.coordinationIssue, now, board, onError), []) : Promise.resolve([]),
        board.localResources?.enabled ? fetchLocal(board.localResources) : Promise.resolve(null),
    ]);
    const refs = (board.tracks || []).length && merged.items.length
        ? await safe("referenced issues", (onError) => addBodyRefs(repo, merged.items, onError), { skipped: 0, truncated: 0 })
        : { skipped: 0, truncated: 0 };
    return {
        repo,
        openPrs: open?.prs || [],
        openPrTotal: open?.total ?? 0,
        merged: merged.items,
        lockComments,
        rate: open?.rate ? { remaining: open.rate.remaining, limit: open.rate.limit, resetAt: open.rate.resetAt } : null,
        local,
        errors,
        trackIssues: boardData.trackIssues,
        epics: boardData.epics,
        decisionIssues: boardData.decisionIssues,
        incomplete: {
            // A failed open-PR fetch is also incomplete: nothing may be treated as closed on its account.
            openPrs: !open || open.incomplete,
            merged: merged.incomplete,
            tracks: boardData.incompleteTracks,
            decisions: boardData.decisionsIncomplete,
            attribution: (board.tracks || []).length
                ? { truncatedLabels: merged.items.filter((m) => m.labelsTruncated).length + (refs?.truncated || 0), skippedRefs: (refs?.skipped || 0) + merged.items.reduce((a, m) => a + (m.closingRefsMissed || 0), 0) }
                : {},
        },
    };
}
