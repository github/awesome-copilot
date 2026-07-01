# Starter snippets — copy, then adapt to your domain

These files are a **verified-working minimum** (real local Foundry hosted
agent, real bridge, real CopilotKit UI, real Playwright browser E2E — see
`architecture.md` for what was proven and when). They are a starting point to
copy into your new project and adapt — not a package to import, and not
guaranteed to be current forever. Package APIs on this stack move fast:
before you trust any exact class/function/hook name here, confirm it against
your own installed package versions.

The example domain is a generic "records" assistant with one read tool
(`list_pending_records`) and one gated/consequential tool
(`approve_record`, `@tool(approval_mode="always_require")`). Replace the
domain logic, tool names, and prompts with your own — keep the surrounding
plumbing (the bridge translation, the HITL contract, the agent name wiring)
intact unless you have a specific reason to change it, and re-verify after
any change with your own structural check + smoke test + browser E2E.

| File | Copy to | Purpose |
| --- | --- | --- |
| [`src/agent.py`](src/agent.py) | `src/agent.py` | The hosted brain: `build_hosted_agent()`, `FoundryChatClient`, one read tool, one gated tool. |
| [`backend/bridge_app.py`](backend/bridge_app.py) | `backend/bridge_app.py` | FastAPI AG-UI endpoint; SSE keep-alive. |
| [`backend/hosted_proxy.py`](backend/hosted_proxy.py) | `backend/hosted_proxy.py` | Translates the hosted agent's Responses stream to AG-UI events; forwards `mcp_approval_response`. |
| [`backend/hosted_client.py`](backend/hosted_client.py) | `backend/hosted_client.py` | Streaming Responses HTTP driver (DIRECT local / platform deployed). |
| [`backend/requirements.txt`](backend/requirements.txt) | `backend/requirements.txt` | Bridge-only deps (no agent-framework/foundry packages — the bridge runs no model). |
| [`hosted/responses/main.py`](hosted/responses/main.py) | `hosted/responses/main.py` | Entry point wrapping `build_hosted_agent()` in `ResponsesHostServer`. Prefer generating this (and `agent.yaml`/`azure.yaml`/`Dockerfile`/`infra/`) with `azd ai agent init` instead — this file is here mainly to show the import shape. |
| [`frontend/app/api/copilotkit/[[...slug]]/route.ts`](<frontend/app/api/copilotkit/[[...slug]]/route.ts>) | same path | CopilotKit runtime handler pointed at the bridge. |
| [`frontend/app/providers.tsx`](frontend/app/providers.tsx) | `frontend/app/providers.tsx` | `<CopilotKit>` provider + HITL/tool-card component registration. |
| [`frontend/components/ApprovalHitl.tsx`](frontend/components/ApprovalHitl.tsx) | `frontend/components/` | `useHumanInTheLoop` example for the gated tool. |
| [`frontend/components/ToolCards.tsx`](frontend/components/ToolCards.tsx) | `frontend/components/` | `useRenderTool` examples for both tools. |
| [`frontend/lib/agent.ts`](frontend/lib/agent.ts) | `frontend/lib/agent.ts` | The CopilotKit-facing agent id constant (`"default"`) — see the note inside about why this is a separate identifier from the Foundry hosted agent's own name. |
| [`frontend/package.json.snippet`](frontend/package.json.snippet) | merge into `frontend/package.json` | Last-known-good pinned versions (re-check for newer versions and deprecation warnings before using as-is). |
| [`scripts/verify.sh`](scripts/verify.sh) | `scripts/verify.sh` | Structural check — no network calls. |
| [`scripts/smoke.py`](scripts/smoke.py) | `scripts/smoke.py` | E2E check against the bridge + a REAL local hosted agent (`azd ai agent run`). |
| [`scripts/browser_e2e.js`](scripts/browser_e2e.js) | `scripts/browser_e2e.js` | Playwright browser E2E: read, HITL pause, approve, reject. |

## What's deliberately NOT included

- `hosted/agent.yaml`, `hosted/azure.yaml`, `hosted/responses/Dockerfile`,
  `hosted/infra/` — generate these with `azd ai agent init -m <manifest-url>`
  (`azd ai agent sample list` to discover manifests) so they match your
  installed `azd` Foundry extension version exactly, rather than trusting a
  hand-copied Bicep/Dockerfile that can drift out of date.
- `backend/Dockerfile` — a one-line MCR-based Dockerfile running
  `uvicorn bridge_app:app`; write your own to match your bridge's actual
  dependencies (keep the MCR base image — see `troubleshooting.md`).
