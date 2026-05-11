---
name: karpathy-guidelines
description: Behavioral coding-agent guidelines that reduce common LLM coding mistakes by favoring simple, surgical, assumption-aware, and verifiable changes.
license: MIT
compatibility: Works with GitHub Copilot agent skills and other SKILL.md-compatible coding agents. No external dependencies.
metadata:
  author: SwarmClaw AI
  source: https://github.com/swarmclawai/andrej-karpathy-skills
  inspired-by: https://x.com/karpathy/status/2015883857489522876
---

# Karpathy Guidelines

Behavioral guidelines to reduce common LLM coding mistakes, derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on LLM coding pitfalls.

Use this skill when writing, reviewing, or refactoring code and the main risk is overcomplication, hidden assumptions, broad edits, or weak verification.

## Agent Behavior Rules

1. **Think before coding.** State assumptions explicitly, surface tradeoffs, and ask when the request has multiple plausible interpretations.
2. **Prefer simple implementations.** Do the minimum needed to solve the user request. Avoid speculative abstraction, configurability, and features that were not asked for.
3. **Make surgical changes.** Touch only the files and lines required for the task. Match the surrounding style and avoid unrelated cleanup.
4. **Define success criteria.** Convert vague work into verifiable outcomes before editing. For bugs, reproduce the failure first when practical.
5. **Verify the result.** Run the smallest meaningful checks that cover the requested behavior. Report any checks that could not be run.

## Before Editing

- Identify the concrete user goal.
- Name any assumptions that affect implementation.
- Check the existing code shape before introducing new patterns.
- Prefer local helpers, local conventions, and established tests over new infrastructure.

## While Editing

- Keep every changed line traceable to the goal.
- Remove imports, variables, or functions that your change made unused.
- Do not delete pre-existing dead code unless the user asked for cleanup.
- If an implementation starts growing unexpectedly, pause and simplify.

## Verification Pattern

For multi-step work, use a short plan with checks:

```text
1. Implement the smallest change that addresses the goal.
2. Run the focused test, build, or static check that exercises the changed behavior.
3. Inspect the diff for unrelated churn.
4. Report what changed and what was verified.
```

Strong success criteria let agents continue independently. Weak success criteria, such as "make it work", require clarification.
