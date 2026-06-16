param(
    [string]$TranscriptPath,
    [string]$SessionId,
    [string]$WorkspaceStorageRoot = (Join-Path $env:APPDATA 'Code\User\workspaceStorage'),
    [string]$JsonPath,
    [switch]$IncludeDebugLogs,
    [switch]$AppendHistory,
    [switch]$ShowWeeklySummary,
    [switch]$AppendDailyAggregateMarkdown,
    [string]$DailyAggregateMdPath,
    [switch]$DailyCloseMode,
    [string]$DailyCloseTime = '23:55',
    [string]$ModelName = 'gpt-5.3-codex',
    [double]$InputCostPer1M = 5,
    [double]$OutputCostPer1M = 15,
    [ValidateSet('estimated_total_tokens_max','estimated_total_tokens_min','estimated_visible_tokens')]
    [string]$CostBasis = 'estimated_total_tokens_max'
)

$ErrorActionPreference = 'Stop'

function Resolve-TranscriptPath {
    param(
        [string]$ExplicitPath,
        [string]$Session,
        [string]$Root
    )

    if ($ExplicitPath) {
        if (-not (Test-Path $ExplicitPath)) {
            throw "Transcript no encontrado: $ExplicitPath"
        }
        return (Resolve-Path $ExplicitPath).Path
    }

    if (-not (Test-Path $Root)) {
        throw "Workspace storage no encontrado: $Root"
    }

    if ($Session) {
        $candidate = Get-ChildItem -Path $Root -Recurse -File -Filter "$Session.jsonl" -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -match 'GitHub\.copilot-chat\\transcripts' } |
            Select-Object -First 1
        if (-not $candidate) {
            throw "No se encontró transcript para SessionId=$Session"
        }
        return $candidate.FullName
    }

    $latest = Get-ChildItem -Path $Root -Recurse -File -Filter '*.jsonl' -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -match 'GitHub\.copilot-chat\\transcripts' } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $latest) {
        throw "No se encontraron transcripts en $Root"
    }

    return $latest.FullName
}

function Get-PhaseFromText {
    param([string]$Text)
    if ([string]::IsNullOrWhiteSpace($Text)) { return 'Other' }

    $t = $Text.ToLowerInvariant()

    if ($t -match 'pandoc|export-report|docx|word|mermaid|mmdc|render|filter|chromium') { return 'ExportWord' }
    if ($t -match 'informe|document|resumen|cuantific|roadmap|ejecutivo|techlead|dba|reporte') { return 'Documentation' }
    if ($t -match 'read_file|grep_search|file_search|semantic_search|analizar|schema|dependenc|diagnos|review|auditoria') { return 'Analysis' }

    return 'Other'
}

function Add-ExactUsageFromLine {
    param(
        [string]$Line,
        [hashtable]$Usage
    )

    if ($Line -match '"prompt_tokens"\s*:\s*(\d+)') { $Usage.prompt += [int]$matches[1]; $Usage.found = $true }
    if ($Line -match '"completion_tokens"\s*:\s*(\d+)') { $Usage.completion += [int]$matches[1]; $Usage.found = $true }
    if ($Line -match '"input_tokens"\s*:\s*(\d+)') { $Usage.input += [int]$matches[1]; $Usage.found = $true }
    if ($Line -match '"output_tokens"\s*:\s*(\d+)') { $Usage.output += [int]$matches[1]; $Usage.found = $true }
}

function Get-SessionIdFromTranscriptPath {
    param([string]$Path)
    $m = [regex]::Match($Path, 'transcripts\\([^\\]+)\.jsonl$')
    if ($m.Success) { return $m.Groups[1].Value }
    return ''
}

function Get-EstimatedCost {
    param(
        [double]$InputTokens,
        [double]$OutputTokens,
        [double]$InputRatePer1M,
        [double]$OutputRatePer1M
    )

    if (($InputRatePer1M -le 0) -and ($OutputRatePer1M -le 0)) {
        return [PSCustomObject]@{ input_cost = 0.0; output_cost = 0.0; total_cost = 0.0; has_rates = $false }
    }

    $inCost = ($InputTokens / 1000000.0) * $InputRatePer1M
    $outCost = ($OutputTokens / 1000000.0) * $OutputRatePer1M
    return [PSCustomObject]@{
        input_cost = [math]::Round($inCost, 2)
        output_cost = [math]::Round($outCost, 2)
        total_cost = [math]::Round($inCost + $outCost, 2)
        has_rates = $true
    }
}

function Convert-ToDoubleSafe {
    param([object]$Value)

    if ($null -eq $Value) { return 0.0 }
    $s = [string]$Value
    if ([string]::IsNullOrWhiteSpace($s)) { return 0.0 }

    $styles = [System.Globalization.NumberStyles]::Float
    $invariant = [System.Globalization.CultureInfo]::InvariantCulture
    $current = [System.Globalization.CultureInfo]::CurrentCulture

    $d = 0.0
    if ([double]::TryParse($s, $styles, $invariant, [ref]$d)) { return $d }
    if ([double]::TryParse($s, $styles, $current, [ref]$d)) { return $d }

    # fallback: swap separators
    $s2 = $s -replace '\.', ','
    if ([double]::TryParse($s2, $styles, $current, [ref]$d)) { return $d }

    return 0.0
}

function Get-DailyAggregateRow {
    param(
        [string]$HistoryPath,
        [string]$DateKey,
        [string]$SessionId
    )

    if (-not (Test-Path $HistoryPath)) {
        return $null
    }

    $rows = @(Get-Content $HistoryPath -Encoding UTF8 | Where-Object { $_ -match '\{' } | ForEach-Object {
        try { $_ | ConvertFrom-Json } catch { $null }
    } | Where-Object { $null -ne $_ })
    if ($rows.Count -eq 0) {
        return $null
    }

    $dayRows = @($rows | Where-Object {
        $_.timestamp -and ((Get-Date $_.timestamp).ToString('yyyy-MM-dd') -eq $DateKey)
    })

    if ($dayRows.Count -eq 0) {
        return $null
    }

    $sumVisible = ($dayRows | Measure-Object -Property estimated_visible_tokens -Sum).Sum
    $sumMin = ($dayRows | Measure-Object -Property estimated_total_tokens_min -Sum).Sum
    $sumMax = ($dayRows | Measure-Object -Property estimated_total_tokens_max -Sum).Sum
    $sumCost = 0.0
    foreach ($r in $dayRows) {
        $sumCost += Convert-ToDoubleSafe -Value $r.cost_total
    }

    $sessionRows = @()
    if (-not [string]::IsNullOrWhiteSpace($SessionId)) {
        $sessionRows = @($rows | Where-Object { $_.session_id -eq $SessionId })
    }

    $sessionRuns = 0
    $sessionVisible = 0.0
    $sessionCost = 0.0
    if ($sessionRows.Count -gt 0) {
        $sessionRuns = $sessionRows.Count
        $sessionVisible = ($sessionRows | Measure-Object -Property estimated_visible_tokens -Sum).Sum
        foreach ($r in $sessionRows) {
            $sessionCost += Convert-ToDoubleSafe -Value $r.cost_total
        }
    }

    $dailyRow = [PSCustomObject]@{
        date = $DateKey
        generated_at = (Get-Date).ToString('s')
        runs = $dayRows.Count
        total_visible_tokens = [math]::Round($sumVisible, 0)
        total_visible_tokens_k = [math]::Round(($sumVisible / 1000.0), 2)
        total_tokens_min = [math]::Round($sumMin, 0)
        total_tokens_min_k = [math]::Round(($sumMin / 1000.0), 2)
        total_tokens_max = [math]::Round($sumMax, 0)
        total_tokens_max_k = [math]::Round(($sumMax / 1000.0), 2)
        total_estimated_cost = [math]::Round($sumCost, 2)
        total_estimated_cost_usd = [math]::Round($sumCost, 2)
        session_id = $SessionId
        session_runs = $sessionRuns
        session_visible_tokens = [math]::Round($sessionVisible, 0)
        session_visible_tokens_k = [math]::Round(($sessionVisible / 1000.0), 2)
        session_estimated_cost = [math]::Round($sessionCost, 2)
        session_estimated_cost_usd = [math]::Round($sessionCost, 2)
    }

    return $dailyRow
}

function Get-AllDailyAggregateRows {
    param([string]$HistoryPath)

    if (-not (Test-Path $HistoryPath)) {
        return @()
    }

    $rows = @(Get-Content $HistoryPath -Encoding UTF8 | Where-Object { $_ -match '\{' } | ForEach-Object {
        try { $_ | ConvertFrom-Json } catch { $null }
    } | Where-Object { $null -ne $_ -and $_.timestamp })

    if ($rows.Count -eq 0) {
        return @()
    }

    $ordered = @($rows | Sort-Object { Get-Date $_.timestamp })

    # Rows are cumulative snapshots per session; compute deltas to avoid double counting.
    $prevBySession = @{}
    $deltaRows = @()

    foreach ($r in $ordered) {
        $sid = [string]$r.session_id
        if ([string]::IsNullOrWhiteSpace($sid)) {
            $sid = 'unknown-session'
        }

        $curVisible = Convert-ToDoubleSafe -Value $r.estimated_visible_tokens
        $curMin = Convert-ToDoubleSafe -Value $r.estimated_total_tokens_min
        $curMax = Convert-ToDoubleSafe -Value $r.estimated_total_tokens_max
        $curInputForCost = Convert-ToDoubleSafe -Value $r.cost_input_tokens
        $curOutputForCost = Convert-ToDoubleSafe -Value $r.cost_output_tokens
        $curInputRate = Convert-ToDoubleSafe -Value $r.cost_input_per_1m
        $curOutputRate = Convert-ToDoubleSafe -Value $r.cost_output_per_1m

        $deltaVisible = $curVisible
        $deltaMin = $curMin
        $deltaMax = $curMax
        $deltaInputForCost = $curInputForCost
        $deltaOutputForCost = $curOutputForCost

        if ($prevBySession.ContainsKey($sid)) {
            $p = $prevBySession[$sid]
            $deltaVisible = [math]::Max(0.0, $curVisible - $p.visible)
            $deltaMin = [math]::Max(0.0, $curMin - $p.min)
            $deltaMax = [math]::Max(0.0, $curMax - $p.max)
            $deltaInputForCost = [math]::Max(0.0, $curInputForCost - $p.input_for_cost)
            $deltaOutputForCost = [math]::Max(0.0, $curOutputForCost - $p.output_for_cost)
        }

        $deltaCost = (($deltaInputForCost / 1000000.0) * $curInputRate) + (($deltaOutputForCost / 1000000.0) * $curOutputRate)

        $prevBySession[$sid] = [PSCustomObject]@{
            visible = $curVisible
            min = $curMin
            max = $curMax
            input_for_cost = $curInputForCost
            output_for_cost = $curOutputForCost
        }

        $deltaRows += [PSCustomObject]@{
            date = (Get-Date $r.timestamp).ToString('yyyy-MM-dd')
            timestamp = $r.timestamp
            delta_visible = $deltaVisible
            delta_min = $deltaMin
            delta_max = $deltaMax
            delta_cost = [math]::Round($deltaCost, 6)
        }
    }

    $grouped = $deltaRows | Group-Object date
    $dailyRows = @()
    foreach ($g in $grouped) {
        $sumVisible = ($g.Group | Measure-Object -Property delta_visible -Sum).Sum
        $sumMin = ($g.Group | Measure-Object -Property delta_min -Sum).Sum
        $sumMax = ($g.Group | Measure-Object -Property delta_max -Sum).Sum
        $sumCost = ($g.Group | Measure-Object -Property delta_cost -Sum).Sum
        $lastTs = ($g.Group | Sort-Object { Get-Date $_.timestamp } -Descending | Select-Object -First 1).timestamp

        $dailyRows += [PSCustomObject]@{
            date = $g.Name
            generated_at = $lastTs
            runs = $g.Count
            total_visible_tokens_k = [math]::Round(($sumVisible / 1000.0), 2)
            total_tokens_min_k = [math]::Round(($sumMin / 1000.0), 2)
            total_tokens_max_k = [math]::Round(($sumMax / 1000.0), 2)
            total_estimated_cost_usd = [math]::Round($sumCost, 2)
        }
    }

    return @($dailyRows | Sort-Object date)
}

function Write-DailyAggregateMarkdownRow {
    param(
        [string]$MarkdownPath,
        [pscustomobject]$DailyRow
    )

    if ($null -eq $DailyRow) {
        return
    }

    $dir = Split-Path -Parent $MarkdownPath
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
    }

    $hasKColumns = $false
    if (Test-Path $MarkdownPath) {
        $hasKColumns = Select-String -Path $MarkdownPath -Pattern 'Total Visible Tokens \(K\)|Session Visible Tokens \(K\)|Estimated Cost \(USD\)' -Quiet
    }

    if ((Test-Path $MarkdownPath) -and (-not $hasKColumns)) {
        $legacyLines = Get-Content -Path $MarkdownPath -Encoding UTF8
        $convertedRows = @()

        foreach ($ln in $legacyLines) {
            if ($ln -match '^\|\s*\d{4}-\d{2}-\d{2}\s*\|') {
                $parts = @($ln.Split('|') | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' })
                if ($parts.Count -ge 10) {
                    $date = $parts[0]
                    $generatedAt = $parts[1]
                    $runs = $parts[2]
                    $totalVisibleK = [math]::Round((Convert-ToDoubleSafe -Value $parts[3]) / 1000.0, 2)
                    $totalMinK = [math]::Round((Convert-ToDoubleSafe -Value $parts[4]) / 1000.0, 2)
                    $totalMaxK = [math]::Round((Convert-ToDoubleSafe -Value $parts[5]) / 1000.0, 2)
                    $totalCostUsd = [math]::Round((Convert-ToDoubleSafe -Value $parts[6]), 2)
                    $sessionRuns = $parts[7]
                    $sessionVisibleK = [math]::Round((Convert-ToDoubleSafe -Value $parts[8]) / 1000.0, 2)
                    $sessionCostUsd = [math]::Round((Convert-ToDoubleSafe -Value $parts[9]), 2)

                    $convertedRows += "| $date | $generatedAt | $runs | $totalVisibleK | $totalMinK | $totalMaxK | $totalCostUsd | $sessionRuns | $sessionVisibleK | $sessionCostUsd |"
                }
            }
        }

        @(
            '# Token Usage Daily Aggregate'
            ''
            '| Date | Generated At | Runs | Total Visible Tokens (K) | Total Tokens Min (K) | Total Tokens Max (K) | Total Estimated Cost (USD) | Session Runs | Session Visible Tokens (K) | Session Estimated Cost (USD) |'
            '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|'
        ) + $convertedRows | Out-File -FilePath $MarkdownPath -Encoding UTF8

        $hasKColumns = $true
    }

    if (-not (Test-Path $MarkdownPath) -or (-not $hasKColumns)) {
        @(
            '# Token Usage Daily Aggregate'
            ''
            '| Date | Generated At | Runs | Total Visible Tokens (K) | Total Tokens Min (K) | Total Tokens Max (K) | Total Estimated Cost (USD) | Session Runs | Session Visible Tokens (K) | Session Estimated Cost (USD) |'
            '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|'
        ) | Out-File -FilePath $MarkdownPath -Encoding UTF8
    }

    $fmt = [System.Globalization.CultureInfo]::InvariantCulture
    $totalVisibleK = ([double]$DailyRow.total_visible_tokens_k).ToString('F2', $fmt)
    $totalMinK = ([double]$DailyRow.total_tokens_min_k).ToString('F2', $fmt)
    $totalMaxK = ([double]$DailyRow.total_tokens_max_k).ToString('F2', $fmt)
    $totalCostUsd = ([double]$DailyRow.total_estimated_cost_usd).ToString('F2', $fmt)
    $sessionVisibleK = ([double]$DailyRow.session_visible_tokens_k).ToString('F2', $fmt)
    $sessionCostUsd = ([double]$DailyRow.session_estimated_cost_usd).ToString('F2', $fmt)

    $line = "| $($DailyRow.date) | $($DailyRow.generated_at) | $($DailyRow.runs) | $totalVisibleK | $totalMinK | $totalMaxK | $totalCostUsd | $($DailyRow.session_runs) | $sessionVisibleK | $sessionCostUsd |"
    $existing = Get-Content -Path $MarkdownPath -Encoding UTF8
    $datePattern = '^\|\s*' + [regex]::Escape($DailyRow.date) + '\s*\|'
    $kept = @($existing | Where-Object { $_ -notmatch $datePattern })
    $updated = @($kept + $line)
    $updated | Out-File -FilePath $MarkdownPath -Encoding UTF8
}

function Write-DailyAggregateMarkdownTable {
    param(
        [string]$MarkdownPath,
        [array]$DailyRows
    )

    $dir = Split-Path -Parent $MarkdownPath
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
    }

    $fmt = [System.Globalization.CultureInfo]::InvariantCulture
    $lines = @(
        '# Token Usage Daily Aggregate'
        ''
        '| Date | Generated At | Runs | Total Visible Tokens (K) | Total Tokens Min (K) | Total Tokens Max (K) | Total Estimated Cost (USD) |'
        '|---|---|---:|---:|---:|---:|---:|'
    )

    $sumRuns = 0
    $sumVisibleK = 0.0
    $sumMinK = 0.0
    $sumMaxK = 0.0
    $sumCost = 0.0

    foreach ($r in $DailyRows) {
        $visibleK = ([double]$r.total_visible_tokens_k)
        $minK = ([double]$r.total_tokens_min_k)
        $maxK = ([double]$r.total_tokens_max_k)
        $costUsd = ([double]$r.total_estimated_cost_usd)

        $sumRuns += [int]$r.runs
        $sumVisibleK += $visibleK
        $sumMinK += $minK
        $sumMaxK += $maxK
        $sumCost += $costUsd

        $lines += "| $($r.date) | $($r.generated_at) | $($r.runs) | $($visibleK.ToString('F2',$fmt)) | $($minK.ToString('F2',$fmt)) | $($maxK.ToString('F2',$fmt)) | $($costUsd.ToString('F2',$fmt)) |"
    }

    if ($DailyRows.Count -gt 0) {
        $lines += "| **TOTAL** | - | **$sumRuns** | **$(([math]::Round($sumVisibleK,2)).ToString('F2',$fmt))** | **$(([math]::Round($sumMinK,2)).ToString('F2',$fmt))** | **$(([math]::Round($sumMaxK,2)).ToString('F2',$fmt))** | **$(([math]::Round($sumCost,2)).ToString('F2',$fmt))** |"
    }

    $lines | Out-File -FilePath $MarkdownPath -Encoding UTF8
}

function Test-IsAfterDailyCutoff {
    param([string]$Cutoff)

    $ts = [TimeSpan]::Zero
    if (-not [TimeSpan]::TryParse($Cutoff, [ref]$ts)) {
        throw "Formato DailyCloseTime invalido: $Cutoff (usa HH:mm, por ejemplo 23:55)"
    }

    return ((Get-Date).TimeOfDay -ge $ts)
}

function Test-DailyMarkdownHasDate {
    param(
        [string]$Path,
        [string]$DateKey
    )

    if (-not (Test-Path $Path)) { return $false }
    $escapedDate = [regex]::Escape($DateKey)
    return (Select-String -Path $Path -Pattern ("^\|\s*" + $escapedDate + "\s*\|") -Quiet)
}

$TranscriptPath = Resolve-TranscriptPath -ExplicitPath $TranscriptPath -Session $SessionId -Root $WorkspaceStorageRoot

$totals = [ordered]@{ Analysis = 0; Documentation = 0; ExportWord = 0; Other = 0 }
$typeTotals = [ordered]@{ User = 0; Assistant = 0; Tool = 0 }
$usage = @{ prompt = 0; completion = 0; input = 0; output = 0; found = $false }

$lineCount = 0
$byteCount = 0

Get-Content -Path $TranscriptPath | ForEach-Object {
    $line = $_
    if ([string]::IsNullOrWhiteSpace($line)) { return }

    $lineCount++
    $lineBytes = [Text.Encoding]::UTF8.GetByteCount($line)
    $byteCount += $lineBytes
    $estimatedTokens = [math]::Ceiling($lineBytes / 4.0)

    Add-ExactUsageFromLine -Line $line -Usage $usage

    $obj = $null
    try {
        $obj = $line | ConvertFrom-Json -ErrorAction Stop
    } catch {
        $totals['Other'] += $estimatedTokens
        return
    }

    $phase = 'Other'
    switch -Regex ($obj.type) {
        '^user\.message$' {
            $typeTotals['User'] += $estimatedTokens
            $phase = Get-PhaseFromText -Text ([string]$obj.data.content)
        }
        '^assistant\.message$' {
            $typeTotals['Assistant'] += $estimatedTokens
            $txt = [string]$obj.data.content
            if ($obj.data.toolRequests) {
                $txt += ' ' + (($obj.data.toolRequests | ForEach-Object { $_.name + ' ' + $_.arguments }) -join ' ')
            }
            $phase = Get-PhaseFromText -Text $txt
        }
        '^tool\.execution_start$' {
            $typeTotals['Tool'] += $estimatedTokens
            $toolName = [string]$obj.data.toolName
            $argsJson = ''
            try { $argsJson = ($obj.data.arguments | ConvertTo-Json -Compress -Depth 8) } catch {}
            $phase = Get-PhaseFromText -Text ($toolName + ' ' + $argsJson)
        }
        '^tool\.execution_complete$' {
            $typeTotals['Tool'] += $estimatedTokens
            $phase = 'Other'
        }
        default {
            $phase = 'Other'
        }
    }

    $totals[$phase] += $estimatedTokens
}

if ($IncludeDebugLogs) {
    $sessionMatch = [regex]::Match($TranscriptPath, 'transcripts\\([^\\]+)\.jsonl$')
    if ($sessionMatch.Success) {
        $sid = $sessionMatch.Groups[1].Value
        $debugFiles = Get-ChildItem -Path $WorkspaceStorageRoot -Recurse -File -ErrorAction SilentlyContinue |
            Where-Object {
                $_.FullName -match "GitHub\.copilot-chat\\debug-logs\\$([regex]::Escape($sid))" -and
                $_.Extension -in '.json', '.jsonl', '.log', '.txt'
            }

        foreach ($f in $debugFiles) {
            Get-Content -Path $f.FullName -ErrorAction SilentlyContinue | ForEach-Object {
                Add-ExactUsageFromLine -Line $_ -Usage $usage
            }
        }
    }
}

$estimatedTotal = ($totals.Values | Measure-Object -Sum).Sum
$estimatedWithOverheadMin = [math]::Round($estimatedTotal * 1.15)
$estimatedWithOverheadMax = [math]::Round($estimatedTotal * 1.35)
$resolvedSessionId = if ($SessionId) { $SessionId } else { Get-SessionIdFromTranscriptPath -Path $TranscriptPath }
$runTimestamp = (Get-Date).ToString('s')

# Si no hay tokens exactos en logs, aproximamos I/O para coste usando basis seleccionado.
$basisTokens = switch ($CostBasis) {
    'estimated_total_tokens_min' { $estimatedWithOverheadMin }
    'estimated_visible_tokens' { $estimatedTotal }
    default { $estimatedWithOverheadMax }
}

$inputForCost = if ($usage.found -and ($usage.input -gt 0 -or $usage.prompt -gt 0)) {
    if ($usage.input -gt 0) { $usage.input } else { $usage.prompt }
} else {
    [math]::Round($basisTokens * 0.85)
}

$outputForCost = if ($usage.found -and ($usage.output -gt 0 -or $usage.completion -gt 0)) {
    if ($usage.output -gt 0) { $usage.output } else { $usage.completion }
} else {
    [math]::Round($basisTokens * 0.15)
}

$cost = Get-EstimatedCost -InputTokens $inputForCost -OutputTokens $outputForCost -InputRatePer1M $InputCostPer1M -OutputRatePer1M $OutputCostPer1M

$result = [PSCustomObject]@{
    timestamp = $runTimestamp
    session_id = $resolvedSessionId
    model_name = $ModelName
    transcript_path = $TranscriptPath
    lines = $lineCount
    bytes = $byteCount
    estimated_visible_tokens = $estimatedTotal
    estimated_total_tokens_min = $estimatedWithOverheadMin
    estimated_total_tokens_max = $estimatedWithOverheadMax
    phase_analysis = $totals.Analysis
    phase_documentation = $totals.Documentation
    phase_exportword = $totals.ExportWord
    phase_other = $totals.Other
    source_user = $typeTotals.User
    source_assistant = $typeTotals.Assistant
    source_tool = $typeTotals.Tool
    exact_prompt_tokens = $usage.prompt
    exact_completion_tokens = $usage.completion
    exact_input_tokens = $usage.input
    exact_output_tokens = $usage.output
    exact_found = $usage.found
    cost_basis = $CostBasis
    cost_input_tokens = $inputForCost
    cost_output_tokens = $outputForCost
    cost_input_per_1m = $InputCostPer1M
    cost_output_per_1m = $OutputCostPer1M
    cost_input = $cost.input_cost
    cost_output = $cost.output_cost
    cost_total = $cost.total_cost
}

Write-Output "Transcript: $($result.transcript_path)"
Write-Output "Lines: $($result.lines)"
Write-Output "Bytes: $($result.bytes)"
Write-Output ""
Write-Output "Estimated tokens (visible payload): $($result.estimated_visible_tokens)"
Write-Output "Estimated tokens (with protocol/context overhead): $($result.estimated_total_tokens_min) - $($result.estimated_total_tokens_max)"
Write-Output ""
Write-Output "Breakdown by phase (estimated):"
Write-Output "- Analysis: $($result.phase_analysis)"
Write-Output "- Documentation: $($result.phase_documentation)"
Write-Output "- ExportWord: $($result.phase_exportword)"
Write-Output "- Other: $($result.phase_other)"
Write-Output ""
Write-Output "Breakdown by message source (estimated):"
Write-Output "- User: $($result.source_user)"
Write-Output "- Assistant: $($result.source_assistant)"
Write-Output "- Tool: $($result.source_tool)"
Write-Output ""

if ($result.exact_found) {
    Write-Output "Exact token counters found in logs:"
    Write-Output "- prompt_tokens: $($result.exact_prompt_tokens)"
    Write-Output "- completion_tokens: $($result.exact_completion_tokens)"
    Write-Output "- input_tokens: $($result.exact_input_tokens)"
    Write-Output "- output_tokens: $($result.exact_output_tokens)"
} else {
    Write-Output "Exact per-request token counters were not found in transcript/debug log format."
}

if ($cost.has_rates) {
    Write-Output ""
    Write-Output "Estimated cost ($ModelName, basis=$CostBasis):"
    Write-Output "- Input tokens for cost: $inputForCost"
    Write-Output "- Output tokens for cost: $outputForCost"
    Write-Output ("- Input cost (USD): {0:F2}" -f [double]$result.cost_input)
    Write-Output ("- Output cost (USD): {0:F2}" -f [double]$result.cost_output)
    Write-Output ("- Total cost (USD): {0:F2}" -f [double]$result.cost_total)
}

if ($JsonPath) {
    $dir = Split-Path -Parent $JsonPath
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
    }
    $jsonLine = $result | ConvertTo-Json -Compress -Depth 5
    Add-Content -Path $JsonPath -Value $jsonLine -Encoding UTF8
    Write-Output ""
    Write-Output "Log JSON: $JsonPath"

    if ($AppendDailyAggregateMarkdown) {
        $todayKey = (Get-Date).ToString('yyyy-MM-dd')
        $dailyMdPathResolved = if ($DailyAggregateMdPath) { $DailyAggregateMdPath } else { '.github/reports/token-usage-daily-aggregate.md' }

        $canWriteMdDaily = $true
        if ($DailyCloseMode -and (-not (Test-IsAfterDailyCutoff -Cutoff $DailyCloseTime))) {
            $canWriteMdDaily = $false
            Write-Output ""
            Write-Output "Daily close mode (md): aun no se alcanza la hora de cierre ($DailyCloseTime)."
        }

        if ($canWriteMdDaily -and $DailyCloseMode -and (Test-DailyMarkdownHasDate -Path $dailyMdPathResolved -DateKey $todayKey)) {
            $canWriteMdDaily = $false
            Write-Output ""
            Write-Output "Daily close mode (md): ya existe fila para $todayKey en $dailyMdPathResolved."
        }

        $dailyForMd = $null
        $allDailyRows = @()
        if ($canWriteMdDaily) {
            $allDailyRows = Get-AllDailyAggregateRows -HistoryPath $JsonPath
            $dailyForMd = @($allDailyRows | Where-Object { $_.date -eq $todayKey } | Select-Object -First 1)
        }

        if ($allDailyRows.Count -gt 0) {
            Write-DailyAggregateMarkdownTable -MarkdownPath $dailyMdPathResolved -DailyRows $allDailyRows
            Write-Output ""
            Write-Output "Daily aggregate markdown rebuilt: $dailyMdPathResolved"
            if ($null -ne $dailyForMd) {
                Write-Output "- Date: $($dailyForMd.date)"
                Write-Output "- Runs today: $($dailyForMd.runs)"
                Write-Output "- Total visible tokens today (K): $($dailyForMd.total_visible_tokens_k)"
                Write-Output ("- Total estimated cost today (USD): {0:F2}" -f [double]$dailyForMd.total_estimated_cost_usd)
            }
            Write-Output "- Days in table: $($allDailyRows.Count)"
        }
    }

    if ($ShowWeeklySummary -and (Test-Path $JsonPath)) {
        $rows = @(Get-Content $JsonPath -Encoding UTF8 | Where-Object { $_ -match '\{' } | ForEach-Object {
            try { $_ | ConvertFrom-Json } catch { $null }
        } | Where-Object { $null -ne $_ })
        if ($rows.Count -gt 0) {
            $last7 = @($rows | Where-Object {
                $_.timestamp -and ((Get-Date $_.timestamp) -ge (Get-Date).AddDays(-7))
            })

            if ($last7.Count -gt 0) {
                $sumVisible = ($last7 | Measure-Object -Property estimated_visible_tokens -Sum).Sum
                $sumMax = ($last7 | Measure-Object -Property estimated_total_tokens_max -Sum).Sum
                $sumCost = 0.0
                foreach ($r in $last7) {
                    $sumCost += Convert-ToDoubleSafe -Value $r.cost_total
                }

                Write-Output ""
                Write-Output "Weekly summary (last 7 days):"
                Write-Output "- Runs: $($last7.Count)"
                Write-Output "- Visible tokens: $([math]::Round($sumVisible,0))"
                Write-Output "- Estimated total tokens (max): $([math]::Round($sumMax,0))"
                Write-Output ("- Total estimated cost (USD): {0:F2}" -f ([math]::Round($sumCost,2)))
            }
        }
    }
}
