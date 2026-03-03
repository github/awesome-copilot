# TypeScript Blob Trigger with Event Grid

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

**src/functions/processBlobUpload.ts:**
```typescript
import '@azure/functions-extensions-blob';
import { app, input, InvocationContext } from '@azure/functions';
import { StorageBlobClient } from '@azure/functions-extensions-blob';

const blobInput = input.storageBlob({
    path: 'processed-pdf',
    connection: 'PDFProcessorSTORAGE',
    sdkBinding: true,
});

export async function processBlobUpload(
    sourceStorageBlobClient: StorageBlobClient,
    context: InvocationContext
): Promise<void> {
    const blobName = context.triggerMetadata?.name as string;
    const fileSize = (await sourceStorageBlobClient.blobClient.getProperties()).contentLength;
    
    context.log(`Blob Trigger (Event Grid) processed blob\n Name: ${blobName} \n Size: ${fileSize} bytes`);
    
    try {
        const destinationStorageBlobClient = context.extraInputs.get(blobInput) as StorageBlobClient;

        if (!destinationStorageBlobClient) {
            throw new Error('StorageBlobClient is not available.');
        }

        const newBlobName = `processed-${blobName}`;
        const destinationBlobClient = destinationStorageBlobClient.containerClient.getBlobClient(newBlobName);
        
        // Idempotency check - skip if already processed
        const exists = await destinationBlobClient.exists();
        if (exists) {
            context.log(`Blob ${newBlobName} already exists. Skipping.`);
            return;
        }

        // Download and upload to processed container
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

## Files to Remove

- `src/functions/httpTrigger.ts` (or equivalent)

## App Settings Required

```bicep
PDFProcessorSTORAGE__blobServiceUri: 'https://${storage.name}.blob.${environment().suffixes.storage}/'
PDFProcessorSTORAGE__credential: 'managedidentity'
PDFProcessorSTORAGE__clientId: uamiClientId
```

## Test

Upload a file to the `unprocessed-pdf` container:

```bash
az storage blob upload \
  --account-name <storage> \
  --container-name unprocessed-pdf \
  --file ./sample.pdf \
  --name sample.pdf \
  --auth-mode login
```

Check that `processed-sample.pdf` appears in `processed-pdf` container.

## Common Patterns

- [Node.js Entry Point](../../common/nodejs-entry-point.md) — **REQUIRED** src/index.ts setup + build
- [Error Handling](../../common/error-handling.md) — Try/catch + logging patterns
- [Health Check](../../common/health-check.md) — Health endpoint for monitoring
- [UAMI Bindings](../../common/uami-bindings.md) — Managed identity settings
