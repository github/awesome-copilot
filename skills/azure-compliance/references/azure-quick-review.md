# Azure Quick Review Compliance Assessment

This skill enables comprehensive Azure compliance assessments using Azure Quick Review (azqr), analyzing findings against Azure best practices, and providing actionable remediation guidance.

## Prerequisites

- **Azure authentication** - Logged in via Azure CLI (`az login`) or using Service Principal/Managed Identity
- **Reader permissions** - Minimum Reader role on target subscription or management group

## Assessment Workflow

### Step 1: Determine Scan Scope

Ask the user or detect from context:

| Scope | Use Case | Required Info |
|-------|----------|---------------|
| Subscription | Full subscription assessment | Subscription ID |
| Resource Group | Targeted assessment | Subscription ID + Resource Group name |
| Management Group | Enterprise-wide assessment | Management Group ID |
| Specific Service | Deep-dive on one resource type | Subscription ID + Service abbreviation |

### Step 2: Run Compliance Scan

Use the Azure MCP tool to run the scan:

```
mcp_azure_mcp_extension_azqr
  subscription: <subscription-id>
  resource-group: <optional-rg-name>
```

### Step 3: Analyze Scan Results

The scan produces an Excel file with these sheets:

| Sheet | Contents | Priority |
|-------|----------|----------|
| **Recommendations** | All recommendations with impacted resource count | High |
| **ImpactedResources** | Resources with specific issues to address | High |
| **Inventory** | All scanned resources with SKU, Tier, SLA details | Medium |
| **Advisor** | Azure Advisor recommendations | Medium |
| **DefenderRecommendations** | Microsoft Defender for Cloud findings | High |
| **Azure Policy** | Non-compliant resources per Azure Policy | Medium |
| **Costs** | 3-month cost history by subscription | Low |
| **Defender** | Defender plan status and tiers | Medium |
| **OutOfScope** | Resources not scanned | Low |

**Focus analysis on:**
1. High-severity recommendations from ImpactedResources
2. Defender recommendations (security-critical)
3. Advisor recommendations (reliability/performance)
4. Policy non-compliance (governance)

### Step 4: Categorize Findings

Group findings by category for prioritized remediation:

| Category | Examples | Severity |
|----------|----------|----------|
| **Security** | Public endpoints, missing encryption, no private endpoints | Critical |
| **Reliability** | No zone redundancy, single instance, no backup | High |
| **Performance** | Undersized SKUs, missing caching, no CDN | Medium |
| **Cost** | Orphaned resources, oversized SKUs, unused reservations | Medium |
| **Operations** | Missing diagnostics, no alerts, no tags | Low |

### Step 5: Generate Remediation Guidance

For each high-priority finding:
1. Explain the risk in plain language
2. Provide remediation options (Portal, CLI, Bicep)
3. Estimate effort and impact

See [azqr-remediation-patterns.md](azqr-remediation-patterns.md) for common fix templates.

### Step 6: Present Summary

Provide a structured summary:

```markdown
## Compliance Assessment Summary

**Scope:** [Subscription/RG/MG name]
**Scanned:** [Date/Time]
**Resources Analyzed:** [Count]

### Key Findings

| Severity | Count | Top Issues |
|----------|-------|------------|
| Critical | X | [List top 3] |
| High | X | [List top 3] |
| Medium | X | [List top 3] |

### Recommended Actions

1. **[Issue]** - [Brief remediation]
2. **[Issue]** - [Brief remediation]
3. **[Issue]** - [Brief remediation]

### Next Steps
- [ ] Address critical security findings
- [ ] Review and remediate high-severity items
- [ ] Schedule follow-up scan to verify fixes
```

## Supported Azure Services

azqr supports 70+ Azure resource types including:

- Azure Kubernetes Service (AKS)
- API Management
- App Configuration
- App Service
- Container Apps
- Cosmos DB
- Container Registry
- Key Vault
- Load Balancer
- Azure Database for MySQL
- Azure Database for PostgreSQL
- Azure Cache for Redis
- Service Bus
- Azure SQL Database
- Storage Accounts
- Virtual Machines
- Virtual Networks

## Tools Used

| Tool | Purpose |
|------|---------|
| `mcp_azure_mcp_extension_azqr` | Run azqr scans via Azure MCP |
| `mcp_azure_mcp_subscription_list` | List available subscriptions |
| `mcp_azure_mcp_group_list` | List resource groups in subscription |

## Troubleshooting

| Issue | Symptom | Solution |
|-------|---------|----------|
| Permission denied | 403 errors during scan | Verify Reader role on scope |
| Not authenticated | `AADSTS` errors | Run `az login` first |
| Slow scan | Scan takes very long | Use resource group scope |

## Example Prompts

- "Check my Azure subscription for compliance issues"
- "Run azqr on my production resource group"
- "What Azure resources don't follow best practices?"
- "Assess my storage accounts for security issues"

## Reference Documentation

- [Recommendation Categories](azqr-recommendations.md)
- [Remediation Patterns](azqr-remediation-patterns.md)
- [Azure Quick Review Documentation](https://azure.github.io/azqr/docs/)
- [Azure Proactive Resiliency Library](https://aka.ms/aprl)
