# SPEC: Composable Functions Templates Architecture

**Status:** Draft
**Author:** GitHub Copilot (research + design)
**Date:** 2026-02-16
**Scope:** Rebuild Azure Functions skill template/recipe system for reliability and speed

---

## 1. Problem Statement

### Current State
The skill system references **~50+ standalone AZD templates** (10 trigger types × 5 languages), each a separate GitHub repo with full IaC. Adding Terraform doubles this to **100+**. Maintaining, propagating changes, and keeping IaC secure/correct across this fleet is unsustainable ("combinatorix hell").

### Failure Modes (Why Synthetic IaC Fails)
1. **Bicep/Terraform generation from docs** produces subtly wrong IaC — missing `allowSharedKeyAccess: false`, wrong RBAC role GUIDs, incorrect `functionAppConfig` shapes for Flex Consumption
2. **LLM-generated RBAC** picks wrong roles or forgets `principalType: 'ServicePrincipal'`
3. **Networking (VNet/subnet)** is easy to misconfigure — private endpoints, NSG rules, service endpoints are template-specific
4. **Agent fallback loops** — when IaC fails validation, the agent asks the user for more info or tries alternative approaches, wasting time

### Success Metrics (Our Evals)
| Metric | Target |
|--------|--------|
| **Reliability** | 100% `azd up` success rate with zero user intervention or fallback |
| **Speed** | Shortest time from prompt to deployed endpoint |
| **No elicitation** | Agent never asks user for more information or tries alternative approaches |

---

## 2. Hypothesis: HTTP Base + Composable Recipes

### Core Insight
The HTTP templates (6 languages) are the **proven, battle-tested foundation**. They contain:

| Layer | What HTTP Base Provides | Quality |
|-------|------------------------|---------|
| **Function Source Code** | HTTP GET/POST handlers per language | ✅ Working, tested |
| **IaC — Core Resources** | Storage (no local auth), App Insights (no local auth), Flex Consumption plan, UAMI | ✅ Secure by default |
| **IaC — Identity/RBAC** | `Storage Blob Data Owner` for Function→Storage, SystemAssigned identity for deployment | ✅ Correct role GUIDs |
| **IaC — Networking** | VNet, subnet, private endpoints (VNET_ENABLED flag) | ✅ Tested |
| **AZD Config** | `azure.yaml`, `main.parameters.json`, abbreviations | ✅ Working |

### Delta Analysis: What Integration Templates Add

Each integration template (Cosmos, SQL, Service Bus, Timer, etc.) adds **specific deltas** on top of HTTP:

```
INTEGRATION_TEMPLATE = HTTP_BASE + DELTA

where DELTA = {
  source_code_changes,     // New trigger/binding code
  iac_new_resources,       // New Azure resources (e.g., Cosmos account)
  iac_rbac_additions,      // New role assignments
  iac_networking_additions,// New private endpoints, NSG rules
  app_settings_additions,  // New connection settings
  azure_yaml_changes       // Service config changes (if any)
}
```

### Template Decomposition Matrix

| Template | Source Code Delta | IaC New Resources | RBAC Additions | Network Additions | App Settings |
|----------|------------------|-------------------|----------------|-------------------|--------------|
| **HTTP** (base) | — | — | — | — | — |
| **Cosmos DB** | CosmosDBTrigger + leases | CosmosDB account + DB + containers(2) | `Cosmos DB Account Reader` + `SQL Data Contributor` on Cosmos→Function | Cosmos private endpoint + DNS zone | `COSMOS_CONNECTION__accountEndpoint`, `COSMOS_DATABASE_NAME`, `COSMOS_CONTAINER_NAME` |
| **Azure SQL** | SqlTrigger | SQL Server + DB + firewall rules | Function identity as SQL admin | SQL private endpoint + DNS zone | `SQL_CONNECTION_STRING` (managed identity) |
| **Service Bus** | ServiceBusTrigger | SB Namespace + Queue/Topic | `Service Bus Data Receiver` on SB→Function | SB private endpoint + DNS zone | `SERVICEBUS__fullyQualifiedNamespace`, queue name |
| **Event Hubs** | EventHubTrigger | EH Namespace + Hub + consumer group + Storage for checkpoints | `Event Hubs Data Receiver` + `Storage Blob Data Contributor` for checkpoints | EH private endpoint + DNS zone | `EVENTHUB__fullyQualifiedNamespace`, hub name |
| **Timer** | TimerTrigger | (none) | (none) | (none) | `TIMER_SCHEDULE` (cron) |
| **Blob (EventGrid)** | BlobTrigger via EventGrid | EventGrid subscription + system topic | `Storage Blob Data Reader` on trigger storage | EventGrid endpoint | `BLOB_CONNECTION__blobServiceUri` |
| **Durable** | DurableOrchestrationTrigger + Activities + Client | (none — uses existing Storage) | (none) | (none) | (none) |
| **MCP** | MCPTrigger / `@app.mcp_tool` | (none extra beyond HTTP) | (none) | (none) | (none) |

### Symmetry Classification

**High Symmetry (minimal delta from HTTP — only source code change):**
- Timer — swap HTTP trigger for TimerTrigger, add cron schedule
- Durable — add orchestrator, activity, client patterns
- MCP — swap HTTP for MCP trigger attribute

**Medium Symmetry (source + new resource + RBAC):**
- Cosmos DB — add Cosmos account + RBAC + connection settings
- Service Bus — add SB namespace + RBAC + connection settings

**Lower Symmetry (source + multiple new resources + complex networking):**
- Azure SQL — SQL server, firewall, managed identity SQL admin
- Event Hubs — EH namespace + checkpoint storage + consumer groups
- Blob (EventGrid) — EventGrid subscription + system topic

---

## 3. Proposed Architecture: Base + Recipe Composition

### Structure

```
templates/
├── base/                        # The HTTP template (fetched from AZD gallery)
│   ├── bicep/                   # Proven Bicep IaC from functions-quickstart-{lang}-azd
│   │   ├── main.bicep           # Entry point (subscription scope)
│   │   ├── main.parameters.json
│   │   └── app/                 # Function app module + supporting resources
│   ├── terraform/               # Equivalent TF from functions-quickstart-{lang}-azd-tf
│   │   ├── provider.tf
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── output.tf
│   │   └── main.tfvars.json
│   └── source/                  # Per-language function code (JS, TS, .NET, Java, Python, PS)
│
├── recipes/                     # Composable deltas (IaC-provider-agnostic concepts)
│   ├── cosmosdb/
│   │   ├── README.md            # Recipe description, app settings, RBAC roles
│   │   ├── bicep/               # Bicep module for Cosmos resources + RBAC + networking
│   │   │   ├── cosmos.bicep     # Cosmos account + DB + containers + leases
│   │   │   ├── rbac.bicep       # Role assignments: Function→Cosmos
│   │   │   └── network.bicep    # Private endpoint + DNS zone (conditional on VNET_ENABLED)
│   │   ├── terraform/           # TF equivalent
│   │   │   ├── cosmos.tf
│   │   │   ├── rbac.tf
│   │   │   └── network.tf
│   │   └── source/              # Per-language trigger/binding code snippets
│   │       ├── dotnet.md        # CosmosDBTrigger C# code
│   │       ├── typescript.md
│   │       ├── python.md
│   │       ├── java.md
│   │       └── powershell.md
│   │
│   ├── servicebus/
│   │   ├── README.md
│   │   ├── bicep/
│   │   ├── terraform/
│   │   └── source/
│   │
│   ├── sql/
│   │   ├── README.md
│   │   ├── bicep/
│   │   ├── terraform/
│   │   └── source/
│   │
│   ├── eventhubs/
│   │   ├── README.md
│   │   ├── bicep/
│   │   ├── terraform/
│   │   └── source/
│   │
│   ├── timer/
│   │   ├── README.md
│   │   └── source/              # Timer needs no IaC delta, only source code
│   │
│   ├── blob-eventgrid/
│   │   ├── README.md
│   │   ├── bicep/
│   │   ├── terraform/
│   │   └── source/
│   │
│   ├── durable/
│   │   ├── README.md
│   │   └── source/              # Durable needs no IaC delta
│   │
│   └── mcp/
│       ├── README.md
│       └── source/              # MCP needs no IaC delta (uses HTTP base)
│
└── README.md                    # Selection tree + composition algorithm
```

### Composition Algorithm

```
INPUT: user_prompt, detected_language, detected_integration, iac_preference (bicep|terraform)
OUTPUT: complete project ready for `azd up`

ALGORITHM:
1. SELECT base template by language
   → Fetch HTTP quickstart template:
     azd init -t functions-quickstart-{language}-azd[-tf]

2. DETECT integration from user prompt / code scan
   → Match against selection tree (indicators from selection.md)

3. IF integration == 'http' or 'mcp' or 'timer' or 'durable':
     → Source code change only (no IaC delta)
     → Apply source/ snippet from recipe
     → DONE

4. IF integration has IaC delta (cosmos, sql, servicebus, eventhubs, blob):
     a. COPY base template as-is (do NOT modify base IaC)
     b. INJECT recipe IaC module:
        - Bicep: Add module reference in main.bicep, pass required params
        - Terraform: Add recipe .tf files to infra/
     c. ADD app settings from recipe README to function app config
     d. ADD RBAC from recipe (role assignments with correct GUIDs)
     e. IF VNET_ENABLED: ADD network recipe (private endpoints + DNS)
     f. REPLACE source code: swap HTTP handler for integration trigger

5. VALIDATE: `azd provision --preview` or dry-run
6. DEPLOY: `azd up`
```

### Key Design Principles

| Principle | Rationale |
|-----------|-----------|
| **Never synthesize base IaC** | Always fetch from proven AZD template repos |
| **Never modify base; only extend** | Recipe modules are additive — reduces risk of breaking core |
| **Recipes carry their own RBAC** | Each recipe knows its exact role GUIDs — no LLM guessing |
| **Recipes carry their own networking** | Private endpoints are per-service, recipe owns the config |
| **Source code is per-language snippets** | Small, testable, deterministic code blocks |
| **Same algorithm for Bicep and Terraform** | Only the IaC files differ, not the composition logic |

---

## 4. Terraform Strategy

### Decision: Separate `-tf` Repos (Preferred)

After analyzing both alternatives:

| Approach | Pros | Cons |
|----------|------|------|
| **A: Peer `-tf` repos** (e.g., `functions-quickstart-dotnet-azd-tf`) | Clean separation, independent CI, clear `azd init -t`, already exists for .NET | More repos to maintain (but recipes reduce count) |
| **B: Bicep+TF in same repo** (PR #24 approach: `infra/infra-tf/` subfolder) | Single repo, share source code | Confusing azure.yaml switching, complex CI, `azd init` gets both |

**Recommendation: Approach A** — separate `-tf` repos for the **HTTP base only** (6 repos, one per language). Recipes provide the delta `.tf` files exactly as they do for Bicep.

### Template Count: Before vs After

| Dimension | Current (Monolithic) | New (Composable) |
|-----------|---------------------|-------------------|
| HTTP base (Bicep) | 6 repos | 6 repos (keep as-is) |
| HTTP base (Terraform) | 0-1 repos | 6 repos (new) |
| Integration templates (Bicep) | ~30 repos (6 langs × 5 integrations) | 0 repos (replaced by recipes) |
| Integration templates (Terraform) | 0 | 0 (same recipes) |
| **Recipe modules** | N/A | 7 recipes (Cosmos, SQL, SB, EH, Timer, Blob, Durable) |
| **Total to maintain** | **~36+ repos** | **12 base repos + 7 recipes** |

### How Recipes Eliminate Repos

Instead of `functions-quickstart-dotnet-azd-cosmosdb`, `functions-quickstart-python-azd-cosmosdb`, etc., we have:
- One `cosmosdb` recipe with `bicep/` and `terraform/` modules
- Per-language source snippets in `source/`
- The skill composes: `HTTP base (dotnet)` + `cosmosdb recipe` → complete CosmosDB function project

---

## 5. Recipe Anatomy: Cosmos DB Example

### Recipe README.md

```markdown
# Cosmos DB Recipe

Adds Cosmos DB trigger/binding to a Functions base template.

## Integration Type
- **Trigger**: CosmosDBTrigger (change feed)
- **Connection**: Managed identity (COSMOS_CONNECTION__accountEndpoint)
- **Containers**: Application data + leases

## App Settings to Add

| Setting | Value |
|---------|-------|
| `COSMOS_CONNECTION__accountEndpoint` | Cosmos account endpoint |
| `COSMOS_DATABASE_NAME` | Database name |
| `COSMOS_CONTAINER_NAME` | Container name |

## RBAC Roles Required

| Role | Scope | GUID |
|------|-------|------|
| Cosmos DB Account Reader | Cosmos account | `fbdf93bf-df7d-467e-a4d2-9458aa1360c8` |
| Cosmos DB Built-in Data Contributor | Cosmos account | `00000000-0000-0000-0000-000000000002` |

## Networking (when VNET_ENABLED=true)

- Private endpoint for Cosmos account
- Private DNS zone: `privatelink.documents.azure.com`
- Firewall: Allow developer IP (script-based)
```

### Recipe Bicep Module (cosmos.bicep)

```bicep
// recipes/cosmosdb/bicep/cosmos.bicep
targetScope = 'resourceGroup'

param name string
param location string = resourceGroup().location
param tags object = {}
param functionAppPrincipalId string
param vnetEnabled bool = true
param subnetId string = ''

var resourceSuffix = take(uniqueString(subscription().id, resourceGroup().name, name), 6)
var cosmosAccountName = 'cosmos-${name}-${resourceSuffix}'
var databaseName = 'documents-db'
var containerName = 'documents'
var leasesContainerName = 'leases'

// Cosmos DB Account (Serverless)
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: cosmosAccountName
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [{ locationName: location, failoverPriority: 0 }]
    consistencyPolicy: { defaultConsistencyLevel: 'Session' }
    capabilities: [{ name: 'EnableServerless' }]
    disableLocalAuth: true // Enforce RBAC-only auth — no keys
    publicNetworkAccess: vnetEnabled ? 'Disabled' : 'Enabled'
  }
}

// Database
resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  parent: cosmosAccount
  name: databaseName
  properties: { resource: { id: databaseName } }
}

// Application container
resource container 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: containerName
  properties: {
    resource: {
      id: containerName
      partitionKey: { paths: ['/id'], kind: 'Hash' }
    }
  }
}

// Leases container (for change feed tracking)
resource leasesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: leasesContainerName
  properties: {
    resource: {
      id: leasesContainerName
      partitionKey: { paths: ['/id'], kind: 'Hash' }
    }
  }
}

// RBAC: Cosmos DB Account Reader
resource cosmosAccountReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(cosmosAccount.id, functionAppPrincipalId, 'Cosmos DB Account Reader')
  scope: cosmosAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'fbdf93bf-df7d-467e-a4d2-9458aa1360c8')
    principalId: functionAppPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// RBAC: Cosmos DB Built-in Data Contributor (SQL role)
resource cosmosSqlRoleAssignment 'Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments@2024-05-15' = {
  parent: cosmosAccount
  name: guid(cosmosAccount.id, functionAppPrincipalId, 'Cosmos SQL Data Contributor')
  properties: {
    roleDefinitionId: '${cosmosAccount.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002'
    principalId: functionAppPrincipalId
    scope: cosmosAccount.id
  }
}

output cosmosAccountEndpoint string = cosmosAccount.properties.documentEndpoint
output cosmosDatabaseName string = databaseName
output cosmosContainerName string = containerName
```

### Recipe Source Snippet (dotnet.md)

```csharp
// CosmosTrigger.cs — Replace HTTP trigger with this
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace MyFunctionApp
{
    public class CosmosTrigger
    {
        private readonly ILogger _logger;

        public CosmosTrigger(ILoggerFactory loggerFactory)
        {
            _logger = loggerFactory.CreateLogger<CosmosTrigger>();
        }

        [Function("cosmos_trigger")]
        public void Run([CosmosDBTrigger(
            databaseName: "%COSMOS_DATABASE_NAME%",
            containerName: "%COSMOS_CONTAINER_NAME%",
            Connection = "COSMOS_CONNECTION",
            LeaseContainerName = "leases",
            CreateLeaseContainerIfNotExists = true)] IReadOnlyList<MyDocument> input)
        {
            if (input != null && input.Count > 0)
            {
                _logger.LogInformation("Documents modified: " + input.Count);
                _logger.LogInformation("First document Id: " + input[0].id);
            }
        }
    }

    public class MyDocument
    {
        public required string id { get; set; }
        public required string Text { get; set; }
        public int Number { get; set; }
        public bool Boolean { get; set; }
    }
}
```

---

## 6. Skill Workflow Changes

### Updated Selection Flow

```
User Prompt → Detect Language → Detect Integration → Select IaC Provider

1. FETCH base:
   IF iac == 'bicep':
     azd init -t functions-quickstart-{lang}-azd
   IF iac == 'terraform':
     azd init -t functions-quickstart-{lang}-azd-tf

2. APPLY recipe (if integration != HTTP):
   a. Read recipe README.md for settings/RBAC reference
   b. Copy recipe/{iac}/*.bicep|*.tf into infra/
   c. Wire into main.bicep or main.tf
   d. Add app settings to function app config
   e. Replace source code file with recipe source snippet
   f. Update azure.yaml if needed (e.g., hooks for scripts)

3. VALIDATE + DEPLOY:
   azd up --no-prompt
```

### Skill Reference Files to Update

| File | Change |
|------|--------|
| `templates/README.md` | Add recipes section, update selection table |
| `templates/selection.md` | Add recipe composition logic |
| `templates/http.md` | Add note: "HTTP is the base for all recipes" |
| `templates/integrations.md` | Replace gallery links with recipe references |
| New: `templates/recipes/` | Full recipe directory structure |
| `services/functions/bicep.md` | Add recipe injection patterns |

### Updated template selection table

```markdown
| Priority | Integration | Action |
|----------|-------------|--------|
| 1 | MCP Server | HTTP base + MCP source snippet (no IaC delta) |
| 2 | Cosmos DB | HTTP base + cosmosdb recipe |
| 3 | Azure SQL | HTTP base + sql recipe |
| 4 | Service Bus | HTTP base + servicebus recipe |
| 5 | Event Hubs | HTTP base + eventhubs recipe |
| 6 | Blob (EventGrid) | HTTP base + blob-eventgrid recipe |
| 7 | Timer | HTTP base + timer source snippet (no IaC delta) |
| 8 | Durable | HTTP base + durable source snippet (no IaC delta) |
| 9 | HTTP (default) | HTTP base only |
```

---

## 7. Implementation Plan

### Phase 1: Proof of Concept (HTTP + Cosmos DB)

**Goal:** Validate the composable architecture end-to-end.

| Step | Task | Output |
|------|------|--------|
| 1.1 | Create recipe directory structure under `templates/recipes/cosmosdb/` | Directory skeleton |
| 1.2 | Extract Cosmos Bicep module from `functions-quickstart-dotnet-azd-cosmosdb` | `cosmosdb/bicep/cosmos.bicep` |
| 1.3 | Create Cosmos Terraform module (port from Bicep) | `cosmosdb/terraform/cosmos.tf` |
| 1.4 | Create source snippets for all 5 languages | `cosmosdb/source/{lang}.md` |
| 1.5 | Create recipe README with settings, RBAC, networking | `cosmosdb/README.md` |
| 1.6 | Update skill workflow to use composition algorithm | Updated SKILL.md refs |
| 1.7 | Test: `azd init -t functions-quickstart-dotnet-azd` + apply Cosmos recipe | Working `azd up` |
| 1.8 | Test: Same with Terraform base | Working `azd up` |

### Phase 2: Remaining Recipes

| Step | Task |
|------|------|
| 2.1 | Service Bus recipe (Bicep + TF + 5 language snippets) |
| 2.2 | Azure SQL recipe |
| 2.3 | Event Hubs recipe |
| 2.4 | Timer recipe (source only) |
| 2.5 | Blob/EventGrid recipe |
| 2.6 | Durable recipe (source only) |
| 2.7 | MCP recipe (source only) |

### Phase 3: Terraform Base Templates

| Step | Task |
|------|------|
| 3.1 | Create/validate `-tf` repos for JS, TS, Python, Java, PowerShell |
| 3.2 | Ensure all TF bases pass `azd up` |
| 3.3 | Validate Cosmos recipe works with all TF bases |

### Phase 4: Fleet Migration PRs

| Step | Task |
|------|------|
| 4.1 | Update `templates/README.md` to new composition model |
| 4.2 | Update `templates/selection.md` |
| 4.3 | Update SKILL.md execution phase to use recipes |
| 4.4 | Deprecate direct links to integration template repos |
| 4.5 | Create eval test suite: for each {language × integration × iac}, verify `azd up` succeeds |

---

## 8. Eval Framework

### Test Matrix

```
FOR EACH language IN [dotnet, typescript, javascript, python, java, powershell]:
  FOR EACH integration IN [http, cosmosdb, servicebus, sql, eventhubs, timer, blob, durable, mcp]:
    FOR EACH iac IN [bicep, terraform]:
      TEST: compose(base[language][iac], recipe[integration]) → azd up → SUCCESS
      MEASURE: time_to_deploy, user_interventions (must be 0), errors (must be 0)
```

### Eval Criteria

| Eval | Pass Condition |
|------|----------------|
| **Reliability** | `azd up` exits 0 with no errors across ALL matrix cells |
| **No elicitation** | Agent produces complete project in one shot — zero `ask_user` calls |
| **Speed** | Total time (compose + azd up) < 10 minutes per deployment |
| **Correctness** | Deployed function responds to trigger (HTTP 200, Cosmos change feed fires, etc.) |
| **Security** | No connection strings in app settings, RBAC-only auth, VNET works when enabled |

---

## 9. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Bicep module injection breaks main.bicep | Deploy fails | All recipes tested against each base; base is read-only |
| Terraform module injection breaks state | Deploy fails | Recipes are self-contained .tf files, no module references |
| Cosmos RBAC changes upstream | Auth fails | Pin API versions in recipe modules |
| New languages added | 12 base repos | Propagation workflow already exists for HTTP templates |
| Recipe becomes stale vs. Awesome AZD | Drift | Monthly sync job; recipes track upstream template versions |

---

## 10. Decision: Start with Proof of Concept

**Next action:** Build the Cosmos DB recipe (Bicep + Terraform + C# source) and validate it composes correctly with the HTTP dotnet base template. If this works:
1. Expand to all 5 languages for Cosmos
2. Build remaining recipes
3. Create PRs to migrate skill references
4. Deprecate monolithic integration template repos

---

## Appendix A: Current Template Fleet

### HTTP Base Templates (KEEP — these are the foundation)

| Language | Bicep Repo | TF Repo |
|----------|-----------|---------|
| C# (.NET) | `functions-quickstart-dotnet-azd` | `functions-quickstart-dotnet-azd-tf` (new, 5 days old) |
| TypeScript | `functions-quickstart-typescript-azd` | (to create) |
| JavaScript | `functions-quickstart-javascript-azd` | (to create) |
| Python | `functions-quickstart-python-http-azd` | (to create) |
| Java | `azure-functions-java-flex-consumption-azd` | (to create) |
| PowerShell | `functions-quickstart-powershell-azd` | (to create) |

### Integration Templates (REPLACE with recipes)

| Integration | Existing Repos | Replacement |
|-------------|---------------|-------------|
| Cosmos DB | dotnet, python, typescript (3 repos) | `recipes/cosmosdb/` |
| Azure SQL | dotnet, python, typescript (3 repos) | `recipes/sql/` |
| Service Bus | dotnet, python, typescript, java (4 repos) | `recipes/servicebus/` |
| Timer | dotnet (1 repo) | `recipes/timer/` |
| Blob/EventGrid | dotnet, python, typescript, javascript, java, powershell (6 repos) | `recipes/blob-eventgrid/` |
| Durable | dotnet (1 repo) | `recipes/durable/` |
| **Total repos to deprecate** | **~18 repos** | **6 recipe directories** |

### Flex Consumption IaC Samples (REFERENCE for recipe IaC patterns)

- `azure-functions-flex-consumption-samples/IaC/bicep/` — canonical Flex Consumption Bicep
- `azure-functions-flex-consumption-samples/IaC/terraformazurerm/` — canonical Flex Consumption Terraform (AzureRM)

---

## Appendix B: IaC Provider Comparison for Recipes

| Aspect | Bicep Recipe Module | Terraform Recipe Module |
|--------|-------------------|----------------------|
| **Injection method** | `module` reference in `main.bicep` | Additional `.tf` files in `infra/` |
| **Naming** | Uses same `uniqueString()` pattern as base | Uses same `azurecaf_name` as base |
| **Tags** | Inherits `tags` param from base | Inherits `var.tags` from base |
| **RBAC** | `Microsoft.Authorization/roleAssignments` | `azurerm_role_assignment` |
| **Networking** | `Microsoft.Network/privateEndpoints` | `azurerm_private_endpoint` |
| **Identity reference** | `functionApp.identity.principalId` | `azurerm_function_app_flex_consumption.*.identity[0].principal_id` |
| **azure.yaml change** | None (Bicep is default) | `infra.provider: terraform` already set in TF base |
