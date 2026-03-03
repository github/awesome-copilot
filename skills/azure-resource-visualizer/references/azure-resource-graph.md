# Azure Resource Graph Queries for Resource Discovery

Azure Resource Graph (ARG) enables fast, cross-subscription resource querying using KQL via `az graph query`. Use it for bulk resource discovery and relationship mapping.

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
| `Resources` | All ARM resource instances (name, type, location, properties, tags) |
| `ResourceContainers` | Subscriptions, resource groups, management groups |

## Resource Discovery Patterns

**List all resources by type:**

```kql
Resources | summarize count() by type | order by count_ desc
```

**Inventory by location and type:**

```kql
Resources | summarize count() by type, location | order by type asc
```

**List all resources in a resource group with details:**

```kql
Resources
| where resourceGroup =~ '<rg-name>'
| project name, type, location, sku.name, kind
```

**Cross-subscription resource inventory with subscription names:**

```kql
Resources
| join kind=leftouter (
    ResourceContainers
    | where type == 'microsoft.resources/subscriptions'
    | project subscriptionId, subscriptionName=name
) on subscriptionId
| project name, type, location, resourceGroup, subscriptionName
```

**Discover network relationships (VNets, subnets, NICs):**

```kql
Resources
| where type =~ 'microsoft.network/virtualnetworks'
| mv-expand subnet=properties.subnets
| project vnetName=name, subnetName=subnet.name, addressPrefix=subnet.properties.addressPrefix, resourceGroup
```

**Find App Services and their plans:**

```kql
Resources
| where type =~ 'microsoft.web/sites'
| project name, kind, location, serverFarmId=properties.serverFarmId, resourceGroup
```

## Tips

- Use `=~` for case-insensitive type matching (resource types are lowercase)
- Navigate properties with `properties.fieldName`
- Use `--first N` to limit result count
- Use `--subscriptions` to scope to specific subscriptions
- Use `mv-expand` to flatten arrays (e.g., subnets, IP configurations)
