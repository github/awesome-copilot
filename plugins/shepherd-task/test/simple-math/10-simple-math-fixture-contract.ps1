<#
.SYNOPSIS
    Verifies the simple-math control-only fixture definition.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$initializerPath = Join-Path $PSScriptRoot '01-prepare-base-branch.ps1'
$issueCreatorPath = Join-Path $PSScriptRoot '02-create-issues.ps1'
$verifierPath = Join-Path $PSScriptRoot '04-verify-control-campaign.ps1'
$driverPath = Join-Path $PSScriptRoot '20260904-run-control-experiment.ps1'
$initializer = [System.IO.File]::ReadAllText($initializerPath)
$issueCreator = [System.IO.File]::ReadAllText($issueCreatorPath)
$verifier = [System.IO.File]::ReadAllText($verifierPath)
$driver = [System.IO.File]::ReadAllText($driverPath)

foreach ($required in @(
    "`$planFile = 'math-tool-ignorance-reduction-plan.md'",
    "lessonPropagation = 'off'",
    'expectedTaskCount = 2',
    'pwsh -NoLogo -NoProfile -File ./eng/test-math-tool.ps1'
)) {
    if (-not $initializer.Contains($required)) {
        throw "Simple-math initializer is missing required fixture text: $required"
    }
}
if ($initializer.Contains('[string]$LessonPropagation') -or
    $initializer.Contains('-LessonPropagation $LessonPropagation')) {
    throw 'Simple-math control initializer still accepts an alternate lesson mode.'
}

foreach ($required in @(
    "'04-verify-control-campaign.ps1'",
    "'-CampaignShortname', 'math-control'",
    "lessonPropagation = 'off'",
    "'05-stage20-artifact-contract.ps1'",
    "'09-skill-powershell-contract.ps1'",
    "'10-simple-math-fixture-contract.ps1'",
    "'test\lesson-propagation-default-contract.ps1'"
)) {
    if (-not $driver.Contains($required)) {
        throw "Simple-math driver is missing required control behavior: $required"
    }
}
if ($driver.Contains("'-LessonPropagation', 'campaign'") -or
    $driver.Contains('$Treatment') -or
    $driver.Contains('$Comparison') -or
    $driver.Contains('treatment-control')) {
    throw 'Simple-math driver still contains treatment or comparison behavior.'
}
$stage25Invocations = [regex]::Matches(
    $driver,
    "scripts\\shepherd-task-25-given-list\.ps1"
).Count
if ($stage25Invocations -ne 1) {
    throw "Simple-math driver invokes stage 25 $stage25Invocations times; expected exactly once."
}
foreach ($entry in @(
    [pscustomobject]@{ Name = 'issue creator'; Text = $issueCreator },
    [pscustomobject]@{ Name = 'verifier'; Text = $verifier }
)) {
    if (-not $entry.Text.Contains("lessonPropagation -ne 'off'")) {
        throw "$($entry.Name) does not require lessonPropagation=off."
    }
    if ($entry.Text.Contains("lessonPropagation -eq 'campaign'") -or
        $entry.Text.Contains('Treatment issue') -or
        $entry.Text.Contains('Treatment lessons')) {
        throw "$($entry.Name) still contains treatment-arm behavior."
    }
}

Write-Host 'Simple-math control fixture contract tests passed.' -ForegroundColor Green
