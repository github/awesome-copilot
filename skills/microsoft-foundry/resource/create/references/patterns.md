# Common Patterns: Create Foundry Resource

## Pattern A: Quick Setup

Complete setup in one go:

```bash
# Ask user: "Use existing resource group or create new?"

# ==== If user chooses "Use existing" ====
# Count and list existing resource groups
TOTAL_RG_COUNT=$(az group list --query "length([])" -o tsv)
az group list --query "[-5:].{Name:name, Location:location}" --out table

# Based on count: show appropriate list and options
# User selects resource group
RG="<selected-rg-name>"

# Fetch details to verify
az group show --name $RG --query "{Name:name, Location:location, State:properties.provisioningState}"
# Then skip to creating Foundry resource below

# ==== If user chooses "Create new" ====
# List regions and ask user to choose
az account list-locations --query "[].{Region:name}" --out table

# Variables
RG="rg-ai-services"  # New resource group name
LOCATION="westus2"  # User's chosen location
RESOURCE_NAME="my-foundry-resource"

# Create new resource group
az group create --name $RG --location $LOCATION

# Verify creation
az group show --name $RG --query "{Name:name, Location:location, State:properties.provisioningState}"

# Create Foundry resource in user's chosen location
az cognitiveservices account create \
  --name $RESOURCE_NAME \
  --resource-group $RG \
  --kind AIServices \
  --sku S0 \
  --location $LOCATION \
  --yes

# Get endpoint and keys
echo "Resource created successfully!"
az cognitiveservices account show \
  --name $RESOURCE_NAME \
  --resource-group $RG \
  --query "{Endpoint:properties.endpoint, Location:location}"

az cognitiveservices account keys list \
  --name $RESOURCE_NAME \
  --resource-group $RG
```

## Pattern B: Multi-Region Setup

Create resources in multiple regions:

```bash
# Variables
RG="rg-ai-services"
REGIONS=("eastus" "westus2" "westeurope")

# Create resource group
az group create --name $RG --location eastus

# Create resources in each region
for REGION in "${REGIONS[@]}"; do
  RESOURCE_NAME="foundry-${REGION}"
  echo "Creating resource in $REGION..."

  az cognitiveservices account create \
    --name $RESOURCE_NAME \
    --resource-group $RG \
    --kind AIServices \
    --sku S0 \
    --location $REGION \
    --yes

  echo "Resource $RESOURCE_NAME created in $REGION"
done

# List all resources
az cognitiveservices account list --resource-group $RG --output table
```

## Quick Commands Reference

```bash
# Count total resource groups to determine which scenario applies
az group list --query "length([])" -o tsv

# Check existing resource groups (up to 5 most recent)
# 0 → create new | 1-4 → select or create | 5+ → select/other/create
az group list --query "[-5:].{Name:name, Location:location}" --out table

# If 5+ resource groups exist and user selects "Other", show all
az group list --query "[].{Name:name, Location:location}" --out table

# If user selects existing resource group, fetch details to verify and get location
az group show --name <selected-rg-name> --query "{Name:name, Location:location, State:properties.provisioningState}"

# List available regions (for creating new resource group)
az account list-locations --query "[].{Region:name}" --out table

# Create resource group (if needed)
az group create --name rg-ai-services --location westus2

# Create Foundry resource
az cognitiveservices account create \
  --name my-foundry-resource \
  --resource-group rg-ai-services \
  --kind AIServices \
  --sku S0 \
  --location westus2 \
  --yes

# List resources in group
az cognitiveservices account list --resource-group rg-ai-services

# Get resource details
az cognitiveservices account show \
  --name my-foundry-resource \
  --resource-group rg-ai-services

# Delete resource
az cognitiveservices account delete \
  --name my-foundry-resource \
  --resource-group rg-ai-services
```
