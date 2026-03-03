# Provisioned Throughput Units (PTU) Guide

## Understanding PTU vs Standard TPM

Microsoft Foundry offers two quota types:

### Standard TPM (Tokens Per Minute)
- Pay-as-you-go model, charged per token
- Each deployment consumes capacity units (e.g., 10K TPM, 50K TPM)
- Total regional quota shared across all deployments
- Subject to rate limiting during high demand (429 errors possible)
- Best for: Variable workloads, development, testing, bursty traffic

### Provisioned Throughput Units (PTU)
- Monthly commitment for guaranteed throughput
- No rate limiting, consistent latency
- Measured in PTU units (not TPM)
- Best for: Predictable, high-volume production workloads
- More cost-effective when consistent token usage justifies monthly commitment

## When to Use PTU

| Factor | Standard (TPM) | Provisioned (PTU) |
|--------|----------------|-------------------|
| **Best For** | Variable workloads, development, testing | Predictable production workloads |
| **Pricing** | Pay-per-token | Monthly commitment (hourly rate per PTU) |
| **Rate Limits** | Yes (429 errors possible) | No (guaranteed throughput) |
| **Latency** | Variable | Consistent |
| **Cost Decision** | Lower upfront commitment | More economical for consistent, high-volume usage |
| **Flexibility** | Scale up/down instantly | Requires planning and commitment |
| **Use Case** | Prototyping, bursty traffic | Production apps, high-volume APIs |

**Use PTU when:**
- Consistent, predictable token usage where monthly commitment is cost-effective
- Need guaranteed throughput (no 429 rate limit errors)
- Require consistent latency with performance SLA
- High-volume production workloads with stable traffic patterns

**Decision Guidance:**
Compare your current pay-as-you-go costs with PTU pricing. PTU may be more economical when consistent usage justifies the monthly commitment.

## PTU Capacity Planning

### Official Calculation Methods

> **Agent Instruction:** Only present official Azure capacity calculator methods below. Do NOT generate or suggest estimated PTU formulas, TPM-per-PTU conversion tables, or reference deprecated calculators (oai.azure.com/portal/calculator).

Calculate PTU requirements using these official methods:

**Method 1: Microsoft Foundry Portal**
1. Navigate to Microsoft Foundry portal
2. Go to **Operate** → **Quota**
3. Select **Provisioned throughput unit** tab
4. Click **Capacity calculator** button
5. Enter workload parameters (model, tokens/call, RPM, latency target)
6. Calculator returns exact PTU count needed

**Method 2: Using Azure REST API**
```bash
# Calculate required PTU capacity
curl -X POST "https://management.azure.com/subscriptions/<subscription-id>/providers/Microsoft.CognitiveServices/calculateModelCapacity?api-version=2024-10-01" \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": {
      "format": "OpenAI",
      "name": "gpt-4o",
      "version": "2024-05-13"
    },
    "workload": {
      "requestPerMin": 100,
      "tokensPerMin": 50000,
      "peakRequestsPerMin": 150
    }
  }'
```

## Deploy Model with PTU

### Step 1: Calculate PTU Requirements

Use the official capacity calculator methods above to determine required PTU capacity.

### Step 2: Deploy with PTU

```bash
# Deploy model with calculated PTU capacity
az cognitiveservices account deployment create \
  --name <resource-name> \
  --resource-group <rg> \
  --deployment-name gpt-4o-ptu-deployment \
  --model-name gpt-4o \
  --model-version "2024-05-13" \
  --model-format OpenAI \
  --sku-name ProvisionedManaged \
  --sku-capacity 100

# Check PTU deployment status
az cognitiveservices account deployment show \
  --name <resource-name> \
  --resource-group <rg> \
  --deployment-name gpt-4o-ptu-deployment
```

**Key Differences from Standard TPM:**
- SKU name: `ProvisionedManaged` (not `Standard`)
- Capacity: Measured in PTU units (not K TPM)
- Billing: Monthly commitment regardless of usage
- No rate limiting (guaranteed throughput)

## Request PTU Quota Increase

PTU quota is separate from TPM quota and requires specific justification:

1. Navigate to Azure Portal → Foundry resource → **Quotas**
2. Select **Provisioned throughput unit** tab
3. Identify model needing PTU increase (e.g., "GPT-4o PTU")
4. Click **Request quota increase**
5. Fill form:
   - Model name
   - Requested PTU quota
   - Include capacity calculator results in business justification
   - Explain workload characteristics (volume, latency requirements)
6. Submit and monitor status

**Processing Time:** Typically 3-5 business days (longer than standard quota requests)
**Note:** PTU quota requests typically require stronger business justification due to commitment nature

**Alternative:** Deploy to different region with available PTU quota

## Understanding Region and Deployment Quotas

### Region Quota
- Maximum PTU capacity available in an Azure region
- Varies by model type (GPT-4, GPT-4o, etc.)
- Shared across subscription resources in same region
- Separate from TPM quota (you have both TPM and PTU quotas)

### Deployment Slots
- Number of concurrent model deployments allowed
- Typically 10-20 slots per resource
- Each PTU deployment uses one slot (same as TPM deployments)
- Deployment count limit is independent of capacity

## External Resources

- [Understanding PTU Costs](https://learn.microsoft.com/azure/ai-foundry/openai/how-to/provisioned-throughput-onboarding)
- [What Is Provisioned Throughput](https://learn.microsoft.com/azure/ai-foundry/openai/concepts/provisioned-throughput)
- [Calculate Model Capacity API](https://learn.microsoft.com/rest/api/aiservices/accountmanagement/calculate-model-capacity/calculate-model-capacity?view=rest-aiservices-accountmanagement-2024-10-01&tabs=HTTP)
- [PTU Overview](https://learn.microsoft.com/azure/ai-services/openai/concepts/provisioned-throughput)
