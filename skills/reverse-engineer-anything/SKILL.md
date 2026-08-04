---
name: reverse-engineer-anything
description: Reverse engineer native, managed, Electron/JavaScript, packaged, and browser applications with REA. Use shipped-artifact or approved runtime evidence to explain features, compare versions, decompile code, or guide a reconstruction. Skip REA for ordinary source-repository architecture analysis.
metadata:
  version: "23"
  tool_count: 115
  catalog_digest: "6b2470559f830c70f2b1a1453fd8cf1264f690b6f6718342deb04406aefa9fe1"
---

# REA

Use REA when a claim depends on a shipped binary or package, decompilation,
passive application runtime evidence, controlled replay, or comparison with
behavior not established by available source. For ordinary analysis of a
complete source repository, use normal repository tools and do not run REA
readiness or provider commands.

## Route the target first

Choose the first tool from the target the user supplied. Do not call
`open_binary` unless the target is native or an analysis database.

- ASAR or extracted JavaScript/Electron tree:
  `analyze_javascript_application`.
- Archive, application package, ZIP/APK/IPA/MSIX/AppX, or DMG:
  `open_binary` with the supplied local path, then `inspect_artifact` or
  `inventory_artifact` (both operate on the active target and accept no path).
- Managed PE/CLI assembly: `inspect_managed_artifact`.
- User-owned browser page already open: `list_browser_targets`.
- User-owned Electron runtime already open: `list_electron_targets`.
- Native executable, library, or analysis database: `open_binary`, then
  `binary_overview`.

If the app is missing, ask which app to inspect. Resolve a human-readable app
name to one clear installed artifact when possible; ask only when matches are
ambiguous. Never choose an example app on the user's behalf.

In a target-free session, use `open_binary` to bind any archive/package or
native target whose analysis tool operates on the active target. Do not call a
tool hidden from `tools/list`; inspect `binary_session` with
`detail: "capabilities"` for the exact remediation when a desired capability
is unavailable.

## Work summary-first

Start with the default summary projection. Do not repeat an identical tool call.
Do not fetch full Evidence or a full application graph unless a specific claim
requires detail absent from the summary. For JavaScript graphs, follow the
paged resource URIs returned by the summary and fetch only the relevant page.

Every conclusion must distinguish observations, inferences, and unknowns. Cite
Evidence IDs, preserve limitations and incomplete coverage, and never imply
that static analysis observed execution. Ask for approval only where a tool or
policy requires it; approval never broadens a different authority boundary.

## Read only the relevant guide

- Native binaries, managed assemblies, archives, and extraction:
  [references/native-and-artifacts.md](references/native-and-artifacts.md)
- ASARs, extracted JavaScript, feature tracing, and version comparison:
  [references/javascript-applications.md](references/javascript-applications.md)
- Passive browser/Electron observation and static/runtime reconciliation:
  [references/runtime-observation.md](references/runtime-observation.md)
- Evidence paging, comparisons, residual unknowns, and verification:
  [references/evidence-workflows.md](references/evidence-workflows.md)
- Controlled JavaScript replay:
  [references/controlled-replay.md](references/controlled-replay.md)

## Readiness and setup

If REA tools are available, use them directly; do not run `doctor` on every
task. If the MCP server is unavailable or registration is reported stale, run
`npx -y rea-agents@latest doctor`. Propose
`npx -y rea-agents@latest setup` only when doctor identifies an alignment or
provider problem. Show the exact plan and obtain approval before setup writes
configuration or installs Hopper. Restart the agent after MCP registration
changes; direct CLI commands remain available immediately.

## Finish the task

Explain findings in plain language and tie them to returned evidence. When the
user asks to build something, use normal coding tools and separate observed
behavior from design choices. Close an opened native session with
`close_binary` when the investigation is complete.
