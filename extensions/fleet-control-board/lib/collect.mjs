import { execFile } from "node:child_process";
import os from "node:os";

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

const regexCache = new Map();
function regex(source) {
    if (!regexCache.has(source)) {
        let compiled = null;
        try {
            compiled = new RegExp(source, "i");
        } catch {
            compiled = null;
        }
        regexCache.set(source, compiled);
    }
    return regexCache.get(source);
}

/** Explicit PR numbers win, then head-branch patterns, then title patterns. Returns a session id or null. */
export function matchSession(pr, sessions) {
    const list = Array.isArray(sessions) ? sessions : [];
    for (const s of list) if (Array.isArray(s.prs) && s.prs.includes(pr.number)) return s.id;
    for (const s of list) if ((s.branchPatterns || []).some((p) => regex(p)?.test(pr.headRefName || ""))) return s.id;
    for (const s of list) if ((s.titlePatterns || []).some((p) => regex(p)?.test(pr.title || ""))) return s.id;
    return null;
}

export function referencedNumbers(pr) {
    const text = `${pr.title || ""}\n${pr.body || ""}`;
    const out = new Set();
    for (const m of text.matchAll(/(?:^|[^\w/&])#(\d{1,7})\b/g)) {
        const n = Number(m[1]);
        if (n !== pr.number) out.add(n);
    }
    return [...out].slice(0, 15);
}

/** The first configured track whose label appears in `labels`; configuration order is priority. */
export function pickTrack(labels, tracks) {
    const set = new Set(labels || []);
    for (const t of tracks || []) if (set.has(t.label)) return t.label;
    return null;
}

function trackFromTitles(titles, tracks) {
    for (const t of tracks || []) {
        if (!t.titlePattern) continue;
        const re = regex(t.titlePattern);
        if (re && titles.some((title) => title && re.test(title))) return t.label;
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
export function attributeTrack(pr, tracks) {
    const refs = Array.isArray(pr.refs) ? pr.refs : [];
    return pickTrack(pr.labels, tracks)
        || pickTrack(refs.flatMap((r) => r.labels || []), tracks)
        || pickTrack(refs.flatMap((r) => r.parent?.labels || []), tracks)
        || trackFromTitles([pr.title, ...refs.map((r) => r.title), ...refs.map((r) => r.parent?.title)], tracks)
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
    const base = new Date(createdAt);
    if (Number.isNaN(base.getTime())) return null;
    const candidate = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), hours, minutes) - offset * 60000);
    while (candidate.getTime() < base.getTime() - HOUR) candidate.setTime(candidate.getTime() + DAY);
    return candidate.toISOString();
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

export function parseLocks(comments, prefixes, openNumbers, now = Date.now()) {
    let holder = null;
    const reservations = new Map();
    const events = [];
    const sorted = [...(comments || [])].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    for (const comment of sorted) {
        const parsed = parseLockLine(comment.line, prefixes);
        if (!parsed) continue;
        const { kind, pr, text } = parsed;
        events.push({ kind, pr, at: comment.createdAt, line: text.slice(0, 200), url: comment.url });
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
        if (!openNumbers.has(holder.pr)) holder = null;
    }
    return {
        holder,
        reservations: [...reservations.values()].filter((r) => openNumbers.has(r.pr)),
        events: events.slice(-12),
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
    if (pr.reviewDecision === "REVIEW_REQUIRED") return "review-required";
    if (!pr.headReviewed) return "no-head-review";
    return "mergeable";
}

export function checklist(body) {
    const boxes = String(body || "").match(/^\s*[-*] \[[ xX]\]/gm) || [];
    const ticked = String(body || "").match(/^\s*[-*] \[[xX]\]/gm) || [];
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

function trackProgress(track, issues, merged24, merged7) {
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
        ready: total > 0 && closed === total,
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
export function buildState(raw, board, now = Date.now()) {
    const sessions = board.sessions || [];
    const tracks = board.tracks || [];
    const openNumbers = new Set((raw.openPrs || []).map((pr) => pr.number));
    const lock = parseLocks(raw.lockComments || [], board.lockPrefixes, openNumbers, now);

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
            session: matchSession(pr, sessions),
            gate: prGate(pr),
            ci: pr.ci,
            checks: pr.checks || 0,
            unresolvedThreads: pr.unresolvedThreads || 0,
            tags,
        };
    });

    const weekSince = now - 7 * DAY;
    const daySince = now - DAY;
    const mergedWeek = (raw.merged || [])
        .filter((pr) => pr.mergedAt && Date.parse(pr.mergedAt) >= weekSince && Date.parse(pr.mergedAt) <= now)
        .map((pr) => ({
            number: pr.number,
            title: pr.title,
            url: pr.url,
            mergedAt: pr.mergedAt,
            session: matchSession(pr, sessions),
            track: attributeTrack(pr, tracks),
        }))
        .sort((a, b) => a.mergedAt.localeCompare(b.mergedAt));
    const merged24 = mergedWeek.filter((pr) => Date.parse(pr.mergedAt) >= daySince);

    const hours = [];
    for (let i = 23; i >= 0; i -= 1) hours.push({ key: hourKey(now - i * HOUR), counts: {} });
    const hourIndex = new Map(hours.map((h) => [h.key, h]));
    for (const pr of merged24) {
        const bucket = hourIndex.get(hourKey(Date.parse(pr.mergedAt)));
        if (bucket) bucket.counts[pr.track] = (bucket.counts[pr.track] || 0) + 1;
    }
    const days = [];
    for (let i = 6; i >= 0; i -= 1) days.push({ key: dayKey(now - i * DAY), counts: {} });
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

    const trackRows = tracks.map((t) => trackProgress(t, raw.trackIssues?.[t.label], merged24, mergedWeek));
    const epics = (raw.epics || []).map((e) => {
        const closed = e.state === "CLOSED";
        const pct = closed ? 100 : e.total ? Math.round((e.completed / e.total) * 100) : 0;
        return { ...e, pct };
    });
    const epicTotal = epics.reduce((a, e) => a + (e.total || 0), 0);
    const overall = epicTotal
        ? Math.round((100 * epics.reduce((a, e) => a + (e.state === "CLOSED" ? e.total || 0 : e.completed || 0), 0)) / epicTotal)
        : null;

    // With sessions configured, PR warnings focus on the fleet's own PRs instead of every contributor's.
    const watched = sessions.length ? prs.filter((pr) => pr.session !== null) : prs;
    const warnings = [];
    for (const err of raw.errors || []) warnings.push({ level: "error", code: "collect_error", params: err });
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
    const queued = new Set((board.decisions || []).map((d) => d.id));
    const decisions = [
        ...(board.decisions || []).map((d) => ({ ...d, source: "board" })),
        ...(raw.decisionIssues || [])
            .filter((issue) => !queued.has(`gh-${issue.number}`))
            .map((issue) => ({ id: `gh-${issue.number}`, title: `#${issue.number} ${issue.title}`, url: issue.url, detail: "", options: [], source: "label" })),
    ].map((d) => ({ ...d, answer: answers[d.id] || null }))
        .filter((d) => !(d.answer && d.answer.seen));

    return {
        repo: raw.repo,
        demo: !!raw.demo,
        generatedAt: new Date(now).toISOString(),
        openPrTotal: raw.openPrTotal ?? prs.length,
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
        const out = {};
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
        warnings: state.warnings.map((w) => `${w.level}: ${warningText(w)}`),
    };
}

// ---------------------------------------------------------------------------
// GitHub collection through the gh CLI (the user's own authentication)
// ---------------------------------------------------------------------------

function run(cmd, args, timeoutMs = 45000, { keepOutputOnError = false } = {}) {
    return new Promise((resolve, reject) => {
        execFile(cmd, args, { timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024, windowsHide: true }, (error, stdout, stderr) => {
            if (error && keepOutputOnError && stdout && stdout.trim().startsWith("{")) {
                resolve(stdout);
                return;
            }
            if (error) {
                const reason = error.code === "ENOENT" ? `${cmd} is not installed or not on PATH` : (stderr || error.message).trim().split("\n")[0].slice(0, 240);
                reject(new Error(reason));
                return;
            }
            resolve(stdout);
        });
    });
}

async function graphql(query, vars) {
    const args = ["api", "graphql", "-f", `query=${query}`];
    for (const [k, v] of Object.entries(vars)) args.push(typeof v === "number" ? "-F" : "-f", `${k}=${v}`);
    // gh exits non-zero when a response carries errors, even alongside usable partial data (e.g. one missing epic).
    const out = JSON.parse(await run("gh", args, 45000, { keepOutputOnError: true }));
    if (!out.data) throw new Error(out.errors?.[0]?.message || out.message || "GitHub returned no data");
    return out.data;
}

const LABELS = "labels(first: 20) { nodes { name } }";

const OPEN_PRS_QUERY = `query($owner: String!, $name: String!) {
  rateLimit { limit remaining resetAt }
  repository(owner: $owner, name: $name) {
    pullRequests(states: OPEN, first: 60, orderBy: { field: UPDATED_AT, direction: DESC }) {
      totalCount
      nodes {
        number title url isDraft headRefName headRefOid updatedAt mergeable reviewDecision
        reviewThreads(first: 100) { nodes { isResolved } }
        reviews(last: 30) { nodes { state commit { oid } } }
        commits(last: 1) { nodes { commit { statusCheckRollup { state contexts(first: 1) { totalCount } } } } }
      }
    }
  }
}`;

const MERGED_QUERY = `query($q: String!, $after: String) {
  search(query: $q, type: ISSUE, first: 100, after: $after) {
    pageInfo { hasNextPage endCursor }
    nodes {
      ... on PullRequest {
        number title url mergedAt headRefName body ${LABELS}
        closingIssuesReferences(first: 5) { nodes { number title ${LABELS} parent { title ${LABELS} } } }
      }
    }
  }
}`;

function mapOpenPr(node) {
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
        reviewDecision: node.reviewDecision,
        ci: ciFromRollup(rollup?.state),
        checks: rollup?.contexts?.totalCount || 0,
        unresolvedThreads: (node.reviewThreads?.nodes || []).filter((t) => !t.isResolved).length,
        headReviewed: reviews.some((r) => r.state !== "PENDING" && r.commit?.oid === node.headRefOid),
    };
}

function names(labels) {
    return (labels?.nodes || []).map((l) => l.name);
}

async function fetchMerged(repo, now) {
    const since = new Date(now - 7 * DAY - DAY).toISOString().slice(0, 10);
    const q = `repo:${repo} is:pr is:merged merged:>=${since}`;
    const out = [];
    let after = null;
    for (let page = 0; page < 3; page += 1) {
        const data = await graphql(MERGED_QUERY, after ? { q, after } : { q });
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
                refs: (node.closingIssuesReferences?.nodes || []).map((r) => ({
                    number: r.number,
                    title: r.title,
                    labels: names(r.labels),
                    parent: r.parent ? { title: r.parent.title, labels: names(r.parent.labels) } : null,
                })),
            });
        }
        if (!data.search?.pageInfo?.hasNextPage) break;
        after = data.search.pageInfo.endCursor;
    }
    return out;
}

// Body references that are not closing references ("part of #12") still say which issue a PR served.
async function addBodyRefs(repo, merged) {
    const wanted = new Map();
    for (const pr of merged) {
        const known = new Set(pr.refs.map((r) => r.number));
        for (const n of referencedNumbers(pr)) if (!known.has(n)) wanted.set(n, true);
    }
    const numbers = [...wanted.keys()].slice(0, 80);
    if (!numbers.length) return;
    const [owner, name] = repo.split("/");
    const fields = numbers.map((n) => `n${n}: issueOrPullRequest(number: ${n}) { ... on Issue { number title ${LABELS} parent { title ${LABELS} } } }`).join("\n");
    const data = await graphql(`query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { ${fields} } }`, { owner, name });
    const found = new Map();
    for (const n of numbers) {
        const node = data.repository?.[`n${n}`];
        if (node?.number) found.set(n, { number: n, title: node.title, labels: names(node.labels), parent: node.parent ? { title: node.parent.title, labels: names(node.parent.labels) } : null });
    }
    for (const pr of merged) {
        const known = new Set(pr.refs.map((r) => r.number));
        for (const n of referencedNumbers(pr)) if (!known.has(n) && found.has(n)) pr.refs.push(found.get(n));
    }
}

async function fetchBoardData(repo, board) {
    const tracks = board.tracks || [];
    const epics = board.epics || [];
    if (!tracks.length && !epics.length && !board.decisionLabel) return { trackIssues: {}, epics: [], decisionIssues: [] };
    const [owner, name] = repo.split("/");
    const vars = { owner, name };
    const fields = [];
    tracks.forEach((t, i) => {
        vars[`t${i}`] = `repo:${repo} is:issue label:"${t.label}"`;
        fields.push(`t${i}: search(query: $t${i}, type: ISSUE, first: 100) { nodes { ... on Issue { number title url state body } } }`);
    });
    if (board.decisionLabel) {
        vars.dq = `repo:${repo} is:open label:"${board.decisionLabel}"`;
        fields.push(`dq: search(query: $dq, type: ISSUE, first: 30) { nodes { ... on Issue { number title url } ... on PullRequest { number title url } } }`);
    }
    const repoFields = epics.map((e) => `e${e.number}: issue(number: ${Number(e.number)}) { number title url state subIssuesSummary { total completed } }`).join("\n");
    const declared = Object.keys(vars).map((k) => `$${k}: String!`).join(", ");
    const query = `query(${declared}) { ${fields.join("\n")} repository(owner: $owner, name: $name) { id ${repoFields} } }`;
    const data = await graphql(query, vars);
    const trackIssues = {};
    tracks.forEach((t, i) => {
        trackIssues[t.label] = (data[`t${i}`]?.nodes || []).filter((n) => n?.number);
    });
    return {
        trackIssues,
        decisionIssues: (data.dq?.nodes || []).filter((n) => n?.number),
        epics: epics.map((e) => {
            const issue = data.repository?.[`e${e.number}`];
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

async function fetchLockComments(repo, issue, now) {
    const since = new Date(now - 48 * HOUR).toISOString();
    const out = await run("gh", ["api", "--paginate", `repos/${repo}/issues/${Number(issue)}/comments?per_page=100&since=${since}`,
        "--jq", ".[] | {createdAt: .created_at, url: .html_url, line: (.body | split(\"\\n\")[0] | .[0:300])}"]);
    return out.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
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
    const re = settings.heavyPattern ? regex(settings.heavyPattern) : null;
    if (re && process.platform !== "win32") {
        try {
            const ps = await run("ps", ["-axo", "command="], 5000);
            out.heavy = ps.split("\n").filter((line) => line.trim() && re.test(line)).length;
        } catch {
            // ps failure leaves heavy at 0.
        }
    }
    return out;
}

/** Fetch everything the board shows. Each source fails independently and is reported as a warning. */
export async function collectRaw(repo, board, now = Date.now()) {
    const errors = [];
    const safe = async (source, fn, fallback) => {
        try {
            return await fn();
        } catch (error) {
            errors.push({ source, message: error.message });
            return fallback;
        }
    };
    const [owner, name] = repo.split("/");
    const [open, merged, boardData, lockComments, local] = await Promise.all([
        safe("open pull requests", () => graphql(OPEN_PRS_QUERY, { owner, name }), null),
        safe("merged pull requests", () => fetchMerged(repo, now), []),
        safe("tracks, epics and decisions", () => fetchBoardData(repo, board), { trackIssues: {}, epics: [], decisionIssues: [] }),
        board.coordinationIssue > 0 ? safe("merge lock comments", () => fetchLockComments(repo, board.coordinationIssue, now), []) : Promise.resolve([]),
        board.localResources?.enabled ? fetchLocal(board.localResources) : Promise.resolve(null),
    ]);
    if ((board.tracks || []).length && merged.length) await safe("referenced issues", () => addBodyRefs(repo, merged), null);
    const prConn = open?.repository?.pullRequests;
    return {
        repo,
        openPrs: (prConn?.nodes || []).map(mapOpenPr),
        openPrTotal: prConn?.totalCount ?? 0,
        merged,
        lockComments,
        rate: open?.rateLimit ? { remaining: open.rateLimit.remaining, limit: open.rateLimit.limit, resetAt: open.rateLimit.resetAt } : null,
        local,
        errors,
        ...boardData,
    };
}
