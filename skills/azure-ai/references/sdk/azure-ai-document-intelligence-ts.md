# Azure Document Intelligence — TypeScript SDK Quick Reference

> Condensed from **azure-ai-document-intelligence-ts**. Full patterns (custom models, classifiers, batch polling)
> in the **azure-ai-document-intelligence-ts** plugin skill if installed.

## Install
```bash
npm install @azure-rest/ai-document-intelligence @azure/identity
```

## Quick Start

> **Auth:** `DefaultAzureCredential` is for local development. See [auth-best-practices.md](../auth-best-practices.md) for production patterns.

```typescript
import DocumentIntelligence, { isUnexpected, getLongRunningPoller, AnalyzeOperationOutput } from "@azure-rest/ai-document-intelligence";
const client = DocumentIntelligence(endpoint, new DefaultAzureCredential());
```

## Non-Obvious Patterns
- REST client — `DocumentIntelligence` is a function, not a class
- Analyze path: `client.path("/documentModels/{modelId}:analyze", "prebuilt-layout").post({...})`
- Must use `getLongRunningPoller(client, initialResponse)` then `poller.pollUntilDone()`
- Local file: send as `base64Source` in body, not as binary stream
- Pagination: `import { paginate } from "@azure-rest/ai-document-intelligence"`

## Best Practices
1. Use `getLongRunningPoller()` — document analysis is async, always poll
2. Check `isUnexpected()` — type guard for proper error handling
3. Choose the right model — prebuilt when possible, custom for specialized docs
4. Handle confidence scores — set thresholds for your use case
5. Use `paginate()` helper for listing models
6. Prefer neural mode for custom models over template
