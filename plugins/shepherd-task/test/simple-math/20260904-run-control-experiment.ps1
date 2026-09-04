<#
.SYNOPSIS
    Runs the simple-math shepherd-task control campaign end to end.

.DESCRIPTION
    Uses the installed shepherd-task plugin, prepares one immutable baseline,
    runs one two-task campaign with lesson propagation disabled, verifies the
    completed campaign, and preserves all evidence.

    This script performs real paid GitHub and Copilot operations. It is
    intentionally fail-fast and does not clean up branches, issues, pull
    requests, worktrees, or evidence after a failure or success.

.PARAMETER RepositoryUrl
    Fully qualified HTTPS URL of a fresh disposable GitHub repository.

.PARAMETER WorkareasDir
    Parent directory for the primary checkout and control worktree.

.EXAMPLE
    .\20260904-run-control-experiment.ps1

.EXAMPLE
    .\20260904-run-control-experiment.ps1 `
      -RepositoryUrl https://github.com/OWNER/DISPOSABLE-REPOSITORY `
      -WorkareasDir D:\workareas
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory, Position = 0)]
    [ValidateNotNullOrEmpty()]
    [string]$RepositoryUrl,

    [Parameter(Position = 1)]
    [ValidateNotNullOrEmpty()]
    [string]$WorkareasDir = (Join-Path $HOME 'workareas')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (Test-Path Variable:\PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$initialLocation = (Get-Location).Path
$runStartedAt = [DateTimeOffset]::Now
$currentPhase = 'preflight'
$Target = $null
$ControlWorktree = $null
$ControlDirectory = $null

function Write-ControlStatus {
    param([Parameter(Mandatory)][string]$Message)
    Write-Host "[shepherd-control] $Message"
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

    $campaignMatches = @(
        Get-ChildItem -LiteralPath $Worktree -Directory |
            Where-Object { $_.Name -like "*-$Shortname-remove-before-merge" }
    )
    if ($campaignMatches.Count -ne 1) {
        throw "Expected one '$Shortname' campaign directory in '$Worktree'; found $($campaignMatches.Count)."
    }
    return $campaignMatches[0]
}

function Get-CampaignHandoff {
    param([Parameter(Mandatory)][string]$CampaignDirectory)

    $handoffFiles = @(
        Get-ChildItem -LiteralPath $CampaignDirectory -Recurse -File `
            -Filter 'shepherd-test-experiment-handoff.json'
    )
    if ($handoffFiles.Count -ne 1) {
        throw "Expected one control handoff under '$CampaignDirectory'; found $($handoffFiles.Count)."
    }

    try {
        $handoff = Get-Content -LiteralPath $handoffFiles[0].FullName -Raw |
            ConvertFrom-Json
    }
    catch {
        throw "Control handoff is invalid JSON: $($handoffFiles[0].FullName). $($_.Exception.Message)"
    }

    $issueNumbers = @($handoff.issueNumbers)
    if ($issueNumbers.Count -ne 2 -or
        @($issueNumbers | Where-Object { $_ -notmatch '^[1-9][0-9]*$' }).Count -ne 0) {
        throw "Control handoff must contain exactly two positive issue numbers: $($handoffFiles[0].FullName)"
    }
    if ([string]$handoff.mode -ne 'off') {
        throw "Control handoff must use lessonPropagation=off: $($handoffFiles[0].FullName)"
    }

    return [pscustomobject]@{
        Path = $handoffFiles[0].FullName
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
                    return $manifest.status -eq 'succeeded' -and
                        $manifest.exitCode -eq 0 -and
                        $manifest.lessonPropagation -eq 'off'
                }
                catch {
                    return $false
                }
            }
    )
    if ($completedRuns.Count -ne 1) {
        throw "Expected one successful control stage-25 run under '$CampaignDirectory'; found $($completedRuns.Count)."
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
        [Parameter(Mandatory)][string]$BaseBranch,
        [Parameter(Mandatory)][string]$Repository
    )

    $postMortems = @(
        Get-ChildItem -LiteralPath $RunDirectory -File -Filter '*-post-mortem.md'
    )
    if ($postMortems.Count -eq 1) {
        if ($postMortems[0].Length -eq 0) {
            throw "Post-mortem is empty: $($postMortems[0].FullName)"
        }
        return $postMortems[0]
    }
    if ($postMortems.Count -gt 1) {
        throw "Expected at most one post-mortem in '$RunDirectory'; found $($postMortems.Count)."
    }

    $campaignManifestPath = Join-Path $CampaignDirectory 'shepherd-campaign.json'
    $campaign = Get-Content -LiteralPath $campaignManifestPath -Raw |
        ConvertFrom-Json
    $postMortemPath = Join-Path $RunDirectory (
        (Get-Date -Format 'yyyyMMdd-HHmmss') + '-post-mortem.md'
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
- LESSON_PROPAGATION: off

Write the report to:
- OUTPUT_FILE: $postMortemPath
"@

    Write-ControlStatus "No campaign post-mortem was found; regenerating it at: $postMortemPath"
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
    $Target = Join-Path $WorkareasDir "$repositoryName-shepherd-target"
    $ControlWorktree = Join-Path $WorkareasDir "$repositoryName-shepherd-control"
    $BaselineBranch = 'experiment/shepherd-shared-baseline'
    $ControlBranch = 'experiment/shepherd-control'

    $CopilotHome = if ($env:COPILOT_HOME) {
        $env:COPILOT_HOME
    }
    else {
        Join-Path $HOME '.copilot'
    }
    $ShepherdPlugin = Join-Path $CopilotHome 'plugins\shepherd-task'
    $FixtureRoot = Join-Path $ShepherdPlugin 'test\simple-math'

    Write-Host '=== shepherd-task simple-math control run ===' -ForegroundColor Cyan
    Write-Host "Repository:          $Repo"
    Write-Host "Workareas directory: $WorkareasDir"
    Write-Host "Fixture root:        $FixtureRoot"
    Write-Host "Primary checkout:    $Target"
    Write-Host "Control worktree:    $ControlWorktree"
    Write-Host "Baseline branch:     $BaselineBranch"
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
    foreach ($path in @($Target, $ControlWorktree)) {
        if (Test-Path -LiteralPath $path) {
            throw "Control-run path already exists. Preserve or remove it before starting: $path"
        }
    }

    $currentPhase = 'checking installed shepherd-task'
    if (-not (Test-Path -LiteralPath (
        Join-Path $FixtureRoot '00-prepare-test-baseline.ps1'
    ) -PathType Leaf)) {
        throw "Installed simple-math fixture was not found at '$FixtureRoot'. Install shepherd-task before running this driver."
    }
    $skillListResult = & (Join-Path $FixtureRoot 'get-copilot-skill-list.ps1')
    $skillList = @($skillListResult.Output)
    if ($skillListResult.ExitCode -ne 0) {
        throw "Unable to list installed Copilot skills: $($skillList -join [Environment]::NewLine)"
    }
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
    Invoke-CheckedPwshScript -Path (
        Join-Path $ShepherdPlugin 'test\lesson-propagation-default-contract.ps1'
    )
    foreach ($contract in @(
        '05-stage20-artifact-contract.ps1',
        '06-stage40-review-contract.ps1',
        '07-driver-encoding-contract.ps1',
        '08-psncpps-contract.ps1',
        '09-skill-powershell-contract.ps1',
        '10-simple-math-fixture-contract.ps1'
    )) {
        Invoke-CheckedPwshScript -Path (Join-Path $FixtureRoot $contract)
    }

    $currentPhase = 'checking disposable repository'
    $repositoryInfoOutput = gh repo view $Repo --json nameWithOwner,defaultBranchRef 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "The disposable repository must have Actions, Copilot Coding Agent, and Copilot code review enabled: $($repositoryInfoOutput -join [Environment]::NewLine)"
    }

    $currentPhase = 'cloning primary checkout'
    git clone $cloneUrl $Target
    Assert-NativeSuccess "Clone of '$Repo'"
    $headOutput = git -C $Target rev-parse --verify HEAD 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $headOutput) {
        Set-Content -LiteralPath (Join-Path $Target 'README.md') `
            -Value "# $repositoryName" -Encoding utf8NoBOM
        git -C $Target add -- README.md
        Assert-NativeSuccess 'git add for initial README'
        git -C $Target commit -m 'Initial commit'
        Assert-NativeSuccess 'Initial README commit'
        git -C $Target push -u origin HEAD
        Assert-NativeSuccess 'Initial README push'
    }
    if (git -C $Target status --porcelain) {
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
    foreach ($branch in @($BaselineBranch, $ControlBranch)) {
        git -C $Target ls-remote --exit-code --heads $remotes[0] $branch *> $null
        if ($LASTEXITCODE -eq 0) {
            throw "Remote control-run branch already exists: $branch"
        }
        if ($LASTEXITCODE -ne 2) {
            throw "Could not determine whether remote branch '$branch' exists."
        }
    }

    $currentPhase = 'creating immutable baseline'
    Invoke-CheckedPwshScript `
        -Path (Join-Path $FixtureRoot '00-prepare-test-baseline.ps1') `
        -Arguments @('-Repo', $Repo, '-BaselineBranch', $BaselineBranch)
    $BaselineSha = (git -C $Target rev-parse HEAD).Trim()
    Assert-NativeSuccess 'Baseline SHA lookup'
    if ($BaselineSha -notmatch '^[0-9a-f]{40}$') {
        throw "Invalid baseline SHA: $BaselineSha"
    }

    $currentPhase = 'creating control worktree'
    git -C $Target worktree add --detach $ControlWorktree $BaselineSha
    Assert-NativeSuccess 'Control worktree creation'
    $ControlStart = (git -C $ControlWorktree rev-parse HEAD).Trim()
    Assert-NativeSuccess 'Control starting SHA lookup'
    if ($ControlStart -ne $BaselineSha) {
        throw 'Control worktree does not start at the immutable baseline SHA.'
    }

    $currentPhase = 'initializing control campaign'
    Set-Location -LiteralPath $ControlWorktree
    Invoke-CheckedPwshScript `
        -Path (Join-Path $FixtureRoot '01-prepare-base-branch.ps1') `
        -Arguments @(
            '-Repo', $Repo,
            '-BaseBranch', $ControlBranch,
            '-CampaignShortname', 'math-control',
            '-BaselineSha', $BaselineSha
        )
    $controlCampaign = Get-CampaignDirectory `
        -Worktree $ControlWorktree -Shortname 'math-control'
    $ControlDirectory = $controlCampaign.FullName
    $ControlDirectoryName = $controlCampaign.Name
    $ControlInitParent = (git -C $ControlWorktree rev-parse 'HEAD^').Trim()
    Assert-NativeSuccess 'Control initialization parent lookup'
    if ($ControlInitParent -ne $BaselineSha) {
        throw 'Control campaign initialization does not descend directly from the baseline.'
    }

    $currentPhase = 'creating control issues'
    Invoke-CheckedPwshScript `
        -Path (Join-Path $FixtureRoot '02-create-issues.ps1') `
        -Arguments @('-CampaignMetadataDirectory', $ControlDirectoryName)
    $ControlHandoff = Get-CampaignHandoff -CampaignDirectory $ControlDirectory

    $currentPhase = 'running control stage 25'
    Invoke-CheckedPwshScript `
        -Path (Join-Path $ShepherdPlugin 'scripts\shepherd-task-25-given-list.ps1') `
        -Arguments @(
            '-TaskIssues', $ControlHandoff.IssueList,
            '-CampaignMetadataDirectory', $ControlDirectoryName
        )

    $currentPhase = 'updating and verifying control campaign'
    Set-Location -LiteralPath $ControlWorktree
    git pull --ff-only
    Assert-NativeSuccess 'Control fast-forward pull'
    Invoke-CheckedPwshScript `
        -Path (Join-Path $FixtureRoot '04-verify-control-campaign.ps1') `
        -Arguments @('-CampaignMetadataDirectory', $ControlDirectoryName)

    $currentPhase = 'collecting final evidence'
    $ControlRun = Get-OnlyCompletedRunDirectory -CampaignDirectory $ControlDirectory
    $ControlPostMortem = Get-OrCreatePostMortem `
        -RunDirectory $ControlRun.FullName `
        -Worktree $ControlWorktree `
        -CampaignDirectory $ControlDirectory `
        -CampaignDirectoryName $ControlDirectoryName `
        -IssueList $ControlHandoff.IssueList `
        -BaseBranch $ControlBranch `
        -Repository $Repo
    $ControlLessons = Join-Path $ControlDirectory 'campaign-lessons.md'
    $summaryPath = Join-Path $WorkareasDir (
        "$repositoryName-shepherd-control-" +
        $runStartedAt.ToString('yyyyMMdd-HHmm') +
        '.json'
    )
    $summary = [ordered]@{
        schemaVersion = 1
        repository = $Repo
        repositoryUrl = $canonicalRepositoryUrl
        startedAt = $runStartedAt.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
        completedAt = [DateTimeOffset]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
        lessonPropagation = 'off'
        baselineBranch = $BaselineBranch
        baselineSha = $BaselineSha
        target = $Target
        branch = $ControlBranch
        worktree = $ControlWorktree
        campaignDirectory = $ControlDirectory
        issues = $ControlHandoff.IssueNumbers
        handoff = $ControlHandoff.Path
        runDirectory = $ControlRun.FullName
        postMortem = $ControlPostMortem.FullName
        lessons = $ControlLessons
    }
    [IO.File]::WriteAllText(
        $summaryPath,
        ($summary | ConvertTo-Json -Depth 5) + [Environment]::NewLine,
        [Text.UTF8Encoding]::new($false)
    )

    Write-Host ''
    Write-Host '=== CONTROL CAMPAIGN LESSONS ===' -ForegroundColor Green
    Get-Content -LiteralPath $ControlLessons
    Write-Host ''
    Write-Host '=== CONTROL RUN COMPLETE ===' -ForegroundColor Green
    Write-Host "Repository:               $canonicalRepositoryUrl"
    Write-Host "Baseline SHA:             $BaselineSha"
    Write-Host "Issues:                   $($ControlHandoff.IssueList)"
    Write-Host "Run directory:            $($ControlRun.FullName)"
    Write-Host "Post-mortem:              $($ControlPostMortem.FullName)"
    Write-Host "Machine-readable summary: $summaryPath"
    Write-Host 'All evidence and worktrees were preserved. No cleanup was performed.'
}
catch {
    Write-Host ''
    Write-Host "=== CONTROL RUN FAILED DURING: $currentPhase ===" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host 'No automated cleanup was performed. Preserve and inspect any paths that exist:' -ForegroundColor Yellow
    foreach ($path in @($Target, $ControlWorktree, $ControlDirectory)) {
        if ($path -and (Test-Path -LiteralPath $path)) {
            Write-Host "  $path"
        }
    }
    throw
}
finally {
    Set-Location -LiteralPath $initialLocation
}
