---
description: 'Create an integration testing plan for code artifacts that interact with the database in context of an application database migration from Oracle to Postgres.'
model: Claude Opus 4.6 (copilot)
tools: [vscode/askQuestions, read, search, todo]
---
# Create Integration Testing Plan for Database Migration Validation

Assess what classes/methods should be tested for integration with the database before and after the migration. This plan targets a **single project** identified by `TARGET_PROJECT`.

## Expected Inputs (from router handoff payload)

| Key | Required | Description |
|---|---|---|
| `SOLUTION_ROOT` | Yes | Resolved workspace root path. |
| `TARGET_PROJECT` | Yes | Absolute path to the single application project to plan tests for (e.g., `C:/Source/MyApp/MIUS.API.Postgres`). |

INSTRUCTIONS:
- Create a comprehensive and actionable plan for integration testing to ensure that the application functions correctly with the new PostgreSQL database.
- **Scope the plan to `TARGET_PROJECT` only.** Analyze the code artifacts within that project; do not plan tests for other projects in the solution.
- Consider only the code artifacts that interact directly with the database, such as repositories, data access objects (DAOs), and service layers that perform CRUD operations.
- Applications targeted for migration will be copied and renamed to indicate the target database (e.g., 'MyApp.Postgres' for the Postgres version) so there is no need to plan for harnessing of multiple database connections within the same application instance.

OUTPUT:
The plan should be written to a markdown file at this location: '{SOLUTION_ROOT}/.github/o2p-dbmigration/Reports/Integration Testing Plan.md'.