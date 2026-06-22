# Troubleshooting — known traps → symptom → fix

Each row is a real failure mode encoded as a check in `scripts/verify.sh` or
`scripts/smoke.py`. Fix the cause; do not work around it.

## HITL / approval

| Symptom | Cause | Fix |
| --- | --- | --- |
| Approve a tool → `RUN_ERROR` 400/500 **"No tool output found for function call"** | the hosted agent uses Chat Completions (`OpenAIChatClient`/`OpenAIChatCompletionClient`) instead of Responses | `build_hosted_agent` MUST use `FoundryChatClient` (Responses) so the hosted `mcp_approval_response` re-executes the tool. `verify.sh` checks for `FoundryChatClient`. |
| Approval card never appears | `confirm_changes` not registered via the v2 `useHumanInTheLoop` hook | Keep the `confirm_changes` `useHumanInTheLoop({ name: "confirm_changes", ... })` from the template verbatim. |
| Clicking Approve does nothing / tool never runs | Resolving with `{ approved }` | Resolve with `{ accepted: boolean, steps }`. Backend detection is `"accepted" in parsed`. |
| Approve works once, next message 400s with orphaned `call_…` | (pre-rc5) stale approval payload re-sent | Handled NATIVELY on agent-framework-ag-ui rc5 — do not re-add the old hand-rolled patches. |
| Consequential tool runs WITHOUT asking | Tool missing `approval_mode="always_require"` | Decorate the consequential tool. `verify.sh` requires at least one. |

## AG-UI rendering

| Symptom | Cause | Fix |
| --- | --- | --- |
| HITL approve doesn't re-execute the tool server-side (state unchanged after approve) | ag-ui resolves `confirm_changes` **locally** before the proxy sees it | `bridge_app.py` neutralises `_is_confirm_changes_response` + `_resolve_approval_responses`, so the decision reaches `HostedProxyAgent`, which forwards `mcp_approval_response` to the hosted agent. **Proven load-bearing: disabling it → approve doesn't change state.** |
| Approval/tool card vanishes at RUN_FINISHED when a turn made several tool calls | ag-ui's snapshot builder lumps multiple tool_calls into one assistant message; CopilotKit **v1** renders only `toolCalls[0]` | `bridge_app.py` splits multi-tool snapshot messages (`_build_messages_snapshot`); `smoke.py` C9 guards it. **Proven load-bearing: `DISABLE_C9_SPLIT=1` fails C9.** (v2 renders all tool calls, but the split keeps the snapshot correct for both frontends.) |
| Replayed history 400s / orphaned tool call (C10) | raw AG-UI history replayed to the hosted agent | the proxy does **not** replay raw history — `_find_approval_decision` / `_latest_user_text` derive the turn input (latest user text, or an `mcp_approval_response`). `smoke.py` C10 asserts no error. No `normalize_*` patch needed. |

## CopilotKit bridge

| Symptom | Cause | Fix |
| --- | --- | --- |
| `GET /api/copilotkit/threads` 404 | missing catch-all dir | route lives in `app/api/copilotkit/[[...slug]]/route.ts`. |
| Threads 405 on every request | single-route endpoint | use `createCopilotHonoHandler` (multi-route) and re-export POST/GET/PATCH/DELETE. |
| Threads panel 422 "Missing CopilotKitIntelligence configuration" | lib `CopilotRuntime` wraps the runner in `TelemetryAgentRunner` | use the v2 `CopilotSseRuntime` with a raw `InMemoryAgentRunner`. |
| "Agent `<name>` not found" / Info 404 | `useSingleEndpoint` defaulted to `true` | set `<CopilotKit useSingleEndpoint={false}>`. |
| `<CopilotKit agent>` doesn't match | name drift | keep `AGENT_NAME` == route const == provider == hosted yaml. `verify.sh` checks it. |
| `next build` type error: `HttpAgent` missing `pendingInterrupts` | `@ag-ui/client` older than the version CopilotKit resolves | pin `@ag-ui/client` to the version `@copilotkit/runtime` depends on (e.g. `0.0.56`). |
| Browser console: "Failed to execute 'fetch' on 'Window': Illegal invocation" (`agent_run_failed_event`); the agent never runs | CopilotKit v2 (`ɵcreateThreadStore` + `@ag-ui/client` HttpAgent) captures the global `fetch` as a bare reference and calls it with the wrong `this`; `CopilotKitCore` exposes no `fetch` option | bind the global fetch to `window` before any module loads — an inline `<head>` script in `app/layout.tsx`: `if(!window.fetch.__bound){var f=window.fetch.bind(window);f.__bound=true;window.fetch=f;}`. `verify.sh` checks it; proven in a real browser (control reproduces, fix → 0 errors). |

## Foundry connection

| Symptom | Cause | Fix |
| --- | --- | --- |
| 401 "audience is incorrect" | default `cognitiveservices.azure.com` scope on the project path | request the `https://ai.azure.com/.default` audience. |
| 403 `workspaces/agents/action` | `az` logged into the wrong tenant for the project | `az login --tenant <foundry-tenant>` (or set the project's tenant). |
| Run the agent locally for dev | no deployed agent yet | `azd ai agent run` runs the REAL agent on your machine (what `make local`/`make smoke` use, via the bridge's DIRECT mode); needs `az login` + a provisioned project (`make up` once). |

## Containers / azd

| Symptom | Cause | Fix |
| --- | --- | --- |
| `az acr build` fails `toomanyrequests` | Docker Hub base image | use `mcr.microsoft.com/devcontainers/...` base images. |
| azd deploys the helloworld placeholder | ran `azd provision` only | run `make up` (= `azd up` = provision + deploy). |
| hosted image missing `src/agent.py` | build context too narrow | `hosted/azure.yaml` sets `context: ..` (template root). |

## Bridge (the framework-native AG-UI endpoint)

| Symptom | Cause | Fix |
| --- | --- | --- |
| Approval card vanishes at RUN_FINISHED | multi-tool snapshot; CopilotKit v1 renders only `toolCalls[0]` | keep the snapshot-split in `bridge_app.py`; `make smoke` C9 guards it. |
| HITL approve does nothing / state doesn't change | ag-ui resolved the approval locally (the routing patch was removed/disabled) | the hosted bridge needs **two** patches — HITL approval routing **and** the snapshot split — both proven load-bearing on rc5 (disabling either fails smoke). Keep both. |
| `useAgent().state` stays empty | `state_schema`/`predict_state_config` not passed to the endpoint, or no tool writes the state key | set `AGENT_STATE_SCHEMA`/`AGENT_PREDICT_STATE` in `src/agent.py` and write the key from a tool. |
| Deployed bridge can't reach the agent | `FOUNDRY_PROJECT_ENDPOINT` / `HOSTED_AGENT_NAME` unset | set both; the bridge (`hosted_client`) reaches the deployed agent keyless. |
| Python `@tool` didn't run "in Foundry" | FoundryAgent runs Python `@tool` callables CLIENT-SIDE; only Foundry-native tools run server-side | expected — define server-side tools on the deployed agent; keep `@tool`s for client-side/HITL. |
| UI 500 mid-run on a long silent tool | a gateway dropped the idle SSE | keep `SSEKeepAliveMiddleware` (`: ping` ~10s). |
