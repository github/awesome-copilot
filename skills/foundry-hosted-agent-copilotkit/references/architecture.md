# Architecture: where AG-UI is produced

The stack has three layers that must agree: CopilotKit (React hooks + runtime), the AG-UI protocol (SSE event stream), and the Microsoft Agent Framework (MAF) agent, optionally running as an Azure AI Foundry hosted agent. The deployed Foundry hosted agent endpoint speaks OpenAI Responses (`{project_endpoint}/agents/{name}/endpoint/protocols/openai/responses`) or a raw invocations protocol (`.../protocols/invocations`) — **not AG-UI**. Pointing `HttpAgent` from `@ag-ui/client` directly at a hosted agent's Responses endpoint does not work.

There are three viable wirings. Identify which one the codebase uses before changing anything.

## Architecture A — in-process AG-UI endpoint (agent runs inside your service)

The agent object lives in the same process as the AG-UI HTTP endpoint.

Python:

```python
from agent_framework import Agent
from agent_framework_ag_ui import AgentFrameworkAgent, add_agent_framework_fastapi_endpoint
from fastapi import FastAPI

agent = Agent(name="assistant", instructions="...", client=chat_client, tools=[...])
wrapped = AgentFrameworkAgent(agent=agent, require_confirmation=True)  # HITL on
app = FastAPI()
add_agent_framework_fastapi_endpoint(app, wrapped, "/")
```

.NET: `builder.Services.AddAGUI()` + `app.MapAGUI("/", agent)` from `Microsoft.Agents.AI.Hosting.AGUI.AspNetCore`, with approval middleware (see hitl.md).

- All 7 AG-UI patterns (including state snapshots/deltas) work natively — the adapter sees the agent's internal events.
- The model client can still be a Foundry model deployment; "in-process" refers to where the *agent loop* runs, not the model.
- This is what the CopilotKit CLI and MAF samples produce, and the right choice when you don't need platform-managed conversations, per-user isolation, or Foundry-managed compute.

## Architecture B — hosted agent serves AG-UI itself (invocations protocol)

The hosted agent's own container speaks AG-UI, deployed under Foundry's `invocations` protocol ("Custom streaming protocol (AG-UI, etc.) → Invocations" per the Foundry hosted-agents docs). The `agent.yaml` declares:

```yaml
protocols:
  - protocol: invocations
    version: 2.0.0
```

and the container serves AG-UI requests at `/invocations` (Microsoft's `foundry-samples` repository has a bring-your-own invocations AG-UI sample under `samples/python/hosted-agents/bring-your-own/invocations/ag-ui/`). The CopilotKit runtime's `HttpAgent` points at the deployed invocations endpoint.

- AG-UI features behave like Architecture A because the adapter still wraps the in-process agent — it just runs inside Foundry-managed compute.
- You give up the Responses protocol's platform-managed conversation history; conversation state is yours to manage.
- Calls to the deployed endpoint need Entra auth (`DefaultAzureCredential`), so the CopilotKit runtime usually still needs a thin server-side proxy to attach tokens — browsers cannot call it directly.

## Architecture C — translation bridge to a Responses-protocol hosted agent

The hosted agent is deployed with the `responses` protocol (platform-managed conversation history, agent versioning, per-user isolation), and a separate bridge service translates between AG-UI and the Responses stream. This is the highest-effort wiring; choose it only when you specifically need the Responses platform features.

The bridge must handle, at minimum:

1. **Stream translation**: OpenAI Responses SSE events → AG-UI events (`response.output_text.delta` → `TEXT_MESSAGE_CONTENT`, function call items → `TOOL_CALL_*`, `response.completed` → `RUN_FINISHED`, etc.).
2. **Turn derivation, not history replay**: derive each turn's input from the latest user message (or an approval decision). Replaying the full raw AG-UI message history to the Responses endpoint fails with 400 errors about orphaned tool calls.
3. **HITL forwarding**: surface the hosted agent's `mcp_approval_request` to the UI, and forward the user's decision back as an `mcp_approval_response` input item — approved tools then re-execute *server-side*. The stock AG-UI adapter resolves approvals locally and never forwards them to a remote agent (tracked as microsoft/agent-framework#6652), so a bridge needs explicit code for this path. Verify against the current package version whether this is still required before writing custom routing.
4. **Conversation continuity**: either `previous_response_id` chaining (local/direct mode) or a Foundry `conversation` object (deployed/platform mode). See hitl.md for the critical hazard with `previous_response_id` chaining across approval turns.
5. **State synthesis caveat**: `STATE_SNAPSHOT`/`STATE_DELTA` events are NOT produced by a Responses stream. Shared-state and predictive-state patterns require the bridge to synthesize them (e.g. from `response.function_call_arguments.delta`); if the bridge doesn't implement that, those patterns silently don't work. Check before promising the feature.

Bridge state (response-id or conversation cache) is typically in-memory: run a single replica or externalize the cache before scaling out.

## Local development modes

- **Architecture A/B**: run the FastAPI/ASP.NET service directly; point the CopilotKit runtime's `HttpAgent` at `http://localhost:<port>/`.
- **Hosted agents (B/C)**: `azd ai agent run` runs the REAL hosted agent locally (default port 8088) using your `az login` credentials and the provisioned Foundry project — there is no mock. `azd ai agent invoke --local "..."` sends a single test payload. A bridge in local mode points at the bare local endpoint instead of the deployed one (commonly switched by a single environment variable holding the direct URL).

## CopilotKit runtime wiring (all architectures)

The AG-UI endpoint, wherever it lives, registers in the CopilotKit runtime as an `HttpAgent`:

```ts
import { HttpAgent } from "@ag-ui/client";
import { CopilotRuntime } from "@copilotkit/runtime";

const runtime = new CopilotRuntime({
  agents: { "my_agent": new HttpAgent({ url: process.env.AGUI_BACKEND_URL! }) },
});
```

and the provider selects it by name: `<CopilotKit runtimeUrl="/api/copilotkit" agent="my_agent">`. Name drift between the `agents` key, the `agent` prop, and (for hosted agents) the name in `agent.yaml` is a recurring failure — keep one constant.

Frontend tools registered with `useFrontendTool` flow through the runtime into the AG-UI `RunAgentInput.tools` array and become callable by the agent; this is native in all three architectures.

## Auth to Foundry endpoints

- Token audience is `https://ai.azure.com/.default` — the default `cognitiveservices.azure.com` scope yields 401 "audience is incorrect".
- Keyless (Entra / `DefaultAzureCredential`) is the norm; the async Python credential path needs `aiohttp` installed.
- Never send `x-ms-user-isolation-key` to a deployed agent — deployed agents derive isolation from the Entra identity and reject the header with a 400.
