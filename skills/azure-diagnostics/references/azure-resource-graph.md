# Azure Resource Graph Queries for Diagnostics

Azure Resource Graph (ARG) enables fast, cross-subscription resource querying using KQL via `az graph query`. Use it to check resource health, find degraded resources, and correlate incidents.

## How to Query

Use the `extension_cli_generate` MCP tool to generate `az graph query` commands:

```yaml
mcp_azure_mcp_extension_cli_generate
  intent: "query Azure Resource Graph to <describe what you want to diagnose>"
  cli-type: "az"
```

Or construct directly:

```bash
az graph query -q "<KQL>" --query "data[].{name:name, type:type}" -o table
```

> ⚠️ **Prerequisite:** `az extension add --name resource-graph`

## Key Tables

| Table | Contains |
|-------|----------|
| `Resources` | All ARM resources (name, type, location, properties, tags) |
| `HealthResources` | Resource health availability status |
| `ServiceHealthResources` | Azure service health events and incidents |
| `ResourceContainers` | Subscriptions, resource groups, management groups |

## Diagnostics Query Patterns

**Check resource health status across resources:**

```kql
HealthResources
| where type =~ 'microsoft.resourcehealth/availabilitystatuses'
| project name, availabilityState=properties.availabilityState, reasonType=properties.reasonType
```

**Find resources in unhealthy or degraded state:**

```kql
HealthResources
| where type =~ 'microsoft.resourcehealth/availabilitystatuses'
| where properties.availabilityState != 'Available'
| project name, state=properties.availabilityState, reason=properties.reasonType, summary=properties.summary
```

**Query active service health incidents:**

```kql
ServiceHealthResources
| where type =~ 'microsoft.resourcehealth/events'
| where properties.Status == 'Active'
| project name, title=properties.Title, impact=properties.Impact, status=properties.Status
```

**Find resources by provisioning state (failed/stuck deployments):**

```kql
Resources
| where properties.provisioningState != 'Succeeded'
| project name, type, resourceGroup, provisioningState=properties.provisioningState
```

**Find App Services in stopped or error state:**

```kql
Resources
| where type =~ 'microsoft.web/sites'
| where properties.state != 'Running'
| project name, state=properties.state, resourceGroup, location
```

**Find Container Apps with provisioning issues:**

```kql
Resources
| where type =~ 'microsoft.app/containerapps'
| where properties.provisioningState != 'Succeeded'
| project name, provisioningState=properties.provisioningState, resourceGroup
```

## Tips

- Use `=~` for case-insensitive type matching (resource types are lowercase)
- Navigate properties with `properties.fieldName`
- Use `--first N` to limit result count
- Use `--subscriptions` to scope to specific subscriptions
- Combine ARG health data with Azure Monitor metrics for full picture
- Check `HealthResources` before deep-diving into application logs
