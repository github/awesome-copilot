# shepherd-task-version: 1.0.2
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

function Get-EstateVersionFiles {
    param([Parameter(Mandatory)][string]$RepoRoot)

    $pluginManifest = Read-Json -Path $pluginManifestPath
    $files = [Collections.Generic.List[string]]::new()
    foreach ($skillReference in $pluginManifest.extensions.'com.github.awesome-copilot'.skills) {
        $skillPath = ([string]$skillReference).Substring(2).TrimEnd('/')
        $files.Add((Join-Path $RepoRoot "$skillPath\SKILL.md"))
    }
    foreach ($pluginReference in $pluginManifest.extensions.'com.github.awesome-copilot'.pluginFiles) {
        $reference = [string]$pluginReference
        if (-not $reference.StartsWith('./') -or
            $reference.Contains('\') -or
            @($reference.Substring(2).TrimEnd('/').Split('/') | Where-Object {
                $_ -eq '' -or $_ -eq '.' -or $_ -eq '..'
            }).Count -ne 0) {
            throw "Invalid shepherd-task pluginFiles reference: $reference"
        }
        $relativePath = $reference.Substring(2).TrimEnd('/')
        $pluginPath = Join-Path $pluginRoot $relativePath
        if (Test-Path -LiteralPath $pluginPath -PathType Container) {
            Get-ChildItem -LiteralPath $pluginPath -Recurse -File |
                Where-Object { $_.Extension -in @('.sh', '.ps1') } |
                ForEach-Object { $files.Add($_.FullName) }
        }
        elseif ([IO.Path]::GetExtension($pluginPath) -in @('.sh', '.ps1')) {
            $files.Add($pluginPath)
        }
    }
    return @($files | Sort-Object -Unique)
}

function Assert-EstateVersionStamps {
    param(
        [Parameter(Mandatory)][string]$RepoRoot,
        [Parameter(Mandatory)][string]$ExpectedVersion
    )

    $files = @(Get-EstateVersionFiles -RepoRoot $RepoRoot)
    if ($files.Count -eq 0) {
        throw 'The shepherd-task estate contains no versioned scripts or skills.'
    }
    $expectedMarker = "# shepherd-task-version: $ExpectedVersion"
    foreach ($file in $files) {
        if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
            throw "Declared shepherd-task estate file is missing: $file"
        }
        $matches = @(
            [IO.File]::ReadAllLines($file) |
                Where-Object { $_ -ceq $expectedMarker }
        )
        if ($matches.Count -ne 1) {
            throw "Expected exactly one '$expectedMarker' marker in $file."
        }
    }
}

function Update-EstateVersionStamps {
    param(
        [Parameter(Mandatory)][string]$RepoRoot,
        [Parameter(Mandatory)][string]$CurrentVersion,
        [Parameter(Mandatory)][string]$NextVersion
    )

    Assert-EstateVersionStamps -RepoRoot $RepoRoot -ExpectedVersion $CurrentVersion
    $currentMarker = "# shepherd-task-version: $CurrentVersion"
    $nextMarker = "# shepherd-task-version: $NextVersion"
    foreach ($file in @(Get-EstateVersionFiles -RepoRoot $RepoRoot)) {
        $content = [IO.File]::ReadAllText($file)
        [IO.File]::WriteAllText(
            $file,
            $content.Replace($currentMarker, $nextMarker),
            $utf8NoBom
        )
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
    }

    foreach ($pluginReference in $pluginManifest.extensions.'com.github.awesome-copilot'.pluginFiles) {
        $reference = [string]$pluginReference
        if (-not $reference.StartsWith('./') -or
            $reference.Contains('\') -or
            @($reference.Substring(2).TrimEnd('/').Split('/') | Where-Object {
                $_ -eq '' -or $_ -eq '.' -or $_ -eq '..'
            }).Count -ne 0) {
            throw "Invalid shepherd-task pluginFiles reference: $reference"
        }
        $relativePath = $reference.Substring(2).TrimEnd('/')
        $pluginPath = Join-Path $pluginRoot $relativePath
        if (-not (Test-Path -LiteralPath $pluginPath)) {
            throw "Declared shepherd-task plugin file is missing: $pluginPath"
        }
    }

    return $repoRoot
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

    $repoRoot = Assert-SourceCheckout
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
    Update-EstateVersionStamps -RepoRoot $repoRoot -CurrentVersion $current -NextVersion $next
    $pluginManifest.version = $next
    Write-JsonAtomically -Path $pluginManifestPath -Value $pluginManifest
    Write-Output "Incremented shepherd-task lineup version: $current -> $next"
    Show-VersionInformation
}

function Update-SchemaVersion {
    param([Parameter(Mandatory)][string]$Version)

    $null = Assert-SourceCheckout
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
