---
name: sst-storage-secretless-auth
description: 'Helps migrate Azure Storage Accounts from access key authentication to Microsoft Entra ID (Managed Identity) authentication — eliminating credential leakage risk and aligning with security best practices.'
metadata:
  version: "1.0.0"
---

# Azure Storage: Migrate to Managed Identity Authentication

> **Disclaimer**: This is an AI-powered assistant. Always review generated code
> and infrastructure changes carefully before deploying.

---

## Overview

This skill helps you migrate Azure Storage Accounts from access key-based authentication to Microsoft Entra ID (Managed Identity) — a security best practice aligned with [**Pillar 1: Protect identities and secrets**](https://learn.microsoft.com/security/zero-trust/sfi/secure-future-initiative-identity-overview) of Microsoft's [Secure Future Initiative](https://learn.microsoft.com/security/zero-trust/sfi/secure-future-initiative-overview) and [Zero Trust principles](https://learn.microsoft.com/security/zero-trust/).

Eliminating shared access keys reduces credential leakage risk, simplifies secret management, and enforces the Zero Trust principle of verifying explicitly. Microsoft's public Azure Storage documentation [recommends using Microsoft Entra ID with managed identities](https://learn.microsoft.com/azure/storage/common/authorize-data-access) for authorizing requests against blob, queue, and table data.

This skill provides guidance, code samples, and step-by-step instructions. You are responsible for testing, validating, and deploying changes in your environment.

| **Security Principle** | [SFI Pillar 1: Protect identities and secrets](https://learn.microsoft.com/security/zero-trust/sfi/secure-future-initiative-identity-overview) — eliminate shared secrets, authenticate with managed identities. See also: [Zero Trust: Verify explicitly](https://learn.microsoft.com/security/zero-trust/) |
|---|---|

| Step | Action | Tools/Artifacts |
|------|--------|-----------------|
| **1. Enable Managed Identity** | Configure Managed Identity on the application resource (App Service, Container App, AKS, VM, etc.) | IaC templates, Azure Portal, Azure CLI |
| **2. Validate No Key Usage** | Confirm no code or config explicitly uses access keys in production | Code search, connection string audit |
| **3. Migrate Client Code** | Update code to use token-based credentials instead of connection strings | SDK code changes |
| **4. Disable Access Keys** | Set `allowSharedKeyAccess: false` on the Storage Account | Bicep/ARM template |
| **5. Rotate Keys** | Rotate access keys as a final security measure after disabling | Azure Portal, Azure CLI |

---

## Engagement Mode: Explain Before Proposing

While working through this skill, you are in **explanation mode** until the developer
**explicitly asks for changes** — help them understand what the guidance recommends and how
it applies; do not draft a plan or propose edits.

- **Lead with the "why" in prose** — what the guidance recommends and how it applies here, not a checklist, table, or file list. Name the docs as the source.
- **Offer the scan as read-only** — say why, and wait for the developer to accept before scanning.
- **Report findings as coverage** — what's done, partial, or not yet done; never a change list.
- **Don't ask pre-edit decisions** (credential type, target version) until the developer asks to proceed.
- **Close with an understanding or options check** — never "Shall I apply this?" before they engage.
- **Scan consent ≠ edit consent; exit only on an explicit "make the change" signal** — a prior "yes" to scanning doesn't count.

---

## First Step: Fetch the Public Docs

**Do this before anything else** — before scanning the codebase, proposing changes, or following any step below. Fetch the docs below and reuse them as you work through this skill. Treat them as the source of truth: if a live doc and any value written into this skill disagree, **the live doc wins**.

**Why — the security goal (SFI, kept current by the SFI team):**
- [SFI Pillar 1: Protect identities and secrets](https://learn.microsoft.com/security/zero-trust/sfi/secure-future-initiative-identity-overview) — the goal this migration serves: eliminate shared secrets and authenticate with managed identities. Use it for the rationale and current pillar objectives.

**How — the remediation steps (service docs):**
- [Authorize access to data in Azure Storage](https://learn.microsoft.com/azure/storage/common/authorize-data-access) — the recommended authorization approach and which option to use per service (blob / queue / table / file).
- [Authorize access to blobs using Microsoft Entra ID](https://learn.microsoft.com/azure/storage/blobs/authorize-access-azure-active-directory) — the built-in Storage data-plane RBAC roles.
- [Prevent Shared Key authorization](https://learn.microsoft.com/azure/storage/common/shared-key-authorization-prevent) — disabling shared-key access (the cutover step).

Use the **How** docs as the source of truth for:
- Built-in **Storage data-plane RBAC role names and role IDs** (e.g. Storage Blob Data Reader / Contributor / Owner)
- The **`allowSharedKeyAccess`** property and how to disable shared-key auth
- SDK **package names and minimum versions** per language
- Current **endpoint / URL formats** and user-delegation-SAS guidance

Use the **Why** doc as the source of truth for which SFI objective applies and the current principle framing.

**If a fetch fails**, tell the user, share the doc URL so they can read it themselves, and continue with the inline guidance below — note that role names/IDs, the disable-shared-key property, package versions, and code samples may be out of date.

**If the codebase uses more than one language / SDK** (e.g. .NET + Python + Java), list the detected languages and ask the user whether to focus on a single language for this session (others deferred) or work through all of them. Do not pick a default.

> **Note:** Subsequent references to "the fetched docs" in this skill mean the **How** docs you fetched in this step. Do not re-fetch on every reference.

---

## Credential Guidance: Choosing the Right Credential Type

When migrating to token-based authentication, the Azure Identity client library offers several credential types. The right choice depends on your environment and security requirements:

| Credential Type | Best For | Tradeoffs |
|-----------------|----------|-----------|
| **`ManagedIdentityCredential`** | Production services hosted on Azure | Most explicit — uses only Managed Identity. No fallback chain means no unintended credential sources. Recommended when you want maximum control over which identity authenticates. |
| **`DefaultAzureCredential`** | Development and simpler deployments | Convenient — automatically tries multiple credential sources (Managed Identity, environment variables, Azure CLI, etc.) in sequence. Simplifies local dev and production with a single code path. Less explicit about which credential is used at runtime. |
| **`ChainedTokenCredential`** | Custom credential chains | Lets you define exactly which credential types to try and in what order. Useful when you need a specific fallback chain (e.g., Managed Identity → Azure CLI for local dev). |

> **Security context:** For production services where you know the application runs on an Azure host with Managed Identity enabled, `ManagedIdentityCredential` provides the most explicit and controlled authentication — it eliminates ambiguity about which credential source is used. For development or scenarios where the same code must work across environments, `DefaultAzureCredential` provides a convenient single-code-path approach.
>
> See the [Azure Identity client library documentation](https://learn.microsoft.com/dotnet/api/overview/azure/identity-readme) and [Azure Identity best practices](https://learn.microsoft.com/azure/security/fundamentals/identity-management-best-practices) for current guidance on choosing credential types.

The code examples in this guide use `ManagedIdentityCredential` for production examples and note `DefaultAzureCredential` as an alternative where appropriate.

---

## Step 1: Enable Managed Identity

> Do not start this step until the developer has explicitly asked for changes — until then,
> see **Engagement Mode: Explain Before Proposing** above.

### 1.1 Infrastructure (Bicep/ARM)

Enable Managed Identity on your application resource:

**App Service / Function App:**
```bicep
resource appService 'Microsoft.Web/sites@2022-03-01' = {
  name: appServiceName
  location: location
  identity: {
    type: 'SystemAssigned'  // or 'UserAssigned' with userAssignedIdentities
  }
  // ... other properties
}
```

**Container App:**
```bicep
resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: containerAppName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  // ... other properties
}
```

**AKS (with Workload Identity):**
```bicep
resource aksCluster 'Microsoft.ContainerService/managedClusters@2023-07-01' = {
  name: aksClusterName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    securityProfile: {
      workloadIdentity: {
        enabled: true
      }
    }
    oidcIssuerProfile: {
      enabled: true
    }
    // ... other properties
  }
}
```

---

### 1.2 Assign RBAC Roles

Grant the Managed Identity appropriate roles on the Storage Account:

**Common Storage Roles:**
- **Storage Blob Data Owner** (`b7e6dc6d-f1e8-4753-8033-0f276bb0955b`) — Full access to blobs (read, write, delete, manage ACLs)
- **Storage Blob Data Contributor** (`ba92f5b4-2d11-453d-a403-e96b0029c9fe`) — Read, write, and delete blobs
- **Storage Blob Data Reader** (`2a2b9908-6ea1-4ae2-8e65-a410df84e7d1`) — Read-only access to blobs
- **Storage Queue Data Contributor** (`974c5e8b-45b9-4653-ba55-5f855dd0fb88`) — Read, write, and delete queue messages
- **Storage Table Data Contributor** (`0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3`) — Read, write, and delete table entities

**Bicep Example (System-Assigned Identity):**
```bicep
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' existing = {
  name: storageAccountName
}

resource blobRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, appService.id, 'Storage Blob Data Contributor')
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
    principalId: appService.identity.principalId
    principalType: 'ServicePrincipal'
  }
}
```

**Bicep Example (User-Assigned Identity):**
```bicep
resource userAssignedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = {
  name: userAssignedIdentityName
}

resource blobRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, userAssignedIdentity.id, 'Storage Blob Data Contributor')
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
    principalId: userAssignedIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}
```

**Azure CLI (System-Assigned Identity):**
```bash
# Get the principal ID of the app service's managed identity
PRINCIPAL_ID=$(az webapp identity show --name <app-name> --resource-group <rg-name> --query principalId -o tsv)

# Assign the role
az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role "Storage Blob Data Contributor" \
  --scope /subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Storage/storageAccounts/<storage-account-name>
```

---

## Step 2: Validate No Key Usage in Production

### 2.1 Search for Access Key Patterns

**Connection String Patterns (search your codebase):**
- `AccountKey=`
- `SharedAccessSignature=`
- `UseDevelopmentStorage=true`
- `.GetConnectionString(`
- `AZURE_STORAGE_CONNECTION_STRING`
- `AzureWebJobsStorage` (for Functions)

**Code Patterns to Find:**
- `.NET`: `new BlobServiceClient(connectionString)`
- `Python`: `BlobServiceClient.from_connection_string()`
- `Java`: Connection strings in `BlobServiceClientBuilder`

**What to Look For:**
- Environment variables or Key Vault secrets storing connection strings
- Application configuration files with `AccountKey=`
- Deployment pipelines injecting connection strings

---

### 2.2 Configuration Audit

**Before (Access Key — DO NOT USE IN PRODUCTION):**
```json
{
  "AzureStorage": {
    "ConnectionString": "DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=xxxxx;EndpointSuffix=core.windows.net"
  }
}
```

**After (Managed Identity):**
```json
{
  "AzureStorage": {
    "AccountName": "myaccount",
    "BlobServiceUri": "https://myaccount.blob.core.windows.net",
    "QueueServiceUri": "https://myaccount.queue.core.windows.net",
    "TableServiceUri": "https://myaccount.table.core.windows.net"
  }
}
```

---

## Step 3: Migrate Client Code to Managed Identity

### 3.1 .NET (C#)

**Before (Access Key):**
```csharp
using Azure.Storage.Blobs;

// ❌ DO NOT USE IN PRODUCTION
var connectionString = configuration["AzureStorage:ConnectionString"];
var blobServiceClient = new BlobServiceClient(connectionString);
```

**After (Managed Identity):**
```csharp
using Azure.Identity;
using Azure.Storage.Blobs;

// ✅ Correct: Use ManagedIdentityCredential
var blobServiceUri = new Uri(configuration["AzureStorage:BlobServiceUri"]);
var credential = new ManagedIdentityCredential();
var blobServiceClient = new BlobServiceClient(blobServiceUri, credential);
```

**For User-Assigned Identity:**
```csharp
var clientId = configuration["ManagedIdentity:ClientId"];
var credential = new ManagedIdentityCredential(clientId);
var blobServiceClient = new BlobServiceClient(blobServiceUri, credential);
```

**Dependency Injection Pattern:**
```csharp
// Program.cs or Startup.cs
services.AddSingleton(sp => {
    var config = sp.GetRequiredService<IConfiguration>();
    var blobServiceUri = new Uri(config["AzureStorage:BlobServiceUri"]);
    var credential = new ManagedIdentityCredential();
    return new BlobServiceClient(blobServiceUri, credential);
});
```

**Required NuGet Packages:**
```xml
<PackageReference Include="Azure.Storage.Blobs" Version="12.19.1" />
<PackageReference Include="Azure.Identity" Version="1.10.4" />
```

---

### 3.2 Python

**Before (Access Key):**
```python
from azure.storage.blob import BlobServiceClient

# ❌ DO NOT USE IN PRODUCTION
connection_string = os.environ["AZURE_STORAGE_CONNECTION_STRING"]
blob_service_client = BlobServiceClient.from_connection_string(connection_string)
```

**After (Managed Identity):**
```python
from azure.identity import ManagedIdentityCredential
from azure.storage.blob import BlobServiceClient

# ✅ Correct: Use ManagedIdentityCredential
account_url = "https://myaccount.blob.core.windows.net"
credential = ManagedIdentityCredential()
blob_service_client = BlobServiceClient(account_url=account_url, credential=credential)
```

**For User-Assigned Identity:**
```python
credential = ManagedIdentityCredential(client_id="<user-assigned-identity-client-id>")
blob_service_client = BlobServiceClient(account_url=account_url, credential=credential)
```

**Required Packages:**
```
azure-storage-blob>=12.19.0
azure-identity>=1.15.0
```

---

### 3.3 Java

**Before (Access Key):**
```java
import com.azure.storage.blob.BlobServiceClient;
import com.azure.storage.blob.BlobServiceClientBuilder;

// ❌ DO NOT USE IN PRODUCTION
String connectionString = System.getenv("AZURE_STORAGE_CONNECTION_STRING");
BlobServiceClient blobServiceClient = new BlobServiceClientBuilder()
    .connectionString(connectionString)
    .buildClient();
```

**After (Managed Identity):**
```java
import com.azure.identity.ManagedIdentityCredential;
import com.azure.identity.ManagedIdentityCredentialBuilder;
import com.azure.storage.blob.BlobServiceClient;
import com.azure.storage.blob.BlobServiceClientBuilder;

// ✅ Correct: Use ManagedIdentityCredential
String endpoint = "https://myaccount.blob.core.windows.net";
ManagedIdentityCredential credential = new ManagedIdentityCredentialBuilder().build();
BlobServiceClient blobServiceClient = new BlobServiceClientBuilder()
    .endpoint(endpoint)
    .credential(credential)
    .buildClient();
```

**For User-Assigned Identity:**
```java
ManagedIdentityCredential credential = new ManagedIdentityCredentialBuilder()
    .clientId("<user-assigned-identity-client-id>")
    .build();
```

**Required Maven Dependencies:**
```xml
<dependency>
  <groupId>com.azure</groupId>
  <artifactId>azure-storage-blob</artifactId>
  <version>12.25.0</version>
</dependency>
<dependency>
  <groupId>com.azure</groupId>
  <artifactId>azure-identity</artifactId>
  <version>1.11.0</version>
</dependency>
```

---

### 3.4 Node.js (JavaScript/TypeScript)

**Before (Access Key):**
```javascript
const { BlobServiceClient } = require("@azure/storage-blob");

// ❌ DO NOT USE IN PRODUCTION
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
```

**After (Managed Identity):**
```javascript
const { BlobServiceClient } = require("@azure/storage-blob");
const { ManagedIdentityCredential } = require("@azure/identity");

// ✅ Correct: Use ManagedIdentityCredential
const accountUrl = "https://myaccount.blob.core.windows.net";
const credential = new ManagedIdentityCredential();
const blobServiceClient = new BlobServiceClient(accountUrl, credential);
```

**Required npm Packages:**
```json
{
  "dependencies": {
    "@azure/storage-blob": "^12.17.0",
    "@azure/identity": "^4.0.0"
  }
}
```

---

## Step 3.5: Migrate SAS Tokens to User Delegation SAS

If your application generates or uses **Shared Access Signature (SAS) tokens**, you must switch from account-key-signed SAS to **User Delegation SAS** before disabling shared key access.

> **User Delegation SAS** is the only SAS type that remains functional when `allowSharedKeyAccess` is set to `false`. It is signed with Entra ID credentials instead of the storage account key, making it the **preferred and most secure SAS method**.

For full details, see: [Create a user delegation SAS](https://learn.microsoft.com/rest/api/storageservices/create-user-delegation-sas)

### Why User Delegation SAS?

| SAS Type | Signed With | Works After Key Disable? | Recommended? |
|----------|-------------|--------------------------|-------------|
| **Account SAS** | Storage account key | ❌ No | ❌ |
| **Service SAS** | Storage account key | ❌ No | ❌ |
| **User Delegation SAS** | Entra ID (OAuth 2.0) | ✅ Yes | ✅ Preferred |

### .NET Example — User Delegation SAS

```csharp
using Azure.Identity;
using Azure.Storage.Blobs;
using Azure.Storage.Sas;

// Authenticate with Managed Identity
var credential = new ManagedIdentityCredential();
var blobServiceClient = new BlobServiceClient(
    new Uri("https://<account>.blob.core.windows.net"), credential);

// Get user delegation key (valid for up to 7 days)
var delegationKey = await blobServiceClient.GetUserDelegationKeyAsync(
    DateTimeOffset.UtcNow, DateTimeOffset.UtcNow.AddHours(1));

// Build a SAS for a specific blob container
var sasBuilder = new BlobSasBuilder
{
    BlobContainerName = "my-container",
    Resource = "c",  // "c" = container, "b" = blob
    StartsOn = DateTimeOffset.UtcNow,
    ExpiresOn = DateTimeOffset.UtcNow.AddHours(1)
};
sasBuilder.SetPermissions(BlobContainerSasPermissions.Read | BlobContainerSasPermissions.List);

var sasToken = sasBuilder.ToSasQueryParameters(delegationKey, blobServiceClient.AccountName);
var sasUri = new UriBuilder(blobServiceClient.Uri)
{
    Query = sasToken.ToString()
};
```

### Python Example — User Delegation SAS

```python
from azure.identity import ManagedIdentityCredential
from azure.storage.blob import BlobServiceClient, generate_container_sas, ContainerSasPermissions
from datetime import datetime, timedelta, timezone

credential = ManagedIdentityCredential()
blob_service_client = BlobServiceClient(
    account_url="https://<account>.blob.core.windows.net", credential=credential)

# Get user delegation key
delegation_key = blob_service_client.get_user_delegation_key(
    key_start_time=datetime.now(timezone.utc),
    key_expiry_time=datetime.now(timezone.utc) + timedelta(hours=1))

# Generate container SAS signed with delegation key
sas_token = generate_container_sas(
    account_name="<account>",
    container_name="my-container",
    user_delegation_key=delegation_key,
    permission=ContainerSasPermissions(read=True, list=True),
    expiry=datetime.now(timezone.utc) + timedelta(hours=1))
```

### Key Requirements for User Delegation SAS

- The identity requesting the delegation key must have the **Storage Blob Data** RBAC role (Contributor, Reader, or Delegator)
- User delegation keys are valid for a **maximum of 7 days**
- Supported for **Blob Storage and Azure Data Lake Storage Gen2** only (not Files, Tables, or Queues)
- Always set the **shortest practical expiry** for SAS tokens

---

## Step 4: Disable Access Keys on Storage Account

### 4.1 Infrastructure Change (Bicep)

**Disable Shared Key Access:**
```bicep
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowSharedKeyAccess: false  // ✅ Disables access key authentication
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    // ... other properties
  }
}
```

**Azure CLI:**
```bash
az storage account update \
  --name <storage-account-name> \
  --resource-group <resource-group-name> \
  --allow-shared-key-access false
```

**What This Does:**
- Disables access key-based authentication for data plane operations
- Storage account keys still exist but cannot be used to access data
- Only Entra ID (RBAC) and **User Delegation SAS** tokens (signed with Entra ID credentials) are allowed — see Step 3.5
- Management plane operations (listing keys via ARM API) are unaffected

---

### 4.2 Rotate Access Keys (Post-Disable)

Even though keys are disabled, rotate them as a security best practice:

**Azure CLI:**
```bash
# Rotate key1
az storage account keys renew \
  --account-name <storage-account-name> \
  --resource-group <resource-group-name> \
  --key key1

# Rotate key2
az storage account keys renew \
  --account-name <storage-account-name> \
  --resource-group <resource-group-name> \
  --key key2
```

**PowerShell:**
```powershell
# Rotate key1
New-AzStorageAccountKey -ResourceGroupName <rg-name> -Name <storage-account-name> -KeyName key1

# Rotate key2
New-AzStorageAccountKey -ResourceGroupName <rg-name> -Name <storage-account-name> -KeyName key2
```

---

## Rollback Instructions

If issues arise after disabling shared key access:

### Re-enable Shared Key Access

**Bicep:**
```bicep
properties: {
  allowSharedKeyAccess: true  // Temporarily re-enable
}
```

**Azure CLI:**
```bash
az storage account update \
  --name <storage-account-name> \
  --resource-group <resource-group-name> \
  --allow-shared-key-access true
```

**When to Rollback:**
- Application errors indicating authentication failures
- Dependency services not yet migrated to Managed Identity
- Third-party tools requiring access key authentication

**After Rollback:**
- Investigate and fix the root cause
- Test Managed Identity authentication in a non-production environment
- Retry disabling shared key access after validation

---

## Common Issues and Troubleshooting

### Issue: "This request is not authorized to perform this operation"

**Cause:** Missing RBAC role assignment or incorrect role scope.

**Solution:**
1. Verify the Managed Identity has the correct role (e.g., Storage Blob Data Contributor)
2. Check the role is assigned at the correct scope (Storage Account or container level)
3. Wait 5-10 minutes for RBAC propagation (can take time in Azure AD)
4. Use Azure Portal → Storage Account → Access Control (IAM) to verify assignments

**Verification:**
```bash
# List role assignments for the storage account
az role assignment list --scope /subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Storage/storageAccounts/<storage-account-name>
```

---

### Issue: "ManagedIdentityCredential authentication unavailable"

**Cause:** Application is running in an environment without Managed Identity enabled, or environment variables are misconfigured.

**Solution:**
1. Verify Managed Identity is enabled on the resource (App Service, VM, etc.)
2. Check for typos in User-Assigned Identity client ID
3. For local development, use Azure CLI authentication or environment variables (not in production)
4. Review logs for specific error messages

**Local Development Alternative (Non-Production):**
```csharp
// For local dev ONLY — not production code
var credential = new ChainedTokenCredential(
    new ManagedIdentityCredential(),
    new AzureCliCredential()
);
```

---

### Issue: Azure Functions with AzureWebJobsStorage

**Problem:** Azure Functions runtime requires `AzureWebJobsStorage` connection string for triggers and bindings.

**Solution (Functions v4.x+):**
Use Managed Identity for `AzureWebJobsStorage`:

**In `host.json` or configuration:**
```json
{
  "AzureWebJobsStorage__accountName": "mystorageaccount",
  "AzureWebJobsStorage__credential": "managedidentity",
  "AzureWebJobsStorage__clientId": "<optional-user-assigned-identity-client-id>"
}
```

**Bicep/ARM:**
```bicep
resource functionApp 'Microsoft.Web/sites@2022-03-01' = {
  name: functionAppName
  properties: {
    siteConfig: {
      appSettings: [
        {
          name: 'AzureWebJobsStorage__accountName'
          value: storageAccountName
        }
        {
          name: 'AzureWebJobsStorage__credential'
          value: 'managedidentity'
        }
      ]
    }
  }
}
```

**Reference:** [https://learn.microsoft.com/azure/azure-functions/functions-reference#connecting-to-host-storage-with-an-identity](https://learn.microsoft.com/azure/azure-functions/functions-reference#connecting-to-host-storage-with-an-identity)

---

## Quality Checklist

Use this checklist to validate your migration:

- [ ] **Managed Identity is enabled** on the application resource (App Service, Container App, AKS, VM, etc.)
- [ ] **RBAC roles are assigned** with appropriate permissions (Blob Data Contributor, Queue Data Contributor, etc.)
- [ ] **Code migrated** to use token-based credentials (e.g., `ManagedIdentityCredential` or `DefaultAzureCredential`) instead of connection strings
- [ ] **No connection strings** with `AccountKey=` in production configuration or Key Vault
- [ ] **Config updated** to use account URLs instead of connection strings
- [ ] **Tested in non-production** environment (dev, staging) before production deployment
- [ ] **`allowSharedKeyAccess: false`** set on the Storage Account in IaC templates
- [ ] **Access keys rotated** after disabling shared key access
- [ ] **Monitoring and alerts** configured for authentication failures
- [ ] **Documentation updated** with new authentication approach for the team

---

## Deployment Guidance

Deploy changes incrementally to reduce risk:

1. **Deploy IaC changes first** (Managed Identity, RBAC roles) in a non-production environment
2. **Deploy code changes next** (token-based credential usage) — validate authentication works
3. **Monitor for errors** — check application logs, Azure Monitor, and availability metrics
4. **Disable shared key access** only after validating Managed Identity authentication in production
5. **Have a rollback plan** — document rollback steps and criteria

**Do not disable access keys until you've validated end-to-end Managed Identity authentication in production.**

Deploy following your organization's change management process.

---

## Optional: Enforce Disabled Shared Key Access via Azure Policy

After successfully migrating to Entra ID authentication, you can use **Azure Policy** to enforce disabled shared key access across all Storage Accounts in your subscription. This prevents accidental re-enabling of local authentication.

For details on how to prevent shared key authorization, see: [Prevent Shared Key authorization for an Azure Storage account](https://learn.microsoft.com/azure/storage/common/shared-key-authorization-prevent)

---

## Related Resources

| Resource | Link |
|----------|------|
| **SFI Pillar 1: Protect identities and secrets** | [https://learn.microsoft.com/security/zero-trust/sfi/secure-future-initiative-identity-overview](https://learn.microsoft.com/security/zero-trust/sfi/secure-future-initiative-identity-overview) |
| **Zero Trust Principles** | [https://learn.microsoft.com/security/zero-trust/](https://learn.microsoft.com/security/zero-trust/) |
| **Azure Storage Entra ID Auth Docs** | [https://learn.microsoft.com/azure/storage/common/authorize-data-access](https://learn.microsoft.com/azure/storage/common/authorize-data-access) |
| **Managed Identity Overview** | [https://learn.microsoft.com/azure/active-directory/managed-identities-azure-resources/overview](https://learn.microsoft.com/azure/active-directory/managed-identities-azure-resources/overview) |
| **Azure Identity Best Practices** | [https://learn.microsoft.com/azure/security/fundamentals/identity-management-best-practices](https://learn.microsoft.com/azure/security/fundamentals/identity-management-best-practices) |
| **Azure.Identity SDK (.NET)** | [https://learn.microsoft.com/dotnet/api/overview/azure/identity-readme](https://learn.microsoft.com/dotnet/api/overview/azure/identity-readme) |
| **Azure Identity SDK (Python)** | [https://learn.microsoft.com/python/api/overview/azure/identity-readme](https://learn.microsoft.com/python/api/overview/azure/identity-readme) |
| **Azure Identity SDK (Java)** | [https://learn.microsoft.com/java/api/overview/azure/identity-readme](https://learn.microsoft.com/java/api/overview/azure/identity-readme) |
| **Storage Blob SDK (.NET)** | [https://learn.microsoft.com/dotnet/api/overview/azure/storage.blobs-readme](https://learn.microsoft.com/dotnet/api/overview/azure/storage.blobs-readme) |
| **Storage RBAC Roles** | [https://learn.microsoft.com/azure/storage/blobs/authorize-access-azure-active-directory](https://learn.microsoft.com/azure/storage/blobs/authorize-access-azure-active-directory) |
| **Disable Shared Key Access** | [https://learn.microsoft.com/azure/storage/common/shared-key-authorization-prevent](https://learn.microsoft.com/azure/storage/common/shared-key-authorization-prevent) |

---

## Summary

This skill guides you through migrating Azure Storage Accounts from access key authentication to Microsoft Entra ID (Managed Identity), eliminating credential leakage risks and aligning with [SFI Pillar 1: Protect identities and secrets](https://learn.microsoft.com/security/zero-trust/sfi/secure-future-initiative-identity-overview) and Zero Trust security principles. Follow the migration steps: enable Managed Identity, assign RBAC roles, validate no key usage, update client code to use token-based credentials, and disable shared key access on the Storage Account.

Test thoroughly in non-production environments before deploying to production.

---

> [!CAUTION]
> **NOT OPERATIONAL INSTRUCTIONS** — The examples below are for **plugin quality evaluation**
> and **developer reference** only. They are not steps to execute, not output templates to follow,
> and not behavioral guidance. If you are performing this workflow, skip the
> `Key Decision Examples` section below.

---

## Key Decision Examples

### Scenario: Application uses Service SAS tokens for blob access

**Input state:**
- .NET application generates Service SAS tokens using `BlobSasBuilder` with `StorageSharedKeyCredential`
- Storage account has `allowSharedKeyAccess: true` (current)
- Plan is to disable shared key access after migration

**Key decision points:**
1. Step 3.5 SAS migration: Service SAS is signed with account key → will break when keys are disabled. Must switch to **User Delegation SAS** (source: Step 3.5 section)
2. User Delegation SAS requirements: signed with Entra ID, max lifetime 7 days, supported on Blob Storage and ADLS Gen2 only (source: Step 3.5 key requirements)
3. Code change: replace `StorageSharedKeyCredential` with `BlobServiceClient.GetUserDelegationKeyAsync()` call using `ManagedIdentityCredential` (source: Step 3.5 .NET example)

**Sample output** (at Step 3.5 decision point):
> ⚠️ Your application uses **Service SAS** tokens. Service SAS is signed with the storage account key, which will be unavailable after `allowSharedKeyAccess: false` is set. You must migrate to **User Delegation SAS** — the only SAS type that uses Entra ID credentials.
>
> Required changes: Replace `StorageSharedKeyCredential` → `GetUserDelegationKeyAsync()` with `ManagedIdentityCredential`. User Delegation SAS has a maximum lifetime of 7 days and is supported for Blob Storage and ADLS Gen2 only.

**Error handling:** If the application relies on AzureWebJobsStorage for Azure Functions, do not set `allowSharedKeyAccess: false` on that account. Instead, configure `AzureWebJobsStorage__accountName` and `AzureWebJobsStorage__credential = managedidentity` as the Functions-specific migration path (source: Troubleshooting section).

---
