<#
.SYNOPSIS
    Derives stage-20 inputs and creates prompt and invocation artifacts.

.DESCRIPTION
    Loads campaign-owned values from shepherd-campaign.json, discovers the
    campaign plan and its semantic sections, resolves the Git remote matching
    the campaign repository, and writes stage-20 invocation artifacts.

.PARAMETER CampaignMetadataDirectory
    Repository-root-relative campaign metadata directory.

.PARAMETER PassThru
    Return an object describing generated artifacts for automation.

.EXAMPLE
    ./shepherd-task-prepare-create-issues.ps1 `
      -CampaignMetadataDirectory 123-math-tool-test-remove-before-merge
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$CampaignMetadataDirectory,

    [switch]$PassThru
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRootOutput = git rev-parse --show-toplevel 2>$null
if ($LASTEXITCODE -ne 0 -or -not $repoRootOutput) {
    throw 'Run this script inside the campaign Git worktree.'
}
$repoRoot = [System.IO.Path]::GetFullPath(($repoRootOutput | Select-Object -First 1).Trim())

if ([System.IO.Path]::IsPathRooted($CampaignMetadataDirectory)) {
    throw 'CampaignMetadataDirectory must be repository-root-relative, not absolute.'
}
if ($CampaignMetadataDirectory -ne (Split-Path -Leaf $CampaignMetadataDirectory)) {
    throw 'CampaignMetadataDirectory must be the basename of a repository-root directory.'
}

$campaignMetadataPath = [System.IO.Path]::GetFullPath(
    (Join-Path $repoRoot $CampaignMetadataDirectory)
)
if (-not (Test-Path -LiteralPath $campaignMetadataPath -PathType Container)) {
    throw "Campaign metadata directory not found: $campaignMetadataPath"
}
$campaignMetadataPath = (Resolve-Path -LiteralPath $campaignMetadataPath).Path
if ([System.IO.Directory]::GetParent($campaignMetadataPath).FullName -ne $repoRoot) {
    throw 'Campaign metadata directory must be a direct child of the repository root.'
}

$manifestPath = Join-Path $campaignMetadataPath 'shepherd-campaign.json'
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "Campaign manifest not found: $manifestPath"
}
try {
    $campaign = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
}
catch {
    throw "Campaign manifest is not valid JSON: $manifestPath"
}

if ($campaign.schemaVersion -ne 1) {
    throw "Unsupported campaign manifest schemaVersion '$($campaign.schemaVersion)'."
}
if ([string]$campaign.campaignId -notmatch '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$') {
    throw "Campaign manifest has an invalid campaignId: '$($campaign.campaignId)'."
}
if ($campaign.campaignIssueNumber -notmatch '^[1-9][0-9]*$') {
    throw "Campaign manifest has an invalid campaignIssueNumber: '$($campaign.campaignIssueNumber)'."
}
if ([string]$campaign.campaignShortname -notmatch '^[a-z0-9]+(-[a-z0-9]+)*$') {
    throw "Campaign manifest has an invalid campaignShortname: '$($campaign.campaignShortname)'."
}
if ([string]$campaign.repository -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$') {
    throw "Campaign manifest has an invalid repository: '$($campaign.repository)'."
}
if ([string]$campaign.baseBranch -eq 'main') {
    throw "Campaign manifest baseBranch must not be 'main'."
}
if ([string]$campaign.lessonPropagation -notin @('off', 'campaign')) {
    throw "Campaign manifest lessonPropagation must be 'off' or 'campaign'."
}

$expectedDirectory = "$($campaign.campaignIssueNumber)-$($campaign.campaignShortname)-remove-before-merge"
if (
    [string]$campaign.campaignMetadataDirectory -ne $expectedDirectory -or
    (Split-Path -Leaf $campaignMetadataPath) -ne $expectedDirectory
) {
    throw "Campaign manifest and directory must both use '$expectedDirectory'."
}

$REPO = [string]$campaign.repository
$BASE_BRANCH = [string]$campaign.baseBranch
$PARENT_ISSUE = [int]$campaign.campaignIssueNumber
$PLAN_DIRECTORY = [string]$campaign.campaignMetadataDirectory
$CAMPAIGN_ID = [string]$campaign.campaignId
$LESSON_PROPAGATION = [string]$campaign.lessonPropagation

$planFiles = @(
    Get-ChildItem -LiteralPath $campaignMetadataPath -File |
        Where-Object { $_.Name -like '*ignorance-reduction-plan.md' }
)
if ($planFiles.Count -ne 1) {
    throw "Expected exactly one *ignorance-reduction-plan.md in the campaign metadata directory; found $($planFiles.Count)."
}
$planPath = $planFiles[0].FullName
$PLAN_FILE_NAME = $planFiles[0].Name
$planLines = @(Get-Content -LiteralPath $planPath)
$inFence = $false
$semanticLines = @(
    foreach ($line in $planLines) {
        if ($line -match '^```') {
            $inFence = -not $inFence
            continue
        }
        if (-not $inFence) { $line }
    }
)

$questionHeadings = @($semanticLines | Where-Object { $_ -match '^##\s+.*ignorance reduction' })
if ($questionHeadings.Count -ne 1) {
    throw "Expected exactly one level-two ignorance-reduction heading in $PLAN_FILE_NAME; found $($questionHeadings.Count)."
}
$QUESTIONS_SECTION = [string]$questionHeadings[0]

$implementationHeadings = @($semanticLines | Where-Object { $_ -match '^##\s+.*implementation' })
if ($implementationHeadings.Count -ne 1) {
    throw "Expected exactly one level-two implementation heading in $PLAN_FILE_NAME; found $($implementationHeadings.Count)."
}
$IMPLEMENTATION_SECTION = [string]$implementationHeadings[0]
$implementationIndex = [Array]::IndexOf($planLines, $IMPLEMENTATION_SECTION)
$taskHeadingCount = 0
$inFence = $false
for ($index = $implementationIndex + 1; $index -lt $planLines.Count; $index++) {
    if ($planLines[$index] -match '^```') {
        $inFence = -not $inFence
        continue
    }
    if ($inFence) { continue }
    if ($planLines[$index] -match '^##\s+') { break }
    if ($planLines[$index] -match '^###\s+') { $taskHeadingCount++ }
}
if ($taskHeadingCount -eq 0) {
    throw "Implementation section '$IMPLEMENTATION_SECTION' has no direct level-three task headings."
}

function ConvertTo-GitHubRepository {
    param([string]$Url)

    $normalized = $Url -replace '\.git$', ''
    if ($normalized -match '^git@github\.com:(.+)$') { return $Matches[1] }
    if ($normalized -match '^https://github\.com/(.+)$') { return $Matches[1] }
    if ($normalized -match '^ssh://git@github\.com/(.+)$') { return $Matches[1] }
    return $null
}

$matchingRemotes = @()
$remotes = @(git remote)
if ($LASTEXITCODE -ne 0) { throw 'Could not list configured Git remotes.' }
foreach ($remote in $remotes) {
    $remoteUrl = (git remote get-url $remote 2>$null | Select-Object -First 1)
    if ($LASTEXITCODE -ne 0 -or -not $remoteUrl) {
        throw "Could not read URL for Git remote '$remote'."
    }
    $remoteRepo = ConvertTo-GitHubRepository $remoteUrl.Trim()
    if ($remoteRepo -and $remoteRepo.Equals($REPO, [StringComparison]::OrdinalIgnoreCase)) {
        $matchingRemotes += $remote
    }
}
if ($matchingRemotes.Count -ne 1) {
    throw "Expected exactly one Git remote whose GitHub URL matches '$REPO'; found $($matchingRemotes.Count)."
}
$BASE_REMOTE = [string]$matchingRemotes[0]

Write-Host '=== shepherd-task stage-20 preparation ===' -ForegroundColor Cyan
Write-Host "Campaign ID:                 $CAMPAIGN_ID"
Write-Host "Repository:                  $REPO"
Write-Host "Campaign base branch:        $BASE_BRANCH"
Write-Host "Campaign issue:              #$PARENT_ISSUE"
Write-Host "Lesson propagation:          $LESSON_PROPAGATION"
Write-Host "Campaign metadata directory: $PLAN_DIRECTORY"
Write-Host "Plan file:                   $PLAN_FILE_NAME"
Write-Host "Questions section:           $QUESTIONS_SECTION"
Write-Host "Implementation section:      $IMPLEMENTATION_SECTION"
Write-Host "Implementation tasks:        $taskHeadingCount"
Write-Host "Git remote:                  $BASE_REMOTE"

$timestamp = Get-Date -Format 'yyyyMMdd-HHmm'
$promptsDirectory = Join-Path $campaignMetadataPath 'prompts'
if (-not (Test-Path -LiteralPath $promptsDirectory)) {
    New-Item -ItemType Directory -Path $promptsDirectory | Out-Null
}
$logDirFull = Join-Path $promptsDirectory "shepherd-task-20-$timestamp"
if (Test-Path -LiteralPath $logDirFull) {
    throw "Stage-20 artifact directory already exists: $logDirFull"
}
New-Item -ItemType Directory -Path $logDirFull | Out-Null

$outFile = Join-Path $logDirFull "$timestamp-invoke-shepherd-task-20-create-issues-from-plan-skill.md"
$invocationFile = Join-Path $logDirFull "$timestamp-invoke-shepherd-task-20-create-issues-from-plan-skill.ps1"

$body = @"
Invoke skill ``shepherd-task-20-create-issues-from-plan`` with these inputs:

- CAMPAIGN_ID: $CAMPAIGN_ID
- LESSON_PROPAGATION: $LESSON_PROPAGATION
- REPO: $REPO
- BASE_BRANCH: $BASE_BRANCH
- PARENT_ISSUE: $PARENT_ISSUE
- PLAN_DIRECTORY: $PLAN_DIRECTORY
- PLAN_FILE_NAME: $PLAN_FILE_NAME
- QUESTIONS_SECTION: $QUESTIONS_SECTION
- IMPLEMENTATION_SECTION: $IMPLEMENTATION_SECTION
- EXPECTED_TASK_COUNT: $taskHeadingCount
- BASE_REMOTE: $BASE_REMOTE
- LOG_DIRECTORY: $logDirFull
"@

Set-Content -LiteralPath $outFile -Value $body -Encoding utf8NoBOM

$escapedOutFile = $outFile.Replace("'", "''")
$escapedLogDir = $logDirFull.Replace("'", "''")
$redactorPath = (Join-Path $PSScriptRoot 'redact-secrets.ps1').Replace("'", "''")
$command = @'
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$timestamp = '__TIMESTAMP__'
$logDirFull = '__LOG_DIRECTORY__'
$sessionSharePath = Join-Path $logDirFull "create-issues-session-$timestamp.md"
$sessionJsonPath = Join-Path $logDirFull "create-issues-session-$timestamp.json"
$sessionOtelPath = Join-Path $logDirFull "create-issues-otel-$timestamp.jsonl"
$promptPath = '__PROMPT_PATH__'
$prompt = Get-Content -LiteralPath $promptPath -Raw
Write-Output "[shepherd-task] Logging create-issues run to: $logDirFull"
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) "shepherd-redact-$([guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $tempDir | Out-Null
$rawJsonPath = Join-Path $tempDir 'session.json'
$rawSharePath = Join-Path $tempDir 'session.md'
$env:COPILOT_OTEL_FILE_EXPORTER_PATH = $sessionOtelPath
$copilotExit = 0
try {
    $prompt | copilot --yolo --output-format json --share $rawSharePath > $rawJsonPath
    $copilotExit = $LASTEXITCODE
    if (Test-Path -LiteralPath $rawJsonPath) {
        Move-Item -LiteralPath $rawJsonPath -Destination $sessionJsonPath -Force
    }
    if (Test-Path -LiteralPath $rawSharePath) {
        Move-Item -LiteralPath $rawSharePath -Destination $sessionSharePath -Force
    }
    & '__REDACTOR_PATH__' $logDirFull | Out-Null
}
finally {
    Remove-Item Env:\COPILOT_OTEL_FILE_EXPORTER_PATH -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}
if ($copilotExit -ne 0) {
    [Console]::Error.WriteLine("[shepherd-task] FAILED: copilot exited with code $copilotExit")
    exit $copilotExit
}
Write-Output '[shepherd-task] Create-issues session complete.'
exit 0
'@.Replace('__TIMESTAMP__', $timestamp).Replace('__LOG_DIRECTORY__', $escapedLogDir).Replace('__PROMPT_PATH__', $escapedOutFile).Replace('__REDACTOR_PATH__', $redactorPath)

Set-Content -LiteralPath $invocationFile -Value $command -Encoding utf8NoBOM

Write-Host ''
Write-Host 'Artifacts written:' -ForegroundColor Green
Write-Host "  Directory: $logDirFull"
Write-Host "  Prompt:    $outFile"
Write-Host "  Script:    $invocationFile"

if ($PassThru) {
    [pscustomobject]@{
        CampaignId = $CAMPAIGN_ID
        ArtifactDirectory = $logDirFull
        PromptFile = $outFile
        InvocationFile = $invocationFile
        PlanFile = $PLAN_FILE_NAME
        QuestionsSection = $QUESTIONS_SECTION
        ImplementationSection = $IMPLEMENTATION_SECTION
        BaseRemote = $BASE_REMOTE
        TaskCount = $taskHeadingCount
    }
}
