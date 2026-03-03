# Logic Apps - Bicep Patterns

## Consumption (Multi-tenant)

```bicep
resource logicApp 'Microsoft.Logic/workflows@2019-05-01' = {
  name: '${resourcePrefix}-logic-${uniqueHash}'
  location: location
  properties: {
    state: 'Enabled'
    definition: {
      '$schema': 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#'
      contentVersion: '1.0.0.0'
      triggers: {
        manual: {
          type: 'Request'
          kind: 'Http'
          inputs: {
            schema: {}
          }
        }
      }
      actions: {}
    }
    parameters: {}
  }
}
```

## Standard (Single-tenant)

```bicep
resource logicAppPlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: '${resourcePrefix}-logicplan-${uniqueHash}'
  location: location
  sku: {
    name: 'WS1'
    tier: 'WorkflowStandard'
  }
  properties: {
    reserved: true
  }
}

resource logicAppStandard 'Microsoft.Web/sites@2022-09-01' = {
  name: '${resourcePrefix}-logic-${uniqueHash}'
  location: location
  kind: 'functionapp,workflowapp'
  properties: {
    serverFarmId: logicAppPlan.id
    siteConfig: {
      appSettings: [
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'AzureWebJobsStorage'
          value: storageConnectionString
        }
      ]
    }
  }
}
```

## API Connection

```bicep
resource serviceBusConnection 'Microsoft.Web/connections@2016-06-01' = {
  name: 'servicebus-connection'
  location: location
  properties: {
    displayName: 'Service Bus Connection'
    api: {
      id: subscriptionResourceId('Microsoft.Web/locations/managedApis', location, 'servicebus')
    }
    parameterValues: {
      connectionString: serviceBus.listKeys().primaryConnectionString
    }
  }
}
```
