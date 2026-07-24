<#
.SYNOPSIS
    Summarize token usage from OTel JSONL exports produced by shepherd-task.

.PARAMETER Target
    Path to a single OTel JSONL file or a directory containing *.jsonl files.

.EXAMPLE
    ./shepherd-task-inspect-otel-token-summary.ps1 ./shepherd-tasks-20260708-1244
    ./shepherd-task-inspect-otel-token-summary.ps1 ./phase1-otel-20260708-1244-4.jsonl
#>

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Target
)

$ErrorActionPreference = "Stop"

function Get-TokenSummary {
    param([string]$FilePath)

    $content = Get-Content $FilePath -Raw
    $lines = Get-Content $FilePath | Where-Object { $_.Trim() -ne "" }

    $inputTokens = 0
    $outputTokens = 0
    $llmCalls = 0

    foreach ($line in $lines) {
        try {
            $obj = $line | ConvertFrom-Json -Depth 20
        } catch {
            continue
        }

        # Walk resourceSpans -> scopeSpans -> spans
        if ($obj.resourceSpans) {
            foreach ($rs in $obj.resourceSpans) {
                foreach ($ss in $rs.scopeSpans) {
                    foreach ($span in $ss.spans) {
                        if ($span.name -match "^chat ") {
                            $llmCalls++
                        }
                        foreach ($attr in $span.attributes) {
                            if ($attr.key -eq "gen_ai.usage.input_tokens") {
                                $val = if ($attr.value.intValue) { $attr.value.intValue } elseif ($attr.value.stringValue) { [int]$attr.value.stringValue } else { 0 }
                                $inputTokens += $val
                            }
                            if ($attr.key -eq "gen_ai.usage.output_tokens") {
                                $val = if ($attr.value.intValue) { $attr.value.intValue } elseif ($attr.value.stringValue) { [int]$attr.value.stringValue } else { 0 }
                                $outputTokens += $val
                            }
                        }
                    }
                }
            }
        }
    }

    return @{
        InputTokens  = $inputTokens
        OutputTokens = $outputTokens
        LLMCalls     = $llmCalls
    }
}

Write-Output "=== OTel Token Usage Summary ==="
Write-Output ""

$totalInput = 0
$totalOutput = 0
$totalCalls = 0

if (Test-Path $Target -PathType Container) {
    $files = Get-ChildItem -Path $Target -Filter "*.jsonl"
    if ($files.Count -eq 0) {
        Write-Output "No .jsonl files found in $Target"
        exit 1
    }
    foreach ($f in $files) {
        $summary = Get-TokenSummary -FilePath $f.FullName
        $name = $f.Name
        Write-Output ("{0,-50}  {1,8} input  {2,8} output  {3,4} calls" -f $name, $summary.InputTokens, $summary.OutputTokens, $summary.LLMCalls)
        $totalInput += $summary.InputTokens
        $totalOutput += $summary.OutputTokens
        $totalCalls += $summary.LLMCalls
    }
    Write-Output ""
    Write-Output "--- TOTALS ---"
    Write-Output ("{0,-50}  {1,8} input  {2,8} output  {3,4} calls" -f "ALL FILES", $totalInput, $totalOutput, $totalCalls)
} else {
    $summary = Get-TokenSummary -FilePath $Target
    $name = Split-Path $Target -Leaf
    Write-Output ("{0,-50}  {1,8} input  {2,8} output  {3,4} calls" -f $name, $summary.InputTokens, $summary.OutputTokens, $summary.LLMCalls)
}
