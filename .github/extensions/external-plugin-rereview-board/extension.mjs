import path from "node:path";
import { fileURLToPath } from "node:url";
import { CanvasError, joinSession as sdkJoinSession, createCanvas as sdkCreateCanvas } from "@github/copilot-sdk/extension";
import { configureErrorHandoff, createServer } from "./error-handoff.mjs";
import { startBoardServer, expectedError } from "../open-pr-board/lib/server.mjs";
import { BoardStore } from "./lib/state.mjs";
import { createGitHub } from "./lib/github.mjs";
import { Publisher } from "./lib/publish.mjs";
import { buildReviewPrompt } from "./lib/review.mjs";

const { joinSession, createCanvas } = configureErrorHandoff({ joinSession: sdkJoinSession, createCanvas: sdkCreateCanvas });
const panels = new Map();
const github = createGitHub();
const extensionDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(extensionDir, "public");
const icon = path.join(extensionDir, "assets", "icon.png");
let store;
let publisher;
let session;
const object = (properties = {}, required = []) => ({ type: "object", additionalProperties: false, properties, required });
const positive = { type: "integer", minimum: 1 };
const identity = { number: positive, id: positive };
const queued = { ...identity, queueId: { type: "string", minLength: 1 } };
const guidance = { type: "string", maxLength: 4000 };

async function startReview(input, ctx) {
    const { number, id } = input;
    if (input.guidance !== undefined && (typeof input.guidance !== "string" || input.guidance.length > 4000)) {
        throw new Error("Review guidance must be at most 4000 characters.");
    }
    const item = await store.queue(number, id);
    try {
        if (!session.rpc.tasks?.startAgent) throw new Error("This runtime does not support background agents; no foreground fallback is used.");
        const { agentId } = await session.rpc.tasks.startAgent({
            agentType: "general-purpose", name: `plugin-rereview-${id}`,
            description: `Six-month plugin review for submission #${id}`,
            prompt: buildReviewPrompt({ number, item, instanceId: ctx.instanceId, guidance: input.guidance }),
        });
        if (!agentId) throw new Error("Background dispatch returned no agent ID.");
        await store.attachAgent(number, id, item.queueId, agentId);
        return { id, queueId: item.queueId, agentId };
    } catch (error) {
        if (store.item(number, id).queueId === item.queueId) {
            await store.finish(number, id, item.queueId, { error: `Could not dispatch review: ${error.message}` });
        }
        throw error;
    }
}

const operations = {
    reports: () => github.list(),
    import: async ({ number }) => store.import(await github.load(number)),
    select: ({ number }) => store.select(number),
    update: ({ number, id, ...changes }) => store.update(number, id, changes),
    cancel: ({ number, id }) => store.cancel(number, id),
    preview: ({ number, id }) => publisher.preview(number, id),
    publish: ({ token }) => publisher.publish(token),
    reconcile: ({ number, id }) => publisher.reconcile(number, id),
    followup: ({ number, id }) => publisher.followup(number, id),
};
function action(name, description, inputSchema, handler) {
    return {
        name, description, inputSchema,
        handler: async (ctx) => {
            try {
                if (!store) throw new Error("Re-review board is still starting.");
                return await handler(ctx.input ?? {}, ctx);
            } catch (error) {
                throw new CanvasError("plugin_rereview_error", error.message);
            }
        },
    };
}
session = await joinSession({
    canvases: [createCanvas({
        id: "external-plugin-rereview-board",
        displayName: "External Plugin Re-review Board",
        icon,
        description: "Triage six-month external-plugin review reports, inspect submissions and current listings, run read-only background reviews, and preview confirmed maintainer commands.",
        inputSchema: object(),
        actions: [
            action("get_board", "Read report evidence and background results; private notes and staged public reasons are omitted.", object(), () => store.snapshot({ agent: true })),
            action("list_reports", "Discover open six-month review report issues, read-only.", object(), operations.reports),
            action("import_report", "Import a report and current main-branch catalog/submission evidence; private drafts are omitted.", object({ number: positive }, ["number"]), async (input) => {
                await operations.import(input);
                return store.snapshot({ agent: true });
            }),
            action("select_report", "Select an imported report without accessing GitHub.", object({ number: positive }, ["number"]), async (input) => {
                await operations.select(input);
                return store.snapshot({ agent: true });
            }),
            action("start_review", "Dispatch one read-only native background review; never review in the foreground.", object({ ...identity, guidance }, ["number", "id"]), startReview),
            action("record_review", "Record the queued background recommendation, without changing the maintainer's decision.", object({
                ...queued, recommendation: { type: "string", enum: ["keep", "needs-changes", "remove"] },
                rationale: { type: "string", minLength: 1, maxLength: 16000 },
            }, ["number", "id", "queueId", "recommendation", "rationale"]), async ({ number, id, queueId, ...result }) => {
                await store.finish(number, id, queueId, result);
                return store.snapshot({ agent: true });
            }),
            action("fail_review", "Record an explicit background failure for the exact queued token.", object({
                ...queued, error: { type: "string", minLength: 1, maxLength: 4000 },
            }, ["number", "id", "queueId", "error"]), async ({ number, id, queueId, error }) => {
                await store.finish(number, id, queueId, { error });
                return store.snapshot({ agent: true });
            }),
        ],
        open: async (ctx) => {
            if (!store) throw new CanvasError("not_ready", "The board is still starting; retry opening it.");
            let panel = panels.get(ctx.instanceId);
            if (!panel) {
                const routes = {
                    "GET /api/board": () => store.snapshot(),
                    ...Object.fromEntries(Object.entries(operations).map(([name, handler]) => [`POST /api/${name}`, ({ body }) => handler(body)])),
                    "POST /api/review": ({ body }) => startReview(body, ctx),
                };
                panel = await startBoardServer({
                    publicDir, serverFactory: createServer,
                    api: {
                        snapshot: () => store.snapshot(), subscribe: (listener) => store.subscribe(listener),
                        routes: Object.fromEntries(Object.entries(routes).map(([key, handler]) => [key, async (args) => {
                            try { return await handler(args); }
                            catch (error) {
                                session.log(`Plugin re-review ${key}: ${error.stack ?? error}`, { level: "warning", ephemeral: true });
                                throw expectedError(error.message, 400);
                            }
                        }])),
                        logger: { error: (message, error) => session.log(`${message}: ${error}`, { level: "error" }) },
                    },
                });
                panels.set(ctx.instanceId, panel);
            }
            return { title: "External plugin re-review", url: panel.url };
        },
        onClose: async (ctx) => {
            const panel = panels.get(ctx.instanceId);
            panels.delete(ctx.instanceId);
            await panel?.close();
        },
    })],
});
if (!session.workspacePath) throw new Error("External Plugin Re-review Board requires a session workspace for persistent state.");
store = await new BoardStore(path.join(session.workspacePath, "extensions", "external-plugin-rereview-board", "state", "board.json")).load();
publisher = new Publisher(store, github);
