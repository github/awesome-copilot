<#
.SYNOPSIS
    Exercises the stage-20 interview and issue-creation skill for a test campaign.

.DESCRIPTION
    Generates a deterministic answers file containing the math-tool plan headings
    and stable example issues, invokes shepherd-task-interview-user-to-create-issues,
    executes its generated copilot --yolo script, and validates the resulting
    creation ledger.

    This script creates and links real GitHub issues through
    shepherd-task-20-create-issues-from-plan.

.PARAMETER CampaignMetadataDirectory
    Repository-root-relative campaign metadata directory created by
    01-prepare-base-branch.ps1.

.EXAMPLE
    ./02-create-issues.ps1 `
      -CampaignMetadataDirectory 123-math-tool-test-remove-before-merge
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$CampaignMetadataDirectory
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$exampleIssues = @(
    'https://github.com/github/copilot-sdk/issues/1758'
    'https://github.com/github/copilot-sdk/issues/1759'
    'https://github.com/github/copilot-sdk/issues/1760'
    'https://github.com/github/copilot-sdk/issues/1761'
    'https://github.com/github/copilot-sdk/issues/1762'
    'https://github.com/github/copilot-sdk/issues/1839'
    'https://github.com/github/copilot-sdk/issues/1840'
    'https://github.com/github/copilot-sdk/issues/1876'
    'https://github.com/github/copilot-sdk/issues/1842'
    'https://github.com/github/copilot-sdk/issues/1843'
    'https://github.com/github/copilot-sdk/issues/1884'
    'https://github.com/github/copilot-sdk/issues/2167'
    'https://github.com/github/copilot-sdk/issues/2168'
    'https://github.com/github/copilot-sdk/issues/2169'
    'https://github.com/github/copilot-sdk/issues/2146'
    'https://github.com/github/copilot-sdk/issues/2147'
    'https://github.com/github/copilot-sdk/issues/2148'
    'https://github.com/github/copilot-sdk/issues/2149'
    'https://github.com/github/copilot-sdk/issues/2150'
)

$repoRootOutput = git rev-parse --show-toplevel 2>$null
if ($LASTEXITCODE -ne 0 -or -not $repoRootOutput) {
    throw 'Run this script inside the test Git worktree.'
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
$manifestPath = Join-Path $campaignMetadataPath 'shepherd-campaign.json'
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "Campaign manifest not found: $manifestPath"
}
$campaign = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json

$interviewScript = [System.IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot '..' 'scripts' 'shepherd-task-interview-user-to-create-issues.ps1')
)
if (-not (Test-Path -LiteralPath $interviewScript -PathType Leaf)) {
    throw "Stage-20 interview script not found: $interviewScript"
}

$answers = [ordered]@{
    planFileName = 'math-tool-ignorance-reduction-plan.md'
    questionsSection = '## Phase 2 — Ignorance reduction'
    implementationSection = '## Phase 3 — Implementation (build order)'
    exampleIssues = $exampleIssues
    baseRemote = 'origin'
    issueType = 'Task'
    supportingArtifacts = @($CampaignMetadataDirectory)
}

$answersFile = Join-Path (
    [System.IO.Path]::GetTempPath()
) "shepherd-task-stage-20-answers-$([guid]::NewGuid().ToString('N')).json"
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText(
    $answersFile,
    ($answers | ConvertTo-Json -Depth 4) + [Environment]::NewLine,
    $utf8NoBom
)

try {
    Write-Host 'Generating stage-20 artifacts through the interview script...'
    $artifacts = & $interviewScript `
        -CampaignMetadataDirectory $CampaignMetadataDirectory `
        -AnswersFile $answersFile `
        -PassThru
}
finally {
    Remove-Item -LiteralPath $answersFile -Force -ErrorAction SilentlyContinue
}

if ($null -eq $artifacts) {
    throw 'Interview script did not return stage-20 artifact information.'
}
if (-not (Test-Path -LiteralPath $artifacts.PromptFile -PathType Leaf)) {
    throw "Interview prompt was not created: $($artifacts.PromptFile)"
}
if (-not (Test-Path -LiteralPath $artifacts.InvocationFile -PathType Leaf)) {
    throw "Interview invocation script was not created: $($artifacts.InvocationFile)"
}

$prompt = Get-Content -LiteralPath $artifacts.PromptFile -Raw
foreach ($exampleIssue in $exampleIssues) {
    if (-not $prompt.Contains($exampleIssue)) {
        throw "Generated stage-20 prompt is missing example issue '$exampleIssue'."
    }
}

Write-Host ''
Write-Host 'Executing generated stage-20 copilot --yolo invocation...'
& pwsh -NoLogo -NoProfile -File $artifacts.InvocationFile
if ($LASTEXITCODE -ne 0) {
    throw "Generated stage-20 invocation failed with exit code $LASTEXITCODE."
}

$ledgerPath = Join-Path $artifacts.ArtifactDirectory 'creation-ledger.json'
if (-not (Test-Path -LiteralPath $ledgerPath -PathType Leaf)) {
    throw "Stage 20 did not create its required ledger: $ledgerPath"
}

try {
    $ledger = @(Get-Content -LiteralPath $ledgerPath -Raw | ConvertFrom-Json)
}
catch {
    throw "Creation ledger is not valid JSON: $ledgerPath"
}

if ($ledger.Count -ne 4) {
    throw "Expected four ordered child issues from the plan; ledger contains $($ledger.Count)."
}

$issueNumbers = @()
foreach ($entry in $ledger) {
    if ($entry.number -notmatch '^[1-9][0-9]*$') {
        throw "Creation ledger entry has an invalid issue number: '$($entry.number)'."
    }
    if ($entry.body_verified -ne $true) {
        throw "Issue #$($entry.number) body was not verified."
    }
    if ($entry.linked -ne $true) {
        throw "Issue #$($entry.number) was not linked to campaign issue #$($campaign.campaignIssueNumber)."
    }
    $issueNumbers += [int]$entry.number
}

$orderedIssueList = $issueNumbers -join ','

Write-Host ''
Write-Host 'Stage 20 completed successfully.'
Write-Host "  Campaign ID:                 $($campaign.campaignId)"
Write-Host "  Campaign issue:              #$($campaign.campaignIssueNumber)"
Write-Host "  Campaign metadata directory: $CampaignMetadataDirectory"
Write-Host "  Stage-20 artifacts:          $($artifacts.ArtifactDirectory)"
Write-Host "  Ordered child issues:        $orderedIssueList"
Write-Host ''
Write-Host 'To start a shepherd-task-given-list run:'
Write-Host "  shepherd-task-given-list.ps1 `"$orderedIssueList`" $($campaign.baseBranch) $($campaign.repository)"
