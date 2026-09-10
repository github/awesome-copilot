# shepherd-task-version: 1.0.2
<#
.SYNOPSIS
    Verifies the Cargo Tracker control-only fixture definition.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$initializerPath = Join-Path $PSScriptRoot '01-prepare-base-branch.ps1'
$baselinePath = Join-Path $PSScriptRoot '00-prepare-test-baseline.ps1'
$issueCreatorPath = Join-Path $PSScriptRoot '02-create-issues.ps1'
$verifierPath = Join-Path $PSScriptRoot '04-verify-control-campaign.ps1'
$driverPath = Join-Path $PSScriptRoot 'run-campaign.ps1'

$initializer = [System.IO.File]::ReadAllText($initializerPath)
$baseline = [System.IO.File]::ReadAllText($baselinePath)
$issueCreator = [System.IO.File]::ReadAllText($issueCreatorPath)
$verifier = [System.IO.File]::ReadAllText($verifierPath)
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
$expectedPlanHash = '6fdedc8d42a586fe8dc74bf4155d4d2b927b2dd35754093e6719b2061835e882'
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
$expectedSourceBranch = '20260902-2104Z-commit-e7b651f-liberty'
foreach ($entry in @(
    [pscustomobject]@{ Name = 'baseline script'; Text = $baseline },
    [pscustomobject]@{ Name = 'driver'; Text = $driver }
)) {
    if (-not $entry.Text.Contains($expectedBaselineSha)) {
        throw "$($entry.Name) does not enforce baseline '$expectedBaselineSha'."
    }
    if (-not $entry.Text.Contains($expectedSourceBranch)) {
        throw "$($entry.Name) does not enforce source branch '$expectedSourceBranch'."
    }
}

foreach ($requiredBaselineText in @(
    '[string]$SourceBranch',
    'refs/heads/${SourceBranch}',
    'merge-base --is-ancestor $ExpectedBaselineSha $fetchedSha'
)) {
    if (-not $baseline.Contains($requiredBaselineText)) {
        throw "Baseline script is missing required source-branch contract text: $requiredBaselineText"
    }
}
foreach ($forbiddenBaselineText in @(
    'defaultBranchRef',
    "Fetching '`$defaultBranch'"
)) {
    if ($baseline.Contains($forbiddenBaselineText)) {
        throw "Baseline script still depends on repository default-branch discovery: $forbiddenBaselineText"
    }
}
if (-not $driver.Contains("'-SourceBranch', `$SourceBranch")) {
    throw 'Driver does not pass the required source branch to baseline preparation.'
}
if (-not $driver.Contains("'11-stage15-plan-discovery-contract.ps1'")) {
    throw 'Driver does not run the Cargo Tracker stage-15 plan-discovery contract.'
}
if (-not $driver.Contains("'12-session-outcome-contract.ps1'")) {
    throw 'Driver does not run the shepherd session-outcome contract.'
}
if (-not $driver.Contains("'03-resolve-repository-remote.ps1'")) {
    throw 'Driver does not run the repository-remote contract.'
}
if (-not $driver.Contains("-Arguments @('repo', 'clone', `$Repo, `$Target)")) {
    throw 'Driver does not clone through the authenticated GitHub CLI.'
}
if (-not $driver.Contains(
    'ls-remote --exit-code --heads $resolvedRemote $branch'
)) {
    throw 'Driver does not probe branches through the resolved repository remote.'
}
if ($driver.Contains('must have exactly one Git remote')) {
    throw 'Driver still rejects fork checkouts with an upstream remote.'
}
if ($driver -match '(?i)\$cloneUrl\s*=|Arguments\s+@\(''clone''') {
    throw 'Cargo Tracker PowerShell driver bypasses gh-managed Git transport.'
}
$pluginRoot = [System.IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot '..' '..')
)
$runtimeFiles = @(
    Get-Item -LiteralPath $baselinePath,
        $initializerPath,
        $issueCreatorPath,
        $verifierPath,
        $driverPath,
        (Join-Path $PSScriptRoot 'get-copilot-skill-list.ps1')
    Get-ChildItem -LiteralPath (Join-Path $pluginRoot 'scripts') `
        -File -Filter '*.ps1'
)
$unsafeGitTransportPattern = '(?is)\$cloneUrl\s*=|(?:^|\W)git\s+(?:-C\s+\S+\s+)?clone|git\s+(?:-C\s+\S+\s+)?remote\s+(?:add|set-url)\s+.*https://github\.com|-FilePath\s+[''"]git[''"].{0,240}-Arguments\s+@\(\s*[''"]clone[''"]'
foreach ($runtimeFile in $runtimeFiles) {
    $runtimeText = [System.IO.File]::ReadAllText($runtimeFile.FullName)
    if ($runtimeText -match $unsafeGitTransportPattern) {
        throw "Cargo Tracker PowerShell runtime bypasses gh-managed Git transport: $($runtimeFile.FullName)"
    }
}
if (-not $driver.Contains("'test\lesson-propagation-default-contract.ps1'")) {
    throw 'Driver does not run the lesson-propagation default contract.'
}
if (-not $driver.Contains("'04-verify-control-campaign.ps1'")) {
    throw 'Driver does not run the control-campaign verifier.'
}
if (-not $driver.Contains("lessonPropagation = 'off'")) {
    throw 'Driver summary does not record lessonPropagation=off.'
}
if ($driver.Contains("'-LessonPropagation', 'campaign'") -or
    $driver.Contains('$Treatment') -or
    $driver.Contains('$Comparison') -or
    $driver.Contains('treatment-control') -or
    $driver.Contains('resume-driver')) {
    throw 'Driver still contains treatment, comparison, or recovery behavior.'
}
$stage25Invocations = [regex]::Matches(
    $driver,
    "scripts\\shepherd-task-25-given-list\.ps1"
).Count
if ($stage25Invocations -ne 1) {
    throw "Driver invokes stage 25 $stage25Invocations times; expected exactly once."
}

foreach ($required in @(
    "`$planFile = 'add-change-arrival-deadline-feature-ignorance-reduction-plan.md'",
    "lessonPropagation = 'off'",
    'expectedTaskCount = 5',
    'name: Shepherd task Cargo Tracker',
    './mvnw --batch-mode --no-transfer-progress clean package -Popenliberty'
)) {
    if (-not $initializer.Contains($required)) {
        throw "Cargo Tracker initializer is missing required fixture text: $required"
    }
}
if ($plan.Contains('/home/') -or
    $plan -match '(?i)[A-Z]:\\' -or
    $plan.Contains('dd-3058828-cargotracker-remove-before-merge')) {
    throw 'Cargo Tracker plan contains a machine- or source-checkout-specific path.'
}
if ($initializer.Contains('[string]$LessonPropagation') -or
    $initializer.Contains('-LessonPropagation $LessonPropagation')) {
    throw 'Cargo Tracker control initializer still accepts an alternate lesson mode.'
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

$operationalFiles = @(
    Get-ChildItem -LiteralPath $PSScriptRoot -File |
        Where-Object {
            $_.Extension -in @('.ps1', '.sh') -and
            $_.FullName -ne $PSCommandPath -and
            $_.Name -ne '10-cargotracker-fixture-contract.sh'
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
