<#
.SYNOPSIS
  Install or update the local-coding plugin, then cap the on-device model's output tokens. One shot, and safe to re-run.

.DESCRIPTION
  1. Installs or updates the local-coding plugin in your Copilot home (%USERPROFILE%\.copilot, or COPILOT_HOME).
     By default it uses the awesome-copilot marketplace (github/awesome-copilot, included in Copilot CLI by default).
     It adds the marketplace if it is missing, refreshes its catalog, then installs the plugin or updates it. If that
     fails, or the marketplace has an older version than the local copy, it installs the local copy of the plugin
     folder instead: -PluginPath, or the installed plugin folder this script sits in. It removes the other copy
     (marketplace or direct) so the agents do not load twice.
  2. Checks that "copilot plugin list" shows the expected version, and enables the plugin if it is disabled.
  3. Runs Set-LocalOutputCap.ps1 from the installed plugin, which backs up providers.json and caps the CLI-managed
     MAI Code 1.1 Flash row at 8,192 output tokens. If providers.json has no such row, it says why and skips.
  4. Prints the next steps.

.PARAMETER Source
  Auto (default): marketplace, then the local folder if that fails. Marketplace: marketplace only.
  Local: the local folder only.

.PARAMETER PluginPath
  A local copy of the local-coding plugin folder (the one with plugin.json). Default: the plugin folder this script
  sits in (the script is at skills\on-device-delegate\scripts\ inside the plugin).

.PARAMETER Marketplace
  The marketplace repository. Default github/awesome-copilot (marketplace name awesome-copilot).

.PARAMETER ExpectedVersion
  The version "copilot plugin list" must show (or newer). Default: the version in the plugin.json next to this script,
  or in -PluginPath.

.PARAMETER CopilotHome
  The Copilot home to update. Default: COPILOT_HOME, else %USERPROFILE%\.copilot.

.PARAMETER CopilotExe
  The Copilot CLI to run. Default: copilot on PATH.

.PARAMETER MaxOutputTokens
  Passed to Set-LocalOutputCap.ps1. Default 8192.

.PARAMETER Model
  Passed to Set-LocalOutputCap.ps1: the provider-qualified model id. Default: the CLI-managed MAI Code 1.1 Flash id.

.PARAMETER Restore
  Only undo the output cap (Set-LocalOutputCap.ps1 -Restore); the plugin is left as it is.

.PARAMETER SkipCap
  Install or update the plugin only; leave providers.json alone.

.PARAMETER Help
  Show this help.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\local-coding\scripts\Update-LocalCodingPlugin.ps1 -WhatIf
  powershell -ExecutionPolicy Bypass -File .\local-coding\scripts\Update-LocalCodingPlugin.ps1
  powershell -ExecutionPolicy Bypass -File .\local-coding\scripts\Update-LocalCodingPlugin.ps1 -Source Local
  powershell -ExecutionPolicy Bypass -File .\local-coding\scripts\Update-LocalCodingPlugin.ps1 -Restore
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [ValidateSet('Auto', 'Marketplace', 'Local')][string]$Source = 'Auto',
    [string]$PluginPath = '',
    [string]$Marketplace = 'github/awesome-copilot',
    [string]$ExpectedVersion = '',
    [string]$CopilotHome = '',
    [string]$CopilotExe = 'copilot',
    [ValidateRange(1024, 262144)][int]$MaxOutputTokens = 8192,
    [string]$Model = 'winml-azureml-mai-code-1.1-flash-on-device/MAI-Code-1.1-Flash-On-Device',
    [switch]$Restore,
    [switch]$SkipCap,
    [switch]$Help
)
$ErrorActionPreference = 'Stop'
if ($Help) { Get-Help -Detailed $PSCommandPath; return }

$PluginName = 'local-coding'
$MarketplaceName = ($Marketplace -split '/')[-1]
$MarketplaceId = "$PluginName@$MarketplaceName"

function Write-Step([string]$Text) { Write-Host ''; Write-Host "== $Text" }
function Write-Note([string]$Text) { Write-Host "   $Text" }

function Read-PluginManifest([string]$Folder) {
    if (-not $Folder) { return $null }
    $manifest = Join-Path $Folder 'plugin.json'
    if (-not (Test-Path -LiteralPath $manifest)) { return $null }
    try { $json = [IO.File]::ReadAllText($manifest) | ConvertFrom-Json } catch { return $null }
    if ($json.name -ne $PluginName) { return $null }
    return $json
}

function Invoke-Copilot([string[]]$Arguments) {
    # Native stderr must not become a terminating error under Windows PowerShell 5.1.
    $saved = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $lines = & $script:CopilotPath @Arguments 2>&1 | ForEach-Object {
            if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.Exception.Message } else { "$_" }
        }
        $code = $LASTEXITCODE
    } finally { $ErrorActionPreference = $saved }
    return [pscustomobject]@{ Code = $code; Output = @($lines) }
}

function Get-InstalledCopies {
    $result = Invoke-Copilot @('plugin', 'list')
    $copies = @()
    foreach ($line in $result.Output) {
        if ($line -match "\s($([regex]::Escape($PluginName))(@[^\s(]+)?)\s+\(v([0-9][0-9A-Za-z.\-]*)\)(.*)$") {
            $copies += [pscustomobject]@{ Id = $Matches[1]; Version = $Matches[3]; Disabled = ($Matches[4] -match 'disabled') }
        }
    }
    return $copies
}

function Test-VersionAtLeast([string]$Have, [string]$Want) {
    if (-not $Want) { return $true }
    $h = $null; $w = $null
    if ([version]::TryParse(($Have -replace '-.*$', ''), [ref]$h) -and [version]::TryParse(($Want -replace '-.*$', ''), [ref]$w)) {
        return $h -ge $w
    }
    return $Have -eq $Want
}

# --- Resolve the Copilot home, the local plugin copy and the expected version ---
if (-not $CopilotHome) { $CopilotHome = if ($env:COPILOT_HOME) { $env:COPILOT_HOME } else { Join-Path $HOME '.copilot' } }
$CopilotHome = [IO.Path]::GetFullPath($CopilotHome)
# The script sits at <plugin>\skills\on-device-delegate\scripts\, so the plugin folder is three levels up.
$scriptPlugin = $PSScriptRoot
foreach ($n in 1..3) { $scriptPlugin = Split-Path -Parent $scriptPlugin; if (Read-PluginManifest $scriptPlugin) { break } }
if (-not $PluginPath -and (Read-PluginManifest $scriptPlugin)) { $PluginPath = $scriptPlugin }
if ($PluginPath) {
    $PluginPath = [IO.Path]::GetFullPath($PluginPath)
    if (-not (Read-PluginManifest $PluginPath)) { throw "-PluginPath $PluginPath is not a local-coding plugin folder (no plugin.json named $PluginName)." }
}
if (-not $ExpectedVersion) {
    $m = Read-PluginManifest $PluginPath
    if ($m) { $ExpectedVersion = [string]$m.version }
}
if ($Source -eq 'Local' -and -not $PluginPath) { throw '-Source Local needs -PluginPath (or run the copy of this script inside the plugin folder).' }

Write-Host "local-coding plugin setup"
Write-Note "Copilot home:      $CopilotHome"
Write-Note "Source:            $Source$(if ($PluginPath) { " (local copy: $PluginPath)" })"
Write-Note "Expected version:  $(if ($ExpectedVersion) { "$ExpectedVersion or newer" } else { 'any' })"
if ($WhatIfPreference) { Write-Note 'WhatIf: nothing is changed.' }

$savedHome = $env:COPILOT_HOME; $savedPrompt = $env:GIT_TERMINAL_PROMPT; $savedGcm = $env:GCM_INTERACTIVE
$env:COPILOT_HOME = $CopilotHome
# Fail fast instead of waiting on a credential prompt when the marketplace repository is not reachable.
$env:GIT_TERMINAL_PROMPT = '0'; $env:GCM_INTERACTIVE = 'never'
$installedOk = $false
try {
    # --- 1. Install or update the plugin ---
    $cmd = Get-Command $CopilotExe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    $script:CopilotPath = if ($cmd) { $cmd.Source } else { $null }

    if ($Restore) {
        Write-Step 'Plugin: left as it is (-Restore only undoes the output cap)'
    } elseif (-not $script:CopilotPath) {
        Write-Step 'Plugin: Copilot CLI not found'
        Write-Note "'$CopilotExe' is not on PATH. Install the CLI (winget install --id GitHub.Copilot) and run this again."
            } else {
        Write-Step "Plugin: install or update ($script:CopilotPath)"
        $before = @(Get-InstalledCopies)
        foreach ($c in $before) { Write-Note "Installed now: $($c.Id) v$($c.Version)$(if ($c.Disabled) { ' [disabled]' })" }
        if ($before.Count -eq 0) { Write-Note 'Installed now: none' }

        $installedFrom = $null
        if ($Source -ne 'Local') {
            if ($PSCmdlet.ShouldProcess($MarketplaceId, 'install or update from the marketplace')) {
                $mkts = Invoke-Copilot @('plugin', 'marketplace', 'list')
                $haveMkt = @($mkts.Output | Where-Object { $_ -match "\s$([regex]::Escape($MarketplaceName))\s" }).Count -gt 0
                $ok = $true
                if (-not $haveMkt) {
                    $r = Invoke-Copilot @('plugin', 'marketplace', 'add', $Marketplace)
                    $r.Output | Where-Object { $_ } | ForEach-Object { Write-Note $_ }
                    $ok = ($r.Code -eq 0)
                } else {
                    $r = Invoke-Copilot @('plugin', 'marketplace', 'update', $MarketplaceName)
                    $ok = ($r.Code -eq 0)
                    if (-not $ok) { $r.Output | Where-Object { $_ } | ForEach-Object { Write-Note $_ } }
                }
                if ($ok) {
                    $verb = if (@($before | Where-Object { $_.Id -eq $MarketplaceId }).Count) { 'update' } else { 'install' }
                    $r = Invoke-Copilot @('plugin', $verb, $MarketplaceId)
                    $r.Output | Where-Object { $_ } | ForEach-Object { Write-Note $_ }
                    $ok = ($r.Code -eq 0)
                }
                if (-not $ok) {
                    if ($Source -eq 'Auto' -and $PluginPath) { Write-Note 'The marketplace did not work; installing from the local copy instead.' }
                    elseif ($Source -eq 'Auto') { Write-Note 'The marketplace did not work and there is no local copy (-PluginPath).' }
                } elseif ($Source -eq 'Auto' -and $PluginPath) {
                    $mcopy = @(Get-InstalledCopies | Where-Object { $_.Id -eq $MarketplaceId })
                    if ($mcopy.Count -eq 1 -and -not (Test-VersionAtLeast $mcopy[0].Version $ExpectedVersion)) {
                        Write-Note "The marketplace has v$($mcopy[0].Version), older than the local copy ($ExpectedVersion); installing the local copy instead."
                        $ok = $false
                    }
                }
                if ($ok) { $installedFrom = 'Marketplace' }
            } else {
                $installedFrom = 'Marketplace'
            }
        }
        if (-not $installedFrom -and $Source -ne 'Marketplace' -and $PluginPath) {
            if ($PSCmdlet.ShouldProcess($PluginPath, "install $PluginName from the local folder")) {
                $r = Invoke-Copilot @('plugin', 'install', $PluginPath)
                $r.Output | Where-Object { $_ -and $_ -notmatch 'deprecated' } | ForEach-Object { Write-Note $_ }
                if ($r.Code -eq 0) { $installedFrom = 'Local' }
            } else {
                $installedFrom = 'Local'
            }
        }

        if (-not $installedFrom) {
            Write-Note 'Install or update FAILED; see the messages above.'
        } elseif (-not $WhatIfPreference) {
            # Keep one copy: a direct and a marketplace copy would both load their agents and skill.
            $other = if ($installedFrom -eq 'Marketplace') { $PluginName } else { $MarketplaceId }
            if (@(Get-InstalledCopies | Where-Object { $_.Id -eq $other }).Count) {
                $r = Invoke-Copilot @('plugin', 'uninstall', $other)
                Write-Note "Removed the other copy ($other): exit $($r.Code)"
            }
            # --- 2. Verify ---
            $after = @(Get-InstalledCopies | Where-Object { $_.Id -eq $(if ($installedFrom -eq 'Marketplace') { $MarketplaceId } else { $PluginName }) })
            if ($after.Count -eq 1) {
                $copy = $after[0]
                if ($copy.Disabled) {
                    $r = Invoke-Copilot @('plugin', 'enable', $copy.Id)
                    Write-Note "Enabled $($copy.Id): exit $($r.Code)"
                }
                if (Test-VersionAtLeast $copy.Version $ExpectedVersion) {
                    Write-Note "OK: copilot plugin list shows $($copy.Id) v$($copy.Version)."
                    $installedOk = $true
                } else {
                    Write-Note "WARNING: copilot plugin list shows $($copy.Id) v$($copy.Version); expected $ExpectedVersion or newer."
                    if ($installedFrom -eq 'Marketplace') { Write-Note 'The marketplace may not have the new version yet; try -Source Local with a fresh copy.' }
                }
            } else {
                Write-Note "WARNING: copilot plugin list does not show $PluginName after the install."
            }
        }
    }

    # --- 3. Output cap ---
    if ($SkipCap) {
        Write-Step 'Output cap: skipped (-SkipCap)'
    } else {
        Write-Step "Output cap: $(if ($Restore) { 'restore' } else { "$MaxOutputTokens tokens" })"
        $root = Join-Path $CopilotHome 'installed-plugins'
        $cap = $null
        if (Test-Path -LiteralPath $root) {
            $cap = Get-ChildItem -LiteralPath $root -Recurse -Filter 'Set-LocalOutputCap.ps1' -ErrorAction SilentlyContinue |
                Where-Object { $_.FullName -match "[\\/]$([regex]::Escape($PluginName))[\\/]skills[\\/]" } |
                Sort-Object LastWriteTime -Descending | Select-Object -First 1
        }
        $capPath = if ($cap) { $cap.FullName } elseif (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'Set-LocalOutputCap.ps1')) { Join-Path $PSScriptRoot 'Set-LocalOutputCap.ps1' } else { $null }
        $providers = if ($env:COPILOT_PROVIDERS_CONFIG) { $env:COPILOT_PROVIDERS_CONFIG } else { Join-Path $CopilotHome 'providers.json' }
        $slash = $Model.IndexOf('/')
        $rowCount = 0
        if ((Test-Path -LiteralPath $providers) -and $slash -gt 0) {
            $doc = [IO.File]::ReadAllText($providers) | ConvertFrom-Json
            $p = $Model.Substring(0, $slash); $i = $Model.Substring($slash + 1)
            $rowCount = @($doc.models | Where-Object { $_.provider -eq $p -and $_.id -eq $i }).Count
        }
        if (-not $capPath) {
            Write-Note 'Set-LocalOutputCap.ps1 not found in installed-plugins or next to this script; skipped.'
        } elseif (-not (Test-Path -LiteralPath $providers)) {
            Write-Note "No providers.json at $providers; skipped."
            Write-Note 'The CLI writes it when you choose "Download and set up" for MAI Code 1.1 Flash in /model.'
        } elseif ($rowCount -ne 1) {
            Write-Note "providers.json has $rowCount rows for $Model; skipped."
            Write-Note 'Set up MAI Code 1.1 Flash through the CLI /model first, or pass -Model with the id /model shows.'
        } else {
            Write-Note "Using $capPath"
            $capArgs = @{ ProvidersJson = $providers; Model = $Model; MaxOutputTokens = $MaxOutputTokens }
            if ($Restore) { $capArgs.Restore = $true }
            try { & $capPath @capArgs -WhatIf:$WhatIfPreference } catch { Write-Note "Set-LocalOutputCap.ps1: $($_.Exception.Message)" }
        }
    }
} finally {
    $env:COPILOT_HOME = $savedHome; $env:GIT_TERMINAL_PROMPT = $savedPrompt; $env:GCM_INTERACTIVE = $savedGcm
}

# --- 4. Next steps ---
Write-Step 'Next steps'
Write-Note '1. Restart open Copilot CLI sessions so they load the plugin.'
Write-Note '2. Run copilot --experimental, keep a cloud main model, and type your task. Start the prompt with the routing'
Write-Note '   line from the plugin README, and the main session sends big, mechanical sub-tasks to the'
Write-Note '   local-coding:on-device-offload agent.'
Write-Note 'Check: copilot plugin list, and in a session /agent lists local-coding:on-device-offload. Undo the cap: -Restore.'
if (-not $Restore -and -not $WhatIfPreference -and $script:CopilotPath -and -not $installedOk) { exit 1 }
