<#
.SYNOPSIS
    Verifies the separate Cargo Tracker preserved-run recovery driver.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$originalPath = Join-Path $PSScriptRoot `
    '20260902-run-treatment-control-experiment.ps1'
$resumePath = Join-Path $PSScriptRoot `
    '202609023-1638Z-run-treatment-control-experiment-resumeable.ps1'

if (-not (Test-Path -LiteralPath $resumePath -PathType Leaf)) {
    throw "Required recovery driver was not found: $resumePath"
}

$original = [System.IO.File]::ReadAllText($originalPath)
$resume = [System.IO.File]::ReadAllText($resumePath)

foreach ($required in @(
    '9b9f311b2a3a2854bdac947593950d9edb6bca7d',
    '5426f64c-a653-4ff1-ba39-00209a83cdb4',
    '48f8a98a-83f9-466b-aa2e-14edbb4449e9',
    'shepherd-tasks-48f8a98a-83f9-466b-aa2e-14edbb4449e9-20260903-0555',
    '$unfinishedControlIssues',
    "'-TaskIssues', `$unfinishedIssueList",
    'Original failed control run',
    'TREATMENT_RUN_DIRECTORIES',
    'CONTROL_RUN_DIRECTORIES',
    'CONTROL_POST_MORTEMS',
    'originalFailedControlRun',
    'runDirectories',
    'postMortems'
)) {
    if (-not $resume.Contains($required)) {
        throw "Recovery driver is missing required preserved-run contract text: $required"
    }
}

foreach ($forbidden in @(
    'git clone',
    "'01-prepare-base-branch.ps1'",
    "'02-create-issues.ps1'",
    "'00-prepare-test-baseline.ps1'"
)) {
    if ($resume.Contains($forbidden)) {
        throw "Recovery driver may not recreate experiment state: $forbidden"
    }
}

foreach ($resumeOnlyText in @(
    'OriginalFailedControlRunName',
    'unfinishedControlIssues',
    'originalFailedControlRun'
)) {
    if ($original.Contains($resumeOnlyText)) {
        throw "Fresh-run driver contains forbidden resumability logic: $resumeOnlyText"
    }
}

$tokens = $null
$errors = $null
[void][System.Management.Automation.Language.Parser]::ParseFile(
    $resumePath,
    [ref]$tokens,
    [ref]$errors
)
if ($errors.Count -ne 0) {
    throw "Recovery driver has PowerShell parse errors: $($errors -join '; ')"
}

Write-Host 'Cargo Tracker recovery driver contract tests passed.' `
    -ForegroundColor Green
