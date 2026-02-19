---
description: 'Analyze test results, apply dbmigration skill checklist, and determine pass/fail/retry status for the migration validation workflow.'
model: Claude Sonnet 4.6 (copilot)
tools: [vscode/askQuestions, read, edit, search, todo]
---
# Validate Integration Test Results

Analyze test execution results, cross-reference with the `dbmigration` skill verification checklist, and produce a validation report that determines whether the workflow should exit successfully or loop back for fixes. This prompt targets a **single project** identified by `TARGET_PROJECT`.

## Expected Inputs (from router handoff payload)

| Key | Required | Description |
|---|---|---|
| `SOLUTION_ROOT` | Yes | Resolved workspace root path. |
| `TARGET_PROJECT` | Yes | Absolute path to the single application project whose test results are being validated (e.g., `C:/Source/MyApp/MIUS.API.Postgres`). |

CONTEXT:
- Receives test results from `runIntegrationTests` (TRX file and/or summary) **for `TARGET_PROJECT` only**.
- Must validate both **test pass rate** and **skill checklist compliance**.
- Oracle behavior is the golden source; Postgres must match.

INSTRUCTIONS:

## 1. Parse Test Results
Read the TRX file or summary from:
- `{SOLUTION_ROOT}/.github/dbmigration/Reports/TestResults/`

Extract:
- Total tests, passed, failed, skipped counts
- List of failed test names with error messages
- Any timeout or infrastructure errors (connection failures, timeouts)

## 2. Cross-Reference with dbmigration Skill Checklist
For each failed test, analyze the error against the known Oracle→Postgres migration patterns documented in:
- `{SOLUTION_ROOT}/.github/skills/dbmigration/references/`

PATTERN MATCHING TABLE:
| Error Pattern | Likely Cause | Reference File |
|---------------|--------------|----------------|
| `NULL` vs empty string mismatch | Oracle treats '' as NULL | `empty-strings-handling.md` |
| "no rows returned" or silent null | Missing NOT FOUND exception | `no-data-found-exceptions.md` |
| Sort order differs between DBs | Collation mismatch | `oracle-to-postgres-sorting.md` |
| Type mismatch / comparison error | Implicit coercion difference | `oracle-to-postgres-type-coercion.md` |
| Cursor/result set empty or wrong | Refcursor handling difference | `postgres-refcursor-handling.md` |
| "operation already in progress" or concurrent command error | Single active command per connection | `postgres-concurrent-transactions.md` |

For each failed test, tag the probable root cause category.

## 3. Apply Verification Checklist
Review the `dbmigration` skill checklist (from `SKILL.md`):

- [ ] Migration artifact review documented with affected components.
- [ ] Each `references/*.md` insight acknowledged and steps taken.
- [ ] Integration tests cover the behaviors mentioned in the insights.
- [ ] Test suite runs cleanly with deterministic results.
- [ ] Notes recorded describing how each insight influenced the fix.

Score each item as: ✅ Complete | ⚠️ Partial | ❌ Incomplete

## 4. Determine Workflow Decision
Based on test results and checklist:

| Condition | Decision | Next Action |
|-----------|----------|-------------|
| 100% tests pass + all checklist ✅ | **EXIT: SUCCESS** | Generate final migration report |
| >90% pass + minor checklist gaps | **EXIT: CONDITIONAL** | Document known issues, generate report |
| <90% pass OR critical checklist ❌ | **LOOP: RETRY** | Create bug reports → fix → re-run tests |
| Infrastructure failures (no DB connection) | **BLOCKED** | Halt, request environment fix |

## 5. Output Validation Report
Write the validation report to:
`{SOLUTION_ROOT}/.github/dbmigration/Reports/Validation Report.md`

REPORT TEMPLATE:
```markdown
# Integration Test Validation Report

**Target Project:** {TARGET_PROJECT}
**Generated:** {timestamp}
**Test Run:** {TRX filename or run identifier}

## Test Results Summary

| Metric | Oracle Baseline | Postgres Target |
|--------|-----------------|-----------------|
| Total | {n} | {n} |
| Passed | {n} | {n} |
| Failed | {n} | {n} |
| Skipped | {n} | {n} |
| **Pass Rate** | {%} | {%} |

## Failed Test Analysis

| Test Name | Error Category | Reference | Recommended Fix |
|-----------|----------------|-----------|-----------------|
| {test} | {category} | {file.md} | {brief action} |

## Skill Checklist Status

| Checklist Item | Status | Notes |
|----------------|--------|-------|
| Migration artifact review | {✅/⚠️/❌} | {notes} |
| Reference insights applied | {✅/⚠️/❌} | {notes} |
| Test coverage adequate | {✅/⚠️/❌} | {notes} |
| Test suite deterministic | {✅/⚠️/❌} | {notes} |
| Documentation complete | {✅/⚠️/❌} | {notes} |

## Workflow Decision

**Status:** {EXIT: SUCCESS | EXIT: CONDITIONAL | LOOP: RETRY | BLOCKED}
**Reason:** {brief explanation}

### Next Steps
{Ordered list of actions based on decision}
```

## 6. Handoff Instructions
Return the following to the router:
- **Decision:** EXIT | LOOP | BLOCKED
- **Failed tests count:** {n}
- **Bug reports needed:** {yes/no}
- **Blocking issues:** {list if BLOCKED}

The router will:
- EXIT → Invoke `generateApplicationMigrationReport`
- LOOP → Invoke `createBugReports` for failures, then prompt for fixes, then re-invoke `runIntegrationTests`
- BLOCKED → Halt and request user intervention
