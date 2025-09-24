---
description: 'Create or modify solutions built using Terraform on Azure.'
applyTo: '**/*.terraform, **/*.tf, **/*.tfvars, **/*.tflint.hcl, **/*.tfstate, **/*.tf.json, **/*.tfvars.json'
---

# Azure Terraform Best Practices

## Integration and Self-Containment

This instruction set extends the universal DevOps Core Principles and Taming Copilot directives for Azure/Terraform scenarios. It assumes those foundational rules are loaded but includes summaries here for self-containment. If the general rules are not present, these summaries serve as defaults to maintain behavioral consistency.

### Incorporated DevOps Core Principles (CALMS Framework)

- **Culture**: Foster collaborative, blameless culture with shared responsibility and continuous learning.
- **Automation**: Automate everything possible across the software delivery lifecycle to reduce manual effort and errors.
- **Lean**: Eliminate waste, maximize flow, and deliver value continuously by reducing batch sizes and bottlenecks.
- **Measurement**: Measure everything relevant (e.g., DORA metrics: Deployment Frequency, Lead Time for Changes, Change Failure Rate, Mean Time to Recovery) to drive improvement.
- **Sharing**: Promote knowledge sharing, collaboration, and transparency across teams.

### Incorporated Taming Copilot Directives (Behavioral Hierarchy)

- **Primacy of User Directives**: Direct user commands take highest priority.
- **Factual Verification**: Prioritize tools for current, factual answers over internal knowledge.
- **Adherence to Philosophy**: Follow minimalist, surgical approaches—code on request only, minimal necessary changes, direct and concise responses.
- **Tool Usage**: Use tools purposefully; declare intent before action; prefer parallel calls when possible.

These summaries ensure the mode functions independently while aligning with the broader chat mode context. For full details, reference the original DevOps Core Principles and Taming Copilot instructions.

## Chat Mode Integration

When operating in chat mode with these instructions loaded:

- Treat this as a self-contained extension that incorporates summarized general rules for independent operation.
- Prioritize user directives over automated actions, especially for terraform commands beyond validate.
- Use implicit dependencies where possible and confirm before any terraform plan or apply operations.
- Maintain minimalist responses and surgical code changes, aligning with the incorporated Taming philosophy.
- **Planning Files Awareness**: Always check for planning files in the `.terraform-planning-files/` folder (if present). Read and incorporate relevant details from these files into responses, especially for migration or implementation plans. If speckit or similar planning files exist in user-specified folders, prompt the user to confirm inclusion or read them explicitly.

## 1. Overview

These instructions provide Azure-specific guidance for solutions created Terraform, including how to incorporate and use Azure Verified Modules.

For general Terraform conventions, see [terraform.instructions.md](terraform.instructions.md).

For development of modules, especially Azure Verified Modules, see [azure-verified-modules-terraform.instructions.md](azure-verified-modules-terraform.instructions.md).

## 2. Anti-Patterns to Avoid

**Configuration:**

- MUST NOT hardcode values that should be parameterized
- SHOULD NOT use `terraform import` as a regular workflow pattern
- SHOULD avoid complex conditional logic that makes code hard to understand
- MUST NOT use `local-exec` provisioners unless absolutely necessary

**Security:**

- MUST NEVER store secrets in Terraform files or state
- MUST avoid overly permissive IAM roles or network rules
- MUST NOT disable security features for convenience
- MUST NOT use default passwords or keys

**Operational:**

- MUST NOT apply Terraform changes directly to production without testing
- MUST avoid making manual changes to Terraform-managed resources
- MUST NOT ignore Terraform state file corruption or inconsistencies
- MUST NOT run Terraform from local machines for production
- MUST only use a Terraform state file (`**/*.tfstate`) for read only operations, all changes must be made via Terraform CLI or HCL.
- MUST only use the contents of `**/.terraform/**` (fetched modules and providers) for read only operations.

These build on the incorporated Taming Copilot directives for secure, operational practices.

---

## 3. Organize Code Cleanly

Structure Terraform configurations with logical file separation:

- Use `main.tf` for resources
- Use `variables.tf` for inputs
- Use `outputs.tf` for outputs
- Use `terraform.tf` for provider configurations
- Use `locals.tf` to abstract complex expressions and for better readability
- Follow consistent naming conventions and formatting (`terraform fmt`)
- If the main.tf or variables.tf files grow too large, split them into multiple files by resource type or function (e.g., `main.networking.tf`, `main.storage.tf` - move equivalent variables to `variables.networking.tf`, etc.)

Use `snake_casing` for variables and module names.

## 4. Use Azure Verified Modules (AVM)

Any significant resource should use an AVM if available. AVMs are designed to be aligned to the Well Architected Framework, are supported and maintained by Microsoft helping reduce the amount of code to be maintained. Information about how to discover these is available in [Azure Verified Modules for Terraform](azure-verified-modules-terraform.instructions.md).

If an Azure Verified Module is not available for the resource, suggest creating one "in the style of" AVM in order to align to existing work and provide an opportunity to contribute upstream to the community.

An exception to this instruction is if the user has been directed to use an internal private registry, or explicitly states they do not wish to use Azure Verified Modules.

This aligns with the incorporated DevOps Automation principle by leveraging pre-validated, community-maintained modules.

## 5. Variable and Code Style Standards

Follow AVM-aligned coding standards in solution code to maintain consistency:

- **Variable naming**: Use snake_case for all variable names (per TFNFR4 and TFNFR16). Be descriptive and consistent with naming conventions.
- **Variable definitions**: All variables must have explicit type declarations (per TFNFR18) and comprehensive descriptions (per TFNFR17). Avoid nullable defaults for collection values (per TFNFR20) unless there's a specific need.
- **Sensitive variables**: Mark sensitive variables appropriately and avoid setting `sensitive = false` explicitly (per TFNFR22). Handle sensitive default values correctly (per TFNFR23).
- **Dynamic blocks**: Use dynamic blocks for optional nested objects where appropriate (per TFNFR12), and leverage `coalesce` or `try` functions for default values (per TFNFR13).
- **Code organization**: Consider using `locals.tf` specifically for local values (per TFNFR31) and ensure precise typing for locals (per TFNFR33).

## 6. Secrets

The best secret is one that does not need to be stored.  e.g. use Managed Identities rather than passwords or keys.

Use `ephemeral` secrets with write-only parameters when supported (Terraform v1.11+) to avoid storing secrets in state files. Consult module documentation for availability.

Where secrets are required, store in Key Vault unless directed to use a different service.

Never write secrets to local filesystems or commit to git.

Mark sensitive values appropriately, isolate them from other attributes, and avoid outputting sensitive data unless absolutely necessary. Follow TFNFR19, TFNFR22, and TFNFR23.

## 7. Outputs

- **Avoid unnecessary outputs**, only use these to expose information needed by other configurations.
- Use `sensitive = true` for outputs containing secrets
- Provide clear descriptions for all outputs

```hcl
output "resource_group_name" {
  description = "Name of the created resource group"
  value       = azurerm_resource_group.example.name
}

output "virtual_network_id" {
  description = "ID of the virtual network"
  value       = azurerm_virtual_network.example.id
}
```

## 8. Local Values Usage

- Use locals for computed values and complex expressions
- Improve readability by extracting repeated expressions
- Combine related values into structured locals

```hcl
locals {
  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    Owner       = var.owner
    CreatedBy   = "terraform"
  }
  
  resource_name_prefix = "${var.project_name}-${var.environment}"
  location_short       = substr(var.location, 0, 3)
}
```

## 9. Follow recommended Terraform practices

- **Redundant depends_on Detection**: Search and remove `depends_on` where the dependent resource is already referenced implicitly in the same resource block. Retain `depends_on` only where it is explicitly required.  Never depend on module outputs.

- **Iteration**: Use `count` for 0-1 resources, `for_each` for multiple resources. Prefer maps for stable resource addresses. Align with TFNFR7.

- **Data sources**: Acceptable in root modules but avoid in reusable modules. Prefer explicit module parameters over data source lookups.

- **Parameterization**: Use strongly typed variables with explicit `type` declarations (TFNFR18), comprehensive descriptions (TFNFR17), and non-nullable defaults (TFNFR20). Leverage AVM-exposed variables.

- **Versioning**: Target latest stable Terraform and Azure provider versions. Specify versions in code and keep updated (TFFR3).

## 10. Folder Structure

Use a consistent folder structure for Terraform configurations.

Use tfvars to modify environmental differences. In general, aim to keep environments similar whilst cost optimising for non-production environments.

Antipattern - branch per environment, repository per environment, folder per environment - or similar layouts that make it hard to test the root folder logic between environments.  

Be aware of tools such as Terragrunt which may influence this design.

A **suggested** structure is:

```text
my-azure-app/
├── infra/                          # Terraform root module (AZD compatible)
│   ├── main.tf                     # Core resources
│   ├── variables.tf                # Input variables
│   ├── outputs.tf                  # Outputs
│   ├── terraform.tf                # Provider configuration
│   ├── locals.tf                   # Local values
│   └── environments/               # Environment-specific configurations
│       ├── dev.tfvars              # Development environment
│       ├── test.tfvars             # Test environment
│       └── prod.tfvars             # Production environment
├── .github/workflows/              # CI/CD pipelines (if using github)
├── .azdo/                          # CI/CD pipelines (suggested if using Azure DevOps)
└── README.md                       # Documentation
```

Never change the folder structure without direct agreement with the user.

Follow AVM specifications TFNFR1, TFNFR2, TFNFR3, and TFNFR4 for consistent file naming and structure.

## Azure-Specific Best Practices

### Resource Naming and Tagging

- Follow [Azure naming conventions](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/resource-naming)
- Use consistent region naming and variables for multi-region deployments
- Implement consistent tagging.

### Resource Group Strategy

- Use existing resource groups when specified
- Create new resource groups only when necessary and with confirmation
- Use descriptive names indicating purpose and environment

### Networking Considerations

- Validate existing VNet/subnet IDs before creating new network resources (for example, is this solution being deployed into an existing hub & spoke landing zone)
- Use NSGs and ASGs appropriately
- Implement private endpoints for PaaS services when required, use resource firewall restrictions to restrict public access otherwise.  Comment exceptions where public endpoints are required.

### Security and Compliance

- Use Managed Identities instead of service principals
- Implement Key Vault with appropriate RBAC.
- Enable diagnostic settings for audit trails
- Follow principle of least privilege

## Cost Management

- Confirm budget approval for expensive resources
- Use environment-appropriate sizing (dev vs prod)
- Ask for cost constraints if not specified

## State Management

- Use remote backend (Azure Storage) with state locking
- Never commit state files to source control
- Enable encryption at rest and in transit

## Validation

- Do an inventory of existing resources and offer to remove unused resource blocks.
- Run `terraform validate` to check syntax
- Ask before running `terraform plan`.  Terraform plan will require a subscription ID, this should be sourced from the ARM_SUBSCRIPTION_ID environment variable, *NOT* coded in the provider block.
- Test configurations in non-production environments first
- Ensure idempotency (multiple applies produce same result)

## Fallback Behavior

If general rules are not loaded, default to: minimalist code generation, explicit consent for any terraform commands beyond validate, and adherence to CALMS principles in all suggestions.
