# Closed-Loop Test Validation Workflow

Read this reference when the user goal involves integration testing. It defines the sequencing, decision logic, and loop control for the test validation cycle.

## Per-Project Scoping

The closed-loop **targets one project at a time**. When a solution contains multiple projects, the router runs a complete closed-loop cycle for each project sequentially — finishing all iterations (including retries) for project A before starting the cycle for project B.

Every testing subagent in the flow receives a `TARGET_PROJECT` parameter (absolute path to the single project under test) in its handoff payload. This ensures:
- **planIntegrationTesting** scopes the plan to artifacts from the target project only.
- **scaffoldTestProject** creates the test project for the target project only.
- **createIntegrationTests** generates tests for the target project's data access layer only.
- **runIntegrationTests** discovers and executes tests for the target project's test project only.
- **validateTestResults** analyzes results for the target project only.
- **createBugReports** scopes bug reports to the target project only.

The loop state file is also per-project (see State Serialization below).

## Flow

```
planIntegrationTesting → scaffoldTestProject → createIntegrationTests → runIntegrationTests → validateTestResults
                                                        ↑                      │
                                                        │                      ▼
                                                        │            ┌─────────────────┐
                                                        │            │  Decision?      │
                                                        │            └────────┬────────┘
                                                        │         EXIT       │       LOOP
                                                        │          ↓         │         ↓
                                                        │   generateReport   │   createBugReports
                                                        │                    │         │
                                                        └────────────────────┴─────────┘
                                                                (fix issues, re-run)
```

## Validation Decision Logic

- **EXIT: SUCCESS** (100% pass + skill checklist complete) → Invoke `generateApplicationMigrationReport`, summarize success, end workflow.
- **EXIT: CONDITIONAL** (>90% pass, minor gaps) → Document known issues, invoke `generateApplicationMigrationReport`, note limitations.
- **LOOP: RETRY** (<90% pass OR critical checklist failures) → Invoke `createBugReports` for failures → prompt user/agent to fix → re-invoke `runIntegrationTests` → `validateTestResults`.
- **BLOCKED** (infrastructure failures, no DB connection) → Halt workflow, report blocking issues, request user intervention.

## Loop Control

- Track iteration count; if >3 iterations without progress, escalate to user with summary of persistent failures.
- After each loop iteration, compare failed test count to previous iteration; if unchanged, escalate.
- Maintain loop state: `iteration: {n}, previous_failures: {count}, current_failures: {count}, blocking_issues: {list}`.

## State Serialization

After each loop iteration (after `validateTestResults` returns), write the current loop state to a **per-project** state file:
`{SOLUTION_ROOT}/.github/o2p-dbmigration/Reports/.loop-state-{ProjectName}.md`

where `{ProjectName}` is derived from the `TARGET_PROJECT` folder name (e.g., `MIUS.API` → `.loop-state-MIUS.API.md`). This avoids conflicts when multiple projects are tested in sequence and allows each project's loop to be resumed independently.

This file allows the loop to resume from last-known state if the conversation context is lost or trimmed.

State file format:
```markdown
# Loop State

**Target Project:** {TARGET_PROJECT}
**Updated:** {timestamp}
**Iteration:** {n}
**Decision:** {EXIT: SUCCESS | EXIT: CONDITIONAL | LOOP: RETRY | BLOCKED}

## Test Counts

| Metric | Previous | Current |
|--------|----------|---------|
| Total  | {n}      | {n}     |
| Passed | {n}      | {n}     |
| Failed | {n}      | {n}     |

## Failed Tests

| Test Name | Error Category | Matched Reference |
|-----------|----------------|-------------------|
| {FullyQualifiedTestName} | {category} | {reference filename} |

## Bug Reports Created

- {BUG_REPORT_*.md filename}: {status}

## Blocking Issues

- {issue description, or "None"}
```

Router behavior:
- **Before first handoff in a testing goal:** check if `.loop-state-{ProjectName}.md` exists for the current `TARGET_PROJECT`. If it does, read it and resume from the recorded iteration rather than starting from scratch.
- **After each `validateTestResults` return:** write/overwrite the per-project state file with current data.
- **On EXIT (SUCCESS or CONDITIONAL):** keep the state file for audit trail; do not delete it.

## Reference Narrowing on Loop Iterations

On the **first iteration**, `validateTestResults` should cross-reference all skill references to establish baseline failure categories.

On **iteration 2+**, the router should narrow the context passed to `validateTestResults` and `createBugReports` by including only the references that matched failure categories in the previous iteration. Use the `relevant_references` field in the handoff payload.

Reference-to-category mapping:
| Error Category | Reference File |
|----------------|----------------|
| NULL/empty string mismatch | `empty-strings-handling.md` |
| Missing NOT FOUND exception | `no-data-found-exceptions.md` |
| FROM clause syntax error | `oracle-parentheses-from-clause.md` |
| Sort order difference | `oracle-to-postgres-sorting.md` |
| TO_CHAR numeric format error | `oracle-to-postgres-to-char-numeric.md` |
| Type comparison mismatch | `oracle-to-postgres-type-coercion.md` |
| Cursor/result set issue | `postgres-refcursor-handling.md` |

If a **new failure category** appears in a later iteration that was not present before, add its reference back into the narrowed list for subsequent passes.
