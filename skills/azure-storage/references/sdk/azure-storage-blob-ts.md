# Blob Storage — TypeScript SDK Quick Reference

> Condensed from **azure-storage-blob-ts**. Full patterns (SAS generation,
> append/page blobs, streaming, browser uploads, error handling)
> in the **azure-storage-blob-ts** plugin skill if installed.

## Install
npm install @azure/storage-blob @azure/identity

## Quick Start
```typescript
import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
const client = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, new DefaultAzureCredential());
```

## Best Practices
- Use DefaultAzureCredential for **local development only** — in production, use ManagedIdentityCredential. See [auth-best-practices.md](../auth-best-practices.md)
- Use streaming for large files — `uploadStream`/`downloadToFile` for files > 256MB
- Set appropriate content types — use `setHTTPHeaders` for correct MIME types
- Use SAS tokens for client access — generate short-lived tokens for browser uploads
- Handle errors gracefully — check `RestError.statusCode` for specific handling
- Use `*IfNotExists` methods for idempotent container/blob creation
- Close clients — good practice in long-running apps
