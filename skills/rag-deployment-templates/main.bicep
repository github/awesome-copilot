param location string = 'eastus'
param resourceGroupName string = 'demo-rg'

@allowed(['basic', 'standard'])
@description('Azure AI Search tier. Use basic for Mínima (~$25/mo), standard for Estándar/Máxima (~$295/mo per replica).')
param searchTier string = 'basic'

@description('Number of Search replicas. 1 for Mínima, 2 for Estándar, 3+ for Máxima.')
param searchReplicaCount int = 1

@description('Number of Search partitions. 1 for Mínima/Estándar, 2+ for Máxima.')
param searchPartitionCount int = 1

@allowed(['Standard_LRS', 'Standard_ZRS'])
@description('Storage redundancy. LRS for Mínima/Estándar, ZRS for Máxima.')
param storageRedundancy string = 'Standard_LRS'

@description('Log Analytics retention in days. 30 for Mínima, 90 for Estándar, 365 for Máxima.')
param logRetentionDays int = 30

@description('Enable Managed Identity + RBAC (recommended for Máxima/production). Eliminates API key usage.')
param enableManagedIdentity bool = false

// Resource names
var openaiName = 'openai-${uniqueString(resourceGroup().id)}'
var searchName = 'search-${uniqueString(resourceGroup().id)}'
var storageName = 'st${uniqueString(resourceGroup().id)}'
var appInsightsName = 'appinsights-${uniqueString(resourceGroup().id)}'
var logAnalyticsName = 'logs-${uniqueString(resourceGroup().id)}'

// OpenAI
resource openai 'Microsoft.CognitiveServices/accounts@2023-10-01-preview' = {
  name: openaiName
  location: location
  kind: 'OpenAI'
  sku: {
    name: 'S0'
  }
  properties: {
    apiProperties: {
      statisticsEnabled: false
    }
  }
}

// OpenAI Deployments
// NOTE: scaleSettings is deprecated since API version 2023-05-01.
// Use 'sku' with name (Standard/GlobalStandard) and capacity instead.
// Check available SKUs per region: az cognitiveservices model list --location <region>
// gpt-4o: minimum quality model for RAG (gpt-4o-mini is below quality bar)
resource gpt4oDeployment 'Microsoft.CognitiveServices/accounts/deployments@2023-10-01-preview' = {
  parent: openai
  name: 'gpt-4o'
  sku: {
    name: 'GlobalStandard'
    capacity: 10
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4o'
      version: '2024-08-06'
    }
  }
}

// Embedding model for vector search
resource embeddingDeployment 'Microsoft.CognitiveServices/accounts/deployments@2023-10-01-preview' = {
  parent: openai
  name: 'text-embedding-3-small'
  dependsOn: [gpt4oDeployment]
  sku: {
    name: 'Standard'
    capacity: 50
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'text-embedding-3-small'
      version: '1'
    }
  }
}

// Search
resource search 'Microsoft.Search/searchServices@2023-11-01' = {
  name: searchName
  location: location
  sku: {
    name: searchTier
  }
  properties: {
    replicaCount: searchReplicaCount
    partitionCount: searchPartitionCount
  }
}

// Log Analytics
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: logRetentionDays
  }
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// Storage Account (documents blob container)
resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageName
  location: location
  kind: 'StorageV2'
  sku: {
    name: storageRedundancy
  }
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storage
  name: 'default'
}

resource docsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'documents'
  properties: {
    publicAccess: 'None'
  }
}

// ─── Managed Identity + RBAC (Máxima tier / production) ───────────────────────
// Microsoft RAG Reference Architecture: use RBAC over API keys for production.
// Ref: https://learn.microsoft.com/en-us/azure/search/search-security-rbac

var managedIdentityName = 'id-rag-${uniqueString(resourceGroup().id)}'

resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = if (enableManagedIdentity) {
  name: managedIdentityName
  location: location
}

// Role definitions (built-in)
var cognitiveServicesOpenAIUser = '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd'
var searchIndexDataReader = '1407120a-92aa-4202-b7e9-c0e197c71c8f'
var searchIndexDataContributor = '8ebe5a00-799e-43f5-93ac-243d3dce84a7'
var storageBlobDataReader = '2a2b9908-6ea1-4ae2-8e65-a410df84e7d1'

// OpenAI: allow identity to call completions/embeddings
resource roleOpenAI 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (enableManagedIdentity) {
  name: guid(openai.id, managedIdentity.id, cognitiveServicesOpenAIUser)
  scope: openai
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cognitiveServicesOpenAIUser)
    principalId: enableManagedIdentity ? managedIdentity.properties.principalId : ''
    principalType: 'ServicePrincipal'
  }
}

// Search: read indexes (query time)
resource roleSearchReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (enableManagedIdentity) {
  name: guid(search.id, managedIdentity.id, searchIndexDataReader)
  scope: search
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', searchIndexDataReader)
    principalId: enableManagedIdentity ? managedIdentity.properties.principalId : ''
    principalType: 'ServicePrincipal'
  }
}

// Search: write indexes (indexing time)
resource roleSearchContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (enableManagedIdentity) {
  name: guid(search.id, managedIdentity.id, searchIndexDataContributor)
  scope: search
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', searchIndexDataContributor)
    principalId: enableManagedIdentity ? managedIdentity.properties.principalId : ''
    principalType: 'ServicePrincipal'
  }
}

// Storage: read blobs (Search indexer pulls documents)
resource roleStorageReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (enableManagedIdentity) {
  name: guid(storage.id, managedIdentity.id, storageBlobDataReader)
  scope: storage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataReader)
    principalId: enableManagedIdentity ? managedIdentity.properties.principalId : ''
    principalType: 'ServicePrincipal'
  }
}

// Outputs
output openaiEndpoint string = openai.properties.endpoint
output openaiKey string = openai.listKeys().key1
output searchEndpoint string = 'https://${searchName}.search.windows.net'
output searchKey string = search.listAdminKeys().primaryKey
output storageConnectionString string = 'DefaultEndpointsProtocol=https;AccountName=${storageName};AccountKey=${storage.listKeys().keys[0].value}'
output appInsightsKey string = appInsights.properties.InstrumentationKey
output appInsightsConnectionString string = appInsights.properties.ConnectionString
output managedIdentityClientId string = enableManagedIdentity ? managedIdentity.properties.clientId : ''
output managedIdentityPrincipalId string = enableManagedIdentity ? managedIdentity.properties.principalId : ''
