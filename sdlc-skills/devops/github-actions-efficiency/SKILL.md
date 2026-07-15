---
name: github-actions-efficiency
description: 'Audit GitHub Actions workflow efficiency and recommend fixes to reduce CI minutes and costs.'
---

# GitHub Actions Efficiency

Use this skill as a lean entrypoint for GitHub Actions efficiency work. Inspect the repo, identify the waste source, and load only the reference material needed for the current task.

If no workflows exist yet, load [`references/actions.md`](./references/actions.md) and define a baseline before proceeding with the steps below.

**If shell or `gh` CLI access is unavailable:** ask the user to paste `.github/workflows/` contents and `gh run list --limit 10` output. If only partial files are provided, note it: "Audit based on provided files only; some insights may be incomplete." Begin responses from files alone with: "**Static-only analysis** (not confirmed with live runs)."

## Use This Skill When

- The user wants to reduce GitHub Actions runtime, CI cost, or wasted workflow runs.
- The repo has existing workflows in `.github/workflows/` or explicit GitHub Actions configuration questions.
- The user asks for caching, concurrency, path filters, matrix reduction, job optimization, or workflow-specific fixes.
- The user needs help creating a new GitHub Actions workflow or CI baseline from scratch.

## Load Only What You Need

- [`references/actions.md`](./references/actions.md) — audits, job gating, matrix reduction, live validation, and workflow-specific fixes.
- [`references/reporting.md`](./references/reporting.md) — when the user asks for a before/after efficiency report.
- [`references/patterns.md`](./references/patterns.md) — full YAML examples when inline audit commands are not enough.

## Core Workflow

### 1. Measure first

```bash
rg -n "on:|concurrency:|paths:|paths-ignore:|strategy:|matrix:|cache:" .github/workflows
gh run list --limit 10
run_id=$(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')
gh run view "$run_id" --log-failed
```

Look for: missing dependency caches, missing `concurrency` cancellation, over-broad triggers, duplicate workflow coverage, and expensive jobs that run on every change regardless of scope.

### 2. Apply guardrails

Check each proposed fix against these rules before recommending it:

1. Does not hide required validation — drop any fix that removes release, schema, migration, or shared-library checks.
2. Does not reduce parallelism without justification — drop unless the user prioritised cost over latency *and* the new critical path stays within 1.25× the original.
3. Preserves only documented matrix legs — drop matrix legs with no explicit version or platform commitment.
4. Write-back jobs use opt-in triggers — flag (do not drop) formatter or bot jobs that run automatically; recommend an opt-in trigger instead.
5. Repo changes stay separate from org settings — split any fix that mixes repo-editable YAML with org-level or GitHub-account settings into two distinct recommendations.

### 3. Select the top 3 fixes

From the six candidates below, keep only those supported by audit evidence from step 1 *and* passing all guardrails from step 2. Rank survivors by estimated daily CI minutes saved (per-run savings × runs per day). Select all candidates that meet both criteria, up to a maximum of 3.

1. Add dependency caching with lockfile-based keys
2. Add or correct `concurrency` cancellation
3. Remove duplicate workflow coverage before merging jobs
4. Narrow workflow or job triggers safely
5. Reduce matrix breadth to match risk and event type
6. Parallelize independent jobs on the critical path

### 4. Verify

- If `gh` CLI access is available, validate path-gating and concurrency cancellation with a live test push on a non-protected branch.
- If live validation is not possible, state that explicitly in the output.
- Treat unexpected live behavior as a real bug even when the YAML looks correct.

## Required Output

1. **Waste sources** — top cost or latency drivers found in step 1
2. **Proposed fixes** — top 3 (or all remaining) with supporting audit evidence
3. **Validation** — what was proven live, what was checked locally only, and any remaining risk
4. **Impact** — expected savings vs. measured savings; separate PR wall-clock time from total runner time

## References

- [`references/actions.md`](./references/actions.md)
- [`references/reporting.md`](./references/reporting.md)
- [`references/patterns.md`](./references/patterns.md)
- [`references/review-rubric.md`](./references/review-rubric.md) — load when reviewing completed efficiency work
