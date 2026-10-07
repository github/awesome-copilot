// Draw: a canvas for quick diagrams. Shapes, arrows that stay attached, text and pen.
// Drawings are JSON files in this session's workspace (files/drawings). One local
// HTTP server serves every open Draw panel in the session.
//
// Note: stdout is the JSON-RPC channel to the host, so never use console.log here.

import os from "node:os";
import path from "node:path";
import { joinSession, createCanvas, CanvasError } from "@github/copilot-sdk/extension";
import { DrawingStore, StoreError } from "./store.mjs";
import { Settings, settingsFile } from "./settings.mjs";
import { createDrawServer } from "./server.mjs";
import { makeActions } from "./actions.mjs";

let session = null;
let runtimePromise = null;

const log = (msg) => process.stderr.write(`[draw] ${msg}\n`);

function workspaceDir(ctx) {
  if (session && session.workspacePath) return session.workspacePath;
  const home = process.env.COPILOT_HOME || path.join(os.homedir(), ".copilot");
  return path.join(home, "session-state", ctx.sessionId);
}

// The store and server start on first use, so an unused canvas costs nothing.
function runtime(ctx) {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      const store = new DrawingStore(path.join(workspaceDir(ctx), "files", "drawings"), { log });
      await store.ready;
      const settings = new Settings(settingsFile(), { log });
      const server = createDrawServer({ store, settings, getSession: () => session, log });
      await server.start();
      return { store, server };
    })();
    runtimePromise.catch((err) => {
      log(`failed to start: ${err.stack || err.message}`);
      runtimePromise = null;
    });
  }
  return runtimePromise;
}

const canvas = createCanvas({
  id: "draw",
  displayName: "Draw",
  description:
    "Draw simple diagrams: boxes, ellipses, diamonds and databases joined by arrows that stay attached, plus text and a freehand pen. The user draws by hand and you can read and change the same drawing with actions. Drawings are saved in this session.",
  inputSchema: {
    type: "object",
    properties: {
      drawing: {
        type: "string",
        description:
          "Name or id of the drawing to show. It is created if nothing matches. If a name could mean more than one drawing, nothing opens and the error lists their ids; an id always picks one.",
      },
    },
    additionalProperties: false,
  },
  actions: makeActions({ runtime, CanvasError }),
  open: async (ctx) => {
    const { store, server } = await runtime(ctx);
    const wanted = typeof ctx.input?.drawing === "string" ? ctx.input.drawing.trim() : "";
    if (wanted) {
      const current = store.drawingForInstance(ctx.instanceId);
      let doc;
      try {
        doc = store.find(wanted) || store.create(wanted);
      } catch (err) {
        if (err instanceof StoreError) throw new CanvasError(err.code, err.message);
        throw err;
      }
      if (!current || current.id !== doc.id) server.showDrawing(ctx.instanceId, doc);
    } else {
      server.ensureDrawing(ctx.instanceId);
    }
    return { title: "Draw", url: server.urlFor(ctx.instanceId) };
  },
  // Panels come and go, but the server and the instance's drawing binding stay,
  // so reopening the same instance shows the same drawing.
  onClose: async () => {
    if (!runtimePromise) return;
    try {
      await (await runtimePromise).store.flush();
    } catch (err) {
      // The store keeps retrying failed saves, so closing a panel only needs to log it.
      log(`could not save on close: ${err.message}`);
    }
  },
});

// Host startup can replace canvas registrations during the initial burst. Let that settle first.
try {
  await new Promise((resolve) => setTimeout(resolve, 900));
  session = await joinSession({ canvases: [canvas] });
} catch (error) {
  const msg = error && error.message ? String(error.message) : String(error);
  if (/session not found/i.test(msg)) process.exit(0);
  throw error;
}

await session.log("Draw canvas ready.", { ephemeral: true });
