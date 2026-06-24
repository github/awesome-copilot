---
name: sst-eventhub-secretless-auth
description: 'Helps developers migrate Azure Event Hubs from SAS key/connection string authentication to Microsoft Entra ID (Managed Identity) authentication, eliminating shared secrets and strengthening identity security.'
metadata:
  version: "1.0.0"
---

> **Disclaimer**: This is an AI-powered assistant. Always review generated code
> and infrastructure changes carefully before deploying.

# Event Hub Managed Identity Migration Skill

This skill helps you migrate Azure Event Hubs from SAS key / connection string authentication to Microsoft Entra ID (Managed Identity) — a security best practice aligned with [**Pillar 1: Protect identities and secrets**](https://learn.microsoft.com/en-us/security/zero-trust/sfi/secure-future-initiative-identity-overview) of Microsoft's [Secure Future Initiative](https://learn.microsoft.com/security/zero-trust/sfi/secure-future-initiative-overview) and [Zero Trust principles](https://learn.microsoft.com/security/zero-trust/). Eliminating shared secrets like SAS keys reduces secret exposure risk and strengthens your identity security posture.

**Your approach:**
- Understand *why* Managed Identity matters before diving into changes
- Provide code examples and infrastructure templates grounded in public Azure documentation
- Flag anything uncertain rather than guessing
- Every migrated Event Hub connection reduces secret exposure risk

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
- [SFI Pillar 1: Protect identities and secrets](https://learn.microsoft.com/en-us/security/zero-trust/sfi/secure-future-initiative-identity-overview) — the goal this migration serves: eliminate shared secrets and authenticate with managed identities. Use it for the rationale and current pillar objectives.

**How — the remediation steps (service docs):**
- [Authenticate a managed identity with Microsoft Entra ID to access Event Hubs resources](https://learn.microsoft.com/azure/event-hubs/authenticate-managed-identity) — enabling managed identity, RBAC role assignment, and SDK usage.
- [Authenticate access to Event Hubs with shared access signatures](https://learn.microsoft.com/azure/event-hubs/authenticate-shared-access-signature#disable-local-or-sas-key-authentication) — disabling local / SAS-key authentication (the cutover step).

Use the **How** docs as the source of truth for:
- Built-in **Event Hubs data-plane RBAC role names** (Azure Event Hubs Data Owner / Sender / Receiver)
- The **`disableLocalAuth`** property on the Event Hubs namespace
- SDK **package names and minimum versions** per language
- Current **fully-qualified namespace / endpoint format**

Use the **Why** doc as the source of truth for which SFI objective applies and the current principle framing.

**If a fetch fails**, tell the user, share the doc URL so they can read it themselves, and continue with the inline guidance below — note that role names, the `disableLocalAuth` property, package versions, and code samples may be out of date.

**If the codebase uses more than one language / SDK** (e.g. .NET + Java + Python + JavaScript), list the detected languages and ask the user whether to focus on a single language for this session (others deferred) or work through all of them. Do not pick a default.

> **Note:** Subsequent references to "the fetched docs" in this skill mean the **How** docs you fetched in this step. Do not re-fetch on every reference.

---

## What This Skill Covers

Help developers migrate Event Hub authentication from SAS keys to Managed Identity by providing two starting points:

1. **Repository scan workflow**: Scan a repository to identify Infrastructure as Code (IaC) and client-side code that use SAS keys or connection strings
2. **Targeted migration**: Start with known Event Hub resources that need migration

Both paths lead to the same outcome: clear migration steps to Managed Identity authentication.


## Getting Started

### Start from a Repository Scan
1. **Identify the repository path**: Determine which repository contains your Event Hub service code
2. **Scan for Event Hub violations** (follow the identification logic below)
3. Identify all potential violations across IaC and client-side code
4. Proceed with comprehensive migration



## Migration Overview

This migration has 3 main steps, plus an opt-in step:

| Step | What | Automatable | Guidance |
|------|------|-------------|----------|
| **1. Enable Managed Identity** | Create MSI, assign RBAC roles via ARM/Bicep | ✅ Yes | IaC templates provided below |
| **2. Validate no local traffic** | Check Azure Monitor metrics for SAS key usage | ⚠️ Human | Guide to Azure Monitor metrics |
| **3. Disable local auth** | Set `disableLocalAuth: true` in ARM/Bicep | ✅ Yes | Template updates below |
| **4. Opt-in to policy** | Enroll in disable local auth policy | ⚠️ Human | Instructions provided |

**Important:** Steps 1 and 3 are code changes with templates provided. Steps 2 and 4 require you to verify and act. The guidance below makes clear which steps need human validation.

---

## Identification Logic for Violations

### 1. Scan the repository for both IaC and client-side code:

**IaC Files** — Bicep modules, ARM templates, and Terraform configs that define `Microsoft.EventHub/namespaces` resources:
- Look for files containing `Microsoft.EventHub/namespaces` or `azurerm_eventhub_namespace`
- Check for Event Hub connection string references in config files

**Client-Side Code** — Application code using Event Hub SDKs:
- .NET: `Azure.Messaging.EventHubs`, `EventHubProducerClient`, `EventHubConsumerClient`, `EventProcessorClient`
- Java: `com.azure.messaging.eventhubs`
- Python: `azure.eventhub`
- Look for connection string usage patterns

### 2. Violation Rules

**For Bicep / ARM Templates:**
- `disableLocalAuth` is not set to `true`
- No managed identity configuration (`identity` block missing or `type` not set)
- No RBAC role assignments for Event Hub data roles
- Using connection string outputs or references

**For Client-Side Code:**
- Constructing Event Hub clients with connection strings (e.g., `EventHubProducerClient(connectionString, ...)`)
- Using `EventHubsConnectionStringProperties` to parse connection strings
- Storing Event Hub connection strings in app settings or key vault references
- NOT using token-based credential types (e.g., `ManagedIdentityCredential`, `DefaultAzureCredential`, `WorkloadIdentityCredential`)

**For Configuration Files:**
- `appsettings.json`, `web.config`, or environment variable files containing Event Hub connection strings
- Key Vault references to Event Hub connection string secrets (these should migrate to MSI-based access)

---

## MSI Design Principles

Before generating any changes, understand these constraints:

- Generate a **minimum of one user-assigned managed identity per Azure Region**
- Alternatively, use a **system-assigned managed identity** per service
- Utilize a new managed identity for additional regions or scale units
- **Automate** creation of identities and role assignments via ARM/Bicep
- Multiple managed identities can be added to an **Entra ID group** for bulk role assignment
- For **cross-tenant** scenarios, use Federated Identity Credentials (FIC) + MSI

---

## Migration Plan

### Step 1: Enable Managed Identity on Event Hubs

> Do not start this step until the developer has explicitly asked for changes — until then,
> see **Engagement Mode: Explain Before Proposing** above.

#### 1a. Add Managed Identity to the Service

Ask the developer whether they prefer **user-assigned** or **system-assigned** managed identity.

**User-Assigned MSI (recommended for multi-region):**

```bicep
resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'mi-${serviceName}-${location}'
  location: location
}
```

**System-Assigned MSI:**

Add `identity` block to the compute resource (App Service, VM, AKS, etc.):

```bicep
identity: {
  type: 'SystemAssigned'
}
```

#### 1b. Assign RBAC Roles on Event Hub Namespace

Use the most restrictive role that meets the service's needs:

| Role | Use When |
|------|----------|
| **Azure Event Hubs Data Receiver** | Service only consumes events |
| **Azure Event Hubs Data Sender** | Service only produces events |
| **Azure Event Hubs Data Owner** | Service needs full access (send + receive + manage) |

**Bicep role assignment example:**

```bicep
@description('Event Hubs Data Sender role')
var eventHubsDataSenderRoleId = '2b629674-e913-4c01-ae53-ef4638d8f975'

resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(eventHubNamespace.id, managedIdentity.id, eventHubsDataSenderRoleId)
  scope: eventHubNamespace
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', eventHubsDataSenderRoleId)
    principalId: managedIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}
```

**ARM template role assignment example:**

```json
{
  "type": "Microsoft.Authorization/roleAssignments",
  "apiVersion": "2022-04-01",
  "name": "[guid(resourceId('Microsoft.EventHub/namespaces', parameters('eventHubNamespaceName')), parameters('managedIdentityPrincipalId'), variables('eventHubsDataSenderRoleId'))]",
  "scope": "[resourceId('Microsoft.EventHub/namespaces', parameters('eventHubNamespaceName'))]",
  "properties": {
    "roleDefinitionId": "[subscriptionResourceId('Microsoft.Authorization/roleDefinitions', variables('eventHubsDataSenderRoleId'))]",
    "principalId": "[parameters('managedIdentityPrincipalId')]",
    "principalType": "ServicePrincipal"
  }
}
```

**Well-known RBAC role IDs:**

| Role | GUID |
|------|------|
| Azure Event Hubs Data Owner | `f526a384-b230-433a-b45c-95f59c4a2dec` |
| Azure Event Hubs Data Sender | `2b629674-e913-4c01-ae53-ef4638d8f975` |
| Azure Event Hubs Data Receiver | `a638d3c7-ab3a-418d-83e6-5f17a39d4fde` |

#### 1c. Update Client Code to Use Managed Identity

**C# (.NET) — Before (connection string):**

```csharp
var producer = new EventHubProducerClient(connectionString, eventHubName);
```

**C# (.NET) — After (Managed Identity):**

> **Choosing a credential type:** The [Azure Identity client library](https://learn.microsoft.com/dotnet/api/overview/azure/identity-readme) offers several credential options. For production workloads running in Azure, `ManagedIdentityCredential` provides explicit, predictable authentication with no fallback chain. For development and simpler scenarios, `DefaultAzureCredential` provides a convenient credential chain that works across local dev and deployed environments. Choose based on your scenario — see [Azure Identity best practices](https://learn.microsoft.com/azure/security/fundamentals/identity-management-best-practices) for guidance.

**System-assigned MSI (production — explicit credential):**

```csharp
using Azure.Identity;
using Azure.Messaging.EventHubs.Producer;

var credential = new ManagedIdentityCredential();
var fullyQualifiedNamespace = "<namespace>.servicebus.windows.net";
var producer = new EventHubProducerClient(fullyQualifiedNamespace, eventHubName, credential);
```

**User-assigned MSI (specify the client ID):**

```csharp
var credential = new ManagedIdentityCredential("<your-managed-identity-client-id>");
var producer = new EventHubProducerClient(fullyQualifiedNamespace, eventHubName, credential);
```

**Alternative — DefaultAzureCredential (convenient for dev/test and simpler deployments):**

```csharp
var credential = new DefaultAzureCredential();
var producer = new EventHubProducerClient(fullyQualifiedNamespace, eventHubName, credential);
```

**Java — Before:**

```java
EventHubProducerClient producer = new EventHubClientBuilder()
    .connectionString(connectionString, eventHubName)
    .buildProducerClient();
```

**Java — After:**

```java
import com.azure.identity.ManagedIdentityCredentialBuilder;

EventHubProducerClient producer = new EventHubClientBuilder()
    .fullyQualifiedNamespace("<namespace>.servicebus.windows.net")
    .eventHubName(eventHubName)
    .credential(new ManagedIdentityCredentialBuilder().build())
    .buildProducerClient();
```

> For user-assigned MSI in Java: `.clientId("<your-managed-identity-client-id>")` on the builder.

**Python — Before:**

```python
producer = EventHubProducerClient.from_connection_string(conn_str, eventhub_name=hub_name)
```

**Python — After:**

```python
from azure.identity import ManagedIdentityCredential

# System-assigned MSI
credential = ManagedIdentityCredential()

# User-assigned MSI
# credential = ManagedIdentityCredential(client_id="<your-managed-identity-client-id>")

producer = EventHubProducerClient(
    fully_qualified_namespace="<namespace>.servicebus.windows.net",
    eventhub_name=hub_name,
    credential=credential
)
```

#### 1d. Update Configuration

Remove connection string references from configuration and replace with namespace + credential pattern:

**appsettings.json — Before:**
```json
{
  "EventHub": {
    "ConnectionString": "Endpoint=sb://<your-namespace>.servicebus.windows.net/;SharedAccessKeyName=...;SharedAccessKey=..."
  }
}
```

**appsettings.json — After:**
```json
{
  "EventHub": {
    "FullyQualifiedNamespace": "<your-namespace>.servicebus.windows.net",
    "EventHubName": "myeventhub"
  }
}
```

---

### Step 2: Validate No Local Traffic (Human Step)

⚠️ **This step requires human verification.**

Before disabling local auth, verify that no services are still using SAS keys to connect to your Event Hub namespace.

**Check Azure Monitor metrics for your Event Hub namespace:**

1. In the [Azure portal](https://portal.azure.com), navigate to your Event Hub namespace
2. Go to **Monitoring** → **Metrics**
3. Add the **Incoming Requests** metric and split by **Authentication** dimension
4. Look for any requests authenticated via SAS keys
5. If SAS-based requests are present, identify and migrate those clients first

For more details on monitoring Event Hubs, see [Monitor Azure Event Hubs](https://learn.microsoft.com/azure/event-hubs/monitor-event-hubs).

**Only proceed to Step 3 once you've confirmed zero SAS key traffic.**

---

### Step 3: Disable Local Auth in ARM/Bicep

(Warning: Confirm from Step 2 that there is zero SAS key traffic before proceeding.) Once confirmed, update the Event Hub namespace resource:

**Bicep:**

```bicep
resource eventHubNamespace 'Microsoft.EventHub/namespaces@2024-01-01' = {
  name: namespaceName
  location: location
  properties: {
    disableLocalAuth: true
    // ... other properties
  }
}
```

**ARM Template:**

```json
{
  "type": "Microsoft.EventHub/namespaces",
  "apiVersion": "2024-01-01",
  "name": "[parameters('namespaceName')]",
  "location": "[parameters('location')]",
  "properties": {
    "disableLocalAuth": true
  }
}
```

**Important:** Deploy this change following your organization's change management process. Verify rollback functionality before proceeding.

---

### Step 4: Opt-in to Disable Local Auth Policy (Human Step)

⚠️ **This step requires human action.**

After Step 3 is successfully deployed, ensure all non-compliant resources have been remediated before opting in. If you opt in before remediating, you may experience service disruption when the policy is enforced.

Follow the opt-in instructions in the [official documentation](https://learn.microsoft.com/azure/event-hubs/authenticate-shared-access-signature#disable-local-or-sas-key-authentication).

---

## Cross-Tenant Scenarios

If your workload requires cross-tenant authentication:

1. Use **Federated Identity Credentials (FIC) + Managed Identity**
2. Tenant 1 owns the multitenant app with FIC config + MSI + client platform
3. Tenant 2 owns the Service Principal, Event Hub resource, and role assignments

See the [cross-tenant credential-free documentation](https://learn.microsoft.com/azure/active-directory/develop/workload-identity-federation) for details.

---

## Known Blockers

Be aware of these and inform the developer if applicable:

| Blocker | Details |
|---------|---------|
| **Delegated SAS** | Event Hubs doesn't support Delegated SAS yet (under development) |
| **Azure Resource Notifications** | Subscribers should not set `DisableLocalAuth: true` until Event Grid supports FIC |
| **Azure Monitor diagnostics** | Azure Monitor routes diagnostic logs via a Microsoft Entra service principal — this works even with local auth disabled. The Azure portal may prompt for a shared key, but it's only for access validation |

If blocked, consider requesting an exception through your organization's change management process.

---

## Rollback Instructions

If issues arise, the developer can roll back:

1. **Opt out** of the disable local auth policy (reverse the opt-in instructions)
2. **Re-enable local auth:** Set `disableLocalAuth: false` in ARM/Bicep and redeploy
3. **Revert client code** to use connection strings (temporary — not a long-term solution)

---

## Deployment Best Practices

- Deploy infrastructure changes through your organization's standard change management process
- Complete end-to-end testing including auth-related test cases
- Verify rollback functionality for each change
- Follow any change freeze or advisory periods your organization observes

---

## Quality Checklist

Before considering the migration complete, verify:

- [ ] Managed Identity created (user-assigned or system-assigned)
- [ ] RBAC roles assigned with least privilege (Sender, Receiver, or Owner)
- [ ] Client code updated to use token-based credential (see [Azure Identity docs](https://learn.microsoft.com/dotnet/api/overview/azure/identity-readme) for recommended approach)
- [ ] Configuration updated (connection strings removed, namespace + credential pattern used)
- [ ] Azure Monitor metrics confirm zero SAS key traffic
- [ ] `disableLocalAuth: true` set in ARM/Bicep templates
- [ ] Changes deployed following your organization's change management process
- [ ] Opted in to disable local auth policy
- [ ] Cross-tenant scenarios handled with FIC if applicable
- [ ] Rollback plan documented and tested

---

## Related Resources

| Resource | Link |
|----------|------|
| Event Hubs managed identity auth | [Authenticate with managed identity](https://learn.microsoft.com/azure/event-hubs/authenticate-managed-identity) |
| Disable local auth | [Disable local authentication](https://learn.microsoft.com/azure/event-hubs/authenticate-shared-access-signature#disable-local-or-sas-key-authentication) |
| Azure Identity client library (.NET) | [Azure.Identity overview](https://learn.microsoft.com/dotnet/api/overview/azure/identity-readme) |
| Azure identity best practices | [Identity management best practices](https://learn.microsoft.com/azure/security/fundamentals/identity-management-best-practices) |
| SFI Pillar 1: Protect identities and secrets | [Pillar overview](https://learn.microsoft.com/en-us/security/zero-trust/sfi/secure-future-initiative-identity-overview) |
| Zero Trust principles | [Zero Trust overview](https://learn.microsoft.com/security/zero-trust/) |
| Cross-tenant workload identity | [Workload identity federation](https://learn.microsoft.com/azure/active-directory/develop/workload-identity-federation) |


