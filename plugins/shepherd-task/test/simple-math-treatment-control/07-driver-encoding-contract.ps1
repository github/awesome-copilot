<#
.SYNOPSIS
    Regression coverage for UTF-8 Copilot skill-list output in the driver.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$skillListHelper = Join-Path $PSScriptRoot 'get-copilot-skill-list.ps1'
$tempDirectory = Join-Path ([System.IO.Path]::GetTempPath()) "shepherd-driver-encoding-$([guid]::NewGuid().ToString('N'))"

try {
    New-Item -ItemType Directory -Path $tempDirectory | Out-Null
    $mockScriptPath = Join-Path $tempDirectory 'mock-copilot.mjs'
    $mockCommandPath = Join-Path $tempDirectory 'mock-copilot.cmd'
    $mockScript = @'
process.stdout.write(
    'Personal skills:\n' +
    '  shepherd-task-20-create-issues-from-plan - Stage 20 — create ordered issues.\n'
);
'@
    [System.IO.File]::WriteAllText(
        $mockScriptPath,
        $mockScript,
        [System.Text.UTF8Encoding]::new($false)
    )
    $mockCommand = @"
@echo off
node "$mockScriptPath" %*
exit /b %ERRORLEVEL%
"@
    [System.IO.File]::WriteAllText(
        $mockCommandPath,
        $mockCommand,
        [System.Text.ASCIIEncoding]::new()
    )

    $originalConsoleOutputEncoding = [Console]::OutputEncoding
    $originalOutputEncoding = $OutputEncoding
    try {
        $oemEncoding = [System.Text.Encoding]::GetEncoding(437)
        [Console]::OutputEncoding = $oemEncoding
        $OutputEncoding = $oemEncoding

        $result = & $skillListHelper -CopilotCli $mockCommandPath
        $skillList = @($result.Output)
        $joinedOutput = $skillList -join "`n"
        if ($result.ExitCode -ne 0) {
            throw "Mocked Copilot skill list exited with code $($result.ExitCode)."
        }
        if (-not $joinedOutput.Contains('Stage 20 — create ordered issues.')) {
            throw "Copilot skill-list output was not decoded as UTF-8: $joinedOutput"
        }
        if (-not $joinedOutput.Contains('shepherd-task-20-create-issues-from-plan')) {
            throw 'Required ASCII skill name was not preserved.'
        }
        if ([Console]::OutputEncoding.CodePage -ne $oemEncoding.CodePage -or
            $OutputEncoding.CodePage -ne $oemEncoding.CodePage) {
            throw 'Skill-list helper did not restore the caller encoding.'
        }
    }
    finally {
        $OutputEncoding = $originalOutputEncoding
        [Console]::OutputEncoding = $originalConsoleOutputEncoding
    }
}
finally {
    Remove-Item -LiteralPath $tempDirectory -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host 'Driver UTF-8 encoding contract tests passed.' -ForegroundColor Green
