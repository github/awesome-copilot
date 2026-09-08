<#
.SYNOPSIS
    Reports or updates shepherd-task lineup and Agent Plugins schema versions.
#>

[CmdletBinding(DefaultParameterSetName = 'Show')]
param(
    [Parameter(Mandatory, ParameterSetName = 'IncrementMicro')]
    [switch]$IncrementMicro,

    [Parameter(Mandatory, ParameterSetName = 'IncrementMinor')]
    [switch]$IncrementMinor,

    [Parameter(Mandatory, ParameterSetName = 'IncrementMajor')]
    [switch]$IncrementMajor,

    [Parameter(Mandatory, ParameterSetName = 'NewSchemaVersion')]
    [ValidateNotNullOrEmpty()]
    [string]$NewSchemaVersion
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$pluginRoot = $PSScriptRoot
$pluginManifestPath = Join-Path $pluginRoot 'plugin.json'
$versionContractPath = Join-Path $pluginRoot 'shepherd-task-version-contract.json'
$mcpManifestPath = Join-Path $pluginRoot 'mcp.json'
$semVerPattern = '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-((0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)(\.(0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*))*))?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$'
$utf8NoBom = [Text.UTF8Encoding]::new($false)

function Read-Json {
    param([Parameter(Mandatory)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Required JSON file not found: $Path"
    }
    try {
        return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
    }
    catch {
        throw "Invalid JSON in '$Path': $($_.Exception.Message)"
    }
}

function Write-JsonAtomically {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][object]$Value
    )

    $temporaryPath = "$Path.tmp.$PID"
    try {
        [IO.File]::WriteAllText(
            $temporaryPath,
            ($Value | ConvertTo-Json -Depth 20) + [Environment]::NewLine,
            $utf8NoBom
        )
        Move-Item -LiteralPath $temporaryPath -Destination $Path -Force
    }
    finally {
        Remove-Item -LiteralPath $temporaryPath -Force -ErrorAction SilentlyContinue
    }
}

function Assert-SemVer {
    param(
        [Parameter(Mandatory)][string]$Version,
        [Parameter(Mandatory)][string]$Label
    )

    if ($Version -cnotmatch $semVerPattern) {
        throw "$Label '$Version' is not valid Semantic Versioning."
    }
}

function Assert-SourceCheckout {
    try {
        $repoRootOutput = @(& git -C $pluginRoot rev-parse --show-toplevel 2>$null)
    }
    catch {
        throw 'Mutating version operations require Git and a shepherd-task source checkout.'
    }
    if ($LASTEXITCODE -ne 0 -or $repoRootOutput.Count -eq 0) {
        throw 'Version increments must run from the shepherd-task source checkout, not an installed copy.'
    }

    $repoRoot = [IO.Path]::GetFullPath(
        [string]($repoRootOutput | Select-Object -First 1)
    ).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
    $expectedPluginRoot = [IO.Path]::GetFullPath(
        (Join-Path $repoRoot 'plugins\shepherd-task')
    ).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
    $actualPluginRoot = [IO.Path]::GetFullPath(
        $pluginRoot
    ).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
    if ($actualPluginRoot -cne $expectedPluginRoot) {
        throw "Version increments must run from '$expectedPluginRoot', not '$actualPluginRoot'."
    }

    & git -C $repoRoot ls-files --error-unmatch -- 'plugins/shepherd-task/plugin.json' *> $null
    if ($LASTEXITCODE -ne 0) {
        throw 'The source plugin manifest is not tracked by the current Git repository.'
    }

    $pluginManifest = Read-Json -Path $pluginManifestPath
    foreach ($skillReference in $pluginManifest.extensions.'com.github.awesome-copilot'.skills) {
        $skillPath = ([string]$skillReference).Substring(2).TrimEnd('/')
        $skillManifestPath = Join-Path $repoRoot "$skillPath\SKILL.md"
        if (-not (Test-Path -LiteralPath $skillManifestPath -PathType Leaf)) {
            throw "Declared shepherd-task source skill is missing: $skillManifestPath"
        }
        & git -C $repoRoot ls-files --error-unmatch -- "$skillPath/SKILL.md" *> $null
        if ($LASTEXITCODE -ne 0) {
            throw "Declared shepherd-task source skill is not tracked: $skillPath/SKILL.md"
        }
    }
}

function Get-SchemaVersion {
    param([Parameter(Mandatory)][object]$PluginManifest)

    $schema = [string]$PluginManifest.'$schema'
    $match = [regex]::Match(
        $schema,
        '^https://agent-plugins\.org/schemas/(?<version>[^/]+)/plugin\.schema\.json$'
    )
    if (-not $match.Success) {
        throw "plugin.json has an unsupported Agent Plugins schema URL: '$schema'."
    }
    $version = $match.Groups['version'].Value
    Assert-SemVer -Version $version -Label 'Agent Plugins schema version'
    return $version
}

function Show-VersionInformation {
    $pluginManifest = Read-Json -Path $pluginManifestPath
    $versionContract = Read-Json -Path $versionContractPath
    $pluginVersion = [string]$pluginManifest.version
    Assert-SemVer -Version $pluginVersion -Label 'Plugin version'
    $schemaVersion = Get-SchemaVersion -PluginManifest $pluginManifest

    if ([int]$versionContract.schemaVersion -ne 1 -or
        [int]$versionContract.stageOutcomeProtocolVersion -lt 1) {
        throw 'shepherd-task-version-contract.json is invalid.'
    }
    foreach ($property in $versionContract.artifactSchemaVersions.PSObject.Properties) {
        if ([int]$property.Value -lt 1) {
            throw "Artifact schema version '$($property.Name)' is invalid."
        }
    }

    Write-Output 'Shepherd-task version information'
    Write-Output "  Lineup version:                  $pluginVersion"
    Write-Output "  Agent Plugins schema version:    $schemaVersion"
    Write-Output "  Version contract schema version: $($versionContract.schemaVersion)"
    Write-Output "  Stage outcome protocol version:  $($versionContract.stageOutcomeProtocolVersion)"
    Write-Output '  Artifact schema versions:'
    foreach ($property in $versionContract.artifactSchemaVersions.PSObject.Properties) {
        Write-Output "    $($property.Name): $($property.Value)"
    }
}

function Update-LineupVersion {
    param([Parameter(Mandatory)][ValidateSet('Micro', 'Minor', 'Major')][string]$Segment)

    Assert-SourceCheckout
    $pluginManifest = Read-Json -Path $pluginManifestPath
    $current = [string]$pluginManifest.version
    Assert-SemVer -Version $current -Label 'Plugin version'
    $core = ($current -split '[-+]', 2)[0]
    $parts = @($core -split '\.' | ForEach-Object { [long]$_ })

    switch ($Segment) {
        'Micro' { $parts[2]++; break }
        'Minor' { $parts[1]++; $parts[2] = 0; break }
        'Major' { $parts[0]++; $parts[1] = 0; $parts[2] = 0; break }
    }
    $next = [string]::Join('.', $parts)
    $pluginManifest.version = $next
    Write-JsonAtomically -Path $pluginManifestPath -Value $pluginManifest
    Write-Output "Incremented shepherd-task lineup version: $current -> $next"
    Show-VersionInformation
}

function Update-SchemaVersion {
    param([Parameter(Mandatory)][string]$Version)

    Assert-SourceCheckout
    Assert-SemVer -Version $Version -Label 'Schema version'
    $pluginManifest = Read-Json -Path $pluginManifestPath
    $current = Get-SchemaVersion -PluginManifest $pluginManifest
    $pluginManifest.'$schema' = "https://agent-plugins.org/schemas/$Version/plugin.schema.json"
    Write-JsonAtomically -Path $pluginManifestPath -Value $pluginManifest

    if (Test-Path -LiteralPath $mcpManifestPath -PathType Leaf) {
        $mcpManifest = Read-Json -Path $mcpManifestPath
        $mcpManifest.'$schema' = "https://agent-plugins.org/schemas/$Version/mcp.schema.json"
        Write-JsonAtomically -Path $mcpManifestPath -Value $mcpManifest
    }

    Write-Output "Updated Agent Plugins schema version: $current -> $Version"
    Show-VersionInformation
}

switch ($PSCmdlet.ParameterSetName) {
    'Show' { Show-VersionInformation }
    'IncrementMicro' { Update-LineupVersion -Segment Micro }
    'IncrementMinor' { Update-LineupVersion -Segment Minor }
    'IncrementMajor' { Update-LineupVersion -Segment Major }
    'NewSchemaVersion' { Update-SchemaVersion -Version $NewSchemaVersion }
}
