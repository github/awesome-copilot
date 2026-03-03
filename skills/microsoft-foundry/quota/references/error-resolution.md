# Error Resolution Workflows

## Workflow 7: Quota Exhausted Recovery

**A. Deploy to Different Region**
```bash
subId=$(az account show --query id -o tsv)
for region in eastus westus eastus2 westus2 swedencentral uksouth; do
  az rest --method get --url "https://management.azure.com/subscriptions/$subId/providers/Microsoft.CognitiveServices/locations/$region/usages?api-version=2023-05-01" \
    --query "value[?name.value=='OpenAI.Standard.gpt-4o'].{Model:name.value, Used:currentValue, Limit:limit, Available:(limit-currentValue)}" -o table &
done; wait
```

**B. Delete Unused Deployments**
```bash
az cognitiveservices account deployment delete --name <resource> --resource-group <rg> --deployment-name <deployment>
```

**C. Request Quota Increase (3-5 days)**

**D. Migrate to PTU** - See capacity-planning.md

---

## Workflow 8: Resolve 429 Rate Limit Errors

**Identify Deployment:**
```bash
az cognitiveservices account deployment list --name <resource> --resource-group <rg> \
  --query "[].{Name:name,Model:properties.model.name,TPM:sku.capacity*1000}" -o table
```

**Solutions:**

**A. Increase Capacity**
```bash
az cognitiveservices account deployment update --name <resource> --resource-group <rg> --deployment-name <deployment> --sku-capacity 100
```

**B. Add Retry Logic** - Exponential backoff in code

**C. Load Balance**
```bash
az cognitiveservices account deployment create --name <resource> --resource-group <rg> --deployment-name gpt-4o-2 \
  --model-name gpt-4o --model-version "2024-05-13" --model-format OpenAI --sku-name Standard --sku-capacity 100
```

**D. Migrate to PTU** - No rate limits

---

## Workflow 9: Resolve DeploymentLimitReached

**Root Cause:** 10-20 slots per resource.

**Check Count:**
```bash
deployment_count=$(az cognitiveservices account deployment list --name <resource> --resource-group <rg> --query "length(@)")
echo "Deployments: $deployment_count / ~20 slots"
```

**Find Test Deployments:**
```bash
az cognitiveservices account deployment list --name <resource> --resource-group <rg> \
  --query "[?contains(name,'test') || contains(name,'demo')].{Name:name}" -o table
```

**Delete:**
```bash
az cognitiveservices account deployment delete --name <resource> --resource-group <rg> --deployment-name <deployment>
```

**Or Create New Resource (fresh 10-20 slots):**
```bash
az cognitiveservices account create --name "my-foundry-2" --resource-group <rg> --location eastus --kind AIServices --sku S0 --yes
```

---

## Workflow 10: Resolve InsufficientQuota

**Root Cause:** Requested capacity exceeds available quota.

**Check Quota:**
```bash
subId=$(az account show --query id -o tsv)
az rest --method get --url "https://management.azure.com/subscriptions/$subId/providers/Microsoft.CognitiveServices/locations/eastus/usages?api-version=2023-05-01" \
  --query "value[?contains(name.value,'OpenAI')].{Model:name.value, Used:currentValue, Limit:limit, Available:(limit-currentValue)}" -o table
```

**Solutions:**

**A. Reduce Capacity**
```bash
az cognitiveservices account deployment create --name <resource> --resource-group <rg> --deployment-name gpt-4o \
  --model-name gpt-4o --model-version "2024-05-13" --model-format OpenAI --sku-name Standard --sku-capacity 20
```

**B. Delete Unused Deployments**
```bash
az cognitiveservices account deployment delete --name <resource> --resource-group <rg> --deployment-name <unused>
```

**C. Different Region** - Check quota with multi-region script (Workflow 7)

**D. Request Increase (3-5 days)**

---

## Workflow 11: Resolve QuotaExceeded

**Root Cause:** Deployment exceeds regional quota.

**Check Quota:**
```bash
subId=$(az account show --query id -o tsv)
az rest --method get --url "https://management.azure.com/subscriptions/$subId/providers/Microsoft.CognitiveServices/locations/eastus/usages?api-version=2023-05-01" \
  --query "value[?contains(name.value,'OpenAI')]" -o table
```

**Multi-Region Check:** (Use Workflow 7 script)

**Solutions:**

**A. Delete Unused Deployments**
```bash
az cognitiveservices account deployment delete --name <resource> --resource-group <rg> --deployment-name <unused>
```

**B. Different Region**
```bash
az cognitiveservices account deployment create --name <resource> --resource-group <rg> --deployment-name gpt-4o \
  --model-name gpt-4o --model-version "2024-05-13" --model-format OpenAI --sku-name Standard --sku-capacity 50
```

**C. Request Increase (3-5 days)**

**D. Reduce Capacity**

**Decision:** Available < 10% → Different region; 10-50% → Delete/reduce; > 50% → Delete one deployment

---

