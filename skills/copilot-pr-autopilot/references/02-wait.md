# Step 2: Wait for review

Sub-agent type: `general-purpose`; budget: **20-minute hard cap** (one
bounded sub-agent, NOT extension-driven).

**Skipped** when the loop is in [single-iteration
mode](orchestration.md#single-iteration-fallback) — there's no Copilot
review to wait for.

## Inputs

From step 1:
- `PrNumber`.
- `baseline` — the `LatestCopilotReview.submittedAt` string captured
  before the trigger fired (empty string if no prior Copilot review).

## Return contract

- `02-check-review-status.ps1` JSON snapshot.
- `recommendation` ∈ {`ready`, `give-up-push-commit`}.
- `ready` iff **both** `LatestCopilotReview.submittedAt > baseline`
  AND `ReviewAtHead: true`.

## Procedure

Poll `02-check-review-status.ps1` approximately every **3 minutes**
until `ready` or the 20-minute cap is hit:

```pwsh
pwsh ./scripts/02-check-review-status.ps1 -PrNumber <n>
```

- Extract `submittedAt` and `ReviewAtHead` from the JSON each tick.
- Stop and return `ready` on the first tick that satisfies both
  conditions vs. the captured `baseline`.
- On cap reached without `ready`, return `give-up-push-commit`.

## Gotchas

- **Don't poll faster than ~3 minutes.** There is no progress signal
  from the API; faster polling only burns budget.
- **`give-up-push-commit` fallback is parent-driven.** When the
  sub-agent returns this recommendation, the **parent** pushes a
  substantive (non-whitespace) commit — auto-assign on `synchronize` is
  the most reliable trigger. Then the parent re-enters the loop at
  step 1 with a fresh `baseline`.
- **Single bounded run, not extension-driven.** Do not request
  extensions on this step — if 20 min isn't enough, the right move is
  the `give-up-push-commit` fallback, not more polling.
