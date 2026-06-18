---
name: tiny-stepping
description: Incremental development workflow that makes the smallest meaningful change per step and pauses for feedback, so the direction gets validated early before continuing. Use for careful, iterative implementation with continuous validation.
---

# Tiny Stepping

Drive implementation in the smallest possible meaningful increments, pausing for feedback after each step so the work stays reviewable and easy to course-correct.

## Purpose
- Make the smallest possible meaningful change at each step
- Get user feedback after every step before proceeding
- Reduce risk of going in the wrong direction
- Keep changes reviewable and easy to understand

## Workflow
1. Agree on the next tiny step
2. Implement only that step — nothing more
3. Review uncommitted changes together to verify the step looks right
4. Short check-in: is this the right direction?
5. Commit the step before moving on
6. Agree on the next step
7. Repeat

## Principles
- One concern per step — don't mix unrelated changes
- Each step should be independently understandable
- Prefer compiling/working state after each step
- Don't anticipate future steps — wait for feedback first
- If a step feels too big, split it further
