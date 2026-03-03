# Azure AI Content Safety — TypeScript SDK Quick Reference

> Condensed from **azure-ai-contentsafety-ts**. Full patterns (blocklist CRUD, image moderation, severity thresholds)
> in the **azure-ai-contentsafety-ts** plugin skill if installed.

## Install
```bash
npm install @azure-rest/ai-content-safety @azure/identity @azure/core-auth
```

## Quick Start
```typescript
import ContentSafetyClient, { isUnexpected } from "@azure-rest/ai-content-safety";
import { AzureKeyCredential } from "@azure/core-auth";
const client = ContentSafetyClient(endpoint, new AzureKeyCredential(key));
```

## Non-Obvious Patterns
- REST client — `ContentSafetyClient` is a function, not a class
- Text: `client.path("/text:analyze").post({ body: { text, categories: [...] } })`
- Image: `client.path("/image:analyze").post({ body: { image: { content: base64 } } })`
- Blocklist create: `.path("/text/blocklists/{blocklistName}", name).patch({...})`
- API key import: `AzureKeyCredential` from `@azure/core-auth` (not `@azure/identity`)

## Best Practices
1. Always use `isUnexpected()` — type guard for error handling
2. Set appropriate thresholds — different categories may need different severity levels
3. Use blocklists for domain-specific terms to supplement AI detection
4. Log moderation decisions — keep audit trail for compliance
5. Handle edge cases — empty text, very long text, unsupported image formats
