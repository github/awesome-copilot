<#
.SYNOPSIS
    Resumes the preserved Cargo Tracker treatment/control experiment.

.DESCRIPTION
    Validates the exact worktrees and campaigns created by the failed
    September 2-3, 2026 run, resumes only unfinished control issues, and then
    completes verification and treatment/control evidence collection.

    This script never clones, initializes campaigns, or creates issues. It
    preserves the original failed run and includes it with the recovery run in
    the final comparison.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory, Position = 0)]
    [ValidateNotNullOrEmpty()]
    [string]$RepositoryUrl,

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
$resumeStartedAt = [DateTimeOffset]::Now
$currentPhase = 'preflight'
$Target = $null
$TreatmentWorktree = $null
$ControlWorktree = $null
$TreatmentDirectory = $null
$ControlDirectory = $null

$ExpectedBaselineSha = '9b9f311b2a3a2854bdac947593950d9edb6bca7d'
$BaselineBranch = 'experiment/shepherd-shared-baseline'
$SourceBranch = '20260902-2104Z-commit-e7b651f-liberty'
$TreatmentBranch = 'experiment/shepherd-treatment'
$ControlBranch = 'experiment/shepherd-control'
$ExpectedTreatmentCampaignId = '5426f64c-a653-4ff1-ba39-00209a83cdb4'
$ExpectedControlCampaignId = '48f8a98a-83f9-466b-aa2e-14edbb4449e9'
$ExpectedTreatmentIssues = @(5, 6, 7, 8, 9)
$ExpectedControlIssues = @(10, 11, 12, 13, 14)
$OriginalFailedControlRunName =
    'shepherd-tasks-48f8a98a-83f9-466b-aa2e-14edbb4449e9-20260903-0555'

function Write-ResumeStatus {
    param([Parameter(Mandatory)][string]$Message)
    Write-Host "[shepherd-experiment-resume] $Message"
}

function Assert-NativeSuccess {
    param([Parameter(Mandatory)][string]$Operation)
    if ($LASTEXITCODE -ne 0) {
        throw "$Operation failed with exit code $LASTEXITCODE."
    }
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
    param(
        [Parameter(Mandatory)][string]$CampaignDirectory,
        [Parameter(Mandatory)][int[]]$ExpectedIssues
    )

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

    $issueNumbers = @($handoff.issueNumbers | ForEach-Object { [int]$_ })
    if (($issueNumbers -join ',') -ne ($ExpectedIssues -join ',')) {
        throw "Unexpected issue list in '$($handoffFiles[0].FullName)': $($issueNumbers -join ',')."
    }
    return [pscustomobject]@{
        Path = $handoffFiles[0].FullName
        IssueNumbers = $issueNumbers
        IssueList = $issueNumbers -join ','
    }
}

function Assert-Campaign {
    param(
        [Parameter(Mandatory)][string]$CampaignDirectory,
        [Parameter(Mandatory)][string]$ExpectedCampaignId,
        [Parameter(Mandatory)][string]$ExpectedShortname,
        [Parameter(Mandatory)][string]$ExpectedBranch,
        [Parameter(Mandatory)][ValidateSet('off', 'campaign')]
        [string]$ExpectedLessonPropagation,
        [Parameter(Mandatory)][string]$ExpectedRepository
    )

    $manifestPath = Join-Path $CampaignDirectory 'shepherd-campaign.json'
    try {
        $campaign = Get-Content -LiteralPath $manifestPath -Raw |
            ConvertFrom-Json
    }
    catch {
        throw "Campaign manifest is invalid JSON: $manifestPath. $($_.Exception.Message)"
    }
    $expected = [ordered]@{
        campaignId = $ExpectedCampaignId
        campaignShortname = $ExpectedShortname
        repository = $ExpectedRepository
        baseBranch = $ExpectedBranch
        lessonPropagation = $ExpectedLessonPropagation
        campaignMetadataDirectory = Split-Path -Leaf $CampaignDirectory
    }
    foreach ($property in $expected.Keys) {
        if ([string]$campaign.$property -ne [string]$expected[$property]) {
            throw "Campaign '$CampaignDirectory' has unexpected $property '$($campaign.$property)'; expected '$($expected[$property])'."
        }
    }
}

function Get-RunEvidence {
    param(
        [Parameter(Mandatory)][string]$CampaignDirectory,
        [Parameter(Mandatory)][string]$ExpectedCampaignId
    )

    $runs = @()
    foreach ($directory in @(
        Get-ChildItem -LiteralPath $CampaignDirectory -Directory `
            -Filter 'shepherd-tasks-*' |
            Sort-Object Name
    )) {
        $manifestPath = Join-Path $directory.FullName `
            'shepherd-task-25-given-list-run.json'
        if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
            continue
        }
        try {
            $manifest = Get-Content -LiteralPath $manifestPath -Raw |
                ConvertFrom-Json
        }
        catch {
            throw "Stage-25 run manifest is invalid JSON: $manifestPath. $($_.Exception.Message)"
        }
        if ([string]$manifest.campaignId -ne $ExpectedCampaignId) {
            throw "Run '$($directory.FullName)' belongs to unexpected campaign '$($manifest.campaignId)'."
        }
        $postMortems = @(
            Get-ChildItem -LiteralPath $directory.FullName -File `
                -Filter '*-post-mortem.md'
        )
        if ($postMortems.Count -ne 1) {
            throw "Expected one post-mortem in '$($directory.FullName)'; found $($postMortems.Count)."
        }
        $runs += [pscustomobject]@{
            Directory = $directory
            ManifestPath = $manifestPath
            Manifest = $manifest
            PostMortem = $postMortems[0]
        }
    }
    if ($runs.Count -eq 0) {
        throw "No stage-25 run evidence found under '$CampaignDirectory'."
    }
    return $runs
}

function Get-IssueState {
    param(
        [Parameter(Mandatory)][string]$Repository,
        [Parameter(Mandatory)][int]$IssueNumber
    )

    $output = @(gh issue view $IssueNumber -R $Repository --json state 2>$null)
    $ghExitCode = $LASTEXITCODE
    if ($ghExitCode -ne 0 -or $output.Count -eq 0) {
        throw "Unable to query issue #$IssueNumber in '$Repository'."
    }
    try {
        return [string](($output -join [Environment]::NewLine) |
            ConvertFrom-Json).state
    }
    catch {
        throw "Issue #$IssueNumber state response is invalid JSON."
    }
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

    $WorkareasDir = [IO.Path]::GetFullPath($WorkareasDir)
    $ComparisonDir = [IO.Path]::GetFullPath($ComparisonDir)
    $Target = Join-Path $WorkareasDir "$repositoryName-shepherd-target"
    $TreatmentWorktree = Join-Path $WorkareasDir "$repositoryName-shepherd-treatment"
    $ControlWorktree = Join-Path $WorkareasDir "$repositoryName-shepherd-control"

    $CopilotHome = if ($env:COPILOT_HOME) {
        $env:COPILOT_HOME
    } else {
        Join-Path $HOME '.copilot'
    }
    $ShepherdPlugin = Join-Path $CopilotHome 'plugins\shepherd-task'
    $FixtureRoot = Join-Path $ShepherdPlugin `
        'test\cargotracker-add-change-arrival-deadline-feature'

    Write-Host '=== shepherd-task Cargo Tracker experiment resume ===' `
        -ForegroundColor Cyan
    Write-Host "Repository:           $Repo"
    Write-Host "Primary checkout:     $Target"
    Write-Host "Treatment worktree:   $TreatmentWorktree"
    Write-Host "Control worktree:     $ControlWorktree"
    Write-Host "Comparison directory: $ComparisonDir"
    Write-Host ''

    $currentPhase = 'checking required commands and installation'
    foreach ($commandName in @('git', 'gh', 'copilot', 'pwsh')) {
        if (-not (Get-Command $commandName -ErrorAction SilentlyContinue)) {
            throw "Required command was not found on PATH: $commandName"
        }
    }
    $authOutput = @(gh auth status 2>&1)
    $ghExitCode = $LASTEXITCODE
    $authOutput | ForEach-Object { Write-Host $_ }
    if ($ghExitCode -ne 0) {
        throw 'GitHub CLI authentication check failed.'
    }
    foreach ($path in @(
        $Target,
        $TreatmentWorktree,
        $ControlWorktree,
        $FixtureRoot
    )) {
        if (-not (Test-Path -LiteralPath $path -PathType Container)) {
            throw "Required preserved directory does not exist: $path"
        }
    }
    if (-not (Test-Path -LiteralPath $ComparisonDir -PathType Container)) {
        New-Item -ItemType Directory -Path $ComparisonDir -Force |
            Out-Null
    }
    $ComparisonDir = (Resolve-Path -LiteralPath $ComparisonDir).Path

    $skillListResult = & (Join-Path $FixtureRoot `
        'get-copilot-skill-list.ps1')
    $skillList = @($skillListResult.Output)
    if ($skillListResult.ExitCode -ne 0) {
        throw "Unable to list installed Copilot skills: $($skillList -join [Environment]::NewLine)"
    }
    foreach ($skillName in @(
        'shepherd-task-30-from-assignment-to-ready',
        'shepherd-task-40-from-ready-to-merged-to-base',
        'shepherd-task-50-create-post-mortem'
    )) {
        if (($skillList -join "`n") -notmatch [regex]::Escape($skillName)) {
            throw "Required Copilot skill is not installed: $skillName"
        }
    }

    $currentPhase = 'running offline contracts'
    Invoke-CheckedPwshScript -Path (
        Join-Path $ShepherdPlugin 'test\lesson-propagation-default-contract.ps1'
    )
    foreach ($contract in @(
        '11-stage15-plan-discovery-contract.ps1',
        '06-stage40-review-contract.ps1',
        '12-session-outcome-contract.ps1',
        '13-resume-driver-contract.ps1',
        '07-driver-encoding-contract.ps1'
    )) {
        Invoke-CheckedPwshScript -Path (Join-Path $FixtureRoot $contract)
    }

    $currentPhase = 'validating preserved experiment identity'
    $baselineOutput = @(git -C $Target rev-parse $BaselineBranch 2>$null)
    $gitExitCode = $LASTEXITCODE
    if ($gitExitCode -ne 0 -or
        ([string]($baselineOutput | Select-Object -First 1)).Trim() -ne
        $ExpectedBaselineSha) {
        throw "Preserved baseline branch is not at $ExpectedBaselineSha."
    }
    foreach ($worktree in @($TreatmentWorktree, $ControlWorktree)) {
        Set-Location -LiteralPath $worktree
        $remote = & (Join-Path $ShepherdPlugin `
            'scripts\resolve-repository-remote.ps1') -Repo $Repo
        if ([string]::IsNullOrWhiteSpace([string]$remote)) {
            throw "Could not resolve repository remote while validating '$worktree'."
        }
        $branchOutput = @(git -C $worktree branch --show-current)
        $gitExitCode = $LASTEXITCODE
        if ($gitExitCode -ne 0 -or $branchOutput.Count -ne 1) {
            throw "Could not determine current branch for '$worktree'."
        }
        $expectedBranch = if ($worktree -eq $TreatmentWorktree) {
            $TreatmentBranch
        } else {
            $ControlBranch
        }
        if (([string]$branchOutput[0]).Trim() -ne $expectedBranch) {
            throw "Worktree '$worktree' is not on '$expectedBranch'."
        }
    }

    $treatmentCampaign = Get-CampaignDirectory `
        -Worktree $TreatmentWorktree -Shortname 'arrival-deadline-treatment'
    $controlCampaign = Get-CampaignDirectory `
        -Worktree $ControlWorktree -Shortname 'arrival-deadline-control'
    $TreatmentDirectory = $treatmentCampaign.FullName
    $ControlDirectory = $controlCampaign.FullName
    $TreatmentDirectoryName = $treatmentCampaign.Name
    $ControlDirectoryName = $controlCampaign.Name

    Assert-Campaign `
        -CampaignDirectory $TreatmentDirectory `
        -ExpectedCampaignId $ExpectedTreatmentCampaignId `
        -ExpectedShortname 'arrival-deadline-treatment' `
        -ExpectedBranch $TreatmentBranch `
        -ExpectedLessonPropagation campaign `
        -ExpectedRepository $Repo
    Assert-Campaign `
        -CampaignDirectory $ControlDirectory `
        -ExpectedCampaignId $ExpectedControlCampaignId `
        -ExpectedShortname 'arrival-deadline-control' `
        -ExpectedBranch $ControlBranch `
        -ExpectedLessonPropagation off `
        -ExpectedRepository $Repo

    $TreatmentHandoff = Get-CampaignHandoff `
        -CampaignDirectory $TreatmentDirectory `
        -ExpectedIssues $ExpectedTreatmentIssues
    $ControlHandoff = Get-CampaignHandoff `
        -CampaignDirectory $ControlDirectory `
        -ExpectedIssues $ExpectedControlIssues

    $originalFailedRun = Join-Path $ControlDirectory `
        $OriginalFailedControlRunName
    $originalFailedManifestPath = Join-Path $originalFailedRun `
        'shepherd-task-25-given-list-run.json'
    try {
        $originalFailedManifest =
            Get-Content -LiteralPath $originalFailedManifestPath -Raw |
            ConvertFrom-Json
    }
    catch {
        throw "Original failed control run is missing or invalid: $originalFailedManifestPath. $($_.Exception.Message)"
    }
    if ($originalFailedManifest.status -ne 'failed' -or
        [int]$originalFailedManifest.exitCode -eq 0 -or
        (@($originalFailedManifest.taskIssues) -join ',') -ne
        ($ExpectedControlIssues -join ',')) {
        throw 'Original control failure manifest no longer matches the preserved failed run.'
    }

    $currentPhase = 'finding unfinished control issues'
    $unfinishedControlIssues = @()
    $foundOpenIssue = $false
    foreach ($issueNumber in $ControlHandoff.IssueNumbers) {
        $state = Get-IssueState -Repository $Repo -IssueNumber $issueNumber
        Write-ResumeStatus "Control issue #$issueNumber state: $state"
        if ($state -eq 'OPEN') {
            $foundOpenIssue = $true
            $unfinishedControlIssues += $issueNumber
        }
        elseif ($state -ne 'CLOSED') {
            throw "Control issue #$issueNumber has unsupported state '$state'."
        }
        elseif ($foundOpenIssue) {
            throw 'Closed control issues may not follow an unfinished issue in the serial task list.'
        }
    }

    if ($unfinishedControlIssues.Count -gt 0) {
        $unfinishedIssueList = $unfinishedControlIssues -join ','
        $currentPhase = "resuming control issues $unfinishedIssueList"
        Write-ResumeStatus "Resuming only unfinished control issues: $unfinishedIssueList"
        Set-Location -LiteralPath $ControlWorktree
        Invoke-CheckedPwshScript `
            -Path (Join-Path $ShepherdPlugin `
                'scripts\shepherd-task-25-given-list.ps1') `
            -Arguments @(
                '-TaskIssues', $unfinishedIssueList,
                '-CampaignMetadataDirectory', $ControlDirectoryName
            )
    }
    else {
        Write-ResumeStatus 'No unfinished control issues remain; continuing final verification.'
    }

    $currentPhase = 'updating and verifying campaigns'
    Set-Location -LiteralPath $TreatmentWorktree
    git pull --ff-only
    Assert-NativeSuccess 'Treatment fast-forward pull'
    Invoke-CheckedPwshScript `
        -Path (Join-Path $FixtureRoot '04-verify-lesson-experiment.ps1') `
        -Arguments @('-CampaignMetadataDirectory', $TreatmentDirectoryName)

    Set-Location -LiteralPath $ControlWorktree
    git pull --ff-only
    Assert-NativeSuccess 'Control fast-forward pull'
    Invoke-CheckedPwshScript `
        -Path (Join-Path $FixtureRoot '04-verify-lesson-experiment.ps1') `
        -Arguments @('-CampaignMetadataDirectory', $ControlDirectoryName)

    $currentPhase = 'collecting all original and recovery evidence'
    $TreatmentRuns = @(Get-RunEvidence `
        -CampaignDirectory $TreatmentDirectory `
        -ExpectedCampaignId $ExpectedTreatmentCampaignId)
    $ControlRuns = @(Get-RunEvidence `
        -CampaignDirectory $ControlDirectory `
        -ExpectedCampaignId $ExpectedControlCampaignId)
    if (@($TreatmentRuns | Where-Object {
        $_.Manifest.status -eq 'succeeded' -and
        [int]$_.Manifest.exitCode -eq 0
    }).Count -ne 1) {
        throw 'Expected exactly one successful treatment run.'
    }
    if (@($ControlRuns | Where-Object {
        $_.Manifest.status -eq 'succeeded' -and
        [int]$_.Manifest.exitCode -eq 0
    }).Count -lt 1) {
        throw 'No successful control recovery run was found.'
    }
    if (@($ControlRuns | Where-Object {
        $_.Directory.Name -eq $OriginalFailedControlRunName -and
        $_.Manifest.status -eq 'failed'
    }).Count -ne 1) {
        throw 'The original failed control run is not present in collected evidence.'
    }

    $treatmentPostFirstIssueSessions = @()
    $successfulTreatmentRun = @($TreatmentRuns | Where-Object {
        $_.Manifest.status -eq 'succeeded'
    })[0]
    foreach ($issueNumber in @($TreatmentHandoff.IssueNumbers |
        Select-Object -Skip 1)) {
        $sessions = @(
            Get-ChildItem -LiteralPath `
                $successfulTreatmentRun.Directory.FullName -File `
                -Filter "phase1-task-*-$issueNumber.md"
        )
        if ($sessions.Count -ne 1) {
            throw "Expected one treatment stage-30 transcript for issue #$issueNumber; found $($sessions.Count)."
        }
        $treatmentPostFirstIssueSessions += $sessions[0]
    }

    $TreatmentLessons = Join-Path $TreatmentDirectory 'campaign-lessons.md'
    $ControlLessons = Join-Path $ControlDirectory 'campaign-lessons.md'
    $treatmentPostMortemList =
        ($TreatmentRuns.PostMortem.FullName -join [Environment]::NewLine)
    $controlPostMortemList =
        ($ControlRuns.PostMortem.FullName -join [Environment]::NewLine)
    $treatmentRunList =
        ($TreatmentRuns.Directory.FullName -join [Environment]::NewLine)
    $controlRunList =
        ($ControlRuns.Directory.FullName -join [Environment]::NewLine)
    $treatmentSessionList =
        ($treatmentPostFirstIssueSessions.FullName -join [Environment]::NewLine)

    $currentPhase = 'creating resumed treatment-control comparison'
    $comparisonPath = Join-Path $ComparisonDir (
        (Get-Date -Format 'yyyyMMdd-HHmmss') +
        '-treatment-control-post-mortem.md'
    )
    $comparisonPrompt = @"
Create a detailed treatment-control comparison post-mortem for a completed
shepherd-task lesson-propagation experiment that required a control recovery
run.

Read every authoritative input:

- TREATMENT_RUN_DIRECTORIES:
$treatmentRunList
- CONTROL_RUN_DIRECTORIES:
$controlRunList
- TREATMENT_POST_MORTEMS:
$treatmentPostMortemList
- CONTROL_POST_MORTEMS:
$controlPostMortemList
- TREATMENT_CAMPAIGN_DIRECTORY: $TreatmentDirectory
- CONTROL_CAMPAIGN_DIRECTORY: $ControlDirectory
- TREATMENT_LESSONS: $TreatmentLessons
- CONTROL_LESSONS: $ControlLessons
- TREATMENT_POST_FIRST_STAGE_30_SESSIONS:
$treatmentSessionList
- REPOSITORY: $Repo

Write the completed Markdown report to exactly:

- OUTPUT_FILE: $comparisonPath

Requirements:

1. Preserve the distinction between the original failed control run and its
   recovery run. Include every attempt's elapsed time, task execution, Copilot
   session, review, retry, and failure cost.
2. Separate the stage-30 semantic failure and orchestration observability
   defect from lesson-mode costs. Provide observed and failure-normalized
   comparisons.
3. Compare elapsed time, captured session time, stage-30 and stage-40 time,
   review rounds, findings, fix cycles, retries, and final outcomes with exact
   arithmetic where available.
4. Compare all five paired tasks. The first treatment task cannot benefit from
   prior campaign lessons; tasks 2 through 5 are forward-propagation
   observations.
5. Determine whether lessons were captured, validated, merged, delivered, and
   observably reflected in implementation or tests. Distinguish proven
   delivery from inferred cognitive use.
6. Compare prose lessons with knowledge already encoded by merged code, tests,
   CI, and APIs.
7. Identify overgeneralization, stale applicability, metadata burden,
   publication commits, rereviews, and lifecycle-conflict comments when
   supported by evidence.
8. Separate mechanism value, immediate velocity value, first-review-quality
   value, final-quality value, and durable-knowledge value.
9. State confounders and limits, including stochastic behavior and n=1.
10. Give specific recommendations and include an executive conclusion and
    concise recommended decision.
11. Cite artifact paths, issue and PR numbers, commit SHAs, durations, review
    counts, and lesson text where useful.

Do not modify either experiment repository or any existing artifact. Create
only OUTPUT_FILE.
"@

    Set-Location -LiteralPath $ComparisonDir
    $comparisonPrompt |
        copilot --yolo `
            --add-dir $TreatmentWorktree `
            --add-dir $ControlWorktree
    if ($LASTEXITCODE -ne 0) {
        throw "Comparison Copilot invocation failed with exit code $LASTEXITCODE."
    }
    if (-not (Test-Path -LiteralPath $comparisonPath -PathType Leaf) -or
        (Get-Item -LiteralPath $comparisonPath).Length -eq 0) {
        throw "Comparison Copilot invocation did not create a nonempty report: $comparisonPath"
    }

    $summaryPath = Join-Path $WorkareasDir (
        "$repositoryName-shepherd-experiment-resume-" +
        $resumeStartedAt.ToString('yyyyMMdd-HHmm') +
        '.json'
    )
    $summary = [ordered]@{
        schemaVersion = 1
        repository = $Repo
        repositoryUrl = $canonicalRepositoryUrl
        resumedAt = $resumeStartedAt.ToUniversalTime().ToString(
            'yyyy-MM-ddTHH:mm:ssZ'
        )
        completedAt = [DateTimeOffset]::UtcNow.ToString(
            'yyyy-MM-ddTHH:mm:ssZ'
        )
        sourceBranch = $SourceBranch
        baselineBranch = $BaselineBranch
        baselineSha = $ExpectedBaselineSha
        originalFailedControlRun = $originalFailedRun
        resumedControlIssues = $unfinishedControlIssues
        comparisonPostMortem = $comparisonPath
        treatment = [ordered]@{
            branch = $TreatmentBranch
            worktree = $TreatmentWorktree
            campaignDirectory = $TreatmentDirectory
            issues = $TreatmentHandoff.IssueNumbers
            handoff = $TreatmentHandoff.Path
            runDirectories = @($TreatmentRuns.Directory.FullName)
            postMortems = @($TreatmentRuns.PostMortem.FullName)
            lessons = $TreatmentLessons
            postFirstIssueStage30Sessions =
                @($treatmentPostFirstIssueSessions.FullName)
        }
        control = [ordered]@{
            branch = $ControlBranch
            worktree = $ControlWorktree
            campaignDirectory = $ControlDirectory
            issues = $ControlHandoff.IssueNumbers
            handoff = $ControlHandoff.Path
            runDirectories = @($ControlRuns.Directory.FullName)
            postMortems = @($ControlRuns.PostMortem.FullName)
            lessons = $ControlLessons
        }
    }
    [IO.File]::WriteAllText(
        $summaryPath,
        ($summary | ConvertTo-Json -Depth 7) + [Environment]::NewLine,
        [Text.UTF8Encoding]::new($false)
    )

    Write-Host ''
    Write-Host '=== EXPERIMENT RESUME COMPLETE ===' -ForegroundColor Green
    Write-Host "Repository:                  $canonicalRepositoryUrl"
    Write-Host "Resumed control issues:      $($unfinishedControlIssues -join ',')"
    Write-Host "Original failed control run: $originalFailedRun"
    Write-Host "Comparison post-mortem:      $comparisonPath"
    Write-Host "Machine-readable summary:    $summaryPath"
    Write-Host 'All original and recovery evidence was preserved.'
}
catch {
    Write-Host ''
    Write-Host "=== EXPERIMENT RESUME FAILED DURING: $currentPhase ===" `
        -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ''
    Write-Host 'No automated cleanup was performed.' -ForegroundColor Yellow
    foreach ($path in @(
        $Target,
        $TreatmentWorktree,
        $ControlWorktree,
        $TreatmentDirectory,
        $ControlDirectory
    )) {
        if ($path -and (Test-Path -LiteralPath $path)) {
            Write-Host "  $path"
        }
    }
    throw
}
finally {
    Set-Location -LiteralPath $initialLocation
}
