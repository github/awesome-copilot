# Quota Optimization Strategies

Comprehensive strategies for optimizing Azure AI Foundry quota allocation and reducing costs.

## 1. Identify and Delete Unused Deployments

**Step 1: Discovery with Quota Context**

Get quota limits FIRST to understand how close you are to capacity:

```bash
# Check current quota usage vs limits (run this FIRST)
subId=$(az account show --query id -o tsv)
region="eastus"  # Change to your region
az rest --method get \
  --url "https://management.azure.com/subscriptions/$subId/providers/Microsoft.CognitiveServices/locations/$region/usages?api-version=2023-05-01" \
  --query "value[?contains(name.value,'OpenAI')].{Model:name.value, Used:currentValue, Limit:limit, Available:'(Limit - Used)'}" -o table
```

**Step 2: Parallel Deployment Enumeration**

List all deployments across resources efficiently:

```bash
# Get all Foundry resources
resources=$(az cognitiveservices account list --query "[?kind=='AIServices'].{name:name,rg:resourceGroup}" -o json)

# Parallel deployment enumeration (faster than sequential)
echo "$resources" | jq -r '.[] | "\(.name) \(.rg)"' | while read name rg; do
  echo "=== $name ($rg) ==="
  az cognitiveservices account deployment list --name "$name" --resource-group "$rg" \
    --query "[].{Deployment:name,Model:properties.model.name,Capacity:sku.capacity,Created:systemData.createdAt}" -o table &
done
wait  # Wait for all background jobs to complete
```

**Step 3: Identify Stale Deployments**

Criteria for deletion candidates:

- **Test/temporary naming**: Contains "test", "demo", "temp", "dev" in deployment name
- **Old timestamps**: Created >90 days ago with timestamp-based naming (e.g., "gpt4-20231015")
- **High capacity consumers**: Deployments with >100K TPM capacity that haven't been referenced in recent logs
- **Duplicate models**: Multiple deployments of same model/version in same region

**Example pattern matching for stale deployments:**
```bash
# Find deployments with test/temp naming
az cognitiveservices account deployment list --name <resource> --resource-group <rg> \
  --query "[?contains(name,'test') || contains(name,'demo') || contains(name,'temp')].{Name:name,Capacity:sku.capacity}" -o table
```

**Step 4: Delete and Verify Quota Recovery**

```bash
# Delete unused deployment (quota freed IMMEDIATELY)
az cognitiveservices account deployment delete --name <resource> --resource-group <rg> --deployment-name <deployment>

# Verify quota freed (re-run Step 1 quota check)
# You should see "Used" decrease by the deployment's capacity
```

**Cost Impact Analysis:**

| Deployment Type | Capacity (TPM) | Quota Freed | Cost Impact (TPM) | Cost Impact (PTU) |
|-----------------|----------------|-------------|-------------------|-------------------|
| Test deployment | 10K TPM | 10K TPM | $0 (pay-per-use) | N/A |
| Unused production | 100K TPM | 100K TPM | $0 (pay-per-use) | N/A |
| Abandoned PTU deployment | 100 PTU | ~40K TPM equivalent | $0 TPM | **$3,650/month saved** (100 PTU × 730h × $0.05/h) |
| High-capacity test | 450K TPM | 450K TPM | $0 (pay-per-use) | N/A |

**Key Insight:** For TPM (Standard) deployments, deletion frees quota but has no direct cost impact (you pay per token used). For PTU (Provisioned) deployments, deletion **immediately stops hourly charges** and can save thousands per month.

---

## 2. Right-Size Over-Provisioned Deployments

**Identify over-provisioned deployments:**
- Check Azure Monitor metrics for actual token usage
- Compare allocated TPM vs. peak usage
- Look for deployments with <50% utilization

**Right-sizing example:**
```bash
# Update deployment to lower capacity
az cognitiveservices account deployment update --name <resource> --resource-group <rg> \
  --deployment-name <deployment> --sku-capacity 30  # Reduce from 50K to 30K TPM
```

**Cost Optimization:**
- **TPM (Standard)**: Reduces regional quota consumption (no direct cost savings, pay-per-token)
- **PTU (Provisioned)**: Direct cost reduction (40% capacity reduction = 40% cost reduction)

---

## 3. Consolidate Multiple Small Deployments

**Pattern:** Multiple 10K TPM deployments → One 30-50K TPM deployment

**Benefits:**
- Fewer deployment slots consumed
- Simpler management
- Same total capacity, better utilization

**Example:**
- **Before**: 3 deployments @ 10K TPM each = 30K TPM total, 3 slots used
- **After**: 1 deployment @ 30K TPM = 30K TPM total, 1 slot used
- **Savings**: 2 deployment slots freed for other models

---

## 4. Cost Optimization Strategies

> **Official Documentation**: [Plan to manage costs for Azure OpenAI](https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/manage-costs) and [Fine-tuning cost management](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/fine-tuning-cost-management)

**A. Use Fine-Tuned Smaller Models** (from [Microsoft Transparency Note](https://learn.microsoft.com/en-us/azure/ai-foundry/responsible-ai/openai/transparency-note)):

You can reduce costs or latency by swapping a fine-tuned version of a smaller/faster model (e.g., fine-tuned GPT-3.5-Turbo) for a more general-purpose model (e.g., GPT-4).

```bash
# Deploy fine-tuned GPT-3.5 Turbo as cost-effective alternative to GPT-4
az cognitiveservices account deployment create --name <resource> --resource-group <rg> \
  --deployment-name gpt-35-tuned --model-name <your-fine-tuned-model> \
  --model-format OpenAI --sku-name Standard --sku-capacity 10
```

**B. Remove Unused Fine-Tuned Deployments** (from [Fine-tuning cost management](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/fine-tuning-cost-management)):

Fine-tuned model deployments incur **hourly hosting costs** even when not in use. Remove unused deployments promptly to control costs.

- Inactive deployments unused for **15 consecutive days** are automatically deleted
- Proactively delete unused fine-tuned deployments to avoid hourly charges

```bash
# Delete unused fine-tuned deployment
az cognitiveservices account deployment delete --name <resource> --resource-group <rg> \
  --deployment-name <unused-fine-tuned-deployment>
```

**C. Batch Multiple Requests** (from [Cost optimization Q&A](https://learn.microsoft.com/en-us/answers/questions/1689253/how-to-optimize-costs-per-request-azure-openai-gpt)):

Batch multiple requests together to reduce the total number of API calls and lower overall costs.

**D. Use Commitment Tiers for Predictable Costs** (from [Managing costs guide](https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/manage-costs)):

- **Pay-as-you-go**: Bills according to usage (variable costs)
- **Commitment tiers**: Commit to using service features for a fixed fee (predictable costs, potential savings for consistent usage)

---

## 5. Regional Quota Rebalancing

If you have quota spread across multiple regions but only use some:

```bash
# Check quota across regions
for region in eastus westus uksouth; do
  echo "=== $region ==="
  subId=$(az account show --query id -o tsv)
  az rest --method get \
    --url "https://management.azure.com/subscriptions/$subId/providers/Microsoft.CognitiveServices/locations/$region/usages?api-version=2023-05-01" \
    --query "value[?contains(name.value,'OpenAI')].{Model:name.value, Used:currentValue, Limit:limit}" -o table
done
```

**Optimization:** Concentrate deployments in fewer regions to maximize quota utilization per region.
