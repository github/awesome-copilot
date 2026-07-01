"use client";

import { useHumanInTheLoop } from "@copilotkit/react-core/v2";
import { z } from "zod";
import { AGENT_NAME } from "../lib/agent";

/**
 * Registers the `confirm_changes` human-in-the-loop gate the bridge emits
 * whenever the hosted agent's gated tool (decorated
 * `@tool(approval_mode="always_require")`) pauses for approval.
 *
 * Resolves with `{ accepted, steps }` — this exact shape is a convention
 * THIS SNIPPET defines, not something CopilotKit enforces (`respond(result)`
 * accepts any value). Pick your own shape if you like, but keep the frontend
 * `respond(...)` call and your bridge's parser in sync — see backend/bridge_app.py.
 */
const confirmChangesArgs = z.object({
  function_name: z.string(),
  function_arguments: z.string(),
  steps: z.array(z.object({ description: z.string() })).optional(),
});

export function ApprovalHitl() {
  useHumanInTheLoop({
    name: "confirm_changes",
    agentId: AGENT_NAME,
    description: "Ask the human to approve or reject a consequential action before it executes.",
    parameters: confirmChangesArgs,
    render: ({ status, args, respond }) => {
      if (status === "inProgress") {
        return <div className="hitl-card hitl-card--loading">Preparing approval request…</div>;
      }

      let parsedArgs: Record<string, unknown> = {};
      try {
        parsedArgs = args.function_arguments ? JSON.parse(args.function_arguments) : {};
      } catch {
        parsedArgs = {};
      }
      // Adapt this to whatever argument your gated tool takes (e.g. record_id).
      const targetId = (parsedArgs as { record_id?: string }).record_id ?? "unknown";
      const stepDescriptions = (args.steps ?? []).map((s) => s.description);

      if (status === "complete") {
        return <div className="hitl-card hitl-card--done">Decision recorded for {args.function_name} ({targetId}).</div>;
      }

      // status === "executing": awaiting the human's explicit decision.
      return (
        <div className="hitl-card" data-testid="hitl-approval-card">
          <p className="hitl-card__title">Approval required</p>
          <p>
            The assistant wants to call <code>{args.function_name}</code> on <strong>{targetId}</strong>.
            This is irreversible.
          </p>
          {stepDescriptions.length > 0 && (
            <ul>
              {stepDescriptions.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
          <div className="hitl-card__actions">
            <button
              data-testid="hitl-approve-button"
              onClick={() => respond?.({ accepted: true, steps: args.steps ?? [] })}
            >
              Approve
            </button>
            <button
              data-testid="hitl-reject-button"
              onClick={() => respond?.({ accepted: false, steps: args.steps ?? [] })}
            >
              Reject
            </button>
          </div>
        </div>
      );
    },
  });

  return null;
}
