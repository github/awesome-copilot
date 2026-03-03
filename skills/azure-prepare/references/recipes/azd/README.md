# AZD Recipe

Azure Developer CLI workflow for preparing Azure deployments.

## When to Use

- New projects, multi-service apps, want `azd up`
- Need environment management, auto-generated CI/CD
- Team prefers simplified deployment workflow

> 💡 **Tip:** azd supports both Bicep and Terraform as IaC providers. Choose based on your team's expertise and requirements.

## IaC Provider Options

| Provider | Use When |
|----------|----------|
| **Bicep** (default) | Azure-only, no existing IaC, want simplest setup |
| **Terraform** | Multi-cloud IaC, existing TF expertise, want azd simplicity |

**For Terraform with azd:** See [terraform.md](terraform.md)

## Before Generation

**REQUIRED: Research best practices before generating any files.**

### Check for Existing Codebase Patterns

**⚠️ CRITICAL: For existing codebases with special patterns, use `azd init --from-code -e <environment-name>` instead of manual generation.**

| Pattern | Detection | Action |
|---------|-----------|--------|
| **.NET Aspire** | `*.AppHost.csproj` or `Aspire.Hosting` package | Use `azd init --from-code -e <environment-name>` → [aspire.md](../../aspire.md) |
| **Existing azure.yaml** | `azure.yaml` present | MODIFY mode - update existing config |
| **New project** | No azure.yaml, no special patterns | Manual generation (steps below) |

> 💡 **Note:** The `-e <environment-name>` flag is **required** when running `azd init --from-code` in non-interactive environments (agents, CI/CD pipelines). Without it, the command will fail with a prompt error.

### References for Manual Generation

| Artifact | Reference |
|----------|-----------|
| azure.yaml | [Schema Guide](azure-yaml.md) |
| .NET Aspire projects | [Aspire Guide](../../aspire.md) |
| Terraform with azd | [Terraform Guide](terraform.md) |
| AZD IAC rules | [IAC Rules](iac-rules.md) |
| Azure Functions templates | [Templates](../../services/functions/templates/README.md) |
| Bicep best practices | `mcp_bicep_get_bicep_best_practices` |
| Bicep resource schema | `mcp_bicep_get_az_resource_type_schema` |
| Azure Verified Modules | `mcp_bicep_list_avm_metadata` |
| Terraform best practices | `mcp_azure_mcp_azureterraformbestpractices` |
| Dockerfiles | [Docker Guide](docker.md) |

## Generation Steps

### For Bicep (default)

| # | Artifact | Reference |
|---|----------|-----------|
| 1 | azure.yaml | [Schema Guide](azure-yaml.md) |
| 2 | Application code | Entry points, health endpoints, config |
| 3 | Dockerfiles | [Docker Guide](docker.md) (if containerized) |
| 4 | Infrastructure | `./infra/main.bicep` + modules per [IAC Rules](iac-rules.md) |

### For Terraform

| # | Artifact | Reference |
|---|----------|-----------|
| 1 | azure.yaml with `infra.provider: terraform` | [Terraform Guide](terraform.md) |
| 2 | Application code | Entry points, health endpoints, config |
| 3 | Dockerfiles | [Docker Guide](docker.md) (if containerized) |
| 4 | Terraform files | `./infra/*.tf` per [Terraform Guide](terraform.md) |

## Outputs

### For Bicep

| Artifact | Path |
|----------|------|
| azure.yaml | `./azure.yaml` |
| App Code | `src/<service>/*` |
| Dockerfiles | `src/<service>/Dockerfile` (if containerized) |
| Infrastructure | `./infra/` (Bicep files) |

### For Terraform

| Artifact | Path |
|----------|------|
| azure.yaml | `./azure.yaml` (with `infra.provider: terraform`) |
| App Code | `src/<service>/*` |
| Dockerfiles | `src/<service>/Dockerfile` (if containerized) |
| Infrastructure | `./infra/` (Terraform files) |

## References

- [.NET Aspire Projects](../../aspire.md)
- [azure.yaml Schema](azure-yaml.md)
- [.NET Aspire Apps](aspire.md)
- [Terraform with AZD](terraform.md)
- [Docker Configuration](docker.md)
- [IAC Rules](iac-rules.md)

## Next

→ Update `.azure/plan.md` → **azure-validate**
