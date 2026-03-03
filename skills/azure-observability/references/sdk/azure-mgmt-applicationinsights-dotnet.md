# Application Insights Management — .NET SDK Quick Reference

> Condensed from **azure-mgmt-applicationinsights-dotnet**. Full patterns
> (web tests, workbooks, API keys, linked storage)
> in the **azure-mgmt-applicationinsights-dotnet** plugin skill if installed.

## Install
dotnet add package Azure.ResourceManager.ApplicationInsights
dotnet add package Azure.Identity

## Quick Start
> **Auth:** `DefaultAzureCredential` is for local development. See [auth-best-practices.md](../auth-best-practices.md) for production patterns.

```csharp
using Azure.ResourceManager;
using Azure.ResourceManager.ApplicationInsights;
using Azure.Identity;
ArmClient client = new ArmClient(new DefaultAzureCredential());
var components = resourceGroup.GetApplicationInsightsComponents();
```

## Best Practices
- Use workspace-based App Insights (current standard)
- Link to Log Analytics for better querying
- Set appropriate retention to balance cost vs data availability
- Use sampling to reduce costs for high-volume applications
- Store connection string securely in Key Vault or managed identity
- Enable multiple test locations for accurate availability monitoring
- Use workbooks for custom dashboards and analysis
- Set up alerts based on availability tests and metrics
- Tag resources for cost allocation and organization
- Use private endpoints for secure data ingestion
