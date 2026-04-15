---
name: arc
type: skill
version: '1.0.0'
description: >
  Composable LLM agent orchestration via .arc.yml files. Reads declarative
  arc templates, generates reviewable execution plans (traces), and runs
  steps sequentially using existing skills as primitives. Use when orchestrating
  multi-skill development tasks, automating feature arcs, or creating
  reproducible development processes. Trigger: 'run arc', 'execute arc',
  'arc', 'orchestrate skills', 'run the feature flow'.
---
# Skill Arcs — Composable LLM Agent Orchestration

## Overview

Execute declarative arc templates that chain existing skills into
reproducible, reviewable development processes. Bridges the gap between
manual step-by-step skill invocation and unpredictable autopilot mode.

**The model**: You write the choreography (`.arc.yml`); the AI does the dancing.

> **Customize**: Define your team's arcs in `.github/arcs/*.arc.yml`.
> Different projects share the same `/arc` skill but configure their own templates.

## How It Works

```
1. User prompt → "Run feature-flow for issue #42"
2. /arc reads .arc.yml, binds parameters
3. Trace presented for review (Terraform plan-style)
4. User approves → steps execute sequentially
5. Each step invokes a skill or shell command
6. Context flows between steps via ${{ }} expressions
```

## Modes

| Mode | Description |
|------|------------|
| **Template** | Read a `.arc.yml` file and execute it with bound parameters |
| **Ad-hoc** | Sketch an arc from a natural language prompt (no file needed) |
| **Inspect** | Show available arcs and their steps without executing |


## Arc Execution

### Phase 1: Discover

Find the arc to run:

1. **Named arc** — user specifies an arc name:
   - Search `.github/arcs/*.arc.yml` in the current repo
   - Match by `name:` field in the arc file
2. **Ad-hoc** — user describes a task without naming an arc:
   - Generate a trace from the prompt using available skills
   - Present the generated trace for review before executing

### Phase 2: Bind Parameters

Resolve all `params:` from:
1. Values explicitly provided in the user's prompt
2. Default values defined in the arc file
3. **Ask the user** for any `required: true` params not yet resolved

Validate:
- All required params are bound
- No `${{` expression references undefined params
- Warn (don't fail) on unused params

### Phase 3: Generate Trace

Build the concrete execution plan:

```
Arc: feature-flow
Params: issue_id = "42", branch_prefix = "feature"

Steps:
  1. ✅ [run]                  Create feature branch
  2. ✅ [create-implementation-plan]  Generate implementation plan
  3. 🔒 [GATE]                 Review the plan before proceeding
  4. ✅ [breakdown-test]        Write failing tests
  5. ✅ [run]                   Run tests and implement
  6. ✅ [doublecheck]           Review changes for quality
  7. ✅ [run]                   lint and test
  8. ✅ [git-commit]            Commit with conventional message
  9. ✅ [run]                   Create pull request

⚠️  0 steps will be skipped (all skills available)
Approve this trace? [Y/n/edit]
```

Mark steps with:
- ✅ — skill/command available, ready to execute
- ⚠️ — skill not installed, will be **skipped** with a warning
- 🔒 — gate step, will pause for user approval


### Phase 4: Review Gate

Present the trace to the user. The user can:
- **Approve** — execute all steps
- **Edit** — reorder, remove, or modify steps
- **Abort** — cancel without executing


### Phase 5: Execute

Run each step sequentially:

1. **Update status** — mark step as `running` in the session SQL database
2. **Invoke** — call the skill or run the shell command
3. **Capture outputs** — store outputs in the context object
4. **Update status** — mark step as `done`, `failed`, or `skipped`
5. **Check gates** — if next step is `gate: true`, pause for approval
6. **Handle failures** — based on `on_failure`:
   - `pause` (default) — stop and ask: retry, skip, or abort
   - `skip` — mark as skipped, continue to next step
   - `retry` — re-invoke the step (max 1 retry)
   - `abort` — stop the entire arc


### Phase 6: Report

After completion (or abort), generate a summary:

```
Arc: feature-flow — COMPLETED
Duration: 12m 34s
Steps: 8/9 done, 1 gate

  1. ✅ create-branch     (5s)   → branch: feature/42-add-rate-limiting
  2. ✅ plan              (45s)  → plan: docs/implementation-plan.md
  3. 🔒 review-plan       (user approved)
  4. ✅ write-tests       (1m 12s)
  5. ✅ implement         (2m 48s)
  6. ✅ review            (1m 05s)
  7. ✅ lint-and-test     (18s)
  8. ✅ commit            (12s)  → commit: abc1234
  9. ✅ create-pr         (15s)  → PR: #43
```

## Arc File Format

Arc files use YAML with `${{` expressions (GitHub Actions-style).
See `references/file-format.md` for the complete schema.

### Minimal Example

```yaml
name: quick-fix
description: Quick fix cycle — implement, test, commit.

steps:
  - id: implement
    description: Implement the fix

  - id: test
    run: npm test
    description: Run the test suite

  - id: commit
    skill: git-commit
    description: Commit with conventional message
```

### Full Example with Parameters and Context

```yaml
name: feature-flow
description: End-to-end feature implementation from issue to PR.

params:
  issue_id:
    description: Issue or work item ID
    type: string
    required: true
  branch_prefix:
    description: Branch naming prefix
    type: string
    default: feature

steps:
  - id: create-branch
    run: git checkout -b ${{ params.branch_prefix }}/${{ params.issue_id }}
    description: Create a feature branch
    outputs:
      - branch_name

  - id: plan
    skill: create-implementation-plan
    description: Generate implementation plan
    outputs:
      - plan_file

  - id: review-plan
    gate: true
    description: Review the implementation plan before proceeding

  - id: write-tests
    skill: breakdown-test
    description: Write failing tests for the first step
    with:
      plan_file: ${{ steps.plan.outputs.plan_file }}

  - id: implement
    description: Make failing tests pass

  - id: review
    skill: doublecheck
    description: Review changes for quality

  - id: lint-and-test
    run: npm run lint && npm test
    description: Verify lint and tests pass

  - id: commit
    skill: git-commit
    description: Commit changes

  - id: create-pr
    run: gh pr create --fill --base main
    description: Create a pull request
    outputs:
      - pr_url
```

## Context Object

A structured state map flows between steps, accumulating outputs:

```json
{
  "params": { "issue_id": "42" },
  "steps": {
    "create-branch": {
      "status": "done",
      "outputs": { "branch_name": "feature/42-add-rate-limiting" }
    },
    "plan": {
      "status": "done",
      "outputs": { "plan_file": "docs/implementation-plan.md" }
    }
  }
}
```

See `references/expression-syntax.md` for the full expression reference.

## SQL State Tracking

Track arc execution in the session database:

```sql
-- Create tables (auto-created on first arc run)
CREATE TABLE IF NOT EXISTS arc_runs (
    id TEXT PRIMARY KEY,
    arc_name TEXT NOT NULL,
    arc_file TEXT,
    params TEXT,
    status TEXT DEFAULT 'pending',
    current_step TEXT,
    context TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Auto-update updated_at on every state change
CREATE TRIGGER IF NOT EXISTS update_arc_runs_timestamp
AFTER UPDATE ON arc_runs
FOR EACH ROW
BEGIN
    UPDATE arc_runs SET updated_at = datetime('now')
    WHERE id = NEW.id;
END;

CREATE TABLE IF NOT EXISTS arc_steps (
    run_id TEXT NOT NULL,
    step_id TEXT NOT NULL,
    step_index INTEGER NOT NULL,
    skill TEXT,
    status TEXT DEFAULT 'pending',
    started_at TEXT,
    completed_at TEXT,
    outputs TEXT,
    error TEXT,
    PRIMARY KEY (run_id, step_id),
    FOREIGN KEY (run_id) REFERENCES arc_runs(id)
);
```

Query progress at any time:
```sql
SELECT step_id, status, skill FROM arc_steps
WHERE run_id = '<current-run-id>' ORDER BY step_index;
```

## Ad-hoc Arc Generation

When no `.arc.yml` is specified, generate a trace from the user's prompt:

1. Parse the prompt for skill references (`/git-commit`, `/doublecheck`, etc.)
2. Identify the development task type (feature, bugfix, refactor)
3. Generate a step sequence using a standard development workflow:
   - Plan: `create-implementation-plan` → gate for review
   - Build: `breakdown-test` → implement → `doublecheck`
   - Verify: `run: <lint>` → `run: <test>`
   - Ship: `git-commit` → `run: gh pr create`
4. Present the generated trace for review (same approve/edit/abort flow)

> **Note**: The skill names above are examples of a typical development
> workflow. Replace them with whatever skills are installed in your project.
> The arc skill discovers available skills at runtime and gracefully skips
> any that are not installed.


## Error Handling

| Scenario | Behavior |
|----------|----------|
| Skill not installed | Step marked ⚠️ SKIP during trace generation |
| Step fails at runtime | Pause (default), offer retry/skip/abort |
| `${{` expression resolves to null | Warn during trace generation; step that uses it should handle gracefully |
| User aborts mid-arc | State preserved in SQL; report shows completed steps |
| Arc file has syntax errors | Fail at parse time with clear error message |
| Required param missing | Ask user before generating trace |


## Crash Recovery and Cleanup

Arc state lives in the session SQL database, which is **ephemeral** — it
disappears when the Copilot CLI session ends (normally or via crash). This
means stale "running" state is not a concern; it simply vanishes.

However, **side effects persist** after a crash or abort:

| Side effect | Created by | Persists after crash? |
|-------------|-----------|----------------------|
| Git branches | `run: git checkout -b` | ✅ Yes — on disk |
| Files (plans, tests) | skill steps | ✅ Yes — on disk |
| Commits | `git-commit` | ✅ Yes — in git history |
| Draft PRs | `run: gh pr create` | ✅ Yes — in remote |
| SQL arc state | arc skill | ❌ No — lost with session |

### Current behavior (v1)

If an arc crashes or the user aborts mid-execution:

1. The completion report shows which steps finished and which are pending
2. Git working tree may have uncommitted changes from the in-progress step
3. Branches and PRs from completed steps remain
4. The user must manually assess the state: `git status`, `git branch`, etc.

### Recommended recovery steps

After a crashed or abandoned arc:

```
git status                    # Check for uncommitted changes
git stash                     # Stash partial work if needed
git branch --list 'feature/*' # Find branches created during the arc
```


## Inspecting Arcs

List available arcs without executing:

```
> /arc list

Available arcs:
  feature-flow    End-to-end feature implementation from issue to PR
  bugfix-flow     Test-first bug fix with PR creation
  quick-fix       Quick fix cycle — implement, test, commit

Source: .github/arcs/
```

Show arc details:

```
> /arc inspect feature-flow

feature-flow: End-to-end feature implementation from issue to PR
  Params: issue_id (required), branch_prefix (default: "feature")
  Steps: 9 (1 gate)
  Skills used: create-implementation-plan, breakdown-test, doublecheck, git-commit
  Commands: git checkout, npm run lint, npm test, gh pr create
```


## Checklist

- [ ] Arc file parsed and validated (no syntax errors)
- [ ] All required parameters bound (asked user for missing values)
- [ ] Trace generated with correct status indicators (✅, ⚠️, 🔒)
- [ ] User reviewed and approved the trace before execution
- [ ] Steps executed sequentially with context flowing between them
- [ ] Gate steps paused for user approval
- [ ] Failed steps offered retry/skip/abort options
- [ ] Arc state tracked in session SQL database
- [ ] Completion report generated with step statuses and outputs
- [ ] Missing skills degraded gracefully (skip with warning)
