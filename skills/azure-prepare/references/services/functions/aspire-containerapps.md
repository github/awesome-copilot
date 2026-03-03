# Azure Functions on Azure Container Apps (Aspire)

When .NET Aspire deploys Azure Functions via `azd`, Functions run as containerized workloads on Azure Container Apps. **File-based secret storage is required** when using identity-based storage access.

> ⚠️ **Critical:** When Azure Functions use identity-based storage (e.g., `AzureWebJobsStorage__blobServiceUri`), you **must** set `AzureWebJobsSecretStorageType=Files`.

## Proactive Configuration in AppHost

**Best Practice:** Add this setting in your AppHost BEFORE running `azd up`:

```csharp
var functions = builder.AddAzureFunctionsProject<Projects.Functions>("functions")
    .WithHostStorage(storage)
    .WithEnvironment("AzureWebJobsSecretStorageType", "Files")  // Required for Container Apps
    // ... other configuration
```

This ensures the environment variable is automatically included in the generated infrastructure.

## Container Apps Bicep Configuration

When Aspire generates infrastructure, the Functions container app should include this environment variable. If you need to customize the generated Bicep or create it manually, the configuration looks like this:

> **Note:** This example shows partial configuration. Assumes `containerAppEnv`, `storageAccount`, and `appInsights` resources are defined elsewhere in your Bicep templates.

```bicep
resource functionsContainerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${resourcePrefix}-${serviceName}-${uniqueHash}'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    environmentId: containerAppEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8080
      }
    }
    template: {
      containers: [
        {
          name: 'functions-app'
          image: containerImage
          env: [
            {
              name: 'AzureWebJobsStorage__blobServiceUri'
              value: storageAccount.properties.primaryEndpoints.blob
            }
            {
              name: 'AzureWebJobsSecretStorageType'
              value: 'Files'  // Required for Container Apps with identity-based storage
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              value: appInsights.properties.ConnectionString
            }
            {
              name: 'FUNCTIONS_EXTENSION_VERSION'
              value: '~4'
            }
            {
              name: 'FUNCTIONS_WORKER_RUNTIME'
              value: 'dotnet-isolated'
            }
          ]
        }
      ]
    }
  }
}
```

## Why This Is Required

- Identity-based storage URIs (e.g., `AzureWebJobsStorage__blobServiceUri`) work for runtime operations
- However, Functions' internal secret/key management does not support these identity-based URIs
- File-based secret storage is mandatory for Container Apps deployments with identity-based storage

## Common Error Without This Setting

```
System.InvalidOperationException: Secret initialization from Blob storage failed due to missing both
an Azure Storage connection string and a SAS connection uri.
```

## When to Use This Configuration

- Deploying Azure Functions to Container Apps via .NET Aspire
- Using `AddAzureFunctionsProject` with `WithHostStorage` in your AppHost
- Using identity-based storage access (no connection strings)
- Setting environment variables like `AzureWebJobsStorage__blobServiceUri`
