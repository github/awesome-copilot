# Cosmos DB Recipe

Adds Azure Cosmos DB trigger and bindings to an Azure Functions base template.

## Overview

This recipe composes with any HTTP base template to create a Cosmos DB-triggered function.
It provides the IaC delta (new resources, RBAC, networking) and per-language source code
that replaces the HTTP trigger in the base template.

## Integration Type

| Aspect | Value |
|--------|-------|
| **Trigger** | `CosmosDBTrigger` (change feed) |
| **Auth** | Managed identity (`COSMOS_CONNECTION__accountEndpoint`) |
| **Containers** | Application data container + leases container |
| **Hosting** | Flex Consumption (from base template) |
| **Local Auth** | Disabled (`disableLocalAuth: true`) — RBAC-only, no keys |

## Composition Steps

Apply these steps AFTER `azd init -t functions-quickstart-{lang}-azd`:

| # | Step | Details |
|---|------|---------|
| 1 | **Add IaC module** | Copy `bicep/cosmos.bicep` → `infra/app/cosmos.bicep` (or `terraform/cosmos.tf` → `infra/cosmos.tf`) |
| 2 | **Wire into main** | Add module reference in `main.bicep` or resource blocks in `main.tf` |
| 3 | **Add app settings** | Add Cosmos connection settings to function app configuration |
| 4 | **Replace source code** | Swap HTTP trigger file with Cosmos trigger from `source/{lang}.md` |
| 5 | **Add NuGet/pip/npm** | Add Cosmos DB extension package for the runtime |
| 6 | **Update azure.yaml** | Add hooks for Cosmos firewall script (VNet scenarios) |

## App Settings to Add

> **CRITICAL: UAMI requires explicit credential configuration.**
> Unlike System Assigned MI, User Assigned MI needs `credential` and `clientId` settings.

| Setting | Value | Purpose |
|---------|-------|---------|
| `COSMOS_CONNECTION__accountEndpoint` | `https://{account}.documents.azure.com:443/` | Cosmos account endpoint |
| `COSMOS_CONNECTION__credential` | `managedidentity` | Use managed identity auth |
| `COSMOS_CONNECTION__clientId` | `{uami-client-id}` | UAMI client ID (from base template) |
| `COSMOS_DATABASE_NAME` | `documents-db` | Database to monitor |
| `COSMOS_CONTAINER_NAME` | `documents` | Container to monitor |

### Bicep App Settings Block

**RECOMMENDED: Use the module's `appSettings` output** (prevents missing settings):

```bicep
// In main.bicep - pass UAMI clientId to the module
module cosmos './app/cosmos.bicep' = {
  name: 'cosmos'
  scope: rg
  params: {
    name: name
    location: location
    tags: tags
    functionAppPrincipalId: apiUserAssignedIdentity.outputs.principalId
    uamiClientId: apiUserAssignedIdentity.outputs.clientId  // REQUIRED for UAMI
  }
}

// Merge app settings (ensures all UAMI settings are included)
var appSettings = union(baseAppSettings, cosmos.outputs.appSettings)
```

**ALTERNATIVE: Manual settings** (only if customization needed):

```bicep
appSettings: {
  COSMOS_CONNECTION__accountEndpoint: cosmos.outputs.cosmosAccountEndpoint
  COSMOS_CONNECTION__credential: 'managedidentity'
  COSMOS_CONNECTION__clientId: apiUserAssignedIdentity.outputs.clientId
  COSMOS_DATABASE_NAME: cosmos.outputs.cosmosDatabaseName
  COSMOS_CONTAINER_NAME: cosmos.outputs.cosmosContainerName
}
```

> **Note:** The `__accountEndpoint` suffix signals the Functions runtime to use managed identity
> instead of a connection string. No keys or connection strings are stored.

## RBAC Roles Required

| Role | GUID | Scope | Purpose |
|------|------|-------|---------|
| **Cosmos DB Account Reader** | `fbdf93bf-df7d-467e-a4d2-9458aa1360c8` | Cosmos account | Read account metadata |
| **Cosmos DB Built-in Data Contributor** | `00000000-0000-0000-0000-000000000002` | Cosmos account (SQL role) | Read/write data via change feed |

> **Important:** Cosmos DB uses its own SQL RBAC system (`sqlRoleAssignments`), not standard Azure RBAC
> for data plane operations. The recipe includes both: Azure RBAC for control plane, Cosmos SQL RBAC for data plane.

## Networking (when VNET_ENABLED=true)

| Component | Details |
|-----------|---------|
| **Private endpoint** | Cosmos account → Function VNet subnet |
| **Private DNS zone** | `privatelink.documents.azure.com` |
| **Firewall script** | Add developer IP to Cosmos firewall for local testing/Data Explorer |

## Resources Created

| Resource | Type | Purpose |
|----------|------|---------|
| Cosmos DB Account | `Microsoft.DocumentDB/databaseAccounts` | Serverless NoSQL database |
| SQL Database | `databaseAccounts/sqlDatabases` | Application database |
| Data Container | `sqlDatabases/containers` | Stores application documents |
| Leases Container | `sqlDatabases/containers` | Tracks change feed processing state |
| Role Assignment (Reader) | `Microsoft.Authorization/roleAssignments` | Control plane access |
| SQL Role Assignment | `databaseAccounts/sqlRoleAssignments` | Data plane access |
| Private Endpoint | `Microsoft.Network/privateEndpoints` | VNet-only access (conditional) |

## Files

| Path | Description |
|------|-------------|
| [bicep/cosmos.bicep](bicep/cosmos.bicep) | Bicep module — all Cosmos resources + RBAC |
| [bicep/cosmos-network.bicep](bicep/cosmos-network.bicep) | Bicep module — private endpoint + DNS (conditional) |
| [terraform/cosmos.tf](terraform/cosmos.tf) | Terraform — all Cosmos resources + RBAC + networking |
| [source/dotnet.md](source/dotnet.md) | C# CosmosDBTrigger source code |
| [source/typescript.md](source/typescript.md) | TypeScript CosmosDBTrigger source code |
| [source/javascript.md](source/javascript.md) | JavaScript CosmosDBTrigger source code |
| [source/python.md](source/python.md) | Python CosmosDBTrigger source code |
| [source/java.md](source/java.md) | Java CosmosDBTrigger source code |
| [source/powershell.md](source/powershell.md) | PowerShell CosmosDBTrigger source code |
| [eval/summary.md](eval/summary.md) | Evaluation summary |
| [eval/python.md](eval/python.md) | Python evaluation results |
