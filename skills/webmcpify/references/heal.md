# Heal — failure taxonomy → fixes

Work one failed tool at a time. Re-verify after each fix. The triggering verify
failure counts as attempt 0; each fix cycle increments `attempts`. At `attempts`
= 3 → mark `skipped` with a blocker note (this is an explicit escalation to the
human in the final report, not a silent drop) and move on. **Never** widen the
diff, disable a check, or fake a return value to force a pass. **Mutating
tools:** run the manifest `cleanup` between attempts — retrying a mutation
without cleanup duplicates data.

**Heal fixes implementations, not contracts.** The manifest is the
human-approved contract: if the correct fix would change a tool's `inputSchema`,
`description`, `mutating` class, `annotations`, or `expect`, take it back to the
gate as a mini re-approval — never silently edit the manifest to match the code.

## Taxonomy

| Symptom | Likely cause | Fix |
|---|---|---|
| Tool absent from enumeration | **Registration is async** — the test asserted before `registerTool()` settled; or registration never ran (bootstrap not reached, view not mounted) or wrong Chrome build/flags | FIRST make the test poll (`waitForTool`) or await `toolchange` — only if it still fails, trace the registration call; confirm `isWebMCPAvailable()` in the test env; current Chrome + `--enable-features=WebMCP,WebMCPTesting` |
| Whole scope absent | A registration in the batch rejected (duplicate name, invalid schema, policy) — the runtime rolls back the entire scope | Check console for the `onError` report; fix the offending tool contract |
| Tool absent after route change | Scope disposed by navigation (over-scoping) | Move to static app-level registration unless genuinely view-bound |
| Declarative tool missing | `toolname` typo, frame without `allow="tools"`, or page sends `Origin-Agent-Cluster: ?0` | Fix attribute; check Permissions-Policy `tools` and origin-keying headers |
| Schema mismatch (declarative) | Control lacks `name`, description not resolvable, unsupported control type in this build | Add `name`/`toolparamdescription`/`label[for]`; unsupported controls → switch that form to imperative |
| Schema mismatch (imperative) | Manifest and code drifted | Make code match the approved manifest; if the manifest was wrong, that's a contract change — take it back to the gate for re-approval (see above), never silently update it |
| Assertion compares object to string | Enumerated `inputSchema` is a stringified JSON Schema | `JSON.parse` before comparing (see `verify.md`) |
| `executeTool` returns `null` unexpectedly | The execution navigated (normal for submit-navigating declarative forms) | Assert on the post-navigation page instead of the return value |
| `executeTool` rejects | Schema violation or declarative-validation failure — rejection IS the failure signal for these | For invalid-input tests on declarative tools, assert rejection, not an `"ERROR:"` string |
| Mutating declarative execution hangs until timeout | Chrome fills the form, then **pauses the execution awaiting a real submit interaction** — awaiting `executeTool` alone deadlocks | Use the concurrent pattern in the spec template: start `executeTool` unawaited → wait for the agent-filled value → click submit → await. **NEVER heal by adding `toolautosubmit`** (ground rule 5) |
| Backend rejects the harness with 403/CORS despite correct auth | The endpoint **allow-lists the production `Origin`** (mailers, form gateways) — the localhost harness origin is refused before the tool logic runs, and no local fix exists | Verify the live path with the env-gated server-side replay (§Origin-allow-listed endpoints below), only with the production side-effect approval recorded in `approval.productionSideEffect` (see §Origin-allow-listed endpoints below); without it, mark the live path `skipped` with a blocker note |
| Execution times out / canned success while UI still loading | Completion event fired before the async work finished, or listener missing/wrong event name | Fire `tool-completion-<requestId>` with `{ ok, message/error }` AFTER awaiting the real work (`runtime.md` contract) |
| Returns success but UI unchanged | `execute()` bypassed the real UI path (parallel implementation) | Rewrite to call the same handler/store action/endpoint the UI uses |
| Invalid input resolves successfully (imperative) | Missing in-code validation | Validate strictly in code; return `"ERROR: <what/how to fix>"` |
| Fetch-submitted form: agent gets nothing | `preventDefault()` without `respondWith()` | Add the `e.agentInvoked → e.respondWith(promise)` bridge |
| Works manually, fails in Playwright | Headless, missing flags, or profile without the flag | Headed + flags; persistent context; `xvfb-run` in CI |
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
