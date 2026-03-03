# App Configuration — Java SDK Quick Reference

> Condensed from **azure-appconfiguration-java**. Full patterns (feature flags,
> secret references, snapshots, async client, conditional requests)
> in the **azure-appconfiguration-java** plugin skill if installed.

## Install
```xml
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-data-appconfiguration</artifactId>
    <version>1.8.0</version>
</dependency>
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-identity</artifactId>
</dependency>
```

## Quick Start

> **Auth:** `DefaultAzureCredential` is for local development. See [auth-best-practices.md](../auth-best-practices.md) for production patterns.

```java
import com.azure.data.appconfiguration.ConfigurationClientBuilder;
import com.azure.identity.DefaultAzureCredentialBuilder;
var client = new ConfigurationClientBuilder()
    .credential(new DefaultAzureCredentialBuilder().build())
    .endpoint(System.getenv("AZURE_APPCONFIG_ENDPOINT"))
    .buildClient();
```

## Best Practices
- Use labels — separate configurations by environment (Dev, Staging, Production)
- Use snapshots — create immutable snapshots for releases
- Feature flags — use for gradual rollouts and A/B testing
- Secret references — store sensitive values in Key Vault
- Conditional requests — use ETags for optimistic concurrency
- Read-only protection — lock critical production settings
- Use Entra ID — preferred over connection strings
- Async client — use for high-throughput scenarios
