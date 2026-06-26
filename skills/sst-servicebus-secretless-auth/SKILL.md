---
name: sst-servicebus-secretless-auth
description: 'Helps migrate Azure Service Bus from SAS key/connection string authentication to Microsoft Entra ID (Managed Identity) authentication. Covers infrastructure changes, RBAC assignment, client code updates across .NET/Python/Java, validation, and rollback.'
metadata:
  version: "1.0.0"
---

# Azure Service Bus: Migrate to Managed Identity Authentication

> **Disclaimer**: This is an AI-powered assistant. Always review generated code
> and infrastructure changes carefully before deploying.

## Overview

This skill helps you migrate Azure Service Bus from SAS key/connection string authentication to **Microsoft Entra ID (Managed Identity) authentication** — a security best practice aligned with [**Pillar 1: Protect identities and secrets**](https://learn.microsoft.com/security/zero-trust/sfi/secure-future-initiative-identity-overview) of Microsoft's [Secure Future Initiative](https://learn.microsoft.com/security/zero-trust/sfi/secure-future-initiative-overview) and [Zero Trust principles](https://learn.microsoft.com/security/zero-trust/).

Eliminating shared secrets (SAS keys, connection strings) and using managed identities for Azure resource authentication reduces credential exposure, removes secret rotation burden, and enforces explicit identity verification for every access request.

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

- [Use managed identities to access Azure Service Bus resources](https://learn.microsoft.com/azure/service-bus-messaging/service-bus-managed-service-identity) — RBAC roles, role assignment (portal / CLI), and SDK usage.
- [Disable local authentication for Azure Service Bus](https://learn.microsoft.com/azure/service-bus-messaging/disable-local-authentication) — disabling SAS / local auth (the cutover step).

Use the **How** docs as the source of truth for:

- Built-in **Service Bus data-plane RBAC role names** (Azure Service Bus Data Owner / Sender / Receiver)
- The **`disableLocalAuth`** property on the Service Bus namespace
- SDK **package names and minimum versions** per language
- Current **fully-qualified namespace / endpoint format**

Use the **Why** doc as the source of truth for which SFI objective applies and the current principle framing.

**If a fetch fails**, tell the user, share the doc URL so they can read it themselves, and continue with the inline guidance below — note that role names, the `disableLocalAuth` property, package versions, and code samples may be out of date.

**If the codebase uses more than one language / SDK** (e.g. .NET + Java + JavaScript + Python), list the detected languages and ask the user whether to focus on a single language for this session (others deferred) or work through all of them. Do not pick a default.

> **Note:** Subsequent references to "the fetched docs" in this skill mean the **How** docs you fetched in this step. Do not re-fetch on every reference.

## When to Use This Skill

Use this skill when your codebase:

- Creates `ServiceBusClient` using a connection string or SAS key
- Stores Service Bus connection strings in configuration, environment variables, or Key Vault
- Has `disableLocalAuth` set to `false` (or unset) on Service Bus namespaces

## Prerequisites

- Azure subscription with a Service Bus namespace
- A managed identity enabled on your Azure compute resource (App Service, VM, Functions, etc.)
- Azure CLI installed for validation commands
- Appropriate permissions to assign RBAC roles on the Service Bus namespace

---

## 📋 Migration Overview

| **Aspect** | **Details** |
|------------|-------------|
| **Security Principle** | [SFI Pillar 1: Protect identities and secrets](https://learn.microsoft.com/security/zero-trust/sfi/secure-future-initiative-identity-overview) — eliminate shared secrets, authenticate with managed identities. See also: [Zero Trust: Verify explicitly](https://learn.microsoft.com/security/zero-trust/) |
| **Services Affected** | Azure Service Bus (Queues, Topics, Subscriptions) |
| **Root Cause** | Service code uses SAS keys or connection strings for authentication instead of Managed Identity |
| **Migration Goal** | Replace SAS/connection string authentication with Microsoft Entra ID (Managed Identity) and disable local auth on the Service Bus namespace |
| **Estimated Effort** | 2-4 hours (varies by number of clients and deployment complexity) |
| **Risk Level** | Medium — requires client code changes, RBAC assignment, and infrastructure configuration updates |
| **Rollback Plan** | Re-enable `disableLocalAuth: false` and revert to SAS key authentication if needed |

---

## 🚨 Credential Type Guidance

> **Recommended: Use `ManagedIdentityCredential` in production.**
>
> For a security-focused migration, [`ManagedIdentityCredential`](https://learn.microsoft.com/dotnet/api/azure.identity.managedidentitycredential) is the recommended choice for production environments:
>
> - ✅ **Explicit** — targets only the managed identity credential, no fallback chain
> - ✅ **Fails fast** — immediately surfaces misconfigurations instead of silently trying other credential types
> - ✅ **Least privilege** — uses only the intended identity, reducing attack surface
>
> **Alternative: `DefaultAzureCredential`** is a convenient option for development or simpler scenarios. It attempts multiple credential types in a [configurable chain](https://learn.microsoft.com/dotnet/azure/sdk/authentication/credential-chains), which is helpful for local development but can mask misconfigurations in production.
>
> **For local development:**
>
> - Use `AzureCliCredential` or `VisualStudioCredential` explicitly
> - Or use `DefaultAzureCredential` which automatically discovers local credentials
>
> **Example (Recommended Production Pattern):**
> ```csharp
> // Production: explicit managed identity
> var credential = new ManagedIdentityCredential(ManagedIdentityId.SystemAssigned);
> var client = new ServiceBusClient(fullyQualifiedNamespace, credential);
> ```
>
> **Example (Development/Simple Scenarios):**
> ```csharp
> // Development or simple scenarios: automatic credential discovery
> var credential = new DefaultAzureCredential();
> var client = new ServiceBusClient(fullyQualifiedNamespace, credential);
> ```
>
> See [Azure Identity client library](https://learn.microsoft.com/dotnet/api/overview/azure/identity-readme) for the full list of credential types and guidance on choosing between them.

---

## 🔧 Step-by-Step Remediation

### Step 1: Update Infrastructure-as-Code (IaC)

> Do not start this step until the developer has explicitly asked for changes — until then,
> see **Engagement Mode: Explain Before Proposing** above.

**Disable local authentication** on your Service Bus namespace.

#### **ARM Template / Bicep:**

```bicep
resource serviceBusNamespace 'Microsoft.ServiceBus/namespaces@2022-10-01-preview' = {
  name: 'your-servicebus-namespace'
  location: resourceGroup().location
  sku: {
    name: 'Standard' // or 'Premium'
    tier: 'Standard'
  }
  properties: {
    disableLocalAuth: true  // ✅ Disable SAS key authentication
    publicNetworkAccess: 'Enabled' // Adjust based on your network requirements
  }
}
```

#### **Terraform:**

```hcl
resource "azurerm_servicebus_namespace" "example" {
  name                = "your-servicebus-namespace"
  location            = azurerm_resource_group.example.location
  resource_group_name = azurerm_resource_group.example.name
  sku                 = "Standard" # or "Premium"

  local_auth_enabled  = false  # ✅ Disable SAS key authentication
  public_network_access_enabled = true
}
```

#### **Azure CLI (Manual):**

```bash
az servicebus namespace update \
  --name your-servicebus-namespace \
  --resource-group your-resource-group \
  --set properties.disableLocalAuth=true
```

---

### Step 2: Assign RBAC Roles

Grant your Managed Identity access to the Service Bus namespace.

#### **Role Options:**

| **Role** | **Role ID** | **Use Case** |
|----------|-------------|--------------|
| **Azure Service Bus Data Owner** | `090c5cfd-751d-490a-894a-3ce6f1109419` | Full access to send/receive messages and manage queues/topics |
| **Azure Service Bus Data Sender** | `69a216fc-b8fb-44d8-bc22-1f3c2cd27a39` | Send messages to queues and topics |
| **Azure Service Bus Data Receiver** | `4f6d3b9b-027b-4f4c-9142-0e5a2a2247e0` | Receive messages from queues and subscriptions |

#### **Bicep:**

```bicep
param principalId string // Managed Identity principal ID
param serviceBusNamespaceName string

resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(serviceBusNamespaceName, principalId, '090c5cfd-751d-490a-894a-3ce6f1109419')
  scope: resourceId('Microsoft.ServiceBus/namespaces', serviceBusNamespaceName)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '090c5cfd-751d-490a-894a-3ce6f1109419')
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}
```

#### **Azure CLI:**

```bash
# Get your Managed Identity principal ID
PRINCIPAL_ID=$(az identity show --name your-managed-identity --resource-group your-rg --query principalId -o tsv)

# Assign Azure Service Bus Data Owner role
az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role "090c5cfd-751d-490a-894a-3ce6f1109419" \
  --scope "/subscriptions/<subscription-id>/resourceGroups/<rg>/providers/Microsoft.ServiceBus/namespaces/<namespace-name>"
```

---

### Step 3: Update Application Code

Replace SAS key/connection string authentication with Managed Identity credential.

#### **.NET (C#):**

**Before (Connection String):**

```csharp
using Azure.Messaging.ServiceBus;

var connectionString = configuration["ServiceBus:ConnectionString"]; // ❌ Connection string
var client = new ServiceBusClient(connectionString);
var sender = client.CreateSender("queue-name");
```

**After (Managed Identity):**

```csharp
using Azure.Identity;
using Azure.Messaging.ServiceBus;

var fullyQualifiedNamespace = "your-namespace.servicebus.windows.net";
var credential = new ManagedIdentityCredential(ManagedIdentityId.SystemAssigned); // ✅ Managed Identity
var client = new ServiceBusClient(fullyQualifiedNamespace, credential);
var sender = client.CreateSender("queue-name");
```

**For User-Assigned Managed Identity:**

```csharp
using Azure.Identity;
using Azure.Messaging.ServiceBus;

var fullyQualifiedNamespace = "your-namespace.servicebus.windows.net";
var clientId = configuration["ManagedIdentity:ClientId"];
var credential = new ManagedIdentityCredential(ManagedIdentityId.FromUserAssignedClientId(clientId)); // ✅ User-assigned MI
var client = new ServiceBusClient(fullyQualifiedNamespace, credential);
```

**Receiving Messages:**

```csharp
using Azure.Identity;
using Azure.Messaging.ServiceBus;

var fullyQualifiedNamespace = "your-namespace.servicebus.windows.net";
var credential = new ManagedIdentityCredential(ManagedIdentityId.SystemAssigned);
var client = new ServiceBusClient(fullyQualifiedNamespace, credential);
var receiver = client.CreateReceiver("queue-name");

// Receive messages
ServiceBusReceivedMessage message = await receiver.ReceiveMessageAsync();
await receiver.CompleteMessageAsync(message);
```

#### **Python:**

**Before (Connection String):**

```python
from azure.servicebus import ServiceBusClient

connection_string = os.environ["SERVICEBUS_CONNECTION_STRING"]  # ❌ Connection string
client = ServiceBusClient.from_connection_string(connection_string)
sender = client.get_queue_sender("queue-name")
```

**After (Managed Identity):**

```python
from azure.servicebus import ServiceBusClient
from azure.identity import ManagedIdentityCredential

fully_qualified_namespace = "your-namespace.servicebus.windows.net"
credential = ManagedIdentityCredential()  # ✅ Managed Identity
client = ServiceBusClient(fully_qualified_namespace, credential)
sender = client.get_queue_sender("queue-name")
```

**For User-Assigned Managed Identity:**

```python
from azure.servicebus import ServiceBusClient
from azure.identity import ManagedIdentityCredential

fully_qualified_namespace = "your-namespace.servicebus.windows.net"
client_id = os.environ["MANAGED_IDENTITY_CLIENT_ID"]
credential = ManagedIdentityCredential(client_id=client_id)
client = ServiceBusClient(fully_qualified_namespace, credential)
```

#### **Java:**

**Before (Connection String):**

```java
import com.azure.messaging.servicebus.*;

String connectionString = System.getenv("SERVICEBUS_CONNECTION_STRING"); // ❌ Connection string
ServiceBusClientBuilder builder = new ServiceBusClientBuilder()
    .connectionString(connectionString);
ServiceBusSenderClient sender = builder.sender()
    .queueName("queue-name")
    .buildClient();
```

**After (Managed Identity):**

```java
import com.azure.messaging.servicebus.*;
import com.azure.identity.ManagedIdentityCredentialBuilder;

String fullyQualifiedNamespace = "your-namespace.servicebus.windows.net";
ServiceBusClientBuilder builder = new ServiceBusClientBuilder()
    .fullyQualifiedNamespace(fullyQualifiedNamespace)
    .credential(new ManagedIdentityCredentialBuilder().build()); // ✅ Managed Identity

ServiceBusSenderClient sender = builder.sender()
    .queueName("queue-name")
    .buildClient();
```

---

### Step 4: Remove Connection String References from Configuration

**Before (appsettings.json):**

```json
{
  "ServiceBus": {
    "ConnectionString": "Endpoint=sb://your-namespace.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=your-key-here"  // ❌ Remove this
  }
}
```

**After:**

```json
{
  "ServiceBus": {
    "FullyQualifiedNamespace": "your-namespace.servicebus.windows.net"
    // ✅ No connection string or SAS key needed
  }
}
```

**Remove from:**

- Environment variables (`SERVICEBUS_CONNECTION_STRING`, `AZURE_SERVICEBUS_CONNECTION_STRING`)
- Azure App Configuration / Key Vault secrets (if storing connection strings)
- Hardcoded strings in code
- SAS tokens or SharedAccessSignature values
- Configuration files (appsettings.json, web.config, etc.)

---

### Step 5: Update Dependencies (if needed)

Ensure you have the latest Azure SDK packages that support Managed Identity.

#### **.NET:**

```xml
<PackageReference Include="Azure.Messaging.ServiceBus" Version="7.17.0" />
<PackageReference Include="Azure.Identity" Version="1.10.0" />
```

#### **Python:**

```bash
pip install azure-servicebus>=7.11.0
pip install azure-identity>=1.15.0
```

#### **Java:**

```xml
<dependency>
  <groupId>com.azure</groupId>
  <artifactId>azure-messaging-servicebus</artifactId>
  <version>7.14.0</version>
</dependency>
<dependency>
  <groupId>com.azure</groupId>
  <artifactId>azure-identity</artifactId>
  <version>1.11.0</version>
</dependency>
```

---

### Step 6: Validate the Migration

#### **Test 1: Verify SAS Key Auth is Disabled**

```bash
# Attempt to use connection string (should fail with 401)
# This test requires a Service Bus client tool or SDK

# Expected: Authentication failure (local auth disabled)
```

#### **Test 2: Verify Managed Identity Auth Works**

Run your application with Managed Identity enabled and verify:

```bash
# Check logs for successful authentication
# Expected: No authentication errors, successful message send/receive

# For Azure App Service / Functions:
az webapp log tail --name your-app --resource-group your-rg

# Look for:
# ✅ "Successfully authenticated with Managed Identity"
# ✅ "ServiceBusClient initialized"
# ✅ "Message sent successfully"
# ❌ "Authentication failed" or "401 Unauthorized"
```

#### **Test 3: Verify RBAC Assignment**

```bash
# List role assignments for your Managed Identity
az role assignment list \
  --assignee <managed-identity-principal-id> \
  --scope "/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.ServiceBus/namespaces/<namespace-name>"

# Expected: Azure Service Bus Data Owner/Sender/Receiver role assigned
```

---

## 🔍 Cross-Tenant and Federated Identity Scenarios

### Scenario: Service in Tenant A needs to access Service Bus in Tenant B

Azure Service Bus supports **Federated Identity Credentials (FIC)** for cross-tenant access.

#### **Setup:**

1. **In Tenant B (Service Bus owner):**
   - Create a Service Principal in Tenant B
   - Assign **Azure Service Bus Data Sender/Receiver** role to this Service Principal on the Service Bus namespace

2. **In Tenant A (Application tenant):**
   - Configure your application's Managed Identity with a Federated Identity Credential that maps to Tenant B's Service Principal

3. **In Application Code:**
   ```csharp
   // Use the Managed Identity from Tenant A, which federates to Tenant B
   var credential = new ManagedIdentityCredential(ManagedIdentityId.SystemAssigned);
   var client = new ServiceBusClient("namespace-in-tenantB.servicebus.windows.net", credential);
   ```

**Documentation:**

- [Workload Identity Federation](https://learn.microsoft.com/entra/workload-id/workload-identity-federation)
- [Service Bus Authentication Across Tenants](https://learn.microsoft.com/azure/service-bus-messaging/authenticate-application)

---

## 🚧 Known Blockers and Limitations

| **Blocker** | **Impact** | **Workaround** |
|-------------|------------|----------------|
| **Delegated SAS tokens** | Not yet supported with Entra ID auth | Use direct RBAC roles instead; consult [Azure Service Bus authentication docs](https://learn.microsoft.com/azure/service-bus-messaging/authenticate-application) for alternatives |
| **Legacy SDKs** | Older Service Bus SDKs (<7.0) don't support Managed Identity | Upgrade to latest SDK versions (see Step 5) |
| **On-premises clients** | Cannot use Managed Identity outside Azure | Use Service Principal with client certificate auth instead of Managed Identity |
| **Third-party integrations** | External systems may require connection strings | Isolate third-party access to separate namespace with local auth enabled temporarily |

**If blocked:** Consult [Azure Service Bus support](https://azure.microsoft.com/support/create-ticket/) or your organization's security team.

---

## ✅ Quality Checklist

Before marking this remediation as complete, verify:

- [ ] **IaC Updated**: `disableLocalAuth: true` set in ARM/Bicep/Terraform templates
- [ ] **RBAC Assigned**: Managed Identity has **Azure Service Bus Data Owner/Sender/Receiver** role
- [ ] **Client Code Updated**: All instances of `ServiceBusClient(connectionString)` replaced with `ServiceBusClient(fullyQualifiedNamespace, credential)`
- [ ] **Configuration Cleaned**: Connection strings removed from `appsettings.json`, environment variables, and Key Vault
- [ ] **Dependencies Updated**: Azure SDK packages support Managed Identity (Azure.Messaging.ServiceBus >= 7.17.0, Azure.Identity >= 1.10.0)
- [ ] **No DefaultAzureCredential in Production** (Recommended): Production code uses `ManagedIdentityCredential` explicitly for fail-fast behavior (see [Credential Type Guidance](#-credential-type-guidance))
- [ ] **All Service Bus Clients Migrated**: All senders, receivers, and processors updated
- [ ] **Non-Prod Tested**: Changes validated in development or staging environment
- [ ] **Monitoring Configured**: Authentication failures are logged and alerted
- [ ] **Rollback Plan Ready**: Know how to re-enable local auth if needed
- [ ] **Documentation Updated**: Service documentation reflects new authentication method
- [ ] **Cross-Tenant FIC Configured**: If applicable, Federated Identity Credentials are set up correctly

---

## 🔄 Rollback Plan

If you encounter issues, you can temporarily re-enable SAS key authentication:

### **Quick Rollback (Azure CLI):**

```bash
# Re-enable local authentication
az servicebus namespace update \
  --name your-servicebus-namespace \
  --resource-group your-resource-group \
  --set properties.disableLocalAuth=false

# Retrieve the connection string
az servicebus namespace authorization-rule keys list \
  --name RootManageSharedAccessKey \
  --namespace-name your-servicebus-namespace \
  --resource-group your-resource-group \
  --query primaryConnectionString -o tsv
```

### **IaC Rollback (Bicep):**

```bicep
properties: {
  disableLocalAuth: false  // Temporarily re-enable SAS key auth
}
```

**Deploy the rollback:**

```bash
az deployment group create \
  --resource-group your-rg \
  --template-file main.bicep
```

### **Application Rollback:**

Revert your code changes to use connection strings and redeploy. Ensure the connection string is available in configuration.

---

## 🚀 Deployment Guidance

**Deploy following your organization's change management process.** A recommended deployment order:

1. Assign RBAC roles (Managed Identity → Service Bus)
2. Deploy application code with Managed Identity
3. Validate authentication and message flow
4. Disable local auth (`disableLocalAuth: true`)
5. Monitor for 7 days before removing connection strings from secrets

---

## 🔐 Disable Local Auth Policy

After successfully migrating to Entra ID authentication, consider enforcing `disableLocalAuth: true` across all Service Bus namespaces in your subscription using [Azure Policy](https://learn.microsoft.com/azure/governance/policy/overview). This prevents accidental re-enabling of local auth.

### **Apply the Built-In Azure Policy:**

Azure provides a built-in policy definition for this purpose:

- **Audit/Deny policy**: *Azure Service Bus namespaces should have local authentication methods disabled*
  - Policy definition ID: `/providers/Microsoft.Authorization/policyDefinitions/cfb11c26-f069-4c14-8e36-56c394dae5af`

Assign this policy at your subscription or management group level. Use the **Audit** effect to flag namespaces that still allow local auth, or **Deny** to block creation or update of non-compliant namespaces:

```bash
az policy assignment create \
  --name "servicebus-disable-local-auth" \
  --display-name "Enforce Entra-only authentication on Azure Service Bus" \
  --policy "/providers/Microsoft.Authorization/policyDefinitions/cfb11c26-f069-4c14-8e36-56c394dae5af" \
  --scope "/subscriptions/<subscription-id>"
```

Sources for the values above:

- **The policy and its definition ID** — [Disable local authentication for Azure Service Bus](https://learn.microsoft.com/azure/service-bus-messaging/disable-local-authentication) ("Enforce with Azure Policy").
- **The `az policy assignment create` command** — [Azure CLI reference](https://learn.microsoft.com/cli/azure/policy/assignment).
- **The `--name` / `--display-name` / `--scope` / `--policy` usage pattern** — [Quickstart: Create a policy assignment with Azure CLI](https://learn.microsoft.com/azure/governance/policy/assign-policy-azurecli).

### **Temporary Exemption (Break-Glass):**

If you need to temporarily exempt a namespace (e.g., during migration or for emergency access), use an [Azure Policy exemption](https://learn.microsoft.com/azure/governance/policy/concepts/exemption-structure) rather than removing the policy assignment.

---

## 📞 Get Help

| **Issue Type** | **Contact** |
|----------------|-------------|
| **Service Bus Auth Issues** | [Azure Service Bus support](https://azure.microsoft.com/support/create-ticket/) |
| **RBAC / Managed Identity Issues** | [Azure Identity & Access Management docs](https://learn.microsoft.com/azure/active-directory/managed-identities-azure-resources/overview) |
| **Cross-Tenant FIC Setup** | [Workload Identity Federation docs](https://learn.microsoft.com/entra/workload-id/workload-identity-federation) |

---

## 📚 Related Resources

- [Azure Service Bus Authentication Documentation](https://learn.microsoft.com/azure/service-bus-messaging/authenticate-application)
- [Managed Identity for Service Bus](https://learn.microsoft.com/azure/service-bus-messaging/service-bus-managed-service-identity)
- [Azure Service Bus RBAC Roles](https://learn.microsoft.com/azure/service-bus-messaging/service-bus-managed-service-identity#azure-built-in-roles-for-azure-service-bus)
- [SFI Pillar 1: Protect identities and secrets](https://learn.microsoft.com/security/zero-trust/sfi/secure-future-initiative-identity-overview)
- [Adopt standard SDKs for identity](https://learn.microsoft.com/security/zero-trust/sfi/adopt-standard-sdk-identity)
- [Zero Trust Principles](https://learn.microsoft.com/security/zero-trust/)
- [Azure Identity best practices](https://learn.microsoft.com/azure/security/fundamentals/identity-management-best-practices)
- [Azure Identity client library for .NET](https://learn.microsoft.com/dotnet/api/overview/azure/identity-readme)
- [Workload Identity Federation](https://learn.microsoft.com/entra/workload-id/workload-identity-federation)
- [Disable local authentication for Service Bus](https://learn.microsoft.com/azure/service-bus-messaging/disable-local-authentication)

---

**Status**: Ready for use
**Last Updated**: 2025-01-01
**Version**: 1.0.0

---

## Key Decision Examples

### Scenario: Application sends messages only — needs sender-specific RBAC role

**Input state:**

- .NET application uses `ServiceBusClient` with connection string to send messages to queues
- No message receive or session operations in codebase
- Service Bus namespace: `your-servicebus-namespace`

**Key decision points:**

1. RBAC role selection (source: Step 2 role table): send-only access → **Azure Service Bus Data Sender** (`69a216fc-...`), not Data Owner or Data Receiver
2. Deployment order matters (source: recommended deployment order): assign RBAC first → update app code → validate → then disable local auth. Do NOT disable local auth before code is deployed
3. Connection string removal: wait until after 7-day monitoring period post-deployment (source: deployment order section)

**Sample output** (at Step 2 / RBAC decision):
> Access pattern: **send-only**. Assigning least-privilege role:
>
> **Role:** Azure Service Bus Data Sender
> **Role ID:** `69a216fc-b8fb-44d8-bc22-1f3c2cd27a39`
> **Scope:** Service Bus namespace `sb-prod-westus2`
>
> Follow the deployment order: RBAC → code update → validate → disable local auth → monitor 7 days.

**Error handling:** If the application uses a Service Bus SDK version earlier than 7.0 (e.g., `WindowsAzure.ServiceBus`), halt and report: "⚠️ Legacy SDK < 7.0 detected — this SDK does not support `ManagedIdentityCredential`. Upgrade to `Azure.Messaging.ServiceBus` 7.x+ before proceeding with MSI migration" (source: Known Blockers section).

---
