# shepherd-task-version: 1.0.5

$ErrorActionPreference = 'Stop'

$pluginRoot = Split-Path -Parent $PSScriptRoot
$monitorPath = Join-Path $pluginRoot 'scripts/shepherd-task-monitor.ps1'
$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile(
    $monitorPath,
    [ref]$tokens,
    [ref]$parseErrors
)
if ($parseErrors.Count -ne 0) {
    throw "Unable to parse $monitorPath."
}
$functionAst = $ast.Find({
    param($node)
    $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and
        $node.Name -eq 'Find-PR'
}, $true)
if (-not $functionAst) {
    throw 'Find-PR was not found.'
}
Invoke-Expression $functionAst.Extent.Text

$script:Repo = 'owner/repository'
$script:bodyQuery = $null
function Write-Alert {
    param([string]$Message)
    throw "Unexpected monitor alert: $Message"
}
function global:gh {
    $arguments = @($args | ForEach-Object { [string]$_ })
    $command = $arguments -join ' '
    $global:LASTEXITCODE = 0
    if ($command -like 'api */issues/14/timeline*') {
        'https://api.github.com/repos/owner/repository/pulls/240'
        return
    }
    if ($command -like 'pr list *') {
        $queryIndex = [Array]::IndexOf($arguments, '--jq')
        $script:bodyQuery = $arguments[$queryIndex + 1]
        '240'
        '14'
        return
    }
    if ($command -like 'pr view 240 *') {
        '{"state":"OPEN","closingIssuesReferences":[{"number":140}]}'
        return
    }
    if ($command -like 'pr view 14 *') {
        '{"state":"OPEN","closingIssuesReferences":[{"number":14}]}'
        return
    }
    throw "Unexpected gh invocation: $command"
}

try {
    $result = Find-PR -Issue '14'
    if ($result -ne '14') {
        throw "Expected authoritative PR 14; found '$result'."
    }
    if (-not $script:bodyQuery.Contains(
        '(^|[^0-9])#14([^0-9]|$)'
    )) {
        throw 'The monitor body fallback does not use exact numeric boundaries.'
    }

    Write-Host 'PowerShell monitor linked-PR contract tests passed.'
}
finally {
    Remove-Item Function:\global:gh -ErrorAction SilentlyContinue
}
