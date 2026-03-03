# API Management — .NET SDK Quick Reference

> Condensed from **azure-mgmt-apimanagement-dotnet**. Full patterns (service
> creation, APIs, products, policies, users, gateways, backends)
> in the **azure-mgmt-apimanagement-dotnet** plugin skill if installed.

## Install
dotnet add package Azure.ResourceManager.ApiManagement
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
- Use `WaitUntil.Started` for long operations like service creation (30+ min)
- Use DefaultAzureCredential for **local development only**. In production, use ManagedIdentityCredential — see [auth-best-practices.md](../auth-best-practices.md)
- Handle `RequestFailedException` for ARM API errors
- Use `CreateOrUpdateAsync` for idempotent operations
- Navigate hierarchy via `Get*` methods (e.g., `service.GetApis()`)
- Policy format — use XML format for policies; JSON is also supported
- Service creation — Developer SKU is fastest for testing (~15-30 min)
