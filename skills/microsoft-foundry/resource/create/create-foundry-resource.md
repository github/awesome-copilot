---
name: microsoft-foundry:resource/create
description: |
  Create Azure AI Services multi-service resource (Foundry resource) using Azure CLI.
  USE FOR: create Foundry resource, new AI Services resource, create multi-service resource, provision Azure AI Services, AIServices kind resource, register resource provider, enable Cognitive Services, setup AI Services account, create resource group for Foundry.
  DO NOT USE FOR: creating ML workspace hubs (use microsoft-foundry:project/create), deploying models (use microsoft-foundry:models/deploy), managing permissions (use microsoft-foundry:rbac), monitoring resource usage (use microsoft-foundry:quota).
compatibility:
  required:
    - azure-cli: ">=2.0"
  optional:
    - powershell: ">=7.0"
    - azure-portal: "any"
---

# Create Foundry Resource

This sub-skill orchestrates creation of Azure AI Services multi-service resources using Azure CLI.

> **Important:** All resource creation operations are **control plane (management)** operations. Use **Azure CLI commands** as the primary method.

> **Note:** For monitoring resource usage and quotas, use the `microsoft-foundry:quota` skill.

## Quick Reference

| Property | Value |
|----------|-------|
| **Classification** | WORKFLOW SKILL |
| **Operation Type** | Control Plane (Management) |
| **Primary Method** | Azure CLI: `az cognitiveservices account create` |
| **Resource Type** | `Microsoft.CognitiveServices/accounts` (kind: `AIServices`) |
| **Resource Kind** | `AIServices` (multi-service) |

## When to Use

Use this sub-skill when you need to:

- **Create Foundry resource** - Provision new Azure AI Services multi-service account
- **Create resource group** - Set up resource group before creating resources
- **Register resource provider** - Enable Microsoft.CognitiveServices provider
- **Manual resource creation** - CLI-based resource provisioning

**Do NOT use for:**
- Creating ML workspace hubs/projects (use `microsoft-foundry:project/create`)
- Deploying AI models (use `microsoft-foundry:models/deploy`)
- Managing RBAC permissions (use `microsoft-foundry:rbac`)
- Monitoring resource usage (use `microsoft-foundry:quota`)

## Prerequisites

- **Azure subscription** - Active subscription ([create free account](https://azure.microsoft.com/pricing/purchase-options/azure-account))
- **Azure CLI** - Version 2.0 or later installed
- **Authentication** - Run `az login` before commands
- **RBAC roles** - One of:
  - Contributor
  - Owner
  - Custom role with `Microsoft.CognitiveServices/accounts/write`
- **Resource provider** - `Microsoft.CognitiveServices` must be registered in your subscription
  - If not registered, see [Workflow #3: Register Resource Provider](#3-register-resource-provider)
  - If you lack permissions, ask a subscription Owner/Contributor to register it or grant you `/register/action` privilege

> **Need RBAC help?** See [microsoft-foundry:rbac](../../rbac/rbac.md) for permission management.

## Core Workflows

### 1. Create Resource Group

**Command Pattern:** "Create a resource group for my Foundry resources"

#### Steps

1. **Ask user preference**: Use existing or create new resource group
2. **If using existing**: List and let user select from available groups (0-4: show all, 5+: show 5 most recent with "Other" option)
3. **If creating new**: Ask user to choose region, then create

```bash
# List existing resource groups
az group list --query "[-5:].{Name:name, Location:location}" --out table

# Or create new
az group create --name <rg-name> --location <location>
az group show --name <rg-name> --query "{Name:name, Location:location, State:properties.provisioningState}"
```

See [Detailed Workflow Steps](./references/workflows.md) for complete instructions.

---

### 2. Create Foundry Resource

**Command Pattern:** "Create a new Azure AI Services resource"

#### Steps

1. **Verify prerequisites**: Check Azure CLI, authentication, and provider registration
2. **Choose location**: Always ask user to select region (don't assume resource group location)
3. **Create resource**: Use `--kind AIServices` and `--sku S0` (only supported tier)
4. **Verify and get keys**

```bash
# Create Foundry resource
az cognitiveservices account create \
  --name <resource-name> \
  --resource-group <rg> \
  --kind AIServices \
  --sku S0 \
  --location <location> \
  --yes

# Verify and get keys
az cognitiveservices account show --name <resource-name> --resource-group <rg>
az cognitiveservices account keys list --name <resource-name> --resource-group <rg>
```

**Important:** S0 (Standard) is the only supported SKU - F0 free tier not available for AIServices.

See [Detailed Workflow Steps](./references/workflows.md) for complete instructions.

---

### 3. Register Resource Provider

**Command Pattern:** "Register Cognitive Services provider"

Required when first creating Cognitive Services in subscription or if you get `ResourceProviderNotRegistered` error.

```bash
# Register provider (requires Owner/Contributor role)
az provider register --namespace Microsoft.CognitiveServices
az provider show --namespace Microsoft.CognitiveServices --query "registrationState"
```

If you lack permissions, ask a subscription Owner/Contributor to register it or use `microsoft-foundry:rbac` skill.

See [Detailed Workflow Steps](./references/workflows.md) for complete instructions.

---

## Important Notes

- **Resource kind must be `AIServices`** for multi-service Foundry resources
- **SKU must be S0** (Standard) - F0 free tier not available for AIServices
- Always ask user to choose location - different regions may have varying availability

---

## Additional Resources

- [Common Patterns](./references/patterns.md) - Quick setup patterns and command reference
- [Troubleshooting](./references/troubleshooting.md) - Common errors and solutions
- [Azure AI Services documentation](https://learn.microsoft.com/en-us/azure/ai-services/multi-service-resource?pivots=azcli)
