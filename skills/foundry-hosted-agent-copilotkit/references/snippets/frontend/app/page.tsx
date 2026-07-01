"use client";

import { CopilotChat } from "@copilotkit/react-core/v2";
import { AGENT_NAME } from "../lib/agent";

// The actual chat WIDGET — the one piece of UI every consumer needs that
// isn't just plumbing. `providers.tsx` only wraps <CopilotKit> and registers
// the HITL/tool-card hooks; this page renders the chat window itself.
// `CopilotChat` takes the same `agentId` convention as the hooks (see
// lib/agent.ts for why this is a separate identifier from the Foundry
// hosted agent's own name).
export default function Home() {
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "24px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>My Assistant</h1>
      <p style={{ color: "#555", marginBottom: 20 }}>
        Ask about pending records, or ask to approve a specific record id — approvals require your
        explicit confirmation.
      </p>
      <div style={{ height: "70vh", border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
        <CopilotChat agentId={AGENT_NAME} />
      </div>
    </main>
  );
}
