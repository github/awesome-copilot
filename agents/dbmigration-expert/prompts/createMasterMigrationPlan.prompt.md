---
description: 'Discovers all projects in a solution, determines Oracle→PostgreSQL migration eligibility, detects prior progress, and produces a persistent master migration plan that enables cross-session continuity.'
model: Claude Opus 4.6 (copilot)
tools: [vscode/askQuestions, read, search, todo]
---
# Create Master Migration Plan

Enumerate all projects in a solution, assess which require Oracle→PostgreSQL migration, detect any prior migration progress, and produce a persistent master migration plan. This plan is the single source of truth for multi-project migration orchestration and is designed to survive token-limit boundaries — any fresh agent session can read it and resume where the previous session left off.

## Expected Inputs (from router handoff payload)

| Key | Required | Description |
|---|---|---|
| `SOLUTION_ROOT` | Yes | Resolved workspace root path. |
| `SOLUTION_FILE_PATH` | No | Absolute path to the `.sln` file. If omitted, discover it by searching `SOLUTION_ROOT` for `*.sln` files. |

---

## Phase 1 — Discover Projects

1. **Locate the solution file.** If `SOLUTION_FILE_PATH` was provided, use it. Otherwise, search `SOLUTION_ROOT` for `.sln` files. If multiple are found, ask the user which solution to target.
2. **Parse the solution file.** Extract all project references (`.csproj` paths) from the solution. Record the full list.
3. **Categorize each project.** For every project, determine:
   - **Project name** (folder name and assembly name).
   - **Project path** (absolute).
   - **Project type** (class library, web API, console, test project, etc.) — infer from SDK, output type, or naming conventions.

---

## Phase 2 — Assess Migration Eligibility

For each non-test project, analyze whether it requires Oracle→PostgreSQL migration:

1. **Scan for Oracle indicators:**
   - NuGet references to `Oracle.ManagedDataAccess`, `Oracle.EntityFrameworkCore`, or similar Oracle packages (check `.csproj` and any `packages.config`).
   - Connection string entries referencing Oracle (in `appsettings.json`, `web.config`, `app.config`, or similar configuration files).
   - Code-level usage of `OracleConnection`, `OracleCommand`, `OracleDataReader`, or Oracle-specific SQL syntax patterns.
   - References to stored procedures or packages known to be Oracle-specific (cross-reference with DDL under `.github/dbmigration/DDL/Oracle/` if present).

2. **Classify each project:**
   - **MIGRATE** — Has Oracle database interactions that must be converted.
   - **SKIP** — No Oracle indicators found (e.g., pure UI project, shared utility library with no DB access).
   - **ALREADY_MIGRATED** — A `.Postgres` duplicate already exists and appears to have been processed.
   - **TEST_PROJECT** — Identified as a test project; will be handled by the testing workflow, not direct migration.

3. **Confirm with the user.** Present the classified list and ask the user to confirm, adjust, or add projects before finalizing the plan.

---

## Phase 3 — Detect Prior Progress

Check for existing migration artifacts that indicate work from a previous session:

1. **Per-project loop state files:** Look for `.github/dbmigration/Reports/.loop-state-{ProjectName}.md` for each MIGRATE-eligible project. If found, read and record the iteration, decision, and test counts.
2. **Existing `.Postgres` project folders:** Check if a duplicated project already exists alongside a MIGRATE target. If so, note whether it appears to have been fully migrated (tool-generated changes present) or is a partial/empty copy.
3. **Existing reports:** Check for:
   - `Integration Testing Plan.md` — indicates testing was planned.
   - `Validation Report.md` — indicates testing was executed.
   - `BUG_REPORT_*.md` files — indicate issues were documented.
   - `Application Migration Report.md` — indicates a previous run completed or partially completed.
4. **Existing master plan:** Check if `Master Migration Plan.md` already exists. If it does, read it and compare against current solution state. If the existing plan is still valid (same projects, correct statuses), update it in place rather than overwriting. If the solution has changed (new projects added/removed), regenerate with the user's confirmation.

---

## Phase 4 — Produce the Master Migration Plan

Write the plan to: `{SOLUTION_ROOT}/.github/dbmigration/Reports/Master Migration Plan.md`

Use the format defined below exactly. The router and future sessions depend on the structure being parseable.

```markdown
# Master Migration Plan

**Solution:** {solution file name}
**Solution Root:** {SOLUTION_ROOT}
**Created:** {timestamp}
**Last Updated:** {timestamp}
**Status:** {NOT_STARTED | IN_PROGRESS | COMPLETED}

## Solution Summary

| Metric | Count |
|--------|-------|
| Total projects in solution | {n} |
| Projects requiring migration | {n} |
| Projects already migrated | {n} |
| Projects skipped (no Oracle usage) | {n} |
| Test projects (handled separately) | {n} |

## Project Inventory

| # | Project Name | Path | Classification | Status | Notes |
|---|---|---|---|---|---|
| 1 | {name} | {relative path from SOLUTION_ROOT} | MIGRATE | {see Status Values} | {any notes} |
| 2 | {name} | {relative path from SOLUTION_ROOT} | SKIP | N/A | No Oracle dependencies |
| ... | ... | ... | ... | ... | ... |

### Status Values

For projects classified as **MIGRATE**, the Status column tracks lifecycle progress:

- `PENDING` — Not yet started.
- `MIGRATING` — `migrateApplicationCodebase` is in progress or was interrupted.
- `MIGRATED` — Code migration complete; testing not yet started.
- `TESTING` — Closed-loop testing in progress (see loop state file for details).
- `TEST_PASSED` — Testing exited with SUCCESS or CONDITIONAL.
- `TEST_BLOCKED` — Testing is blocked; requires user intervention.
- `COMPLETED` — Migration and testing both finished.

## Migration Order

Projects should be migrated in the following order (rationale included):

1. **{ProjectName}** — {rationale, e.g., "Core data access library; other projects depend on it."}
2. **{ProjectName}** — {rationale}
3. ...

## Prior Progress Detected

{If no prior progress: "No prior migration artifacts found. This is a fresh migration."}

{If prior progress exists, summarize per project:}

### {ProjectName}
- **Loop state file:** {exists | not found} {if exists: iteration {n}, decision: {decision}}
- **`.Postgres` folder:** {exists | not found} {if exists: appears {complete | partial}}
- **Reports:** {list any existing reports}
- **Recommended resume point:** {e.g., "Resume from closed-loop testing iteration 2" or "Re-run migrateApplicationCodebase — previous copy appears incomplete"}

## Resume Instructions

To continue this migration in a fresh agent session:

1. Read this file: `{SOLUTION_ROOT}/.github/dbmigration/Reports/Master Migration Plan.md`
2. Check the **Project Inventory** table for the first project with a non-terminal status (`PENDING`, `MIGRATING`, `MIGRATED`, `TESTING`, `TEST_BLOCKED`).
3. For that project:
   - If `PENDING` → begin with `migrateApplicationCodebase`.
   - If `MIGRATING` → check if the `.Postgres` folder exists and is complete; if partial, re-run `migrateApplicationCodebase`.
   - If `MIGRATED` → begin closed-loop testing (`planIntegrationTesting` → ...).
   - If `TESTING` → read the per-project loop state file (`.loop-state-{ProjectName}.md`) and resume the testing loop at the recorded iteration.
   - If `TEST_BLOCKED` → present blocking issues to the user for resolution.
4. After each project reaches `COMPLETED` or `TEST_PASSED`, update this file's Project Inventory table and move to the next project.
5. When all MIGRATE projects reach a terminal status, invoke `generateApplicationMigrationReport`.
```

---

## Completion Criteria

This subagent is complete when:
- The master migration plan file exists at the specified path.
- All projects in the solution have been discovered and classified.
- The user has confirmed the migration target list and ordering.
- Any prior progress has been detected and recorded in the plan.
- The plan is ready for the router to begin (or resume) the per-project migration lifecycle.

Return to the router with:
- The path to the master migration plan file.
- The confirmed list of projects to migrate (in order).
- A summary of any prior progress detected.
