# JavaScript Timer Trigger

Replace the contents of `src/functions/` with these files.

> ⚠️ **IMPORTANT**: Do NOT delete `src/index.js` — it's required for function discovery. See [nodejs-entry-point.md](../../common/nodejs-entry-point.md).

## src/functions/timerTrigger.js

```javascript
const { app } = require('@azure/functions');

app.timer('timerTrigger', {
    schedule: '%TIMER_SCHEDULE%',
    runOnStartup: false,
    useMonitor: true,
    handler: (timer, context) => {
        const utcTimestamp = new Date().toISOString();
        
        if (timer.isPastDue) {
            context.log('Timer is past due!');
        }
        
        context.log(`Timer trigger executed at ${utcTimestamp}`);
        
        // Add your scheduled task logic here
        // Examples:
        // - Call an external API
        // - Process queued items
        // - Generate reports
        // - Clean up old data
    },
});
```

## src/functions/healthCheck.js

```javascript
const { app } = require('@azure/functions');

app.http('healthCheck', {
    methods: ['GET'],
    route: 'health',
    authLevel: 'function',
    handler: async (request, context) => {
        return {
            status: 200,
            jsonBody: {
                status: 'healthy',
                schedule: process.env.TIMER_SCHEDULE || 'not-set'
            }
        };
    },
});
```

## package.json additions

```json
{
  "dependencies": {
    "@azure/functions": "^4.0.0"
  }
}
```

## Local Testing

Set these in `local.settings.json`:
```json
{
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "TIMER_SCHEDULE": "0 */5 * * * *"
  }
}
```

## Common Patterns

- [Node.js Entry Point](../../common/nodejs-entry-point.md) — **REQUIRED** src/index.js setup
- [Error Handling](../../common/error-handling.md) — Try/catch + logging patterns
- [Health Check](../../common/health-check.md) — Health endpoint for monitoring
- [UAMI Bindings](../../common/uami-bindings.md) — Managed identity settings
