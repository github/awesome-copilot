# Bicep Recipe

Standalone Bicep workflow (without AZD).

## When to Use

- IaC-first approach
- No CLI wrapper needed
- Direct ARM deployment control
- Existing Bicep modules to reuse
- Custom deployment orchestration

## Before Generation

**REQUIRED: Research best practices before generating any files.**

| Artifact | Research Action |
|----------|-----------------|
| Bicep files | Call `mcp_bicep_get_bicep_best_practices` |
| Bicep modules | Call `mcp_bicep_list_avm_metadata` for Azure Verified Modules |
| Resource schemas | Use `activate_azure_resource_schema_tools` if needed |

## Generation Steps

### 1. Generate Infrastructure

Create Bicep templates in `./infra/`.

→ [patterns.md](patterns.md)

**Structure:**
```
infra/
├── main.bicep
├── main.parameters.json
└── modules/
    ├── container-app.bicep
    ├── storage.bicep
    └── ...
```

### 2. Generate Dockerfiles (if containerized)

Manual Dockerfile creation required.

## Output Checklist

| Artifact | Path |
|----------|------|
| Main Bicep | `./infra/main.bicep` |
| Parameters | `./infra/main.parameters.json` |
| Modules | `./infra/modules/*.bicep` |
| Dockerfiles | `src/<service>/Dockerfile` |

## References

- [Bicep Patterns](patterns.md)

## Next

→ Update `.azure/plan.md` → **azure-validate**
