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
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$shepherdScript = Join-Path $scriptDir 'shepherd-task.ps1'

$logDir = "shepherd-tasks-$(Get-Date -Format 'yyyyMMdd-HHmm')"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

$issues = $TaskIssues -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }

foreach ($issue in $issues) {
    Write-Output "=== Shepherding task issue #$issue ==="
    & $shepherdScript -TaskIssue $issue -BaseBranch $BaseBranch -Repo $Repo -LogDir $logDir
    if ($LASTEXITCODE -ne 0) {
        Write-Error "shepherd-task.ps1 failed for issue #$issue (exit code $LASTEXITCODE)"
        exit $LASTEXITCODE
    }
}

Write-Output "=== All tasks shepherded successfully ==="
