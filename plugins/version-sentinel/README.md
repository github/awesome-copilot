# Version Sentinel

A dependency-version guardrail for AI coding agents. Before any dependency is added, bumped, downgraded, or installed, the intended version is verified against its upstream registry (npm, PyPI, crates.io, NuGet) and the check is recorded — so stale, hallucinated, or compromised package versions never reach your manifests.

## Why This Exists

AI coding agents routinely suggest package versions that are outdated, never existed, or were yanked. Version Sentinel turns "the model said so" into "verified against the registry within the last 24 hours", and makes deliberate pins explicit so audits can tell them apart from accidental drift.

## What's Included

| Component | Type | Description |
|-----------|------|-------------|
| `version-sentinel` | Skill | The verification workflow: look up the version upstream, record the check in the `.version-sentinel/checks.json` sidecar, then proceed. Also covers intentional pins and pre-release drift audits. |
| `Version Reviewer` | Agent | Read-only release-audit reviewer. Runs the drift check across all repo manifests, groups results into DRIFT / intentional-pin / lookup-failed, and ends with a release-readiness verdict. |

## Hooks and Scripts

The blocking PreToolUse hooks and the guardrail scripts (`vs-record.sh`, `check-versions.sh`, manifest/install detectors) that this plugin's skill and agent drive live in the upstream repository, which also ships GitHub Copilot–ready hook configuration (`.github/hooks/version-sentinel.json`) and two prompt files (`vs-record.prompt.md`, `check-versions.prompt.md`):

**[KSEGIT/Version-Sentinel](https://github.com/KSEGIT/Version-Sentinel)** — MIT License

## How It Works

1. You (or the agent) attempt a manifest edit or install command.
2. The hook blocks it until the version is verified upstream.
3. The agent looks up the latest version on the registry and records the check: `bash scripts/vs-record.sh npm lodash 4.17.21 https://www.npmjs.com/package/lodash`
4. The operation proceeds. Deliberate pins are recorded as `intentional:<reason>` and show as `intentional-pin`, not `DRIFT`, in audits.
5. Before a release, `bash scripts/check-versions.sh` (or the Version Reviewer agent) reports drift across npm, pip/pyproject, Cargo, and NuGet manifests.
