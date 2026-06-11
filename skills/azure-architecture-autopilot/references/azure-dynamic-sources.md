# Azure Dynamic Sources Registry

This file manages **only the sources (URLs) for frequently changing information**.
Actual values (API version, SKU, region, etc.) are not recorded here.
Always fetch the URLs below to verify the latest information before generating Bicep.

---

## 1. Bicep API Version (Always Must Fetch)

Per-service MS Docs Bicep reference. Verify the latest stable apiVersion from these URLs before use.

| Service | MS Docs URL |
|---------|-------------|
| CognitiveServices (Foundry/OpenAI) | https://learn.microsoft.com/en-us/azure/templates/microsoft.cognitiveservices/accounts |
| AI Search | https://learn.microsoft.com/en-us/azure/templates/microsoft.search/searchservices |
| Storage Account | https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/storageaccounts |
| Key Vault | https://learn.microsoft.com/en-us/azure/templates/microsoft.keyvault/vaults |
| Virtual Network | https://learn.microsoft.com/en-us/azure/templates/microsoft.network/virtualnetworks |
| Private Endpoints | https://learn.microsoft.com/en-us/azure/templates/microsoft.network/privateendpoints |
| Private DNS Zones | https://learn.microsoft.com/en-us/azure/templates/microsoft.network/privatednszones |
| Fabric | https://learn.microsoft.com/en-us/azure/templates/microsoft.fabric/capacities |
| Data Factory | https://learn.microsoft.com/en-us/azure/templates/microsoft.datafactory/factories |
| Application Insights | https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/components |
| ML Workspace (Hub) | https://learn.microsoft.com/en-us/azure/templates/microsoft.machinelearningservices/workspaces |

> **Always verify child resources as well**: Child resources such as `accounts/projects`, `accounts/deployments`, `privateDnsZones/virtualNetworkLinks` may have different API versions from their parent. Follow child resource links from the parent page to verify.

### Services Not in the Table Above

The table above includes only v1 scope services. For other services, construct the URL in this format and fetch:
```
https://learn.microsoft.com/en-us/azure/templates/microsoft.{provider}/{resourceType}
```

---

## 2. Model Availability (Required When Using Foundry/OpenAI Models)

Verify whether the model name is deployable in the target region. Do not rely on static knowledge.

| Verification Method | URL / Command |
|--------------------|---------------|
| MS Docs model availability | https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models |
| Azure CLI (existing resources) | `az cognitiveservices account list-models --name "<NAME>" --resource-group "<RG>" -o table` |

> If the model is unavailable in the target region → Notify the user and suggest available regions/alternative models. Do not substitute without user approval.

---

## 3. Private Endpoint Mapping (When Adding New Services)

PE groupId and DNS Zone mappings can be changed by Azure. When adding new services or verification is needed:

| Verification Method | URL |
|--------------------|-----|
| PE DNS integration official docs | https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns |

> Key service mappings in `service-gotchas.md` are stable, but always re-verify from the URL above when adding new services.

---

## 4. Service Region Availability

Verify whether a specific service is available in a specific region:

| Verification Method | URL |
|--------------------|-----|
| Azure service-by-region availability | https://azure.microsoft.com/en-us/explore/global-infrastructure/products-by-region/ |

---

## 5. Azure Updates (Secondary Awareness)

The sources below are for **reference only**. The primary source is always MS Docs official documentation.

| Source | URL | Purpose |
|--------|-----|---------|
| Azure Updates | https://azure.microsoft.com/en-us/updates/ | Service change awareness |
| What's New in Azure | Per-service What's New pages in Docs | Feature change verification |

---

## Decision Rule: When to Fetch?

| Information Type | Must Fetch? | Rationale |
|-----------------|-------------|-----------|
| API version | **Always fetch** | Changes frequently; incorrect values cause deployment failure |
| Model availability (name, region) | **Always fetch** | Varies by region and changes frequently |
| SKU list | **Always fetch** | Can change per service |
| Region availability | **Always fetch** | Per-service region support changes frequently. Always verify that the user-specified region is available for the service |
| PE groupId & DNS Zone | Can reference `service-gotchas.md` for v1 key services; **must fetch for new services or complex configurations (Monitor, etc.)** | Key service mappings are stable, but new/complex services are risky |
| Required property patterns | Reference files first | Near-immutable (isHnsEnabled, etc.) |
