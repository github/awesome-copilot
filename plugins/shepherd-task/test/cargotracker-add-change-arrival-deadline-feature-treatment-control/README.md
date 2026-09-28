# Cargo Tracker change-arrival-deadline treatment/control experiment

This fixture runs one `lessonPropagation=campaign` treatment and one
`lessonPropagation=off` control for the five-task Change Arrival Deadline
feature in Cargo Tracker.

Both campaigns start from the same immutable feature-absent commit:

```text
9b9f311b2a3a2854bdac947593950d9edb6bca7d
```

The fixture does not generate or copy Cargo Tracker domain source. The target
repository must be a disposable fork containing this required source branch:

```text
20260902-2104Z-commit-e7b651f-liberty
```

The fixture fetches that branch, verifies that the immutable feature-absent
commit is in its history, and creates the shared experiment baseline at the
exact commit. Later planning-only commits on the source branch are not included
in either campaign. Campaign initialization adds only:

- shepherd-task campaign metadata;
- the complete resolved ignorance-reduction plan;
- an identical GitHub Actions workflow that runs the existing Maven/Open
  Liberty package build on JDK 17.

There is no dependency on the `simple-math` fixture.

The experiment is real, paid, and long-running. It creates branches, issues,
pull requests, workflow runs, Copilot sessions, and commits. It intentionally
performs no automatic cleanup or rollback.

## Experiment model

The procedure creates three checkouts:

```text
<workareas>/
|-- <repository>-shepherd-target/
|-- <repository>-shepherd-treatment/
`-- <repository>-shepherd-control/
```

The primary checkout publishes `experiment/shepherd-shared-baseline` at the
exact prepared baseline SHA. The treatment and control worktrees are detached
from that SHA before their campaign initialization commits are created.

Each campaign contains five serial implementation issues:

1. Add the application-layer deadline change operation.
2. Expose the operation through the booking facade.
3. Implement the deadline editor backing model.
4. Implement the PrimeFaces deadline dialog.
5. Integrate deadline editing into the Administration dashboard.

Only tasks 2 through 5 can benefit from lessons validated by earlier tasks.

## Preconditions

- Create a disposable fork of Cargo Tracker.
- Ensure the fork contains branch
  `20260902-2104Z-commit-e7b651f-liberty`.
- Ensure commit `9b9f311b2a3a2854bdac947593950d9edb6bca7d`
  remains in that branch's history.
- Do not add the historical feature implementation to the fork.
- Enable GitHub Actions, Copilot Coding Agent, and Copilot code review.
- Authenticate `gh` with issue, PR, review, Actions, push, merge, and issue
  closing permissions.
- Authenticate Copilot CLI and accept that orchestration uses
  `copilot --yolo`.
- Install `git`, `gh`, `copilot`, and PowerShell 7 (`pwsh`).
- Ensure the three checkout paths do not already exist.
- Configure exactly one Git remote whose normalized GitHub URL matches the
  fork.
- Use a machine that can remain available for the duration of ten serial task
  implementations and their reviews.

The generated campaign workflow runs:

```text
./mvnw --batch-mode --no-transfer-progress clean package -Popenliberty
```

It uses JDK 17 and does not migrate the Java EE 7 application or execute the
remote Payara Arquillian suite.

## Install the source-of-record plugin

From the Awesome Copilot checkout:

```powershell
& .\plugins\shepherd-task\scripts\install-task-shepherd.ps1
```

Define the installed paths:

```powershell
$CopilotHome = if ($env:COPILOT_HOME) {
    $env:COPILOT_HOME
} else {
    Join-Path $HOME '.copilot'
}
$ShepherdPlugin = Join-Path $CopilotHome 'plugins\shepherd-task'
$Fixture = Join-Path $ShepherdPlugin `
    'test\cargotracker-add-change-arrival-deadline-feature'
```

Confirm the fixture was installed:

```powershell
if (-not (Test-Path -LiteralPath (
    Join-Path $Fixture '20260902-run-treatment-control-experiment.ps1'
))) {
    throw "Cargo Tracker shepherd fixture not found at $Fixture"
}
```

## Offline contracts

These checks perform no GitHub mutation:

```powershell
& "$Fixture\03-resolve-repository-remote.ps1"
& "$Fixture\05-stage20-artifact-contract.ps1"
& "$Fixture\06-stage40-review-contract.ps1"
& "$Fixture\07-driver-encoding-contract.ps1"
& "$Fixture\08-psncpps-contract.ps1"
& "$Fixture\09-skill-powershell-contract.ps1"
& "$Fixture\10-cargotracker-fixture-contract.ps1"
& "$Fixture\11-stage15-plan-discovery-contract.ps1"
& "$Fixture\12-session-outcome-contract.ps1"
& "$Fixture\13-resume-driver-contract.ps1"
& "$ShepherdPlugin\test\lesson-propagation-default-contract.ps1"
```

The unattended driver runs the stage-15 plan-discovery, stage-40,
session-outcome, recovery-driver, and driver-encoding contracts before
beginning the paid experiment.

## Unattended end-to-end driver

Run the complete experiment from the source checkout:

```powershell
& .\plugins\shepherd-task\test\cargotracker-add-change-arrival-deadline-feature\20260902-run-treatment-control-experiment.ps1 `
    -RepositoryUrl 'https://github.com/OWNER/DISPOSABLE-CARGOTRACKER-FORK' `
    -ComparisonDir 'C:\path\to\comparison-output'
```

Optionally override the worktree parent:

```powershell
& .\plugins\shepherd-task\test\cargotracker-add-change-arrival-deadline-feature\20260902-run-treatment-control-experiment.ps1 `
    -RepositoryUrl 'https://github.com/OWNER/DISPOSABLE-CARGOTRACKER-FORK' `
    -WorkareasDir 'D:\workareas' `
    -ComparisonDir 'D:\experiment-reports'
```

The driver:

1. Checks required commands, GitHub authentication, and installed skills.
2. Runs the selected offline contracts.
3. Clones the fork and rejects an empty or dirty checkout.
4. Fetches the required source branch and verifies it contains the prepared
   baseline SHA.
5. Publishes the immutable shared-baseline branch without changing source.
6. Creates persistent treatment and control worktrees at the baseline SHA.
7. Initializes both campaign branches with identical CI and plan content.
8. Creates and verifies five ordered child issues in each campaign.
9. Runs each five-issue campaign serially through stages 30, 40, and 50.
10. Fast-forwards and verifies both completed campaign worktrees.
11. Collects all post-first treatment stage-30 transcripts.
12. Generates a treatment/control comparison post-mortem and JSON summary.
13. Preserves all worktrees, branches, transcripts, ledgers, and reports.

## Resume the preserved September 2-3 experiment

The separate recovery driver does not clone, initialize campaigns, or create
issues. It validates the preserved campaign IDs, issue lists, branches,
baseline, and original failed control run. It then runs stage 25 only for the
unfinished suffix of the control issue list and includes both the failed and
recovery runs in the final comparison:

```powershell
& .\plugins\shepherd-task\test\cargotracker-add-change-arrival-deadline-feature\202609023-1638Z-run-treatment-control-experiment-resumeable.ps1 `
    -RepositoryUrl 'https://github.com/edburns/dd-3058828-01-cargotracker' `
    -ComparisonDir 'C:\Users\edburns\workareas\awesome-copilot-01\dd-3031763-improve-agentic-velocity-remove-before-merge\dd-3058828-01-cargotracker'
```

The source-of-record plugin must be reinstalled before invoking this driver.
The original `20260902-run-treatment-control-experiment.ps1` remains a
fresh-run-only driver.

## Manual execution

The same phases can be run manually.

### 1. Define paths and branches

```powershell
$Repo = 'OWNER/DISPOSABLE-CARGOTRACKER-FORK'
$Target = 'C:\workareas\cargotracker-shepherd-target'
$TreatmentWorktree = 'C:\workareas\cargotracker-shepherd-treatment'
$ControlWorktree = 'C:\workareas\cargotracker-shepherd-control'

$BaselineBranch = 'experiment/shepherd-shared-baseline'
$SourceBranch = '20260902-2104Z-commit-e7b651f-liberty'
$TreatmentBranch = 'experiment/shepherd-treatment'
$ControlBranch = 'experiment/shepherd-control'
```

### 2. Clone and publish the exact baseline

```powershell
git clone "https://github.com/$Repo.git" $Target
Set-Location $Target

& "$Fixture\00-prepare-test-baseline.ps1" `
    -Repo $Repo `
    -BaselineBranch $BaselineBranch `
    -SourceBranch $SourceBranch

$BaselineSha = (git rev-parse HEAD).Trim()
if ($BaselineSha -ne '9b9f311b2a3a2854bdac947593950d9edb6bca7d') {
    throw "Unexpected baseline SHA: $BaselineSha"
}
```

### 3. Create persistent worktrees

```powershell
git -C $Target worktree add --detach $TreatmentWorktree $BaselineSha
if ($LASTEXITCODE -ne 0) {
    throw 'Failed to create the treatment worktree.'
}

git -C $Target worktree add --detach $ControlWorktree $BaselineSha
if ($LASTEXITCODE -ne 0) {
    throw 'Failed to create the control worktree.'
}
```

### 4. Initialize both campaigns

```powershell
Set-Location $TreatmentWorktree
& "$Fixture\01-prepare-base-branch.ps1" `
    -Repo $Repo `
    -BaseBranch $TreatmentBranch `
    -CampaignShortname 'arrival-deadline-treatment' `
    -LessonPropagation campaign `
    -BaselineSha $BaselineSha

Set-Location $ControlWorktree
& "$Fixture\01-prepare-base-branch.ps1" `
    -Repo $Repo `
    -BaseBranch $ControlBranch `
    -CampaignShortname 'arrival-deadline-control' `
    -LessonPropagation off `
    -BaselineSha $BaselineSha
```

Locate the campaign directories:

```powershell
$TreatmentDirectory = Get-ChildItem -LiteralPath $TreatmentWorktree -Directory |
    Where-Object Name -Like '*-arrival-deadline-treatment-remove-before-merge'
$ControlDirectory = Get-ChildItem -LiteralPath $ControlWorktree -Directory |
    Where-Object Name -Like '*-arrival-deadline-control-remove-before-merge'

if (@($TreatmentDirectory).Count -ne 1 -or @($ControlDirectory).Count -ne 1) {
    throw 'Expected exactly one treatment and one control campaign directory.'
}

$TreatmentDirectoryName = $TreatmentDirectory.Name
$ControlDirectoryName = $ControlDirectory.Name
```

Each directory contains
`add-change-arrival-deadline-feature-ignorance-reduction-plan.md` with the
literal completed plan embedded in `01-prepare-base-branch.ps1`.

### 5. Create and verify the child issues

```powershell
Set-Location $TreatmentWorktree
& "$Fixture\02-create-issues.ps1" `
    -CampaignMetadataDirectory $TreatmentDirectoryName

Set-Location $ControlWorktree
& "$Fixture\02-create-issues.ps1" `
    -CampaignMetadataDirectory $ControlDirectoryName
```

Read each `shepherd-test-experiment-handoff.json` to obtain its ordered
five-issue list. Preserve the local prompt directories and ledgers.

### 6. Run both campaigns serially

```powershell
Set-Location $TreatmentWorktree
& "$ShepherdPlugin\scripts\shepherd-task-25-given-list.ps1" `
    -TaskIssues 'TREATMENT_ISSUE_CSV' `
    -CampaignMetadataDirectory $TreatmentDirectoryName

Set-Location $ControlWorktree
& "$ShepherdPlugin\scripts\shepherd-task-25-given-list.ps1" `
    -TaskIssues 'CONTROL_ISSUE_CSV' `
    -CampaignMetadataDirectory $ControlDirectoryName
```

Do not start later issues manually. Stage 25 must enforce that each prior task
merges before the next one is assigned.

### 7. Verify both completed campaigns

```powershell
Set-Location $TreatmentWorktree
git pull --ff-only
& "$Fixture\04-verify-lesson-experiment.ps1" `
    -CampaignMetadataDirectory $TreatmentDirectoryName

Set-Location $ControlWorktree
git pull --ff-only
& "$Fixture\04-verify-lesson-experiment.ps1" `
    -CampaignMetadataDirectory $ControlDirectoryName
```

The verifier checks:

- the exact shared baseline and campaign identities;
- five ordered issues and serial PR timing;
- actual persisted issue bodies;
- treatment/control lesson instructions;
- validated lesson publication in treatment;
- an unchanged lesson placeholder in control;
- a successful substantive `Shepherd task Cargo Tracker` check on every final
  PR head.

## Evidence review

Compare:

- all five paired tasks;
- first-task behavior, which cannot benefit from prior lessons;
- treatment tasks 2–5, which receive progressively accumulated lessons;
- control tasks 2–5, which receive only merged code, tests, issue
  specifications, and CI;
- elapsed time, session time, review rounds, findings, retries, and final
  outcomes;
- whether treatment lessons added information beyond executable artifacts;
- whether delivered lessons were observably applied rather than merely
  available.

An n=1 treatment/control experiment demonstrates mechanism behavior and
provides comparative evidence. It does not establish general causal efficacy.

## Cleanup

Archive all untracked prompt, ledger, transcript, OTEL, and report artifacts
before cleanup.

Then:

1. Close leftover issues and pull requests.
2. Inspect each worktree with `git status --short`.
3. Delete remote experiment branches only when they are no longer needed.
4. Remove worktrees only after their untracked evidence has been archived or
   intentionally discarded.

There is intentionally no automated destructive cleanup.
