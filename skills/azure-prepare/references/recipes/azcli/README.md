# AZCLI Recipe

Azure CLI workflow for imperative Azure deployments.

## When to Use

- Existing az scripts in project
- Need imperative control over deployment
- Custom deployment pipelines
- AKS deployments
- Direct resource manipulation

## Before Generation

**REQUIRED: Research best practices before generating any files.**

| Artifact | Research Action |
|----------|-----------------|
| Bicep files | Call `mcp_bicep_get_bicep_best_practices` |
| Bicep modules | Call `mcp_bicep_list_avm_metadata` for Azure Verified Modules |
| Azure CLI commands | Call `activate_azure_cli_management_tools` |
| Azure best practices | Call `mcp_azure_mcp_get_bestpractices` |

## Generation Steps

### 1. Generate Infrastructure (Bicep)

Create Bicep templates in `./infra/`.

**Structure:**
```
infra/
├── main.bicep
├── main.parameters.json
└── modules/
    └── *.bicep
```

### 2. Generate Deployment Scripts

Create deployment scripts for provisioning.

→ [scripts.md](scripts.md)

### 3. Generate Dockerfiles (if containerized)

Manual Dockerfile creation required.

## Output Checklist

| Artifact | Path |
|----------|------|
| Main Bicep | `./infra/main.bicep` |
| Parameters | `./infra/main.parameters.json` |
| Modules | `./infra/modules/*.bicep` |
| Deploy script | `./scripts/deploy.sh` or `deploy.ps1` |
| Dockerfiles | `src/<service>/Dockerfile` |

## Deployment Commands

See [commands.md](commands.md) for common patterns.

## Naming Convention

Resources: `{prefix}{token}{instance}`
- Alphanumeric only, no special characters
- Prefix ≤3 chars (e.g., `kv` for Key Vault)
- Token = 5 char random string
- Total ≤32 characters

## References

- [Deployment Commands](commands.md)
- [Deployment Scripts](scripts.md)

## Next

→ Update `.azure/plan.md` → **azure-validate**
