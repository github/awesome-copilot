# Service Bus Recipe

Adds Azure Service Bus trigger and output bindings to an Azure Functions base template.

## Overview

This recipe composes with any HTTP base template to create a Service Bus-triggered function.
It provides the IaC delta (namespace, queue, RBAC) and per-language source code
that replaces the HTTP trigger in the base template.

## Integration Type

| Aspect | Value |
|--------|-------|
| **Trigger** | `ServiceBusTrigger` (queue messages) |
| **Output** | `service_bus_output` (send messages) |
| **Auth** | User Assigned Managed Identity (UAMI) |
| **Local Auth** | Disabled (`disableLocalAuth: true`) — RBAC-only, no connection strings |

## Composition Steps

Apply these steps AFTER `azd init -t functions-quickstart-{lang}-azd`:

| # | Step | Details |
|---|------|---------|
| 1 | **Add IaC module** | Copy `bicep/servicebus.bicep` → `infra/app/servicebus.bicep` |
| 2 | **Wire into main** | Add module reference in `main.bicep` |
| 3 | **Add app settings** | Add Service Bus connection settings with UAMI credentials |
| 4 | **Replace source code** | Swap HTTP trigger file with Service Bus trigger from `source/{lang}.md` |
| 5 | **Add packages** | Add Service Bus extension package for the runtime |

## App Settings to Add

> **CRITICAL: UAMI requires explicit credential configuration.**
> Unlike System Assigned MI, User Assigned MI needs `credential` and `clientId` settings.

| Setting | Value | Purpose |
|---------|-------|---------|
| `ServiceBusConnection__fullyQualifiedNamespace` | `{namespace}.servicebus.windows.net` | Service Bus namespace endpoint |
| `ServiceBusConnection__credential` | `managedidentity` | Use managed identity auth |
| `ServiceBusConnection__clientId` | `{uami-client-id}` | UAMI client ID (from base template) |
| `SERVICEBUS_QUEUE_NAME` | `orders` | Queue name (referenced via `%SERVICEBUS_QUEUE_NAME%`) |

### Bicep App Settings Block

**RECOMMENDED: Use the module's `appSettings` output** (prevents missing settings):

```bicep
// In main.bicep - pass UAMI clientId to the module
module servicebus './app/servicebus.bicep' = {
  name: 'servicebus'
  params: {
    name: abbrs.serviceBusNamespaces
    location: location
    tags: tags
    functionAppPrincipalId: apiUserAssignedIdentity.outputs.principalId
    uamiClientId: apiUserAssignedIdentity.outputs.clientId  // REQUIRED for UAMI
  }
}

// Merge app settings (ensures all UAMI settings are included)
var appSettings = union(baseAppSettings, servicebus.outputs.appSettings)
```

## RBAC Roles Required

| Role | GUID | Scope | Purpose |
|------|------|-------|---------|
| **Azure Service Bus Data Owner** | `090c5cfd-751d-490a-894a-3ce6f1109419` | Service Bus Namespace | Send + receive + manage messages |

> **Note:** Data Owner includes Data Sender and Data Receiver permissions.
> Use more restrictive roles if only sending or receiving is needed.

## Resources Created

| Resource | Type | Purpose |
|----------|------|---------|
| Service Bus Namespace | `Microsoft.ServiceBus/namespaces` | Container for queues/topics |
| Queue | `namespaces/queues` | Message queue |
| Role Assignment | `Microsoft.Authorization/roleAssignments` | RBAC for managed identity |

## Files

| Path | Description |
|------|-------------|
| [bicep/servicebus.bicep](bicep/servicebus.bicep) | Bicep module — namespace + queue + RBAC |
| [terraform/servicebus.tf](terraform/servicebus.tf) | Terraform module — namespace + queue + RBAC |
| [source/python.md](source/python.md) | Python ServiceBusTrigger source code |
| [source/typescript.md](source/typescript.md) | TypeScript ServiceBusTrigger source code |
| [source/javascript.md](source/javascript.md) | JavaScript ServiceBusTrigger source code |
| [source/dotnet.md](source/dotnet.md) | C# (.NET) ServiceBusTrigger source code (isolated worker) |
| [source/java.md](source/java.md) | Java ServiceBusTrigger source code |
| [source/powershell.md](source/powershell.md) | PowerShell ServiceBusTrigger source code |
| [eval/summary.md](eval/summary.md) | Evaluation summary |
| [eval/python.md](eval/python.md) | Python evaluation results |

## Common Issues

### 500 Error on First Request

**Cause:** RBAC role assignment hasn't propagated to Service Bus data plane.

**Solution:** Wait 30-60 seconds after provisioning, or restart the function app:
```bash
az functionapp restart -g <resource-group> -n <function-app-name>
```

### "Unauthorized" or "Forbidden" Errors

**Cause:** Missing `credential` or `clientId` app settings for UAMI.

**Solution:** Ensure all three settings are present:
- `ServiceBusConnection__fullyQualifiedNamespace`
- `ServiceBusConnection__credential`
- `ServiceBusConnection__clientId`
