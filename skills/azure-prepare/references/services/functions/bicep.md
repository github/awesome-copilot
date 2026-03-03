# Functions Bicep Patterns — REFERENCE ONLY

> ⛔ **DO NOT COPY THIS CODE DIRECTLY**
>
> This file contains **reference patterns** for understanding Azure Functions Bicep structure.
> **You MUST use the composition algorithm** to generate infrastructure:
>
> 1. Load `templates/selection.md` to choose the correct base template
> 2. Follow `templates/recipes/composition.md` for the exact algorithm
> 3. Run `azd init -t <template>` to get proven, tested IaC
>
> Hand-writing Bicep from these patterns will result in missing RBAC, incorrect managed identity configuration, and security vulnerabilities.

## Flex Consumption (Recommended)

**Use Flex Consumption for new deployments with managed identity (no connection strings).**

```bicep
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: '${resourcePrefix}func${uniqueHash}'
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false  // Enforce managed identity
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
}

resource deploymentContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'deploymentpackage'
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-${uniqueHash}'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
  }
}

resource functionAppPlan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: 'plan-${uniqueHash}'
  location: location
  sku: {
    name: 'FC1'
    tier: 'FlexConsumption'
  }
  properties: {
    reserved: true
  }
}

resource functionApp 'Microsoft.Web/sites@2024-04-01' = {
  name: '${resourcePrefix}-${serviceName}-${uniqueHash}'
  location: location
  kind: 'functionapp,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: functionAppPlan.id
    httpsOnly: true
    functionAppConfig: {
      deployment: {
        storage: {
          type: 'blobContainer'
          value: '${storageAccount.properties.primaryEndpoints.blob}deploymentpackage'
          authentication: {
            type: 'SystemAssignedIdentity'
          }
        }
      }
      scaleAndConcurrency: {
        maximumInstanceCount: 100
        instanceMemoryMB: 2048
      }
      runtime: {
        name: 'python'  // or 'node', 'dotnet-isolated'
        version: '<version>'  // Query latest GA: https://learn.microsoft.com/en-us/azure/azure-functions/supported-languages
      }
    }
    siteConfig: {
      appSettings: [
        {
          name: 'AzureWebJobsStorage__blobServiceUri'
          value: storageAccount.properties.primaryEndpoints.blob
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'python'
        }
      ]
    }
  }
}

// Grant Function App access to Storage for runtime
resource storageRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, functionApp.id, 'Storage Blob Data Owner')
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b')
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}
```

> 💡 **Key Points:**
> - Use `AzureWebJobsStorage__blobServiceUri` instead of connection string
> - Set `allowSharedKeyAccess: false` for enhanced security
> - Use `SystemAssignedIdentity` for deployment authentication
> - Grant `Storage Blob Data Owner` role for full access to blobs, queues, and tables

## Consumption Plan (Legacy)

> ⛔ **DO NOT USE** — Y1/Dynamic SKU is deprecated for new deployments.
> **ALWAYS use Flex Consumption (FC1)** for all new Azure Functions.
> The Y1 example below is only for reference when migrating legacy apps.

**⚠️ Not recommended for new deployments. Use Flex Consumption instead.**

```bicep
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: '${resourcePrefix}func${uniqueHash}'
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
}

resource functionAppPlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: '${resourcePrefix}-funcplan-${uniqueHash}'
  location: location
  sku: { name: 'Y1', tier: 'Dynamic' }
  properties: { reserved: true }
}

resource functionApp 'Microsoft.Web/sites@2022-09-01' = {
  name: '${resourcePrefix}-${serviceName}-${uniqueHash}'
  location: location
  kind: 'functionapp,linux'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: functionAppPlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'Node|<version>'  // Query latest GA: https://learn.microsoft.com/en-us/azure/azure-functions/supported-languages
      appSettings: [
        { name: 'AzureWebJobsStorage', value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value}' }
        { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' }
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'node' }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: applicationInsights.properties.ConnectionString }
      ]
    }
  }
}
```

## Service Bus Integration (Managed Identity)

```bicep
resource serviceBusNamespace 'Microsoft.ServiceBus/namespaces@2022-10-01-preview' existing = {
  name: serviceBusNamespaceName
}

resource functionApp 'Microsoft.Web/sites@2024-04-01' = {
  // ... (Function App definition from above)
  properties: {
    // ... (other properties)
    siteConfig: {
      appSettings: [
        // Storage with managed identity
        {
          name: 'AzureWebJobsStorage__blobServiceUri'
          value: storageAccount.properties.primaryEndpoints.blob
        }
        // Service Bus with managed identity
        {
          name: 'SERVICEBUS__fullyQualifiedNamespace'
          value: '${serviceBusNamespace.name}.servicebus.windows.net'
        }
        {
          name: 'SERVICEBUS_QUEUE_NAME'
          value: serviceBusQueueName
        }
        // Other settings...
      ]
    }
  }
}

// Grant Service Bus Data Receiver role for triggers
resource serviceBusReceiverRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(serviceBusNamespace.id, functionApp.id, 'Azure Service Bus Data Receiver')
  scope: serviceBusNamespace
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4f6d3b9b-027b-4f4c-9142-0e5a2a2247e0')
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Grant Service Bus Data Sender role (if function sends messages)
resource serviceBusSenderRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(serviceBusNamespace.id, functionApp.id, 'Azure Service Bus Data Sender')
  scope: serviceBusNamespace
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '69a216fc-b8fb-44d8-bc22-1f3c2cd27a39')
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}
```

> 💡 **Key Points:**
> - Use `SERVICEBUS__fullyQualifiedNamespace` (double underscore) for managed identity
> - Grant `Service Bus Data Receiver` role for reading messages
> - Grant `Service Bus Data Sender` role for sending messages (if needed)
> - Role assignments automatically enable connection via managed identity

## Premium Plan (No Cold Starts)

```bicep
resource functionAppPlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: '${resourcePrefix}-funcplan-${uniqueHash}'
  location: location
  sku: { name: 'EP1', tier: 'ElasticPremium' }
  properties: {
    reserved: true
    minimumElasticInstanceCount: 1
  }
}
```

## Functions on Azure Container Apps (Aspire)

> ⚠️ **Important for .NET Aspire:** When deploying Azure Functions to Azure Container Apps with identity-based storage, you must configure `AzureWebJobsSecretStorageType=Files`.

See [aspire-containerapps.md](aspire-containerapps.md) for complete guidance on Functions running on Azure Container Apps and configuration examples.
