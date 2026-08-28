# Shepherd-task lesson propagation mechanism experiment

This fixture runs one `lessonPropagation=campaign` treatment and one
`lessonPropagation=off` control from the same immutable baseline SHA. It uses
`git worktree` so the baseline, treatment, and control checkouts remain
available simultaneously.

The experiment is real, paid, and long-running. It creates branches, issues,
pull requests, workflow runs, Copilot sessions, and commits. Use only a
disposable, fresh repository.

An n=1 treatment/control comparison verifies the lesson-propagation mechanism
and produces evidence for manual inspection. It does not establish statistical
efficacy or prove causal productivity. Both campaigns eventually receive the
merged issue-1 implementation; the experimental difference is whether
validated campaign lessons are available to issue 2.

## Worktree model

The procedure creates three checkouts of the disposable repository:

```text
<worktree-parent>/
|-- shepherd-target/       Primary checkout and shared-baseline branch
|-- shepherd-treatment/    Treatment campaign branch and artifacts
`-- shepherd-control/      Control campaign branch and artifacts
```

The treatment and control worktrees remain checked out on their respective
campaign branches. Therefore:

- `$TreatmentDirectory` is an absolute path to the treatment campaign
  metadata directory.
- `$ControlDirectory` is an absolute path to the control campaign metadata
  directory.
- Both paths exist and are valid at the same time.
- `$TreatmentDirectoryName` and `$ControlDirectoryName` are the corresponding
  repository-root-relative basenames required by the shepherd scripts.

Run all commands in one PowerShell session so these variables remain defined.

## Preconditions

Before starting:

- Create or select a disposable GitHub repository whose default branch has at
  least one commit.
- Enable GitHub Actions, Copilot Coding Agent (CCA), and Copilot code review in
  that repository.
- Be prepared to approve the first Actions runs created from Copilot-authored
  branches. Stage 30 must observe the substantive math-tool check rather than
  an empty or selector-only check set.
- Authenticate `gh` with issue, PR, review, Actions, push, merge, and issue
  closing permissions.
- Authenticate Copilot CLI and accept that shepherd orchestration uses
  `copilot --yolo`.
- Install `git`, `gh`, `copilot`, `jq`, `uuidgen`, and PowerShell 7 (`pwsh`).
- Use a machine that can remain available for days and can run the
  repository's PowerShell gating command.
- Configure exactly one Git remote whose GitHub URL matches `OWNER/REPO`. Its
  name may be `origin`, `upstream`, or another name.
- Use distinct non-`main` names for the baseline, treatment, and control
  branches.
- Use distinct filesystem paths for the primary, treatment, and control
  worktrees.
- Ensure the treatment and control worktree paths do not already exist.
- Be able to approve Actions runs and push, merge, and close test resources.

Personal repositories are supported with ordinary untyped issues.
Organization issue type `Task` is preferred when enabled but is not required.

## 1. Define the session variables

Set all paths before changing directories:

```powershell
$Source = '/absolute/path/to/awesome-copilot'
$Repo = 'OWNER/DISPOSABLE-REPO'
$Target = '/absolute/path/to/worktree-parent/shepherd-target'
$TreatmentWorktree = '/absolute/path/to/worktree-parent/shepherd-treatment'
$ControlWorktree = '/absolute/path/to/worktree-parent/shepherd-control'

$BaselineBranch = 'experiment/shepherd-shared-baseline'
$TreatmentBranch = 'experiment/shepherd-treatment'
$ControlBranch = 'experiment/shepherd-control'

$CopilotHome = if ($env:COPILOT_HOME) {
    $env:COPILOT_HOME
} else {
    Join-Path $HOME '.copilot'
}
$ShepherdPlugin = Join-Path $CopilotHome 'plugins/shepherd-task'
```

`$Source` is used only to run the installer. All fixture and shepherd commands
after installation use `$ShepherdPlugin`.

## 2. Install shepherd-task

Run the installer from the Awesome Copilot source checkout before invoking any
fixture:

```powershell
& "$Source/plugins/shepherd-task/scripts/install-task-shepherd.ps1"
```

Confirm installation:

```powershell
if (-not (Test-Path "$ShepherdPlugin/test/00-prepare-test-baseline.ps1")) {
    throw "Installed shepherd-task test fixture was not found at $ShepherdPlugin."
}
copilot skill list
```

Do not continue until the installer succeeds and the shepherd-task skills are
listed.

## 3. Create the disposable repository and primary checkout

The default branch must have at least one commit. The following creates a
private repository with an initial README commit:

```powershell
gh repo create $Repo --private --add-readme
git clone "https://github.com/$Repo.git" $Target
Set-Location $Target

if (git status --porcelain) {
    throw 'The primary target checkout is not clean.'
}
```

If the repository already exists, clone it into `$Target` instead of running
`gh repo create`.

## 4. Create the deterministic shared baseline

Run the baseline fixture once in the primary checkout:

```powershell
Set-Location $Target
& "$ShepherdPlugin/test/00-prepare-test-baseline.ps1" `
  -Repo $Repo `
  -BaselineBranch $BaselineBranch

$BaselineSha = (git rev-parse HEAD).Trim()
if ($BaselineSha -notmatch '^[0-9a-f]{40}$') {
    throw "Invalid baseline SHA: $BaselineSha"
}
```

The baseline commit contains:

```text
.github/workflows/shepherd-task-math-tool.yml
eng/test-math-tool.ps1
```

The workflow installs an exact Pester version and runs the repository-owned
test command. Record `$BaselineSha`; both campaigns must start from that exact
commit.

## 5. Create persistent treatment and control worktrees

Create two detached worktrees at the same baseline commit. Script 01 will
create and check out the campaign branch inside each worktree:

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

Confirm that both worktrees start at the same commit:

```powershell
$TreatmentStart = (git -C $TreatmentWorktree rev-parse HEAD).Trim()
$ControlStart = (git -C $ControlWorktree rev-parse HEAD).Trim()
if ($TreatmentStart -ne $BaselineSha -or $ControlStart -ne $BaselineSha) {
    throw 'Treatment and control worktrees do not share the baseline SHA.'
}

git -C $Target worktree list
```

## 6. Initialize both campaign branches

Initialize the treatment campaign in its worktree:

```powershell
Set-Location $TreatmentWorktree
& "$ShepherdPlugin/test/01-prepare-base-branch.ps1" `
  -Repo $Repo `
  -BaseBranch $TreatmentBranch `
  -CampaignShortname 'math-treatment' `
  -LessonPropagation campaign `
  -BaselineSha $BaselineSha

$TreatmentMatches = @(
    Get-ChildItem -Path $TreatmentWorktree -Directory `
      -Filter '*-math-treatment-remove-before-merge'
)
if ($TreatmentMatches.Count -ne 1) {
    throw "Expected one treatment campaign directory; found $($TreatmentMatches.Count)."
}
$TreatmentDirectory = $TreatmentMatches[0].FullName
$TreatmentDirectoryName = $TreatmentMatches[0].Name
```

Initialize the control campaign independently in its worktree:

```powershell
Set-Location $ControlWorktree
& "$ShepherdPlugin/test/01-prepare-base-branch.ps1" `
  -Repo $Repo `
  -BaseBranch $ControlBranch `
  -CampaignShortname 'math-control' `
  -LessonPropagation off `
  -BaselineSha $BaselineSha

$ControlMatches = @(
    Get-ChildItem -Path $ControlWorktree -Directory `
      -Filter '*-math-control-remove-before-merge'
)
if ($ControlMatches.Count -ne 1) {
    throw "Expected one control campaign directory; found $($ControlMatches.Count)."
}
$ControlDirectory = $ControlMatches[0].FullName
$ControlDirectoryName = $ControlMatches[0].Name
```

Verify that both campaign directories and both worktrees are simultaneously
available:

```powershell
foreach ($path in @(
    $TreatmentWorktree,
    $ControlWorktree,
    $TreatmentDirectory,
    $ControlDirectory
)) {
    if (-not (Test-Path -LiteralPath $path -PathType Container)) {
        throw "Expected directory does not exist: $path"
    }
}

$TreatmentInitParent = (git -C $TreatmentWorktree rev-parse 'HEAD^').Trim()
$ControlInitParent = (git -C $ControlWorktree rev-parse 'HEAD^').Trim()
if ($TreatmentInitParent -ne $BaselineSha -or
    $ControlInitParent -ne $BaselineSha) {
    throw 'A campaign initialization commit does not descend directly from the shared baseline.'
}
```

At this point `$TreatmentDirectory` and `$ControlDirectory` are valid absolute
paths at the same time. Do not remove either worktree until the experiment and
evidence review are complete.

## 7. Create and verify both sets of child issues

Run stage 15 and stage 20 in each persistent campaign worktree:

```powershell
Set-Location $TreatmentWorktree
& "$ShepherdPlugin/test/02-create-issues.ps1" `
  -CampaignMetadataDirectory $TreatmentDirectoryName

Set-Location $ControlWorktree
& "$ShepherdPlugin/test/02-create-issues.ps1" `
  -CampaignMetadataDirectory $ControlDirectoryName
```

Stage 20 may create ordinary untyped issues in a personal repository. The
fixture verifies the actual issue bodies and does not require an issue type.

Load the ordered issue lists from the local handoff evidence:

```powershell
$TreatmentHandoffFiles = @(
    Get-ChildItem -Path $TreatmentDirectory -Recurse -File `
      -Filter 'shepherd-test-experiment-handoff.json'
)
if ($TreatmentHandoffFiles.Count -ne 1) {
    throw "Expected one treatment handoff; found $($TreatmentHandoffFiles.Count)."
}
$TreatmentHandoff = Get-Content $TreatmentHandoffFiles[0].FullName -Raw |
    ConvertFrom-Json
$TreatmentIssueList = @($TreatmentHandoff.issueNumbers) -join ','

$ControlHandoffFiles = @(
    Get-ChildItem -Path $ControlDirectory -Recurse -File `
      -Filter 'shepherd-test-experiment-handoff.json'
)
if ($ControlHandoffFiles.Count -ne 1) {
    throw "Expected one control handoff; found $($ControlHandoffFiles.Count)."
}
$ControlHandoff = Get-Content $ControlHandoffFiles[0].FullName -Raw |
    ConvertFrom-Json
$ControlIssueList = @($ControlHandoff.issueNumbers) -join ','
```

The handoff files and stage-20 ledgers are intentionally local and untracked.
Because each campaign has its own persistent worktree, both evidence trees
remain available. Do not run `git clean` or delete either campaign's `prompts`
directory.

## 8. Run both stage-25 campaigns

Run the campaigns serially to reduce resource contention and simplify
observation. Do not start issue 2 manually; stage 25 must start it only after
issue 1 merges into the same campaign base branch.

Treatment:

```powershell
Set-Location $TreatmentWorktree
& "$ShepherdPlugin/scripts/shepherd-task-25-given-list.ps1" `
  -LessonPropagation campaign `
  -TaskIssues $TreatmentIssueList `
  -CampaignMetadataDirectory $TreatmentDirectoryName
```

Control:

```powershell
Set-Location $ControlWorktree
& "$ShepherdPlugin/scripts/shepherd-task-25-given-list.ps1" `
  -LessonPropagation off `
  -TaskIssues $ControlIssueList `
  -CampaignMetadataDirectory $ControlDirectoryName
```

Preserve every generated run directory, Copilot transcript, OTEL artifact,
stage-20 handoff, and creation ledger until verification is complete.

## 9. Update and verify both completed campaigns

After stage 25 completes, update each persistent worktree from its configured
remote:

```powershell
Set-Location $TreatmentWorktree
git pull --ff-only
& "$ShepherdPlugin/test/04-verify-lesson-experiment.ps1" `
  -CampaignMetadataDirectory $TreatmentDirectoryName

Set-Location $ControlWorktree
git pull --ff-only
& "$ShepherdPlugin/test/04-verify-lesson-experiment.ps1" `
  -CampaignMetadataDirectory $ControlDirectoryName
```

The verifier checks:

- campaign identity and shared baseline metadata;
- exactly two ordered issues;
- treatment/control issue-body differences;
- closed issues and serial PR timing;
- successful substantive CI on the final PR heads;
- treatment validated-lesson sections with no remaining candidate sections;
- exact preservation of the initial lessons placeholder in the control.

## 10. Compare both campaigns simultaneously

Because the campaigns use persistent worktrees, both lesson files and both
artifact trees can be inspected without switching branches:

```powershell
$TreatmentLessons = Join-Path $TreatmentDirectory 'campaign-lessons.md'
$ControlLessons = Join-Path $ControlDirectory 'campaign-lessons.md'

Get-Content -LiteralPath $TreatmentLessons
Get-Content -LiteralPath $ControlLessons
```

Expected treatment evolution:

```text
initial placeholder
-> validated issue-1 section
-> validated issue-1 and issue-2 sections
```

Expected control state:

```text
initial placeholder remains unchanged
```

Perform the verifier's `MANUAL CHECK`: inspect treatment issue 2's stage-30
session artifacts and PR changes for evidence that issue 1's validated lesson
was read and applied. The expected transferable category is a non-obvious,
repository-tested implementation pattern that lets dot-sourced unit tests
coexist with direct CLI execution. Task 2 does not prescribe that pattern.

PR prose alone is not automatic proof of lesson use.

## Expected checkpoints

- The baseline workflow and canonical test runner exist before both campaigns.
- Both campaign initialization commits have `$BaselineSha` as their direct
  parent.
- The treatment and control worktrees remain available simultaneously.
- `$TreatmentDirectory` and `$ControlDirectory` are simultaneously valid
  absolute paths.
- Treatment issue bodies contain campaign-lesson instructions.
- Control issue bodies contain no campaign-lesson instructions.
- Treatment `campaign-lessons.md` evolves from its placeholder to validated
  issue 1 and then validated issues 1 and 2.
- Control `campaign-lessons.md` remains the exact initial placeholder.
- Issue 2 starts only after issue 1's PR merges within each campaign.
- Final PR heads have a successful substantive `Shepherd task math tool`
  check.
- Semantic lesson use is evaluated manually rather than inferred solely from
  mechanism state.

## Cleanup

Capture and archive all evidence before cleanup. The worktrees contain
untracked prompts, ledgers, run manifests, transcripts, and OTEL files that
ordinary Git commits do not preserve.

After archiving:

1. Close any leftover issues and pull requests.
2. Inspect `git status --short` separately in `$TreatmentWorktree` and
   `$ControlWorktree`.
3. Delete remote experiment branches only when they are no longer needed.
4. Remove each worktree only after confirming its untracked evidence has been
   archived or intentionally discarded.

There is intentionally no automated destructive cleanup or rollback.
