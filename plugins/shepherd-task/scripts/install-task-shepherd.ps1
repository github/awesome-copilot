<#
.SYNOPSIS
    Installs the shepherd-task plugin and skills into the user's Copilot home directory.

.DESCRIPTION
    Installs to:
      ~/.copilot/plugins/shepherd-task/  (plugin with orchestration scripts)
      ~/.copilot/skills/shepherd-task-*  (skills, only if not already present)

.EXAMPLE
    ./install-task-shepherd.ps1
#>

$ErrorActionPreference = 'Stop'

$CopilotHome = if ($env:COPILOT_HOME) { $env:COPILOT_HOME } else { Join-Path $HOME '.copilot' }

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$SourceRepo = (Resolve-Path (Join-Path $ScriptDir '..\..\..')).Path
$PluginSrc = (Resolve-Path (Join-Path $ScriptDir '..')).Path

# Install plugin.
$pluginDest = Join-Path $CopilotHome 'plugins' 'shepherd-task'
if (-not (Test-Path $pluginDest)) {
    New-Item -ItemType Directory -Path $pluginDest -Force | Out-Null
}
Copy-Item -Path (Join-Path $PluginSrc '*') -Destination $pluginDest -Recurse -Force
Write-Host "Installed plugin to $pluginDest"

# Verify required campaign initialization and log redaction scripts were installed.
$requiredScripts = @(
    'shepherd-task-init-campaign.sh'
    'shepherd-task-init-campaign.ps1'
    'redact-secrets.sh'
    'redact-secrets.ps1'
)
foreach ($script in $requiredScripts) {
    $installedScript = Join-Path $pluginDest 'scripts' $script
    if (-not (Test-Path $installedScript -PathType Leaf)) {
        throw "Required script was not installed: $installedScript"
    }
}

# Install skills (only if not already present).
$skills = @(
    'shepherd-task-30-from-assignment-to-ready'
    'shepherd-task-40-from-ready-to-merged-to-base'
    'shepherd-task-approve-workflows-and-wait-for-completion'
    'shepherd-task-10-create-ignorance-reduction-plan'
    'shepherd-task-50-create-post-mortem'
    'shepherd-task-20-create-issues-from-plan'
)

$skillsInstalled = 0
$skillsSkipped = 0
foreach ($skill in $skills) {
    $skillSrc = Join-Path $SourceRepo 'skills' $skill
    $skillDest = Join-Path $CopilotHome 'skills' $skill

    if (-not (Test-Path $skillSrc -PathType Container)) {
        Write-Warning "Source skill not found: $skillSrc"
        continue
    }

    if (Test-Path $skillDest -PathType Container) {
        Write-Host "Skipped ~/.copilot/skills/$skill (already exists)"
        $skillsSkipped++
    } else {
        New-Item -ItemType Directory -Path $skillDest -Force | Out-Null
        Copy-Item -Path (Join-Path $skillSrc '*') -Destination $skillDest -Recurse -Force
        Write-Host "Installed ~/.copilot/skills/$skill"
        $skillsInstalled++
    }
}

Write-Host ""
Write-Host "Installation complete."
Write-Host "  Plugin: $pluginDest"
Write-Host "  Skills: $skillsInstalled installed, $skillsSkipped already present"
Write-Host ""
Write-Host "Campaign initialization scripts available at:"
Write-Host "  $(Join-Path $pluginDest 'scripts' 'shepherd-task-init-campaign.sh')"
Write-Host "  $(Join-Path $pluginDest 'scripts' 'shepherd-task-init-campaign.ps1')"
Write-Host ""
Write-Host "Interview script available at:"
Write-Host "  $(Join-Path $pluginDest 'scripts' 'shepherd-task-interview-user-to-create-issues.ps1')"
Write-Host ""
Write-Host "Verify with: copilot skill list"
