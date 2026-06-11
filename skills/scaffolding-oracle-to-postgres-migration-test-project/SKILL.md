---
name: scaffolding-oracle-to-postgres-migration-test-project
description: 'Scaffolds an xUnit integration test project for validating Oracle-to-PostgreSQL database migration behavior in .NET solutions. Creates the test project, transaction-rollback base class, and seed data manager. Use when setting up test infrastructure before writing migration integration tests, or when a test project is needed for Oracle-to-PostgreSQL validation.'
---

# Scaffolding an Integration Test Project for Oracle-to-PostgreSQL Migration

Creates a compilable, empty xUnit test project with transaction management and seed data infrastructure for a single target project. Run once per project before writing tests.

## Workflow

```
Progress:
- [ ] Step 1: Inspect the target project
- [ ] Step 2: Create the xUnit test project
- [ ] Step 3: Implement transaction-rollback base class
- [ ] Step 4: Implement seed data manager
- [ ] Step 5: Verify the project compiles
```

**Step 1: Inspect the target project**

Read the target project's `.csproj` to determine the .NET version and existing package references. Match these versions exactly — do not upgrade.

**Step 2: Create the xUnit test project**

- Target the same .NET version as the application under test.
- Add NuGet packages for Oracle database connectivity and xUnit.
- Add a project reference to the target project only — no other application projects.
- Add an `appsettings.json` configured for Oracle database connectivity.

**Step 3: Implement transaction-rollback base class**

- Create a base test class that opens a transaction before each test and rolls it back after.
- Catch and handle all exceptions to guarantee rollback.
- Make the pattern inheritable by all downstream test classes.

**Step 4: Implement seed data manager**

- Create a global seed manager for loading test data within the transaction scope.
- Do not commit seed data — transactions roll back after each test.
- Do not use `TRUNCATE TABLE` — preserve existing database data.
- Reuse existing seed files if available.
- Establish a naming convention for seed file location that downstream test creation will follow.

**Step 5: Verify the project compiles**

Build the test project and confirm it compiles with zero errors before finishing.

## Key Constraints

- Oracle is the golden behavior source — scaffold for Oracle first.
- Keep to existing .NET and C# versions; do not introduce newer language or runtime features.
- Output is an empty test project with infrastructure only — no test cases.
