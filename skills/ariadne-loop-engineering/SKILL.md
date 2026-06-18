---
name: ariadne-loop-engineering
description: 'Use this skill when a user wants an AI coding agent to turn an ambiguous feature, bug fix, refactor, or repository task into a bounded Loop Engineering contract with state, action, verification, decision, stop rules, rollback criteria, budgets, and handoff artifacts.'
license: MIT
compatibility: 'Works with GitHub Copilot coding agent and other coding agents that can read a SKILL.md file.'
---

# Ariadne Loop Engineering

Turn open-ended coding-agent work into a bounded inspect-act-verify-decide loop. The goal is not to make the agent do more work. The goal is to make each pass observable, reversible, and easy for a human to stop or redirect.

## When to Use

Use this skill when the task includes one or more of these signals:

- The request is broad, such as "fix this repo", "improve the app", "make it production ready", or "clean this up".
- The agent needs to touch multiple files, run commands, inspect a live app, or respond to test failures.
- The user cares about repeatable evidence, not just a final explanation.
- The work may need several passes but should not drift into unrelated refactors.
- The handoff must be readable by another agent or a human reviewer.

Do not use this skill for a narrow one-line edit, a direct question, or a task that already has a precise test and acceptance condition.

## Workflow

1. Inspect the real state and record evidence.
2. Write the loop contract before changing anything.
3. Take the smallest useful action inside the agreed scope.
4. Verify the action with a concrete signal.
5. Decide whether to continue, stop, rollback, or ask.
6. Produce the handoff artifact named in the contract.

## Output Contract

Before acting, produce a short loop contract with these fields:

```yaml
goal: one sentence describing the user-visible outcome
current_state:
  evidence:
    - file, page, issue, log, or command output already inspected
constraints:
  allowed:
    - explicit actions the agent may take
  disallowed:
    - actions the agent must not take
loop:
  inspect: what to read or run before each pass
  act: the smallest useful change for one pass
  verify: command, page check, review check, or artifact check
  decide: continue, stop, rollback, or ask
budgets:
  max_passes: small integer, usually 1-3
  max_blast_radius: directories, files, or systems allowed to change
stop_rules:
  - condition that ends the loop successfully
  - condition that requires user input
rollback:
  - how to undo the last pass if verification fails
handoff:
  artifacts:
    - summary, diff, screenshot, report, PR, or issue link to produce
```

If any field cannot be filled from the prompt or repository evidence, write the safest assumption and mark it as `assumption:`. Ask the user only when the missing answer would change the risk or scope materially.

## Core Loop

### 1. Inspect the Real State

Collect enough evidence to avoid inventing a task model.

- Read the files, issue, PR, page, logs, tests, or docs named by the user.
- If the task involves a UI, inspect the running page or a screenshot before changing it.
- If the task involves repository health, check the current branch and dirty state first.
- Summarize only facts that came from evidence. Label guesses as assumptions.

### 2. Bound the Next Action

Pick the smallest action that can be verified.

- Prefer one coherent change over a broad cleanup pass.
- Keep the action inside the stated blast radius.
- Do not bundle unrelated formatting, dependency upgrades, or opportunistic refactors.
- If the task is too broad, split it into named passes and execute only the first pass unless the user asked for a longer run.

### 3. Verify With a Signal

Every pass needs a concrete signal.

- Use tests when behavior is testable.
- Use builds or linters when integration can break.
- Use browser checks or screenshots when layout or flow matters.
- Use diff review when the main risk is accidental scope growth.
- If no strong signal exists, create a lightweight inspection checklist and state the residual risk.

### 4. Decide Explicitly

After each pass, choose one outcome:

- `continue`: verification passed and another planned pass remains.
- `stop`: the goal is met or more work would be speculative.
- `rollback`: verification failed and the change made the state worse.
- `ask`: the next decision depends on product intent, credentials, access, or a risk tradeoff.

Never continue only because there is more that could be improved. Continue only when it serves the loop goal.

## Review Checklist

Before finalizing, confirm:

- The final state maps back to the original goal.
- The changed files or external actions are within the allowed scope.
- Verification evidence is named explicitly.
- Remaining risks are concrete and actionable.
- The handoff lets another agent or human continue without reconstructing context from memory.

## Common Failure Modes

### Expanding the Goal

Symptom: the agent starts improving adjacent docs, styles, or architecture that the user did not request.

Correction: return to `goal`, `allowed`, and `max_blast_radius`. Defer adjacent work into a follow-up list.

### Acting Before Reading

Symptom: the agent writes a plan from general knowledge without checking the repo or live page.

Correction: run the `inspect` step and rewrite `current_state` from evidence.

### Verification Theater

Symptom: the agent says "looks good" without a command, screenshot, reviewed diff, or concrete artifact.

Correction: choose a real signal. If none exists, say that verification is inspection-only.

### Endless Iteration

Symptom: every pass discovers more possible improvements.

Correction: enforce `max_passes` and stop when the original loop goal is satisfied.

## Optional Tooling

Ariadne Loop is a local-first workbench for creating Loop Engineering specs, agent packets, verifier gates, and handoff reports:

- Project: <https://github.com/zhangzeyu99-web/ariadne-loop>
- Agent index: <https://zhangzeyu99-web.github.io/ariadne-loop/llms.txt>
