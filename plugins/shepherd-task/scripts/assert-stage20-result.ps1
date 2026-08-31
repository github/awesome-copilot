<#
.SYNOPSIS
    Requires a completed shepherd-task stage-20 result document.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$ResultPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $ResultPath -PathType Leaf)) {
    throw "Stage 20 did not write its required result document: $ResultPath"
}

try {
    $result = Get-Content -LiteralPath $ResultPath -Raw | ConvertFrom-Json
}
catch {
    throw "Stage-20 result is invalid JSON: $ResultPath. $($_.Exception.Message)"
}

if ($result.schemaVersion -ne 1 -or [string]$result.ledgerFile -ne 'creation-ledger.json') {
    throw "Stage-20 result has an unsupported schema or ledgerFile: $ResultPath"
}

$status = [string]$result.status
if ($status -ne 'complete') {
    $operationError = [string]$result.operationError
    if ([string]::IsNullOrWhiteSpace($operationError)) {
        $operationError = 'No operation error was recorded.'
    }
    throw "Stage 20 reported status '$status': $operationError"
}

$issueNumbers = @($result.issueNumbers)
if ($issueNumbers.Count -eq 0 -or
    @($issueNumbers | Where-Object { $_ -notmatch '^[1-9][0-9]*$' }).Count -ne 0 -or
    @($issueNumbers | Select-Object -Unique).Count -ne $issueNumbers.Count) {
    throw "Completed stage-20 result has invalid issueNumbers: $ResultPath"
}

$result
