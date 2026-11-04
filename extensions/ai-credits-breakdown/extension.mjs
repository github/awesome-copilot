// Extension: ai-credits-breakdown
// A detailed, private view of your own GitHub Copilot AI credit usage, built on this computer
// from the telemetry the Copilot CLI and Copilot app already keep in ~/.copilot.
import { joinSession, createCanvas, CanvasError } from "@github/copilot-sdk/extension";
import { buildLedger, summarizeLedger } from "./collector.mjs";
import { startServer, stopServer } from "./server.mjs";

const PERIODS = ["mtd", "7d", "30d", "90d", "all"];
const LEDGER_TTL_MS = 3_000;

// Concurrent requests share one build, and a build is reused for a few seconds (for example when the
// agent asks for a summary right after the panel loads). Anything older is read afresh.
let ledger = null, ledgerAt = 0, building = null;
function getLedger() {
    if (ledger && Date.now() - ledgerAt < LEDGER_TTL_MS) return Promise.resolve(ledger);
    building ||= buildLedger().then((built) => {
        ledger = built;
        ledgerAt = Date.now();
        return built;
    }).finally(() => { building = null; });
    return building;
}

const servers = new Map(); // instanceId -> { server, url }
const day = { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" };

const session = await joinSession({
    canvases: [
        createCanvas({
            id: "ai-credits-breakdown",
            displayName: "AI Credits Breakdown",
            description: "A detailed view of your own GitHub Copilot AI credit usage: dollars by day, repository, model, surface, call type and prompt-cache state, built locally from your Copilot telemetry.",
            inputSchema: {
                type: "object",
                properties: { period: { type: "string", enum: PERIODS, description: "Initial period: this month to date (default), last 7/30/90 days, or all time." } },
            },
            actions: [
                {
                    name: "get_summary",
                    description: "Summarize the user's own AI credit usage for a UTC day range: totals in credits and USD, top models, repositories, surfaces, call types, prompt-cache states and busiest days. Defaults to all recorded usage. Session ids, prompts and titles are not included.",
                    inputSchema: { type: "object", properties: { from: day, to: day } },
                    handler: async (ctx) => {
                        try {
                            const { from, to } = ctx.input || {};
                            return summarizeLedger(await getLedger(), { from, to });
                        } catch (error) {
                            throw new CanvasError("usage_unavailable", error.message);
                        }
                    },
                },
            ],
            open: async (ctx) => {
                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    entry = await startServer({
                        getLedger,
                        onError: (error) => session?.log(`ai-credits-breakdown could not read usage: ${error.message}`, { level: "warning", ephemeral: true }),
                    });
                    servers.set(ctx.instanceId, entry);
                }
                const period = ctx.input?.period;
                const url = PERIODS.includes(period) && period !== "mtd" ? `${entry.url}#p=${period}` : entry.url;
                return { title: "AI Credits Breakdown", url };
            },
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (!entry) return;
                servers.delete(ctx.instanceId);
                await stopServer(entry);
            },
        }),
    ],
});
