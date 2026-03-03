# Key Vault Secrets — Java SDK Quick Reference

> Condensed from **azure-security-keyvault-secrets-java**. Full patterns
> (async client, secret rotation, backup/restore, config loader)
> in the **azure-security-keyvault-secrets-java** plugin skill if installed.

## Install
```xml
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-security-keyvault-secrets</artifactId>
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
import com.azure.security.keyvault.secrets.SecretClientBuilder;
import com.azure.identity.DefaultAzureCredentialBuilder;
var secretClient = new SecretClientBuilder()
    .vaultUrl("https://<vault>.vault.azure.net")
    .credential(new DefaultAzureCredentialBuilder().build())
    .buildClient();
```

## Best Practices
- Enable soft delete — protects against accidental deletion
- Use tags — tag secrets with environment, service, owner
- Set expiration — use `setExpiresOn()` for credentials that should rotate
- Content type — set contentType to indicate format (e.g., application/json)
- Version management — don't delete old versions immediately during rotation
- Access logging — enable diagnostic logging on Key Vault
- Least privilege — use separate vaults for different environments
