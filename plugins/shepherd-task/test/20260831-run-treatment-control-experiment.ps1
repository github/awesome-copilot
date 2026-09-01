<#
.SYNOPSIS
    Runs the shepherd-task treatment/control mechanism experiment end to end.

.DESCRIPTION
    Uses the installed shepherd-task plugin, prepares one immutable baseline,
    runs campaign lesson propagation treatment and control arms serially,
    verifies both completed campaigns, and preserves all evidence.

    This script performs real paid GitHub and Copilot operations. It is
    intentionally fail-fast and does not clean up branches, issues, pull
    requests, worktrees, or untracked evidence after a failure or success.

.PARAMETER RepositoryUrl
    Fully qualified HTTPS URL of a fresh disposable GitHub repository.

.PARAMETER WorkareasDir
    Parent directory for the primary, treatment, and control Git worktrees.
    Defaults to the workareas directory in the current user's home directory.

.PARAMETER ComparisonDir
    Directory in which the final treatment-control comparison post-mortem is
    written. Defaults to the directory from which this script is invoked.

.EXAMPLE
    .\20260831-run-treatment-control-experiment.ps1

.EXAMPLE
    .\20260831-run-treatment-control-experiment.ps1 `
      -RepositoryUrl https://github.com/OWNER/DISPOSABLE-REPOSITORY `
      -WorkareasDir D:\workareas `
      -ComparisonDir D:\experiment-reports
#>

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateNotNullOrEmpty()]
    [string]$RepositoryUrl = 'https://github.com/edburns/dd-3057440',

    [Parameter(Position = 1)]
    [ValidateNotNullOrEmpty()]
    [string]$WorkareasDir = (Join-Path $HOME 'workareas'),

    [Parameter(Position = 2)]
    [ValidateNotNullOrEmpty()]
    [string]$ComparisonDir = (Get-Location).Path
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (Test-Path Variable:\PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$initialLocation = (Get-Location).Path
$experimentStartedAt = [DateTimeOffset]::Now
$currentPhase = 'preflight'
$Target = $null
$TreatmentWorktree = $null
$ControlWorktree = $null
$TreatmentDirectory = $null
$ControlDirectory = $null

function Write-ExperimentStatus {
    param([Parameter(Mandatory)][string]$Message)
    Write-Host "[shepherd-experiment] $Message"
}

function Invoke-CheckedPwshScript {
    param(
        [Parameter(Mandatory)][string]$Path,
        [string[]]$Arguments = @()
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Required PowerShell script was not found: $Path"
    }

    & pwsh -NoLogo -NoProfile -File $Path @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "PowerShell script failed with exit code $LASTEXITCODE`: $Path"
    }
}

function Assert-NativeSuccess {
    param([Parameter(Mandatory)][string]$Operation)
    if ($LASTEXITCODE -ne 0) {
        throw "$Operation failed with exit code $LASTEXITCODE."
    }
}

function Get-CampaignDirectory {
    param(
        [Parameter(Mandatory)][string]$Worktree,
        [Parameter(Mandatory)][string]$Shortname
    )

    $matches = @(
        Get-ChildItem -LiteralPath $Worktree -Directory |
            Where-Object { $_.Name -like "*-$Shortname-remove-before-merge" }
    )
    if ($matches.Count -ne 1) {
        throw "Expected one '$Shortname' campaign directory in '$Worktree'; found $($matches.Count)."
    }
    return $matches[0]
}

function Get-CampaignHandoff {
    param([Parameter(Mandatory)][string]$CampaignDirectory)

    $handoffFiles = @(
        Get-ChildItem -LiteralPath $CampaignDirectory -Recurse -File `
            -Filter 'shepherd-test-experiment-handoff.json'
    )
    if ($handoffFiles.Count -ne 1) {
        throw "Expected one experiment handoff under '$CampaignDirectory'; found $($handoffFiles.Count)."
    }

    try {
        $handoff = Get-Content -LiteralPath $handoffFiles[0].FullName -Raw |
            ConvertFrom-Json
    }
    catch {
        throw "Experiment handoff is invalid JSON: $($handoffFiles[0].FullName). $($_.Exception.Message)"
    }

    $issueNumbers = @($handoff.issueNumbers)
    if ($issueNumbers.Count -ne 2 -or
        @($issueNumbers | Where-Object { $_ -notmatch '^[1-9][0-9]*$' }).Count -ne 0) {
        throw "Experiment handoff must contain exactly two positive issue numbers: $($handoffFiles[0].FullName)"
    }

    return [pscustomobject]@{
        Path = $handoffFiles[0].FullName
        Data = $handoff
        IssueNumbers = @([int]$issueNumbers[0], [int]$issueNumbers[1])
        IssueList = ($issueNumbers -join ',')
    }
}

function Get-OnlyCompletedRunDirectory {
    param([Parameter(Mandatory)][string]$CampaignDirectory)

    $completedRuns = @(
        Get-ChildItem -LiteralPath $CampaignDirectory -Directory `
            -Filter 'shepherd-tasks-*' |
            Where-Object {
                $manifestPath = Join-Path $_.FullName 'shepherd-task-25-given-list-run.json'
                if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
                    return $false
                }
                try {
                    $manifest = Get-Content -LiteralPath $manifestPath -Raw |
                        ConvertFrom-Json
                    return $manifest.status -eq 'succeeded' -and $manifest.exitCode -eq 0
                }
                catch {
                    return $false
                }
            }
    )
    if ($completedRuns.Count -ne 1) {
        throw "Expected one successful stage-25 run under '$CampaignDirectory'; found $($completedRuns.Count)."
    }
    return $completedRuns[0]
}

function Get-OrCreatePostMortem {
    param(
        [Parameter(Mandatory)][string]$RunDirectory,
        [Parameter(Mandatory)][string]$Worktree,
        [Parameter(Mandatory)][string]$CampaignDirectory,
        [Parameter(Mandatory)][string]$CampaignDirectoryName,
        [Parameter(Mandatory)][string]$IssueList,
        [Parameter(Mandatory)][ValidateSet('off', 'campaign')][string]$LessonPropagation,
        [Parameter(Mandatory)][string]$BaseBranch,
        [Parameter(Mandatory)][string]$Repository
    )

    $postMortems = @(
        Get-ChildItem -LiteralPath $RunDirectory -File `
            -Filter '*-post-mortem.md'
    )
    if ($postMortems.Count -eq 1) {
        return $postMortems[0]
    }
    if ($postMortems.Count -gt 1) {
        throw "Expected at most one post-mortem in '$RunDirectory'; found $($postMortems.Count)."
    }

    $campaignManifestPath = Join-Path $CampaignDirectory 'shepherd-campaign.json'
    try {
        $campaign = Get-Content -LiteralPath $campaignManifestPath -Raw |
            ConvertFrom-Json
    }
    catch {
        throw "Unable to read campaign manifest for post-mortem recovery: $campaignManifestPath. $($_.Exception.Message)"
    }

    $postMortemPath = Join-Path $RunDirectory (
        (Get-Date -Format 'yyyyMMdd-HHmmss') +
        '-post-mortem.md'
    )
    $prompt = @"
Invoke skill ``shepherd-task-50-create-post-mortem`` with these inputs:
- SHEPHERD_LOG_DIR: $RunDirectory
- SCRIPT_EXIT_CODE: 0
- TASK_ISSUES: $IssueList
- BASE_BRANCH: $BaseBranch
- REPO: $Repository
- CAMPAIGN_ID: $($campaign.campaignId)
- CAMPAIGN_METADATA_DIRECTORY: $CampaignDirectoryName
- LESSON_PROPAGATION: $LessonPropagation

Write the report to:
- OUTPUT_FILE: $postMortemPath
"@

    Write-ExperimentStatus "No campaign post-mortem was found; regenerating it at: $postMortemPath"
    Set-Location -LiteralPath $Worktree
    $prompt | copilot --yolo
    if ($LASTEXITCODE -ne 0) {
        throw "Post-mortem recovery failed with exit code $LASTEXITCODE for '$RunDirectory'."
    }
    if (-not (Test-Path -LiteralPath $postMortemPath -PathType Leaf) -or
        (Get-Item -LiteralPath $postMortemPath).Length -eq 0) {
        throw "Post-mortem recovery did not create a nonempty report: $postMortemPath"
    }
    return Get-Item -LiteralPath $postMortemPath
}

try {
    $currentPhase = 'validating repository URL'
    $repositoryMatch = [regex]::Match(
        $RepositoryUrl.Trim(),
        '^https://github\.com/(?<owner>[A-Za-z0-9_.-]+)/(?<name>[A-Za-z0-9_.-]+?)(?:\.git)?/?$',
        [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
    )
    if (-not $repositoryMatch.Success) {
        throw 'RepositoryUrl must be a fully qualified HTTPS GitHub repository URL.'
    }

    $repositoryOwner = $repositoryMatch.Groups['owner'].Value
    $repositoryName = $repositoryMatch.Groups['name'].Value
    $Repo = "$repositoryOwner/$repositoryName"
    $canonicalRepositoryUrl = "https://github.com/$Repo"
    $cloneUrl = "$canonicalRepositoryUrl.git"

    $WorkareasDir = [IO.Path]::GetFullPath($WorkareasDir)
    $ComparisonDir = [IO.Path]::GetFullPath($ComparisonDir)
    $Target = Join-Path $WorkareasDir "$repositoryName-shepherd-target"
    $TreatmentWorktree = Join-Path $WorkareasDir "$repositoryName-shepherd-treatment"
    $ControlWorktree = Join-Path $WorkareasDir "$repositoryName-shepherd-control"

    $BaselineBranch = 'experiment/shepherd-shared-baseline'
    $TreatmentBranch = 'experiment/shepherd-treatment'
    $ControlBranch = 'experiment/shepherd-control'

    $CopilotHome = if ($env:COPILOT_HOME) {
        $env:COPILOT_HOME
    } else {
        Join-Path $HOME '.copilot'
    }
    $ShepherdPlugin = Join-Path $CopilotHome 'plugins\shepherd-task'

    Write-Host '=== shepherd-task treatment/control experiment ===' -ForegroundColor Cyan
    Write-Host "Repository:          $Repo"
    Write-Host "Repository URL:      $canonicalRepositoryUrl"
    Write-Host "Workareas directory: $WorkareasDir"
    Write-Host "Comparison directory: $ComparisonDir"
    Write-Host "Shepherd plugin:     $ShepherdPlugin"
    Write-Host "Primary checkout:    $Target"
    Write-Host "Treatment worktree:  $TreatmentWorktree"
    Write-Host "Control worktree:    $ControlWorktree"
    Write-Host "Baseline branch:     $BaselineBranch"
    Write-Host "Treatment branch:    $TreatmentBranch"
    Write-Host "Control branch:      $ControlBranch"
    Write-Host ''

    $currentPhase = 'checking required commands'
    foreach ($commandName in @('git', 'gh', 'copilot', 'pwsh')) {
        if (-not (Get-Command $commandName -ErrorAction SilentlyContinue)) {
            throw "Required command was not found on PATH: $commandName"
        }
    }

    gh auth status
    Assert-NativeSuccess 'GitHub CLI authentication check'

    if (-not (Test-Path -LiteralPath $WorkareasDir -PathType Container)) {
        New-Item -ItemType Directory -Path $WorkareasDir -Force | Out-Null
    }
    $WorkareasDir = (Resolve-Path -LiteralPath $WorkareasDir).Path
    if (-not (Test-Path -LiteralPath $ComparisonDir -PathType Container)) {
        New-Item -ItemType Directory -Path $ComparisonDir -Force | Out-Null
    }
    $ComparisonDir = (Resolve-Path -LiteralPath $ComparisonDir).Path

    foreach ($path in @($Target, $TreatmentWorktree, $ControlWorktree)) {
        if (Test-Path -LiteralPath $path) {
            throw "Experiment path already exists. Preserve or remove it before starting a new experiment: $path"
        }
    }

    $currentPhase = 'checking installed shepherd-task'
    $installedBaselineFixture = Join-Path $ShepherdPlugin 'test\00-prepare-test-baseline.ps1'
    if (-not (Test-Path -LiteralPath $installedBaselineFixture -PathType Leaf)) {
        throw "Installed shepherd-task test fixture was not found at '$ShepherdPlugin'. Install shepherd-task before running this driver."
    }

    $skillListResult = & (Join-Path $PSScriptRoot 'get-copilot-skill-list.ps1')
    $skillList = @($skillListResult.Output)
    if ($skillListResult.ExitCode -ne 0) {
        throw "Unable to list installed Copilot skills: $($skillList -join [Environment]::NewLine)"
    }
    $skillList | ForEach-Object { Write-Host $_ }
    foreach ($skillName in @(
        'shepherd-task-20-create-issues-from-plan',
        'shepherd-task-30-from-assignment-to-ready',
        'shepherd-task-40-from-ready-to-merged-to-base',
        'shepherd-task-50-create-post-mortem'
    )) {
        if (($skillList -join "`n") -notmatch [regex]::Escape($skillName)) {
            throw "Required Copilot skill is not listed after installation: $skillName"
        }
    }

    $currentPhase = 'running offline contracts'
    Write-ExperimentStatus 'Running offline stage-20, stage-40, and driver encoding contract checks...'
    Invoke-CheckedPwshScript -Path (Join-Path $ShepherdPlugin 'test\05-stage20-artifact-contract.ps1')
    Invoke-CheckedPwshScript -Path (Join-Path $ShepherdPlugin 'test\06-stage40-review-contract.ps1')
    Invoke-CheckedPwshScript -Path (Join-Path $ShepherdPlugin 'test\07-driver-encoding-contract.ps1')

    $currentPhase = 'checking disposable repository'
    $repositoryInfoOutput = gh repo view $Repo --json nameWithOwner,defaultBranchRef 2>&1
    if ($LASTEXITCODE -ne 0) {
        $repositoryError = $repositoryInfoOutput -join [Environment]::NewLine
        throw "The disposable repository must already exist and have Actions, Copilot Coding Agent, and Copilot code review enabled: $repositoryError"
    }
    Write-ExperimentStatus "Using existing repository '$Repo'."

    $currentPhase = 'cloning primary checkout'
    Write-ExperimentStatus "Cloning '$Repo'..."
    git clone $cloneUrl $Target
    Assert-NativeSuccess "Clone of '$Repo'"

    $headOutput = git -C $Target rev-parse --verify HEAD 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $headOutput) {
        Write-ExperimentStatus 'Repository is empty; creating and pushing an initial README commit...'
        Set-Content -LiteralPath (Join-Path $Target 'README.md') `
            -Value "# $repositoryName" -Encoding utf8NoBOM
        git -C $Target add -- README.md
        Assert-NativeSuccess 'git add for initial README'
        git -C $Target commit -m 'Initial commit'
        Assert-NativeSuccess 'Initial README commit'
        git -C $Target push -u origin HEAD
        Assert-NativeSuccess 'Initial README push'
    }

    $primaryStatus = git -C $Target status --porcelain
    Assert-NativeSuccess 'Primary checkout status'
    if ($primaryStatus) {
        throw 'The primary target checkout is not clean.'
    }

    $remotes = @(git -C $Target remote)
    Assert-NativeSuccess 'Git remote listing'
    if ($remotes.Count -ne 1) {
        throw "The primary checkout must have exactly one Git remote; found $($remotes.Count)."
    }
    Set-Location -LiteralPath $Target
    $resolvedRemote = & (Join-Path $ShepherdPlugin 'scripts\resolve-repository-remote.ps1') `
        -Repo $Repo
    if ([string]::IsNullOrWhiteSpace([string]$resolvedRemote)) {
        throw "Could not resolve the unique Git remote for '$Repo'."
    }
    Write-ExperimentStatus "Resolved repository remote: $($resolvedRemote.Trim())"

    foreach ($branch in @($BaselineBranch, $TreatmentBranch, $ControlBranch)) {
        git -C $Target ls-remote --exit-code --heads $remotes[0] $branch *> $null
        if ($LASTEXITCODE -eq 0) {
            throw "Remote experiment branch already exists: $branch"
        }
        if ($LASTEXITCODE -ne 2) {
            throw "Could not determine whether remote branch '$branch' exists."
        }
    }

    $currentPhase = 'creating immutable baseline'
    Write-ExperimentStatus 'Creating the deterministic shared baseline...'
    Set-Location -LiteralPath $Target
    Invoke-CheckedPwshScript `
        -Path (Join-Path $ShepherdPlugin 'test\00-prepare-test-baseline.ps1') `
        -Arguments @('-Repo', $Repo, '-BaselineBranch', $BaselineBranch)

    $BaselineSha = (git -C $Target rev-parse HEAD).Trim()
    Assert-NativeSuccess 'Baseline SHA lookup'
    if ($BaselineSha -notmatch '^[0-9a-f]{40}$') {
        throw "Invalid baseline SHA: $BaselineSha"
    }
    Write-ExperimentStatus "Immutable baseline SHA: $BaselineSha"

    $currentPhase = 'creating treatment and control worktrees'
    git -C $Target worktree add --detach $TreatmentWorktree $BaselineSha
    Assert-NativeSuccess 'Treatment worktree creation'
    git -C $Target worktree add --detach $ControlWorktree $BaselineSha
    Assert-NativeSuccess 'Control worktree creation'

    $TreatmentStart = (git -C $TreatmentWorktree rev-parse HEAD).Trim()
    Assert-NativeSuccess 'Treatment starting SHA lookup'
    $ControlStart = (git -C $ControlWorktree rev-parse HEAD).Trim()
    Assert-NativeSuccess 'Control starting SHA lookup'
    if ($TreatmentStart -ne $BaselineSha -or $ControlStart -ne $BaselineSha) {
        throw 'Treatment and control worktrees do not share the baseline SHA.'
    }
    git -C $Target worktree list
    Assert-NativeSuccess 'Git worktree listing'

    $currentPhase = 'initializing treatment campaign'
    Write-ExperimentStatus 'Initializing treatment campaign...'
    Set-Location -LiteralPath $TreatmentWorktree
    Invoke-CheckedPwshScript `
        -Path (Join-Path $ShepherdPlugin 'test\01-prepare-base-branch.ps1') `
        -Arguments @(
            '-Repo', $Repo,
            '-BaseBranch', $TreatmentBranch,
            '-CampaignShortname', 'math-treatment',
            '-LessonPropagation', 'campaign',
            '-BaselineSha', $BaselineSha
        )
    $treatmentCampaign = Get-CampaignDirectory `
        -Worktree $TreatmentWorktree -Shortname 'math-treatment'
    $TreatmentDirectory = $treatmentCampaign.FullName
    $TreatmentDirectoryName = $treatmentCampaign.Name

    $currentPhase = 'initializing control campaign'
    Write-ExperimentStatus 'Initializing control campaign...'
    Set-Location -LiteralPath $ControlWorktree
    Invoke-CheckedPwshScript `
        -Path (Join-Path $ShepherdPlugin 'test\01-prepare-base-branch.ps1') `
        -Arguments @(
            '-Repo', $Repo,
            '-BaseBranch', $ControlBranch,
            '-CampaignShortname', 'math-control',
            '-LessonPropagation', 'off',
            '-BaselineSha', $BaselineSha
        )
    $controlCampaign = Get-CampaignDirectory `
        -Worktree $ControlWorktree -Shortname 'math-control'
    $ControlDirectory = $controlCampaign.FullName
    $ControlDirectoryName = $controlCampaign.Name

    foreach ($path in @(
        $TreatmentWorktree,
        $ControlWorktree,
        $TreatmentDirectory,
        $ControlDirectory
    )) {
        if (-not (Test-Path -LiteralPath $path -PathType Container)) {
            throw "Expected experiment directory does not exist: $path"
        }
    }

    $TreatmentInitParent = (git -C $TreatmentWorktree rev-parse 'HEAD^').Trim()
    Assert-NativeSuccess 'Treatment initialization parent lookup'
    $ControlInitParent = (git -C $ControlWorktree rev-parse 'HEAD^').Trim()
    Assert-NativeSuccess 'Control initialization parent lookup'
    if ($TreatmentInitParent -ne $BaselineSha -or
        $ControlInitParent -ne $BaselineSha) {
        throw 'A campaign initialization commit does not descend directly from the shared baseline.'
    }

    $currentPhase = 'creating treatment issues'
    Write-ExperimentStatus 'Creating and verifying treatment issues...'
    Set-Location -LiteralPath $TreatmentWorktree
    Invoke-CheckedPwshScript `
        -Path (Join-Path $ShepherdPlugin 'test\02-create-issues.ps1') `
        -Arguments @('-CampaignMetadataDirectory', $TreatmentDirectoryName)
    $TreatmentHandoff = Get-CampaignHandoff -CampaignDirectory $TreatmentDirectory

    $currentPhase = 'creating control issues'
    Write-ExperimentStatus 'Creating and verifying control issues...'
    Set-Location -LiteralPath $ControlWorktree
    Invoke-CheckedPwshScript `
        -Path (Join-Path $ShepherdPlugin 'test\02-create-issues.ps1') `
        -Arguments @('-CampaignMetadataDirectory', $ControlDirectoryName)
    $ControlHandoff = Get-CampaignHandoff -CampaignDirectory $ControlDirectory

    Write-ExperimentStatus "Treatment issues: $($TreatmentHandoff.IssueList)"
    Write-ExperimentStatus "Control issues:   $($ControlHandoff.IssueList)"

    $currentPhase = 'running treatment stage 25'
    Write-ExperimentStatus 'Running treatment campaign serially through stage 25...'
    Set-Location -LiteralPath $TreatmentWorktree
    Invoke-CheckedPwshScript `
        -Path (Join-Path $ShepherdPlugin 'scripts\shepherd-task-25-given-list.ps1') `
        -Arguments @(
            '-LessonPropagation', 'campaign',
            '-TaskIssues', $TreatmentHandoff.IssueList,
            '-CampaignMetadataDirectory', $TreatmentDirectoryName
        )

    $currentPhase = 'running control stage 25'
    Write-ExperimentStatus 'Running control campaign serially through stage 25...'
    Set-Location -LiteralPath $ControlWorktree
    Invoke-CheckedPwshScript `
        -Path (Join-Path $ShepherdPlugin 'scripts\shepherd-task-25-given-list.ps1') `
        -Arguments @(
            '-LessonPropagation', 'off',
            '-TaskIssues', $ControlHandoff.IssueList,
            '-CampaignMetadataDirectory', $ControlDirectoryName
        )

    $currentPhase = 'updating and verifying treatment'
    Write-ExperimentStatus 'Updating and verifying completed treatment campaign...'
    Set-Location -LiteralPath $TreatmentWorktree
    git pull --ff-only
    Assert-NativeSuccess 'Treatment fast-forward pull'
    Invoke-CheckedPwshScript `
        -Path (Join-Path $ShepherdPlugin 'test\04-verify-lesson-experiment.ps1') `
        -Arguments @('-CampaignMetadataDirectory', $TreatmentDirectoryName)

    $currentPhase = 'updating and verifying control'
    Write-ExperimentStatus 'Updating and verifying completed control campaign...'
    Set-Location -LiteralPath $ControlWorktree
    git pull --ff-only
    Assert-NativeSuccess 'Control fast-forward pull'
    Invoke-CheckedPwshScript `
        -Path (Join-Path $ShepherdPlugin 'test\04-verify-lesson-experiment.ps1') `
        -Arguments @('-CampaignMetadataDirectory', $ControlDirectoryName)

    $currentPhase = 'collecting final evidence'
    $TreatmentRun = Get-OnlyCompletedRunDirectory -CampaignDirectory $TreatmentDirectory
    $ControlRun = Get-OnlyCompletedRunDirectory -CampaignDirectory $ControlDirectory
    $TreatmentPostMortem = Get-OrCreatePostMortem `
        -RunDirectory $TreatmentRun.FullName `
        -Worktree $TreatmentWorktree `
        -CampaignDirectory $TreatmentDirectory `
        -CampaignDirectoryName $TreatmentDirectoryName `
        -IssueList $TreatmentHandoff.IssueList `
        -LessonPropagation campaign `
        -BaseBranch $TreatmentBranch `
        -Repository $Repo
    $ControlPostMortem = Get-OrCreatePostMortem `
        -RunDirectory $ControlRun.FullName `
        -Worktree $ControlWorktree `
        -CampaignDirectory $ControlDirectory `
        -CampaignDirectoryName $ControlDirectoryName `
        -IssueList $ControlHandoff.IssueList `
        -LessonPropagation off `
        -BaseBranch $ControlBranch `
        -Repository $Repo
    $TreatmentLessons = Join-Path $TreatmentDirectory 'campaign-lessons.md'
    $ControlLessons = Join-Path $ControlDirectory 'campaign-lessons.md'

    $treatmentSecondIssuePattern = "phase1-task-*-$($TreatmentHandoff.IssueNumbers[1]).md"
    $treatmentSecondIssueSessions = @(
        Get-ChildItem -LiteralPath $TreatmentRun.FullName -File `
            -Filter $treatmentSecondIssuePattern
    )
    if ($treatmentSecondIssueSessions.Count -ne 1) {
        throw "Expected one treatment issue-2 stage-30 transcript; found $($treatmentSecondIssueSessions.Count)."
    }

    $currentPhase = 'creating treatment-control comparison post-mortem'
    $comparisonPath = Join-Path $ComparisonDir (
        (Get-Date -Format 'yyyyMMdd-HHmmss') +
        '-treatment-control-post-mortem.md'
    )
    if (Test-Path -LiteralPath $comparisonPath) {
        throw "Comparison post-mortem path already exists: $comparisonPath"
    }

    $comparisonPrompt = @"
Create a detailed treatment-control comparison post-mortem for a completed
shepherd-task lesson-propagation experiment.

Read these authoritative inputs:

- TREATMENT_POST_MORTEM: $($TreatmentPostMortem.FullName)
- CONTROL_POST_MORTEM: $($ControlPostMortem.FullName)
- TREATMENT_CAMPAIGN_DIRECTORY: $TreatmentDirectory
- CONTROL_CAMPAIGN_DIRECTORY: $ControlDirectory
- TREATMENT_LESSONS: $TreatmentLessons
- CONTROL_LESSONS: $ControlLessons
- TREATMENT_ISSUE_2_STAGE_30_SESSION: $($treatmentSecondIssueSessions[0].FullName)
- REPOSITORY: $Repo

Write the completed Markdown report to exactly:

- OUTPUT_FILE: $comparisonPath

Requirements:

1. Read both post-mortems and both final lesson files before drawing conclusions.
2. Inspect all shepherd-task-25 run manifests under both campaign directories.
   If either campaign required retries, include every attempt's task-execution
   and session cost. Separate unrelated orchestration failures from lesson-mode
   costs and provide both observed and failure-normalized comparisons.
3. Compare treatment and control campaign elapsed time, captured session time,
   stage-30 and stage-40 time, review rounds, actionable findings, lesson-only
   findings, fix cycles, retries, and final outcomes. Show exact arithmetic and
   percentages when both values are available.
4. Compare the paired first tasks separately from the paired second tasks.
   State explicitly that the first treatment task cannot benefit from prior
   campaign lessons. Treat the second task as the direct forward-propagation
   observation.
5. Determine whether treatment lessons were captured, validated, merged,
   delivered to issue 2, and observably reflected in implementation or tests.
   Distinguish proven delivery from inferred cognitive use.
6. Explain what knowledge was already carried implicitly by merged code,
   tests, CI, and APIs in both arms. Evaluate whether prose lessons added novel
   information beyond executable artifacts.
7. Identify lesson overgeneralization, stale applicability, metadata burden,
   publication commits, post-publication rereviews, or lifecycle-conflict
   comments when supported by the artifacts.
8. Separate mechanism value, immediate velocity value, first-review-quality
   value, final-quality value, and longer-term durable-knowledge value.
9. State confounders and limits, including stochastic agent behavior and the
   n=1 sample. Do not claim general causality that the artifacts cannot prove.
10. Give specific recommendations for improving lesson scope, transfer-risk
    metadata, non-applicability guidance, executable enforcement, publication
    lifecycle, metrics, and future replicated experiments.
11. Include an executive conclusion and a concise recommended decision.
12. Be specific. Cite local artifact paths, issue/PR numbers, commit SHAs,
    durations, review counts, and lesson text where useful.

Do not modify either experiment repository, its branches, issues, pull
requests, campaign artifacts, or the two input post-mortems. Create only the
requested OUTPUT_FILE.
"@

    Write-ExperimentStatus 'Creating final treatment-control comparison post-mortem with Copilot...'
    Write-ExperimentStatus "Treatment post-mortem: $($TreatmentPostMortem.FullName)"
    Write-ExperimentStatus "Control post-mortem:   $($ControlPostMortem.FullName)"
    Write-ExperimentStatus "Comparison output:     $comparisonPath"
    Set-Location -LiteralPath $ComparisonDir
    $comparisonPrompt |
        copilot --yolo `
            --add-dir $TreatmentWorktree `
            --add-dir $ControlWorktree
    if ($LASTEXITCODE -ne 0) {
        throw "Comparison Copilot invocation failed with exit code $LASTEXITCODE."
    }
    if (-not (Test-Path -LiteralPath $comparisonPath -PathType Leaf)) {
        throw "Comparison Copilot invocation completed without creating: $comparisonPath"
    }
    if ((Get-Item -LiteralPath $comparisonPath).Length -eq 0) {
        throw "Comparison post-mortem is empty: $comparisonPath"
    }
    Write-ExperimentStatus "Comparison post-mortem created: $comparisonPath"

    $summaryPath = Join-Path $WorkareasDir (
        "$repositoryName-shepherd-experiment-" +
        $experimentStartedAt.ToString('yyyyMMdd-HHmm') +
        '.json'
    )
    $summary = [ordered]@{
        schemaVersion = 1
        repository = $Repo
        repositoryUrl = $canonicalRepositoryUrl
        startedAt = $experimentStartedAt.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
        completedAt = [DateTimeOffset]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
        baselineBranch = $BaselineBranch
        baselineSha = $BaselineSha
        target = $Target
        comparisonPostMortem = $comparisonPath
        treatment = [ordered]@{
            branch = $TreatmentBranch
            worktree = $TreatmentWorktree
            campaignDirectory = $TreatmentDirectory
            issues = $TreatmentHandoff.IssueNumbers
            handoff = $TreatmentHandoff.Path
            runDirectory = $TreatmentRun.FullName
            postMortem = $TreatmentPostMortem.FullName
            lessons = $TreatmentLessons
            secondIssueStage30Session = $treatmentSecondIssueSessions[0].FullName
        }
        control = [ordered]@{
            branch = $ControlBranch
            worktree = $ControlWorktree
            campaignDirectory = $ControlDirectory
            issues = $ControlHandoff.IssueNumbers
            handoff = $ControlHandoff.Path
            runDirectory = $ControlRun.FullName
            postMortem = $ControlPostMortem.FullName
            lessons = $ControlLessons
        }
    }
    [IO.File]::WriteAllText(
        $summaryPath,
        ($summary | ConvertTo-Json -Depth 6) + [Environment]::NewLine,
        [Text.UTF8Encoding]::new($false)
    )

    Write-Host ''
    Write-Host '=== TREATMENT CAMPAIGN LESSONS ===' -ForegroundColor Green
    Get-Content -LiteralPath $TreatmentLessons
    Write-Host ''
    Write-Host '=== CONTROL CAMPAIGN LESSONS ===' -ForegroundColor Green
    Get-Content -LiteralPath $ControlLessons
    Write-Host ''
    Write-Host '=== EXPERIMENT COMPLETE ===' -ForegroundColor Green
    Write-Host "Repository:                     $canonicalRepositoryUrl"
    Write-Host "Baseline SHA:                   $BaselineSha"
    Write-Host "Treatment issues:               $($TreatmentHandoff.IssueList)"
    Write-Host "Control issues:                 $($ControlHandoff.IssueList)"
    Write-Host "Treatment run:                  $($TreatmentRun.FullName)"
    Write-Host "Control run:                    $($ControlRun.FullName)"
    Write-Host "Treatment post-mortem:          $($TreatmentPostMortem.FullName)"
    Write-Host "Control post-mortem:            $($ControlPostMortem.FullName)"
    Write-Host "Comparison post-mortem:         $comparisonPath"
    Write-Host "Treatment issue-2 stage 30:     $($treatmentSecondIssueSessions[0].FullName)"
    Write-Host "Machine-readable summary:       $summaryPath"
    Write-Host ''
    Write-Host 'All evidence and worktrees were preserved. No cleanup was performed.'
    Write-Host 'Semantic lesson use still requires inspection of the reported treatment issue-2 transcript and PR changes.' -ForegroundColor Yellow
}
catch {
    Write-Host ''
    Write-Host "=== EXPERIMENT FAILED DURING: $currentPhase ===" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ''
    Write-Host 'No automated cleanup was performed. Preserve and inspect any paths that exist:' -ForegroundColor Yellow
    foreach ($path in @($Target, $TreatmentWorktree, $ControlWorktree, $TreatmentDirectory, $ControlDirectory)) {
        if ($path -and (Test-Path -LiteralPath $path)) {
            Write-Host "  $path"
        }
    }
    throw
}
finally {
    Set-Location -LiteralPath $initialLocation
}
