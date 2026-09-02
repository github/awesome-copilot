<#
.SYNOPSIS
    Lists Copilot skills while decoding native output as UTF-8.
#>

[CmdletBinding()]
param(
    [string]$CopilotCli = 'copilot'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false

$previousConsoleOutputEncoding = [Console]::OutputEncoding
$previousOutputEncoding = $OutputEncoding
$utf8Encoding = [System.Text.UTF8Encoding]::new($false)
$output = @()
$exitCode = 1

try {
    [Console]::OutputEncoding = $utf8Encoding
    $OutputEncoding = $utf8Encoding
    $output = @(& $CopilotCli skill list 2>&1)
    $exitCode = $LASTEXITCODE
}
finally {
    $OutputEncoding = $previousOutputEncoding
    [Console]::OutputEncoding = $previousConsoleOutputEncoding
}

[pscustomobject]@{
    ExitCode = $exitCode
    Output = $output
}
