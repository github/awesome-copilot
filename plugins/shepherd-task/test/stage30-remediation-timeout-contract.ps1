# shepherd-task-version: 1.0.5

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = [System.IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot '..\..\..')
)
$skillRoot = Join-Path $repositoryRoot `
    'skills\shepherd-task-30-from-assignment-to-ready'
$referencePath = Join-Path $skillRoot 'references\cca-remediation-loop.md'
$skillPath = Join-Path $skillRoot 'SKILL.md'
$reference = [System.IO.File]::ReadAllText($referencePath)
$skill = [System.IO.File]::ReadAllText($skillPath)

$timeoutAssignments = [regex]::Matches(
    $reference,
    '(?m)^PHASE_C_TIMEOUT=1200$'
).Count
if ($timeoutAssignments -ne 1) {
    throw "Expected one Stage 30 remediation timeout assignment of 1200 seconds; found $timeoutAssignments."
}
if (-not $reference.Contains(
    'Wait for CCA to complete a full work cycle (up to 20 minutes)'
)) {
    throw 'Stage 30 remediation guidance does not describe the 20-minute completion window.'
}
if ($reference.Contains('PHASE_C_TIMEOUT=600') -or
    $reference.Contains('up to 10 minutes')) {
    throw 'Stage 30 remediation guidance still contains the former 10-minute completion window.'
}
if (-not $skill.Contains(
    "Copilot doesn't push after review request within 20 minutes"
)) {
    throw 'Stage 30 error handling does not describe the 20-minute remediation window.'
}
if ($skill.Contains(
    "Copilot doesn't push after review request within 10 minutes"
)) {
    throw 'Stage 30 error handling still describes the former 10-minute remediation window.'
}

Write-Host 'Stage 30 remediation timeout contract tests passed.' -ForegroundColor Green
