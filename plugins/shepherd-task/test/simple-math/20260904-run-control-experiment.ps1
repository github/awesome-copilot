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

.PARAMETER ShowDomainFixtureOutput
    Shows complete output from simple-math fixture scripts invoked directly by
    this driver. Nested shepherd-task, Copilot CLI, Git, and GitHub CLI output
    may be included.

.PARAMETER ShowShepherdTaskScriptOutput
    Shows complete output from shepherd-task scripts invoked directly by this
    driver. For stage 25, this includes its nested per-issue and Copilot CLI
    output.

.PARAMETER ShowContractOutput
    Shows output from the offline preflight contracts.

.PARAMETER ShowNativeToolOutput
    Shows routine output from Git and GitHub CLI commands invoked directly by
    this driver.

.PARAMETER ShowAllOutput
    Enables all four optional output channels. Hidden output from a failing
    child command is always shown, even when its channel is disabled.

.EXAMPLE
    .\20260904-run-control-experiment.ps1 `
      -RepositoryUrl https://github.com/OWNER/DISPOSABLE-REPOSITORY `
      -WorkareasDir D:\workareas

.EXAMPLE
    .\20260904-run-control-experiment.ps1 `
      -RepositoryUrl https://github.com/OWNER/DISPOSABLE-REPOSITORY `
      -ShowShepherdTaskScriptOutput

.EXAMPLE
    .\20260904-run-control-experiment.ps1 `
      -RepositoryUrl https://github.com/OWNER/DISPOSABLE-REPOSITORY `
      -ShowAllOutput
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory, Position = 0)]
    [ValidateNotNullOrEmpty()]
    [string]$RepositoryUrl,

    [Parameter(Position = 1)]
    [ValidateNotNullOrEmpty()]
    [string]$WorkareasDir = (Join-Path $HOME 'workareas'),

    [switch]$ShowDomainFixtureOutput,

    [switch]$ShowShepherdTaskScriptOutput,

    [switch]$ShowContractOutput,

    [switch]$ShowNativeToolOutput,

    [switch]$ShowAllOutput
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (Test-Path Variable:\PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$ShowDomainFixtureOutput =
    $ShowDomainFixtureOutput -or $ShowAllOutput
$ShowShepherdTaskScriptOutput =
    $ShowShepherdTaskScriptOutput -or $ShowAllOutput
$ShowContractOutput = $ShowContractOutput -or $ShowAllOutput
$ShowNativeToolOutput = $ShowNativeToolOutput -or $ShowAllOutput

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

function Write-ControlStage {
    param(
        [Parameter(Mandatory)][string]$Stage,
        [Parameter(Mandatory)][string]$Purpose
    )

    Write-Host ''
    Write-ControlStatus "Stage $Stage - $Purpose"
}

function Test-OutputChannelEnabled {
    param(
        [Parameter(Mandatory)]
        [ValidateSet('DomainFixture', 'ShepherdTaskScript', 'Contract')]
        [string]$OutputChannel
    )

    switch ($OutputChannel) {
        'DomainFixture' { return [bool]$ShowDomainFixtureOutput }
        'ShepherdTaskScript' {
            return [bool]$ShowShepherdTaskScriptOutput
        }
        'Contract' { return [bool]$ShowContractOutput }
    }
}

function Write-CapturedOutput {
    param([object[]]$Output)

    foreach ($line in @($Output)) {
        if ($null -ne $line) {
            Write-Host ([string]$line)
        }
    }
}

function Invoke-CheckedPwshScript {
    param(
        [Parameter(Mandatory)][string]$Path,
        [string[]]$Arguments = @(),

        [Parameter(Mandatory)]
        [ValidateSet('DomainFixture', 'ShepherdTaskScript', 'Contract')]
        [string]$OutputChannel
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Required PowerShell script was not found: $Path"
    }

    $showOutput = Test-OutputChannelEnabled -OutputChannel $OutputChannel
    if ($showOutput) {
        & pwsh -NoLogo -NoProfile -File $Path @Arguments
        $exitCode = $LASTEXITCODE
    }
    else {
        $capturedOutput = @(
            & pwsh -NoLogo -NoProfile -File $Path @Arguments 2>&1
        )
        $exitCode = $LASTEXITCODE
    }

    if ($exitCode -ne 0) {
        if (-not $showOutput -and $capturedOutput.Count -gt 0) {
            Write-ControlStatus "Captured output from failed child script:"
            Write-CapturedOutput -Output $capturedOutput
        }
        throw "PowerShell script failed with exit code $exitCode`: $Path"
    }
}

function Invoke-CheckedNativeCommand {
    param(
        [Parameter(Mandatory)][string]$FilePath,
        [string[]]$Arguments = @(),
        [Parameter(Mandatory)][string]$Operation
    )

    if ($ShowNativeToolOutput) {
        & $FilePath @Arguments
        $exitCode = $LASTEXITCODE
    }
    else {
        $capturedOutput = @(& $FilePath @Arguments 2>&1)
        $exitCode = $LASTEXITCODE
    }

    if ($exitCode -ne 0) {
        if (-not $ShowNativeToolOutput -and $capturedOutput.Count -gt 0) {
            Write-ControlStatus "Captured output from failed native command:"
            Write-CapturedOutput -Output $capturedOutput
        }
        throw "$Operation failed with exit code $exitCode."
    }
}

function Assert-NativeSuccess {
    param([Parameter(Mandatory)][string]$Operation)
    if ($LASTEXITCODE -ne 0) {
        throw "$Operation failed with exit code $LASTEXITCODE."
    }
}

function ConvertTo-PowerShellDisplayLiteral {
    param([Parameter(Mandatory)][string]$Value)

    if ($Value -match '^<[A-Z0-9_]+>$') {
        return $Value
    }
    return "'" + $Value.Replace("'", "''") + "'"
}

function Write-ShepherdScriptInvocation {
    param(
        [Parameter(Mandatory)][string]$Stage,
        [Parameter(Mandatory)][string]$Purpose,
        [Parameter(Mandatory)]
        [ValidateSet('Planned', 'Actual')]
        [string]$InvocationType,
        [Parameter(Mandatory)][string]$ScriptPath,
        [Parameter(Mandatory)][object[]]$Arguments
    )

    Write-ControlStage -Stage $Stage -Purpose $Purpose
    $scriptName = Split-Path -Leaf $ScriptPath
    Write-ControlStatus "$InvocationType invocation of ${scriptName}:"
    $scriptLiteral = ConvertTo-PowerShellDisplayLiteral -Value $ScriptPath
    if ($Arguments.Count -eq 0) {
        Write-Host "  & $scriptLiteral"
        return
    }

    Write-Host ('  & {0} `' -f $scriptLiteral)
    for ($index = 0; $index -lt $Arguments.Count; $index++) {
        $argument = $Arguments[$index]
        $continuation = if ($index -lt $Arguments.Count - 1) {
            ' `'
        }
        else {
            ''
        }
        if ([bool]$argument.IsSwitch) {
            Write-Host ('      {0}{1}' -f $argument.Name, $continuation)
        }
        else {
            $valueLiteral = ConvertTo-PowerShellDisplayLiteral `
                -Value ([string]$argument.Value)
            Write-Host (
                '      {0} {1}{2}' -f
                $argument.Name, $valueLiteral, $continuation
            )
        }
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
    if ($ShowShepherdTaskScriptOutput) {
        $prompt | copilot --yolo
        $copilotExitCode = $LASTEXITCODE
    }
    else {
        $capturedOutput = @($prompt | copilot --yolo 2>&1)
        $copilotExitCode = $LASTEXITCODE
    }
    if ($copilotExitCode -ne 0) {
        if (-not $ShowShepherdTaskScriptOutput -and
            $capturedOutput.Count -gt 0) {
            Write-ControlStatus (
                'Captured output from failed post-mortem recovery:'
            )
            Write-CapturedOutput -Output $capturedOutput
        }
        throw "Post-mortem recovery failed with exit code $copilotExitCode for '$RunDirectory'."
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
    $Stage00Script = Join-Path $ShepherdPlugin `
        'scripts\shepherd-task-00-init-campaign.ps1'
    $Stage15Script = Join-Path $ShepherdPlugin `
        'scripts\shepherd-task-15-prepare-create-issues.ps1'
    $Stage25Script = Join-Path $ShepherdPlugin `
        'scripts\shepherd-task-25-given-list.ps1'

    Write-Host '=== shepherd-task simple-math control run ===' -ForegroundColor Cyan
    Write-Host "Repository:          $Repo"
    Write-Host "Workareas directory: $WorkareasDir"
    Write-Host "Fixture root:        $FixtureRoot"
    Write-Host "Primary checkout:    $Target"
    Write-Host "Control worktree:    $ControlWorktree"
    Write-Host "Baseline branch:     $BaselineBranch"
    Write-Host "Control branch:      $ControlBranch"
    Write-Host ''
    Write-ControlStatus (
        'Canonical lifecycle: Stage 00 -> Stage 10 -> research gate -> ' +
        'Stage 15 -> Stage 20 -> Stage 25 -> Stage 30 -> Stage 40 -> Stage 50.'
    )
    Write-ControlStatus (
        'Stage 10 and the human/Copilot research gate are not run live.'
    )
    Write-ControlStatus (
        'This deterministic simple-math control fixture writes an already-resolved plan in their place.'
    )
    Write-ControlStatus (
        'Repository setup, offline contracts, and final verification are experiment operations, not shepherd-task stages.'
    )

    $currentPhase = 'checking required commands'
    Write-ControlStatus 'Experiment setup: validating prerequisites.'
    foreach ($commandName in @('git', 'gh', 'copilot', 'pwsh')) {
        if (-not (Get-Command $commandName -ErrorAction SilentlyContinue)) {
            throw "Required command was not found on PATH: $commandName"
        }
    }
    Invoke-CheckedNativeCommand `
        -FilePath 'gh' `
        -Arguments @('auth', 'status') `
        -Operation 'GitHub CLI authentication check'

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
    Write-ControlStatus 'Experiment setup: running offline contracts.'
    Invoke-CheckedPwshScript -Path (
        Join-Path $ShepherdPlugin 'test\lesson-propagation-default-contract.ps1'
    ) -OutputChannel Contract
    foreach ($contract in @(
        '05-stage20-artifact-contract.ps1',
        '06-stage40-review-contract.ps1',
        '07-driver-encoding-contract.ps1',
        '08-psncpps-contract.ps1',
        '09-skill-powershell-contract.ps1',
        '10-simple-math-fixture-contract.ps1'
    )) {
        Invoke-CheckedPwshScript `
            -Path (Join-Path $FixtureRoot $contract) `
            -OutputChannel Contract
    }

    $currentPhase = 'checking disposable repository'
    Write-ControlStatus 'Experiment setup: checking the disposable repository.'
    $repositoryInfoOutput = gh repo view $Repo --json nameWithOwner,defaultBranchRef 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "The disposable repository must have Actions, Copilot Coding Agent, and Copilot code review enabled: $($repositoryInfoOutput -join [Environment]::NewLine)"
    }
    if ($ShowNativeToolOutput) {
        Write-CapturedOutput -Output @($repositoryInfoOutput)
    }

    $currentPhase = 'cloning primary checkout'
    Write-ControlStatus 'Experiment setup: cloning the primary checkout.'
    Invoke-CheckedNativeCommand `
        -FilePath 'git' `
        -Arguments @('clone', $cloneUrl, $Target) `
        -Operation "Clone of '$Repo'"
    $headOutput = git -C $Target rev-parse --verify HEAD 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $headOutput) {
        Write-ControlStatus (
            'Experiment setup: initializing the empty disposable repository.'
        )
        Set-Content -LiteralPath (Join-Path $Target 'README.md') `
            -Value "# $repositoryName" -Encoding utf8NoBOM
        Invoke-CheckedNativeCommand `
            -FilePath 'git' `
            -Arguments @('-C', $Target, 'add', '--', 'README.md') `
            -Operation 'git add for initial README'
        Invoke-CheckedNativeCommand `
            -FilePath 'git' `
            -Arguments @('-C', $Target, 'commit', '-m', 'Initial commit') `
            -Operation 'Initial README commit'
        Invoke-CheckedNativeCommand `
            -FilePath 'git' `
            -Arguments @('-C', $Target, 'push', '-u', 'origin', 'HEAD') `
            -Operation 'Initial README push'
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
    Write-ControlStatus 'Experiment setup: creating the immutable simple-math baseline.'
    Invoke-CheckedPwshScript `
        -Path (Join-Path $FixtureRoot '00-prepare-test-baseline.ps1') `
        -Arguments @('-Repo', $Repo, '-BaselineBranch', $BaselineBranch) `
        -OutputChannel DomainFixture
    $BaselineSha = (git -C $Target rev-parse HEAD).Trim()
    Assert-NativeSuccess 'Baseline SHA lookup'
    if ($BaselineSha -notmatch '^[0-9a-f]{40}$') {
        throw "Invalid baseline SHA: $BaselineSha"
    }

    $currentPhase = 'creating control worktree'
    Write-ControlStatus 'Experiment setup: creating the control worktree.'
    Invoke-CheckedNativeCommand `
        -FilePath 'git' `
        -Arguments @(
            '-C', $Target, 'worktree', 'add', '--detach',
            $ControlWorktree, $BaselineSha
        ) `
        -Operation 'Control worktree creation'
    $ControlStart = (git -C $ControlWorktree rev-parse HEAD).Trim()
    Assert-NativeSuccess 'Control starting SHA lookup'
    if ($ControlStart -ne $BaselineSha) {
        throw 'Control worktree does not start at the immutable baseline SHA.'
    }

    $currentPhase = 'initializing control campaign'
    Set-Location -LiteralPath $ControlWorktree
    $stage00PlannedArguments = @(
        [pscustomobject]@{
            Name = '-CampaignIssueNumber'
            Value = '<CAMPAIGN_ISSUE_NUMBER>'
            IsSwitch = $false
        },
        [pscustomobject]@{
            Name = '-CampaignShortname'
            Value = 'math-control'
            IsSwitch = $false
        },
        [pscustomobject]@{
            Name = '-BaseBranch'
            Value = $ControlBranch
            IsSwitch = $false
        },
        [pscustomobject]@{
            Name = '-Repo'
            Value = $Repo
            IsSwitch = $false
        }
    )
    Write-ShepherdScriptInvocation `
        -Stage '00' `
        -Purpose 'Initialize campaign' `
        -InvocationType Planned `
        -ScriptPath $Stage00Script `
        -Arguments $stage00PlannedArguments
    Invoke-CheckedPwshScript `
        -Path (Join-Path $FixtureRoot '01-prepare-base-branch.ps1') `
        -Arguments @(
            '-Repo', $Repo,
            '-BaseBranch', $ControlBranch,
            '-CampaignShortname', 'math-control',
            '-BaselineSha', $BaselineSha
        ) `
        -OutputChannel DomainFixture
    $controlCampaign = Get-CampaignDirectory `
        -Worktree $ControlWorktree -Shortname 'math-control'
    $ControlDirectory = $controlCampaign.FullName
    $ControlDirectoryName = $controlCampaign.Name
    $campaignManifestPath = Join-Path $ControlDirectory `
        'shepherd-campaign.json'
    try {
        $CampaignManifest = Get-Content -LiteralPath $campaignManifestPath `
            -Raw | ConvertFrom-Json
    }
    catch {
        throw "Campaign manifest is invalid JSON: $campaignManifestPath. $($_.Exception.Message)"
    }
    if ($CampaignManifest.campaignIssueNumber -notmatch '^[1-9][0-9]*$' -or
        [string]$CampaignManifest.campaignShortname -ne 'math-control' -or
        [string]$CampaignManifest.baseBranch -ne $ControlBranch -or
        [string]$CampaignManifest.repository -ne $Repo -or
        [string]$CampaignManifest.campaignMetadataDirectory -ne
            $ControlDirectoryName) {
        throw "Campaign manifest does not match the control invocation: $campaignManifestPath"
    }
    $stage00ActualArguments = @(
        [pscustomobject]@{
            Name = '-CampaignIssueNumber'
            Value = [string]$CampaignManifest.campaignIssueNumber
            IsSwitch = $false
        },
        [pscustomobject]@{
            Name = '-CampaignShortname'
            Value = 'math-control'
            IsSwitch = $false
        },
        [pscustomobject]@{
            Name = '-BaseBranch'
            Value = $ControlBranch
            IsSwitch = $false
        },
        [pscustomobject]@{
            Name = '-Repo'
            Value = $Repo
            IsSwitch = $false
        }
    )
    Write-ShepherdScriptInvocation `
        -Stage '00' `
        -Purpose 'Initialize campaign' `
        -InvocationType Actual `
        -ScriptPath $Stage00Script `
        -Arguments $stage00ActualArguments
    Write-ControlStage -Stage '10' -Purpose 'Create ignorance-reduction plan'
    Write-ControlStatus (
        'Normal usage invokes skill shepherd-task-10-create-ignorance-reduction-plan.'
    )
    Write-ControlStatus (
        'Human and Copilot research then fills every implementation-gating Resolution block.'
    )
    Write-ControlStatus (
        'This simple-math fixture substituted an already-resolved math-tool-ignorance-reduction-plan.md for Stage 10 and the research gate.'
    )
    $ControlInitParent = (git -C $ControlWorktree rev-parse 'HEAD^').Trim()
    Assert-NativeSuccess 'Control initialization parent lookup'
    if ($ControlInitParent -ne $BaselineSha) {
        throw 'Control campaign initialization does not descend directly from the baseline.'
    }

    $currentPhase = 'creating control issues'
    $stage15Arguments = @(
        [pscustomobject]@{
            Name = '-CampaignMetadataDirectory'
            Value = $ControlDirectoryName
            IsSwitch = $false
        },
        [pscustomobject]@{
            Name = '-PassThru'
            Value = ''
            IsSwitch = $true
        }
    )
    Write-ShepherdScriptInvocation `
        -Stage '15' `
        -Purpose 'Prepare Stage 20' `
        -InvocationType Planned `
        -ScriptPath $Stage15Script `
        -Arguments $stage15Arguments
    Write-ControlStage -Stage '20' -Purpose 'Create issues from the resolved plan'
    Write-ControlStatus (
        'Stage 15 will generate a launcher that invokes skill shepherd-task-20-create-issues-from-plan.'
    )
    $stage25PlannedArguments = @(
        [pscustomobject]@{
            Name = '-TaskIssues'
            Value = '<TASK_ISSUE_LIST>'
            IsSwitch = $false
        },
        [pscustomobject]@{
            Name = '-CampaignMetadataDirectory'
            Value = $ControlDirectoryName
            IsSwitch = $false
        }
    )
    Write-ShepherdScriptInvocation `
        -Stage '25' `
        -Purpose 'Dispatch ordered issue list after Stage 20' `
        -InvocationType Planned `
        -ScriptPath $Stage25Script `
        -Arguments $stage25PlannedArguments
    Invoke-CheckedPwshScript `
        -Path (Join-Path $FixtureRoot '02-create-issues.ps1') `
        -Arguments @('-CampaignMetadataDirectory', $ControlDirectoryName) `
        -OutputChannel DomainFixture
    Write-ShepherdScriptInvocation `
        -Stage '15' `
        -Purpose 'Prepare Stage 20' `
        -InvocationType Actual `
        -ScriptPath $Stage15Script `
        -Arguments $stage15Arguments
    Write-ControlStatus (
        'Stage 20 completed through the generated launcher, and the fixture verified both issue bodies.'
    )
    $ControlHandoff = Get-CampaignHandoff -CampaignDirectory $ControlDirectory

    $currentPhase = 'running control stage 25'
    $stage25ActualArguments = @(
        [pscustomobject]@{
            Name = '-TaskIssues'
            Value = $ControlHandoff.IssueList
            IsSwitch = $false
        },
        [pscustomobject]@{
            Name = '-CampaignMetadataDirectory'
            Value = $ControlDirectoryName
            IsSwitch = $false
        }
    )
    Write-ShepherdScriptInvocation `
        -Stage '25' `
        -Purpose 'Dispatch ordered issue list' `
        -InvocationType Actual `
        -ScriptPath $Stage25Script `
        -Arguments $stage25ActualArguments
    Write-ControlStatus (
        "Stage 25 will process issues $($ControlHandoff.IssueList) serially."
    )
    Write-ControlStatus (
        'For each issue, Stage 30 moves assignment to the Ready-for-review boundary, then Stage 40 reviews and merges it.'
    )
    Write-ControlStatus (
        'Stage 50 creates the campaign post-mortem after success or failure.'
    )
    Write-ControlStatus (
        "Run evidence will be written beneath: $ControlDirectory\shepherd-tasks-<CAMPAIGN_ID>-<TIMESTAMP>"
    )
    if (-not $ShowShepherdTaskScriptOutput) {
        Write-ControlStatus (
            'Detailed per-issue output is hidden; use -ShowShepherdTaskScriptOutput to display it.'
        )
    }
    Invoke-CheckedPwshScript `
        -Path $Stage25Script `
        -Arguments @(
            '-TaskIssues', $ControlHandoff.IssueList,
            '-CampaignMetadataDirectory', $ControlDirectoryName
        ) `
        -OutputChannel ShepherdTaskScript
    Write-ControlStatus 'Stage 25 completed successfully for both issues.'

    $currentPhase = 'updating and verifying control campaign'
    Write-ControlStatus 'Experiment verification: synchronizing and checking the completed campaign.'
    Set-Location -LiteralPath $ControlWorktree
    Invoke-CheckedNativeCommand `
        -FilePath 'git' `
        -Arguments @('pull', '--ff-only') `
        -Operation 'Control fast-forward pull'
    Invoke-CheckedPwshScript `
        -Path (Join-Path $FixtureRoot '04-verify-control-campaign.ps1') `
        -Arguments @('-CampaignMetadataDirectory', $ControlDirectoryName) `
        -OutputChannel DomainFixture

    $currentPhase = 'collecting final evidence'
    Write-ControlStatus 'Experiment verification: collecting final evidence.'
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
