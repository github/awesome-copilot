<#
.SYNOPSIS
    Regression coverage for stage-20 draft and result contracts.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptsDirectory = [System.IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot '..' '..' 'scripts')
)
$draftValidator = Join-Path $scriptsDirectory 'validate-stage20-drafts.ps1'
$resultAssertion = Join-Path $scriptsDirectory 'assert-stage20-result.ps1'
$redactor = Join-Path $scriptsDirectory 'redact-secrets.ps1'
$issueBodyVerifier = Join-Path $scriptsDirectory 'verify-github-issue-body.ps1'
$stage20Skill = [System.IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot '..\..\..\..\skills\shepherd-task-20-create-issues-from-plan\SKILL.md')
)
$tempDirectory = Join-Path ([System.IO.Path]::GetTempPath()) "shepherd-stage20-contract-$([guid]::NewGuid().ToString('N'))"
$bodyDirectory = Join-Path $tempDirectory 'issue-bodies'

function Assert-Fails {
    param(
        [scriptblock]$Operation,
        [string]$ExpectedMessage
    )

    try {
        & $Operation
    }
    catch {
        if (-not $_.Exception.Message.Contains($ExpectedMessage)) {
            throw "Expected failure containing '$ExpectedMessage'; observed '$($_.Exception.Message)'."
        }
        return
    }
    throw "Expected operation to fail with '$ExpectedMessage'."
}

function Read-ContractLedger {
    param([Parameter(Mandatory)][string]$Path)

    $parsed = [System.IO.File]::ReadAllText($Path) |
        ConvertFrom-Json -NoEnumerate
    if ($parsed -isnot [System.Array]) {
        throw 'Creation ledger JSON root must be an array.'
    }

    $ledger = [object[]]$parsed
    if (@($ledger | Where-Object { $_ -is [System.Array] }).Count -ne 0) {
        throw 'Creation ledger must not contain nested array entries.'
    }
    return $ledger
}

function Write-ContractLedger {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][AllowEmptyCollection()][object[]]$Ledger
    )

    $json = ConvertTo-Json -InputObject ([object[]]$Ledger) -Depth 10
    [System.IO.File]::WriteAllText(
        $Path,
        $json,
        [System.Text.UTF8Encoding]::new($false)
    )
}

try {
    New-Item -ItemType Directory -Path $bodyDirectory | Out-Null
    $stage20SkillText = [System.IO.File]::ReadAllText($stage20Skill)
    if (-not $stage20SkillText.Contains('ConvertFrom-Json -NoEnumerate') -or
        -not $stage20SkillText.Contains('return ,([object[]]@())') -or
        -not $stage20SkillText.Contains('capture output and then capture `$LASTEXITCODE` immediately')) {
        throw 'Stage-20 skill does not preserve the ledger and native exit-code safety requirements.'
    }

    $ledgerRoundTripPath = Join-Path $tempDirectory 'ledger-round-trip.json'
    Write-ContractLedger -Path $ledgerRoundTripPath -Ledger @()
    $emptyLedger = @(Read-ContractLedger -Path $ledgerRoundTripPath)
    if ($emptyLedger.Count -ne 0) {
        throw 'An empty creation ledger was read as one or more entries.'
    }

    $firstEntry = [ordered]@{
        number = 41
        body_verified = $false
        linked = $false
    }
    Write-ContractLedger -Path $ledgerRoundTripPath -Ledger @($firstEntry)
    $singleEntryLedger = @(Read-ContractLedger -Path $ledgerRoundTripPath)
    if ($singleEntryLedger.Count -ne 1 -or
        $singleEntryLedger[0] -is [System.Array] -or
        [int]$singleEntryLedger[0].number -ne 41) {
        throw 'A single-entry creation ledger did not remain a flat one-entry array.'
    }

    $singleEntryLedger += [ordered]@{
        number = 42
        body_verified = $true
        linked = $true
    }
    Write-ContractLedger -Path $ledgerRoundTripPath -Ledger $singleEntryLedger
    $multipleEntryLedger = @(Read-ContractLedger -Path $ledgerRoundTripPath)
    if ($multipleEntryLedger.Count -ne 2 -or
        @($multipleEntryLedger | Where-Object { $_ -is [System.Array] }).Count -ne 0 -or
        (@($multipleEntryLedger.number) -join ',') -ne '41,42') {
        throw 'A multiple-entry creation ledger did not remain a flat ordered array.'
    }

    [System.IO.File]::WriteAllText(
        $ledgerRoundTripPath,
        '[[],{"number":41}]',
        [System.Text.UTF8Encoding]::new($false)
    )
    Assert-Fails -ExpectedMessage 'must not contain nested array entries' -Operation {
        Read-ContractLedger -Path $ledgerRoundTripPath
    }

    $mockStatePath = Join-Path $tempDirectory 'mock-gh-state.txt'
    $mockScriptPath = Join-Path $tempDirectory 'mock-gh.mjs'
    $mockCommandPath = Join-Path $tempDirectory 'mock-gh.cmd'
    $mockScript = @'
import fs from 'node:fs';

const statePath = process.env.SHEPHERD_MOCK_GH_STATE;
const count = fs.existsSync(statePath)
    ? Number.parseInt(fs.readFileSync(statePath, 'utf8'), 10) + 1
    : 1;
fs.writeFileSync(statePath, String(count));

if (process.env.SHEPHERD_MOCK_GH_MODE === 'terminal') {
    console.error('HTTP 403: Resource not accessible');
    process.exit(1);
}

const freshAttempt = Number.parseInt(process.env.SHEPHERD_MOCK_GH_FRESH_ATTEMPT, 10);
const body = count < freshAttempt
    ? process.env.SHEPHERD_MOCK_GH_STALE_BODY
    : process.env.SHEPHERD_MOCK_GH_BODY;
process.stdout.write(JSON.stringify({ number: 41, state: 'open', body }));
'@
    [System.IO.File]::WriteAllText(
        $mockScriptPath,
        $mockScript,
        [System.Text.UTF8Encoding]::new($false)
    )
    $mockCommand = @"
@echo off
node "$mockScriptPath" %*
exit /b %ERRORLEVEL%
"@
    [System.IO.File]::WriteAllText(
        $mockCommandPath,
        $mockCommand,
        [System.Text.ASCIIEncoding]::new()
    )
    $env:SHEPHERD_MOCK_GH_STATE = $mockStatePath
    $env:SHEPHERD_MOCK_GH_MODE = 'body'
    $env:SHEPHERD_MOCK_GH_STALE_BODY = 'stale body'

    $validBody = @'
## Campaign context and required reading

Read the plan.

## Branch and execution order

Work serially.

## Implement

Implement the task.

## Completion gates

Run the tests.

## Out of scope

Do not expand scope.
'@
    $bodyPath = Join-Path $bodyDirectory '01-task-body.md'
    [System.IO.File]::WriteAllText($bodyPath, $validBody, [System.Text.UTF8Encoding]::new($false))
    & $draftValidator -BodyDirectory $bodyDirectory -ExpectedCount 1 -LessonPropagation off | Out-Null

    $flattenedBody = $validBody -replace '\r?\n', ' '
    [System.IO.File]::WriteAllText($bodyPath, $flattenedBody, [System.Text.UTF8Encoding]::new($false))
    Assert-Fails -ExpectedMessage 'physical Markdown lines' -Operation {
        & $draftValidator -BodyDirectory $bodyDirectory -ExpectedCount 1 -LessonPropagation off
    }

    $resultPath = Join-Path $tempDirectory 'stage-20-result.json'
    $ledgerPath = Join-Path $tempDirectory 'creation-ledger.json'
    @(
        [ordered]@{
            implementationSubsection = '1. First task'
            bodyFile = 'issue-bodies/01-task-body.md'
            id = 1001
            number = 41
            title = 'First task'
            url = 'https://github.example/issues/41'
            body_verified = $true
            linked = $true
        },
        [ordered]@{
            implementationSubsection = '2. Second task'
            bodyFile = 'issue-bodies/02-task-body.md'
            id = 1002
            number = 42
            title = 'Second task'
            url = 'https://github.example/issues/42'
            body_verified = $true
            linked = $true
        }
    ) | ConvertTo-Json | Set-Content -LiteralPath $ledgerPath -Encoding utf8NoBOM
    [ordered]@{
        schemaVersion = 1
        status = 'complete'
        ledgerFile = 'creation-ledger.json'
        operationError = $null
    } | ConvertTo-Json | Set-Content -LiteralPath $resultPath -Encoding utf8NoBOM
    & $resultAssertion -ResultPath $resultPath | Out-Null

    [ordered]@{
        schemaVersion = 1
        status = 'failed'
        ledgerFile = 'creation-ledger.json'
        operationError = 'Body verification failed.'
    } | ConvertTo-Json | Set-Content -LiteralPath $resultPath -Encoding utf8NoBOM
    Assert-Fails -ExpectedMessage "reported status 'failed'" -Operation {
        & $resultAssertion -ResultPath $resultPath
    }

    Remove-Item -LiteralPath $resultPath
    Assert-Fails -ExpectedMessage 'did not write its required result document' -Operation {
        & $resultAssertion -ResultPath $resultPath
    }

    [ordered]@{
        schemaVersion = 1
        status = 'complete'
        ledgerFile = 'creation-ledger.json'
        operationError = $null
    } | ConvertTo-Json | Set-Content -LiteralPath $resultPath -Encoding utf8NoBOM
    $telemetryPath = Join-Path $tempDirectory 'telemetry.json'
    [ordered]@{
        issueNumbers = @(12, 13)
        flags = @($true, $false)
        secret = 'sensitive'
    } | ConvertTo-Json | Set-Content -LiteralPath $telemetryPath -Encoding utf8NoBOM
    & $redactor $tempDirectory | Out-Null
    $telemetry = Get-Content -LiteralPath $telemetryPath -Raw | ConvertFrom-Json
    $redactedLedger = @(Get-Content -LiteralPath $ledgerPath -Raw | ConvertFrom-Json)
    $redactedResult = Get-Content -LiteralPath $resultPath -Raw | ConvertFrom-Json
    if ((@($telemetry.issueNumbers) -join ',') -ne '12,13' -or
        (@($telemetry.flags) -join ',') -ne 'True,False' -or
        [string]$telemetry.secret -ne '[REDACTED]' -or
        (@($redactedLedger.number) -join ',') -ne '41,42' -or
        @($redactedLedger.body_verified) -contains $false -or
        [string]$redactedResult.status -ne 'complete') {
        throw 'Redaction corrupted scalar arrays or failed to redact a sensitive field.'
    }

    $verificationBodyPath = Join-Path $tempDirectory 'verification-body.md'
    [System.IO.File]::WriteAllText(
        $verificationBodyPath,
        "expected`nbody",
        [System.Text.UTF8Encoding]::new($false)
    )
    $env:SHEPHERD_MOCK_GH_BODY = "expected`nbody"
    $env:SHEPHERD_MOCK_GH_FRESH_ATTEMPT = '2'
    Remove-Item -LiteralPath $mockStatePath -ErrorAction SilentlyContinue
    $verifiedIssue = & $issueBodyVerifier `
        -Repository 'owner/repository' `
        -IssueNumber 41 `
        -ExpectedBodyPath $verificationBodyPath `
        -MaxAttempts 2 `
        -DelaySeconds 0 `
        -GitHubCli $mockCommandPath
    if ([string]$verifiedIssue.body -cne "expected`nbody" -or
        [int](Get-Content -LiteralPath $mockStatePath -Raw) -ne 2) {
        throw 'Issue body verifier did not recover from a stale first REST response.'
    }

    $unicodeBody = "expected `u{2014} body"
    [System.IO.File]::WriteAllText(
        $verificationBodyPath,
        $unicodeBody,
        [System.Text.UTF8Encoding]::new($false)
    )
    $env:SHEPHERD_MOCK_GH_BODY = $unicodeBody
    $env:SHEPHERD_MOCK_GH_FRESH_ATTEMPT = '1'
    Remove-Item -LiteralPath $mockStatePath -ErrorAction SilentlyContinue
    $originalConsoleOutputEncoding = [Console]::OutputEncoding
    try {
        $oemEncoding = [System.Text.Encoding]::GetEncoding(437)
        [Console]::OutputEncoding = $oemEncoding
        $verifiedIssue = & $issueBodyVerifier `
            -Repository 'owner/repository' `
            -IssueNumber 41 `
            -ExpectedBodyPath $verificationBodyPath `
            -MaxAttempts 1 `
            -DelaySeconds 0 `
            -GitHubCli $mockCommandPath
        if ([string]$verifiedIssue.body -cne $unicodeBody) {
            throw 'Issue body verifier corrupted UTF-8 output under an OEM console code page.'
        }
        if ([Console]::OutputEncoding.CodePage -ne $oemEncoding.CodePage) {
            throw 'Issue body verifier did not restore the caller console encoding.'
        }
    }
    finally {
        [Console]::OutputEncoding = $originalConsoleOutputEncoding
    }

    [System.IO.File]::WriteAllText(
        $verificationBodyPath,
        "expected`r`nbody",
        [System.Text.UTF8Encoding]::new($false)
    )
    $env:SHEPHERD_MOCK_GH_BODY = "expected`nbody"
    $env:SHEPHERD_MOCK_GH_FRESH_ATTEMPT = '1'
    Remove-Item -LiteralPath $mockStatePath -ErrorAction SilentlyContinue
    & $issueBodyVerifier `
        -Repository 'owner/repository' `
        -IssueNumber 41 `
        -ExpectedBodyPath $verificationBodyPath `
        -MaxAttempts 1 `
        -DelaySeconds 0 `
        -GitHubCli $mockCommandPath | Out-Null

    [System.IO.File]::WriteAllText(
        $verificationBodyPath,
        'expected',
        [System.Text.UTF8Encoding]::new($false)
    )
    $env:SHEPHERD_MOCK_GH_BODY = "expected`n"
    Remove-Item -LiteralPath $mockStatePath -ErrorAction SilentlyContinue
    & $issueBodyVerifier `
        -Repository 'owner/repository' `
        -IssueNumber 41 `
        -ExpectedBodyPath $verificationBodyPath `
        -MaxAttempts 1 `
        -DelaySeconds 0 `
        -GitHubCli $mockCommandPath | Out-Null

    $diagnosticPath = Join-Path $tempDirectory 'body-verification-failure.json'
    $env:SHEPHERD_MOCK_GH_BODY = "expected`n`n"
    Remove-Item -LiteralPath $mockStatePath -ErrorAction SilentlyContinue
    Assert-Fails -ExpectedMessage 'failed after 1 attempts' -Operation {
        & $issueBodyVerifier `
            -Repository 'owner/repository' `
            -IssueNumber 41 `
            -ExpectedBodyPath $verificationBodyPath `
            -MaxAttempts 1 `
            -DelaySeconds 0 `
            -DiagnosticPath $diagnosticPath `
            -GitHubCli $mockCommandPath
    }
    $diagnostic = Get-Content -LiteralPath $diagnosticPath -Raw | ConvertFrom-Json
    if ($diagnostic.attempts -ne 1 -or
        $diagnostic.expectedSha256 -eq $diagnostic.actualSha256 -or
        $null -eq $diagnostic.firstDifference) {
        throw 'Persistent body mismatch diagnostics are incomplete.'
    }

    $env:SHEPHERD_MOCK_GH_BODY = 'always wrong'
    Remove-Item -LiteralPath $mockStatePath -ErrorAction SilentlyContinue
    Assert-Fails -ExpectedMessage 'failed after 3 attempts' -Operation {
        & $issueBodyVerifier `
            -Repository 'owner/repository' `
            -IssueNumber 41 `
            -ExpectedBodyPath $verificationBodyPath `
            -MaxAttempts 3 `
            -DelaySeconds 0 `
            -GitHubCli $mockCommandPath
    }
    if ([int](Get-Content -LiteralPath $mockStatePath -Raw) -ne 3) {
        throw 'Persistent body mismatch did not exhaust the configured retry count.'
    }

    $env:SHEPHERD_MOCK_GH_MODE = 'terminal'
    Remove-Item -LiteralPath $mockStatePath -ErrorAction SilentlyContinue
    Assert-Fails -ExpectedMessage 'Unable to fetch issue #41' -Operation {
        & $issueBodyVerifier `
            -Repository 'owner/repository' `
            -IssueNumber 41 `
            -ExpectedBodyPath $verificationBodyPath `
            -MaxAttempts 3 `
            -DelaySeconds 0 `
            -GitHubCli $mockCommandPath
    }
    if ([int](Get-Content -LiteralPath $mockStatePath -Raw) -ne 1) {
        throw 'Terminal GitHub failure was retried.'
    }
}
finally {
    Remove-Item Env:\SHEPHERD_MOCK_GH_STATE -ErrorAction SilentlyContinue
    Remove-Item Env:\SHEPHERD_MOCK_GH_MODE -ErrorAction SilentlyContinue
    Remove-Item Env:\SHEPHERD_MOCK_GH_STALE_BODY -ErrorAction SilentlyContinue
    Remove-Item Env:\SHEPHERD_MOCK_GH_BODY -ErrorAction SilentlyContinue
    Remove-Item Env:\SHEPHERD_MOCK_GH_FRESH_ATTEMPT -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $tempDirectory -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host 'Stage-20 artifact contract tests passed.' -ForegroundColor Green
