# AKS - Bicep Patterns

## Cluster Resource

```bicep
resource aks 'Microsoft.ContainerService/managedClusters@2023-07-01' = {
  name: '${resourcePrefix}-aks-${uniqueHash}'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    dnsPrefix: '${resourcePrefix}-aks'
    kubernetesVersion: '1.28'
    agentPoolProfiles: [
      {
        name: 'default'
        count: 3
        vmSize: 'Standard_DS2_v2'
        mode: 'System'
        osType: 'Linux'
        enableAutoScaling: true
        minCount: 1
        maxCount: 5
      }
    ]
    networkProfile: {
      networkPlugin: 'azure'
      serviceCidr: '10.0.0.0/16'
      dnsServiceIP: '10.0.0.10'
    }
  }
}
```

## ACR Pull Role Assignment

```bicep
resource acrPullRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(aks.id, containerRegistry.id, 'acrpull')
  scope: containerRegistry
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
    principalId: aks.properties.identityProfile.kubeletidentity.objectId
    principalType: 'ServicePrincipal'
  }
}
```

## Node Pool Configuration

### System Pool (Required)

```bicep
{
  name: 'system'
  count: 3
  vmSize: 'Standard_DS2_v2'
  mode: 'System'
  osType: 'Linux'
}
```

### User Pool (Workloads)

```bicep
{
  name: 'workload'
  count: 2
  vmSize: 'Standard_DS4_v2'
  mode: 'User'
  osType: 'Linux'
  enableAutoScaling: true
  minCount: 1
  maxCount: 10
}
```

## Workload Identity

```bicep
properties: {
  oidcIssuerProfile: {
    enabled: true
  }
  securityProfile: {
    workloadIdentity: {
      enabled: true
    }
  }
}
```
