
# Expression Syntax Reference

## Overview

Arc expressions use `${{ }}` delimiters to reference parameters, step
outputs, and step statuses. The syntax is intentionally aligned with GitHub
Actions expressions to lower the learning curve.

## Expression Format

```
${{ <namespace>.<path> }}
```

Expressions are resolved:
- **At trace generation time** for `params.*` references
- **At execution time** for `steps.*` references (since outputs aren't known upfront)

## Namespaces

### params

Access arc parameters:

```yaml
${{ params.issue_id }}       # → "1234"
${{ params.branch_prefix }}  # → "feature"
```

### steps

Access step outputs and status:

```yaml
${{ steps.create-branch.outputs.branch_name }}  # → "feature/42-add-rate-limiting"
${{ steps.create-branch.status }}                # → "done"
${{ steps.plan.outputs.plan_file }}              # → "docs/implementation-plan.md"
```

## Available Properties

### Step properties

| Expression | Type | Description |
|-----------|------|-------------|
| `steps.<id>.status` | string | `pending`, `running`, `done`, `skipped`, `failed` |
| `steps.<id>.outputs.<key>` | any | Output value set by the step |

### Param properties

| Expression | Type | Description |
|-----------|------|-------------|
| `params.<name>` | any | Bound parameter value |

<!-- v2: Add `env.<name>` for environment variable access -->
<!-- v2: Add `arc.name`, `arc.run_id` for metadata access -->
<!-- v2: Add `github.branch`, `github.repo` for git context -->

## Resolution Rules

1. **Params** resolve to their bound value (from user prompt or default)
2. **Step outputs** resolve to the value set during execution
3. **Undefined references** resolve to `null` with a warning
4. **Skipped step outputs** resolve to `null` (the step never ran)

## Usage in Steps

### In `with:` parameters

```yaml
- id: plan
  skill: create-implementation-plan
  with:
    branch: ${{ steps.create-branch.outputs.branch_name }}
    issue: ${{ params.issue_id }}
```

### In `if:` conditions

```yaml
- id: security-check
  skill: security-check
  if: ${{ steps.implement.status == 'done' }}
```

### In `template:` output

```yaml
- id: summary
  template: |
    Branch: ${{ steps.create-branch.outputs.branch_name }}
    PR: ${{ steps.create-pr.outputs.pr_url }}
```

## Comparison Operators (in `if:` conditions)

| Operator | Example | Description |
|----------|---------|-------------|
| `==` | `${{ steps.x.status == 'done' }}` | Equality check |
| `!=` | `${{ steps.x.status != 'failed' }}` | Inequality check |

<!-- v2: Support `&&`, `||`, `!` for boolean logic -->
<!-- v2: Support `contains()`, `startsWith()` functions -->
<!-- v2: Support numeric comparisons: >, <, >=, <= -->

## Error Handling

| Scenario | Behavior |
|----------|----------|
| `${{ params.undefined_param }}` | Warning at trace generation time |
| `${{ steps.nonexistent.outputs.x }}` | Warning at trace generation time |
| `${{ steps.skipped-step.outputs.x }}` | Resolves to `null` at execution time |
| Malformed expression (missing `}}`) | Parse error at trace generation time |
| Self-referencing expression | Parse error (step cannot reference its own outputs) |

## Examples

### Basic parameter passing

```yaml
params:
  issue_id:
    type: string
    required: true

steps:
  - id: create-branch
    run: git checkout -b feature/${{ params.issue_id }}
    description: Create a feature branch
```

### Chaining step outputs

```yaml
steps:
  - id: create-branch
    run: git checkout -b feature/new-feature
    description: Create a branch
    outputs:
      - branch_name

  - id: plan
    skill: create-implementation-plan
    with:
      branch: ${{ steps.create-branch.outputs.branch_name }}
    outputs:
      - plan_file

  - id: tests
    skill: breakdown-test
    with:
      plan: ${{ steps.plan.outputs.plan_file }}
```

### Conditional execution

```yaml
steps:
  - id: implement
    description: Implement the feature

  - id: review
    skill: doublecheck
    if: ${{ steps.implement.status == 'done' }}
    description: Only run review if implementation succeeded
```

### Summary template

```yaml
steps:
  - id: report
    description: Final report
    template: |
      ## Arc Complete
      - Issue: ${{ params.issue_id }}
      - Branch: ${{ steps.create-branch.outputs.branch_name }}
      - Tests: ${{ steps.test.status }}
      - PR: ${{ steps.create-pr.outputs.pr_url }}
```
