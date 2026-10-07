import { joinSession, createCanvas, CanvasError } from "@github/copilot-sdk/extension";
import { ReviewStore, schemas } from "./review.mjs";
import { startServer } from "./server.mjs";

const panels = new Map();
let store;
let session;

function documentFor(ctx, allowEmpty = false) {
    const panel = panels.get(ctx.instanceId);
    if (panel && !panel.reviewUrl && allowEmpty) return null;
    if (!panel?.reviewUrl) throw new Error("Load a pull request first.");
    return store.get(panel.reviewUrl);
}

function action(name, description, inputSchema, handler) {
    return {
        name, description, inputSchema,
        handler: async (ctx) => {
            try {
                return await handler(documentFor(ctx, name === "get_state"), ctx.input);
            } catch (error) {
                throw new CanvasError("pr_review_error", error.message);
            }
        },
    };
}

session = await joinSession({
    canvases: [createCanvas({
        id: "pr-review",
        displayName: "PR Review",
        description: "Open a GitHub PR link, review AI-grouped changes, and ask Copilot about a group, file, or diff hunk.",
        inputSchema: {
            type: "object", additionalProperties: false,
            properties: { url: { type: "string", description: "Direct HTTPS GitHub pull request link." } },
        },
        actions: [
            action("get_state", "Read review metadata, groups, and pending request; patches are omitted.", schemas.empty,
                (doc) => doc ? store.summary(doc) : { url: null, snapshot: null, pending: null }),
            action("get_request", "Read the exact pending task and its pinned, untrusted source context.", schemas.request,
                (doc, input) => store.requestContext(doc, input.requestId)),
            action("set_metadata", "Start staging a verified PR snapshot for the pending load request.", schemas.metadata,
                (doc, input) => store.setMetadata(doc, input)),
            action("add_files", "Stage a batch of actual GitHub file records and patch excerpts. Never invent missing patches.", schemas.files,
                (doc, input) => store.addFiles(doc, input)),
            action("finish_review", "Publish AI groups after staging every changed file and rechecking the exact base/head SHAs.", schemas.finish,
                (doc, input) => store.finish(doc, input)),
            action("answer_question", "Save an evidence-based answer to the exact pending question and source revision.", schemas.answer,
                (doc, input) => store.answer(doc, input)),
            action("fail_request", "Show an explicit load or question failure in the canvas.", schemas.failure,
                (doc, input) => store.fail(doc, input)),
        ],
        open: async (ctx) => {
            if (!store) throw new CanvasError("not_ready", "The extension is still starting. Retry opening it.");
            let panel = panels.get(ctx.instanceId);
            if (!panel) {
                panel = await startServer({
                    store, instanceId: ctx.instanceId,
                    send: (options) => session.send(options),
                    log: (message) => session.log(message, { level: "error" }),
                });
                panels.set(ctx.instanceId, panel);
            }
            const savedUrl = ctx.input?.url || store.viewUrl(ctx.instanceId);
            if (savedUrl && !panel.reviewUrl) await panel.load(savedUrl, false);
            return { title: "PR Review", url: panel.url };
        },
        onClose: async (ctx) => {
            const panel = panels.get(ctx.instanceId);
            if (panel) {
                panels.delete(ctx.instanceId);
                await panel.close();
            }
        },
    })],
});

if (!session.workspacePath) throw new Error("PR Review needs the session workspace to save review snapshots.");
store = new ReviewStore(session.workspacePath);
