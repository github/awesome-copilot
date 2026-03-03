# Terraform Validation

Validation steps for Terraform deployments.

## Prerequisites

- `./infra/main.tf` exists
- State backend accessible

## Validation Steps

### 1. Terraform Installation

Verify Terraform is installed:

```bash
terraform version
```

**If not installed:** See https://developer.hashicorp.com/terraform/install

### 2. Azure CLI Installation

Verify Azure CLI is installed:

```bash
az version
```

**If not installed:**
```
mcp_azure_mcp_extension_cli_install(cli-type: "az")
```

### 3. Authentication

```bash
az account show
```

**If not logged in:**
```bash
az login
az account set --subscription <subscription-id>
```

### 4. Initialize

```bash
cd infra
terraform init
```

### 5. Format Check

```bash
terraform fmt -check -recursive
```

**Fix if needed:**
```bash
terraform fmt -recursive
```

### 6. Validate Syntax

```bash
terraform validate
```

### 7. Plan Preview

```bash
terraform plan -out=tfplan
```

### 8. State Backend

Verify state is accessible:

```bash
terraform state list
```

### 9. Azure Policy Validation

See [Policy Validation Guide](../../policy-validation.md) for instructions on retrieving and validating Azure policies for your subscription.

## References

- [Error handling](./errors.md)

## Next

All checks pass → **azure-deploy**
