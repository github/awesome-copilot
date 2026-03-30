---
name: superpowers-execution-gate
description: Use when an approved implementation plan exists. Execute tasks in order, keep scope tight, and report progress with concrete evidence after each task.
---

# Superpowers Execution Gate

## Goal

Implement only what the approved plan requires.

## Required Process

1. Restate the current task objective and expected outcome.
2. Make the smallest viable code change.
3. Add or update tests before broad refactors.
4. Run verification for the current task.
5. Report files changed and command results.

## Rules

- Do not silently add out-of-scope features.
- If requirements conflict with code reality, stop and request plan update.
- Keep each task independently verifiable.
- If uncertain, mark the task as blocked with a concrete question.

## Completion Gate

Task is complete only when verification output matches task acceptance criteria.
