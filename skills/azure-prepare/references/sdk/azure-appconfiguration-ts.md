# App Configuration — TypeScript SDK Quick Reference

> Condensed from **azure-appconfiguration-ts**. Full patterns (provider,
> dynamic refresh, Key Vault references, feature flags, snapshots)
> in the **azure-appconfiguration-ts** plugin skill if installed.

## Install
npm install @azure/app-configuration @azure/identity

## Quick Start

> **Auth:** `DefaultAzureCredential` is for local development. See [auth-best-practices.md](../auth-best-practices.md) for production patterns.

```typescript
import { AppConfigurationClient } from "@azure/app-configuration";
import { DefaultAzureCredential } from "@azure/identity";
const client = new AppConfigurationClient(process.env.AZURE_APPCONFIG_ENDPOINT!, new DefaultAzureCredential());
```

## Best Practices
- Use provider for apps — @azure/app-configuration-provider for runtime config
- Use low-level for management — @azure/app-configuration for CRUD operations
- Enable refresh for dynamic configuration updates
- Use labels to separate configurations by environment
- Use snapshots for immutable release configurations
- Sentinel pattern — use a sentinel key to trigger full refresh
- RBAC roles — App Configuration Data Reader for read-only access
