---
name: foundry-hosted-agent-copilotkit
description: 'Ongoing development guidance for agentic web apps that pair a CopilotKit frontend with Microsoft Agent Framework agents on Azure AI Foundry hosted agents over the AG-UI protocol - add and gate agent tools, wire human-in-the-loop approvals, build generative UI and shared state, debug the event stream, upgrade pre-1.0 packages safely, and deploy hosted agent updates.'
---

# Developing with CopilotKit + AG-UI + Azure AI Foundry Hosted Agents

Use this skill for development work inside an EXISTING application built on this stack: a React/Next.js frontend using CopilotKit, connected over the AG-UI protocol to a Microsoft Agent Framework (MAF) agent (Python or .NET) that runs as — or is being developed against — an Azure AI Foundry hosted agent (paid Azure service; usage may incur costs).

Do NOT use this skill to scaffold a new project. Dedicated scaffolders exist (the CopilotKit CLI, `azd ai agent init`); use those, then return here for everything that follows: adding tools, gating them behind approvals, generative UI, shared state, debugging, dependency upgrades, and deploying agent updates.

## Mental model

```text
CopilotKit hooks (React)            useFrontendTool / useHumanInTheLoop /
        │                           useRenderToolCall / useCoAgent
        ▼
CopilotKit Runtime (route handler)  agents: { <name>: new HttpAgent({ url }) }
        │  AG-UI events over SSE
        ▼
AG-UI endpoint                      ← WHERE this lives defines your architecture
        │
        ▼
MAF Agent (tools, approval modes)   → model deployment
```

The single most important fact: **a deployed Foundry hosted agent endpoint does not speak AG-UI by default.** It exposes an OpenAI Responses endpoint (`.../protocols/openai/responses`) and/or a raw `.../protocols/invocations` endpoint. AG-UI must be produced somewhere, and where it is produced determines how every feature (especially human-in-the-loop) behaves. The three wirings are described in [references/architecture.md](references/architecture.md).

## Workflow

Follow these steps for every task on this stack:

1. **Identify the wiring first.** Inspect the codebase before changing anything:
   - `add_agent_framework_fastapi_endpoint(...)` (Python) or `MapAGUI(...)` (.NET) wrapping an in-process agent → Architecture A (in-process AG-UI endpoint).
   - A hosted agent whose own container serves AG-UI, declared with `protocol: invocations` in `agent.yaml` → Architecture B.
   - A separate service translating between the AG-UI endpoint and a hosted agent's `/responses` endpoint (look for `previous_response_id`, `mcp_approval_response`, or a Foundry `conversation` object in the code) → Architecture C (translation bridge).
   - Confirm the frontend agent name: the key in the runtime `agents` config, the `agent` prop on the `<CopilotKit>` provider, and the hosted agent name in `agent.yaml` must all agree.
2. **Ground in live documentation.** Every layer here is pre-1.0 or preview and moves between minor versions. Never trust memorized APIs:
   - MAF and Foundry hosted agents: use the Microsoft Docs MCP tools when available, otherwise learn.microsoft.com (`/agent-framework/integrations/ag-ui/`, `/azure/foundry/`).
   - CopilotKit: docs.copilotkit.ai (Microsoft Agent Framework section). Verify hook and runtime API names against the TypeScript declarations bundled in the installed `@copilotkit/*` packages — names have churned (`useCopilotAction` is legacy; current names include `useFrontendTool`, `useHumanInTheLoop`, `useRenderToolCall`, `useCoAgent`).
   - AG-UI protocol: docs.ag-ui.com (event reference, dojo patterns).
3. **Execute the task** using the matching reference below.
4. **Verify adversarially.** A compiling build, a started dev server, or one successful chat reply is NOT proof. Apply the completion criteria at the end of this skill.

## References

Load on demand; each is self-contained:

| Reference | Load when |
| --- | --- |
| [references/architecture.md](references/architecture.md) | Choosing or understanding the wiring; local-vs-deployed modes; why a translation bridge exists and what it must handle |
| [references/patterns.md](references/patterns.md) | Implementing any of the 7 AG-UI interaction patterns (frontend tools, backend tool rendering, HITL, generative UI, shared state, predictive state) |
| [references/hitl.md](references/hitl.md) | Adding or debugging human-in-the-loop approvals, including the known duplicate-execution hazard |
| [references/troubleshooting.md](references/troubleshooting.md) | Any failure: symptom → root cause → fix tables for every layer |
| [references/upgrading.md](references/upgrading.md) | Bumping any dependency; version compatibility rules; tracked upstream issues |
| [references/deploy-loop.md](references/deploy-loop.md) | Running the agent locally with `azd ai agent run`, deploying updates, deployment gotchas |

## Task playbooks

### Add or modify an agent tool

1. Define the tool on the agent (`@tool` in Python; `AIFunctionFactory.Create` in .NET) with typed, described parameters.
2. Keep docstrings grounding-safe: do not put concrete example values in parameter descriptions for fields the model must derive from real data — models copy literal examples. Use placeholders and validate inside the tool.
3. Return compact, model-consumable values; rich formatting belongs in the UI render, not the tool result.
4. Decide the approval mode now: side-effecting tools get `approval_mode="always_require"` (see [references/hitl.md](references/hitl.md)); read-only tools stay unrestricted.
5. If the tool call should render in the UI, add a `useRenderToolCall`/render entry for it ([references/patterns.md](references/patterns.md)).
6. Verify live: trigger the tool through the chat UI, confirm the call and result stream as `TOOL_CALL_*` events, and confirm renamed or re-typed parameters did not break any frontend component that parses the arguments.

### Wire human-in-the-loop onto an existing tool

Follow [references/hitl.md](references/hitl.md) end to end. Summary: mark the tool (`approval_mode="always_require"` / `ApprovalRequiredAIFunction`), enable confirmation on the AG-UI wrapper, register the approval UI hook on the frontend, and make the response payload shape match what the server detection expects. Then test approve AND reject AND a follow-up turn after approval (see the duplicate-execution hazard).

### Build generative UI or shared state

Follow the pattern table in [references/patterns.md](references/patterns.md). Know the honesty caveat: state synchronization patterns are native when the AG-UI adapter wraps an in-process agent (Architecture A/B); through a Responses-protocol bridge (Architecture C) they require explicit synthesis work — check what the codebase actually implements before promising the feature.

### Debug a broken flow

1. Reproduce at the lowest layer first: `curl -N` the AG-UI endpoint with a minimal `RunAgentInput` JSON body and read the raw SSE events. If the bug reproduces there, the frontend is innocent.
2. For hosted agents, go one layer lower: call the agent's `/responses` endpoint directly. This is how the known re-execution bug was isolated to the framework rather than the UI stack.
3. Match the symptom against [references/troubleshooting.md](references/troubleshooting.md) — exact error strings are listed.
4. Restart a locally running hosted agent (`azd ai agent run`) between verification passes if the agent holds in-memory state; stale state makes tests pass or fail for the wrong reason.

### Upgrade dependencies

Follow [references/upgrading.md](references/upgrading.md). Never bump a single package in isolation: the version relationship rules there (runtime ↔ AG-UI client, agent-framework line consistency, hosting protocol ↔ manifest version) must hold simultaneously, and any local workaround must be re-validated against its tracked upstream issue before removal.

### Deploy an agent update

Follow [references/deploy-loop.md](references/deploy-loop.md): iterate locally against the real agent with `azd ai agent run`, then `azd deploy` (each deploy creates a new agent version), then verify the deployed agent — including the approval pause — before declaring success.

## Completion criteria

A change on this stack is done only when ALL of these hold:

1. The read/query path works through the real UI (not only via curl).
2. Every approval-gated tool was tested both ways: approve → the tool executes server-side and state visibly changes; reject → the tool does not run and the agent acknowledges.
3. At least one follow-up turn was sent in the same thread after an approval, and the gated tool did NOT silently execute again ([references/hitl.md](references/hitl.md), duplicate-execution hazard).
4. Tool calls render correctly at stream end, not just during streaming (message snapshots can differ from live events).
5. For deployed changes: the checks above were run against the deployed endpoint, not only locally — deployment success is not proof of behavior.
