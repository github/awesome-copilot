---
name: superpowers-planning-gate
description: Use when a feature or fix is requested and implementation has not started yet. Build a concise approved plan with explicit files, tests, and acceptance criteria before coding.
---

# Superpowers Planning Gate

## Goal

Create a lightweight, reviewable plan that prevents premature coding.

## Required Output

1. Problem summary in 3-6 bullet points.
2. Constraints and assumptions.
3. Implementation plan with numbered tasks, each including:
- Exact file paths to edit.
- Test changes required.
- Verification command.
4. Acceptance criteria.
5. Risks and rollback note.

## Rules

- Ask clarifying questions if requirements are ambiguous.
- Do not start implementation in the same step unless explicitly approved.
- Keep tasks small enough to complete in minutes, not hours.
- Prefer existing project patterns over new abstractions.

## Completion Gate

Plan is approved only when acceptance criteria and verification commands are present.
