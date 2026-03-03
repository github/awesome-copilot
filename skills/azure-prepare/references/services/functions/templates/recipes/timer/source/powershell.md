# PowerShell Timer Trigger

Replace the contents of `src/functions/` with these files.

## src/functions/TimerTrigger/function.json

```json
{
  "bindings": [
    {
      "name": "Timer",
      "type": "timerTrigger",
      "direction": "in",
      "schedule": "%TIMER_SCHEDULE%",
      "runOnStartup": false,
      "useMonitor": true
    }
  ]
}
```

## src/functions/TimerTrigger/run.ps1

```powershell
param($Timer)

$utcTimestamp = (Get-Date).ToUniversalTime().ToString("o")

if ($Timer.IsPastDue) {
    Write-Warning "Timer is past due!"
}

Write-Host "PowerShell timer trigger executed at $utcTimestamp"

# Add your scheduled task logic here
# Examples:
# - Call an external API
# - Process queued items
# - Generate reports
# - Clean up old data
```

## src/functions/HealthCheck/function.json

```json
{
  "bindings": [
    {
      "authLevel": "function",
      "type": "httpTrigger",
      "direction": "in",
      "name": "Request",
      "methods": ["get"],
      "route": "health"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "Response"
    }
  ]
}
```

## src/functions/HealthCheck/run.ps1

```powershell
param($Request, $TriggerMetadata)

$schedule = $env:TIMER_SCHEDULE
if (-not $schedule) { $schedule = "not-set" }

$body = @{
    status = "healthy"
    schedule = $schedule
} | ConvertTo-Json

Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
    StatusCode = [HttpStatusCode]::OK
    Headers = @{ "Content-Type" = "application/json" }
    Body = $body
})
```

## Local Testing

Set these in `local.settings.json`:
```json
{
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "powershell",
    "TIMER_SCHEDULE": "0 */5 * * * *"
  }
}
```

## Common Patterns

- [Error Handling](../../common/error-handling.md) — Try/catch + logging patterns
- [Health Check](../../common/health-check.md) — Health endpoint for monitoring
- [UAMI Bindings](../../common/uami-bindings.md) — Managed identity settings
