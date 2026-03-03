# Bicep Validation

Validation steps for standalone Bicep deployments.

## Prerequisites

- `./infra/main.bicep` exists
- `./infra/main.parameters.json` exists
- Azure CLI authenticated

## Validation Steps

### 1. Bicep Compilation

```bash
az bicep build --file ./infra/main.bicep
```

**Pass:** No output (compiles cleanly)
**Fail:** Shows line numbers and errors

### 2. Template Validation

```bash
# Subscription scope
az deployment sub validate \
  --location <location> \
  --template-file ./infra/main.bicep \
  --parameters ./infra/main.parameters.json

# Resource group scope
az deployment group validate \
  --resource-group <rg-name> \
  --template-file ./infra/main.bicep \
  --parameters ./infra/main.parameters.json
```

### 3. What-If Preview

```bash
az deployment sub what-if \
  --location <location> \
  --template-file ./infra/main.bicep \
  --parameters ./infra/main.parameters.json
```

**Expected output:**
```
Resource and property changes are indicated with these symbols:
  + Create
  ~ Modify
  - Delete
```

### 4. Authentication

```bash
az account show
```

### 5. Linting (optional)

Use Bicep linter rules:

```bash
az bicep lint --file ./infra/main.bicep
```

### 6. Azure Policy Validation

See [Policy Validation Guide](../../policy-validation.md) for instructions on retrieving and validating Azure policies for your subscription.

## Checklist

| Check | Command | Pass |
|-------|---------|------|
| Bicep compiles | `az bicep build` | ☐ |
| Template valid | `az deployment validate` | ☐ |
| What-if passes | `az deployment what-if` | ☐ |
| Auth valid | `az account show` | ☐ |
| Policies validated | MCP Policy tool | ☐ |

## References

- [Error handling](./errors.md)

## Next

All checks pass → **azure-deploy**
