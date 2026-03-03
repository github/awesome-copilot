---
name: capacity
description: "Discovers available Azure OpenAI model capacity across regions and projects. Analyzes quota limits, compares availability, and recommends optimal deployment locations based on capacity requirements. USE FOR: find capacity, check quota, where can I deploy, capacity discovery, best region for capacity, multi-project capacity search, quota analysis, model availability, region comparison, check TPM availability. DO NOT USE FOR: actual deployment (hand off to preset or customize after discovery), quota increase requests (direct user to Azure Portal), listing existing deployments."
license: MIT
metadata:
  author: Microsoft
  version: "1.0.0"
---

# Capacity Discovery

Finds available Azure OpenAI model capacity across all accessible regions and projects. Recommends the best deployment location based on capacity requirements.

## Quick Reference

| Property | Description |
|----------|-------------|
| **Purpose** | Find where you can deploy a model with sufficient capacity |
| **Scope** | All regions and projects the user has access to |
| **Output** | Ranked table of regions/projects with available capacity |
| **Action** | Read-only analysis — does NOT deploy. Hands off to preset or customize |
| **Authentication** | Azure CLI (`az login`) |

## When to Use This Skill

- ✅ User asks "where can I deploy gpt-4o?"
- ✅ User specifies a capacity target: "find a region with 10K TPM for gpt-4o"
- ✅ User wants to compare availability: "which regions have gpt-4o available?"
- ✅ User got a quota error and needs to find an alternative location
- ✅ User asks "best region and project for deploying model X"

**After discovery → hand off to [preset](../preset/SKILL.md) or [customize](../customize/SKILL.md) for actual deployment.**

## Scripts

Pre-built scripts handle the complex REST API calls and data processing. Use these instead of constructing commands manually.

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/discover_and_rank.ps1` | Full discovery: capacity + projects + ranking | Primary script for capacity discovery |
| `scripts/discover_and_rank.sh` | Same as above (bash) | Primary script for capacity discovery |
| `scripts/query_capacity.ps1` | Raw capacity query (no project matching) | Quick capacity check or version listing |
| `scripts/query_capacity.sh` | Same as above (bash) | Quick capacity check or version listing |

## Workflow

### Phase 1: Validate Prerequisites

```bash
az account show --query "{Subscription:name, SubscriptionId:id}" --output table
```

### Phase 2: Identify Model and Version

Extract model name from user prompt. If version is unknown, query available versions:

```powershell
.\scripts\query_capacity.ps1 -ModelName <model-name>
```
```bash
./scripts/query_capacity.sh <model-name>
```

This lists available versions. Use the latest version unless user specifies otherwise.

### Phase 3: Run Discovery

Run the full discovery script with model name, version, and minimum capacity target:

```powershell
.\scripts\discover_and_rank.ps1 -ModelName <model-name> -ModelVersion <version> -MinCapacity <target>
```
```bash
./scripts/discover_and_rank.sh <model-name> <version> <min-capacity>
```

> 💡 The script automatically queries capacity across ALL regions, cross-references with the user's existing projects, and outputs a ranked table sorted by: meets target → project count → available capacity.

### Phase 3.5: Validate Subscription Quota

After discovery identifies candidate regions, validate that the user's subscription actually has available quota in each region. Model capacity (from Phase 3) shows what the platform can support, but subscription quota limits what this specific user can deploy.

```powershell
# For each candidate region from discovery results:
$usageData = az cognitiveservices usage list --location <region> --subscription $SUBSCRIPTION_ID -o json 2>$null | ConvertFrom-Json

# Check quota for each SKU the model supports
# Quota names follow pattern: OpenAI.<SKU>.<model-name>
$usageEntry = $usageData | Where-Object { $_.name.value -eq "OpenAI.<SKU>.<model-name>" }

if ($usageEntry) {
  $quotaAvailable = $usageEntry.limit - $usageEntry.currentValue
} else {
  $quotaAvailable = 0  # No quota allocated
}
```
```bash
# For each candidate region from discovery results:
usage_json=$(az cognitiveservices usage list --location <region> --subscription "$SUBSCRIPTION_ID" -o json 2>/dev/null)

# Extract quota for specific SKU+model
quota_available=$(echo "$usage_json" | jq -r --arg name "OpenAI.<SKU>.<model-name>" \
  '.[] | select(.name.value == $name) | .limit - .currentValue')
```

**Annotate discovery results:**

Add a "Quota Available" column to the ranked output from Phase 3:

| Region | Available Capacity | Meets Target | Projects | Quota Available |
|--------|-------------------|--------------|----------|-----------------|
| eastus2 | 120K TPM | ✅ | 3 | ✅ 80K |
| westus3 | 90K TPM | ✅ | 1 | ❌ 0 (at limit) |
| swedencentral | 100K TPM | ✅ | 0 | ✅ 100K |

Regions/SKUs where `quotaAvailable = 0` should be marked with ❌ in the results. If no region has available quota, hand off to the [quota skill](../../../quota/quota.md) for increase requests and troubleshooting.

### Phase 4: Present Results and Hand Off

After the script outputs the ranked table (now annotated with quota info), present it to the user and ask:

1. 🚀 **Quick deploy** to top recommendation with defaults → route to [preset](../preset/SKILL.md)
2. ⚙️ **Custom deploy** with version/SKU/capacity/RAI selection → route to [customize](../customize/SKILL.md)
3. 📊 **Check another model** or capacity target → re-run Phase 2
4. ❌ Cancel

### Phase 5: Confirm Project Before Deploying

Before handing off to preset or customize, **always confirm the target project** with the user. See the [Project Selection](../SKILL.md#project-selection-all-modes) rules in the parent router.

If the discovery table shows a sample project for the chosen region, suggest it as the default. Otherwise, query projects in that region and let the user pick.

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| "No capacity found" | Model not available or all at quota | Hand off to [quota skill](../../../quota/quota.md) for increase requests and troubleshooting |
| Script auth error | `az login` expired | Re-run `az login` |
| Empty version list | Model not in region catalog | Try a different region: `./scripts/query_capacity.sh <model> "" eastus` |
| "No projects found" | No AI Services resources | Guide to `project/create` skill or Azure Portal |

## Related Skills

- **[preset](../preset/SKILL.md)** — Quick deployment after capacity discovery
- **[customize](../customize/SKILL.md)** — Custom deployment after capacity discovery
- **[quota](../../../quota/quota.md)** — For quota viewing, increase requests, and troubleshooting quota errors, defer to this skill instead of duplicating guidance
