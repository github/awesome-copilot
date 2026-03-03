## Azure Redis Cost Optimization

Reference guide for identifying cost savings opportunities in Azure Redis deployments through analysis and targeted scans.

## Subscription Input Options

Accept any of these identifiers to identify subscriptions for analysis:

| Input Type | Example | Use Case |
|------------|---------|----------|
| **Subscription ID** | `a1b2c3d4-...` | Analyze specific subscription |
| **Subscription Name** | `Production-Environment` | User-friendly identifier |
| **Subscription Prefix** | `CacheTeam -` | Analyze all team subscriptions |
| **Tenant ID** | `tenant-guid` | Analyze entire organization |
| **"All my subscriptions"** | (keyword) | Scan all accessible subscriptions |

## Cost Optimization Rules

When analyzing each cache, apply these prioritized rules:

| Priority | Rule | Detection Logic | Recommendation | Avg Savings |
|----------|------|----------------|----------------|-------------|
| 🔴 Critical | Failed Cache | `provisioningState == 'Failed'` | Delete immediately | $50-300/mo |
| 🔴 Critical | Stuck Creating | `provisioningState == 'Creating'` AND age >4 hours | Delete/support ticket | $50-300/mo |
| 🟠 High | Premium in Dev | `sku.name == 'Premium'` AND `tags.environment in ['dev','test','staging']` | Downgrade to Standard | $175/mo |
| 🟠 High | Enterprise Unused | `sku.name startsWith 'Enterprise'` AND no modules/clustering | Downgrade to Premium/Standard | $300-1000/mo |
| 🟠 High | Old Test Cache | `tags.purpose == 'test'` AND age >60 days | Delete or downgrade | $50-150/mo |
| 🟡 Medium | Large Dev Cache | `sku.capacity >3` AND `tags.environment == 'dev'` | Reduce size | $100-300/mo |
| 🟡 Medium | No Expiration Tag | Missing `expirationDate` or `ttl` tag | Add cleanup policy | N/A |
| 🟢 Low | Untagged Resource | Missing required tags (`environment`, `owner`) | Apply tags | N/A |
| 🟢 Low | Old Cache | Age >365 days | Review if still needed | Variable |

## Report Templates

### Subscription-Level Summary
Quick overview of costs and issues per subscription (use for multi-subscription scans).
See [redis-subscription-level-report.md](../templates/redis-subscription-level-report.md) for template format.

### Detailed Cache Analysis
Individual cache breakdown with specific recommendations.
See [redis-detailed-cache-analysis.md](../templates/redis-detailed-cache-analysis.md) for template format.

## Tools & Commands

**MCP Tool:** `mcp_azure_mcp_redis` with command `redis_list` (parameter: `subscription`)

**Azure CLI Equivalents:**
- `az account list` - List subscriptions
- `az redis list --subscription <id>` - List Redis caches
- `az redis show` - Get cache details
- `az redis delete` - Remove cache
