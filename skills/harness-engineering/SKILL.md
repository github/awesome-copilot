---
name: harness-engineering
description: 'Adopt repository-level harness engineering for coding agents. Use when a user wants to prevent repeated AI coding-agent mistakes by turning failures into durable instructions, drift checks, regression tests, failure memory, and adoption reports tailored to the target repository.'
---

# Harness Engineering

Harness engineering turns repeated coding-agent mistakes into durable
repository artifacts:

```text
Harness = Instructions + Constraints + Feedback + Memory + Evaluation + Governance
```

Use this skill when the user asks to:

- make a repository more reliable for GitHub Copilot or other coding agents
- add durable agent instructions, repository rules, or guardrails
- prevent repeated AI coding-agent mistakes
- record known failure paths and the checks that prevent recurrence
- add lightweight drift checks for project rules
- review, refresh, or update an existing agent harness

Do not use this skill for ordinary feature implementation unless the user asks
to improve the repository's agent operating environment.

## Core Principles

- Treat the target repository as the source of truth.
- Inspect before editing. Preserve the existing stack, package manager, CI,
  docs, naming, and architecture.
- Add the smallest useful harness. Prefer updating existing files over adding
  duplicate guidance.
- Make important rules enforceable where practical through tests, linters,
  type checks, CI, pre-commit hooks, or drift scripts.
- Use manual review points only when automation would be brittle or misleading.
- Record high-risk failures that should not recur, and name the check or review
  point that catches recurrence.
- Do not copy generic templates blindly. Adapt every artifact to real evidence
  in the target repository.

## Discovery

Before proposing or making harness changes, inspect the repository for existing
rules and evidence.

Read these files and folders when they exist:

- `README.md`
- `AGENTS.md`
- `.github/copilot-instructions.md`
- `.github/instructions/`
- `.github/workflows/`
- `CONTRIBUTING.md`
- package manifests such as `package.json`, `pyproject.toml`, `go.mod`,
  `Cargo.toml`, `pom.xml`, or `build.gradle`
- existing docs under `docs/`
- existing scripts under `scripts/`
- existing tests and CI checks

Then summarize:

- stack, package manager, and entry points
- existing development and verification commands
- current agent instructions or repository conventions
- known failures, incidents, flaky paths, or repeated review comments
- gaps where project rules are not enforced

## Adoption Workflow

Follow this sequence:

1. Choose the harness surface that fits the target repository.
2. Write target-specific agent instructions.
3. Add enforceable checks for high-value rules.
4. Record failure memory for high-risk or recurring failures.
5. Add drift checks for guidance that can silently become stale.
6. Report the adoption with evidence, assumptions, and follow-up.

### 1. Choose the Harness Surface

Pick only the surfaces that fit the target repository:

| Need | Preferred artifact |
| --- | --- |
| Always-on agent behavior | `AGENTS.md` or `.github/copilot-instructions.md` |
| File-scoped guidance | `.github/instructions/*.instructions.md` |
| Recurring project checks | `scripts/check_*.py`, shell scripts, or package scripts |
| CI enforcement | existing workflow files or a small new workflow |
| Known failures | `docs/failures/*.md` |
| Architecture or process decisions | `docs/decisions/*.md` |
| Adoption evidence | `docs/harness/adoption-report.md` or similar |

If the repository already has an equivalent location, update it instead of
creating a parallel system.

### 2. Write Agent Instructions

Agent instructions should be concrete and operational. Include:

- project purpose and major ownership boundaries
- setup, test, lint, build, and verification commands
- package manager and dependency rules
- safe editing rules, generated file rules, and forbidden paths
- testing expectations for changed code
- PR and commit conventions if the repo has them
- how to record new failures or decisions

Avoid broad personality guidance, generic best practices, and rules that cannot
be checked or reviewed.

### 3. Add Enforceable Checks

Convert high-value rules into checks. Good harness checks are:

- narrow enough to avoid false positives
- fast enough to run locally and in CI
- named clearly so agents can run them before finishing
- documented with the rule they protect

Examples:

```text
Rule: Do not edit generated API clients.
Check: script scans diffs for generated paths and fails with a clear message.

Rule: Every failure memory note names a regression check.
Check: script validates docs/failures/*.md for a "Detection" section.

Rule: Profile docs and templates must stay aligned.
Check: test compares profile README files to expected template files.
```

### 4. Record Failure Memory

Record failures when they are user-visible, high-risk, or likely to recur.
Use a new file under `docs/failures/` unless an existing note already covers
the same root cause.

Recommended structure:

```markdown
# Short Failure Title

## Summary

What failed, who saw it, and why it matters.

## Root Cause

The technical or process cause. Avoid blame.

## Prevention

Instruction, test, drift check, CI gate, fixture, or manual review point that
prevents or detects recurrence.

## Evidence

Links to issue, PR, test, log, command output, or file paths.
```

If no automated check is practical, record the manual review point and why
automation would be unsafe or misleading.

### 5. Add Drift Checks

Use drift checks for guidance that can silently become stale. Common examples:

- docs mention commands that no longer exist
- profile snippets and generated examples diverge
- failure notes omit regression checks
- decision records are missing for structural changes
- CI references stale scripts or package commands

Prefer small scripts using the repository's existing language. If the repo has
no scripting convention, Python with only the standard library is a portable
default.

### 6. Report the Adoption

Finish substantial harness work with an adoption report that includes:

- files changed
- rules added or updated
- checks added or reused
- commands run and results
- assumptions and manual follow-up
- failure memory created or intentionally skipped
- how effectiveness will be measured

## Review Workflow

When asked to review a harness change, take an opposing perspective. Look for:

- generic rules copied without evidence from the target repository
- duplicate or conflicting instruction files
- broad checks that are likely to fail on valid changes
- unenforced high-risk rules
- missing failure memory for repeated mistakes or runtime failures
- generated docs not refreshed after source changes
- CI gates that do not run the relevant checks
- target repository conventions being overwritten by harness defaults

Report findings first, ordered by severity, with file and line references when
available. Do not modify files during a review unless the user explicitly asks
for fixes.

## Output Contract

Before finishing harness adoption work, verify:

- the target repository was inspected before edits
- new guidance is specific to the target repository
- changed checks can be run locally or have a documented manual substitute
- failure memory was recorded when required, or the final response explains why
  it was skipped
- generated docs or indexes are refreshed
- the final report names every command run and its result

## Optional Reference

The prompt-first workflow in
`https://github.com/baskduf/harness-starter-kit` is a reference implementation
of these ideas. Use it as reference material only when the user asks for it or
when the repository already includes it. The target repository remains the
source of truth.
