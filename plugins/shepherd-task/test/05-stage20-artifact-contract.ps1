<#
.SYNOPSIS
    Regression coverage for stage-20 draft and result contracts.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptsDirectory = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..' 'scripts'))
$draftValidator = Join-Path $scriptsDirectory 'validate-stage20-drafts.ps1'
$resultAssertion = Join-Path $scriptsDirectory 'assert-stage20-result.ps1'
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

try {
    New-Item -ItemType Directory -Path $bodyDirectory | Out-Null
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
    [ordered]@{
        schemaVersion = 1
        status = 'complete'
        ledgerFile = 'creation-ledger.json'
        issueNumbers = @(41, 42)
        operationError = $null
    } | ConvertTo-Json | Set-Content -LiteralPath $resultPath -Encoding utf8NoBOM
    & $resultAssertion -ResultPath $resultPath | Out-Null

    [ordered]@{
        schemaVersion = 1
        status = 'failed'
        ledgerFile = 'creation-ledger.json'
        issueNumbers = @(41)
        operationError = 'Body verification failed.'
    } | ConvertTo-Json | Set-Content -LiteralPath $resultPath -Encoding utf8NoBOM
    Assert-Fails -ExpectedMessage "reported status 'failed'" -Operation {
        & $resultAssertion -ResultPath $resultPath
    }

    Remove-Item -LiteralPath $resultPath
    Assert-Fails -ExpectedMessage 'did not write its required result document' -Operation {
        & $resultAssertion -ResultPath $resultPath
    }
}
finally {
    Remove-Item -LiteralPath $tempDirectory -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host 'Stage-20 artifact contract tests passed.' -ForegroundColor Green
