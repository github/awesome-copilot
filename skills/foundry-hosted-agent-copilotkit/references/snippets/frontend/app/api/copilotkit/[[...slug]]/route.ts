import { HttpAgent } from "@ag-ui/client";
import { CopilotRuntime, createCopilotRuntimeHandler } from "@copilotkit/runtime/v2";
import { AGENT_NAME } from "../../../../lib/agent";

// The bridge (backend/bridge_app.py) — NOT the hosted agent directly. See
// architecture.md: @ag-ui/client can't talk to a Foundry hosted agent, which
// speaks the OpenAI Responses protocol, not AG-UI.
const BRIDGE_URL = process.env.AG_UI_BACKEND_URL ?? "http://localhost:8080/agent";
const BRIDGE_API_KEY = process.env.BRIDGE_API_KEY;

const runtime = new CopilotRuntime({
  agents: {
    [AGENT_NAME]: new HttpAgent({
      url: BRIDGE_URL,
      headers: BRIDGE_API_KEY ? { "x-api-key": BRIDGE_API_KEY } : undefined,
    }),
  },
});

const handler = createCopilotRuntimeHandler({
  runtime,
  basePath: "/api/copilotkit",
  // Verify this against your installed CopilotKit version: the client may
  // default to a single POST endpoint (JSON envelope) rather than REST-style
  // /agent/:id/run paths — the server mode must match or every call 404s.
  // Do not assume "single-route" is still correct without checking a real
  // request/response for your version.
  mode: "single-route",
});

export const GET = handler;
export const POST = handler;
export const OPTIONS = handler;
