---
name: katalon-execute-test
description: Execute Katalon True Platform/TestOps tests when the input is an existing test case, manual test case list, test suite, suite collection, execution request, or "run with AI" instruction. Use when you need to create a manual test run, start Run with AI, poll AI session results, schedule automated suites, read execution/test results, or summarize pass/fail/blocked outcomes. For full requirement-to-test-design-to-execution workflows, combine with or defer to katalon-true-platform-testing. Written for the manual tester who has cases and needs a result, by hand or through Run with AI. A coded suite driven from a framework starts at katalon-playwright-execute or katalon-upload-report.
---

# Katalon Execute Test

Use this skill for running already-selected Katalon test cases or suites and reporting execution outcomes. Keep the larger `katalon-true-platform-testing` skill as the end-to-end orchestrator; this skill is the focused execution workflow.

## Availability Boundary

State the execution boundary before running:

- Available: read AUT environments, create manual test runs, start Run with AI, poll AI sessions, schedule automated suite runs, and read execution/test results.
- Not directly available: guarantee AI completion, inspect the live AUT UI through Katalon MCP, or run manual test cases through the automated scheduler.
- Use Browser/Playwright only when AUT exploration or visual verification outside Katalon MCP is needed.

Read `references/capability-boundaries.md` when capability scope is unclear.

## Resolve Context First

Before creating or scheduling any run:

1. Call `list_projects`.
2. Call `list_repositories`.
3. Resolve the repository/Test Project from the user's wording or unique available repository.

Ask only when multiple equally valid repositories remain, required credentials are missing, or the next action is destructive.

## Choose Execution Type

Use manual execution when:

- The user provides manual test cases.
- The user asks for Run with AI.
- The test cases were just created in Katalon.
- The input is a manual suite.

Use automated execution only when the input is an automated suite or suite collection.

If the user only says "run tests" and the type cannot be inferred, ask whether they want manual or automated execution.

## Manual Run With AI

Always follow this order:

1. Call `read_auts` immediately before `create_manual_test_run`.
2. Resolve the manual cases or suites.
3. If a suite is provided, call `read_test_suite` before creating the run.
4. If individual cases are provided, call `read_test_case` for unclear or risky inputs.
5. Create the manual run with `create_manual_test_run`.
6. Start Run with AI automatically with `create_manual_ai_session` unless the user explicitly says not to run AI.
7. Poll `read_manual_ai_session` until all items leave TODO/IN_TESTING, or the platform returns an external timeout/error.
8. Read available execution/test result details before responding.

AUT rules:

- Never reuse AUT environment selection from an earlier turn or earlier run.
- Choose the AUT/environment whose URL or name clearly matches the target AUT.
- If no AUT exists and a URL is known from the user, requirement, or test data, use it as `default_aut_environment_url`.
- Ask only when multiple AUTs are equally plausible or no target URL can be resolved.

Read `references/execution-workflow.md` before creating manual executions.

## Automated Execution

Use automated execution only for automated suites:

1. Find automated suites or suite collections with `find_test_suites`.
2. Find execution profiles with `find_execution_profiles`.
3. Find TestCloud environments with `list_test_cloud_environments`.
4. Build the run configuration with `build_run_configuration`.
5. Optionally build a schedule with `build_schedule`.
6. Run with `schedule_test_run`.
7. Read execution and test results with `read_execution`, `read_execution_test_results`, and `read_test_result` as needed.

Do not call `create_manual_test_run` for automated suites, and do not call `schedule_test_run` for individual manual test cases.

## Report Results

After execution, report:

- Run name and link when returned.
- Final status.
- Passed, failed, blocked/incomplete, and not-run counts.
- Failed cases with concise failure reasons.
- Defects created or recommended.
- Gaps, skipped cases, and manual follow-up required.

Ask before creating ALM-linked defects unless the user explicitly requested defect creation for failures.
