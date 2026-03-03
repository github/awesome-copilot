# AZD with Terraform

Use Azure Developer CLI (azd) with Terraform as the infrastructure provider.

## When to Use

Choose azd+Terraform when you want:
- **Terraform's multi-cloud capabilities** with **azd's deployment simplicity**
- Existing Terraform expertise but want `azd up` convenience
- Team familiar with Terraform but needs environment management
- Multi-cloud IaC with Azure-first deployment experience

## Benefits

| Feature | Pure Terraform | AZD + Terraform |
|---------|---------------|-----------------|
| Deploy command | `terraform apply` | `azd up` |
| Environment management | Manual workspaces | Built-in `azd env` |
| CI/CD generation | Manual setup | Auto-generated pipelines |
| Service deployment | Manual scripts | Automatic from azure.yaml |
| State management | Manual backend setup | Configurable |
| Multi-cloud | ✅ Yes | ✅ Yes |

## Configuration

### 1. azure.yaml Structure

Create `azure.yaml` in project root:

```yaml
name: myapp
metadata:
  template: azd-init

# Specify Terraform as IaC provider
infra:
  provider: terraform
  path: ./infra

# Define services as usual
services:
  api:
    project: ./src/api
    language: python
    host: containerapp
    docker:
      path: ./src/api/Dockerfile
  
  web:
    project: ./src/web
    language: js
    host: staticwebapp
    dist: dist
```

### 2. Terraform File Structure

Place Terraform files in `./infra/`:

```
infra/
├── main.tf              # Main resources
├── variables.tf         # Variable definitions
├── outputs.tf           # Output values
├── provider.tf          # Provider configuration
└── modules/
    ├── api/
    │   └── main.tf
    └── web/
        └── main.tf
```

### 3. Provider Configuration

**provider.tf:**
```hcl
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.2"
    }
    azurecaf = {
      source  = "aztfmod/azurecaf"
      version = "~> 1.2"
    }
  }

  # Optional: Remote state for team collaboration
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "tfstate${var.state_suffix}"
    container_name       = "tfstate"
    key                  = "app.terraform.tfstate"
  }
}

provider "azurerm" {
  features {}
}
```

> **⚠️ IMPORTANT**: For **Azure Functions Flex Consumption**, use azurerm provider **v4.2 or later**:
> ```hcl
> terraform {
>   required_providers {
>     azurerm = {
>       source  = "hashicorp/azurerm"
>       version = "~> 4.2"
>     }
>   }
> }
> ```
> See [Terraform Functions patterns](../../services/functions/terraform.md) for Flex Consumption examples.

### 4. Variables and Outputs

**variables.tf:**
```hcl
variable "environment_name" {
  type        = string
  description = "Environment name from azd"
}

variable "location" {
  type        = string
  description = "Azure region"
  default     = "eastus2"
}

variable "principal_id" {
  type        = string
  description = "User principal ID from azd auth"
  default     = ""
}
```

**outputs.tf:**
```hcl
# Required: Resource group name
output "AZURE_RESOURCE_GROUP" {
  value = azurerm_resource_group.main.name
}

# Service-specific outputs
output "API_URL" {
  value = azurerm_container_app.api.latest_revision_fqdn
}

output "WEB_URL" {
  value = azurerm_static_web_app.web.default_host_name
}
```

> 💡 **Tip:** Output names in UPPERCASE are automatically set as azd environment variables.

### 5. Required Tags for azd

**CRITICAL:** Tag hosting resources with service names from azure.yaml:

```hcl
resource "azurerm_container_app" "api" {
  name                = "ca-${var.environment_name}-api"
  resource_group_name = azurerm_resource_group.main.name
  
  # Required for azd deploy to find this resource
  tags = merge(var.tags, {
    "azd-service-name" = "api"  # Matches service name in azure.yaml
  })
  
  # ... rest of configuration
}

resource "azurerm_static_web_app" "web" {
  name                = "swa-${var.environment_name}-web"
  resource_group_name = azurerm_resource_group.main.name
  
  # Required for azd deploy to find this resource
  tags = merge(var.tags, {
    "azd-service-name" = "web"  # Matches service name in azure.yaml
  })
  
  # ... rest of configuration
}
```

> ⚠️ **WARNING:** Without `azd-service-name` tags, `azd deploy` will fail to find deployment targets.

### 6. Resource Group Tags

Tag the resource group with environment name:

```hcl
resource "azurerm_resource_group" "main" {
  name     = "rg-${var.environment_name}"
  location = var.location
  
  tags = {
    "azd-env-name" = var.environment_name
  }
}
```

## Deployment Workflow

### Initial Setup

```bash
# 1. Create azd environment
azd env new dev

# 2. Set required variables
azd env set AZURE_LOCATION eastus2

# 3. Provision infrastructure (runs terraform init, plan, apply)
azd provision

# 4. Deploy services
azd deploy

# Or do both with single command
azd up
```

### Variables and State

**azd environment variables** → **Terraform variables**

```bash
# Set azd variable
azd env set DATABASE_NAME mydb

# Access in Terraform
variable "database_name" {
  type    = string
  default = env("DATABASE_NAME")
}
```

**Remote state setup:**

```bash
# Create state storage (one-time setup)
az group create --name rg-terraform-state --location eastus2

az storage account create \
  --name tfstate<unique> \
  --resource-group rg-terraform-state \
  --sku Standard_LRS

az storage container create \
  --name tfstate \
  --account-name tfstate<unique>

# Set backend variables for azd
azd env set TF_STATE_RESOURCE_GROUP rg-terraform-state
azd env set TF_STATE_STORAGE_ACCOUNT tfstate<unique>
```

## Generation Steps

When preparing a new azd+Terraform project:

1. **Generate azure.yaml** with `infra.provider: terraform`
2. **Create Terraform files** in `./infra/`:
   - `main.tf` - Core resources and resource group
   - `variables.tf` - environment_name, location, tags
   - `outputs.tf` - Service URLs and resource names (UPPERCASE)
   - `provider.tf` - azurerm provider + backend config
3. **Add required tags**:
   - Resource group: `azd-env-name`
   - Hosting resources: `azd-service-name` (matches azure.yaml services)
4. **Research best practices** - Call `mcp_azure_mcp_azureterraformbestpractices`

## Migration from Pure Terraform

Converting existing Terraform project to use azd:

1. Create `azure.yaml` with services and `infra.provider: terraform`
2. Move `.tf` files to `./infra/` directory
3. Add `azd-service-name` tags to hosting resources
4. Ensure outputs include service URLs in UPPERCASE
5. Test with `azd provision` and `azd deploy`

## CI/CD Integration

azd can auto-generate pipelines for Terraform:

```bash
# Generate GitHub Actions workflow
azd pipeline config

# Generate Azure DevOps pipeline
azd pipeline config --provider azdo
```

Generated pipelines will:
- Install Terraform
- Run `terraform init`, `plan`, `apply`
- Use azd authentication
- Deploy services with `azd deploy`

## Comparison: azd+Terraform vs Pure Terraform

| Aspect | Pure Terraform | azd + Terraform |
|--------|---------------|-----------------|
| **IaC** | Terraform | Terraform |
| **Provision** | `terraform apply` | `azd provision` (wraps terraform) |
| **Deploy apps** | Manual scripts | `azd deploy` (automatic) |
| **Environment mgmt** | Workspaces | `azd env` |
| **Auth** | Manual az login | `azd auth login` |
| **CI/CD** | Manual setup | `azd pipeline config` |
| **Multi-service** | Manual orchestration | Automatic from azure.yaml |
| **Learning curve** | Medium | Low |

## When NOT to Use azd+Terraform

Use pure Terraform (without azd) when:
- Multi-cloud deployment (not Azure-first)
- Complex Terraform modules/workspaces that conflict with azd conventions
- Existing complex Terraform CI/CD that's hard to migrate
- Team has strong Terraform expertise but no bandwidth for azd learning

## Azure Policy Compliance

Enterprise Azure subscriptions typically enforce security policies. Your Terraform must comply:

### Storage Account (Required for Functions)

```hcl
resource "azurerm_storage_account" "storage" {
  name                            = "stmyapp${random_string.suffix.result}"
  resource_group_name             = azurerm_resource_group.rg.name
  location                        = azurerm_resource_group.rg.location
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  
  # Azure policy requirements
  allow_nested_items_to_be_public = false   # Disable anonymous blob access
  local_user_enabled              = false   # Disable local users
  shared_access_key_enabled       = false   # RBAC-only, no access keys
}
```

### Function App with Managed Identity Storage

```hcl
provider "azurerm" {
  features {}
  storage_use_azuread = true   # Required when shared_access_key_enabled = false
}

resource "azurerm_linux_function_app" "function" {
  name                          = "func-myapp"
  resource_group_name           = azurerm_resource_group.rg.name
  location                      = azurerm_resource_group.rg.location
  service_plan_id               = azurerm_service_plan.plan.id
  storage_account_name          = azurerm_storage_account.storage.name
  storage_uses_managed_identity = true   # Use MI instead of access key
  
  identity {
    type = "SystemAssigned"
  }
  
  tags = {
    "azd-service-name" = "api"   # REQUIRED for azd deploy
  }
  
  depends_on = [azurerm_role_assignment.deployer_storage]
}

# RBAC for deploying user (create function with MI storage)
resource "azurerm_role_assignment" "deployer_storage" {
  scope                = azurerm_storage_account.storage.id
  role_definition_name = "Storage Blob Data Owner"
  principal_id         = data.azurerm_client_config.current.object_id
}

# RBAC for function app after creation
resource "azurerm_role_assignment" "function_storage" {
  scope                = azurerm_storage_account.storage.id
  role_definition_name = "Storage Blob Data Owner"
  principal_id         = azurerm_linux_function_app.function.identity[0].principal_id
}
```

### Services with Disabled Local Auth

```hcl
# Service Bus
resource "azurerm_servicebus_namespace" "sb" {
  local_auth_enabled = false   # RBAC-only
}

# Event Hubs
resource "azurerm_eventhub_namespace" "eh" {
  local_authentication_enabled = false   # RBAC-only
}

# Cosmos DB
resource "azurerm_cosmosdb_account" "cosmos" {
  local_authentication_disabled = true   # RBAC-only
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `resource not found: unable to find a resource tagged with 'azd-service-name'` | Add `azd-service-name` tag to hosting resource in Terraform |
| `RequestDisallowedByPolicy: shared key access` | Set `shared_access_key_enabled = false` on storage |
| `RequestDisallowedByPolicy: local auth disabled` | Set `local_auth_enabled = false` on Service Bus |
| `RequestDisallowedByPolicy: anonymous blob access` | Set `allow_nested_items_to_be_public = false` on storage |
| `terraform command not found` | Install Terraform CLI: `brew install terraform` or download from terraform.io |
| State conflicts | Configure remote backend in provider.tf |
| Variable not passed to Terraform | Ensure variable is set with `azd env set` and defined in variables.tf |

## References

- [Microsoft Docs: Use Terraform with azd](https://learn.microsoft.com/en-us/azure/developer/azure-developer-cli/use-terraform-for-azd)
- [azd-starter-terraform template](https://github.com/Azure-Samples/azd-starter-terraform)
- [Terraform Azure Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Azure CAF Naming](https://registry.terraform.io/providers/aztfmod/azurecaf/latest/docs)
