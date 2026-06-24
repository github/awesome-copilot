---
name: sst-cognitive-secretless-auth
description: 'Helps migrate Azure Cognitive Services and Azure AI Services from API key authentication to Microsoft Entra ID (Managed Identity) authentication — eliminating credential leakage risk and aligning with security best practices.'
metadata:
  version: "1.0.0"
---

# Azure Cognitive Services / AI Services: Migrate to Managed Identity Authentication

> **Disclaimer**: This is an AI-powered assistant. Always review generated code
> and infrastructure changes carefully before deploying.

---

## Overview

This skill helps you migrate Azure Cognitive Services and Azure AI Services from API key-based authentication to Microsoft Entra ID (Managed Identity) — a security best practice aligned with [**Pillar 1: Protect identities and secrets**](https://learn.microsoft.com/en-us/security/zero-trust/sfi/secure-future-initiative-identity-overview) of Microsoft's [Secure Future Initiative](https://learn.microsoft.com/en-us/security/zero-trust/sfi/secure-future-initiative-overview) and [Zero Trust principles](https://learn.microsoft.com/security/zero-trust/).

Eliminating API key authentication reduces credential leakage risk, simplifies secret management, and enforces the Zero Trust principle of verifying explicitly. Microsoft's public Azure AI Services documentation [supports Microsoft Entra ID authentication](https://learn.microsoft.com/azure/ai-services/authentication) as the recommended approach for authorizing requests against Cognitive Services APIs.

This skill provides guidance, code samples, and step-by-step instructions. You are responsible for testing, validating, and deploying changes in your environment.

| **Security Principle** | [SFI Pillar 1: Protect identities and secrets](https://learn.microsoft.com/en-us/security/zero-trust/sfi/secure-future-initiative-identity-overview) — eliminate shared secrets, authenticate with managed identities. See also: [Zero Trust: Verify explicitly](https://learn.microsoft.com/security/zero-trust/) |
|---|---|

| Step | Action | Tools/Artifacts |
|------|--------|-----------------|
| **1. Update Infrastructure** | Disable API key authentication (`disableLocalAuth: true`) on the Cognitive Services resource | IaC templates, Azure CLI |
| **2. Assign RBAC Roles** | Grant Managed Identity access to the Cognitive Services resource | Bicep/ARM, Azure CLI |
| **3. Update Application Code** | Replace API key authentication with token-based credentials | SDK code changes |
| **4. Remove API Key References** | Clean up API keys from config, environment variables, and code | Config audit |
| **5. Update Dependencies** | Ensure Azure SDK packages support Managed Identity | Package management |
| **6. Validate** | Test end-to-end — verify API key auth is disabled and Managed Identity works | CLI tests, monitoring |

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
- [Authenticate requests to Foundry Tools](https://learn.microsoft.com/azure/ai-services/authentication) — Microsoft Entra ID authentication patterns, token scopes, and SDK credential usage.
- [RBAC for Microsoft Foundry](https://learn.microsoft.com/azure/ai-foundry/concepts/rbac-azure-ai-foundry) and [Authentication and authorization in Microsoft Foundry](https://learn.microsoft.com/azure/foundry/concepts/authentication-authorization-foundry#built-in-roles-overview) — current built-in role names and role-definition GUIDs (these were recently renamed).
- The resource's **Keys and Endpoint** page / the relevant service doc — the current endpoint host format.

Use the **How** docs as the source of truth for:
- The resource **`kind`** to recommend (`AIServices` vs the single-service kinds; `CognitiveServices` is deprecated)
- Current **endpoint** host format (e.g. `*.services.ai.azure.com`)
- Built-in **role names and role-definition GUIDs**
- SDK **package names and minimum versions**
- Token **scopes / audiences**

Use the **Why** doc as the source of truth for which SFI objective applies and the current principle framing.

**If a fetch fails**, tell the user, share the doc URL so they can read it themselves, and continue with the inline guidance below — note that the `kind` advice, endpoints, role names/GUIDs, package versions, and code samples may be out of date.

**If the codebase uses more than one Cognitive / AI service kind** (e.g. Azure OpenAI + Text Analytics + Speech), list the detected kinds and ask the user whether to focus on a single kind for this session (others deferred) or work through all of them. Do not pick a default.

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

## Step-by-Step Guide

### Step 1: Update Infrastructure-as-Code (IaC)

> Do not start this step until the developer has explicitly asked for changes — until then,
> see **Engagement Mode: Explain Before Proposing** above.

Disable local authentication on your Cognitive Services resource.

> **Resource `kind`:** prefer `AIServices` (the all-in-one Foundry resource) and **never** use the deprecated `CognitiveServices` kind. The single-service kinds (`OpenAI`, `TextAnalytics`, `ComputerVision`, etc.) remain valid when you intentionally deploy a single-service resource.

#### **ARM Template / Bicep:**

```bicep
resource cognitiveService 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: 'your-cognitive-service-name'
  location: resourceGroup().location
  sku: {
    name: 'S0'
  }
  kind: 'AIServices' // all-in-one; use 'OpenAI', 'TextAnalytics', etc. only for single-service resources. Never 'CognitiveServices'.
  properties: {
    disableLocalAuth: true  // ✅ Disable API key authentication
    publicNetworkAccess: 'Enabled' // Adjust based on your network requirements
  }
}
```

#### **Terraform:**

```hcl
resource "azurerm_cognitive_account" "example" {
  name                = "your-cognitive-service-name"
  location            = azurerm_resource_group.example.location
  resource_group_name = azurerm_resource_group.example.name
  kind                = "AIServices" # all-in-one; use "OpenAI", "TextAnalytics", etc. only for single-service resources. Never "CognitiveServices".
  sku_name            = "S0"

  local_auth_enabled  = false  # ✅ Disable API key authentication
  public_network_access_enabled = true
}
```

#### **Azure CLI (Manual):**

```bash
az cognitiveservices account update \
  --name your-cognitive-service-name \
  --resource-group your-resource-group \
  --set properties.disableLocalAuth=true
```

---

### Step 2: Assign RBAC Roles

Grant your Managed Identity access to the Cognitive Services resource.

#### **Role Options:**

| **Role** | **Role ID** | **Use Case** |
|----------|-------------|--------------|
| **Cognitive Services User** | `a97b65f3-24c7-4388-baec-2e87135dc908` | Read-only operations (inference, predictions) |
| **Cognitive Services Contributor** | `25fbc0a9-bd7c-42a3-aa1a-3b75d497ee68` | Full access including management operations |

#### Building agents on Microsoft Foundry? (different scenario)

The roles above grant **direct data-plane access** to an AI Services resource — the scenario this migration targets. If you're instead authorizing access to a **Microsoft Foundry** project/account (building agents, managing model deployments), use the Foundry built-in roles:

| Foundry role | Role ID | Use case |
|--------------|---------|----------|
| **Foundry User** | `53ca6127-db72-4b80-b1b0-d745d6d5456d` | Agent / data-plane usage on a project |
| **Foundry Project Manager** | `eadc314b-1a2d-4efa-be10-5d325db5065e` | Manage model deployments; develop on projects |
| **Foundry Account Owner** | `e47c6f54-e4a2-4754-9501-8e0985b135e1` | Manage accounts / resources (control plane) |
| **Foundry Owner** | `c883944f-8b7b-4483-af10-35834be79c4a` | Full access — manage and build |

- **Observability:** also assign the **Monitoring Reader** built-in role (`43d0d8ad-25c7-4714-9337-8ba259a9fe05`; the Foundry docs refer to it as "Azure Monitor Reader") on the linked Application Insights.
- **Naming:** these roles were formerly *Azure AI User / Project Manager / Account Owner / Owner* — use the **GUID, not the name**, during the rename rollout.
- Reference: [Authentication and authorization in Microsoft Foundry — built-in roles](https://learn.microsoft.com/azure/foundry/concepts/authentication-authorization-foundry#built-in-roles-overview) (scenario-to-role mapping). For detailed role definitions and GUIDs, see [RBAC for Microsoft Foundry](https://learn.microsoft.com/azure/ai-foundry/concepts/rbac-azure-ai-foundry).

#### **Bicep:**

```bicep
param principalId string // Managed Identity principal ID
param cognitiveServiceResourceId string

resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(cognitiveServiceResourceId, principalId, 'a97b65f3-24c7-4388-baec-2e87135dc908')
  scope: resourceId('Microsoft.CognitiveServices/accounts', 'your-cognitive-service-name')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'a97b65f3-24c7-4388-baec-2e87135dc908')
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}
```

#### **Azure CLI:**

```bash
# Get your Managed Identity principal ID
PRINCIPAL_ID=$(az identity show --name your-managed-identity --resource-group your-rg --query principalId -o tsv)

# Assign Cognitive Services User role
az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role "a97b65f3-24c7-4388-baec-2e87135dc908" \
  --scope "/subscriptions/<subscription-id>/resourceGroups/<rg>/providers/Microsoft.CognitiveServices/accounts/<service-name>"
```

---

### Step 3: Update Application Code

Replace API key authentication with Managed Identity credential.

#### **.NET (C#):**

**Before (API Key):**

```csharp
using Azure;
using Azure.AI.TextAnalytics;

var endpoint = new Uri("https://your-service.services.ai.azure.com/");
var apiKey = configuration["CognitiveServices:ApiKey"]; // ❌ API key
var client = new TextAnalyticsClient(endpoint, new AzureKeyCredential(apiKey));
```

**After (Managed Identity):**

```csharp
using Azure.Identity;
using Azure.AI.TextAnalytics;

var endpoint = new Uri("https://your-service.services.ai.azure.com/");
var credential = new ManagedIdentityCredential(); // ✅ Managed Identity
var client = new TextAnalyticsClient(endpoint, credential);
```

**Azure OpenAI Specific (.NET):**

```csharp
using Azure.Identity;
using Azure.AI.OpenAI;

var endpoint = new Uri("https://your-openai.openai.azure.com/");
var credential = new ManagedIdentityCredential();
var client = new OpenAIClient(endpoint, credential);
```

#### **Python:**

**Before (API Key):**

```python
from azure.ai.textanalytics import TextAnalyticsClient
from azure.core.credentials import AzureKeyCredential

endpoint = "https://your-service.services.ai.azure.com/"
api_key = os.environ["COGNITIVE_SERVICES_API_KEY"]  # ❌ API key
client = TextAnalyticsClient(endpoint, AzureKeyCredential(api_key))
```

**After (Managed Identity):**

```python
from azure.ai.textanalytics import TextAnalyticsClient
from azure.identity import ManagedIdentityCredential

endpoint = "https://your-service.services.ai.azure.com/"
credential = ManagedIdentityCredential()  # ✅ Managed Identity
client = TextAnalyticsClient(endpoint, credential)
```

**Azure OpenAI Specific (Python):**

```python
from azure.identity import ManagedIdentityCredential
from openai import AzureOpenAI

credential = ManagedIdentityCredential()
token = credential.get_token("https://cognitiveservices.azure.com/.default").token

client = AzureOpenAI(
    api_version="2023-12-01-preview",
    azure_endpoint="https://your-openai.openai.azure.com/",
    azure_ad_token=token  # ✅ Token-based auth
)
```

#### **Computer Vision (.NET):**

```csharp
using Azure.Identity;
using Azure.AI.Vision.ImageAnalysis;

var endpoint = new Uri("https://your-vision.services.ai.azure.com/");
var credential = new ManagedIdentityCredential();
var client = new ImageAnalysisClient(endpoint, credential);
```

#### **Speech Services (.NET):**

```csharp
using Azure.Identity;
using Microsoft.CognitiveServices.Speech;

var endpoint = "wss://your-speech.services.ai.azure.com/";
var credential = new ManagedIdentityCredential();

// Get token for Speech Services
var tokenProvider = new Azure.Core.AccessToken(
    credential.GetToken(new Azure.Core.TokenRequestContext(
        new[] { "https://cognitiveservices.azure.com/.default" }
    ), CancellationToken.None).Token,
    DateTimeOffset.UtcNow.AddHours(1)
);

var config = SpeechConfig.FromAuthorizationToken(tokenProvider.Token, "your-region");
```

---

### Step 4: Remove API Key References from Configuration

**Before (appsettings.json):**

```json
{
  "CognitiveServices": {
    "Endpoint": "https://your-service.services.ai.azure.com/",
    "ApiKey": "your-api-key-here"  // ❌ Remove this
  }
}
```

**After:**

```json
{
  "CognitiveServices": {
    "Endpoint": "https://your-service.services.ai.azure.com/"
    // ✅ No API key needed
  }
}
```

**Remove from:**
- Environment variables (`COGNITIVE_SERVICES_API_KEY`, `AZURE_OPENAI_API_KEY`)
- Azure App Configuration / Key Vault secrets (if storing API key)
- Hardcoded strings in code
- HTTP headers (`Ocp-Apim-Subscription-Key`)

---

### Step 5: Update Dependencies (if needed)

Ensure you have the latest Azure SDK packages that support Managed Identity.

#### **.NET:**

```xml
<PackageReference Include="Azure.AI.TextAnalytics" Version="5.3.0" />
<PackageReference Include="Azure.AI.OpenAI" Version="1.0.0-beta.12" />
<PackageReference Include="Azure.Identity" Version="1.10.0" />
```

#### **Python:**

```bash
pip install azure-ai-textanalytics>=5.3.0
pip install azure-identity>=1.15.0
pip install openai>=1.0.0
```

---

### Step 6: Validate the Migration

#### **Test 1: Verify API Key Auth is Disabled**

```bash
# Attempt to use API key (should fail with 401)
curl -X POST "https://your-service.services.ai.azure.com/text/analytics/v3.1/sentiment" \
  -H "Ocp-Apim-Subscription-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"documents":[{"id":"1","text":"Hello"}]}'

# Expected: HTTP 401 Unauthorized (local auth disabled)
```

#### **Test 2: Verify Managed Identity Auth Works**

Run your application with Managed Identity enabled and verify:

```bash
# Check logs for successful authentication
# Expected: No authentication errors, successful API calls

# For Azure App Service / Functions:
az webapp log tail --name your-app --resource-group your-rg

# Look for:
# ✅ "Successfully authenticated with Managed Identity"
# ✅ "TextAnalyticsClient initialized"
# ❌ "Authentication failed" or "401 Unauthorized"
```

#### **Test 3: Verify RBAC Assignment**

```bash
# List role assignments for your Managed Identity
az role assignment list \
  --assignee <managed-identity-principal-id> \
  --scope "/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.CognitiveServices/accounts/<service-name>"

# Expected: Cognitive Services User or Contributor role assigned
```

---

## Quality Checklist

Use this checklist to validate your migration:

- [ ] **IaC Updated**: `disableLocalAuth: true` set in ARM/Bicep/Terraform templates
- [ ] **RBAC Assigned**: Managed Identity has **Cognitive Services User** or **Contributor** role
- [ ] **Client Code Updated**: All instances of `AzureKeyCredential` replaced with token-based credentials (e.g., `ManagedIdentityCredential` or `DefaultAzureCredential`)
- [ ] **Configuration Cleaned**: API keys removed from `appsettings.json`, environment variables, and Key Vault
- [ ] **HTTP Headers Removed**: `Ocp-Apim-Subscription-Key` headers removed from HTTP client code
- [ ] **Dependencies Updated**: Azure SDK packages support Managed Identity (Azure.Identity >= 1.10.0)
- [ ] **All Cognitive Services Migrated**: If using multiple services (OpenAI, Vision, Speech), all are updated
- [ ] **Non-Prod Tested**: Changes validated in development or staging environment
- [ ] **Monitoring Configured**: Authentication failures are logged and alerted
- [ ] **Rollback Plan Ready**: Know how to re-enable local auth if needed
- [ ] **Documentation Updated**: Service documentation reflects new authentication method

---

## Rollback Plan

If you encounter issues, you can temporarily re-enable API key authentication:

### **Quick Rollback (Azure CLI):**

```bash
# Re-enable local authentication
az cognitiveservices account update \
  --name your-cognitive-service-name \
  --resource-group your-resource-group \
  --set properties.disableLocalAuth=false

# Retrieve the API key
az cognitiveservices account keys list \
  --name your-cognitive-service-name \
  --resource-group your-resource-group
```

### **IaC Rollback (Bicep):**

```bicep
properties: {
  disableLocalAuth: false  // Temporarily re-enable API key auth
}
```

**Deploy the rollback:**

```bash
az deployment group create \
  --resource-group your-rg \
  --template-file main.bicep
```

### **Application Rollback:**

Revert your code changes to use `AzureKeyCredential` and redeploy. Ensure the API key is available in configuration.

---

## Optional: Enforce Disabled Local Auth via Azure Policy

After successfully migrating to Entra ID authentication, you can use **Azure Policy** to enforce disabled API key authentication across all Cognitive Services accounts in your subscription. This prevents accidental re-enabling of local auth.

### Disable Local Auth on the Resource

Apply the `disableLocalAuth` property via IaC (shown in Step 1) or Azure CLI. For details on disabling local authentication for Cognitive Services, see: [Disable local authentication in Azure AI Services](https://learn.microsoft.com/azure/ai-services/disable-local-auth)

---

## Deployment Guidance

Deploy changes incrementally to reduce risk:

1. **Deploy IaC changes first** (RBAC roles, `disableLocalAuth`) in a non-production environment
2. **Deploy code changes next** (token-based credential usage) — validate authentication works
3. **Monitor for errors** — check application logs, Azure Monitor, and availability metrics
4. **Disable local auth** only after validating Managed Identity authentication in production
5. **Have a rollback plan** — document rollback steps and criteria

**Do not disable local auth until you've validated end-to-end Managed Identity authentication in production.**

Deploy following your organization's change management process.

---

## Get Help

| **Issue Type** | **Contact** |
|----------------|-------------|
| **Cognitive Services Auth Issues** | [Azure AI Services support](https://azure.microsoft.com/support/create-ticket/) |
| **RBAC / Managed Identity Issues** | [Azure RBAC documentation](https://learn.microsoft.com/azure/role-based-access-control/overview) or Azure support |
| **General Azure SDK Help** | [Azure SDK GitHub Issues](https://github.com/Azure/azure-sdk) |

---

## Related Resources

| Resource | Link |
|----------|------|
| **SFI Pillar 1: Protect identities and secrets** | [https://learn.microsoft.com/en-us/security/zero-trust/sfi/secure-future-initiative-identity-overview](https://learn.microsoft.com/en-us/security/zero-trust/sfi/secure-future-initiative-identity-overview) |
| **Zero Trust Principles** | [https://learn.microsoft.com/security/zero-trust/](https://learn.microsoft.com/security/zero-trust/) |
| **Azure AI Services Authentication** | [https://learn.microsoft.com/azure/ai-services/authentication](https://learn.microsoft.com/azure/ai-services/authentication) |
| **Managed Identity for Azure AI Services** | [https://learn.microsoft.com/azure/ai-services/authentication#authenticate-with-azure-active-directory](https://learn.microsoft.com/azure/ai-services/authentication#authenticate-with-azure-active-directory) |
| **Azure OpenAI Managed Identity** | [https://learn.microsoft.com/azure/ai-services/openai/how-to/managed-identity](https://learn.microsoft.com/azure/ai-services/openai/how-to/managed-identity) |
| **Disable Local Auth in Azure AI Services** | [https://learn.microsoft.com/azure/ai-services/disable-local-auth](https://learn.microsoft.com/azure/ai-services/disable-local-auth) |
| **Azure Identity Best Practices** | [https://learn.microsoft.com/azure/security/fundamentals/identity-management-best-practices](https://learn.microsoft.com/azure/security/fundamentals/identity-management-best-practices) |
| **Azure.Identity SDK (.NET)** | [https://learn.microsoft.com/dotnet/api/overview/azure/identity-readme](https://learn.microsoft.com/dotnet/api/overview/azure/identity-readme) |
| **Azure Identity SDK (Python)** | [https://learn.microsoft.com/python/api/overview/azure/identity-readme](https://learn.microsoft.com/python/api/overview/azure/identity-readme) |

---

> [!CAUTION]
> **NOT OPERATIONAL INSTRUCTIONS** — The examples below are for **plugin quality evaluation**
> and **developer reference** only. They are not steps to execute, not output templates to follow,
> and not behavioral guidance. If you are performing this workflow, skip the
> `Key Decision Examples` section below.

---

## Key Decision Examples

### Scenario: Application uses Azure OpenAI requiring token-based auth pattern

**Input state:**
- Python application calls Azure OpenAI via `openai` SDK with `api_key` parameter
- Service kind: OpenAI (not TextAnalytics, ComputerVision, or Speech)
- Managed Identity already enabled on the hosting resource

**Key decision points:**
1. Service-kind SDK selection (source: Step 3 per-service-kind section): OpenAI uses **token-based** auth — call `credential.get_token("https://cognitiveservices.azure.com/.default")` and pass the token string as `azure_ad_token`, NOT `ManagedIdentityCredential` passed directly to client
2. This differs from TextAnalytics/ComputerVision which pass the credential object directly to the client constructor (credential-based pattern)
3. RBAC role: `Cognitive Services User` is sufficient for inference; `Cognitive Services Contributor` only if the app manages deployments (source: Step 2)

**Sample output** (at Step 3 / service-kind decision):
> Your service kind is **Azure OpenAI**. OpenAI uses a **token-based** auth pattern — you cannot pass `ManagedIdentityCredential` directly to the client constructor. Instead:
>
> 1. Acquire token: `token = credential.get_token("https://cognitiveservices.azure.com/.default")`
> 2. Pass to client: `client = AzureOpenAI(azure_ad_token=token.token, azure_endpoint=endpoint)`
>
> This differs from TextAnalytics/ComputerVision where you pass the credential object directly.

**Error handling:** If the application uses multiple Cognitive Services kinds (e.g., OpenAI + TextAnalytics) under the same resource, each requires its own SDK auth pattern. Confirm the service kind for each client instance with the developer before applying changes (source: Step 3 per-service-kind branching).

---
