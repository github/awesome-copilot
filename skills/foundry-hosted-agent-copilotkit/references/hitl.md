# Human-in-the-loop approvals

HITL is the highest-risk feature on this stack: it gates consequential, side-effecting actions, and the failure modes are silent (a tool running without approval, or running twice). Treat every HITL change as safety-critical and verify all three outcomes: approve executes once, reject executes zero times, follow-up turns execute zero additional times.

## Wiring (Python, in-process AG-UI endpoint)

```python
from agent_framework import Agent, tool
from agent_framework_ag_ui import AgentFrameworkAgent, add_agent_framework_fastapi_endpoint

@tool(approval_mode="always_require")
def transfer_money(from_account: str, to_account: str, amount: float) -> str:
    """Transfer money between accounts."""
    ...

agent = Agent(name="assistant", instructions="...", client=chat_client,
              tools=[transfer_money, check_balance])
wrapped = AgentFrameworkAgent(agent=agent, require_confirmation=True)
add_agent_framework_fastapi_endpoint(app, wrapped, "/")
```

Both halves are required: `approval_mode="always_require"` on the tool AND `require_confirmation=True` on the wrapper. Note `approval_mode` controls *approval* only — `never_require` does not mean the tool is read-only; that's the implementer's responsibility.

`.NET`: wrap the function in `ApprovalRequiredAIFunction` and add the bidirectional middleware from the MAF AG-UI HITL tutorial, which translates `FunctionApprovalRequestContent` into a `request_approval` client tool call. Critical .NET-specific rule: after converting an approval response, the middleware must REMOVE the `request_approval` tool call and its result from message history, or Azure OpenAI fails with "tool_calls must be followed by tool messages responding to each 'tool_call_id'".

## Frontend

```tsx
useHumanInTheLoop({
  name: "confirm_changes",           // must match what the server surfaces
  render: ({ args, respond, status }) => (
    <ApprovalCard
      args={args}
      onApprove={() => respond?.({ accepted: true })}
      onReject={() => respond?.({ accepted: false })}
    />
  ),
});
```

**The payload shape is a contract, not a framework feature.** CopilotKit's `respond(...)` accepts any JSON value; the server-side code decides what counts as "approved". Read the server's detection logic and match it exactly — a UI resolving `{ approved: true }` against a server checking for an `accepted` key fails silently: the click does nothing, no error anywhere. Whenever approval "does nothing", diff the resolved payload against the server's detection first.

The approval tool name the server surfaces (e.g. `confirm_changes`) must be registered via `useHumanInTheLoop` or no card ever appears.

## Hosted agents: how approval actually travels

When the agent runs as a Foundry hosted agent behind the Responses protocol, an approval-gated tool surfaces as an `mcp_approval_request` item in the Responses stream. The decision must be sent back as an `mcp_approval_response` input item; the hosted agent then re-executes the tool **server-side** on approval. Two consequences:

1. **The stock AG-UI adapter does not forward approvals to a remote agent** — it resolves `confirm_changes` locally, so approve appears to succeed but the gated tool never re-executes and state never changes (tracked as microsoft/agent-framework#6652, open as of mid-2026). A bridge to a hosted agent needs explicit approval-forwarding code. Symptom signature: approval card works, approve returns a normal reply, but the side effect never happens.
2. Approve means re-execution happens out of the UI's sight. Verify by observing the *state change* (query the affected record afterwards), not by the chat transcript looking right.

## The duplicate-execution hazard (read before shipping any HITL change)

**Symptom:** one approval works correctly, then a LATER, unrelated turn in the same conversation silently re-executes the same gated tool — the side effect applies twice with no approval card and no visible indication.

**Root cause (isolated by calling the hosted agent's bare `/responses` endpoint with curl — no AG-UI, no CopilotKit in the loop):** chaining `previous_response_id` through a response that resolved an `mcp_approval_response` makes the hosted runtime re-execute the approved tool on the next turn regardless of that turn's content. The bug lives in the agent-framework/Foundry hosting layer, not in the AG-UI adapter or CopilotKit. Tracked as microsoft/agent-framework#6851 (duplicate execution) and #6828 (related approval-state symptom); both were still open as of July 2026 — check current status before relying on framework behavior.

**Mitigation for bridges using `previous_response_id` chaining:** after a turn whose input contained an `mcp_approval_response`, do NOT store that response id for chaining — let the next turn start without `previous_response_id`. This costs a sliver of conversational memory and guarantees a gated action never silently executes twice. Platform-mode conversations (Foundry `conversation` objects instead of response-id chaining) have a different mechanism — do not assume they are immune; test explicitly.

**Regression test to keep forever:** after an approve, send several unrelated follow-up turns in the same thread and assert the gated tool's side effect did not recur (e.g. a counter incremented exactly once). Remove any local mitigation only when the upstream issues are closed AND this test passes without it — never on a version bump alone.

## HITL debugging decision tree

Work top-down; each step has a distinct signature:

1. **Approve → 400/500 "No tool output found for function call ..."** → the agent's model client is Chat Completions-based. Approval resume on hosted agents requires the Responses-protocol client (`FoundryChatClient` in MAF Python). Swap the client.
2. **No approval card ever appears** → `useHumanInTheLoop` not registered for the surfaced tool name, or the tool is missing `approval_mode="always_require"` (it executes immediately — check server logs for the tool running).
3. **Clicking approve does nothing, no error** → payload-shape mismatch between `respond(...)` and the server's detection (see contract above).
4. **Approval resolves, reply streams, but state never changes** → approval was resolved locally and never reached the remote agent (#6652-class). Confirm the bridge/adapter actually forwards `mcp_approval_response`.
5. **Works once, then a later turn double-executes** → duplicate-execution hazard above.
6. **Card renders during the run but vanishes at `RUN_FINISHED`** → message-snapshot representation differs from live events (multi-tool-call turns lumped into one message; some UI versions render only the first tool call). Fix the snapshot construction or upgrade the UI layer; verify post-run DOM, not just mid-run.
7. Only then suspect environment: tenant mismatch 403s, wrong token audience 401s, stale in-memory data in a locally running agent (restart `azd ai agent run` between test passes).
