<#
.SYNOPSIS
  Cap the on-device model's output tokens in your Copilot CLI providers.json (opt-in and reversible).

.DESCRIPTION
  Copilot CLI 1.0.105 sends max_tokens equal to the model row's maxOutputTokens on every request to an on-device
  model. "Download and set up" writes 128000 for MAI Code 1.1 Flash, so a looping generation can run for 25-50
  minutes. With a lower cap the server stops the generation at the cap; the CLI then asks the model to continue
  at most twice and hands the result back, so the offload agent reports a non-DONE reply and the main session does
  the task itself after a few minutes instead of waiting for the loop.

  The script changes only the one model row you name (maxOutputTokens and capabilities.limits.max_output_tokens),
  writes a backup next to the file first, and leaves every other row and key alone. The CLI reads providers.json
  when a session starts, so restart open sessions. Running "Download and set up" for the model again rewrites the
  row with the default. Run this script again afterwards.

.PARAMETER MaxOutputTokens
  The cap. Default 8192: our measured runs of MAI Code 1.1 Flash never produced a useful reply longer than about
  3,300 tokens, and an 8,192 cap had no runaway timeouts.

.PARAMETER Model
  The provider-qualified model id, as /model shows it. Default: the CLI-managed MAI Code 1.1 Flash id.

.PARAMETER ProvidersJson
  The providers.json to change. Default: providers.json in COPILOT_HOME, else in %USERPROFILE%\.copilot.

.PARAMETER Restore
  Put back the value saved by the last run of this script (from the backup file).

.EXAMPLE
  pwsh -File Set-LocalOutputCap.ps1 -WhatIf
  pwsh -File Set-LocalOutputCap.ps1
  pwsh -File Set-LocalOutputCap.ps1 -Restore
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [ValidateRange(1024, 262144)][int]$MaxOutputTokens = 8192,
    [string]$Model = 'winml-azureml-mai-code-1.1-flash-on-device/MAI-Code-1.1-Flash-On-Device',
    [string]$ProvidersJson = '',
    [switch]$Restore
)
$ErrorActionPreference = 'Stop'
if (-not $ProvidersJson) {
    $homeDir = if ($env:COPILOT_HOME) { $env:COPILOT_HOME } else { Join-Path $HOME '.copilot' }
    $ProvidersJson = Join-Path $homeDir 'providers.json'
}
if (-not (Test-Path -LiteralPath $ProvidersJson)) { throw "No providers.json at $ProvidersJson. Install the model from /model first." }
$slash = $Model.IndexOf('/')
if ($slash -lt 1) { throw "-Model must be provider/id, for example $Model" }
$provider = $Model.Substring(0, $slash); $id = $Model.Substring($slash + 1)
$backup = "$ProvidersJson.local-coding.bak"

$doc = [IO.File]::ReadAllText($ProvidersJson) | ConvertFrom-Json
$rows = @($doc.models | Where-Object { $_.provider -eq $provider -and $_.id -eq $id })
if ($rows.Count -ne 1) { throw "Expected one model row for $Model in $ProvidersJson; found $($rows.Count)." }
$row = $rows[0]
$old = $row.maxOutputTokens

if ($Restore) {
    if (-not (Test-Path -LiteralPath $backup)) { throw "No backup at $backup." }
    $bdoc = [IO.File]::ReadAllText($backup) | ConvertFrom-Json
    $brow = @($bdoc.models | Where-Object { $_.provider -eq $provider -and $_.id -eq $id })
    if ($brow.Count -ne 1) { throw "The backup has no single row for $Model." }
    $MaxOutputTokens = [int]$brow[0].maxOutputTokens
}

if ($old -eq $MaxOutputTokens -and $row.capabilities.limits.max_output_tokens -eq $MaxOutputTokens) {
    Write-Host "$Model already has maxOutputTokens $MaxOutputTokens in $ProvidersJson; nothing to do."
    return
}
if ($PSCmdlet.ShouldProcess($ProvidersJson, "set $Model maxOutputTokens $old -> $MaxOutputTokens")) {
    if (-not $Restore) { Copy-Item -LiteralPath $ProvidersJson -Destination $backup -Force }
    $row | Add-Member -Force -NotePropertyName maxOutputTokens -NotePropertyValue $MaxOutputTokens
    if ($row.capabilities -and $row.capabilities.limits) {
        $row.capabilities.limits | Add-Member -Force -NotePropertyName max_output_tokens -NotePropertyValue $MaxOutputTokens
    }
    $tmp = "$ProvidersJson.tmp"
    [IO.File]::WriteAllText($tmp, ($doc | ConvertTo-Json -Depth 32), (New-Object System.Text.UTF8Encoding($false)))
    $null = [IO.File]::ReadAllText($tmp) | ConvertFrom-Json
    Move-Item -LiteralPath $tmp -Destination $ProvidersJson -Force
    Write-Host "$Model maxOutputTokens $old -> $MaxOutputTokens in $ProvidersJson$(if (-not $Restore) { " (backup: $backup)" }). Restart open Copilot CLI sessions."
}
