# Troubleshooting Quota Errors

## Common Quota Errors

| Error | Cause | Quick Fix |
|-------|-------|-----------|
| `QuotaExceeded` | Regional quota consumed (TPM or PTU) | Delete unused deployments or request increase |
| `InsufficientQuota` | Not enough available for requested capacity | Reduce deployment capacity or free quota |
| `DeploymentLimitReached` | Too many deployment slots used | Delete unused deployments to free slots |
| `429 Rate Limit` | TPM capacity too low for traffic (Standard only) | Increase TPM capacity or migrate to PTU |
| `PTU capacity unavailable` | No PTU quota in region | Request PTU quota or try different region |
| `SKU not supported` | PTU not available for model/region | Check model availability or use Standard TPM |

## Detailed Error Resolution

### QuotaExceeded Error

All available TPM or PTU quota consumed in the region.

**Resolution:**

1. **Check current quota usage:**
   ```bash
   subId=$(az account show --query id -o tsv)
   region="eastus"
   az rest --method get \
     --url "https://management.azure.com/subscriptions/$subId/providers/Microsoft.CognitiveServices/locations/$region/usages?api-version=2023-05-01" \
     --query "value[?contains(name.value,'OpenAI')].{Model:name.value, Used:currentValue, Limit:limit}" -o table
   ```

2. **Choose resolution:**
   - **Option A**: Delete unused deployments to free quota
   - **Option B**: Reduce requested deployment capacity
   - **Option C**: Deploy to different region with available quota
   - **Option D**: Request quota increase through Azure Portal

### InsufficientQuota Error

Available quota less than requested capacity.

**Resolution:**

1. **Check available quota:**
   ```bash
   # Calculate available: limit - currentValue
   subId=$(az account show --query id -o tsv)
   region="eastus"
   az rest --method get \
     --url "https://management.azure.com/subscriptions/$subId/providers/Microsoft.CognitiveServices/locations/$region/usages?api-version=2023-05-01" \
     --query "value[?name.value=='OpenAI.Standard.gpt-4o'].{Model:name.value, Used:currentValue, Limit:limit, Available:(limit-currentValue)}" -o table
   ```

2. **Options:**
   - Reduce deployment capacity to fit available quota
   - Delete existing deployments to free capacity
   - Try different region with more available quota
   - Request quota increase

### DeploymentLimitReached Error

Resource reached maximum deployment slot limit (10-20 slots).

**Resolution:**

1. **List existing deployments:**
   ```bash
   az cognitiveservices account deployment list \
     --name <resource-name> \
     --resource-group <rg> \
     --query '[].{Name:name, Model:properties.model.name, Capacity:sku.capacity}' \
     --output table
   ```

2. **Delete unused deployments:**
   ```bash
   az cognitiveservices account deployment delete \
     --name <resource-name> \
     --resource-group <rg> \
     --deployment-name <unused-deployment-name>
   ```

3. **Verify slot freed:**
   ```bash
   az cognitiveservices account deployment list \
     --name <resource-name> \
     --resource-group <rg> \
     --query 'length([])'
   ```

### 429 Rate Limit Errors

TPM capacity insufficient for traffic volume (Standard TPM only).

**Resolution:**

1. **Check deployment capacity:**
   ```bash
   az cognitiveservices account deployment show \
     --name <resource-name> \
     --resource-group <rg> \
     --deployment-name <deployment-name> \
     --query '{Name:name, Model:properties.model.name, Capacity:sku.capacity, SKU:sku.name}'
   ```

2. **Options:**
   - **Option A**: Increase TPM capacity on existing deployment
     ```bash
     az cognitiveservices account deployment update \
       --name <resource-name> \
       --resource-group <rg> \
       --deployment-name <deployment-name> \
       --sku-capacity <higher-capacity>
     ```
   - **Option B**: Migrate to PTU for guaranteed throughput (no rate limits)
   - **Option C**: Implement retry logic with exponential backoff in application

### PTU Capacity Unavailable Error

No PTU quota allocated in region, or PTU not available for model/region.

**Resolution:**

1. **Check PTU quota:**
   ```bash
   subId=$(az account show --query id -o tsv)
   region="eastus"
   az rest --method get \
     --url "https://management.azure.com/subscriptions/$subId/providers/Microsoft.CognitiveServices/locations/$region/usages?api-version=2023-05-01" \
     --query "value[?contains(name.value,'ProvisionedManaged')].{Model:name.value, Used:currentValue, Limit:limit}" -o table
   ```

2. **Options:**
   - Request PTU quota increase through Azure Portal (include capacity calculator results)
   - Try different region where PTU is available
   - Use Standard TPM instead

### SKU Not Supported Error

PTU not available for specific model or region combination.

**Resolution:**

1. **Check model availability:**
   - Review [PTU model availability by region](https://learn.microsoft.com/azure/ai-services/openai/concepts/models#provisioned-deployment-model-availability)

2. **Options:**
   - Deploy with Standard TPM SKU instead
   - Choose different region where PTU is supported
   - Use alternative model that supports PTU in your region

## Request Quota Increase Process

### For Standard TPM Quota

1. Navigate to Azure Portal → Your Foundry resource → **Quotas**
2. Identify model needing increase (e.g., "GPT-4o Standard")
3. Click **Request quota increase**
4. Fill form:
   - Model name
   - Requested quota (in TPM)
   - Business justification (required)
5. Submit and monitor status

**Processing Time:** Typically 1-2 business days

### For PTU Quota

1. Navigate to Azure Portal → Your Foundry resource → **Quotas**
2. Select **Provisioned throughput unit** tab
3. Identify model needing PTU increase
4. Click **Request quota increase**
5. Fill form:
   - Model name
   - Requested PTU quota
   - Include capacity calculator results
   - Detailed business justification (workload characteristics)
6. Submit and monitor status

**Processing Time:** Typically 3-5 business days (requires stronger justification)

## Diagnostic Commands

```bash
# Check deployment status
az cognitiveservices account deployment show \
  --name <resource-name> \
  --resource-group <rg> \
  --deployment-name <deployment-name>

# Verify available quota
subId=$(az account show --query id -o tsv)
az rest --method get \
  --url "https://management.azure.com/subscriptions/$subId/providers/Microsoft.CognitiveServices/locations/eastus/usages?api-version=2023-05-01" \
  --query "value[?contains(name.value,'OpenAI')].{Model:name.value, Used:currentValue, Limit:limit, Available:(limit-currentValue)}" \
  --output table

# List all deployments
az cognitiveservices account deployment list \
  --name <resource-name> \
  --resource-group <rg> \
  --query '[].{Name:name, Model:properties.model.name, Capacity:sku.capacity, SKU:sku.name}' \
  --output table
```

## External Resources

- [Quota Management Documentation](https://learn.microsoft.com/azure/ai-services/openai/how-to/quota)
- [Rate Limits Documentation](https://learn.microsoft.com/azure/ai-services/openai/quotas-limits)
- [Troubleshooting Guide](https://learn.microsoft.com/azure/ai-services/openai/troubleshooting)
