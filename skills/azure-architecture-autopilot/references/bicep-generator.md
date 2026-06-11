# Bicep Generator Agent

Receives the finalized architecture spec from Phase 1 and generates deployable Bicep templates.

## Step 0: Verify Latest Specs (Required Before Bicep Generation)

Do not hardcode API versions in Bicep code.
Always fetch the MS Docs Bicep reference for the services you intend to use and confirm the latest stable apiVersion before using it.

### Verification Steps
1. Identify the list of services to be used
2. Fetch the MS Docs URL for each service (using the web_fetch tool)
3. Confirm the latest stable API version from the page
4. Write Bicep using that version

### Model Deployment Availability Check (Required When Using Foundry/OpenAI Models)

Verify that the model name specified by the user is actually deployable in the target region **before generating Bicep**.
Model availability varies by region and changes frequently — do not rely on static knowledge.

**Verification Methods (in priority order):**
1. Check the MS Docs model availability page: https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models
2. Or query directly via Azure CLI:
   ```powershell
   az cognitiveservices account list-models --name "<FOUNDRY_NAME>" --resource-group "<RG_NAME>" -o table
   ```
   (When the Foundry resource already exists)

**If the model is not available in the target region:**
- Inform the user and suggest available regions or alternative models
- Do not substitute a different model or region without user approval

### Per-Service MS Docs URLs

The full URL registry is in `references/azure-dynamic-sources.md`. Refer to this file when fetching.
Reference files are located under the `.github/skills/azure-architecture-autopilot/` path.

> **Important**: Fetch directly from the URL using web_fetch to confirm the latest stable apiVersion. Do not blindly use hardcoded versions from reference files or previous conversations.

> **Always verify child resources too**: Check the API versions for child resources (accounts/projects, accounts/deployments, privateDnsZones/virtualNetworkLinks, privateEndpoints/privateDnsZoneGroups, etc.) from the parent resource page. Parent and child API versions may differ.

> **Same principle applies when errors/warnings occur**: If an API version–related error occurs during what-if or deployment, do not trust the version in the error message as the "latest version" and apply it directly. Always re-fetch the MS Docs URL to confirm the actual latest stable version before making corrections.

---

## Information Reference Principles (Stable vs Dynamic)

### Always Fetch (Dynamic)
- API version → Fetch from URLs in `azure-dynamic-sources.md`
- Model availability (name, version, region) → Fetch
- SKU list/pricing → Fetch
- Region availability → Fetch

### Reference First (Stable)
- Required property patterns (`isHnsEnabled`, `allowProjectManagement`, etc.) → `service-gotchas.md`
- PE groupId & DNS Zone mappings (major services) → `service-gotchas.md`
- PE/security/naming common patterns → `azure-common-patterns.md`
- AI/Data service configuration guide → `ai-data.md`

> If unsure about stable information, re-verify with MS Docs. But there is no need to fetch every time.

---

## Unknown Service Fallback Workflow

When the user requests a service not covered by the v1 scope (`ai-data.md`):

1. **Notify the user**: "This service is outside the v1 default scope. It will be generated on a best-effort basis by referencing MS Docs."
2. **Fetch API version**: Construct the URL in the format `https://learn.microsoft.com/en-us/azure/templates/microsoft.{provider}/{resourceType}` and fetch
3. **Identify resource type/required properties**: Confirm the resource type and required properties from the fetched Docs
4. **Verify PE mapping**: Fetch `https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns` to confirm groupId/DNS Zone
5. **Apply common patterns**: Apply security/network/naming patterns from `azure-common-patterns.md`
6. **Write Bicep**: Generate the module based on the above information
7. **Hand off to reviewer**: Validate compilation with `az bicep build`

## Input Information

The following information must be finalized upon completion of Phase 1:

```
- services: [Service list + SKU]
- networking: Whether private_endpoint is used
- resource_group: Resource group name
- location: Deployment location (confirmed with user in Phase 1)
- subscription_id: Azure subscription ID
```

## Output File Structure

```
<project-name>/
├── main.bicep              # Main orchestration — module calls and parameter passing
├── main.bicepparam         # Parameter file — environment-specific values, excluding sensitive info
└── modules/
    ├── network.bicep           # VNet, Subnet (including pe-subnet)
    ├── ai.bicep                # AI services (configured per user requirements)
    ├── storage.bicep           # ADLS Gen2 (isHnsEnabled: true required)
    ├── fabric.bicep            # Microsoft Fabric Capacity (only when needed)
    ├── keyvault.bicep          # Key Vault
    ├── monitoring.bicep        # Application Insights, Log Analytics (only needed for Hub-based configurations)
    └── private-endpoints.bicep # All PEs + Private DNS Zones + VNet Links + DNS Zone Groups
```

## Module Responsibilities

### `network.bicep`
- VNet — CIDR received as a parameter (to avoid conflicts with existing address spaces in the customer environment)
- pe-subnet — `privateEndpointNetworkPolicies: 'Disabled'` required
- Additional subnets handled via parameters as needed

### `ai.bicep`
- **Microsoft Foundry resource** (`Microsoft.CognitiveServices/accounts`, `kind: 'AIServices'`) — Top-level AI resource
  - `customSubDomainName: foundryName` required — **Cannot be changed after creation. If omitted, the resource must be deleted and recreated**
  - `identity: { type: 'SystemAssigned' }` required
  - `allowProjectManagement: true` required
  - Model deployment (`Microsoft.CognitiveServices/accounts/deployments`) — Performed at the Foundry resource level
- **⚠️ Foundry Project** (`Microsoft.CognitiveServices/accounts/projects`) — **Must be created as a child resource**
  - Resource type: `Microsoft.CognitiveServices/accounts/projects` (never create as a standalone `accounts` resource)
  - Use `parent: foundryAccount` in Bicep
  - Incorrect example: Creating a Project as a separate `kind: 'AIServices'` account → Not recognized in the portal
  - Correct example:
    ```bicep
    resource foundryProject 'Microsoft.CognitiveServices/accounts/projects@<apiVersion>' = {
      parent: foundryAccount
      name: 'project-${uniqueString(resourceGroup().id)}'
      location: location
      kind: 'AIServices'
      properties: {}
    }
    ```
- **Azure AI Search** — Semantic Ranking, vector search configuration
- Hub-based (`Microsoft.MachineLearningServices/workspaces`) should only be considered when the user explicitly requests it or when ML training/open-source models are needed. For standard AI/RAG workloads, Foundry (AIServices) is the default choice

**⛔ CognitiveServices Prohibited Properties:**
- `apiProperties.statisticsEnabled` — This property does not exist. Never use it. Causes `ApiPropertiesInvalid` error during deployment
- `apiProperties.qnaAzureSearchEndpointId` — QnA Maker only. Do not use with Foundry
- Do not arbitrarily add unvalidated properties to `properties.apiProperties`

### `storage.bicep`
- ADLS Gen2: `isHnsEnabled: true` ← **Never omit this**
- Containers: raw, processed, curated (or as per requirements)
- `allowBlobPublicAccess: false`, `minimumTlsVersion: 'TLS1_2'`

### `keyvault.bicep`
- `enableRbacAuthorization: true` (do not use access policy model)
- `enableSoftDelete: true`, `softDeleteRetentionInDays: 90`
- `enablePurgeProtection: true`

### `monitoring.bicep`
- Log Analytics Workspace
- Application Insights (only needed for Hub-based configurations — not required for Foundry AIServices)

### `private-endpoints.bicep`
- 3-piece set for each service:
  1. `Microsoft.Network/privateEndpoints` (placed in pe-subnet)
  2. `Microsoft.Network/privateDnsZones` + VNet Link (`registrationEnabled: false`)
  3. `Microsoft.Network/privateEndpoints/privateDnsZoneGroups`
- For per-service DNS Zone mappings, refer to `references/service-gotchas.md`

**⚠️ Foundry/AIServices PE DNS Rules:**
- PE groupId: `account`
- DNS Zone Group must include **2 zones**:
  1. `privatelink.cognitiveservices.azure.com`
  2. `privatelink.openai.azure.com`
- Including only one causes DNS resolution failure for OpenAI API calls → connection error

**⚠️ ADLS Gen2 (isHnsEnabled: true) PE Rules:**
- 2 PEs required:
  1. `blob` → `privatelink.blob.core.windows.net`
  2. `dfs` → `privatelink.dfs.core.windows.net`
- Without the DFS PE, Data Lake operations (file system creation, directory manipulation) will fail

### `rbac.bicep` (or inline in main.bicep)

**⚠️ RBAC Role Assignment — Never Omit**

**Any service with a Managed Identity (`identity.type: 'SystemAssigned'`) must have RBAC role assignments created.**
Having an identity without role assignments causes inter-service authentication failures.
This is not optional — it is a **mandatory item**.
Omission will be reported as CRITICAL in Phase 3 review.

- Required RBAC mappings:

| Source Service | Target Service | Role | Role Definition ID |
|------------|-----------|------|-------------------|
| Foundry | Storage | `Storage Blob Data Contributor` | `ba92f5b4-2d11-453d-a403-e96b0029c9fe` |
| Foundry | AI Search | `Search Index Data Contributor` | `8ebe5a00-799e-43f5-93ac-243d3dce84a7` |
| Foundry | AI Search | `Search Service Contributor` | `7ca78c08-252a-4471-8644-bb5ff32d4ba0` |
| App Service | Key Vault | `Key Vault Secrets User` | `4633458b-17de-408a-b874-0445c86b69e6` |
| AKS (kubeletIdentity) | ACR | `AcrPull` | `7f951dda-4ed3-4680-a7ca-43fe172d538d` |
| Data Factory | Storage | `Storage Blob Data Contributor` | `ba92f5b4-2d11-453d-a403-e96b0029c9fe` |
| Data Factory | Key Vault | `Key Vault Secrets User` | `4633458b-17de-408a-b874-0445c86b69e6` |
| Databricks | Storage | `Storage Blob Data Contributor` | `ba92f5b4-2d11-453d-a403-e96b0029c9fe` |

> **AKS Special Rule**: AKS uses `identityProfile.kubeletidentity.objectId`, not `identity.principalId`.

```bicep
// RBAC Example — Foundry → Storage Blob Data Contributor
resource foundryStorageRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, foundry.id, 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
    principalId: foundry.identity.principalId
    principalType: 'ServicePrincipal'
  }
}
```

### SQL Server Rules
- **Password management**: Declare `@secure() param sqlAdminPassword string` in main.bicep and pass it to modules
  - Do not generate with `newGuid()` inside modules — the password changes on redeployment
  - Store as a Key Vault Secret so it can be retrieved after deployment
- **Authentication method**: Default to `administrators.azureADOnlyAuthentication: true`
  - Many organizational policies (MCAPS, etc.) block standalone SQL authentication
  - AAD-only authentication + Managed Identity is the most secure configuration

### Network Secret Handling
- **VPN Gateway shared key**: `@secure() param vpnSharedKey string` — `@secure()` is mandatory
- Never include plaintext VPN keys in `.bicepparam` — provide at deployment time or use Key Vault reference
- This rule applies the same as for SQL passwords
- **Applies to**: VPN shared key, ExpressRoute authorization key, Wi-Fi PSK, and all other network secrets
- Module params must also include the `@secure()` decorator

### ⚠️ Network Isolation Consistency Rules
- When setting `publicNetworkAccess: 'Disabled'`, you **must** also create the corresponding PE for that service
- Setting publicNetworkAccess to Disabled without a PE makes the service unreachable → unusable after deployment
- The Phase 3 reviewer must report this inconsistency as **CRITICAL**
- When an inconsistency is found: either add a PE module or revert publicNetworkAccess to Enabled

## Mandatory Coding Principles

### Naming Conventions
```bicep
// Use uniqueString to prevent naming collisions — always required
param foundryName string = 'foundry-${uniqueString(resourceGroup().id)}'
param searchName string = 'srch-${uniqueString(resourceGroup().id)}'
param storageName string = 'st${uniqueString(resourceGroup().id)}'  // No special characters allowed
param keyVaultName string = 'kv-${uniqueString(resourceGroup().id)}'
```
> **⚠️ Resources requiring `customSubDomainName` (Foundry, Cognitive Services, etc.) must include `uniqueString()`.**
> Static strings (e.g., `'my-rag-chatbot'`) may already be in use by another tenant, causing deployment failures.
> The same applies to Foundry Project names — `'project-${uniqueString(resourceGroup().id)}'`

### Network Isolation
```bicep
// Required for all services when using Private Endpoints
publicNetworkAccess: 'Disabled'
networkAcls: {
  defaultAction: 'Deny'
  ipRules: []
  virtualNetworkRules: []
}
```

### Dependency Management
```bicep
// Use implicit dependencies via resource references instead of explicit dependsOn
resource aiProject '...' = {
  properties: {
    hubResourceId: aiHub.id  // Reference to aiHub → aiHub is automatically deployed first
  }
}
```

### Security
```bicep
// Use Key Vault references for sensitive values — never store plaintext in parameter files
@secure()
param adminPassword string  // Do not put plaintext values in main.bicepparam
```

### Code Comments
```bicep
// Microsoft Foundry resource — kind: 'AIServices'
// customSubDomainName: Required, globally unique. Cannot be changed after creation — if omitted, resource must be deleted and recreated
// allowProjectManagement: true is required or Foundry Project creation will fail
// Replace apiVersion with the latest version fetched in Step 0
resource foundry 'Microsoft.CognitiveServices/accounts@<version fetched in Step 0>' = {
  kind: 'AIServices'
  properties: {
    customSubDomainName: foundryName
    allowProjectManagement: true
    ...
  }
}
```

### ⚠️ Bicep Code Quality Validation (Required After Generation)

**Module Declaration Validation:**
- Verify that the `name:` property in each module block is not duplicated
- Correct example: `name: 'deploy-sql'`
- Incorrect example: `name: 'name: 'deploy-sql'` (duplicated name: → compilation error)

**Duplicate Property Prevention:**
- If the same property name appears more than once within a single resource block, it causes a compilation error
- Especially common in complex resources like VPN Gateway (`gatewayType`), Firewall, AKS, etc.
- Check for `BCP025: The property "xxx" is declared multiple times` in the `az bicep build` output

**`az bicep build` Must Be Run:**
- After generating all Bicep files, always run `az bicep build --file main.bicep`
- Fix errors and recompile
- Warnings (BCP081, etc.) can be ignored after verifying the API version in MS Docs

## main.bicep Base Structure

```bicep
// ============================================================
// Azure [Project Name] Infrastructure — main.bicep
// Generated: [Date]
// ============================================================

targetScope = 'resourceGroup'

// ── Common Parameters ─────────────────────────────────────
param location string   // Location confirmed in Phase 1 — do not hardcode
param projectPrefix string
param vnetAddressPrefix string    // ← Confirm with user. Prevent conflicts with existing networks
param peSubnetPrefix string       // ← PE-dedicated subnet CIDR within the VNet

// ── Network ───────────────────────────────────────────────
module network './modules/network.bicep' = {
  name: 'deploy-network'
  params: {
    location: location
    vnetAddressPrefix: vnetAddressPrefix
    peSubnetPrefix: peSubnetPrefix
  }
}

// ── AI/Data Services ──────────────────────────────────────
module ai './modules/ai.bicep' = {
  name: 'deploy-ai'
  params: {
    location: location
    // Add separate params if regions differ per service — verify available regions in MS Docs
  }
  dependsOn: [network]
}

// ── Storage ───────────────────────────────────────────────
module storage './modules/storage.bicep' = {
  name: 'deploy-storage'
  params: {
    location: location
  }
}

// ── Key Vault ─────────────────────────────────────────────
module keyVault './modules/keyvault.bicep' = {
  name: 'deploy-keyvault'
  params: {
    location: location
  }
}

// ── Private Endpoints (All Services) ──────────────────────
module privateEndpoints './modules/private-endpoints.bicep' = {
  name: 'deploy-private-endpoints'
  params: {
    location: location
    vnetId: network.outputs.vnetId
    peSubnetId: network.outputs.peSubnetId
    foundryId: ai.outputs.foundryId
    searchId: ai.outputs.searchId
    storageId: storage.outputs.storageId
    keyVaultId: keyVault.outputs.keyVaultId
  }
}

// ── Outputs ───────────────────────────────────────────────
output vnetId string = network.outputs.vnetId
output foundryEndpoint string = ai.outputs.foundryEndpoint
output searchEndpoint string = ai.outputs.searchEndpoint
```

## main.bicepparam Base Structure

```bicep
using './main.bicep'

param location = '<Location confirmed in Phase 1>'
param projectPrefix = '<Project prefix>'
// Do not put sensitive values here — use Key Vault references
// Set regions after verifying per-service availability in MS Docs
```

### @secure() Parameter Handling

When a `.bicepparam` file contains a `using` directive, additional `--parameters` flags cannot be used with `az deployment`.
Therefore, `@secure()` parameters must follow these rules:

- **Set a default value when possible**: `@secure() param password string = newGuid()`
- **If user input is required for @secure() parameters**: Generate a JSON parameter file (`main.parameters.json`) alongside instead of using `.bicepparam`
- **Never do this**: Generate a command that uses `.bicepparam` and `--parameters key=value` simultaneously

## Common Mistake Checklist

The full checklist is in `references/service-gotchas.md`. Key summary:

| Item | ❌ Incorrect | ✅ Correct |
|------|--------|----------|
| ADLS Gen2 | `isHnsEnabled` omitted | `isHnsEnabled: true` |
| PE Subnet | Policy not set | `privateEndpointNetworkPolicies: 'Disabled'` |
| PE Configuration | PE only created | PE + DNS Zone + VNet Link + DNS Zone Group |
| Foundry | `kind: 'OpenAI'` | `kind: 'AIServices'` + `allowProjectManagement: true` |
| Foundry | `customSubDomainName` omitted | `customSubDomainName: foundryName` — cannot be changed after creation |
| Foundry Project | Not created | Must always be created as a set with the Foundry resource |
| Hub Usage | Used for standard AI | Only when explicitly requested by user or ML/open-source models needed |
| Public Network | Not configured | `publicNetworkAccess: 'Disabled'` |
| Storage Name | Contains hyphens | Lowercase + digits only, `uniqueString()` recommended |
| API version | Copied from previous value | Fetch from MS Docs (Dynamic) |
| Region | Hardcoded | Parameter + verify availability in MS Docs (Dynamic) |

## After Generation Is Complete

When Bicep generation is complete:
1. Provide the user with a summary report of the generated file list and each file's role
2. Immediately transition to Phase 3 (Bicep Reviewer)
3. The reviewer proceeds with automated review and corrections following the `references/bicep-reviewer.md` guidelines
