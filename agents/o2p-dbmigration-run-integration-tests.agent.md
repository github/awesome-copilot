---
name: o2p-dbmigration-run-integration-tests
user-invokable: false
description: 'Execute xUnit integration tests against Oracle and/or Postgres databases to validate migration correctness.'
model: Claude Sonnet 4.6 (copilot)
tools: [vscode/askQuestions, execute, read, search, todo]
---
# Run Integration Tests for Database Migration Validation

Execute the xUnit integration test suite to validate application behavior against the target database(s). Capture structured test results for downstream validation. This prompt targets a **single project** identified by `TARGET_PROJECT`.

## Expected Inputs (from router handoff payload)

| Key | Required | Description |
|---|---|---|
| `REPOSITORY_ROOT` | Yes | Resolved workspace root path. |
| `TARGET_PROJECT` | Yes | Absolute path to the single application project whose tests should be executed. |

CONTEXT:
- Oracle is the **golden source of truth** for expected behavior.
- Tests may run against Oracle first (baseline), then Postgres (target) to compare outcomes.
- Test projects follow the naming convention `*.IntegrationTests` or `*.Tests.Integration`.

INSTRUCTIONS:

## 1. Discover Test Project
- Locate the xUnit integration test project associated with `TARGET_PROJECT`. Look for a sibling or child project with `IntegrationTests` or `Tests.Integration` in its name that references `TARGET_PROJECT`.
- **Do not discover or run test projects for other application projects in the solution.** Focus on one project at a time.
- Prefer projects with `Oracle` or `Postgres` in the folder/namespace to identify target database.
- If both exist, run Oracle tests first to establish baseline, then Postgres tests.

## 2. Execute Tests
Run tests using `dotnet test` with structured output:

Run the **full test suite** to capture all results. If the user provides a `--filter`, apply it; otherwise run everything.

```powershell
# Run tests with TRX (Visual Studio Test Results) output
dotnet test "{TestProjectPath}" --logger "trx;LogFileName=TestResults.trx" --results-directory "{REPOSITORY_ROOT}/.github/o2p-dbmigration/Reports/TestResults"

# Alternative: Run with console verbosity for immediate feedback
dotnet test "{TestProjectPath}" --verbosity normal
```

OPTIONS:
- Use `--filter` to run specific test classes/methods if provided by user.
- Use `--no-build` if project was recently built.
- Capture both stdout and the `.trx` file for comprehensive results.

## 3. Handle Test Failures Gracefully
- Do NOT stop on first failure; run the full suite to capture all issues.
- If tests throw unhandled exceptions, note the exception type and message.
- If connection fails, verify connection string configuration before retrying.

## 4. Capture Results
OUTPUT ARTIFACTS:
| Artifact | Location |
|----------|----------|
| TRX results file | `{REPOSITORY_ROOT}/.github/o2p-dbmigration/Reports/TestResults/{TestProjectName}_{Timestamp}_{Database}_TestResults.trx` |
| Console summary | Inline in response |
| Failed test list | Extracted from TRX or console output |

RESULT SUMMARY FORMAT (provide this after execution):
```markdown
## Test Execution Summary

**Project:** {TestProjectName}
**Target Database:** {Oracle | Postgres}
**Executed:** {timestamp}
**Duration:** {total time}

| Metric | Count |
|--------|-------|
| Total Tests | {n} |
| Passed | {n} |
| Failed | {n} |
| Skipped | {n} |

### Failed Tests (if any)
| Test Name | Error Summary |
|-----------|---------------|
| {FullyQualifiedTestName} | {Brief error message} |
```

## 5. Handoff to Validation
After execution, report the summary above. The user can then invoke `o2p-dbmigration-validate-test-results` to analyze the results.

NOTES:
- Ensure database connection strings are configured in test project settings (`appsettings.json`, environment variables, or user secrets).
- If running in CI, ensure the database is accessible from the build agent.
- Seed data should already be in place from `o2p-dbmigration-create-integration-tests` phase; do not truncate or modify production data.
