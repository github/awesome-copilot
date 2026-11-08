---
name: implementation-plan-review
description: 'Review a coding agent''s implementation plan before it edits any code. Use when a plan, task breakdown, or set of proposed file changes is about to be executed and you want a second opinion first — "review this plan", "is this plan safe", "check the plan before you start", "will this break anything", "sanity-check these steps", "what am I missing before this runs". Catches plans that assume code that does not exist, violate stated constraints, delete working behaviour, ship without tests or rollback, or hide assumptions behind "should be fine". Produces a diagnosis plus a retake note the user pastes back so the agent revises its plan before touching the repository.'
---

# Implementation Plan Review

A plan is a prediction about a codebase. Most bad plans are not obviously wrong — they are
plausible sentences that happen to be false, or true sentences that leave something out.
This skill reads the plan against the repository and returns what will actually break,
plus an instruction block that makes the agent fix its plan **before** it edits anything.

It does not write the code. The agent that will execute the plan has to revise the plan
itself, or the revision will not survive contact with its own context.

## When to use this

Use it when a plan already exists and nothing has been written yet:

- a plan, task list, or "here is what I will do" message is on screen
- an agent is about to make a multi-file change
- before a migration, dependency upgrade, refactor, or API change
- when someone asks "does this approach look right" about steps, not about code

Do not use it to review finished code (that is a code review), to invent a plan from
scratch, or to answer a question about the codebase.

## Inputs

Ask for what is missing, but at most once per turn:

1. **Requirement** — what the user actually asked for, in their words.
2. **Plan** — the steps, the files it intends to touch, the commands it intends to run.
3. **Repository** — the real files. Read them. A plan cannot be judged from the plan alone.

If there is no file list, say so and treat every unlisted file as unknown scope.
If the requirement is missing, stop: you cannot tell whether the plan is in scope.

## The six checks

Run them in this order. When two apply to the same line, keep the earlier one and move on.

### 1. Assumed reality

The plan refers to files, symbols, APIs, config keys, or schemas that do not exist, or that
exist with a different shape.

Verify by opening the file. A plan that says "update `parse_config` in `src/config.py`" is
wrong if there is no `parse_config`, or if it takes different arguments. This is the most
common failure and the cheapest to prove.

### 2. Violated constraints

The plan does something the user ruled out, or that the repository's own rules forbid:
touching a file marked do-not-edit, changing a public signature, dropping backwards
compatibility, upgrading a major version, renaming a published path.

Quote the constraint and the plan line that breaks it.

### 3. Regression and scope creep

The plan deletes, rewrites, or "cleans up" behaviour that currently works and was not asked
about. Typical shapes: a refactor that also changes formatting across the repo, a rewrite
of a module that only needed one branch changed, a rename that touches every import.

Ask the plan: what does this step buy, and what did it cost? If the step is not required by
the requirement, it is risk without a reason.

### 4. Missing coverage

The plan has no answer for at least one of:

- **verification** — how will we know it worked? (a test, a command, an assertion)
- **rollback** — how do we get back if it goes wrong?
- **data** — migration, backfill, or compatibility for stored state
- **error paths** — what happens on failure, timeout, empty input, permission denied
- **docs and callers** — who else uses this, and do they get updated

A plan with no verification step cannot be approved, no matter how good the rest is.

### 5. Reasoning defects in the plan's justification

The plan explains why it will work. Judge that explanation, not just the steps:

- **self-clearance** — "this should be fine", "no need to test this part", after noticing a gap
- **unsupported claim** — "the helper already handles retries" with nothing to show it
- **circular standard** — "it works this way today, so this is the spec", when today's
  behaviour may be the bug
- **false precision** — "performance will be fine", "about 100ms", with no basis

Rewrite each as: what would have to be true, and is it?

### 6. Blast radius and reversibility

Across the whole plan, before judging individual steps:

- how many files, and are any of them shared or generated
- does it touch a public API, CLI flag, config format, or database schema
- can it be split into a safe half and a risky half
- after step N, is the tree still in a working state, or is there a long broken window

Bigger radius means the plan needs smaller steps and stronger verification, not more
confidence.

## Output

Two parts, in this order.

### Part 1 — Diagnosis

At most twelve bullets. One or two lines each. Every bullet carries evidence:

```
**<what is wrong>** — `<file:line>` or `<plan step>`
Evidence: <what the file actually contains>
Impact: <what happens when the plan runs>
Fix: <the smallest change to the plan that removes the risk>
```

Order by severity: data loss and security first, then correctness, then coverage, then size.
Do not pad. If a check found nothing, say nothing about it.

### Part 2 — Retake note

A single fenced block the user pastes back to the agent. Use this shape:

```text
Re-plan before editing. Do not start implementing until you have posted the revised plan.

Scope lock
- Only these files may change: <explicit list>
- Everything else: read only.

Must not change
- <existing behaviour, signature, output format, test that must keep passing>

Required additions to the plan
- Verification: <the command or test that proves it worked>
- Rollback: <how to undo, or why nothing needs undoing>
- <missing coverage item>
- <missing coverage item>

Acceptance criteria
Write 6-10 Yes/No questions for this change before you re-plan, one per line:
- Does <specific observable condition> hold?
- Is <specific existing behaviour> unchanged?
Each criterion must be answerable by reading the diff or running one command.

Checks to run before you touch a file
- [ ] Every file in the plan exists, and the symbol named in each step exists in it
- [ ] No file outside the scope list is modified
- [ ] The verification step is listed, and it can fail
- [ ] The plan stays in a working state after every step
```

Write the retake note in the user's language if the conversation is not in English.
Keep it under about 40 lines; longer notes get skimmed.

## Rules

- **Never write the fix yourself.** Name the correction; the executing agent owns the plan.
- **A plan without verification is rejected.** There is no exception for "trivial" changes.
- **Cite, do not opine.** `src/api.py:44` or a quoted plan line, not "this feels risky".
- **One question maximum** if the requirement or scope is genuinely missing.
- **If the plan holds**, say so in two lines and name the two assumptions most likely to be
  wrong, so the agent can check them first.

## Self-check before delivering

1. Every finding cites a file, line, or quoted plan step.
2. At least one finding is about verification or rollback, or you explicitly cleared both.
3. Findings are ordered by severity, not by the order of the plan.
4. At most twelve findings.
5. The retake note has a scope lock and at least one falsifiable acceptance criterion.
6. No finding says "consider" or "might want to".
7. The diagnosis does not repeat the plan back to the user.
8. If you did not open a file the plan depends on, you did not judge that step.

## Anti-patterns

- **Rubber stamping.** "Looks reasonable, just add tests" helps nobody. Name the failure.
- **Rewriting the plan** into a design the user did not ask for. Review, do not design.
- **Judging intent.** The plan's tone is irrelevant; only its claims about the repository matter.
- **Inflation.** Twenty findings on a forty-line plan means you are reviewing style, not risk.

## References

- `references/plan-defect-taxonomy.md` — the failure shapes, with real plan sentences and
  what each one hides
- `references/acceptance-criteria.md` — how to write criteria that can actually fail
