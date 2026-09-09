---
name: katalon-release-analyze
description: Analyze Katalon True Platform/TestOps release readiness from testing quality data. Use when you need to use Katalon MCP metrics and results to assess whether a release, sprint, iteration, version, test plan, suite, or repository is ready to ship; summarize requirement coverage, execution health, defect risk, test stability, configuration coverage, release blockers, quality gaps, and produce a Ready / Ready with risk / Not ready recommendation. Written for the test manager who owns the ship call and the test lead who has to defend it.
---

# Katalon Release Analyze

Use this skill to assess release readiness from Katalon MCP data. The output must be a testing-quality decision, not just a metric dump.

## Availability Boundary

State the MCP boundary before promising an assessment:

- Available through Katalon MCP: project/repository discovery, requirements, test cases, test suites, executions/results, quality summaries, defect data, stability data, and configuration coverage when tools are exposed.
- Not directly available: create formal Test Plan entities, inspect live AUT UI, guarantee AI execution completion, or decide product/business readiness beyond test evidence.
- If MCP tools are unavailable, provide only a framework/template and mark release confidence as Low until data is verified.

Read `references/capability-boundaries.md` when capability scope is unclear.

## Required Scope

Resolve or ask for the minimum missing scope:

- Katalon project and repository/Test Project.
- Release identifier, sprint, iteration, version, test suite, suite collection, execution ID, or date range.
- Target environment/configuration matrix when readiness depends on browsers, devices, OS, or deployment environments.
- Quality gate thresholds when the team has defined them.

If the user gives only a release name or issue key, use MCP discovery first. Ask only when multiple equally plausible scopes remain.

## MCP Data Collection

Always resolve context before analysis:

1. Call `list_projects`.
2. Call `list_repositories`.
3. Resolve the repository/Test Project.
4. Find the release scope using available requirement, suite, execution, iteration, or result tools.

Collect evidence with the available Katalon MCP tools:

- Requirement and traceability: `find_requirements`, `read_requirement`, `fetch_requirement_data`.
- Test case quality: `find_test_cases`, `find_test_cases_by_requirement`, `fetch_test_case_data`.
- Suites and executable scope: `find_test_suites`, `read_test_suite`.
- Executions and results: `read_execution`, `read_execution_test_results`, `read_test_result`, `find_test_results`.
- Defect risk: `fetch_defect_data`.
- Stability: `fetch_test_stability_data`.
- Configuration coverage: `fetch_test_configuration_data`.

Use the freshest data available for the requested release. If comparing trend or stability, include the date range used.

## Key Metrics

Report the metrics that are available and relevant:

- Requirement coverage: total, covered, uncovered, linked test cases, requirements without passing evidence.
- Test coverage: total tests, automated/manual split, unexecuted, blocked, stale, missing ownership or incomplete cases.
- Execution health: latest executions, pass/fail/blocked/skipped/not-run counts, pass rate, failed P0/P1 tests.
- Defect risk: open critical/high defects, release blockers, reopened defects, failed tests with linked defects, untriaged failures.
- Stability: flaky tests, repeated failures, unstable suites/configurations, recent trend.
- Configuration coverage: environments, browsers, devices, OS, execution profiles, and missing target combinations.
- Data confidence: missing MCP data, stale executions, ambiguous release scope, or incomplete links.

Read `references/release-quality-gates.md` before making the final readiness decision.

## Readiness Decision

Return one of:

- `Ready`: no testing blocker remains; critical requirements have coverage and recent passing evidence; target configurations are sufficiently tested.
- `Ready with risk`: no hard blocker remains, but moderate gaps or accepted risks exist.
- `Not ready`: release-blocking defects, failed/blocked/unrun critical tests, missing critical coverage, stale evidence, or untested required configurations remain.

If thresholds are provided, apply them. If not, use risk-based judgment and state assumptions.

Never mark `Ready` when:

- Critical/high release-blocking defects remain open.
- P0/P1 tests are failed, blocked, or not run without accepted risk.
- Critical requirements have no tests or no passing evidence.
- Required target configurations are untested.
- MCP data is unavailable or too incomplete to support confidence.

## Response Format

Respond with:

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

Evidence should include execution IDs, suite names, requirement keys, defect IDs, or links when returned by the platform.

## Follow-Up Actions

Recommend concrete next steps:

- Create or link missing tests for uncovered critical requirements.
- Re-run failed, flaky, or stale suites.
- Resolve or accept specific defects.
- Expand configuration coverage for missing release targets.
- Use `katalon-execute-test` when execution is needed.
- Use `katalon-create-test-cases` when coverage gaps require new manual cases.
- Use `katalon-upload-report` when external automation results must be uploaded before assessment.
