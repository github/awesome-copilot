# TypeScript Event Hub Trigger

## Source Code

Replace `src/functions/*.ts` with:

```typescript
import { app, EventHubHandler, HttpRequest, HttpResponseInit, InvocationContext, output } from "@azure/functions";

// Event Hub output binding
const eventHubOutput = output.eventHub({
    eventHubName: '%EVENTHUB_NAME%',
    connection: 'EventHubConnection'
});

// Event Hub Trigger - processes events from Event Hub
const eventHubTrigger: EventHubHandler = async (messages, context) => {
    // Handle both single message and batch
    const events = Array.isArray(messages) ? messages : [messages];
    
    for (const event of events) {
        context.log(`Event Hub trigger processed event: ${JSON.stringify(event)}`);
        context.log(`  EnqueuedTimeUtc: ${context.triggerMetadata?.enqueuedTimeUtcArray}`);
        context.log(`  SequenceNumber: ${context.triggerMetadata?.sequenceNumberArray}`);
    }
};

app.eventHub('eventhubTrigger', {
    eventHubName: '%EVENTHUB_NAME%',
    connection: 'EventHubConnection',
    consumerGroup: '%EVENTHUB_CONSUMER_GROUP%',
    cardinality: 'many',
    handler: eventHubTrigger
});

// HTTP endpoint to send events to Event Hub
app.http('sendEvent', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'send',
    extraOutputs: [eventHubOutput],
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        let body: object;
        try {
            body = await request.json() as object;
        } catch {
            body = { message: await request.text() || 'Hello Event Hub!' };
        }

        const eventData = JSON.stringify(body);
        context.extraOutputs.set(eventHubOutput, eventData);
        
        context.log(`Sent event to Event Hub: ${eventData}`);
        
        return {
            status: 200,
            jsonBody: { status: 'sent', data: body }
        };
    }
});

// Health check endpoint
app.http('health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'health',
    handler: async (): Promise<HttpResponseInit> => {
        return { status: 200, body: 'OK' };
    }
});
```

## Files to Remove

- `src/functions/httpGetFunction.ts`
- `src/functions/httpPostFunction.ts`
- Any other HTTP trigger files from base template

## Package Dependencies

No additional packages required - Event Hubs bindings are included in the extension bundle.

## Configuration Notes

- `%EVENTHUB_NAME%` - Reads from app setting at runtime
- `%EVENTHUB_CONSUMER_GROUP%` - Reads from app setting at runtime
- `connection: 'EventHubConnection'` - Uses settings prefixed with `EventHubConnection__`
- `cardinality: 'many'` - Batch processing for better throughput

## Common Patterns

- [Node.js Entry Point](../../common/nodejs-entry-point.md) — **REQUIRED** src/index.ts setup + build
- [Error Handling](../../common/error-handling.md) — Try/catch + logging patterns
- [Health Check](../../common/health-check.md) — Health endpoint for monitoring
- [UAMI Bindings](../../common/uami-bindings.md) — Managed identity settings
