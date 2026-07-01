"use client";

import { CopilotKit } from "@copilotkit/react-core/v2";
import "@copilotkit/react-core/v2/styles.css";
import { ApprovalHitl } from "../components/ApprovalHitl";
import { ToolCards } from "../components/ToolCards";

// The `CopilotKit` provider component — NOT `CopilotKitProvider`, which is an
// internal subset. Confirm against your installed version's own docs/types.
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <ApprovalHitl />
      <ToolCards />
      {children}
    </CopilotKit>
  );
}
