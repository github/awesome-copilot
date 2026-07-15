# MCP smoke test

A standalone harness that proves the Microsoft first-party MCP servers behind a
connector gateway actually work end-to-end:

```
connect → initialize → tools/list → a safe tools/call
```

It imports the `connector-namespaces` extension's real pipeline (`install.mjs`,
`catalog.mjs`, `armClient.mjs`) and connects through the same native Streamable
HTTP endpoint that the extension writes to the Copilot CLI config. The probe
uses the configured `X-API-Key`, follows `Mcp-Session-Id`, and accepts standard
JSON or SSE JSON-RPC responses.

The whole point: it runs with **Node and Azure CLI**. No Copilot app, no
canvas, no UI. Hand it to anyone (e.g. Arjun) and they can reproduce an MCP
server issue locally.

## Prerequisites

1. **Azure CLI signed in with `az login`.** The harness asks Azure CLI for the
   same short-lived ARM token as the extension.
2. **A gateway already picked once.** The harness reads gateway coordinates from
   `~/.copilot/extensions/connector-namespaces/artifacts/gateway-config.json`
   (`{ subscriptionId, resourceGroup, gatewayName }`). Pick a gateway once in
   the connector-namespaces canvas, or write that file by hand.
3. **Node 20+** (developed on Node 24).

## Run it

```bash
node extensions/connector-namespaces/test/smoke.mjs
```

Options:

| flag | effect |
|---|---|
| `--only=a,b` | only test these `apiName`s (comma-separated) |
| `--limit=N` | stop after N connectable servers |
| `--open-consent` | open consent URLs in the browser for OAuth servers that need it |
| `--no-cleanup` | leave fresh keyless installs in place (default: uninstall them) |

Examples:

```bash
# just the three already-connected WorkIQ servers
node extensions/connector-namespaces/test/smoke.mjs --only=WorkIQMail,WorkIQSharePoint,WorkIQTeams

# first 5 connectable servers, open any consent prompts
node extensions/connector-namespaces/test/smoke.mjs --limit=5 --open-consent
```

## One-time consent, then headless forever

This is the key behavior. OAuth-backed servers (most of them) need a human to
consent **once** in a browser. The model:

1. **First run** hits a server that needs consent → the harness prints a consent
   URL and marks it `NEEDS_CONSENT`. It saves a pending record to
   `~/.copilot/extensions/connector-namespaces/artifacts/smoke-pending-consent.json` (not in
   the repo). No tool call is attempted.
2. **You open that URL once** and sign in / consent. After sign-in the browser
   may show "this site can't be reached" on a `127.0.0.1:7333/auth/callback/`
   page — **that is expected and harmless.** Consent completes gateway-side; the
   loopback page is just a redirect target and nothing is listening on it.
3. **Re-run the harness.** It sees the pending record, confirms the gateway
   connection is now `Connected`, finishes the install (mints the API key,
   writes the CLI entry), and probes it headless. From then on it's reused with
   zero human interaction.

So the server taxonomy is:

- **Already connected** (e.g. the three WorkIQ servers) → probed immediately.
- **Keyless / SP / AAD** (e.g. Microsoft Learn Docs) → installed + probed +
  cleaned up immediately, no consent.
- **Consent-once OAuth** → surfaced on run 1, converts to headless on run 2.

That's why the **first** run may probe fewer than 10 servers — the rest are
waiting on their one-time consent. Consent the URLs it prints, re-run, and the
count climbs. This is inherent to the consent model, not a harness bug.

## Tool-call safety

The harness never blindly calls the first tool a server advertises (mutation
risk). `safe-tools.mjs` picks a tool to call by:

1. a **curated map** of known-safe read tools per server (e.g. Microsoft Learn
   Docs → `microsoft_docs_search`, WorkIQ Teams → `ListTeams`), then
2. a **read-only-name heuristic** fallback — the first tool whose name starts
   with `list`/`get`/`search`/`read`/`find`/… **and** whose required arguments
   are empty or trivially fillable with benign values.

If nothing looks safe, it does `tools/list` only and records the call as
`SKIPPED` (tools proven to load, no call made). Expand the curated map in
`safe-tools.mjs` as you learn each server.

## Reading the report

Each run prints a summary and writes two files to `test/reports/` (gitignored —
they contain live endpoint URLs):

- `mcp-smoke-<timestamp>.log` — human-readable table. **This is the handoff
  artifact** — attach it to a bug or send it to whoever needs to repro.
- `mcp-smoke-<timestamp>.json` — machine-readable, same data.

Per server you get: classification, `initialize` pass/fail + latency, tool
count, which tool was called and why, the call result preview or error, and a
direct transport error on failure. API keys are redacted; endpoint URLs are not,
which is why the reports stay out of git.

Exit code is **non-zero if any probed server failed a step**, so it's CI-usable.

## Files

| file | role |
|---|---|
| `smoke.mjs` | orchestrator — bootstrap, classify each server, probe, report |
| `mcp-probe.mjs` | drives the native Streamable HTTP JSON-RPC handshake |
| `safe-tools.mjs` | curated safe-read-tool map + read-only heuristic + arg filler |
| `reports/` | generated `.log` + `.json` artifacts (gitignored) |

## Scope

Microsoft first-party servers only (`category === "Microsoft"` in the catalog).
Partner servers (Box, Celonis, …) are filtered out — they need partner accounts
and OAuth we can't automate.
