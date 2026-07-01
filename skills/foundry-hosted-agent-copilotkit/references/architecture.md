# Architecture — Foundry hosted agent + CopilotKit, via a HITL-forwarding bridge

**Goal:** an Azure AI Foundry HOSTED agent (all tools + HITL + history server-side)
with a CopilotKit UI showing rich generative UI — tool-render cards, human-in-the-
loop approval, shared/predictive state.

> **This skill ships copy-adapt starter code, not an installable template.**
> `references/snippets/` has a verified-working minimum for every symbol
> below (`bridge_app.py`, `agent.py`, etc.) — copy it in and adapt rather than
> writing from scratch, but treat every concrete name as "true as of when
> this was written," not a guarantee. Bootstrap `hosted/` with
> `azd ai agent init -m <manifest-url>` (`azd ai agent sample list` to discover
> manifests) rather than hand-writing it — this generates the currently-correct
> `main.py`/`agent.yaml`/`azure.yaml`/`Dockerfile`/`infra/` for your installed
> `azd` Foundry extension version.

**Why a bridge at all:** you **cannot** point `@ag-ui/client` at a deployed hosted
agent — its endpoint speaks the OpenAI **Responses** protocol, not AG-UI. AND the
framework's *native* path (`add_agent_framework_fastapi_endpoint(FoundryAgent(...))`)
resolves the HITL `confirm_changes` **locally** and never forwards the approval, so
the gated tool **does not re-execute** (verified live). So the bridge is a small
forwarder: it translates Responses→AG-UI AND forwards the HITL decision
as an `mcp_approval_response`, which re-executes the tool server-side. You can
implement this bridge either by wrapping a `SupportsAgentRun` shim and feeding it
into `add_agent_framework_fastapi_endpoint` (nontrivial for a pure proxy — see
below), or by hand-rolling a FastAPI endpoint that emits AG-UI events directly
using the `ag-ui-protocol` package's `ag_ui.core` classes (verified working
end-to-end against a real local hosted agent).

```
 Browser — Next.js + CopilotKit
   useAgent / useFrontendTool / useRenderTool / useHumanInTheLoop
   app/api/copilotkit/[[...slug]]/route.ts  (CopilotKit runtime handler + HttpAgent)
        │  AG-UI / SSE
        ▼
 BRIDGE  (Container App — backend/, you write this)
   LOCAL/DEPLOYED: forwards each turn to the hosted agent (streaming Responses),
              translates → AG-UI (text, tool cards, an approval-request card), and
              forwards mcp_approval_response on approve.
   LOCAL DEV: `azd ai agent run` runs the agent on your machine; point the bridge
              at its local URL. DEPLOYED: bridge points at the platform endpoint. No mock.
        │  POST .../agents/<name>/endpoint/protocols/openai/responses (stream)
        ▼
 FOUNDRY HOSTED AGENT  (the brain — azd → host: azure.ai.agent)
   hosted/responses/agent.py build_hosted_agent(): FoundryChatClient (Responses), store=False
   ALL @tools + @tool(approval_mode="always_require") HITL + history server-side
```

## Validated live (a real local hosted agent via `azd ai agent run`)

- Read tool → runs server-side; tool-render card in AG-UI.
- HITL trigger → `mcp_approval_request` → bridge surfaces an approval card (pause).
- **Approve → bridge sends `mcp_approval_response{approve:true}` → tool re-executes
  server-side, in-memory state changes.** No "No tool output found".
- Reject → `approve:false` → tool does NOT execute (state unchanged).
- Gotchas found live: the bridge must NOT send `x-ms-user-isolation-key`
  (deployed agents use Entra isolation → 400); `build_hosted_agent` MUST use
  `FoundryChatClient` (Chat Completions 500s on hosted approve-resume); and a
  shared/sandboxed `az` CLI session can silently drift to a different default
  subscription mid-session — re-check `az account show` before assuming a 403
  is a code bug.

## Why a bridge is necessary (native-path test matrix)

Is a hand-rolled/forwarding bridge over-engineering? Prior testing against a real
agent (packages: agent-framework-core 1.9.0, agent-framework-foundry 1.8.2,
agent-framework-ag-ui 1.0.0rc5) found:

| Configuration | Result |
| --- | --- |
| **Bridge that forwards HITL + splits multi-tool snapshots** | all assertions pass ✓ |
| Bridge, HITL approval routing removed | approve does NOT change state ✗ — routing REQUIRED |
| Bridge, multi-tool snapshot split disabled | multi-tool-call assertion fails ✗ — split REQUIRED (re-check if your CopilotKit version still needs this; the newest client renders all tool calls) |
| Native `add_agent_framework_fastapi_endpoint(FoundryAgent(...))` | 400 "Hosted agents can only be called through the agent endpoint" ✗ |
| Native + `allow_preview=True` | surfaces the approval, but **approve does NOT re-execute** (state unchanged) ✗ |
| Native + `allow_preview=True` + local patches to the ag-ui approval-resolution functions | **still** approve does NOT re-execute ✗ |

**Conclusion:** the native `FoundryAgent` client has no client-side
`mcp_approval_response` — it cannot complete hosted HITL no matter how it's
configured. **Tracked upstream as
[microsoft/agent-framework#6652](https://github.com/microsoft/agent-framework/issues/6652)** —
re-run this matrix on each package bump; if #6652 is closed, re-test whether the
native `FoundryAgent` path now suffices before building any forwarder at all.

## Client choice (the load-bearing rule)

- **Hosted agent (`build_hosted_agent`) → `FoundryChatClient` (Responses).** Required
  so the hosted runtime's `mcp_approval_request`/`mcp_approval_response` re-executes
  the gated tool. Chat Completions 500s on resume here.
- **Local dev → `azd ai agent run`**: the Foundry extension runs the REAL agent
  (`ResponsesHostServer` + `FoundryChatClient`) on your machine, connected to your
  Foundry project's model, at a local URL (e.g. `http://localhost:8088/responses`).
  Point your bridge at it directly — same bridge code, no mock — needs `az login`
  + a provisioned project.

## File map (a reasonable layout — adapt as needed)

```
<app>/
├── hosted/             Bootstrap via `azd ai agent init` — azd → Foundry HOSTED
│   │                   agent (Responses) — the deployed brain.
│   ├── azure.yaml      host: azure.ai.agent; azure.ai.agents pinned; context=".".
│   └── responses/
│       ├── agent.py    ONE agent. build_hosted_agent() → FoundryChatClient
│       │               (the single brain — same code local + deployed). Read tools
│       │               + ≥1 @tool(approval_mode="always_require"). Lives right next
│       │               to main.py — no separate top-level src/, since nothing else
│       │               imports it (the bridge talks to it over HTTP, not in-process).
│       └── main.py     ResponsesHostServer(build_hosted_agent()).run() — confirm
│                       which package ships `ResponsesHostServer` for your installed
│                       version (may be a separate `*-foundry-hosting` package).
├── backend/            THE BRIDGE (deployed Container App) — you write this.
│   └── bridge_app.py   ONE file: AG-UI endpoint + the streaming Responses HTTP
│                       client + the translation + HITL forwarding + SSE keepalive.
│                       Splitting this into separate proxy/client modules is a
│                       reasonable adaptation once it grows a lot of domain logic,
│                       but isn't necessary at this size — don't start there.
├── frontend/           Next.js + CopilotKit (useAgent/useFrontendTool/
│                       useRenderTool/useHumanInTheLoop).
└── scripts/            verify.sh (structural), smoke.py (E2E vs the real local agent),
                         a browser E2E script (e.g. Playwright).
```

## Proving it (Definition of Done)

`azd` SUCCESS / a server starting is **not** proof. Done = your structural check +
your smoke test (the bridge against the REAL agent run locally via `azd ai agent run`)
green, AND — because the deployed path drives a server-side agent — a **live**
browser E2E: deploy, run the bridge pointed at the deployed agent, and
confirm read + HITL approve (tool re-executes, state changes) **and** reject (no
change) in a real browser.
