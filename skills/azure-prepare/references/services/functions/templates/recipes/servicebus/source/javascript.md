# JavaScript Service Bus Trigger

Replace the contents of `src/functions/` with these files.

> ⚠️ **IMPORTANT**: Do NOT delete `src/index.js` — it's required for function discovery. See [nodejs-entry-point.md](../../common/nodejs-entry-point.md).

## src/functions/serviceBusTrigger.js

```javascript
const { app } = require('@azure/functions');

app.serviceBusQueue('serviceBusTrigger', {
    connection: 'ServiceBusConnection',
    queueName: '%SERVICEBUS_QUEUE_NAME%',
    handler: (message, context) => {
        context.log('Service Bus trigger processed message:', message);
        context.log('MessageId =', context.triggerMetadata.messageId);
        context.log('DeliveryCount =', context.triggerMetadata.deliveryCount);
        context.log('EnqueuedTimeUtc =', context.triggerMetadata.enqueuedTimeUtc);
    },
});
```

## src/functions/sendMessage.js

```javascript
const { app, output } = require('@azure/functions');

const serviceBusOutput = output.serviceBusQueue({
    queueName: '%SERVICEBUS_QUEUE_NAME%',
    connection: 'ServiceBusConnection',
});

app.http('sendMessage', {
    methods: ['POST'],
    route: 'send',
    authLevel: 'function',
    extraOutputs: [serviceBusOutput],
    handler: async (request, context) => {
        try {
            const body = await request.json();
            const messageContent = JSON.stringify(body);
            
            context.extraOutputs.set(serviceBusOutput, messageContent);
            context.log(`Sent message to Service Bus: ${messageContent}`);
            
            return {
                status: 200,
                jsonBody: { status: 'sent', data: body }
            };
        } catch (error) {
            return {
                status: 400,
                jsonBody: { error: 'Invalid JSON' }
            };
        }
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
                queue: process.env.SERVICEBUS_QUEUE_NAME || 'not-set'
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

## Files to Remove

- Any existing HTTP trigger files from the base template

## Local Testing

Set these in `local.settings.json`:
```json
{
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "ServiceBusConnection__fullyQualifiedNamespace": "<namespace>.servicebus.windows.net",
    "SERVICEBUS_QUEUE_NAME": "orders"
  }
}
```

## Common Patterns

- [Node.js Entry Point](../../common/nodejs-entry-point.md) — **REQUIRED** src/index.js setup
- [Error Handling](../../common/error-handling.md) — Try/catch + logging patterns
- [Health Check](../../common/health-check.md) — Health endpoint for monitoring
- [UAMI Bindings](../../common/uami-bindings.md) — Managed identity settings
