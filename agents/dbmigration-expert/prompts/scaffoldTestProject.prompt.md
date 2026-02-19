---
description: 'Scaffold an xUnit integration test project for validating database migration from Oracle to Postgres.'
model: Claude Sonnet 4.6 (copilot)
tools: [vscode/askQuestions, execute, read, edit, search, todo]
---
# Scaffold Integration Test Project for Database Migration Validation

Create the integration test project structure that will host tests for validating Oracle-to-Postgres migration behavior. This prompt is invoked **once per project** before the test creation loop begins, and targets a **single project** identified by `TARGET_PROJECT`.

## Expected Inputs (from router handoff payload)

| Key | Required | Description |
|---|---|---|
| `SOLUTION_ROOT` | Yes | Resolved workspace root path. |
| `TARGET_PROJECT` | Yes | Absolute path to the single application project to scaffold tests for (e.g., `C:/Source/MyApp/MIUS.API.Postgres`). |

GENERAL INSTRUCTIONS:
- Keep to the existing .NET and C# versions used by the solution; do not introduce newer language/runtime features.
- Treat Oracle as the golden behavior source.
- Only scaffold infrastructure for Oracle initially. Once complete, user will copy the project for Postgres and modify connection strings.

PROJECT SCAFFOLDING:
- Create an xUnit test project targeting the same .NET version as the application under test.
- Add NuGet package references required for Oracle database connectivity and xUnit test execution.
- Add a project reference to `TARGET_PROJECT` only — do not reference other application projects in the solution.
- Configure test project settings (e.g., `appsettings.json` or equivalent) for Oracle database connectivity.

TRANSACTION MANAGEMENT:
- Implement a base test class or fixture that creates a new transaction before every test execution and rolls it back after execution.
- Ensure that all test exceptions are caught and handled to allow for proper transaction rollback.
- The transaction pattern must be inheritable by all test classes created downstream.

SEED DATA MANAGEMENT:
- Implement a global seed manager to handle test data setup.
- Do not commit seed data because tests are isolated within transactions and rolled back after each test.
- Ensure seed data is loaded and verified before running tests.
- Avoid truncate table statements because we want to keep existing database data intact.
- Priority should be given to re-using existing seed files if any exist.
- Establish a convention for seed file location and naming that downstream test creation will follow.

OUTPUT:
- A compilable, empty test project with the above infrastructure in place.
- No test cases — those are created by the `createIntegrationTests` subagent in the next step.
