---
name: katalon-analyze-failures
description: Triage Katalon True Platform/TestOps test failures and file defects. Use when you need to investigate failed test results, classify each failure as product defect vs automation defect vs environment/data issue, cluster failures by common signature, find likely root cause from execution data, and optionally create ALM-linked defects for real product bugs. This is failure diagnosis and defect filing; for the overall ship/no-ship release call use katalon-release-analyze, and for repairing the tests themselves use katalon-test-maintenance. Written for the manual tester and the automation tester looking at a red run and needing to know whether the application broke or the test did.
---

# Katalon Analyze Failures

Use this skill for the **failure-analysis** part of the report/analysis stage: turn a set of failed results into a diagnosis and, when warranted, filed defects. The core value is **classification** — separating real product bugs from automation and environment noise.

## Availability Boundary

- **Available via MCP:** read results (`read_test_result`, `read_execution_test_results`, `find_test_results`, `read_execution`), defect context (`fetch_defect_data`), ALM discovery + filing (`find_alm_integration_projects`, `create_defect`).
- **Not directly available:** AI root-cause summarization and automation-error-pattern analytics are TestOps/Studio product features, not MCP calls — narrate their availability, do not claim to call them. `create_defect` requires a **known failed test result ID** and ALM integration details; there is no ID-less defect creation.

## Triage Workflow

```text
+---------------------+     +----------------------+     +----------------------+
| Collect failures    | --> | Classify each        | --> | Cluster by signature |
| read results        |     | product/auto/env     |     |                      |
+---------------------+     +----------------------+     +----------------------+
                                                                   |
                                                                   v
                                                         +----------------------+
                                                         | File defects (asked) |
                                                         +----------------------+
```

## Steps and tool rules

1. **Collect the failures.** `find_test_results` (recent/specific) or `read_execution_test_results` for a run; `read_test_result` per failed case for detail.
2. **Classify each failure** into one bucket:
   - **Product defect** — the application behaved wrong (assertion on real behavior failed, unexpected error/state). Candidate for a filed defect.
   - **Automation defect** — the test is wrong (bad locator, timing, stale data, broken step). Route to `katalon-test-maintenance`.
   - **Environment / data** — infra, account, network, fixture, or AUT-state issue. Route to re-run after fix.
3. **Cluster by signature.** Group failures with the same error message / step / object so one root cause is not filed as N defects.
4. **Check existing defects.** `fetch_defect_data` to avoid duplicate filings.
5. **File defects only when asked and only for product defects.** `find_alm_integration_projects` -> `create_defect` with the failed result ID. Ask before creating unless the user explicitly requested defect filing.
6. **Report.** Per cluster: classification, likely cause, affected cases, and action (file / repair / re-run).

## Prompt recipes

- `Triage the failures in execution 8842: which are product bugs vs flaky tests vs environment?`
- `Cluster today's failed results by root cause and tell me what to file.`
- `File defects for the confirmed product bugs in the checkout suite and link them to the failed results.`

## Hand-offs

- Automation defects / flaky -> `katalon-test-maintenance`.
- Ship decision from the failure picture -> `katalon-release-analyze`.
- Coverage gap exposed by a failure -> `katalon-test-plan`.

Read `references/failure-triage.md` before classifying. Consult the orchestrator's `references/unavailable-capabilities.md` for defect-filing boundaries.
