<#
.SYNOPSIS
    Shepherds a list of child Task issues end-to-end by invoking shepherd-task.ps1 for each.

.DESCRIPTION
    Takes a comma-separated list of issue numbers and invokes shepherd-task.ps1
    sequentially for each one.

.PARAMETER TaskIssues
    Comma-separated list of issue numbers (e.g., "1841,1842,1843").

.PARAMETER BaseBranch
    The base branch the task PRs should target. This is never main.

.PARAMETER Repo
    Repository in OWNER/REPO format.
#>

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$TaskIssues,

    [Parameter(Mandatory = $true, Position = 1)]
    [string]$BaseBranch,

    [Parameter(Mandatory = $true, Position = 2)]
    [string]$Repo
)

$ErrorActionPreference = 'Stop'

$usage = 'Usage: shepherd-task-given-list.ps1 <TASK_ISSUES> <BASE_BRANCH> <REPO>'

if ($TaskIssues -notmatch '^[1-9][0-9]*(,[1-9][0-9]*)*$') {
    throw "TASK_ISSUES must be a comma-separated list of positive issue numbers (for example: 2167,2168); received '$TaskIssues'. $usage"
}

if ($BaseBranch -eq 'main') {
    throw "BASE_BRANCH must not be 'main'. $usage"
}

& git check-ref-format --branch $BaseBranch *> $null
if ($LASTEXITCODE -ne 0) {
    throw "BASE_BRANCH is not a valid Git branch name; received '$BaseBranch'. $usage"
}

if ($Repo -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$') {
    throw "REPO must be in OWNER/REPO format; received '$Repo'. $usage"
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$shepherdScript = Join-Path $scriptDir 'shepherd-task.ps1'
$scriptExitCode = 0
$postMortemInvoked = $false

$logDir = "shepherd-tasks-$(Get-Date -Format 'yyyyMMdd-HHmm')"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}
$logDirFull = (Resolve-Path $logDir).Path
Write-Output "Logging shepherd task files to $logDirFull"

$issues = $TaskIssues -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }

function Invoke-PostMortemSkill {
    param(
        [Parameter(Mandatory = $true)]
        [int]$ScriptExitCode
    )

    if ($postMortemInvoked) { return }
    $script:postMortemInvoked = $true

    try {
        $timestamp = Get-Date -Format 'yyyyMMdd-HHmm'
        $postMortemPath = Join-Path $logDirFull "$timestamp-post-mortem.md"
        $sessionSharePath = Join-Path $logDirFull "post-mortem-session-$timestamp.md"
        $sessionJsonPath = Join-Path $logDirFull "post-mortem-session-$timestamp.json"

        $prompt = @"
Invoke skill ``shepherd-task-create-post-mortem`` with these inputs:

- SHEPHERD_LOG_DIR: $logDirFull
- SCRIPT_EXIT_CODE: $ScriptExitCode
- TASK_ISSUES: $TaskIssues
- BASE_BRANCH: $BaseBranch
- REPO: $Repo

Write the report to:
- OUTPUT_FILE: $postMortemPath
"@

        Write-Output "[shepherd-task] Generating post-mortem report at: $postMortemPath"
        $prompt | copilot --yolo --output-format json --share $sessionSharePath > $sessionJsonPath
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "[shepherd-task] Post-mortem skill invocation exited with code $LASTEXITCODE."
        }
    }
    catch {
        Write-Warning "[shepherd-task] Post-mortem skill invocation failed: $($_.Exception.Message)"
    }
}

try {
    foreach ($issue in $issues) {
        Write-Output "=== Shepherding task issue #$issue ==="
        & $shepherdScript -TaskIssue $issue -BaseBranch $BaseBranch -Repo $Repo -LogDir $logDir
        $issueExitCode = $LASTEXITCODE
        if ($issueExitCode -ne 0) {
            $script:scriptExitCode = $issueExitCode
            throw "shepherd-task.ps1 failed for issue #$issue (exit code $issueExitCode)"
        }
    }

    Write-Output "=== All tasks shepherded successfully ==="
}
catch {
    if ($script:scriptExitCode -eq 0) {
        $script:scriptExitCode = 1
    }
    Write-Error $_
}
finally {
    Invoke-PostMortemSkill -ScriptExitCode $scriptExitCode
}

exit $scriptExitCode
