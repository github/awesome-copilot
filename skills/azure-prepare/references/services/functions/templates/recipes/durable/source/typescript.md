# TypeScript Durable Functions

Replace the contents of `src/functions/` with these files.

> ⚠️ **IMPORTANT**: Do NOT delete `src/index.ts` — it's required for function discovery. See [nodejs-entry-point.md](../../common/nodejs-entry-point.md).

> 📦 **Build Required**: Run `npm run build` before deployment to compile TypeScript to `dist/`.

## src/functions/httpStart.ts

```typescript
import { app, HttpHandler, HttpRequest, HttpResponse, InvocationContext } from '@azure/functions';
import * as df from 'durable-functions';

// HTTP endpoint to start an orchestration
const httpStart: HttpHandler = async (request: HttpRequest, context: InvocationContext): Promise<HttpResponse> => {
    const client = df.getClient(context);
    const functionName = request.params.name || 'helloOrchestrator';
    
    let inputData: unknown = undefined;
    try {
        inputData = await request.json();
    } catch {
        // No body or invalid JSON
    }
    
    const instanceId = await client.startNew(functionName, { input: inputData });
    context.log(`Started orchestration with ID = '${instanceId}'`);
    
    return client.createCheckStatusResponse(request, instanceId);
};

app.http('httpStart', {
    route: 'orchestrators/{name}',
    methods: ['POST'],
    authLevel: 'function',
    extraInputs: [df.input.durableClient()],
    handler: httpStart,
});
```

## src/functions/helloOrchestrator.ts

```typescript
import * as df from 'durable-functions';
import { OrchestrationContext, OrchestrationHandler } from 'durable-functions';

// Orchestrator function - coordinates the workflow
const helloOrchestrator: OrchestrationHandler = function* (context: OrchestrationContext) {
    // Fan-out: Call activities in parallel
    const tasks = [
        context.df.callActivity('sayHello', 'Tokyo'),
        context.df.callActivity('sayHello', 'Seattle'),
        context.df.callActivity('sayHello', 'London'),
    ];
    
    // Fan-in: Wait for all tasks to complete
    const results: string[] = yield context.df.Task.all(tasks);
    
    return results;
};

df.app.orchestration('helloOrchestrator', helloOrchestrator);
```

## src/functions/sayHello.ts

```typescript
import * as df from 'durable-functions';
import { ActivityHandler } from 'durable-functions';

// Activity function - individual work unit
const sayHello: ActivityHandler = (input: string): string => {
    console.log(`Processing: ${input}`);
    return `Hello, ${input}!`;
};

df.app.activity('sayHello', { handler: sayHello });
```

## src/functions/healthCheck.ts

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function healthCheck(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    return {
        status: 200,
        jsonBody: { status: 'healthy', type: 'durable' }
    };
}

app.http('healthCheck', {
    methods: ['GET'],
    route: 'health',
    authLevel: 'function',
    handler: healthCheck,
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
