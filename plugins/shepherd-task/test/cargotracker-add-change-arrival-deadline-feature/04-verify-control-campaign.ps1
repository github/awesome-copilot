<#
.SYNOPSIS
    Verifies the completed shepherd-task Cargo Tracker control campaign.

.DESCRIPTION
    Checks campaign identity, stage-20 evidence, issue bodies, lesson-file
    immutability, and linked merged-PR ordering.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$CampaignMetadataDirectory
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Normalize-Text {
    param([string]$Text)
    return ($Text -replace "`r`n|`r", "`n").TrimEnd("`n")
}

function Normalize-Whitespace {
    param([string]$Text)
    return ([regex]::Replace($Text, '\s+', ' ')).Trim()
}

$repoRootOutput = @(git rev-parse --show-toplevel 2>$null)
$gitExitCode = $LASTEXITCODE
if ($gitExitCode -ne 0 -or $repoRootOutput.Count -eq 0) {
    throw 'Run this script inside the target test worktree.'
}
$repoRoot = [System.IO.Path]::GetFullPath(
    ([string]($repoRootOutput | Select-Object -First 1)).Trim()
)
if ([System.IO.Path]::IsPathRooted($CampaignMetadataDirectory) -or
    $CampaignMetadataDirectory -ne (Split-Path -Leaf $CampaignMetadataDirectory)) {
    throw 'CampaignMetadataDirectory must be a repository-root-relative basename.'
}

$campaignPath = Join-Path $repoRoot $CampaignMetadataDirectory
$issueBodyVerifier = [System.IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot '..' '..' 'scripts' 'verify-github-issue-body.ps1')
)
$manifestPath = Join-Path $campaignPath 'shepherd-campaign.json'
$experimentPath = Join-Path $campaignPath 'shepherd-test-experiment.json'
$lessonsPath = Join-Path $campaignPath 'campaign-lessons.md'
foreach ($path in @($manifestPath, $experimentPath, $lessonsPath)) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Required file not found: $path" }
}
if (-not (Test-Path -LiteralPath $issueBodyVerifier -PathType Leaf)) {
    throw "Issue body verifier not found: $issueBodyVerifier"
}

$campaign = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$experiment = Get-Content -LiteralPath $experimentPath -Raw | ConvertFrom-Json
$currentBranch = (git -C $repoRoot branch --show-current).Trim()
if ($currentBranch -ne [string]$campaign.baseBranch) {
    throw "Current branch '$currentBranch' does not match campaign base '$($campaign.baseBranch)'."
}
if ($campaign.schemaVersion -ne 1 -or $experiment.schemaVersion -ne 1) {
    throw 'Unsupported campaign or experiment schemaVersion.'
}
if ([string]$experiment.baselineSha -notmatch '^[0-9a-f]{40}$' -or
    $experiment.expectedTaskCount -ne 5 -or
    [string]$experiment.lessonPropagation -ne [string]$campaign.lessonPropagation) {
    throw 'Experiment metadata does not match the five-task campaign.'
}
if ([string]$campaign.lessonPropagation -ne 'off') {
    throw 'Control campaign must use lessonPropagation=off.'
}

$handoffFiles = @(
    Get-ChildItem -LiteralPath (Join-Path $campaignPath 'prompts') -Recurse -File `
        -Filter 'shepherd-test-experiment-handoff.json' -ErrorAction Stop
)
if ($handoffFiles.Count -ne 1) {
    throw "Expected exactly one stage-20 experiment handoff; found $($handoffFiles.Count)."
}
$handoffPath = $handoffFiles[0].FullName
$artifactDirectory = Split-Path -Parent $handoffPath
$ledgerPath = Join-Path $artifactDirectory 'creation-ledger.json'
try {
    $handoff = Get-Content -LiteralPath $handoffPath -Raw | ConvertFrom-Json
    $ledger = @(Get-Content -LiteralPath $ledgerPath -Raw | ConvertFrom-Json)
}
catch {
    throw "Unable to read stage-20 evidence: $($_.Exception.Message)"
}
if ($handoff.mode -ne $campaign.lessonPropagation -or
    $handoff.baselineSha -ne $experiment.baselineSha -or
    $handoff.campaignId -ne $campaign.campaignId) {
    throw 'Stage-20 handoff does not match campaign and experiment metadata.'
}
if ([string]::IsNullOrWhiteSpace([string]$handoff.expectedLessonCategory)) {
    throw 'Stage-20 handoff does not define the operator-only expected lesson category.'
}
if ($ledger.Count -ne 5 -or @($handoff.issueNumbers).Count -ne 5) {
    throw 'Stage-20 evidence must contain exactly five ordered issues.'
}
$issueNumbers = @($handoff.issueNumbers | ForEach-Object { [int]$_ })
for ($index = 0; $index -lt $issueNumbers.Count; $index++) {
    if ($issueNumbers[$index] -ne [int]$ledger[$index].number) {
        throw 'Handoff issue order does not match the creation ledger.'
    }
}

$lessons = Normalize-Text (Get-Content -LiteralPath $lessonsPath -Raw)
$issueBodies = @{}
for ($index = 0; $index -lt $issueNumbers.Count; $index++) {
    $issueNumber = $issueNumbers[$index]
    $bodyFileProperty = $ledger[$index].PSObject.Properties['bodyFile']
    if ($null -eq $bodyFileProperty -or
        [string]::IsNullOrWhiteSpace([string]$bodyFileProperty.Value) -or
        [System.IO.Path]::IsPathRooted([string]$bodyFileProperty.Value)) {
        throw "Ledger entry for issue #$issueNumber has no valid relative bodyFile."
    }
    $bodyFile = Join-Path $artifactDirectory ([string]$bodyFileProperty.Value)
    $diagnosticPath = Join-Path $artifactDirectory "issue-$issueNumber-final-body-verification-failure.json"
    $issue = & $issueBodyVerifier `
        -Repository $campaign.repository `
        -IssueNumber $issueNumber `
        -ExpectedBodyPath $bodyFile `
        -DiagnosticPath $diagnosticPath
    if ([string]$issue.state -ne 'closed') {
        throw "Issue #$issueNumber is '$($issue.state)', expected closed after stage 25."
    }
    $issueBodies[$issueNumber] = [string]$issue.body
}

$expectedPlaceholder = @'
# Campaign lessons

This file contains validated, reusable lessons for subsequent issues in this campaign.
The issue specification and repository instructions remain authoritative.

## Validated lessons

No validated lessons have been recorded yet.
'@
if ($lessons -cne (Normalize-Text $expectedPlaceholder)) {
    throw 'Control campaign-lessons.md no longer has the exact initial placeholder content.'
}
foreach ($issueNumber in $issueNumbers) {
    $normalizedBody = Normalize-Whitespace $issueBodies[$issueNumber]
    foreach ($forbidden in @(
        '## Campaign lessons (REQUIRED)',
        "Before implementation, read ``$CampaignMetadataDirectory/campaign-lessons.md``",
        'Treat only entries under `Validated lessons` as advisory context',
        'Candidate lessons for issue'
    )) {
        if ($normalizedBody.Contains((Normalize-Whitespace $forbidden))) {
            throw "Control issue #$issueNumber unexpectedly contains '$forbidden'."
        }
    }
}

$linkedPrs = @()
for ($index = 0; $index -lt $issueNumbers.Count; $index++) {
    $issueNumber = $issueNumbers[$index]
    $issueWithPrsOutput = gh api "/repos/$($campaign.repository)/issues/$issueNumber/timeline?per_page=100" `
        -H 'Accept: application/vnd.github+json' `
        --jq '.[] | select(.event == "cross-referenced") | select(.source.issue.pull_request != null) | .source.issue.number' 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to query linked PRs for issue #${issueNumber}: $issueWithPrsOutput"
    }
    $references = @(
        $issueWithPrsOutput |
            Where-Object { $_ -match '^[1-9][0-9]*$' } |
            ForEach-Object { [int]$_ } |
            Select-Object -Unique
    )
    $matching = @()
    foreach ($prNumber in $references) {
        $prOutput = gh pr view $prNumber --repo $campaign.repository `
            --json number,state,mergedAt,createdAt,baseRefName,headRefOid,url,title 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Unable to fetch linked PR #$prNumber for issue #${issueNumber}: $prOutput"
        }
        try { $pr = $prOutput | ConvertFrom-Json }
        catch { throw "Linked PR #$prNumber returned invalid JSON: $($_.Exception.Message)" }
        if ($pr.state -eq 'MERGED' -and $pr.baseRefName -eq $campaign.baseBranch) {
            $matching += $pr
        }
    }
    if ($matching.Count -eq 0) {
        throw "Expected a merged PR to '$($campaign.baseBranch)' linked to issue #$issueNumber; found none."
    }
    $linkedPrs += @(
        $matching |
            Sort-Object { [DateTimeOffset]::Parse([string]$_.createdAt) } |
            Select-Object -First 1
    )
}

foreach ($pr in $linkedPrs) {
    $checksOutput = gh api "/repos/$($campaign.repository)/commits/$($pr.headRefOid)/check-runs?per_page=100" 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to query check runs for PR #$($pr.number) head $($pr.headRefOid): $checksOutput"
    }
    try { $checks = $checksOutput | ConvertFrom-Json }
    catch { throw "Check runs for PR #$($pr.number) returned invalid JSON: $($_.Exception.Message)" }
    $fixtureChecks = @(
        $checks.check_runs |
            Where-Object { $_.name -eq 'Shepherd task Cargo Tracker' }
    )
    if ($fixtureChecks.Count -eq 0 -or
        @($fixtureChecks | Where-Object { $_.conclusion -eq 'success' }).Count -eq 0) {
        throw "PR #$($pr.number) head $($pr.headRefOid) lacks a successful substantive 'Shepherd task Cargo Tracker' check."
    }
}

for ($index = 1; $index -lt $linkedPrs.Count; $index++) {
    $previousMergedAt = [DateTimeOffset]::Parse([string]$linkedPrs[$index - 1].mergedAt)
    $currentCreatedAt = [DateTimeOffset]::Parse([string]$linkedPrs[$index].createdAt)
    $currentMergedAt = [DateTimeOffset]::Parse([string]$linkedPrs[$index].mergedAt)
    if ($previousMergedAt -ge $currentMergedAt) {
        throw "Linked PR timestamps do not show issue $index merging before issue $($index + 1)."
    }
    if ($currentCreatedAt -lt $previousMergedAt) {
        throw "Issue $($index + 1) linked PR was created before issue $index merged; serial execution was not preserved."
    }
}

Write-Host 'Control campaign checks passed.' -ForegroundColor Green
Write-Host "  Mode: $($campaign.lessonPropagation)"
Write-Host "  Issues: $($issueNumbers -join ',')"
for ($index = 0; $index -lt $linkedPrs.Count; $index++) {
    Write-Host "  Issue $($index + 1) PR #$($linkedPrs[$index].number) created: $($linkedPrs[$index].createdAt)"
    Write-Host "  Issue $($index + 1) PR #$($linkedPrs[$index].number) merged: $($linkedPrs[$index].mergedAt)"
}
Write-Host "  Expected lesson category: $($handoff.expectedLessonCategory)"
