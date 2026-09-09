# Execution Workflow

## Manual Run With AI

1. Resolve project and repository.
2. Search existing coverage first, then resolve existing test cases or create only missing cases.
3. Add cases to a manual test suite if grouping is needed.
4. Call `read_auts`.
5. Choose the matching AUT/environment automatically when one clearly matches the target AUT. If none exist and a URL is known, use it as `default_aut_environment_url` for AI execution.
6. Call `create_manual_test_run`.
7. Continue to AI automatically after creating any manual execution unless the user explicitly says not to run AI.
8. Call `create_manual_ai_session`.
9. Poll with `read_manual_ai_session` until every test case leaves TODO/IN_TESTING.
10. Summarize result in chat.

## Manual Run Rules

- Never call `create_manual_test_run` without a fresh `read_auts` first.
- Never reuse AUT environment choices from earlier turns.
- Start Run with AI without asking again after any manual run is created.
- Do not ask whether to continue with AI unless the user explicitly requests a manual run without AI.
- If the manual run contains newly created test cases, they are manual by default.
- Render returned execution paths as markdown links.
- Wait for AI completion before final response. If the platform stays pending/running for an unusually long time, keep polling at practical intervals and only report in-progress status when the user asks or the platform returns a timeout/error.
- Ask for user input only when required data is missing, multiple AUTs are equally plausible, the user explicitly disables AI, or the next action is destructive.

## Automated Run

1. Resolve repository.
2. Find automated test suites or suite collections.
3. Find execution profiles.
4. Select TestCloud environments.
5. Build run configuration.
6. Optionally build schedule.
7. Call `schedule_test_run`.
8. Read execution and results.

## Automated Run Rules

- Use `schedule_test_run` only for automated suites.
- Do not run manual test cases through automated scheduling.
- For mobile native, ensure app details are present.
- For mobile availability filters, clarify automation/manual vs live testing when needed.

## Result Reporting Template

```text
Run:
- Name:
- Link:
- Status:

Summary:
- Passed:
- Failed:
- Blocked/Incomplete:
- Not run:

Findings:
- ...

Next actions:
- ...
```
