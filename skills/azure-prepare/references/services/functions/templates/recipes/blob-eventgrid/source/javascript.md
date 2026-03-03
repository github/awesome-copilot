# JavaScript Blob Trigger with Event Grid

## Dependencies

**package.json:**
```json
{
  "dependencies": {
    "@azure/functions": "^4.0.0",
    "@azure/functions-extensions-blob": "^1.0.0"
  }
}
```

## Source Code

**src/functions/processBlobUpload.js:**
```javascript
require('@azure/functions-extensions-blob');
const { app, input } = require('@azure/functions');

const blobInput = input.storageBlob({
    path: 'processed-pdf',
    connection: 'PDFProcessorSTORAGE',
    sdkBinding: true,
});

async function processBlobUpload(sourceStorageBlobClient, context) {
    const blobName = context.triggerMetadata?.name;
    const props = await sourceStorageBlobClient.blobClient.getProperties();
    const fileSize = props.contentLength;
    
    context.log(`Blob Trigger (Event Grid) processed blob\n Name: ${blobName} \n Size: ${fileSize} bytes`);
    
    try {
        const destinationStorageBlobClient = context.extraInputs.get(blobInput);

        if (!destinationStorageBlobClient) {
            throw new Error('StorageBlobClient is not available.');
        }

        const newBlobName = `processed-${blobName}`;
        const destinationBlobClient = destinationStorageBlobClient.containerClient.getBlobClient(newBlobName);
        
        const exists = await destinationBlobClient.exists();
        if (exists) {
            context.log(`Blob ${newBlobName} already exists. Skipping.`);
            return;
        }

        const downloadResponse = await sourceStorageBlobClient.blobClient.downloadToBuffer();
        await destinationStorageBlobClient.containerClient.uploadBlockBlob(newBlobName, downloadResponse, fileSize);
        
        context.log(`Processing complete for ${blobName}. Copied to ${newBlobName}.`);
    } catch (error) {
        context.error(`Error processing blob ${blobName}:`, error);
        throw error;
    }
}

app.storageBlob('processBlobUpload', {
    path: 'unprocessed-pdf/{name}',
    connection: 'PDFProcessorSTORAGE',
    extraInputs: [blobInput],
    source: 'EventGrid',
    sdkBinding: true,
    handler: processBlobUpload
});
```

**src/functions/health.js:**
```javascript
const { app } = require('@azure/functions');

app.http('health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async () => ({
        status: 200,
        jsonBody: { status: 'healthy', trigger: 'blob-eventgrid' }
    })
});
```

## Files to Remove

- `src/functions/httpTrigger.js`

## Common Patterns

- [Node.js Entry Point](../../common/nodejs-entry-point.md) — **REQUIRED** src/index.js setup
- [Error Handling](../../common/error-handling.md) — Try/catch + logging patterns
- [Health Check](../../common/health-check.md) — Health endpoint for monitoring
- [UAMI Bindings](../../common/uami-bindings.md) — Managed identity settings
