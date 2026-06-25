---
name: implementation-brainstorming
description: Use when brainstorming practical implementation approaches for a feature, bug fix, or product idea. Provides option generation, scoring, tradeoff analysis, first-slice planning, and validation checklists.
---

# Implementation Brainstorming

Use this skill to turn an idea into implementation options that can be compared and executed. The goal is to avoid shallow “one obvious solution” planning and instead produce a small, validated path forward.

## Brainstorming principles

1. **Diverge before converging.** Generate several options before recommending one.
2. **Prefer testable slices.** A smaller validated slice beats a complete but speculative plan.
3. **Make tradeoffs explicit.** Every option should say what it gives up.
4. **Reuse before inventing.** Existing helpers, workflows, APIs, and infrastructure should be considered before new components.
5. **Optimize for reversibility.** Favor changes that can be rolled back or replaced.

## Option generation template

Generate 5 to 8 implementation options using this mix:

| Option type | Prompt |
| --- | --- |
| Smallest change | What is the least code that solves the immediate problem? |
| Reuse existing | What existing module, workflow, platform feature, or API can absorb this? |
| Robust path | What would the production-ready architecture look like? |
| Reversible experiment | What can be shipped behind a flag, config, or narrow route? |
| No new infrastructure | How can this be done with existing runtime and storage? |
| Operationally safe | What minimizes on-call, data, security, or rollout risk? |
| Long-term platform | What creates reusable capability for later work? |

## Scoring rubric

Score each option from 1 to 5.

| Criterion | 1 | 3 | 5 |
| --- | --- | --- | --- |
| User impact | Indirect or partial | Solves core problem | Solves core problem and unlocks adjacent use |
| Confidence | Many unknowns | Some known patterns | Uses familiar, proven patterns |
| Reversibility | Hard to undo | Can be reverted with care | Easy rollback or flag disable |
| Operational risk | Adds fragile runtime path | Manageable risk | Low-risk, observable, bounded |
| Time to validate | Multi-week proof | Validatable in a sprint | Validatable in one small PR |

Use totals to guide the recommendation, but do not blindly pick the highest score if one criterion is decisive.

## First-slice checklist

The recommended first slice should answer:

- What user-visible behavior changes?
- What is deliberately out of scope?
- Which files or modules are likely to change?
- What existing tests or validation commands cover the change?
- What new test proves the behavior?
- How can it be rolled back?
- What telemetry, logs, or manual check confirms it works?

## Risk prompts

Ask these before finalizing a recommendation:

- What data could be lost, leaked, duplicated, or corrupted?
- What external service or provider dependency is introduced?
- What happens if the new path times out or partially fails?
- Does this require a migration, backfill, or long-running job?
- Does it create a new auth, permission, or secret-management surface?
- Would a feature flag, config gate, or staged rollout reduce risk?

## Recommendation template

```markdown
## Recommendation

Choose **Option N: <name>** because <reason>.

Use **Option M: <fallback>** if <specific evidence or constraint changes>.

Defer:
- <deferred item and why>

First slice:
- Change: <minimal behavior>
- Files: <likely files>
- Test: <targeted test>
- Validate: <command or manual check>
- Rollback: <how to undo>
```

## Common anti-patterns

- Recommending only one option.
- Treating a framework choice as the implementation plan.
- Ignoring rollout and rollback.
- Adding infrastructure before proving the workflow.
- Producing a roadmap with no first PR-sized slice.
- Using vague scoring without explaining decisive tradeoffs.
