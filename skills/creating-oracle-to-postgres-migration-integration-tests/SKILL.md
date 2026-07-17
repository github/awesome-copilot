---
name: creating-oracle-to-postgres-migration-integration-tests
description: 'Creates integration test cases for .NET data access artifacts during Oracle-to-PostgreSQL database migrations. Generates DB-agnostic xUnit tests with deterministic seed data that validate behavior consistency across both database systems. Use when creating integration tests for a migrated project, generating test coverage for data access layers, or writing Oracle-to-PostgreSQL migration validation tests.'
---

# Creating Integration Tests for Oracle-to-PostgreSQL Migration

Generates integration test cases for data access artifacts in a single target project. Tests validate behavior consistency when running against Oracle or PostgreSQL.

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
- Reuse existing seed files when possible.
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
- For datetime behavior, include explicit timezone-sensitive assertions when methods write/read `timestamp without time zone` or `timestamp(0)` targets.

**Step 5: Review determinism**

Re-examine every assertion against non-null values. Confirm each is deterministic against the seeded data. Fix any assertion that depends on database state outside the test's control.

## Key Constraints

- **Oracle is the golden source** — tests capture Oracle's expected behavior.
- **DB-agnostic assertions** — no platform-specific error messages or syntax in assertions.
- **Seed only against Oracle** — test project will be migrated to PostgreSQL later.
- **Scoped to one project** — do not create tests for artifacts outside the target project.
- **Preserve existing data** — never rewrite or wipe pre-existing business or lookup rows.
