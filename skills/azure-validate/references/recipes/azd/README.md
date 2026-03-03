# AZD Validation

Validation steps for Azure Developer CLI projects.

## Prerequisites

- `azure.yaml` exists in project root
- Infrastructure files exist:
  - For Bicep: `./infra/` contains Bicep files
  - For Terraform: `./infra/` contains `.tf` files and `azure.yaml` has `infra.provider: terraform`

## Validation Steps

### 1. AZD Installation

Verify AZD is installed:

```bash
azd version
```

**If not installed:**
```
mcp_azure_mcp_extension_cli_install(cli-type: "azd")
```

### 2. Schema Validation

Validate azure.yaml against official schema:

```
mcp_azure_mcp_azd(command: "validate_azure_yaml", parameters: { path: "./azure.yaml" })
```

### 3. Environment Setup

Verify AZD environment exists and is configured. See [Environment Setup](environment.md) for detailed steps.

### 4. Authentication Check

```bash
azd auth login --check-status
```

**If not logged in:**
```bash
azd auth login
```

### 5. Subscription/Location Check

Check environment values:
```bash
azd env get-values
```

**If AZURE_SUBSCRIPTION_ID or AZURE_LOCATION not set:**

Use Azure MCP tools to list subscriptions:
```
mcp_azure_mcp_subscription_list
```

Use Azure MCP tools to list resource groups (check for conflicts):
```
mcp_azure_mcp_group_list
  subscription: <subscription-id>
```

Prompt user to confirm subscription and location before continuing.

Refer to the region availability reference to select a region supported by all services in this template:
- [Region availability](../../region-availability.md)

```bash
azd env set AZURE_SUBSCRIPTION_ID <subscription-id>
azd env set AZURE_LOCATION <location>
```

### 6. Provision Preview

Validate IaC is ready (must complete without error):

```bash
azd provision --preview --no-prompt
```

> 💡 **Note:** This works for both Bicep and Terraform. azd will automatically detect the provider from `azure.yaml` and run the appropriate validation (`bicep build` or `terraform plan`).

### 7. Build Verification

Build the project and verify there are no errors. If the build fails, fix the issues and re-build until it succeeds. Do NOT proceed to packaging or deployment with build errors.

### 8. Package Validation

Confirm all services package successfully:

```bash
azd package --no-prompt
```

### 9. Azure Policy Validation

See [Policy Validation Guide](../../policy-validation.md) for instructions on retrieving and validating Azure policies for your subscription.

### 9. Aspire Container Apps Environment Variables

> ⚠️ **CRITICAL for .NET Aspire projects:** When using Aspire with Container Apps in "limited mode" (in-memory infrastructure generation), `azd provision` creates Azure resources but doesn't automatically populate environment variables that `azd deploy` needs.

**Check if environment variables are set:**

```bash
azd env get-values | grep -E "AZURE_CONTAINER_REGISTRY_ENDPOINT|AZURE_CONTAINER_REGISTRY_MANAGED_IDENTITY_ID|MANAGED_IDENTITY_CLIENT_ID"
```

**If any are missing, set them now BEFORE running `azd deploy`:**

```bash
# Get resource group name
RG_NAME=$(azd env get-values | grep AZURE_RESOURCE_GROUP | cut -d'=' -f2 | tr -d '"')

# Set required variables
azd env set AZURE_CONTAINER_REGISTRY_ENDPOINT $(az acr list --resource-group "$RG_NAME" --query "[0].loginServer" -o tsv)
azd env set AZURE_CONTAINER_REGISTRY_MANAGED_IDENTITY_ID $(az identity list --resource-group "$RG_NAME" --query "[0].id" -o tsv)
azd env set MANAGED_IDENTITY_CLIENT_ID $(az identity list --resource-group "$RG_NAME" --query "[0].clientId" -o tsv)
```

**PowerShell:**
```powershell
# Get resource group name
$rgName = (azd env get-values | Select-String 'AZURE_RESOURCE_GROUP').Line.Split('=')[1].Trim('"')

# Set required variables
azd env set AZURE_CONTAINER_REGISTRY_ENDPOINT (az acr list --resource-group $rgName --query "[0].loginServer" -o tsv)
azd env set AZURE_CONTAINER_REGISTRY_MANAGED_IDENTITY_ID (az identity list --resource-group $rgName --query "[0].id" -o tsv)
azd env set MANAGED_IDENTITY_CLIENT_ID (az identity list --resource-group $rgName --query "[0].clientId" -o tsv)
```

**Why this is needed:** Aspire's "limited mode" generates infrastructure in-memory. While `azd provision` creates all necessary Azure resources (Container Registry, Managed Identity, Container Apps Environment), it doesn't populate the environment variables that reference those resources. The `azd deploy` phase requires these variables to authenticate with the container registry and configure managed identity bindings.

## References

- [Environment Setup](environment.md)
- [Error Handling](./errors.md)

## Next

All checks pass → **azure-deploy**
