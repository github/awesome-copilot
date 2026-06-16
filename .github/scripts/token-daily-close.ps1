param(
    [string]$ModelName = 'gpt-5.3-codex',
    [double]$InputCostPer1M = 5,
    [double]$OutputCostPer1M = 15
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root

$jsonLog = '.github/reports/token-usage-history.json'

function Get-LatestCopilotTranscript {
    $roots = @()

    if (-not [string]::IsNullOrWhiteSpace($env:APPDATA)) {
        $roots += (Join-Path $env:APPDATA 'Code\User\workspaceStorage')
    }
    if (-not [string]::IsNullOrWhiteSpace($env:HOME)) {
        $roots += (Join-Path $env:HOME '.config/Code/User/workspaceStorage')
    }

    $roots = @($roots | Where-Object { -not [string]::IsNullOrWhiteSpace($_) -and (Test-Path $_) } | Select-Object -Unique)
    foreach ($workspaceRoot in $roots) {
        $latest = Get-ChildItem -Path $workspaceRoot -Recurse -File -Filter '*.jsonl' -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -match 'GitHub\.copilot-chat[\\/]transcripts' } |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1

        if ($latest) {
            return $latest.FullName
        }
    }

    return $null
}

$transcriptPath = Get-LatestCopilotTranscript
if (-not $transcriptPath) {
    Write-Output 'No Copilot transcript found. Skipping daily token close without failing.'
    exit 0
}

& .github/scripts/token-usage-report.ps1 `
    -TranscriptPath $transcriptPath `
    -IncludeDebugLogs `
    -JsonPath $jsonLog `
    -AppendHistory `
    -AppendDailyAggregateMarkdown `
    -DailyCloseMode `
    -DailyAggregateMdPath ".github/reports/token-usage-daily-aggregate.md" `
    -ModelName $ModelName `
    -InputCostPer1M $InputCostPer1M `
    -OutputCostPer1M $OutputCostPer1M `
    -CostBasis estimated_total_tokens_max
