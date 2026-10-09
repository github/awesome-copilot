import { joinSession, createCanvas, CanvasError } from "@github/copilot-sdk/extension";
import { createGitHubClient } from "./github.mjs";
import { ReviewStore, schemas } from "./review.mjs";
import { startServer } from "./server.mjs";

const panels = new Map();
let store;
let session;
const github = createGitHubClient();

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
                return await handler(documentFor(ctx, name === "get_state"), ctx.input, ctx);
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
            action("finish_review", "Publish groups after the extension verifies the PR revision against GitHub.", schemas.finish,
                (doc, input, ctx) => panels.get(ctx.instanceId).finish(doc, input)),
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
                    github,
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
