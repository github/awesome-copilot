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

The resolved five-task plan is stored as `cargotracker-plan.md.gz.b64`. The
Bash initializer verifies its SHA-256 digest before decoding it, preserving the
exact fixture content across installed and checked-out locations.

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

- Bash 4.4+ on Linux, macOS, or Git Bash, or PowerShell 7
- Bash driver: `bash`, `git`, `gh`, `copilot`, `jq`, `find`, `base64`,
  `gzip`, and either `sha256sum` or `shasum` on `PATH`
- PowerShell driver: `git`, `gh`, `copilot`, and `pwsh` on `PATH`
- Authenticated GitHub CLI
- A disposable Cargo Tracker fork containing the fixed source branch and
  baseline commit
- Actions, Copilot Coding Agent, and Copilot code review enabled
- The shepherd-task plugin and skills installed from this checkout

The target and control-worktree paths must not already exist. The remote
baseline and control branch names must also be unused.

Install the current plugin before running either driver:

```bash
plugins/shepherd-task/scripts/install-task-shepherd.sh
```

Both drivers resolve the installed fixture and stage scripts from
`${COPILOT_HOME:-$HOME/.copilot}/plugins/shepherd-task`; they do not require
the source checkout as their working directory.

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

The native Bash contracts can be run from any working directory:

```bash
fixture="plugins/shepherd-task/test/cargotracker-add-change-arrival-deadline-feature"
for contract in \
  03-resolve-repository-remote.sh \
  05-stage20-artifact-contract.sh \
  06-stage40-review-contract.sh \
  07-driver-encoding-contract.sh \
  08-psncpps-contract.sh \
  09-skill-powershell-contract.sh \
  10-cargotracker-fixture-contract.sh \
  11-stage15-plan-discovery-contract.sh \
  12-session-outcome-contract.sh; do
  "$fixture/$contract"
done
```

These contracts are offline and non-paid. They use local mock GitHub responses
where API behavior must be exercised. They do not create issues, invoke
Copilot, push branches, or run the end-to-end campaign.

## Run the end-to-end control campaign

Install the current source first:

```powershell
.\plugins\shepherd-task\scripts\install-task-shepherd.ps1
```

Then run:

```powershell
.\plugins\shepherd-task\test\cargotracker-add-change-arrival-deadline-feature\run-campaign.ps1 `
  -RepositoryUrl 'https://github.com/OWNER/DISPOSABLE-CARGOTRACKER-FORK' `
  -WorkareasDir 'C:\workareas'
```

Or run the native Bash driver:

```bash
"${COPILOT_HOME:-$HOME/.copilot}/plugins/shepherd-task/test/cargotracker-add-change-arrival-deadline-feature/run-campaign.sh" \
  --repository-url 'https://github.com/OWNER/DISPOSABLE-CARGOTRACKER-FORK' \
  --workareas-dir "$HOME/workareas"
```

To validate the installed Bash layout and all offline integration contracts
without cloning, creating issues, or invoking paid Copilot operations:

```bash
"${COPILOT_HOME:-$HOME/.copilot}/plugins/shepherd-task/test/cargotracker-add-change-arrival-deadline-feature/run-campaign.sh" \
  --repository-url 'https://github.com/OWNER/REPOSITORY' \
  --workareas-dir "$HOME/workareas" \
  --validate-installed-only
```

Use `--show-domain-fixture-output`, `--show-shepherd-task-script-output`,
`--show-contract-output`, or `--show-native-tool-output` for individual output
channels, or `--show-all-output` for all of them.

Use `-ValidateInstalledOnly` for the equivalent non-mutating installed-layout
validation in PowerShell.

The control driver intentionally omits `-LessonPropagation` when invoking
stage 00. The resulting manifest must explicitly contain
`"lessonPropagation": "off"`.

The run is successful only when all five issues are closed, all linked pull
requests are merged serially, the repository-owned Maven/Open Liberty check
succeeds, stage 25 records a successful `off` run, and
`campaign-lessons.md` retains its initial placeholder. No cleanup is performed.
