---
name: ruff-recursive-fix
description: Run Ruff checks with optional scope and rule overrides, apply safe and unsafe autofixes iteratively, review each change, and resolve remaining findings with targeted edits or user decisions.
---

# Ruff Recursive Fix

## Overview

Use this skill to enforce code quality with Ruff in a controlled, iterative workflow.
It supports:

- Optional scope limitation to a specific folder.
- Default project settings from `pyproject.toml`.
- Flexible Ruff invocation (`uv`, direct `ruff`, `python -m ruff`, or equivalent).
- Optional per-run rule overrides (`--select`, `--ignore`, `--extend-select`, `--extend-ignore`).
- Automatic safe then unsafe autofixes.
- Diff review after each fix pass.
- Recursive repetition until findings are resolved or require a decision.
- Judicious use of inline `# noqa` only when suppression is justified.

## Inputs

Collect these inputs before running:

- `target_path` (optional): folder or file to check. Empty means whole repository.
- `ruff_runner` (optional): explicit Ruff command prefix (for example `uv run`, `ruff`, `python -m ruff`, `pipx run ruff`).
- `rules_select` (optional): comma-separated rule codes to enforce.
- `rules_ignore` (optional): comma-separated rule codes to ignore.
- `extend_select` (optional): extra rules to add without replacing configured defaults.
- `extend_ignore` (optional): extra ignored rules without replacing configured defaults.
- `allow_unsafe_fixes` (default: true): whether to run Ruff unsafe fixes.
- `ask_on_ambiguity` (default: true): always ask the user when multiple valid choices exist.

## Command Construction

Build Ruff commands from inputs.

### 0. Resolve Ruff Runner

Determine a reusable `ruff_cmd` prefix before building commands.

Resolution order:

1. If `ruff_runner` is provided, use it as-is.
2. Else if `uv` is available and Ruff is managed through `uv`, use `uv run ruff`.
3. Else if `ruff` is available on `PATH`, use `ruff`.
4. Else if Python is available and Ruff is installed in that environment, use `python -m ruff`.
5. Else use any project-specific equivalent that invokes installed Ruff (for example `pipx run ruff`), or stop and ask the user.

Use the same resolved `ruff_cmd` for all `check` and `format` commands in the workflow.

Base command:

```bash
<ruff_cmd> check
```

Formatter command:

```bash
<ruff_cmd> format
```

With optional target:

```bash
<ruff_cmd> format <target_path>
```

Add optional target:

```bash
<ruff_cmd> check <target_path>
```

Add optional overrides as needed:

```bash
--select <codes>
--ignore <codes>
--extend-select <codes>
--extend-ignore <codes>
```

Examples:

```bash
# Full project with defaults from pyproject.toml
ruff check

# One folder with defaults
python -m ruff check src/models

# Override to skip docs and TODO-like rules for this run
uv run ruff check src --extend-ignore D,TD

# Check only selected rules in a folder
ruff check src/data --select F,E9,I
```

## Workflow

### 1. Baseline Analysis

1. Run `<ruff_cmd> check` with the selected scope and options.
2. Classify findings by type:
	- Autofixable safe.
	- Autofixable unsafe.
	- Not autofixable.
3. If no findings remain, stop.

### 2. Safe Autofix Pass

1. Run Ruff with `--fix` using the same scope/options.
2. Review resulting diff carefully for semantic correctness and style consistency.
3. Run `<ruff_cmd> format` on the same scope.
4. Re-run `<ruff_cmd> check` to refresh remaining findings.

### 3. Unsafe Autofix Pass

Run only if findings remain and `allow_unsafe_fixes=true`.

1. Run Ruff with `--fix --unsafe-fixes` using the same scope/options.
2. Review resulting diff carefully, prioritizing behavior-sensitive edits.
3. Run `<ruff_cmd> format` on the same scope.
4. Re-run `<ruff_cmd> check`.

### 4. Manual Remediation Pass

For remaining findings:

1. Fix directly in code when there is a clear, safe correction.
2. Keep edits minimal and local.
3. Run `<ruff_cmd> format` on the same scope.
4. Re-run `<ruff_cmd> check`.

### 5. Ambiguity Policy

If there are multiple valid solutions at any step, always ask the user before proceeding.
Do not choose silently between equivalent options.

### 6. Suppression Decision (`# noqa`)

Use suppression only when all conditions are true:

- The rule conflicts with required behavior, public API, framework conventions, or readability goals.
- Refactoring would be disproportionate to the value of the rule.
- The suppression is narrow and specific (single line, explicit code when possible).

Guidelines:

- Prefer `# noqa: <RULE>` over broad `# noqa`.
- Add a brief reason comment for non-obvious suppressions.
- If two or more valid outcomes exist, always ask the user which option to prefer.

### 7. Recursive Loop and Stop Criteria

Repeat steps 2 to 6 until one of these outcomes:

- `<ruff_cmd> check` returns clean.
- Remaining findings require architectural/product decisions.
- Remaining findings are intentionally suppressed with documented rationale.
- Repeated loop makes no progress.

Each loop iteration must include `<ruff_cmd> format` before the next `<ruff_cmd> check`.

When no progress is detected:

1. Summarize blocked rules and affected files.
2. Present valid options and trade-offs.
3. Ask the user to choose.

## Quality Gates

Before declaring completion:

- Ruff returns no unexpected findings for the chosen scope/options.
- All autofix diffs are reviewed for correctness.
- No suppression is added without explicit justification.
- Any unsafe fix with possible behavioral impact is highlighted to the user.
- Ruff formatting is executed in every iteration.

## Output Contract

At the end of execution, report:

- Scope and Ruff options used.
- Number of iterations performed.
- Summary of fixed findings.
- List of manual fixes.
- List of suppressions with rationale.
- Remaining findings, if any, and required user decisions.

## Suggested Prompt Starters

- "Run ruff-recursive-fix on the whole repo with default config."
- "Run ruff-recursive-fix only on src/models, ignore DOC rules."
- "Run ruff-recursive-fix on tests with select F,E9,I and no unsafe fixes."
- "Run ruff-recursive-fix on src/data and ask me before adding any noqa."
