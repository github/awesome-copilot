# recipes/sql/terraform/sql.tf
# Azure SQL Database recipe module for Terraform — adds SQL Server, database,
# and configuration for Azure Functions with managed identity authentication.
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
variable "sql_database_name" {
  type        = string
  default     = "appdb"
  description = "SQL Database name"
}

variable "sql_admin_object_id" {
  type        = string
  description = "AAD admin object ID for SQL Server"
}

variable "sql_admin_login" {
  type        = string
  description = "AAD admin login name (UPN or group name)"
}

# ============================================================================
# Naming
# ============================================================================
resource "azurecaf_name" "sql_server" {
  name          = var.environment_name
  resource_type = "azurerm_mssql_server"
  random_length = 5
}

# ============================================================================
# SQL Server
# ============================================================================
resource "azurerm_mssql_server" "main" {
  name                          = azurecaf_name.sql_server.result
  resource_group_name           = azurerm_resource_group.main.name
  location                      = azurerm_resource_group.main.location
  version                       = "12.0"
  minimum_tls_version           = "1.2"
  public_network_access_enabled = true

  azuread_administrator {
    login_username              = var.sql_admin_login
    object_id                   = var.sql_admin_object_id
    tenant_id                   = data.azurerm_client_config.current.tenant_id
    azuread_authentication_only = true # Entra-only, no SQL auth
  }

  tags = local.tags
}

# ============================================================================
# SQL Database
# ============================================================================
resource "azurerm_mssql_database" "main" {
  name        = var.sql_database_name
  server_id   = azurerm_mssql_server.main.id
  collation   = "SQL_Latin1_General_CP1_CI_AS"
  sku_name    = "Basic"
  max_size_gb = 2

  tags = local.tags
}

# ============================================================================
# Firewall: Allow Azure Services
# ============================================================================
resource "azurerm_mssql_firewall_rule" "allow_azure" {
  name             = "AllowAllAzureIps"
  server_id        = azurerm_mssql_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# ============================================================================
# NOTE: SQL RBAC for managed identity requires T-SQL
# The function app's managed identity must be added as a database user:
#
# CREATE USER [<function-app-name>] FROM EXTERNAL PROVIDER;
# ALTER ROLE db_datareader ADD MEMBER [<function-app-name>];
# ALTER ROLE db_datawriter ADD MEMBER [<function-app-name>];
#
# This cannot be done via Terraform - use a null_resource with sqlcmd or
# a post-deploy script.
# ============================================================================

# ============================================================================
# Networking: Private Endpoint (conditional on vnet_enabled)
# ============================================================================
resource "azurerm_private_dns_zone" "sql" {
  count               = var.vnet_enabled ? 1 : 0
  name                = "privatelink.database.windows.net"
  resource_group_name = azurerm_resource_group.main.name
  tags                = local.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "sql" {
  count                 = var.vnet_enabled ? 1 : 0
  name                  = "sql-dns-link"
  resource_group_name   = azurerm_resource_group.main.name
  private_dns_zone_name = azurerm_private_dns_zone.sql[0].name
  virtual_network_id    = azurerm_virtual_network.main[0].id
}

resource "azurerm_private_endpoint" "sql" {
  count               = var.vnet_enabled ? 1 : 0
  name                = "pe-${azurerm_mssql_server.main.name}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  subnet_id           = azurerm_subnet.private_endpoints[0].id
  tags                = local.tags

  private_service_connection {
    name                           = "sql-connection"
    private_connection_resource_id = azurerm_mssql_server.main.id
    subresource_names              = ["sqlServer"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "sql-dns-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.sql[0].id]
  }
}

# ============================================================================
# Function App Settings Additions
# ============================================================================
locals {
  sql_app_settings = {
    "SQL_CONNECTION_STRING" = "Server=tcp:${azurerm_mssql_server.main.fully_qualified_domain_name},1433;Database=${var.sql_database_name};Authentication=Active Directory Managed Identity;Encrypt=True;TrustServerCertificate=False;"
    "SQL_SERVER_NAME"       = azurerm_mssql_server.main.name
    "SQL_DATABASE_NAME"     = var.sql_database_name
  }
}

# ============================================================================
# Outputs
# ============================================================================
output "SQL_SERVER_NAME" {
  value = azurerm_mssql_server.main.name
}

output "SQL_SERVER_FQDN" {
  value = azurerm_mssql_server.main.fully_qualified_domain_name
}

output "SQL_DATABASE_NAME" {
  value = var.sql_database_name
}
