---
name: azure-cost-optimization
description: "Identify and quantify cost savings across Azure subscriptions by analyzing actual costs, utilization metrics, and generating actionable optimization recommendations. USE FOR: optimize Azure costs, reduce Azure spending, reduce Azure expenses, analyze Azure costs, find cost savings, generate cost optimization report, find orphaned resources, rightsize VMs, cost analysis, reduce waste, Azure spending analysis, find unused resources, optimize Redis costs. DO NOT USE FOR: deploying resources (use azure-deploy), general Azure diagnostics (use azure-diagnostics), security issues (use azure-security)"
license: MIT
metadata:
  author: Microsoft
  version: "1.0.0"
---

# Azure Cost Optimization Skill

Analyze Azure subscriptions to identify cost savings through orphaned resource cleanup, rightsizing, and optimization recommendations based on actual usage data.

## When to Use This Skill

Use this skill when the user asks to:
- Optimize Azure costs or reduce spending
- Analyze Azure subscription for cost savings
- Generate cost optimization report
- Find orphaned or unused resources
- Rightsize Azure VMs, containers, or services
- Identify where they're overspending in Azure
- **Optimize Redis costs specifically** - See [Azure Redis Cost Optimization](./references/azure-redis.md) for Redis-specific analysis

## Instructions

Follow these steps in conversation with the user:

### Step 0: Validate Prerequisites

Before starting, verify these tools and permissions are available:

**Required Tools:**
- Azure CLI installed and authenticated (`az login`)
- Azure CLI extensions: `costmanagement`, `resource-graph`
- Azure Quick Review (azqr) installed - See [Azure Quick Review](./references/azure-quick-review.md) for details

**Required Permissions:**
- Cost Management Reader role
- Monitoring Reader role
- Reader role on subscription/resource group

**Verification commands:**
```powershell
az --version
az account show
az extension show --name costmanagement
azqr version
```

### Step 1: Load Best Practices

Get Azure cost optimization best practices to inform recommendations:

```javascript
// Use Azure MCP best practices tool
mcp_azure_mcp_get_azure_bestpractices({
  intent: "Get cost optimization best practices",
  command: "get_bestpractices",
  parameters: { resource: "cost-optimization", action: "all" }
})
```

### Step 1.5: Redis-Specific Analysis (Conditional)

**If the user specifically requests Redis cost optimization**, use the specialized Redis skill:

📋 **Reference**: [Azure Redis Cost Optimization](./references/azure-redis.md)

**When to use Redis-specific analysis:**
- User mentions "Redis", "Azure Cache for Redis", or "Azure Managed Redis"
- Focus is on Redis resource optimization, not general subscription analysis
- User wants Redis-specific recommendations (SKU downgrade, failed caches, etc.)

**Key capabilities:**
- Interactive subscription filtering (prefix, ID, or "all subscriptions")
- Redis-specific optimization rules (failed caches, oversized tiers, missing tags)
- Pre-built report templates for Redis cost analysis
- Uses `redis_list` command

**Report templates available:**
- [Subscription-level Redis summary](./templates/redis-subscription-level-report.md)
- [Detailed Redis cache analysis](./templates/redis-detailed-cache-analysis.md)

> **Note**: For general subscription-wide cost optimization (including Redis), continue with Step 2. For Redis-only focused analysis, follow the instructions in the Redis-specific reference document.
### Step 1.6: Choose Analysis Scope (for Redis-specific analysis)

**If performing Redis cost optimization**, ask the user to select their analysis scope:

**Prompt the user with these options:**
1. **Specific Subscription ID** - Analyze a single subscription
2. **Subscription Name** - Use display name instead of ID
3. **Subscription Prefix** - Analyze all subscriptions starting with a prefix (e.g., "CacheTeam")
4. **All My Subscriptions** - Scan all accessible subscriptions
5. **Tenant-wide** - Analyze entire organization

Wait for user response before proceeding to Step 2.

### Step 2: Run Azure Quick Review

Run azqr to find orphaned resources (immediate cost savings):

📋 **Reference**: [Azure Quick Review](./references/azure-quick-review.md) - Detailed instructions for running azqr scans

```javascript
// Use Azure MCP extension_azqr tool
extension_azqr({
  subscription: "<SUBSCRIPTION_ID>",
  "resource-group": "<RESOURCE_GROUP>"  // optional
})
```

**What to look for in azqr results:**
- Orphaned resources: unattached disks, unused NICs, idle NAT gateways
- Over-provisioned resources: excessive retention periods, oversized SKUs
- Missing cost tags: resources without proper cost allocation

> **Note**: The Azure Quick Review reference document includes instructions for creating filter configurations, saving output to the `output/` folder, and interpreting results for cost optimization.

### Step 3: Discover Resources

For efficient cross-subscription resource discovery, use Azure Resource Graph. See [Azure Resource Graph Queries](references/azure-resource-graph.md) for orphaned resource detection and cost optimization patterns.

List all resources in the subscription using Azure MCP tools or CLI:

```powershell
# Get subscription info
az account show

# List all resources
az resource list --subscription "<SUBSCRIPTION_ID>" --resource-group "<RESOURCE_GROUP>"

# Use MCP tools for specific services (preferred):
# - Storage accounts, Cosmos DB, Key Vaults: use Azure MCP tools
# - Redis caches: use mcp_azure_mcp_redis tool (see ./references/azure-redis.md)
# - Web apps, VMs, SQL: use az CLI commands
```

### Step 4: Query Actual Costs

Get actual cost data from Azure Cost Management API (last 30 days):

**Create cost query file:**

Create `temp/cost-query.json` with:
```json
{
  "type": "ActualCost",
  "timeframe": "Custom",
  "timePeriod": {
    "from": "<START_DATE>",  
    "to": "<END_DATE>"
  },
  "dataset": {
    "granularity": "None",
    "aggregation": {
      "totalCost": {
        "name": "Cost",
        "function": "Sum"
      }
    },
    "grouping": [
      {
        "type": "Dimension",
        "name": "ResourceId"
      }
    ]
  }
}
```

> **Action Required**: Calculate `<START_DATE>` (30 days ago) and `<END_DATE>` (today) in ISO 8601 format (e.g., `2025-11-03T00:00:00Z`).

**Execute cost query:**
```powershell
# Create temp folder
New-Item -ItemType Directory -Path "temp" -Force

# Query using REST API (more reliable than az costmanagement query)
az rest --method post `
  --url "https://management.azure.com/subscriptions/<SUBSCRIPTION_ID>/resourceGroups/<RESOURCE_GROUP>/providers/Microsoft.CostManagement/query?api-version=2023-11-01" `
  --body '@temp/cost-query.json'
```

**Important:** Save the query results to `output/cost-query-result<timestamp>.json` for audit trail.

### Step 5: Validate Pricing

Fetch current pricing from official Azure pricing pages using `fetch_webpage`:

```javascript
// Validate pricing for key services
fetch_webpage({
  urls: ["https://azure.microsoft.com/en-us/pricing/details/container-apps/"],
  query: "pricing tiers and costs"
})
```

**Key services to validate:**
- Container Apps: https://azure.microsoft.com/pricing/details/container-apps/
- Virtual Machines: https://azure.microsoft.com/pricing/details/virtual-machines/
- App Service: https://azure.microsoft.com/pricing/details/app-service/
- Log Analytics: https://azure.microsoft.com/pricing/details/monitor/

> **Important**: Check for free tier allowances - many Azure services have generous free limits that may explain $0 costs.

### Step 6: Collect Utilization Metrics

Query Azure Monitor for utilization data (last 14 days) to support rightsizing recommendations:

```powershell
# Calculate dates for last 14 days
$startTime = (Get-Date).AddDays(-14).ToString("yyyy-MM-ddTHH:mm:ssZ")
$endTime = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"

# VM CPU utilization
az monitor metrics list `
  --resource "<RESOURCE_ID>" `
  --metric "Percentage CPU" `
  --interval PT1H `
  --aggregation Average `
  --start-time $startTime `
  --end-time $endTime

# App Service Plan utilization
az monitor metrics list `
  --resource "<RESOURCE_ID>" `
  --metric "CpuTime,Requests" `
  --interval PT1H `
  --aggregation Total `
  --start-time $startTime `
  --end-time $endTime

# Storage capacity
az monitor metrics list `
  --resource "<RESOURCE_ID>" `
  --metric "UsedCapacity,BlobCount" `
  --interval PT1H `
  --aggregation Average `
  --start-time $startTime `
  --end-time $endTime
```

### Step 7: Generate Optimization Report

Create a comprehensive cost optimization report in the `output/` folder:

**Use the `create_file` tool** with path `output/costoptimizereport<YYYYMMDD_HHMMSS>.md`:

**Report Structure:**
```markdown
# Azure Cost Optimization Report
**Generated**: <timestamp>

## Executive Summary
- Total Monthly Cost: $X (💰 ACTUAL DATA)
- Top Cost Drivers: [List top 3 resources with Azure Portal links]

## Cost Breakdown
[Table with top 10 resources by cost, including Azure Portal links]

## Free Tier Analysis
[Resources operating within free tiers showing $0 cost]

## Orphaned Resources (Immediate Savings)
[From azqr - resources that can be deleted immediately]
- Resource name with Portal link - $X/month savings

## Optimization Recommendations

### Priority 1: High Impact, Low Risk
[Example: Delete orphaned resources]
- 💰 ACTUAL cost: $X/month
- 📊 ESTIMATED savings: $Y/month
- Commands to execute (with warnings)

### Priority 2: Medium Impact, Medium Risk
[Example: Rightsize VM from D4s_v5 to D2s_v5]
- 💰 ACTUAL baseline: D4s_v5, $X/month
- 📈 ACTUAL metrics: CPU 8%, Memory 30%
- 💵 VALIDATED pricing: D4s_v5 $Y/hr, D2s_v5 $Z/hr
- 📊 ESTIMATED savings: $S/month
- Commands to execute

### Priority 3: Long-term Optimization
[Example: Reserved Instances, Storage tiering]

## Total Estimated Savings
- Monthly: $X
- Annual: $Y

## Implementation Commands
[Safe commands with approval warnings]

## Validation Appendix

### Data Sources and Files
- **Cost Query Results**: `output/cost-query-result<timestamp>.json`
  - Raw cost data from Azure Cost Management API
  - Audit trail proving actual costs at report generation time
  - Keep for at least 12 months for historical comparison
  - Contains every resource's exact cost over the analysis period
- **Pricing Sources**: [Links to Azure pricing pages]
- **Free Tier Allowances**: [Applicable allowances]

> **Note**: The `temp/cost-query.json` file (if present) is a temporary query template and can be safely deleted. All permanent audit data is in the `output/` folder.
```

**Portal Link Format:**
```
https://portal.azure.com/#@<TENANT_ID>/resource/subscriptions/<SUBSCRIPTION_ID>/resourceGroups/<RESOURCE_GROUP>/providers/<RESOURCE_PROVIDER>/<RESOURCE_TYPE>/<RESOURCE_NAME>/overview
```

### Step 8: Save Audit Trail

Save all cost query results for validation:

**Use the `create_file` tool** with path `output/cost-query-result<YYYYMMDD_HHMMSS>.json`:

```json
{
  "timestamp": "<ISO_8601>",
  "subscription": "<SUBSCRIPTION_ID>",
  "resourceGroup": "<RESOURCE_GROUP>",
  "queries": [
    {
      "queryType": "ActualCost",
      "timeframe": "MonthToDate",
      "query": { },
      "response": { }
    }
  ]
}
```

### Step 9: Clean Up Temporary Files

Remove temporary query files and folder after the report is generated:

```powershell
# Delete entire temp folder (no longer needed)
Remove-Item -Path "temp" -Recurse -Force -ErrorAction SilentlyContinue
```

> **Note**: The `temp/cost-query.json` file is only needed during API execution. The actual query and results are preserved in `output/cost-query-result*.json` for audit purposes.

## Output

The skill generates:
1. **Cost Optimization Report** (`output/costoptimizereport<timestamp>.md`)
   - Executive summary with total costs and top drivers
   - Detailed cost breakdown with Azure Portal links
   - Prioritized recommendations with actual data and estimated savings
   - Implementation commands with safety warnings

2. **Cost Query Results** (`output/cost-query-result<timestamp>.json`)
   - Audit trail of all cost queries and responses
   - Validation evidence for recommendations

## Important Notes

### Data Classification
- 💰 **ACTUAL DATA** = Retrieved from Azure Cost Management API
- 📈 **ACTUAL METRICS** = Retrieved from Azure Monitor
- 💵 **VALIDATED PRICING** = Retrieved from official Azure pricing pages
- 📊 **ESTIMATED SAVINGS** = Calculated based on actual data and validated pricing

### Best Practices
- Always query actual costs first - never estimate or assume
- Validate pricing from official sources - account for free tiers
- Use REST API for cost queries (more reliable than `az costmanagement query`)
- Save audit trail - include all queries and responses
- Include Azure Portal links for all resources
- Use UTF-8 encoding when creating report files
- For costs < $10/month, emphasize operational improvements over financial savings
- Never execute destructive operations without explicit approval

### Common Pitfalls
- **Assuming costs**: Always query actual data from Cost Management API
- **Ignoring free tiers**: Many services have generous allowances (e.g., Container Apps: 180K vCPU-sec free/month)
- **Using wrong date ranges**: 30 days for costs, 14 days for utilization
- **Broken Portal links**: Verify tenant ID and resource ID format
- **Cost query failures**: Use `az rest` with JSON body, not `az costmanagement query`

### Safety Requirements
- Get approval before deleting resources
- Test changes in non-production first
- Provide dry-run commands for validation
- Include rollback procedures
- Monitor impact after implementation

## SDK Quick References

- **Redis Management**: [.NET](references/sdk/azure-resource-manager-redis-dotnet.md)
