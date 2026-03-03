# Key Vault Keys — Java SDK Quick Reference

> Condensed from **azure-security-keyvault-keys-java**. Full patterns
> (crypto operations, HSM keys, key rotation, backup/restore, import)
> in the **azure-security-keyvault-keys-java** plugin skill if installed.

## Install
```xml
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-security-keyvault-keys</artifactId>
    <version>4.9.0</version>
</dependency>
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-identity</artifactId>
</dependency>
```

## Quick Start

> **Auth:** `DefaultAzureCredential` is for local development. See [auth-best-practices.md](../auth-best-practices.md) for production patterns.

```java
import com.azure.security.keyvault.keys.KeyClientBuilder;
import com.azure.identity.DefaultAzureCredentialBuilder;
var keyClient = new KeyClientBuilder()
    .vaultUrl("https://<vault>.vault.azure.net")
    .credential(new DefaultAzureCredentialBuilder().build())
    .buildClient();
```

## Best Practices
- Use HSM keys for production — set `setHardwareProtected(true)` for sensitive keys
- Enable soft delete — protects against accidental deletion
- Key rotation — set up automatic rotation policies
- Least privilege — use separate keys for different operations
- Local crypto when possible — use CryptographyClient with local key material to reduce round-trips
