# shepherd-task-version: 1.0.5

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = [System.IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot '..\..\..')
)
$skillPath = Join-Path $repositoryRoot `
    'skills\shepherd-task-30-from-assignment-to-ready\SKILL.md'
$skill = [System.IO.File]::ReadAllText($skillPath)

function Assert-Contains {
    param(
        [Parameter(Mandatory)]
        [string]$Needle,

        [Parameter(Mandatory)]
        [string]$Message
    )

    if (-not $skill.Contains($Needle)) {
        throw $Message
    }
}

$discoveryIndex = $skill.IndexOf('find_linked_pr() {', [StringComparison]::Ordinal)
$preflightIndex = $skill.IndexOf(
    'if PR_NUMBER="$(find_linked_pr)"; then',
    [StringComparison]::Ordinal
)
$multipleIndex = $skill.IndexOf(
    'Multiple open PRs close task #$TASK_ISSUE',
    [StringComparison]::Ordinal
)
$assignmentGuardIndex = $skill.IndexOf(
    'if [[ -z "$PR_NUMBER" ]]; then',
    [StringComparison]::Ordinal
)
$assignmentIndex = $skill.IndexOf(
    '/repos/$REPO/issues/$TASK_ISSUE/assignees \',
    [StringComparison]::Ordinal
)
if ($discoveryIndex -lt 0 -or
    $preflightIndex -lt 0 -or
    $multipleIndex -lt 0 -or
    $assignmentGuardIndex -lt 0 -or
    $assignmentIndex -lt 0 -or
    $discoveryIndex -ge $multipleIndex -or
    $multipleIndex -ge $preflightIndex -or
    $preflightIndex -ge $assignmentGuardIndex -or
    $assignmentGuardIndex -ge $assignmentIndex) {
    throw 'Stage 30 must discover and validate an existing PR before assignment.'
}

Assert-Contains 'if [[ -z "$PR_NUMBER" ]]; then' `
    'The Bash assignment and polling flows must require a missing PR.'
Assert-Contains 'Resuming Stage 30 with existing draft PR #$PR_NUMBER; skipping assignment.' `
    'The Bash resume path must skip assignment explicitly.'
Assert-Contains 'retain it for every later Stage 30 step' `
    'The resumed PR number must be retained for later validation.'
Assert-Contains 'Multiple open PRs close task #$TASK_ISSUE' `
    'Multiple authoritative open PRs must fail closed.'
Assert-Contains '--json state,isDraft,baseRefName,closingIssuesReferences' `
    'Resume validation must query all required PR state.'
Assert-Contains '.state == "OPEN" and' `
    'The Bash resume gate must require an open PR.'
Assert-Contains '.isDraft == true and' `
    'The Bash resume gate must reject a Ready-for-review PR.'
Assert-Contains '.baseRefName == $base and' `
    'The Bash resume gate must require the campaign base branch.'
Assert-Contains 'any(.closingIssuesReferences[]?; .number == $issue)' `
    'The Bash resume gate must require the exact closing issue.'
Assert-Contains '(^|[^0-9])$TASK_ISSUE([^0-9]|$)' `
    'Bash candidate discovery must retain numeric issue boundaries.'
Assert-Contains 'copilot_work_finished_failure at $LATEST_FAILURE) with no substantive changes. Re-assigning.' `
    'The intentional post-failure re-assignment path must remain present.'

$powerShellDiscoveryIndex = $skill.IndexOf(
    'function Find-LinkedOpenPR {',
    [StringComparison]::Ordinal
)
$powerShellPreflightIndex = $skill.IndexOf(
    '$PR_NUMBER = Find-LinkedOpenPR',
    [StringComparison]::Ordinal
)
$powerShellAssignmentIndex = $skill.IndexOf(
    'if ($null -eq $PR_NUMBER) {',
    [StringComparison]::Ordinal
)
if ($powerShellDiscoveryIndex -lt 0 -or
    $powerShellPreflightIndex -lt 0 -or
    $powerShellAssignmentIndex -lt 0 -or
    $powerShellDiscoveryIndex -ge $powerShellPreflightIndex -or
    $powerShellPreflightIndex -ge $powerShellAssignmentIndex) {
    throw 'PowerShell must discover and validate an existing PR before assignment.'
}

Assert-Contains '$resumeState.isDraft -ne $true' `
    'The PowerShell resume gate must reject a Ready-for-review PR.'
Assert-Contains '[string]$resumeState.baseRefName -ne $BASE_BRANCH' `
    'The PowerShell resume gate must require the campaign base branch.'
Assert-Contains "[string]`$resumeState.state -ne 'OPEN'" `
    'The PowerShell resume gate must require an open PR.'
Assert-Contains '[int]$_.number -eq [int]$TASK_ISSUE' `
    'The PowerShell resume gate must require the exact closing issue.'

$assignmentMatches = [regex]::Matches(
    $skill,
    [regex]::Escape('/repos/$REPO/issues/$TASK_ISSUE/assignees')
)
$failureIndex = $skill.IndexOf(
    'copilot_work_finished_failure at $LATEST_FAILURE) with no substantive changes. Re-assigning.',
    [StringComparison]::Ordinal
)
$postFailureAssignmentIndex = $skill.IndexOf(
    '/repos/$REPO/issues/$TASK_ISSUE/assignees',
    $failureIndex,
    [StringComparison]::Ordinal
)
if ($assignmentMatches.Count -lt 3 -or
    $failureIndex -lt 0 -or
    $postFailureAssignmentIndex -le $failureIndex) {
    throw 'Stage 30 must preserve initial Bash/PowerShell assignment and later failure re-assignment.'
}

function Get-Stage30Action {
    param(
        [int]$MatchCount,
        [string]$State = '',
        [bool]$IsDraft = $false,
        [string]$Base = '',
        [string]$ExpectedBase = 'campaign-base'
    )

    if ($MatchCount -gt 1) {
        return 'fail'
    }
    if ($MatchCount -eq 0) {
        return 'assign-and-poll'
    }
    if ($State -eq 'OPEN' -and $IsDraft -and $Base -eq $ExpectedBase) {
        return 'resume'
    }
    return 'fail'
}

if ((Get-Stage30Action -MatchCount 0) -ne 'assign-and-poll') {
    throw 'Zero matches must preserve first-run assignment and discovery.'
}
if ((Get-Stage30Action -MatchCount 1 -State OPEN -IsDraft $true `
        -Base campaign-base) -ne 'resume') {
    throw 'One authoritative open draft PR on the campaign base must resume.'
}
if ((Get-Stage30Action -MatchCount 2 -State OPEN -IsDraft $true `
        -Base campaign-base) -ne 'fail') {
    throw 'Multiple authoritative open PRs must fail before assignment.'
}
if ((Get-Stage30Action -MatchCount 1 -State CLOSED -IsDraft $true `
        -Base campaign-base) -ne 'fail') {
    throw 'A PR that becomes non-open during resume validation must fail.'
}
if ((Get-Stage30Action -MatchCount 1 -State OPEN -IsDraft $false `
        -Base campaign-base) -ne 'fail') {
    throw 'A Ready-for-review PR must fail the Stage 30 resume gate.'
}
if ((Get-Stage30Action -MatchCount 1 -State OPEN -IsDraft $true `
        -Base wrong-base) -ne 'fail') {
    throw 'A PR targeting the wrong base must fail the Stage 30 resume gate.'
}

$issuePattern = '(^|[^0-9])#14([^0-9]|$)'
if ('fix #14' -notmatch $issuePattern) {
    throw 'The exact issue-boundary fixture is invalid.'
}
if ('fix #140' -match $issuePattern) {
    throw 'Issue 14 must not match issue 140.'
}
if ([int]14 -eq [int]140) {
    throw 'Authoritative closing-reference comparison must remain numeric and exact.'
}

Write-Host 'Stage 30 PowerShell resume contract tests passed.'
