# Azure Resource Graph Query Patterns

Azure Resource Graph (ARG) queries use a KQL subset against indexed Azure resource metadata. Results are near real-time across all subscriptions.

## Command Format

```bash
az graph query -q "<KQL>" --query "data[].{col1:field1, col2:field2}" -o table
```

| Flag | Purpose |
|------|---------|
| `-q` | KQL query string |
| `--query` | JMESPath to shape output columns |
| `--first N` | Limit to N results |
| `--subscriptions` | Scope to specific subscription IDs |
| `-o table` | Table output (also: json, tsv) |

## Key Tables

| Table | Contents |
|-------|----------|
| `Resources` | All ARM resources — name, type, location, properties, tags, sku |
| `ResourceContainers` | Subscriptions, resource groups, management groups |
| `HealthResources` | Resource health availability status |
| `ServiceHealthResources` | Azure service health events/incidents |
| `AuthorizationResources` | Role assignments and definitions |
| `AdvisorResources` | Azure Advisor recommendations |

## KQL Essentials

- `=~` case-insensitive equals (use for `type` field — types are lowercase)
- `properties.fieldName` navigates the properties JSON bag
- `mv-expand` flattens arrays (subnets, IP configs)
- `isempty()` / `isnotnull()` checks for null/empty fields
- `tostring()` converts dynamic fields for display

---

## Resource Inventory Patterns

**Count all resources by type:**
```kql
Resources | summarize count() by type | order by count_ desc
```

**Inventory by type and location:**
```kql
Resources | summarize count() by type, location | order by type asc
```

**Cross-subscription inventory with subscription names:**
```kql
Resources
| join kind=leftouter (
    ResourceContainers
    | where type == 'microsoft.resources/subscriptions'
    | project subscriptionId, subscriptionName=name
) on subscriptionId
| summarize count() by subscriptionName, type
| order by subscriptionName asc, count_ desc
```

**All resources in a resource group:**
```kql
Resources
| where resourceGroup =~ '<rg-name>'
| project name, type, location, sku.name, kind
```

## Orphaned Resource Patterns

**Unattached managed disks:**
```kql
Resources
| where type =~ 'microsoft.compute/disks'
| where isempty(managedBy)
| project name, resourceGroup, location, diskSizeGb=properties.diskSizeGB, sku=sku.name
```

**Unused public IP addresses:**
```kql
Resources
| where type =~ 'microsoft.network/publicipaddresses'
| where isempty(properties.ipConfiguration)
| project name, resourceGroup, location, sku=sku.name
```

**Orphaned network interfaces:**
```kql
Resources
| where type =~ 'microsoft.network/networkinterfaces'
| where isempty(properties.virtualMachine)
| project name, resourceGroup, location
```

**Idle load balancers (no backends):**
```kql
Resources
| where type =~ 'microsoft.network/loadbalancers'
| where array_length(properties.backendAddressPools) == 0
| project name, resourceGroup, location
```

## Tag & Compliance Patterns

**Resources missing a required tag:**
```kql
Resources
| where isnull(tags['Environment']) or isnull(tags['CostCenter'])
| project name, type, resourceGroup, tags
```

**Tag coverage analysis by type:**
```kql
Resources
| extend hasTag = isnotnull(tags['Environment'])
| summarize total=count(), tagged=countif(hasTag) by type
| extend coverage=round(100.0 * tagged / total, 1)
| order by coverage asc
```

**Resources with public network access:**
```kql
Resources
| where properties.publicNetworkAccess =~ 'Enabled'
| project name, type, resourceGroup, location
```

## Health & Diagnostics Patterns

**Resource health status:**
```kql
HealthResources
| where type =~ 'microsoft.resourcehealth/availabilitystatuses'
| where properties.availabilityState != 'Available'
| project name, state=properties.availabilityState, reason=properties.reasonType
```

**Active service health incidents:**
```kql
ServiceHealthResources
| where type =~ 'microsoft.resourcehealth/events'
| where properties.Status == 'Active'
| project name, title=properties.Title, status=properties.Status
```

**Failed provisioning states:**
```kql
Resources
| where properties.provisioningState != 'Succeeded'
| project name, type, resourceGroup, state=properties.provisioningState
```

## Service-Specific Patterns

**App Services and their plans:**
```kql
Resources
| where type =~ 'microsoft.web/sites'
| project name, kind, location, plan=properties.serverFarmId, state=properties.state, resourceGroup
```

**Container Apps:**
```kql
Resources
| where type =~ 'microsoft.app/containerapps'
| project name, location, provisioningState=properties.provisioningState, resourceGroup
```

**VNet and subnet discovery:**
```kql
Resources
| where type =~ 'microsoft.network/virtualnetworks'
| mv-expand subnet=properties.subnets
| project vnetName=name, subnetName=subnet.name, prefix=subnet.properties.addressPrefix
```

**Advisor cost recommendations:**
```kql
AdvisorResources
| where properties.category == 'Cost'
| project name, impact=properties.impact, solution=properties.shortDescription.solution
```
