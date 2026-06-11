# Phase 1: Architecture Advisor

This file contains the detailed instructions for Phase 1. When entering Phase 1 from SKILL.md, read and follow this file.
Used in both Path A (new design) and Path B (modification after Phase 0 scan).

---

## When Entering from Path B (After Existing Resource Analysis)

The current architecture diagram (00_arch_current.html) scanned in Phase 0 already exists.
In this case, skip the project name/service list confirmation in 1-1 and enter the modification conversation directly:

1. "What would you like to change here?" — User's natural language request
2. Apply Delta Confirmation Rule — Confirm undecided required fields for the changes
3. Fact check — Cross-verify with MS Docs
4. Generate updated diagram (01_arch_diagram_draft.html)
5. Proceed to Phase 2 after confirmation

---

**Goal of this Phase**: Accurately identify what the user wants and finalize the architecture together.

### 1-1. Diagram Preparation — Gathering Required Information

Before drawing the diagram, ask the user questions until all items below are confirmed.
**Generate the diagram only after all items are confirmed.**

**First, confirm the project name:**

Provide a default value as a choice via `ask_user`. If the user just presses Enter, the default is applied; they can also type a custom name.
The default is inferred from the user's request (e.g., RAG chatbot → `rag-chatbot`, data platform → `data-platform`).

```
ask_user({
  question: "Please choose a project name. It will be used for the Bicep folder name, diagram path, and deployment name.",
  choices: ["<inferred-default>", "azure-project"]
})
```
The project name is used for the Bicep output folder name, diagram save path, deployment name, etc.

**🔹 Parallel Preload Along with Project Name Question (Required):**

When asking the project name via `ask_user`, there is idle time while waiting for the user to respond.
Utilize this time to **preload information needed for subsequent questions and Bicep generation in parallel**.

**Tools to call simultaneously with ask_user:**

```
// Call ask_user + the tools below simultaneously in a single response
[1] ask_user — Project name question

[2] view — Load reference files (pre-acquire Stable information)
    - references/service-gotchas.md
    - references/ai-data.md
    - references/azure-dynamic-sources.md
    - references/architecture-guidance-sources.md

[3] web_fetch — Pre-fetch architecture guidance (when workload type is identified)
    - Up to 2 targeted fetches based on decision rules in architecture-guidance-sources.md

[4] web_fetch — Fetch MS Docs for services mentioned by the user (pre-acquire Dynamic information)
    - e.g., Foundry → API version, model availability page
    - e.g., AI Search → SKU list page
    - Use URL patterns from azure-dynamic-sources.md
```

**Benefits**: While the user types the project name, all information is loaded,
so SKU/region questions can be presented with accurate choices immediately after the project name is confirmed.
Wait time is significantly reduced compared to sequential execution.

**Notes:**
- Preload targets are only information independent of the project name (nothing depends on the name)
- web_fetch is performed only for services mentioned in the user's initial request (no guessing)
- Azure CLI check (`az account show`) is NOT done at this point — preload at architecture finalization

**🔹 Utilizing Architecture Guidance (Adjusting Question Depth):**

Extract **design decision points** from the architecture guidance documents fetched during preload,
and naturally incorporate them into subsequent user questions.

**Purpose**: Not just spec questions like SKU/region,
but reflecting **design decision points** recommended by official architecture guidance into the questions.

**Example — When "RAG chatbot" is requested:**
- Fetch Baseline Foundry Chat Architecture (A6)
- Extract recommended design decision points from the document:
  → Network isolation level (full private vs hybrid?)
  → Authentication method (managed identity vs API key?)
  → Data ingestion strategy (push vs pull indexing?)
  → Monitoring scope (Application Insights needed?)
- Naturally include these points in user questions

**Notes:**
- What is extracted from architecture guidance is **"points to ask about"**, not "answers"
- Deployment specs like SKU/API version/region are still determined only via `azure-dynamic-sources.md`
- Fetch budget: maximum 2 documents. No full traversal

**Required confirmation items:**
- [ ] Project name (default: `azure-project`)
- [ ] Service list (which Azure services to use)
- [ ] SKU/tier for each service
- [ ] Networking method (Private Endpoint usage)
- [ ] Deployment location (region)

**Questioning principles:**
- Do not ask again for information the user has already mentioned
- Do not ask about detailed implementation specifics not directly represented in the diagram (indexing method, query volume, etc.)
- Do not ask too many questions at once; ask only key undecided items concisely
- For items with obvious defaults (e.g., PE enabled), assume and just confirm. However, location MUST always be confirmed with the user
- **When asking about SKUs, models, or service options, show ALL available choices verified from MS Docs, and provide the MS Docs URL as well.** This allows the user to reference and make their own judgment. Do not show only partial options or arbitrarily filter them out

**🔹 VM/Resource SKU Selection — Region Availability Pre-check Required:**

**Before** asking the user about VM or other resource SKUs, you MUST first query which SKUs are actually available in the target region.
If a SKU is blocked due to capacity restrictions in a specific region, the deployment will fail.

**VM SKU verification method:**
```powershell
# Query only VM SKUs available without restrictions in the target region
az vm list-skus --location "<LOCATION>" --size Standard_D2 --resource-type virtualMachines `
  --query "[?restrictions==``[]``].name" -o tsv
```

**Principles:**
- Do not include unverified SKUs in the choices
- Do not recommend "commonly used SKUs" from memory — MUST verify via az cli or MS Docs
- Include only verified SKUs in `ask_user` choices
- Even for user-provided SKUs, verify availability before proceeding

**This principle applies equally not just to VMs, but to ALL resources subject to capacity restrictions (Fabric Capacity, etc.).**

**🔹 Service Option Exploration Principle — "Listing from Memory" is Prohibited:**

When the user asks about a service category ("What Spark options are there?", "What are the message queue options?"), or when you need to explore services for a specific capability:

**NEVER do this:**
- Directly fetch URLs for only 2-3 services from your memory and list them
- State definitively "In Azure, X has A and B"

**MUST do this:**
1. **Explore the full category via web_search** — Search at the category level like `"Azure managed Spark options site:learn.microsoft.com"` to first discover what services exist
2. **Cross-check with v1 scope** — Regardless of search results, check whether v1 scope services (Foundry, Fabric, AI Search, ADLS Gen2, etc.) fall under the relevant category. e.g.: "Spark" → Microsoft Fabric's Data Engineering workload also provides Spark
3. **Targeted fetch of discovered options** — Fetch MS Docs for the services found via search to collect accurate comparison information
4. **Present all options to the user** — Present all discovered options in a comprehensive comparison without omitting any

**Example — When asked "What Spark instances are available?":**
```
Wrong approach: Fetch only Databricks URL + Synapse URL → Compare only 2
Correct approach: web_search("Azure managed Spark options") → Discover Databricks, Synapse, Fabric Spark, HDInsight
            → v1 scope check: Fabric is v1 scope and provides Spark → MUST include
            → Targeted fetch of each service's MS Docs → Present full comparison table
```

This principle applies not only to service category exploration, but to all situations where the user requests "alternatives", "other options", "comparison", etc.

**🔹 ask_user Tool — Mandatory Usage:**

For questions with choices, you MUST use the `ask_user` tool. It allows users to select with arrow keys for convenience, and they can also type a custom input.

**ask_user usage rules:**
- Questions with 2 or more choices **MUST** use ask_user (do not list them as text)
- **`choices` MUST be passed as a string array (`["A", "B"]`)** — passing as a string (`"A, B"`) will cause an error
- If there is a recommended option, place it first and append `(Recommended)` at the end
- Include reference information in choices — e.g., `"Standard S1 - Recommended for production. Ref: https://..."`
- **Only 1 question per call** — if multiple items need to be asked, call ask_user sequentially for each
- Choices are limited to a maximum of 4. If there are 5 or more, include only the 3-4 most common ones (users can also type a custom input)
- If multiple selections are needed, split them into separate questions

**Items requiring ask_user:**
- Deployment location (region) selection
- SKU/tier selection
- Model selection (chat model, embedding model, etc.)
- Networking method selection
- Subscription selection (Phase 1 Step 2)
- Resource group selection (Phase 1 Step 3)
- Any other question requiring a user choice

**Usage examples:**
```
// Project name is free-form input so ask_user is not used (ask as text)
// SKU, region, etc. with defined choices use ask_user:

// 1. SKU question
ask_user({
  question: "Please select the SKU for AI Search. Ref: https://learn.microsoft.com/en-us/azure/search/search-sku-tier",
  choices: [
    "Standard S1 - Recommended for production (Recommended)",
    "Basic - For dev/test, up to 15 indexes",
    "Standard S2 - High-traffic production",
    "Free - Free trial, 50MB storage"
  ]
})

// 2. Region question (separate call — only 1 question per call)
ask_user({
  question: "Please select the Azure region for deployment. Ref: https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models",
  choices: [
    "Korea Central - Korea region, supports most services (Recommended)",
    "East US - US East, supports all AI models",
    "Japan East - Japan East, close to Korea"
  ]
})
```

> **Note**: The SKU and region values in the examples above are for illustration only. When actually asking, dynamically compose choices based on the latest information by querying MS Docs via web_fetch. Do not hardcode.

**Example — When user input is insufficient:**
```
User: "I want to build a RAG chatbot. Using a GPT model in Foundry and AI Search."

→ Confirmed: Microsoft Foundry, Azure AI Search
→ Still undecided: Project name, specific model name, embedding model, networking (PE?), SKU, deployment location

The agent first confirms the project name via ask_user (default: rag-chatbot).
Then provides choices for each undecided item via the ask_user tool.
Include MS Docs URLs in the choices so the user can reference them directly.
```

**🚨🚨🚨 [HARD GATE] Spec Collection Complete → Diagram Generation Required 🚨🚨🚨**

**Immediately after all confirmed items are filled in, you MUST perform the following steps IN ORDER. Skipping any step means Phase 1 is incomplete.**

1. Compose **services JSON + connections JSON** based on the confirmed service list
2. Use the built-in diagram engine to generate **`<project-name>/01_arch_diagram_draft.html`**
3. Automatically open it in the browser via `Start-Process`
4. Show the diagram to the user in the **report format** below — this MUST include a **detailed configuration table**
5. Ask the user: **"Would you like to change or add anything?"**
6. If the user has no changes → proceed to Phase 2 transition (ask_user with next step guidance)

**NEVER do this:**
- ❌ Not generating the diagram and asking "The architecture is confirmed. Shall we proceed to the next step?"
- ❌ Deferring diagram generation to Phase 2 or later
- ❌ Saying "I'll create the diagram later"
- ❌ Declaring "architecture confirmed" based solely on spec collection completion
- ❌ Generating the diagram but NOT showing the configuration table
- ❌ Skipping the "anything to change?" question and jumping straight to Phase 2

**Validation condition**: Phase 2 entry is NOT allowed if the `01_arch_diagram_draft.html` file has not been generated.

**Report format after diagram completion (ALL sections are MANDATORY):**
```
## Architecture Diagram

[Interactive diagram link — auto-opened in browser]

### Confirmed Configuration

| Service | Type | SKU/Tier | Details |
|---------|------|----------|---------|
| [Service name] | [Azure resource type] | [SKU] | [Key config: model, capacity, etc.] |
| ... | ... | ... | ... |

**Networking**: [VNet + Private Endpoint / Public / etc.]
**Location**: [confirmed region]
```

**After showing the report, immediately use `ask_user` with choices:**
```
ask_user({
  question: "The architecture diagram and configuration are ready. What would you like to do?",
  choices: [
    "Looks good — proceed to Bicep code generation (Recommended)",
    "I want to modify the architecture",
    "Add more services"
  ]
})
```

- If "proceed" → move to Phase 2 transition (collect subscription/RG info)
- If "modify" or "add" → apply changes, regenerate diagram, show report again

**🚨 The configuration table is NOT optional.** The user needs to visually verify what was confirmed before proceeding. Without the table, the user cannot validate the architecture.

### 1-2. Interactive HTML Diagram Generation

Use the built-in **diagram engine** (Python scripts included in the skill) to create an interactive HTML diagram.
No `pip install` is needed as the scripts are directly available in the `scripts/` folder, requiring no network connection or package installation.
605+ official Azure icons are built in.

**Diagram file naming convention:**

All diagrams are generated inside the Bicep project folder (`<project-name>/`).
They are systematically managed with numbered prefixes per stage, and previous stage files are never overwritten.

| Stage | File Name | When Generated |
|-------|-----------|----------------|
| Phase 1 design draft | `01_arch_diagram_draft.html` | When architecture design is confirmed |
| Phase 4 What-if preview | `02_arch_diagram_preview.html` | After What-if validation |
| Phase 4 deployment result | `03_arch_diagram_result.html` | After actual deployment completes |

**Built-in module path discovery + Python path discovery:**

**🚨 The Python path + built-in module path are verified once during Phase 1 preload, and reused for all subsequent diagram generations. Do NOT re-discover every time.**

```powershell
# ─── Step 1: Python Path Discovery ───
# ⚠️ Get-Command python may pick up the Windows Store alias, so filesystem discovery is done first
$PythonCmd = $null

# Priority 1: Direct discovery of actual installation path (most reliable)
$PythonExe = Get-ChildItem -Path "$env:LOCALAPPDATA\Programs\Python" -Filter "python.exe" -Recurse -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notlike '*WindowsApps*' } |
  Select-Object -First 1 -ExpandProperty FullName
if ($PythonExe) { $PythonCmd = $PythonExe }

# Priority 2: Program Files discovery
if (-not $PythonCmd) {
  $PythonExe = Get-ChildItem -Path "$env:ProgramFiles\Python*", "$env:ProgramFiles(x86)\Python*" -Filter "python.exe" -Recurse -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName
  if ($PythonExe) { $PythonCmd = $PythonExe }
}

# Priority 3: Find in PATH (only if not a Windows Store alias)
if (-not $PythonCmd) {
  foreach ($cmd in @('python3', 'py')) {
    $found = Get-Command $cmd -ErrorAction SilentlyContinue
    if ($found -and $found.Source -notlike '*WindowsApps*') { $PythonCmd = $cmd; break }
  }
}

if (-not $PythonCmd) {
  Write-Host ""
  Write-Host "Python is not installed or not found in PATH." -ForegroundColor Red
  Write-Host ""
  Write-Host "Please install using one of the following methods:" -ForegroundColor Yellow
  Write-Host "  1. winget install Python.Python.3.12"
  Write-Host "  2. Download from https://www.python.org/downloads/"
  Write-Host "  3. Search for 'Python 3.12' in the Microsoft Store and install"
  Write-Host ""
  Write-Host "After installation, restart your terminal and try again."
  return
}

# ─── Step 2: Built-in Script Path Discovery (no pip install needed) ───
# Priority 1: Project local skill folder
$ScriptsDir = Get-ChildItem -Path ".github\skills\azure-architecture-autopilot" -Filter "cli.py" -Recurse -ErrorAction SilentlyContinue |
  Where-Object { $_.Directory.Name -eq 'scripts' } |
  Select-Object -First 1 -ExpandProperty DirectoryName
# Priority 2: Global skill folder
if (-not $ScriptsDir) {
  $ScriptsDir = Get-ChildItem -Path "$env:USERPROFILE\.copilot\skills\azure-architecture-autopilot" -Filter "cli.py" -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.Directory.Name -eq 'scripts' } |
    Select-Object -First 1 -ExpandProperty DirectoryName
}

# ─── Step 3: Diagram Generation (CLI method — direct script execution) ───
$OutputFile = "<project-name>\01_arch_diagram_draft.html"

& $PythonCmd "$ScriptsDir\cli.py" `
  --services '<services_JSON>' `
  --connections '<connections_JSON>' `
  --title "Architecture Title" `
  --vnet-info "10.0.0.0/16 | pe-subnet: 10.0.1.0/24" `
  --output $OutputFile

# Automatically open in browser after generation
Start-Process $OutputFile
```

**Python API method is also available (alternative):**

When JSON is very large, you can directly call the Python API to avoid CLI argument length limitations.
Add the scripts folder to `sys.path` to import the built-in module:

```python
import sys, os
# Add scripts folder to Python path (use built-in module without pip install)
scripts_dir = r"<absolute path to scripts folder>"  # $ScriptsDir value found in Step 2
sys.path.insert(0, scripts_dir)

from generator import generate_diagram

services = [...]   # services JSON
connections = [...] # connections JSON

html = generate_diagram(
    services=services,
    connections=connections,
    title="Architecture Title",
    vnet_info="10.0.0.0/16 | pe-subnet: 10.0.1.0/24",
    hierarchy=None  # Only used for multiple subscriptions/RGs
)

with open("<project-name>/01_arch_diagram_draft.html", "w", encoding="utf-8") as f:
    f.write(html)
```

**🔹 CLI vs Python API Selection Criteria:**

| Scenario | Method | Reason |
|----------|--------|--------|
| 10 or fewer services | CLI (`python scripts/cli.py`) | Simple and fast |
| More than 10 services or using hierarchy | Python API (sys.path addition) | Avoids CLI argument length limits |
| Multi-subscription/RG diagrams | Python API + `hierarchy` parameter | Hierarchical structure representation |

**Full list of supported service types:**

Available in the skill's built-in reference files under `references/`.
Supported service type values are listed below in the services JSON format section.

> **Diagram generation order**: (1) Verify Python path → (2) Verify built-in module path → (3) Compose services/connections JSON → (4) Execute. If Python is not installed, guide the user to install it before composing JSON. This prevents the waste of building JSON only to fail because Python is missing.

> **🚨 Automatic Diagram Open (No Exceptions)**: When an HTML file is generated with the built-in diagram engine, it **MUST always** be opened in the browser regardless of the situation. Without exception, whenever a diagram is (re)generated, execute the `Start-Process` command. Diagram generation and browser opening are always executed together in a single PowerShell command block.
>
> **When this applies (not just these, but ALL times an HTML diagram is generated):**
> - Phase 1 design draft (`01_arch_diagram_draft.html`)
> - Diagram regeneration after Delta Confirmation
> - Phase 4 What-if preview (`02_arch_diagram_preview.html`)
> - Phase 4 deployment result (`03_arch_diagram_result.html`)
> - Architecture changes after deployment (`04_arch_diagram_update_draft.html`)
> - Any other case where a diagram is regenerated for any reason

**services JSON format:**

Dynamically composed based on the user's confirmed service list. Below is the JSON structure description.

```json
[
  {"id": "uniqueID", "name": "Service Display Name", "type": "iconType", "sku": "SKU", "private": true/false,
   "details": ["Detail line 1", "Detail line 2"]}
]
```

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `id` | Yes | string | Unique identifier (kebab-case) |
| `name` | Yes | string | Display name shown on diagram |
| `type` | Yes | string | Service type (select from list below) |
| `sku` | | string | SKU/tier information |
| `private` | | boolean | Private Endpoint connected (default: false) |
| `details` | | string[] | Additional info shown in sidebar |
| `subscription` | | string | Subscription name (required when using hierarchy) |
| `resourceGroup` | | string | Resource group name (required when using hierarchy) |

**Service Type — Canonical Reference:**

> ⚠️ **CRITICAL**: Always use the **canonical type** from the table below. Do NOT use Azure ARM resource names (e.g., `private_endpoints`, `storage_accounts`, `data_factories`). The generator normalizes common variants, but using canonical types ensures correct icon rendering, PE detection, and color coding.

| Category | Canonical Type | Azure Resource | Icon |
|----------|---------------|----------------|------|
| **AI** | `ai_foundry` | Microsoft.CognitiveServices/accounts (kind: AIServices) | AI Foundry |
| | `openai` | Microsoft.CognitiveServices/accounts (kind: OpenAI) | Azure OpenAI |
| | `ai_hub` | Foundry Project | AI Studio |
| | `search` | Microsoft.Search/searchServices | Cognitive Search |
| | `document_intelligence` | Microsoft.CognitiveServices/accounts (kind: FormRecognizer) | Form Recognizer |
| | `aml` | Microsoft.MachineLearningServices/workspaces | Machine Learning |
| **Data** | `fabric` | Microsoft.Fabric/capacities | Microsoft Fabric |
| | `adf` | Microsoft.DataFactory/factories | Data Factory |
| | `storage` | Microsoft.Storage/storageAccounts | Storage Account |
| | `adls` | ADLS Gen2 (Storage with HNS) | Data Lake |
| | `cosmos_db` | Microsoft.DocumentDB/databaseAccounts | Cosmos DB |
| | `sql_database` | Microsoft.Sql/servers/databases | SQL Database |
| | `sql_server` | Microsoft.Sql/servers | SQL Server |
| | `databricks` | Microsoft.Databricks/workspaces | Databricks |
| | `synapse` | Microsoft.Synapse/workspaces | Synapse Analytics |
| | `redis` | Microsoft.Cache/redis | Redis Cache |
| | `stream_analytics` | Microsoft.StreamAnalytics/streamingjobs | Stream Analytics |
| | `postgresql` | Microsoft.DBforPostgreSQL/flexibleServers | PostgreSQL |
| | `mysql` | Microsoft.DBforMySQL/flexibleServers | MySQL |
| **Security** | `keyvault` | Microsoft.KeyVault/vaults | Key Vault |
| | `sentinel` | Microsoft.SecurityInsights | Sentinel |
| **Compute** | `appservice` | Microsoft.Web/sites | App Service |
| | `function_app` | Microsoft.Web/sites (kind: functionapp) | Function App |
| | `vm` | Microsoft.Compute/virtualMachines | Virtual Machine |
| | `aks` | Microsoft.ContainerService/managedClusters | AKS |
| | `acr` | Microsoft.ContainerRegistry/registries | Container Registry |
| | `container_apps` | Microsoft.App/containerApps | Container Apps |
| | `static_web_app` | Microsoft.Web/staticSites | Static Web App |
| | `spring_apps` | Microsoft.AppPlatform/Spring | Spring Apps |
| **Network** | `pe` | Microsoft.Network/privateEndpoints | Private Endpoint |
| | `vnet` | Microsoft.Network/virtualNetworks | VNet |
| | `nsg` | Microsoft.Network/networkSecurityGroups | NSG |
| | `firewall` | Microsoft.Network/azureFirewalls | Firewall |
| | `bastion` | Microsoft.Network/bastionHosts | Bastion |
| | `app_gateway` | Microsoft.Network/applicationGateways | App Gateway |
| | `front_door` | Microsoft.Cdn/profiles (Front Door) | Front Door |
| | `vpn` | Microsoft.Network/virtualNetworkGateways | VPN Gateway |
| | `load_balancer` | Microsoft.Network/loadBalancers | Load Balancer |
| | `nat_gateway` | Microsoft.Network/natGateways | NAT Gateway |
| | `cdn` | Microsoft.Cdn/profiles | CDN |
| **IoT** | `iot_hub` | Microsoft.Devices/IotHubs | IoT Hub |
| | `digital_twins` | Microsoft.DigitalTwins/digitalTwinsInstances | Digital Twins |
| **Integration** | `event_hub` | Microsoft.EventHub/namespaces | Event Hub |
| | `event_grid` | Microsoft.EventGrid/topics | Event Grid |
| | `apim` | Microsoft.ApiManagement/service | API Management |
| | `service_bus` | Microsoft.ServiceBus/namespaces | Service Bus |
| | `logic_apps` | Microsoft.Logic/workflows | Logic Apps |
| **Monitoring** | `log_analytics` | Microsoft.OperationalInsights/workspaces | Log Analytics |
| | `appinsights` | Microsoft.Insights/components | App Insights |
| | `monitor` | Azure Monitor | Monitor |
| **Other** | `jumpbox`, `user`, `devops` | — | Special |

**When Using Private Endpoints — PE Node Addition Required:**

If Private Endpoints are included in the architecture, a PE node MUST be added to the services JSON for each service, and connections must also include the PE links for them to appear in the diagram.

```json
// Add PE node corresponding to each service
{"id": "pe_serviceID", "name": "PE: ServiceName", "type": "pe", "details": ["groupId: correspondingGroupID"]}

// Add service → PE connection in connections
{"from": "serviceID", "to": "pe_serviceID", "label": "", "type": "private"}
```

**🚨🚨🚨 PE Connections and Business Logic Connections Are Separate — BOTH MUST Be Included 🚨🚨🚨**

PE connections (`"type": "private"`) represent network isolation. But this alone does NOT show the actual **data flow/API calls** between services in the diagram.

**MUST include both types of connections:**

1. **Business logic connections** — Actual data flow between services (api, data, security types)
2. **PE connections** — Network isolation between service ↔ PE (private type)

```json
// ✅ Correct example — Function App → Foundry
// 1) Business logic: Function App calls Foundry for chat/embedding
{"from": "func_app", "to": "foundry", "label": "RAG Chat + Embedding", "type": "api"}
// 2) PE connection: Foundry's Private Endpoint
{"from": "foundry", "to": "pe_foundry", "label": "", "type": "private"}

// ❌ Wrong example — Only PE connection, no business logic connection
{"from": "foundry", "to": "pe_foundry", "label": "", "type": "private"}
// → No connection line between Function App and Foundry in the diagram, so the architecture flow is not visible
```

**NEVER do this:**
- Create only PE connections and omit business logic connections
- Connect `from`/`to` of business logic connections to PE nodes (use the **actual service ID**, not the PE)
- Assume "the PE is there so the connection line will show up"

The PE groupId differs by service. Refer to the PE groupId & DNS Zone mapping table in `references/service-gotchas.md`.

> **Service naming convention**: MUST use the latest official Azure names. If uncertain about the name, verify with MS Docs.
> For resource types and key properties per service, refer to `references/ai-data.md`.

**connections JSON format:**
```json
[
  {"from": "serviceA_ID", "to": "serviceB_ID", "label": "Connection description", "type": "api|data|security|private"}
]
```

**Connection Types:**

| type | Color | Style | Use For |
|------|-------|-------|---------|
| `api` | Blue | Solid | API calls, queries |
| `data` | Green | Solid | Data flow, indexing |
| `security` | Orange | Dashed | Secrets, auth |
| `private` | Purple | Dashed | Private Endpoint connections |
| `network` | Gray | Solid | Network routing |
| `default` | Gray | Solid | Other |

**🔹 Diagram Multilingual Principle:**
- The `name`, `details` in services and `label` in connections are written in **the user's language**
- Example: `"label": "RAG Search"`, `"label": "Data Ingestion"`
- Official Azure service names (Microsoft Foundry, AI Search, etc.) are always in English regardless of language

**🔹 VNet Node — Do NOT add to services JSON:**
- VNet is automatically displayed as a **purple dashed boundary** in the diagram (when PEs are present)
- Adding a separate VNet node to services JSON causes confusion by duplicating with the boundary line
- VNet information (CIDR, subnets) is sufficiently conveyed through the sidebar VNet boundary label

Provide the full path of the generated HTML file to the user.

### 1-3. Finalizing Architecture Through Conversation

The architecture is finalized incrementally through conversation with the user. When the user requests changes, do NOT ask everything from scratch; instead, **reflect only the requested changes based on the current confirmed state** and regenerate the diagram.

**⚠️ Delta Confirmation Rule — Required Verification on Service Addition/Change:**

Service addition/change is not a "simple update" — it is an **event that reopens undecided required fields for that service**.

**Process:**
1. Diff the current confirmed state + new request
2. Identify the required fields for newly added services (refer to `domain-packs` or MS Docs)
3. Fetch the region availability/options for the service from MS Docs
4. If any required fields are undecided, **ask the user via ask_user first**
5. **Regenerate the diagram only after confirmation is complete**

**NEVER do this:**
- Finalize diagram update while required fields remain undecided
- Arbitrarily add sub-components/workloads the user did not mention (e.g., automatically adding OneLake and data pipeline to a Fabric request)
- Vaguely assume SKU/model like "F SKU" without confirmation

**Do not re-ask settings for already confirmed services.** Only confirm undecided items for newly added/changed services.

---

**🚨🚨🚨 [Top Priority Principle] Immediate Fact Check During Design Phase 🚨🚨🚨**

**The purpose of Phase 1 is to confirm a "feasible architecture".**
**No matter what the user requests, before reflecting it in the diagram, you MUST fact-check whether it is actually possible by directly querying MS Docs via web_fetch.**

**Design Direction vs Deployment Specs — Separate Information Paths:**

| Decision Type | Reference Path | Examples |
|--------------|----------------|----------|
| **Design direction** (architecture patterns, best practices, service combinations) | `references/architecture-guidance-sources.md` → targeted fetch | "What's the recommended RAG structure?", "Enterprise baseline?" |
| **Deployment specs** (API version, SKU, region, model, PE mapping) | `references/azure-dynamic-sources.md` → MS Docs fetch | "What's the API version?", "Is this model available in Korea Central?" |

- **Design direction comes from architecture guidance, actual deployment values from dynamic sources.** Do not mix these two paths.
- Do NOT use Architecture guidance document content to determine SKU/API version/region.
- **Do NOT crawl through all Architecture Center sub-documents for every request.** Perform trigger-based targeted fetch of at most 2 relevant documents.
- For trigger/fetch budget/decision rules by question type, refer to `architecture-guidance-sources.md`.

**This principle applies to ALL requests without exception:**
- Model addition/change → Verify in MS Docs whether the model exists and can be deployed in the target region
- Service addition/change → Verify in MS Docs whether the service is available in the target region
- SKU change → Verify in MS Docs whether the SKU is valid and supports the desired features
- Feature request → Verify in MS Docs whether the feature is actually supported
- Service combination → Verify in MS Docs whether inter-service integration is possible
- **Any other request** → Fact-check with MS Docs

**MS Docs verification results:**
- **Possible** → Reflect in diagram
- **Not possible** → Immediately explain the reason to the user and suggest available alternatives

**Fact Check Process — Cross-Verification Required:**

Do not simply query once and move on for user requests.
**Cross-verification using other MS Docs pages/sources MUST always be performed.**

> **GHCP Environment Constraint**: Sub-agents (explore/task/general-purpose) do NOT have `web_fetch`/`web_search` tools.
> Therefore, verification requiring MS Docs queries MUST be performed **directly by the main agent**.

```
[1st Verification] Main agent directly queries MS Docs via web_fetch (primary page)
    ↓
[2nd Verification] Main agent additionally fetches other/related MS Docs pages via web_fetch for cross-checking
    - e.g., Model availability → 1st: models page / 2nd: regional availability or pricing page
    - e.g., API version → 1st: Bicep reference page / 2nd: REST API reference page
    - Compare 1st and 2nd results and flag any discrepancies
    ↓
[Consolidate Results] If both verifications match, respond to the user
    - On discrepancy: Resolve with additional queries, or honestly inform the user about the uncertainty
```

**Fact Check Quality Standards — Be Thorough, Not Cursory:**
- When a MS Docs page is fetched, **check ALL relevant sections, tabs, and conditions without omission**
- When checking model availability: Check **ALL deployment types** including Global Standard, Standard, Provisioned, Data Zone, etc. Do NOT conclude "not supported" based on only one deployment type
- When checking SKUs: **Fully** verify the feature list supported by that SKU
- If the page is large, fetch relevant sections **multiple times** to ensure accuracy
- If uncertain, query additional pages. **NEVER answer based on guesswork**

**NEVER do this:**
- Add to the diagram without verification
- Defer verification with "I'll check during Bicep generation" or "It will be validated during deployment"
- Rely only on your memory and answer "it should work" — **MUST directly query MS Docs**
- Fetch MS Docs but rush to conclusions after only partially reading
- Finalize based on a single query — **MUST cross-verify with another source**

**🚫 Sub-Agent Usage Rules:**

**Sub-agents in GHCP = `task` tool:**
- `agent_type: "explore"` — Read-only tasks like codebase exploration, file search (**web_fetch/web_search NOT available**)
- `agent_type: "task"` — Command execution like az cli, bicep build
- `agent_type: "general-purpose"` — High-level tasks like complex Bicep generation

> **⚠️ Sub-agent tool constraint**: ALL sub-agents (explore/task/general-purpose) CANNOT use `web_fetch` or `web_search`.
> Fact checks requiring MS Docs queries, API version verification, model availability checks, etc. MUST be performed **directly by the main agent**.

**Foreground vs Background Decision Criteria:**
- **If results are needed before proceeding to the next step → `mode: "sync"` (default)**
  - e.g., Query SKU list then provide choices to user, verify model availability then reflect in diagram
  - Running in background here would leave the user idle waiting for results
- **If there is other independent work that can be done while waiting for results → `mode: "background"`**
  - e.g., Simultaneously web_fetch multiple MS Docs pages for cross-verification

**Most fact checks should be run in foreground (`mode: "sync"`)** because the next question cannot be asked without the results.

**How to run cross-verification in parallel:**
```
// Execute 1st and 2nd verification simultaneously (main agent performs directly)
[Simultaneously] Directly query primary MS Docs page via web_fetch (1st)
[Simultaneously] Additionally query related MS Docs page via web_fetch (2nd)
// Compare both results to check for discrepancies
// e.g., Model availability → parallel fetch of models page + regional availability page
```

**NEVER do this:**
- Run in background when results are needed, then sit idle doing nothing while waiting
- Delegate tasks requiring web_fetch/web_search to sub-agents (main agent MUST perform directly)
- Attempt to directly read files internal to sub-agents

---

**⚠️ Important: Do NOT execute any shell commands until the user explicitly approves proceeding to the next step.**
However, MS Docs web_fetch for the above fact checks is exceptionally allowed.

Once the architecture is confirmed (user said no changes to the diagram), ask the user whether to proceed to the next step.

**🚨 Phase 2 Transition Prerequisites — ALL of the following must be met before asking this question:**

1. `01_arch_diagram_draft.html` has been **generated** using the built-in diagram engine
2. The diagram has been **opened in the browser** and **displayed to the user** in the report format with the **configuration table**
3. The user was asked **"Would you like to change or add anything?"** and responded with **no changes**, or modifications have been reflected and **final confirmation** is given

**If ANY of the above conditions are not met, do NOT proceed to Phase 2.**
If the diagram does not exist yet, **generate it right now** — follow the procedure in section 1-2.
If the configuration table was not shown, **show it right now** before asking about changes.

**Following the parallel preload principle, execute `az account list` and `az group list` simultaneously with ask_user to prepare subscription/RG choices in advance.**

```
// Call simultaneously in the same response:
[1] ask_user — "The architecture is confirmed! Shall we proceed to the next step?"
[2] powershell — az account show 2>&1              (pre-check login status)
[3] powershell — az account list --output json      (pre-prepare subscription choices)
[4] powershell — az group list --output json        (pre-prepare resource group choices)
```

ask_user display format:
```
The architecture is confirmed! Shall we proceed to the next step?

✅ Confirmed architecture: [summary]

The following steps will proceed:
1. [Bicep Code Generation] — AI automatically writes IaC code
2. [Code Review] — Automated security/best practice review
3. [Azure Deployment] — Actual resource creation (optional)

Shall we proceed? (If you'd like just the code without deployment, let me know)
```

Once the user approves, collect information in the following order.
**Since `az account show` + `az account list` + `az group list` were already completed during preload, subscription/RG choices can be presented immediately.**

**Step 1: Azure Login Verification**

The `az account show` result is already available from preload. No additional call needed.

- If logged in → Move to Step 2
- If not logged in → Guide the user:
  ```
  Azure CLI login is required. Please run the following command in your terminal:
  az login
  Please let me know once completed.
  ```

**Step 2: Subscription Selection**

The `az account list` result is already available from preload. No additional call needed.

Provide up to 4 subscriptions from the query results as `ask_user` choices.
If there are 5 or more, include the 3-4 most frequently used subscriptions as choices (users can also type a custom input).
Once the user selects, execute `az account set --subscription "<ID>"`.

**Step 3: Resource Group Confirmation**

The `az group list` result is already available from preload. No additional call needed.

Provide up to 4 existing resource groups from the list as `ask_user` choices.
If the user selects an existing group, use it as-is; if they type a new name as custom input, create it during Phase 4 deployment.

**Required confirmed items:**
- [ ] Service list and SKUs
- [ ] Networking method (Private Endpoint usage)
- [ ] Subscription ID (confirmed in Step 2)
- [ ] Resource group name (confirmed in Step 3)
- [ ] Location (confirmed with user — regional availability per service verified via MS Docs)

---

## 🚨 Phase 1 Completion Checklist — Required Verification Before Phase 2 Entry

Before leaving Phase 1, verify **ALL** items below. If any are incomplete, do NOT proceed to Phase 2.

| # | Item | Verification Method |
|---|------|---------------------|
| 1 | All required specs confirmed | Project name, services, SKUs, region, and networking method are all confirmed |
| 2 | Fact check completed | MS Docs cross-verification has been performed |
| 3 | **Diagram generated** | `01_arch_diagram_draft.html` file has been generated using the built-in diagram engine |
| 4 | **Configuration table shown** | Detailed table with Service/Type/SKU/Details displayed to user in report format |
| 5 | **User reviewed diagram** | Browser auto-open + report format + "anything to change?" question asked |
| 6 | User final approval | User confirmed no changes, then selected "proceed to next step" |

**⚠️ Do NOT ask item 6 while items 3-5 are incomplete.** The flow must be: diagram → table → ask changes → confirm → next step.

---

## Phase 2 Handoff: Bicep Generation Agent

Once the user agrees to proceed, read the `references/bicep-generator.md` instructions and generate the Bicep template.
Alternatively, this can be delegated to a separate sub-agent.

**Sensitive Information Handling Principle (NEVER violate):**
- NEVER ask for VM passwords, API keys, or other sensitive values in chat, and NEVER store them in parameter files
- During code review, if sensitive values are found in plaintext in `main.bicepparam`, remove them immediately

**🔹 User-Input Sensitive Values Like VM Passwords — Complexity Validation Required:**

When the user inputs a VM admin password or similar, validate complexity requirements **before** sending to Azure.
Azure VMs must satisfy ALL of the following conditions:
- 12 characters or more
- Contains at least 3 of: uppercase letters, lowercase letters, numbers, special characters

**On validation failure:** Do NOT attempt deployment; immediately ask the user to re-enter:
> **⚠️ The password does not meet Azure complexity requirements.** It must be 12 characters or more and contain at least 3 of: uppercase + lowercase + numbers + special characters.

**NEVER do this:**
- Warn "it may not meet requirements" but attempt deployment anyway — **MUST block**
- Send to Azure without complexity validation, causing deployment failure

**🚨 `@secure()` Parameter and `.bicepparam` Compatibility Principle:**

When a `.bicepparam` file has a `using './main.bicep'` directive, additional `--parameters` flags CANNOT be used together with `az deployment group what-if/create`.
Therefore, `@secure()` parameter handling follows these rules:

1. **`@secure()` parameters MUST have default values** — Use Bicep functions like `newGuid()`, `uniqueString()`
   ```bicep
   @secure()
   param sqlAdminPassword string = newGuid()  // Auto-generated at deployment, store in Key Vault if needed
   ```
2. **If there are `@secure()` parameters that require user-specified values:**
   - Do NOT use `.bicepparam` file; instead use `--template-file` + `--parameters` combination
   - Or generate a separate JSON parameter file (`main.parameters.json`)
   ```powershell
   # When .bicepparam cannot be used — substitute with JSON parameter file
   az deployment group what-if `
     --template-file main.bicep `
     --parameters main.parameters.json `
     --parameters sqlAdminPassword='user-input-value'
   ```
3. **Do NOT use `.bicepparam` and `--parameters` simultaneously in a deployment command**
   ```
   ❌ az deployment group create --parameters main.bicepparam --parameters key=value
   ✅ az deployment group create --parameters main.bicepparam
   ✅ az deployment group create --template-file main.bicep --parameters main.parameters.json --parameters key=value
   ```

**Decision criteria:**
- All `@secure()` parameters have default values (newGuid, etc.) → `.bicepparam` can be used
- Any `@secure()` parameter requires user input → Use JSON parameter file instead of `.bicepparam`

**When MS Docs fetch fails:**
- If web_fetch fails due to rate limiting, etc., MUST notify the user:
  ```
  ⚠️ MS Docs API version lookup failed. Generating with the last known stable version.
  Verifying the actual latest version before deployment is recommended.
  Shall we continue?
  ```
- Do NOT silently proceed with a hardcoded version without user approval

**Pre-Bicep generation reference files:**
- `references/service-gotchas.md` — Required properties, common mistakes, PE groupId/DNS Zone mapping
- `references/ai-data.md` — AI/Data service configuration guide (v1 domain)
- `references/azure-common-patterns.md` — PE/security/naming common patterns
- `references/azure-dynamic-sources.md` — MS Docs URL registry (for API version fetch)
- For services not covered in the above files, directly fetch MS Docs to verify resource types, properties, and PE mappings

**Output structure:**
```
<project-name>/
├── main.bicep              # Main orchestration
├── main.bicepparam         # Parameters (environment-specific values)
└── modules/
    ├── network.bicep       # VNet, Subnet (including private endpoint subnet)
    ├── ai.bicep            # AI services (configured per user requirements)
    ├── storage.bicep       # ADLS Gen2 (isHnsEnabled: true)
    ├── fabric.bicep        # Microsoft Fabric (if needed)
    ├── keyvault.bicep      # Key Vault
    └── private-endpoints.bicep  # All PEs + DNS Zones
```

**Bicep mandatory principles:**
- Parameterize all resource names — `param openAiName string = 'oai-${uniqueString(resourceGroup().id)}'`
- Private services MUST have `publicNetworkAccess: 'Disabled'`
- Set `privateEndpointNetworkPolicies: 'Disabled'` on pe-subnet
- Private DNS Zone + VNet Link + DNS Zone Group — all 3 required
- When using Microsoft Foundry, **Foundry Project (`accounts/projects`) MUST be created alongside** — without it, the portal is unusable
- ADLS Gen2 MUST have `isHnsEnabled: true` (omitting this creates a regular Blob Storage)
- Store secrets in Key Vault, reference via `@secure()` parameters
- Add English comments explaining the purpose of each section

Immediately transition to Phase 3 after generation is complete.

---

## Phase 3 Handoff: Bicep Review Agent

Review according to `references/bicep-reviewer.md` instructions.

**⚠️ Key Point: Do NOT just visually inspect and say "pass". You MUST run `az bicep build` to verify actual compilation results.**

```powershell
az bicep build --file main.bicep 2>&1
```

1. Compilation errors/warnings → Fix
2. Checklist review → Fix
3. Re-compile to confirm
4. Report results (including compilation results)

For detailed checklists and fix procedures, see `references/bicep-reviewer.md`.

After review is complete, show the user the results before transitioning to Phase 4, and **MUST guide the user on the next steps.**

**🚨 Required Report Format When Phase 3 Is Complete:**

```
## Bicep Code Review Complete

[Review result summary — bicep-reviewer.md Step 6 format]

---

**Next Step: Phase 4 (Azure Deployment)**

The review is complete. The following steps will proceed:
1. **What-if Validation** — Preview planned resources without making actual changes
2. **Preview Diagram** — Architecture visualization based on What-if results (02_arch_diagram_preview.html)
3. **Actual Deployment** — Create resources in Azure after user confirmation

Shall we proceed with deployment? (If you'd like just the code without deployment, let me know)
```

**NEVER do this:**
- Completing Phase 3 and just providing the `az deployment group create` command without further guidance
- Deploying directly without What-if validation, or telling the user to run commands themselves
- Skipping the Phase 4 steps (What-if → Preview Diagram → Deployment)
