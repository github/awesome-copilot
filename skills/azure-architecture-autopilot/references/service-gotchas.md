# Service Gotchas (Stable)

Per-service summary of **non-intuitive required properties**, **common mistakes**, and **PE mappings**.
Only near-immutable patterns are included here. Dynamic values such as API version, SKU lists, and region are not included.

---

## 1. Required Properties (Deployment Failure or Functional Issues If Omitted)

| Service | Required Property | Result If Omitted | Notes |
|---------|------------------|-------------------|-------|
| ADLS Gen2 | `isHnsEnabled: true` | Becomes regular Blob Storage. Cannot be reversed | `kind: 'StorageV2'` required |
| Storage Account | No special characters/hyphens in name | Deployment failure | Lowercase+numbers only, 3-24 characters |
| Foundry (AIServices) | `customSubDomainName: foundryName` | Cannot create Project, cannot change after creation → Must delete and recreate resource | Globally unique value |
| Foundry (AIServices) | `allowProjectManagement: true` | Cannot create Foundry Project | `kind: 'AIServices'` |
| Foundry (AIServices) | `identity: { type: 'SystemAssigned' }` | Project creation fails | |
| Foundry Project | Must be created as a set with Foundry resource | Cannot use from portal | `accounts/projects` |
| Key Vault | `enableRbacAuthorization: true` | Risk of mixed Access Policy usage | |
| Key Vault | `enablePurgeProtection: true` | Required for production | |
| Fabric Capacity | `administration.members` required | Deployment failure | Admin email |
| PE Subnet | `privateEndpointNetworkPolicies: 'Disabled'` | PE deployment failure | |
| PE DNS Zone | `registrationEnabled: false` (VNet Link) | Possible DNS conflict | |
| PE Configuration | 3-component set (PE + DNS Zone + VNet Link + Zone Group) | DNS resolution fails even with PE present | |

---

## 2. PE groupId & DNS Zone Mapping (Key Services)

The mappings below are stable, but re-verify from the PE DNS integration document in `azure-dynamic-sources.md` when adding new services.

| Service | groupId | Private DNS Zone |
|---------|---------|-----------------|
| Azure OpenAI / CognitiveServices | `account` | `privatelink.cognitiveservices.azure.com` |
| ⚠️ (Foundry/AIServices additional) | `account` | `privatelink.openai.azure.com` ← **Both zones must be included in DNS Zone Group. OpenAI API DNS resolution fails if omitted** |
| Azure AI Search | `searchService` | `privatelink.search.windows.net` |
| Storage (Blob/ADLS) | `blob` | `privatelink.blob.core.windows.net` |
| Storage (DFS/ADLS Gen2) | `dfs` | `privatelink.dfs.core.windows.net` |
| Key Vault | `vault` | `privatelink.vaultcore.azure.net` |
| Azure ML / AI Hub | `amlworkspace` | `privatelink.api.azureml.ms` |
| Container Registry | `registry` | `privatelink.azurecr.io` |
| Cosmos DB (SQL) | `Sql` | `privatelink.documents.azure.com` |
| Azure Cache for Redis | `redisCache` | `privatelink.redis.cache.windows.net` |
| Data Factory | `dataFactory` | `privatelink.datafactory.azure.net` |
| API Management | `Gateway` | `privatelink.azure-api.net` |
| Event Hub | `namespace` | `privatelink.servicebus.windows.net` |
| Service Bus | `namespace` | `privatelink.servicebus.windows.net` |
| Monitor (AMPLS) | ⚠️ Complex configuration — see below | ⚠️ Multiple DNS Zones required — see below |

> **ADLS Gen2 Note**: When `isHnsEnabled: true`, **both `blob` and `dfs` PEs are required**.
> - With only the `blob` PE, Blob API works, but Data Lake operations (file system creation, directory manipulation, `abfss://` protocol) will fail.
> - DFS PE: groupId `dfs`, DNS Zone `privatelink.dfs.core.windows.net`
>
> **⚠️ Azure Monitor Private Link (AMPLS) Note**: Azure Monitor cannot be configured with a single PE + single DNS Zone. It connects through Azure Monitor Private Link Scope (AMPLS), and all **5 DNS Zones** are required:
> - `privatelink.monitor.azure.com`
> - `privatelink.oms.opinsights.azure.com`
> - `privatelink.ods.opinsights.azure.com`
> - `privatelink.agentsvc.azure-automation.net`
> - `privatelink.blob.core.windows.net` (for Log Analytics data ingestion)
>
> This mapping is complex and subject to change, so always fetch and verify MS Docs when configuring Monitor PE:
> https://learn.microsoft.com/en-us/azure/azure-monitor/logs/private-link-configure

---

## 3. Common Mistakes Checklist

| Item | ❌ Incorrect Example | ✅ Correct Example |
|------|---------------------|-------------------|
| ADLS Gen2 HNS | `isHnsEnabled` omitted or `false` | `isHnsEnabled: true` |
| PE Subnet | Policy not set | `privateEndpointNetworkPolicies: 'Disabled'` |
| DNS Zone Group | Only PE created | PE + DNS Zone + VNet Link + DNS Zone Group |
| Foundry resource | `kind: 'OpenAI'` | `kind: 'AIServices'` + `allowProjectManagement: true` |
| Foundry resource | `customSubDomainName` omitted | `customSubDomainName: foundryName` — Cannot change after creation |
| Foundry Project | Only Foundry exists without Project | Must create as a set |
| Key Vault auth | Access Policy | `enableRbacAuthorization: true` |
| Public network | Not configured | `publicNetworkAccess: 'Disabled'` |
| Storage name | `st-my-storage` | `stmystorage` or `st${uniqueString(...)}` |
| API version | Copied from previous conversation/error | Verify latest stable from MS Docs |
| Region | Hardcoded (`'eastus'`) | Pass as parameter (`param location`) |
| Sensitive values | Plaintext in `.bicepparam` | `@secure()` + Key Vault reference |

---

## 4. Service Relationship Decision Rules

Described as **default selection rules** rather than absolute determinations.

### Foundry vs Azure OpenAI vs AI Hub

```
Default rules:
├─ AI/RAG workloads → Use Microsoft Foundry (kind: 'AIServices')
│   ├─ Create Foundry resource + Foundry Project as a set
│   └─ Model deployment is performed at the Foundry resource level (accounts/deployments)
│
├─ ML/open-source model training needed → Consider AI Hub (MachineLearningServices)
│   └─ Only when the user explicitly requests it or features not supported in Foundry are needed
│
└─ Standalone Azure OpenAI resource →
    Consider only when the user explicitly requests it or
    official documentation requires a separate resource
```

> These rules are a **default selection guide** reflecting current MS recommendations.
> Azure product relationships can change, so check MS Docs when uncertain.

### Monitoring

```
Default rules:
├─ Foundry (AIServices) → Application Insights not required
└─ AI Hub (MachineLearningServices) → Application Insights + Log Analytics required
```
