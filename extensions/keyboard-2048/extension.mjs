import { join } from "node:path";
import { createCanvas, CanvasError, joinSession } from "@github/copilot-sdk/extension";
import { createGameStore, startGameServer } from "./server.mjs";

const panels = new Map();
let storePromise;
let session;
function store() {
    if (!session?.workspacePath) {
        throw new CanvasError("workspace_unavailable", "Session workspace is unavailable.");
    }
    if (!storePromise) {
        storePromise = createGameStore(join(session.workspacePath, "2048-save.json"))
            .catch(error => { storePromise = undefined; throw error; });
    }
    return storePromise;
}
const emptyInput = { type: "object", properties: {}, additionalProperties: false };

session = await joinSession({
    canvases: [createCanvas({
        id: "keyboard-2048",
        displayName: "2048",
        description: "Play 2048 with arrow keys or WASD, undo the last move, and resume your saved game.",
        inputSchema: emptyInput,
        actions: [
            {
                name: "get_state",
                description: "Read the board, score, and Undo availability.",
                inputSchema: emptyInput,
                handler: async () => (await store()).snapshot(),
            },
            {
                name: "move",
                description: "Move the tiles in a direction.",
                inputSchema: {
                    type: "object",
                    properties: { direction: { type: "string", enum: ["left", "right", "up", "down"] } },
                    required: ["direction"],
                    additionalProperties: false,
                },
                handler: async ctx => (await store()).execute("move", ctx.input.direction),
            },
            {
                name: "undo",
                description: "Undo only the last valid move, restoring the score and removing the spawned tile.",
                inputSchema: emptyInput,
                handler: async () => (await store()).execute("undo"),
            },
            {
                name: "new_game",
                description: "Start a new game, keeping the session's best score.",
                inputSchema: emptyInput,
                handler: async () => (await store()).execute("new"),
            },
        ],
        open: async ctx => {
            let panel = panels.get(ctx.instanceId);
            if (!panel) {
                panel = startGameServer(await store());
                panels.set(ctx.instanceId, panel);
                try { await panel; }
                catch (error) { panels.delete(ctx.instanceId); throw error; }
            }
            return { url: (await panel).url, title: "2048 · Keyboard edition" };
        },
        onClose: async ctx => {
            const panel = panels.get(ctx.instanceId);
            panels.delete(ctx.instanceId);
            if (panel) await (await panel).close();
        },
    })],
});
