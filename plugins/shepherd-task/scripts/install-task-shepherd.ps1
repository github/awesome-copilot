<#
.SYNOPSIS
    Copies the task shepherd system into another repository.

.DESCRIPTION
    Copies the following directories from this repository to the target:
      skills/shepherd-task-from-ready-to-merged-to-base
      skills/shepherd-task-approve-workflows-and-wait-for-completion
      skills/shepherd-task-from-assignment-to-ready
      plugins/shepherd-task/scripts

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

# Resolve the source repo root (three levels up from plugins/shepherd-task/scripts/).
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$SourceRepo = (Resolve-Path (Join-Path $ScriptDir '..\..\..')).Path

# Validate source repo looks correct.
if (-not (Test-Path (Join-Path $SourceRepo 'skills' 'shepherd-task-from-assignment-to-ready'))) {
    Write-Error "Cannot locate skills/shepherd-task-from-assignment-to-ready in source repo at $SourceRepo"
}

# Validate target path exists.
if (-not (Test-Path $TargetRepoPath -PathType Container)) {
    Write-Error "Target repository path does not exist: $TargetRepoPath"
}

$TargetRepo = (Resolve-Path $TargetRepoPath).Path

$Skills = @(
    'skills/shepherd-task-from-ready-to-merged-to-base'
    'skills/shepherd-task-approve-workflows-and-wait-for-completion'
    'skills/shepherd-task-from-assignment-to-ready'
)

# Copy skill directories.
foreach ($skill in $Skills) {
    $source = Join-Path $SourceRepo $skill
    $dest = Join-Path $TargetRepo $skill
    if (-not (Test-Path $dest)) {
        New-Item -ItemType Directory -Path $dest -Force | Out-Null
    }
    Copy-Item -Path (Join-Path $source '*') -Destination $dest -Recurse -Force
    Write-Host "Copied $skill"
}

# Copy orchestration scripts.
$dest = Join-Path $TargetRepo 'plugins/shepherd-task/scripts'
if (-not (Test-Path $dest)) {
    New-Item -ItemType Directory -Path $dest -Force | Out-Null
}
Copy-Item -Path (Join-Path $ScriptDir '*') -Destination $dest -Recurse -Force
Write-Host "Copied plugins/shepherd-task/scripts"

Write-Host "Task shepherd system installed into $TargetRepo"
