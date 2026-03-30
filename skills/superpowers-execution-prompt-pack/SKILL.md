---
name: superpowers-execution-prompt-pack
description: Use when you need consistent prompt templates for plan execution. Provides reusable templates for task implementer, spec reviewer, and code quality reviewer handoffs.
---

# Superpowers Execution Prompt Pack

## Goal

Provide consistent, reusable prompts for execution and review loops.

## Templates

1. `./templates/implementer.md`
- Use to dispatch implementation work for one task.
- Includes expected output contract and verification requirements.

2. `./templates/spec-reviewer.md`
- Use for requirement compliance review.
- Verifies missing or extra work against task requirements.

3. `./templates/quality-reviewer.md`
- Use for code quality review after spec compliance passes.
- Classifies findings by severity.

## Usage Pattern

1. Choose task from approved plan.
2. Fill implementer template with exact task text.
3. Run spec review template against resulting changes.
4. Run quality review template.
5. Iterate until no Critical or Important findings remain.
