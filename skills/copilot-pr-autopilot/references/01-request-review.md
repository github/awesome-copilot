# Step 1: Request review

Owner: **parent** (no sub-agent); budget: n/a.

## Inputs

- `PrNumber` for the target PR.

## Return contract

- Captured `baseline` = `LatestCopilotReview.submittedAt` string (or empty)
  to be passed to step 2.
- Boolean `single_iteration_mode` — `true` if the trigger failed because
  Copilot isn't a valid reviewer; `false` otherwise.

## Procedure

1. Snapshot first to learn whether Copilot is already pending:

   ```pwsh
   $snap = pwsh ./scripts/02-check-review-status.ps1 -PrNumber <n>
   $baseline = if ($snap -match '"submittedAt":"([^"]+)"') { $Matches[1] } else { '' }
   $pending  = ($snap -match '"CopilotPending":true')
   ```

   Regex on raw JSON keeps `submittedAt` a string across the
   parent → sub-agent boundary on any PS version (5.1 / 7.x), avoiding
   `[datetime]` rebinding.

2. **If `$pending`** — skip the trigger; jump to step 2 with `baseline`.

3. **Else** — fire the trigger:

   ```pwsh
   pwsh ./scripts/01-request-review.ps1 -PrNumber <n>
   ```

   The script keeps its own `InFlight` short-circuit as a safety net,
   but the canonical "is Copilot pending?" signal lives in
   `02-check-review-status.ps1` (above).

4. If `01-request-review.ps1` throws because Copilot isn't a valid
   reviewer (Copilot Code Review not enabled on the repo / account),
   take the [single-iteration fallback](orchestration.md#single-iteration-fallback).
