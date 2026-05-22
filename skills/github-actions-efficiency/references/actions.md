# GitHub Actions Efficiency

Load this reference only when the task involves GitHub Actions or CI workflow efficiency.

## Audit Order

Inspect in this order:

1. `.github/workflows/*.yml`
2. Docs describing CI expectations
3. Existing reports or run history if the user wants measured impact

Start with common, low-risk waste:

1. Missing dependency caches
2. Missing `concurrency` cancellation
3. Over-broad workflow triggers
4. Duplicate workflow coverage across files or jobs
5. Expensive jobs that run on every change regardless of scope

## Actions-Specific Guidance

### Trigger scoping

- Use `paths` or `paths-ignore` when whole workflows truly should not run for some file classes.
- Use job-level gating when event-level filters are too coarse.
- Prefer explicit changed-file detection when reliability matters more than clever filter expressions.

### Job shaping

- Do not merge jobs blindly. If separate jobs preserve parallelism and shorten the critical path, keep them separate.
- Keep lightweight coordination or change-detection jobs separate from heavy execution jobs when that makes skip behavior obvious.
- If a workflow-only change still runs the full suite, treat that as evidence the gating model is too broad.

### Matrix reduction

Match matrix breadth to the decision being made:

- Full matrix for releases or explicit compatibility validation
- Reduced compatibility matrix for runtime, plugin, packaging, or framework-integration changes
- Single representative latest-version leg for ordinary code changes
- No heavy test job for clearly non-runtime changes when lighter protection already exists

### Optional maintenance jobs

Formatting or autofix jobs that write back to a branch are often better as opt-in jobs.

Good triggers:

- PR label such as `ci:format`
- Manual dispatch
- Explicit comment-command flow if the repo already supports it

If you use a label trigger, remember to listen for PR `labeled` and usually `unlabeled` events or the label change will not reevaluate the job.

## Safe-Change Rules

- Do not hide required release, migration, or shared-library validation.
- Do not widen changed-file scope accidentally when replacing a wrapper action.
- Treat severity drift as a regression risk.
- Match the real check surface before replacing a broad action with native tools.

## Live Validation

Prefer live GitHub validation when possible:

- Trigger `workflow_dispatch` workflows once
- Verify stale-run cancellation with two quick updates
- Verify path-gating with an incremental ignored-only or workflow-only change on an existing branch
- Confirm heavy jobs skip in the UI instead of assuming they would

Do not treat the first push on a brand-new branch as a clean path-ignore test.
