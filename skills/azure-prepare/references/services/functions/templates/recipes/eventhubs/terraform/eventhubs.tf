# Event Hubs Recipe - Terraform Module
# Adds Azure Event Hubs namespace, event hub, consumer group, and RBAC for managed identity
#
# REQUIREMENTS FOR BASE TEMPLATE:
# 1. Storage account MUST have: shared_access_key_enabled = false (Azure policy)
# 2. Storage account MUST have: allow_nested_items_to_be_public = false
# 3. Function app SHOULD use: storage_uses_managed_identity = true
# 4. Provider SHOULD set: storage_use_azuread = true
# 5. Function app MUST have tag: "azd-service-name" = "api" (for azd deploy)

# Variables
variable "name_prefix" {
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
  description = "Principal ID of the function app managed identity"
  type        = string
}

variable "event_hub_name" {
  description = "Event Hub name"
  type        = string
  default     = "events"
}

variable "consumer_group_name" {
  description = "Consumer group for the function app"
  type        = string
  default     = "funcapp"
}

variable "message_retention_days" {
  description = "Message retention in days"
  type        = number
  default     = 1
}

variable "partition_count" {
  description = "Number of partitions"
  type        = number
  default     = 2
}

variable "uami_client_id" {
  description = "Client ID of the user-assigned managed identity for Event Hubs connection"
  type        = string
}

variable "vnet_enabled" {
  description = "Enable VNet integration with private endpoint"
  type        = bool
  default     = false
}

variable "subnet_id" {
  description = "Subnet ID for private endpoint (required if vnet_enabled)"
  type        = string
  default     = ""
}

variable "virtual_network_id" {
  description = "Virtual network ID for DNS zone link (required if vnet_enabled)"
  type        = string
  default     = ""
}

# Event Hubs Namespace
resource "azurerm_eventhub_namespace" "main" {
  name                          = "${var.name_prefix}-ehns"
  location                      = var.location
  resource_group_name           = var.resource_group_name
  sku                           = "Standard"
  capacity                      = 1
  auto_inflate_enabled          = true
  maximum_throughput_units      = 4
  local_authentication_enabled  = false  # RBAC-only
  minimum_tls_version           = "1.2"
  tags                          = var.tags
}

# Event Hub
resource "azurerm_eventhub" "main" {
  name                = var.event_hub_name
  namespace_name      = azurerm_eventhub_namespace.main.name
  resource_group_name = var.resource_group_name
  partition_count     = var.partition_count
  message_retention   = var.message_retention_days
}

# Consumer Group
resource "azurerm_eventhub_consumer_group" "funcapp" {
  name                = var.consumer_group_name
  namespace_name      = azurerm_eventhub_namespace.main.name
  eventhub_name       = azurerm_eventhub.main.name
  resource_group_name = var.resource_group_name
}

# RBAC: Azure Event Hubs Data Owner
resource "azurerm_role_assignment" "eventhubs_data_owner" {
  scope                = azurerm_eventhub_namespace.main.id
  role_definition_name = "Azure Event Hubs Data Owner"
  principal_id         = var.function_app_principal_id
}

# Private Endpoint (conditional)
resource "azurerm_private_endpoint" "eventhubs" {
  count               = var.vnet_enabled ? 1 : 0
  name                = "${azurerm_eventhub_namespace.main.name}-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_id
  tags                = var.tags

  private_service_connection {
    name                           = "${azurerm_eventhub_namespace.main.name}-plsc"
    private_connection_resource_id = azurerm_eventhub_namespace.main.id
    is_manual_connection           = false
    subresource_names              = ["namespace"]
  }
}

# Private DNS Zone (conditional)
resource "azurerm_private_dns_zone" "eventhubs" {
  count               = var.vnet_enabled ? 1 : 0
  name                = "privatelink.servicebus.windows.net"
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "eventhubs" {
  count                 = var.vnet_enabled ? 1 : 0
  name                  = "${var.name_prefix}-vnet-link"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.eventhubs[0].name
  virtual_network_id    = var.virtual_network_id
}

resource "azurerm_private_dns_a_record" "eventhubs" {
  count               = var.vnet_enabled ? 1 : 0
  name                = azurerm_eventhub_namespace.main.name
  zone_name           = azurerm_private_dns_zone.eventhubs[0].name
  resource_group_name = var.resource_group_name
  ttl                 = 300
  records             = [azurerm_private_endpoint.eventhubs[0].private_service_connection[0].private_ip_address]
}

# Outputs
output "eventhub_namespace_name" {
  value = azurerm_eventhub_namespace.main.name
}

output "eventhub_namespace_id" {
  value = azurerm_eventhub_namespace.main.id
}

output "eventhub_name" {
  value = azurerm_eventhub.main.name
}

output "consumer_group_name" {
  value = azurerm_eventhub_consumer_group.funcapp.name
}

output "fully_qualified_namespace" {
  value = "${azurerm_eventhub_namespace.main.name}.servicebus.windows.net"
}

# App settings to merge into function app
locals {
  eventhubs_app_settings = {
    "EventHubConnection__fullyQualifiedNamespace" = "${azurerm_eventhub_namespace.main.name}.servicebus.windows.net"
    "EventHubConnection__credential"              = "managedidentity"
    "EventHubConnection__clientId"                = var.uami_client_id
    "EVENTHUB_NAME"                               = azurerm_eventhub.main.name
    "EVENTHUB_CONSUMER_GROUP"                     = azurerm_eventhub_consumer_group.funcapp.name
  }
}

output "app_settings" {
  value       = local.eventhubs_app_settings
  description = "App settings to merge into function app configuration"
}
