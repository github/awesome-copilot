# Azure Verified Modules (AVM) Instructions

## Overview

Azure Verified Modules (AVM) are pre-built, tested, and validated Terraform and Bicep modules that follow Azure best practices. Use these modules to create, update, or review Azure Infrastructure as Code (IaC) with confidence.

## Critical Compliance Requirements

**⚠️ MANDATORY for GitHub Copilot Agents**: When GitHub Copilot Agent or GitHub Copilot Coding Agent is working on AVM repositories, the following local unit tests MUST be executed before any pull request is created or updated:

```bash
./avm pre-commit
./avm tflint
./avm pr-check
```

**Failure to run these tests will cause PR validation failures and prevent successful merges.**

## Module Discovery

### Terraform Registry
- Search for "avm" + resource name
- Filter by "Partner" tag to find official AVM modules
- Example: Search "avm storage account" → filter by Partner

### Official AVM Index
- **Terraform Resources**: `https://azure.github.io/Azure-Verified-Modules/indexes/terraform/tf-resource-modules/`
- **Terraform Patterns**: `https://azure.github.io/Azure-Verified-Modules/indexes/terraform/tf-pattern-modules/`
- **Bicep Resources**: `https://azure.github.io/Azure-Verified-Modules/indexes/bicep/bicep-resource-modules/`
- **Bicep Patterns**: `https://azure.github.io/Azure-Verified-Modules/indexes/bicep/bicep-pattern-modules/`

## Terraform Module Usage

### From Examples
1. Copy the example code from the module documentation
2. Replace `source = "../../"` with `source = "Azure/avm-res-{service}-{resource}/azurerm"`
3. Add `version = "~> 1.0"` (use latest available)
4. Set `enable_telemetry = true`

### From Scratch
1. Copy the Provision Instructions from module documentation
2. Configure required and optional inputs
3. Pin the module version
4. Enable telemetry

### Example Usage
```hcl
module "storage_account" {
  source  = "Azure/avm-res-storage-storageaccount/azurerm"
  version = "~> 0.1"

  enable_telemetry    = true
  location            = "East US"
  name                = "mystorageaccount"
  resource_group_name = "my-rg"

  # Additional configuration...
}
```

## Naming Conventions

### Module Types
- **Resource Modules**: `Azure/avm-res-{service}-{resource}/azurerm`
  - Example: `Azure/avm-res-storage-storageaccount/azurerm`
- **Pattern Modules**: `Azure/avm-ptn-{pattern}/azurerm`
  - Example: `Azure/avm-ptn-aks-enterprise/azurerm`
- **Utility Modules**: `Azure/avm-utl-{utility}/azurerm`
  - Example: `Azure/avm-utl-regions/azurerm`

### Service Naming
- Use kebab-case for services and resources
- Follow Azure service names (e.g., `storage-storageaccount`, `network-virtualnetwork`)

## Version Management

### Check Available Versions
- Endpoint: `https://registry.terraform.io/v1/modules/Azure/{module}/azurerm/versions`
- Example: `https://registry.terraform.io/v1/modules/Azure/avm-res-storage-storageaccount/azurerm/versions`

### Version Pinning Best Practices
- Use pessimistic version constraints: `version = "~> 1.0"`
- Pin to specific versions for production: `version = "1.2.3"`
- Always review changelog before upgrading

## Module Sources

### Terraform Registry
- **URL Pattern**: `https://registry.terraform.io/modules/Azure/{module}/azurerm/latest`
- **Example**: `https://registry.terraform.io/modules/Azure/avm-res-storage-storageaccount/azurerm/latest`

### GitHub Repository
- **URL Pattern**: `https://github.com/Azure/terraform-azurerm-avm-{type}-{service}-{resource}`
- **Examples**:
  - Resource: `https://github.com/Azure/terraform-azurerm-avm-res-storage-storageaccount`
  - Pattern: `https://github.com/Azure/terraform-azurerm-avm-ptn-aks-enterprise`

## Development Best Practices

### Module Usage
- ✅ **Always** pin module and provider versions
- ✅ **Start** with official examples from module documentation
- ✅ **Review** all inputs and outputs before implementation
- ✅ **Enable** telemetry: `enable_telemetry = true`
- ✅ **Use** AVM utility modules for common patterns
- ✅ **Follow** AzureRM provider requirements and constraints

### Code Quality
- ✅ **Always** run `terraform fmt` after making changes
- ✅ **Always** run `terraform validate` after making changes
- ✅ **Use** meaningful variable names and descriptions
- ✅ **Add** proper tags and metadata
- ✅ **Document** complex configurations

### Validation Requirements
Before creating or updating any pull request:

```bash
# Format code
terraform fmt -recursive

# Validate syntax
terraform validate

# AVM-specific validation (MANDATORY)
./avm pre-commit
./avm tflint
./avm pr-check
```

## Tool Integration

### Use Available Tools
- **Deployment Guidance**: Use `azure_get_deployment_best_practices` tool
- **Service Documentation**: Use `microsoft.docs.mcp` tool for Azure service-specific guidance
- **Schema Information**: Use `azure_get_schema_for_Bicep` for Bicep resources

### GitHub Copilot Integration
When working with AVM repositories:
1. Always check for existing modules before creating new resources
2. Use the official examples as starting points
3. Run all validation tests before committing
4. Document any customizations or deviations from examples

## Common Patterns

### Resource Group Module
```hcl
module "resource_group" {
  source  = "Azure/avm-res-resources-resourcegroup/azurerm"
  version = "~> 0.1"

  enable_telemetry = true
  location         = var.location
  name            = var.resource_group_name
}
```

### Virtual Network Module
```hcl
module "virtual_network" {
  source  = "Azure/avm-res-network-virtualnetwork/azurerm"
  version = "~> 0.1"

  enable_telemetry    = true
  location            = module.resource_group.location
  name                = var.vnet_name
  resource_group_name = module.resource_group.name
  address_space       = ["10.0.0.0/16"]
}
```

## Troubleshooting

### Common Issues
1. **Version Conflicts**: Always check compatibility between module and provider versions
2. **Missing Dependencies**: Ensure all required resources are created first
3. **Validation Failures**: Run AVM validation tools before committing
4. **Documentation**: Always refer to the latest module documentation

### Support Resources
- **AVM Documentation**: `https://azure.github.io/Azure-Verified-Modules/`
- **GitHub Issues**: Report issues in the specific module's GitHub repository
- **Community**: Azure Terraform Provider GitHub discussions

## Compliance Checklist

Before submitting any AVM-related code:

- [ ] Module version is pinned
- [ ] Telemetry is enabled
- [ ] Code is formatted (`terraform fmt`)
- [ ] Code is validated (`terraform validate`)
- [ ] AVM pre-commit checks pass (`./avm pre-commit`)
- [ ] TFLint checks pass (`./avm tflint`)
- [ ] AVM PR checks pass (`./avm pr-check`)
- [ ] Documentation is updated
- [ ] Examples are tested and working
