<#
.SYNOPSIS
    Copies the orchestration scripts and skills into another repository.

.DESCRIPTION
    Copies the following from this repository to the target:
      plugins/shepherd-task/scripts   (orchestration scripts)
      skills/shepherd-task-*          (skills, only if not already present)

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

# Copy skills (only if not already present in target).
$SourceRepo = (Resolve-Path (Join-Path $ScriptDir '..\..\..')).Path
$skills = @(
    'shepherd-task-from-assignment-to-ready'
    'shepherd-task-from-ready-to-merged-to-base'
    'shepherd-task-approve-workflows-and-wait-for-completion'
)

$skillsInstalled = 0
$skillsSkipped = 0
foreach ($skill in $skills) {
    $skillSrc = Join-Path $SourceRepo 'skills' $skill
    $skillDest = Join-Path $TargetRepo 'skills' $skill

    if (-not (Test-Path $skillSrc -PathType Container)) {
        Write-Warning "Source skill not found: $skillSrc"
        continue
    }

    if (Test-Path $skillDest -PathType Container) {
        Write-Host "Skipped skills/$skill (already exists)"
        $skillsSkipped++
    } else {
        New-Item -ItemType Directory -Path $skillDest -Force | Out-Null
        Copy-Item -Path (Join-Path $skillSrc '*') -Destination $skillDest -Recurse -Force
        Write-Host "Copied skills/$skill"
        $skillsInstalled++
    }
}

Write-Host ""
Write-Host "Installation complete into $TargetRepo"
Write-Host "  Scripts: copied"
Write-Host "  Skills:  $skillsInstalled installed, $skillsSkipped already present"
