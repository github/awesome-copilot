# Detailed Workflows: Create Foundry Resource

## Workflow 1: Create Resource Group - Detailed Steps

### Step 1: Ask user preference

Ask the user which option they prefer:
1. Use an existing resource group
2. Create a new resource group

### Step 2a: If user chooses "Use existing resource group"

Count and list existing resource groups:

```bash
# Count total resource groups
TOTAL_RG_COUNT=$(az group list --query "length([])" -o tsv)

# Get list of resource groups (up to 5 most recent)
az group list --query "[-5:].{Name:name, Location:location}" --out table
```

**Handle based on count:**

**If 0 resources found:**
- Inform user: "No existing resource groups found"
- Ask if they want to create a new one, then proceed to Step 2b

**If 1-4 resources found:**
- Display all X resource groups to the user
- Let user select from the list
- Fetch the selected resource group details:
  ```bash
  az group show --name <selected-rg-name> --query "{Name:name, Location:location, State:properties.provisioningState}"
  ```
- Display details to user, then proceed to create Foundry resource

**If 5+ resources found:**
- Display the 5 most recent resource groups
- Present options:
  1. Select from the 5 displayed
  2. Other (see all resource groups)
- If user selects a resource group, fetch details:
  ```bash
  az group show --name <selected-rg-name> --query "{Name:name, Location:location, State:properties.provisioningState}"
  ```
- If user chooses "Other", show all:
  ```bash
  az group list --query "[].{Name:name, Location:location}" --out table
  ```
  Then let user select, and fetch details as above
- Display details to user, then proceed to create Foundry resource

### Step 2b: If user chooses "Create new resource group"

1. List available Azure regions:

```bash
az account list-locations --query "[].{Region:name}" --out table
```

Common regions:
- `eastus`, `eastus2` - US East Coast
- `westus`, `westus2`, `westus3` - US West Coast
- `centralus` - US Central
- `westeurope`, `northeurope` - Europe
- `southeastasia`, `eastasia` - Asia Pacific

2. Ask user to choose a region from the list above

3. Create resource group in the chosen region:

```bash
az group create \
  --name <resource-group-name> \
  --location <user-chosen-location>
```

4. Verify creation:

```bash
az group show --name <resource-group-name> --query "{Name:name, Location:location, State:properties.provisioningState}"
```

Expected output: `State: "Succeeded"`

## Workflow 2: Create Foundry Resource - Detailed Steps

### Step 1: Verify prerequisites

```bash
# Check Azure CLI version (need 2.0+)
az --version

# Verify authentication
az account show

# Check resource provider registration status
az provider show --namespace Microsoft.CognitiveServices --query "registrationState"
```

If provider not registered, see Workflow #3: Register Resource Provider.

### Step 2: Choose location

**Always ask the user to choose a location.** List available regions and let the user select:

```bash
# List available regions for Cognitive Services
az account list-locations --query "[].{Region:name, DisplayName:displayName}" --out table
```

Common regions for AI Services:
- `eastus`, `eastus2` - US East Coast
- `westus`, `westus2`, `westus3` - US West Coast
- `centralus` - US Central
- `westeurope`, `northeurope` - Europe
- `southeastasia`, `eastasia` - Asia Pacific

> **Important:** Do not automatically use the resource group's location. Always ask the user which region they prefer.

### Step 3: Create Foundry resource

```bash
az cognitiveservices account create \
  --name <resource-name> \
  --resource-group <rg> \
  --kind AIServices \
  --sku S0 \
  --location <location> \
  --yes
```

**Parameters:**
- `--name`: Unique resource name (globally unique across Azure)
- `--resource-group`: Existing resource group name
- `--kind`: **Must be `AIServices`** for multi-service resource
- `--sku`: Must be **S0** (Standard - the only supported tier for AIServices)
- `--location`: Azure region (**always ask user to choose** from available regions)
- `--yes`: Auto-accept terms without prompting

### Step 4: Verify resource creation

```bash
# Check resource details to verify creation
az cognitiveservices account show \
  --name <resource-name> \
  --resource-group <rg>

# View endpoint and configuration
az cognitiveservices account show \
  --name <resource-name> \
  --resource-group <rg> \
  --query "{Name:name, Endpoint:properties.endpoint, Location:location, Kind:kind, SKU:sku.name}"
```

Expected output:
- `provisioningState: "Succeeded"`
- Endpoint URL
- SKU: S0
- Kind: AIServices

### Step 5: Get access keys

```bash
az cognitiveservices account keys list \
  --name <resource-name> \
  --resource-group <rg>
```

This returns `key1` and `key2` for API authentication.

## Workflow 3: Register Resource Provider - Detailed Steps

### When Needed

Required when:
- First time creating Cognitive Services in subscription
- Error: `ResourceProviderNotRegistered`
- Insufficient permissions during resource creation

### Steps

**Step 1: Check registration status**

```bash
az provider show \
  --namespace Microsoft.CognitiveServices \
  --query "registrationState"
```

Possible states:
- `Registered`: Ready to use
- `NotRegistered`: Needs registration
- `Registering`: Registration in progress

**Step 2: Register provider**

```bash
az provider register --namespace Microsoft.CognitiveServices
```

**Step 3: Wait for registration**

Registration typically takes 1-2 minutes. Check status:

```bash
az provider show \
  --namespace Microsoft.CognitiveServices \
  --query "registrationState"
```

Wait until state is `Registered`.

**Step 4: Verify registration**

```bash
az provider list --query "[?namespace=='Microsoft.CognitiveServices']"
```

### Required Permissions

To register a resource provider, you need one of:
- **Subscription Owner** role
- **Contributor** role
- **Custom role** with `Microsoft.*/register/action` permission

**If you are not the subscription owner:**
1. Ask someone with the **Owner** or **Contributor** role to register the provider for you
2. Alternatively, ask them to grant you the `/register/action` privilege so you can register it yourself

**Alternative registration methods:**
- **Azure CLI** (recommended): `az provider register --namespace Microsoft.CognitiveServices`
- **Azure Portal**: Navigate to Subscriptions → Resource providers → Microsoft.CognitiveServices → Register
- **PowerShell**: `Register-AzResourceProvider -ProviderNamespace Microsoft.CognitiveServices`
