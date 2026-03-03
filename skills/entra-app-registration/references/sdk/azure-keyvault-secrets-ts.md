# Key Vault Secrets — TypeScript SDK Quick Reference

> Condensed from **azure-keyvault-secrets-ts**. Full patterns (key rotation,
> cryptographic operations, backup/restore, wrap/unwrap)
> in the **azure-keyvault-secrets-ts** plugin skill if installed.

## Install
npm install @azure/keyvault-secrets @azure/identity

## Quick Start
```typescript
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";
const client = new SecretClient("https://<vault>.vault.azure.net", new DefaultAzureCredential());
```

## Best Practices
- Use DefaultAzureCredential for **local development only**. In production, use ManagedIdentityCredential — see [auth-best-practices.md](../auth-best-practices.md)
- Enable soft-delete — required for production vaults
- Set expiration dates on both keys and secrets
- Use key rotation policies — automate key rotation
- Limit key operations — only grant needed operations (encrypt, sign, etc.)
- Browser not supported — these SDKs are Node.js only
