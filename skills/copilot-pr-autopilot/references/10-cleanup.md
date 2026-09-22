# Step 10: Cleanup outdated

Owner: **parent** (no sub-agent); budget: n/a. Runs **once, after
convergence** (step 9 returned `Converged: true`).

## Inputs

- `PrNumber` for the converged PR.

## Return contract

- None — step 10 is terminal. After it runs, the loop is complete and
  the parent calls `task_complete` with the convergence proof from
  step 9.

## Procedure

```pwsh
pwsh ./scripts/10-cleanup-outdated.ps1 -PrNumber <n>
```

Safety net only. Most loops converge with nothing to clean — outdated
threads should already have been replied + resolved in step 8 like any
other open thread. Unresolved state is the source of truth in the PR
UI; `10-cleanup-outdated.ps1` only catches strays.
