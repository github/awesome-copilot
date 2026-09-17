---
name: creating-oracle-to-postgres-migration-integration-tests
description: 'Creates integration test cases targeting Oracle for .NET data access artifacts. Tests capture Oracle expected behavior as the authoritative baseline; they are written once and later ported to PostgreSQL by migrating the test project in Phase 6. Use only during Phase 3, before any PostgreSQL migration work has begun. Do not invoke during Phase 6 or against a project that has already been migrated.'
---

# Creating Integration Tests for Oracle-to-PostgreSQL Migration

Generates integration test cases for data access artifacts in a single target project. Tests target Oracle and capture its behavior as the authoritative baseline. They are written to be logically portable — so they can survive Phase 6 migration without rewriting — but they do not run against PostgreSQL at this stage.

## Prerequisites

- The test project must already exist and compile (scaffolded separately).
- Read the existing base test class and seed manager conventions before writing tests.

## Workflow

```
Test Creation:
- [ ] Step 1: Discover the test project conventions
- [ ] Step 2: Identify testable data access artifacts
- [ ] Step 3: Create seed data
- [ ] Step 4: Write test cases
- [ ] Step 5: Review determinism
```

**Step 1: Discover the test project conventions**

Read the base test class, seed manager, and project file to understand inheritance patterns, transaction management, and seed file conventions.

**Step 2: Identify testable data access artifacts**

Scope to the target project only. List data access methods that interact with the database — repositories, DAOs, stored procedure callers, query builders.

**Step 3: Create seed data**

- Follow seed file location and naming conventions from the existing project.
- Avoid `TRUNCATE TABLE` — keep existing database data intact.
- Assume existing business rows and lookup rows are already present; add only minimal, collision-safe seed records needed for the scenario.
- Do not commit seed data; tests run in transactions that roll back.
- Ensure seed data does not conflict with other tests.
- Load and verify seed data before assertions depend on it.
- Create or reuse a test `LookupConstants` class for stable lookup IDs/codes used across seed builders and assertions.

**Step 4: Write test cases**

- Inherit from the base test class to get automatic transaction create/rollback.
- Ensure each database-touching method in scope has at least one integration test (or multiple tests for higher-risk behavior branches).
- Assert logical outputs (rows, columns, counts, error types), not platform-specific messages.
- Assert specific expected values — never assert that a value is merely non-null or non-empty when a concrete value is available from seed data.
- Avoid testing code paths that do not exist or asserting behavior that cannot occur.
- Avoid redundant assertions across tests targeting the same method.
- For text parameters, include both empty-string and `NULL`/missing input coverage where applicable.
- For datetime behavior, include assertions that validate the value written and read back matches — use the Oracle column's precision (e.g., seconds-only for a date/time column with no fractional seconds) rather than assuming any particular database type syntax.

**Step 5: Review determinism**

Re-examine every assertion against non-null values. Confirm each is deterministic against the seeded data. Fix any assertion that depends on database state outside the test's control.

## Key Constraints

- **Phase 3 only** — these tests target Oracle. Do not invoke this skill during Phase 6 or against a PostgreSQL-targeting project.
- **Oracle is the golden source** — tests capture Oracle's expected behavior.
- **Assertion portability** — avoid platform-specific error messages or syntax in assertions so that when the test project is migrated to PostgreSQL in Phase 6, assertions require no changes.
- **Seed only against Oracle** — the test project will be migrated to PostgreSQL in Phase 6; seed data and infrastructure stay Oracle-targeted until then.
- **Scoped to one project** — do not create tests for artifacts outside the target project.
- **Preserve existing data** — never rewrite or wipe pre-existing business or lookup rows.
