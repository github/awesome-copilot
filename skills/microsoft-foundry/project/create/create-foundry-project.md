---
name: foundry-create-project
description: |
  Create a new Azure AI Foundry project using Azure Developer CLI (azd) to provision infrastructure for hosting AI agents and models.
  USE FOR: create Foundry project, new AI Foundry project, set up Foundry, azd init Foundry, provision Foundry infrastructure, onboard to Foundry, create Azure AI project, set up AI project.
  DO NOT USE FOR: deploying agents to existing projects (use agent/deploy), creating agent code (use agent/create), deploying AI models from catalog (use microsoft-foundry main skill), Azure Functions (use azure-functions).
allowed-tools: Read, Write, Bash, AskUserQuestion
---

# Create Azure AI Foundry Project

Create a new Azure AI Foundry project using azd. Provisions: Foundry account, project, Application Insights, managed identity, and RBAC permissions. Optionally enables hosted agents (capability host + Container Registry).

## Prerequisites

Run checks in order. STOP on any failure and resolve before proceeding.

**1. Azure CLI** — `az version` → expects version output. If missing: https://aka.ms/installazurecli

**2. Azure login & subscription:**

```bash
az account show --query "{Name:name, SubscriptionId:id, State:state}" -o table
```

If not logged in, run `az login`. If no active subscription: https://azure.microsoft.com/free/ — STOP.

If multiple subscriptions, ask which to use, then `az account set --subscription "<id>"`.

**3. Role permissions:**

```bash
az role assignment list --assignee "$(az ad signed-in-user show --query id -o tsv)" --query "[?contains(roleDefinitionName, 'Owner') || contains(roleDefinitionName, 'Contributor') || contains(roleDefinitionName, 'Azure AI')].{Role:roleDefinitionName, Scope:scope}" -o table
```

Requires Owner, Contributor, or Azure AI Owner. If insufficient — STOP, request elevated access from admin.

**4. Azure Developer CLI** — `azd version`. If missing: https://aka.ms/azure-dev/install

## Workflow

### Step 1: Verify azd login

```bash
azd auth login --check-status
```

If not logged in, run `azd auth login` and complete browser auth.

### Step 2: Ask User for Project Details

Use AskUserQuestion for:

1. **Project name** — used as azd environment name and resource group (`rg-<name>`). Must contain only alphanumeric characters and hyphens. Examples: `my-ai-project`, `dev-agents`
2. **Azure location** (optional) — defaults to North Central US (required for hosted agents preview)
3. **Enable hosted agents?** (yes/no) — provisions a capability host and Container Registry for deploying hosted agents. Defaults to no.

### Step 3: Create Directory and Initialize

```bash
mkdir "<project-name>" && cd "<project-name>"
azd init -t https://github.com/Azure-Samples/azd-ai-starter-basic -e <project-name> --no-prompt
```

- `-t` — Azure AI starter template (Foundry infrastructure)
- `-e` — environment name
- `--no-prompt` — non-interactive, use defaults
- **IMPORTANT:** `azd init` requires an empty directory

If user specified a non-default location:

```bash
azd config set defaults.location <location>
```

If user chose to enable hosted agents:

```bash
azd env set ENABLE_HOSTED_AGENTS true
```

This provisions a capability host (`capabilityHosts/agents`) on the Foundry account and auto-adds an Azure Container Registry for hosted agent deployments.

### Step 4: Provision Infrastructure

```bash
azd provision --no-prompt
```

Takes 5–10 minutes. Creates resource group, Foundry account/project, Application Insights, managed identity, and RBAC roles. If hosted agents enabled, also creates Container Registry and capability host.

### Step 5: Retrieve Project Details

```bash
azd env get-values
```

Capture `AZURE_AI_PROJECT_ID`, `AZURE_AI_PROJECT_ENDPOINT`, and `AZURE_RESOURCE_GROUP`. Direct user to verify at https://ai.azure.com.

### Step 6: Next Steps

- Deploy an agent → `agent/deploy` skill
- Browse models → `foundry_models_list` MCP tool
- Manage project → https://ai.azure.com

## Best Practices

- Use North Central US for hosted agents (preview requirement)
- Name must be alphanumeric + hyphens only — no spaces, underscores, or special characters
- Delete unused projects with `azd down` to avoid ongoing costs
- `azd down` deletes ALL resources — Foundry account, agents, models, Container Registry, and Application Insights data
- `azd provision` is safe to re-run on failure

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `azd: command not found` | Install from https://aka.ms/azure-dev/install |
| `ERROR: Failed to authenticate` | Run `azd auth login`; verify subscription with `az account list` |
| `environment name '' is invalid` | Name must be alphanumeric + hyphens only |
| `ERROR: Insufficient permissions` | Request Contributor or Azure AI Owner role from admin |
| Region not supported for hosted agents | Use `azd config set defaults.location northcentralus` |
| Provisioning timeout | Check region availability, verify connectivity, retry `azd provision` |

## Related Skills

- **agent/deploy** — Deploy agents to the created project
- **agent/create** — Create a new agent for deployment

## Resources

- [Azure Developer CLI](https://aka.ms/azure-dev/install) · [AI Foundry Portal](https://ai.azure.com) · [Foundry Docs](https://learn.microsoft.com/azure/ai-foundry/) · [azd-ai-starter-basic template](https://github.com/Azure-Samples/azd-ai-starter-basic)
