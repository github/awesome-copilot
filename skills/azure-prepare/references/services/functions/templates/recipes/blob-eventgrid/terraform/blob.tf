# recipes/blob-eventgrid/terraform/blob.tf
# Blob Storage + Event Grid recipe module for Terraform — adds Storage account
# with blob trigger via Event Grid subscription for Azure Functions.
#
# REQUIREMENTS FOR BASE TEMPLATE:
# 1. Storage account MUST have: shared_access_key_enabled = false (Azure policy)
# 2. Storage account MUST have: allow_nested_items_to_be_public = false
# 3. Function app SHOULD use: storage_uses_managed_identity = true
# 4. Provider SHOULD set: storage_use_azuread = true
# 5. Function app MUST have tag: "azd-service-name" = "api" (for azd deploy)
#
# USAGE: Copy this file into infra/ alongside the base template's main.tf.
# Reference the function app identity from the base template.

# ============================================================================
# Variables (add to variables.tf if not already present)
# ============================================================================
variable "blob_container_name" {
  type        = string
  default     = "uploads"
  description = "Container name for blob triggers"
}

# ============================================================================
# Naming
# ============================================================================
resource "azurecaf_name" "blob_storage" {
  name          = var.environment_name
  resource_type = "azurerm_storage_account"
  suffixes      = ["blob"]
  random_length = 5
}

# ============================================================================
# Storage Account (for blob data - separate from function app storage)
# ============================================================================
resource "azurerm_storage_account" "blob" {
  name                            = azurecaf_name.blob_storage.result
  resource_group_name             = azurerm_resource_group.main.name
  location                        = azurerm_resource_group.main.location
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  min_tls_version                 = "TLS1_2"
  shared_access_key_enabled       = false # RBAC-only, required by Azure policy
  allow_nested_items_to_be_public = false

  tags = local.tags
}

# ============================================================================
# Blob Container
# ============================================================================
resource "azurerm_storage_container" "uploads" {
  name                  = var.blob_container_name
  storage_account_id    = azurerm_storage_account.blob.id
  container_access_type = "private"
}

# ============================================================================
# RBAC: Storage Blob Data Contributor
# ============================================================================
resource "azurerm_role_assignment" "blob_data_contributor" {
  scope                = azurerm_storage_account.blob.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.func_identity.principal_id
  principal_type       = "ServicePrincipal"
}

# ============================================================================
# Event Grid System Topic
# ============================================================================
resource "azurerm_eventgrid_system_topic" "blob" {
  name                   = "${var.environment_name}-blobtopic"
  resource_group_name    = azurerm_resource_group.main.name
  location               = azurerm_resource_group.main.location
  source_arm_resource_id = azurerm_storage_account.blob.id
  topic_type             = "Microsoft.Storage.StorageAccounts"

  tags = local.tags
}

# ============================================================================
# Event Grid Subscription (to Function App)
# ============================================================================
resource "azurerm_eventgrid_system_topic_event_subscription" "blob_created" {
  name                = "blob-created-subscription"
  system_topic        = azurerm_eventgrid_system_topic.blob.name
  resource_group_name = azurerm_resource_group.main.name

  azure_function_endpoint {
    function_id                       = "${azurerm_linux_function_app.main.id}/functions/BlobTrigger"
    max_events_per_batch              = 1
    preferred_batch_size_in_kilobytes = 64
  }

  included_event_types = ["Microsoft.Storage.BlobCreated"]

  subject_filter {
    subject_begins_with = "/blobServices/default/containers/${var.blob_container_name}/"
  }

  retry_policy {
    max_delivery_attempts = 30
    event_time_to_live    = 1440
  }
}

# ============================================================================
# Networking: Private Endpoint (conditional on vnet_enabled)
# ============================================================================
resource "azurerm_private_dns_zone" "blob" {
  count               = var.vnet_enabled ? 1 : 0
  name                = "privatelink.blob.core.windows.net"
  resource_group_name = azurerm_resource_group.main.name
  tags                = local.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "blob" {
  count                 = var.vnet_enabled ? 1 : 0
  name                  = "blob-dns-link"
  resource_group_name   = azurerm_resource_group.main.name
  private_dns_zone_name = azurerm_private_dns_zone.blob[0].name
  virtual_network_id    = azurerm_virtual_network.main[0].id
}

resource "azurerm_private_endpoint" "blob" {
  count               = var.vnet_enabled ? 1 : 0
  name                = "pe-${azurerm_storage_account.blob.name}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  subnet_id           = azurerm_subnet.private_endpoints[0].id
  tags                = local.tags

  private_service_connection {
    name                           = "blob-connection"
    private_connection_resource_id = azurerm_storage_account.blob.id
    subresource_names              = ["blob"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "blob-dns-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.blob[0].id]
  }
}

# ============================================================================
# Function App Settings Additions
# ============================================================================
locals {
  blob_app_settings = {
    "BLOB_STORAGE__blobServiceUri" = azurerm_storage_account.blob.primary_blob_endpoint
    "BLOB_CONTAINER_NAME"          = var.blob_container_name
  }
}

# ============================================================================
# Outputs
# ============================================================================
output "BLOB_STORAGE_ACCOUNT_NAME" {
  value = azurerm_storage_account.blob.name
}

output "BLOB_STORAGE_ENDPOINT" {
  value = azurerm_storage_account.blob.primary_blob_endpoint
}

output "BLOB_CONTAINER_NAME" {
  value = var.blob_container_name
}
