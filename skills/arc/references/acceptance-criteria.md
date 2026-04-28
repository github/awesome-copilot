
# Acceptance Criteria — Arc Skill

## AC-1: Arc file parsing and validation

The skill must parse `.arc.yml` files and catch errors at parse time.

### Correct

```yaml
# Valid arc file with required fields
name: feature-flow
description: End-to-end feature implementation.

steps:
  - id: implement
    description: Implement the feature

  - id: test
    run: npm test
    description: Run test suite
```

```
✅ Parsed: feature-flow (2 steps, 0 gates, 0 params)
```

### Incorrect

```yaml
# Missing required 'name' field
description: An arc without a name.

steps:
  - id: implement
    description: Implement
```

```
❌ Parse error: arc file must have a 'name' field
```

```yaml
# Duplicate step IDs
name: bad-arc
steps:
  - id: build
    description: Build
  - id: build
    description: Also build
```

```
❌ Parse error: duplicate step id 'build'
```

---

## AC-2: Parameter binding and resolution

Required parameters must be resolved before execution. Missing required params
trigger a user prompt; defaults fill in optional params automatically.

### Correct

```yaml
params:
  issue_id:
    type: string
    required: true
  branch_prefix:
    type: string
    default: feature

steps:
  - id: init
    run: git checkout -b ${{ params.branch_prefix }}/${{ params.issue_id }}
    description: Create feature branch
```

```
> /arc run feature-flow --issue_id 1234

Params resolved:
  issue_id = "1234" (from prompt)
  branch_prefix = "feature" (default)
```

### Incorrect

```
> /arc run feature-flow

❌ Missing required parameter: issue_id
   Description: Issue or work item ID
   Please provide a value:
```

The skill must NOT proceed with unresolved required parameters. It must
ask the user for missing values before generating the trace.

---

## AC-3: Trace generation with status indicators

The generated trace must clearly show which steps will run, skip, or gate.

### Correct

```
Arc: feature-flow
Params: issue_id = "1234"

Steps:
  1. ✅ [run]                   Create feature branch
  2. ✅ [create-implementation-plan]  Generate implementation plan
  3. 🔒 [GATE]                  Review plan before proceeding
  4. ⚠️ [breakdown-test]        Write failing tests — skill not available, will SKIP
  5. ✅ [run]                    Run tests
  6. ✅ [git-commit]             Commit changes

⚠️ 1 step will be skipped (missing skills)
Approve and execute? [Y/n/edit]
```

### Incorrect

```
Running feature-flow...
Step 1: create branch... done
Step 2: plan... done
Step 3: breakdown-test... ERROR: skill not found
Arc failed.
```

The skill must NEVER fail at runtime due to a missing skill. Missing skills
are detected during trace generation and marked as skipped.

---

## AC-4: Gate steps pause for user approval

Steps marked `gate: true` must always pause and wait for user input.

### Correct

```yaml
steps:
  - id: plan
    skill: create-implementation-plan
    description: Generate plan

  - id: review
    gate: true
    description: Review the plan before implementing

  - id: implement
    description: Implement the plan
```

```
Step 2/3: 🔒 GATE — Review the plan before implementing
The implementation plan has been generated.
Continue to implementation? [Y/n/abort]
```

### Incorrect

```
Step 1: plan... done
Step 2: review gate... auto-approved
Step 3: implement... done
```

Gate steps must NEVER be auto-approved. They always require explicit user
confirmation to continue.

---

## AC-5: Context flows between steps via expressions

Step outputs must be accessible to subsequent steps via `${{ }}` expressions.

### Correct

```yaml
steps:
  - id: create-branch
    run: git checkout -b feature/new-feature
    description: Create feature branch
    outputs:
      - branch_name

  - id: plan
    skill: create-implementation-plan
    description: Plan for the current branch
    with:
      branch: ${{ steps.create-branch.outputs.branch_name }}
```

The `branch` parameter passed to `create-implementation-plan` resolves to the actual branch
name created in the previous step (e.g., `feature/1234/add-rate-limiting`).

### Incorrect

```yaml
steps:
  - id: plan
    skill: create-implementation-plan
    description: Plan for the current branch
    with:
      branch: ${{ steps.nonexistent.outputs.branch_name }}
```

```
⚠️ Warning: expression references undefined step 'nonexistent'
   ${{ steps.nonexistent.outputs.branch_name }} will resolve to null
```

Broken expressions must be caught during trace generation, not at runtime.

---

## AC-6: Failure handling respects on_failure policy

Each step's `on_failure` setting determines behavior when it fails.

### Correct

```yaml
steps:
  - id: lint
    run: npm run lint
    description: Lint check
    on_failure: skip

  - id: commit
    skill: git-commit
    description: Commit changes
    # on_failure defaults to 'pause'
```

```
Step 1: lint... FAILED (exit code 1)
  on_failure: skip — continuing to next step

Step 2: git-commit...
  🔄 FAILED — git-commit returned an error
  [R]etry / [S]kip / [A]bort?
```

### Incorrect

```
Step 1: lint... FAILED
Arc aborted.
```

The default `on_failure` is `pause` (not `abort`). The arc must
offer the user a choice on failure unless explicitly configured otherwise.

---

## AC-7: SQL state tracking is accurate

Arc runs and step statuses must be tracked in the session database.

### Correct

```sql
-- After step 3 completes in a 5-step arc:
SELECT step_id, status FROM arc_steps WHERE run_id = 'abc-123';

-- Returns:
-- init-stack  | done
-- plan        | done
-- review      | done
-- write-tests | running
-- commit      | pending
```

### Incorrect

```sql
-- No records found — arc ran without tracking
SELECT * FROM arc_runs;
-- (empty)
```

Every arc execution must create records in `arc_runs` and
`arc_steps`. State must be updated in real time as steps complete.

---

## AC-8: Graceful degradation for missing skills

Arcs must run successfully even when some referenced skills are not
installed, by skipping unavailable steps.

### Correct

```
Arc: feature-flow (2 of 5 skills unavailable)

Steps:
  1. ✅ [run]                   Create feature branch
  2. ⚠️ [create-implementation-plan]  SKIP — skill not available
  3. ✅ [breakdown-test]        Write failing tests
  4. ⚠️ [doublecheck]           SKIP — skill not available
  5. ✅ [git-commit]            Commit changes

⚠️ 2 steps will be skipped. Continue? [Y/n]
```

### Incorrect

```
ERROR: skill 'create-implementation-plan' is not installed. Arc cannot run.
```

The arc must NEVER hard-fail because a skill is missing. Missing skills
are skipped with a warning. The user sees which steps will be skipped during
trace review and can decide whether to proceed.
