# Sprint Plan Template

## Plan File

Save as `docs/sprint-N/plan.md`:

```markdown
# Sprint N — [Name]

> Sprint Goal: [one sentence describing the deliverable]
> Base: origin/main
> Working branch: feature/sprint-N
> Pull request: [URL or pending]
> Estimated effort: [time estimate]

## Prioritized Task List

| # | Task | Owner | Est | Description |
|---|------|-------|-----|-------------|
| 1 | [outcome] | [role/perspective] | [estimate] | [observable result] |
| 2 | [outcome] | [role/perspective] | [estimate] | [observable result] |
| 3 | [outcome] | [role/perspective] | [estimate] | [observable result] |

## Work Schedule

### Phase 1: [Name] (tasks 1-3)
- Implement [outcome]
- Run the checks relevant to this phase
- Checkpoint commit after phase

### Phase 2: [Name] (tasks 4-6)
- Integrate [outcome]
- Add or update tests at the appropriate level
- Checkpoint commit after phase

### Phase 3: Evidence & Handoff
- Run all required checks
- Update and commit context-only progress and implementation handoff files
- Perform Dev self-review on the complete diff and resolve or record findings
- Make and push the final candidate commit
- Put the exact candidate SHA, self-review, and checks in the PR handoff, then hand it to the Producer

## Success Criteria

- [ ] [Primary user, caller, or operator outcome is observable]
- [ ] [Required contract, behavior, or artifact is verified]
- [ ] [Relevant failure and boundary behavior is verified]
- [ ] All project-defined build, test, lint, or validation checks pass
- [ ] No unexpected runtime errors or relevant warnings in the tested environment

## What's NOT in This Sprint

| Feature | Reason |
|---------|--------|
| [cut feature] | [why — scope, complexity, not needed yet] |

## Agent Prompt

Copy-paste this into the Dev Team chat to start execution:

> Read PROJECT_BRIEF.md, then read docs/sprint-N/plan.md. Execute Sprint N.
>
> Start with a branch preflight. Run each step separately:
> 1. Run `git status --short`. If it reports changes, stop and preserve them; do not reset or stash unknown work.
> 2. Run `git fetch --prune origin`.
> 3. Create the branch explicitly from the remote base without tracking `main`: `git switch --no-track --create feature/sprint-N origin/main`. If it already exists, switch to it and verify its expected base instead of recreating it.
>
> Implement and test incrementally. Reference issues in commits and the PR with `Refs #NN`; do not imply closure before QA verification. Update docs/sprint-N/progress.md after each phase.
>
> Before the final candidate commit, update and commit docs/sprint-N/progress.md and docs/sprint-N/done.md without embedding a self-referential SHA. Run Dev self-review on the complete diff, fix or disposition every finding, rerun affected checks, and make the final candidate commit. Push with `git push --set-upstream origin feature/sprint-N` when needed, then record the exact pushed SHA and structured handoff packet on the PR. Create/update the PR only after confirming the required GitHub capability; otherwise provide exact payload and commands for handoff.
>
> Follow Sections 12-15 of PROJECT_BRIEF.md. Never merge.
```

## Progress Tracker

Create `docs/sprint-N/progress.md` at sprint start:

```markdown
# Sprint N — Progress Tracker

> If context overflows, start a new chat:
> "Read PROJECT_BRIEF.md and docs/sprint-N/progress.md.
>  Continue from where it left off."

## Delivery Target

| Field | Value |
|---|---|
| Base | `origin/main` at [SHA] |
| Branch | `feature/sprint-N` |
| PR | [URL / pending] |
| Commit under test | [live PR artifact; do not embed a file's own SHA] |
| Test environment | [local/preview/device/runtime and relevant version] |

## Task Status

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | [task] | ⬜ Not started | |
| 2 | [task] | 🔨 In progress | |
| 3 | [task] | ✅ Done | |
| 4 | [task] | ❌ Blocked | [reason] |

## Bugs Found

| # | Description | Severity | Status | Fix |
|---|-------------|----------|--------|-----|
| 1 | [bug] | blocker/major/minor | open/fixed | [commit or PR] |

## Gate Status & Evidence

| Gate | Owner | Status | Evidence |
|---|---|---|---|
| Plan | Producer | pending/complete | [plan link] |
| Implementation | Dev | pending/complete | [checks/progress] |
| Dev self-review | Dev | pending/pass/changes required | [PR handoff link after final push] |
| Independent review | Producer/reviewer | pending/pass/blocked/exempt | [SHA-bound PR artifact] |
| QA acceptance | QA | pending/Ready for merge/Blocked | [SHA-bound PR artifact] |
| Regular merge | Producer | pending/complete | [PR] |
| Post-merge smoke | QA | pending/pass/blocked | [environment/result] |

## Notes

[Decisions, blockers, capability handoffs, or context needed for recovery. Redact or synthesize sensitive evidence.]
```

## Done File

Write `docs/sprint-N/done.md` at sprint end:

```markdown
# Sprint N — Done

> Dev context-only implementation handoff, committed before the final candidate commit. Exact SHA and live gate evidence belong on the PR.

## Delivery Target

| Field | Value |
|---|---|
| Branch | `feature/sprint-N` |
| PR | [URL / pending] |
| Commit under test | [record exact SHA in the PR handoff after final push] |
| Test environment | [environment] |

## What Was Built
- [Feature 1]
- [Feature 2]

## What's NOT Done
- [Deferred item — why]

## Files Changed/Created
- `[verified path]` — [purpose]
- `[verified path]` — [purpose]

## Manual Setup Required
- [Any env vars, config, or manual steps needed]

## Known Issues
- [Issue — tracked as GitHub Issue #NN]

## Checks & Self-Review

- Commands/checks: [result and evidence]
- Self-review result and exact candidate SHA: [record in the live PR handoff after final push]
- Findings resolved before final candidate: [summary]
- Findings deferred: [issue and rationale]

## Gate Status & Evidence

| Gate | Status | Evidence |
|---|---|---|
| Dev self-review | pending | [record on PR after final push] |
| Independent review | pending | [SHA-bound PR artifact] |
| QA acceptance | pending | [SHA-bound PR artifact] |

## Handoff Packet

- **Owner / From / To:** [owner] / Dev / Producer
- **Sprint / Task:** [sprint and scope]
- **Branch:** [branch]
- **Commit SHA:** [record exact pushed SHA in the PR packet, not in this committed file]
- **PR / Issues:** [links or exact payload if mutation is unavailable]
- **Checks / Evidence:** [summary]
- **Decisions:** [summary]
- **Blockers:** [none or list]
- **Next action:** [Producer commissions independent review]
```

## QA Acceptance and Archive Template

```markdown
# QA Sprint N Sign-Off

> Post the live acceptance packet as a PR review, comment, or check before merge. After merge and smoke, archive the same evidence in this file through the docs-only closeout PR.

Date: [date]
Tester: Ivy (QA)
PR: [URL]
Commit SHA: [exact PR head SHA under test]
Environment: [preview/local/device/runtime and relevant version]
Independent review evidence: [link/status for this SHA]

## Test Results
- Tests run: X
- Tests passed: X
- Tests failed: X
- Commands/scenarios: [concise list]
- Evidence: [redacted links or summaries]

## Blockers
NONE

## Issues Filed
- #NN — [description] (severity: minor)

## Gate Status & Evidence

| Gate | Status | SHA | Evidence |
|---|---|---|---|
| Independent review | pass/exempt/blocked | [SHA] | [reference] |
| QA acceptance | Ready for merge / Blocked | [same PR head SHA] | [checks and issue links] |

## Result

**Ready for merge** / **Blocked** — [reason]. This is acceptance of the recorded PR head, not a statement that it has merged.

If Dev pushes fixes, replace the commit SHA, rerun affected checks, and issue a new result. Do not include real secrets or end-user identifying information in evidence.
```

## Post-Merge Closeout

After regular merge and smoke, the Producer creates a docs-only branch from updated `main`, archives the QA packet above, updates `PROJECT_BRIEF.md` Sections 7 and 8, records the application PR/merge SHA and smoke result, and opens a docs-only closeout PR.

After its final docs commit, post this exemption packet on the closeout PR:

- **Closeout head SHA:** [exact SHA]
- **Scope:** docs-only archive/status update
- **Reason:** records already-completed application gates and smoke evidence
- **Risk:** [why no runtime behavior changes]
- **Checks:** [links/commands]
- **Independent review:** exempt
- **QA acceptance:** exempt
- **Terminal action:** merge this closeout PR; no further closeout required

If the closeout head changes, replace the exemption packet for the new SHA. The merged closeout PR is terminal evidence; do not add a `Closeout: complete` field to repository files and do not create a closeout-of-closeout PR.
