# Delivery Workflow

This reference is the canonical delivery lifecycle for the Producer, Dev, and QA agents.

**Plan → Implement → Dev self-review → Independent review gate → QA acceptance on PR head → Fix/re-verify loop → regular merge → post-merge smoke check**

## Stage Evidence and Ownership

| Stage | Owner | Entry evidence | Exit evidence |
|---|---|---|---|
| Plan | Producer | Current project brief, open issues, constraints, and requested outcome | Sprint/task plan with acceptance criteria, owner, target branch, base remote/ref, push remote, working branch, exclusions, and required checks |
| Implement | Dev | Approved plan; clean-worktree preflight; feature branch created from the agreed base | Focused commits, implementation tests, committed progress/handoff context, and a pushed PR head |
| Dev self-review | Dev | Plan, complete working diff, and test results | Recorded findings, fixes or dispositions, rerun checks, final candidate commit, and a SHA-bound PR handoff; this is an early filter only |
| Independent review gate | Producer commissions; independent reviewer performs | PR, self-review packet, candidate SHA, plan, and risk-focused review scope | PR review/comment/check verdict tied to the exact SHA; no unresolved blocker or major finding, or a head-specific documented exemption |
| QA acceptance on PR head | QA | Review-passed PR head SHA or immutable preview, acceptance criteria, and reproducible environment | PR review/comment/check acceptance packet with exact SHA, environment, checks/evidence, issues, and `Ready for merge` or `Blocked` |
| Fix/re-verify loop | Dev fixes; reviewer and QA re-verify | Blocker/major review finding or failed QA check | Fixes on the same feature branch, new head SHA, updated evidence, and affected gates rerun until clear |
| Regular merge | Producer | Independent review and QA acceptance for the current PR head, or an explicit head-specific exemption | Regular merge result, PR/merge SHA, and linked issues |
| Post-merge smoke check | QA, coordinated by Producer | Merged commit or deployed artifact and target environment | Smoke result tied to merge/deploy SHA and environment; regressions become issues and follow-up work |
| Closeout | Producer | Merge result, review/QA PR artifacts, smoke evidence, and Dev handoff | Docs-only closeout PR archives QA/gate evidence and updates authoritative project status |

> **Closeout is a post-lifecycle, docs-only follow-up, not a merge gate.** The eight-step lifecycle ends at the post-merge smoke check; closeout only archives the SHA-bound gate evidence and updates authoritative status after merge, so it never blocks a change.

## Gate Rules

- Do not merge before both independent review and QA acceptance. The Producer may exempt a docs-only or genuinely trivial change only by recording the scope, reason, risk, and checks in the PR or handoff.
- Dev self-review never satisfies the independent gate. The independent reviewer must not be an author. The Producer invokes a fresh reviewer or subagent when available; otherwise the Producer requests a human reviewer or separate independent session. Self-attestation is not a fallback.
- QA accepts the PR branch, exact commit, or immutable preview before merge and records the SHA and environment. The post-merge smoke check confirms integration; it is never the first acceptance test.
- Every PR-head change invalidates both SHA-bound gates. Any blocker or major finding returns to Dev for a same-branch fix and new head. Independent review and QA then issue fresh evidence for that exact head; a new head-specific docs-only/trivial exemption may replace a full rerun only when explicitly justified.
- Evidence must not reproduce real secrets or end-user identifying information in documentation, issues, screenshots, fixtures, or logs. Redact or replace it with synthetic data while preserving diagnostic value.

## Durable Evidence Without Self-Referential SHAs

A commit cannot durably contain its own SHA. Before merge, put exact-SHA handoffs, independent verdicts, and QA acceptance in PR descriptions, reviews, comments, or check runs—not in a file committed to the application PR. Commit `progress.md` and `done.md` before the final candidate commit as context-only handoffs; they point to the PR as the live gate record and do not claim their own commit SHA.

After regular merge and the smoke check, the Producer creates a separate docs-only closeout PR from the updated target branch recorded in the sprint plan. It archives the accepted PR-head SHA and gate links, writes the QA sign-off record, and updates authoritative project status. After the closeout PR's final docs commit, post a head-specific exemption packet on that PR with its SHA, docs-only scope, reason, risk, checks, both gates marked exempt, and `no further closeout required`. Replace the packet if the closeout head changes.

The closeout PR itself is the terminal evidence: its merged PR state proves completion. No repository file records that closeout PR's own merge SHA or status, and no closeout-of-closeout PR is created.

## Capability Protocol

Before promising to create or update an issue or PR, push a branch, run a command, edit a file, or merge, detect that the current session has the required GitHub, terminal, edit, and authentication capabilities. If it does, perform the action and cite the resulting URL, ref, or output. If it does not, prepare the exact target, payload or commands, required actor, and expected evidence; explicitly hand that packet off. Never claim that an unavailable mutation happened.

## Handoff Packet

Keep every transfer concise and structured:

- **Owner / From / To**
- **Sprint / Task**
- **Target branch / Base ref / Working branch**
- **Commit SHA**
- **PR / Issues**
- **Checks / Evidence**
- **Decisions**
- **Blockers**
- **Next action**