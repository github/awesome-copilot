// recipes/blob-eventgrid/bicep/blob.bicep
// Blob Storage + Event Grid recipe module — adds Storage account with blob trigger
// via Event Grid subscription for Azure Functions.
//
// REQUIREMENTS FOR BASE TEMPLATE:
// 1. Storage account MUST have: allowSharedKeyAccess: false (Azure policy)
// 2. Storage account MUST have: allowBlobPublicAccess: false
// 3. Function app MUST have tag: union(tags, { 'azd-service-name': 'api' })
//
// USAGE: Add this as a module in your main.bicep:
//   module blob './app/blob.bicep' = {
//     name: 'blob'
//     scope: rg
//     params: {
//       name: name
//       location: location
//       tags: tags
//       functionAppPrincipalId: app.outputs.SERVICE_API_IDENTITY_PRINCIPAL_ID
//       functionAppId: app.outputs.SERVICE_API_RESOURCE_ID
//     }
//   }

targetScope = 'resourceGroup'

@description('Base name for resources')
param name string

@description('Azure region')
param location string = resourceGroup().location

@description('Resource tags')
param tags object = {}

@description('Principal ID of the Function App managed identity')
param functionAppPrincipalId string

@description('Resource ID of the Function App (for Event Grid subscription)')
param functionAppId string

@description('Container name for blob triggers')
param containerName string = 'uploads'

@description('UAMI client ID from base template identity module - REQUIRED for UAMI auth')
param uamiClientId string = ''

// ============================================================================
// Naming
// ============================================================================
var resourceSuffix = take(uniqueString(subscription().id, resourceGroup().name, name), 6)
var storageAccountName = 'stblob${resourceSuffix}'

// ============================================================================
// Storage Account (for blob data - separate from function app storage)
// ============================================================================
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false  // RBAC-only, required by Azure policy
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

// ============================================================================
// Blob Service and Container
// ============================================================================
resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
}

resource container 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: containerName
  properties: {
    publicAccess: 'None'
  }
}

// ============================================================================
// RBAC: Storage Blob Data Contributor
// ============================================================================
resource storageBlobDataContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, functionAppPrincipalId, 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      'ba92f5b4-2d11-453d-a403-e96b0029c9fe' // Storage Blob Data Contributor
    )
    principalId: functionAppPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// ============================================================================
// Event Grid System Topic
// ============================================================================
resource eventGridTopic 'Microsoft.EventGrid/systemTopics@2023-12-15-preview' = {
  name: '${name}-blobtopic'
  location: location
  tags: tags
  properties: {
    source: storageAccount.id
    topicType: 'Microsoft.Storage.StorageAccounts'
  }
}

// ============================================================================
// Event Grid Subscription (to Function App)
// ============================================================================
resource eventGridSubscription 'Microsoft.EventGrid/systemTopics/eventSubscriptions@2023-12-15-preview' = {
  parent: eventGridTopic
  name: 'blob-created-subscription'
  properties: {
    destination: {
      endpointType: 'AzureFunction'
      properties: {
        resourceId: '${functionAppId}/functions/BlobTrigger'
        maxEventsPerBatch: 1
        preferredBatchSizeInKilobytes: 64
      }
    }
    filter: {
      includedEventTypes: [
        'Microsoft.Storage.BlobCreated'
      ]
      subjectBeginsWith: '/blobServices/default/containers/${containerName}/'
    }
    eventDeliverySchema: 'EventGridSchema'
    retryPolicy: {
      maxDeliveryAttempts: 30
      eventTimeToLiveInMinutes: 1440
    }
  }
}

// ============================================================================
// Outputs
// ============================================================================
output storageAccountName string = storageAccount.name
output storageAccountId string = storageAccount.id
output containerName string = containerName
output blobEndpoint string = storageAccount.properties.primaryEndpoints.blob

// ============================================================================
// APP SETTINGS OUTPUT
// ============================================================================
output appSettings object = {
  BLOB_STORAGE__blobServiceUri: storageAccount.properties.primaryEndpoints.blob
  BLOB_STORAGE__credential: 'managedidentity'
  BLOB_STORAGE__clientId: uamiClientId
  BLOB_CONTAINER_NAME: containerName
}
