// recipes/sql/bicep/sql.bicep
// Azure SQL Database recipe module — adds SQL Server, database, and RBAC
// for Azure Functions with managed identity authentication.
//
// REQUIREMENTS FOR BASE TEMPLATE:
// 1. Storage account MUST have: allowSharedKeyAccess: false (Azure policy)
// 2. Storage account MUST have: allowBlobPublicAccess: false
// 3. Function app MUST have tag: union(tags, { 'azd-service-name': 'api' })
//
// USAGE: Add this as a module in your main.bicep:
//   module sql './app/sql.bicep' = {
//     name: 'sql'
//     scope: rg
//     params: {
//       name: name
//       location: location
//       tags: tags
//       functionAppPrincipalId: app.outputs.SERVICE_API_IDENTITY_PRINCIPAL_ID
//       aadAdminObjectId: principalId
//       aadAdminName: 'youruser@yourdomain.com'
//     }
//   }

targetScope = 'resourceGroup'

@description('Base name for resources')
param name string

@description('Azure region')
param location string = resourceGroup().location

@description('Resource tags')
param tags object = {}

@description('Principal ID of the Function App managed identity')
param functionAppPrincipalId string

@description('AAD admin object ID for SQL Server')
param aadAdminObjectId string

@description('AAD admin login name (UPN or group name)')
param aadAdminName string

@description('Database name')
param databaseName string = 'appdb'

@description('SQL Database SKU')
param sqlSku string = 'Basic'

// ============================================================================
// Naming
// ============================================================================
var resourceSuffix = take(uniqueString(subscription().id, resourceGroup().name, name), 6)
var sqlServerName = 'sql-${name}-${resourceSuffix}'

// ============================================================================
// SQL Server
// ============================================================================
resource sqlServer 'Microsoft.Sql/servers@2023-05-01-preview' = {
  name: sqlServerName
  location: location
  tags: tags
  properties: {
    version: '12.0'
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
    administrators: {
      administratorType: 'ActiveDirectory'
      principalType: 'User'
      login: aadAdminName
      sid: aadAdminObjectId
      tenantId: subscription().tenantId
      azureADOnlyAuthentication: true  // Entra-only, no SQL auth
    }
  }
}

// ============================================================================
// SQL Database (Serverless for cost optimization)
// ============================================================================
resource sqlDatabase 'Microsoft.Sql/servers/databases@2023-05-01-preview' = {
  parent: sqlServer
  name: databaseName
  location: location
  tags: tags
  sku: {
    name: sqlSku
    tier: sqlSku
  }
  properties: {
    collation: 'SQL_Latin1_General_CP1_CI_AS'
    maxSizeBytes: 2147483648  // 2GB
  }
}

// ============================================================================
// Firewall: Allow Azure Services
// ============================================================================
resource allowAzureServices 'Microsoft.Sql/servers/firewallRules@2023-05-01-preview' = {
  parent: sqlServer
  name: 'AllowAllAzureIps'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// ============================================================================
// NOTE: SQL RBAC for managed identity requires T-SQL
// The function app's managed identity must be added as a database user:
//
// CREATE USER [<function-app-name>] FROM EXTERNAL PROVIDER;
// ALTER ROLE db_datareader ADD MEMBER [<function-app-name>];
// ALTER ROLE db_datawriter ADD MEMBER [<function-app-name>];
//
// This cannot be done via ARM/Bicep - use a deployment script or post-deploy step.
// ============================================================================

// ============================================================================
// Outputs
// ============================================================================
output sqlServerName string = sqlServer.name
output sqlServerFqdn string = sqlServer.properties.fullyQualifiedDomainName
output sqlDatabaseName string = sqlDatabase.name
output sqlServerId string = sqlServer.id

// ============================================================================
// APP SETTINGS OUTPUT
// ============================================================================
@description('UAMI client ID from base template identity module - REQUIRED for UAMI auth')
param uamiClientId string = ''

output appSettings object = {
  SQL_CONNECTION_STRING: 'Server=tcp:${sqlServer.properties.fullyQualifiedDomainName},1433;Database=${databaseName};Authentication=Active Directory Managed Identity;User Id=${uamiClientId};Encrypt=True;TrustServerCertificate=False;'
  SQL_SERVER_NAME: sqlServer.name
  SQL_DATABASE_NAME: databaseName
}
