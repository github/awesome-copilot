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
    $redactionScripts = @(
        'redact-secrets.sh'
        'redact-secrets.ps1'
    )
    foreach ($script in $redactionScripts) {
        $installedScript = Join-Path $pluginDir 'scripts' $script
        if (Test-Path $installedScript -PathType Leaf) {
            Remove-Item -Path $installedScript -Force
            Write-Host "Removed $installedScript"
        }
    }
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
    'shepherd-task-create-ignorance-reduction-plan'
    'shepherd-task-create-post-mortem'
    'shepherd-task-create-issues-from-plan'
)
foreach ($skill in $skills) {
    $skillDir = Join-Path $CopilotHome 'skills' $skill
    if (Test-Path $skillDir -PathType Container) {
        Remove-Item -Path $skillDir -Recurse -Force
        Write-Host "Removed ~/.copilot/skills/$skill"
    }
}

# Remove any generated interview prompt files from the plugin scripts directory.
$interviewPrompts = Join-Path $pluginDir 'scripts' '*invoke-shepherd-task-create-issues-from-plan-skill.md'
Remove-Item -Path $interviewPrompts -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Shepherd-task fully uninstalled."
