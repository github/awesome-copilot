---
description: 'Infrastructure as Code with Bicep'
applyTo: '**/*.bicep, **/*.bicepparam, **/bicepconfig.json'
---

## Naming Conventions

-   When writing Bicep code, use lowerCamelCase for all names (variables, parameters, resources)
-   Use resource type descriptive symbolic names (e.g., 'storageAccount' not 'storageAccountName')
-   Avoid using 'name' in a symbolic name as it represents the resource, not the resource's name
-   Avoid distinguishing variables and parameters by the use of suffixes

## Structure and Declaration

-   Always declare parameters at the top of files with @description decorators
-   Use latest stable API versions for all resources
-   Use descriptive @description decorators for all parameters
-   Specify minimum and maximum character length for naming parameters

## Parameters

-   Set default values that are safe for test environments (use low-cost pricing tiers)
-   Use @allowed decorator sparingly to avoid blocking valid deployments
-   Use parameters for settings that change between deployments
-   Use `.bicepparam` files with a `using` declaration when supported by the project's tool versions; retain JSON parameter files where required. Keep secrets out of parameter files and use supported secret references.
-   Use supported user-defined object types for structured parameter contracts when they make validation clearer.

## Modules and Validation

-   Prefer an appropriate Azure Verified Module when it meets the project's requirements, and reference a specific module version. Preserve existing module versions during unrelated changes.
-   Respect the project's Bicep CLI version and `bicepconfig.json` linter settings. Run the project's Bicep build/lint checks before deployment, and resolve diagnostics rather than disabling rules globally.

## Variables

-   Variables automatically infer type from the resolved value
-   Use variables to contain complex expressions instead of embedding them directly in resource properties

## Resource References

-   Use symbolic names for resource references instead of reference() or resourceId() functions
-   Create resource dependencies through symbolic names (resourceA.id) not explicit dependsOn
-   For accessing properties from other resources, use the 'existing' keyword instead of passing values through outputs

## Resource Names

-   Use template expressions with uniqueString() to create meaningful and unique resource names
-   Add prefixes to uniqueString() results since some resources don't allow names starting with numbers

## Child Resources

-   Avoid excessive nesting of child resources
-   Use parent property or nesting instead of constructing resource names for child resources

## Security

-   Never include secrets or keys in outputs
-   Use resource properties directly in outputs (e.g., storageAccount.properties.primaryEndpoints)

## Documentation

-   Include helpful // comments within your Bicep files to improve readability

## References

-   [Bicep modules and Azure Verified Modules](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/modules)
-   [Bicep parameter files](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/parameter-files)
-   [Bicep linter](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/linter)
