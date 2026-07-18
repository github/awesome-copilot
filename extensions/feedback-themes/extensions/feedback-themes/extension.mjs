import { CanvasError, createCanvas, joinSession } from "@github/copilot-sdk/extension";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Load fixture data ───

const fixtureRaw = JSON.parse(
  fs.readFileSync(path.join(__dirname, "data", "signals.json"), "utf8")
);
const THEMES = fixtureRaw.themes;
const SIGNALS = fixtureRaw.signals;

// ─── Theme computation ───

function computeThemeGroups() {
  return THEMES.map((theme) => {
    const signals = SIGNALS.filter((s) => s.themes.includes(theme.id));
    const impactOrder = { high: 3, medium: 2, low: 1 };
    const maxImpact = signals.reduce(
      (max, s) => (impactOrder[s.impact] > impactOrder[max] ? s.impact : max),
      "low"
    );
    const sources = [...new Set(signals.map((s) => s.source))];
    const customers = [...new Set(signals.map((s) => s.customer))];
    return {
      ...theme,
      signalCount: signals.length,
      maxImpact,
      sources,
      customers,
      signals,
    };
  }).sort((a, b) => {
    const impactOrder = { high: 3, medium: 2, low: 1 };
    if (impactOrder[b.maxImpact] !== impactOrder[a.maxImpact]) {
      return impactOrder[b.maxImpact] - impactOrder[a.maxImpact];
    }
    return b.signalCount - a.signalCount;
  });
}

function getState() {
  const groups = computeThemeGroups();
  return {
    totalSignals: SIGNALS.length,
    totalThemes: THEMES.length,
    themes: groups,
  };
}

// ─── SSE ───

const sseClients = new Set();

function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) res.write(msg);
}

// ─── HTTP helpers ───

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => resolve(body ? JSON.parse(body) : {}));
    req.on("error", reject);
  });
}

function json(res, code, data) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

// ─── HTTP server ───

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    sseClients.add(res);
    req.on("close", () => sseClients.delete(res));
    res.write(`event: state\ndata: ${JSON.stringify(getState())}\n\n`);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/state") {
    json(res, 200, getState());
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/explore-theme") {
    const { themeId } = await readJson(req);
    const theme = computeThemeGroups().find((t) => t.id === themeId);
    if (!theme) {
      json(res, 404, { error: "Theme not found" });
      return;
    }
    // Trigger the agent to start a session exploring this theme
    session.send({
      prompt: `The user wants to explore the "${theme.label}" feedback theme in depth. This theme has ${theme.signalCount} signals across customers: ${theme.customers.join(", ")}. Maximum impact: ${theme.maxImpact}.

Theme description: ${theme.description}

Signals in this theme:
${theme.signals.map((s) => `- [${s.impact.toUpperCase()}] "${s.title}" (${s.customer}): ${s.description}`).join("\n")}

Please help the user explore this theme. Summarize the key patterns, identify what product changes would address these signals, and suggest next steps. Ask the user what aspect they'd like to dig into.`,
    });
    json(res, 200, { ok: true, theme: theme.label });
    return;
  }

  if (url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(
      fs.readFileSync(path.join(__dirname, "public", "index.html"), "utf8")
    );
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
function getPort() {
  return server.address().port;
}

// ─── Canvas declaration ───

const canvas = createCanvas({
  id: "feedback-themes",
  displayName: "Feedback Themes",
  description:
    "Explore SignalBox feedback grouped into themes. Shows signal counts, impact levels, and sources for each theme. Use to identify patterns and start deep-dive sessions on specific themes.",
  actions: [
    {
      name: "get_state",
      description:
        "Get all feedback themes with their grouped signals, impact levels, and source breakdown.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      handler() {
        return getState();
      },
    },
    {
      name: "explore_theme",
      description:
        "Get detailed information about a specific feedback theme including all associated signals.",
      inputSchema: {
        type: "object",
        properties: {
          theme_id: {
            type: "string",
            description:
              "Theme identifier (workflow-automation, mobile-usability, data-governance, onboarding-setup, performance-reliability, integration-ecosystem)",
          },
        },
        required: ["theme_id"],
        additionalProperties: false,
      },
      handler({ input }) {
        const theme = computeThemeGroups().find((t) => t.id === input.theme_id);
        if (!theme) {
          throw new CanvasError("not_found", `Theme "${input.theme_id}" not found`);
        }
        return theme;
      },
    },
  ],
  open() {
    const state = getState();
    broadcast("state", state);
    return {
      url: `http://127.0.0.1:${getPort()}`,
      title: "Feedback Themes",
      status: `${state.totalSignals} signals across ${state.totalThemes} themes`,
    };
  },
});

// ─── Join session ───

const session = await joinSession({ canvases: [canvas] });
