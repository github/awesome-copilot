# Bicep Implementation Patterns

## Table of Contents
1. [Module Patterns](#module-patterns)
2. [Parameter Patterns](#parameter-patterns)
3. [Conditional Deployment](#conditional-deployment)
4. [Loops and Collections](#loops-and-collections)
5. [Cross-Resource References](#cross-resource-references)
6. [Common Resource Patterns](#common-resource-patterns)

## Module Patterns

### Module Definition
```bicep
// modules/storage/storageAccount.bicep
@description('Storage account name')
param storageAccountName string

@description('Location for resources')
param location string = resourceGroup().location

@allowed(['Standard_LRS', 'Standard_GRS', 'Standard_ZRS'])
param sku string = 'Standard_LRS'

@description('Tags to apply')
param tags object = {}

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  tags: tags
  sku: { name: sku }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
    }
  }
}

output storageAccountId string = storageAccount.id
output primaryEndpoints object = storageAccount.properties.primaryEndpoints
```

### Module Consumption
```bicep
// main.bicep
module storage 'modules/storage/storageAccount.bicep' = {
  name: 'storage-deployment'
  params: {
    storageAccountName: 'st${uniqueString(resourceGroup().id)}'
    location: location
    sku: 'Standard_ZRS'
    tags: tags
  }
}

// Use output
output blobEndpoint string = storage.outputs.primaryEndpoints.blob
```

### Azure Verified Modules
```bicep
// Prefer AVM over custom modules
module storageAccount 'br/public:avm/res/storage/storage-account:0.9.0' = {
  name: 'storage-deployment'
  params: {
    name: storageAccountName
    location: location
  }
}
```

## Parameter Patterns

### Parameter File (.bicepparam)
```bicep
// environments/prod.bicepparam
using '../main.bicep'

param environment = 'prod'
param location = 'eastus'
param tags = {
  Environment: 'Production'
  CostCenter: 'CC-12345'
  Owner: 'platform@company.com'
}
```

### Secure Parameters
```bicep
@secure()
param adminPassword string

// Reference from Key Vault in parameter file
param adminPassword = az.getSecret('<subscription>', '<rg>', '<vault>', '<secret>')
```

### Parameter Validation
```bicep
@minLength(3)
@maxLength(24)
param storageAccountName string

@allowed(['dev', 'staging', 'prod'])
param environment string

@minValue(1)
@maxValue(10)
param instanceCount int = 2
```

## Conditional Deployment

### Resource Conditions
```bicep
param deployAppInsights bool = true

resource appInsights 'Microsoft.Insights/components@2020-02-02' = if (deployAppInsights) {
  name: 'appi-${workload}'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
  }
}

// Conditional output
output appInsightsKey string = deployAppInsights ? appInsights.properties.InstrumentationKey : ''
```

### Environment-Based Configuration
```bicep
var skuConfig = {
  dev: { name: 'B1', capacity: 1 }
  staging: { name: 'S1', capacity: 2 }
  prod: { name: 'P1v3', capacity: 3 }
}

resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: 'asp-${workload}-${environment}'
  location: location
  sku: skuConfig[environment]
}
```

## Loops and Collections

### Array Loop
```bicep
param storageAccounts array = [
  { name: 'stdata', sku: 'Standard_LRS' }
  { name: 'stlogs', sku: 'Standard_GRS' }
]

resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = [for account in storageAccounts: {
  name: '${account.name}${uniqueString(resourceGroup().id)}'
  location: location
  sku: { name: account.sku }
  kind: 'StorageV2'
}]
```

### Index Loop
```bicep
param subnetCount int = 3

resource subnets 'Microsoft.Network/virtualNetworks/subnets@2023-05-01' = [for i in range(0, subnetCount): {
  name: 'snet-${i}'
  properties: {
    addressPrefix: '10.0.${i}.0/24'
  }
}]
```

### Module Loop
```bicep
param webApps array = ['api', 'web', 'admin']

module apps 'modules/webapp.bicep' = [for app in webApps: {
  name: 'deploy-${app}'
  params: {
    appName: 'app-${workload}-${app}-${environment}'
    location: location
  }
}]
```

## Cross-Resource References

### Same Template
```bicep
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  // ...
}

resource secret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'mySecret'
  properties: {
    value: secretValue
  }
}
```

### Existing Resources
```bicep
// Same resource group
resource existingStorage 'Microsoft.Storage/storageAccounts@2023-01-01' existing = {
  name: 'stexisting'
}

// Different resource group
resource existingVnet 'Microsoft.Network/virtualNetworks@2023-05-01' existing = {
  name: 'vnet-shared'
  scope: resourceGroup('shared-networking-rg')
}

// Different subscription
resource existingKeyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: 'kv-central'
  scope: resourceGroup('sub-id', 'central-rg')
}
```

## Common Resource Patterns

### Web App with Managed Identity
```bicep
resource webApp 'Microsoft.Web/sites@2023-01-01' = {
  name: webAppName
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      alwaysOn: true
    }
  }
}
```

### Private Endpoint
```bicep
resource privateEndpoint 'Microsoft.Network/privateEndpoints@2023-05-01' = {
  name: 'pep-${resourceName}'
  location: location
  properties: {
    subnet: { id: subnetId }
    privateLinkServiceConnections: [
      {
        name: 'plsc-${resourceName}'
        properties: {
          privateLinkServiceId: targetResourceId
          groupIds: ['blob']
        }
      }
    ]
  }
}
```

### RBAC Role Assignment
```bicep
resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, principalId, roleDefinitionId)
  scope: targetResource
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleDefinitionId)
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}
```

### Diagnostic Settings
```bicep
resource diagnosticSettings 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'diag-${resourceName}'
  scope: targetResource
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      {
        categoryGroup: 'allLogs'
        enabled: true
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}
```
