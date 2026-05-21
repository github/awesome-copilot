---
name: planning-oracle-to-postgres-migration-integration-testing
description: 'Creates an integration testing plan for .NET data access artifacts during Oracle-to-PostgreSQL database migrations. Analyzes a single project to identify repositories, DAOs, and service layers that interact with the database, then produces a structured testing plan. Use when planning integration test coverage for a migrated project, identifying which data access methods need tests, or preparing for Oracle-to-PostgreSQL migration validation.'
---

# Planning Integration Testing for Oracle-to-PostgreSQL Migration

Analyze a single target project to identify data access artifacts that require integration testing, then produce a structured, actionable testing plan.

## Workflow

```
Progress:
- [ ] Step 1: Identify data access artifacts
- [ ] Step 2: Classify testing priorities
- [ ] Step 3: Write the testing plan
```

**Step 1: Identify data access artifacts**

Scope to the target project only. Find classes and methods that interact directly with the database — repositories, DAOs, stored procedure callers, service layers performing CRUD operations.

**Step 2: Classify testing priorities**

Rank artifacts by migration risk. Prioritize methods that use Oracle-specific features (refcursors, `TO_CHAR`, implicit type coercion, `NO_DATA_FOUND`) over simple CRUD.

**Step 3: Write the testing plan**

Write a markdown plan covering:
- List of testable artifacts with method signatures
- Recommended test cases per artifact
- Seed data requirements
- Known Oracle→PostgreSQL behavioral differences to validate

## Output

Write the plan to: `.github/oracle-to-postgres-migration/Reports/{TARGET_PROJECT} Integration Testing Plan.md`

## Key Constraints

- **Single project scope** — only plan tests for artifacts within the target project.
- **Database interactions only** — skip business logic that does not touch the database.
- **Oracle is the golden source** — tests should capture Oracle's expected behavior for comparison against PostgreSQL.
- **No multi-connection harnessing** — migrated applications are copied and renamed (e.g., `MyApp.Postgres`), so each instance targets one database.
