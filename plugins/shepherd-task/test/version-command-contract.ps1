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

function Copy-InstalledVersionCommand {
    param([Parameter(Mandatory)][string]$Destination)

    New-Item -ItemType Directory -Path $Destination | Out-Null
    foreach ($file in @('plugin.json', 'shepherd-task-version-contract.json', 'version.ps1')) {
        Copy-Item -LiteralPath (Join-Path $pluginRoot $file) -Destination (Join-Path $Destination $file)
    }
}

function New-SourceCheckout {
    param([Parameter(Mandatory)][string]$Destination)

    $sourcePlugin = Join-Path $Destination 'plugins\shepherd-task'
    Copy-InstalledVersionCommand -Destination $sourcePlugin
    $plugin = Read-Plugin -Directory $sourcePlugin
    foreach ($skillReference in $plugin.extensions.'com.github.awesome-copilot'.skills) {
        $skillPath = ([string]$skillReference).Substring(2).TrimEnd('/')
        $skillDirectory = Join-Path $Destination $skillPath
        New-Item -ItemType Directory -Path $skillDirectory -Force | Out-Null
        $skillName = Split-Path -Leaf $skillPath
        [IO.File]::WriteAllText(
            (Join-Path $skillDirectory 'SKILL.md'),
            "---`nname: $skillName`ndescription: Contract fixture for $skillName.`n---`n",
            $utf8NoBom
        )
    }
    & git -C $Destination init --quiet
    if ($LASTEXITCODE -ne 0) { throw 'Could not initialize temporary source checkout.' }
    & git -C $Destination add plugins/shepherd-task/plugin.json skills
    if ($LASTEXITCODE -ne 0) { throw 'Could not track temporary shepherd-task sources.' }
    return $sourcePlugin
}

function Read-Plugin {
    param([Parameter(Mandatory)][string]$Directory)
    Get-Content -LiteralPath (Join-Path $Directory 'plugin.json') -Raw | ConvertFrom-Json
}

try {
    New-Item -ItemType Directory -Path $tempRoot | Out-Null

    $installed = Join-Path $tempRoot 'installed'
    Copy-InstalledVersionCommand -Destination $installed
    $output = @(& (Join-Path $installed 'version.ps1'))
    if (-not ($output -contains "  Lineup version:                  $currentVersion") -or
        -not ($output -contains "  Agent Plugins schema version:    $currentSchemaVersion")) {
        throw 'PowerShell version command did not print verbose current information.'
    }
    $installedBefore = [IO.File]::ReadAllText((Join-Path $installed 'plugin.json'))
    try {
        & (Join-Path $installed 'version.ps1') -IncrementMicro | Out-Null
        throw 'PowerShell version command mutated an installed copy.'
    }
    catch {
        if (-not $_.Exception.Message.Contains('must run from the shepherd-task source checkout')) {
            throw
        }
    }
    if ($installedBefore -cne [IO.File]::ReadAllText((Join-Path $installed 'plugin.json'))) {
        throw 'Rejected installed-copy mutation changed plugin.json.'
    }

    $micro = New-SourceCheckout -Destination (Join-Path $tempRoot 'micro')
    & (Join-Path $micro 'version.ps1') -IncrementMicro | Out-Null
    $currentCore = ($currentVersion -split '[-+]', 2)[0]
    $currentParts = @($currentCore -split '\.' | ForEach-Object { [long]$_ })
    $expectedMicro = "$($currentParts[0]).$($currentParts[1]).$($currentParts[2] + 1)"
    if ([string](Read-Plugin -Directory $micro).version -ne $expectedMicro) {
        throw 'PowerShell micro increment failed.'
    }

    $minor = New-SourceCheckout -Destination (Join-Path $tempRoot 'minor')
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

    $major = New-SourceCheckout -Destination (Join-Path $tempRoot 'major')
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

    $schema = New-SourceCheckout -Destination (Join-Path $tempRoot 'schema')
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
