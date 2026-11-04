# Heal — failure taxonomy → fixes

Classify before counting. Persist `failure.class`, `failure.signature`, and the
current `contractRevision` before a retry:

- `contract` — schema/result/lifecycle rule shared by a class of tools;
- `environment` — secure origin, browser/profile/display, app boot, backend/CORS;
- `implementation` — this tool's app wiring is wrong;
- `external-policy` — a real upstream or production-origin restriction;
- `flaky` — the same unchanged path produced independent outcomes;
- `client-capacity` — the target client cannot enumerate/select the intended set.

`attempts` counts only independent retries of the same failure signature under the
same approved contract revision. A shared contract or environment bug is one root
cause, not one failed attempt per tool: fix it, increment `contractRevision` when
the human-approved contract changed, then clear `failure` and reset `attempts` for
every affected tool. At three independent failed implementation/flaky retries,
`skipped` must name the class, signature, and evidence that makes the tool
impossible under the current contract. A raw count is never sufficient. **Never**
widen the diff, disable a check, or fake a return value to force a pass. **Mutating
tools:** run the manifest `cleanup` between retries — retrying a mutation without
cleanup duplicates data.

**Heal failures, not scores.** A low score from a third-party WebMCP
inspector/checker is not itself a failure: those lists mix spec features with
conventions and invented checks. Classify each finding first
(`references/discovery.md`). If it is a **real spec violation** you can confirm in
the explainer or Chrome docs, the harness has a gap — add the missing assertion,
watch it fail, then heal it like any other failure. If it is a convention or an
invented check, report it and stop: no `toolaction` attributes, no forms added to
satisfy a declarative check, no chasing a browser-side `window.ai`.

**Heal fixes implementations, not contracts.** The manifest is the
human-approved contract: if the correct fix would change a tool's `inputSchema`,
`description`, `mutating` class, `annotations`, or `expect`, take it back to the
gate as a mini re-approval — never silently edit the manifest to match the code.

## Taxonomy

| Symptom | Likely cause | Fix |
|---|---|---|
| Tool absent from enumeration | Insecure verification origin; **registration is async**; bootstrap/view not reached; reused Chrome profile; wrong headed Chrome/flags | FIRST assert `window.isSecureContext` and `document.modelContext`, then poll (`waitForTool`) or await `toolchange`; only then trace registration. `WebMCPTesting` does not waive secure context |
| Page never boots | Absolute backend URL points at an absent localhost service, or CORS allow-list pins another exact origin/port | Capture console + failed requests; correct the verification origin/backend environment before changing tool code. Classify `environment` |
| Whole scope absent | A registration in the batch rejected (duplicate name, invalid schema, policy) — the runtime rolls back the entire scope | Check console for the `onError` report; fix the offending tool contract |
| Tool absent after route change | Scope disposed by navigation (over-scoping) | Move to static app-level registration unless genuinely view-bound |
| Declarative tool missing | `toolname` typo, frame without `allow="tools"`, or page sends `Origin-Agent-Cluster: ?0` | Fix attribute; check Permissions-Policy `tools` and origin-keying headers |
| Schema mismatch (declarative) | Control lacks `name`, description not resolvable, unsupported control type in this build | Add `name`/`toolparamdescription`/`label[for]`; unsupported controls → switch that form to imperative |
| Schema mismatch (imperative) | Manifest and code drifted | Make code match the approved manifest; if the manifest was wrong, that's a contract change — take it back to the gate for re-approval (see above), never silently update it |
| Assertion compares object to string | Enumerated `inputSchema` may be stringified (native lag) or object (spec) — handle both | `typeof === 'string' ? JSON.parse(s) : s ?? {type:'object',properties:{}}` before comparing (see `verify.md`) |
| `executeTool` returns `null` unexpectedly | A declarative submission navigated; or an imperative handler returned bare `null` | Declarative navigation: assert the destination. Imperative: return a structured result and defer route-changing UI/disposal one event-loop task; the runtime guard converts accidental absence into a structured error |
| `executeTool` rejects | Schema violation or declarative-validation failure — rejection IS the failure signal for these | For invalid-input tests on declarative tools, assert rejection, not an `"ERROR:"` string |
| Mutating declarative execution hangs until timeout | Chrome fills the form, then **pauses the execution awaiting a real submit interaction** — awaiting `executeTool` alone deadlocks | Use the concurrent pattern in the spec template: start `executeTool` unawaited → wait for the agent-filled value → click submit → await. **NEVER heal by adding `toolautosubmit`** (ground rule 5) |
| Backend rejects the harness with 403/CORS despite correct auth | The endpoint **allow-lists the production `Origin`** (mailers, form gateways) — the localhost harness origin is refused before the tool logic runs, and no local fix exists | Verify the live path with the env-gated server-side replay (§Origin-allow-listed endpoints below), only with the production side-effect approval recorded in `approval.productionSideEffect` (see §Origin-allow-listed endpoints below); without it, mark the live path `skipped` with a blocker note |
| Execution times out / canned success while UI still loading | Completion event fired before the async work finished, or listener missing/wrong event name | Fire `tool-completion-<requestId>` with `{ ok, message/error }` AFTER awaiting the real work (`runtime.md` contract) |
| Returns success but UI unchanged | `execute()` bypassed the real UI path (parallel implementation) | Rewrite to call the same handler/store action/endpoint the UI uses |
| Invalid input resolves successfully (imperative) | Missing in-code validation | Validate strictly in code; return `"ERROR: <what/how to fix>"` |
| Fetch-submitted form: agent gets nothing | `preventDefault()` without `respondWith()` | Add the `e.agentInvoked → e.respondWith(promise)` bridge |
| Works manually, fails in Playwright | Headless, missing flags/display/Chrome, or shared profile whose existing instance ignored the flag | Provision current Chrome + display; use headed persistent context with a dedicated `WEBMCP_PROFILE_DIR` |
| 401/403 from `execute()` in test | Tool registered outside the authenticated scope, or test session lacks the role in the manifest `auth` field | Role-scope the registration; sign in with the recorded fixture |
| Flaky: passes alone, fails in suite | Shared state between tool executions | Isolate test data per tool run (use `cleanup`); don't reorder tests to hide it |

## Origin-allow-listed endpoints — the replay pattern

Some production backends (mailers, form gateways) allow-list the production
`Origin` header and refuse everything else — the localhost harness can never
exercise the live path directly. When (and only when) the gate approved the real
production side effect (`approval.productionSideEffect`), verify the live path
with an env-gated replay: intercept the app's own request in Playwright and
re-issue it server-side (Node context — not subject to browser CORS) with the
production `Origin`:

```ts
// Env-gated: runs only with WEBMCP_LIVE_MUTATIONS=1 — never default-on in CI.
if (process.env.WEBMCP_LIVE_MUTATIONS === '1') {
  await page.route('**/api/contact', async (route) => {
    const response = await context.request.fetch(route.request(), {
      headers: { ...route.request().headers(), origin: 'https://example.com' }, // the prod Origin
    });
    await route.fulfill({ response });
  });
}
```

This causes a REAL production side effect. Mark every payload
`[webmcpify verification]`, run the manifest `cleanup`, list the effect in
`report.md`, and never enable the gate by default in CI.

## After healing

Re-run verification once for **all** tools with status `integrated` or `verified`
(not only the healed ones) — healing one tool can unregister or break another;
scope collisions are the classic case. Only then evaluate the exit condition.
