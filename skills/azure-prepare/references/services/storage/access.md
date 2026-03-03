# Storage - Access Patterns

## Prerequisites for Granting Storage Access

> ⚠️ **Important**: To assign storage roles to managed identities, you need:
> - **User Access Administrator** or **Owner** role on the Storage Account (or parent resource group/subscription)
> - The role must include the `Microsoft.Authorization/roleAssignments/write` permission

**Common scenarios**:
- Granting Storage Blob Data Owner to a Web App or Function App's managed identity (System Assigned or User Assigned)
- Adding read/write access to blobs, queues, and tables for application workloads
- Allowing user identities (developers, data admins) access in dev/test environments
- Allowing applications to access storage using managed identity instead of connection strings

**Scope best practices**:
- Grant roles at the **smallest scope possible** (e.g., specific storage account, not resource group or subscription)
- Avoid broad scopes (Resource Group, Subscription, Tenant) unless absolutely necessary
- Prefer resource-level assignments for production workloads

**Managed identity types**:
- **System Assigned**: Automatically created with the resource (Web App, Function). Default when using `DefaultAzureCredential`.
- **User Assigned**: Standalone identity that can be shared across resources. Requires additional configuration:
  - Set `AZURE_CLIENT_ID` app setting to the User Assigned Managed Identity's client ID
  - Configure identity in Bicep with both `type: 'SystemAssigned, UserAssigned'` and `userAssignedIdentities`

If you encounter `AuthorizationFailed` errors when assigning roles, ensure you have User Access Administrator or Owner permissions at the target scope.

## Managed Identity Role Assignment

```bicep
resource storageRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, principalId, 'Storage Blob Data Contributor')
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}
```

## Storage Roles

| Role | Permissions |
|------|-------------|
| Storage Blob Data Reader | Read blobs |
| Storage Blob Data Contributor | Read/write blobs |
| Storage Queue Data Contributor | Read/write queues |
| Storage Table Data Contributor | Read/write tables |

## SDK Connection Patterns

### Node.js

```javascript
const { BlobServiceClient } = require("@azure/storage-blob");

const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING
);
const containerClient = blobServiceClient.getContainerClient("uploads");
```

### Python

```python
from azure.storage.blob import BlobServiceClient

blob_service_client = BlobServiceClient.from_connection_string(
    os.environ["AZURE_STORAGE_CONNECTION_STRING"]
)
container_client = blob_service_client.get_container_client("uploads")
```

### .NET

```csharp
var blobServiceClient = new BlobServiceClient(
    Environment.GetEnvironmentVariable("AZURE_STORAGE_CONNECTION_STRING")
);
var containerClient = blobServiceClient.GetBlobContainerClient("uploads");
```

## Managed Identity Access

Use `DefaultAzureCredential` for local development (in production, use `ManagedIdentityCredential` — see [auth-best-practices.md](../../auth-best-practices.md)):

```javascript
const { DefaultAzureCredential } = require("@azure/identity");
const { BlobServiceClient } = require("@azure/storage-blob");

const client = new BlobServiceClient(
  `https://${accountName}.blob.core.windows.net`,
  new DefaultAzureCredential()
);
```
