Redis Cost Optimization Report
Tenant: Contoso Corp
Generated: January 26, 2026
Subscriptions Analyzed: 3 (filtered by prefix "CacheTeam -")

═══════════════════════════════════════════════════════════════════

EXECUTIVE SUMMARY
- Total Redis Caches: 20
- Current Monthly Cost: $3,625
- Potential Savings: $875/month (24.1%)
- Critical Issues: 4 caches requiring immediate action

BY SUBSCRIPTION
┌─────────────────────┬──────┬──────────┬─────────────┬──────────┐
│ Subscription        │Caches│  Cost/Mo │  Savings/Mo │ Priority │
├─────────────────────┼──────┼──────────┼─────────────┼──────────┤
│ CacheTeam - Alpha   │   5  │   $850   │   $425      │    🔴    │
│ CacheTeam - Beta    │   3  │   $375   │     $0      │    🟢    │
│ CacheTeam - Prod    │  12  │ $2,400   │   $450      │    🟠    │
└─────────────────────┴──────┴──────────┴─────────────┴──────────┘

CRITICAL ISSUES (🔴 Immediate Action Required)
- CacheTeam - Alpha: 1 failed cache, 2 Premium in dev
- CacheTeam - Prod: 1 old test cache (180 days)

Next Steps:
1. Review detailed analysis for CacheTeam - Alpha (type 'analyze alpha')
2. Review detailed analysis for CacheTeam - Prod (type 'analyze prod')
3. Generate full report with all recommendations (type 'full report')