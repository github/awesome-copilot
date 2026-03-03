// Event Hubs Recipe - IaC Module
// Adds Azure Event Hubs namespace, event hub, consumer group, and RBAC for managed identity
//
// REQUIREMENTS FOR BASE TEMPLATE:
// 1. Storage account MUST have: allowSharedKeyAccess: false (Azure policy)
// 2. Storage account MUST have: allowBlobPublicAccess: false
// 3. Function app MUST have tag: union(tags, { 'azd-service-name': 'api' })

@description('Resource name (used as prefix for Event Hubs namespace)')
param name string

@description('Azure region')
param location string

@description('Resource tags')
param tags object = {}

@description('Principal ID of the function app managed identity for RBAC assignment')
param functionAppPrincipalId string

@description('Event Hub name')
param eventHubName string = 'events'

@description('Consumer group for the function app')
param consumerGroupName string = 'funcapp'

@description('Message retention in days (1-7 for Standard, up to 90 for Premium)')
param messageRetentionInDays int = 1

@description('Number of partitions (2-32 for Standard)')
param partitionCount int = 2

// Event Hubs Namespace
resource eventHubNamespace 'Microsoft.EventHub/namespaces@2024-01-01' = {
  name: '${name}-ehns'
  location: location
  tags: tags
  sku: {
    name: 'Standard'
    tier: 'Standard'
    capacity: 1
  }
  properties: {
    isAutoInflateEnabled: true
    maximumThroughputUnits: 4
    disableLocalAuth: true  // RBAC-only, no connection strings or SAS keys
    minimumTlsVersion: '1.2'
  }
}

// Event Hub
resource eventHub 'Microsoft.EventHub/namespaces/eventhubs@2024-01-01' = {
  parent: eventHubNamespace
  name: eventHubName
  properties: {
    messageRetentionInDays: messageRetentionInDays
    partitionCount: partitionCount
  }
}

// Consumer Group for the Function App
// Each consumer (function app instance) should have its own consumer group
resource consumerGroup 'Microsoft.EventHub/namespaces/eventhubs/consumergroups@2024-01-01' = {
  parent: eventHub
  name: consumerGroupName
}

// RBAC: Azure Event Hubs Data Owner
// Allows send, receive, and manage operations
// Role GUID: f526a384-b230-433a-b45c-95f59c4a2dec
resource eventHubsDataOwnerRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(eventHubNamespace.id, functionAppPrincipalId, 'f526a384-b230-433a-b45c-95f59c4a2dec')
  scope: eventHubNamespace
  properties: {
    principalId: functionAppPrincipalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'f526a384-b230-433a-b45c-95f59c4a2dec')
    principalType: 'ServicePrincipal'
  }
}

// Outputs for app settings and other modules
output eventHubNamespaceName string = eventHubNamespace.name
output eventHubNamespaceId string = eventHubNamespace.id
output eventHubName string = eventHub.name
output consumerGroupName string = consumerGroup.name
output fullyQualifiedNamespace string = '${eventHubNamespace.name}.servicebus.windows.net'

// ============================================================================
// APP SETTINGS OUTPUT - Use this to ensure correct UAMI configuration
// ============================================================================
// IMPORTANT: Always use this output instead of manually constructing app settings.
// Pass the UAMI clientId from the base template's identity module.
// 
// Usage in main.bicep:
//   var eventHubsAppSettings = eventhubs.outputs.appSettings
//   // Then merge: union(baseAppSettings, eventHubsAppSettings)
// ============================================================================

@description('UAMI client ID from base template identity module - REQUIRED for UAMI auth')
@minLength(36)
param uamiClientId string

output appSettings object = {
  EventHubConnection__fullyQualifiedNamespace: '${eventHubNamespace.name}.servicebus.windows.net'
  EventHubConnection__credential: 'managedidentity'
  EventHubConnection__clientId: uamiClientId
  EVENTHUB_NAME: eventHub.name
  EVENTHUB_CONSUMER_GROUP: consumerGroup.name
}
