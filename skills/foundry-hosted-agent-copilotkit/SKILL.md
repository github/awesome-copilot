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
 Next.js + CopilotKit (frontend/)              Foundry HOSTED agent = the BRAIN
   useAgent / useFrontendTool /                  hosted/responses/agent.py build_hosted_agent():
   useRenderTool / useHumanInTheLoop               FoundryChatClient (Responses)
   route.ts (CopilotKit runtime + HttpAgent)       ALL @tools + HITL + history
        │  AG-UI / SSE                                     ▲ Responses (stream) +
        ▼                                                  │ mcp_approval_response
   BRIDGE (backend/ — you write this)                      │
     Forwards each turn to the hosted agent, translates its Responses stream to
       AG-UI events, forwards mcp_approval_response on approve (tool re-executes).
       Same bridge code drives the LOCAL agent (`azd ai agent run`, its local URL)
       and the DEPLOYED agent (its platform endpoint) — no mock anywhere.
     (+ SSE keepalive, optional API key.)
   GOVERNANCE: build_hosted_agent() + ResponsesHostServer (via `azd ai agent init`)
   publishes the agent.
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
this stack correct.

> **This skill is a design + rulebook with copy-adapt starter code, not an
> installable template.** [`references/snippets/`](references/snippets/README.md)
> has a verified-working
> minimum (real hosted agent, real bridge, real CopilotKit UI, a real
> Playwright browser E2E — all passed) for a generic example domain; copy it
> in and rename the domain-specific parts (see
> [`references/snippets/README.md`](references/snippets/README.md)) instead of writing the bridge/agent/HITL
> plumbing from scratch. Package APIs on this stack move fast; always confirm
> the exact class/function names, hook signatures, and route-handler mode
> against your **currently installed** package versions (`pip show` / `npm ls`
> / reading `.d.ts` or the package's own bundled docs) before trusting any
> name in this skill or the snippets verbatim — treat every concrete symbol
> here as "true as of when this was written," not as a guarantee.

## 1. Scaffold (always start here)

**Copy `references/snippets/` into your new project first** (see
`references/snippets/README.md` for the file → destination mapping), then
rename the example "records"/`REC-...` domain to your actual domain in
`hosted/responses/agent.py`, `backend/bridge_app.py`, and the frontend
components. This gets you a working read tool + gated tool + bridge + HITL UI
+ structural check + smoke test + browser E2E in one step, instead of
deriving the AG-UI event translation, the CopilotKit hook names, and the HITL
wiring from scratch — that derivation is the single biggest source of wasted
time on this stack.

**Keep the layout flat.** The agent's brain (`agent.py`) lives directly next
to `main.py` inside `hosted/responses/` — there's no separate top-level
`src/` and no `sys.path` manipulation, because nothing else imports it (the
bridge talks to the running hosted agent over HTTP, not in-process). The
bridge is a SINGLE file (`backend/bridge_app.py`), not split into a
"proxy"/"client"/"app" trio — it's one concern (translate the hosted agent's
Responses stream to AG-UI, forward HITL decisions). Don't introduce more
files or import indirection than this unless you have an actual reason to
(e.g. genuinely reusing `agent.py` from a second entry point, or the bridge
growing enough domain logic that splitting it clarifies rather than
obscures).

**Bootstrap `hosted/` (the Foundry hosted-agent project) with the `azd` Foundry
extension's own scaffolder — do not hand-write it:**

```bash
azd ai agent sample list                 # discover starter manifests
azd ai agent init -m <manifest-url>       # e.g. an agent-framework/responses/*/agent.manifest.yaml
```

This generates the real, currently-correct `hosted/` tree for your installed
extension version: `main.py`/`responses/main.py`, `agent.yaml`, `azure.yaml`,
`requirements.txt`, `Dockerfile`, and a full `infra/` (Bicep). Compare it
against `references/snippets/hosted/responses/main.py` — read the generated
`main.py` to see the CURRENT correct import paths and server class name
(`ResponsesHostServer` may live in a package named
`agent-framework-foundry-hosting`, separate from `agent-framework-foundry`;
`FoundryChatClient` may be importable from either `agent_framework.foundry`
or `agent_framework_foundry` depending on version). Do not guess; read the
generated scaffold and `pip show` the installed packages. Because `agent.py`
lives inside `hosted/responses/` (not a separate `src/`), the generated
`azure.yaml`'s Docker build `context` can stay at its default (`.`) instead
of reaching up to a parent directory.

Then place the rest of the app around it (lowercase-hyphen app name), per the
architecture in `references/architecture.md`:

```
<app-name>/
  frontend/            # Next.js + CopilotKit
    app/api/copilotkit/[[...slug]]/route.ts   # catch-all bridge route
    components/                                # useFrontendTool / useRenderTool /
                                                # useHumanInTheLoop / useAgent
  backend/
    bridge_app.py       # your ENTIRE bridge — one file (see above)
  hosted/                # generated by `azd ai agent init` above
    responses/
      agent.py           # build_hosted_agent() -> FoundryChatClient (Responses)
      main.py            # ResponsesHostServer(build_hosted_agent()).run()
```

Keep one agent-name token (`AGENT_NAME`, the hosted yaml) consistent within
`hosted/responses/` (`agent.py` and `agent.yaml`). The CopilotKit-facing
agent registry key is a **separate** identifier — see the CopilotKit section
below; it does not have
to match `AGENT_NAME`. The result must run end-to-end and pass the checks in
step 3 before you customize anything.

## 2. Customize to the user's prompt — extension points

Edit `hosted/responses/agent.py` (the hosted brain via `build_hosted_agent()`):
- Instructions — the agent's behavior for the requested domain.
- Tools — keep **≥1 read tool** (no side effects) and **≥1 consequential tool**
  decorated `@tool(approval_mode="always_require")`. Map the user's "needs approval
  before X" to the gated tool. For shared/predictive/generative-UI features, add the
  `state_schema` + `predict_state_config` shape from `references/patterns-7.md`.
- Update the smoke script's domain prompts (read prompt / action prompt / state field
  / read tool) to match your tools so the E2E exercises the chosen patterns against
  the real agent.

Edit `frontend/components/` (CopilotKit hooks — see `references/patterns-7.md`
and confirm exact hook/prop names against your installed `@copilotkit/react-core`
version's own bundled docs/types):
- `useFrontendTool` (client tools / tool-based generative UI), `useRenderTool`
  (backend tool cards), `useHumanInTheLoop` (HITL approval — the resolved
  payload shape, e.g. `{ accepted, steps }`, is a convention **you** define and
  must keep consistent between the frontend `respond(...)` call and your own
  backend parser; CopilotKit does not enforce or require any particular shape),
  `useAgent` (shared / predictive state).

**Do NOT touch** (load-bearing and proven):
- `build_hosted_agent()` (`FoundryChatClient`, Responses) in `hosted/responses/agent.py` —
  this is the one non-negotiable client choice (see Load-bearing rules below);
- the HITL forwarding behavior in your bridge (whatever you name it) — every
  approve/reject decision MUST reach the hosted agent as an
  `mcp_approval_response`, chained via `previous_response_id`, or the gated
  tool will never re-execute.

## 3. Prove it

Copy and adapt `references/snippets/scripts/{verify.sh,smoke.py,browser_e2e.js}`
(structural check; the bridge against the REAL agent running locally via
`azd ai agent run` — read works, action PAUSES, approve executes, reject
doesn't; a real Playwright browser E2E of the same). Needs `az login` + a
provisioned Foundry project, and `npm install playwright && npx playwright
install chromium` for the browser test. Both scripts must pass before you
consider the app done, and — once you deploy — the same proof against the
deployed hosted agent, since all logic is server-side.

## Load-bearing rules (why the architecture is shaped this way)

### The bridge must forward HITL to the hosted agent (you write this — no code ships)
- Whatever you name it, the bridge must: forward each turn to the hosted agent
  over streaming Responses, translate the output to AG-UI events (text, tool
  cards, an approval-request card), and on HITL approve forward an
  `mcp_approval_response` (chained via `previous_response_id`) so the gated
  tool **re-executes server-side**.
- **Two valid implementation strategies** — pick one and verify it live; do not
  assume either works without checking against your installed packages:
  1. **Framework-native:** feed a `SupportsAgentRun` shim into
     `add_agent_framework_fastapi_endpoint(...)` (from `agent-framework-ag-ui`).
     This module's approval/execution machinery is built around *locally*
     executing `FunctionTool` objects on a real `Agent`/`Workflow` — making a
     *pure proxy* (no local tools, everything forwarded to a remote hosted
     agent) satisfy its expectations is a real integration exercise with no
     sample code known to exist; budget time to read
     `agent_framework_ag_ui._agent_run`'s approval-resolution functions
     (`_is_confirm_changes_response`, `_resolve_approval_responses`,
     `_collect_approval_responses`, `_try_execute_function_calls`) before
     committing to this path.
  2. **Hand-rolled (verified working end-to-end on a real local hosted agent
     — a ready-to-copy implementation is in
     `references/snippets/backend/bridge_app.py`):**
     write a small FastAPI endpoint that speaks the AG-UI wire protocol
     directly, using the `ag-ui-protocol` Python package's own
     `ag_ui.core` event/model classes (`RunAgentInput`, `RunStartedEvent`,
     `TextMessageStart/Content/EndEvent`, `ToolCallStart/Args/EndEvent`,
     `ToolCallResultEvent`, `RunFinishedEvent`, `RunErrorEvent`). Translate the
     hosted agent's raw Responses SSE stream
     (`response.output_item.added/done`, `response.function_call_arguments.delta`,
     `response.completed`, `mcp_approval_request`) into these events 1:1, and
     forward the human's decision back as an `mcp_approval_response`. This is a
     legitimate, fully self-contained implementation of the same design
     principle — prefer it if strategy 1 is taking too long to get working.
- **Why the native `FoundryAgent` client alone can't complete hosted HITL:** the
  native path needs `allow_preview=True` just to reach the hosted-agent
  endpoint, and even then HITL approve does **not** re-execute the gated tool —
  the `FoundryAgent` client has no client-side `mcp_approval_response`. Tracked
  upstream as
  [microsoft/agent-framework#6652](https://github.com/microsoft/agent-framework/issues/6652);
  re-check whether it's closed before building a forwarder at all.
- **Local dev:** `azd ai agent run` runs the REAL agent (`ResponsesHostServer` +
  `FoundryChatClient`) on your machine, connected to your Foundry project's
  model; point your bridge at it directly (its local URL, e.g.
  `http://localhost:8088/responses`) — no mock anywhere.
- Why a bridge at all: you **cannot** point `@ag-ui/client` at a deployed hosted
  agent — it speaks OpenAI Responses, not AG-UI.
- The bridge must NOT send `x-ms-user-isolation-key` (deployed agents use Entra
  isolation → 400). An SSE keep-alive keeps the stream alive during silent tools.

### Client choice (load-bearing)
- **`build_hosted_agent` → `FoundryChatClient` (Responses)** — the single brain, the
  SAME code locally (`azd ai agent run`) and deployed. Required so the hosted
  `mcp_approval_request`/`mcp_approval_response` re-executes the gated tool
  (verified live on a real local agent: pending→reimbursed on approve, no
  change on reject). No mock client. The Responses `OpenAIChatClient` / Chat
  Completions path 500s on hosted approve-resume — do not use it here.

### The 7 AG-UI patterns
See `references/patterns-7.md`. Through the hosted bridge: Agentic Chat,
Backend Tool Rendering, HITL (forwarded) are proven working end-to-end.
Shared/predictive state through the bridge is roadmap/unproven through a pure
proxy — treat it as extra work, not a given.

### HITL contract
- A `@tool(approval_mode="always_require")` tool surfaces as an
  `mcp_approval_request` in the hosted agent's Responses stream; your bridge
  translates this into whatever approval-card shape your frontend expects
  (e.g. a `confirm_changes`-style tool call with `function_name`,
  `function_arguments`). The **payload shape the frontend's `respond(...)`
  sends and your bridge's parser expects is a convention you define** —
  CopilotKit's `useHumanInTheLoop` accepts any `respond(result)` value; it does
  not enforce `{ accepted, steps }` or any other shape. Pick one shape and keep
  the frontend and bridge in sync; `{ accepted: boolean, steps }` is a
  reasonable default.

### CopilotKit (UI layer)
- Confirm your installed `@copilotkit/react-core`/`@copilotkit/runtime`
  version's exact API before wiring anything — this library moves fast and has
  shipped broken/deprecated prereleases (check for npm deprecation warnings on
  install). As of writing, the current stable line (`1.6x`) ships a `/v2`
  subpath with hooks `useAgent`, `useAgentContext`, `useFrontendTool`,
  `useRenderTool`, `useHumanInTheLoop`, and a **provider component named
  `CopilotKit`** (not `CopilotKitProvider`, which is an internal subset).
  `references/snippets/frontend/package.json.snippet` has the last-known-good
  pinned versions — start there instead of `npm install`ing latest blind.
- **Bridge route:** catch-all `app/api/copilotkit/[[...slug]]/route.ts`. Import
  the runtime handler from `@copilotkit/runtime/v2` and check whether the
  client you're pairing it with defaults to single-route (one JSON-envelope
  POST to the bare `basePath`) or multi-route (REST paths like `/agent/:id/run`,
  `/info`) — construct the server with the matching `mode`, or every call
  404s. Do not assume which default is current; verify empirically against a
  real request.
- **Agent identifier is two separate things:** the Foundry hosted agent's own
  name (`hosted/responses/agent.py` `AGENT_NAME`, `hosted/responses/agent.yaml`) is independent from
  the CopilotKit-facing registry key (the key you register in
  `CopilotRuntime({ agents: { <key>: ... } })`). Hooks that omit an explicit
  `agentId` typically resolve against the literal string `"default"` — so
  either pass `agentId={YOUR_KEY}` explicitly everywhere, or register your
  agent under the key `"default"`. These two identifiers do **not** need to
  match each other.

### Containers
Use **MCR** base images (`mcr.microsoft.com/devcontainers/python:3.12`,
`.../typescript-node:20`). Docker Hub anonymous pulls hit `toomanyrequests` on
`az acr build` / ACR Tasks.

## Anti-patterns

- Assuming any concrete package API name in this skill is still current without
  checking your installed version — this stack's packages move fast.
- Putting business logic the agent should own into the bridge — the bridge is
  only a translator + approval-forwarder + optional upload/keepalive.
- Using the Responses `OpenAIChatClient` for `build_hosted_agent` — use
  `FoundryChatClient`.
- Assuming CopilotKit enforces a specific HITL resolve payload shape — it
  doesn't; you define and must keep the shape consistent yourself.
- Assuming the CopilotKit-facing agent key must equal the Foundry hosted
  agent's own name — they are separate identifiers.
- A consequential tool **without** `approval_mode="always_require"` (no HITL gate).
- Docker Hub base images in any Dockerfile.
- Declaring success because a server started — run the structural + smoke checks, and
  for the deployed (server-side) path a live browser E2E.

## Definition of Done

The app is **not** done until all are true (evidence-backed):

- [ ] Structural check green (bridge forwards HITL; `build_hosted_agent`
      uses `FoundryChatClient`; HITL contract consistent between frontend and
      bridge; agent name consistent within `hosted/responses/` (agent.py/agent.yaml); MCR base
      images).
- [ ] Smoke E2E green: the bridge against the REAL agent (run locally via
      `azd ai agent run`) shows read works; the consequential prompt PAUSES; approve
      executes; reject does not; and for shared/predictive patterns in scope, state
      flows.
- [ ] `hosted/responses/agent.py` has `build_hosted_agent()` (`FoundryChatClient`), ≥1 read tool
      and ≥1 `approval_mode="always_require"` tool.
- [ ] Agent name is consistent within `hosted/responses/` (agent.py and agent.yaml) (the
      CopilotKit-facing agent key is a separate identifier — see above).
- [ ] No secrets, endpoints, or app-specific hard-coding committed.
- [ ] **Live** (the deployed path drives a server-side agent): deployment succeeds, the
      bridge is configured to reach the deployed hosted agent (e.g. via a
      `HOSTED_AGENT_NAME`-style setting), and a **real browser E2E** passes for
      the patterns in scope — HITL approve **and**
      reject, plus any shared/predictive state round-trip and generative-UI cards.
