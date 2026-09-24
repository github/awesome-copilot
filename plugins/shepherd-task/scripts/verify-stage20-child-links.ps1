# shepherd-task-version: 1.0.4
<#
.SYNOPSIS
    Verifies Stage 20 child count, identity uniqueness, and creation order.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$PreCreationChildrenPath,

    [Parameter(Mandatory)]
    [string]$FinalChildrenPath,

    [Parameter(Mandatory)]
    [string]$CreationLedgerPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$filterPath = Join-Path $PSScriptRoot 'verify-stage20-child-links.jq'
if (-not (Test-Path -LiteralPath $filterPath -PathType Leaf)) {
    throw "Stage-20 child-link verification filter was not found: $filterPath"
}

foreach ($inputPath in @(
    $PreCreationChildrenPath,
    $FinalChildrenPath,
    $CreationLedgerPath
)) {
    if (-not (Test-Path -LiteralPath $inputPath -PathType Leaf)) {
        throw "Stage-20 child-link verification input was not found: $inputPath"
    }
}

$output = & jq -n `
    --slurpfile baseline $PreCreationChildrenPath `
    --slurpfile final $FinalChildrenPath `
    --slurpfile ledger $CreationLedgerPath `
    -f $filterPath 2>&1
$jqExitCode = $LASTEXITCODE
if ($jqExitCode -ne 0) {
    throw "Stage-20 child-link verification failed: $($output | Out-String)"
}

$output
