<#
.SYNOPSIS
    Installs one coherent shepherd-task plugin and skill lineup.

.PARAMETER AllowDowngrade
    Allows replacing a newer installed shepherd-task lineup with an older one.
#>

[CmdletBinding()]
param(
    [switch]$AllowDowngrade
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Compare-SemVer {
    param(
        [Parameter(Mandatory)][string]$Left,
        [Parameter(Mandatory)][string]$Right
    )

    $pattern = '^(?<major>[0-9]+)\.(?<minor>[0-9]+)\.(?<patch>[0-9]+)(?:-(?<pre>[0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$'
    $leftMatch = [regex]::Match($Left, $pattern)
    $rightMatch = [regex]::Match($Right, $pattern)
    if (-not $leftMatch.Success -or -not $rightMatch.Success) {
        throw "Cannot compare invalid Semantic Versions '$Left' and '$Right'."
    }
    foreach ($part in @('major', 'minor', 'patch')) {
        $leftPart = [long]$leftMatch.Groups[$part].Value
        $rightPart = [long]$rightMatch.Groups[$part].Value
        if ($leftPart -lt $rightPart) { return -1 }
        if ($leftPart -gt $rightPart) { return 1 }
    }
    $leftPre = $leftMatch.Groups['pre'].Value
    $rightPre = $rightMatch.Groups['pre'].Value
    if (-not $leftPre -and $rightPre) { return 1 }
    if ($leftPre -and -not $rightPre) { return -1 }
    if ($leftPre -eq $rightPre) { return 0 }
    $leftIdentifiers = @($leftPre -split '\.')
    $rightIdentifiers = @($rightPre -split '\.')
    $identifierCount = [Math]::Max($leftIdentifiers.Count, $rightIdentifiers.Count)
    for ($index = 0; $index -lt $identifierCount; $index++) {
        if ($index -ge $leftIdentifiers.Count) { return -1 }
        if ($index -ge $rightIdentifiers.Count) { return 1 }
        $leftIdentifier = $leftIdentifiers[$index]
        $rightIdentifier = $rightIdentifiers[$index]
        if ($leftIdentifier -ceq $rightIdentifier) { continue }
        $leftNumeric = $leftIdentifier -match '^[0-9]+$'
        $rightNumeric = $rightIdentifier -match '^[0-9]+$'
        if ($leftNumeric -and $rightNumeric) {
            $leftNumber = [long]$leftIdentifier
            $rightNumber = [long]$rightIdentifier
            if ($leftNumber -lt $rightNumber) { return -1 }
            return 1
        }
        if ($leftNumeric) { return -1 }
        if ($rightNumeric) { return 1 }
        return [string]::CompareOrdinal($leftIdentifier, $rightIdentifier)
    }
    return 0
}

$copilotHome = if ($env:COPILOT_HOME) { $env:COPILOT_HOME } else { Join-Path $HOME '.copilot' }
$sourceRepo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$pluginSrc = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$pluginDest = Join-Path $copilotHome 'plugins\shepherd-task'
$skillsDest = Join-Path $copilotHome 'skills'
$skills = @(
    'shepherd-task-10-create-ignorance-reduction-plan'
    'shepherd-task-20-create-issues-from-plan'
    'shepherd-task-30-from-assignment-to-ready'
    'shepherd-task-40-from-ready-to-merged-to-base'
    'shepherd-task-50-create-post-mortem'
    'shepherd-task-approve-workflows-and-wait-for-completion'
)
$requiredScripts = @(
    'shepherd-task-00-init-campaign.sh'
    'shepherd-task-00-init-campaign.ps1'
    'shepherd-task-15-prepare-create-issues.sh'
    'shepherd-task-15-prepare-create-issues.ps1'
    'shepherd-task-25-given-list.sh'
    'shepherd-task-25-given-list.ps1'
    'resolve-repository-remote.sh'
    'resolve-repository-remote.ps1'
    'redact-secrets.sh'
    'redact-secrets.ps1'
    'validate-stage20-drafts.sh'
    'validate-stage20-drafts.ps1'
    'verify-github-issue-body.sh'
    'verify-github-issue-body.ps1'
    'assert-stage20-result.sh'
    'assert-stage20-result.ps1'
    'assert-shepherd-session-outcome.sh'
    'assert-shepherd-session-outcome.ps1'
    'read-shepherd-task-version.sh'
    'read-shepherd-task-version.ps1'
)

New-Item -ItemType Directory -Path $copilotHome -Force | Out-Null
$stagingRoot = Join-Path $copilotHome ".shepherd-task-install-$([guid]::NewGuid().ToString('N'))"
$backupRoot = Join-Path $copilotHome ".shepherd-task-backup-$([guid]::NewGuid().ToString('N'))"
$stagedPlugin = Join-Path $stagingRoot 'plugin'
$stagedSkills = Join-Path $stagingRoot 'skills'
$publishStarted = $false
$published = $false

try {
    New-Item -ItemType Directory -Path $stagedPlugin, $stagedSkills | Out-Null
    Copy-Item -Path (Join-Path $pluginSrc '*') -Destination $stagedPlugin -Recurse -Force

    $versionInfo = & (Join-Path $stagedPlugin 'scripts\read-shepherd-task-version.ps1')
    $version = [string]$versionInfo.ShepherdTaskVersion
    $installManifestSchemaVersion = [int]$versionInfo.ArtifactSchemaVersions.installationManifest
    $installedComponentSchemaVersion = [int]$versionInfo.ArtifactSchemaVersions.installedComponent

    $existingVersion = $null
    $existingInstallManifest = Join-Path $pluginDest 'install-manifest.json'
    $existingPluginManifest = Join-Path $pluginDest 'plugin.json'
    if (Test-Path -LiteralPath $existingInstallManifest -PathType Leaf) {
        $existingVersion = [string](
            Get-Content -LiteralPath $existingInstallManifest -Raw | ConvertFrom-Json
        ).shepherdTaskVersion
    } elseif (Test-Path -LiteralPath $existingPluginManifest -PathType Leaf) {
        $existingVersion = [string](
            Get-Content -LiteralPath $existingPluginManifest -Raw | ConvertFrom-Json
        ).version
    }
    if ($existingVersion -and
        (Compare-SemVer -Left $version -Right $existingVersion) -lt 0 -and
        -not $AllowDowngrade) {
        throw "Refusing to downgrade shepherd-task from $existingVersion to $version. Re-run with -AllowDowngrade to permit this downgrade."
    }

    New-Item -ItemType Directory -Path (Join-Path $stagedPlugin 'skills') | Out-Null
    foreach ($skill in $skills) {
        $skillSrc = Join-Path $sourceRepo "skills\$skill"
        if (-not (Test-Path -LiteralPath (Join-Path $skillSrc 'SKILL.md') -PathType Leaf)) {
            throw "Required source skill not found: $skillSrc\SKILL.md"
        }
        Copy-Item -LiteralPath $skillSrc -Destination (Join-Path $stagedSkills $skill) -Recurse
        Copy-Item -LiteralPath $skillSrc -Destination (Join-Path $stagedPlugin "skills\$skill") -Recurse
        foreach ($stagedSkill in @(
            (Join-Path $stagedSkills $skill),
            (Join-Path $stagedPlugin "skills\$skill")
        )) {
            $component = [ordered]@{
                schemaVersion = $installedComponentSchemaVersion
                shepherdTaskVersion = $version
                component = $skill
            }
            [IO.File]::WriteAllText(
                (Join-Path $stagedSkill 'shepherd-task-component.json'),
                ($component | ConvertTo-Json -Depth 3) + [Environment]::NewLine,
                [Text.UTF8Encoding]::new($false)
            )
        }
    }

    foreach ($script in $requiredScripts) {
        if (-not (Test-Path -LiteralPath (Join-Path $stagedPlugin "scripts\$script") -PathType Leaf)) {
            throw "Required script was not staged: $script"
        }
    }

    foreach ($skill in $skills) {
        $component = Get-Content -LiteralPath (
            Join-Path $stagedSkills "$skill\shepherd-task-component.json"
        ) -Raw | ConvertFrom-Json
        if ([int]$component.schemaVersion -ne $installedComponentSchemaVersion -or
            [string]$component.shepherdTaskVersion -ne $version -or
            [string]$component.component -ne $skill) {
            throw "Staged skill '$skill' does not belong to shepherd-task lineup $version."
        }
    }

    New-Item -ItemType Directory -Path (
        Split-Path -Parent $pluginDest
    ), $skillsDest, (Join-Path $backupRoot 'skills') -Force | Out-Null
    $publishStarted = $true
    if (Test-Path -LiteralPath $pluginDest) {
        Move-Item -LiteralPath $pluginDest -Destination (Join-Path $backupRoot 'plugin')
    }
    foreach ($skill in $skills) {
        $skillDest = Join-Path $skillsDest $skill
        if (Test-Path -LiteralPath $skillDest) {
            Move-Item -LiteralPath $skillDest -Destination (Join-Path $backupRoot "skills\$skill")
        }
    }

    Move-Item -LiteralPath $stagedPlugin -Destination $pluginDest
    foreach ($skill in $skills) {
        Move-Item -LiteralPath (Join-Path $stagedSkills $skill) -Destination (Join-Path $skillsDest $skill)
    }

    $pluginManifest = Get-Content -LiteralPath (Join-Path $pluginDest 'plugin.json') -Raw | ConvertFrom-Json
    $sourceCommitOutput = @(& git -C $sourceRepo rev-parse HEAD 2>$null)
    $sourceCommit = if ($LASTEXITCODE -eq 0 -and $sourceCommitOutput.Count -gt 0) {
        [string]($sourceCommitOutput | Select-Object -First 1)
    } else {
        $null
    }
    $schemaMatch = [regex]::Match([string]$pluginManifest.'$schema', '/schemas/([^/]+)/plugin\.schema\.json$')
    $installManifest = [ordered]@{
        schemaVersion = $installManifestSchemaVersion
        shepherdTaskVersion = $version
        versionContractSchemaVersion = [int]$versionInfo.VersionContractSchemaVersion
        agentPluginsSpecVersion = if ($schemaMatch.Success) { $schemaMatch.Groups[1].Value } else { $null }
        sourceCommit = $sourceCommit
        sourceRepository = [string]$pluginManifest.repository
        installedAt = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
        stageOutcomeProtocolVersion = [int]$versionInfo.StageOutcomeProtocolVersion
        components = [ordered]@{
            plugin = [ordered]@{
                name = 'shepherd-task'
                shepherdTaskVersion = $version
            }
            skills = @($skills | ForEach-Object {
                [ordered]@{
                    name = $_
                    shepherdTaskVersion = $version
                }
            })
        }
    }
    $tempInstallManifest = Join-Path $pluginDest ".install-manifest.json.tmp.$PID"
    [IO.File]::WriteAllText(
        $tempInstallManifest,
        ($installManifest | ConvertTo-Json -Depth 8) + [Environment]::NewLine,
        [Text.UTF8Encoding]::new($false)
    )
    Move-Item -LiteralPath $tempInstallManifest -Destination (Join-Path $pluginDest 'install-manifest.json')

    & (Join-Path $pluginDest 'scripts\read-shepherd-task-version.ps1') | Out-Null
    $published = $true

    Write-Host "Installed shepherd-task $version."
    Write-Host "  Plugin: $pluginDest"
    Write-Host "  Skills: $($skills.Count) replaced as one lineup"
    Write-Host "  Manifest: $(Join-Path $pluginDest 'install-manifest.json')"
    Write-Host ''
    Write-Host 'Verify with: copilot skill list'
}
finally {
    if ($publishStarted -and -not $published) {
        Remove-Item -LiteralPath $pluginDest -Recurse -Force -ErrorAction SilentlyContinue
        $backupPlugin = Join-Path $backupRoot 'plugin'
        if (Test-Path -LiteralPath $backupPlugin) {
            New-Item -ItemType Directory -Path (Split-Path -Parent $pluginDest) -Force | Out-Null
            Move-Item -LiteralPath $backupPlugin -Destination $pluginDest
        }
        foreach ($skill in $skills) {
            $skillDest = Join-Path $skillsDest $skill
            Remove-Item -LiteralPath $skillDest -Recurse -Force -ErrorAction SilentlyContinue
            $backupSkill = Join-Path $backupRoot "skills\$skill"
            if (Test-Path -LiteralPath $backupSkill) {
                New-Item -ItemType Directory -Path $skillsDest -Force | Out-Null
                Move-Item -LiteralPath $backupSkill -Destination $skillDest
            }
        }
    }
    Remove-Item -LiteralPath $stagingRoot, $backupRoot -Recurse -Force -ErrorAction SilentlyContinue
}
