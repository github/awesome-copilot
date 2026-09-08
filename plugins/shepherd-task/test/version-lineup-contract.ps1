Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$pluginRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$installer = Join-Path $pluginRoot 'scripts\install-task-shepherd.ps1'
$versionReader = Join-Path $pluginRoot 'scripts\read-shepherd-task-version.ps1'
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) "shepherd-version-$([guid]::NewGuid().ToString('N'))"
$previousCopilotHome = $env:COPILOT_HOME
$expectedSkills = @(
    'shepherd-task-10-create-ignorance-reduction-plan'
    'shepherd-task-20-create-issues-from-plan'
    'shepherd-task-30-from-assignment-to-ready'
    'shepherd-task-40-from-ready-to-merged-to-base'
    'shepherd-task-50-create-post-mortem'
    'shepherd-task-approve-workflows-and-wait-for-completion'
)

try {
    New-Item -ItemType Directory -Path $tempRoot | Out-Null
    $pluginManifest = Get-Content -LiteralPath (Join-Path $pluginRoot 'plugin.json') -Raw | ConvertFrom-Json
    $declaredSkills = @(
        $pluginManifest.extensions.'com.github.awesome-copilot'.skills |
        ForEach-Object { ([string]$_ -replace '^\./skills/', '').TrimEnd('/') }
    )
    if ([string]::Join("`n", $declaredSkills) -ne [string]::Join("`n", $expectedSkills)) {
        throw 'Plugin manifest does not declare the complete ordered shepherd-task skill lineup.'
    }

    $versionInfo = & $versionReader
    $version = [string]$versionInfo.ShepherdTaskVersion
    if ($version -ne [string]$pluginManifest.version) {
        throw 'Version reader did not return the authoritative plugin version.'
    }

    $env:COPILOT_HOME = Join-Path $tempRoot 'copilot-home'
    & $installer | Out-Null

    $installedPlugin = Join-Path $env:COPILOT_HOME 'plugins\shepherd-task'
    $installManifestPath = Join-Path $installedPlugin 'install-manifest.json'
    $installManifest = Get-Content -LiteralPath $installManifestPath -Raw | ConvertFrom-Json
    if ([string]$installManifest.shepherdTaskVersion -ne $version -or
        @($installManifest.components.skills).Count -ne 6 -or
        @($installManifest.components.skills | Where-Object {
            [string]$_.shepherdTaskVersion -ne $version
        }).Count -ne 0) {
        throw 'Installation manifest does not describe one coherent lineup.'
    }

    foreach ($skill in $expectedSkills) {
        foreach ($skillRoot in @(
            (Join-Path $installedPlugin "skills\$skill"),
            (Join-Path $env:COPILOT_HOME "skills\$skill")
        )) {
            if (-not (Test-Path -LiteralPath (Join-Path $skillRoot 'SKILL.md') -PathType Leaf)) {
                throw "Installed skill is incomplete: $skillRoot"
            }
            $component = Get-Content -LiteralPath (
                Join-Path $skillRoot 'shepherd-task-component.json'
            ) -Raw | ConvertFrom-Json
            if ([string]$component.shepherdTaskVersion -ne $version -or
                [string]$component.component -ne $skill) {
                throw "Installed skill '$skill' has an invalid lineup stamp."
            }
        }
    }

    $sentinel = Join-Path $env:COPILOT_HOME 'skills\shepherd-task-10-create-ignorance-reduction-plan\stale-file'
    New-Item -ItemType File -Path $sentinel | Out-Null
    & $installer | Out-Null
    if (Test-Path -LiteralPath $sentinel) {
        throw 'Installer retained a stale file from the previous skill lineup.'
    }

    $installManifest = Get-Content -LiteralPath $installManifestPath -Raw | ConvertFrom-Json
    $installManifest.shepherdTaskVersion = '9.0.0'
    [IO.File]::WriteAllText(
        $installManifestPath,
        ($installManifest | ConvertTo-Json -Depth 8) + [Environment]::NewLine,
        [Text.UTF8Encoding]::new($false)
    )
    try {
        & $installer *> (Join-Path $tempRoot 'downgrade.out')
        throw 'Installer accepted an accidental downgrade.'
    }
    catch {
        if (-not $_.Exception.Message.Contains('Refusing to downgrade shepherd-task from 9.0.0')) {
            throw
        }
    }

    & $installer -AllowDowngrade | Out-Null
    $restoredManifest = Get-Content -LiteralPath $installManifestPath -Raw | ConvertFrom-Json
    if ([string]$restoredManifest.shepherdTaskVersion -ne $version) {
        throw 'Explicit downgrade did not restore the requested lineup.'
    }

    $leftovers = @(Get-ChildItem -LiteralPath $env:COPILOT_HOME -Force | Where-Object {
        $_.Name -like '.shepherd-task-install-*' -or $_.Name -like '.shepherd-task-backup-*'
    })
    if ($leftovers.Count -ne 0) {
        throw 'Installer left staging or backup directories behind.'
    }
}
finally {
    $env:COPILOT_HOME = $previousCopilotHome
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host 'PowerShell shepherd-task version lineup contract tests passed.' -ForegroundColor Green
