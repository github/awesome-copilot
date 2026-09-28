# shepherd-task-version: 1.0.5
<#
.SYNOPSIS
    Verifies semantic shepherd-session outcome enforcement.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$pluginRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$assertionPath = Join-Path $pluginRoot 'scripts\assert-shepherd-session-outcome.ps1'
$orchestratorPath = Join-Path $pluginRoot 'scripts\shepherd-task.ps1'
$tempDirectory = Join-Path (
    [System.IO.Path]::GetTempPath()
) "shepherd-session-outcome-$([guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $tempDirectory | Out-Null

function Write-Transcript {
    param(
        [string]$Name,
        [string]$Text
    )

    $path = Join-Path $tempDirectory $Name
    [System.IO.File]::WriteAllText(
        $path,
        $Text,
        [System.Text.UTF8Encoding]::new($false)
    )
    return $path
}

function Assert-Fails {
    param(
        [scriptblock]$Action,
        [string]$ExpectedMessage
    )

    try {
        & $Action
    }
    catch {
        if (-not $_.Exception.Message.Contains($ExpectedMessage)) {
            throw "Expected failure containing '$ExpectedMessage', got '$($_.Exception.Message)'."
        }
        return
    }
    throw "Expected failure containing '$ExpectedMessage'."
}

try {
    $successfulStage30 = Write-Transcript -Name 'stage30-success.md' -Text @'
Earlier tool output mentioned SHEPHERD FAILED: but was not a terminal marker.
**SHEPHERD COMPLETE:** PR #24 for task #14 is ready for marking as "Ready for review".
'@
    $stage30Result = & $assertionPath `
        -SharePath $successfulStage30 -Stage 30 -TaskIssue 14 -PRNumber 24
    if ($stage30Result.Status -ne 'complete') {
        throw 'Successful stage 30 transcript was not accepted.'
    }

    $failedStage30 = Write-Transcript -Name 'stage30-failure.md' -Text @'
The GitHub CLI and Copilot CLI both returned process exit code 0.
**SHEPHERD FAILED:** Copilot completed a follow-up work cycle on PR #24 but did not push a new HEAD within 20 minutes.
'@
    Assert-Fails -ExpectedMessage 'Stage 30 reported semantic failure' -Action {
        & $assertionPath `
            -SharePath $failedStage30 -Stage 30 -TaskIssue 14 -PRNumber 24
    }

    $successfulStage40 = Write-Transcript -Name 'stage40-success.md' -Text @'
>> **SHEPHERD COMPLETE:** PR #24 for task #14 was merged into experiment/shepherd-control.
'@
    & $assertionPath `
        -SharePath $successfulStage40 -Stage 40 -TaskIssue 14 -PRNumber 24 |
        Out-Null

    $missingMarker = Write-Transcript -Name 'missing-marker.md' -Text 'Session ended normally.'
    Assert-Fails -ExpectedMessage 'did not report a terminal' -Action {
        & $assertionPath `
            -SharePath $missingMarker -Stage 30 -TaskIssue 14 -PRNumber 24
    }

    Assert-Fails -ExpectedMessage 'does not identify task #14 and PR #25' -Action {
        & $assertionPath `
            -SharePath $successfulStage30 -Stage 30 -TaskIssue 14 -PRNumber 25
    }

    $prefixCollision = Write-Transcript -Name 'prefix-collision.md' -Text @'
**SHEPHERD COMPLETE:** PR #240 for task #140 is ready for marking as "Ready for review".
'@
    Assert-Fails -ExpectedMessage 'does not identify task #14 and PR #24' -Action {
        & $assertionPath `
            -SharePath $prefixCollision -Stage 30 -TaskIssue 14 -PRNumber 24
    }

    Assert-Fails -ExpectedMessage 'reported completion, but no linked PR was found' -Action {
        & $assertionPath `
            -SharePath $successfulStage30 -Stage 30 -TaskIssue 14 -PRNumber 0
    }

    $blockingCheckFilter = '.[] | select((.bucket == "pass" or .bucket == "skipping" or (.bucket == "fail" and .name == "No remove-before-merge directories")) | not) | "\(.name): \(.bucket)"'
    $ciChecksJson = @'
[
  {"name":"passing","state":"SUCCESS","bucket":"pass"},
  {"name":"skipped","state":"SKIPPED","bucket":"skipping"},
  {"name":"No remove-before-merge directories","state":"FAILURE","bucket":"fail"},
  {"name":"pending","state":"PENDING","bucket":"pending"},
  {"name":"cancelled","state":"CANCELLED","bucket":"cancel"},
  {"name":"failed","state":"FAILURE","bucket":"fail"},
  {"name":"future-state","state":"UNKNOWN","bucket":"unknown"}
]
'@
    $blockingChecks = @($ciChecksJson | jq -r $blockingCheckFilter)
    $jqExitCode = $LASTEXITCODE
    if ($jqExitCode -ne 0) {
        throw "Unable to evaluate the CI gate fixture; jq exited $jqExitCode."
    }
    $expectedBlockingChecks = @(
        'pending: pending',
        'cancelled: cancel',
        'failed: fail',
        'future-state: unknown'
    )
    if (($blockingChecks -join "`n") -ne ($expectedBlockingChecks -join "`n")) {
        throw "CI gate accepted a nonterminal or unsuccessful check bucket: $($blockingChecks -join ', ')"
    }

    $orchestrator = [System.IO.File]::ReadAllText($orchestratorPath)
    foreach ($required in @(
        'resuming Phase 1',
        '-Stage 30',
        '-Stage 40',
        'Find-LinkedPR -State MERGED',
        'closingIssuesReferences',
        '(^|[^0-9])#$TaskIssue([^0-9]|$)',
        '(^|[^0-9])$TaskIssue([^0-9]|$)',
        '[Collections.Generic.HashSet[int]]::new()',
        'Multiple $State PRs close task issue',
        'was already completed by PR',
        '--json state,isDraft,baseRefName,reviewDecision',
        '$runPhase1 = $true',
        'is already ready for review — resuming Phase 2',
        'has no successful Stage 30 transcript for that PR',
        '-SharePath $candidate.FullName',
        'gh api graphql --paginate --slurp',
        "reviewDecision -eq 'CHANGES_REQUESTED'",
        '$reviewDecision -ne ''CHANGES_REQUESTED''',
        $blockingCheckFilter
    )) {
        if (-not $orchestrator.Contains($required)) {
            throw "PowerShell orchestrator is missing semantic outcome contract text: $required"
        }
    }
    if ($orchestrator.Contains(
        '.[] | select(.bucket == "fail") | select(.name != "No remove-before-merge directories")'
    )) {
        throw 'PowerShell orchestrator still accepts pending checks through the failure-only filter.'
    }
    if ($orchestrator.Contains('test(`"#$TaskIssue`")')) {
        throw 'PowerShell orchestrator still uses a prefix-colliding issue body search.'
    }
}
finally {
    Remove-Item -LiteralPath $tempDirectory -Recurse -Force
}

Write-Host 'Shepherd session outcome contract tests passed.' -ForegroundColor Green
