import path from "node:path";
import os from "node:os";
import { readResourceFile } from "./lib/preview.mjs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { joinSession, createCanvas, CanvasError } from "@github/copilot-sdk/extension";
import { startBoardServer, expectedError } from "../open-pr-board/lib/server.mjs";
import { BoardStore, WORK_KINDS, RECOMMENDATIONS } from "./lib/state.mjs";
import { scanInventory, fingerprint, git, groupResources } from "./lib/inventory.mjs";
import { buildBatchReviewPrompt, buildWorkPrompt } from "./lib/work.mjs";

const ID = "resource-staleness-board";
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
            store.progress = { completed: 0, total: null };
            store.emit();
            return await store.sync(await scanInventory(root, {
                progress: (value) => { store.progress = value; store.emit(); },
            }));
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
    const observedFingerprint = await checkContent(input.id);
    const item = await store.queue(input.id, input.kind, input.confirmed, input.diffHash, observedFingerprint);
    const instructions = buildWorkPrompt({ item, instanceId, root });
    if (send) {
        try {
            await session.send({ prompt: instructions });
        } catch (error) {
            await store.cancel(item.id, item.pending.token,
                `Dispatch failed or receipt is uncertain: ${error.message}. Inspect the retained child before retrying, especially publication.`);
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
    await store.load();
    const observedFingerprints = new Map();
    for (const id of input.ids) observedFingerprints.set(id, await checkContent(id));
    const items = await store.queueReviews(input.ids, observedFingerprints);
    const instructions = buildBatchReviewPrompt({ items, instanceId, root });
    if (send) {
        try {
            await session.send({ prompt: instructions });
        } catch (error) {
            await store.cancelReviews(items,
                `Batch dispatch failed or receipt is uncertain: ${error.message}. Inspect retained children before retrying.`);
            throw error;
        }
    }
    return {
        requests: items.map((item) => ({ id: item.id, token: item.pending.token, childSessionId: item.childSessionId })),
        instructions,
    };
}

async function dispatch(action, input = {}, instanceId, send = false) {
    await initialize();
    if (action === "get_board") { await store.load(); return store.snapshot(); }
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
    if (snapshot.warning) result.warning = snapshot.warning;
    if (id) result.item = snapshot.items.find((item) => item.id === id) ?? null;
    return result;
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
    get_board: {}, scan: {},
    request_reviews: { required: ["ids"], properties: {
        ids: { type: "array", minItems: 1, uniqueItems: true, items: text },
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
    get_board: "Read the local inventory, recommendations, pending work, and retained child-session links.",
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
                            session.log(`Staleness board ${action}: ${error.stack}`, { level: "warning" });
                            throw expectedError(error.message, 400);
                        }
                    },
                ]));
                routes["POST /api/read_file"] = async ({ body }) => {
                    try {
                        await initialize();
                        return await readResourceFile(root, store.item(body?.id), body?.file);
                    } catch (error) {
                        throw expectedError(error.message, 400);
                    }
                };
                server = await startBoardServer({
                    publicDir,
                    api: {
                        snapshot: () => store.snapshot(),
                        subscribe: (listener) => store.subscribe(listener), routes,
                        logger: { error: (message, error) => session.log(`${message}: ${error.stack}`, { level: "error" }) },
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
