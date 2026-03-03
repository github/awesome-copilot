# Examples: preset

## Example 1: Fast Path — Current Region Has Capacity

**Scenario:** Deploy gpt-4o to project in East US, which has capacity.
**Result:** Deployed in ~45s. No region selection needed. 100K TPM default, GlobalStandard SKU.

## Example 2: Alternative Region — No Capacity in Current Region

**Scenario:** Deploy gpt-4-turbo to dev project in West US 2 (no capacity).
**Result:** Queried all regions → user selected East US 2 (120K available) → deployed in ~2 min.

## Example 3: Create New Project in Optimal Region

**Scenario:** Deploy gpt-4o-mini in Europe for data residency; no existing European project.
**Result:** Created AI Services hub + project in Sweden Central → deployed in ~4 min with 150K TPM.

## Example 4: Insufficient Quota Everywhere

**Scenario:** Deploy gpt-4 but all regions have exhausted quota.
**Result:** Graceful failure with actionable guidance:
1. Request quota increase via the [quota skill](../../../quota/quota.md)
2. List existing deployments consuming quota
3. Suggest alternative models (gpt-4o, gpt-4o-mini)

## Example 5: First-Time User — No Project

**Scenario:** Deploy gpt-4o with no existing AI Foundry project.
**Result:** Full onboarding in ~5 min — created resource group, AI Services hub, project, then deployed.

## Example 6: Deployment Name Conflict

**Scenario:** Auto-generated deployment name already exists.
**Result:** Appended random hex suffix (e.g., `-7b9e`) and retried automatically.

## Example 7: Multi-Version Model Selection

**Scenario:** Deploy "latest gpt-4o" when multiple versions exist.
**Result:** Latest stable version auto-selected. Capacity aggregated across versions.

## Example 8: Anthropic Model (claude-sonnet-4-6)

**Scenario:** Deploy claude-sonnet-4-6 (Anthropic model requiring modelProviderData).
**Result:** User prompted for industry selection → tenant country code and org name fetched automatically → deployed via ARM REST API with `modelProviderData` payload in ~2 min. Capacity set to 1 (MaaS billing).

---

## Summary of Scenarios

| Scenario | Duration | Key Features |
|----------|----------|--------------|
| **1: Fast Path** | ~45s | Current region has capacity, direct deploy |
| **2: Alt Region** | ~2m | Region selection, project switch |
| **3: New Project** | ~4m | Project creation in optimal region |
| **4: No Quota** | N/A | Graceful failure, actionable guidance |
| **5: First-Time** | ~5m | Complete onboarding |
| **6: Name Conflict** | ~1m | Auto-retry with suffix |
| **7: Multi-Version** | ~1m | Latest version auto-selected |
| **8: Anthropic** | ~2m | Industry prompt, tenant info, REST API deploy |

## Common Patterns

```
A: Quick Deploy     Auth → Get Project → Check Region (✓) → Deploy
B: Region Select    Auth → Get Project → Region (✗) → Query All → Select → Deploy
C: Full Onboarding  Auth → No Projects → Create Project → Deploy
D: Error Recovery   Deploy (✗) → Analyze → Fix → Retry
```
