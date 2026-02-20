---
name: o2p-dbmigration
description: 'Validates PostgreSQL migration artifacts and integration tests, making sure every reference insight is surfaced before agent workflows sign off. Use when proving migration or integration testing work and confirming the repository references/insights are obeyed.'
---

# o2p-dbmigration Skill

Use this skill whenever you verify code artifacts that migrated from Oracle, build the companion integration tests, or gate an agent workflow that depends on database changes. It codifies the expectations for validation, testing, and documentation for the `o2p-dbmigration` workload.

## When to Use This Skill

- Before merging any migration script, procedural change, or refcursor conversion to ensure the migration narrative is complete.
- When the agent creates or updates integration tests tied to migration artifacts, so the new tests cover known Oracle/PostgreSQL differences.
- Whenever you need to prove the `references` insights have been read, discussed, and validated across related commits or workflow steps.

## Prerequisites

- Access to the database object DDL artifacts and any integration test projects that exercise them.
- A checklist of affected modules (procedures, packages, triggers, or refcursor clients) for the change under review.
- The `references/*.md` insights nearby so you can cross-check their guidance while crafting migration fixes or tests.

## Step-by-Step Workflows

1. **Map the covered artifact.** Identify the migrated object (e.g., procedure, trigger, query) and summary of the change set you expect the agent to verify.
2. **Cross-check every insight.** For each file in the `references` folder below, confirm the specific behavior or test requirement is acknowledged and addressed:
	- `empty-strings-handling.md`: Ensure logic or tests treat `''` differently from `NULL`, updating stored procedures, applications, and assertions accordingly.
	- `no-data-found-exceptions.md`: Validate that any `SELECT INTO` path now raises `IF NOT FOUND THEN RAISE EXCEPTION` and integration tests replay invalid parameters to catch the exception.
	- `oracle-parentheses-from-clause.md`: Remove unnecessary parentheses around table names in FROM clauses (e.g., `FROM(TABLE_NAME)` → `FROM TABLE_NAME`) to avoid PostgreSQL syntax errors; verify all affected queries in stored procedures and application code.
	- `oracle-to-postgres-sorting.md`: Confirm ordering logic uses `COLLATE "C"` or wrapped DISTINCT queries so sorting results match Oracle expectations, and regression tests cover the stretch.
	- `oracle-to-postgres-to-char-numeric.md`: Replace `TO_CHAR(numeric)` calls without format strings with `CAST(numeric AS TEXT)` or add explicit format masks; verify all numeric-to-string conversions in SQL and application code.
	- `oracle-to-postgres-type-coercion.md`: Verify comparison literals and parameters align with PostgreSQL's stricter types (cast or use string literals when comparing to VARCHAR columns) and add tests that exercise clauses with previously implicit conversions.
	- `postgres-refcursor-handling.md`: Ensure every refcursor consumer unwraps the cursor before reading rows (execute → fetch) and that helper utilities or integration tests follow the pattern.
	- `postgres-concurrent-transactions.md`: Verify that no code path executes a second command while a DataReader is still open on the same connection; materialize results with `.ToList()` or use separate connections, and test iterative data access patterns that trigger concurrent operations.
3. **Build integration tests.** Create or update integration test cases that exercise both the happy path and the failure scenarios highlighted in the insights, including exceptions, sorting validation, and refcursor consumption.
4. **Document the verification.** Record the references covered, tests added, and any decisions about preserving Oracle behavior (e.g., null handling or type coercion) so downstream agents or reviewers can trace the coverage.
5. **Gate the workflow.** Return a checklist asserting each insight was addressed, all migration scripts run, and integration tests execute successfully before closing the skill run.

## Verification Checklist

- [ ] Migration artifact review documented with affected components.
- [ ] Each `references/*.md` insight acknowledged and steps taken (empty string handling, no-data exceptions, parentheses in FROM clauses, sorting, TO_CHAR numeric conversions, type coercion, refcursor handling, concurrent transaction handling).
- [ ] Integration tests cover the behaviors mentioned in the insights and explicitly assert the new PostgreSQL semantics.
- [ ] Test suite runs cleanly and returns deterministic results for the covered cases.
- [ ] Notes or comments recorded in the PR or workflow log describing how each insight influenced the fix.
