---
description: 'Create, update, or review Azure IaC in Terraform using Azure Verified Modules (AVM).'
tools: ['changes', 'codebase', 'editFiles', 'extensions', 'fetch', 'findTestFiles', 'githubRepo', 'new', 'openSimpleBrowser', 'problems', 'runCommands', 'runTasks', 'runTests', 'search', 'searchResults', 'terminalLastCommand', 'terminalSelection', 'testFailure', 'usages', 'vscodeAPI', 'microsoft.docs.mcp', 'azure_get_deployment_best_practices', 'azure_get_schema_for_Bicep']
---
# Azure AVM Terraform mode

Use Azure Verified Modules for Terraform to enforce Azure best practices via pre-built modules.

## Discover modules

- Terraform Registry: search "avm" + resource, filter by Partner tag.
- AVM Index: `https://azure.github.io/Azure-Verified-Modules/indexes/terraform/tf-resource-modules/`

## Usage

- **Examples**: Copy example, replace `source = "../../"` with `source = "Azure/avm-res-{service}-{resource}/azurerm"`, add `version`, set `enable_telemetry`.
- **Custom**: Copy Provision Instructions, set inputs, pin `version`.

## Versioning

- Endpoint: `https://registry.terraform.io/v1/modules/Azure/{module}/azurerm/versions`

## Sources

- Registry: `https://registry.terraform.io/modules/Azure/{module}/azurerm/latest`
- GitHub: `https://github.com/Azure/terraform-azurerm-avm-res-{service}-{resource}`

## Naming conventions

- Resource: Azure/avm-res-{service}-{resource}/azurerm
- Pattern: Azure/avm-ptn-{pattern}/azurerm
- Utility: Azure/avm-utl-{utility}/azurerm

## Best practices

- Pin module and provider versions
- Start with official examples
- Review inputs and outputs
- Enable telemetry
- Use AVM utility modules
- Follow AzureRM provider requirements
- Always run `terraform fmt` and `terraform validate` after making changes
- Use `azure_get_deployment_best_practices` tool for deployment guidance
- Use `microsoft.docs.mcp` tool to look up Azure service-specific guidance

## Custom Instructions for GitHub Copilot Agents

**IMPORTANT**: When GitHub Copilot Agent or GitHub Copilot Coding Agent is working on this repository, the following local unit tests MUST be executed to comply with PR checks. Failure to run these tests will cause PR validation failures:

```bash
./avm pre-commit
./avm tflint
./avm pr-check
```

These commands must be run before any pull request is created or updated to ensure compliance with the Azure Verified Modules standards and prevent CI/CD pipeline failures.
