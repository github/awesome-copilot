# Step 9: Convergence verify

Sub-agent type: `explore`; budget: 3 min.

## Inputs

- `PrNumber`.
- The pushed `HeadOid` from step 7 (for the independent sanity check).
- Whether the loop is in normal mode or [single-iteration
  mode](orchestration.md#single-iteration-fallback) (decided at step 1).

## Return contract

```
{ converged, head_oid, latest_review_commit_oid, submitted_at,
  open_thread_count, open_threads_awaiting_reply, escalated_threads }
```

`converged` is the single source-of-truth boolean — `Converged: true`
returned by `02-check-review-status.ps1`.

## Procedure

Run the status check, passing `-SingleIteration` iff the loop took the
fallback at step 1:

```pwsh
pwsh ./scripts/02-check-review-status.ps1 -PrNumber <n>
# single-iteration variant:
pwsh ./scripts/02-check-review-status.ps1 -PrNumber <n> -SingleIteration
```

Then run an **independent HEAD-vs-`LatestCopilotReview.commitOid`
sanity check** — the parent's recorded `HeadOid` from step 7 should
match `HEAD` and (in normal mode) match the latest review's
`commitOid`.

## Decision: loop back or exit

After the status check, the parent agent **must** branch on `converged`:

```
if converged == true:
    run step 10 once (cleanup outdated)
    call task_complete with proof (HeadOid, LatestCopilotReview.commitOid, submittedAt)
    DONE — exit the loop
else:
    GO BACK TO STEP 1 — start another round
    (re-trigger via 01-request-review.ps1, wait via 02-wait,
     list via 03-list-threads, triage, fix, push, reply+resolve,
     re-check via this step)
```

A non-converged result is **never** terminal. Each round addresses
Copilot's findings on the previous round's HEAD; the loop terminates
only when Copilot has nothing new to say AND every open thread has a
reply from the agent. There is no "max rounds" cap built into the
scripts — the parent agent SHOULD apply a sane cap (e.g., 10 rounds)
and escalate to the user if the loop is oscillating (same finding
re-raised across rounds — see [04-triage.md](04-triage.md#conflicting-comments--break-oscillation-early)).

`-SingleIteration` mode is the **one** exception: by definition, it
runs one round only (the trigger path is unavailable), and the
`converged` result is taken as terminal whichever way it goes.

### Convergence semantics

`02-check-review-status.ps1` implements a PR-state guard plus three Converged branches (see the `Converged = if (...)` block near the end of that script for the canonical source):

- **PR State guard (overrides everything)** — if `State != 'OPEN'` (CLOSED / MERGED), `Converged: false` regardless of all other flags. The agent cannot push to a non-OPEN PR; surface the state change to the user and abort the loop rather than calling `task_complete`.
- **Normal (Copilot-driven) mode** — a Copilot review exists OR `CopilotPending: true`:
  `Converged: true` iff
  `ReviewAtHead && NoNewComments && OpenThreadsAwaitingReply == 0`.
- **Single-iteration mode** (`-SingleIteration` passed because the loop took the [fallback at step 1](orchestration.md#single-iteration-fallback)):
  `Converged: true` iff `OpenThreadsAwaitingReply == 0`. The stale-review checks can never advance without a new Copilot review, so they're omitted.
- **No Copilot review ever observed AND not pending** (brand-new PRs with zero findings, or PRs where the trigger silently failed and the script wasn't called with `-SingleIteration`):
  `Converged: true` iff `OpenThreadsAwaitingReply == 0`. **Do NOT trust this as "loop done" before step 1 has fired** — it just means there's no human-thread work pending. The parent agent MUST run `01-request-review.ps1` first (per [orchestration.md step 1](orchestration.md#step-1-request-review)) and re-check; treating brand-new-PR convergence as terminal will short-circuit the entire loop.

`OpenThreadCount` MAY be `> 0` when escalated-to-user threads stay
open — that's an explicit human hand-off, not a loop failure. Return
the list of escalated `thread_id`s so the parent can include them in
the convergence proof.

## Gotchas

- **Trust `02-check-review-status.ps1`'s `Converged` flag, not your
  own re-derivation.** The script enforces all three conditions
  (normal mode) or the simplified condition (single-iteration) and
  is the canonical source.
- **Don't call `task_complete` until `converged == true`.** Print
  the proof (`HeadOid`, `LatestCopilotReview.commitOid`,
  `submittedAt`, `OpenThreadsAwaitingReply: 0`, list of escalated
  threads if `OpenThreadCount > 0`) in the completion message.
- **`-SingleIteration` is sticky to the fallback decision.** If
  step 1 took the fallback, every step 9 in this loop uses
  `-SingleIteration`; don't flip it mid-loop.
- **PR State != OPEN aborts the loop.** If `State` is `CLOSED` or
  `MERGED`, `Converged` is forced `false` by the script's state
  guard. The parent agent cannot push to a non-OPEN PR — surface
  the state change to the user and stop the loop rather than
  retrying or calling `task_complete`.
