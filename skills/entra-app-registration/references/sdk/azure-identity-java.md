# Authentication — Java SDK Quick Reference

> Condensed from **azure-identity-java**. Full patterns (workload identity,
> certificate auth, device code, sovereign clouds)
> in the **azure-identity-java** plugin skill if installed.

## Install
```xml
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-identity</artifactId>
    <version>1.15.0</version>
</dependency>
```

## Quick Start
> **Auth:** `DefaultAzureCredential` is for local development. See [auth-best-practices.md](../auth-best-practices.md) for production patterns.

```java
import com.azure.identity.DefaultAzureCredentialBuilder;
var credential = new DefaultAzureCredentialBuilder().build();
```

## Best Practices
- Use DefaultAzureCredential for **local development only** (CLI, PowerShell, VS Code). In production, use ManagedIdentityCredential — see [auth-best-practices.md](../auth-best-practices.md)
- Managed identity in production — no secrets to manage, automatic rotation
- Azure CLI for local dev — run `az login` before running your app
- Least privilege — grant only required permissions to service principals
- Token caching — enabled by default, reduces auth round-trips
- Environment variables — use for CI/CD, not hardcoded secrets
