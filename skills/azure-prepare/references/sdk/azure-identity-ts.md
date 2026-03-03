# Authentication — TypeScript SDK Quick Reference

> Condensed from **azure-identity-ts**. Full patterns (sovereign clouds,
> device code flow, custom credentials, bearer token provider)
> in the **azure-identity-ts** plugin skill if installed.

## Install
npm install @azure/identity

## Quick Start

> **Auth:** `DefaultAzureCredential` is for local development. See [auth-best-practices.md](../auth-best-practices.md) for production patterns.

```typescript
import { DefaultAzureCredential } from "@azure/identity";
const credential = new DefaultAzureCredential();
```

## Best Practices
- Use DefaultAzureCredential for **local development only** (CLI, PowerShell, VS Code). In production, use ManagedIdentityCredential — see [auth-best-practices.md](../auth-best-practices.md)
- Never hardcode credentials — use environment variables or managed identity
- Prefer managed identity — no secrets to manage in production
- Scope credentials appropriately — use user-assigned identity for multi-tenant scenarios
- Handle token refresh — Azure SDK handles this automatically
- Use ChainedTokenCredential for custom fallback scenarios
