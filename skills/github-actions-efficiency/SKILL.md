---
name: github-actions-efficiency
description: 'Audit and improve GitHub Actions workflow efficiency. Use this skill when a user wants to reduce CI minutes, cancel redundant runs, add dependency caching, narrow workflow triggers with path filters, reduce matrix breadth, or optimize job parallelism.'
---

# GitHub Actions Efficiency

Use this skill as a lean entrypoint for GitHub Actions efficiency work. Keep the hot path small: inspect the repo, identify the waste source, then load only the reference material needed for the current task.

## Use This Skill When

- The user wants to reduce GitHub Actions runtime, CI cost, or wasted workflow runs.
- The repo has `.github/workflows/*.yml` and explicit GitHub Actions configuration questions.
- The user asks for caching, concurrency, path filters, matrix reduction, job optimization, or workflow-specific fixes.

## Load Only What You Need

Start with the repo configuration, then load references selectively:

- Read [`references/actions.md`](./references/actions.md) for GitHub Actions audits, job gating, matrix reduction, live validation, and workflow-specific fixes.
- Read [`references/reporting.md`](./references/reporting.md) when the user asks what changed, wants a before/after efficiency report, or wants another review pass over the remaining expensive jobs.
- Read [`references/patterns.md`](./references/patterns.md) only when you need concrete YAML or configuration examples during implementation.

If the task is Codespaces-related, use the `github-codespaces-efficiency` skill instead.

## Core Workflow

### 1. Measure first

Inspect the current configuration before proposing changes:

- Workflow triggers and whether repeated pushes waste runs
- Dependency installation and cache behavior
- Whether docs-only or config-only changes trigger heavy validation
- Whether matrix breadth matches the actual decision being made
- Job parallelism and critical path analysis

Start with a compact repo audit like this:

```bash
rg -n "on:|concurrency:|paths:|paths-ignore:|strategy:|matrix:|cache:" .github/workflows
gh run list --limit 10
gh run view --log-failed
```

### 2. Rank fixes by payoff

Prefer this order unless repo context says otherwise:

1. Add dependency caching with lockfile-based keys
2. Add or correct `concurrency` cancellation
3. Remove duplicate workflow coverage before merging jobs together
4. Narrow workflow or job triggers safely
5. Reduce matrix breadth to match risk and event type
6. Optimize job parallelism while preserving critical path

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

## References

- [`references/actions.md`](./references/actions.md)
- [`references/reporting.md`](./references/reporting.md)
- [`references/patterns.md`](./references/patterns.md)
- [`references/review-rubric.md`](./references/review-rubric.md) — load when reviewing completed efficiency work
