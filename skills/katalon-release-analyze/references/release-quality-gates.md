# Release Quality Gates

Use this reference to turn Katalon MCP quality data into a release readiness assessment.

## Core Metrics

- Requirement coverage: total in-scope requirements, linked requirements, unlinked requirements, requirements with no tests, and requirements with no recent passing result.
- Test coverage: total test cases, automated/manual split when available, unexecuted tests, stale tests, and blocked tests.
- Execution health: latest execution status, pass/fail/blocked/skipped/not-run counts, pass rate, failed critical tests, and rerun status.
- Defect risk: open defects, critical/high defects, defects linked to failed tests, reopened defects, and unresolved release-blocking bugs.
- Stability: flaky tests, repeated failures, recent pass/fail trend, and unstable configurations.
- Configuration coverage: tested browsers/devices/environments/OS combinations versus the release target matrix.
- Data quality: missing execution data, missing requirement links, missing test ownership, incomplete test steps, and ambiguous release scope.

## Suggested Readiness Decision

Use `Ready` only when:

- No open critical/high release-blocking defects remain.
- Critical requirements have test coverage and recent passing execution evidence.
- Latest execution pass rate is acceptable for the release context.
- No P0/P1 tests are failed, blocked, or not run without accepted risk.
- Target configurations have enough coverage for the supported release matrix.

Use `Ready with risk` when:

- No known hard blocker remains, but moderate risks exist.
- Some lower-priority requirements, configurations, or tests are unexecuted.
- Flaky tests exist but are understood and not tied to critical paths.
- Risk owners or mitigations are clear.

Use `Not ready` when:

- Critical/high release-blocking defects are open.
- Critical requirements lack tests or passing execution evidence.
- P0/P1 tests are failed, blocked, or not run.
- Execution results are too stale or incomplete to support a release decision.
- Required environments/configurations are untested.

## Output Template

```text
Release Readiness: Ready | Ready with risk | Not ready
Confidence: High | Medium | Low

Key Metrics:
- Requirement coverage:
- Test execution:
- Defect risk:
- Stability:
- Configuration coverage:

Blocking Issues:
- ...

Risks / Gaps:
- ...

Recommendation:
- ...

Evidence:
- ...
```

## Practical Rules

- Prefer specific counts and links over generic statements.
- Distinguish actual risk from missing data.
- Do not mark a release Ready when MCP data is unavailable; mark confidence Low and say what must be verified.
- If thresholds are not provided, use risk-based judgment and state assumptions.
- If a release/sprint/version scope is unclear, ask for it before making a final readiness call.
