// Extension: agent-session-board
// Supervise several Copilot sessions working one GitHub repository: decisions, track progress, PR merge gates, merge flow.
import { createCanvas, CanvasError, joinSession } from "@github/copilot-sdk/extension";
import { CANVAS_ID, DEMO_KEY, StoreError, configPatch, getBoard, sanitizeDecisions, updateBoard, validAnswer } from "./lib/store.mjs";
import { buildState, collectRaw, decisionRev, isValidRepo, prepareMatcher, summarize } from "./lib/collect.mjs";
import { DEMO_REPO, demoBoard, demoRaw } from "./lib/demo.mjs";
import { startServer } from "./lib/server.mjs";

const CACHE_MS = 60 * 1000;
const SEEN_TTL_MS = 30 * 24 * 3600 * 1000;
const instances = new Map();
const opening = new Map();
let session;

function log(message, level = "warning") {
    try {
        session?.log?.(`[${CANVAS_ID}] ${message}`, { level, ephemeral: true })?.catch?.(() => {});
    } catch {
        // Logging must never break the board.
    }
}

function asCanvasError(error) {
    if (error instanceof CanvasError) return error;
    if (error instanceof StoreError) return new CanvasError(error.code, error.message);
    return new CanvasError("internal", error?.message || String(error));
}

function guarded(fn) {
    return async (ctx) => {
        try {
            return await fn(ctx);
        } catch (error) {
            throw asCanvasError(error);
        }
    };
}

function requireInstance(instanceId) {
    const instance = instances.get(instanceId);
    if (!instance) throw new CanvasError("not_open", `Canvas instance ${instanceId} is not open; call open_canvas first.`);
    return instance;
}

// Every board change bumps the generation, so a GitHub fetch that started before it can neither be reused nor cached.
function invalidate(instance) {
    instance.generation += 1;
    instance.cache = null;
}

async function stateFor(instance, force) {
    const generation = instance.generation;
    if (!force && instance.cache && instance.cache.generation === generation && Date.now() - instance.cache.at < CACHE_MS) return instance.cache.state;
    if (instance.pending && instance.pending.generation === generation) return instance.pending.promise;
    const promise = (async () => {
        const now = Date.now();
        const board = await getBoard(instance.key);
        const raw = instance.demo ? demoRaw(now) : await collectRaw(instance.repo, board, now);
        if (instance.demo && !board.localResources.enabled) raw.local = null;
        // Configured patterns run in a worker under a deadline; buildState only looks up their results.
        const matcher = await prepareMatcher(raw, board);
        raw.skippedPatterns = matcher.skipped;
        const state = buildState(raw, board, now, matcher.test);
        if (instance.generation === generation) instance.cache = { at: Date.now(), generation, state };
        return state;
    })();
    const pending = { generation, promise };
    instance.pending = pending;
    try {
        return await promise;
    } finally {
        if (instance.pending === pending) instance.pending = null;
    }
}

async function saveAnswer(instance, body) {
    const parsed = validAnswer(body);
    if (!parsed) return { status: 400, body: { error: "id, rev and answer (1-1000 characters) are required" } };
    // Label-raised questions live on GitHub, so they are checked against a freshly collected board.
    if (parsed.id.startsWith("gh-")) {
        const current = (await stateFor(instance, true)).decisions.find((d) => d.id === parsed.id);
        if (!current) return { status: 404, body: { error: "unknown decision" } };
        if (current.rev !== parsed.rev) return { status: 409, body: { error: "the question changed; reload and answer again" } };
    }
    let outcome = null;
    const board = await updateBoard(instance.key, (b) => {
        // Board questions are checked inside the write lock against the stored board, so a question that another
        // session replaced (same id, new content) cannot receive an answer meant for the old one.
        if (!parsed.id.startsWith("gh-")) {
            const current = b.decisions.find((d) => d.id === parsed.id);
            if (!current) outcome = { status: 404, body: { error: "unknown decision" } };
            else if (decisionRev(current) !== parsed.rev) outcome = { status: 409, body: { error: "the question changed; reload and answer again" } };
            if (outcome) return b;
        }
        return { ...b, answers: { ...b.answers, [parsed.id]: { answer: parsed.answer, rev: parsed.rev, at: new Date().toISOString(), seen: false } } };
    });
    invalidate(instance);
    return outcome || { status: 200, body: board.answers[parsed.id] };
}

function stopInstance(instanceId) {
    const instance = instances.get(instanceId);
    if (!instance) return;
    instances.delete(instanceId);
    instance.server?.close();
}

async function startInstance(target) {
    try {
        const board = await getBoard(target.key);
        if (target.demo && !board.sessions.length && !board.tracks.length && !board.decisions.length && !Object.keys(board.answers).length) {
            await updateBoard(target.key, (b) => ({ ...b, ...demoBoard() }));
        }
    } catch (error) {
        throw asCanvasError(error);
    }
    const instance = { ...target, generation: 0, cache: null, pending: null, server: null, url: "" };
    try {
        const started = await startServer({
            state: (force) => stateFor(instance, force),
            answer: (body) => saveAnswer(instance, body),
            log,
        });
        instance.server = started.server;
        instance.url = started.url;
    } catch (error) {
        throw new CanvasError("server_start", `Could not start the board server: ${error.message}`);
    }
    return instance;
}

function parseOpenInput(input) {
    const value = input && typeof input === "object" ? input : {};
    if (value.demo === true) return { key: DEMO_KEY, repo: DEMO_REPO, demo: true };
    if (!isValidRepo(value.repo)) throw new CanvasError("invalid_input", "input.repo must be an owner/name GitHub repository, or pass { demo: true }.");
    return { key: value.repo.toLowerCase(), repo: value.repo, demo: false };
}

const titleFor = (instance) => `Agent Session Board · ${instance.repo}${instance.demo ? " (demo)" : ""}`;

const sessionSchema = {
    type: "object",
    additionalProperties: false,
    required: ["id"],
    properties: {
        id: { type: "string", description: "kebab-case id, unique on this board" },
        name: { type: "string", description: "Display name of the agent session" },
        note: { type: "string", description: "Short status line shown on the card" },
        link: { type: "string", description: "https://github.com/... link, e.g. the session's epic issue" },
        branchPatterns: { type: "array", items: { type: "string" }, description: "Regexes matched against PR head branch names" },
        titlePatterns: { type: "array", items: { type: "string" }, description: "Regexes matched against PR titles" },
        prs: { type: "array", items: { type: "integer" }, description: "Explicit PR numbers owned by this session (checked first)" },
    },
};

const trackSchema = {
    type: "object",
    additionalProperties: false,
    required: ["label"],
    properties: {
        label: { type: "string", description: "GitHub label that defines the track (milestone, area, phase, ...)" },
        name: { type: "string" },
        note: { type: "string" },
        group: { type: "string", description: "Optional heading grouping several tracks" },
        titlePattern: { type: "string", description: "Fallback regex matched against PR and issue titles when no label matches" },
    },
};

const decisionSchema = {
    type: "object",
    additionalProperties: false,
    required: ["title"],
    properties: {
        id: { type: "string", description: "Stable kebab-case id; answers are keyed by it" },
        title: { type: "string" },
        detail: { type: "string" },
        url: { type: "string", description: "Optional https://github.com/... link" },
        options: { type: "array", items: { type: "string" }, description: "Up to 8 choice buttons; the user can also type a free answer" },
    },
};

const canvas = createCanvas({
    id: CANVAS_ID,
    displayName: "Agent Session Board",
    description: "Supervise several Copilot sessions working one GitHub repo: decision queue, label-track progress, per-PR merge gates, hourly and daily merge flow, warnings and an optional merge-lock lane.",
    inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
            repo: { type: "string", description: "GitHub owner/name to supervise (required unless demo is true)" },
            demo: { type: "boolean", description: "Show fictional sample data instead of a real repository" },
        },
    },
    actions: [
        {
            name: "refresh",
            description: "Re-collect data from GitHub now and return a compact summary.",
            handler: guarded(async (ctx) => summarize(await stateFor(requireInstance(ctx.instanceId), true))),
        },
        {
            name: "get_summary",
            description: "Return a compact summary of the board (open PRs by merge gate, merges by track, sessions, lock, decisions, warnings). Uses a one-minute cache.",
            handler: guarded(async (ctx) => summarize(await stateFor(requireInstance(ctx.instanceId), false))),
        },
        {
            name: "configure_board",
            description: "Configure this repository's board. Only the fields you pass change. Merges are attributed to tracks by PR label, then the labels of issues the PR closes or references, then those issues' parent epics.",
            inputSchema: {
                type: "object",
                additionalProperties: false,
                properties: {
                    sessions: { type: "array", items: sessionSchema, description: "Agent sessions; each PR goes to the first session whose prs, branchPatterns or titlePatterns match" },
                    tracks: { type: "array", items: trackSchema, description: "Label tracks in priority order (earlier wins when several match)" },
                    epics: {
                        type: "array",
                        description: "Epic issues whose sub-issue progress is shown as bars",
                        items: {
                            type: "object",
                            additionalProperties: false,
                            required: ["number"],
                            properties: { number: { type: "integer", minimum: 1 }, name: { type: "string" }, group: { type: "string" } },
                        },
                    },
                    decisionLabel: { type: "string", description: "Open issues/PRs with this label join the decision queue (empty string disables)" },
                    coordinationIssue: { type: "integer", minimum: 0, description: "Issue whose comments carry merge lock / reserve / release lines (0 disables the lock lane)" },
                    lockAuthors: {
                        type: "array",
                        items: { type: "string" },
                        description: "GitHub logins whose lock comments count. Empty (default) means anyone with write access (owner, member or collaborator)",
                    },
                    lockPrefixes: {
                        type: "object",
                        additionalProperties: false,
                        description: "First-line prefixes of coordination comments, followed by #PR and optionally an expiry (ISO time or HH:MMZ)",
                        properties: { lock: { type: "string" }, reserve: { type: "string" }, release: { type: "string" } },
                    },
                    localResources: {
                        type: "object",
                        additionalProperties: false,
                        description: "Optional local machine checks (off by default): free memory, swap, and a cap on heavy processes",
                        properties: {
                            enabled: { type: "boolean" },
                            heavyPattern: { type: "string", description: "Regex matched against process command lines" },
                            maxHeavy: { type: "integer", minimum: 0 },
                        },
                    },
                    idleMinutes: { type: "integer", minimum: 5, description: "Flag a session with open PRs after this many idle minutes (default 90)" },
                    language: { type: "string", enum: ["en", "ko"], description: "Board language; English by default" },
                },
            },
            handler: guarded(async (ctx) => {
                const instance = requireInstance(ctx.instanceId);
                const board = await updateBoard(instance.key, (b) => ({ ...b, ...configPatch(ctx.input || {}, b) }));
                invalidate(instance);
                return {
                    repo: instance.repo,
                    sessions: board.sessions.map((s) => s.id),
                    tracks: board.tracks.map((t) => t.label),
                    epics: board.epics.map((e) => e.number),
                    decisionLabel: board.decisionLabel,
                    coordinationIssue: board.coordinationIssue,
                    lockPrefixes: board.lockPrefixes,
                    lockAuthors: board.lockAuthors,
                    localResources: board.localResources,
                    idleMinutes: board.idleMinutes,
                    language: board.language,
                };
            }),
        },
        {
            name: "set_decisions",
            description: "Put questions for the user on the board. mode 'replace' (default) swaps the whole queue; 'append' adds or updates items by id.",
            inputSchema: {
                type: "object",
                additionalProperties: false,
                required: ["items"],
                properties: {
                    items: { type: "array", items: decisionSchema },
                    mode: { type: "string", enum: ["replace", "append"] },
                },
            },
            handler: guarded(async (ctx) => {
                const instance = requireInstance(ctx.instanceId);
                const items = sanitizeDecisions(ctx.input?.items);
                const mode = ctx.input?.mode === "append" ? "append" : "replace";
                const board = await updateBoard(instance.key, (b) => {
                    const kept = mode === "append" ? b.decisions.filter((d) => !items.some((i) => i.id === d.id)) : [];
                    const decisions = [...kept, ...items];
                    // Several agents share this queue; refuse to grow it past 50 rather than evict someone else's question.
                    if (decisions.length > 50) {
                        throw new StoreError("queue_full", `The decision queue would hold ${decisions.length} questions; the limit is 50. Mark answered questions seen or replace the queue.`);
                    }
                    // An answer only carries over when the same question (id and title) is still open; anything else starts fresh.
                    const answers = { ...b.answers };
                    for (const item of items) {
                        // Any content change (title, detail, options or link) changes the revision and drops the old answer.
                        if (Object.hasOwn(answers, item.id) && (answers[item.id].seen || answers[item.id].rev !== decisionRev(item))) delete answers[item.id];
                    }
                    return { ...b, decisions, answers };
                });
                invalidate(instance);
                return { repo: instance.repo, decisions: board.decisions.map((d) => d.id) };
            }),
        },
        {
            name: "get_answers",
            description: "Return answers the user gave on the board that have not been marked seen. After acting on them, call mark_answers_seen with each answer's id and at.",
            handler: guarded(async (ctx) => {
                const instance = requireInstance(ctx.instanceId);
                const board = await getBoard(instance.key);
                // Board questions are checked against the stored board; label questions against a freshly collected one.
                // Refresh from GitHub only when an unseen answer to a label-raised question could be returned.
                const needsLabels = Object.entries(board.answers).some(([id, a]) => id.startsWith("gh-") && !a.seen);
                const labelled = needsLabels ? (await stateFor(instance, true)).decisions.filter((d) => d.source === "label") : [];
                const current = new Map([...board.decisions.map((d) => ({ ...d, rev: decisionRev(d) })), ...labelled].map((d) => [d.id, d]));
                const titles = new Map([...current.values()].map((d) => [d.id, d.title]));
                const answers = Object.entries(board.answers)
                    // Only answers to the current revision of a question that is still asked are returned.
                    .filter(([id, a]) => !a.seen && current.has(id) && current.get(id).rev === a.rev)
                    .map(([id, a]) => ({ id, title: titles.get(id) || id, answer: a.answer, at: a.at }))
                    .sort((a, b) => String(b.at).localeCompare(String(a.at)));
                const answered = new Set(Object.keys(board.answers));
                return { answers, unanswered: board.decisions.filter((d) => !answered.has(d.id)).map((d) => d.id) };
            }),
        },
        {
            name: "mark_answers_seen",
            description: "Mark answers as handled; their questions leave the queue. Pass the id and at from get_answers: if the user changed the answer since, it stays unseen and is listed in changed.",
            inputSchema: {
                type: "object",
                additionalProperties: false,
                required: ["answers"],
                properties: {
                    answers: {
                        type: "array",
                        items: {
                            type: "object",
                            additionalProperties: false,
                            required: ["id", "at"],
                            properties: { id: { type: "string" }, at: { type: "string", description: "The at value returned by get_answers" } },
                        },
                    },
                },
            },
            handler: guarded(async (ctx) => {
                const instance = requireInstance(ctx.instanceId);
                const acks = new Map((Array.isArray(ctx.input?.answers) ? ctx.input.answers : [])
                    .filter((a) => a && typeof a.id === "string" && typeof a.at === "string")
                    .map((a) => [a.id, a.at]));
                let marked = 0;
                const changed = [];
                await updateBoard(instance.key, (b) => {
                    const answers = {};
                    const cutoff = Date.now() - SEEN_TTL_MS;
                    for (const [id, a] of Object.entries(b.answers)) {
                        // Only the exact answer the agent read is acknowledged; a newer one stays for the next get_answers.
                        const acknowledged = acks.has(id) && acks.get(id) === a.at;
                        if (acks.has(id) && !acknowledged && !a.seen) changed.push(id);
                        if (acknowledged && !a.seen) marked += 1;
                        const next = acknowledged ? { ...a, seen: true, seenAt: new Date().toISOString() } : a;
                        // Old handled answers are dropped so the file stays small.
                        if (!(next.seen && Date.parse(next.seenAt || next.at) < cutoff)) answers[id] = next;
                    }
                    return { ...b, answers, decisions: b.decisions.filter((d) => !(Object.hasOwn(answers, d.id) && answers[d.id].seen)) };
                });
                invalidate(instance);
                return { marked, changed };
            }),
        },
    ],
    open: async (ctx) => {
        const target = parseOpenInput(ctx.input);
        const id = ctx.instanceId;
        const existing = instances.get(id);
        if (existing && existing.key === target.key && existing.server?.listening) {
            return { url: existing.url, title: titleFor(existing) };
        }
        const inflight = opening.get(id);
        if (inflight && inflight.key === target.key) {
            const instance = await inflight.promise;
            return { url: instance.url, title: titleFor(instance) };
        }
        if (inflight) inflight.cancelled = true;
        if (existing) stopInstance(id);
        const entry = { key: target.key, cancelled: false, promise: null };
        entry.promise = startInstance(target).then((instance) => {
            // A close or a newer open for this panel arrived while starting; do not leave a server behind.
            if (entry.cancelled) {
                instance.server.close();
                throw new CanvasError("cancelled", "The canvas was closed or reopened while it was starting.");
            }
            instances.set(id, instance);
            return instance;
        });
        opening.set(id, entry);
        try {
            const instance = await entry.promise;
            return { url: instance.url, title: titleFor(instance) };
        } finally {
            if (opening.get(id) === entry) opening.delete(id);
        }
    },
    onClose: (ctx) => {
        const inflight = opening.get(ctx.instanceId);
        if (inflight) inflight.cancelled = true;
        stopInstance(ctx.instanceId);
    },
});

session = await joinSession({ canvases: [canvas] });
