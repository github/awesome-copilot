# UAMI Binding Configuration

> ⛔ **MANDATORY FOR ALL SERVICE BINDINGS**
>
> This document defines the required app settings pattern for User Assigned Managed Identity (UAMI)
> when connecting Azure Functions to Azure services. **All recipes MUST follow this pattern.**

## The Problem

Azure Functions base templates use **User Assigned Managed Identity (UAMI)**, not System Assigned MI.
UAMI requires **explicit credential configuration** — the runtime cannot auto-detect the identity.

**Without proper configuration**, functions fail with:
- `500 Internal Server Error`
- `401 Unauthorized`
- `403 Forbidden`
- `The connection string did not contain required properties`

## The Solution: Three Required Settings

For **every** service binding using UAMI, you MUST configure THREE app settings:

| Setting | Purpose | Example |
|---------|---------|---------|
| `{Connection}__fullyQualifiedNamespace` or `{Connection}__accountEndpoint` | Service endpoint | `myhub.servicebus.windows.net` |
| `{Connection}__credential` | Auth method | `managedidentity` |
| `{Connection}__clientId` | UAMI identity | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |

> **All three are required.** Missing any one causes auth failures.

## Per-Service Configuration

### Event Hubs

```bicep
EventHubConnection__fullyQualifiedNamespace: '${eventHubNamespace}.servicebus.windows.net'
EventHubConnection__credential: 'managedidentity'
EventHubConnection__clientId: uamiClientId
EVENTHUB_NAME: 'events'
```

### Service Bus

```bicep
ServiceBusConnection__fullyQualifiedNamespace: '${serviceBusNamespace}.servicebus.windows.net'
ServiceBusConnection__credential: 'managedidentity'
ServiceBusConnection__clientId: uamiClientId
SERVICEBUS_QUEUE_NAME: 'orders'
```

### Cosmos DB

```bicep
COSMOS_CONNECTION__accountEndpoint: 'https://${cosmosAccount}.documents.azure.com:443/'
COSMOS_CONNECTION__credential: 'managedidentity'
COSMOS_CONNECTION__clientId: uamiClientId
COSMOS_DATABASE_NAME: 'mydb'
COSMOS_CONTAINER_NAME: 'items'
```

### Blob Storage

```bicep
BlobConnection__serviceUri: 'https://${storageAccount}.blob.core.windows.net'
BlobConnection__credential: 'managedidentity'
BlobConnection__clientId: uamiClientId
```

### SQL Database

```bicep
SqlConnection__connectionString: 'Server=${sqlServer}.database.windows.net;Database=${database};Authentication=Active Directory Managed Identity;User Id=${uamiClientId}'
```

> **Note:** SQL uses connection string format with `Authentication=Active Directory Managed Identity`

## Recipe Module Pattern

All recipe Bicep modules MUST:

1. **Accept `uamiClientId` as a parameter**
2. **Export an `appSettings` output** with all required settings pre-configured

```bicep
// In recipe module (e.g., eventhubs.bicep)
@description('UAMI client ID - REQUIRED for UAMI auth')
param uamiClientId string

output appSettings object = {
  EventHubConnection__fullyQualifiedNamespace: '${namespace.name}.servicebus.windows.net'
  EventHubConnection__credential: 'managedidentity'
  EventHubConnection__clientId: uamiClientId
  EVENTHUB_NAME: hub.name
}
```

```bicep
// In main.bicep - consume the output
module eventhubs './app/eventhubs.bicep' = {
  params: {
    uamiClientId: apiUserAssignedIdentity.outputs.clientId  // Pass UAMI
  }
}

// Merge into function app settings
var appSettings = union(baseAppSettings, eventhubs.outputs.appSettings)
```

## Validation Checklist

Before deploying, verify:

- [ ] Recipe module has `uamiClientId` parameter
- [ ] Recipe module exports `appSettings` output
- [ ] `appSettings` includes `__credential: 'managedidentity'`
- [ ] `appSettings` includes `__clientId` referencing the UAMI
- [ ] main.bicep passes `apiUserAssignedIdentity.outputs.clientId` to recipe
- [ ] main.bicep merges recipe's `appSettings` into function config

## Common Mistakes

| Mistake | Result | Fix |
|---------|--------|-----|
| Missing `__credential` setting | 401/403 errors | Add `{Connection}__credential: 'managedidentity'` |
| Missing `__clientId` setting | 401/403 errors | Add `{Connection}__clientId: uamiClientId` |
| Using wrong clientId | 403 Forbidden | Use `apiUserAssignedIdentity.outputs.clientId` from base template |
| Using System MI pattern | Auth fails | UAMI requires explicit credential + clientId |
| Hardcoding clientId | Works initially, breaks on redeploy | Reference identity module output |

## Why UAMI Instead of System MI?

The base templates use UAMI because:

1. **Pre-deployment RBAC**: Identity exists before function app, enabling RBAC assignment during provisioning
2. **Consistent identity**: Same identity across redeployments (System MI changes on recreation)
3. **Multi-resource**: One UAMI can be shared across multiple function apps
4. **Cross-resource group**: UAMI can access resources in other resource groups

The tradeoff is requiring explicit credential configuration, which this document addresses.
