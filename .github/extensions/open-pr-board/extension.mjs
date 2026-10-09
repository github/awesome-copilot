// Extension: open-pr-board
// Review board for open pull requests: AI review with persistent state tracking,
// approve / request-changes / needs-insight / close recommendations, visible labels,
// and GitHub actions. Decisions are applied through the authenticated gh CLI and
// recorded on the board. Board state is persisted to
// ./state/<owner>__<repo>.json (gitignored) so it survives reloads and new sessions.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { joinSession, createCanvas, CanvasError } from "@github/copilot-sdk/extension";
import { BoardStore, RECOMMENDATIONS } from "./lib/state.mjs";
import * as gh from "./lib/github.mjs";
import { buildReviewPrompt, buildRereviewPrompt, REVIEW_FIELDS_SCHEMA } from "./lib/review-prompt.mjs";
import { startBoardServer, expectedError } from "./lib/server.mjs";

const CANVAS_ID = "open-pr-board";
const DEFAULT_REPO = "github/awesome-copilot";
const REPO_PATTERN = "^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$";
const REPO_RE = new RegExp(REPO_PATTERN);
const EXT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(EXT_DIR, "public");
const GUIDANCE_PATH = path.join(EXT_DIR, "review-guidance.md");
const DETAIL_TTL_MS = 2 * 60 * 1000;
const MAX_GUIDANCE_LENGTH = 4000;
const MAX_COMMENT_LENGTH = 60000;
const DECISION_KINDS = ["approve", "request-changes", "comment", "close"];

const stores = new Map();
const servers = new Map();
const detailCache = new Map();
const refreshInFlight = new Map();
let session;

function normalizeRepo(value) {
    const repo = String(value ?? "").trim();
    if (!repo) return DEFAULT_REPO;
    if (!REPO_RE.test(repo)) throw new Error(`"${repo}" is not a valid owner/repo.`);
    return repo;
}

async function getStore(repo) {
    let store = stores.get(repo);
    if (!store) {
        // The repo is validated against REPO_PATTERN above, so it cannot escape the state directory.
        const file = path.join(EXT_DIR, "state", `${repo.replace("/", "__")}.json`);
        store = await new BoardStore({ file, repo }).load();
        stores.set(repo, store);
    }
    return store;
}

/** Resolves the repo for a canvas action: the open instance wins over any input override. */
async function storeForContext(ctx) {
    const instance = servers.get(ctx.instanceId);
    return getStore(instance?.repo ?? normalizeRepo(ctx.input?.repo));
}

function cacheKey(repo, number) {
    return `${repo}#${number}`;
}

async function refresh(store) {
    let inFlight = refreshInFlight.get(store.repo);
    if (!inFlight) {
        inFlight = (async () => {
            try {
                const pullRequests = await gh.listOpenPullRequests(store.repo);
                for (const key of [...detailCache.keys()]) {
                    if (key.startsWith(`${store.repo}#`)) detailCache.delete(key);
                }
                return await store.syncPullRequests(pullRequests);
            } finally {
                refreshInFlight.delete(store.repo);
            }
        })();
        refreshInFlight.set(store.repo, inFlight);
    }
    return inFlight;
}

async function getPullRequest(store, number, { force = false } = {}) {
    const key = cacheKey(store.repo, number);
    const cached = detailCache.get(key);
    if (!force && cached && Date.now() - cached.at < DETAIL_TTL_MS) return cached.data;
    const data = await gh.getPullRequestDetail(store.repo, number);
    detailCache.set(key, { at: Date.now(), data });
    return data;
}

function requireItem(store, number) {
    const item = store.getItem(number);
    if (!item) throw new Error(`Pull request #${number} is not on the board. Refresh first.`);
    return item;
}

function pendingReview(store, numbers) {
    const snapshot = store.snapshot();
    if (Array.isArray(numbers) && numbers.length) {
        const wanted = new Set(numbers.map(Number));
        return snapshot.items.filter((item) => wanted.has(item.number) && !item.decision);
    }
    // Default pass: anything never reviewed, plus reviews invalidated by new commits.
    return snapshot.items.filter((item) => !item.decision && (!item.review || item.reviewStale));
}

async function startReview({ store, numbers, instanceId, send }) {
    const candidates = pendingReview(store, numbers);
    if (!candidates.length) {
        return { queued: [], message: "Nothing to review — every open pull request already has a current AI review." };
    }
    const { previous, queued } = await store.markQueued(candidates.map((item) => item.number));
    const queueIds = new Map(queued.map((entry) => [entry.number, entry.queueId]));
    const items = candidates.map((item) => ({ ...item, queueId: queueIds.get(item.number) }));
    const prompt = buildReviewPrompt({
        instanceId,
        repo: store.repo,
        guidancePath: GUIDANCE_PATH,
        items,
        decisions: store.state.history,
    });
    if (!send) return { queued: items.map((item) => item.number), instructions: prompt };
    try {
        await session.send({ prompt });
    } catch (error) {
        await store.restoreQueueState(previous);
        throw error;
    }
    return {
        queued: items.map((item) => item.number),
        message: `Asked the agent to review ${items.length} pull request${items.length === 1 ? "" : "s"}.`,
    };
}

async function startRereview({ store, number, guidance, instanceId, send }) {
    const item = requireItem(store, Number(number));
    if (item.decision) throw new Error(`#${item.number} was already actioned (${item.decision.kind}).`);
    if (item.reviewStatus === "queued") throw new Error(`#${item.number} is already queued for review.`);
    const text = String(guidance ?? "")
        .trim()
        .slice(0, MAX_GUIDANCE_LENGTH);
    const previousReview = item.review;
    const { previous, queued } = await store.markQueued([item.number]);
    const prompt = buildRereviewPrompt({
        instanceId,
        repo: store.repo,
        guidancePath: GUIDANCE_PATH,
        item: { ...item, queueId: queued[0]?.queueId },
        guidance: text,
        previousReview,
    });
    if (!send) return { queued: [item.number], instructions: prompt };
    try {
        await session.send({ prompt });
    } catch (error) {
        await store.restoreQueueState(previous);
        throw error;
    }
    return { queued: [item.number], message: `Asked the agent to re-review #${item.number}.` };
}

async function applyDecisionOnGitHub({ store, number, kind, comment }) {
    if (!DECISION_KINDS.includes(kind)) throw new Error(`Unknown decision "${kind}".`);
    const item = requireItem(store, number);
    if (item.decision) throw new Error(`#${number} was already actioned (${item.decision.kind}).`);

    const body = String(comment ?? "")
        .trim()
        .slice(0, MAX_COMMENT_LENGTH);
    if ((kind === "request-changes" || kind === "comment") && !body) {
        throw new Error(`A ${kind} decision needs a non-empty comment.`);
    }

    let result;
    if (kind === "approve") {
        result = await gh.approveAndEnableAutoMerge(store.repo, number, { body });
    } else if (kind === "close") {
        result = await gh.closePullRequest(store.repo, number, { body });
    } else {
        result = await gh.submitPullRequestReview(store.repo, number, { kind, body });
    }

    const warnings = result.warning ? [result.warning] : [];
    try {
        await store.recordDecision(number, { kind, comment: body, status: result.status });
    } catch (error) {
        warnings.push(`GitHub was updated, but the board could not record the action: ${error.message}`);
    }
    try {
        await refresh(store);
    } catch (error) {
        warnings.push(`GitHub was updated, but the board could not refresh: ${error.message}`);
    }

    return {
        number,
        kind,
        comment: body,
        posted: true,
        status: result.status,
        warning: warnings.length ? warnings.join(" ") : null,
        url: item.url,
    };
}

function boardSummary(store) {
    const snapshot = store.snapshot();
    return {
        repo: snapshot.repo,
        updatedAt: snapshot.updatedAt,
        counts: snapshot.counts,
        items: snapshot.items.map((item) => ({
            number: item.number,
            title: item.title,
            author: item.author,
            url: item.url,
            column: item.column,
            isDraft: item.isDraft,
            labels: item.labels.map((label) => label.name),
            checksState: item.checksState,
            reviewDecision: item.reviewDecision,
            aiRecommendation: item.review?.recommendation ?? null,
            aiRationale: item.review?.rationale ?? null,
            reviewStale: item.reviewStale,
            reviewStatus: item.reviewStatus,
            manualOverride: item.manualColumn ?? null,
            suggestedComment: item.review?.suggestedComment ?? null,
            decision: item.decision
                ? { kind: item.decision.kind, at: item.decision.at, status: item.decision.status }
                : null,
        })),
    };
}

function routesFor(instanceId, store) {
    const routes = {
        "GET /api/board": () => store.snapshot(),
        "POST /api/refresh": () => refresh(store),
        "POST /api/review": ({ body }) => startReview({ store, numbers: body.numbers, instanceId, send: true }),
        "POST /api/rereview": ({ body }) =>
            startRereview({ store, number: body.number, guidance: body.guidance, instanceId, send: true }),
        "POST /api/move": ({ body }) => store.moveItem(Number(body.number), String(body.column)),
        "GET /api/pr/:number": ({ number }) => getPullRequest(store, number),
        "POST /api/pr/:number": ({ number }) => getPullRequest(store, number, { force: true }),
        "POST /api/decision": ({ body }) =>
            applyDecisionOnGitHub({ store, number: Number(body.number), kind: body.kind, comment: body.comment }),
    };
    // Board errors are user-facing messages (gh failures, "already actioned", ...); surface only the
    // message text, never the stack, and log the full error for debugging.
    return Object.fromEntries(
        Object.entries(routes).map(([key, handler]) => [
            key,
            async (args) => {
                try {
                    return await handler(args);
                } catch (error) {
                    session?.log(`Open PR board ${key} failed: ${error?.stack ?? error}`, {
                        level: "warning",
                        ephemeral: true,
                    });
                    throw expectedError(String(error?.message ?? "Request failed"), 400);
                }
            },
        ]),
    );
}

function wrap(fn) {
    return async (ctx) => {
        try {
            return await fn(ctx);
        } catch (error) {
            if (error instanceof CanvasError) throw error;
            throw new CanvasError("board_error", error?.message ?? String(error));
        }
    };
}

const repoProperty = {
    type: "string",
    pattern: REPO_PATTERN,
    description: `Repository in owner/repo form. Defaults to ${DEFAULT_REPO}.`,
};

session = await joinSession({
    canvases: [
        createCanvas({
            id: CANVAS_ID,
            displayName: "Open PR Board",
            description:
                "Review board for open pull requests: AI reviews with persistent state tracking, visible labels and checks, and confirmed GitHub review, close, and auto-merge actions.",
            inputSchema: { type: "object", additionalProperties: false, properties: { repo: repoProperty } },
            actions: [
                {
                    name: "get_board",
                    description:
                        "Return every pull request on the board with its column, AI recommendation, labels, checks, and decision.",
                    inputSchema: { type: "object", additionalProperties: false, properties: { repo: repoProperty } },
                    handler: wrap(async (ctx) => boardSummary(await storeForContext(ctx))),
                },
                {
                    name: "refresh",
                    description: "Fetch open pull requests; adds new ones and removes any that were merged or closed.",
                    inputSchema: { type: "object", additionalProperties: false, properties: { repo: repoProperty } },
                    handler: wrap(async (ctx) => refresh(await storeForContext(ctx))),
                },
                {
                    name: "start_review",
                    description:
                        "Queue pull requests for AI review (defaults to everything unreviewed or changed since its last review) and return the review instructions to follow.",
                    inputSchema: {
                        type: "object",
                        additionalProperties: false,
                        properties: { repo: repoProperty, numbers: { type: "array", items: { type: "integer" } } },
                    },
                    handler: wrap(async (ctx) =>
                        startReview({
                            store: await storeForContext(ctx),
                            numbers: ctx.input?.numbers,
                            instanceId: ctx.instanceId,
                            send: false,
                        }),
                    ),
                },
                {
                    name: "start_rereview",
                    description: "Queue one pull request for a guided re-review and return the instructions to run it.",
                    inputSchema: {
                        type: "object",
                        additionalProperties: false,
                        required: ["number"],
                        properties: {
                            repo: repoProperty,
                            number: { type: "integer" },
                            guidance: { type: "string", maxLength: MAX_GUIDANCE_LENGTH },
                        },
                    },
                    handler: wrap(async (ctx) =>
                        startRereview({
                            store: await storeForContext(ctx),
                            number: ctx.input.number,
                            guidance: ctx.input.guidance,
                            instanceId: ctx.instanceId,
                            send: false,
                        }),
                    ),
                },
                {
                    name: "record_review",
                    description:
                        "Record AI review results for one or more pull requests; moves each card into its recommended bucket.",
                    inputSchema: {
                        type: "object",
                        additionalProperties: false,
                        required: ["reviews"],
                        properties: {
                            repo: repoProperty,
                            reviews: { type: "array", minItems: 1, items: REVIEW_FIELDS_SCHEMA },
                        },
                    },
                    handler: wrap(async (ctx) => (await storeForContext(ctx)).recordReviews(ctx.input.reviews)),
                },
                {
                    name: "move_item",
                    description: "Manually move a pull request to a bucket. Moving to 'unreviewed' clears its AI review.",
                    inputSchema: {
                        type: "object",
                        additionalProperties: false,
                        required: ["number", "column"],
                        properties: {
                            repo: repoProperty,
                            number: { type: "integer" },
                            column: { type: "string", enum: ["unreviewed", ...RECOMMENDATIONS] },
                        },
                    },
                    handler: wrap(async (ctx) =>
                        (await storeForContext(ctx)).moveItem(ctx.input.number, ctx.input.column),
                    ),
                },
                {
                    name: "get_pr",
                    description:
                        "Fetch a pull request's rendered description, comments, submitted reviews, and changed files, plus its stored AI review.",
                    inputSchema: {
                        type: "object",
                        additionalProperties: false,
                        required: ["number"],
                        properties: { repo: repoProperty, number: { type: "integer" } },
                    },
                    handler: wrap(async (ctx) => {
                        const store = await storeForContext(ctx);
                        return {
                            review: store.getItem(ctx.input.number)?.review ?? null,
                            pullRequest: await getPullRequest(store, ctx.input.number),
                        };
                    }),
                },
            ],
            open: async (ctx) => {
                const repo = normalizeRepo(ctx.input?.repo);
                const store = await getStore(repo);
                let entry = servers.get(ctx.instanceId);
                if (entry && entry.repo !== repo) {
                    servers.delete(ctx.instanceId);
                    await entry.close();
                    entry = null;
                }
                if (!entry) {
                    const server = await startBoardServer({
                        publicDir: PUBLIC_DIR,
                        api: {
                            snapshot: () => store.snapshot(),
                            subscribe: (listener) => store.onChange(listener),
                            routes: routesFor(ctx.instanceId, store),
                            logger: {
                                error: (message, error) =>
                                    session?.log(`${message}: ${error?.stack ?? error}`, {
                                        level: "error",
                                        ephemeral: true,
                                    }),
                            },
                        },
                    });
                    entry = { repo, ...server };
                    servers.set(ctx.instanceId, entry);
                }
                if (!store.state.updatedAt) {
                    refresh(store).catch((error) =>
                        session?.log(`Open PR board refresh failed: ${error.message}`, { level: "warning" }),
                    );
                }
                const snapshot = store.snapshot();
                const open = snapshot.items.filter((item) => !item.decision).length;
                return { title: `Open PRs — ${repo}`, status: `${open} to triage`, url: entry.url };
            },
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (entry) {
                    servers.delete(ctx.instanceId);
                    await entry.close();
                }
            },
        }),
    ],
});
