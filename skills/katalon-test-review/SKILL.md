---
name: katalon-test-review
description: Review Katalon True Platform/TestOps test quality and coverage before tests enter the delivery pipeline. Use when you need to check whether a suite is ready to run, review requirement and configuration coverage, assess test-case quality and flakiness/stability, spot weak or unreliable cases, and produce a review verdict (Approve / Approve with fixes / Reject for pipeline) with the specific cases to fix. This is a pre-execution quality gate, not a ship decision; for the release ship/no-ship call use katalon-release-analyze. Written for the test lead gating what is allowed into the pipeline, one suite at a time.
---

# Katalon Test Review

Use this skill for the **review** stage: inspect coverage, quality, and reliability so weak tests do not enter the pipeline. The output is a **verdict with named weak cases**, never a metric dump.

## Availability Boundary

- **Available via MCP:** coverage review (`fetch_requirement_data`, `find_test_cases_by_requirement`, `fetch_test_configuration_data`), quality review (`fetch_test_case_data`), reliability review (`fetch_test_stability_data`, `find_test_results`), and environment readiness (`read_auts`).
- **Not directly available:** code/object review, local debug, StudioAssist Ask — these are Studio-desktop operations. For code-lane review, defer to `katalon-test-case-to-playwright` / `katalon-playwright-execute`. Use Browser/Playwright only for AUT sanity checks when asked.

## Review Workflow

```text
+---------------------+     +----------------------+     +----------------------+
| Coverage review     | --> | Quality review       | --> | Reliability review   |
| reqs + config       |     | case design signals  |     | flakiness/stability  |
+---------------------+     +----------------------+     +----------------------+
                                                                   |
                                                                   v
                                                         +----------------------+
                                                         | Verdict + weak cases |
                                                         +----------------------+
```

## Steps and tool rules

1. **Coverage review.** `fetch_requirement_data` + `find_test_cases_by_requirement` for requirement coverage; `fetch_test_configuration_data` for browser/platform coverage. Flag orphan requirements and under-covered configurations.
2. **Quality review.** `fetch_test_case_data` for design signals; read representative cases with `read_test_case` when a signal is ambiguous. Flag non-atomic cases (many assertions), missing negative/boundary variants, and vague expected results.
3. **Reliability review.** `fetch_test_stability_data` for flakiness; `find_test_results` for recent pass/fail history. Flag probabilistically flaky cases that will erode pipeline trust.
4. **Environment readiness.** `read_auts` to confirm an executable AUT exists for the suite.
5. **Verdict.** One of **Approve** / **Approve with fixes** / **Reject for pipeline**, followed by the specific cases to fix and why. State the risk if approving with known gaps.

## Verdict rubric

- **Approve:** coverage meets the plan, no flaky cases in the critical path, expected results are observable.
- **Approve with fixes:** ship-able but list the exact cases needing a fix (flaky, non-atomic, weak expected result) and the owner action.
- **Reject for pipeline:** orphan critical requirements, or flaky cases in the smoke/regression core — fix before the suite runs.

## Prompt recipes

- `Review the regression suite for release 3.2: is it ready for the pipeline? Give a verdict and list weak cases.`
- `Check requirement and configuration coverage for project X and flag anything under-covered.`
- `Which cases in the smoke suite are flaky enough to reject before we wire them into CI?`

## Hand-offs

- Fixes needed -> `katalon-create-test-cases` (redesign) or `katalon-test-maintenance` (repair/flaky).
- Approved -> `katalon-execute-test`.
- Ship decision after execution -> `katalon-release-analyze`.

Read `references/review-rubric.md` before issuing a verdict. Consult the orchestrator's `references/unavailable-capabilities.md` for boundaries.
