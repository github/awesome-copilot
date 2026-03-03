# Redis Management — .NET SDK Quick Reference

> Condensed from **azure-resource-manager-redis-dotnet**. Full patterns
> (cache creation, firewall rules, access keys, geo-replication, patching)
> in the **azure-resource-manager-redis-dotnet** plugin skill if installed.

## Install
dotnet add package Azure.ResourceManager.Redis
dotnet add package Azure.Identity

## Quick Start

> **Auth:** `DefaultAzureCredential` is for local development. See [auth-best-practices.md](../auth-best-practices.md) for production patterns.

```csharp
using Azure.ResourceManager;
using Azure.Identity;
var armClient = new ArmClient(new DefaultAzureCredential());
```

## Best Practices
- Use `WaitUntil.Completed` for operations that must finish before proceeding
- Use `WaitUntil.Started` when you want to poll manually or run operations in parallel
- Use DefaultAzureCredential for **local development only**. In production, use ManagedIdentityCredential — see [auth-best-practices.md](../auth-best-practices.md)
- Handle `RequestFailedException` for ARM API errors
- Use `CreateOrUpdateAsync` for idempotent operations
- Navigate hierarchy via `Get*` methods (e.g., `cache.GetRedisFirewallRules()`)
- Use Premium SKU for production workloads requiring geo-replication, clustering, or persistence
- Enable TLS 1.2 minimum — set `MinimumTlsVersion = RedisTlsVersion.Tls1_2`
- Disable non-SSL port — set `EnableNonSslPort = false` for security
- Rotate keys regularly — use `RegenerateKeyAsync` and update connection strings
