import path from "node:path";
import os from "node:os";
import { readResourceFile } from "./lib/preview.mjs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { joinSession, createCanvas, CanvasError } from "@github/copilot-sdk/extension";
import { startBoardServer, expectedError } from "../open-pr-board/lib/server.mjs";
import {
    BoardStore, WORK_KINDS, RECOMMENDATIONS, DEFAULT_CANVAS_PAGE_SIZE, MAX_CANVAS_PAGE_SIZE,
    canvasBoardPage, canvasDiagnostic, canvasItemDetail, validateCanvasReadInput,
} from "./lib/state.mjs";
import { scanInventory, fingerprint, git, groupResources } from "./lib/inventory.mjs";
import { buildBatchReviewPrompt, buildWorkPrompt } from "./lib/work.mjs";
import { safeErrorSummary } from "./lib/diagnostics.mjs";

const ID = "resource-staleness-board";
const MAX_REVIEW_BATCH_SIZE = 10;
const SCAN_PROGRESS_INTERVAL_MS = 100;
const extensionDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(extensionDir, "public");
const projectDir = path.resolve(extensionDir, "..", "..", "..");
const servers = new Map();
let session;
let store;
let root;
let scanning;
let initializing;

async function initialize() {
    if (!initializing) {
        initializing = (async () => {
            root = (await git(projectDir, ["rev-parse", "--show-toplevel"])).trim();
            const canonical = process.platform === "win32" ? path.resolve(root).toLowerCase() : path.resolve(root);
            const key = createHash("sha256").update(canonical).digest("hex");
            const home = process.env.COPILOT_HOME || path.join(os.homedir(), ".copilot");
            store = await new BoardStore(path.join(home, "extensions", ID, "artifacts", `${key}.json`), root).load();
            return store;
        })();
    }
    try {
        return await initializing;
    } catch (error) {
        initializing = null;
        throw error;
    }
}

async function scan() {
    await initialize();
    if (scanning) return scanning;
    scanning = (async () => {
        try {
            const generation = await store.beginScan();
            store.progress = { completed: 0, total: null };
            store.emit();
            let lastProgressEmission = 0;
            const result = await scanInventory(root, {
                progress: (value) => {
                    store.progress = value;
                    const now = Date.now();
                    if (now - lastProgressEmission >= SCAN_PROGRESS_INTERVAL_MS) {
                        lastProgressEmission = now;
                        store.emit();
                    }
                },
            });
            await store.sync({ ...result, generation });
            return store.snapshot();
        } finally {
            store.progress = null;
            store.emit();
            scanning = null;
        }
    })();
    return scanning;
}

async function checkContent(id) {
    const item = store.item(id);
    const tracked = (await git(root, ["ls-files", "-z", "--", id])).split("\0").filter(Boolean);
    const current = groupResources(tracked).find((entry) => entry.id === id);
    const observedFingerprint = current ? await fingerprint(root, current.files) : null;
    if (!current || observedFingerprint !== item.fingerprint) {
        throw new Error("The resource changed since the scan. Scan again before requesting or recording work.");
    }
    return observedFingerprint;
}

async function requestWork(input, instanceId, send) {
    if (input.kind === "publish" && !send) {
        throw new Error("Publishing is available only through the UI after confirming Publish PR.");
    }
    await store.load();
    const observedFingerprint = await checkContent(input.id);
    const item = await store.queue(input.id, input.kind, input.confirmed, input.diffHash, observedFingerprint);
    const instructions = buildWorkPrompt({ item, instanceId, historyComplete: !store.snapshot().warning });
    if (send) {
        try {
            await session.send({ prompt: instructions });
        } catch (error) {
            await store.cancel(item.id, item.pending.token,
                `Dispatch failed or receipt is uncertain: ${safeErrorSummary(error)}. Inspect the retained child before retrying, especially publication.`);
            throw error;
        }
    }
    return { token: item.pending.token, instructions, childSessionId: item.childSessionId };
}

async function requestReviews(input, instanceId, send) {
    if (!Array.isArray(input.ids) || !input.ids.length || input.ids.some((id) => typeof id !== "string" || !id.trim()) ||
        new Set(input.ids).size !== input.ids.length) {
        throw new Error("Choose one or more unique resource IDs for batch review.");
    }
    if (input.ids.length > MAX_REVIEW_BATCH_SIZE) {
        throw new Error(`Review at most ${MAX_REVIEW_BATCH_SIZE} resources per batch.`);
    }
    await store.load();
    const observedFingerprints = new Map();
    for (const id of input.ids) observedFingerprints.set(id, await checkContent(id));
    const items = await store.queueReviews(input.ids, observedFingerprints);
    const instructions = buildBatchReviewPrompt({ items, instanceId, historyComplete: !store.snapshot().warning });
    if (send) {
        try {
            await session.send({ prompt: instructions });
        } catch (error) {
            await store.cancelReviews(items,
                `Batch dispatch failed or receipt is uncertain: ${safeErrorSummary(error)}. Inspect retained children before retrying.`);
            throw error;
        }
    }
    return {
        requests: items.map((item) => ({ id: item.id, token: item.pending.token, childSessionId: item.childSessionId })),
        instructions,
    };
}

async function dispatch(action, input = {}, instanceId, send = false) {
    if (!send && (action === "get_board" || action === "get_item")) validateCanvasReadInput(action, input);
    await initialize();
    if (action === "get_board") {
        await store.load();
        const snapshot = store.snapshot();
        return send ? snapshot : canvasBoardPage(snapshot, {
            offset: input.offset ?? 0,
            limit: input.limit ?? DEFAULT_CANVAS_PAGE_SIZE,
        });
    }
    if (action === "get_item") {
        await store.load();
        return canvasItemDetail(store.snapshot(), input.id);
    }
    if (action === "scan") {
        const snapshot = await scan();
        return send ? snapshot : compactSnapshot(snapshot);
    }
    if (action === "request_work") return requestWork(input, instanceId, send);
    if (action === "request_reviews") return requestReviews(input, instanceId, send);
    if (action === "record_session") {
        const snapshot = await store.recordSession(input.id, input.token, input.childSessionId);
        return send ? snapshot : compactSnapshot(snapshot, input.id);
    }
    if (action === "record_result") {
        await store.load();
        const observedFingerprint = input.error ? null : await checkContent(input.id);
        const snapshot = await store.result(input, observedFingerprint);
        return send ? snapshot : compactSnapshot(snapshot, input.id);
    }
    if (action === "cancel_work") {
        const snapshot = await store.cancel(input.id, input.token);
        return send ? snapshot : compactSnapshot(snapshot, input.id);
    }
    throw new Error("Unknown board action.");
}

function compactSnapshot(snapshot, id) {
    const result = { counts: snapshot.counts, total: snapshot.items.length, updatedAt: snapshot.updatedAt };
    const warning = canvasDiagnostic(snapshot.warning, "warning");
    if (warning) result.warning = warning;
    if (id) result.item = canvasItemDetail(snapshot, id).item;
    return result;
}

function safeHttpError(error) {
    return safeErrorSummary(error);
}

const text = { type: "string", minLength: 1 };
const identity = { id: text, token: text };
const review = {
    type: "object", additionalProperties: false,
    required: ["recommendation", "rationale", "improvements", "capabilityEvidence", "stalenessAssessment"],
    properties: {
        recommendation: { type: "string", enum: RECOMMENDATIONS },
        rationale: text, improvements: text, capabilityEvidence: text, stalenessAssessment: text,
    },
};
const schemas = {
    get_board: { properties: {
        offset: { type: "integer", minimum: 0 },
        limit: { type: "integer", minimum: 1, maximum: MAX_CANVAS_PAGE_SIZE },
    } },
    get_item: { required: ["id"], properties: { id: text } },
    scan: {},
    request_reviews: { required: ["ids"], properties: {
        ids: { type: "array", minItems: 1, maxItems: MAX_REVIEW_BATCH_SIZE, uniqueItems: true, items: text },
    } },
    request_work: { required: ["id", "kind"], properties: {
        id: text, kind: { type: "string", enum: WORK_KINDS.filter((kind) => kind !== "publish") },
    } },
    record_session: { required: ["id", "token", "childSessionId"], properties: { ...identity, childSessionId: text } },
    record_result: { required: ["id", "token"], properties: {
        ...identity, review, summary: text, diffHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
        baseSha: { type: "string", pattern: "^[a-f0-9]{40,64}$" }, url: text, error: text,
    } },
    cancel_work: { required: ["id", "token"], properties: identity },
};
const descriptions = {
    get_board: "Read a bounded page of resource summaries. Use offset and limit to paginate. Full review prose and prepared summaries are available only in the local UI.",
    get_item: "Read one resource's tracked file list and allowlisted lifecycle metadata. Full review prose and prepared summaries are available only in the local UI.",
    scan: "Scan local tracked resources and meaningful Git history. Never fetches or writes to GitHub.",
    request_work: "Queue review or local preparation in a reusable child session. Publication is available only through the UI after explicit confirmation.",
    request_reviews: "Queue read-only background reviews for selected resource IDs atomically; return routing instructions for reusable child sessions.",
    record_session: "Persist the actual child-session ID for a queued resource; never replace an existing child's context.",
    record_result: "Record one child result using its current work token; reject cancelled or changed-content results.",
    cancel_work: "Invalidate a queued result locally. Does not stop the child or undo any remote action.",
};

session = await joinSession({
    canvases: [createCanvas({
        id: ID,
        displayName: "Resource Staleness Board",
        description: "Review local resource age, propose evidence-based refreshes or removals, and prepare changes in reusable child sessions.",
        inputSchema: { type: "object", additionalProperties: false, properties: {} },
        actions: Object.entries(schemas).map(([name, schema]) => ({
            name, description: descriptions[name],
            inputSchema: { type: "object", additionalProperties: false, properties: {}, ...schema },
            handler: async (ctx) => {
                try {
                    return await dispatch(name, ctx.input, ctx.instanceId);
                } catch (error) {
                    throw new CanvasError("staleness_board_error", error.message);
                }
            },
        })),
        open: async (ctx) => {
            await initialize();
            let server = servers.get(ctx.instanceId);
            if (!server) {
                const routes = Object.fromEntries(["get_board", "scan", "request_work", "request_reviews", "cancel_work"].map((action) => [
                    `${action === "get_board" ? "GET" : "POST"} /api/${action}`,
                    async ({ body }) => {
                        try {
                            return await dispatch(action, body, ctx.instanceId, true);
                        } catch (error) {
                            const summary = safeHttpError(error);
                            session.log(`Staleness board ${action}: ${summary}`, { level: "warning" });
                            throw expectedError(summary, 400);
                        }
                    },
                ]));
                routes["POST /api/read_file"] = async ({ body }) => {
                    try {
                        await initialize();
                        return await readResourceFile(root, store.item(body?.id), body?.file);
                    } catch (error) {
                        const summary = safeHttpError(error);
                        session.log(`Staleness board read_file: ${summary}`, { level: "warning" });
                        throw expectedError(summary, 400);
                    }
                };
                server = await startBoardServer({
                    publicDir,
                    api: {
                        snapshot: () => store.snapshot(),
                        subscribe: (listener) => store.subscribe(listener), routes,
                        logger: { error: (message, error) => session.log(
                            `Staleness board HTTP server: ${safeHttpError(error ?? message)}`, { level: "error" },
                        ) },
                    },
                });
                servers.set(ctx.instanceId, server);
            }
            return { title: "Resource staleness", url: server.url, status: "Local only until Publish PR is confirmed" };
        },
        onClose: async (ctx) => {
            const server = servers.get(ctx.instanceId);
            servers.delete(ctx.instanceId);
            if (server) await server.close();
        },
    })],
});
