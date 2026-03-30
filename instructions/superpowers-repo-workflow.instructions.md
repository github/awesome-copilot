---
description: 'Repository guardrails for plan-first AI-assisted development with verification and severity-based review gates'
applyTo: '**/*'
---

# Superpowers Repo Workflow Guardrails

Use this workflow for code changes in this repository:

1. Clarify and plan first.
2. Require explicit approval before implementation when scope is non-trivial.
3. Execute in small tasks with verification after each task.
4. Run code review with severity classification.
5. Do not mark complete without evidence.

## Required Plan Shape

- Problem summary
- Constraints and assumptions
- Numbered tasks with exact files to edit
- Test changes per task
- Verification command per task
- Acceptance criteria

## Required Completion Evidence

- Commands executed
- Test results summary
- Changed files summary
- Residual risk statement

## Blocking Conditions

Do not declare done when either applies:

- Any Critical issue remains.
- Any Important issue remains.

## Scope Discipline

- Avoid out-of-scope features unless explicitly approved.
- Follow existing repository patterns before introducing new abstractions.
