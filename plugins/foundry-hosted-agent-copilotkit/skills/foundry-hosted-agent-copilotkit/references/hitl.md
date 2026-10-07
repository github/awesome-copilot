# Human-in-the-loop approvals

HITL gates actions with side effects, and its failures are silent: a tool runs without approval, runs twice, or never runs after approval. Every HITL change must be verified three ways:
- Approve runs the tool **once**.
- Reject runs it **zero** times.
- Later turns run it **zero** more times.

## Pick the mechanism

| Situation | Mechanism | Durable across restarts? |
| --- | --- | --- |
| Chat with a gated tool on a hosted agent (wiring A) | `approval_mode="always_require"` on the hosted agent's tool. The AG-UI adapter surfaces it as an AG-UI **interrupt** and forwards the decision to the hosted agent | Foundry side: yes (`FoundryFunctionApprovalStore`). The gateway's in-flight registry is not: a pending approval interrupted by a gateway restart is rejected **without running the tool**, and the user asks again |
| In-process agent (wiring B) | Same tool flag; the adapter resolves the approval locally | **No.** A restart while an approval is pending leaves it unresolvable |
| Multi-step plan, irreversible steps, approvals that may wait days | Invocations workflow agent with server-issued gate tokens ([wiring §6](wiring.md#6-invocations-workflow-agent-wiring-d)) | Yes (`FoundryStateStore` + `@multi_turn_task`) |

## Server

```python
@tool(approval_mode="always_require")
def transfer(from_account: str, to_account: str, amount: float) -> str: ...
```

- On wiring A, the flag lives on the **hosted agent's** tool. The gateway must run as in [wiring §2](wiring.md#2-ag-ui-gateway-wiring-a): `use_service_session=True` with `service_session_id_from_thread_id=True` (thread ID = Foundry `conv_…` ID), plus the interop shim. Without conversation continuity, every approval turns into a fresh approval request.
- `approval_mode` controls approval only. `never_require` does not make a tool read-only.
- **.NET:** wrap the tool in `ApprovalRequiredAIFunction`. Bridge `ToolApprovalRequestContent`/`ToolApprovalResponseContent` to a client approval tool call in a `DelegatingAIAgent`, following the official AGUI `Step04_HumanInLoop` sample. Keep the call and its result **paired** in history; removing one makes Azure OpenAI return 400 "tool_calls must be followed by tool messages".

## Frontend (CopilotKit v2)

The gateway finishes the run with `RUN_FINISHED.outcome = {type: "interrupt", interrupts: [...]}`. Each interrupt has:
- `id` (the hosted `mcpr_...` approval id)
- `message` (for example, "Approve running transfer?")
- `metadata.agent_framework.function_call` (`name`, `arguments`)

Handle it with `useInterrupt`. CopilotKit then resumes the run with a spec `resume` array.

```tsx
"use client";
import { useState } from "react";
import { useInterrupt } from "@copilotkit/react-core/v2";

type Call = { name?: string; arguments?: Record<string, unknown> };
type Pending = { id: string; message?: string; metadata?: unknown };
type Resolve = (payload?: unknown, interruptId?: string) => Promise<unknown>;

function ApprovalCard({ interrupt, resolve }: { interrupt: Pending; resolve: Resolve }) {
  const [decision, setDecision] = useState<boolean>();
  const call = (interrupt.metadata as { agent_framework?: { function_call?: Call } })
    ?.agent_framework?.function_call;
  const decide = (approved: boolean) => { setDecision(approved); void resolve({ approved }, interrupt.id); };
  return (
    <div data-testid="approval-card">
      <p>{interrupt.message ?? "Approve this action?"}</p>
      <pre>{call?.name} {JSON.stringify(call?.arguments)}</pre>
      {decision === undefined ? (
        <>
          <button onClick={() => decide(true)}>Approve</button>
          <button onClick={() => decide(false)}>Reject</button>
        </>
      ) : <p>{decision ? "Approved" : "Rejected"}</p>}
    </div>
  );
}

export function ApprovalUI() {
  useInterrupt({
    // One card per open interrupt, each resolved by its own id. CopilotKit resumes the run
    // only after every open interrupt has a decision; resolve() without an id targets the first.
    render: ({ interrupts, resolve }) => (
      <>{interrupts.map((i) => <ApprovalCard key={i.id} interrupt={i as Pending} resolve={resolve} />)}</>
    ),
  });
  return null;
}
```

- Mount `ApprovalUI` inside `CopilotKitProvider`. The card renders inside `CopilotChat` by default (`renderInChat`).
- Parallel gated calls: with agent-framework-ag-ui 1.4.0, a hosted agent's parallel gated calls surface **one interrupt per run**. Each decision resumes the run, which then asks for the next. Nothing executes until the last decision; then approved calls run once each and rejected ones return "rejected by user". Rendering all `interrupts` keeps the UI correct if a run ever carries several.
- The payload is a contract: `{approved: boolean}`, with `accepted` accepted as a legacy alias. Anything else does nothing, with no error. Reject with `resolve({approved: false})`, not `cancel()`. Cancelling discards the decision instead of telling the agent the call was rejected.
- The adapter also emits a `confirm_changes` tool call for older frontends. With `useInterrupt`, don't register `useHumanInTheLoop("confirm_changes")`; hide it in your tool renderer instead (see [wiring §3](wiring.md#3-copilotkit-runtime-and-react)).
- Render tool results with `useDefaultRenderTool` or `useRenderTool`. After approval, the hosted tool's result arrives as `TOOL_CALL_RESULT`, and nothing shows it otherwise.

## Verify approvals by their effect

On wiring A, the approved tool runs **on the hosted agent**, out of the UI's sight. A correct-looking transcript proves nothing. Check the side effect itself: query the record, or have the tool write an observable marker. Keep this regression test permanently:
- After one approval, send several unrelated follow-up turns in the same thread.
- Assert the side effect happened exactly once.

## Older versions

Before mid-2026 releases, the AG-UI adapter resolved approvals locally and never forwarded them to a hosted agent (microsoft/agent-framework#6652). Chaining `previous_response_id` through an approval-resolving response could also re-run the tool on a later turn (#6851). Both were fixed upstream: #7271, #7345, #7480, #7594.

If a codebase still contains a hand-written bridge that converts `mcp_approval_request`/`mcp_approval_response` or skips storing response IDs after approval turns, follow these steps:
1. Upgrade to the latest `agent-framework-*` packages.
2. Run the regression test without the workaround.
3. Delete the workaround only if the test passes.

The two current interop fixes in the wiring §2 shim follow the same rule.

## Debugging decision tree

Work top-down:
1. **400/500 "No tool output found for function call"** on approve: the hosted agent uses a Chat Completions client. Switch to `FoundryChatClient`.
2. **No approval card, browser shows `INCOMPLETE_STREAM` / "Cannot send 'TOOL_CALL_END' event: No active tool call found"**: the gateway is missing the shim from wiring §2.
3. **No approval card, no error**: `useInterrupt` isn't mounted inside the provider, or the tool lacks `approval_mode` and ran immediately. Check `RUN_FINISHED.outcome` with curl, and the hosted agent logs with `azd ai agent monitor`.
4. **Approve produces another approval request instead of running the tool**: the gateway isn't using `use_service_session=True`.
5. **Click does nothing, no error**: payload mismatch (see the contract above). A gateway reply of `APPROVAL_RESUME_REQUIRED` means the client sent a tool message without a `resume` entry.
6. **Approve runs the tool, but every later turn returns an empty run** (`RUN_STARTED` → `RUN_FINISHED` only): the duplicate interrupt tool message reached the adapter. Apply the shim from wiring §2.
7. **Approve shows a reply, but the side effect never happened**: the decision didn't reach the hosted agent. Upgrade packages, then `curl` the gateway with the resume to see whether a `TOOL_CALL_RESULT` comes back.
8. **Works once, then a later turn repeats the side effect**: an outdated workaround or an old package (see "Older versions").
9. **Card visible during the run but gone after `RUN_FINISHED`**: the final `MESSAGES_SNAPSHOT` differs from the live events. Check the DOM after the run, and upgrade CopilotKit.
10. **`RUN_ERROR` "No pending approval interrupt found for resume interruptId 'mcpr_…'"**: the gateway restarted, or the resume reached a different replica than the one that issued the approval. The tool did not run and the conversation is still usable, so ask again. With more than one replica, use session affinity. For approvals that must survive restarts, use an Invocations workflow.
