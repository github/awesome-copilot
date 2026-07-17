<#
.SYNOPSIS
    Removes the shepherd-task plugin and skills from the user's Copilot home directory.

.DESCRIPTION
    Removes:
      ~/.copilot/plugins/shepherd-task/
      ~/.copilot/skills/shepherd-task-*

.EXAMPLE
    ./uninstall-task-shepherd.ps1
#>

$ErrorActionPreference = 'Stop'

$CopilotHome = if ($env:COPILOT_HOME) { $env:COPILOT_HOME } else { Join-Path $HOME '.copilot' }

# Remove plugin.
$pluginDir = Join-Path $CopilotHome 'plugins' 'shepherd-task'
if (Test-Path $pluginDir -PathType Container) {
    Remove-Item -Path $pluginDir -Recurse -Force
    Write-Host "Removed $pluginDir"
} else {
    Write-Host "Plugin not found: $pluginDir (skipped)"
}

# Remove skills.
$skills = @(
    'shepherd-task-from-assignment-to-ready'
    'shepherd-task-from-ready-to-merged-to-base'
    'shepherd-task-approve-workflows-and-wait-for-completion'
)
foreach ($skill in $skills) {
    $skillDir = Join-Path $CopilotHome 'skills' $skill
    if (Test-Path $skillDir -PathType Container) {
        Remove-Item -Path $skillDir -Recurse -Force
        Write-Host "Removed ~/.copilot/skills/$skill"
    }
}

Write-Host ""
Write-Host "Shepherd-task fully uninstalled."
