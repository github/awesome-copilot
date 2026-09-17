# Verify — proving every tool works in a real browser

## Environment

- **Current Chrome** (the API moved during the trial — the old
  `navigator.modelContextTesting` surface was removed 2026-07 in favor of
  production `document.modelContext.getTools()/executeTool()`).
- Enable: `chrome://flags/#enable-webmcp-testing`, or launch with
  `--enable-features=WebMCP,WebMCPTesting` (covers both current and older builds).
- **Headed only** — WebMCP requires a visible tab by design. In CI, run under
  `xvfb-run`. Headless will never work; don't heal toward it.
- App running locally via `app.startCommand`, against dev/test data only.
- Each tool's manifest entry tells you where and how: `route` (navigate there),
  `auth` (sign in with the recorded test fixture; verify under EACH role for
  role-scoped tools), `examples` (what to execute), `expect` (what to assert),
  `cleanup` (how to undo a mutating tool's effect after the test).

## The enumeration/execution surface (probe, don't assume)

In the page context, prefer the production surface and fall back for older builds:

```js
const mc = document.modelContext ?? navigator.modelContext;
const tools = mc?.getTools
  ? await mc.getTools()
  : await navigator.modelContextTesting?.listTools();   // removed 2026-07; legacy only
```

Contract facts that generated assertions MUST respect:

- Enumerated `inputSchema` is a **stringified** JSON Schema — `JSON.parse` before
  comparing against the manifest entry.
- `executeTool(...)` resolves to a **string result, or `null` when the execution
  navigated** (normal for declarative forms that submit-navigate).
- Execution and declarative-validation failures **reject the promise** — they do
  not resolve to `"ERROR: ..."`. Only imperative tools following the runtime's
  convention resolve with `"ERROR: ..."` strings. Assert accordingly per tool
  `kind`.
- **Registration is asynchronous** — `registerTool()` returns a promise, so a tool
  is not enumerable the instant the page loads. Poll for it (`waitForTool` in the
  template) or await a `toolchange` event; never assert presence immediately
  after `goto`.
- **Mutating declarative forms pause mid-execution**: Chrome fills the form, then
  waits for a real submit interaction before letting `executeTool` settle —
  awaiting it alone deadlocks into a timeout. Use the concurrent pattern: start
  `executeTool` unawaited → wait for an agent-filled value to appear → click
  submit → await the result (full example in the template).
- These surfaces are for agents/harnesses only — they must never appear in shipped
  application code.

For **declarative** tools also verify the *synthesized* schema: the form-control →
schema mapping is only partially specified, so check each annotated control appears
as the expected property in the actual target Chrome build.

## Per-tool checks

1. Registered (poll — registration is async) with the expected name, the (parsed)
   schema, **and** the manifest `annotations` on the enumerated tool. The legacy
   `modelContextTesting` fallback cannot enumerate annotations — skip that
   assertion there and note the gap in the report.
2. Valid example executes: assert the result per `expect` — `expect.result` as a
   substring of the resolved string, or `expect.navigation` as the destination
   when `executeTool` resolves `null` (it navigated) — **and** the `expect.ui`
   state as a **delta** (capture the relevant state *before* executing; mere
   visibility of something already on screen proves nothing). A tool that reports
   success without the UI changing is a **fail** (UI-settled rule). Because
   executions can navigate, restore the manifest `route` in `beforeEach`, not
   `beforeAll`.
3. Invalid example: **prove the tool is present first** (a rejection from a
   never-registered tool is not a validation rejection). Then: imperative →
   resolves `"ERROR: ..."`; declarative/schema violation → rejects. Zero-param
   read tools with `examples.invalid: null` get the dual-outcome assertion
   instead: `{"unexpected": true}` may be rejected with a validation reason OR
   resolve benignly — both pass; a missing tool/surface fails.
4. Mutating tools: run against disposable data, verify the mutation through the
   same read path the UI uses, then execute the manifest `cleanup` — a
   `mutating: "server"` tool without working cleanup blocks at the gate, and
   heal-loop retries of mutating tools must clean up between attempts.

## Harness

Instantiate `templates/webmcp.spec.ts` (bundled with this skill) — Playwright,
headed persistent Chrome, one describe-block per tool generated from the manifest,
with real assertions (never commented-out placeholders). Put the generated spec
next to the repo's existing e2e tests.

**Repos without a test setup — the standalone-harness recipe.** The spec stays in
`.webmcpify/webmcp.spec.ts` (single source of truth, committed per the gate's
`commitWebmcpifyDir` choice); the Playwright installation lives in a scratch
harness OUTSIDE the repo so the target gains no dependencies:

```sh
mkdir -p /tmp/webmcpify-harness && cd /tmp/webmcpify-harness
npm init -y && npm i -D @playwright/test typescript @types/node
cat > playwright.config.ts <<'EOF'
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: process.env.WEBMCP_SPEC_DIR,   // → <target-repo>/.webmcpify
  workers: 1,                              // one shared headed Chrome — never parallelize
});
EOF
WEBMCP_SPEC_DIR=<target-repo>/.webmcpify WEBMCP_BASE_URL=http://localhost:5173 \
NODE_PATH=/tmp/webmcpify-harness/node_modules npx playwright test
```

`NODE_PATH` lets the out-of-repo spec resolve `@playwright/test`; if the target's
tooling ignores `NODE_PATH`, symlink instead:
`ln -s /tmp/webmcpify-harness/node_modules <target-repo>/.webmcpify/node_modules`
(and make sure it isn't committed). Note in the report that verification ran from
a standalone harness.

**Alternative:** Puppeteer ships a first-class experimental WebMCP API
(https://pptr.dev/guides/webmcp) — prefer it when the target repo already uses
Puppeteer.

## Tool-selection evals (recommended; mandatory for SaaS-scale toolsets)

Schema-level verification proves tools *work*, not that an LLM *picks* them.
For apps exposing more than a handful of tools, run Google's **WebMCP Evals CLI**
(GoogleChromeLabs/webmcp-tools, `evals-cli`): write one eval case per tool from the
manifest examples ("user says X → expect tool Y with args Z") and run them —
this catches ambiguous names/descriptions and overlapping tools that Playwright
cannot.

## Manual QA (tell the human in the report)

- DevTools → **Application → WebMCP pane**: live tool list, invocation log,
  "Run tool" with editable params.
- **Model Context Tool Inspector** Chrome extension (by Google's François
  Beaufort): natural-language smoke tests of tool *selection*.
- Chrome's WebMCP audits flag missing `toolname`/`toolparamdescription`/
  `label[for]`/`name` on declarative forms.
