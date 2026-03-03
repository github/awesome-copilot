# Queue Storage — TypeScript SDK Quick Reference

> Condensed from **azure-storage-queue-ts**. Full patterns (SAS generation,
> poison message handling, visibility extension, message encoding)
> in the **azure-storage-queue-ts** plugin skill if installed.

## Install
npm install @azure/storage-queue @azure/identity

## Quick Start
```typescript
import { QueueServiceClient } from "@azure/storage-queue";
import { DefaultAzureCredential } from "@azure/identity";
const client = new QueueServiceClient(`https://${accountName}.queue.core.windows.net`, new DefaultAzureCredential());
```

## Best Practices
- Use DefaultAzureCredential for **local development only** — in production, use ManagedIdentityCredential. See [auth-best-practices.md](../auth-best-practices.md)
- Always delete after processing — prevent duplicate processing
- Handle poison messages — move failed messages to a dead-letter queue
- Use appropriate visibility timeout — set based on expected processing time
- Extend visibility for long tasks — update message to prevent timeout
- Use JSON for structured data — serialize objects to JSON strings
- Check dequeueCount — detect repeatedly failing messages
- Use batch receive — receive multiple messages for efficiency
