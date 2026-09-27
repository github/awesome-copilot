# shepherd-task-version: 1.0.5

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = [System.IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot '..\..\..')
)
$skillPath = Join-Path $repositoryRoot `
    'skills\shepherd-task-30-from-assignment-to-ready\SKILL.md'
$skill = [System.IO.File]::ReadAllText($skillPath)

$powerShellBlocks = [regex]::Matches(
    $skill,
    '(?ms)^\s*>\s*```powershell\s*\r?\n(?<body>.*?)^\s*>\s*```\s*$'
)
$lifecycleBlock = @(
    $powerShellBlocks |
        Where-Object {
            $_.Groups['body'].Value.Contains(
                'function Get-CopilotLifecycleState'
            )
        }
)
if ($lifecycleBlock.Count -ne 1) {
    throw "Expected one PowerShell lifecycle block; found $($lifecycleBlock.Count)."
}

$blockText = $lifecycleBlock[0].Groups['body'].Value -replace '(?m)^>\s?', ''
$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseInput(
    $blockText,
    [ref]$tokens,
    [ref]$parseErrors
)
if ($parseErrors.Count -ne 0) {
    throw "Invalid Stage 30 PowerShell lifecycle block: $($parseErrors.Message -join '; ')"
}

$functionAsts = @(
    $ast.FindAll(
        {
            param($node)
            $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and
                $node.Name -eq 'Get-CopilotLifecycleState'
        },
        $true
    )
)
if ($functionAsts.Count -ne 1) {
    throw "Expected one lifecycle classifier function; found $($functionAsts.Count)."
}

Invoke-Expression $functionAsts[0].Extent.Text

function New-LifecycleEvent {
    param(
        [Parameter(Mandatory)]
        [string]$Event,

        [Parameter(Mandatory)]
        [string]$CreatedAt
    )

    [pscustomobject]@{
        event = $Event
        created_at = $CreatedAt
    }
}

$events = @(
    New-LifecycleEvent `
        -Event 'copilot_work_started' `
        -CreatedAt '2026-09-27T05:01:00Z'
    New-LifecycleEvent `
        -Event 'copilot_work_finished' `
        -CreatedAt '2026-09-27T05:02:00Z'
    New-LifecycleEvent `
        -Event 'copilot_work_started' `
        -CreatedAt '2026-09-27T05:05:24Z'
    New-LifecycleEvent `
        -Event 'copilot_work_finished' `
        -CreatedAt '2026-09-27T05:07:43Z'
    New-LifecycleEvent `
        -Event 'copilot_work_finished_failure' `
        -CreatedAt '2026-09-27T05:06:00Z'
    New-LifecycleEvent `
        -Event 'copilot_work_finished_extra' `
        -CreatedAt '2026-09-27T05:09:00Z'
)

$state = Get-CopilotLifecycleState -Events $events
if ($state.LatestStart -ne [DateTimeOffset]'2026-09-27T05:05:24Z') {
    throw "Latest start was not detected: $($state.LatestStart)."
}
if ($state.LatestFinish -ne [DateTimeOffset]'2026-09-27T05:07:43Z') {
    throw "Latest finish was not detected: $($state.LatestFinish)."
}
if ($state.LatestFailure -ne [DateTimeOffset]'2026-09-27T05:06:00Z') {
    throw "Latest failure was not detected: $($state.LatestFailure)."
}
if ($state.LatestFinish -lt $state.LatestStart) {
    throw 'A completed work cycle must be recognized as complete.'
}

$failureOnlyState = Get-CopilotLifecycleState -Events @(
    New-LifecycleEvent `
        -Event 'copilot_work_started' `
        -CreatedAt '2026-09-27T06:00:00Z'
    New-LifecycleEvent `
        -Event 'copilot_work_finished_failure' `
        -CreatedAt '2026-09-27T06:01:00Z'
)
if ($null -ne $failureOnlyState.LatestFinish) {
    throw 'A failure event must not be classified as a successful finish.'
}
if ($failureOnlyState.LatestFailure -lt $failureOnlyState.LatestStart) {
    throw 'A completed failure cycle must be recognized for recovery handling.'
}

$unrelatedState = Get-CopilotLifecycleState -Events @(
    New-LifecycleEvent `
        -Event 'committed' `
        -CreatedAt '2026-09-27T07:00:00Z'
)
if ($null -ne $unrelatedState.LatestStart -or
    $null -ne $unrelatedState.LatestFinish -or
    $null -ne $unrelatedState.LatestFailure) {
    throw 'Unrelated timeline events must not satisfy lifecycle detection.'
}

if ($blockText -match 'Where-Object\s+event\s*-eq') {
    throw 'The lifecycle block must not use simplified Where-Object syntax.'
}
foreach ($eventName in @(
    'copilot_work_started',
    'copilot_work_finished',
    'copilot_work_finished_failure'
)) {
    $expectedFilter = [regex]::Escape(
        "Where-Object { `$_.event -eq '$eventName' }"
    )
    if ($blockText -notmatch $expectedFilter) {
        throw "The lifecycle block must use a script-block filter for $eventName."
    }
}
if (-not $blockText.Contains(
    '$stopwatch = [Diagnostics.Stopwatch]::StartNew()'
)) {
    throw 'The lifecycle poll must use Stopwatch for elapsed-time accounting.'
}
if (-not $blockText.Contains(
    'while ($stopwatch.Elapsed -lt $timeout)'
)) {
    throw 'The lifecycle deadline must be controlled by Stopwatch elapsed time.'
}
if (-not $blockText.Contains(
    '$lifecycle = Get-CopilotLifecycleState -Events $events'
)) {
    throw 'The polling loop must use the tested lifecycle classifier.'
}
if (-not $blockText.Contains('--paginate') -or
    -not $blockText.Contains('--slurp')) {
    throw 'The PowerShell timeline query must consume every REST page safely.'
}

Write-Host 'Stage 30 PowerShell lifecycle contract tests passed.'
