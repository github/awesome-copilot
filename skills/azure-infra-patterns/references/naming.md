# Azure Resource Naming Conventions

## Standard Format
```
{resource-type}-{workload}-{environment}-{region}-{instance}
```

## Resource-Specific Prefixes

| Resource Type | Prefix | Example |
|--------------|--------|---------|
| Resource Group | rg | rg-webapp-prod-eastus |
| Storage Account | st | stwebappprodeus001 |
| Key Vault | kv | kv-webapp-prod-eus |
| App Service | app | app-webapp-prod-eastus |
| App Service Plan | asp | asp-webapp-prod-eastus |
| Function App | func | func-processor-prod-eastus |
| Container Registry | cr | crwebappprod |
| Container App | ca | ca-api-prod-eastus |
| Container App Environment | cae | cae-platform-prod-eastus |
| Virtual Network | vnet | vnet-hub-prod-eastus |
| Subnet | snet | snet-web-prod-eastus |
| Network Security Group | nsg | nsg-web-prod-eastus |
| Application Gateway | agw | agw-webapp-prod-eastus |
| Load Balancer | lb | lb-webapp-prod-eastus |
| Public IP | pip | pip-agw-prod-eastus |
| Private Endpoint | pep | pep-storage-prod-eastus |
| Virtual Machine | vm | vm-jumpbox-prod-eastus |
| Virtual Machine Scale Set | vmss | vmss-web-prod-eastus |
| Cosmos DB | cosmos | cosmos-webapp-prod-eastus |
| SQL Server | sql | sql-webapp-prod-eastus |
| SQL Database | sqldb | sqldb-users-prod |
| Log Analytics Workspace | log | log-platform-prod-eastus |
| Application Insights | appi | appi-webapp-prod-eastus |
| Managed Identity | id | id-webapp-prod-eastus |
| Azure Kubernetes Service | aks | aks-platform-prod-eastus |

## Naming Constraints

### Storage Account
- 3-24 characters
- Lowercase letters and numbers only
- Globally unique
- Pattern: `st{workload}{env}{region}{instance}`

### Key Vault
- 3-24 characters
- Alphanumeric and hyphens
- Start with letter
- Globally unique

### Container Registry
- 5-50 characters
- Alphanumeric only
- Globally unique

### Resource Group
- 1-90 characters
- Alphanumeric, underscores, hyphens, periods, parentheses
- Cannot end with period

## Bicep Naming Variables
```bicep
var nameSuffix = '${workload}-${environment}-${location}'

var resourceNames = {
  resourceGroup: 'rg-${nameSuffix}'
  storageAccount: 'st${replace(nameSuffix, '-', '')}${uniqueString(resourceGroup().id)}'
  keyVault: 'kv-${take(nameSuffix, 17)}-${uniqueString(resourceGroup().id)}'
  appService: 'app-${nameSuffix}'
  appServicePlan: 'asp-${nameSuffix}'
}
```

## Terraform Naming Variables
```hcl
locals {
  name_suffix = "${var.workload}-${var.environment}-${var.location}"
  
  resource_names = {
    resource_group   = "rg-${local.name_suffix}"
    storage_account  = "st${replace(local.name_suffix, "-", "")}${random_string.suffix.result}"
    key_vault        = "kv-${substr(local.name_suffix, 0, 17)}-${random_string.suffix.result}"
    app_service      = "app-${local.name_suffix}"
    app_service_plan = "asp-${local.name_suffix}"
  }
}

resource "random_string" "suffix" {
  length  = 4
  special = false
  upper   = false
}
```

## Region Abbreviations

| Region | Abbreviation |
|--------|-------------|
| eastus | eus |
| eastus2 | eus2 |
| westus | wus |
| westus2 | wus2 |
| westus3 | wus3 |
| centralus | cus |
| northcentralus | ncus |
| southcentralus | scus |
| westeurope | weu |
| northeurope | neu |
| uksouth | uks |
| ukwest | ukw |
| southeastasia | sea |
| eastasia | ea |
| australiaeast | aue |
| australiasoutheast | ause |
| japaneast | jpe |
| japanwest | jpw |
| canadacentral | cac |
| canadaeast | cae |
| brazilsouth | brs |

## Environment Abbreviations

| Environment | Abbreviation |
|-------------|-------------|
| Development | dev |
| Testing | test |
| Staging | staging |
| Production | prod |
| Sandbox | sbx |
| Disaster Recovery | dr |
