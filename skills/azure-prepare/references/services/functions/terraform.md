# Functions Terraform Patterns — REFERENCE ONLY

> ⛔ **DO NOT COPY THIS CODE DIRECTLY**
>
> This file contains **reference patterns** for understanding Azure Functions Terraform structure.
> **You MUST use the composition algorithm** to generate infrastructure:
>
> 1. Load `templates/selection.md` to choose the correct base template
> 2. Follow `templates/recipes/composition.md` for the exact algorithm
> 3. Run `azd init -t functions-quickstart-dotnet-azd-tf` to get the proven Terraform base, then adjust runtime/language per the composition recipes
>
> Hand-writing Terraform from these patterns will result in missing RBAC, incorrect managed identity configuration, and security vulnerabilities.

## Flex Consumption (Recommended)

**Use Flex Consumption for new deployments with managed identity (no connection strings).**

> **⚠️ IMPORTANT**: Flex Consumption requires **azurerm provider v4.2 or later**.

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.2"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_storage_account" "function_storage" {
  name                     = "${var.resource_prefix}func${var.unique_hash}"
  location                 = var.location
  resource_group_name      = azurerm_resource_group.main.name
  account_tier             = "Standard"
  account_replication_type = "LRS"
  
  min_tls_version              = "TLS1_2"
  allow_nested_items_to_be_public = false
  shared_access_key_enabled    = false  # Enforce managed identity
}

resource "azurerm_storage_container" "deployment_package" {
  name                  = "deploymentpackage"
  storage_account_id    = azurerm_storage_account.function_storage.id
  container_access_type = "private"
}

resource "azurerm_application_insights" "function_insights" {
  name                = "appi-${var.unique_hash}"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  application_type    = "web"
}

resource "azurerm_service_plan" "function_plan" {
  name                = "plan-${var.unique_hash}"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  os_type             = "Linux"
  sku_name            = "FC1"
}

resource "azurerm_linux_function_app" "function_app" {
  name                       = "${var.resource_prefix}-${var.service_name}-${var.unique_hash}"
  location                   = var.location
  resource_group_name        = azurerm_resource_group.main.name
  service_plan_id            = azurerm_service_plan.function_plan.id
  storage_account_name       = azurerm_storage_account.function_storage.name
  storage_uses_managed_identity = true
  https_only                 = true

  identity {
    type = "SystemAssigned"
  }

  function_app_config {
    deployment {
      storage {
        type  = "blob_container"
        value = "${azurerm_storage_account.function_storage.primary_blob_endpoint}${azurerm_storage_container.deployment_package.name}"
        authentication {
          type = "SystemAssignedIdentity"
        }
      }
    }

    scale_and_concurrency {
      maximum_instance_count = 100
      instance_memory_mb     = 2048
    }

    runtime {
      name    = "python"  # or "node", "dotnet-isolated"
      version = "3.11"
    }
  }

  site_config {
    application_insights_connection_string = azurerm_application_insights.function_insights.connection_string
    
    application_stack {
      python_version = "3.11"  # Adjust based on runtime
    }
  }

  app_settings = {
    "AzureWebJobsStorage__blobServiceUri"  = azurerm_storage_account.function_storage.primary_blob_endpoint
    "FUNCTIONS_EXTENSION_VERSION"          = "~4"
    "FUNCTIONS_WORKER_RUNTIME"             = "python"
  }
}

# Grant Function App access to Storage for runtime
resource "azurerm_role_assignment" "function_storage_access" {
  scope                = azurerm_storage_account.function_storage.id
  role_definition_name = "Storage Blob Data Owner"
  principal_id         = azurerm_linux_function_app.function_app.identity[0].principal_id
}
```

> 💡 **Key Points:**
> - Use `AzureWebJobsStorage__blobServiceUri` instead of connection string
> - Set `shared_access_key_enabled = false` for enhanced security
> - Use `storage_uses_managed_identity = true` for deployment authentication
> - Grant `Storage Blob Data Owner` role for full access to blobs, queues, and tables
> - Requires azurerm provider **v4.2 or later**

### Using Azure Verified Module

For production deployments, use the official Azure Verified Module:

```hcl
module "function_app" {
  source  = "Azure/avm-res-web-site/azurerm"
  version = "~> 0.0"

  name                = "${var.resource_prefix}-${var.service_name}-${var.unique_hash}"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  
  kind    = "functionapp"
  os_type = "Linux"

  sku_name = "FC1"

  function_app_storage_account_name       = azurerm_storage_account.function_storage.name
  function_app_storage_uses_managed_identity = true

  site_config = {
    application_insights_connection_string = azurerm_application_insights.function_insights.connection_string
    
    application_stack = {
      python_version = "3.11"
    }
  }

  app_settings = {
    "AzureWebJobsStorage__blobServiceUri" = azurerm_storage_account.function_storage.primary_blob_endpoint
    "FUNCTIONS_EXTENSION_VERSION"         = "~4"
    "FUNCTIONS_WORKER_RUNTIME"            = "python"
  }

  identity = {
    type = "SystemAssigned"
  }
}
```

> 💡 **Example Reference:** [HashiCorp Flex Consumption Example](https://registry.terraform.io/modules/Azure/avm-res-web-site/azurerm/latest/examples/flex_consumption)

## Consumption Plan (Legacy)

> ⛔ **DO NOT USE** — Y1/Dynamic SKU is deprecated for new deployments.
> **ALWAYS use Flex Consumption (FC1)** for all new Azure Functions.
> The Y1 example below is only for reference when migrating legacy apps.

**⚠️ Not recommended for new deployments. Use Flex Consumption instead.**

```hcl
resource "azurerm_storage_account" "function_storage" {
  name                     = "${var.resource_prefix}func${var.unique_hash}"
  location                 = var.location
  resource_group_name      = azurerm_resource_group.main.name
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_service_plan" "function_plan" {
  name                = "${var.resource_prefix}-funcplan-${var.unique_hash}"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  os_type             = "Linux"
  sku_name            = "Y1"
}

resource "azurerm_linux_function_app" "function_app" {
  name                = "${var.resource_prefix}-${var.service_name}-${var.unique_hash}"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.function_plan.id
  https_only          = true
  
  storage_account_name       = azurerm_storage_account.function_storage.name
  storage_account_access_key = azurerm_storage_account.function_storage.primary_access_key
  
  site_config {
    application_insights_connection_string = azurerm_application_insights.function_insights.connection_string
    
    application_stack {
      python_version = "3.11"
    }
  }

  app_settings = {
    "FUNCTIONS_EXTENSION_VERSION" = "~4"
    "FUNCTIONS_WORKER_RUNTIME"    = "python"
  }

  identity {
    type = "SystemAssigned"
  }
}
```

## Service Bus Integration (Managed Identity)

```hcl
data "azurerm_servicebus_namespace" "example" {
  name                = var.servicebus_namespace_name
  resource_group_name = var.servicebus_resource_group
}

resource "azurerm_linux_function_app" "function_app" {
  # ... (Function App definition from above)
  
  app_settings = {
    # Storage with managed identity
    "AzureWebJobsStorage__blobServiceUri" = azurerm_storage_account.function_storage.primary_blob_endpoint
    
    # Service Bus with managed identity
    "SERVICEBUS__fullyQualifiedNamespace" = "${data.azurerm_servicebus_namespace.example.name}.servicebus.windows.net"
    "SERVICEBUS_QUEUE_NAME"               = var.servicebus_queue_name
    
    # Other settings...
    "FUNCTIONS_EXTENSION_VERSION"  = "~4"
    "FUNCTIONS_WORKER_RUNTIME"     = "python"
    "APPLICATIONINSIGHTS_CONNECTION_STRING" = azurerm_application_insights.function_insights.connection_string
  }
}

# Grant Service Bus Data Receiver role for triggers
resource "azurerm_role_assignment" "servicebus_receiver" {
  scope                = data.azurerm_servicebus_namespace.example.id
  role_definition_name = "Azure Service Bus Data Receiver"
  principal_id         = azurerm_linux_function_app.function_app.identity[0].principal_id
}

# Grant Service Bus Data Sender role (if function sends messages)
resource "azurerm_role_assignment" "servicebus_sender" {
  scope                = data.azurerm_servicebus_namespace.example.id
  role_definition_name = "Azure Service Bus Data Sender"
  principal_id         = azurerm_linux_function_app.function_app.identity[0].principal_id
}
```

> 💡 **Key Points:**
> - Use `SERVICEBUS__fullyQualifiedNamespace` (double underscore) for managed identity
> - Grant `Service Bus Data Receiver` role for reading messages
> - Grant `Service Bus Data Sender` role for sending messages (if needed)
> - Role assignments automatically enable connection via managed identity

## Premium Plan (No Cold Starts)

```hcl
resource "azurerm_service_plan" "function_plan" {
  name                = "${var.resource_prefix}-funcplan-${var.unique_hash}"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  os_type             = "Linux"
  sku_name            = "EP1"  # EP1, EP2, or EP3
}

resource "azurerm_linux_function_app" "function_app" {
  # ... (rest of configuration similar to Flex Consumption)
  
  site_config {
    # Premium-specific settings
    always_on                      = true
    pre_warmed_instance_count      = 1
    elastic_instance_minimum       = 1
    
    application_stack {
      python_version = "3.11"
    }
  }
}
```
