# shepherd-task-version: 1.0.3
<#
.SYNOPSIS
    Verifies the simple-math control-only fixture definition.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$initializerPath = Join-Path $PSScriptRoot '01-prepare-base-branch.ps1'
$issueCreatorPath = Join-Path $PSScriptRoot '02-create-issues.ps1'
$verifierPath = Join-Path $PSScriptRoot '04-verify-control-campaign.ps1'
$driverPath = Join-Path $PSScriptRoot 'run-campaign.ps1'
$initializer = [System.IO.File]::ReadAllText($initializerPath)
$issueCreator = [System.IO.File]::ReadAllText($issueCreatorPath)
$verifier = [System.IO.File]::ReadAllText($verifierPath)
$driver = [System.IO.File]::ReadAllText($driverPath)

$paginationFilter = 'if length == 0 then [] elif all(.[]; type == "array") then add else . end'
foreach ($fixture in @(
    [pscustomobject]@{ Input = '[]'; Expected = '[]' },
    [pscustomobject]@{ Input = '[[{"id":1}]]'; Expected = '[{"id":1}]' },
    [pscustomobject]@{ Input = '[[{"id":1}],[{"id":2}]]'; Expected = '[{"id":1},{"id":2}]' },
    [pscustomobject]@{ Input = '[{"id":1},{"id":2}]'; Expected = '[{"id":1},{"id":2}]' }
)) {
    $actual = $fixture.Input | jq -c $paginationFilter
    if ($LASTEXITCODE -ne 0 -or ([string]$actual).Trim() -ne $fixture.Expected) {
        throw "Pagination normalization produced '$actual'; expected '$($fixture.Expected)'."
    }
}
foreach ($required in @(
    'Fixture pagination response contract (mandatory):',
    'one-page response has the shape `[[{...}]]`, not `[{...}]`',
    $paginationFilter,
    'capture the `gh` output and `$LASTEXITCODE` first'
)) {
    if (-not $issueCreator.Contains($required)) {
        throw "Simple-math issue creator is missing pagination guidance: $required"
    }
}

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
    "'03-resolve-repository-remote.ps1'",
    "'-CampaignShortname', 'math-control'",
    "lessonPropagation = 'off'",
    "'05-stage20-artifact-contract.ps1'",
    "'09-skill-powershell-contract.ps1'",
    "'10-simple-math-fixture-contract.ps1'",
    "'11-stage15-installed-path-contract.ps1'",
    "@('git', 'gh', 'copilot', 'pwsh', 'jq')",
    "-Arguments @('repo', 'clone', `$Repo, `$Target)",
    "'test\lesson-propagation-default-contract.ps1'"
)) {
    if (-not $driver.Contains($required)) {
        throw "Simple-math driver is missing required control behavior: $required"
    }
}
if (-not $driver.Contains(
    'ls-remote --exit-code --heads $resolvedRemote $branch'
)) {
    throw 'Simple-math driver does not probe branches through the resolved repository remote.'
}
if ($driver.Contains('must have exactly one Git remote')) {
    throw 'Simple-math driver still rejects fork checkouts with an upstream remote.'
}
if ($driver.Contains("'-LessonPropagation', 'campaign'") -or
    $driver.Contains('$Treatment') -or
    $driver.Contains('$Comparison') -or
    $driver.Contains('treatment-control')) {
    throw 'Simple-math driver still contains treatment or comparison behavior.'
}
if ($driver -match '(?i)\$cloneUrl\s*=|Arguments\s+@\(''clone''') {
    throw 'Simple-math PowerShell driver bypasses gh-managed Git transport.'
}
$pluginRoot = [System.IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot '..' '..')
)
$runtimeFiles = @(
    Get-Item -LiteralPath $initializerPath,
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
        throw "Simple-math PowerShell runtime bypasses gh-managed Git transport: $($runtimeFile.FullName)"
    }
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
