import { CanvasError, createCanvas, joinSession } from "@github/copilot-sdk/extension";
import { TagManager } from "./manager.mjs";
import { canvasId, openSchema, operationSchema, remoteSchema, TagError, validate } from "./schemas.mjs";
import { startServer, stopServer } from "./server.mjs";

const instances = new Map();

async function guarded(task) {
    try {
        return await task();
    } catch (error) {
        throw new CanvasError(error.code ?? "tag_manager_failed", error.message);
    }
}

function manager(instanceId) {
    const entry = instances.get(instanceId);
    if (!entry) throw new TagError("canvas_not_open", "Open the Git Tag Manager first.");
    return entry.manager;
}

const session = await joinSession({
    canvases: [createCanvas({
        id: canvasId,
        displayName: "Git Tag Manager",
        description: "Manage local and remote Git tags with confirmed creation, single-tag pushes, and guarded deletion.",
        inputSchema: openSchema,
        actions: [
            {
                name: "refresh", description: "Refresh and return local and remote tags without modifying Git refs.",
                handler: ctx => guarded(() => manager(ctx.instanceId).refresh()),
            },
            {
                name: "select_remote", description: "Select a configured remote and save the repository preference.",
                inputSchema: remoteSchema,
                handler: ctx => guarded(() => {
                    validate(ctx.input, remoteSchema);
                    return manager(ctx.instanceId).selectRemote(ctx.input.remote);
                }),
            },
            {
                name: "prepare_operation",
                description: "Preview creation, push, or deletion for user confirmation in the canvas; never executes a mutation.",
                inputSchema: operationSchema,
                handler: ctx => guarded(() => manager(ctx.instanceId).prepare(ctx.input)),
            },
        ],
        open: ctx => guarded(async () => {
            validate(ctx.input, openSchema);
            const next = await TagManager.open(ctx.input);
            let entry = instances.get(ctx.instanceId);
            if (entry) {
                if (entry.manager.repository === next.repository && entry.manager.remote === next.remote) {
                    entry.manager.snapshot = next.snapshot;
                } else {
                    entry.manager = next;
                }
            } else {
                entry = await startServer(next, message => session.log(message));
                instances.set(ctx.instanceId, entry);
            }
            return { title: "Git Tag Manager", url: entry.url, status: `${entry.manager.snapshot.tags.length} tags` };
        }),
        onClose: ctx => guarded(async () => {
            const entry = instances.get(ctx.instanceId);
            if (entry) {
                await stopServer(entry);
                instances.delete(ctx.instanceId);
            }
        }),
    })],
});
