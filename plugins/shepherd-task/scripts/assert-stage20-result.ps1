# shepherd-task-version: 1.0.4
<#
.SYNOPSIS
    Requires a completed shepherd-task stage-20 result document.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$ResultPath,

    [Parameter(Mandatory)]
    [ValidateRange(1, [int]::MaxValue)]
    [int]$ExpectedTaskCount
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Test-PositiveIntegralJsonNumber {
    param([object]$Value)

    if ($null -eq $Value -or
        [Type]::GetTypeCode($Value.GetType()) -notin @(
            [TypeCode]::SByte,
            [TypeCode]::Byte,
            [TypeCode]::Int16,
            [TypeCode]::UInt16,
            [TypeCode]::Int32,
            [TypeCode]::UInt32,
            [TypeCode]::Int64,
            [TypeCode]::UInt64,
            [TypeCode]::Single,
            [TypeCode]::Double,
            [TypeCode]::Decimal
        )) {
        return $false
    }

    try {
        $numericValue = [decimal]$Value
    }
    catch {
        return $false
    }
    return $numericValue -ge 1 -and
        [decimal]::Truncate($numericValue) -eq $numericValue
}

function Test-NonEmptyJsonString {
    param([object]$Value)

    return $Value -is [string] -and
        -not [string]::IsNullOrWhiteSpace($Value)
}

if (-not (Test-Path -LiteralPath $ResultPath -PathType Leaf)) {
    throw "Stage 20 did not write its required result document: $ResultPath"
}

try {
    $result = Get-Content -LiteralPath $ResultPath -Raw | ConvertFrom-Json
}
catch {
    throw "Stage-20 result is invalid JSON: $ResultPath. $($_.Exception.Message)"
}

if ($result.schemaVersion -ne 1 -or
    [string]$result.ledgerFile -ne 'creation-ledger.json') {
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

$ledgerPath = Join-Path (Split-Path -Parent $ResultPath) ([string]$result.ledgerFile)
try {
    $parsedLedger = Get-Content -LiteralPath $ledgerPath -Raw |
        ConvertFrom-Json -NoEnumerate
}
catch {
    throw "Completed stage 20 has a missing or invalid ledger: $ledgerPath. $($_.Exception.Message)"
}

if ($parsedLedger -isnot [System.Array]) {
    throw "Completed stage 20 creation ledger root must be an array: $ledgerPath"
}
$ledger = [object[]]$parsedLedger

if ($ledger.Count -ne $ExpectedTaskCount) {
    throw "Completed stage 20 ledger has $($ledger.Count) entries; expected $ExpectedTaskCount."
}

$expectedFields = @(
    'body_verified',
    'bodyFile',
    'id',
    'implementationSubsection',
    'linked',
    'number',
    'title',
    'url'
) | Sort-Object
$issueNumbers = @()
foreach ($entry in $ledger) {
    $actualFields = if ($null -eq $entry) {
        @()
    }
    else {
        @($entry.PSObject.Properties.Name | Sort-Object)
    }
    if ($entry -isnot [pscustomobject] -or
        [string]::Join("`n", $actualFields) -cne
        [string]::Join("`n", $expectedFields) -or
        -not (Test-NonEmptyJsonString $entry.implementationSubsection) -or
        -not (Test-NonEmptyJsonString $entry.bodyFile) -or
        -not (Test-PositiveIntegralJsonNumber $entry.id) -or
        -not (Test-PositiveIntegralJsonNumber $entry.number) -or
        -not (Test-NonEmptyJsonString $entry.title) -or
        -not (Test-NonEmptyJsonString $entry.url) -or
        $entry.body_verified -isnot [bool] -or
        $entry.body_verified -ne $true -or
        $entry.linked -isnot [bool] -or
        $entry.linked -ne $true) {
        throw "Completed stage 20 has an incomplete ledger entry: $($entry | ConvertTo-Json -Compress)"
    }
    $issueNumbers += [int]$entry.number
}
if (@($issueNumbers | Select-Object -Unique).Count -ne $issueNumbers.Count) {
    throw "Completed stage 20 has duplicate issue numbers in its ledger: $ledgerPath"
}

$result
