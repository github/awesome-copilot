# Key Vault Keys — .NET SDK Quick Reference

> Condensed from **azure-security-keyvault-keys-dotnet**. Full patterns
> (crypto operations, key rotation, backup/restore, HSM, KeyResolver)
> in the **azure-security-keyvault-keys-dotnet** plugin skill if installed.

## Install
dotnet add package Azure.Security.KeyVault.Keys
dotnet add package Azure.Identity

## Quick Start
```csharp
using Azure.Security.KeyVault.Keys;
using Azure.Identity;
var client = new KeyClient(new Uri("https://<vault>.vault.azure.net"), new DefaultAzureCredential());
```

## Best Practices
- Use DefaultAzureCredential for **local development only**. In production, use ManagedIdentityCredential — see [auth-best-practices.md](../auth-best-practices.md)
- Enable soft-delete — protect against accidental deletion
- Use HSM-backed keys — set `HardwareProtected = true` for sensitive keys
- Implement key rotation — use automatic rotation policies
- Limit key operations — only enable required KeyOperations
- Set expiration dates — always set ExpiresOn for keys
- Use specific versions — pin to versions in production
- Cache CryptographyClient — reuse for multiple operations
