import { computeCoachingContext } from "./db.mjs";
import { initializeInsights, listBriefs, getExperiment, updateExperiment } from "./insights.mjs";
import {
  rangeSchema,
  briefSchema,
  statusSchema,
  modelUsageSchema,
  sessionUsageSchema,
  usageSeriesSchema,
  experimentSchema,
  experimentUpdateSchema
} from "./schemas.mjs";
import { createCoach, startServer } from "./server.mjs";
import { createSnapshotStore } from "./snapshots.mjs";
function createUsageCanvas({ createCanvas, CanvasError, getSession, clock = () => /* @__PURE__ */ new Date() }) {
  initializeInsights();
  const servers = /* @__PURE__ */ new Map();
  const snapshots = createSnapshotStore({ clock, currentSessionId: () => getSession()?.sessionId || null });
  const coach = createCoach(getSession, (message, options) => getSession()?.log(message, options), { clock });
  coach.attachSnapshots(snapshots);
  const action = (handler) => async (ctx) => {
    try {
      return await handler(ctx);
    } catch (error) {
      throw new CanvasError(error.code || "chronicle_error", error.message);
    }
  };
  return createCanvas({
    id: "chronicle-stats",
    displayName: "My AI Usage",
    description: "Local Chronicle usage, token coverage, trends, and on-demand evidence-backed coaching.",
    inputSchema: rangeSchema,
    actions: [
      {
        name: "get_stats",
        description: "Read local Chronicle aggregates for 30, 90, or all calendar days.",
        inputSchema: rangeSchema,
        handler: action((ctx) => snapshots.create(ctx.input?.range || "30"))
      },
      {
        name: "get_usage_series",
        description: "Read a graph-only date window from the same frozen snapshot without changing range totals.",
        inputSchema: usageSeriesSchema,
        handler: action((ctx) => snapshots.series(ctx.input))
      },
      {
        name: "get_model_usage",
        description: "Inspect model totals and contributing sessions within an immutable usage snapshot.",
        inputSchema: modelUsageSchema,
        handler: action((ctx) => snapshots.model(ctx.input))
      },
      {
        name: "get_session_usage",
        description: "Inspect session token counters within the same snapshot and optional model scope, without reading conversation content.",
        inputSchema: sessionUsageSchema,
        handler: action((ctx) => snapshots.session(ctx.input))
      },
      {
        name: "refresh",
        description: "Return the latest local usage and saved coaching summary.",
        handler: action(() => {
          const stats = snapshots.create("all");
          return {
            sessions: stats.kpis.sessions,
            aiu: stats.kpis.aiu,
            generatedAt: stats.generatedAt,
            usageCoverage: stats.usageCoverage,
            latestBrief: listBriefs().briefs[0] || null
          };
        })
      },
      {
        name: "get_coaching_context",
        description: "Return privacy-safe usage windows and week-over-week changes for grounded coaching.",
        handler: action(() => computeCoachingContext())
      },
      {
        name: "get_chronicle_capabilities",
        description: "Check native Chronicle dispatch availability without preparing analysis or sending a model request.",
        handler: action(() => coach.capabilities())
      },
      {
        name: "save_daily_brief",
        description: "Save a brief for one local calendar day, preserving recommendation progress.",
        inputSchema: briefSchema,
        handler: action((ctx) => coach.saveBrief(ctx.input))
      },
      {
        name: "update_recommendation_status",
        description: "Mark a saved recommendation as new, trying, or done.",
        inputSchema: statusSchema,
        handler: action((ctx) => coach.updateStatus(
          ctx.input.date,
          ctx.input.recommendationId,
          ctx.input.status
        ))
      },
      {
        name: "get_insight_history",
        description: "Return up to 90 saved daily briefs and locally saved coach conversations.",
        handler: action(() => listBriefs())
      },
      {
        name: "get_experiment",
        description: "Read one durable experiment, including its original action, baseline, notes, self-reported outcome and latest review.",
        inputSchema: experimentSchema,
        handler: action((ctx) => getExperiment(ctx.input.id))
      },
      {
        name: "update_experiment",
        description: "Save user-directed notes or a self-reported outcome without changing status or requesting analysis.",
        inputSchema: experimentUpdateSchema,
        handler: action((ctx) => {
          const experiment = updateExperiment(ctx.input.id, ctx.input.update);
          coach.changed();
          return experiment;
        })
      }
    ],
    open: async (ctx) => {
      let entry = servers.get(ctx.instanceId);
      if (!entry) {
        entry = await startServer(
          coach,
          (message, options) => getSession()?.log(message, options),
          snapshots
        );
        servers.set(ctx.instanceId, entry);
      }
      const url = new URL(entry.url);
      if (ctx.input?.range) url.searchParams.set("range", ctx.input.range);
      return { title: "My AI Usage", url: url.href };
    },
    onClose: async (ctx) => {
      const entry = servers.get(ctx.instanceId);
      if (!entry) return;
      servers.delete(ctx.instanceId);
      entry.server.closeAllConnections();
      await new Promise((resolve, reject) => entry.server.close((error) => error ? reject(error) : resolve()));
    }
  });
}
export {
  createUsageCanvas
};
