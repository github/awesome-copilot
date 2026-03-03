# Key Vault Keys — TypeScript SDK Quick Reference

> Condensed from **azure-keyvault-keys-ts**. Full patterns (crypto operations,
> key rotation policies, backup/restore, CryptographyClient)
> in the **azure-keyvault-keys-ts** plugin skill if installed.

## Install
npm install @azure/keyvault-keys @azure/identity

## Quick Start
```typescript
import { KeyClient } from "@azure/keyvault-keys";
import { DefaultAzureCredential } from "@azure/identity";
const keyClient = new KeyClient(`https://${vaultName}.vault.azure.net`, new DefaultAzureCredential());
```

## Best Practices
- Use DefaultAzureCredential for **local development only**. In production, use ManagedIdentityCredential — see [auth-best-practices.md](../auth-best-practices.md)
- Enable soft-delete — required for production vaults
- Set expiration dates on keys
- Use key rotation policies — automate key rotation
- Limit key operations — only grant needed operations (encrypt, sign, etc.)
- Browser not supported — this SDK is Node.js only
