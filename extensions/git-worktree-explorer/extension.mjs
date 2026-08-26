import { CanvasError, createCanvas, joinSession } from "@github/copilot-sdk/extension";
import { getServerEntry, refreshServer, startServer, stopServer } from "./server.mjs";

const session = await joinSession({
    canvases: [
        createCanvas({
            id: "git-worktree-explorer",
            displayName: "Git Worktree Explorer",
            description: "Explore the active Git repository through worktrees, branches, commits, and related GitHub pull requests.",
            inputSchema: {
                type: "object",
                additionalProperties: false,
                properties: {
                    startAt: {
                        type: "string",
                        enum: ["repository"],
                        description: "Initial topology level.",
                    },
                },
            },
            actions: [
                {
                    name: "refresh",
                    description: "Refresh Git and GitHub information shown by an open explorer.",
                    inputSchema: {
                        type: "object",
                        additionalProperties: false,
                        properties: {},
                    },
                    handler: async (ctx) => {
                        try {
                            const snapshot = await refreshServer(ctx.instanceId);
                            return {
                                gatheredAt: snapshot.gatheredAt,
                                worktrees: snapshot.worktrees.length,
                                branches: snapshot.branches.length,
                            };
                        } catch (error) {
                            throw new CanvasError("git_refresh_failed", error.message);
                        }
                    },
                },
                {
                    name: "focus_node",
                    description: "Ask an open explorer to focus a repository, worktree, or branch node by its canvas node ID.",
                    inputSchema: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            nodeId: { type: "string", minLength: 1 },
                        },
                        required: ["nodeId"],
                    },
                    handler: async (ctx) => {
                        const entry = getServerEntry(ctx.instanceId);
                        if (!entry) throw new CanvasError("canvas_not_open", "Canvas instance is not open.");
                        const nodeId = ctx.input?.nodeId;
                        const snapshot = entry.snapshot;
                        const exists = nodeId === "repository"
                            || snapshot.worktrees.some((item) => item.id === nodeId)
                            || snapshot.branches.some((item) => item.id === nodeId);
                        if (!exists) throw new CanvasError("git_node_not_found", `Git node not found: ${nodeId}`);
                        for (const client of entry.clients) {
                            client.write(`event: focus\ndata: ${JSON.stringify({ nodeId })}\n\n`);
                        }
                        return { nodeId };
                    },
                },
            ],
            open: async (ctx) => {
                const cwd = ctx.session?.workingDirectory;
                if (!cwd) {
                    throw new CanvasError("workspace_unavailable", "The active session working directory is unavailable.");
                }
                try {
                    const entry = await startServer(ctx.instanceId, {
                        cwd,
                        sendPrompt: async (prompt) => session.send({ prompt }),
                    });
                    return {
                        title: "Git Worktree Explorer",
                        status: `${entry.snapshot.worktrees.length} worktrees · ${entry.snapshot.branches.length} branches`,
                        url: entry.url,
                    };
                } catch (error) {
                    throw new CanvasError("git_repository_unavailable", error.message);
                }
            },
            onClose: async (ctx) => {
                await stopServer(ctx.instanceId);
            },
        }),
    ],
});
