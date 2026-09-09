# shepherd-task-version: 1.0.1
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$pluginRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$pluginManifestPath = Join-Path $pluginRoot 'plugin.json'
$versionContractPath = Join-Path $pluginRoot 'shepherd-task-version-contract.json'
$installManifestPath = Join-Path $pluginRoot 'install-manifest.json'

if (-not (Test-Path -LiteralPath $pluginManifestPath -PathType Leaf)) {
    throw "Shepherd-task plugin manifest not found: $pluginManifestPath"
}
if (-not (Test-Path -LiteralPath $versionContractPath -PathType Leaf)) {
    throw "Shepherd-task version contract not found: $versionContractPath"
}

$pluginManifest = Get-Content -LiteralPath $pluginManifestPath -Raw | ConvertFrom-Json
$versionContract = Get-Content -LiteralPath $versionContractPath -Raw | ConvertFrom-Json
$version = [string]$pluginManifest.version

if ($version -notmatch '^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$') {
    throw 'Shepherd-task plugin version is missing or is not Semantic Versioning.'
}
if ([int]$versionContract.schemaVersion -ne 1) {
    throw "Unsupported shepherd-task version-contract schemaVersion '$($versionContract.schemaVersion)'."
}

$requiredContractVersions = @(
    [int]$versionContract.stageOutcomeProtocolVersion
    [int]$versionContract.artifactSchemaVersions.campaign
    [int]$versionContract.artifactSchemaVersions.givenListRun
    [int]$versionContract.artifactSchemaVersions.installationManifest
    [int]$versionContract.artifactSchemaVersions.installedComponent
)
if ($requiredContractVersions | Where-Object { $_ -lt 1 }) {
    throw 'Shepherd-task version contract contains an invalid protocol or artifact schema version.'
}

$expectedSkills = @(
    $pluginManifest.extensions.'com.github.awesome-copilot'.skills |
        ForEach-Object {
            ([string]$_).Substring(('./skills/').Length).TrimEnd('/')
        }
)

if (Test-Path -LiteralPath $installManifestPath -PathType Leaf) {
    $installManifest = Get-Content -LiteralPath $installManifestPath -Raw | ConvertFrom-Json
    $installedSkills = @($installManifest.components.skills)
    $installedSkillNames = @($installedSkills | ForEach-Object { [string]$_.name })
    if ([int]$installManifest.schemaVersion -ne [int]$versionContract.artifactSchemaVersions.installationManifest -or
        [string]$installManifest.shepherdTaskVersion -ne $version -or
        [string]$installManifest.components.plugin.shepherdTaskVersion -ne $version -or
        [string]::Join("`n", $installedSkillNames) -ne [string]::Join("`n", $expectedSkills) -or
        @($installedSkills | Where-Object {
            [string]$_.shepherdTaskVersion -ne $version
        }).Count -ne 0) {
        throw "Installed shepherd-task components do not match plugin version $version."
    }
    foreach ($skill in $expectedSkills) {
        $componentManifestPath = Join-Path $pluginRoot "skills\$skill\shepherd-task-component.json"
        if (-not (Test-Path -LiteralPath $componentManifestPath -PathType Leaf)) {
            throw "Installed shepherd-task skill '$skill' has no lineup stamp."
        }
        $componentManifest = Get-Content -LiteralPath $componentManifestPath -Raw | ConvertFrom-Json
        if ([string]$componentManifest.shepherdTaskVersion -ne $version -or
            [string]$componentManifest.component -ne $skill) {
            throw "Installed shepherd-task skill '$skill' does not match plugin version $version."
        }
    }
}

[pscustomobject]@{
    ShepherdTaskVersion = $version
    VersionContractSchemaVersion = [int]$versionContract.schemaVersion
    StageOutcomeProtocolVersion = [int]$versionContract.stageOutcomeProtocolVersion
    ArtifactSchemaVersions = $versionContract.artifactSchemaVersions
}
