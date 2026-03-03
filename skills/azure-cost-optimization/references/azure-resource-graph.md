# Azure Resource Graph Queries for Cost Optimization

Azure Resource Graph (ARG) enables fast, cross-subscription resource querying using KQL via `az graph query`. Use it to find orphaned resources, unused infrastructure, and optimization targets.

## How to Query

Use the `extension_cli_generate` MCP tool to generate `az graph query` commands:

```yaml
mcp_azure_mcp_extension_cli_generate
  intent: "query Azure Resource Graph to <describe what you want to find>"
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
| `ResourceContainers` | Subscriptions, resource groups, management groups |
| `AdvisorResources` | Cost and performance recommendations |

## Cost Optimization Query Patterns

**Find orphaned (unattached) managed disks:**

```kql
Resources
| where type =~ 'microsoft.compute/disks'
| where isempty(managedBy)
| project name, resourceGroup, location, diskSizeGb=properties.diskSizeGB, sku=sku.name
```

**Find unattached public IP addresses:**

```kql
Resources
| where type =~ 'microsoft.network/publicipaddresses'
| where isempty(properties.ipConfiguration)
| project name, resourceGroup, location, sku=sku.name
```

**Find orphaned network interfaces:**

```kql
Resources
| where type =~ 'microsoft.network/networkinterfaces'
| where isempty(properties.virtualMachine)
| project name, resourceGroup, location
```

**Resource count by SKU/tier (spot oversized resources):**

```kql
Resources
| where isnotempty(sku.name)
| summarize count() by type, tostring(sku.name)
| order by count_ desc
```

**Tag coverage for cost allocation:**

```kql
Resources
| extend hasCostCenter = isnotnull(tags['CostCenter'])
| summarize total=count(), tagged=countif(hasCostCenter) by type
| extend coverage=round(100.0 * tagged / total, 1)
| order by total desc
```

**Find idle load balancers (no backend pools):**

```kql
Resources
| where type =~ 'microsoft.network/loadbalancers'
| where array_length(properties.backendAddressPools) == 0
| project name, resourceGroup, location, sku=sku.name
```

**Get Advisor cost recommendations:**

```kql
AdvisorResources
| where properties.category == 'Cost'
| project name, impact=properties.impact, description=properties.shortDescription.solution
```

## Tips

- Use `=~` for case-insensitive type matching (resource types are lowercase)
- Navigate properties with `properties.fieldName`
- Use `--first N` to limit result count
- Use `--subscriptions` to scope to specific subscriptions
- Cross-reference orphaned resources with cost data from Cost Management API
