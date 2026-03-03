# Bicep Deploy Recipe

Deploy to Azure using Bicep templates directly.

## Prerequisites

- `az` CLI installed with Bicep extension
- `.azure/plan.md` exists with status `Validated`
- Bicep templates exist in `infra/`
- **Subscription and location confirmed** → See [Pre-Deploy Checklist](../../pre-deploy-checklist.md)

## Workflow

| Step | Task | Command |
|------|------|---------|
| 1 | **[Pre-deploy checklist](../../pre-deploy-checklist.md)** | Confirm subscription/location with user |
| 2 | Build (optional) | `az bicep build --file main.bicep` |
| 3 | Deploy | `az deployment sub create` |
| 4 | Verify | `az resource list` |

## Deployment Commands

### Subscription-Level Deployment

```bash
az deployment sub create \
  --location eastus2 \
  --template-file ./infra/main.bicep \
  --parameters ./infra/main.parameters.json
```

### Resource Group Deployment

```bash
az deployment group create \
  --resource-group rg-myapp-dev \
  --template-file ./infra/main.bicep \
  --parameters ./infra/main.parameters.json
```

### With Inline Parameters

```bash
az deployment sub create \
  --location eastus2 \
  --template-file ./infra/main.bicep \
  --parameters environmentName=dev location=eastus2
```

### What-If (Preview Changes)

```bash
az deployment sub what-if \
  --location eastus2 \
  --template-file ./infra/main.bicep \
  --parameters environmentName=dev
```

## Get Deployment Outputs

```bash
az deployment sub show \
  --name main \
  --query properties.outputs
```

## References

- [Verification steps](./verify.md)
- [Error handling](./errors.md)

## MCP Tools

| Tool | Purpose |
|------|---------|
| `mcp_bicep_get_bicep_best_practices` | Best practices |
| `mcp_bicep_get_az_resource_type_schema` | Resource schemas |
| `mcp_bicep_list_avm_metadata` | Azure Verified Modules |

## Cleanup (DESTRUCTIVE)

```bash
az group delete --name <rg-name> --yes
```

⚠️ Permanently deletes ALL resources in the group.
