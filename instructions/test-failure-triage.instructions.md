---
description: 'Discipline for diagnosing failing tests, builds, and commands: verify the environment first, classify setup failures vs product bugs, and never repeat a fix that has already failed. Most useful in agent mode and test-heavy workflows.'
applyTo: '**'
---

# Test Failure Triage

Source: [agentic-sdlc-scaffold](https://github.com/Koshux/agentic-sdlc-scaffold)

The most expensive debugging mistake is editing product code to chase a failure the environment caused. When a test, build, or command fails, classify the failure before changing anything.

## Verify the environment before touching code

- Identify exactly which services and preconditions the failing command needs: databases or other containers, environment variables, applied migrations, seeded data, installed dependencies.
- Start what is missing — do not assume services are already running:

  ```bash
  docker compose up -d <required-services> && docker compose ps
  ```

- Wait for services to report healthy before re-running anything.
- Connection-refused, authentication, missing-table, and empty-result failures are not evidence of a code bug until this preflight passes.

## Classify every failure before acting

Read the complete failure output first — the root cause is often above the last line, and stack traces frequently point at the symptom rather than the cause. Then classify:

| Symptom | Likely class |
| --- | --- |
| `ECONNREFUSED`, connection timeout, DNS failure | Setup — service not running or wrong host/port |
| Authentication or permission error against a local service | Setup — wrong or missing environment variable |
| Missing table, column, or relation | Setup — migration not applied |
| Module not found, command not found | Setup — dependencies not installed or wrong working directory |
| Behavior matches old code despite your edit | Setup — stale build, cache, or container image |
| Assertion fails on a value your change computes | Product — a real bug in the code under test |
| Test fails the same way with and without your change | Pre-existing — report it; do not silently absorb the fix into your change |

- **Setup failures are fixed in the setup.** Never modify product code or tests to work around infrastructure that is not running. Adding a retry, a try/catch, a mock, or a skipped test to mask a stopped service converts a five-minute fix into a hidden defect.
- **Product failures are fixed in code**, then re-verified with the narrowest command that reproduces the failure — a single test file or test name, not the full suite.

## Never repeat a failed fix

- If the same fix fails twice with the same approach, stop. Re-read the full output, re-derive the root cause, and try a fundamentally different angle — or surface the blocker and ask. A third near-identical attempt is the most expensive failure mode in agent-assisted work.
- Re-run only what failed. Save the full suite for a final pass; run it at most once per task unless the failures genuinely require broad re-verification.
- If your edit appears to have no effect, verify the running artifact actually contains it (rebuild, clear the cache, restart the watcher or container) before concluding the logic is wrong.

## Examples

**Bad — masking a setup failure in code:**

A test fails with `ECONNREFUSED 127.0.0.1:5432`. The agent wraps the database call in a try/catch and mocks the repository so the test passes. The database container was simply not running — and the mock now hides every future regression in that path.

**Good — fixing the setup:**

The same failure. The agent starts the database container, waits for it to be healthy, re-runs the single failing test file, and only then evaluates whether a product bug remains.
