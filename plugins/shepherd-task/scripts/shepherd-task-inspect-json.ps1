<#
.SYNOPSIS
    Inspect a copilot JSON log file, showing the last N meaningful events.

.PARAMETER JsonFile
    Path to the JSON log file (relative or absolute).

.PARAMETER Count
    Number of messages to show (default: 20).
#>

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$JsonFile,

    [Parameter(Mandatory = $false, Position = 1)]
    [int]$Count = 20
)

$events = Get-Content $JsonFile |
  Where-Object { $_ -notmatch '"ephemeral":true' -and $_ -notmatch '"tool.execution_partial_result"' } |
  ForEach-Object {
    try { $_ | ConvertFrom-Json } catch { $null }
  } |
  Where-Object { $_ -ne $null } |
  Select-Object -Last $Count

$events | ForEach-Object {
    $evt = $_
    $ts = if ($evt.timestamp) { ([datetime]$evt.timestamp).ToString("HH:mm:ss") } else { "--------" }
    $summary = switch -Wildcard ($evt.type) {
      "user.message"              { $txt = $evt.data.content; "USER: " + $txt.Substring(0, [Math]::Min(120, $txt.Length)) }
      "assistant.message"         {
        if ($evt.data.content) {
          $txt = $evt.data.content; "ASST: " + $txt.Substring(0, [Math]::Min(120, $txt.Length))
        } else {
          $names = ($evt.data.toolRequests | ForEach-Object { $_.name }) -join ", "
          "ASST: [tool calls: $names]"
        }
      }
      "tool.execution_start"      {
        $args_summary = ($evt.data.arguments | ConvertTo-Json -Compress -Depth 1) -replace '[\r\n]',''
        if ($args_summary.Length -gt 80) { $args_summary = $args_summary.Substring(0,77) + "..." }
        "TOOL> " + $evt.data.toolName + " :: " + $args_summary
      }
      "tool.execution_complete"   { "TOOL< " + $(if ($evt.data.success) {"OK"} else {"FAIL"}) }
      "assistant.reasoning"       { $txt = $evt.data.content; "THINK: " + $txt.Substring(0, [Math]::Min(120, $txt.Length)) }
      "assistant.turn_start"      { $null }
      "assistant.turn_end"        { $null }
      default                     { $evt.type }
    }
    if ($summary) { "$ts | $summary" }
  }
