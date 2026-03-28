# Phase 0: Existing Resource Scanner

This file contains the detailed instructions for Phase 0. When the user requests analysis of existing Azure resources (Path B), read and follow this file.

Scan results are visualized as an architecture diagram, and subsequent natural-language modification requests from the user are routed to Phase 1.

> **🚨 Output Storage Path Rule**: All outputs (scan JSON, diagram HTML, Bicep code) must be saved in **a project folder under the current working directory (cwd)**. NEVER save them inside `~/.copilot/session-state/`. The session-state directory is a temporary space and may be deleted when the session ends.

---

## Step 1: Azure Login + Scan Scope Selection

### 1-A: Verify Azure Login

```powershell
az account show 2>&1
```

- If logged in → Proceed to Step 1-B
- If not logged in → Ask the user to run `az login`

### 1-B: Subscription Selection (Multiple Selection Supported)

```powershell
az account list --output json
```

Present the subscription list as `ask_user` choices. **Multiple subscriptions can be selected:**
```
ask_user({
  question: "Please select the Azure subscription(s) to analyze. (You can add more one at a time for multiple selections)",
  choices: [
    "sub-002 (Current default subscription) (Recommended)",
    "sub-001",
    "Analyze all subscriptions above"
  ]
})
```

- Single subscription selected → Scan only that subscription
- "Analyze all" selected → Scan all subscriptions
- If the user wants additional subscriptions → Use ask_user again to add more

### 1-C: Scan Scope Selection (Multiple RG Selection Supported)

```
ask_user({
  question: "What scope of Azure resources would you like to analyze?",
  choices: [
    "Specify a particular resource group (Recommended)",
    "Select multiple resource groups",
    "All resource groups in the current subscription"
  ]
})
```

- **Specific RG** → Select from the RG list or enter manually
- **Multiple RGs** → Repeat ask_user to add RGs one at a time. Stop when the user says "that's enough."
  Alternatively, the user can enter multiple RGs separated by commas (e.g., `rg-prod, rg-dev, rg-network`)
- **Entire subscription** → `az group list` → Scan all RGs (warn if there are many resources that it may take time)

**Combining multiple subscriptions + multiple RGs is supported:**
- rg-prod from subscription A + rg-network from subscription B → Scan both and display in a single diagram

---

## Diagram Hierarchy — Displaying Multiple Subscriptions/RGs

**Single subscription + single RG**: Same as before (VNet boundary only)
**Multiple RGs (same subscription)**: Dashed boundary per RG
**Multiple subscriptions**: Two-level boundary of Subscription > RG

Pass hierarchy information in the diagram JSON:

**Add `subscription` and `resourceGroup` fields to the services JSON:**
```json
{
  "id": "foundry",
  "name": "foundry-xxx",
  "type": "ai_foundry",
  "subscription": "sub-002",
  "resourceGroup": "rg-prod",
  "details": [...]
}
```

**Pass hierarchy information via the `--hierarchy` parameter:**
```
--hierarchy '[{"subscription":"sub-002","resourceGroups":["rg-prod","rg-dev"]},{"subscription":"sub-001","resourceGroups":["rg-network"]}]'
```

Based on this information, the diagram script will:
- Multiple RGs → Represent each RG as a cluster with a dashed boundary (label: RG name)
- Multiple subscriptions → Nest RG boundaries inside larger subscription boundaries
- VNet boundaries are displayed inside the RG to which the VNet belongs

---

## Step 2: Resource Scan

**🚨 az CLI Output Principles:**
- az CLI output must **always be saved to a file** and then read with `view`. Direct terminal output may be truncated.
- Bundle **no more than 3 az commands** per PowerShell call. Bundling too many may cause timeouts.
- Use `--query` JMESPath to extract only the required fields and reduce output size.

```powershell
# ✅ Correct approach — Save to file then read
az resource list -g "<RG>" --query "[].{name:name,type:type,kind:kind,location:location}" -o json | Set-Content -Path "$outDir/resources.json"

# ❌ Wrong approach — Direct terminal output (may be truncated)
az resource list -g "<RG>" -o json
```

### 2-A: List All Resources + Display to User

```powershell
$outDir = "<project-name>/azure-scan"
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

# Step 1: Basic resource list (name, type, kind, location)
az resource list -g "<RG>" --query "[].{name:name,type:type,kind:kind,location:location,id:id}" -o json | Set-Content "$outDir/resources.json"
```

**🚨 Immediately after reading resources.json, you MUST display the full resource list table to the user:**

```
📋 rg-<RG> Resource List (N resources)

┌─────────────────────────┬──────────────────────────────────────────────┬─────────────────┐
│ Name                    │ Type                                         │ Location        │
├─────────────────────────┼──────────────────────────────────────────────┼─────────────────┤
│ my-storage              │ Microsoft.Storage/storageAccounts             │ koreacentral    │
│ my-keyvault             │ Microsoft.KeyVault/vaults                    │ koreacentral    │
│ ...                     │ ...                                          │ ...             │
└─────────────────────────┴──────────────────────────────────────────────┴─────────────────┘

⏳ Retrieving detailed information...
```

Display this table **first** before proceeding to detailed queries. Do not make the user wait without knowing what resources exist.

### 2-B: Dynamic Detailed Query — Based on resources.json

**Dynamically determine detailed query commands based on the resource types found in resources.json.**

Do not use a hardcoded command list. Only execute commands for types that exist in resources.json, selected from the mapping table below.

**Type → Detailed Query Command Mapping:**

| Type in resources.json | Detailed Query Command | Output File |
|---|---|---|
| `Microsoft.Network/virtualNetworks` | `az network vnet list -g "<RG>" --query "[].{name:name,addressSpace:addressSpace.addressPrefixes,subnets:subnets[].{name:name,prefix:addressPrefix,pePolicy:privateEndpointNetworkPolicies}}" -o json` | `vnets.json` |
| `Microsoft.Network/privateEndpoints` | `az network private-endpoint list -g "<RG>" --query "[].{name:name,subnetId:subnet.id,targetId:privateLinkServiceConnections[0].privateLinkServiceId,groupIds:privateLinkServiceConnections[0].groupIds,state:provisioningState}" -o json` | `pe.json` |
| `Microsoft.Network/networkSecurityGroups` | `az network nsg list -g "<RG>" --query "[].{name:name,location:location,subnets:subnets[].id,nics:networkInterfaces[].id}" -o json` | `nsg.json` |
| `Microsoft.CognitiveServices/accounts` | `az cognitiveservices account list -g "<RG>" --query "[].{name:name,kind:kind,sku:sku.name,endpoint:properties.endpoint,publicAccess:properties.publicNetworkAccess,location:location}" -o json` | `cognitive.json` |
| `Microsoft.Search/searchServices` | `az search service list -g "<RG>" --query "[].{name:name,sku:sku.name,publicAccess:properties.publicNetworkAccess,semanticSearch:properties.semanticSearch,location:location}" -o json 2>$null` | `search.json` |
| `Microsoft.Compute/virtualMachines` | `az vm list -g "<RG>" --query "[].{name:name,size:hardwareProfile.vmSize,os:storageProfile.osDisk.osType,location:location,nicIds:networkProfile.networkInterfaces[].id}" -o json` | `vms.json` |
| `Microsoft.Storage/storageAccounts` | `az storage account list -g "<RG>" --query "[].{name:name,sku:sku.name,kind:kind,hns:properties.isHnsEnabled,publicAccess:properties.publicNetworkAccess,location:location}" -o json` | `storage.json` |
| `Microsoft.KeyVault/vaults` | `az keyvault list -g "<RG>" --query "[].{name:name,location:location}" -o json 2>$null` | `keyvault.json` |
| `Microsoft.ContainerService/managedClusters` | `az aks list -g "<RG>" --query "[].{name:name,kubernetesVersion:kubernetesVersion,sku:sku,agentPoolProfiles:agentPoolProfiles[].{name:name,count:count,vmSize:vmSize},networkProfile:networkProfile.networkPlugin,location:location}" -o json` | `aks.json` |
| `Microsoft.Web/sites` | `az webapp list -g "<RG>" --query "[].{name:name,kind:kind,sku:appServicePlan,state:state,defaultHostName:defaultHostName,httpsOnly:httpsOnly,location:location}" -o json` | `webapps.json` |
| `Microsoft.Web/serverFarms` | `az appservice plan list -g "<RG>" --query "[].{name:name,sku:sku.name,tier:sku.tier,kind:kind,location:location}" -o json` | `appservice-plans.json` |
| `Microsoft.DocumentDB/databaseAccounts` | `az cosmosdb list -g "<RG>" --query "[].{name:name,kind:kind,databaseAccountOfferType:databaseAccountOfferType,locations:locations[].locationName,publicAccess:publicNetworkAccess}" -o json` | `cosmosdb.json` |
| `Microsoft.Sql/servers` | `az sql server list -g "<RG>" --query "[].{name:name,fullyQualifiedDomainName:fullyQualifiedDomainName,publicAccess:publicNetworkAccess,location:location}" -o json` | `sql-servers.json` |
| `Microsoft.Databricks/workspaces` | `az databricks workspace list -g "<RG>" --query "[].{name:name,sku:sku.name,url:workspaceUrl,publicAccess:parameters.enableNoPublicIp.value,location:location}" -o json 2>$null` | `databricks.json` |
| `Microsoft.Synapse/workspaces` | `az synapse workspace list -g "<RG>" --query "[].{name:name,sqlAdminLogin:sqlAdministratorLogin,publicAccess:publicNetworkAccess,location:location}" -o json 2>$null` | `synapse.json` |
| `Microsoft.DataFactory/factories` | `az datafactory list -g "<RG>" --query "[].{name:name,publicAccess:publicNetworkAccess,location:location}" -o json 2>$null` | `adf.json` |
| `Microsoft.EventHub/namespaces` | `az eventhubs namespace list -g "<RG>" --query "[].{name:name,sku:sku.name,location:location}" -o json` | `eventhub.json` |
| `Microsoft.Cache/redis` | `az redis list -g "<RG>" --query "[].{name:name,sku:sku.name,port:port,sslPort:sslPort,publicAccess:publicNetworkAccess,location:location}" -o json` | `redis.json` |
| `Microsoft.ContainerRegistry/registries` | `az acr list -g "<RG>" --query "[].{name:name,sku:sku.name,adminUserEnabled:adminUserEnabled,publicAccess:publicNetworkAccess,location:location}" -o json` | `acr.json` |
| `Microsoft.MachineLearningServices/workspaces` | `az resource show --ids "<ID>" --query "{name:name,sku:sku,kind:kind,location:location,publicAccess:properties.publicNetworkAccess,hbiWorkspace:properties.hbiWorkspace,managedNetwork:properties.managedNetwork.isolationMode}" -o json` | `mlworkspace.json` |
| `Microsoft.Insights/components` | `az monitor app-insights component show -g "<RG>" --app "<NAME>" --query "{name:name,kind:kind,instrumentationKey:instrumentationKey,workspaceResourceId:workspaceResourceId,location:location}" -o json 2>$null` | `appinsights-<NAME>.json` |
| `Microsoft.OperationalInsights/workspaces` | `az monitor log-analytics workspace show -g "<RG>" -n "<NAME>" --query "{name:name,sku:sku.name,retentionInDays:retentionInDays,location:location}" -o json` | `log-analytics-<NAME>.json` |
| `Microsoft.Network/applicationGateways` | `az network application-gateway list -g "<RG>" --query "[].{name:name,sku:sku,location:location}" -o json` | `appgateway.json` |
| `Microsoft.Cdn/profiles` / `Microsoft.Network/frontDoors` | `az afd profile list -g "<RG>" --query "[].{name:name,sku:sku.name,location:location}" -o json 2>$null` | `frontdoor.json` |
| `Microsoft.Network/azureFirewalls` | `az network firewall list -g "<RG>" --query "[].{name:name,sku:sku,threatIntelMode:threatIntelMode,location:location}" -o json` | `firewall.json` |
| `Microsoft.Network/bastionHosts` | `az network bastion list -g "<RG>" --query "[].{name:name,sku:sku.name,location:location}" -o json` | `bastion.json` |

**Dynamic Query Process:**

1. Read `resources.json`
2. Extract the distinct values of the `type` field
3. Execute **only the commands for matching types** from the mapping table above (skip types not present)
4. If a type not in the mapping table is found → Use generic query: `az resource show --ids "<ID>" --query "{name:name,sku:sku,kind:kind,location:location,properties:properties}" -o json`
5. Execute commands in batches of 2-3 (do not run all at once)

### 2-C: Model Deployment Query (When Cognitive Services Exist)

```powershell
# Query model deployments for each Cognitive Services resource
az cognitiveservices account deployment list --name "<NAME>" -g "<RG>" --query "[].{name:name,model:properties.model.name,version:properties.model.version,sku:sku.name}" -o json | Set-Content "$outDir/<NAME>-deployments.json"
```

### 2-D: NIC + Public IP Query (When VMs Exist)

```powershell
az network nic list -g "<RG>" --query "[].{name:name,subnetId:ipConfigurations[0].subnet.id,privateIp:ipConfigurations[0].privateIPAddress,publicIpId:ipConfigurations[0].publicIPAddress.id}" -o json | Set-Content "$outDir/nics.json"
az network public-ip list -g "<RG>" --query "[].{name:name,ip:ipAddress,sku:sku.name}" -o json | Set-Content "$outDir/public-ips.json"
```

From the VNet:
- `addressSpace.addressPrefixes` → CIDR
- `subnets[].name`, `subnets[].addressPrefix` → Subnet information
- `subnets[].privateEndpointNetworkPolicies` → PE policies

---

## Step 3: Inferring Relationships Between Resources

Automatically infer **relationships (connections)** between scanned resources to construct the connections JSON for the diagram.

### Relationship Inference Rules

**🚨 If there are insufficient connection lines, the diagram becomes meaningless. Infer as many relationships as possible.**

#### Confirmed Inference (Directly verifiable from resource IDs/properties)

| Relationship Type | Inference Method | connection type |
|---|---|---|
| PE → Service | Extract service ID from PE's `privateLinkServiceId` | `private` |
| PE → VNet | Extract VNet from PE's `subnet.id` | (Represented as VNet boundary) |
| Foundry → Project | Parent resource of `accounts/projects` | `api` |
| VM → NIC → Subnet | Infer VNet/Subnet from NIC's `subnet.id` | (VNet boundary) |
| NSG → Subnet | Check connected subnets from NSG's `subnets[].id` | `network` |
| NSG → NIC | Check connected VMs from NSG's `networkInterfaces[].id` | `network` |
| NIC → Public IP | Check PIP from NIC's `publicIPAddress.id` | (Included in details) |
| Databricks → VNet | Workspace's VNet injection configuration | (VNet boundary) |

#### Reasonable Inference (Common patterns between services within the same RG)

| Relationship Type | Inference Condition | connection type |
|---|---|---|
| Foundry → AI Search | Both exist in the same RG → Infer RAG connection | `api` (label: "RAG Search") |
| Foundry → Storage | Both exist in the same RG → Infer data connection | `data` (label: "Data") |
| AI Search → Storage | Both exist in the same RG → Infer indexing connection | `data` (label: "Indexing") |
| Service → Key Vault | Key Vault exists in the same RG → Infer secret management | `security` (label: "Secrets") |
| VM → Foundry/Search | VM + AI services exist in the same RG → Infer API calls | `api` (label: "API") |
| DI → Foundry | Document Intelligence + Foundry exist in the same RG → Infer OCR/extraction connection | `api` (label: "OCR/Extract") |
| ADF → Storage | ADF + Storage exist in the same RG → Infer data pipeline | `data` (label: "Pipeline") |
| ADF → SQL | ADF + SQL exist in the same RG → Infer data source | `data` (label: "Source") |
| Databricks → Storage | Both exist in the same RG → Infer data lake connection | `data` (label: "Data Lake") |

#### User Confirmation After Inference

Show the inferred connection list to the user and request confirmation:
```
> **⏳ Relationships between resources have been inferred** — Please verify if the following are correct.

Inferred connections:
- Foundry → AI Search (RAG Search)
- Foundry → Storage (Data)
- VM → Foundry (API Call)
- Document Intelligence → Foundry (OCR/Extract)

Does this look correct? Let me know if you'd like to add or remove any connections.
```

#### Relationships That Cannot Be Inferred

There may be connections that cannot be inferred using the rules above. The user can freely add additional connections.

### Model Deployment Query (When Foundry Resources Exist)

```powershell
az cognitiveservices account deployment list --name "<FOUNDRY_NAME>" -g "<RG>" --query "[].{name:name,model:properties.model.name,version:properties.model.version,sku:sku.name}" -o json
```

Add each deployment's model name, version, and SKU to the Foundry node's details.

---

## Step 4: services/connections JSON Conversion

Convert scan results into the input format for the built-in diagram engine.

### Resource Type → Diagram type Mapping

| Azure Resource Type | Diagram type |
|---|---|
| `Microsoft.CognitiveServices/accounts` (kind: AIServices) | `ai_foundry` |
| `Microsoft.CognitiveServices/accounts` (kind: OpenAI) | `openai` |
| `Microsoft.CognitiveServices/accounts` (kind: FormRecognizer) | `document_intelligence` |
| `Microsoft.CognitiveServices/accounts` (kind: TextAnalytics, etc.) | `ai_foundry` (default) |
| `Microsoft.CognitiveServices/accounts/projects` | `ai_foundry` |
| `Microsoft.Search/searchServices` | `search` |
| `Microsoft.Storage/storageAccounts` | `storage` |
| `Microsoft.KeyVault/vaults` | `keyvault` |
| `Microsoft.Databricks/workspaces` | `databricks` |
| `Microsoft.Sql/servers` | `sql_server` |
| `Microsoft.Sql/servers/databases` | `sql_database` |
| `Microsoft.DocumentDB/databaseAccounts` | `cosmos_db` |
| `Microsoft.Web/sites` | `app_service` |
| `Microsoft.ContainerService/managedClusters` | `aks` |
| `Microsoft.Web/sites` (kind: functionapp) | `function_app` |
| `Microsoft.Synapse/workspaces` | `synapse` |
| `Microsoft.Fabric/capacities` | `fabric` |
| `Microsoft.DataFactory/factories` | `adf` |
| `Microsoft.Compute/virtualMachines` | `vm` |
| `Microsoft.Network/privateEndpoints` | `pe` |
| `Microsoft.Network/virtualNetworks` | (Represented as VNet boundary — not included in services) |
| `Microsoft.Network/networkSecurityGroups` | `nsg` |
| `Microsoft.Network/bastionHosts` | `bastion` |
| `Microsoft.OperationalInsights/workspaces` | `log_analytics` |
| `Microsoft.Insights/components` | `app_insights` |
| Other | `default` |

### services JSON Construction Rules

```json
{
  "id": "resource name (lowercase, special characters removed)",
  "name": "actual resource name",
  "type": "determined from the mapping table above",
  "sku": "actual SKU (if available)",
  "private": true/false,  // true if a PE is connected
  "details": ["property1", "property2", ...]
}
```

**Information to include in details:**
- Endpoint URL
- SKU/tier details
- kind (AIServices, OpenAI, etc.)
- Model deployment list (Foundry)
- Key properties (isHnsEnabled, semanticSearch, etc.)
- Region

### VNet Information → `--vnet-info` Parameter

If a VNet is found, display it in the boundary label via `--vnet-info`:
```
--vnet-info "10.0.0.0/16 | pe-subnet: 10.0.1.0/24 | <region>"
```

### PE Node Generation

If PEs are found, add each PE as a separate node and connect it to the corresponding service with a `private` type:
```json
{"id": "pe_<serviceId>", "name": "PE: <serviceName>", "type": "pe", "details": ["groupId: <groupId>", "<status>"]}
```

---

## Step 5: Diagram Generation + Presentation to User

Diagram filename: `<project-name>/00_arch_current.html`

Use the scanned RG name as the default project name:
```
ask_user({
  question: "Please choose a project name. (This will be the folder name for scan results)",
  choices: ["<RG-name>", "azure-analysis"]
})
```

After generating the diagram, report:
```
## Current Azure Architecture

[Interactive Diagram — 00_arch_current.html]

Scanned Resources (N total):
[Summary table by resource type]

What would you like to change here?
- 🔧 Performance improvement ("it's slow", "increase throughput")
- 💰 Cost optimization ("reduce costs", "make it cheaper")
- 🔒 Security hardening ("add PE", "block public access")
- 🌐 Network changes ("separate VNet", "add Bastion")
- ➕ Add/remove resources ("add a VM", "delete this")
- 📊 Monitoring ("set up logs", "add alerts")
- 🤔 Diagnostics ("is this architecture OK?", "what's wrong?")
- Or just take the diagram and stop here
```

---

## Step 6: Modification Conversation → Transition to Phase 1

When the user requests modifications, transition to Phase 1 (phase1-advisor.md).
This is the **Path B entry point**, using the existing scan results as the baseline.

### Natural Language Modification Request Handling — Clarifying Question Patterns

Ask clarifying questions to make the user's vague requests more specific:

**🔧 Performance**

| User Request | Clarifying Question Example |
|---|---|
| "It's slow" / "Response takes too long" | "Which service is slow? Should we upgrade the SKU or change the region?" |
| "I want to increase throughput" | "Which service's throughput should we increase? Scale out? Increase DTU/RU?" |
| "AI Search indexing is slow" | "Should we add partitions? Upgrade the SKU to S2?" |

**💰 Cost**

| User Request | Clarifying Question Example |
|---|---|
| "I want to reduce costs" | "Which service's cost should we reduce? SKU downgrade? Clean up unused resources?" |
| "How much does this cost?" | Look up pricing info from MS Docs and provide estimated cost based on current SKUs |
| "It's a dev environment, so make it cheap" | "Should we switch to Free/Basic tiers? Which services?" |

**🔒 Security**

| User Request | Clarifying Question Example |
|---|---|
| "Harden the security" | "Should we add PEs to services that don't have them? Check RBAC? Disable publicNetworkAccess?" |
| "Block public access" | "Should we apply PE + publicNetworkAccess: Disabled to all services?" |
| "Manage the keys" | "Should we add Key Vault and connect it with Managed Identity?" |

**🌐 Network**

| User Request | Clarifying Question Example |
|---|---|
| "Add PE" | "To which service? Should we add them to all services at once?" |
| "Separate the VNet" | "Which subnets should we separate? Should we also add NSGs?" |
| "Add Bastion" | "Adding Azure Bastion for VM access. Please specify the subnet CIDR." |

**➕ Add/Remove Resources**

| User Request | Clarifying Question Example |
|---|---|
| "Add a VM" | "How many? What SKU? Same VNet? What OS?" |
| "Add Fabric" | "What SKU? What's the admin email?" |
| "Delete this" | "Are you sure you want to remove [resource name]? Connected PEs will also be removed." |

**📊 Monitoring/Operations**

| User Request | Clarifying Question Example |
|---|---|
| "I want to see logs" | "Should we add a Log Analytics Workspace and connect Diagnostic Settings?" |
| "Set up alerts" | "For which metrics? CPU? Error rate? Response time?" |
| "Attach Application Insights" | "To which service? App Service? Function App?" |

**🔄 Migration/Changes**

| User Request | Clarifying Question Example |
|---|---|
| "Change the region" | "To which region? I'll verify that all services are available in that region." |
| "Switch SQL to Cosmos" | "What Cosmos DB API type? (SQL/MongoDB/Cassandra) I can also provide a data migration guide." |
| "Switch Foundry to Hub" | "Hub is suitable only when ML training/open-source models are needed. Let me verify the use case." |

**🤔 Diagnostics/Questions**

| User Request | Clarifying Question Example |
|---|---|
| "What's wrong?" | Analyze current configuration (publicNetworkAccess open, PE not connected, inappropriate SKU, etc.) and suggest improvements |
| "Is this architecture OK?" | Review against the Well-Architected Framework (security, reliability, performance, cost, operations) |
| "Is the PE connected properly?" | Check connection status with `az network private-endpoint show` and report |
| "Just give me the diagram" | Do not transition to Phase 1; provide the 00_arch_current.html path and finish |

Once modifications are finalized:
1. Apply Phase 1's Delta Confirmation Rule
2. Fact-check (cross-verify with MS Docs)
3. Generate updated diagram (01_arch_diagram_draft.html)
4. User confirmation → Proceed to Phases 2–4

---

## Scan Performance Optimization

- If there are 50+ resources, warn the user: "There are many resources, so the scan may take some time."
- Run `az resource list` first to determine the resource count, then proceed with detailed queries
- Query key services first (Foundry, Search, Storage, KeyVault, VNet, PE), then collect only basic information for the rest via `az resource show`
- Keep the user informed of progress:
  > **⏳ Scanning resources** — M of N resources completed

---

## Handling Unsupported Resources

For resource types not in the diagram type mapping:
- Display with `default` type (question mark icon)
- Include the resource name and type in details
- Show to the user, but do not attempt relationship inference
