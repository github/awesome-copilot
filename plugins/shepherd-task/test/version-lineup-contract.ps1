# shepherd-task-version: 1.0.4
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
$expectedPluginFiles = @(
    './scripts/'
    './shepherd-task-version-contract.json'
    './test/'
    './version.ps1'
    './version.sh'
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
    $declaredPluginFiles = @($pluginManifest.extensions.'com.github.awesome-copilot'.pluginFiles)
    if ([string]::Join("`n", $declaredPluginFiles) -ne [string]::Join("`n", $expectedPluginFiles)) {
        throw 'Plugin manifest does not declare the complete shepherd-task plugin-file lineup.'
    }

    $versionInfo = & $versionReader
    $version = [string]$versionInfo.ShepherdTaskVersion
    if ($version -ne [string]$pluginManifest.version) {
        throw 'Version reader did not return the authoritative plugin version.'
    }

    $malformedPluginRoot = Join-Path $tempRoot 'malformed-plugin'
    $malformedScripts = Join-Path $malformedPluginRoot 'scripts'
    New-Item -ItemType Directory -Path $malformedScripts | Out-Null
    Copy-Item -LiteralPath (Join-Path $pluginRoot 'plugin.json') `
        -Destination $malformedPluginRoot
    Copy-Item -LiteralPath $versionReader -Destination $malformedScripts
    $malformedContractPath = Join-Path (
        $malformedPluginRoot
    ) 'shepherd-task-version-contract.json'
    $malformedVersionReader = Join-Path (
        $malformedScripts
    ) 'read-shepherd-task-version.ps1'
    $validContract = Get-Content -LiteralPath (
        Join-Path $pluginRoot 'shepherd-task-version-contract.json'
    ) -Raw | ConvertFrom-Json
    foreach ($malformedCase in @(
        @{
            Name = 'fractional contract schema'
            Mutate = { param($contract) $contract.schemaVersion = 1.4 }
        },
        @{
            Name = 'fractional protocol version'
            Mutate = {
                param($contract)
                $contract.stageOutcomeProtocolVersion = 1.5
            }
        },
        @{
            Name = 'string artifact schema'
            Mutate = {
                param($contract)
                $contract.artifactSchemaVersions.campaign = '1'
            }
        },
        @{
            Name = 'zero artifact schema'
            Mutate = {
                param($contract)
                $contract.artifactSchemaVersions.givenListRun = 0
            }
        }
    )) {
        $contract = $validContract | ConvertTo-Json -Depth 8 | ConvertFrom-Json
        & $malformedCase.Mutate $contract
        [IO.File]::WriteAllText(
            $malformedContractPath,
            ($contract | ConvertTo-Json -Depth 8) + [Environment]::NewLine,
            [Text.UTF8Encoding]::new($false)
        )
        $rejected = $false
        try {
            & $malformedVersionReader | Out-Null
        }
        catch {
            $rejected = $true
        }
        if (-not $rejected) {
            throw "Version reader accepted $($malformedCase.Name)."
        }
    }

    $marker = "# shepherd-task-version: $version"
    $estateFiles = [Collections.Generic.List[IO.FileInfo]]::new()
    foreach ($pluginReference in $pluginManifest.extensions.'com.github.awesome-copilot'.pluginFiles) {
        $relativePath = ([string]$pluginReference).Substring(2).TrimEnd('/')
        $pluginPath = Join-Path $pluginRoot $relativePath
        if (Test-Path -LiteralPath $pluginPath -PathType Container) {
            Get-ChildItem -LiteralPath $pluginPath -Recurse -File |
                Where-Object { $_.Extension -in @('.sh', '.ps1') } |
                ForEach-Object { $estateFiles.Add($_) }
        }
        elseif ([IO.Path]::GetExtension($pluginPath) -in @('.sh', '.ps1')) {
            $estateFiles.Add((Get-Item -LiteralPath $pluginPath))
        }
    }
    foreach ($skillReference in $pluginManifest.extensions.'com.github.awesome-copilot'.skills) {
        $skillPath = ([string]$skillReference).Substring(2).TrimEnd('/')
        $estateFiles.Add(
            (Get-Item -LiteralPath (Join-Path $pluginRoot "..\..\$skillPath\SKILL.md"))
        )
    }
    foreach ($estateFile in $estateFiles) {
        $matches = @([IO.File]::ReadAllLines($estateFile.FullName) | Where-Object { $_ -ceq $marker })
        if ($matches.Count -ne 1) {
            throw "Expected exactly one '$marker' marker in $($estateFile.FullName)."
        }
    }

    $env:COPILOT_HOME = Join-Path $tempRoot 'copilot-home'
    $sourceRepo = (Resolve-Path (Join-Path $pluginRoot '..\..')).Path
    $expectedSourceCommitOutput = @(& git -C $sourceRepo rev-parse HEAD)
    if ($LASTEXITCODE -ne 0 -or $expectedSourceCommitOutput.Count -eq 0) {
        throw 'Could not determine the expected plugin.json source commit.'
    }
    $expectedSourceCommit = [string]($expectedSourceCommitOutput | Select-Object -First 1)
    $installerOutput = @(& $installer 6>&1 | ForEach-Object { [string]$_ })
    $expectedCommitMessage = "  System commit: $expectedSourceCommit"
    if ($expectedCommitMessage -notin $installerOutput) {
        throw "Installer did not report the system commit '$expectedSourceCommit'."
    }

    $installedPlugin = Join-Path $env:COPILOT_HOME 'plugins\shepherd-task'
    foreach ($installedDriver in @(
        (Join-Path $installedPlugin 'test\simple-math\run-campaign.sh'),
        (Join-Path $installedPlugin 'test\simple-math\run-campaign.ps1'),
        (Join-Path $installedPlugin 'test\cargotracker-add-change-arrival-deadline-feature\run-campaign.sh'),
        (Join-Path $installedPlugin 'test\cargotracker-add-change-arrival-deadline-feature\run-campaign.ps1')
    )) {
        if (-not (Test-Path -LiteralPath $installedDriver -PathType Leaf)) {
            throw "Installed campaign driver is missing: $installedDriver"
        }
    }
    $installManifestPath = Join-Path $installedPlugin 'install-manifest.json'
    $installManifest = Get-Content -LiteralPath $installManifestPath -Raw | ConvertFrom-Json
    if ([string]$installManifest.shepherdTaskVersion -ne $version -or
        [string]$installManifest.sourceCommit -ne $expectedSourceCommit -or
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
