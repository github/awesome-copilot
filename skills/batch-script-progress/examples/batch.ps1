param(
    [ValidateSet('normal', 'mixed', 'partial-zero', 'empty', 'unknown', 'fail-fast', 'cancelled', 'live')]
    [string]$Scenario = 'normal'
)

$count = 3
if ($Scenario -eq 'empty') { $count = 0 }
if ($Scenario -eq 'mixed') { $count = 4 }
$total = $count
if ($Scenario -eq 'unknown') { $total = $null }
$stats = @{ processed = 0; succeeded = 0; failed = 0; skipped = 0 }
$clock = [System.Diagnostics.Stopwatch]::StartNew()
$lastReport = 0
$results = [System.Collections.Generic.List[object]]::new()
$status = 'completed'

function Write-EventRecord {
    param([string]$EventName, [hashtable]$Fields = @{})
    $record = [ordered]@{ event = $EventName; total = $total }
    foreach ($key in @('processed', 'succeeded', 'failed', 'skipped')) {
        $record[$key] = $stats[$key]
    }
    $record['elapsed_ms'] = $clock.ElapsedMilliseconds
    foreach ($key in $Fields.Keys) { $record[$key] = $Fields[$key] }
    [Console]::Error.WriteLine(($record | ConvertTo-Json -Compress))
    [Console]::Error.Flush()
}

Write-EventRecord 'start'
for ($index = 1; $index -le $count; $index++) {
    if ($Scenario -eq 'cancelled' -and $index -eq 2) {
        $status = 'cancelled'
        break
    }
    if ($Scenario -eq 'mixed' -and $index -eq 2) {
        $stats.skipped++
    } else {
        try {
            if (($Scenario -eq 'mixed' -and $index -eq 3) -or ($Scenario -in @('fail-fast', 'partial-zero') -and $index -eq 2)) {
                throw 'fixture-rejected'
            }
            $results.Add(@{ id = "item-$index"; value = $index * 2 })
            $stats.succeeded++
        } catch {
            $stats.failed++
            $stats.processed++
            Write-EventRecord 'item-failed' @{ item_id = "item-$index"; reason = 'fixture-rejected'; will_continue = ($Scenario -ne 'fail-fast') }
            if ($Scenario -eq 'fail-fast') {
                $status = 'failed'
                break
            }
            $stats.processed--
        }
    }
    $stats.processed++
    if ($stats.processed % 2 -eq 0 -or $clock.ElapsedMilliseconds - $lastReport -ge 1000 -or $Scenario -eq 'live') {
        Write-EventRecord 'progress'
        $lastReport = $clock.ElapsedMilliseconds
    }
    if ($Scenario -eq 'live' -and $index -eq 1) {
        if ($null -eq [Console]::In.ReadLine()) { throw 'Fixture release input missing' }
    }
}
if ($status -eq 'completed' -and $stats.failed -gt 0) { $status = 'partial' }
$exitCode = 0
if ($stats.failed -gt 0 -and $Scenario -ne 'partial-zero') { $exitCode = 1 }
if ($status -eq 'cancelled') { $exitCode = 130 }
$unprocessed = $null
if ($null -ne $total) { $unprocessed = $total - $stats.processed }
Write-EventRecord 'summary' @{ status = $status; exit_code = $exitCode; unprocessed = $unprocessed }
if ($status -ne 'cancelled') {
    [Console]::Out.WriteLine((@{ results = @($results.ToArray()) } | ConvertTo-Json -Compress -Depth 4))
    [Console]::Out.Flush()
}
exit $exitCode
