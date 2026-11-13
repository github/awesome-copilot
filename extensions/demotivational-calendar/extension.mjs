import { createCanvas, joinSession } from "@github/copilot-sdk/extension";
import { startCalendarServer, today } from "./server.mjs";

const panels = new Map();
const emptyInput = { type: "object", properties: {}, additionalProperties: false };

await joinSession({
    canvases: [createCanvas({
        id: "demotivational-calendar",
        displayName: "The Daily Letdown",
        description: "A yearless daily tear-off calendar with an original English demotivational quote for every date.",
        inputSchema: emptyInput,
        actions: [{
            name: "get_today",
            description: "Read today's calendar page and demotivational quote.",
            inputSchema: emptyInput,
            handler: () => today(),
        }],
        open: async ctx => {
            let panel = panels.get(ctx.instanceId);
            if (!panel) {
                panel = startCalendarServer();
                panels.set(ctx.instanceId, panel);
                try {
                    await panel;
                } catch (error) {
                    panels.delete(ctx.instanceId);
                    throw error;
                }
            }
            return { title: "The Daily Letdown", url: (await panel).url };
        },
        onClose: async ctx => {
            const panel = panels.get(ctx.instanceId);
            panels.delete(ctx.instanceId);
            if (panel) await (await panel).close();
        },
    })],
});
