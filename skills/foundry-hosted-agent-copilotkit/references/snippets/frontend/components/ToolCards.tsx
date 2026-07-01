"use client";

import { useRenderTool } from "@copilotkit/react-core/v2";
import { z } from "zod";
import { AGENT_NAME } from "../lib/agent";

/**
 * Backend Tool Rendering (AG-UI pattern #2): the bridge forwards the
 * function_call/function_call_output pair for each backend tool the hosted
 * agent runs, verbatim, as AG-UI TOOL_CALL_* / TOOL_CALL_RESULT events.
 * `useRenderTool` gives each named tool its own progress/result card.
 *
 * Rename `list_pending_records`/`approve_record` (and the parameter schemas)
 * to match whatever tools you defined in src/agent.py.
 */
export function ToolCards() {
  useRenderTool({
    name: "list_pending_records",
    agentId: AGENT_NAME,
    parameters: z.object({ owner: z.string().optional() }),
    render: ({ status, parameters, result }) => (
      <div className="tool-card" data-testid="tool-card-list-pending">
        <p className="tool-card__title">
          Looking up pending records{parameters?.owner ? ` for ${parameters.owner}` : ""}…
        </p>
        {status === "complete" && <pre className="tool-card__result">{result}</pre>}
      </div>
    ),
  });

  useRenderTool({
    name: "approve_record",
    agentId: AGENT_NAME,
    parameters: z.object({ record_id: z.string().optional() }),
    render: ({ status, parameters, result }) => (
      <div className="tool-card" data-testid="tool-card-approve">
        <p className="tool-card__title">
          {status === "complete" ? "Approval tool result" : "Requesting approval"}
          {parameters?.record_id ? ` for ${parameters.record_id}` : ""}
        </p>
        {status === "complete" && <pre className="tool-card__result">{result}</pre>}
      </div>
    ),
  });

  return null;
}
