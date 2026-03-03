---
name: azure-pricing
description: 'Fetches real-time Azure retail pricing using the Azure Retail Prices API (prices.azure.com) and estimates Copilot Studio agent credit consumption. Use when the user asks about the cost of any Azure service, wants to compare SKU prices, needs pricing data for a cost estimate, mentions Azure pricing, Azure costs, Azure billing, or asks about Copilot Studio pricing, Copilot Credits, or agent usage estimation. Covers compute, storage, networking, databases, AI, Copilot Studio, and all other Azure service families.'
compatibility: Requires internet access to prices.azure.com and learn.microsoft.com. No authentication needed.
metadata:
  author: anthonychu
  version: "1.2"
---

# Azure Pricing Skill

Use this skill to retrieve real-time Azure retail pricing data from the public Azure Retail Prices API. No authentication is required.

## When to Use This Skill

- User asks about the cost of an Azure service (e.g., "How much does a D4s v5 VM cost?")
- User wants to compare pricing across regions or SKUs
- User needs a cost estimate for a workload or architecture
- User mentions Azure pricing, Azure costs, or Azure billing
- User asks about reserved instance vs. pay-as-you-go pricing
- User wants to know about savings plans or spot pricing

## API Endpoint

```
GET https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview
```

Append `$filter` as a query parameter using OData filter syntax. Always use `api-version=2023-01-01-preview` to ensure savings plan data is included.

## Step-by-step Instructions

If anything is unclear about the user's request, ask clarifying questions to identify the correct filter fields and values before calling the API.

1. **Identify filter fields** from the user's request (service name, region, SKU, price type).
2. **Resolve the region**: the API requires `armRegionName` values in lowercase with no spaces (e.g. "East US" → `eastus`, "West Europe" → `westeurope`, "Southeast Asia" → `southeastasia`). See [references/REGIONS.md](references/REGIONS.md) for a complete list.
3. **Build the filter string** using the fields below and fetch the URL.
4. **Parse the `Items` array** from the JSON response. Each item contains price and metadata.
5. **Follow pagination** via `NextPageLink` if you need more than the first 1000 results (rarely needed).
6. **Calculate cost estimates** using the formulas in [references/COST-ESTIMATOR.md](references/COST-ESTIMATOR.md) to produce monthly/annual estimates.
7. **Present results** in a clear summary table with service, SKU, region, unit price, and monthly/annual estimates.

## Filterable Fields

| Field | Type | Example |
|---|---|---|
| `serviceName` | string (exact, case-sensitive) | `'Functions'`, `'Virtual Machines'`, `'Storage'` |
| `serviceFamily` | string (exact, case-sensitive) | `'Compute'`, `'Storage'`, `'Databases'`, `'AI + Machine Learning'` |
| `armRegionName` | string (exact, lowercase) | `'eastus'`, `'westeurope'`, `'southeastasia'` |
| `armSkuName` | string (exact) | `'Standard_D4s_v5'`, `'Standard_LRS'` |
| `skuName` | string (contains supported) | `'D4s v5'` |
| `priceType` | string | `'Consumption'`, `'Reservation'`, `'DevTestConsumption'` |
| `meterName` | string (contains supported) | `'Spot'` |

Use `eq` for equality, `and` to combine, and `contains(field, 'value')` for partial matches.

## Example Filter Strings

```
# All consumption prices for Functions in East US
serviceName eq 'Functions' and armRegionName eq 'eastus' and priceType eq 'Consumption'

# D4s v5 VMs in West Europe (consumption only)
armSkuName eq 'Standard_D4s_v5' and armRegionName eq 'westeurope' and priceType eq 'Consumption'

# All storage prices in a region
serviceName eq 'Storage' and armRegionName eq 'eastus'

# Spot pricing for a specific SKU
armSkuName eq 'Standard_D4s_v5' and contains(meterName, 'Spot') and armRegionName eq 'eastus'

# 1-year reservation pricing
serviceName eq 'Virtual Machines' and priceType eq 'Reservation' and armRegionName eq 'eastus'

# Azure AI / OpenAI pricing (now under Foundry Models)
serviceName eq 'Foundry Models' and armRegionName eq 'eastus' and priceType eq 'Consumption'

# Azure Cosmos DB pricing
serviceName eq 'Azure Cosmos DB' and armRegionName eq 'eastus' and priceType eq 'Consumption'
```

## Full Example Fetch URL

```
https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview&$filter=serviceName eq 'Functions' and armRegionName eq 'eastus' and priceType eq 'Consumption'
```

URL-encode spaces as `%20` and quotes as `%27` when constructing the URL.

## Key Response Fields

```json
{
  "Items": [
    {
      "retailPrice": 0.000016,
      "unitPrice": 0.000016,
      "currencyCode": "USD",
      "unitOfMeasure": "1 Execution",
      "serviceName": "Functions",
      "skuName": "Premium",
      "armRegionName": "eastus",
      "meterName": "vCPU Duration",
      "productName": "Functions",
      "priceType": "Consumption",
      "isPrimaryMeterRegion": true,
      "savingsPlan": [
        { "unitPrice": 0.000012, "term": "1 Year" },
        { "unitPrice": 0.000010, "term": "3 Years" }
      ]
    }
  ],
  "NextPageLink": null,
  "Count": 1
}
```

Only use items where `isPrimaryMeterRegion` is `true` unless the user specifically asks for non-primary meters.

## Supported serviceFamily Values

`Analytics`, `Compute`, `Containers`, `Data`, `Databases`, `Developer Tools`, `Integration`, `Internet of Things`, `Management and Governance`, `Networking`, `Security`, `Storage`, `Web`, `AI + Machine Learning`

## Tips

- `serviceName` values are case-sensitive. When unsure, filter by `serviceFamily` first to discover valid `serviceName` values in the results.
- If results are empty, try broadening the filter (e.g., remove `priceType` or region constraints first).
- Prices are always in USD unless `currencyCode` is specified in the request.
- For savings plan prices, look for the `savingsPlan` array on each item (only in `2023-01-01-preview`).
- See [references/SERVICE-NAMES.md](references/SERVICE-NAMES.md) for a catalog of common service names and their correct casing.
- See [references/COST-ESTIMATOR.md](references/COST-ESTIMATOR.md) for cost estimation formulas and patterns.
- See [references/COPILOT-STUDIO-RATES.md](references/COPILOT-STUDIO-RATES.md) for Copilot Studio billing rates and estimation formulas.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Empty results | Broaden the filter — remove `priceType` or `armRegionName` first |
| Wrong service name | Use `serviceFamily` filter to discover valid `serviceName` values |
| Missing savings plan data | Ensure `api-version=2023-01-01-preview` is in the URL |
| URL errors | Check URL encoding — spaces as `%20`, quotes as `%27` |
| Too many results | Add more filter fields (region, SKU, priceType) to narrow down |

---

# Copilot Studio Agent Usage Estimation

Use this section when the user asks about Copilot Studio pricing, Copilot Credits, or agent usage costs.

## When to Use This Section

- User asks about Copilot Studio pricing or costs
- User asks about Copilot Credits or agent credit consumption
- User wants to estimate monthly costs for a Copilot Studio agent
- User mentions agent usage estimation or the Copilot Studio estimator
- User asks how much an agent will cost to run

## Key Facts

- **1 Copilot Credit = $0.01 USD**
- Credits are pooled across the entire tenant
- Employee-facing agents with M365 Copilot licensed users get classic answers, generative answers, and tenant graph grounding at zero cost
- Overage enforcement triggers at 125% of prepaid capacity

## Step-by-step Estimation

1. **Gather inputs** from the user: agent type (employee/customer), number of users, interactions/month, knowledge %, tenant graph %, tool usage per session.
2. **Fetch live billing rates** — use the built-in web fetch tool to download the latest rates from the source URLs listed below. This ensures the estimate always uses the most current Microsoft pricing.
3. **Parse the fetched content** to extract the current billing rates table (credits per feature type).
4. **Calculate the estimate** using the rates and formulas from the fetched content:
   - `total_sessions = users × interactions_per_month`
   - Knowledge credits: apply tenant graph grounding rate, generative answer rate, and classic answer rate
   - Agent tools credits: apply agent action rate per tool call
   - Agent flow credits: apply flow rate per 100 actions
   - Prompt modifier credits: apply basic/standard/premium rates per 10 responses
5. **Present results** in a clear table with breakdown by category, total credits, and estimated USD cost.

## Source URLs to Fetch

When answering Copilot Studio pricing questions, fetch the latest content from these URLs to use as context:

| URL | Content |
|---|---|
| https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-messages-management | Billing rates table, billing examples, overage enforcement rules |
| https://learn.microsoft.com/en-us/microsoft-copilot-studio/billing-licensing | Licensing options, M365 Copilot inclusions, prepaid vs pay-as-you-go |

Fetch at least the first URL (billing rates) before calculating. The second URL provides supplementary context for licensing questions.

See [references/COPILOT-STUDIO-RATES.md](references/COPILOT-STUDIO-RATES.md) for a cached snapshot of rates, formulas, and billing examples (use as fallback if web fetch is unavailable).
