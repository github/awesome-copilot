# Key Vault - Bicep Patterns

## Basic Vault

```bicep
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${resourcePrefix}-kv-${uniqueHash}'
  location: location
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
  }
}
```

## Storing Secrets

```bicep
resource secret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'database-connection-string'
  properties: {
    value: databaseConnectionString
  }
}
```

## Role Assignment (Managed Identity)

```bicep
resource keyVaultRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, principalId, 'Key Vault Secrets User')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}
```

## Referencing in App Service / Functions

```bicep
appSettings: [
  {
    name: 'DATABASE_URL'
    value: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=database-connection-string)'
  }
]
```

## Referencing in Container Apps

```bicep
secrets: [
  {
    name: 'db-connection'
    keyVaultUrl: '${keyVault.properties.vaultUri}secrets/database-connection-string'
    identity: containerApp.identity.principalId
  }
]
```

## Secret with Expiration

```bicep
resource secret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'api-key'
  properties: {
    value: apiKey
    attributes: {
      exp: dateTimeToEpoch(dateTimeAdd(utcNow(), 'P90D'))
    }
  }
}
```
