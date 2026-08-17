# Troubleshooting: symptom → root cause → fix

All entries are live-verified failure modes with their exact signatures. HITL-specific failures are in hitl.md; this file covers everything else, by layer.

## Debugging method

Reproduce at the lowest possible layer before touching code:

1. `curl -N -X POST <agui-endpoint> -H 'Content-Type: application/json' -d '<minimal RunAgentInput>'` — read raw AG-UI SSE events. Reproduces → frontend innocent.
2. For hosted agents, call the bare `/responses` (or `/invocations`) endpoint directly. Reproduces → AG-UI adapter and CopilotKit innocent; the bug is in the framework/hosting layer. This technique is how the duplicate-execution bug (hitl.md) was isolated.
3. Restart locally running agents between passes — in-memory state from a previous test makes results lie in both directions.

## CopilotKit runtime / frontend

| Symptom | Root cause | Fix |
| --- | --- | --- |
| "Agent `<name>` not found" | Name drift between runtime `agents` key, `<CopilotKit agent>` prop, and hosted `agent.yaml` name; or a single-endpoint/multi-endpoint routing mismatch in the runtime config | Use one shared constant for the agent name; check the runtime's endpoint-mode options against the installed version's docs |
| Requests to runtime sub-routes (e.g. threads) 404/405 | Route handler registered at a fixed path but the runtime version expects a catch-all route serving multiple sub-paths | Use an optional catch-all route segment (`[[...slug]]` in Next.js App Router) and export all HTTP methods the handler supports |
| `next build` type error: `HttpAgent` missing a property (e.g. `pendingInterrupts`) | Installed `@ag-ui/client` version differs from the one `@copilotkit/runtime` was built against | Pin `@ag-ui/client` to exactly the version the installed `@copilotkit/runtime` depends on (check its package.json) |
| Console: "Failed to execute 'fetch' on 'Window': Illegal invocation"; agent never runs | A library captured `fetch` as a bare reference and calls it with the wrong `this` (seen with CopilotKit v2 thread store + `@ag-ui/client` `HttpAgent`) | Bind fetch before any module loads, e.g. an inline script in the root layout `<head>`: `if(!window.fetch.__bound){var f=window.fetch.bind(window);f.__bound=true;window.fetch=f;}` |
| Agent cannot see frontend tools | Known forwarding regression: registered frontend tools not included in `RunAgentInput.tools` (CopilotKit/CopilotKit#5813, 1.62.x era) | Upgrade past the fix; after ANY CopilotKit upgrade, re-test frontend-tool visibility explicitly |
| Stop button / error handling crashes after a run error | Event-order bug appending `TEXT_MESSAGE_END` after `RUN_ERROR` (CopilotKit/CopilotKit#5812) | Track the fix version; avoid relying on post-error events |
| Tool/approval card disappears when the run finishes | `MESSAGES_SNAPSHOT` at run end represents the turn differently than live events (e.g. multiple tool calls merged into one message; UI renders only the first) | Fix snapshot construction (one tool call per assistant message) or upgrade the UI layer; always verify post-run DOM |
| API churn after upgrade (handler factory renamed, provider props changed) | CopilotKit moves APIs between minor versions; `useCopilotAction` is legacy | Verify names against the `.d.ts` files bundled in the installed packages, not docs or memory |

## AG-UI / adapter layer

| Symptom | Root cause | Fix |
| --- | --- | --- |
| 400 with "orphaned" tool-call errors when sending history | Raw AG-UI message history replayed to a Responses endpoint that manages its own history | Derive each turn's input (latest user message or approval decision); never replay the full transcript |
| UI shows a 500 mid-run during a long-running silent tool | Proxy/gateway dropped the idle SSE connection | Emit SSE keep-alive comments (`: ping`) every ~10s from the AG-UI endpoint |
| `useCoAgent().state` always empty | No state schema configured on the agent, no tool writes the state key — or Architecture C without state synthesis (see patterns.md) | Configure state schema + ensure a tool writes it; on a Responses bridge, confirm state synthesis exists at all |

## Foundry connection / auth

| Symptom | Root cause | Fix |
| --- | --- | --- |
| 401 "audience is incorrect" | Token requested with default `cognitiveservices.azure.com` scope | Request scope `https://ai.azure.com/.default` |
| 403 `Microsoft.MachineLearningServices/workspaces/agents/action` despite being logged in and having the role | `az` CLI's active subscription/tenant differs from the Foundry project's (multi-tenant accounts). Role lookups under the wrong tenant even fail to resolve the assignee, mimicking missing RBAC | Compare `az account show` with the project's tenant/subscription; `az account set --subscription <correct>` or `az login --tenant <correct>`. Zero code changes — do not mistake for a package regression |
| Deployed agent returns 400 on every call from a custom client | Client sends `x-ms-user-isolation-key`; deployed agents use Entra-derived isolation | Remove the header for deployed agents |
| Async `DefaultAzureCredential` fails in the bridge | Missing async transport | `pip install aiohttp` |
| First request to a freshly started local agent 404s `DeploymentNotFound` although the model deployment exists | Warm-up flake in the hosted runtime | Retry once or restart with the same env vars |
| New `azd ai agent run` fails "Address already in use" (confusing hypercorn traceback) | Stale local hosted-agent process holds port 8088 | `ss -ltnp | grep 8088`, kill the stale process, retry |

## Python dependency traps

| Symptom | Root cause | Fix |
| --- | --- | --- |
| Foundry remote image build fails on exotic transitive deps (wasm-related) | Depending on the `agent-framework` meta-package, which drags optional extras | Depend on `agent-framework-core` plus only the specific extras you use (e.g. `agent-framework-foundry`, `agent-framework-ag-ui`) |
| `ImportError` in the hosted container for `mcp` | `agent_framework_foundry_hosting` imports from `mcp` but it is not pulled transitively in remote builds | Add an explicit `mcp` pin to the hosted requirements |
| `httpx` APIs missing (`AsyncClient` gone) | Installing with prerelease resolution pulled an httpx 1.0 dev build | Pin httpx to the current stable line |
| Hosted agent fast-fails: `RuntimeError: the hosted environment is running on protocol 1.0.0, but the agent requires protocol 2.0.0` | Hosting package's Responses protocol version disagrees with `version:` declared in `agent.yaml`/`agent.manifest.yaml` | Bump the package and BOTH manifests' protocol version together |
| Python `@tool` "didn't run in Foundry" when invoking via the Foundry agent client | Client-side tool callables execute client-side by design; only Foundry-native tools run server-side on that path | Expected behavior — host the agent (run the loop server-side) if tools must execute there |
