# App Service Deployment Slots

Zero-downtime deployments using staging slots.

## Basic Staging Slot

```bicep
resource stagingSlot 'Microsoft.Web/sites/slots@2022-09-01' = {
  parent: webApp
  name: 'staging'
  location: location
  properties: {
    serverFarmId: appServicePlan.id
  }
}
```

## Slot Requirements

| SKU Tier | Slots Supported |
|----------|-----------------|
| Free/Shared | 0 |
| Basic | 0 |
| Standard | 5 |
| Premium | 20 |

## Deployment Flow

1. Deploy to staging slot
2. Warm up and test staging
3. Swap staging with production
4. Rollback by swapping again if needed

## Slot Settings

Configure settings that should not swap:

```bicep
resource slotConfigNames 'Microsoft.Web/sites/config@2022-09-01' = {
  parent: webApp
  name: 'slotConfigNames'
  properties: {
    appSettingNames: [
      'APPLICATIONINSIGHTS_CONNECTION_STRING'
    ]
  }
}
```
