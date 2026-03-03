# Azure Region Availability Reference

> **AUTHORITATIVE SOURCE** — Consult this file BEFORE recommending any region.
>
> Official reference: https://azure.microsoft.com/en-us/explore/global-infrastructure/products-by-region/table

## How to Use

1. Check if your architecture includes any **limited availability** services below
2. If yes → only offer regions that support ALL services
3. If all services are "available everywhere" → offer common regions

---

## Services with LIMITED Region Availability

### Azure Static Web Apps (SWA)

⚠️ **NOT available in many common regions**

| ✅ Available | ❌ NOT Available (will FAIL) |
|-------------|------------------------------|
| `westus2` | `eastus` |
| `centralus` | `northeurope` |
| `eastus2` | `southeastasia` |
| `westeurope` | `uksouth` |
| `eastasia` | `canadacentral` |
| | `australiaeast` |
| | `westus3` |

---

### Azure OpenAI

⚠️ **Very limited — varies by model**

| Region | GPT-4o | GPT-4 | GPT-3.5 | Embeddings |
|--------|:------:|:-----:|:-------:|:----------:|
| `eastus` | ✅ | ✅ | ✅ | ✅ |
| `eastus2` | ✅ | ✅ | ✅ | ✅ |
| `westus` | ⚠️ | ⚠️ | ✅ | ✅ |
| `westus3` | ✅ | ⚠️ | ✅ | ✅ |
| `southcentralus` | ✅ | ✅ | ✅ | ✅ |
| `swedencentral` | ✅ | ✅ | ✅ | ✅ |
| `westeurope` | ⚠️ | ✅ | ✅ | ✅ |

> Check https://learn.microsoft.com/azure/ai-services/openai/concepts/models for current model availability.

---

## Services Available in Most Regions

These services are available in all major Azure regions — no special consideration needed:

- **Container Apps**
- **Azure Functions**
- **App Service**
- **Azure SQL Database**
- **Cosmos DB**
- **Key Vault**
- **Storage Account**
- **Service Bus**
- **Event Grid**
- **Application Insights / Log Analytics**

---

## Common Architecture Patterns

| Pattern | Recommended Regions |
|---------|---------------------|
| SWA only | `westus2`, `centralus`, `eastus2`, `westeurope`, `eastasia` |
| SWA + backend services | `westus2`, `centralus`, `eastus2`, `westeurope`, `eastasia` |
| Container Apps (no SWA) | `eastus`, `eastus2`, `westus2`, `centralus`, `westeurope` |
| With Azure OpenAI (GPT-4o/4/3.5 + embeddings) | `eastus`, `eastus2`, `swedencentral` |
| SWA + Azure OpenAI (GPT-4o/4/3.5 + embeddings) | `eastus2` (only region with full SWA + model overlap) |

---

**Last updated:** 2026-02-03

