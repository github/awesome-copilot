---
name: creating-oracle-to-postgres-master-migration-plan
description: 'Discovers all projects in a .NET solution, classifies each for Oracle-to-PostgreSQL migration eligibility, and produces a persistent master migration plan. Use when starting a multi-project Oracle-to-PostgreSQL migration, creating a migration inventory, or assessing which .NET projects contain Oracle dependencies.'
---

# Creating an Oracle-to-PostgreSQL Master Migration Plan

Analyze a .NET solution, classify every project for Oracle→PostgreSQL migration eligibility, and write a structured plan that downstream agents and skills can parse.

## Workflow

```
Progress:
- [ ] Step 1: Discover projects in the solution
- [ ] Step 2: Classify each project
- [ ] Step 3: Confirm with user
- [ ] Step 4: Write the plan file
```

**Step 1: Discover projects**

Find the Solution File (it has a `.sln` or `.slnx` extension) in the workspace root (ask the user if multiple exist). Parse it to extract all `.csproj` project references. For each project, note the name, path, and type (class library, web API, console, test, etc.).

**Step 2: Classify each project**

Scan every non-test project for Oracle indicators:

- NuGet references: `Oracle.ManagedDataAccess`, `Oracle.EntityFrameworkCore` (check `.csproj` and `packages.config`)
- Config entries: Oracle connection strings in `appsettings.json`, `web.config`, `app.config`
- Code usage: `OracleConnection`, `OracleCommand`, `OracleDataReader`
- DDL cross-references under `.github/oracle-to-postgres-migration/DDL/Oracle/` (if present)

Assign one classification per project:

| Classification | Meaning |
|---|---|
| **MIGRATE** | Has Oracle interactions requiring conversion |
| **SKIP** | No Oracle indicators (UI-only, shared utility, etc.) |
| **ALREADY_MIGRATED** | A `-postgres` or `.Postgres` duplicate exists and appears processed |
| **TEST_PROJECT** | Test project; handled by the testing workflow |

**Step 3: Confirm with user**

Present the classified list. Let the user adjust classifications or migration ordering before finalizing.

**Step 4: Write the plan file**

Save to: `.github/oracle-to-postgres-migration/Reports/Master Migration Plan.md`

Use this exact template — downstream consumers depend on the structure:

````markdown
# Master Migration Plan

**Solution:** {solution file name}
**Solution Root:** {REPOSITORY_ROOT}
**Created:** {timestamp}
**Last Updated:** {timestamp}

## Solution Summary

| Metric | Count |
|--------|-------|
| Total projects in solution | {n} |
| Projects requiring migration | {n} |
| Projects already migrated | {n} |
| Projects skipped (no Oracle usage) | {n} |
| Test projects (handled separately) | {n} |

## Project Inventory

| # | Project Name | Path | Classification | Notes |
|---|---|---|---|---|
| 1 | {name} | {relative path} | MIGRATE | {notes} |
| 2 | {name} | {relative path} | SKIP | No Oracle dependencies |

## Migration Order

1. **{ProjectName}** — {rationale, e.g., "Core data access library; other projects depend on it."}
2. **{ProjectName}** — {rationale}
````

Order projects so that shared/foundational libraries are migrated before their dependents.
