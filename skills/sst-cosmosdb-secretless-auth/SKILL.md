---
name: sst-cosmosdb-secretless-auth
description: 'Helps migrate Azure Cosmos DB from primary/secondary key authentication to Microsoft Entra ID (Managed Identity) authentication — eliminating long-lived credentials from your Cosmos DB configuration.'
metadata:
  version: "1.0.0"
---

# Cosmos DB Managed Identity Migration

> **Disclaimer**: This is an AI-powered assistant. Always review generated code
> and infrastructure changes carefully before deploying.

---

## Partnership Framework

This skill operates as your **AI pair programmer** for Cosmos DB credential migration:

| **You (Engineer)**                          | **Skill (AI Assistant)**                                |
|---------------------------------------------|---------------------------------------------------------|
| Own the service architecture and rollout    | Provide discovery guidance, analysis, and code examples |
| Validate changes, test, and deploy          | Suggest IaC, client code, and config changes            |
| Make final decisions on implementation      | Flag risks, suggest fixes, provide documentation links  |
| Approve or reject recommendations           | Explain tradeoffs and alternatives                      |

**Ground rule**: If a recommendation conflicts with your service architecture, security requirements, or existing patterns — **your judgment wins**.

---

## Overview

This skill helps you migrate Azure Cosmos DB from primary/secondary key authentication to Microsoft Entra ID (Managed Identity) authentication — a security best practice aligned with [**Pillar 1: Protect identities and secrets**](https://learn.microsoft.com/security/zero-trust/sfi/secure-future-initiative-identity-overview) of Microsoft's [Secure Future Initiative](https://learn.microsoft.com/security/zero-trust/sfi/secure-future-initiative-overview) and [Zero Trust principles](https://learn.microsoft.com/security/zero-trust/).

Primary/secondary keys are long-lived credentials that grant full access to your Cosmos DB account if leaked. Managed identities replace these with short-lived, automatically rotated tokens — eliminating secrets from your code, config, and deployment pipeline.

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

**How — the remediation steps (service doc):**
- [Configure role-based access control for Microsoft Entra ID (Cosmos DB for NoSQL)](https://learn.microsoft.com/azure/cosmos-db/how-to-setup-rbac) — built-in data-plane roles, role assignment, and disabling key-based auth (`#disable-key-based-authentication`).

Use the **How** doc as the source of truth for:
- Built-in **data-plane role definition IDs** (Cosmos DB Built-in Data Reader / Contributor) and how role assignments are created
- The **`disableLocalAuth`** property on `Microsoft.DocumentDB/databaseAccounts`
- SDK **package names and minimum versions** per language
- Current **account endpoint format** and which **APIs are supported** (SQL / NoSQL only)

Use the **Why** doc as the source of truth for which SFI objective applies and the current principle framing.

**If a fetch fails**, tell the user, share the doc URL so they can read it themselves, and continue with the inline guidance below — note that data-plane role IDs, the `disableLocalAuth` property, package versions, and code samples may be out of date.

**If the codebase uses more than one language / SDK** (e.g. .NET + Python + Java), list the detected languages and ask the user whether to focus on a single language for this session (others deferred) or work through all of them. Do not pick a default.

> **Note:** Subsequent references to "the fetched doc" in this skill mean the **How** doc you fetched in this step. Do not re-fetch on every reference.

## When to Use This Skill

Use this skill when:
- Your application connects to Cosmos DB using `AccountKey=` in connection strings
- You have `CosmosClient` instantiation using key-based constructors
- You want to eliminate Cosmos DB keys from Key Vault, environment variables, or appsettings
- You're hardening your Azure resource authentication posture

**API Limitation**: This approach works for **Cosmos DB SQL API (NoSQL) only**. For Cassandra, Gremlin, MongoDB, or Table APIs, consult [Cosmos DB documentation](https://learn.microsoft.com/azure/cosmos-db/) for alternative approaches.

## Migration Overview

| Step | Action | What This Skill Provides |
|------|--------|--------------------------|
| 1. **Discovery** | Scan your repository for Cosmos DB usage (connection strings, `CosmosClient` instantiation, IaC templates) | Pattern guidance |
| 2. **IaC Update** | Add `disableLocalAuth: true` to `Microsoft.DocumentDB/databaseAccounts` resources | Bicep/ARM examples |
| 3. **RBAC Assignment** | Create SQL role assignments for managed identity with built-in data plane roles | IaC examples |
| 4. **Client Code** | Replace key-based `CosmosClient` with credential-based authentication | Code examples (.NET, Python, Java) |
| 5. **Config Cleanup** | Remove `AccountKey=` from connection strings, use endpoint-only config | Configuration examples |
| 6. **Validation** | Pre-flight checks and rollback plan | Checklists and guidance |

**What you should do**:
- Review and test all generated changes in a non-production environment
- Ensure managed identity is assigned to your compute resources (VM, App Service, AKS, etc.)
- Verify RBAC roles grant appropriate permissions (reader vs. contributor)
- Coordinate deployment to avoid service disruption
- Validate end-to-end functionality after migration

---

## Key Concepts: Cosmos DB Authentication

### Before
```csharp
// Key-based authentication
var connectionString = "AccountEndpoint=https://myaccount.documents.azure.com:443/;AccountKey=<YOUR_ACCOUNT_KEY>";
var client = new CosmosClient(connectionString);
```

**Risk**: Primary/secondary keys are long-lived credentials that, if leaked, grant full access to your Cosmos DB account.

### After
```csharp
// Managed Identity authentication
var endpoint = "https://myaccount.documents.azure.com:443/";
var credential = new ManagedIdentityCredential();
var client = new CosmosClient(endpoint, credential);
```

**Benefit**: No secrets in code or config. Managed identity credentials are short-lived tokens managed by Azure.

---

## ⚠️ Credential Type Considerations

When migrating to Entra ID authentication, choose the credential type appropriate for your environment:

**For production workloads** — `ManagedIdentityCredential` provides explicit, scoped authentication with no fallback chain. This is the more security-hardened choice because it authenticates only via the managed identity assigned to your compute resource, with no interactive or developer-tool fallbacks. See [Azure Identity managed identity support](https://learn.microsoft.com/dotnet/api/overview/azure/identity-readme#managed-identity-support).

**For simplified development** — `DefaultAzureCredential` provides a convenient credential chain that works across local development and deployed environments. It automatically tries multiple credential types (managed identity, Azure CLI, Visual Studio, etc.). This is simpler to set up but includes fallbacks that may not be appropriate for security-sensitive production services. See [DefaultAzureCredential overview](https://learn.microsoft.com/dotnet/api/overview/azure/identity-readme#defaultazurecredential).

| Environment | Recommended Credential | Rationale |
|-------------|----------------------|-----------|
| Production (VM, App Service, AKS, Functions) | `ManagedIdentityCredential` | Explicit, no fallback chain, strongest security posture |
| Production (simpler setup) | `DefaultAzureCredential` | Convenient but includes interactive fallbacks |
| Local development | `DefaultAzureCredential` or `AzureCliCredential` | Developer needs interactive auth flows |

> **Tradeoff**: `ManagedIdentityCredential` gives you explicit control and fails fast if misconfigured — no silent fallbacks. `DefaultAzureCredential` is more forgiving but its broad credential chain may mask configuration issues. Choose based on your security requirements.

---

## Cosmos DB Data Plane RBAC Roles

Cosmos DB has **built-in data plane RBAC roles** (separate from Azure RBAC control plane roles):

| Role Name | Role Definition ID | Permissions |
|-----------|-------------------|-------------|
| **Cosmos DB Built-in Data Reader** | `00000000-0000-0000-0000-000000000001` | Read-only access to data and metadata |
| **Cosmos DB Built-in Data Contributor** | `00000000-0000-0000-0000-000000000002` | Full read/write access to data, read-only metadata |

**Known Issue**: Cosmos DB data plane RBAC is **not** Azure RBAC. You must use `Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments` resource type (not Azure IAM). This only works for SQL API (not Cassandra, Gremlin, MongoDB, or Table APIs).

For non-SQL APIs, you may need to use resource tokens or continue using keys with rotation (consult Cosmos DB documentation).

---

## Implementation Guidance

### 1. IaC Changes (Bicep/ARM)

> Do not start this step until the developer has explicitly asked for changes — until then,
> see **Engagement Mode: Explain Before Proposing** above.

**Disable local auth** on the Cosmos DB account:

```bicep
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
  name: 'myCosmosAccount'
  location: location
  properties: {
    databaseAccountOfferType: 'Standard'
    disableLocalAuth: true  // ✅ Enforces Entra ID only
    locations: [
      {
        locationName: location
        failoverPriority: 0
      }
    ]
    // ... other properties
  }
}
```

**Create SQL role assignment** for your managed identity:

```bicep
// Data Contributor role assignment
resource roleAssignment 'Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments@2023-04-15' = {
  name: guid(cosmosAccount.id, managedIdentityPrincipalId, '00000000-0000-0000-0000-000000000002')
  parent: cosmosAccount
  properties: {
    roleDefinitionId: '${cosmosAccount.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002'
    principalId: managedIdentityPrincipalId
    scope: cosmosAccount.id
  }
}
```

**Notes**:
- `principalId`: The object ID of your managed identity (system-assigned or user-assigned)
- `scope`: Can be account-level (entire account) or database-level (specific database)
- Use `00000000-0000-0000-0000-000000000001` for read-only access

### 2. Client Code Changes

#### .NET (C#)

**Before**:
```csharp
using Microsoft.Azure.Cosmos;

var connectionString = configuration["CosmosDb:ConnectionString"];
var client = new CosmosClient(connectionString);
```

**After**:
```csharp
using Azure.Identity;
using Microsoft.Azure.Cosmos;

var endpoint = configuration["CosmosDb:Endpoint"]; // e.g., "https://myaccount.documents.azure.com:443/"
var credential = new ManagedIdentityCredential();
var client = new CosmosClient(endpoint, credential);
```

**NuGet packages**:
- `Microsoft.Azure.Cosmos` (latest)
- `Azure.Identity` (1.10.0+)

#### Python

**Before**:
```python
from azure.cosmos import CosmosClient

url = os.environ["COSMOS_ENDPOINT"]
key = os.environ["COSMOS_KEY"]
client = CosmosClient(url, key)
```

**After**:
```python
from azure.cosmos import CosmosClient
from azure.identity import ManagedIdentityCredential

url = os.environ["COSMOS_ENDPOINT"]
credential = ManagedIdentityCredential()
client = CosmosClient(url, credential=credential)
```

**Packages**:
- `azure-cosmos` (4.5.0+)
- `azure-identity` (1.14.0+)

#### Java

**Before**:
```java
CosmosClient client = new CosmosClientBuilder()
    .endpoint(endpoint)
    .key(key)
    .buildClient();
```

**After**:
```java
import com.azure.identity.ManagedIdentityCredential;
import com.azure.identity.ManagedIdentityCredentialBuilder;

ManagedIdentityCredential credential = new ManagedIdentityCredentialBuilder().build();

CosmosClient client = new CosmosClientBuilder()
    .endpoint(endpoint)
    .credential(credential)
    .buildClient();
```

**Maven dependencies**:
- `com.azure:azure-cosmos` (4.45.0+)
- `com.azure:azure-identity` (1.10.0+)

### 3. Configuration Changes

**Before** (appsettings.json, environment variables):
```json
{
  "CosmosDb": {
    "ConnectionString": "AccountEndpoint=https://myaccount.documents.azure.com:443/;AccountKey=<YOUR_ACCOUNT_KEY>"
  }
}
```

**After**:
```json
{
  "CosmosDb": {
    "Endpoint": "https://myaccount.documents.azure.com:443/"
  }
}
```

**Remove**:
- `AccountKey=` from connection strings
- Key Vault references for Cosmos DB keys (if applicable)
- Environment variables storing keys

### 4. Local Development

For local development (not production), you have two options:

**Option A: Azure CLI credential** (recommended for local dev):
```csharp
#if DEBUG
var credential = new AzureCliCredential();
#else
var credential = new ManagedIdentityCredential();
#endif
```

Then authenticate locally via:
```bash
az login
az account set --subscription <your-subscription-id>
```

**Option B: DefaultAzureCredential** (acceptable for local dev only):
```csharp
#if DEBUG
var credential = new DefaultAzureCredential();
#else
var credential = new ManagedIdentityCredential();
#endif
```

---

## Pre-Flight Checklist

Before deploying Entra ID authentication changes:

- [ ] **Managed identity exists** and is assigned to your compute resource (VM, App Service, AKS, etc.)
- [ ] **RBAC role assigned** via `sqlRoleAssignments` in IaC (allow 5-10 minutes for propagation)
- [ ] **Code updated** to use appropriate credential type for your environment (see Credential Type Considerations above)
- [ ] **Config cleaned** — removed all `AccountKey` references from connection strings
- [ ] **Tested in non-prod** — verify application can read/write to Cosmos DB using managed identity
- [ ] **Local dev strategy** — developers can authenticate via Azure CLI or user-assigned managed identity
- [ ] **Rollback plan ready** — can re-enable local auth if needed (see below)
- [ ] **Cosmos DB API check** — SQL API only (this approach doesn't work for Cassandra, MongoDB, Gremlin, Table APIs)

---

## Rollback Plan

If you encounter issues after disabling local auth:

### Immediate Rollback (re-enable key-based auth)

**Bicep/ARM**:
```bicep
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
  name: 'myCosmosAccount'
  properties: {
    disableLocalAuth: false  // ✅ Temporarily re-enable keys
    // ... other properties
  }
}
```

**Azure CLI**:
```bash
az cosmosdb update \
  --name myCosmosAccount \
  --resource-group myResourceGroup \
  --disable-key-based-metadata-write-access false
```

**Note**: Re-enabling local auth does NOT require code changes. Your application can use either keys or Entra ID credentials when `disableLocalAuth: false`.

### Troubleshooting Common Issues

| Issue | Likely Cause | Fix |
|-------|--------------|-----|
| `Forbidden: The input authorization token can't serve the request` | RBAC role not assigned or not propagated | Wait 5-10 minutes, verify role assignment in portal |
| `ManagedIdentityCredential authentication failed` | Managed identity not enabled on compute resource | Enable system-assigned or user-assigned managed identity |
| `Authentication failed` in local dev | Azure CLI not authenticated | Run `az login` and `az account set --subscription <id>` |
| `Role definition not found` | Wrong API (Cassandra, MongoDB, etc.) | Use resource tokens or keys for non-SQL APIs |

---

## Deployment Reminders

- **Update deployment configs**: Update deployment configurations to remove key references and add managed identity assignments.
- **Update runbooks**: Update incident response and troubleshooting runbooks to reflect Entra ID authentication (no keys to rotate or regenerate).

---

## 🔐 Enforce Entra-Only Authentication with Azure Policy

After successfully migrating to Entra ID authentication, enforce disabled local authentication across your Cosmos DB accounts using built-in Azure Policy. This prevents accidental re-enabling of key-based auth and ensures ongoing security.

### **Apply the Built-In Azure Policy:**

Azure provides built-in policy definitions for this purpose:

- **Audit/Deny policy**: *Cosmos DB database accounts should have local authentication methods disabled*
  - Policy definition ID: `/providers/Microsoft.Authorization/policyDefinitions/5450f5bd-9c72-4390-a9c4-a7aba4edfdd2`
- **Auto-remediation policy**: *Configure Cosmos DB database accounts to disable local authentication*
  - Policy definition ID: `/providers/Microsoft.Authorization/policyDefinitions/dc2d41d1-4ab1-4666-a3e1-3d51c43e0049`

Assign the audit/deny policy at your subscription or management group level:

```bash
az policy assignment create \
  --name "cosmosdb-disable-local-auth" \
  --display-name "Cosmos DB accounts should have local auth disabled" \
  --policy "/providers/Microsoft.Authorization/policyDefinitions/5450f5bd-9c72-4390-a9c4-a7aba4edfdd2" \
  --scope "/subscriptions/<subscription-id>"
```

For more details, see the [Cosmos DB RBAC documentation](https://learn.microsoft.com/azure/cosmos-db/how-to-setup-rbac#disable-key-based-authentication) and the [Azure Policy built-in definitions for Cosmos DB](https://learn.microsoft.com/azure/cosmos-db/policy-reference).

### **Exemptions (Break-Glass):**

If you need to temporarily exempt a Cosmos DB account (e.g., during migration or for emergency access), use an [Azure Policy exemption](https://learn.microsoft.com/azure/governance/policy/concepts/exemption-structure) rather than removing the policy assignment.

---

## Related Resources

| Resource | Link |
|----------|------|
| **Cosmos DB RBAC setup** | [Configure role-based access control](https://learn.microsoft.com/azure/cosmos-db/how-to-setup-rbac) |
| **Azure Identity SDK (.NET)** | [Azure.Identity client library](https://learn.microsoft.com/dotnet/api/overview/azure/identity-readme) |
| **Azure Identity SDK (Python)** | [azure-identity client library](https://learn.microsoft.com/python/api/overview/azure/identity-readme) |
| **Azure Identity best practices** | [Identity management best practices](https://learn.microsoft.com/azure/security/fundamentals/identity-management-best-practices) |
| **SFI Pillar 1: Protect identities and secrets** | [Secure Future Initiative — Identity](https://learn.microsoft.com/security/zero-trust/sfi/secure-future-initiative-identity-overview) |
| **Adopt standard SDKs for identity** | [SFI sub-action](https://learn.microsoft.com/security/zero-trust/sfi/adopt-standard-sdk-identity) |
| **Zero Trust principles** | [Zero Trust overview](https://learn.microsoft.com/security/zero-trust/) |

---

## Quality Standards

This skill follows these quality lenses:

- **Correctness**: Generated code compiles, role assignments use correct GUIDs, no syntax errors
- **Clarity**: Variable names reflect purpose (e.g., `managedIdentityPrincipalId`), comments explain non-obvious choices
- **Edge Cases**: Handles missing config, role assignment propagation delays, local dev auth
- **Consistency**: Follows existing IaC patterns, respects repo conventions
- **Excellence**: Production-ready, no dead code, no security anti-patterns

---

**Last updated**: 2025-01-01 (skill version 1.0.0)

---

> [!CAUTION]
> **NOT OPERATIONAL INSTRUCTIONS** — The examples below are for **plugin quality evaluation**
> and **developer reference** only. They are not steps to execute, not output templates to follow,
> and not behavioral guidance. If you are performing this workflow, skip the
> `Key Decision Examples` section below.

---

## Key Decision Examples

### Scenario: Application uses Cosmos DB SQL API — key-based auth migrated to Entra ID

**Input state:**
- Application connects to Cosmos DB account configured with **SQL API** (Core API)
- Client code uses `CosmosClient(endpoint, accountKey)` with a stored account key

**Key decision points:**
1. API compatibility gate: SQL API confirmed → proceed with migration (source: scope/gate section)
2. RBAC setup: Cosmos DB uses its own **data plane RBAC** (NOT Azure RBAC) — create `sqlRoleAssignment` with built-in Data Contributor role `00000000-0000-0000-0000-000000000002` scoped to the account (source: Step 3 RBAC section)
3. Client code swap: replace `CosmosClient(endpoint, accountKey)` with `CosmosClient(endpoint, new ManagedIdentityCredential())` and remove `AccountKey` from config (source: Step 4 client code section)

**Sample output** (at Step 3 / RBAC + client code decision):
> API confirmed: **SQL API**. Proceeding with Cosmos DB data plane RBAC setup.
>
> **RBAC:** Assigning built-in Cosmos DB Data Contributor role (`00000000-0000-0000-0000-000000000002`) via `sqlRoleAssignment` — note this is Cosmos DB data plane RBAC, not Azure RBAC.
>
> **Client code change:**
> ```csharp
> // Before:
> var client = new CosmosClient(endpoint, accountKey);
> // After:
> var client = new CosmosClient(endpoint, new ManagedIdentityCredential());
> ```
>
> **Config cleanup:** Remove `AccountKey` from connection string and Key Vault references.

**Error handling:** If the Cosmos DB API type cannot be determined from IaC or portal metadata, halt with: "Unable to confirm API type for this Cosmos DB account. Verify the API type in Azure Portal before proceeding — this skill only supports SQL API."

---
