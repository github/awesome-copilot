---
name: version-sentinel
description: |
  Verify dependency versions against upstream registries before adding, bumping, or changing them in package.json, requirements*.txt, constraints*.txt, pyproject.toml, Cargo.toml, *.csproj, *.fsproj, or *.vbproj. Use this skill when:
  - A version-sentinel PreToolUse hook blocks a manifest edit or install command with `BLOCKED: version-sentinel`
  - Adding or upgrading any third-party dependency and you need to confirm the version actually exists upstream
  - Recording a deliberate version pin (CVE lock, compatibility constraint) so audits don't flag it as drift
  - Auditing dependency freshness before tagging a release
  - Any request like "verify this package version", "is this the latest lodash", or "check dependency drift"
---

# Version Sentinel — Dependency-Version Guardrail Workflow

`version-sentinel` blocks dependency changes until you have verified the package version against its upstream registry. This prevents stale, hallucinated, or compromised versions from reaching your manifests. Checks are recorded in a `.version-sentinel/checks.json` sidecar and expire after a freshness window (default 24h).

> The guardrail scripts and hooks ship with the upstream project: [KSEGIT/Version-Sentinel](https://github.com/KSEGIT/Version-Sentinel) (MIT). This skill explains the workflow those scripts enforce; on hosts without hook support, follow the same flow voluntarily before any dependency change.

## When you see a BLOCKED message

If a tool call exits 2 with `BLOCKED: version-sentinel`, you must:

1. **Look up the latest version** on the upstream registry via web search or fetch:
   - npm: `https://www.npmjs.com/package/<pkg>`
   - pip / pyproject: `https://pypi.org/project/<pkg>/`
   - cargo: `https://crates.io/crates/<pkg>`
   - csproj (NuGet): `https://www.nuget.org/packages/<pkg>`

2. **Record the check.** Run in the terminal:

   ```bash
   bash scripts/vs-record.sh <ecosystem> <pkg> <version-you-intend-to-install> <source-url>
   ```

   The source must be an `http(s)://` URL you actually consulted, or `intentional:<reason>` for deliberate pins. Examples:

   ```bash
   bash scripts/vs-record.sh npm lodash 4.17.21 https://www.npmjs.com/package/lodash
   bash scripts/vs-record.sh csproj Serilog 3.1.1 "intentional: CVE lock pending audit"
   ```

3. **Retry the original edit or install.** With a fresh entry on record, the hook lets the tool call through.

## Intentional non-latest pins

If you genuinely intend an older version (CVE mitigation, compatibility, private registry), record it with an `intentional:` reason as shown above. This passes the hook and is flagged as `intentional-pin` (not `DRIFT`) in audit output.

## Auditing before a release

Run:

```bash
bash scripts/check-versions.sh
```

It scans manifests within 4 directory levels of the current directory, compares each dependency against its upstream registry, and reports drift. Interpret the output as:

- **DRIFT** — current ≠ latest with no `intentional:` record. Look up the latest version and record it with `vs-record.sh` before bumping.
- **intentional-pin** — deliberate pin with a recorded reason; no action needed unless the pin is stale (re-review pins older than 30 days).
- **lookup-failed** — registry fetch failed; re-run once, then check the registry URL manually.

## What NOT to do

- Don't fabricate a source URL you didn't actually consult — the contract assumes honest reporting.
- Don't try to bypass the hook with `git commit --no-verify` or similar — the hook runs on file edits and terminal commands, not on git.
- Don't set `VS_DISABLE=1` without the user's awareness; that's an escape hatch for throwaway sessions, not normal flow.

## Related prompts

The upstream repository also ships two Copilot prompt files you can copy into `.github/prompts/`:

- `vs-record.prompt.md` — records a verified version check in the sidecar (wraps `vs-record.sh`).
- `check-versions.prompt.md` — runs the registry-drift audit and interprets the results (wraps `check-versions.sh`).

Source: [KSEGIT/Version-Sentinel](https://github.com/KSEGIT/Version-Sentinel) (MIT License).
