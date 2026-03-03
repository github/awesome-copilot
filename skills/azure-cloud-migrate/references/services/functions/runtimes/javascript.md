# JavaScript (Node.js) — Azure Functions v4 Triggers & Bindings

> **Model**: JavaScript v4 programming model. **NO** `function.json` files.
> Import: `const { app, input, output } = require('@azure/functions');`

## Lambda Migration Rules

> Shared rules (bindings over SDKs, latest runtime, identity-first auth) → [global-rules.md](../global-rules.md)

JS-specific:
- Use `extraInputs` / `extraOutputs` with binding path expressions (e.g., `{queueTrigger}`) for dynamic blob I/O
- Access metadata via `context.triggerMetadata`
- `package.json`: `"@azure/functions": "^4.0.0"`

### Correct Migration Pattern

```javascript
const { app, input, output } = require('@azure/functions');

// Use bindings for blob I/O instead of BlobServiceClient SDK
const blobInput = input.storageBlob({
  path: 'source-container/{queueTrigger}',
  connection: 'AzureWebJobsStorage'
});

const blobOutput = output.storageBlob({
  path: 'destination-container/{queueTrigger}',
  connection: 'AzureWebJobsStorage'
});

app.storageQueue('processImage', {
  queueName: 'image-processing',
  connection: 'AzureWebJobsStorage',
  extraInputs: [blobInput],
  extraOutputs: [blobOutput],
  handler: async (queueItem, context) => {
    const sourceBlob = context.extraInputs.get(blobInput);
    context.log(`Processing blob: ${queueItem}`);
    // Process the blob...
    context.extraOutputs.set(blobOutput, processedBuffer);
  }
});
```

> ❌ Do NOT use legacy v1-v3 `module.exports` — always use `app.*()` registration.

## HTTP Trigger

```javascript
app.http('httpFunction', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const name = request.query.get('name') || (await request.text());
    return { body: `Hello, ${name}!` };
  }
});
```

## Blob Storage

```javascript
// Trigger (use EventGrid source for reliability)
app.storageBlob('blobTrigger', {
  path: 'samples-workitems/{name}',
  connection: 'AzureWebJobsStorage',
  source: 'EventGrid',
  handler: async (blob, context) => {
    context.log(`Blob: ${context.triggerMetadata.name}, Size: ${blob.length}`);
  }
});

// Input binding
const blobInput = input.storageBlob({
  path: 'samples-workitems/{queueTrigger}',
  connection: 'AzureWebJobsStorage'
});

// Output binding
const blobOutput = output.storageBlob({
  path: 'samples-output/{name}-out',
  connection: 'AzureWebJobsStorage'
});
```

> **⚠️ Flex Consumption + EventGrid Source Requirements:**
> When using `source: 'EventGrid'` on a Flex Consumption plan, three infrastructure requirements MUST be met or the trigger will silently fail:
>
> 1. **Always-ready instances**: Configure `alwaysReady: [{ name: 'blob', instanceCount: 1 }]` in Bicep. Without this, the trigger group never starts and the Event Grid webhook endpoint is never registered.
> 2. **Queue endpoint**: Set `AzureWebJobsStorage__queueServiceUri` in app settings. The blob extension uses queues internally for poison-message tracking with EventGrid source, even though you're not using a queue trigger.
> 3. **Event Grid subscription via Bicep/ARM**: Do NOT create event subscriptions via CLI — webhook validation times out on Flex Consumption. Deploy as a Bicep resource using `listKeys()` to obtain the `blobs_extension` system key.
>
> See [lambda-to-functions.md](../lambda-to-functions.md#flex-consumption--blob-trigger-with-eventgrid-source) for full Bicep patterns.

### Using Azure AI Services with UAMI

When calling Azure AI services (Computer Vision, etc.) from a function, use `DefaultAzureCredential` with explicit UAMI client ID:

```javascript
const { DefaultAzureCredential } = require('@azure/identity');
const createClient = require('@azure-rest/ai-vision-image-analysis').default;

const credential = new DefaultAzureCredential({
  managedIdentityClientId: process.env.AZURE_CLIENT_ID  // Required for UAMI
});
const client = createClient(process.env.COMPUTER_VISION_ENDPOINT, credential);

const result = await client.path('/imageanalysis:analyze').post({
  body: { url: blobUrl },
  queryParameters: { features: ['People'] }  // Use 'People' for face detection
});
```

> **Note**: `@azure-rest/ai-vision-image-analysis` is still in beta. Pin explicitly: `"1.0.0-beta.3"` — the `^1.0.0` semver range does NOT resolve.

## Queue Storage

```javascript
// Trigger
app.storageQueue('queueTrigger', {
  queueName: 'myqueue-items',
  connection: 'AzureWebJobsStorage',
  handler: async (queueItem, context) => {
    context.log('Queue item:', queueItem);
  }
});

// Output
const queueOutput = output.storageQueue({
  queueName: 'outqueue',
  connection: 'AzureWebJobsStorage'
});
```

## Timer

```javascript
app.timer('timerFunction', {
  schedule: '0 */5 * * * *', // Every 5 minutes (NCRONTAB)
  handler: async (myTimer, context) => {
    context.log('Timer fired at:', myTimer.scheduleStatus.last);
  }
});
```

## Event Grid

```javascript
// Trigger
app.eventGrid('eventGridTrigger', {
  handler: async (event, context) => {
    context.log('Event:', event.subject, event.eventType);
  }
});

// Output
const eventGridOutput = output.eventGrid({
  topicEndpointUri: 'MyEventGridTopicUriSetting',
  topicKeySetting: 'MyEventGridTopicKeySetting'
});
```

## Cosmos DB

```javascript
// Trigger (Change Feed)
app.cosmosDB('cosmosDBTrigger', {
  connectionStringSetting: 'CosmosDBConnection',
  databaseName: 'mydb',
  containerName: 'mycontainer',
  createLeaseContainerIfNotExists: true,
  handler: async (documents, context) => {
    documents.forEach(doc => context.log('Changed doc:', doc.id));
  }
});

// Input
const cosmosInput = input.cosmosDB({
  connectionStringSetting: 'CosmosDBConnection',
  databaseName: 'mydb',
  containerName: 'mycontainer',
  id: '{id}',
  partitionKey: '{partitionKey}'
});

// Output
const cosmosOutput = output.cosmosDB({
  connectionStringSetting: 'CosmosDBConnection',
  databaseName: 'mydb',
  containerName: 'mycontainer'
});
```

## Service Bus

```javascript
// Queue Trigger
app.serviceBusQueue('sbQueueTrigger', {
  queueName: 'myqueue',
  connection: 'ServiceBusConnection',
  handler: async (message, context) => {
    context.log('Message:', message);
  }
});

// Topic Trigger
app.serviceBusTopic('sbTopicTrigger', {
  topicName: 'mytopic',
  subscriptionName: 'mysubscription',
  connection: 'ServiceBusConnection',
  handler: async (message, context) => {
    context.log('Topic message:', message);
  }
});

// Output
const sbOutput = output.serviceBusQueue({
  queueName: 'outqueue',
  connection: 'ServiceBusConnection'
});
```

## Event Hubs

```javascript
// Trigger
app.eventHub('eventHubTrigger', {
  eventHubName: 'myeventhub',
  connection: 'EventHubConnection',
  cardinality: 'many',
  handler: async (events, context) => {
    events.forEach(event => context.log('Event:', event));
  }
});

// Output
const ehOutput = output.eventHub({
  eventHubName: 'outeventhub',
  connection: 'EventHubConnection'
});
```

## Table Storage

```javascript
// Input
const tableInput = input.table({
  tableName: 'mytable',
  partitionKey: '{partitionKey}',
  rowKey: '{rowKey}',
  connection: 'AzureWebJobsStorage'
});

// Output
const tableOutput = output.table({
  tableName: 'mytable',
  connection: 'AzureWebJobsStorage'
});
```

## SQL

```javascript
// Trigger
app.generic('sqlTrigger', {
  trigger: { type: 'sqlTrigger', tableName: 'dbo.MyTable', connectionStringSetting: 'SqlConnection' },
  handler: async (changes, context) => {
    changes.forEach(change => context.log('Change:', change));
  }
});

// Input
const sqlInput = input.sql({
  commandText: 'SELECT * FROM dbo.MyTable WHERE Id = @Id',
  commandType: 'Text',
  parameters: '@Id={id}',
  connectionStringSetting: 'SqlConnection'
});

// Output
const sqlOutput = output.sql({
  commandText: 'dbo.MyTable',
  connectionStringSetting: 'SqlConnection'
});
```

## SignalR

```javascript
// Output
const signalROutput = output.generic({
  type: 'signalR',
  hubName: 'myhub',
  connectionStringSetting: 'AzureSignalRConnectionString'
});
```

## SendGrid

```javascript
const sendGridOutput = output.generic({
  type: 'sendGrid',
  apiKey: 'SendGridApiKey',
  from: 'noreply@example.com',
  to: '{email}'
});
```

## Using Bindings with Functions

```javascript
// Combine trigger with input/output bindings
app.http('processItem', {
  methods: ['POST'],
  extraInputs: [cosmosInput],
  extraOutputs: [queueOutput],
  handler: async (request, context) => {
    const doc = context.extraInputs.get(cosmosInput);
    context.extraOutputs.set(queueOutput, JSON.stringify(doc));
    return { body: 'Processed' };
  }
});
```

> Full reference: [Azure Functions JavaScript developer guide](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node)
