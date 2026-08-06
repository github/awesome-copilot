import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createCanvas, joinSession } from "@github/copilot-sdk/extension";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Per-instance state (ephemeral, lives in memory for session lifetime)
const instances = new Map();

function getInstance(instanceId) {
  if (!instances.has(instanceId)) {
    instances.set(instanceId, {
      currentView: null,
      history: [],
      selectedNodeId: null,
      token: crypto.randomBytes(16).toString("hex"),
    });
  }
  return instances.get(instanceId);
}

function getCurrentView(inst) {
  return inst.currentView;
}

function pushView(inst, view) {
  if (inst.currentView) {
    inst.history.push(inst.currentView);
  }
  inst.currentView = view;
  inst.selectedNodeId = null;
}

function replaceView(inst, view) {
  inst.currentView = view;
  inst.selectedNodeId = null;
}

function popView(inst) {
  if (inst.history.length === 0) return null;
  inst.currentView = inst.history.pop();
  inst.selectedNodeId = null;
  return inst.currentView;
}

// SSE clients per instance
const sseClients = new Map();

function broadcast(instanceId, event, data) {
  const clients = sseClients.get(instanceId);
  if (!clients) return;
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    res.write(msg);
  }
}

// Broadcast the full view state to the iframe
function broadcastView(instanceId, inst) {
  const view = getCurrentView(inst);
  broadcast(instanceId, "view", {
    ...view,
    historyDepth: inst.history.length,
    breadcrumbs: inst.history.map((v) => v.title).concat(view ? [view.title] : []),
  });
}

// HTTP helpers
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

// HTTP server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get("token");
  const instanceId = url.searchParams.get("instance");

  // Serve the HTML page
  if (req.method === "GET" && url.pathname === "/") {
    if (!instanceId || !validateToken(instanceId, token)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(fs.readFileSync(path.join(__dirname, "public", "index.html"), "utf8"));
    return;
  }

  // SSE endpoint
  if (req.method === "GET" && url.pathname === "/events") {
    if (!instanceId || !validateToken(instanceId, token)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    if (!sseClients.has(instanceId)) sseClients.set(instanceId, new Set());
    sseClients.get(instanceId).add(res);
    req.on("close", () => {
      const clients = sseClients.get(instanceId);
      if (clients) clients.delete(res);
    });
    // Send current view state immediately
    const inst = getInstance(instanceId);
    if (inst.currentView) {
      const view = getCurrentView(inst);
      res.write(`event: view\ndata: ${JSON.stringify({
        ...view,
        historyDepth: inst.history.length,
        breadcrumbs: inst.history.map((v) => v.title).concat([view.title]),
      })}\n\n`);
      if (inst.selectedNodeId) {
        res.write(`event: select\ndata: ${JSON.stringify({ nodeId: inst.selectedNodeId })}\n\n`);
      }
    }
    return;
  }

  // API: get full state
  if (req.method === "GET" && url.pathname === "/api/state") {
    if (!instanceId || !validateToken(instanceId, token)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    const inst = getInstance(instanceId);
    const view = getCurrentView(inst);
    json(res, 200, {
      view,
      historyDepth: inst.history.length,
      breadcrumbs: inst.history.map((v) => v.title).concat(view ? [view.title] : []),
      selectedNodeId: inst.selectedNodeId,
    });
    return;
  }

  // API: node clicked — triggers drill-down
  if (req.method === "POST" && url.pathname === "/api/click") {
    if (!instanceId || !validateToken(instanceId, token)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    const { nodeId } = await readJson(req);
    const inst = getInstance(instanceId);
    inst.selectedNodeId = nodeId;
    broadcast(instanceId, "select", { nodeId });

    // Send prompt to agent to drill into the clicked node
    const view = getCurrentView(inst);
    const node = view?.diagram?.nodes?.find((n) => n.id === nodeId);
    if (node && session) {
      const diagramContext = view.diagram.nodes.map((n) => n.label).join(", ");
      session.send({
        prompt: `The user clicked on the "${node.label}" node in the Diagram Explorer canvas (id: "${node.id}", type: "${node.type || "default"}", description: "${node.description || "none"}"). The current diagram is "${view.title}" which contains: ${diagramContext}.

Do NOT explain in chat. Instead, use the canvas actions to respond visually:
1. Use the render_diagram action with mode "push" to show a detailed sub-diagram of "${node.label}" — break it into its internal components, sub-systems, or key parts with their relationships.
2. Use the show_explanation action to display a brief explanation panel on the canvas.

If you cannot create a meaningful sub-diagram (e.g. the node is already a leaf concept), use show_explanation to provide a detailed description on the canvas instead, without rendering a new diagram.`,
      });
    }

    json(res, 200, { ok: true, selectedNodeId: nodeId });
    return;
  }

  // API: navigate back
  if (req.method === "POST" && url.pathname === "/api/back") {
    if (!instanceId || !validateToken(instanceId, token)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    const inst = getInstance(instanceId);
    const prev = popView(inst);
    if (prev) {
      broadcastView(instanceId, inst);
    }
    json(res, 200, { ok: true, view: prev });
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

function validateToken(instanceId, token) {
  const inst = instances.get(instanceId);
  return inst && inst.token === token;
}

const port = await new Promise((resolve) => {
  server.listen(0, "127.0.0.1", () => resolve(server.address().port));
});

// Canvas declaration
const canvas = createCanvas({
  id: "diagram",
  displayName: "Diagram Explorer",
  description:
    "Interactive diagram for exploring architecture, data flow, and relationships. Render nodes and edges, then click any node to get a detailed explanation from the agent.",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Optional title for the initial diagram" },
    },
  },
  actions: [
    {
      name: "render_diagram",
      description:
        "Render an interactive diagram with nodes and edges. Use mode 'push' to drill into a node (adds to history so user can navigate back), or 'replace' (default) to update the current view in place.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Diagram title" },
          nodes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string", description: "Unique node identifier" },
                label: { type: "string", description: "Display label" },
                description: {
                  type: "string",
                  description: "Brief description shown on hover and used when drilling in",
                },
                type: {
                  type: "string",
                  description: "Node type for color coding (e.g. 'service', 'database', 'ui', 'api', 'config', 'external')",
                },
              },
              required: ["id", "label"],
            },
          },
          edges: {
            type: "array",
            items: {
              type: "object",
              properties: {
                from: { type: "string", description: "Source node id" },
                to: { type: "string", description: "Target node id" },
                label: { type: "string", description: "Optional edge label" },
              },
              required: ["from", "to"],
            },
          },
          mode: {
            type: "string",
            enum: ["push", "replace"],
            description: "Navigation mode. 'push' saves current view to history (for drill-down). 'replace' updates in place (default).",
          },
          explanation: {
            type: "object",
            properties: {
              title: { type: "string", description: "Explanation panel title" },
              text: { type: "string", description: "Explanation text (plain text)" },
            },
            description: "Optional explanation to show alongside the diagram",
          },
        },
        required: ["nodes", "edges"],
      },
      handler({ instanceId, input }) {
        const inst = getInstance(instanceId);
        const view = {
          title: input.title || "Diagram",
          diagram: { title: input.title || "Diagram", nodes: input.nodes, edges: input.edges },
          explanation: input.explanation || null,
          selectedNodeId: null,
        };

        if (input.mode === "push") {
          pushView(inst, view);
        } else {
          replaceView(inst, view);
        }

        broadcastView(instanceId, inst);
        return { ok: true, nodeCount: input.nodes.length, edgeCount: input.edges.length, historyDepth: inst.history.length };
      },
    },
    {
      name: "show_explanation",
      description:
        "Display an explanation panel on the canvas alongside the current diagram. Use this to provide context about the current view or a clicked node without changing the diagram.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Explanation panel title" },
          text: { type: "string", description: "Explanation content (plain text, can include line breaks)" },
        },
        required: ["title", "text"],
      },
      handler({ instanceId, input }) {
        const inst = getInstance(instanceId);
        const view = getCurrentView(inst);
        if (view) {
          view.explanation = { title: input.title, text: input.text };
          broadcast(instanceId, "explanation", view.explanation);
        }
        return { ok: true };
      },
    },
    {
      name: "get_state",
      description:
        "Get the current diagram state including which node the user last clicked and the history depth.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      handler({ instanceId }) {
        const inst = getInstance(instanceId);
        const view = getCurrentView(inst);
        const selectedNode = inst.selectedNodeId
          ? view?.diagram?.nodes?.find((n) => n.id === inst.selectedNodeId)
          : null;
        return {
          currentView: view,
          selectedNodeId: inst.selectedNodeId,
          selectedNode: selectedNode || null,
          historyDepth: inst.history.length,
          breadcrumbs: inst.history.map((v) => v.title).concat(view ? [view.title] : []),
        };
      },
    },
    {
      name: "highlight_node",
      description: "Highlight a specific node in the diagram (e.g. while explaining it).",
      inputSchema: {
        type: "object",
        properties: {
          nodeId: { type: "string", description: "The node id to highlight" },
        },
        required: ["nodeId"],
      },
      handler({ instanceId, input }) {
        const inst = getInstance(instanceId);
        inst.selectedNodeId = input.nodeId;
        broadcast(instanceId, "select", { nodeId: input.nodeId });
        return { ok: true, highlightedNodeId: input.nodeId };
      },
    },
    {
      name: "clear",
      description: "Clear the diagram canvas and all history.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      handler({ instanceId }) {
        const inst = getInstance(instanceId);
        inst.currentView = null;
        inst.history = [];
        inst.selectedNodeId = null;
        broadcast(instanceId, "clear", {});
        return { ok: true };
      },
    },
  ],
  open({ instanceId, input }) {
    const inst = getInstance(instanceId);
    const view = getCurrentView(inst);
    return {
      url: `http://127.0.0.1:${port}?instance=${instanceId}&token=${inst.token}`,
      title: input?.title || "Diagram Explorer",
      status: view
        ? `${view.diagram.nodes.length} nodes`
        : "Ready",
    };
  },
});

let session = await joinSession({ canvases: [canvas] });
