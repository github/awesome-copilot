# shepherd-task-version: 1.0.5

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$pluginRoot = Split-Path -Parent $PSScriptRoot
$orchestratorPath = Join-Path $pluginRoot 'scripts\shepherd-task.ps1'
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
$functionAst = $ast.Find({
    param($node)
    $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and
        $node.Name -eq 'Find-LinkedPR'
}, $true)
if (-not $functionAst) {
    throw 'Find-LinkedPR was not found.'
}
Invoke-Expression $functionAst.Extent.Text

$script:Repo = 'owner/repository'
$script:TaskIssue = '14'
$script:timelineArguments = $null

function global:gh {
    $arguments = @($args | ForEach-Object { [string]$_ })
    $command = $arguments -join ' '
    $global:LASTEXITCODE = 0

    if ($arguments[0] -eq 'api' -and
        $arguments[1] -eq '/repos/owner/repository/issues/14/timeline?per_page=100') {
        if ($arguments -notcontains '--paginate') {
            throw 'Timeline request did not include --paginate.'
        }
        $script:timelineArguments = $arguments
        'https://api.github.com/repos/owner/repository/pulls/240'
        'https://api.github.com/repos/owner/repository/pulls/14'
        return
    }
    if ($command -like 'pr view 240 *') {
        '{"state":"MERGED","closingIssuesReferences":[{"number":140}]}'
        return
    }
    if ($command -like 'pr view 14 *') {
        '{"state":"MERGED","closingIssuesReferences":[{"number":14}]}'
        return
    }
    if ($command -like 'pr list *') {
        throw 'Merged PR discovery must not depend on open-PR fallbacks.'
    }
    throw "Unexpected gh invocation: $command"
}

try {
    $result = Find-LinkedPR -State MERGED
    if ($result -ne '14') {
        throw "Expected authoritative merged PR 14 from paginated timeline output; found '$result'."
    }
    if ($null -eq $script:timelineArguments) {
        throw 'The orchestrator did not issue the paginated timeline request.'
    }

    Write-Host 'PowerShell orchestrator linked-PR pagination contract tests passed.'
}
finally {
    Remove-Item Function:\global:gh -ErrorAction SilentlyContinue
}
