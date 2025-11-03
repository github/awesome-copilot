---
description: 'Terraform Conventions and Guidelines on SAP Business Technology Platform (SAP BTP).'
applyTo: '**/*.terraform, **/*.tf, **/*.tfvars, **/*.tflint.hcl, **/*.tfstate, **/*.tf.json, **/*.tfvars.json'
---

# Terraform on SAP BTP - Best Practices and Conventions

## General Instructions

- Use Terraform to provision and manage infrastructure.
- Use version control for your Terraform configurations.

## Security

- Always use the latest stable version of Terraform and its providers.
  - Regularly update your Terraform configurations to incorporate security patches and improvements.
- Never commit sensitive information such as credentials, API keys, passwords, certificates, or Terraform state to version control.
  - Use `.gitignore` to exclude files containing sensitive information from version control.
- Always mark sensitive variables as `sensitive = true` in your Terraform configurations.
  - This prevents sensitive values from being displayed in the Terraform plan or apply output.
- Use `ephemeral` secrets with write-only parameters when supported (Terraform v1.11+) to avoid storing secrets in state files.
- Avoid outputting sensitive data unless absolutely necessary.  
- Regularly review and audit your Terraform configurations for security vulnerabilities.
  - Use tools like `trivy`, `tfsec`, or `checkov` to scan your Terraform configurations for security issues.

## Modularity

- Use separate projects for each major component of the infrastructure; this:
  - Reduces complexity.
  - Makes it easier to manage and maintain configurations.
  - Speeds up `plan` and `apply` operations.
  - Allows for independent development and deployment of components.
  - Reduces the risk of accidental changes to unrelated resources.
- Use modules to avoid duplication of configurations.
  - Use modules to encapsulate related resources and configurations.
  - Use modules to simplify complex configurations and improve readability.
  - Avoid circular dependencies between modules.
  - Avoid unnecessary layers of abstraction; use modules only when they add value.
    - Avoid using modules for single resources; only use them for groups of related resources.
    - Avoid excessive nesting of modules; keep the module hierarchy shallow.
- Use `output` blocks to expose important information about your infrastructure.
  - Use outputs to provide information that is useful for other modules or for users of the configuration.
  - Avoid exposing sensitive information in outputs; mark outputs as `sensitive = true` if they contain sensitive data.

## Maintainability

- Prioritize readability, clarity, and maintainability.
- Use comments to explain complex configurations and why certain design decisions were made.
- Write concise, efficient, and idiomatic configs that are easy to understand.
- Avoid using hard-coded values; use variables for configuration instead.
  - Set default values for variables, where appropriate.
- Use data sources to retrieve information about existing resources instead of requiring manual configuration.
  - This reduces the risk of errors, ensures that configurations are always up-to-date, and allows configurations to adapt to different environments.
  - Avoid using data sources for resources that are created within the same configuration; use outputs instead.
  - Avoid using data sources in reusable modules. Prefer explicit module parameters over data source lookups.    
  - Avoid, or remove, unnecessary data sources; they slow down `plan` and `apply` operations.
- Use `locals` for values that are used multiple times to ensure consistency.

## Style and Formatting

### General Style Guidelines

- Follow Terraform best practices for resource naming and organization.
  - Use descriptive names for resources, variables, and outputs.
  - Use consistent naming conventions across all configurations.
  - Use snake_case for all variable names.
- Follow the **Terraform Style Guide** for formatting.
  - Use consistent indentation (2 spaces for each level).

### Folder Layout and File Organization

- Structure Terraform configurations with logical file separation:
  - Use `main.tf` for resources.
  - Use `variables.tf` for inputs.
  - Use `outputs.tf` for outputs.
  - Use `terraform.tf` for provider configurations.
  - Use `locals.tf` to abstract complex expressions and for better readability.
- Use a consistent folder structure for Terraform configurations.
- Use tfvars to modify environmental differences. In general, aim to keep environments similar.
- A **suggested** structure is:

  ```text
  my-sap-bto-app/
  ├── infra/                          # Terraform root module
  │   ├── main.tf                     # Core resources
  │   ├── variables.tf                # Input variables
  │   ├── outputs.tf                  # Outputs
  │   ├── provider.tf                # Provider configuration
  │   ├── locals.tf                   # Local values
  │   └── environments/               # Environment-specific configurations
  │       ├── dev.tfvars              # Development environment
  │       ├── test.tfvars             # Test environment
  │       └── prod.tfvars             # Production environment
  ├── .github/workflows/              # CI/CD pipelines (if using github)
  └── README.md                       # Documentation
  ```

- Never change the folder structure without direct agreement with the user.
- If the `main.tf` or `variables.tf` files grow too large, split them into multiple files by resource type or function (e.g., `main.services.tf`, `main.rolecollectionassignments.tf` - move equivalent variables to `variables.services.tf`, etc.)
- **Antipatterns** are 
  - branch per environment
  - repository per environment
  - folder per environment 
  - or similar layouts that make it hard to test the root folder logic between environments.

### Resource Block Organization

- Place `depends_on` blocks at the very beginning of resource definitions to make dependency relationships clear.
  - Use `depends_on` only when necessary to avoid circular dependencies.
- Place `for_each` and `count` blocks at the beginning of resource definitions to clarify the resource's instantiation logic.
  - Use `count` for 0-1 resources.
  - Use `for_each` for multiple resources.
  - Use `for_each` for collections and `count` for numeric iterations.
  - Prefer maps for stable resource addresses.
  - Place them after `depends_on` blocks, if they are present.
- Place `lifecycle` blocks at the end of resource definitions.
- Group related attributes together within blocks.
  - Place required attributes before optional ones, and comment each section accordingly.
  - Separate attribute sections with blank lines to improve readability.
  - Alphabetize attributes within each section for easier navigation.
- Use blank lines to separate logical sections of your configurations.

### Variables Style Standards

- All variables must have explicit type declarations.
- All variables must have a comprehensive descriptions. 
- Avoid nullable defaults for collection values unless there's a specific need.

### Locals Style Standards

- Use locals for computed values and complex expressions.
- Improve readability by extracting repeated expressions.
- Combine related values into structured locals.

### Outputs Style Standards

- Avoid unnecessary outputs, only use these to expose information needed by other configurations.
- Use `sensitive = true` for outputs containing secrets.
- Provide clear descriptions for all outputs.

### Formatting and Linting

- Use `terraform fmt -recursive` to format your configurations automatically.
- Use `tflint` to check for style violations and ensure configurations follow best practices.
- Run `tflint` regularly to catch style issues early in the development process.

## Documentation

- Always include `description` and `type` attributes for variables and outputs.
  - Use clear and concise descriptions to explain the purpose of each variable and output.
  - Use appropriate types for variables (e.g., `string`, `number`, `bool`, `list`, `map`).
- Document your Terraform configurations using comments, where appropriate.
  - Use comments to explain the purpose of resources and variables.
  - Use comments to explain complex configurations or decisions.
  - Avoid redundant comments; comments should add value and clarity.
- Include a `README.md` file in each project to provide an overview of the project and its structure.
  - Include instructions for setting up and using the configurations.
- Use `terraform-docs` to generate documentation for your configurations automatically.

## State Management

- Use remote backend with state locking
- Do not use SAP BTP Object Store as a backend for Terraform state as your access is too limited to ensure a proper state management
- Never commit state files to source control
- Enable encryption at rest and in transit

## Validation

- Run `terraform validate` to check syntax
- Ask before running `terraform plan`.  Terraform plan will require authentication information and the global account subdomain. The authentication information should be sourced from environment parameters or via tfvars, but **MUST NOT** be coded in the provider block.
- Test configurations in non-production environments first
- Ensure idempotency (multiple applies produce same result)

## Testing

- Write tests to validate the functionality of your Terraform configurations.
- Use the `.tftest.hcl` extension for test files.
- Write tests to cover both positive and negative scenarios.
- Ensure tests are idempotent and can be run multiple times without side effects.

## SAP BTP Provider Specifics

When provisioning SAP BTP resources, follow these additional best practices:

- Use the data source `btp_subaccount_service_plan` to retrieve service plan information when provisioning the resource `btp_subaccount_service_instance`
  - Sample code should look like this:
  
    ```terraform
    data "btp_subaccount_service_plan" "example" {
      subaccount_id = var.subaccount_id
      service_name  = "your_service_name"
      plan_name     = "your_plan_name"
    }
  
    resource "btp_subaccount_service_instance" "example" {
      subaccount_id  = var.subaccount_id
      serviceplan_id = data.btp_subaccount_service_plan.example.id 
      name           = "my-example-instance-new"
    }
    ```

- Use **explicit dependencies** between `btp_subaccount_entitlement` and the data source `btp_subaccount_service_plan` to ensure correct provisioning order for the resource `btp_subaccount_service_instance` that implictly dpeends on the data source. 
  - The connection between the resource `btp_subaccount_entitlement` and the data source `btp_subaccount_service_plan` is not automatically inferred by the provider.
  - The data source `btp_subaccount_service_plan` depends on the `btp_subaccount_entitlement`.
  - You can derive the dependency by comparing the `service_name` and `plan_name` of the resource and data source.
  - Sample code should look like this:
  
    ```terraform
    resource "btp_subaccount_entitlement" "example" {
      subaccount_id = var.subaccount_id
      service_name  = "your_service_name"
      plan_name     = "your_plan_name"
    }
  
    data "btp_subaccount_service_plan" "example" {
      subaccount_id = var.subaccount_id
      service_name  = "your_service_name"
      plan_name     = "your_plan_name"
  
      depends_on = [btp_subaccount_entitlement.example]
    } 
    ```

- Use **explicit dependencies** between `btp_subaccount_entitlement` and `btp_subaccount_subscription` resources to ensure correct provisioning order. 
  - The connection between `btp_subaccount_entitlement` and `btp_subaccount_subscription` is not automatically inferred by the provider.
  - The resource `btp_subaccount_subscription` depends on the `btp_subaccount_entitlement`.
  - You can derive the dependency by comparing the `app_name` with the `service_name` and the attributes `plan_name`.
- 

## Tool Integration

### Use Available Tools

- **Terraform MCP Serer**: Use the Terraform MCP server for provider specific guidance https://github.com/mcp/hashicorp/terraform-mcp-server

### Terraform Registry

- **Schema Information**: Use the Terraform Provider for SAP BTP at https://registry.terraform.io/providers/SAP/btp/latest/docs for SAP BTP resources available via the MCP server

## Anti-Patterns to Avoid

**Configuration:**

- MUST NOT hardcode values that should be parameterized
- MUST NOT use `terraform import` as a regular workflow pattern
- SHOULD avoid complex conditional logic that makes code hard to understand
- MUST NOT use `local-exec` provisioners unless absolutely necessary
- SHOULD NOT combine the Terraform provider for SAP BTP with the Terraform prpovider for Cloud Foundry in the same configuration

**Security:**

- MUST NEVER store secrets in Terraform files or state
- MUST NOT disable security features for convenience
- MUST NOT use default passwords or keys in resource configurations

**Operational:**

- MUST NOT apply Terraform changes directly to production without testing
- MUST avoid making manual changes to Terraform-managed resources
- MUST NOT ignore Terraform state file corruption or inconsistencies
- MUST NOT run Terraform from local machines for production
- SHOULD NOT use a Terraform state file (`**/*.tfstate`) for read operations
- MUST NOT use a Terraform state file (`**/*.tfstate`) for read operations all changes must be made via Terraform CLI or HCL.
