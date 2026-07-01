---
name: foundry-hosted-agent-copilotkit
description: "Build a complete agentic web app on the Azure AI Foundry hosted-agent + AG-UI + CopilotKit stack: a Next.js/CopilotKit v2 chat UI over a light FastAPI/AG-UI bridge that forwards every turn to ONE Microsoft Agent Framework agent hosted in Azure AI Foundry, with native human-in-the-loop approval on consequential tools. Requires an Azure AI Foundry project (paid). Triggers: agentic app, CopilotKit app, AG-UI bridge, Foundry hosted agent, Microsoft Agent Framework, human-in-the-loop/HITL approval, approval_mode always_require, confirm_changes. Also for fixing the known traps: HITL approve-resume 400 'No tool output found', confirm_changes mis-wired, AG-UI snapshot cards vanishing, CopilotKit catch-all route 404/422, useSingleEndpoint, keyless Foundry 401 audience, Docker Hub rate-limit on ACR build."
---

# Foundry hosted agent + AG-UI + CopilotKit apps

Build an agentic web app on the **hosted-agent-first** standard: ALL intelligence
(`FoundryChatClient` + tools + HITL + history) runs in an **Azure AI Foundry HOSTED
agent** (Responses protocol). A **light bridge** (Container App, no LLM/tools) speaks
AG-UI to a Next.js/CopilotKit UI, forwards every turn to the hosted agent, translates
Responses → AG-UI, and absorbs framework bugs. CopilotKit (**v2** hooks) is the UI
layer: chat, generative cards, forms, approval, and shared/predictive state.

> **Prerequisite (paid service):** this stack targets **Azure AI Foundry**. You need
> an Azure subscription, a provisioned Foundry project, `az login`, and the `azd`
> Foundry extension. There is no fully-offline path — local dev runs the *real* agent
> via `azd ai agent run`.

```
 Next.js + CopilotKit v2 (frontend/)          Foundry HOSTED agent = the BRAIN
   useAgent / useFrontendTool /                 src/agent.py build_hosted_agent():
   useRenderTool / useHumanInTheLoop              FoundryChatClient (Responses)
   route.ts (CopilotSseRuntime + HttpAgent)       ALL @tools + HITL + history
        │  AG-UI / SSE                                    ▲ Responses (stream) +
        ▼                                                 │ mcp_approval_response
   BRIDGE (backend/bridge_app.py)                         │
     HostedProxyAgent → forwards turns to the hosted agent, translates
       Responses→AG-UI, forwards mcp_approval_response on approve (tool re-executes).
       Same code drives the LOCAL agent (`azd ai agent run`, DIRECT mode) and the
       DEPLOYED agent (platform mode) — no mock anywhere.
     (+ SSE keepalive, optional API key.)
   GOVERNANCE: build_hosted_agent() + ResponsesHostServer (azd) publishes the agent.
```

**Golden rule:** `azd` SUCCESS, a dev server starting, or one chat reply is **not**
proof. Because all logic is server-side, you are done only when the structural and
end-to-end checks pass AND a **live** browser E2E against the deployed hosted agent
passes for the patterns in scope. Never declare success on an unverified build.

## 0. Orient

- `LOAD` [`references/architecture.md`](references/architecture.md) — hosted-first
  topology; what lives where; the native-path test matrix proving why the
  hand-rolled bridge is the minimum.
- `LOAD` [`references/patterns-7.md`](references/patterns-7.md) — the 7 AG-UI
  dojo patterns on this stack (Agentic Chat, Backend Tool Rendering, HITL,
  Tool-Based Generative UI, Agentic Generative UI, Shared State, Predictive
  State) with source citations.
- `LOAD` [`references/troubleshooting.md`](references/troubleshooting.md) —
  every known trap → symptom → fix.
- `LOAD` [`references/hosted-deploy.md`](references/hosted-deploy.md) — Foundry
  hosted-agent deploy gotchas (azd, remote build, dependency pinning).

Read all four reference docs before writing any code; they encode the
load-bearing rules, the framework traps, and the Definition of Done that keep
this stack correct — do not reinvent the bridge, the patches, or the state
machinery from scratch each time.

## 1. Scaffold (always start here)

Create the project with this layout (lowercase-hyphen app name), then wire it
per the architecture in `references/architecture.md`:

```
<app-name>/
  frontend/            # Next.js + CopilotKit v2
    app/api/copilotkit/[[...slug]]/route.ts   # catch-all bridge route
    components/                                # useAgent / useFrontendTool /
                                                # useRenderTool / useHumanInTheLoop
  backend/
    bridge_app.py       # HostedProxyAgent — forwards turns + mcp_approval_response
    src/agent.py         # build_hosted_agent() -> FoundryChatClient (Responses)
  azure.yaml / infra/    # azd config to provision + publish the hosted agent
```

Keep the agent-name token (`AGENT_NAME`, the CopilotKit agent id, the route, the
hosted yaml) consistent across every file. The result must run end-to-end and
pass the checks in step 3 before you customize anything.

## 2. Customize to the user's prompt — extension points

Edit `src/agent.py` (the hosted brain via `build_hosted_agent()`):
- Instructions — the agent's behavior for the requested domain.
- Tools — keep **≥1 read tool** (no side effects) and **≥1 consequential tool**
  decorated `@tool(approval_mode="always_require")`. Map the user's "needs approval
  before X" to the gated tool. For shared/predictive/generative-UI features, add the
  `state_schema` + `predict_state_config` shape from `references/patterns-7.md`.
- Update the smoke script's domain prompts (read prompt / action prompt / state field
  / read tool) to match your tools so the E2E exercises the chosen patterns against
  the real agent.

Edit `frontend/components/` (CopilotKit **v2** hooks — see `references/patterns-7.md`):
- `useFrontendTool` (client tools / tool-based generative UI), `useRenderTool`
  (backend tool cards), `useHumanInTheLoop` (HITL approval; keep the
  `{ accepted, steps }` contract), `useAgent` (shared / predictive state).

**Do NOT touch** (load-bearing and proven):
- the bridge wiring in `backend/bridge_app.py` (`HostedProxyAgent` + the one
  snapshot-split workaround);
- `build_hosted_agent()` (`FoundryChatClient`, Responses) in `src/agent.py`;
- the CopilotKit bridge route `frontend/app/api/copilotkit/[[...slug]]/route.ts`.

## 3. Prove it

```bash
make verify     # structural: bridge wiring, FoundryChatClient, HITL contract, names, MCR base
make smoke      # the BRIDGE against the REAL agent running locally via `azd ai agent
                # run` — read works, action PAUSES, approve executes, reject doesn't,
                # state deltas flow for the shared/predictive patterns in scope.
                # Needs `az login` + a provisioned Foundry project.
```

Both must be green. Then `make local` (dev loop) and, in a Foundry-enabled tenant,
`make up` (azd → hosted agent) followed by a **live browser E2E** — the real DoD,
since all logic is server-side.

## Load-bearing rules (why the template is shaped this way)

### The bridge forwards HITL to the hosted agent (hand-rolled — and necessary)
- **Deployed:** `bridge_app.py` mounts `HostedProxyAgent` (a `SupportsAgentRun`) on
  the AG-UI endpoint. It forwards each turn to the deployed Foundry hosted agent over
  streaming Responses, translates the output to AG-UI (text, tool cards,
  `confirm_changes`), and on HITL approve forwards an `mcp_approval_response` so the
  gated tool **re-executes server-side**. `bridge_app.py` neutralises ag-ui's LOCAL
  approval interception so the decision reaches the agent.
- **Why hand-rolled, not the native `add_agent_framework_fastapi_endpoint(FoundryAgent)`:**
  re-verified live on the latest packages (matrix in `references/architecture.md`).
  The native path needs `allow_preview=True` just to reach the hosted-agent endpoint,
  and even then — with or without the ag-ui patches — HITL **approve does NOT
  re-execute** the tool: the `FoundryAgent` client has no client-side
  `mcp_approval_response`. The hand-rolled forwarder fills exactly that one gap.
  Tracked upstream as
  [microsoft/agent-framework#6652](https://github.com/microsoft/agent-framework/issues/6652);
  retire the shim when it closes.
- **Local dev (`make local`/`make smoke`):** `azd ai agent run` runs the REAL agent
  (`ResponsesHostServer` + `FoundryChatClient`) on your machine, connected to your
  Foundry project's model; the bridge points at it in **DIRECT mode**
  (`HOSTED_AGENT_DIRECT_URL`), driving the SAME `HostedProxyAgent` path as production —
  no mock anywhere.
- Why a bridge at all: you **cannot** point `@ag-ui/client` at a deployed hosted
  agent — `ResponsesHostServer` speaks OpenAI Responses, not AG-UI.
- The bridge must NOT send `x-ms-user-isolation-key` (deployed agents use Entra
  isolation → 400). An SSE keep-alive keeps the stream alive during silent tools.

### Client choice (load-bearing)
- **`build_hosted_agent` → `FoundryChatClient` (Responses)** — the single brain, the
  SAME code locally (`azd ai agent run`) and deployed (`azd up`). Required so the
  hosted `mcp_approval_request`/`mcp_approval_response` re-executes the gated tool
  (verified live: 100→125 deployed, 100→110 local). No mock client. The Responses
  `OpenAIChatClient` / Chat Completions path 500s on hosted approve-resume — do not
  use it here.

### Framework workarounds — minimal, re-check each upgrade
`bridge_app.py` patches (both proven load-bearing by the smoke E2E): (a) route HITL
approvals to the hosted agent (not local); (b) split multi-tool snapshot messages
(CopilotKit v1 renders only `toolCalls[0]`). Re-run the native-path matrix in
`references/architecture.md` on each upgrade and delete a patch the moment the
framework closes the gap.

### The 7 AG-UI patterns
See `references/patterns-7.md`. Through the deployed/local hosted bridge: Agentic
Chat, Backend Tool Rendering, HITL (forwarded). Shared/predictive state through the
bridge is roadmap (native only when the AG-UI adapter wraps an in-process agent).

### HITL contract
- A `@tool(approval_mode="always_require")` tool surfaces as a `confirm_changes`
  tool call (with `function_name`, `function_arguments`, `steps`). The frontend
  (`useHumanInTheLoop`) resolves it with `{ accepted: boolean, steps }` (NOT
  `{ approved }`). The framework's native approval flow re-executes on accept.

### CopilotKit (UI layer)
- **v2 React hooks** (`@copilotkit/react-core/v2`): `useAgent`, `useAgentContext`,
  `useFrontendTool`, `useRenderTool`, `useHumanInTheLoop`.
- **Bridge route:** catch-all `app/api/copilotkit/[[...slug]]/route.ts`; import
  `@copilotkit/runtime/v2`; `createCopilotHonoHandler` (multi-route, not the
  single-route Next endpoint); re-export POST/GET/PATCH/DELETE;
  `<CopilotKit useSingleEndpoint={false}>`. Any miss → Threads 404/405/422.

### Containers
Use **MCR** base images (`mcr.microsoft.com/devcontainers/python:3.12`,
`.../typescript-node:20`). Docker Hub anonymous pulls hit `toomanyrequests` on
`az acr build` / ACR Tasks.

## Anti-patterns

- **Hand-rolling a NEW Responses→AG-UI proxy from scratch.** Reuse the proven
  `HostedProxyAgent`. (The framework-native
  `add_agent_framework_fastapi_endpoint(FoundryAgent(...))` does NOT forward HITL
  approve — that is why the hand-rolled forwarder exists.)
- Putting business logic the agent should own into the bridge — the bridge is just
  the framework endpoint + SSE keepalive + optional upload.
- Using the Responses `OpenAIChatClient` for `build_hosted_agent` — use
  `FoundryChatClient`.
- Resolving approval with `{ approved }` instead of `{ accepted, steps }`.
- `useSingleEndpoint` left at its default `true` (Threads/Info 404).
- A consequential tool **without** `approval_mode="always_require"` (no HITL gate).
- Docker Hub base images in any Dockerfile.
- Declaring success because a server started — run the structural + smoke checks, and
  for the deployed (server-side) path a live browser E2E.

## Definition of Done

The app is **not** done until all are true (evidence-backed):

- [ ] Structural check green (bridge mounts `HostedProxyAgent`; `build_hosted_agent`
      uses `FoundryChatClient`; the bridge forwards HITL; HITL contract; names; MCR).
- [ ] Smoke E2E green: the bridge against the REAL agent (run locally via
      `azd ai agent run`) shows read works; the consequential prompt PAUSES; approve
      executes; reject does not; and for shared/predictive patterns in scope, state
      flows.
- [ ] `src/agent.py` has `build_hosted_agent()` (`FoundryChatClient`), ≥1 read tool
      and ≥1 `approval_mode="always_require"` tool.
- [ ] Agent name is consistent across `src/agent.py`, the route, the CopilotKit
      provider, and the hosted yaml.
- [ ] No secrets, endpoints, or app-specific hard-coding committed.
- [ ] **Live** (the deployed path drives a server-side agent): `make up` succeeds, the
      bridge runs with `HOSTED_AGENT_NAME` → `HostedProxyAgent` → the deployed agent,
      and a **real browser E2E** passes for the patterns in scope — HITL approve **and**
      reject, plus any shared/predictive state round-trip and generative-UI cards.
