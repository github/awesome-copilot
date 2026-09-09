# shepherd-task-version: 1.0.1
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
    Copy-Item -LiteralPath (Join-Path $pluginRoot 'plugin.json') -Destination (Join-Path $Destination 'plugin.json')
    foreach ($pluginReference in $sourcePlugin.extensions.'com.github.awesome-copilot'.pluginFiles) {
        $relativePath = ([string]$pluginReference).Substring(2).TrimEnd('/')
        $sourcePath = Join-Path $pluginRoot $relativePath
        $destinationPath = Join-Path $Destination $relativePath
        New-Item -ItemType Directory -Path (Split-Path -Parent $destinationPath) -Force | Out-Null
        Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -Recurse
    }
}

function New-SourceCheckout {
    param(
        [Parameter(Mandatory)][string]$Destination,
        [string]$Version = $currentVersion
    )

    $sourcePlugin = Join-Path $Destination 'plugins\shepherd-task'
    Copy-InstalledVersionCommand -Destination $sourcePlugin
    $plugin = Read-Plugin -Directory $sourcePlugin
    $plugin.version = $Version
    [IO.File]::WriteAllText(
        (Join-Path $sourcePlugin 'plugin.json'),
        ($plugin | ConvertTo-Json -Depth 20) + [Environment]::NewLine,
        $utf8NoBom
    )
    Get-ChildItem -LiteralPath $sourcePlugin -Recurse -File |
        Where-Object { $_.Extension -in @('.sh', '.ps1') } |
        ForEach-Object {
            $content = [IO.File]::ReadAllText($_.FullName)
            [IO.File]::WriteAllText(
                $_.FullName,
                $content.Replace(
                    "# shepherd-task-version: $currentVersion",
                    "# shepherd-task-version: $Version"
                ),
                $utf8NoBom
            )
        }
    foreach ($skillReference in $plugin.extensions.'com.github.awesome-copilot'.skills) {
        $skillPath = ([string]$skillReference).Substring(2).TrimEnd('/')
        $skillDirectory = Join-Path $Destination $skillPath
        New-Item -ItemType Directory -Path $skillDirectory -Force | Out-Null
        $skillName = Split-Path -Leaf $skillPath
        [IO.File]::WriteAllText(
            (Join-Path $skillDirectory 'SKILL.md'),
            "---`n# shepherd-task-version: $Version`nname: $skillName`ndescription: Contract fixture for $skillName.`n---`n",
            $utf8NoBom
        )
    }
    & git -C $Destination init --quiet
    if ($LASTEXITCODE -ne 0) { throw 'Could not initialize temporary source checkout.' }
    & git -C $Destination add plugins/shepherd-task skills
    if ($LASTEXITCODE -ne 0) { throw 'Could not track temporary shepherd-task sources.' }
    return $sourcePlugin
}

function Assert-FixtureVersionStamps {
    param(
        [Parameter(Mandatory)][string]$Destination,
        [Parameter(Mandatory)][string]$ExpectedVersion
    )

    $marker = "# shepherd-task-version: $ExpectedVersion"
    $pluginDirectory = Join-Path $Destination 'plugins\shepherd-task'
    $plugin = Read-Plugin -Directory $pluginDirectory
    $files = [Collections.Generic.List[IO.FileInfo]]::new()
    foreach ($pluginReference in $plugin.extensions.'com.github.awesome-copilot'.pluginFiles) {
        $relativePath = ([string]$pluginReference).Substring(2).TrimEnd('/')
        $pluginPath = Join-Path $pluginDirectory $relativePath
        if (Test-Path -LiteralPath $pluginPath -PathType Container) {
            Get-ChildItem -LiteralPath $pluginPath -Recurse -File |
                Where-Object { $_.Extension -in @('.sh', '.ps1') } |
                ForEach-Object { $files.Add($_) }
        }
        elseif ([IO.Path]::GetExtension($pluginPath) -in @('.sh', '.ps1')) {
            $files.Add((Get-Item -LiteralPath $pluginPath))
        }
    }
    foreach ($skillReference in $plugin.extensions.'com.github.awesome-copilot'.skills) {
        $skillPath = ([string]$skillReference).Substring(2).TrimEnd('/')
        $files.Add((Get-Item -LiteralPath (Join-Path $Destination "$skillPath\SKILL.md")))
    }
    foreach ($file in $files) {
        $matches = @([IO.File]::ReadAllLines($file.FullName) | Where-Object { $_ -ceq $marker })
        if ($matches.Count -ne 1) {
            throw "Expected exactly one '$marker' marker in $($file.FullName)."
        }
    }
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
    Assert-FixtureVersionStamps -Destination (Join-Path $tempRoot 'micro') -ExpectedVersion $expectedMicro

    $untracked = New-SourceCheckout -Destination (Join-Path $tempRoot 'untracked')
    $untrackedScript = Join-Path $untracked 'test\untracked-version-fixture.ps1'
    [IO.File]::WriteAllText(
        $untrackedScript,
        "# shepherd-task-version: $currentVersion`n",
        $utf8NoBom
    )
    & git -C (Join-Path $tempRoot 'untracked') ls-files --error-unmatch -- `
        'plugins/shepherd-task/test/untracked-version-fixture.ps1' *> $null
    if ($LASTEXITCODE -eq 0) {
        throw 'Untracked version fixture was unexpectedly tracked.'
    }
    & (Join-Path $untracked 'version.ps1') -IncrementMicro | Out-Null
    $untrackedMarkers = @(
        [IO.File]::ReadAllLines($untrackedScript) |
            Where-Object { $_ -ceq "# shepherd-task-version: $expectedMicro" }
    )
    if ($untrackedMarkers.Count -ne 1) {
        throw 'PowerShell version command did not update an untracked estate script.'
    }

    $minor = New-SourceCheckout -Destination (Join-Path $tempRoot 'minor') -Version '2.7.9-beta.2+build.5'
    & (Join-Path $minor 'version.ps1') -IncrementMinor | Out-Null
    if ([string](Read-Plugin -Directory $minor).version -ne '2.8.0') {
        throw 'PowerShell minor increment failed.'
    }
    Assert-FixtureVersionStamps -Destination (Join-Path $tempRoot 'minor') -ExpectedVersion '2.8.0'

    $major = New-SourceCheckout -Destination (Join-Path $tempRoot 'major') -Version '2.7.9'
    & (Join-Path $major 'version.ps1') -IncrementMajor | Out-Null
    if ([string](Read-Plugin -Directory $major).version -ne '3.0.0') {
        throw 'PowerShell major increment failed.'
    }
    Assert-FixtureVersionStamps -Destination (Join-Path $tempRoot 'major') -ExpectedVersion '3.0.0'

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
    Assert-FixtureVersionStamps -Destination (Join-Path $tempRoot 'schema') -ExpectedVersion $currentVersion

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
