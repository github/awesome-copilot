# WebMCP Workbench — temporary visual inspection

Use the Workbench only after the manifest gate. It is a development aid, not
part of the application integration and not proof by itself.

**Read-only inspector:** only observed, non-excluded tools whose approved manifest
entry has `mutating: false` can run. Client, server, unknown, denied, and
expected-only tools are blocked in both Native and Simulated modes. Simulated
transport still calls real application handlers; it does not make them
side-effect-free. Mutations must use the host journal runner described in
[reverify.md](reverify.md#durable-mutation-execution-journal).

## Evidence modes

- **Native** means the page already exposed a browser-provided
  `document.modelContext` (or the deprecated `navigator.modelContext`) before
  Workbench loaded. Calls use that implementation.
- **Simulated** means Workbench installed its dependency-free in-page transport
  before the application entry. This previews registration, schemas, inputs,
  execution, results, and responsive UI in browsers without WebMCP. It is never
  recorded as native verification.

Run at least one Native session for a `verified` manifest status. A Simulated
session may diagnose UI/tool wiring and may support the browser/device matrix,
but it only produces portable-preview evidence.

## Agent-managed launch (with dependency consent)

The agent owns starting and stopping the session. Do not ask the user to install
an extension, paste a snippet, set a browser flag, or run a command.

```sh
node <skill-dir>/scripts/workbench.mjs \
  --url https://the-recorded-verification-origin.test \
  --manifest .webmcpify/manifest.json \
  --browser chromium
```

The launcher reuses installed Playwright and browsers. Before installing a missing
Playwright package or downloading a missing browser, it requests separate consent
(interactive default: No). Noninteractive sessions fail closed with an actionable
error unless the corresponding explicit flag is provided after approval:

- `--allow-playwright-install` authorizes only npm installation of pinned Playwright
  into the OS temporary runtime directory, with browser downloads disabled. No
  installation directory is created before this consent.
- `--allow-browser-download` authorizes only the requested Playwright browser engine
  download into Playwright's browser cache; it does not authorize npm installation
  or OS dependency installation.

Neither flag implies the other. Do not supply either without user approval.
Native mode still requires a locally installed current Chrome.

Use `--native` for the current Chrome native surface. Use `--browser firefox` or
`--browser webkit` for portable checks when those Playwright engines are
available. The runner injects the inspector before application code and makes no
project changes. Close the launched browser (or interrupt the runner) to clean up.

## A physical device or an existing browser

When the user needs the exact device/browser rather than an agent-controlled
browser, the agent may temporarily load `templates/webmcp-workbench.js` before
the app entry in the development HTML and set:

```html
<script>
  globalThis.__WEBMCPIFY_WORKBENCH__ = {
    expectedTools: [/* approved manifest tools */],
    open: true
  };
</script>
<script src="/development-only/webmcp-workbench.js"></script>
```

The agent makes and later removes this temporary development-only wiring. Never
put it in a production entry, build, deployment, service worker, or dependency.
Keep the phone on the same approved development origin; the existing secure-
context and CORS gates still apply.

## Interaction contract

- The floating `w` launcher does not cover or dim the host application.
- Desktop uses an anchored panel. At 640px and below it becomes a safe-area-aware
  full-screen inspector with a sticky Run action.
- Every session visibly says `Native` or `Simulated`.
- Only manifest `mutating: false` tools run directly. All mutations and unknown
  classifications are blocked; there is no mutation confirmation or override.
- Results stay session-local. There is no chat, API key, bridge, export, snapshot,
  persistence, or global invocation history in V1.
- Manifest valid/invalid examples are available as argument presets. The panel
  keeps only its own 20 most recent calls in memory for the current session.
- Stop/destroy removes the UI and any Workbench-created simulated context.

## What to inspect

Compare Observed registration to the approved manifest: name, description,
parsed schema, mutation class, and annotations. Exercise valid and invalid
arguments for eligible read-only tools. Verify their structured results and unchanged
state as required by `references/verify.md`. Use a supported host journal runner
for mutation checks, including invalid examples and cleanup.

For accessibility and responsive checks, cover keyboard-only operation, visible
focus, screen-reader labels/live results, reduced motion, light/dark preference,
360×800, 768×1024, and desktop. A portable check on several engines does not
replace the native Chrome verification.
