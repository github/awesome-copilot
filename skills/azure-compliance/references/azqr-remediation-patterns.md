# Remediation Patterns for Common azqr Findings

This document provides remediation templates for frequently identified compliance issues.

## Storage Account Issues

### Enable Private Endpoints

**Issue:** Storage account accessible via public endpoint

**Azure CLI:**
```bash
# Create private endpoint
az network private-endpoint create \
  --name pe-storage \
  --resource-group <rg-name> \
  --vnet-name <vnet-name> \
  --subnet <subnet-name> \
  --private-connection-resource-id $(az storage account show -n <storage-name> -g <rg-name> --query id -o tsv) \
  --group-id blob \
  --connection-name pe-storage-connection

# Disable public access
az storage account update \
  --name <storage-name> \
  --resource-group <rg-name> \
  --public-network-access Disabled
```

**Bicep:**
```bicep
resource privateEndpoint 'Microsoft.Network/privateEndpoints@2023-05-01' = {
  name: 'pe-${storageAccount.name}'
  location: location
  properties: {
    subnet: {
      id: subnet.id
    }
    privateLinkServiceConnections: [
      {
        name: 'pe-${storageAccount.name}-connection'
        properties: {
          privateLinkServiceId: storageAccount.id
          groupIds: ['blob']
        }
      }
    ]
  }
}
```

### Enable Soft Delete

**Issue:** No soft delete protection for blobs

**Azure CLI:**
```bash
az storage account blob-service-properties update \
  --account-name <storage-name> \
  --resource-group <rg-name> \
  --enable-delete-retention true \
  --delete-retention-days 7 \
  --enable-container-delete-retention true \
  --container-delete-retention-days 7
```

**Bicep:**
```bicep
resource blobServices 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    deleteRetentionPolicy: {
      enabled: true
      days: 7
    }
    containerDeleteRetentionPolicy: {
      enabled: true
      days: 7
    }
  }
}
```

---

## Key Vault Issues

### Enable Purge Protection

**Issue:** Key Vault can be permanently deleted

**Azure CLI:**
```bash
az keyvault update \
  --name <vault-name> \
  --resource-group <rg-name> \
  --enable-purge-protection true
```

**Bicep:**
```bicep
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    // ... other properties
  }
}
```

### Use RBAC for Data Plane

**Issue:** Using access policies instead of RBAC

**Azure CLI:**
```bash
az keyvault update \
  --name <vault-name> \
  --resource-group <rg-name> \
  --enable-rbac-authorization true
```

---

## Virtual Machine Issues

### Enable Diagnostic Settings

**Issue:** No diagnostics configured for VM

**Azure CLI:**
```bash
# Create Log Analytics workspace (if needed)
az monitor log-analytics workspace create \
  --resource-group <rg-name> \
  --workspace-name <workspace-name>

# Enable diagnostics
az monitor diagnostic-settings create \
  --name diag-vm \
  --resource $(az vm show -g <rg-name> -n <vm-name> --query id -o tsv) \
  --workspace $(az monitor log-analytics workspace show -g <rg-name> -n <workspace-name> --query id -o tsv) \
  --metrics '[{"category": "AllMetrics", "enabled": true}]'
```

**Bicep:**
```bicep
resource diagnosticSettings 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'diag-${vm.name}'
  scope: vm
  properties: {
    workspaceId: logAnalyticsWorkspace.id
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}
```

### Enable Azure Backup

**Issue:** VM not protected by Azure Backup

**Azure CLI:**
```bash
# Create Recovery Services vault (if needed)
az backup vault create \
  --resource-group <rg-name> \
  --name <vault-name> \
  --location <location>

# Enable backup with default policy
az backup protection enable-for-vm \
  --resource-group <rg-name> \
  --vault-name <vault-name> \
  --vm $(az vm show -g <rg-name> -n <vm-name> --query id -o tsv) \
  --policy-name DefaultPolicy
```

---

## AKS Issues

### Enable Defender for Containers

**Issue:** No security monitoring for AKS

**Azure CLI:**
```bash
az aks update \
  --resource-group <rg-name> \
  --name <cluster-name> \
  --enable-defender
```

**Bicep:**
```bicep
resource aksCluster 'Microsoft.ContainerService/managedClusters@2024-01-01' = {
  name: clusterName
  location: location
  properties: {
    securityProfile: {
      defender: {
        securityMonitoring: {
          enabled: true
        }
        logAnalyticsWorkspaceResourceId: logAnalyticsWorkspace.id
      }
    }
    // ... other properties
  }
}
```

### Use Managed Identity

**Issue:** AKS using service principal instead of managed identity

**Azure CLI:**
```bash
az aks update \
  --resource-group <rg-name> \
  --name <cluster-name> \
  --enable-managed-identity
```

---

## SQL Database Issues

### Enable Auditing

**Issue:** SQL Server auditing not enabled

**Azure CLI:**
```bash
# Enable to Log Analytics
az sql server audit-policy update \
  --resource-group <rg-name> \
  --name <server-name> \
  --state Enabled \
  --lats Enabled \
  --lawri $(az monitor log-analytics workspace show -g <rg-name> -n <workspace-name> --query id -o tsv)
```

**Bicep:**
```bicep
resource sqlAudit 'Microsoft.Sql/servers/auditingSettings@2023-05-01-preview' = {
  parent: sqlServer
  name: 'default'
  properties: {
    state: 'Enabled'
    isAzureMonitorTargetEnabled: true
    retentionDays: 90
  }
}
```

### Enable Private Endpoint

**Issue:** SQL Server accessible via public endpoint

**Azure CLI:**
```bash
# Create private endpoint
az network private-endpoint create \
  --name pe-sql \
  --resource-group <rg-name> \
  --vnet-name <vnet-name> \
  --subnet <subnet-name> \
  --private-connection-resource-id $(az sql server show -g <rg-name> -n <server-name> --query id -o tsv) \
  --group-id sqlServer \
  --connection-name pe-sql-connection

# Disable public access
az sql server update \
  --resource-group <rg-name> \
  --name <server-name> \
  --enable-public-network false
```

---

## App Service Issues

### Use Managed Identity

**Issue:** App Service not using managed identity

**Azure CLI:**
```bash
az webapp identity assign \
  --resource-group <rg-name> \
  --name <app-name>
```

**Bicep:**
```bicep
resource webApp 'Microsoft.Web/sites@2023-01-01' = {
  name: appName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    // ... other properties
  }
}
```

### Enforce HTTPS Only

**Issue:** HTTP traffic allowed

**Azure CLI:**
```bash
az webapp update \
  --resource-group <rg-name> \
  --name <app-name> \
  --https-only true
```

### Set Minimum TLS Version

**Issue:** TLS version below 1.2

**Azure CLI:**
```bash
az webapp config set \
  --resource-group <rg-name> \
  --name <app-name> \
  --min-tls-version 1.2
```

---

## Bulk Remediation Script

For multiple resources of the same type, use a loop:

```powershell
# Example: Enable soft delete on all storage accounts
$storageAccounts = az storage account list --query "[].{name:name, rg:resourceGroup}" -o json | ConvertFrom-Json

foreach ($sa in $storageAccounts) {
    Write-Host "Enabling soft delete on $($sa.name)..."
    az storage account blob-service-properties update `
        --account-name $sa.name `
        --resource-group $sa.rg `
        --enable-delete-retention true `
        --delete-retention-days 7
}
```

---

## Remediation Validation

After applying fixes, re-run the azqr scan using the Azure MCP tool to verify the issues have been resolved:

```
mcp_azure_mcp_extension_azqr
  subscription: <subscription-id>
```

## Additional Resources

- [Azure CLI Reference](https://learn.microsoft.com/cli/azure/)
- [Bicep Documentation](https://learn.microsoft.com/azure/azure-resource-manager/bicep/)
- [Azure Policy Built-in Definitions](https://learn.microsoft.com/azure/governance/policy/samples/built-in-policies)
