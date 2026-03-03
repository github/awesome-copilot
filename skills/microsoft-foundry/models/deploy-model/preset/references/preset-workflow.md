# Preset Deployment Workflow - Detailed Implementation

This file contains the full step-by-step bash/PowerShell scripts for preset (optimal region) model deployment. Referenced from the main [SKILL.md](../SKILL.md).

---

## Phase 1: Verify Authentication

Check if user is logged into Azure CLI:

```bash
az account show --query "{Subscription:name, User:user.name}" -o table
```

**If not logged in:**
```bash
az login
```

**Verify subscription is correct:**
```bash
# List all subscriptions
az account list --query "[].[name,id,state]" -o table

# Set active subscription if needed
az account set --subscription <subscription-id>
```

---

## Phase 2: Get Current Project

**Check for PROJECT_RESOURCE_ID environment variable first:**

```bash
if [ -n "$PROJECT_RESOURCE_ID" ]; then
  echo "Using project resource ID from environment: $PROJECT_RESOURCE_ID"
else
  echo "PROJECT_RESOURCE_ID not set. Please provide your Azure AI Foundry project resource ID."
  echo ""
  echo "You can find this in:"
  echo "  • Azure AI Foundry portal → Project → Overview → Resource ID"
  echo "  • Format: /subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.CognitiveServices/accounts/{account}/projects/{project}"
  echo ""
  echo "Example: /subscriptions/abc123.../resourceGroups/rg-prod/providers/Microsoft.CognitiveServices/accounts/my-account/projects/my-project"
  echo ""
  read -p "Enter project resource ID: " PROJECT_RESOURCE_ID
fi
```

**Parse the ARM resource ID to extract components:**

```bash
# Extract components from ARM resource ID
# Format: /subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.CognitiveServices/accounts/{account}/projects/{project}

SUBSCRIPTION_ID=$(echo "$PROJECT_RESOURCE_ID" | sed -n 's|.*/subscriptions/\([^/]*\).*|\1|p')
RESOURCE_GROUP=$(echo "$PROJECT_RESOURCE_ID" | sed -n 's|.*/resourceGroups/\([^/]*\).*|\1|p')
ACCOUNT_NAME=$(echo "$PROJECT_RESOURCE_ID" | sed -n 's|.*/accounts/\([^/]*\)/projects.*|\1|p')
PROJECT_NAME=$(echo "$PROJECT_RESOURCE_ID" | sed -n 's|.*/projects/\([^/?]*\).*|\1|p')

if [ -z "$SUBSCRIPTION_ID" ] || [ -z "$RESOURCE_GROUP" ] || [ -z "$ACCOUNT_NAME" ] || [ -z "$PROJECT_NAME" ]; then
  echo "❌ Invalid project resource ID format"
  echo "Expected format: /subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.CognitiveServices/accounts/{account}/projects/{project}"
  exit 1
fi

echo "Parsed project details:"
echo "  Subscription: $SUBSCRIPTION_ID"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Account: $ACCOUNT_NAME"
echo "  Project: $PROJECT_NAME"
```

**Verify the project exists and get its region:**

```bash
# Set active subscription
az account set --subscription "$SUBSCRIPTION_ID"

# Get project details to verify it exists and extract region
PROJECT_REGION=$(az cognitiveservices account show \
  --name "$PROJECT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query location -o tsv 2>/dev/null)

if [ -z "$PROJECT_REGION" ]; then
  echo "❌ Project '$PROJECT_NAME' not found in resource group '$RESOURCE_GROUP'"
  echo ""
  echo "Please verify the resource ID is correct."
  echo ""
  echo "List available projects:"
  echo "  az cognitiveservices account list --query \"[?kind=='AIProject'].{Name:name, Location:location, ResourceGroup:resourceGroup}\" -o table"
  exit 1
fi

echo "✓ Project found"
echo "  Region: $PROJECT_REGION"
```

---

## Phase 3: Get Model Name

**If model name provided as skill parameter, skip this phase.**

Ask user which model to deploy. **Fetch available models dynamically** from the account rather than using a hardcoded list:

```bash
# List available models in the account
az cognitiveservices account list-models \
  --name "$PROJECT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "[].name" -o tsv | sort -u
```

Present the results to the user and let them choose, or enter a custom model name.

**Store model:**
```bash
MODEL_NAME="<selected-model>"
```

**Get model version (latest stable):**
```bash
# List available models and versions in the account
az cognitiveservices account list-models \
  --name "$PROJECT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "[?name=='$MODEL_NAME'].{Name:name, Version:version, Format:format}" \
  -o table
```

**Use latest version or let user specify:**
```bash
MODEL_VERSION="<version-or-latest>"
```

**Detect model format:**

```bash
# Get model format from model catalog (e.g., OpenAI, Anthropic, Meta-Llama, Mistral, Cohere)
MODEL_FORMAT=$(az cognitiveservices account list-models \
  --name "$ACCOUNT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "[?name=='$MODEL_NAME'].format" -o tsv | head -1)

# Default to OpenAI if not found
MODEL_FORMAT=${MODEL_FORMAT:-"OpenAI"}

echo "Model format: $MODEL_FORMAT"
```

> 💡 **Model format determines the deployment path:**
> - `OpenAI` — Standard CLI deployment, TPM-based capacity, RAI policies apply
> - `Anthropic` — REST API deployment with `modelProviderData`, capacity=1, no RAI
> - All other formats (`Meta-Llama`, `Mistral`, `Cohere`, etc.) — Standard CLI deployment, capacity=1 (MaaS), no RAI

---

## Phase 4: Check Current Region Capacity

Before checking other regions, see if the current project's region has capacity:

```bash
# Query capacity for current region
CAPACITY_JSON=$(az rest --method GET \
  --url "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/providers/Microsoft.CognitiveServices/locations/$PROJECT_REGION/modelCapacities?api-version=2024-10-01&modelFormat=$MODEL_FORMAT&modelName=$MODEL_NAME&modelVersion=$MODEL_VERSION")

# Extract available capacity for GlobalStandard SKU
CURRENT_CAPACITY=$(echo "$CAPACITY_JSON" | jq -r '.value[] | select(.properties.skuName=="GlobalStandard") | .properties.availableCapacity')
```

**Check result:**
```bash
if [ -n "$CURRENT_CAPACITY" ] && [ "$CURRENT_CAPACITY" -gt 0 ]; then
  echo "✓ Current region ($PROJECT_REGION) has capacity: $CURRENT_CAPACITY TPM"
  echo "Proceeding with deployment..."
  # Skip to Phase 7 (Deploy)
else
  echo "⚠ Current region ($PROJECT_REGION) has no available capacity"
  echo "Checking alternative regions..."
  # Continue to Phase 5
fi
```

---

## Phase 5: Query Multi-Region Capacity (If Needed)

Only execute this phase if current region has no capacity.

**Query capacity across all regions:**
```bash
# Get capacity for all regions in subscription
ALL_REGIONS_JSON=$(az rest --method GET \
  --url "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/providers/Microsoft.CognitiveServices/modelCapacities?api-version=2024-10-01&modelFormat=$MODEL_FORMAT&modelName=$MODEL_NAME&modelVersion=$MODEL_VERSION")

# Save to file for processing
echo "$ALL_REGIONS_JSON" > /tmp/capacity_check.json
```

**Parse and categorize regions:**
```bash
# Extract available regions (capacity > 0)
AVAILABLE_REGIONS=$(jq -r '.value[] | select(.properties.skuName=="GlobalStandard" and .properties.availableCapacity > 0) | "\(.location)|\(.properties.availableCapacity)"' /tmp/capacity_check.json)

# Extract unavailable regions (capacity = 0 or undefined)
UNAVAILABLE_REGIONS=$(jq -r '.value[] | select(.properties.skuName=="GlobalStandard" and (.properties.availableCapacity == 0 or .properties.availableCapacity == null)) | "\(.location)|0"' /tmp/capacity_check.json)
```

**Format and display regions:**
```bash
# Format capacity (e.g., 120000 -> 120K)
format_capacity() {
  local capacity=$1
  if [ "$capacity" -ge 1000000 ]; then
    echo "$(awk "BEGIN {printf \"%.1f\", $capacity/1000000}")M TPM"
  elif [ "$capacity" -ge 1000 ]; then
    echo "$(awk "BEGIN {printf \"%.0f\", $capacity/1000}")K TPM"
  else
    echo "$capacity TPM"
  fi
}

echo ""
echo "⚠ No Capacity in Current Region"
echo ""
echo "The current project's region ($PROJECT_REGION) does not have available capacity for $MODEL_NAME."
echo ""
echo "Available Regions (with capacity):"
echo ""

# Display available regions with formatted capacity
echo "$AVAILABLE_REGIONS" | while IFS='|' read -r region capacity; do
  formatted_capacity=$(format_capacity "$capacity")
  # Get region display name (capitalize and format)
  region_display=$(echo "$region" | sed 's/\([a-z]\)\([a-z]*\)/\U\1\L\2/g; s/\([a-z]\)\([0-9]\)/\1 \2/g')
  echo "  • $region_display - $formatted_capacity"
done

echo ""
echo "Unavailable Regions:"
echo ""

# Display unavailable regions
echo "$UNAVAILABLE_REGIONS" | while IFS='|' read -r region capacity; do
  region_display=$(echo "$region" | sed 's/\([a-z]\)\([a-z]*\)/\U\1\L\2/g; s/\([a-z]\)\([0-9]\)/\1 \2/g')
  if [ "$capacity" = "0" ]; then
    echo "  ✗ $region_display (Insufficient quota - 0 TPM available)"
  else
    echo "  ✗ $region_display (Model not supported)"
  fi
done
```

**Handle no capacity anywhere:**
```bash
if [ -z "$AVAILABLE_REGIONS" ]; then
  echo ""
  echo "❌ No Available Capacity in Any Region"
  echo ""
  echo "No regions have available capacity for $MODEL_NAME with GlobalStandard SKU."
  echo ""
  echo "Next Steps:"
  echo "1. Request quota increase — use the quota skill (../../../quota/quota.md)"
  echo ""
  echo "2. Check existing deployments (may be using quota):"
  echo "   az cognitiveservices account deployment list \\"
  echo "     --name $PROJECT_NAME \\"
  echo "     --resource-group $RESOURCE_GROUP"
  echo ""
  echo "3. Consider alternative models with lower capacity requirements:"
  echo "   • gpt-4o-mini (cost-effective, lower capacity requirements)"
  echo "   List available models: az cognitiveservices account list-models --name \$PROJECT_NAME --resource-group \$RESOURCE_GROUP --output table"
  exit 1
fi
```

---

## Phase 6: Select Region and Project

**Ask user to select region from available options.**

Example using AskUserQuestion:
- Present available regions as options
- Show capacity for each
- User selects preferred region

**Store selection:**
```bash
SELECTED_REGION="<user-selected-region>"  # e.g., "eastus2"
```

**Find projects in selected region:**
```bash
PROJECTS_IN_REGION=$(az cognitiveservices account list \
  --query "[?kind=='AIProject' && location=='$SELECTED_REGION'].{Name:name, ResourceGroup:resourceGroup}" \
  --output json)

PROJECT_COUNT=$(echo "$PROJECTS_IN_REGION" | jq '. | length')

if [ "$PROJECT_COUNT" -eq 0 ]; then
  echo "No projects found in $SELECTED_REGION"
  echo "Would you like to create a new project? (yes/no)"
  # If yes, continue to project creation
  # If no, exit or select different region
else
  echo "Projects in $SELECTED_REGION:"
  echo "$PROJECTS_IN_REGION" | jq -r '.[] | "  • \(.Name) (\(.ResourceGroup))"'
  echo ""
  echo "Select a project or create new project"
fi
```

**Option A: Use existing project**
```bash
PROJECT_NAME="<selected-project-name>"
RESOURCE_GROUP="<resource-group>"
```

**Option B: Create new project**
```bash
# Generate project name
USER_ALIAS=$(az account show --query user.name -o tsv | cut -d'@' -f1 | tr '.' '-')
RANDOM_SUFFIX=$(openssl rand -hex 2)
NEW_PROJECT_NAME="${USER_ALIAS}-aiproject-${RANDOM_SUFFIX}"

# Prompt for resource group
echo "Resource group for new project:"
echo "  1. Use existing resource group: $RESOURCE_GROUP"
echo "  2. Create new resource group"

# If existing resource group
NEW_RESOURCE_GROUP="$RESOURCE_GROUP"

# Create AI Services account (hub)
HUB_NAME="${NEW_PROJECT_NAME}-hub"

echo "Creating AI Services hub: $HUB_NAME in $SELECTED_REGION..."

az cognitiveservices account create \
  --name "$HUB_NAME" \
  --resource-group "$NEW_RESOURCE_GROUP" \
  --location "$SELECTED_REGION" \
  --kind "AIServices" \
  --sku "S0" \
  --yes

# Create AI Foundry project
echo "Creating AI Foundry project: $NEW_PROJECT_NAME..."

az cognitiveservices account create \
  --name "$NEW_PROJECT_NAME" \
  --resource-group "$NEW_RESOURCE_GROUP" \
  --location "$SELECTED_REGION" \
  --kind "AIProject" \
  --sku "S0" \
  --yes

echo "✓ Project created successfully"
PROJECT_NAME="$NEW_PROJECT_NAME"
RESOURCE_GROUP="$NEW_RESOURCE_GROUP"
```

---

## Phase 7: Deploy Model

**Generate unique deployment name:**

The deployment name should match the model name (e.g., "gpt-4o"), but if a deployment with that name already exists, append a numeric suffix (e.g., "gpt-4o-2", "gpt-4o-3"). This follows the same UX pattern as Azure AI Foundry portal.

Use the `generate_deployment_name` script to check existing deployments and generate a unique name:

*Bash version:*
```bash
DEPLOYMENT_NAME=$(bash scripts/generate_deployment_name.sh \
  "$ACCOUNT_NAME" \
  "$RESOURCE_GROUP" \
  "$MODEL_NAME")

echo "Generated deployment name: $DEPLOYMENT_NAME"
```

*PowerShell version:*
```powershell
$DEPLOYMENT_NAME = & .\scripts\generate_deployment_name.ps1 `
  -AccountName $ACCOUNT_NAME `
  -ResourceGroup $RESOURCE_GROUP `
  -ModelName $MODEL_NAME

Write-Host "Generated deployment name: $DEPLOYMENT_NAME"
```

**Calculate deployment capacity:**

Follow UX capacity calculation logic. For OpenAI models, use 50% of available capacity (minimum 50 TPM). For all other models (MaaS), capacity is always 1:

```bash
if [ "$MODEL_FORMAT" = "OpenAI" ]; then
  # OpenAI models: TPM-based capacity (50% of available, minimum 50)
  SELECTED_CAPACITY=$(echo "$ALL_REGIONS_JSON" | jq -r ".value[] | select(.location==\"$SELECTED_REGION\" and .properties.skuName==\"GlobalStandard\") | .properties.availableCapacity")

  if [ "$SELECTED_CAPACITY" -gt 50 ]; then
    DEPLOY_CAPACITY=$((SELECTED_CAPACITY / 2))
    if [ "$DEPLOY_CAPACITY" -lt 50 ]; then
      DEPLOY_CAPACITY=50
    fi
  else
    DEPLOY_CAPACITY=$SELECTED_CAPACITY
  fi

  echo "Deploying with capacity: $DEPLOY_CAPACITY TPM (50% of available: $SELECTED_CAPACITY TPM)"
else
  # Non-OpenAI models (MaaS): capacity is always 1
  DEPLOY_CAPACITY=1
  echo "MaaS model — deploying with capacity: 1 (pay-per-token billing)"
fi
```

### If MODEL_FORMAT is NOT "Anthropic" — Standard CLI Deployment

> 💡 **Note:** The Azure CLI supports all non-Anthropic model formats directly.

*Bash version:*
```bash
echo "Creating deployment..."

az cognitiveservices account deployment create \
  --name "$ACCOUNT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --deployment-name "$DEPLOYMENT_NAME" \
  --model-name "$MODEL_NAME" \
  --model-version "$MODEL_VERSION" \
  --model-format "$MODEL_FORMAT" \
  --sku-name "GlobalStandard" \
  --sku-capacity "$DEPLOY_CAPACITY"
```

*PowerShell version:*
```powershell
Write-Host "Creating deployment..."

az cognitiveservices account deployment create `
  --name $ACCOUNT_NAME `
  --resource-group $RESOURCE_GROUP `
  --deployment-name $DEPLOYMENT_NAME `
  --model-name $MODEL_NAME `
  --model-version $MODEL_VERSION `
  --model-format $MODEL_FORMAT `
  --sku-name "GlobalStandard" `
  --sku-capacity $DEPLOY_CAPACITY
```

> 💡 **Note:** For non-OpenAI MaaS models (Meta-Llama, Mistral, Cohere, etc.), `$DEPLOY_CAPACITY` is `1` (set in capacity calculation above).

### If MODEL_FORMAT is "Anthropic" — REST API Deployment with modelProviderData

The Azure CLI does not support `--model-provider-data`. You must use the ARM REST API directly.

**Step 1: Prompt user to select industry**

Present the following list and ask the user to choose one:

```
 1. None                    (API value: none)
 2. Biotechnology           (API value: biotechnology)
 3. Consulting              (API value: consulting)
 4. Education               (API value: education)
 5. Finance                 (API value: finance)
 6. Food & Beverage         (API value: food_and_beverage)
 7. Government              (API value: government)
 8. Healthcare              (API value: healthcare)
 9. Insurance               (API value: insurance)
10. Law                     (API value: law)
11. Manufacturing           (API value: manufacturing)
12. Media                   (API value: media)
13. Nonprofit               (API value: nonprofit)
14. Technology              (API value: technology)
15. Telecommunications      (API value: telecommunications)
16. Sport & Recreation      (API value: sport_and_recreation)
17. Real Estate             (API value: real_estate)
18. Retail                  (API value: retail)
19. Other                   (API value: other)
```

> ⚠️ **Do NOT pick a default industry or hardcode a value. Always ask the user.** This is required by Anthropic's terms of service. The industry list is static — there is no REST API that provides it.

Store selection as `SELECTED_INDUSTRY` (use the API value, e.g., `technology`).

**Step 2: Fetch tenant info (country code and organization name)**

```bash
TENANT_INFO=$(az rest --method GET \
  --url "https://management.azure.com/tenants?api-version=2024-11-01" \
  --query "value[0].{countryCode:countryCode, displayName:displayName}" -o json)

COUNTRY_CODE=$(echo "$TENANT_INFO" | jq -r '.countryCode')
ORG_NAME=$(echo "$TENANT_INFO" | jq -r '.displayName')
```

*PowerShell version:*
```powershell
$tenantInfo = az rest --method GET `
  --url "https://management.azure.com/tenants?api-version=2024-11-01" `
  --query "value[0].{countryCode:countryCode, displayName:displayName}" -o json | ConvertFrom-Json

$countryCode = $tenantInfo.countryCode
$orgName = $tenantInfo.displayName
```

**Step 3: Deploy via ARM REST API**

*Bash version:*
```bash
echo "Creating Anthropic model deployment via REST API..."

az rest --method PUT \
  --url "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.CognitiveServices/accounts/$ACCOUNT_NAME/deployments/$DEPLOYMENT_NAME?api-version=2024-10-01" \
  --body "{
    \"sku\": {
      \"name\": \"GlobalStandard\",
      \"capacity\": 1
    },
    \"properties\": {
      \"model\": {
        \"format\": \"Anthropic\",
        \"name\": \"$MODEL_NAME\",
        \"version\": \"$MODEL_VERSION\"
      },
      \"modelProviderData\": {
        \"industry\": \"$SELECTED_INDUSTRY\",
        \"countryCode\": \"$COUNTRY_CODE\",
        \"organizationName\": \"$ORG_NAME\"
      }
    }
  }"
```

*PowerShell version:*
```powershell
Write-Host "Creating Anthropic model deployment via REST API..."

$body = @{
    sku = @{
        name = "GlobalStandard"
        capacity = 1
    }
    properties = @{
        model = @{
            format = "Anthropic"
            name = $MODEL_NAME
            version = $MODEL_VERSION
        }
        modelProviderData = @{
            industry = $SELECTED_INDUSTRY
            countryCode = $countryCode
            organizationName = $orgName
        }
    }
} | ConvertTo-Json -Depth 5

az rest --method PUT `
  --url "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.CognitiveServices/accounts/$ACCOUNT_NAME/deployments/${DEPLOYMENT_NAME}?api-version=2024-10-01" `
  --body $body
```

> 💡 **Note:** Anthropic models use `capacity: 1` (MaaS billing model), not TPM-based capacity.

**Monitor deployment progress:**
```bash
echo "Monitoring deployment status..."

MAX_WAIT=300  # 5 minutes
ELAPSED=0
INTERVAL=10

while [ $ELAPSED -lt $MAX_WAIT ]; do
  STATUS=$(az cognitiveservices account deployment show \
    --name "$ACCOUNT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --deployment-name "$DEPLOYMENT_NAME" \
    --query "properties.provisioningState" -o tsv 2>/dev/null)

  case "$STATUS" in
    "Succeeded")
      echo "✓ Deployment successful!"
      break
      ;;
    "Failed")
      echo "❌ Deployment failed"
      # Get error details
      az cognitiveservices account deployment show \
        --name "$ACCOUNT_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --deployment-name "$DEPLOYMENT_NAME" \
        --query "properties"
      exit 1
      ;;
    "Creating"|"Accepted"|"Running")
      echo "Status: $STATUS... (${ELAPSED}s elapsed)"
      sleep $INTERVAL
      ELAPSED=$((ELAPSED + INTERVAL))
      ;;
    *)
      echo "Unknown status: $STATUS"
      sleep $INTERVAL
      ELAPSED=$((ELAPSED + INTERVAL))
      ;;
  esac
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
  echo "⚠ Deployment timeout after ${MAX_WAIT}s"
  echo "Check status manually:"
  echo "  az cognitiveservices account deployment show \\"
  echo "    --name $ACCOUNT_NAME \\"
  echo "    --resource-group $RESOURCE_GROUP \\"
  echo "    --deployment-name $DEPLOYMENT_NAME"
  exit 1
fi
```

---

## Phase 8: Display Deployment Details

**Show deployment information:**
```bash
echo ""
echo "═══════════════════════════════════════════"
echo "✓ Deployment Successful!"
echo "═══════════════════════════════════════════"
echo ""

# Get endpoint information
ENDPOINT=$(az cognitiveservices account show \
  --name "$ACCOUNT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.endpoint" -o tsv)

# Get deployment details
DEPLOYMENT_INFO=$(az cognitiveservices account deployment show \
  --name "$ACCOUNT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --deployment-name "$DEPLOYMENT_NAME" \
  --query "properties.model")

echo "Deployment Name: $DEPLOYMENT_NAME"
echo "Model: $MODEL_NAME"
echo "Version: $MODEL_VERSION"
echo "Region: $SELECTED_REGION"
echo "SKU: GlobalStandard"
echo "Capacity: $(format_capacity $DEPLOY_CAPACITY)"
echo "Endpoint: $ENDPOINT"
echo ""

# Generate direct link to deployment in Azure AI Foundry portal
DEPLOYMENT_URL=$(bash "$(dirname "$0")/scripts/generate_deployment_url.sh" \
  --subscription "$SUBSCRIPTION_ID" \
  --resource-group "$RESOURCE_GROUP" \
  --foundry-resource "$ACCOUNT_NAME" \
  --project "$PROJECT_NAME" \
  --deployment "$DEPLOYMENT_NAME")

echo "🔗 View in Azure AI Foundry Portal:"
echo ""
echo "$DEPLOYMENT_URL"
echo ""
echo "═══════════════════════════════════════════"
echo ""

echo "Test your deployment:"
echo ""
echo "# View deployment details"
echo "az cognitiveservices account deployment show \\"
echo "  --name $ACCOUNT_NAME \\"
echo "  --resource-group $RESOURCE_GROUP \\"
echo "  --deployment-name $DEPLOYMENT_NAME"
echo ""
echo "# List all deployments"
echo "az cognitiveservices account deployment list \\"
echo "  --name $ACCOUNT_NAME \\"
echo "  --resource-group $RESOURCE_GROUP \\"
echo "  --output table"
echo ""

echo "Next steps:"
echo "• Click the link above to test in Azure AI Foundry playground"
echo "• Integrate into your application"
echo "• Set up monitoring and alerts"
```
