// Extension: external-plugin-review-board
// Kanban board for triaging external plugin submissions with AI review,
// quick approve/reject, and an issue detail view. Board state is persisted to
// ./state/board.json (gitignored) so it survives reloads and new sessions.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { joinSession, createCanvas, CanvasError } from "@github/copilot-sdk/extension";
import { BoardStore, RECOMMENDATIONS } from "./lib/state.mjs";
import * as gh from "./lib/github.mjs";
import { buildReviewPrompt, buildRereviewPrompt, REVIEW_FIELDS_SCHEMA } from "./lib/review-prompt.mjs";
import { startBoardServer, expectedError } from "./lib/server.mjs";

const CANVAS_ID = "external-plugin-review-board";
const REPO = "github/awesome-copilot";
const EXT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(EXT_DIR, "public");
const GUIDANCE_PATH = path.join(EXT_DIR, "review-guidance.md");
const DETAIL_TTL_MS = 2 * 60 * 1000;

const store = await new BoardStore(path.join(EXT_DIR, "state", "board.json"), REPO).load();
const servers = new Map();
const detailCache = new Map();
let refreshInFlight = null;
let session;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolvePendingDecisions(numbers = store.pendingDecisionNumbers()) {
    const resolved = [];
    for (const number of await numbers) {
        try {
            const status = await gh.getIssueStatus(store.state.repo, number);
            const decision = await store.resolvePendingDecision(number, status);
            if (decision) {
                detailCache.delete(number);
                resolved.push({ number, kind: decision.kind });
            }
        } catch (error) {
            session?.log(`Could not resolve pending decision for #${number}: ${error.message}`, { level: "warning" });
        }
    }
    return resolved;
}

async function refresh() {
    refreshInFlight ??= (async () => {
        try {
            await resolvePendingDecisions();
            const issues = await gh.listReadyIssues(store.state.repo);
            detailCache.clear();
            return await store.syncIssues(issues);
        } finally {
            refreshInFlight = null;
        }
    })();
    return refreshInFlight;
}

async function getIssue(number, { force = false } = {}) {
    const cached = detailCache.get(number);
    if (!force && cached && Date.now() - cached.at < DETAIL_TTL_MS) return cached.data;
    const data = await gh.getIssueDetail(store.state.repo, number);
    detailCache.set(number, { at: Date.now(), data });
    return data;
}

async function startReview({ numbers, instanceId, send }) {
    const items = store.pendingReview(numbers);
    if (!items.length) return { queued: [], message: "Nothing to review — all items already have an AI review." };
    const queued = items.map((item) => item.number);
    const snapshots = await store.markQueued(queued);
    const prompt = buildReviewPrompt({
        items,
        instanceId,
        canvasId: CANVAS_ID,
        guidancePath: GUIDANCE_PATH,
        history: store.state.history,
    });
    if (send) {
        try {
            await session.send({ prompt });
        } catch (error) {
            await store.restoreQueueState(snapshots);
            throw error;
        }
        return { queued, message: `Asked the agent to review ${queued.length} submission(s).` };
    }
    return { queued, instructions: prompt };
}

const MAX_GUIDANCE_LENGTH = 4000;

async function startRereview({ number, guidance, instanceId, send }) {
    const item = store.getItem(Number(number));
    if (item.decision) throw new Error(`#${item.number} was already actioned (${item.decision.kind}).`);
    if (item.reviewStatus === "queued") throw new Error(`#${item.number} is already queued for review.`);
    const text = String(guidance ?? "").trim().slice(0, MAX_GUIDANCE_LENGTH);
    const snapshots = await store.markQueued([item.number], { rereviewGuidance: text || null });
    const prompt = buildRereviewPrompt({
        item,
        guidance: text,
        instanceId,
        canvasId: CANVAS_ID,
        guidancePath: GUIDANCE_PATH,
        history: store.state.history,
        repo: store.state.repo,
    });
    if (send) {
        try {
            await session.send({ prompt });
        } catch (error) {
            await store.restoreQueueState(snapshots);
            throw error;
        }
        return { queued: [item.number], message: `Asked the agent to start a re-review sub-session for #${item.number}.` };
    }
    return { queued: [item.number], instructions: prompt };
}

function stripCommand(text, command) {
    return String(text ?? "")
        .trim()
        .replace(new RegExp(`^/${command}\\b`, "i"), "")
        .trim();
}

async function postDecision({ number, kind, comment }) {
    if (kind !== "approve" && kind !== "reject") throw new Error(`Unknown decision "${kind}".`);
    const item = store.getItem(number);
    if (item.decision) throw new Error(`#${number} was already actioned (${item.decision.kind}).`);

    const status = await gh.getIssueStatus(store.state.repo, number);
    if (status.state !== "OPEN") throw new Error(`#${number} is ${status.state.toLowerCase()}. Refresh the board.`);
    if (kind === "approve" && !status.labels.includes("ready-for-review")) {
        throw new Error(`#${number} is no longer labelled ready-for-review, so /approve would be ignored.`);
    }

    const text = stripCommand(comment, kind);
    if (kind === "reject" && !text) throw new Error("Reject decisions require a non-empty reason.");
    const body = kind === "approve" ? (text ? `/approve\n\n${text}` : "/approve") : text ? `/reject ${text}` : "/reject";
    const commentUrl = await gh.postComment(store.state.repo, number, body);
    const pendingDecision = { kind, comment: text, body, commentUrl, at: new Date().toISOString() };
    await store.recordPendingDecision(number, pendingDecision);
    for (const delay of [1000, 2000, 4000]) {
        await sleep(delay);
        const resolved = await resolvePendingDecisions([number]);
        if (resolved.length) return { number, ...pendingDecision, pending: false, resolved: resolved[0] };
    }
    detailCache.delete(number);
    return { number, ...pendingDecision, pending: true };
}

function boardSummary() {
    const snapshot = store.snapshot();
    return {
        repo: snapshot.repo,
        lastRefreshedAt: snapshot.lastRefreshedAt,
        counts: Object.fromEntries(
            snapshot.columns.map((column) => [column.id, snapshot.items.filter((i) => i.column === column.id).length]),
        ),
        items: snapshot.items.map((item) => ({
            number: item.number,
            title: item.title,
            author: item.author,
            column: item.column,
            aiRecommendation: item.review?.recommendation ?? null,
            manualOverride: item.manualColumn ?? null,
            suggestedComment: item.review?.suggestedComment ?? null,
            decision: item.decision ? { kind: item.decision.kind, at: item.decision.at } : null,
            pendingDecision: item.pendingDecision
                ? { kind: item.pendingDecision.kind, at: item.pendingDecision.at }
                : null,
        })),
    };
}

function routesFor(instanceId) {
    const routes = {
        "GET /api/board": () => store.snapshot(),
        "POST /api/refresh": () => refresh(),
        "POST /api/review": ({ body }) => startReview({ numbers: body.numbers, instanceId, send: true }),
        "POST /api/rereview": ({ body }) =>
            startRereview({ number: body.number, guidance: body.guidance, instanceId, send: true }),
        "POST /api/move": ({ body }) => store.moveItem(Number(body.number), String(body.column)),
        "GET /api/issue/:number": ({ number }) => getIssue(number),
        "POST /api/issue/:number": ({ number }) => getIssue(number, { force: true }),
        "POST /api/decision": ({ body }) =>
            postDecision({ number: Number(body.number), kind: body.kind, comment: body.comment }),
    };
    // Board errors are user-facing messages (e.g. "already actioned", gh failures); surface only the
    // message text, never the stack, and log the full error for debugging.
    return Object.fromEntries(
        Object.entries(routes).map(([key, handler]) => [
            key,
            async (args) => {
                try {
                    return await handler(args);
                } catch (error) {
                    session?.log(`Plugin review board ${key} failed: ${error?.stack ?? error}`, {
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
            throw new CanvasError("board_error", error.message ?? String(error));
        }
    };
}

session = await joinSession({
    canvases: [
        createCanvas({
            id: CANVAS_ID,
            displayName: "External Plugin Review Board",
            description:
                "Kanban board for triaging github/awesome-copilot external plugin submissions: AI review, drag between buckets, view issues, and approve/reject.",
            inputSchema: { type: "object", additionalProperties: false, properties: {} },
            actions: [
                {
                    name: "get_board",
                    description: "Return every board item with its column, AI recommendation, suggested comment, and decision.",
                    handler: wrap(() => boardSummary()),
                },
                {
                    name: "refresh",
                    description: "Fetch open ready-for-review external plugin issues; adds new ones and removes closed ones.",
                    handler: wrap(() => refresh()),
                },
                {
                    name: "start_review",
                    description:
                        "Queue items for AI review (defaults to every item without a review) and return review instructions to follow.",
                    inputSchema: {
                        type: "object",
                        additionalProperties: false,
                        properties: { numbers: { type: "array", items: { type: "integer" } } },
                    },
                    handler: wrap((ctx) =>
                        startReview({ numbers: ctx.input?.numbers, instanceId: ctx.instanceId, send: false }),
                    ),
                },
                {
                    name: "start_rereview",
                    description:
                        "Queue one item for a guided re-review and return instructions to run it in a sub-session.",
                    inputSchema: {
                        type: "object",
                        additionalProperties: false,
                        required: ["number"],
                        properties: {
                            number: { type: "integer" },
                            guidance: { type: "string", maxLength: MAX_GUIDANCE_LENGTH },
                        },
                    },
                    handler: wrap((ctx) =>
                        startRereview({
                            number: ctx.input.number,
                            guidance: ctx.input.guidance,
                            instanceId: ctx.instanceId,
                            send: false,
                        }),
                    ),
                },
                {
                    name: "record_review",
                    description: "Record AI review results for one or more issues; moves each card to its recommended bucket.",
                    inputSchema: {
                        type: "object",
                        additionalProperties: false,
                        required: ["reviews"],
                        properties: { reviews: { type: "array", minItems: 1, items: REVIEW_FIELDS_SCHEMA } },
                    },
                    handler: wrap((ctx) => store.recordReviews(ctx.input.reviews)),
                },
                {
                    name: "move_item",
                    description: "Manually move an issue to a bucket. Moving to 'unreviewed' clears its AI review.",
                    inputSchema: {
                        type: "object",
                        additionalProperties: false,
                        required: ["number", "column"],
                        properties: {
                            number: { type: "integer" },
                            column: { type: "string", enum: ["unreviewed", ...RECOMMENDATIONS] },
                        },
                    },
                    handler: wrap((ctx) => store.moveItem(ctx.input.number, ctx.input.column)),
                },
                {
                    name: "get_issue",
                    description: "Fetch an issue's body and comments (rendered HTML) plus its stored AI review.",
                    inputSchema: {
                        type: "object",
                        additionalProperties: false,
                        required: ["number"],
                        properties: { number: { type: "integer" } },
                    },
                    handler: wrap(async (ctx) => ({
                        review: store.getItem(ctx.input.number).review,
                        issue: await getIssue(ctx.input.number),
                    })),
                },
            ],
            open: async (ctx) => {
                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    entry = await startBoardServer({
                        publicDir: PUBLIC_DIR,
                        api: {
                            snapshot: () => store.snapshot(),
                            subscribe: (listener) => store.onChange(listener),
                            routes: routesFor(ctx.instanceId),
                            logger: {
                                error: (message, error) =>
                                    session?.log(`${message}: ${error?.stack ?? error}`, { level: "error", ephemeral: true }),
                            },
                        },
                    });
                    servers.set(ctx.instanceId, entry);
                }
                if (!store.state.lastRefreshedAt) {
                    refresh().catch((error) =>
                        session?.log(`Plugin review board refresh failed: ${error.message}`, { level: "warning" }),
                    );
                }
                const pending = store.snapshot().items.filter((item) => !item.decision).length;
                return { title: "Plugin review board", status: `${pending} open`, url: entry.url };
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
