# Detailed Workflows: Quota Management

## Workflow 1: View Current Quota Usage - Detailed Steps

### Step 1: Show Regional Quota Summary (REQUIRED APPROACH)

> **CRITICAL AGENT INSTRUCTION:**
> - When showing quota: Query REGIONAL quota summary, NOT individual resources
> - DO NOT run `az cognitiveservices account list` for quota queries
> - DO NOT filter resources by username or name patterns
> - ONLY check specific resource deployments if user provides resource name
> - Quotas are managed at SUBSCRIPTION + REGION level, NOT per-resource

**Show Regional Quota Summary:**

```bash
# Get subscription ID
subId=$(az account show --query id -o tsv)

# Check quota for key regions
regions=("eastus" "eastus2" "westus" "westus2")
for region in "${regions[@]}"; do
  echo "=== Region: $region ==="
  az rest --method get \
    --url "https://management.azure.com/subscriptions/$subId/providers/Microsoft.CognitiveServices/locations/$region/usages?api-version=2023-05-01" \
    --query "value[?contains(name.value,'OpenAI.Standard')].{Model:name.value, Used:currentValue, Limit:limit, Available:(limit-currentValue)}" \
    --output table
  echo ""
done
```

### Step 2: If User Asks for Specific Resource (ONLY IF EXPLICITLY REQUESTED)

```bash
# User must provide resource name
az cognitiveservices account deployment list \
  --name <user-provided-resource-name> \
  --resource-group <user-provided-rg> \
  --query '[].{Name:name, Model:properties.model.name, Capacity:sku.capacity, SKU:sku.name}' \
  --output table
```

**Alternative - Use MCP Tools (Optional Wrappers):**
```
foundry_models_deployments_list(
  resource-group="<rg>",
  azure-ai-services="<resource-name>"
)
```
*Note: MCP tools are convenience wrappers around the same control plane APIs shown above.*

**Interpreting Results:**
- `Used` (currentValue): Currently allocated quota
- `Limit`: Maximum quota available in region
- `Available`: Calculated as `limit - currentValue`

## Workflow 2: Find Best Region for Model Deployment - Detailed Steps

### Step 1: Check Single Region

```bash
# Get subscription ID
subId=$(az account show --query id -o tsv)

# Check quota for GPT-4o Standard in a specific region
region="eastus"  # Change to your target region
az rest --method get \
  --url "https://management.azure.com/subscriptions/$subId/providers/Microsoft.CognitiveServices/locations/$region/usages?api-version=2023-05-01" \
  --query "value[?name.value=='OpenAI.Standard.gpt-4o'].{Model:name.value, Used:currentValue, Limit:limit, Available:(limit-currentValue)}" \
  -o table
```

### Step 2: Check Multiple Regions (Common Regions)

Check these regions in sequence by changing the `region` variable:
- `eastus`, `eastus2` - US East Coast
- `westus`, `westus2`, `westus3` - US West Coast
- `swedencentral` - Europe (Sweden)
- `canadacentral` - Canada
- `uksouth` - UK
- `japaneast` - Asia Pacific

**Alternative - Use MCP Tool:**
```
model_quota_list(region="eastus")
```
Repeat for each target region.

**Key Points:**
- Query returns `currentValue` (used), `limit` (max), and calculated `Available`
- Standard SKU format: `OpenAI.Standard.<model-name>`
- For PTU: `OpenAI.ProvisionedManaged.<model-name>`
- Focus on 2-3 regions relevant to your location rather than checking all regions

## Workflow 3: Check Quota Before Deployment - Detailed Steps

**Steps:**
1. Check current usage (workflow #1)
2. Calculate available: `limit - currentValue`
3. Compare: `available >= required_capacity`
4. If insufficient: Use workflow #2 to find region with capacity, or request increase

## Workflow 4: Monitor Quota Across Deployments - Detailed Steps

**Recommended Approach - Regional Quota Overview:**

Show quota by region (better than listing all resources):

```bash
subId=$(az account show --query id -o tsv)
regions=("eastus" "eastus2" "westus" "westus2" "swedencentral")

for region in "${regions[@]}"; do
  echo "=== Region: $region ==="
  az rest --method get \
    --url "https://management.azure.com/subscriptions/$subId/providers/Microsoft.CognitiveServices/locations/$region/usages?api-version=2023-05-01" \
    --query "value[?contains(name.value,'OpenAI')].{Model:name.value, Used:currentValue, Limit:limit, Available:(limit-currentValue)}" \
    --output table
  echo ""
done
```

**Alternative - Check Specific Resource:**

If user wants to monitor a specific resource, ask for resource name first:

```bash
# List deployments for specific resource
az cognitiveservices account deployment list \
  --name <resource-name> \
  --resource-group <rg> \
  --query '[].{Name:name, Model:properties.model.name, Capacity:sku.capacity}' \
  --output table
```

> **Note:** Don't automatically iterate through all resources in the subscription. Show regional quota summary or ask for specific resource name.

## Quick Command Reference

```bash
# View quota for specific model using REST API
subId=$(az account show --query id -o tsv)
region="eastus"  # Change to your region
az rest --method get \
  --url "https://management.azure.com/subscriptions/$subId/providers/Microsoft.CognitiveServices/locations/$region/usages?api-version=2023-05-01" \
  --query "value[?contains(name.value,'gpt-4')].{Name:name.value, Used:currentValue, Limit:limit, Available:(limit-currentValue)}" \
  --output table

# List all deployments with capacity
az cognitiveservices account deployment list \
  --name <resource-name> \
  --resource-group <rg> \
  --query '[].{Name:name, Model:properties.model.name, Capacity:sku.capacity}' \
  --output table

# Delete deployment to free quota
az cognitiveservices account deployment delete \
  --name <resource-name> \
  --resource-group <rg> \
  --deployment-name <deployment-name>
```

## MCP Tools Reference (Optional Wrappers)

**Note:** All quota operations are control plane (management) operations. MCP tools are optional convenience wrappers around Azure CLI commands.

| Tool | Purpose | Equivalent Azure CLI |
|------|---------|---------------------|
| `foundry_models_deployments_list` | List all deployments with capacity | `az cognitiveservices account deployment list` |
| `model_quota_list` | List quota and usage across regions | `az rest` (Management API) |
| `model_catalog_list` | List available models from catalog | `az rest` (Management API) |
| `foundry_resource_get` | Get resource details and endpoint | `az cognitiveservices account show` |

**Recommended:** Use Azure CLI commands directly for control plane operations.
