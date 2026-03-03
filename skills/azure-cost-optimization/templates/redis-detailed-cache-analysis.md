Redis Cost Optimization Report - Detailed Analysis
Subscription: Example-Subscription (12345678-1234-1234-1234-123456789abc)
Generated: January 26, 2026

═══════════════════════════════════════════════════════════════════

SUBSCRIPTION OVERVIEW
- Total Caches: 5
- Current Monthly Cost: $850
- Potential Savings: $425/month (50%)
- Critical Issues: 3

CRITICAL ISSUES (🔴 Immediate Action)

[1] example-cache-001
    SKU: Premium P1 (6GB)
    State: Failed
    Location: eastus2
    Age: 12 days
    Cost: $300/month
    Tags: environment=dev, owner=user1@example.com
    
    ❌ Problem: Cache in Failed state for 12 days
    💡 Recommendation: Delete immediately
    💰 Savings: $300/month
    
    Action: az redis delete --name example-cache-001 --resource-group dev-rg

[2] example-cache-002
    SKU: Premium P1 (6GB)
    State: Running
    Location: eastus2
    Age: 120 days
    Cost: $300/month
    Tags: environment=dev, owner=user2@example.com
    
    ⚠️ Problem: Premium tier in dev environment
    💡 Recommendation: Downgrade to Standard C3 (6GB)
    💰 Savings: $175/month
    
    Next Steps:
    1. Verify with owner: user2@example.com
    2. Schedule maintenance window
    3. az redis update --name example-cache-002 --resource-group dev-rg --sku Standard --vm-size C3

HIGH PRIORITY (🟠 Review This Week)

[3] example-cache-003
    SKU: Standard C2 (2.5GB)
    State: Running
    Location: westus
    Age: 180 days
    Cost: $100/month
    Tags: purpose=test, temporary=true, created=2025-07-15
    
    ⚠️ Problem: Temporary test cache running for 6 months
    💡 Recommendation: Delete if no longer needed
    💰 Savings: $100/month
    
    Action: Confirm with team, then delete

HEALTHY CACHES (🟢 No Action Needed)

[4] example-cache-004
    SKU: Standard C3 (6GB)
    State: Running
    Cost: $125/month
    Tags: environment=prod, owner=team@example.com
    ✓ Appropriate tier for production workload

[5] example-cache-005
    SKU: Standard C1 (1GB)
    State: Running
    Cost: $75/month
    Tags: environment=staging
    ✓ Cost-optimized for staging environment

═══════════════════════════════════════════════════════════════════

SAVINGS SUMMARY
- Critical issues resolved: $425/month
- Total potential savings: $425/month (50% reduction)
- New monthly cost: $425/month

RECOMMENDED ACTIONS
1. [Immediate] Confirm with the team, then delete example-cache-001 (Failed state)
2. [This Week] Downgrade example-cache-002 to Standard
3. [This Week] Confirm example-cache-003 still needed, delete if not

Would you like me to:
  A. Generate Azure CLI commands for these actions
  B. Analyze another subscription
  C. Export full report to CSV
  D. Set up automated monitoring

Please select (A/B/C/D):