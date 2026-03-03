# Service Bus Recipe - Terraform Module
# Adds Azure Service Bus namespace, queue, and RBAC for managed identity
#
# REQUIREMENTS FOR BASE TEMPLATE:
# 1. Storage account MUST have: shared_access_key_enabled = false (Azure policy)
# 2. Storage account MUST have: allow_nested_items_to_be_public = false
# 3. Function app SHOULD use: storage_uses_managed_identity = true
# 4. Provider SHOULD set: storage_use_azuread = true
# 5. Function app MUST have tag: "azd-service-name" = "api" (for azd deploy)

# Variables
variable "name" {
  description = "Resource name prefix"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "resource_group_name" {
  description = "Resource group name"
  type        = string
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}

variable "function_app_principal_id" {
  description = "Principal ID of the function app managed identity for RBAC assignment"
  type        = string
}

variable "uami_client_id" {
  description = "UAMI client ID - REQUIRED for UAMI auth"
  type        = string
}

variable "queue_name" {
  description = "Queue name for the function trigger"
  type        = string
  default     = "orders"
}

# Service Bus Namespace
resource "azurerm_servicebus_namespace" "main" {
  name                = "${var.name}-sbns"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "Standard"
  
  local_auth_enabled  = false  # RBAC-only, no connection strings or SAS keys
  minimum_tls_version = "1.2"

  tags = var.tags
}

# Queue
resource "azurerm_servicebus_queue" "main" {
  name         = var.queue_name
  namespace_id = azurerm_servicebus_namespace.main.id

  lock_duration                       = "PT1M"
  max_size_in_megabytes               = 1024
  requires_duplicate_detection        = false
  requires_session                    = false
  default_message_ttl                 = "P14D"
  dead_lettering_on_message_expiration = true
  enable_batched_operations           = true
  max_delivery_count                  = 10
  enable_partitioning                 = false
}

# RBAC: Azure Service Bus Data Owner
# Role GUID: 090c5cfd-751d-490a-894a-3ce6f1109419
resource "azurerm_role_assignment" "servicebus_data_owner" {
  scope                = azurerm_servicebus_namespace.main.id
  role_definition_name = "Azure Service Bus Data Owner"
  principal_id         = var.function_app_principal_id
  principal_type       = "ServicePrincipal"
}

# Outputs
output "servicebus_namespace_name" {
  value = azurerm_servicebus_namespace.main.name
}

output "servicebus_namespace_id" {
  value = azurerm_servicebus_namespace.main.id
}

output "queue_name" {
  value = azurerm_servicebus_queue.main.name
}

output "fully_qualified_namespace" {
  value = "${azurerm_servicebus_namespace.main.name}.servicebus.windows.net"
}

# App Settings Output - Use this to ensure correct UAMI configuration
output "app_settings" {
  description = "App settings to merge into function app configuration"
  value = {
    "ServiceBusConnection__fullyQualifiedNamespace" = "${azurerm_servicebus_namespace.main.name}.servicebus.windows.net"
    "ServiceBusConnection__credential"              = "managedidentity"
    "ServiceBusConnection__clientId"                = var.uami_client_id
    "SERVICEBUS_QUEUE_NAME"                         = azurerm_servicebus_queue.main.name
  }
}
