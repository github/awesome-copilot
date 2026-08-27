<#
.SYNOPSIS
    Exercises stage-20 preparation and issue creation for a test campaign.

.DESCRIPTION
    Invokes shepherd-task-prepare-create-issues, verifies its convention-derived
    inputs, executes its generated copilot --yolo script, and validates the
    resulting creation ledger.

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

$preparationScript = [System.IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot '..' 'scripts' 'shepherd-task-prepare-create-issues.ps1')
)
if (-not (Test-Path -LiteralPath $preparationScript -PathType Leaf)) {
    throw "Stage-20 preparation script not found: $preparationScript"
}

Write-Host 'Preparing stage-20 artifacts from campaign conventions...'
$artifacts = & $preparationScript `
    -CampaignMetadataDirectory $CampaignMetadataDirectory `
    -PassThru

if ($null -eq $artifacts) {
    throw 'Preparation script did not return stage-20 artifact information.'
}
if (-not (Test-Path -LiteralPath $artifacts.PromptFile -PathType Leaf)) {
    throw "Stage-20 prompt was not created: $($artifacts.PromptFile)"
}
if (-not (Test-Path -LiteralPath $artifacts.InvocationFile -PathType Leaf)) {
    throw "Stage-20 invocation script was not created: $($artifacts.InvocationFile)"
}

$prompt = Get-Content -LiteralPath $artifacts.PromptFile -Raw
$expectedInputs = @(
    '- PLAN_FILE_NAME: math-tool-ignorance-reduction-plan.md'
    '- QUESTIONS_SECTION: ## Phase 2 — Ignorance reduction'
    '- IMPLEMENTATION_SECTION: ## Phase 3 — Implementation (build order)'
    '- EXPECTED_TASK_COUNT: 4'
    '- BASE_REMOTE: origin'
)
foreach ($expectedInput in $expectedInputs) {
    if (-not $prompt.Contains($expectedInput)) {
        throw "Generated stage-20 prompt is missing derived input '$expectedInput'."
    }
}
if ($artifacts.TaskCount -ne 4) {
    throw "Expected four convention-discovered implementation tasks; found $($artifacts.TaskCount)."
}
if ($prompt -match '(?m)^-\s+(ISSUE_TYPE|EXAMPLE_ISSUES|SUPPORTING_ARTIFACTS):') {
    throw 'Generated stage-20 prompt contains an obsolete caller-supplied input.'
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
Write-Host "  Lesson propagation:         $($campaign.lessonPropagation)"
Write-Host "  Campaign issue:              #$($campaign.campaignIssueNumber)"
Write-Host "  Campaign metadata directory: $CampaignMetadataDirectory"
Write-Host "  Stage-20 artifacts:          $($artifacts.ArtifactDirectory)"
Write-Host "  Ordered child issues:        $orderedIssueList"
Write-Host ''
Write-Host 'To start a shepherd-task-given-list run:'
Write-Host "  shepherd-task-given-list.ps1 -LessonPropagation $($campaign.lessonPropagation) -TaskIssues `"$orderedIssueList`" -CampaignMetadataDirectory `"$CampaignMetadataDirectory`""
