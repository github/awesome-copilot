# The 7 AG-UI patterns on the hosted-agent + light-bridge stack

These are the AG-UI dojo "Microsoft Agent Framework Python" feature patterns,
adapted to our standard (intelligence in the Foundry HOSTED agent; a light bridge;
CopilotKit **v2** UI hooks). Canonical source: backend agents from
`microsoft/agent-framework`
(`python/packages/ag-ui/agent_framework_ag_ui_examples/agents/*`) and the v2
frontend pages from `ag-ui-protocol/ag-ui`
(`apps/dojo/src/app/[integrationId]/feature/(v2)/*`).

CopilotKit **v2** hooks (`@copilotkit/react-core/v2`):
`useAgent`, `useAgentContext`, `useFrontendTool`, `useRenderTool`,
`useHumanInTheLoop`.

| # | Pattern | Hosted-agent side | CopilotKit v2 UI | Through the bridge |
|---|---|---|---|---|
| 1 | Agentic Chat (frontend tools) | plain `Agent` (no server tool needed) | `useFrontendTool({name,parameters,handler})` (runs in browser) + `useAgentContext` | native — client tool, agent just emits the tool call |
| 2 | Backend Tool Rendering | `@tool` (executes server-side) | `useRenderTool({name,parameters,render})` | native — `function_call`/`function_call_output` forwarded |
| 3 | HITL approval | `@tool(approval_mode="always_require")` | `useHumanInTheLoop({name,render})` → `respond({accepted, steps})` | native function-approval; surfaces as `confirm_changes` |
| 5 | Tool-Based Generative UI | `FunctionTool(func=None)` (declaration-only) + `tool_choice="required"` | `useFrontendTool({name,handler,render,followUp:false})` | native — stream tool-call args to the renderer |
| 4 | Agentic Generative UI | `predict_state_config` + `require_confirmation=False`; stream step status via tool args | `useAgent({updates:[OnStateChanged]})` → `agent.state` | **bridge synthesizes** StateDelta/Snapshot from arg-deltas |
| 6 | Shared State | `AgentFrameworkAgent(state_schema, predict_state_config, require_confirmation=False)` | `useAgent` + `agent.setState()` | **bridge synthesizes** state + **forwards** `setState` → hosted input |
| 7 | Predictive State Updates | same as #6 but `require_confirmation=True` (default) + `@tool(approval_mode="always_require")` | `useAgent` + `useHumanInTheLoop` (confirm/reject) | synthesized streaming state + HITL confirm |

## How it works on this stack

- **Native adapter (reference):** `add_agent_framework_fastapi_endpoint(agent)`
  natively emits all AG-UI events — text, TOOL_CALL_* cards, function-approval HITL,
  and StateSnapshot/Delta (via `state_schema`+`predict_state_config`) — *when it
  wraps a plain in-process `Agent`*. The templates don't run the agent in-process;
  they keep all logic in the Foundry hosted agent and reach it through the bridge.
- **Deployed (hosted agent):** the bridge is `HostedProxyAgent`, NOT the native
  `add_agent_framework_fastapi_endpoint(FoundryAgent(...))`. The native FoundryAgent
  path translates read/cards/HITL-*pause*, but on HITL **approve it does NOT
  re-execute** the hosted tool (it resolves `confirm_changes` locally; the Foundry
  client has no `mcp_approval_response` forwarding — verified live). `HostedProxyAgent`
  forwards `mcp_approval_response` to the hosted agent so the gated tool re-executes
  server-side. Use it for any deployed app with HITL.

| # | Pattern | Hosted-agent side | CopilotKit v2 UI | Through the bridge |
|---|---|---|---|---|
| 1 | Agentic Chat | plain Agent | `useFrontendTool` | native |
| 2 | Backend Tool Rendering | `@tool` | `useRenderTool` | HostedProxyAgent forwards function_call/result |
| 3 | HITL approval | `@tool(approval_mode="always_require")` | `useHumanInTheLoop` → `{accepted, steps}` | bridge forwards mcp_approval_response (re-executes) |
| 5 | Tool-Based Generative UI | `FunctionTool(func=None)` | `useFrontendTool` render | stream tool-call args |
| 4 / 6 / 7 | Agentic Generative / Shared / Predictive State | `state_schema` + `predict_state_config` | `useAgent` + `setState` | bridge relays text/tool-arg deltas; state synthesis through the deployed bridge is roadmap (native only when the adapter wraps an in-process agent) |

## HITL contract

The gated tool surfaces as `confirm_changes` (with `function_name`,
`function_arguments`, `steps`); the UI (`useHumanInTheLoop`) resolves
`{ accepted: boolean, steps }`. Deployed: Accept → `mcp_approval_response{approve:true}`
(tool re-executes server-side), Reject → `approve:false`.

## Framework workarounds (minimal; re-check each upgrade)

`bridge_app.py` patches: (a) neutralise ag-ui's local approval interception
so approvals reach the hosted agent; (b) split multi-tool snapshot messages
(CopilotKit v1 renders only `toolCalls[0]`; set `DISABLE_C9_SPLIT=1` on a v2 frontend).
The bridge must NOT send `x-ms-user-isolation-key` (deployed agents use Entra
isolation → 400).

## Roadmap: shared / predictive state through the DEPLOYED bridge

Shared State, Predictive State, and Agentic Generative UI are emitted **natively by
the AG-UI adapter when it wraps an in-process `Agent`** (via `state_schema` +
`predict_state_config`). Through the DEPLOYED bridge they are **not yet wired**: the
hosted Responses stream would need `HostedProxyAgent` to relay
`response.function_call_arguments.delta` as growing tool-call args, and to forward
`useAgent.setState` (RunInput.state) to the hosted agent. The plumbing is understood
(the AG-UI adapter synthesises StateDelta/Snapshot from streaming tool-call args) but
is left as a follow-up — current templates ship the validated read + tool-render +
HITL through the deployed bridge.
