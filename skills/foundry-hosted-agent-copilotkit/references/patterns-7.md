# The 7 AG-UI patterns on the hosted-agent + light-bridge stack

These are the AG-UI dojo "Microsoft Agent Framework Python" feature patterns,
adapted to our standard (intelligence in the Foundry HOSTED agent; a light bridge
you write; CopilotKit hooks). Canonical source: backend agents from
`microsoft/agent-framework`
(`python/packages/ag-ui/agent_framework_ag_ui_examples/agents/*`) and the v2
frontend pages from `ag-ui-protocol/ag-ui`
(`apps/dojo/src/app/[integrationId]/feature/(v2)/*`).

CopilotKit hooks (confirm the exact import path — e.g.
`@copilotkit/react-core/v2` — against your installed version):
`useAgent`, `useAgentContext`, `useFrontendTool`, `useRenderTool`,
`useHumanInTheLoop`.

| # | Pattern | Hosted-agent side | CopilotKit UI | Through the bridge |
|---|---|---|---|---|
| 1 | Agentic Chat (frontend tools) | plain `Agent` (no server tool needed) | `useFrontendTool({name,parameters,handler})` (runs in browser) + `useAgentContext` | native — client tool, agent just emits the tool call |
| 2 | Backend Tool Rendering | `@tool` (executes server-side) | `useRenderTool({name,parameters,render})` | native — `function_call`/`function_call_output` forwarded |
| 3 | HITL approval | `@tool(approval_mode="always_require")` | `useHumanInTheLoop({name,render})` → `respond(<your chosen shape>)` | bridge surfaces an approval-request card and forwards the decision as `mcp_approval_response` |
| 5 | Tool-Based Generative UI | `FunctionTool(func=None)` (declaration-only) + `tool_choice="required"` | `useFrontendTool({name,handler,render,followUp:false})` | native — stream tool-call args to the renderer |
| 4 | Agentic Generative UI | `predict_state_config` + `require_confirmation=False`; stream step status via tool args | `useAgent({updates:[OnStateChanged]})` → `agent.state` | roadmap through a pure proxy bridge — see below |
| 6 | Shared State | `state_schema` + `predict_state_config`, `require_confirmation=False` | `useAgent` + `agent.setState()` | roadmap through a pure proxy bridge — see below |
| 7 | Predictive State Updates | same as #6 but `require_confirmation=True` (default) + `@tool(approval_mode="always_require")` | `useAgent` + `useHumanInTheLoop` (confirm/reject) | roadmap through a pure proxy bridge — see below |

## How it works on this stack

- **Native adapter (reference):** `add_agent_framework_fastapi_endpoint(agent)`
  (from `agent-framework-ag-ui`) natively emits all AG-UI events — text,
  TOOL_CALL_* cards, function-approval HITL, and StateSnapshot/Delta (via
  `state_schema`+`predict_state_config`) — *when it wraps a plain in-process
  `Agent`*. This skill's standard doesn't run the agent in-process; it keeps
  all logic in the Foundry hosted agent and reaches it through a bridge you
  write, so this native behavior does not directly apply — see below.
- **Deployed/local (hosted agent):** the bridge is code you write (illustrated
  here as `HostedProxyAgent`, not a real importable class), NOT the native
  `add_agent_framework_fastapi_endpoint(FoundryAgent(...))`. The native
  `FoundryAgent` path can translate read/cards/HITL-*pause*, but on HITL
  **approve it does NOT re-execute** the hosted tool (it resolves the approval
  locally; the `FoundryAgent` client has no `mcp_approval_response` forwarding —
  verified live). Your bridge must forward `mcp_approval_response` to the
  hosted agent so the gated tool re-executes server-side.

| # | Pattern | Hosted-agent side | CopilotKit UI | Through the bridge |
|---|---|---|---|---|
| 1 | Agentic Chat | plain Agent | `useFrontendTool` | native |
| 2 | Backend Tool Rendering | `@tool` | `useRenderTool` | bridge forwards function_call/result |
| 3 | HITL approval | `@tool(approval_mode="always_require")` | `useHumanInTheLoop` → your chosen decision shape | bridge forwards mcp_approval_response (re-executes) — verified end-to-end on a real local hosted agent |
| 5 | Tool-Based Generative UI | `FunctionTool(func=None)` | `useFrontendTool` render | stream tool-call args |
| 4 / 6 / 7 | Agentic Generative / Shared / Predictive State | `state_schema` + `predict_state_config` | `useAgent` + `setState` | bridge would need to relay text/tool-arg deltas as state events and forward `setState`; this is roadmap/unverified through a pure proxy bridge (native only when the adapter wraps an in-process agent) |

## HITL contract

The gated tool surfaces in the hosted agent's Responses stream as an
`mcp_approval_request`. Your bridge translates this into whatever approval-card
event shape your frontend expects — `useHumanInTheLoop`'s `respond(result)`
accepts any value; the specific shape (e.g. `{ accepted: boolean, steps }`) is
a convention **you** define and must keep consistent between the frontend
`respond(...)` call and your bridge's parser — CopilotKit does not enforce or
require a particular shape. Once resolved: Accept → your bridge sends
`mcp_approval_response{approve:true}` (tool re-executes server-side), Reject →
`approve:false` (tool does not execute).

## Framework workarounds (re-check each upgrade against your own versions)

Depending on which bridge implementation strategy you pick (see
`architecture.md`): if you feed a `SupportsAgentRun` shim into
`add_agent_framework_fastapi_endpoint`, you may need to patch its local
approval-interception behavior so decisions actually reach your forwarder, and
you may need to split multi-tool-call snapshot messages if your CopilotKit
version only renders the first tool call in a message (re-verify this against
your actual installed CopilotKit version — do not assume it's still true). If
you hand-roll the AG-UI translation directly (see `architecture.md` strategy
2), these specific patches don't apply, since you control the event emission
yourself. Either way, your bridge must NOT send `x-ms-user-isolation-key`
(deployed agents use Entra isolation → 400).

## Roadmap: shared / predictive state through the bridge

Shared State, Predictive State, and Agentic Generative UI are emitted **natively by
the AG-UI adapter when it wraps an in-process `Agent`** (via `state_schema` +
`predict_state_config`). Through a hosted-agent-first bridge they are **not yet
proven working**: the bridge would need to relay
`response.function_call_arguments.delta` as growing tool-call args, and to
forward `useAgent.setState` (RunInput.state) to the hosted agent. The plumbing
is understood (the AG-UI adapter synthesises StateDelta/Snapshot from
streaming tool-call args) but is left as a follow-up — treat patterns #4/#6/#7
as out of scope unless you build and verify this yourself; the validated,
proven-live scope through the bridge is read + tool-render + HITL (patterns
#1/#2/#3).
