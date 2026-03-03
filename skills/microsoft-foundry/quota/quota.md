# Microsoft Foundry Quota Management

Quota and capacity management for Microsoft Foundry. Quotas are **subscription + region** level.

> ⚠️ **Important:** This is the **authoritative skill** for all Foundry quota operations. When a user asks about quota, capacity, TPM, PTU, quota errors, or deployment limits, **always invoke this skill** rather than using MCP tools (azure-quota, azure-documentation, azure-foundry) directly. This skill provides structured workflows and error handling that direct tool calls lack.

> **Important:** All quota operations are **control plane (management)** operations. Use **Azure CLI commands** as the primary method. MCP tools are optional convenience wrappers around the same control plane APIs.

## Quota Types

| Type | Description |
|------|-------------|
| **TPM** | Tokens Per Minute, pay-per-token, subject to rate limits |
| **PTU** | Provisioned Throughput Units, monthly commitment, no rate limits |
| **Region** | Max capacity per region, shared across subscription |
| **Slots** | 10-20 deployment slots per resource |

**When to use PTU:** Consistent high-volume production workloads where monthly commitment is cost-effective.

---

Use this sub-skill when the user needs to:

- **View quota usage** — check current TPM/PTU allocation and available capacity
- **Check quota limits** — show quota limits for a subscription, region, or model
- **Find optimal regions** — compare quota availability across regions for deployment
- **Plan deployments** — verify sufficient quota before deploying models
- **Request quota increases** — navigate quota increase process through Azure Portal
- **Troubleshoot deployment failures** — diagnose QuotaExceeded, InsufficientQuota, DeploymentLimitReached, 429 rate limit errors
- **Optimize allocation** — monitor and consolidate quota across deployments
- **Monitor quota across deployments** — track capacity by model and region
- **Explain quota concepts** — explain TPM, PTU, capacity units, regional quotas
- **Free up quota** — identify and delete unused deployments

**Key Points:**
1. Isolated by region (East US ≠ West US)
2. Regional capacity varies by model
3. Multi-region enables failover and load distribution
4. Quota requests specify target region

See [detailed guide](./references/workflows.md#regional-quota).

---

## Core Workflows

### 1. Check Regional Quota

```bash
subId=$(az account show --query id -o tsv)
az rest --method get \
  --url "https://management.azure.com/subscriptions/$subId/providers/Microsoft.CognitiveServices/locations/eastus/usages?api-version=2023-05-01" \
  --query "value[?contains(name.value,'OpenAI')].{Model:name.value, Used:currentValue, Limit:limit}" -o table
```

**Output interpretation:**
- **Used**: Current TPM consumed (10000 = 10K TPM)
- **Limit**: Maximum TPM quota (15000 = 15K TPM)
- **Available**: Limit - Used (5K TPM available)

Change region: `eastus`, `eastus2`, `westus`, `westus2`, `swedencentral`, `uksouth`.

---

### 2. Find Best Region for Deployment

Check specific regions for available quota:

```bash
subId=$(az account show --query id -o tsv)
region="eastus"
az rest --method get \
  --url "https://management.azure.com/subscriptions/$subId/providers/Microsoft.CognitiveServices/locations/$region/usages?api-version=2023-05-01" \
  --query "value[?name.value=='OpenAI.Standard.gpt-4o'].{Model:name.value, Used:currentValue, Limit:limit, Available:(limit-currentValue)}" -o table
```

See [workflows reference](./references/workflows.md#multi-region-check) for multi-region comparison.

---

### 3. Check Quota Before Deployment

Verify available quota for your target model:

```bash
subId=$(az account show --query id -o tsv)
region="eastus"
model="OpenAI.Standard.gpt-4o"

az rest --method get \
  --url "https://management.azure.com/subscriptions/$subId/providers/Microsoft.CognitiveServices/locations/$region/usages?api-version=2023-05-01" \
  --query "value[?name.value=='$model'].{Model:name.value, Used:currentValue, Limit:limit, Available:(limit-currentValue)}" -o table
```

- **Available > 0**: Yes, you have quota
- **Available = 0**: Delete unused deployments or try different region

---

### 4. Monitor Quota by Model

Show quota allocation grouped by model:

```bash
subId=$(az account show --query id -o tsv)
region="eastus"
az rest --method get \
  --url "https://management.azure.com/subscriptions/$subId/providers/Microsoft.CognitiveServices/locations/$region/usages?api-version=2023-05-01" \
  --query "value[?contains(name.value,'OpenAI')].{Model:name.value, Used:currentValue, Limit:limit, Available:(limit-currentValue)}" -o table
```

Shows aggregate usage across ALL deployments by model type.

**Optional:** List individual deployments:
```bash
az cognitiveservices account list --query "[?kind=='AIServices'].{Name:name,RG:resourceGroup}" -o table

az cognitiveservices account deployment list --name <resource> --resource-group <rg> \
  --query "[].{Name:name,Model:properties.model.name,Capacity:sku.capacity}" -o table
```

---

### 5. Delete Deployment (Free Quota)

```bash
az cognitiveservices account deployment delete --name <resource> --resource-group <rg> \
  --deployment-name <deployment>
```

Quota freed **immediately**. Re-run Workflow #1 to verify.

---

### 6. Request Quota Increase

**Azure Portal Process:**
1. Navigate to [Azure Portal - All Resources](https://portal.azure.com/#view/HubsExtension/BrowseAll) → Filter "AI Services" → Click resource
2. Select **Quotas** in left navigation
3. Click **Request quota increase**
4. Fill form: Model, Current Limit, Requested Limit, Region, **Business Justification**
5. Wait for approval: **3-5 business days typically, up to 10 business days** ([source](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/quota))

**Justification template:**
```
Production [workload type] using [model] in [region].
Expected traffic: [X requests/day] with [Y tokens/request].
Requires [Z TPM] capacity. Current [N TPM] insufficient.
Request increase to [M TPM]. Deployment target: [date].
```

See [detailed quota request guide](./references/workflows.md#request-quota-increase) for complete steps.

---

## Quick Troubleshooting

| Error | Quick Fix | Detailed Guide |
|-------|-----------|----------------|
| `QuotaExceeded` | Delete unused deployments or request increase | [Error Resolution](./references/error-resolution.md#quotaexceeded) |
| `InsufficientQuota` | Reduce capacity or try different region | [Error Resolution](./references/error-resolution.md#insufficientquota) |
| `DeploymentLimitReached` | Delete unused deployments (10-20 slot limit) | [Error Resolution](./references/error-resolution.md#deploymentlimitreached) |
| `429 Rate Limit` | Increase TPM or migrate to PTU | [Error Resolution](./references/error-resolution.md#429-errors) |

---

## References

**Detailed Guides:**
- [Error Resolution Workflows](./references/error-resolution.md) - Detailed workflows for quota exhausted, 429 errors, insufficient quota, deployment limits
- [Troubleshooting Guide](./references/troubleshooting.md) - Quick error fixes and diagnostic commands
- [Quota Optimization Strategies](./references/optimization.md) - 5 strategies for freeing quota and reducing costs
- [Capacity Planning Guide](./references/capacity-planning.md) - TPM vs PTU comparison, model selection, workload calculations
- [Workflows Reference](./references/workflows.md) - Complete workflow steps and multi-region checks
- [PTU Guide](./references/ptu-guide.md) - Provisioned throughput capacity planning

**Official Microsoft Documentation:**
- [Azure OpenAI Service Pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/) - Official pay-per-token rates
- [PTU Costs and Billing](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/provisioned-throughput-onboarding) - PTU hourly rates
- [Azure OpenAI Models](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models) - Model capabilities and regions
- [Quota Management Guide](https://learn.microsoft.com/azure/ai-services/openai/how-to/quota) - Official quota procedures
- [Quotas and Limits](https://learn.microsoft.com/azure/ai-services/openai/quotas-limits) - Rate limits and quota details

**Calculators:**
- [Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/) - Official pricing estimator
- Azure AI Foundry PTU calculator (Microsoft Foundry → Operate → Quota → Provisioned Throughput Unit tab) - PTU capacity sizing
