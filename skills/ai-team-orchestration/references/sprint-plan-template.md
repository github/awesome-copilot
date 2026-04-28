# Sprint Plan Template

## Plan File

Save as `docs/sprint-N/plan.md`:

```markdown
# Sprint N — [Name]

> Sprint Goal: [one sentence describing the deliverable]
> Branch: feature/sprint-N
> Estimated effort: [time estimate]

## Prioritized Task List

| # | Task | Owner | Est | Description |
|---|------|-------|-----|-------------|
| 1 | [task] | Nova | 1h | [what to build] |
| 2 | [task] | Sage | 2h | [what to build] |
| 3 | [task] | Milo | 1h | [what to style] |

## Work Schedule

### Phase 1: [Name] (tasks 1-3)
- Build [component]
- Checkpoint commit after phase

### Phase 2: [Name] (tasks 4-6)
- Build [component]
- Checkpoint commit after phase

### Phase 3: Polish & Integration
- Integration testing
- Bug fixes
- Final commit

## Success Criteria

- [ ] [Testable criterion 1]
- [ ] [Testable criterion 2]
- [ ] [Testable criterion 3]
- [ ] All tests pass
- [ ] No console errors

## What's NOT in This Sprint

| Feature | Reason |
|---------|--------|
| [cut feature] | [why — scope, complexity, not needed yet] |

## Agent Prompt

> Read PROJECT_BRIEF.md, then read docs/sprint-N/plan.md. Execute Sprint N.
>
> First: git pull origin main && git checkout -b feature/sprint-N
>
> Close GitHub Issues in commits: "fix: description (Fixes #NN)"
> Update docs/sprint-N/progress.md after each phase.
> When done, push and create PR: git push origin feature/sprint-N
> Follow Sections 12-14 of PROJECT_BRIEF.md.
```

## Progress Tracker

Create `docs/sprint-N/progress.md` at sprint start:

```markdown
# Sprint N — Progress Tracker

> If context overflows, start a new chat:
> "Read PROJECT_BRIEF.md and docs/sprint-N/progress.md.
>  Continue from where it left off."

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

## Notes

[Free-form notes about decisions, issues, or context for recovery]
```

## Done File

Write `docs/sprint-N/done.md` at sprint end:

```markdown
# Sprint N — Done

## What Was Built
- [Feature 1]
- [Feature 2]

## What's NOT Done
- [Deferred item — why]

## Files Changed/Created
- `src/components/NewComponent.tsx` — [purpose]
- `api/src/functions/newEndpoint.ts` — [purpose]

## Manual Setup Required
- [Any env vars, config, or manual steps needed]

## Known Issues
- [Issue — tracked as GitHub Issue #NN]
```

## QA Sign-off Template

```markdown
# QA Sprint N Sign-Off

Date: [date]
Tester: Ivy (QA)

## Test Results
- Tests run: X
- Tests passed: X
- Tests failed: 0

## Blockers
NONE

## Issues Filed
- #NN — [description] (severity: minor)

## Result
✅ PASS — No blockers. Sprint N is ready to merge.
```
