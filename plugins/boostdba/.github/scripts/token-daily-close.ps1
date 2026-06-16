param(
    [string]$ModelName = 'gpt-5.3-codex',
    [double]$InputCostPer1M = 5,
    [double]$OutputCostPer1M = 15
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root

$jsonLog = '.github/reports/token-usage-history.json'

powershell -ExecutionPolicy Bypass -File .github/scripts/token-usage-report.ps1 `
    -IncludeDebugLogs `
    -JsonPath $jsonLog `
    -AppendHistory `
    -AppendDailyAggregateMarkdown `
    -DailyAggregateMdPath ".github/reports/token-usage-daily-aggregate.md" `
    -ModelName $ModelName `
    -InputCostPer1M $InputCostPer1M `
    -OutputCostPer1M $OutputCostPer1M `
    -CostBasis estimated_total_tokens_max
