<#
.SYNOPSIS
    Removes the orchestration scripts from a target repository.

.DESCRIPTION
    Removes the following directory from the target:
      plugins/shepherd-task/scripts

    Skills must be removed manually by deleting them from your agent's skills location.

.PARAMETER TargetRepoPath
    Relative path to the target repository root (must exist).

.EXAMPLE
    ./uninstall-task-shepherd.ps1 ../my-other-repo
#>

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$TargetRepoPath
)

$ErrorActionPreference = 'Stop'

# Validate target path exists.
if (-not (Test-Path $TargetRepoPath -PathType Container)) {
    Write-Error "Target repository path does not exist: $TargetRepoPath"
}

$TargetRepo = (Resolve-Path $TargetRepoPath).Path
$ScriptsDir = Join-Path $TargetRepo 'plugins' 'shepherd-task' 'scripts'

if (-not (Test-Path $ScriptsDir)) {
    Write-Host "Nothing to remove: $ScriptsDir does not exist."
    exit 0
}

Remove-Item -Path $ScriptsDir -Recurse -Force
Write-Host "Removed $ScriptsDir"

# Clean up empty parent directories.
$parentDir = Join-Path $TargetRepo 'plugins' 'shepherd-task'
if ((Test-Path $parentDir) -and ((Get-ChildItem $parentDir -Force | Measure-Object).Count -eq 0)) {
    Remove-Item -Path $parentDir -Force
    Write-Host "Removed plugins/shepherd-task/"
}

$pluginsDir = Join-Path $TargetRepo 'plugins'
if ((Test-Path $pluginsDir) -and ((Get-ChildItem $pluginsDir -Force | Measure-Object).Count -eq 0)) {
    Remove-Item -Path $pluginsDir -Force
    Write-Host "Removed plugins/"
}

Write-Host ""
Write-Host "Orchestration scripts removed from $TargetRepo"
Write-Host ""
Write-Host "To also remove the skills, manually delete them from your agent's skills location:"
Write-Host "  Remove-Item -Recurse <skills-dir>/shepherd-task-from-assignment-to-ready"
Write-Host "  Remove-Item -Recurse <skills-dir>/shepherd-task-from-ready-to-merged-to-base"
Write-Host "  Remove-Item -Recurse <skills-dir>/shepherd-task-approve-workflows-and-wait-for-completion"
