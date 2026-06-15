# Orchestration — Parent-Owned Loop Control

Cross-cutting protocol for the Copilot PR review loop: time-boxing,
the sub-agent delegation map, the parent-owned steps (1, 7, 10), the
single-iteration fallback, and the loop-wide notes. Each per-step
sub-agent contract lives in its own `NN-*.md` file alongside this one.

Build, test, and lint commands are NOT prescribed here. Every step
that needs them defers to the target repo's own conventions
(`CONTRIBUTING.md`, `AGENTS.md`, `README`, `package.json` /
`Makefile` / language tooling, etc.). Discover and follow the repo's
existing practice — never invent build commands.

## Time-boxing & extension protocol

| Concept | Rule |
|---------|------|
| Default budget | 5 minutes per sub-agent invocation |
| Sub-agent must return | `status` ∈ {`complete`, `partial`, `blocked`} + `next_action` + `needs_extension_minutes` (0 if none). Always summarize progress before the budget expires — never silently overrun. |
| Extension | parent only extends when `status: partial` AND `next_action` is concrete; sends `write_agent "continue for N min"` with `N = min(needs_extension_minutes, 10)` |
| Extension cap (default) | 2 extensions per step; step 6 (build/test) up to 2× for slow suites. Step 2 (wait) is a single bounded sub-agent — see [02-wait.md](02-wait.md) — not extension-driven. |
| Parent never blocks | step 1 (request), step 7 (commit + push), step 8 reply/resolve mutations, and the `task_complete` decision stay in the parent |

When the cap is reached and the work is still `partial`, the parent
narrows the input (batch smaller in step 4 / split fix scope in step 5)
or takes the step over itself.

## Sub-agent delegation map

> **The loop:** one **round** = steps 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9. After step 9, if `Converged: false`, **go back to step 1** for another round. Repeat until step 9 returns `Converged: true`; then run step 10 once and exit. See [09-convergence.md](09-convergence.md) for the convergence definition and the loop-exit / loop-back decision.

Canonical order per round: **request → wait → list → triage → fix →
build → commit + push → reply + resolve (citing pushed SHA) →
convergence check**. Reply/resolve runs AFTER push so replies can cite
the pushed commit SHA.

| Step | Owner | Contract |
|------|-------|----------|
| 1 — Request review | parent | this file, [#step-1-request-review](#step-1-request-review) |
| 2 — Wait for review | sub-agent (`general-purpose`, 20 min) | [02-wait.md](02-wait.md) |
| 3 — List + categorize open threads | sub-agent (`explore`, 5 min) | [03-list-threads.md](03-list-threads.md) |
| 4 — Triage | sub-agent (`general-purpose`, 5 min/≤5 threads) | [04-triage.md](04-triage.md) |
| 5 — Apply fixes | sub-agents (`general-purpose`, parallel max 5, 5 min each) | [05-fix.md](05-fix.md) |
| 6 — Build + test per repo conventions | sub-agent (`task` + `explore`, 10 min) | [06-build-test.md](06-build-test.md) |
| 7 — Commit + push | parent | this file, [#step-7-commit-and-push](#step-7-commit-and-push) |
| 8 — Reply (always) + resolve (conditional) | sub-agent drafts → parent posts | [08-reply-resolve.md](08-reply-resolve.md) |
| 9 — Convergence verify | sub-agent (`explore`, 3 min) | [09-convergence.md](09-convergence.md) |
| 10 — Cleanup outdated (post-convergence, once) | parent | this file, [#step-10-cleanup-outdated](#step-10-cleanup-outdated) |

## Step 1: Request review

Sub-agent type: _(parent — no sub-agent)_; budget: n/a.

**Inputs**
- `PrNumber` for the target PR.

**Return contract**
- Captured `baseline` = `LatestCopilotReview.submittedAt` string (or empty)
  to be passed to step 2.
- Boolean `single_iteration_mode` — `true` if the trigger failed because
  Copilot isn't a valid reviewer; `false` otherwise.

**Procedure**

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
   take the [single-iteration fallback](#single-iteration-fallback).

## Step 7: Commit and push

Sub-agent type: _(parent — no sub-agent)_; budget: n/a.

**Inputs**
- The fix results from step 5 and the green build from step 6.

**Return contract**
- Pushed `HeadOid` (the new commit SHA), recorded for step 8 reply
  bodies and step 9 convergence proof.

**Procedure**
- Parent runs `git commit` + `git push` directly. One focused commit
  per round — bundling rounds destroys the audit trail of which finding
  drove which change and breaks `git bisect`.
- Include the trailer:
  `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`.
- Record the pushed SHA so step 8 can cite it in every reply body and
  step 9 can compare it against `LatestCopilotReview.commitOid`.

## Step 10: Cleanup outdated

Sub-agent type: _(parent — no sub-agent)_; budget: n/a. Runs **once,
after convergence** (step 9 returned `Converged: true`).

**Procedure**

```pwsh
pwsh ./scripts/10-cleanup-outdated.ps1 -PrNumber <n>
```

Safety net only. Most loops converge with nothing to clean — outdated
threads should already have been replied + resolved in step 8 like any
other open thread. Unresolved state is the source of truth in the PR
UI; `10-cleanup-outdated.ps1` only catches strays.

## Single-iteration fallback

When `01-request-review.ps1` throws because Copilot Code Review isn't
enabled on the repo / account (the GraphQL mutation reports the bot
isn't a valid reviewer), the agent falls back to **single-iteration
mode**:

- Skip step 2 (no Copilot review to wait for).
- Run steps 3 – 8 once against whatever review threads already exist
  (human, advanced-security, other bots).
- At step 9, pass `-SingleIteration` to `02-check-review-status.ps1` so
  the convergence check ignores the stale-review checks that can never
  advance without a new Copilot review. `Converged: true` collapses to
  `OpenThreadsAwaitingReply == 0`.
- Re-iteration happens only when a human posts new comments later —
  re-run the skill at that point.

Single-iteration mode is **the agent's decision after the trigger
fails**, not an auto-detected state — the script can't reliably tell
"Copilot disabled" from "Copilot enabled but not yet triggered" from
API state alone.

## Convergence proof

Print the proof of convergence in the `task_complete` message — proof,
not assertion:

- `HeadOid`
- `LatestCopilotReview.commitOid`
- `submittedAt`
- `OpenThreadsAwaitingReply: 0`
- The list of any open `escalate-to-user` threads if
  `OpenThreadCount > 0`.

## Notes

- **Re-request is first-class.** `01-request-review.ps1` does not
  silently skip when Copilot has already reviewed; it issues the
  same mutation and verifies via a new `copilot_work_started` event
  (the script enforces this — see [api-quirks.md](api-quirks.md) for
  the GraphQL surface and the silent-drop trap).
- **Outdated threads still need reply + resolve.** They show up in
  the PR UI as unresolved until you explicitly close them; step 10
  is a safety net, not the primary mechanism.
- **Reopened / revisit requests reset the thread to step 4.** If a
  declined finding is reopened by the user (or by a follow-up
  Copilot review), pull it back into triage with the prior rationale
  as input rather than re-running the whole loop.
- **Resumability after interruption.** On restart, snapshot HEAD,
  the latest Copilot review's `commit.oid` + `submittedAt`, the
  open-threads list, and any uncommitted local changes. Discard
  cached triage / drafts if HEAD or the open-threads set changed.
- **Local-build patches.** For projects with uncommitted local-build
  patches held out of the PR: `git stash push -m "local-build" --
  <paths>` before committing, `git stash pop` after. Note `-m` must
  come BEFORE `--` (see [api-quirks.md](api-quirks.md)).
