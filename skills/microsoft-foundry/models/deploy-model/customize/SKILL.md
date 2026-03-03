---
name: customize
description: "Interactive guided deployment flow for Azure OpenAI models with full customization control. Step-by-step selection of model version, SKU (GlobalStandard/Standard/ProvisionedManaged), capacity, RAI policy (content filter), and advanced options (dynamic quota, priority processing, spillover). USE FOR: custom deployment, customize model deployment, choose version, select SKU, set capacity, configure content filter, RAI policy, deployment options, detailed deployment, advanced deployment, PTU deployment, provisioned throughput. DO NOT USE FOR: quick deployment to optimal region (use preset)."
license: MIT
metadata:
  author: Microsoft
  version: "1.0.0"
---

# Customize Model Deployment

Interactive guided workflow for deploying Azure OpenAI models with full customization control over version, SKU, capacity, content filtering, and advanced options.

## Quick Reference

| Property | Description |
|----------|-------------|
| **Flow** | Interactive step-by-step guided deployment |
| **Customization** | Version, SKU, Capacity, RAI Policy, Advanced Options |
| **SKU Support** | GlobalStandard, Standard, ProvisionedManaged, DataZoneStandard |
| **Best For** | Precise control over deployment configuration |
| **Authentication** | Azure CLI (`az login`) |
| **Tools** | Azure CLI, MCP tools (optional) |

## When to Use This Skill

Use this skill when you need **precise control** over deployment configuration:

- ✅ **Choose specific model version** (not just latest)
- ✅ **Select deployment SKU** (GlobalStandard vs Standard vs PTU)
- ✅ **Set exact capacity** within available range
- ✅ **Configure content filtering** (RAI policy selection)
- ✅ **Enable advanced features** (dynamic quota, priority processing, spillover)
- ✅ **PTU deployments** (Provisioned Throughput Units)

**Alternative:** Use `preset` for quick deployment to the best available region with automatic configuration.

### Comparison: customize vs preset

| Feature | customize | preset |
|---------|---------------------|----------------------------|
| **Focus** | Full customization control | Optimal region selection |
| **Version Selection** | User chooses from available | Uses latest automatically |
| **SKU Selection** | User chooses (GlobalStandard/Standard/PTU) | GlobalStandard only |
| **Capacity** | User specifies exact value | Auto-calculated (50% of available) |
| **RAI Policy** | User selects from options | Default policy only |
| **Region** | Current region first, falls back to all regions if no capacity | Checks capacity across all regions upfront |
| **Use Case** | Precise deployment requirements | Quick deployment to best region |

## Prerequisites

- Azure subscription with Cognitive Services Contributor or Owner role
- Azure AI Foundry project resource ID (format: `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.CognitiveServices/accounts/{account}/projects/{project}`)
- Azure CLI installed and authenticated (`az login`)
- Optional: Set `PROJECT_RESOURCE_ID` environment variable

## Workflow Overview

### Complete Flow (14 Phases)

```
1. Verify Authentication
2. Get Project Resource ID
3. Verify Project Exists
4. Get Model Name (if not provided)
5. List Model Versions → User Selects
6. List SKUs for Version → User Selects
7. Get Capacity Range → User Configures
   7b. If no capacity: Cross-Region Fallback → Query all regions → User selects region/project
8. List RAI Policies → User Selects
9. Configure Advanced Options (if applicable)
10. Configure Version Upgrade Policy
11. Generate Deployment Name
12. Review Configuration
13. Execute Deployment & Monitor
```

### Fast Path (Defaults)

If user accepts all defaults (latest version, GlobalStandard SKU, recommended capacity, default RAI policy, standard upgrade policy), deployment completes in ~5 interactions.

---

## Phase Summaries

> ⚠️ **MUST READ:** Before executing any phase, load [references/customize-workflow.md](references/customize-workflow.md) for the full scripts and implementation details. The summaries below describe *what* each phase does — the reference file contains the *how* (CLI commands, quota patterns, capacity formulas, cross-region fallback logic).

| Phase | Action | Key Details |
|-------|--------|-------------|
| **1. Verify Auth** | Check `az account show`; prompt `az login` if needed | Verify correct subscription is active |
| **2. Get Project ID** | Read `PROJECT_RESOURCE_ID` env var or prompt user | ARM resource ID format required |
| **3. Verify Project** | Parse resource ID, call `az cognitiveservices account show` | Extracts subscription, RG, account, project, region |
| **4. Get Model** | List models via `az cognitiveservices account list-models` | User selects from available or enters custom name |
| **5. Select Version** | Query versions for chosen model | Recommend latest; user picks from list |
| **6. Select SKU** | Query model catalog + subscription quota, show only deployable SKUs | ⚠️ Never hardcode SKU lists — always query live data |
| **7. Configure Capacity** | Query capacity API, validate min/max/step, user enters value | Cross-region fallback if no capacity in current region |
| **8. Select RAI Policy** | Present content filter options | Default: `Microsoft.DefaultV2` |
| **9. Advanced Options** | Dynamic quota (GlobalStandard), priority processing (PTU), spillover | SKU-dependent availability |
| **10. Upgrade Policy** | Choose: OnceNewDefaultVersionAvailable / OnceCurrentVersionExpired / NoAutoUpgrade | Default: auto-upgrade on new default |
| **11. Deployment Name** | Auto-generate unique name, allow custom override | Validates format: `^[\w.-]{2,64}$` |
| **12. Review** | Display full config summary, confirm before proceeding | User approves or cancels |
| **13. Deploy & Monitor** | `az cognitiveservices account deployment create`, poll status | Timeout after 5 min; show endpoint + portal link |


---

## Error Handling

### Common Issues and Resolutions

| Error | Cause | Resolution |
|-------|-------|------------|
| **Model not found** | Invalid model name | List available models with `az cognitiveservices account list-models` |
| **Version not available** | Version not supported for SKU | Select different version or SKU |
| **Insufficient quota** | Capacity > available quota | Skill auto-searches all regions; fails only if no region has quota |
| **SKU not supported** | SKU not available in region | Cross-region fallback searches other regions automatically |
| **Capacity out of range** | Invalid capacity value | **PREVENTED**: Skill validates min/max/step at input (Phase 7) |
| **Deployment name exists** | Name conflict | Auto-incremented name generation |
| **Authentication failed** | Not logged in | Run `az login` |
| **Permission denied** | Insufficient permissions | Assign Cognitive Services Contributor role |
| **Capacity query fails** | API/permissions/network error | **DEPLOYMENT BLOCKED**: Will not proceed without valid quota data |

### Troubleshooting Commands

```bash
# Check deployment status
az cognitiveservices account deployment show --name <account> --resource-group <rg> --deployment-name <name>

# List all deployments
az cognitiveservices account deployment list --name <account> --resource-group <rg> -o table

# Check quota usage
az cognitiveservices usage list --name <account> --resource-group <rg>

# Delete failed deployment
az cognitiveservices account deployment delete --name <account> --resource-group <rg> --deployment-name <name>
```

---

## Selection Guides & Advanced Topics

> For SKU comparison tables, PTU sizing formulas, and advanced option details, load [references/customize-guides.md](references/customize-guides.md).

**SKU selection:** GlobalStandard (production/HA) → Standard (dev/test) → ProvisionedManaged (high-volume/guaranteed throughput) → DataZoneStandard (data residency).

**Capacity:** TPM-based SKUs range from 1K (dev) to 100K+ (large production). PTU-based use formula: `(Input TPM × 0.001) + (Output TPM × 0.002) + (Requests/min × 0.1)`.

**Advanced options:** Dynamic quota (GlobalStandard only), priority processing (PTU only, extra cost), spillover (overflow to backup deployment).

---

## Related Skills

- **preset** - Quick deployment to best region with automatic configuration
- **microsoft-foundry** - Parent skill for all Azure AI Foundry operations
- **[quota](../../../quota/quota.md)** — For quota viewing, increase requests, and troubleshooting quota errors, defer to this skill instead of duplicating guidance
- **rbac** - Manage permissions and access control

---

## Notes

- Set `PROJECT_RESOURCE_ID` environment variable to skip prompt
- Not all SKUs available in all regions; capacity varies by subscription/region/model
- Custom RAI policies can be configured in Azure Portal
- Automatic version upgrades occur during maintenance windows
- Use Azure Monitor and Application Insights for production deployments