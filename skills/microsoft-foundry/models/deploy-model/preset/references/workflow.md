# Preset Deployment Workflow — Step-by-Step

Condensed implementation reference for preset (optimal region) model deployment. See [SKILL.md](../SKILL.md) for overview.

---

## Phase 1: Verify Authentication

```bash
az account show --query "{Subscription:name, User:user.name}" -o table
```

If not logged in: `az login`

Switch subscription:

```bash
az account list --query "[].[name,id,state]" -o table
az account set --subscription <subscription-id>
```

---

## Phase 2: Get Current Project

Read `PROJECT_RESOURCE_ID` from env or prompt user. Format:
`/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.CognitiveServices/accounts/{account}/projects/{project}`

Parse ARM ID components:

```bash
SUBSCRIPTION_ID=$(echo "$PROJECT_RESOURCE_ID" | sed -n 's|.*/subscriptions/\([^/]*\).*|\1|p')
RESOURCE_GROUP=$(echo "$PROJECT_RESOURCE_ID" | sed -n 's|.*/resourceGroups/\([^/]*\).*|\1|p')
ACCOUNT_NAME=$(echo "$PROJECT_RESOURCE_ID" | sed -n 's|.*/accounts/\([^/]*\)/projects.*|\1|p')
PROJECT_NAME=$(echo "$PROJECT_RESOURCE_ID" | sed -n 's|.*/projects/\([^/?]*\).*|\1|p')
```

Verify project exists and get region:

```bash
az account set --subscription "$SUBSCRIPTION_ID"

PROJECT_REGION=$(az cognitiveservices account show \
  --name "$PROJECT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query location -o tsv)
```

---

## Phase 3: Get Model Name

If model not provided as parameter, list available models:

```bash
az cognitiveservices account list-models \
  --name "$PROJECT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "[].name" -o tsv | sort -u
```

Get versions for selected model:

```bash
az cognitiveservices account list-models \
  --name "$PROJECT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "[?name=='$MODEL_NAME'].{Name:name, Version:version, Format:format}" \
  -o table
```

---

## Phase 4: Check Current Region Capacity

```bash
CAPACITY_JSON=$(az rest --method GET \
  --url "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/providers/Microsoft.CognitiveServices/locations/$PROJECT_REGION/modelCapacities?api-version=2024-10-01&modelFormat=OpenAI&modelName=$MODEL_NAME&modelVersion=$MODEL_VERSION")

CURRENT_CAPACITY=$(echo "$CAPACITY_JSON" | jq -r '.value[] | select(.properties.skuName=="GlobalStandard") | .properties.availableCapacity')
```

If `CURRENT_CAPACITY > 0` → skip to Phase 7. Otherwise continue to Phase 5.

---

## Phase 5: Query Multi-Region Capacity

```bash
ALL_REGIONS_JSON=$(az rest --method GET \
  --url "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/providers/Microsoft.CognitiveServices/modelCapacities?api-version=2024-10-01&modelFormat=OpenAI&modelName=$MODEL_NAME&modelVersion=$MODEL_VERSION")
```

Extract available regions (capacity > 0):

```bash
AVAILABLE_REGIONS=$(echo "$ALL_REGIONS_JSON" | jq -r '.value[] | select(.properties.skuName=="GlobalStandard" and .properties.availableCapacity > 0) | "\(.location)|\(.properties.availableCapacity)"')
```

Extract unavailable regions:

```bash
UNAVAILABLE_REGIONS=$(echo "$ALL_REGIONS_JSON" | jq -r '.value[] | select(.properties.skuName=="GlobalStandard" and (.properties.availableCapacity == 0 or .properties.availableCapacity == null)) | "\(.location)|0"')
```

If no regions have capacity, defer to the [quota skill](../../../../quota/quota.md) for increase requests. Suggest checking existing deployments or trying alternative models like `gpt-4o-mini`.

---

## Phase 6: Select Region and Project

Present available regions to user. Store selection as `SELECTED_REGION`.

Find projects in selected region:

```bash
PROJECTS_IN_REGION=$(az cognitiveservices account list \
  --query "[?kind=='AIProject' && location=='$SELECTED_REGION'].{Name:name, ResourceGroup:resourceGroup}" \
  --output json)
```

**If no projects exist — create new:**

```bash
az cognitiveservices account create \
  --name "$HUB_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$SELECTED_REGION" \
  --kind "AIServices" \
  --sku "S0" --yes

az cognitiveservices account create \
  --name "$NEW_PROJECT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$SELECTED_REGION" \
  --kind "AIProject" \
  --sku "S0" --yes
```

---

## Phase 7: Deploy Model

Generate unique deployment name using `scripts/generate_deployment_name.sh`:

```bash
DEPLOYMENT_NAME=$(bash scripts/generate_deployment_name.sh "$ACCOUNT_NAME" "$RESOURCE_GROUP" "$MODEL_NAME")
```

Calculate capacity — 50% of available, minimum 50 TPM:

```bash
SELECTED_CAPACITY=$(echo "$ALL_REGIONS_JSON" | jq -r ".value[] | select(.location==\"$SELECTED_REGION\" and .properties.skuName==\"GlobalStandard\") | .properties.availableCapacity")
DEPLOY_CAPACITY=$(( SELECTED_CAPACITY / 2 ))
[ "$DEPLOY_CAPACITY" -lt 50 ] && DEPLOY_CAPACITY=50
```

Create deployment:

```bash
az cognitiveservices account deployment create \
  --name "$ACCOUNT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --deployment-name "$DEPLOYMENT_NAME" \
  --model-name "$MODEL_NAME" \
  --model-version "$MODEL_VERSION" \
  --model-format "OpenAI" \
  --sku-name "GlobalStandard" \
  --sku-capacity "$DEPLOY_CAPACITY"
```

Monitor with `az cognitiveservices account deployment show ... --query "properties.provisioningState"` until `Succeeded` or `Failed`.
