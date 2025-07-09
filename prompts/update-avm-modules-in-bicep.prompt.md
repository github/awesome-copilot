---
mode: 'agent'
description: 'Update Azure Verified Modules (AVM) to latest versions in Bicep files.'
tools: ['changes', 'codebase', 'editFiles', 'fetch', 'runCommands', 'azure_get_deployment_best_practices', 'azure_get_schema_for_Bicep']
---
# Update Azure Verified Modules in Bicep Files

Update Bicep file `${file}` to use latest Azure Verified Module (AVM) versions.

## Process

1. **Scan**: Extract AVM modules and current versions from `${file}`
2. **Check**: Fetch latest versions from MCR: `https://mcr.microsoft.com/v2/bicep/avm/res/{service}/{resource}/tags/list`
3. **Compare**: Parse semantic versions to identify updates
4. **Review**: For breaking changes, fetch docs from: `https://github.com/Azure/bicep-registry-modules/tree/main/avm/res/{service}/{resource}`
5. **Update**: Apply version updates and parameter changes
6. **Validate**: Run `bicep lint` to ensure compliance

## Breaking Change Policy

⚠️ **PAUSE for approval** if updates involve:

- Incompatible parameter changes
- Security/compliance modifications
- Behavioral changes

## Output Format

Display results in table with icons:

| Module | Current | Latest | Status | Action | Docs |
|--------|---------|--------|--------|--------|------|
| avm/res/compute/vm | 0.1.0 | 0.2.0 | 🔄 | Updated | [📖](link) |
| avm/res/storage/account | 0.3.0 | 0.3.0 | ✅ | Current | [📖](link) |

## Icons

- 🔄 Updated
- ✅ Current
- ⚠️ Manual review required
- ❌ Failed
- 📖 Documentation

## Requirements

- Use MCR tags API only for version discovery
- Parse JSON tags array and sort by semantic versioning
- Maintain Bicep file validity and linting compliance
