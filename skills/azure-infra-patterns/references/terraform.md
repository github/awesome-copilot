# Terraform Implementation Patterns

## Table of Contents
1. [Provider Configuration](#provider-configuration)
2. [State Management](#state-management)
3. [Module Patterns](#module-patterns)
4. [Variable Patterns](#variable-patterns)
5. [Common Resource Patterns](#common-resource-patterns)
6. [Data Sources](#data-sources)

## Provider Configuration

### AzureRM Provider
```hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.85"
    }
    azapi = {
      source  = "azure/azapi"
      version = "~> 1.10"
    }
  }
}

# main.tf
provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = false
      recover_soft_deleted_key_vaults = true
    }
    resource_group {
      prevent_deletion_if_contains_resources = true
    }
  }
}
```

### Multiple Subscriptions
```hcl
provider "azurerm" {
  alias           = "connectivity"
  subscription_id = var.connectivity_subscription_id
  features {}
}

provider "azurerm" {
  alias           = "identity"
  subscription_id = var.identity_subscription_id
  features {}
}

resource "azurerm_virtual_network" "hub" {
  provider = azurerm.connectivity
  # ...
}
```

## State Management

### Azure Storage Backend
```hcl
# backend.tf
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "stterraformstate"
    container_name       = "tfstate"
    key                  = "prod.terraform.tfstate"
    use_azuread_auth     = true
  }
}
```

### State Initialization
```bash
# Initialize with backend config
terraform init \
  -backend-config="storage_account_name=stterraformstate" \
  -backend-config="container_name=tfstate" \
  -backend-config="key=prod.tfstate"
```

## Module Patterns

### Module Structure
```
modules/
└── storage/
    ├── main.tf
    ├── variables.tf
    ├── outputs.tf
    └── versions.tf
```

### Module Definition
```hcl
# modules/storage/main.tf
resource "azurerm_storage_account" "this" {
  name                     = var.name
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = var.account_tier
  account_replication_type = var.replication_type
  
  min_tls_version                 = "TLS1_2"
  https_traffic_only_enabled      = true
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = false
  
  network_rules {
    default_action = "Deny"
    bypass         = ["AzureServices"]
  }
  
  tags = var.tags
}

# modules/storage/variables.tf
variable "name" {
  type        = string
  description = "Storage account name"
}

variable "resource_group_name" {
  type        = string
  description = "Resource group name"
}

variable "location" {
  type        = string
  description = "Azure region"
}

variable "account_tier" {
  type        = string
  default     = "Standard"
}

variable "replication_type" {
  type        = string
  default     = "LRS"
}

variable "tags" {
  type        = map(string)
  default     = {}
}

# modules/storage/outputs.tf
output "id" {
  value = azurerm_storage_account.this.id
}

output "primary_blob_endpoint" {
  value = azurerm_storage_account.this.primary_blob_endpoint
}
```

### Module Usage
```hcl
module "storage" {
  source = "./modules/storage"
  
  name                = "st${var.workload}${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  replication_type    = "ZRS"
  tags                = local.tags
}
```

### Azure Verified Modules
```hcl
module "storage_account" {
  source  = "Azure/avm-res-storage-storageaccount/azurerm"
  version = "0.1.0"

  name                = var.storage_account_name
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
}
```

## Variable Patterns

### Variable Definitions
```hcl
# variables.tf
variable "environment" {
  type        = string
  description = "Environment name"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "location" {
  type        = string
  description = "Azure region"
  default     = "eastus"
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to resources"
  default     = {}
}

variable "db_password" {
  type        = string
  description = "Database password"
  sensitive   = true
}
```

### Local Values
```hcl
locals {
  name_prefix = "${var.workload}-${var.environment}-${var.location}"
  
  resource_names = {
    resource_group  = "rg-${local.name_prefix}"
    storage_account = "st${replace(local.name_prefix, "-", "")}"
    key_vault       = "kv-${substr(local.name_prefix, 0, 17)}"
  }
  
  tags = merge(var.tags, {
    Environment = var.environment
    ManagedBy   = "Terraform"
  })
}
```

### Variable Files
```hcl
# environments/prod.tfvars
environment = "prod"
location    = "eastus"

tags = {
  CostCenter = "CC-12345"
  Owner      = "platform@company.com"
}
```

## Common Resource Patterns

### Resource Group
```hcl
resource "azurerm_resource_group" "main" {
  name     = "rg-${var.workload}-${var.environment}"
  location = var.location
  tags     = local.tags
}
```

### Key Vault
```hcl
resource "azurerm_key_vault" "main" {
  name                = "kv-${var.workload}-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"
  
  enable_rbac_authorization       = true
  purge_protection_enabled        = true  # NEVER set to false
  soft_delete_retention_days      = 90
  public_network_access_enabled   = false
  
  network_acls {
    default_action = "Deny"
    bypass         = "AzureServices"
  }
  
  tags = local.tags
}
```

### Role Assignment
```hcl
resource "azurerm_role_assignment" "kv_secrets_user" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_linux_web_app.main.identity[0].principal_id
}
```

### Private Endpoint
```hcl
resource "azurerm_private_endpoint" "storage" {
  name                = "pep-${azurerm_storage_account.main.name}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  subnet_id           = azurerm_subnet.private_endpoints.id
  
  private_service_connection {
    name                           = "psc-storage"
    private_connection_resource_id = azurerm_storage_account.main.id
    subresource_names              = ["blob"]
    is_manual_connection           = false
  }
  
  private_dns_zone_group {
    name                 = "dns-zone-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.blob.id]
  }
  
  tags = local.tags
}
```

## Data Sources

### Current Context
```hcl
data "azurerm_client_config" "current" {}

data "azurerm_subscription" "current" {}
```

### Existing Resources
```hcl
data "azurerm_resource_group" "existing" {
  name = "rg-shared-services"
}

data "azurerm_key_vault" "shared" {
  name                = "kv-shared-secrets"
  resource_group_name = data.azurerm_resource_group.existing.name
}

data "azurerm_key_vault_secret" "db_password" {
  name         = "db-password"
  key_vault_id = data.azurerm_key_vault.shared.id
}
```

### Built-in Role IDs
```hcl
locals {
  role_ids = {
    contributor               = "b24988ac-6180-42a0-ab88-20f7382dd24c"
    reader                    = "acdd72a7-3385-48ef-bd42-f606fba81ae7"
    storage_blob_data_contrib = "ba92f5b4-2d11-453d-a403-e96b0029c9fe"
    key_vault_secrets_user    = "4633458b-17de-408a-b874-0445c86b69e6"
  }
}
```
