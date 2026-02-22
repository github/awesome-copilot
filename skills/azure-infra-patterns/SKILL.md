---
name: azure-infra-patterns
description: |
  Implementation patterns for Azure infrastructure using Bicep, Terraform, and Azure Verified Modules.
  Use when:
  (1) Implementing infrastructure-as-code for Azure resources
  (2) Choosing between Bicep and Terraform for a project
  (3) Using Azure Verified Modules (AVM) or Azure Landing Zone (ALZ) modules
  (4) Setting up CI/CD pipelines for infrastructure deployment
  (5) Converting architecture designs to deployable code
  (6) Implementing security-hardened resource configurations
  Triggers: Bicep, Terraform, IaC, infrastructure code, AVM, Azure Verified Modules,
  ALZ, Azure Landing Zones, ARM template, HCL, deployment
---

# Azure Infrastructure Implementation Patterns

Transform architecture designs into secure, repeatable infrastructure code.

## Tool Selection

| Factor | Bicep | Terraform |
|--------|-------|-----------|
| Azure-native | ✅ First-class | Good (AzureRM/AzAPI) |
| Multi-cloud | ❌ | ✅ |
| State management | Azure handles | Backend required |
| Module ecosystem | AVM | AVM + Registry |
| Learning curve | Lower | Medium |
| Team skills | Azure-focused | Platform engineers |

**Default choice**: Bicep for Azure-only projects, Terraform for multi-cloud or existing Terraform expertise.

## Project Structure

### Bicep Projects
```
project/
├── infra/
│   ├── main.bicep           # Entry point
│   ├── main.bicepparam      # Parameters
│   ├── modules/             # Custom modules
│   │   ├── networking/
│   │   ├── compute/
│   │   └── data/
│   └── environments/
│       ├── dev.bicepparam
│       └── prod.bicepparam
```

### Terraform Projects
```
project/
├── terraform/
│   ├── main.tf              # Root module
│   ├── variables.tf         # Input variables
│   ├── outputs.tf           # Outputs
│   ├── versions.tf          # Provider constraints
│   ├── backend.tf           # State backend
│   └── modules/
│       ├── networking/
│       └── compute/
```

## Azure Verified Modules (AVM)

Prefer AVM over custom implementations for production workloads.

### Bicep AVM Usage
```bicep
module storageAccount 'br/public:avm/res/storage/storage-account:0.9.0' = {
  name: 'storage-deployment'
  params: {
    name: storageAccountName
    location: location
    skuName: 'Standard_LRS'
    kind: 'StorageV2'
    publicNetworkAccess: 'Disabled'
    networkAcls: {
      defaultAction: 'Deny'
    }
  }
}

module keyVault 'br/public:avm/res/key-vault/vault:0.6.0' = {
  name: 'keyvault-deployment'
  params: {
    name: keyVaultName
    location: location
    enableRbacAuthorization: true
    enablePurgeProtection: true
  }
}
```

### Terraform AVM Usage
```hcl
module "storage_account" {
  source  = "Azure/avm-res-storage-storageaccount/azurerm"
  version = "0.1.0"

  name                = var.storage_account_name
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  
  public_network_access_enabled = false
  network_rules = {
    default_action = "Deny"
  }
}
```

## Security Requirements (Non-Negotiable)

Every resource must implement:

| Requirement | Implementation |
|-------------|----------------|
| No hardcoded credentials | Key Vault references |
| Managed identities | System or user-assigned |
| Encryption at rest | Platform or CMK |
| TLS 1.2 minimum | `minTlsVersion: 'TLS1_2'` |
| Private networking | Private endpoints |
| RBAC authorization | `enableRbacAuthorization: true` |

### Critical Security Settings
```bicep
// Storage - NEVER allow public access
resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  properties: {
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false      // Use RBAC
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

// Key Vault - NEVER disable purge protection
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  properties: {
    enablePurgeProtection: true      // NEVER false
    enableRbacAuthorization: true
    publicNetworkAccess: 'Disabled'
  }
}

// Container Registry - NEVER enable anonymous pull
resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  properties: {
    anonymousPullEnabled: false
    adminUserEnabled: false
  }
}
```

## Deployment Workflow

### Bicep Deployment
```bash
# 1. Validate
az bicep build --file infra/main.bicep

# 2. Preview (ALWAYS before deploy)
az deployment group what-if \
  --resource-group rg-prod \
  --template-file infra/main.bicep \
  --parameters @infra/environments/prod.bicepparam

# 3. Deploy
az deployment group create \
  --resource-group rg-prod \
  --template-file infra/main.bicep \
  --parameters @infra/environments/prod.bicepparam
```

### Terraform Deployment
```bash
# 1. Format and validate
terraform fmt -recursive
terraform validate

# 2. Plan (ALWAYS before apply)
terraform plan -out=tfplan

# 3. Apply
terraform apply tfplan
```

### Azure Developer CLI (azd)
```bash
# Preview
azd provision --preview

# Deploy infrastructure and application
azd up
```

## References

- **Bicep patterns**: See [references/bicep.md](references/bicep.md)
- **Terraform patterns**: See [references/terraform.md](references/terraform.md)
- **CI/CD pipelines**: See [references/cicd.md](references/cicd.md)
- **Naming conventions**: See [references/naming.md](references/naming.md)
