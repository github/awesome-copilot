<#
.SYNOPSIS
    Verifies the Cargo Tracker treatment/control fixture definition.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$initializerPath = Join-Path $PSScriptRoot '01-prepare-base-branch.ps1'
$baselinePath = Join-Path $PSScriptRoot '00-prepare-test-baseline.ps1'
$driverPath = Join-Path $PSScriptRoot '20260902-run-treatment-control-experiment.ps1'

$initializer = [System.IO.File]::ReadAllText($initializerPath)
$baseline = [System.IO.File]::ReadAllText($baselinePath)
$driver = [System.IO.File]::ReadAllText($driverPath)

$planStartMarker = '$plan = @' + "'"
$planStart = $initializer.IndexOf($planStartMarker, [StringComparison]::Ordinal)
if ($planStart -lt 0) {
    throw 'Cargo Tracker plan must use a literal single-quoted PowerShell here-string.'
}
$planContentStart = $initializer.IndexOf("`n", $planStart) + 1
$planWriteMarker = 'Set-Content -LiteralPath (Join-Path $campaignMetadataPath $planFile)'
$planWriteStart = $initializer.IndexOf(
    $planWriteMarker,
    $planContentStart,
    [StringComparison]::Ordinal
)
if ($planWriteStart -lt 0) {
    throw 'Cargo Tracker plan write operation was not found.'
}
$planEnd = $initializer.LastIndexOf(
    "'@",
    $planWriteStart,
    [StringComparison]::Ordinal
)
if ($planEnd -lt $planContentStart) {
    throw 'Cargo Tracker plan here-string terminator was not found.'
}

$plan = (
    $initializer.Substring($planContentStart, $planEnd - $planContentStart) `
        -replace "`r`n|`r", "`n"
).TrimEnd("`n")
$planBytes = [System.Text.UTF8Encoding]::new($false).GetBytes($plan)
$planHash = [Convert]::ToHexString(
    [System.Security.Cryptography.SHA256]::HashData($planBytes)
).ToLowerInvariant()
$expectedPlanHash = '773876d0013586a1eb29efe821be82f7ef12219ae4ba2b57f6f9dda568b8c703'
if ($planHash -ne $expectedPlanHash) {
    throw "Embedded Cargo Tracker plan hash '$planHash' does not match '$expectedPlanHash'."
}

$implementationHeading = '## Phase 4 — Implementation (five serial issues)'
$implementationStart = $plan.IndexOf($implementationHeading, [StringComparison]::Ordinal)
if ($implementationStart -lt 0) {
    throw "Embedded plan is missing '$implementationHeading'."
}
$followingSection = $plan.IndexOf(
    "`n## ",
    $implementationStart + $implementationHeading.Length,
    [StringComparison]::Ordinal
)
$implementation = if ($followingSection -lt 0) {
    $plan.Substring($implementationStart)
}
else {
    $plan.Substring($implementationStart, $followingSection - $implementationStart)
}
$taskCount = [regex]::Matches($implementation, '(?m)^###\s+4\.[1-5]\s+—').Count
if ($taskCount -ne 5) {
    throw "Embedded Cargo Tracker plan contains $taskCount direct implementation tasks; expected 5."
}

$expectedBaselineSha = '9b9f311b2a3a2854bdac947593950d9edb6bca7d'
foreach ($entry in @(
    [pscustomobject]@{ Name = 'baseline script'; Text = $baseline },
    [pscustomobject]@{ Name = 'driver'; Text = $driver }
)) {
    if (-not $entry.Text.Contains($expectedBaselineSha)) {
        throw "$($entry.Name) does not enforce baseline '$expectedBaselineSha'."
    }
}

foreach ($required in @(
    "`$planFile = 'add-change-arrival-deadline-feature-ignorance-reduction-plan.md'",
    'expectedTaskCount = 5',
    'name: Shepherd task Cargo Tracker',
    './mvnw --batch-mode --no-transfer-progress clean package -Popenliberty'
)) {
    if (-not $initializer.Contains($required)) {
        throw "Cargo Tracker initializer is missing required fixture text: $required"
    }
}

$operationalFiles = @(
    Get-ChildItem -LiteralPath $PSScriptRoot -File |
        Where-Object {
            $_.Extension -in @('.ps1', '.sh') -and
            $_.FullName -ne $PSCommandPath
        }
)
foreach ($file in $operationalFiles) {
    $text = [System.IO.File]::ReadAllText($file.FullName)
    if ($text.Contains('simple-math')) {
        throw "Cargo Tracker operational script depends on simple-math: $($file.FullName)"
    }
}

foreach ($forbidden in @(
    'math-tool.ps1',
    'math-tool.Tests.ps1',
    'Get-Fibonacci',
    'Get-Factorial'
)) {
    if ($initializer.Contains($forbidden) -or $baseline.Contains($forbidden)) {
        throw "Cargo Tracker fixture contains copied math domain content: $forbidden"
    }
}

Write-Host 'Cargo Tracker fixture contract tests passed.' -ForegroundColor Green
