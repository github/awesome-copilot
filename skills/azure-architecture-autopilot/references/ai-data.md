# Domain Pack: AI/Data (v1)

Service configuration guide specialized for Azure AI/Data workloads.
v1 scope: Foundry, AI Search, ADLS Gen2, Key Vault, Fabric, ADF, VNet/PE.

> Required properties/common mistakes → `service-gotchas.md`
> Dynamic information (API version, SKU, region) → `azure-dynamic-sources.md`
> Common patterns (PE, security, naming) → `azure-common-patterns.md`

---

## 1. Microsoft Foundry (CognitiveServices)

### Resource Hierarchy

```
Microsoft.CognitiveServices/accounts (kind: 'AIServices')
├── /projects          — Foundry Project (required for portal access)
└── /deployments       — Model deployments (GPT-4o, embedding, etc.)
```

### Bicep Core Structure

```bicep
// Foundry resource
resource foundry 'Microsoft.CognitiveServices/accounts@<fetch>' = {
  name: foundryName
  location: location
  kind: 'AIServices'
  sku: { name: '<confirm with user>' }               // ← SKU confirmed after MS Docs check in Phase 1
  identity: { type: 'SystemAssigned' }
  properties: {
    customSubDomainName: foundryName  // ← Required, globally unique. Cannot change after creation — must delete and recreate if omitted
    allowProjectManagement: true
    publicNetworkAccess: 'Disabled'
    networkAcls: { defaultAction: 'Deny' }
  }
}

// Foundry Project — Must be created as a set with Foundry
resource project 'Microsoft.CognitiveServices/accounts/projects@<fetch>' = {
  parent: foundry
  name: '${foundryName}-project'
  location: location
  sku: { name: '<same as parent>' }
  kind: 'AIServices'
  identity: { type: 'SystemAssigned' }
  properties: {}
}

// Model deployment — At Foundry resource level
resource deployment 'Microsoft.CognitiveServices/accounts/deployments@<fetch>' = {
  parent: foundry
  name: '<model-name>'                              // ← Confirmed with user in Phase 1
  sku: {
    name: '<deployment-type>'                        // ← GlobalStandard, Standard, etc. — MS Docs fetch
    capacity: <confirm with user>                    // ← Capacity units — verify available range from MS Docs
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: '<model-name>'                           // ← Must verify availability (fetch)
      version: '<fetch>'                             // ← Version also fetched
    }
  }
}
```

> `@<fetch>`: Verify API version from the URLs in `azure-dynamic-sources.md`.
> Model name/version/deployment type/capacity: All Dynamic — Confirmed with user after MS Docs fetch in Phase 1.

---

## 2. Azure AI Search

### Bicep Core Structure

```bicep
resource search 'Microsoft.Search/searchServices@<fetch>' = {
  name: searchName
  location: location
  sku: { name: '<confirm with user>' }
  identity: { type: 'SystemAssigned' }
  properties: {
    hostingMode: 'default'
    publicNetworkAccess: 'disabled'
    semanticSearch: '<confirm with user>'    // disabled | free | standard — verify in MS Docs
  }
}
```

### Design Notes

- PE support: Basic SKU or higher (verify latest constraints in MS Docs)
- Semantic Ranker: Activated via `semanticSearch` property (`disabled` | `free` | `standard`) — verify per-SKU support in MS Docs
- Vector search: Supported on paid SKUs (verify in MS Docs)
- Commonly used together with Foundry for RAG configurations

---

## 3. ADLS Gen2 (Storage Account)

### Bicep Core Structure

```bicep
resource storage 'Microsoft.Storage/storageAccounts@<fetch>' = {
  name: storageName        // Lowercase+numbers only, no hyphens
  location: location
  kind: 'StorageV2'
  sku: { name: 'Standard_LRS' }
  properties: {
    isHnsEnabled: true                 // ← Never omit this
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    publicNetworkAccess: 'Disabled'
    networkAcls: { defaultAction: 'Deny' }
  }
}

// Container
resource container 'Microsoft.Storage/storageAccounts/blobServices/containers@<fetch>' = {
  name: '${storage.name}/default/raw'
}
```

### Design Notes

- `isHnsEnabled` cannot be changed after creation → Resource must be recreated if omitted
- PE: May need both `blob` and `dfs` PEs depending on use case
- Common containers: `raw`, `processed`, `curated`

---

## 4. Microsoft Fabric

### Bicep Core Structure

```bicep
resource fabric 'Microsoft.Fabric/capacities@<fetch>' = {
  name: fabricName
  location: location
  sku: { name: '<confirm with user>', tier: 'Fabric' }
  properties: {
    administration: {
      members: [ '<admin-email>' ]    // ← Required, deployment fails without it
    }
  }
}
```

### Design Notes

- Only Capacity can be provisioned via Bicep
- Workspace, Lakehouse, Warehouse, etc. must be created manually in the portal
- Confirm admin email with the user (`ask_user`)

### Required Confirmation Items When Adding in Phase 1

When Fabric is added during conversation, the following items must be confirmed via ask_user before updating the diagram:

- [ ] **SKU/Capacity**: F2, F4, F8, ... — Provide choices after fetching available SKUs from MS Docs
- [ ] **administration.members**: Admin email — Deployment fails without it

> Do not arbitrarily include sub-workloads (OneLake, data pipelines, Warehouse, etc.) that the user did not specify. Only Capacity can be provisioned via Bicep.

---

## 5. Azure Data Factory

### Bicep Core Structure

```bicep
resource adf 'Microsoft.DataFactory/factories@<fetch>' = {
  name: adfName
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    publicNetworkAccess: 'Disabled'
  }
}
```

### Design Notes

- Self-hosted Integration Runtime requires manual setup outside Bicep
- Primarily used for on-premises data ingestion scenarios
- PE groupId: `dataFactory`

---

## 6. AML / AI Hub (MachineLearningServices)

### When to Use

```
Decision Rule:
├─ General AI/RAG → Use Foundry (AIServices)
└─ ML training, open-source models needed → Consider AI Hub
    └─ Only when the user explicitly requests it
```

### Bicep Core Structure

```bicep
resource hub 'Microsoft.MachineLearningServices/workspaces@<fetch>' = {
  name: hubName
  location: location
  kind: 'Hub'
  sku: { name: '<confirm with user>', tier: '<confirm with user>' }  // e.g., Basic/Basic — verify available SKUs in MS Docs
  identity: { type: 'SystemAssigned' }
  properties: {
    friendlyName: hubName
    storageAccount: storage.id
    keyVault: keyVault.id
    applicationInsights: appInsights.id    // Required for Hub
    publicNetworkAccess: 'Disabled'
  }
}
```

### AI Hub Dependencies

Additional resources needed when using Hub:
- Storage Account
- Key Vault
- Application Insights + Log Analytics Workspace
- Container Registry (optional)

---

## 7. Common AI/Data Architecture Combinations

### RAG Chatbot

```
Foundry (AIServices) + Project
├── <chat-model> (chat)              — Confirmed after availability check in Phase 1
├── <embedding-model> (embedding)    — Confirmed after availability check in Phase 1
├── AI Search (vector + semantic)
├── ADLS Gen2 (document store)
└── Key Vault (secrets)
+ Full VNet/PE configuration
```

### Data Platform

```
Fabric Capacity (analytics)
├── ADLS Gen2 (data lake)
├── ADF (ingestion)
└── Key Vault (secrets)
+ VNet/PE configuration
```
