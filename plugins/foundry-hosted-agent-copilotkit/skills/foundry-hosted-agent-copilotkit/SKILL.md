---
name: foundry-hosted-agent-copilotkit
description: 'Build and evolve agentic web apps that pair a CopilotKit React frontend with a Microsoft Agent Framework agent running as a Microsoft Foundry hosted agent, connected over the AG-UI protocol. Covers choosing the wiring, using Foundry-native primitives instead of hand-rolled plumbing, agent tools, human-in-the-loop approvals, generative UI and shared state, local run and azd deploy, debugging the event stream, and safe upgrades.'
---

# CopilotKit + AG-UI + Microsoft Foundry hosted agents

Use this skill when a React/Next.js app uses CopilotKit and talks over AG-UI to a Microsoft Agent Framework (MAF) agent hosted in Microsoft Foundry. This covers new builds and changes to existing apps. Foundry hosted agents are a paid Azure service.

Scaffold the agent with `azd ai agent init` and the frontend with your usual React/Next.js tooling. Then follow this skill for everything that connects them.

## Mental model

```text
React (CopilotKit v2)        CopilotKitProvider / CopilotChat threadId=<conv_ id> / useInterrupt
      │ HTTP
CopilotKit runtime           CopilotRuntime({ agents: { default: new HttpAgent({ url }) } })
      │ AG-UI (SSE)
AG-UI gateway (FastAPI)      add_agent_framework_fastapi_endpoint(app, AgentFrameworkAgent(FoundryAgent(...),
                               use_service_session=True, service_session_id_from_thread_id=True))   ← keeps no thread state
      │ OpenAI Responses + Entra token (https://ai.azure.com/.default)
Foundry hosted agent         ResponsesHostServer(Agent(tools=[...]))  ← deployed with azd
```

**A deployed hosted agent does not speak AG-UI.** It exposes `.../agents/<name>/endpoint/protocols/openai/responses` (Responses protocol) or `.../protocols/invocations`. Translate with MAF's own adapter (`FoundryAgent` + `agent-framework-ag-ui`) instead of writing an SSE translator by hand. Browsers cannot hold the Entra token, so the gateway is always server-side.

## Use the platform first

Before you write any plumbing, check this table. Each row is something older codebases built by hand.

| Need | Native primitive (don't hand-roll) |
| --- | --- |
| Conversation history across turns and restarts | Foundry **conversations**: create one per chat, use its `conv_…` ID as the AG-UI thread ID, and the gateway passes it through (no snapshot store) |
| Durable tool approvals | `ResponsesHostServer` persists approval requests by default (`FoundryFunctionApprovalStore`). The AG-UI adapter turns them into AG-UI interrupts and forwards decisions back to the hosted agent |
| Runs that survive browser disconnects | Responses `background: true` + `store: true`, then poll or reconnect (see [wiring](references/wiring.md#background-runs-gateway)) |
| Durable multi-step workflows with gates | Invocations hosted agent + `@multi_turn_task` + `FoundryStateStore` |
| Per-user files for the agent | Session Files API; the agent reads `$HOME` with its own tools. Never inline large documents into the prompt |
| Long-term user memory | Foundry Memory Store (user scope) or `FoundryMemoryProvider` |
| Tool catalogs, web search, code interpreter | Foundry **Toolbox** (`FoundryToolbox`) with Tool Search, instead of listing every tool up front |
| Live docs while coding | The Microsoft Learn and Foundry MCP servers (bundled with this skill's plugin) |

## Choose the wiring

| If the app needs… | Use | Gateway size |
| --- | --- | --- |
| Hosted agent + chat + tools + approvals (**default**) | **A. AG-UI gateway over a Responses hosted agent** | ~50 lines of Python |
| Every state pattern, local prototype, no Foundry compute | **B. In-process AG-UI** (agent runs inside the FastAPI app) | ~15 lines |
| Background runs that keep going after disconnect, reconnect, per-user conversation lists | **C. Background-runs gateway** (custom AG-UI agent over Foundry conversations) | ~150 lines of TypeScript |
| Multi-step plan → approve → execute, irreversible steps that must not run twice | **D. Invocations hosted agent** alongside A or C | REST proxy |

Code for each is in [references/wiring.md](references/wiring.md). In an existing codebase, identify the wiring before you change anything:
- `FoundryAgent(...)` wrapped by `add_agent_framework_fastapi_endpoint` means A.
- `Agent(client=...)` wrapped directly means B.
- A custom `AbstractAgent` calling `/responses` with `background` means C.
- `protocol: invocations` in `azure.yaml` means D.

## Workflow

1. **Pick or identify the wiring** (table above).
2. **Use the latest release of every package** (`@copilotkit/*`, `@ag-ui/*`, `agent-framework-*`, `azd` and its `azure.ai.agents` extension). Then ground on live sources:
   - the Microsoft Learn MCP server for MAF and Foundry
   - the Foundry MCP server for project state
   - docs.copilotkit.ai and the `.d.ts` files bundled in the installed `@copilotkit/*` packages
   - docs.ag-ui.com

   APIs move between minor versions, so don't trust memorized names.
3. **Build or change it** with a playbook below.
4. **Verify adversarially** against the completion criteria. A compiling build, a started server, or one good chat reply is not proof.

## Playbooks

### Build a new app end to end (wiring A)

1. In a **fresh directory**, run `azd ai agent init --no-prompt ...` against the project. Confirm `azd env get-values` shows `FOUNDRY_PROJECT_ENDPOINT`, then write tools in `main.py` ([wiring §1](references/wiring.md#1-hosted-agent)).
2. Run it locally with `azd ai agent run` (port 8088) and smoke-test it with `azd ai agent invoke --local "hi"`.
3. `azd deploy` (each deploy creates a new agent version), then `azd ai agent invoke "hi"`.
4. Add the AG-UI gateway exactly as in [wiring §2](references/wiring.md#2-ag-ui-gateway-wiring-a), including the thread-ID-is-conversation-ID flags and the interop shim. Create a conversation, then test chat **and** an approve resume with `curl -N` using its `conv_…` ID as `threadId` before touching the UI.
5. Add the conversation route, the CopilotKit runtime route and the React provider ([wiring §3](references/wiring.md#3-copilotkit-runtime-and-react)).
6. Add `useInterrupt` approval UI and a tool renderer ([hitl.md](references/hitl.md#frontend-copilotkit-v2)).
7. Verify every completion criterion, first locally and then against the deployed agent.

### Add or change an agent tool

1. Define it with `@tool` (Python) or `AIFunctionFactory.Create` (.NET), using typed and described parameters.
2. Keep parameter descriptions free of concrete example values for data the model must derive. Models copy literal examples.
3. Return compact values. Rich formatting belongs in the UI renderer.
4. Side-effecting tools get `approval_mode="always_require"` ([hitl.md](references/hitl.md)).
5. Redeploy the hosted agent. Tools live in the hosted agent, not the gateway.
6. Verify through the UI that `TOOL_CALL_*` events stream, and that any component parsing the arguments still works.

### Generative UI and shared state (CopilotKit v2 hooks)

| Pattern | Agent side | Frontend hook |
| --- | --- | --- |
| Frontend tool (agent calls the UI) | none; arrives in `RunAgentInput.tools` | `useFrontendTool` |
| Render a backend tool call | normal `@tool` | `useRenderTool` / `useRenderToolCall` / `useDefaultRenderTool` |
| Human approval of a tool call | `approval_mode="always_require"` | `useInterrupt` → `resolve({approved})` |
| Agent asks the user for input (frontend-resolved tool) | none | `useHumanInTheLoop` → `respond(...)` |
| Shared or predictive state | `state_schema` / `predict_state_config` on `AgentFrameworkAgent` | `useAgent` (read `agent.state`) |

State patterns emit `STATE_SNAPSHOT`/`STATE_DELTA` only when the adapter can see the agent's state:
- **Wiring B** gets them natively.
- **Wiring A** needs them declared on the gateway's `AgentFrameworkAgent`. Test this before you promise the feature.
- **Wiring C** has no state events unless you synthesize them.

### Debug a broken flow

Work from the lowest layer upward:
1. Call the hosted agent with `azd ai agent invoke` or `curl` against `/responses`.
2. Call the gateway with a real conversation ID. A made-up thread ID returns HTTP 500 with this wiring:

   ```bash
   CONV=$(curl -s -X POST "$FOUNDRY_PROJECT_ENDPOINT/agents/$FOUNDRY_AGENT_NAME/endpoint/protocols/openai/conversations?api-version=v1" \
     -H "Authorization: Bearer $(az account get-access-token --resource https://ai.azure.com --query accessToken -o tsv)" \
     -H 'content-type: application/json' -d '{}' | jq -r .id)
   curl -N -X POST <gateway>/ -H 'content-type: application/json' -d '{"threadId":"'$CONV'","runId":"r1","messages":[{"id":"m1","role":"user","content":"hi"}],"tools":[],"context":[],"state":{},"forwardedProps":{}}'
   ```
3. Test the CopilotKit route.
4. Test the browser.

The first layer that fails owns the bug. Then match the symptom in [troubleshooting.md](references/troubleshooting.md). Use `azd ai agent monitor` for hosted-agent logs.

### Upgrade dependencies

Follow the version rules in [troubleshooting.md](references/troubleshooting.md#upgrades). Upgrade all packages together, then re-run the completion criteria live.

## Completion criteria

A change is done only when all of these hold:
1. The chat path works through the real UI, not only through curl.
2. Every approval-gated tool was tested both ways:
   - Approve: the tool runs once on the server and the side effect is observable.
   - Reject: the tool does not run, and the agent acknowledges it.
3. After an approval, a follow-up turn in the same thread does **not** re-run the gated tool.
4. Tool and approval cards still render after `RUN_FINISHED`, not only while streaming.
5. For deployed changes, checks 1–4 passed against the deployed agent and gateway. A successful deployment proves nothing about behavior.
