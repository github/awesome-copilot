---
description: 'Migrates a single application project from Oracle to Postgres using the #ms-ossdata.vscode-pgsql extension. Invoked once per project by the router.'
model: Claude Sonnet 4.6 (copilot)
tools: [vscode/installExtension, vscode/askQuestions, vscode/extensions, execute, read, edit, search, ms-ossdata.vscode-pgsql/pgsql_migration_oracle_app, todo]
---
# Migrate Application Codebase from Oracle to Postgres

Migrate a single application project from Oracle to Postgres, preserving existing functionality and aligning database access with PostgreSQL conventions. This prompt handles **one project per invocation**; the router invokes it once for each project requiring migration.

## Expected Inputs (from router handoff payload)

| Key | Required | Description |
|---|---|---|
| `SOLUTION_ROOT` | Yes | Resolved workspace root path. |
| `TARGET_PROJECT` | Yes | Absolute path to the application project folder to migrate (e.g., `C:/Source/MyApp/MIUS.API`). |
| `CODING_NOTES_PATH` | No | Path to coding notes from the schema migration phase (e.g., `{SOLUTION_ROOT}/.github/dbmigration/Reports/migration-notes.md`). If omitted, the tool continues without this context. |
| `POSTGRES_DB_CONNECTION` | No | Connection name for the PostgreSQL database. |
| `POSTGRES_DB_NAME` | No | Name of the target PostgreSQL database. |

---

## Phase 1 — Pre-Migration (agent actions)

The agent performs these steps **before** invoking the migration tool. The goal is to create a side-by-side copy so the original project remains untouched and the migrated code lives in its own namespace.

1. **Duplicate the project.** Copy the entire `TARGET_PROJECT` folder to a sibling folder with a `.Postgres` suffix (e.g., `MIUS.API` → `MIUS.API.Postgres`). This is the **migration target**; the original folder must not be modified.
2. **Rename the assembly and root namespace** in the duplicated project (`.csproj` `<RootNamespace>` and `<AssemblyName>`) by appending `.Postgres` so the new and old versions never collide if referenced in the same solution.
3. **Update internal namespace declarations** across all `.cs` files in the duplicate to match the new root namespace.
4. **Verify the original** is byte-identical to its state before duplication (no files changed, no files added/removed).

> If any pre-migration step fails, stop and report the failure to the router. Do not invoke the migration tool.

---

## Phase 2 — Migration (tool invocation)

Invoke the `#pgsql_migration_oracle_app` tool against the **duplicated** project folder. Do **not** point it at the original.

### Tool Parameters

| Parameter | Required | Value |
|---|---|---|
| `applicationCodebaseFolder` | **Yes** | The duplicated project path from Phase 1 (e.g., `C:/Source/MyApp/MIUS.API.Postgres`). |
| `codingNotesLocationPath` | No | `CODING_NOTES_PATH` from inputs, if provided. |
| `postgresDbConnection` | No | `POSTGRES_DB_CONNECTION` from inputs, if provided. |
| `postgresDbName` | No | `POSTGRES_DB_NAME` from inputs, if provided. |

Let the tool perform its analysis and code conversion. It will ingest the codebase context on its own. Do not interfere with the tool's execution.

---

## Phase 3 — Post-Migration (agent actions)

After the tool completes, the agent verifies and documents the results.

1. **Verify the original project is untouched.** Confirm no files in the original `TARGET_PROJECT` folder were modified or added.
2. **Validate namespace separation.** Confirm the duplicated project's assembly name and root namespace include the `.Postgres` suffix and do not clash with the original.
3. **Compile check.** If a build system is available, attempt to build the migrated project to surface any immediate compilation errors.
4. **Document the outcome.** Produce a brief summary for the router containing:
   - Project migrated: `<original path>` → `<duplicated path>`
   - Tool completion status (success / partial / errors)
   - Any compilation errors or warnings surfaced in step 3
   - Items flagged for follow-up (e.g., manual review of specific files)

> Return this summary to the router so it can track progress across all projects and decide on next steps (integration testing, bug reports, etc.).
