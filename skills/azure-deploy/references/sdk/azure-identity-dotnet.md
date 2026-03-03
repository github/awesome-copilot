# Authentication — .NET SDK Quick Reference

> Condensed from **azure-identity-dotnet**. Full patterns (ASP.NET DI,
> sovereign clouds, brokered auth, certificate credentials)
> in the **azure-identity-dotnet** plugin skill if installed.

## Install
dotnet add package Azure.Identity

## Quick Start

> **Auth:** `DefaultAzureCredential` is for local development. See [auth-best-practices.md](../auth-best-practices.md) for production patterns.

```csharp
using Azure.Identity;
var credential = new DefaultAzureCredential();
```

## Best Practices
- Use DefaultAzureCredential for **local development only**. In production, use deterministic credentials (ManagedIdentityCredential) — see [auth-best-practices.md](../auth-best-practices.md)
- Reuse credential instances — single instance shared across clients
- Configure retry policies for credential operations
- Enable logging with AzureEventSourceListener for debugging auth issues
