
# Arc File Format Reference

## Overview

Arc files define reusable, parameterized templates for multi-skill
development tasks. They use YAML syntax with `${{ }}` expressions (inspired
by GitHub Actions) and live in `.github/arcs/*.arc.yml`.

## File Location

```
.github/arcs/
├── feature-flow.arc.yml
├── bugfix-flow.arc.yml
└── quick-fix.arc.yml
```

The `/arc` skill searches `.github/arcs/` for `*.arc.yml` files.

<!-- v2: Support ~/.copilot/arcs/ for user-global arcs -->
<!-- v2: Support arc discovery from multiple directories -->

## Top-Level Schema

```yaml
# Required fields
name: string              # Unique arc name (kebab-case)
description: string       # Human-readable description shown during review

# Optional fields
params: map               # Parameters bound at runtime (see Params section)
steps: list               # Ordered list of steps (see Steps section)
```

## Params

Parameters make arcs reusable. They are bound from the user's prompt,
defaults, or interactive prompts.

```yaml
params:
  issue_id:
    description: string   # Shown when asking user for value
    type: string          # string | number | boolean
    required: true        # If true, must be provided before execution
  branch_prefix:
    description: string
    type: string
    default: feature      # Used if not provided by user
```

### Type validation

| Type | Accepts | Example |
|------|---------|---------|
| `string` | Any text | `"1234"`, `"feature"` |
| `number` | Integer or float | `42`, `3.14` |
| `boolean` | true/false | `true`, `false` |

<!-- v2: Support `array` type for list parameters -->
<!-- v2: Support `enum` type for constrained choices -->

## Steps

Steps are the core of an arc. Each step invokes a skill, runs a command,
or acts as a gate.

### Step Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | **Yes** | Unique kebab-case identifier |
| `description` | string | **Yes** | Shown during review and execution |
| `skill` | string | No | Skill to invoke (mutually exclusive with `run`) |
| `run` | string | No | Shell command to execute (mutually exclusive with `skill`) |
| `with` | map | No | Parameters passed to the skill, supports `${{ }}` |
| `outputs` | list[string] | No | Keys this step writes to the context |
| `gate` | boolean | No | If true, pause for user approval |
| `if` | string | No | Condition — step skipped if false |
| `on_failure` | string | No | `pause` (default), `skip`, `retry`, `abort` |
| `template` | string | No | Output template rendered at completion |

### Step Types

**Skill step** — invokes an existing Copilot skill:
```yaml
- id: write-tests
  skill: breakdown-test
  description: Write failing tests
  with:
    plan_file: ${{ steps.plan.outputs.plan_file }}
```

**Command step** — runs a shell command:
```yaml
- id: lint-check
  run: npm run lint
  description: Verify no lint violations
```

**Gate step** — pauses for human review:
```yaml
- id: review-plan
  gate: true
  description: Review the implementation plan before proceeding
```

**Template step** — renders a summary (no skill or command):
```yaml
- id: summary
  description: Report what was accomplished
  template: |
    Branch: ${{ steps.init-stack.outputs.branch_name }}
    PR: ${{ steps.create-pr.outputs.pr_url }}
```

### Validation Rules

1. Every step must have `id` and `description`
2. `id` values must be unique within an arc
3. `id` must be kebab-case (lowercase, hyphens only)
4. `skill` and `run` are mutually exclusive
5. `gate` steps should not have `skill` or `run`
6. Steps execute in declaration order (top to bottom)

<!-- v2: Support `parallel: true` on a group of steps -->
<!-- v2: Support `depends_on` for DAG-based ordering -->
<!-- v2: Support nested arcs via `skill: arc` with `with: { file: ... }` -->

## on_failure Behavior

| Value | Behavior |
|-------|----------|
| `pause` | Stop and ask user: retry, skip, or abort (default) |
| `skip` | Mark step as skipped, continue to next |
| `retry` | Re-invoke the step once, then pause if still failing |
| `abort` | Stop the entire arc immediately |

<!-- v2: Support `retry` with `max_retries: N` -->

## Conditional Steps

Use `if` to conditionally skip steps:

```yaml
- id: security-check
  skill: security-check
  description: Security scan
  if: ${{ steps.implement.status == 'done' }}
```

The condition is evaluated at execution time. If it evaluates to false
or null, the step is skipped.

<!-- v2: Support complex boolean expressions (AND, OR, NOT) -->
<!-- v2: Support param-based conditions (${{ params.skip_tests == true }}) -->

## Complete Example

```yaml
name: feature-flow
description: >
  End-to-end feature implementation from issue to merged PR.
  Creates a branch, plans, implements with tests, and opens a PR.

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
    description: Generate implementation plan for the feature
    outputs:
      - plan_file
      - step_count

  - id: review-plan
    gate: true
    description: Review the implementation plan before proceeding

  - id: write-tests
    skill: breakdown-test
    description: Write failing tests for the implementation plan
    with:
      plan_file: ${{ steps.plan.outputs.plan_file }}

  - id: implement
    description: Make failing tests pass with minimal code

  - id: review
    skill: doublecheck
    description: Review changes for quality

  - id: lint-and-test
    run: npm run lint && npm test
    description: Verify lint and tests pass
    on_failure: skip

  - id: commit
    skill: git-commit
    description: Commit changes with conventional commit message

  - id: create-pr
    run: gh pr create --fill --base main
    description: Create a pull request
    outputs:
      - pr_url

  - id: summary
    description: Report what was accomplished
    template: |
      Completed: ${{ params.issue_id }}
      Branch: ${{ steps.create-branch.outputs.branch_name }}
      PR: ${{ steps.create-pr.outputs.pr_url }}
      Plan: ${{ steps.plan.outputs.plan_file }}
```
