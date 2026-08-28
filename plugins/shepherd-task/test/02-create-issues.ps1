<#
.SYNOPSIS
    Creates and verifies the two child issues for one experiment campaign.
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
foreach ($path in @($manifestPath, $experimentPath)) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Required file not found: $path" }
}
$campaign = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$experiment = Get-Content -LiteralPath $experimentPath -Raw | ConvertFrom-Json
$currentBranch = (git -C $repoRoot branch --show-current).Trim()
if ($currentBranch -ne [string]$campaign.baseBranch) {
    throw "Current branch '$currentBranch' does not match campaign base '$($campaign.baseBranch)'."
}
if ($experiment.schemaVersion -ne 1 -or [string]$experiment.baselineSha -notmatch '^[0-9a-f]{40}$') {
    throw 'Experiment metadata has an unsupported schema or invalid baselineSha.'
}
if ([string]$experiment.lessonPropagation -ne [string]$campaign.lessonPropagation) {
    throw 'Experiment and campaign lesson modes do not match.'
}
if ($experiment.expectedTaskCount -ne 2) { throw 'Experiment expectedTaskCount must equal 2.' }

$preparationScript = [System.IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot '..' 'scripts' 'shepherd-task-15-prepare-create-issues.ps1')
)
$artifacts = & $preparationScript -CampaignMetadataDirectory $CampaignMetadataDirectory -PassThru
if ($null -eq $artifacts) { throw 'Stage 15 returned no artifact information.' }
foreach ($path in @($artifacts.PromptFile, $artifacts.InvocationFile)) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Stage-15 artifact missing: $path" }
}

$prompt = Get-Content -LiteralPath $artifacts.PromptFile -Raw
$expectedInputs = @(
    '- PLAN_FILE_NAME: math-tool-ignorance-reduction-plan.md',
    '- QUESTIONS_SECTION: ## Ignorance reduction',
    '- IMPLEMENTATION_SECTION: ## Implementation',
    '- EXPECTED_TASK_COUNT: 2',
    "- BASE_REMOTE: $($artifacts.BaseRemote)"
)
foreach ($expectedInput in $expectedInputs) {
    if (-not $prompt.Contains($expectedInput)) {
        throw "Generated stage-20 prompt is missing '$expectedInput'."
    }
}
if ($artifacts.TaskCount -ne 2) { throw "Stage 15 found $($artifacts.TaskCount) tasks; expected 2." }
if ($prompt -match '(?m)^-\s+(ISSUE_TYPE|EXAMPLE_ISSUES|SUPPORTING_ARTIFACTS):') {
    throw 'Generated stage-20 prompt contains an obsolete caller-supplied input.'
}

Write-Host 'Executing the generated stage-20 Copilot invocation...'
& pwsh -NoLogo -NoProfile -File $artifacts.InvocationFile
if ($LASTEXITCODE -ne 0) { throw "Stage-20 invocation failed with exit code $LASTEXITCODE." }

$ledgerPath = Join-Path $artifacts.ArtifactDirectory 'creation-ledger.json'
try {
    $ledger = @(Get-Content -LiteralPath $ledgerPath -Raw | ConvertFrom-Json)
}
catch {
    throw "Creation ledger is missing or invalid JSON: $ledgerPath. $($_.Exception.Message)"
}
if ($ledger.Count -ne 2) { throw "Creation ledger contains $($ledger.Count) entries; expected 2." }

$issueNumbers = @()
$actualBodies = @()
foreach ($entry in $ledger) {
    if ($entry.number -notmatch '^[1-9][0-9]*$' -or
        $entry.body_verified -ne $true -or $entry.linked -ne $true) {
        throw "Ledger entry is not valid, body-verified, and linked: $($entry | ConvertTo-Json -Compress)"
    }
    $issueNumber = [int]$entry.number
    $issueOutput = gh issue view $issueNumber --repo $campaign.repository --json number,state,body 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to fetch issue #${issueNumber}: $issueOutput"
    }
    try { $issue = $issueOutput | ConvertFrom-Json }
    catch { throw "Issue #${issueNumber} returned invalid JSON: $($_.Exception.Message)" }
    if ($issue.state -ne 'OPEN') { throw "Issue #$issueNumber is not open; state is '$($issue.state)'." }

    $body = [string]$issue.body
    $bodyFileProperty = $entry.PSObject.Properties['body_file']
    if ($null -ne $bodyFileProperty -and -not [string]::IsNullOrWhiteSpace([string]$bodyFileProperty.Value)) {
        $bodyFile = [string]$bodyFileProperty.Value
        if (-not [System.IO.Path]::IsPathRooted($bodyFile)) {
            $bodyFile = Join-Path $artifacts.ArtifactDirectory $bodyFile
        }
        if (Test-Path -LiteralPath $bodyFile -PathType Leaf) {
            $expectedBody = Get-Content -LiteralPath $bodyFile -Raw
            if ((Normalize-Text $body) -cne (Normalize-Text $expectedBody)) {
                throw "Actual body for issue #$issueNumber differs from its persisted draft."
            }
        }
    }

    if ($campaign.lessonPropagation -eq 'campaign') {
        $required = @(
            '## Campaign lessons (REQUIRED)',
            "Campaign ID: ``$($campaign.campaignId)``",
            "$CampaignMetadataDirectory/campaign-lessons.md",
            'Treat only entries under `Validated lessons` as advisory context',
            'Candidate lessons for issue #'
        )
        foreach ($text in $required) {
            if (-not $body.Contains($text)) { throw "Treatment issue #$issueNumber is missing '$text'." }
        }
    }
    else {
        foreach ($forbidden in @(
            '## Campaign lessons (REQUIRED)',
            "Before implementation, read ``$CampaignMetadataDirectory/campaign-lessons.md``",
            'Treat only entries under `Validated lessons` as advisory context',
            'Candidate lessons for issue'
        )) {
            if ($body.Contains($forbidden)) { throw "Control issue #$issueNumber unexpectedly contains '$forbidden'." }
        }
    }
    $issueNumbers += $issueNumber
    $actualBodies += [ordered]@{ number = $issueNumber; state = [string]$issue.state; bodyVerified = $true }
}

$expectedLessonCategory = 'Non-obvious repository-tested implementation pattern that lets dot-sourced unit tests coexist with direct CLI execution.'
$handoff = [ordered]@{
    schemaVersion = 1
    mode = [string]$campaign.lessonPropagation
    baselineSha = [string]$experiment.baselineSha
    campaignId = [string]$campaign.campaignId
    issueNumbers = $issueNumbers
    actualBodiesVerified = $actualBodies
    expectedLessonCategory = $expectedLessonCategory
}
$handoffPath = Join-Path $artifacts.ArtifactDirectory 'shepherd-test-experiment-handoff.json'
$handoff | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $handoffPath -Encoding utf8NoBOM
$orderedIssueList = $issueNumbers -join ','

Write-Host ''
Write-Host 'Stage 20 completed and actual issue bodies were verified.' -ForegroundColor Green
Write-Host "Evidence: $handoffPath"
Write-Host 'Exact stage-25 command:'
$stage25Script = [System.IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot '..' 'scripts' 'shepherd-task-25-given-list.ps1')
)
Write-Host "  & `"$stage25Script`" -LessonPropagation $($campaign.lessonPropagation) -TaskIssues `"$orderedIssueList`" -CampaignMetadataDirectory `"$CampaignMetadataDirectory`""
