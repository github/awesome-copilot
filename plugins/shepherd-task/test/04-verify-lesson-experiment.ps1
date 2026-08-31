<#
.SYNOPSIS
    Verifies one completed shepherd-task lesson mechanism campaign.

.DESCRIPTION
    Checks campaign identity, stage-20 evidence, issue bodies, lesson-file
    structure, and linked merged-PR ordering. Semantic lesson use remains a
    manual inspection.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$CampaignMetadataDirectory,

    [ValidateRange(1, [int]::MaxValue)]
    [int]$SecondIssuePrNumber
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

$repoRootOutput = git rev-parse --show-toplevel 2>$null
if ($LASTEXITCODE -ne 0 -or -not $repoRootOutput) {
    throw 'Run this script inside the target test worktree.'
}
$repoRoot = [System.IO.Path]::GetFullPath(($repoRootOutput | Select-Object -First 1).Trim())
if ([System.IO.Path]::IsPathRooted($CampaignMetadataDirectory) -or
    $CampaignMetadataDirectory -ne (Split-Path -Leaf $CampaignMetadataDirectory)) {
    throw 'CampaignMetadataDirectory must be a repository-root-relative basename.'
}

$campaignPath = Join-Path $repoRoot $CampaignMetadataDirectory
$manifestPath = Join-Path $campaignPath 'shepherd-campaign.json'
$experimentPath = Join-Path $campaignPath 'shepherd-test-experiment.json'
$lessonsPath = Join-Path $campaignPath 'campaign-lessons.md'
foreach ($path in @($manifestPath, $experimentPath, $lessonsPath)) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Required file not found: $path" }
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
    $experiment.expectedTaskCount -ne 2 -or
    [string]$experiment.lessonPropagation -ne [string]$campaign.lessonPropagation) {
    throw 'Experiment metadata does not match the two-task campaign.'
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
if ($ledger.Count -ne 2 -or @($handoff.issueNumbers).Count -ne 2) {
    throw 'Stage-20 evidence must contain exactly two ordered issues.'
}
$issueNumbers = @([int]$handoff.issueNumbers[0], [int]$handoff.issueNumbers[1])
if ($issueNumbers[0] -ne [int]$ledger[0].number -or $issueNumbers[1] -ne [int]$ledger[1].number) {
    throw 'Handoff issue order does not match the creation ledger.'
}

$lessons = Normalize-Text (Get-Content -LiteralPath $lessonsPath -Raw)
$initialPlaceholder = 'No validated lessons have been recorded yet.'
$issueBodies = @{}
foreach ($issueNumber in $issueNumbers) {
    $issueOutput = gh issue view $issueNumber --repo $campaign.repository --json number,body,state 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to fetch issue #${issueNumber}: $issueOutput"
    }
    try { $issue = $issueOutput | ConvertFrom-Json }
    catch { throw "Issue #${issueNumber} returned invalid JSON: $($_.Exception.Message)" }
    if ($issue.state -ne 'CLOSED') {
        throw "Issue #$issueNumber is '$($issue.state)', expected CLOSED after stage 25."
    }
    $issueBodies[$issueNumber] = [string]$issue.body
}

if ($campaign.lessonPropagation -eq 'campaign') {
    if ($lessons.Contains('## Candidate lessons for issue #')) {
        throw 'Treatment lessons file still contains a Candidate lessons section.'
    }
    if ($lessons.Contains($initialPlaceholder)) {
        throw 'Treatment lessons file still contains the initial placeholder.'
    }
    foreach ($issueNumber in $issueNumbers) {
        $headingPattern = "(?m)^## Validated lessons from issue #$issueNumber \(PR #[1-9][0-9]*\)$"
        if ($lessons -notmatch $headingPattern) {
            throw "Treatment lessons lack the stage-40 validated heading for issue #$issueNumber."
        }
    }
    $secondBody = Normalize-Whitespace $issueBodies[$issueNumbers[1]]
    foreach ($required in @(
        '## Campaign lessons (REQUIRED)',
        "Campaign ID: ``$($campaign.campaignId)``",
        "$CampaignMetadataDirectory/campaign-lessons.md",
        'Treat only entries under `Validated lessons` as advisory context',
        'Candidate lessons for issue #'
    )) {
        if (-not $secondBody.Contains((Normalize-Whitespace $required))) {
            throw "Treatment issue #$($issueNumbers[1]) is missing '$required'."
        }
    }
}
else {
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
            Where-Object { $_.name -eq 'Shepherd task math tool' }
    )
    if ($fixtureChecks.Count -eq 0 -or
        @($fixtureChecks | Where-Object { $_.conclusion -eq 'success' }).Count -eq 0) {
        throw "PR #$($pr.number) head $($pr.headRefOid) lacks a successful substantive 'Shepherd task math tool' check."
    }
}

$firstMergedAt = [DateTimeOffset]::Parse([string]$linkedPrs[0].mergedAt)
$secondCreatedAt = [DateTimeOffset]::Parse([string]$linkedPrs[1].createdAt)
$secondMergedAt = [DateTimeOffset]::Parse([string]$linkedPrs[1].mergedAt)
if ($firstMergedAt -ge $secondMergedAt) {
    throw 'Linked PR timestamps do not show issue 1 merging before issue 2.'
}
if ($secondCreatedAt -lt $firstMergedAt) {
    throw 'Issue 2 linked PR was created before issue 1 merged; serial execution was not preserved.'
}

Write-Host 'Mechanism checks passed.' -ForegroundColor Green
Write-Host "  Mode: $($campaign.lessonPropagation)"
Write-Host "  Issues: $($issueNumbers -join ',')"
Write-Host "  Issue 1 PR #$($linkedPrs[0].number) merged: $($linkedPrs[0].mergedAt)"
Write-Host "  Issue 2 PR #$($linkedPrs[1].number) created: $($linkedPrs[1].createdAt)"
Write-Host "  Issue 2 PR #$($linkedPrs[1].number) merged: $($linkedPrs[1].mergedAt)"
Write-Host "  Expected lesson category: $($handoff.expectedLessonCategory)"

if ($SecondIssuePrNumber) {
    $suppliedPrOutput = gh pr view $SecondIssuePrNumber --repo $campaign.repository `
        --json number,title,url,state,createdAt,mergedAt,baseRefName,body 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to fetch supplied second-issue PR #${SecondIssuePrNumber}: $suppliedPrOutput"
    }
    try { $suppliedPr = $suppliedPrOutput | ConvertFrom-Json }
    catch { throw "Supplied PR #${SecondIssuePrNumber} returned invalid JSON: $($_.Exception.Message)" }
    if ($SecondIssuePrNumber -ne [int]$linkedPrs[1].number) {
        throw "Supplied PR #$SecondIssuePrNumber is not issue 2's linked PR #$($linkedPrs[1].number)."
    }
    Write-Host "  Supplied second-issue PR: $($suppliedPr.url) - $($suppliedPr.title)"
    Write-Host '  Its body was fetched for manual inspection; prose is not treated as automatic proof.'
}

Write-Host ''
Write-Host 'MANUAL CHECK:' -ForegroundColor Yellow
Write-Host "Inspect issue #$($issueNumbers[1]) stage-30 session artifacts and PR changes/description."
Write-Host 'Look for evidence that issue 1 validated lessons were actually read and applied.'
Write-Host 'This verifier establishes mechanism and ordering only; it does not prove semantic lesson use.'
