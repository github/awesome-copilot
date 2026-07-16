<#
.SYNOPSIS
    Copies the orchestration scripts into another repository.

.DESCRIPTION
    Copies the following directory from this repository to the target:
      plugins/shepherd-task/scripts

    Skills should be installed separately via:
      gh skill install github/awesome-copilot shepherd-task-from-assignment-to-ready
      gh skill install github/awesome-copilot shepherd-task-from-ready-to-merged-to-base
      gh skill install github/awesome-copilot shepherd-task-approve-workflows-and-wait-for-completion

.PARAMETER TargetRepoPath
    Relative path to the target repository root (must exist).

.EXAMPLE
    ./install-task-shepherd.ps1 ../my-other-repo
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
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

# Copy orchestration scripts.
$dest = Join-Path $TargetRepo 'plugins/shepherd-task/scripts'
if (-not (Test-Path $dest)) {
    New-Item -ItemType Directory -Path $dest -Force | Out-Null
}
Copy-Item -Path (Join-Path $ScriptDir '*') -Destination $dest -Recurse -Force
Write-Host "Copied plugins/shepherd-task/scripts"

Write-Host ""
Write-Host "Orchestration scripts installed into $TargetRepo"
Write-Host ""
Write-Host "Next, install the skills via gh CLI:"
Write-Host "  gh skill install github/awesome-copilot shepherd-task-from-assignment-to-ready"
Write-Host "  gh skill install github/awesome-copilot shepherd-task-from-ready-to-merged-to-base"
Write-Host "  gh skill install github/awesome-copilot shepherd-task-approve-workflows-and-wait-for-completion"
