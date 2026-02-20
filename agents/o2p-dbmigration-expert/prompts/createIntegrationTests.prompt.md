---
description: 'Create integration test cases for code artifacts identified by the user in context of an application database migration from Oracle to Postgres. Assumes the test project already exists (scaffolded by scaffoldTestProject).'
model: Claude Sonnet 4.6 (copilot)
tools: [vscode/askQuestions, execute, read, edit, search, todo]
---
# Create Integration Test Cases for Database Migration Validation

Create integration test cases for the class/method provided by the user. The test project infrastructure (project file, base test class, transaction management, seed manager) has already been scaffolded by `scaffoldTestProject` — do not recreate it. This prompt targets a **single project** identified by `TARGET_PROJECT`.

## Expected Inputs (from router handoff payload)

| Key | Required | Description |
|---|---|---|
| `SOLUTION_ROOT` | Yes | Resolved workspace root path. |
| `TARGET_PROJECT` | Yes | Absolute path to the single application project whose code artifacts are under test (e.g., `C:/Source/MyApp/MIUS.API.Postgres`). |

PREREQUISITES:
- The test project must already exist and compile. If it does not, stop and report this to the router.
- Read the existing base test class and seed manager conventions before writing any tests so that new test classes follow established patterns.

GENERAL INSTRUCTIONS:
- Treat Oracle as the golden behavior source.
- **Scope all test creation to `TARGET_PROJECT` only.** Only generate tests for the data access artifacts within that project; do not create tests for other projects in the solution.
- Ensure that the tests are able to validate the behavior of the data access layer, whether running against Oracle or Postgres databases.
- Focus on capturing expected outputs, side-effects, and error handling to ensure consistency across both database systems.
- Keep assertions DB-agnostic: assert logical outputs (rows, columns, counts, error types) not platform-specific messages.
- Ensure assertions are deterministic by seeding test data as required.
- Only create integration tests and seed data against Oracle. Once complete, user will copy files to Postgres test project and modify connection strings.

INSTRUCTIONS FOR TEST CASE CREATION:
- Inherit from the base test class established by the scaffolded project to get transaction create/rollback behavior automatically.
- Ensure tests are deterministic by asserting for specific values where possible.
- Avoid testing against coding paths that do not exist or asserting behavior that cannot occur.
- Avoid redundancy in test assertions across tests that target the same method.
- Do not use assertions that pass when a value is null or empty, you must assert against specific expected values (eg assert for null xor assert for empty).
- Plan for a second review of the created tests to ensure assertions against non-null values are deterministic against the seeded data.

LOOP ITERATION BEHAVIOR:
- On **first invocation**: generate the full set of test cases and seed data based on the integration testing plan.
- On **iteration 2+** (when `LOOP_CONTEXT` is provided): focus only on modifying or adding test cases to address the `failed_tests` listed in the loop context. Do not rewrite passing tests. Consult any bug reports referenced in `PRIOR_ARTIFACTS`.

INSTRUCTIONS FOR SEED DATA:
- Follow the seed file location and naming conventions established by the scaffolded project.
- Do not commit seed data because tests are isolated within transactions and rolled back after each test.
- Ensure that changes to seed data do not conflict with other tests.
- Ensure seed data is loaded and verified before running tests.
- Priority should be given to re-using existing seed files.
- Avoid truncate table statements because we want to keep existing database data intact.
