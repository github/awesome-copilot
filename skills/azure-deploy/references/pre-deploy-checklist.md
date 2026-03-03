# Pre-Deployment Checklist

> **CRITICAL**: Before running ANY provisioning commands, you MUST complete this checklist IN ORDER.
>
> ⛔ **DO NOT** run `azd up` until ALL steps are complete. Trial-and-error wastes time and creates orphan resources.

## Step 1: Check Current Subscription

Use the Azure MCP tool to get current subscription:

```
mcp_azure_mcp_subscription_list
```

**CLI fallback:**
```bash
az account show --query "{name:name, id:id}" -o json
```

## Step 2: Prompt User for Subscription

**You MUST use `ask_user`** to confirm the subscription. Find the default subscription (marked `isDefault: true`) from Step 1 results and present it as the recommended choice.

✅ **Correct — show actual name and ID as a choice:**
```
ask_user(
  question: "Which Azure subscription would you like to deploy to?",
  choices: [
    "Use current: <subscription-name> (<subscription-id>) (Recommended)",
    "Let me specify a different subscription"
  ]
)
```

❌ **Wrong — never use freeform input for subscription:**
```
ask_user(
  question: "Which Azure subscription should I deploy to? I'll need the subscription name or ID."
)
```

## Step 3: Create AZD Environment FIRST

> ⚠️ **MANDATORY** — Create the environment BEFORE setting any variables or running `azd up`.
>
> ⛔ **DO NOT** manually create `.azure/` folder with `mkdir` or `New-Item`. Let `azd` create it.

**For new projects (no azure.yaml):**
```bash
azd init -e <environment-name>
```

**For existing projects (azure.yaml exists):**
```bash
azd env new <environment-name>
```

Both commands create:
- `.azure/<env-name>/` folder with config files
- Set the environment as default

The environment name becomes part of the resource group name (`rg-<env-name>`).

## Step 4: Check if Resource Group Already Exists

> ⛔ **CRITICAL** — Skip this and you'll hit "Invalid resource group location" errors.

Use the Azure MCP tool to list resource groups:

```
mcp_azure_mcp_group_list
  subscription: <subscription-id>
```

Then check if `rg-<environment-name>` exists in the results.

**CLI fallback:**
```bash
az group show --name rg-<environment-name> --query "{location:location}" -o json 2>&1
```

**If RG exists:**
- Use `ask_user` to offer choices:
  1. Use existing RG location (show the location)
  2. Choose a different environment name
  3. Delete the existing RG and start fresh

**If RG doesn't exist:** Proceed to location selection.

## Step 5: Check for Tag Conflicts (AZD only)

> ⚠️ AZD uses `azd-service-name` tags to find deployment targets **within the target resource group**. Multiple resources with the same tag in the same RG cause failures. Tags in other RGs are fine.

```bash
az resource list --resource-group rg-<env-name> --tag azd-service-name=<service-name> --query "[].name" -o table
```

Check for each service in `azure.yaml`. If duplicates exist **in the target RG**:

1. **Preferred — Fresh environment**: Run `azd env new <new-name>` and restart from Step 4. Non-destructive, no user confirmation needed, avoids orphan risks.
2. **Alternative — Delete conflicts**: Use `ask_user` to confirm deletion of old resources (required by global rules).

## Step 6: Prompt User for Location

**You MUST use `ask_user`** with regions that support ALL services in the architecture.

See [Region Availability](region-availability.md) for service-specific limitations.

## Step 7: Set Environment Variables

> ⚠️ **Set ALL variables BEFORE running `azd up`** — not during error recovery.

Environment should already be configured during **azure-validate**. Run `azd env get-values` to confirm.

Verify settings:
```bash
azd env get-values
```

## Step 8: Only NOW Run Deployment

```bash
azd up --no-prompt
```

---

## Quick Reference: Correct AZD Sequence

```bash
# 1. Create environment FIRST
azd env new myapp-dev

# 2. Set subscription
azd env set AZURE_SUBSCRIPTION_ID 25fd0362-...

# 3. Set location (after checking RG doesn't conflict)
azd env set AZURE_LOCATION westus2

# 4. Verify
azd env get-values

# 5. Deploy
azd up --no-prompt
```

## Common Mistakes to Avoid

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| `azd up --location eastus2` | `azd env set AZURE_LOCATION eastus2` then `azd up` |
| Running `azd up` without environment | `azd env new <name>` first |
| Assuming location without checking RG | Check `az group show` before choosing |
| Ignoring tag conflicts in target RG | Check `az resource list --resource-group rg-<env>` before deploy |

---

## Non-AZD Deployments

**For Azure CLI / Bicep:**
```bash
az account set --subscription <subscription-id-or-name>
# Pass location as parameter: --location <location>
```

**For Terraform:**
```bash
az account set --subscription <subscription-id-or-name>
# Set in terraform.tfvars or -var="location=<location>"
```
