# shepherd-task-version: 1.0.4

$ErrorActionPreference = 'Stop'

$pluginRoot = Split-Path -Parent $PSScriptRoot
$script:scriptDir = Join-Path $pluginRoot 'scripts'
$orchestratorPath = Join-Path $script:scriptDir 'shepherd-task.ps1'
$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile(
    $orchestratorPath,
    [ref]$tokens,
    [ref]$parseErrors
)
if ($parseErrors.Count -ne 0) {
    throw "Unable to parse $orchestratorPath."
}
foreach ($functionName in @(
    'Invoke-CopilotRedacted',
    'Invoke-CopilotPhaseRedacted'
)) {
    $functionAst = $ast.Find({
        param($node)
        $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and
            $node.Name -eq $functionName
    }, $true)
    if (-not $functionAst) {
        throw "$functionName was not found."
    }
    Invoke-Expression $functionAst.Extent.Text
}

$tempDirectory = Join-Path (
    [System.IO.Path]::GetTempPath()
) "shepherd-session-artifact-contract-$([guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $tempDirectory | Out-Null
$script:LogDir = $tempDirectory
$jsonlPath = Join-Path $tempDirectory 'failed-session.jsonl'
$sharePath = Join-Path $tempDirectory 'failed-session.md'
$otelPath = Join-Path $tempDirectory 'phase-otel.jsonl'

function global:copilot {
    $shareIndex = [Array]::IndexOf($args, '--share')
    if ($shareIndex -lt 0) {
        throw 'Mock copilot did not receive --share.'
    }
    [System.IO.File]::WriteAllText(
        [string]$args[$shareIndex + 1],
        "partial failure share`n"
    )
    '{"token":"ghp_abcdefghijklmnopqrstuvwxyz1234567890"}'
    $global:LASTEXITCODE = 23
}

try {
    $failure = $null
    try {
        Invoke-CopilotRedacted `
            -Prompt 'contract prompt' `
            -JsonlPath $jsonlPath `
            -SharePath $sharePath
    }
    catch {
        $failure = $_
    }

    if (-not $failure -or
        $failure.Exception.Message -ne 'copilot exited with code 23') {
        throw 'The failed Copilot exit was not propagated.'
    }
    if (-not (Test-Path -LiteralPath $jsonlPath -PathType Leaf) -or
        -not (Test-Path -LiteralPath $sharePath -PathType Leaf)) {
        throw 'Failed-session artifacts were not persisted.'
    }
    if ((Get-Content -LiteralPath $jsonlPath -Raw).Contains(
        'ghp_abcdefghijklmnopqrstuvwxyz1234567890'
    )) {
        throw 'Failed-session JSONL was not redacted before persistence.'
    }

    function Invoke-CopilotRedacted {
        if ($env:COPILOT_OTEL_FILE_EXPORTER_PATH -ne $otelPath) {
            throw 'Phase OTel path was not applied.'
        }
        [IO.File]::WriteAllText(
            $otelPath,
            '{"token":"ghp_failed_phase_secret"}' + [Environment]::NewLine,
            [Text.UTF8Encoding]::new($false)
        )
        throw 'mock phase failure'
    }

    $env:COPILOT_OTEL_FILE_EXPORTER_PATH = 'caller-otel.jsonl'
    try {
        Invoke-CopilotPhaseRedacted `
            -Prompt 'contract prompt' `
            -JsonlPath $jsonlPath `
            -SharePath $sharePath `
            -OtelPath $otelPath
    }
    catch {
        if ($_.Exception.Message -ne 'mock phase failure') {
            throw
        }
    }
    if ($env:COPILOT_OTEL_FILE_EXPORTER_PATH -ne 'caller-otel.jsonl') {
        throw 'The caller OTel path was not restored after failure.'
    }
    if ((Get-Content -LiteralPath $otelPath -Raw).Contains(
        'ghp_failed_phase_secret'
    )) {
        throw 'Failed-phase OTel was not redacted before rethrow.'
    }

    Remove-Item Env:\COPILOT_OTEL_FILE_EXPORTER_PATH
    try {
        Invoke-CopilotPhaseRedacted `
            -Prompt 'contract prompt' `
            -JsonlPath $jsonlPath `
            -SharePath $sharePath `
            -OtelPath $otelPath
    }
    catch {
        if ($_.Exception.Message -ne 'mock phase failure') {
            throw
        }
    }
    if (Test-Path Env:\COPILOT_OTEL_FILE_EXPORTER_PATH) {
        throw 'The phase OTel path leaked into the caller environment.'
    }

    Write-Host 'PowerShell session artifact contract tests passed.'
}
finally {
    Remove-Item Function:\global:copilot -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $tempDirectory -Recurse -Force -ErrorAction SilentlyContinue
}
