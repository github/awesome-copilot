// Service Bus Recipe - IaC Module
// Adds Azure Service Bus namespace, queue, and RBAC for managed identity
//
// REQUIREMENTS FOR BASE TEMPLATE:
// 1. Storage account MUST have: allowSharedKeyAccess: false (Azure policy)
// 2. Storage account MUST have: allowBlobPublicAccess: false
// 3. Function app MUST have tag: union(tags, { 'azd-service-name': 'api' })

@description('Resource name prefix')
param name string

@description('Azure region')
param location string

@description('Resource tags')
param tags object = {}

@description('Principal ID of the function app managed identity for RBAC assignment')
param functionAppPrincipalId string

@description('Queue name for the function trigger')
param queueName string = 'orders'

@description('UAMI client ID from base template identity module - REQUIRED for UAMI auth')
@minLength(36)
param uamiClientId string

// Service Bus Namespace
resource serviceBusNamespace 'Microsoft.ServiceBus/namespaces@2022-10-01-preview' = {
  name: '${name}-sbns'
  location: location
  tags: tags
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    disableLocalAuth: true  // RBAC-only, no connection strings or SAS keys
    minimumTlsVersion: '1.2'
  }
}

// Queue
resource queue 'Microsoft.ServiceBus/namespaces/queues@2022-10-01-preview' = {
  parent: serviceBusNamespace
  name: queueName
  properties: {
    lockDuration: 'PT1M'
    maxSizeInMegabytes: 1024
    requiresDuplicateDetection: false
    requiresSession: false
    defaultMessageTimeToLive: 'P14D'
    deadLetteringOnMessageExpiration: true
    enableBatchedOperations: true
    maxDeliveryCount: 10
    enablePartitioning: false
  }
}

// RBAC: Azure Service Bus Data Owner
// Allows send, receive, and manage operations
// Role GUID: 090c5cfd-751d-490a-894a-3ce6f1109419
resource serviceBusDataOwnerRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(serviceBusNamespace.id, functionAppPrincipalId, '090c5cfd-751d-490a-894a-3ce6f1109419')
  scope: serviceBusNamespace
  properties: {
    principalId: functionAppPrincipalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '090c5cfd-751d-490a-894a-3ce6f1109419')
    principalType: 'ServicePrincipal'
  }
}

// Outputs for app settings and other modules
output serviceBusNamespaceName string = serviceBusNamespace.name
output serviceBusNamespaceId string = serviceBusNamespace.id
output queueName string = queue.name
output fullyQualifiedNamespace string = '${serviceBusNamespace.name}.servicebus.windows.net'

// ============================================================================
// APP SETTINGS OUTPUT - Use this to ensure correct UAMI configuration
// ============================================================================
output appSettings object = {
  ServiceBusConnection__fullyQualifiedNamespace: '${serviceBusNamespace.name}.servicebus.windows.net'
  ServiceBusConnection__credential: 'managedidentity'
  ServiceBusConnection__clientId: uamiClientId
  SERVICEBUS_QUEUE_NAME: queue.name
}
