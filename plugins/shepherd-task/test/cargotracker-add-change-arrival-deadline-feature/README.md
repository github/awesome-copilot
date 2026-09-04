# Cargo Tracker change-arrival-deadline control fixture

This fixture is a self-contained end-to-end invocation of `shepherd-task` with
lesson propagation disabled. It applies the five-task Change Arrival Deadline
plan to a prepared Cargo Tracker baseline and verifies the completed campaign.

There is one campaign, one stage-25 run, and no paired comparison or recovery
phase.

## Fixed baseline

- Source branch: `20260902-2104Z-commit-e7b651f-liberty`
- Baseline SHA: `9b9f311b2a3a2854bdac947593950d9edb6bca7d`
- Campaign branch: `experiment/shepherd-control`
- Lesson propagation: `off`
- Implementation tasks: 5, executed serially
- Substantive check: `Shepherd task Cargo Tracker`

## What it exercises

1. Verifies and publishes the prepared Cargo Tracker baseline.
2. Creates one detached control worktree at the exact baseline SHA.
3. Initializes stage 00 without specifying a lesson mode.
4. Verifies that stage 00 persisted `lessonPropagation=off`.
5. Runs stage 15 and stage 20 to create the five ordered implementation issues.
6. Runs stage 25 once for all five issues.
7. Verifies closed issues, merged PRs, serial ordering, substantive Maven CI,
   issue-body contracts, and the unchanged campaign-lessons placeholder.
8. Preserves the checkout, worktree, campaign artifacts, run logs,
   post-mortem, and a machine-readable summary.

## Requirements

- Windows PowerShell or PowerShell 7
- `git`, `gh`, `copilot`, and `pwsh` on `PATH`
- Authenticated GitHub CLI
- A disposable Cargo Tracker fork containing the fixed source branch and
  baseline commit
- Actions, Copilot Coding Agent, and Copilot code review enabled
- The shepherd-task plugin and skills installed from this checkout

The target and control-worktree paths must not already exist. The remote
baseline and control branch names must also be unused.

## Offline contracts

From the repository root:

```powershell
$Fixture = '.\plugins\shepherd-task\test\cargotracker-add-change-arrival-deadline-feature'

& "$Fixture\03-resolve-repository-remote.ps1"
& "$Fixture\05-stage20-artifact-contract.ps1"
& "$Fixture\06-stage40-review-contract.ps1"
& "$Fixture\07-driver-encoding-contract.ps1"
& "$Fixture\08-psncpps-contract.ps1"
& "$Fixture\09-skill-powershell-contract.ps1"
& "$Fixture\10-cargotracker-fixture-contract.ps1"
& "$Fixture\11-stage15-plan-discovery-contract.ps1"
& "$Fixture\12-session-outcome-contract.ps1"
```

The Bash contracts can be run with Git Bash:

```powershell
& "C:\Program Files\Git\bin\bash.exe" `
  "plugins/shepherd-task/test/cargotracker-add-change-arrival-deadline-feature/03-resolve-repository-remote.sh"
& "C:\Program Files\Git\bin\bash.exe" `
  "plugins/shepherd-task/test/cargotracker-add-change-arrival-deadline-feature/06-stage40-review-contract.sh"
& "C:\Program Files\Git\bin\bash.exe" `
  "plugins/shepherd-task/test/cargotracker-add-change-arrival-deadline-feature/11-stage15-plan-discovery-contract.sh"
& "C:\Program Files\Git\bin\bash.exe" `
  "plugins/shepherd-task/test/cargotracker-add-change-arrival-deadline-feature/12-session-outcome-contract.sh"
```

## Run the end-to-end control campaign

Install the current source first:

```powershell
.\plugins\shepherd-task\scripts\install-task-shepherd.ps1
```

Then run:

```powershell
.\plugins\shepherd-task\test\cargotracker-add-change-arrival-deadline-feature\20260904-run-control-experiment.ps1 `
  -RepositoryUrl 'https://github.com/OWNER/DISPOSABLE-CARGOTRACKER-FORK' `
  -WorkareasDir 'C:\workareas'
```

The control driver intentionally omits `-LessonPropagation` when invoking
stage 00. The resulting manifest must explicitly contain
`"lessonPropagation": "off"`.

The run is successful only when all five issues are closed, all linked pull
requests are merged serially, the repository-owned Maven/Open Liberty check
succeeds, stage 25 records a successful `off` run, and
`campaign-lessons.md` retains its initial placeholder. No cleanup is performed.
