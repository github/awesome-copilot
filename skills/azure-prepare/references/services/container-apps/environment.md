# Container Apps Environment Variables

## Standard Environment Variables

```bicep
env: [
  {
    name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
    value: applicationInsights.properties.ConnectionString
  }
  {
    name: 'AZURE_CLIENT_ID'
    value: managedIdentity.properties.clientId
  }
]
```

## Secret References (Key Vault)

Use secrets for sensitive values:

```bicep
configuration: {
  secrets: [
    {
      name: 'database-url'
      keyVaultUrl: 'https://myvault.vault.azure.net/secrets/database-url'
      identity: managedIdentity.id
    }
  ]
}

template: {
  containers: [
    {
      env: [
        {
          name: 'DATABASE_URL'
          secretRef: 'database-url'
        }
      ]
    }
  ]
}
```

## Common Variables

| Variable | Source | Notes |
|----------|--------|-------|
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | App Insights | Telemetry |
| `AZURE_CLIENT_ID` | Managed Identity | SDK auth |
| `DATABASE_URL` | Key Vault secret | Connection string |
| `REDIS_URL` | Key Vault secret | Cache connection |

## Best Practices

- Never hardcode secrets in Bicep
- Use Key Vault references for all sensitive values
- Use Managed Identity for authentication
- Set `AZURE_CLIENT_ID` for SDK-based auth
