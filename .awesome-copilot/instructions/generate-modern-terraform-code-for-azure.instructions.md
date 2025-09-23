---
description: 'Guidelines for generating modern Terraform code for Azure'
applyTo: '**/*.tf'
---

## 1. Use Latest Terraform and Providers
Always target the latest stable Terraform version and Azure providers. In code, specify the required Terraform and provider versions to enforce this. Keep provider versions updated to get new features and fixes.

## 2. Organize Code Cleanly
Structure Terraform configurations with logical file separation:

- Use `main.tf` for resources
- Use `variables.tf` for inputs
- Use `outputs.tf` for outputs
- Follow consistent naming conventions and formatting (`terraform fmt`)

This makes the code easy to navigate and maintain.

## 3. Encapsulate in Modules

Use Terraform modules to group reusable infrastructure components. For any resource set that will be used in multiple contexts:

- Create a module with its own variables/outputs
- Reference it rather than duplicating code
- This promotes reuse and consistency

## 4. Leverage Variables and Outputs

- **Parameterize** all configurable values using variables with types and descriptions
- **Provide default values** where appropriate for optional variables
- **Use outputs** to expose key resource attributes for other modules or user reference
- **Mark sensitive values** accordingly to protect secrets

## 5. Provider Selection (AzureRM vs AzAPI)

- **Use `azurerm` provider** for most scenarios – it offers high stability and covers the majority of Azure services
- **Use `azapi` provider** only for cases where you need:
  - The very latest Azure features
  - A resource not yet supported in `azurerm`
- **Document the choice** in code comments
- Both providers can be used together if needed, but prefer `azurerm` when in doubt

## 6. Minimal Dependencies

- **Do not introduce** additional providers or modules beyond the project's scope without confirmation
- If a special provider (e.g., `random`, `tls`) or external module is needed:
  - Add a comment to explain
  - Ensure the user approves it
- Keep the infrastructure stack lean and avoid unnecessary complexity

## 7. Ensure Idempotency

- Write configurations that can be applied repeatedly with the same outcome
- **Avoid non-idempotent actions**:
  - Scripts that run on every apply
  - Resources that might conflict if created twice
- **Test by doing multiple `terraform apply` runs** and ensure the second run results in zero changes
- Use resource lifecycle settings or conditional expressions to handle drift or external changes gracefully

## 8. State Management

- **Use a remote backend** (like Azure Storage with state locking) to store Terraform state securely
- Enable team collaboration
- **Never commit state files** to source control
- This prevents conflicts and keeps the infrastructure state consistent

## 9. Document and Diagram

- **Maintain up-to-date documentation**
- **Update README.md** with any new variables, outputs, or usage instructions whenever the code changes
- Consider using tools like `terraform-docs` for automation
- **Update architecture diagrams** to reflect infrastructure changes after each significant update
- Well-documented code and diagrams ensure the whole team understands the infrastructure

## 10. Validate and Test Changes

- **Run `terraform validate`** and review the `terraform plan` output before applying changes
- Catch errors or unintended modifications early
- **Consider implementing automated checks**:
  - CI pipeline
  - Pre-commit hooks
  - Enforce formatting, linting, and basic validation
