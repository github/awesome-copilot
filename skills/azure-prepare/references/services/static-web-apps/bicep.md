# Static Web Apps - Bicep Patterns

## Basic Resource

```bicep
resource staticWebApp 'Microsoft.Web/staticSites@2022-09-01' = {
  name: '${resourcePrefix}-${serviceName}-${uniqueHash}'
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    buildProperties: {
      appLocation: '/'
      apiLocation: 'api'
      outputLocation: 'dist'
    }
  }
}
```

## Custom Domain

```bicep
resource customDomain 'Microsoft.Web/staticSites/customDomains@2022-09-01' = {
  parent: staticWebApp
  name: 'www.example.com'
  properties: {}
}
```

## Application Settings

For the integrated API:

```bicep
resource staticWebAppSettings 'Microsoft.Web/staticSites/config@2022-09-01' = {
  parent: staticWebApp
  name: 'appsettings'
  properties: {
    DATABASE_URL: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=db-url)'
  }
}
```

## Deployment Token

> ⚠️ **Security Warning:** Do NOT expose deployment tokens in Bicep outputs.

See [deployment.md](deployment.md) for secure token handling.
