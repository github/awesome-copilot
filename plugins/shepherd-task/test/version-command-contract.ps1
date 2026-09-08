Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$pluginRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) "shepherd-version-command-$([guid]::NewGuid().ToString('N'))"
$utf8NoBom = [Text.UTF8Encoding]::new($false)
$sourcePlugin = Get-Content -LiteralPath (Join-Path $pluginRoot 'plugin.json') -Raw | ConvertFrom-Json
$currentVersion = [string]$sourcePlugin.version
$currentSchemaVersion = [regex]::Match(
    [string]$sourcePlugin.'$schema',
    '/schemas/([^/]+)/plugin\.schema\.json$'
).Groups[1].Value

function Copy-VersionCommand {
    param([Parameter(Mandatory)][string]$Destination)

    New-Item -ItemType Directory -Path $Destination | Out-Null
    foreach ($file in @('plugin.json', 'shepherd-task-version-contract.json', 'version.ps1')) {
        Copy-Item -LiteralPath (Join-Path $pluginRoot $file) -Destination (Join-Path $Destination $file)
    }
}

function Read-Plugin {
    param([Parameter(Mandatory)][string]$Directory)
    Get-Content -LiteralPath (Join-Path $Directory 'plugin.json') -Raw | ConvertFrom-Json
}

try {
    New-Item -ItemType Directory -Path $tempRoot | Out-Null

    $micro = Join-Path $tempRoot 'micro'
    Copy-VersionCommand -Destination $micro
    $output = @(& (Join-Path $micro 'version.ps1'))
    if (-not ($output -contains "  Lineup version:                  $currentVersion") -or
        -not ($output -contains "  Agent Plugins schema version:    $currentSchemaVersion")) {
        throw 'PowerShell version command did not print verbose current information.'
    }
    & (Join-Path $micro 'version.ps1') -IncrementMicro | Out-Null
    $currentCore = ($currentVersion -split '[-+]', 2)[0]
    $currentParts = @($currentCore -split '\.' | ForEach-Object { [long]$_ })
    $expectedMicro = "$($currentParts[0]).$($currentParts[1]).$($currentParts[2] + 1)"
    if ([string](Read-Plugin -Directory $micro).version -ne $expectedMicro) {
        throw 'PowerShell micro increment failed.'
    }

    $minor = Join-Path $tempRoot 'minor'
    Copy-VersionCommand -Destination $minor
    $minorPlugin = Read-Plugin -Directory $minor
    $minorPlugin.version = '2.7.9-beta.2+build.5'
    [IO.File]::WriteAllText(
        (Join-Path $minor 'plugin.json'),
        ($minorPlugin | ConvertTo-Json -Depth 20) + [Environment]::NewLine,
        $utf8NoBom
    )
    & (Join-Path $minor 'version.ps1') -IncrementMinor | Out-Null
    if ([string](Read-Plugin -Directory $minor).version -ne '2.8.0') {
        throw 'PowerShell minor increment failed.'
    }

    $major = Join-Path $tempRoot 'major'
    Copy-VersionCommand -Destination $major
    $majorPlugin = Read-Plugin -Directory $major
    $majorPlugin.version = '2.7.9'
    [IO.File]::WriteAllText(
        (Join-Path $major 'plugin.json'),
        ($majorPlugin | ConvertTo-Json -Depth 20) + [Environment]::NewLine,
        $utf8NoBom
    )
    & (Join-Path $major 'version.ps1') -IncrementMajor | Out-Null
    if ([string](Read-Plugin -Directory $major).version -ne '3.0.0') {
        throw 'PowerShell major increment failed.'
    }

    $schema = Join-Path $tempRoot 'schema'
    Copy-VersionCommand -Destination $schema
    [IO.File]::WriteAllText(
        (Join-Path $schema 'mcp.json'),
        @'
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
  "mcpServers": {}
}
'@ + [Environment]::NewLine,
        $utf8NoBom
    )
    & (Join-Path $schema 'version.ps1') -NewSchemaVersion 2.1.0 | Out-Null
    $schemaPlugin = Read-Plugin -Directory $schema
    $schemaMcp = Get-Content -LiteralPath (Join-Path $schema 'mcp.json') -Raw | ConvertFrom-Json
    if ([string]$schemaPlugin.'$schema' -ne 'https://agent-plugins.org/schemas/2.1.0/plugin.schema.json' -or
        [string]$schemaMcp.'$schema' -ne 'https://agent-plugins.org/schemas/2.1.0/mcp.schema.json') {
        throw 'PowerShell schema-version update failed.'
    }

    $before = [IO.File]::ReadAllText((Join-Path $schema 'plugin.json'))
    try {
        & (Join-Path $schema 'version.ps1') -NewSchemaVersion 01.0.0 | Out-Null
        throw 'PowerShell version command accepted invalid Semantic Versioning.'
    }
    catch {
        if ($_.Exception.Message -eq 'PowerShell version command accepted invalid Semantic Versioning.') {
            throw
        }
    }
    $after = [IO.File]::ReadAllText((Join-Path $schema 'plugin.json'))
    if ($before -cne $after) {
        throw 'Invalid schema version modified plugin.json.'
    }
}
finally {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host 'PowerShell shepherd-task version command contract tests passed.' -ForegroundColor Green
