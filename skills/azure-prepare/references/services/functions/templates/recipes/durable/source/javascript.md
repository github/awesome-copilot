# JavaScript Durable Functions

Replace the contents of `src/functions/` with these files.

> ⚠️ **IMPORTANT**: Do NOT delete `src/index.js` — it's required for function discovery. See [nodejs-entry-point.md](../../common/nodejs-entry-point.md).

## src/functions/httpStart.js

```javascript
const { app } = require('@azure/functions');
const df = require('durable-functions');

// HTTP endpoint to start an orchestration
app.http('httpStart', {
    route: 'orchestrators/{name}',
    methods: ['POST'],
    authLevel: 'function',
    extraInputs: [df.input.durableClient()],
    handler: async (request, context) => {
        const client = df.getClient(context);
        const functionName = request.params.name || 'helloOrchestrator';
        
        let inputData;
        try {
            inputData = await request.json();
        } catch {
            // No body or invalid JSON
        }
        
        const instanceId = await client.startNew(functionName, { input: inputData });
        context.log(`Started orchestration with ID = '${instanceId}'`);
        
        return client.createCheckStatusResponse(request, instanceId);
    },
});
```

## src/functions/helloOrchestrator.js

```javascript
const df = require('durable-functions');

// Orchestrator function - coordinates the workflow
df.app.orchestration('helloOrchestrator', function* (context) {
    // Fan-out: Call activities in parallel
    const tasks = [
        context.df.callActivity('sayHello', 'Tokyo'),
        context.df.callActivity('sayHello', 'Seattle'),
        context.df.callActivity('sayHello', 'London'),
    ];
    
    // Fan-in: Wait for all tasks to complete
    const results = yield context.df.Task.all(tasks);
    
    return results;
});
```

## src/functions/sayHello.js

```javascript
const df = require('durable-functions');

// Activity function - individual work unit
df.app.activity('sayHello', {
    handler: (input) => {
        console.log(`Processing: ${input}`);
        return `Hello, ${input}!`;
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
            jsonBody: { status: 'healthy', type: 'durable' }
        };
    },
});
```

## package.json additions

```json
{
  "dependencies": {
    "@azure/functions": "^4.0.0",
    "durable-functions": "^3.0.0"
  }
}
```

## Local Testing

Set these in `local.settings.json`:
```json
{
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node"
  }
}
```
