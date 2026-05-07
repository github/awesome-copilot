---
name: github-actions-codespaces-efficiency
description: Audit and improve GitHub Actions and Codespaces efficiency. Use this skill when a user wants to reduce CI minutes, cancel redundant runs, add dependency caching, narrow workflow triggers with path filters, slim devcontainers, right-size Codespaces, tune idle timeout guidance, or scope prebuilds to high-value branches.
---

# GitHub Actions and Codespaces Efficiency

Use this skill as a lean entrypoint for GitHub Actions and Codespaces efficiency work. Keep the hot path small: inspect the repo, identify the waste source, then load only the reference material needed for the current task.

## Use This Skill When

- The user wants to reduce GitHub Actions runtime, CI cost, or wasted workflow runs.
- The user wants faster Codespaces startup or lower Codespaces spend.
- The repo has `.github/workflows/*.yml`, a `.devcontainer/`, or explicit Codespaces configuration questions.
- The user asks for caching, concurrency, path filters, matrix reduction, prebuild strategy, machine sizing, or idle-timeout guidance.

## Load Only What You Need

Start with the repo configuration, then load references selectively:

- Read [`references/actions.md`](./references/actions.md) for GitHub Actions audits, job gating, matrix reduction, live validation, and workflow-specific fixes.
- Read [`references/codespaces.md`](./references/codespaces.md) for devcontainer, machine-sizing, prebuild, and idle-timeout guidance.
- Read [`references/reporting.md`](./references/reporting.md) when the user asks what changed, wants a before/after efficiency report, or wants another review pass over the remaining expensive jobs.
- Read [`references/patterns.md`](./references/patterns.md) only when you need concrete YAML or configuration examples during implementation.

If the task is CI-only, do not load the Codespaces reference. If the task is Codespaces-only, do not load the Actions reference.

## Core Workflow

### 1. Measure first

Inspect the current configuration before proposing changes:

- Workflow triggers and whether repeated pushes waste runs
- Dependency installation and cache behavior
- Whether docs-only or config-only changes trigger heavy validation
- Whether matrix breadth matches the actual decision being made
- Whether devcontainers or Codespaces defaults are oversized

### 2. Rank fixes by payoff

Prefer this order unless repo context says otherwise:

1. Add dependency caching with lockfile-based keys
2. Add or correct `concurrency` cancellation
3. Remove duplicate workflow coverage before merging jobs together
4. Narrow workflow or job triggers safely
5. Reduce matrix breadth to match risk and event type
6. Trim oversized devcontainer or Codespaces defaults

### 3. Keep changes conservative

- Do not hide required release, schema, migration, or shared-library validation behind overly-broad filters.
- Do not assume fewer jobs means faster PR feedback; preserve parallelism unless runner cost matters more and the critical path stays acceptable.
- Treat compatibility matrices as policy, not default ceremony.
- Prefer opt-in triggers for nonessential write-back jobs such as formatting bots.
- Separate repo-editable changes from GitHub/org settings recommendations.

### 4. Verify in GitHub when possible

YAML lint is necessary but not sufficient.

- Validate trigger behavior with live runs when possible.
- Use a low-scope change, such as a workflow-only or docs-only update, to prove heavy jobs actually skip.
- Treat unexpected live behavior as a real bug even when the YAML looks correct.

## Required Output Shape

When using this skill, keep the response compact and structured around these four sections:

1. `Waste sources`: the top cost or latency drivers you found
2. `Proposed fixes`: the small set of highest-confidence changes
3. `Validation`: what was proven live, what was only checked locally, and any remaining risk
4. `Impact`: expected savings separately from measured savings

For measured impact, separate:

- PR wall-clock time
- Total runner time across jobs
- Jobs or matrix legs avoided entirely

## Review Rubric

Use this rubric when reviewing current or updated efficiency work:

- `Scope discipline`: only relevant domain guidance was loaded
- `Safety`: required validation coverage was preserved
- `Token efficiency`: the skill or report stayed focused on the active task
- `Measurement quality`: expected and measured gains were clearly separated

If one rubric dimension is weak, call that out explicitly instead of averaging it away.

## References

- [`references/actions.md`](./references/actions.md)
- [`references/codespaces.md`](./references/codespaces.md)
- [`references/reporting.md`](./references/reporting.md)
- [`references/patterns.md`](./references/patterns.md)
