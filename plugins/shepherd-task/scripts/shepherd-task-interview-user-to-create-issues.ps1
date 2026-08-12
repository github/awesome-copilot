<#
.SYNOPSIS
    Creates stage-20 prompt and invocation artifacts for an initialized campaign.

.DESCRIPTION
    Loads campaign-owned values from shepherd-campaign.json. Remaining stage-20
    inputs are collected interactively or read from an answers JSON file. Artifacts
    are written below the campaign metadata directory's prompts directory.

.PARAMETER CampaignMetadataDirectory
    Repository-root-relative campaign metadata directory.

.PARAMETER AnswersFile
    Optional JSON file containing planFileName, questionsSection,
    implementationSection, exampleIssues, baseRemote, issueType, and
    supportingArtifacts.

.PARAMETER PassThru
    Return an object describing generated artifacts for automation.

.EXAMPLE
    ./shepherd-task-interview-user-to-create-issues.ps1 `
      -CampaignMetadataDirectory 123-math-tool-test-remove-before-merge
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$CampaignMetadataDirectory,

    [string]$AnswersFile,

    [switch]$PassThru
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Read-Required {
    param(
        [string]$Prompt,
        [string]$Default = ''
    )

    $displayPrompt = if ($Default) { "$Prompt [$Default]" } else { $Prompt }
    do {
        $value = Read-Host $displayPrompt
        if ([string]::IsNullOrWhiteSpace($value) -and $Default) {
            $value = $Default
        }
        if ([string]::IsNullOrWhiteSpace($value)) {
            Write-Host '  This input is required.' -ForegroundColor Yellow
        }
    } while ([string]::IsNullOrWhiteSpace($value))
    return $value.Trim()
}

function Get-RequiredAnswer {
    param(
        [pscustomobject]$Answers,
        [string]$Name
    )

    $property = $Answers.PSObject.Properties[$Name]
    if ($null -eq $property -or $null -eq $property.Value) {
        throw "Answers file is missing required property '$Name'."
    }

    $value = if ($property.Value -is [System.Array]) {
        ($property.Value | ForEach-Object { [string]$_ }) -join ','
    } else {
        [string]$property.Value
    }
    if ([string]::IsNullOrWhiteSpace($value)) {
        throw "Answers file property '$Name' must not be empty."
    }
    return $value.Trim()
}

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

Write-Host '=== shepherd-task-20-create-issues-from-plan — Input Interview ===' -ForegroundColor Cyan
Write-Host "Campaign ID:                 $CAMPAIGN_ID"
Write-Host "Repository:                  $REPO"
Write-Host "Campaign base branch:        $BASE_BRANCH"
Write-Host "Campaign issue:              #$PARENT_ISSUE"
Write-Host "Campaign metadata directory: $PLAN_DIRECTORY"
Write-Host ''

if ($AnswersFile) {
    $answersPath = if ([System.IO.Path]::IsPathRooted($AnswersFile)) {
        [System.IO.Path]::GetFullPath($AnswersFile)
    } else {
        [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $AnswersFile))
    }
    if (-not (Test-Path -LiteralPath $answersPath -PathType Leaf)) {
        throw "Answers file not found: $answersPath"
    }
    try {
        $answers = Get-Content -LiteralPath $answersPath -Raw | ConvertFrom-Json
    }
    catch {
        throw "Answers file is not valid JSON: $answersPath"
    }

    $PLAN_FILE_NAME = Get-RequiredAnswer $answers 'planFileName'
    $QUESTIONS_SECTION = Get-RequiredAnswer $answers 'questionsSection'
    $IMPLEMENTATION_SECTION = Get-RequiredAnswer $answers 'implementationSection'
    $EXAMPLE_ISSUES = Get-RequiredAnswer $answers 'exampleIssues'
    $BASE_REMOTE = Get-RequiredAnswer $answers 'baseRemote'
    $ISSUE_TYPE = Get-RequiredAnswer $answers 'issueType'
    $SUPPORTING_ARTIFACTS = Get-RequiredAnswer $answers 'supportingArtifacts'
} else {
    $PLAN_FILE_NAME = Read-Required '1/7  PLAN_FILE_NAME (name within campaign metadata directory)'

    Write-Host ''
    Write-Host '  Hint: copy the exact markdown heading from the plan.' -ForegroundColor DarkGray
    $QUESTIONS_SECTION = Read-Required '2/7  QUESTIONS_SECTION (exact resolved-questions heading)'
    $IMPLEMENTATION_SECTION = Read-Required '3/7  IMPLEMENTATION_SECTION (exact implementation heading)'

    Write-Host ''
    Write-Host '  Hint: provide full GitHub issue URLs separated by commas.' -ForegroundColor DarkGray
    $EXAMPLE_ISSUES = Read-Required '4/7  EXAMPLE_ISSUES (full issue URLs whose style to follow)'
    $BASE_REMOTE = Read-Required '5/7  BASE_REMOTE (git remote name)' 'upstream'
    $ISSUE_TYPE = Read-Required '6/7  ISSUE_TYPE (GitHub issue type for children)' 'Task'
    $SUPPORTING_ARTIFACTS = Read-Required '7/7  SUPPORTING_ARTIFACTS (repo-relative paths or constraints)' $PLAN_DIRECTORY
}

$planPath = Join-Path $campaignMetadataPath $PLAN_FILE_NAME
if (-not (Test-Path -LiteralPath $planPath -PathType Leaf)) {
    throw "Plan file not found in campaign metadata directory: $planPath"
}

$exampleIssueValues = @($EXAMPLE_ISSUES -split ',' | ForEach-Object { $_.Trim() })
if ($exampleIssueValues.Count -eq 0) {
    throw 'EXAMPLE_ISSUES must contain at least one issue URL.'
}
foreach ($exampleIssue in $exampleIssueValues) {
    if ($exampleIssue -notmatch '^https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/issues/[1-9][0-9]*$') {
        throw "Invalid EXAMPLE_ISSUES URL: '$exampleIssue'."
    }
}
$EXAMPLE_ISSUES = ($exampleIssueValues | Select-Object -Unique) -join ','

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
- REPO: $REPO
- BASE_BRANCH: $BASE_BRANCH
- PARENT_ISSUE: $PARENT_ISSUE
- PLAN_DIRECTORY: $PLAN_DIRECTORY
- PLAN_FILE_NAME: $PLAN_FILE_NAME
- QUESTIONS_SECTION: $QUESTIONS_SECTION
- IMPLEMENTATION_SECTION: $IMPLEMENTATION_SECTION
- EXAMPLE_ISSUES: $EXAMPLE_ISSUES
- BASE_REMOTE: $BASE_REMOTE
- ISSUE_TYPE: $ISSUE_TYPE
- SUPPORTING_ARTIFACTS: $SUPPORTING_ARTIFACTS
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
    & '__REDACTOR_PATH__' $tempDir | Out-Null
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
    }
}
