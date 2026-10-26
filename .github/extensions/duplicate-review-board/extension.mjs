import path from "node:path";
import { fileURLToPath } from "node:url";
import { joinSession, createCanvas, CanvasError } from "@github/copilot-sdk/extension";
import { startBoardServer, expectedError } from "../open-pr-board/lib/server.mjs";
import { BoardStore } from "./lib/state.mjs";
import { createGitHub } from "./lib/github.mjs";
import { Publisher } from "./lib/publish.mjs";
import { buildReviewPrompt } from "./lib/review.mjs";

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "public");
const panels = new Map();
const github = createGitHub();
let store;
let publisher;
let session;

const object = (properties = {}, required = []) => ({ type: "object", additionalProperties: false, properties, required });
const identity = { number: { type: "integer", minimum: 1 }, id: { type: "string", pattern: "^[a-f0-9]{24}$" } };
const reviewIdentity = { ...identity, queueId: { type: "string", minLength: 1 } };
const pick = (value, fields) => Object.fromEntries(fields.filter((field) => Object.hasOwn(value, field)).map((field) => [field, value[field]]));
function agentSnapshot(snapshot) {
    return {
        ...pick(snapshot, ["repo", "selected", "snapshotSequence"]),
        columns: snapshot.columns.map((column) => pick(column, ["id", "label"])),
        reports: snapshot.reports.map((report) => pick(report, ["number", "title", "url", "state", "importedAt"])),
        items: snapshot.items.map((item) => ({
            ...pick(item, [
                "id", "number", "title", "reason", "accepted", "fingerprint", "removed", "column",
                "queueId", "agentId", "reviewError", "changed", "revision",
            ]),
            resources: item.resources.map((resource) => pick(resource, ["path", "type", "description"])),
            review: item.review && pick(item.review, ["recommendation", "rationale", "at"]),
            publication: item.publication && pick(item.publication, ["kind", "status", "at", "url"]),
        })),
    };
}

async function startReview(number, id, instanceId, guidance = "") {
    if (typeof guidance !== "string" || guidance.length > 4000) throw new Error("Guidance must be at most 4000 characters.");
    const item = await store.queue(number, id);
    try {
        if (!session.rpc.tasks?.startAgent) throw new Error("This runtime does not support background agent tasks. Update Copilot; foreground fallback is disabled.");
        const { agentId } = await session.rpc.tasks.startAgent({
            agentType: "general-purpose",
            name: `duplicate-group-${item.number}`,
            description: `Compare duplicate report #${number}, group ${item.number}`,
            prompt: buildReviewPrompt({ number, item, instanceId, guidance }),
        });
        await store.attachAgent(number, id, item.queueId, agentId);
        return { queued: item.id, queueId: item.queueId, agentId };
    } catch (error) {
        if (store.item(number, id).queueId === item.queueId) {
            await store.finish(number, id, item.queueId, { error: `Could not dispatch background review: ${error.message}` });
        }
        throw error;
    }
}

const resourceCache = new Map();
const MAX_RESOURCE_CHARS = 200_000;

async function readResource({ number, id, path: file }) {
    const item = store.item(number, id);
    if (!item.resources.some((resource) => resource.path === file)) throw new Error("That file is not part of this duplicate group.");
    const cached = resourceCache.get(file);
    if (cached && Date.now() - cached.at < 10 * 60_000) return cached.value;
    const content = await github.content(file);
    const value = {
        path: file, ref: "main",
        content: content.slice(0, MAX_RESOURCE_CHARS),
        truncated: content.length > MAX_RESOURCE_CHARS,
    };
    resourceCache.set(file, { at: Date.now(), value });
    return value;
}

const operations = {
    reports: () => github.list(),
    resource: readResource,
    import: async ({ number }) => store.import(await github.get(number)),
    select: ({ number }) => store.select(number),
    update: ({ number, id, ...changes }) => store.update(number, id, changes),
    cancel: ({ number, id }) => store.cancel(number, id),
    preview: ({ number, id }) => publisher.preview(number, id),
    publish: ({ token }) => publisher.publish(token),
    reconcile: ({ number, id }) => publisher.reconcile(number, id),
};

function action(name, description, inputSchema, handler) {
    return {
        name, description, inputSchema,
        handler: async (ctx) => {
            try {
                if (!store) throw new Error("The duplicate review board is still starting.");
                return await handler(ctx.input ?? {}, ctx);
            } catch (error) {
                throw new CanvasError("duplicate_board_error", error.message);
            }
        },
    };
}

session = await joinSession({
    canvases: [createCanvas({
        id: "duplicate-review-board",
        displayName: "Duplicate Review Board",
        description: "Triage duplicate-resource reports locally, compare groups in background agents, and preview confirmed acceptance or consolidation actions.",
        inputSchema: object(),
        actions: [
            action("get_board", "Read local reports, groups, decisions, AI reviews, and publication receipts; private notes and issue drafts are omitted.", object(), () => agentSnapshot(store.snapshot())),
            action("list_reports", "List duplicate-review report issues without importing or changing them.", object(), operations.reports),
            action("import_report", "Read a report from GitHub; preserve unchanged local decisions and flag changed groups. Private notes and issue drafts are omitted.", object({ number: identity.number }, ["number"]), async (input) => agentSnapshot(await operations.import(input))),
            action("read_resource", "Read a resource file in a group from the main branch, without changing GitHub or local state.", object({
                ...identity, path: { type: "string", minLength: 1, maxLength: 300 },
            }, ["number", "id", "path"]), operations.resource),
            action("select_report", "Switch to a previously imported local report, without accessing GitHub. Private notes and issue drafts are omitted.", object({ number: identity.number }, ["number"]), async (input) => agentSnapshot(await operations.select(input))),
            action("start_review", "Dispatch a read-only comparison through a background agent only; never review in the foreground.", object({
                ...identity, guidance: { type: "string", maxLength: 4000 },
            }, ["number", "id"]), (input, ctx) => startReview(input.number, input.id, ctx.instanceId, input.guidance)),
            action("record_review", "Record the exact queued background result without changing the maintainer's decision.", object({
                ...reviewIdentity, recommendation: { type: "string", enum: ["separate", "consolidate", "deferred"] },
                rationale: { type: "string", minLength: 1, maxLength: 16000 },
            }, ["number", "id", "queueId", "recommendation", "rationale"]), async (input) => agentSnapshot(await store.finish(input.number, input.id, input.queueId, input))),
            action("fail_review", "Record an explicit background-review failure for the matching queue token.", object({
                ...reviewIdentity, error: { type: "string", minLength: 1, maxLength: 4000 },
            }, ["number", "id", "queueId", "error"]), async (input) => agentSnapshot(await store.finish(input.number, input.id, input.queueId, input))),
        ],
        open: async (ctx) => {
            if (!store) throw new CanvasError("not_ready", "The board is still starting. Retry opening it.");
            let panel = panels.get(ctx.instanceId);
            if (!panel) {
                const routes = {
                    "GET /api/board": () => store.snapshot(),
                    ...Object.fromEntries(Object.entries(operations).map(([name, handler]) => [`POST /api/${name}`, ({ body }) => handler(body)])),
                    "POST /api/review": ({ body }) => startReview(body.number, body.id, ctx.instanceId, body.guidance),
                };
                const wrapped = Object.fromEntries(Object.entries(routes).map(([key, handler]) => [key, async (args) => {
                    try { return await handler(args); }
                    catch (error) {
                        session.log(`Duplicate board ${key}: ${error.stack ?? error}`, { level: "warning", ephemeral: true });
                        throw expectedError(error.message, 400);
                    }
                }]));
                // This loopback token is not a trusted caller identity: same-user local agents can fetch the page and token.
                // Keep human confirmation as UI workflow, not authorization; the SDK exposes no authenticated caller context.
                panel = await startBoardServer({
                    publicDir,
                    api: {
                        snapshot: () => store.snapshot(), subscribe: (listener) => store.subscribe(listener), routes: wrapped,
                        logger: { error: (message, error) => session.log(`${message}: ${error}`, { level: "error" }) },
                    },
                });
                panels.set(ctx.instanceId, panel);
            }
            return { title: "Duplicate review board", url: panel.url };
        },
        onClose: async (ctx) => {
            const panel = panels.get(ctx.instanceId);
            panels.delete(ctx.instanceId);
            await panel?.close();
        },
    })],
});

if (!session.workspacePath) throw new Error("Duplicate Review Board requires a session workspace for persistent local state.");
store = await new BoardStore(path.join(session.workspacePath, "extensions", "duplicate-review-board", "state", "board.json")).load();
publisher = new Publisher(store, github);
