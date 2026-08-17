---
name: copilot-pr-autopilot
description: 'Copilot left 14 review comments on your PR — half are nits. Hours of fix → reply → resolve → re-request, and each round lands MORE comments. This skill runs loop engineering: auto-triggers Copilot Code Review via GraphQL (no @copilot mention), triages every open thread (Copilot, humans, advanced-security) with a fix / decline / escalate rubric, dispatches parallel fix sub-agents that obey the repo build/test/lint conventions, commits per iteration, replies+resolves citing the pushed SHA, then re-triggers until HEAD is reviewed with zero threads awaiting the agent''s reply (remaining open threads are explicit hand-offs to the human — escalated declines, design tradeoffs). You merge a clean PR; the bot runs it. Trigger phrases: "address copilot comments", "run a copilot review loop", "fix this PR", "iterate on copilot feedback". Repo-agnostic, gh CLI + PowerShell. Full autopilot needs repo Triage/Write; external PR authors get single-iteration mode plus manual re-trigger (UI 🔄 or substantive-commit push).'
---

# Copilot PR Autopilot

Drive any GitHub pull request through repeated rounds of Copilot code
review until the agent has done its job — every Copilot finding has
a reply from the agent (fix-acknowledgement, decline-with-rationale,
or explicit escalate-to-user hand-off). Remaining open threads, if
any, are deliberate hand-offs to the human merge owner — they're
not loop failures. Repository-agnostic — works on any repo that has
Copilot Code Review enabled, run from a machine with `gh` CLI
installed and authenticated (see Prerequisites).

## When to Use This Skill

- The user asks to "request Copilot review" or "run a Copilot review loop"
  on a PR.
- A PR is functionally complete and the user wants a final correctness pass
  via repeated automated review rounds.
- A previous Copilot review on the PR has left open threads that need
  triage, fixing, replying, and resolving.

## When NOT to Use This Skill

- The PR is still under active design — wait until the structure is stable;
  otherwise findings churn round-over-round.
- The user wants human reviewer feedback, not Copilot's.

## Prerequisites

- `gh` CLI installed and authenticated against the target repository.
- PowerShell on PATH — Windows PowerShell 5.1+ (`powershell.exe`) or
  PowerShell 7+ (`pwsh`). Both are tested.
- Copilot Code Review is the primary use case (`01-request-review.ps1`
  uses GraphQL `requestReviewsByLogin` to trigger Copilot). It is
  **NOT a hard requirement** — if `01-request-review.ps1` fails
  because Copilot isn't enabled on the repo / account, the agent can
  still drive existing review threads (human, advanced-security, etc.)
  to completion by running steps 3–8 once as a single iteration; just
  skip the trigger + wait. There is no auto-detect for "Copilot
  unavailable" — the agent makes that decision after the trigger
  fails (the script can't reliably tell "Copilot disabled" from
  "Copilot enabled but not yet triggered" from API state alone).

### Permissions: who can run the full loop

The full multi-round autopilot (steps 1 → 9 → 1) needs **Triage or Write** permission on the target repo, because GitHub's only public API for adding the Copilot bot as a reviewer (`requestReviewsByLogin`) is gated on that permission. Verified against the public REST + GraphQL surface in this PR's commit history — there is no public-API path for bot reviewers without write permission.

| You are… | What works |
|---|---|
| **Repo collaborator with Triage / Write** | Full loop: `01` triggers Copilot, `02` waits, `04`–`08` triage / fix / reply, loop back to `01`. Hands-off. |
| **External PR author (no write permission)** | `01` will throw a clear actionable error. Use `-SingleIteration` mode: address all current findings in one pass, then either click the UI 🔄 next to Copilot, **or** push a substantive commit (the `synchronize` event auto-triggers Copilot on most repos). Then re-run `02` to verify. |

In single-iteration mode the loop's convergence boolean is `Converged: true` iff `OpenThreadsAwaitingReply == 0` (the agent's side is done). The maintainer-side re-trigger then drives any additional rounds.

Every script dot-sources [scripts/_lib.ps1](scripts/_lib.ps1) which
runs `Assert-GhReady` on load: if `gh` is missing OR `gh auth status`
fails, the script halts **before any work** with a single actionable
error message naming the install command and `gh auth login`. The
agent should surface that message to the user verbatim and stop the
loop — do not retry or work around it.

## Step-by-Step Workflow

> **The loop:** steps 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9, then **back to step 1** if `Converged: false`. Repeat the 1→9 round until step 9 returns `Converged: true`; only then run step 10 once and call `task_complete`. **At every 10th round, the parent runs the [round-cap recap gate](references/09-convergence.md#round-cap--recap-gate-circuit-breaker) before looping back** — recap all prior rounds and stop if the loop has drifted out of the PR's original scope.

Each round runs steps 1–9; step 10 is a one-time cleanup after convergence. The parent agent coordinates; every sub-agent step runs in a fresh context with a bounded budget. Cross-cutting protocol (time-boxing, extension, single-iteration fallback): [orchestration.md](references/orchestration.md).

1. **Request review** _(parent)_ — see [01-request-review.md](references/01-request-review.md)
2. **Wait for review** _(sub-agent, 20-min cap)_ — see [02-wait.md](references/02-wait.md)
3. **List + categorize open threads** _(sub-agent, 5 min)_ — see [03-list-threads.md](references/03-list-threads.md)
4. **Triage** _(sub-agent, 5 min per ≤5 threads)_ — see [04-triage.md](references/04-triage.md)
5. **Fix** _(sub-agents, parallel max 5, 5 min each)_ — see [05-fix.md](references/05-fix.md)
6. **Build + test per repo conventions** _(sub-agent, 10 min)_ — see [06-build-test.md](references/06-build-test.md)
7. **Commit + push** _(parent)_ — see [07-commit-push.md](references/07-commit-push.md)
8. **Reply (always) + resolve (conditional)** _(sub-agent drafts, parent posts)_ — see [08-reply-resolve.md](references/08-reply-resolve.md)
9. **Convergence verify** _(sub-agent, 3 min)_ — see [09-convergence.md](references/09-convergence.md)
   - **`Converged: false` → loop back to step 1** for another round (re-trigger, wait, list, triage, fix, push, reply, re-check). Each round addresses Copilot's findings on the previous round's HEAD; the loop terminates as soon as Copilot has nothing new to say AND every open thread has a reply from the agent.
   - **`Converged: true` → exit the loop**, run step 10 once, call `task_complete` with the proof.
   - **Every 10th round (10, 20, 30…) → run the [round-cap recap gate](references/09-convergence.md#round-cap--recap-gate-circuit-breaker) before looping back.** Recap ALL prior rounds against the PR's original scope and pick a verdict: **CONTINUE**, **REVERT-AND-SHIP** (drop drifted commits, ship the in-scope ones), or **HAND-OFF** (escalate to the user). This is the circuit breaker that stops a runaway bot-review loop.
10. **Cleanup outdated** _(parent, post-convergence, once)_ — see [10-cleanup.md](references/10-cleanup.md)

Convergence is computed by [scripts/02-check-review-status.ps1](scripts/02-check-review-status.ps1) as a single `Converged: true` boolean. Do **not** call `task_complete` until it returns true; print the proof (`HeadOid`, `LatestCopilotReview.commitOid`, `submittedAt`) in the completion message.

## Gotchas

The bundled scripts enforce the hard correctness invariants (trigger landing via `copilot_work_started` event id, `Converged` requiring HEAD-match + zero-awaiting + at-HEAD review, single-iteration fallback semantics, PR-state guard). Trust them — don't re-derive. The notes below cover decisions the scripts can't make for you:

- **Reply to every open thread; resolve only when the loop owns the disposition.** For `fix` and `decline` threads, reply + resolve. For `escalate-to-user` threads, reply with the analysis but leave the thread OPEN (`08-reply-and-resolve.ps1 -NoResolve`) so the human merge owner can act on it. See [08-reply-resolve.md](references/08-reply-resolve.md).
- **Copilot threads are loop-owned; human / advanced-security / other-bot threads default to `escalate-to-user`.** Auto-resolving a human review thread can hide unaddressed concerns. See [04-triage.md](references/04-triage.md) for the rubric.
- **One focused commit per round, not one per PR.** Bundling rounds destroys the audit trail of which finding drove which change and breaks `git bisect`. See [07-commit-push.md](references/07-commit-push.md).
- **Build/test/lint with the repo's own commands** (per its `CONTRIBUTING` / `AGENTS` / `README` / `package.json` / `Makefile`) before pushing a fix. Discovery procedure: [06-build-test.md](references/06-build-test.md).
- **Push back with written rationale** when a Copilot finding would over-engineer the design for a hypothetical edge case. Auto-accepting every suggestion erodes the design — see the `decline` path in [04-triage.md](references/04-triage.md).
- **Scripting traps** (`gh api graphql -F` type-coercion, `git stash push -m` positional parsing, the three GraphQL traps for the reviewer mutation) are documented in [references/api-quirks.md](references/api-quirks.md). Read before modifying any script.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Script throws `prerequisite missing — gh CLI is not on PATH` | Install `gh` (`winget install GitHub.cli` on Windows; `brew install gh` on macOS; package manager on Linux; or download from https://cli.github.com). Then `gh auth login`. Surface the message to the user and STOP the loop — do not retry. |
| Script throws `prerequisite missing — gh CLI is not authenticated` | Run `gh auth login`. STOP the loop until the user completes auth. |
| Trigger fails or no `copilot_work_started` event lands | Push a substantive (non-whitespace) commit — auto-assign on `synchronize` is the most reliable trigger. Persistent failure indicates Copilot Code Review may not be enabled on the repo / account (check repo Settings → Code & automation → Copilot, or account-level Copilot Pro/Pro+). |
| No new review after waiting ~10 min | Quiet-period after recent dismissal or trivial-diff suppression. Push a substantive commit and retry. Do not blindly re-run `01-request-review.ps1` — it reports `InFlight` while Copilot is still a requested reviewer. |
| Outdated-but-unresolved threads in the open list | Expected: unresolved state is the source of truth. Reply + resolve them like any other open thread. `10-cleanup-outdated.ps1` is only a final safety net. |
| Unsure whether to fix or decline a finding | See [references/04-triage.md](references/04-triage.md). |
| Need a reply phrasing for "fixed", "declined", or "drift" | See the templates under [templates/](templates/) — [reply-fix.md](templates/reply-fix.md), [reply-decline.md](templates/reply-decline.md), [reply-drift.md](templates/reply-drift.md), [reply-partial.md](templates/reply-partial.md). |

## References

- [references/orchestration.md](references/orchestration.md) —
  cross-cutting loop control: time-boxing & extension protocol,
  sub-agent delegation map, single-iteration fallback, and loop-wide
  notes.
- Per-step contracts (one `NN-*.md` per step):
  [references/01-request-review.md](references/01-request-review.md) _(parent)_,
  [references/02-wait.md](references/02-wait.md),
  [references/03-list-threads.md](references/03-list-threads.md),
  [references/04-triage.md](references/04-triage.md) (includes the
  fix-vs-decline rubric),
  [references/05-fix.md](references/05-fix.md),
  [references/06-build-test.md](references/06-build-test.md),
  [references/07-commit-push.md](references/07-commit-push.md) _(parent)_,
  [references/08-reply-resolve.md](references/08-reply-resolve.md),
  [references/09-convergence.md](references/09-convergence.md) (includes
  the round-cap recap gate),
  [references/10-cleanup.md](references/10-cleanup.md) _(parent)_.
- [references/api-quirks.md](references/api-quirks.md) — verified
  GitHub API behavior, dead-ends, and the GraphQL traps for the
  reviewer mutation.
- Templates (one per reply type):
  [templates/reply-fix.md](templates/reply-fix.md) — accepted-fix
  pattern; [templates/reply-decline.md](templates/reply-decline.md) —
  declined-with-rationale pattern;
  [templates/reply-drift.md](templates/reply-drift.md) —
  PR-description / comment / test-plan drift acknowledgement;
  [templates/reply-partial.md](templates/reply-partial.md) —
  partial fix with deferred follow-up. Cross-cutting reply guidance
  and anti-patterns live in
  [references/08-reply-resolve.md](references/08-reply-resolve.md#reply-guidance).
- [scripts/_lib.ps1](scripts/_lib.ps1) — shared helpers (`Invoke-Gh`,
  `Invoke-GhGraphQL`, `Resolve-RepoCoords`); dot-sourced by every
  script.
- [scripts/01-request-review.ps1](scripts/01-request-review.ps1) —
  trigger Copilot review and verify pickup via the
  `copilot_work_started` event.
- [scripts/02-check-review-status.ps1](scripts/02-check-review-status.ps1) —
  single-shot snapshot of the PR's Copilot review state; emits
  `Converged: true` only when all three conditions hold.
- [scripts/03-list-open-threads.ps1](scripts/03-list-open-threads.ps1) —
  every unresolved PR review thread from **all reviewers** (Copilot,
  humans, github-advanced-security, etc.).
- [scripts/08-reply-and-resolve.ps1](scripts/08-reply-and-resolve.ps1) —
  post a reply and resolve in one call.
- [scripts/10-cleanup-outdated.ps1](scripts/10-cleanup-outdated.ps1) —
  safety net for outdated Copilot threads.
