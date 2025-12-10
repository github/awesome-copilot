---
description: 'Azure Verified Modules (AVM) and Bicep'
applyTo: '**/*.bicep, **/*.bicepparam'
---

# Azure Verified Modules (AVM) Bicep

## Overview

Azure Verified Modules (AVM) are pre-built, tested, and validated Bicep modules that follow Azure best practices. Use these modules to create, update, or review Azure Infrastructure as Code (IaC) with confidence.

## Module Discovery

### Bicep Public Registry

- Search for modules: `br/public:avm/res/{service}/{resource}:{version}`
- Browse available modules: `https://github.com/Azure/bicep-registry-modules/tree/main/avm/res`
- Example: `br/public:avm/res/storage/storage-account:0.30.0`

### Official AVM Index

- **Bicep Resource Modules**: `https://raw.githubusercontent.com/Azure/Azure-Verified-Modules/refs/heads/main/docs/static/module-indexes/BicepResourceModules.csv`
- **Bicep Pattern Modules**: `https://raw.githubusercontent.com/Azure/Azure-Verified-Modules/refs/heads/main/docs/static/module-indexes/BicepPatternModules.csv`

### Module Documentation

- **GitHub Repository**: `https://github.com/Azure/bicep-registry-modules/tree/main/avm/res/{service}/{resource}`
- **README**: Each module contains comprehensive documentation with examples

## Module Usage

### From Examples

1. Review module README in `https://github.com/Azure/bicep-registry-modules/tree/main/avm/res/{service}/{resource}`
2. Copy example code from module documentation
3. Reference module using `br/public:avm/res/{service}/{resource}:{version}`
4. Configure required and optional parameters

### Example Usage

```bicep
module storageAccount 'br/public:avm/res/storage/storage-account:0.30.0' = {
  name: 'storage-account-deployment'
  scope: resourceGroup()
  params: {
    name: storageAccountName
    location: location
    skuName: 'Standard_LRS'
    tags: tags
  }
}
```

### When AVM Module Not Available

If no AVM module exists for a resource type, use native Bicep resource declarations with latest stable API version.

## Naming Conventions

### Module References

- **Resource Modules**: `br/public:avm/res/{service}/{resource}:{version}`
- **Pattern Modules**: `br/public:avm/ptn/{pattern}:{version}`
- Example: `br/public:avm/res/network/virtual-network:0.7.2`

### Symbolic Names

- Use lowerCamelCase for all names (variables, parameters, resources, modules)
- Use resource type descriptive names (e.g., `storageAccount` not `storageAccountName`)
- Avoid 'name' suffix in symbolic names as they represent the resource, not the resource's name
- Avoid distinguishing variables and parameters by suffixes

## Version Management

### Version Pinning Best Practices

- Always pin to specific module versions: `:{version}`
- Use semantic versioning (e.g., `:0.30.0`)
- Review module changelog before upgrading
- Test version upgrades in non-production environments first

## Development Best Practices

### Module Discovery and Usage

- ✅ **Always** check for existing AVM modules before creating raw resources
- ✅ **Review** module documentation and examples before implementation
- ✅ **Pin** module versions explicitly
- ✅ **Use** types from modules when available (import types from module)
- ✅ **Prefer** AVM modules over raw resource declarations

### Code Structure

- ✅ **Declare** parameters at top of file with `@sys.description()` decorators
- ✅ **Specify** `@minLength()` and `@maxLength()` for naming parameters
- ✅ **Use** `@allowed()` decorator sparingly to avoid blocking valid deployments
- ✅ **Set** default values safe for test environments (low-cost SKUs)
- ✅ **Use** variables for complex expressions instead of embedding in resource properties
- ✅ **Leverage** `loadJsonContent()` for external configuration files

### Resource References

- ✅ **Use** symbolic names for references (e.g., `storageAccount.id`) not `reference()` or `resourceId()`
- ✅ **Create** dependencies through symbolic names, not explicit `dependsOn`
- ✅ **Use** `existing` keyword for accessing properties from other resources
- ✅ **Access** module outputs via dot notation (e.g., `storageAccount.outputs.resourceId`)

### Resource Naming

- ✅ **Use** `uniqueString()` with meaningful prefixes for unique names
- ✅ **Add** prefixes since some resources don't allow names starting with numbers
- ✅ **Respect** resource-specific naming constraints (length, characters)

### Child Resources

- ✅ **Avoid** excessive nesting of child resources
- ✅ **Use** `parent` property or nesting instead of constructing names manually

### Security

- ❌ **Never** include secrets or keys in outputs
- ✅ **Use** resource properties directly in outputs (e.g., `storageAccount.outputs.primaryBlobEndpoint`)
- ✅ **Enable** managed identities where possible
- ✅ **Disable** public access when network isolation is enabled

### Types

- ✅ **Import** types from modules when available: `import { deploymentType } from './module.bicep'`
- ✅ **Use** user-defined types for complex parameter structures
- ✅ **Leverage** type inference for variables

### Documentation

- ✅ **Include** helpful `//` comments for complex logic
- ✅ **Use** `@sys.description()` on all parameters with clear explanations
- ✅ **Document** non-obvious design decisions

## Validation Requirements

### Build Validation (MANDATORY)

After any changes to Bicep files, run the following commands to ensure all files build successfully:

```shell
# Ensure Bicep CLI is up to date
az bicep upgrade

# Build and validate changed Bicep files
az bicep build --file main.bicep
```

### Bicep Parameter Files

- ✅ **Always** update accompanying `*.bicepparam` files when modifying `*.bicep` files
- ✅ **Validate** parameter files match current parameter definitions
- ✅ **Test** deployments with parameter files before committing

## Tool Integration

### Use Available Tools

- **Schema Information**: Use `azure_get_schema_for_Bicep` for resource schemas
- **Deployment Guidance**: Use `azure_get_deployment_best_practices` tool
- **Service Documentation**: Use `microsoft.docs.mcp` for Azure service-specific guidance

### GitHub Copilot Integration

When working with Bicep:

1. Check for existing AVM modules before creating resources
2. Use official module examples as starting points
3. Run `az bicep build` after all changes
4. Update accompanying `.bicepparam` files
5. Document customizations or deviations from examples

## Troubleshooting

### Common Issues

1. **Module Version**: Always specify exact version in module reference
2. **Missing Dependencies**: Ensure resources are created before dependent modules
3. **Validation Failures**: Run `az bicep build` to identify syntax/type errors
4. **Parameter Files**: Ensure `.bicepparam` files are updated when parameters change

### Support Resources

- **AVM Documentation**: `https://azure.github.io/Azure-Verified-Modules/`
- **Bicep Registry**: `https://github.com/Azure/bicep-registry-modules`
- **Bicep Documentation**: `https://learn.microsoft.com/azure/azure-resource-manager/bicep/`
- **Best Practices**: `https://learn.microsoft.com/azure/azure-resource-manager/bicep/best-practices`

## Compliance Checklist

Before submitting any Bicep code:

- [ ] AVM modules used where available
- [ ] Module versions are pinned
- [ ] Code builds successfully (`az bicep build`)
- [ ] Accompanying `.bicepparam` files updated
- [ ] `@sys.description()` on all parameters
- [ ] Symbolic names used for references
- [ ] No secrets in outputs
- [ ] Types imported/defined where appropriate
- [ ] Comments added for complex logic
- [ ] Follows lowerCamelCase naming convention
