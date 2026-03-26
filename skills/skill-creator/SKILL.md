---
name: skill-creator
description: Guides the agent through authoring and validating agent skills. Use when creating new skill directories, tightening skill metadata, extracting supporting references, or preparing skillgrade evals. Do not use for general app documentation, generic README editing, or non-agentic library code.
---

# Skill Authoring Procedure

Create professional-grade skills with lean context, deterministic structure, and validation.

## When to Use This Skill

- User wants to create a new skill directory
- User wants to improve a skill's discoverability or metadata
- User wants to split large instructions into references or scripts
- User wants to add or update skillgrade validation

## Procedures

### Step 1: Validate the Skill Metadata

Check that the frontmatter uses a unique lowercase name, a specific description, and clear negative triggers.

Keep the description short enough to fit within the agent router's metadata budget.

### Step 2: Keep the Main Skill Lean

Write the main `SKILL.md` as a high-level workflow.

Move dense rules, large schemas, and reusable templates into `references/` or `assets/`.

Use `scripts/` only for fragile or repetitive logic that should not be re-authored by the agent.

### Step 3: Use Progressive Disclosure

Command the agent to read supporting files only when the current step needs them.

Prefer one-level-deep support files with explicit relative paths.

### Step 4: Add Validation

Create a `skillgrade` eval when the skill needs regression testing.

Use a deterministic grader for structural checks and an LLM rubric only when qualitative judgment is necessary.

### Step 5: Review for Hallucination Gaps

Inspect the skill for any step where the agent is forced to guess.

Replace ambiguous prose with concrete commands, file names, or output expectations.

## Error Handling

- If a skill cannot be validated, reduce scope until the missing behavior becomes testable.
- If the description is too broad, tighten the trigger text before adding more instructions.
- If the supporting material grows too large, extract it into a separate file and point the agent to it explicitly.
