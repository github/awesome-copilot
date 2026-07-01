# Troubleshooting — known traps → symptom → fix

Each row is a real failure mode worth encoding as a check in your own
`verify.sh`/`smoke.py` once you build them. Fix the cause; do not work around
it. Concrete package/API names below were true when last verified live against
a real hosted agent — this stack's packages move fast, so confirm each against
what you actually have installed before trusting it.

## Local environment

| Symptom | Cause | Fix |
| --- | --- | --- |
| `python3 -m venv` fails (`ensurepip is not available`) or `pip`/`apt-get install python3-venv` needs sudo you don't have | sandboxed/managed dev environment without system Python tooling | check for `uv` (`which uv`) and use `uv venv` / `uv pip install` instead — it doesn't need `ensurepip` or root. |

## HITL / approval

| Symptom | Cause | Fix |
| --- | --- | --- |
| Approve a tool → `RUN_ERROR` 400/500 **"No tool output found for function call"** | the hosted agent uses Chat Completions (`OpenAIChatClient`/`OpenAIChatCompletionClient`) instead of Responses | `build_hosted_agent` MUST use `FoundryChatClient` (Responses) so the hosted `mcp_approval_response` re-executes the tool. |
| Approval card never appears | the HITL hook isn't registered for the same tool name your bridge surfaces the approval request under | keep the frontend's `useHumanInTheLoop({ name: "<same-name-as-bridge>", ... })` registration in sync with whatever tool-call name your bridge emits for the approval-request event. |
| Clicking Approve does nothing / tool never runs | assumed a specific resolve payload shape is framework-enforced | it isn't (see the CopilotKit bridge section below) — make sure your bridge's parser actually matches what the frontend's `respond(...)` sends. |
| Approve works once, next message 400s with an orphaned tool-call id | stale/replayed approval payload re-sent to the hosted agent | don't replay raw history to the hosted agent; derive the next turn's input from the latest user text or the pending `mcp_approval_response`, chained via `previous_response_id`. |
| Consequential tool runs WITHOUT asking | Tool missing `approval_mode="always_require"` | Decorate the consequential tool; check for at least one in your structural check. |

## AG-UI rendering (bridge-level)

| Symptom | Cause | Fix |
| --- | --- | --- |
| HITL approve doesn't re-execute the tool server-side (state unchanged after approve) | your bridge isn't forwarding the human decision as an `mcp_approval_response` to the hosted agent | make sure the approve/reject decision reaches your bridge's hosted-agent-forwarding code path, not just a local UI state change. This is the single most important behavior to verify live. |
| Approval/tool card vanishes when a turn made several tool calls | your AG-UI translation lumped multiple tool_calls into one assistant message and your CopilotKit version only renders the first one | either split multi-tool messages in your bridge's translation, or confirm your CopilotKit version renders all tool calls in one message (current versions generally do — re-verify live rather than assuming either way). |
| Replayed history 400s / orphaned tool call | raw AG-UI history replayed to the hosted agent | do **not** replay raw history — derive the turn input (latest user text, or a pending `mcp_approval_response`) instead. |

## CopilotKit bridge

| Symptom | Cause | Fix |
| --- | --- | --- |
| `GET /api/copilotkit/threads` 404, or every call to a bare `/api/copilotkit` 404s | route file/mode mismatch | route lives in `app/api/copilotkit/[[...slug]]/route.ts` (optional catch-all — required either way, since different client/server mode combinations post to different sub-paths). Confirm whether your CopilotKit client defaults to single-route (one JSON-envelope POST to the bare basePath) or multi-route (REST paths like `/agent/:id/run`, `/info`) for YOUR installed version, and construct the runtime handler with the matching `mode` — do not assume either default without checking a real request/response. |
| Threads panel 422 / agent/config errors | runtime wrapper mismatch for your version | check your installed `@copilotkit/runtime`'s current recommended handler factory (names have changed across versions — e.g. `createCopilotRuntimeHandler`, `createCopilotHonoHandler`, `createCopilotEndpoint`); read its own docs/types rather than trusting a remembered name. |
| "Agent `<name>` not found" | omitted `agentId` resolves to the literal string `"default"`, which doesn't match your `CopilotRuntime({ agents: {...} })` key | either pass `agentId={YOUR_KEY}` explicitly on every hook/component, or register your agent under the key `"default"`. This CopilotKit-facing key is a separate identifier from your Foundry hosted agent's own name — they don't have to match. |
| `<CopilotKit>` (or `CopilotKitProvider`) import/prop errors | using an internal/renamed provider component | current guidance (check your version): use the `CopilotKit` provider component, not `CopilotKitProvider` (an internal subset). |
| `next build` type error: `HttpAgent` missing an expected field | `@ag-ui/client` version mismatch with what `@copilotkit/runtime` expects | pin `@ag-ui/client` to the version your `@copilotkit/runtime` resolves internally. |
| `npm install` prints a deprecation warning on a CopilotKit package (e.g. "this version was mistakenly generated by CI") | installed a broken/accidental prerelease (this has happened on `@copilotkit/*` npm tags before) | pin to the current actively-maintained stable line instead; re-check npm's install output for deprecation warnings whenever you add/upgrade a CopilotKit package. |
| Browser console: "Failed to execute 'fetch' on 'Window': Illegal invocation" (`agent_run_failed_event`); the agent never runs | CopilotKit's thread store + `@ag-ui/client` `HttpAgent` captures the global `fetch` as a bare reference and calls it with the wrong `this` | bind the global fetch to `window` before any module loads — an inline `<head>` script in `app/layout.tsx`: `if(!window.fetch.__bound){var f=window.fetch.bind(window);f.__bound=true;window.fetch=f;}`. Verify in a real browser (control reproduces, fix → 0 errors). |
| `useHumanInTheLoop`'s `respond(...)` payload isn't recognized by your bridge | assumed CopilotKit enforces a specific resolve shape | it doesn't — `respond(result: unknown)` accepts anything. The shape (e.g. `{ accepted, steps }`) is a convention you define; keep the frontend `respond(...)` call and your bridge's parser in sync. |

## Foundry connection

| Symptom | Cause | Fix |
| --- | --- | --- |
| 401 "audience is incorrect" | default `cognitiveservices.azure.com` scope on the project path | request the `https://ai.azure.com/.default` audience. |
| 403 `workspaces/agents/action` | `az` logged into the wrong tenant for the project, OR (in a shared/sandboxed environment) the default subscription silently drifted mid-session | `az login --tenant <foundry-tenant>` (or set the project's tenant); re-run `az account show`/`az account set --subscription <id>` before assuming this is a code bug, and restart `azd ai agent run` after fixing it (it can cache the credential at process start). |
| Run the agent locally for dev | no deployed agent yet | `azd ai agent run` runs the REAL agent on your machine at a local URL; point your bridge at it directly; needs `az login` + a provisioned project. |

## Containers / azd

| Symptom | Cause | Fix |
| --- | --- | --- |
| `az acr build` fails `toomanyrequests` | Docker Hub base image | use `mcr.microsoft.com/devcontainers/...` base images. |
| azd deploys the helloworld placeholder | ran `azd provision` only | run `azd up` (provision + deploy). |
| hosted image missing `src/agent.py` (or other shared code) | build context too narrow | make sure `hosted/azure.yaml`'s build context includes wherever your shared agent code actually lives. |
| container crashes at boot with `ModuleNotFoundError: No module named 'mcp'`, surfacing as HTTP 424 `session_not_ready` on invoke | the hosting package imports `mcp` but it isn't declared/pulled in transitively on a remote build | pin `mcp` explicitly in `requirements.txt`. |

## Bridge (whatever you name it)

| Symptom | Cause | Fix |
| --- | --- | --- |
| Approval card vanishes when a turn makes several tool calls | multi-tool AG-UI snapshot translation issue (see AG-UI rendering above) | verify live against your actual CopilotKit version rather than assuming a fixed rule. |
| HITL approve does nothing / state doesn't change | the bridge resolved/dropped the approval locally instead of forwarding it | the single most load-bearing bridge behavior — verify with a live test: reject must leave state unchanged, approve must change it. |
| `useAgent().state` stays empty | `state_schema`/`predict_state_config` not passed to the agent, or no tool writes the state key, or your bridge doesn't relay state deltas (this pattern is roadmap through a pure proxy — see patterns-7.md) | set `AGENT_STATE_SCHEMA`/`AGENT_PREDICT_STATE`-equivalent config in `src/agent.py` and write the key from a tool; confirm your bridge actually forwards state events before assuming this pattern works out of the box. |
| Deployed bridge can't reach the agent | required settings (e.g. the Foundry project endpoint, the hosted agent's name) unset | set whatever your bridge's platform-mode code needs; it should be able to reach the deployed agent keyless via Entra. |
| Python `@tool` didn't run "in Foundry" | the native `FoundryAgent` client (not the hosted-agent-first `build_hosted_agent` path this skill uses) runs Python `@tool` callables CLIENT-SIDE; only Foundry-native tools run server-side | expected for that client — this skill's `build_hosted_agent`/`FoundryChatClient` path runs `@tool`s server-side in the hosted runtime instead. |
| UI 500 mid-run on a long silent tool | a gateway dropped the idle SSE connection | add an SSE keep-alive (a periodic `: ping` comment, e.g. every ~10s) to your bridge's streaming response. |
