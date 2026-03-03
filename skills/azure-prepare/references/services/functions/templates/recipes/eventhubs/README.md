# Event Hubs Recipe

Adds Azure Event Hubs trigger and output bindings to an Azure Functions base template.

## Overview

This recipe composes with any HTTP base template to create an Event Hub-triggered function.
It provides the IaC delta (namespace, hub, consumer group, RBAC) and per-language source code
that replaces the HTTP trigger in the base template.

## Integration Type

| Aspect | Value |
|--------|-------|
| **Trigger** | `EventHubTrigger` (streaming events) |
| **Output** | `event_hub_output` (send events) |
| **Auth** | User Assigned Managed Identity (UAMI) |
| **Local Auth** | Disabled (`disableLocalAuth: true`) — RBAC-only, no connection strings |

## Composition Steps

Apply these steps AFTER `azd init -t functions-quickstart-{lang}-azd`:

| # | Step | Details |
|---|------|---------|
| 1 | **Add IaC module** | Copy `bicep/eventhubs.bicep` → `infra/app/eventhubs.bicep` |
| 2 | **Wire into main** | Add module reference in `main.bicep` |
| 3 | **Add app settings** | Add Event Hub connection settings with UAMI credentials |
| 4 | **Replace source code** | Swap HTTP trigger file with Event Hub trigger from `source/{lang}.md` |
| 5 | **Add packages** | Add Event Hub extension package for the runtime |

## App Settings to Add

> **CRITICAL: UAMI requires explicit credential configuration.**
> Unlike System Assigned MI, User Assigned MI needs `credential` and `clientId` settings.

| Setting | Value | Purpose |
|---------|-------|---------|
| `EventHubConnection__fullyQualifiedNamespace` | `{namespace}.servicebus.windows.net` | Event Hub namespace endpoint |
| `EventHubConnection__credential` | `managedidentity` | Use managed identity auth |
| `EventHubConnection__clientId` | `{uami-client-id}` | UAMI client ID (from base template) |
| `EVENTHUB_NAME` | `events` | Event Hub name (referenced via `%EVENTHUB_NAME%`) |
| `EVENTHUB_CONSUMER_GROUP` | `funcapp` | Consumer group for this function |

### Bicep App Settings Block

**RECOMMENDED: Use the module's `appSettings` output** (prevents missing settings):

```bicep
// In main.bicep - pass UAMI clientId to the module
module eventhubs './app/eventhubs.bicep' = {
  name: 'eventhubs'
  params: {
    name: abbrs.eventHubNamespaces
    location: location
    tags: tags
    functionAppPrincipalId: apiUserAssignedIdentity.outputs.principalId
    uamiClientId: apiUserAssignedIdentity.outputs.clientId  // REQUIRED for UAMI
  }
}

// Merge app settings (ensures all UAMI settings are included)
var appSettings = union(baseAppSettings, eventhubs.outputs.appSettings)
```

**ALTERNATIVE: Manual settings** (only if customization needed):

```bicep
appSettings: {
  // Event Hubs recipe: UAMI connection settings
  EventHubConnection__fullyQualifiedNamespace: eventhubs.outputs.fullyQualifiedNamespace
  EventHubConnection__credential: 'managedidentity'
  EventHubConnection__clientId: apiUserAssignedIdentity.outputs.clientId
  EVENTHUB_NAME: eventhubs.outputs.eventHubName
  EVENTHUB_CONSUMER_GROUP: eventhubs.outputs.consumerGroupName
}
```

## RBAC Roles Required

| Role | GUID | Scope | Purpose |
|------|------|-------|---------|
| **Azure Event Hubs Data Owner** | `f526a384-b230-433a-b45c-95f59c4a2dec` | Event Hubs Namespace | Send + receive + manage events |

> **Note:** Data Owner includes Data Sender and Data Receiver permissions.
> Use more restrictive roles if only sending or receiving is needed.

## Resources Created

| Resource | Type | Purpose |
|----------|------|---------|
| Event Hubs Namespace | `Microsoft.EventHub/namespaces` | Container for event hubs |
| Event Hub | `namespaces/eventhubs` | Event stream |
| Consumer Group | `eventhubs/consumergroups` | Dedicated reader for function app |
| Role Assignment | `Microsoft.Authorization/roleAssignments` | RBAC for managed identity |

## Networking (when VNET_ENABLED=true)

| Component | Details |
|-----------|---------|
| **Private endpoint** | Event Hub namespace → Function VNet subnet |
| **Private DNS zone** | `privatelink.servicebus.windows.net` |

## Files

| Path | Description |
|------|-------------|
| [bicep/eventhubs.bicep](bicep/eventhubs.bicep) | Bicep module — namespace + hub + consumer group + RBAC |
| [bicep/eventhubs-network.bicep](bicep/eventhubs-network.bicep) | Bicep module — private endpoint + DNS (conditional) |
| [terraform/eventhubs.tf](terraform/eventhubs.tf) | Terraform — all Event Hubs resources + RBAC + networking |
| [source/python.md](source/python.md) | Python EventHubTrigger source code |
| [source/typescript.md](source/typescript.md) | TypeScript EventHubTrigger source code |
| [source/javascript.md](source/javascript.md) | JavaScript EventHubTrigger source code |
| [source/dotnet.md](source/dotnet.md) | C# EventHubTrigger source code |
| [source/java.md](source/java.md) | Java EventHubTrigger source code |
| [source/powershell.md](source/powershell.md) | PowerShell EventHubTrigger source code |
| [eval/summary.md](eval/summary.md) | Evaluation summary |
| [eval/python.md](eval/python.md) | Python evaluation results |

## Common Issues

### 500 Error on First Request

**Cause:** RBAC role assignment hasn't propagated to Event Hubs data plane.

**Solution:** Wait 30-60 seconds after provisioning, or restart the function app:
```bash
az functionapp restart -g <resource-group> -n <function-app-name>
```

### "Unauthorized" or "Forbidden" Errors

**Cause:** Missing `credential` or `clientId` app settings for UAMI.

**Solution:** Ensure all three settings are present:
- `EventHubConnection__fullyQualifiedNamespace`
- `EventHubConnection__credential`
- `EventHubConnection__clientId`
