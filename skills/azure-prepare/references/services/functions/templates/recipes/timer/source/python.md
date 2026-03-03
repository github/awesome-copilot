# Python Timer Trigger

Replace the contents of `function_app.py` with this file.

## function_app.py

```python
import azure.functions as func
import logging
import os
from datetime import datetime

app = func.FunctionApp()

@app.timer_trigger(
    schedule="%TIMER_SCHEDULE%",
    arg_name="timer",
    run_on_startup=False,
    use_monitor=True
)
def timer_trigger(timer: func.TimerRequest) -> None:
    """
    Timer trigger function - runs on the schedule defined in TIMER_SCHEDULE.
    Default: every 5 minutes (0 */5 * * * *)
    """
    utc_timestamp = datetime.utcnow().isoformat()
    
    if timer.past_due:
        logging.warning('Timer is past due!')
    
    logging.info(f'Python timer trigger executed at {utc_timestamp}')
    
    # Add your scheduled task logic here
    # Examples:
    # - Call an external API
    # - Process queued items
    # - Generate reports
    # - Clean up old data

@app.route(route="health", methods=["GET"], auth_level=func.AuthLevel.FUNCTION)
def health_check(req: func.HttpRequest) -> func.HttpResponse:
    """Health check endpoint."""
    return func.HttpResponse(
        '{"status": "healthy", "schedule": "' + 
        (os.environ.get("TIMER_SCHEDULE") or "not-set") + '"}',
        mimetype="application/json"
    )
```

## requirements.txt additions

```
azure-functions
```

## Local Testing

Set these in `local.settings.json`:
```json
{
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "python",
    "TIMER_SCHEDULE": "0 */5 * * * *"
  }
}
```

> **Tip:** For local testing, use a more frequent schedule like `*/30 * * * * *` (every 30 seconds).

## Common Patterns

- [Error Handling](../../common/error-handling.md) — Try/catch + logging patterns
- [Health Check](../../common/health-check.md) — Health endpoint for monitoring
- [UAMI Bindings](../../common/uami-bindings.md) — Managed identity settings
