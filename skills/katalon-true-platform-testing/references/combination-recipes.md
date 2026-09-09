# Combination recipes — multi-skill, multi-tool playbooks

Each recipe chains several skills and MCP tools into one end-to-end play. Trigger phrase, skill order, key tools, stop condition, boundary.

## R1 — Requirement to ship call  (stages 1->6)
- **Trigger:** "test CEL-6 end to end and tell me if we can ship."
- **Skills:** `katalon-test-plan` -> `katalon-create-test-cases` -> `katalon-execute-test` -> `katalon-analyze-failures` -> `katalon-release-analyze`.
- **Tools:** `fetch_requirement_data`, `find_test_cases_by_requirement`, `create_test_case`, `link_requirements_to_test_case`, `manage_test_suite`, `read_auts`, `create_manual_test_run`, `create_manual_ai_session`, `read_manual_ai_session`, `read_test_result`, then the `fetch_*` quality tools.
- **Stop when:** release verdict issued (Ready / Ready with risk / Not ready).
- **Boundary:** no release-gate authoring; the ship call reads gates, it does not set them.

## R2 — Coverage rescue  (stages 3->4->2)
- **Trigger:** "we have gaps, fix our coverage for project X."
- **Skills:** `katalon-test-management` (find orphan requirements/cases) -> `katalon-test-review` (verdict on what exists) -> `katalon-create-test-cases` (fill).
- **Tools:** `find_test_cases_by_requirement`, `fetch_requirement_data`, `find_test_cases`, `fetch_test_case_data`, then `create_test_case` + `link_requirements_to_test_case`.
- **Stop when:** every in-scope requirement has >=1 linked case and the review verdict is Approve / Approve-with-fixes.

## R3 — Flaky-suite cleanup  (stages 6->7->4)
- **Trigger:** "our regression is flaky, clean it up."
- **Skills:** `katalon-analyze-failures` (classify automation defects) -> `katalon-test-maintenance` (repair/regenerate) -> `katalon-test-review` (re-approve).
- **Tools:** `find_test_results`, `read_test_result`, `fetch_test_stability_data`, `update_test_case`, `move_test_case`, then re-run + `fetch_test_stability_data` again.
- **Stop when:** flaky cases in the critical path are repaired or retired and the suite re-approves.

## R4 — Manual to automation graduation  (stages 2->5)
- **Trigger:** "turn these manual cases into automation and run them into the platform."
- **Skills:** `katalon-create-test-cases` -> `katalon-test-case-to-playwright` -> `katalon-playwright-execute` -> `katalon-upload-report`.
- **Tools:** `read_test_case`, `find_test_cases`, then Playwright codegen + `@katalon/playwright-reporter` upload, verified via `read_execution` / `find_test_results`.
- **Stop when:** the Playwright run is uploaded and the platform run is verified.

## R5 — Cross-lane trust check  (stages 5->6)
- **Trigger:** "don't trust the AI pass, verify it against real automation."
- **Skills:** `katalon-execute-test` (manual Run with AI) + `katalon-playwright-execute` (code lane) -> `katalon-analyze-failures`.
- **Tools:** `create_manual_ai_session`, `read_manual_ai_session`, Playwright run + `@katalon/playwright-reporter` upload, then `read_test_result` on both.
- **Stop when:** every critical case's manual AI verdict is confirmed against the code-lane ground truth; discrepancies recorded.
- **Boundary:** a self-reported AI PASS contradicted by the code lane is not a PASS.

## R6 — Traceability audit  (stage 3)
- **Trigger:** "show me requirement-to-test coverage."
- **Skills:** `katalon-test-management`.
- **Tools:** `find_requirements`, `find_test_cases_by_requirement`, `fetch_requirement_data`, `find_test_cases`.
- **Stop when:** the requirement <-> case <-> suite matrix + orphan lists + coverage % are reported.

## Composition rule

Always resolve project/repository once at the start, reuse that scope across the whole recipe, and state the boundary before promising any step. Ask only when a required value cannot be resolved safely.
