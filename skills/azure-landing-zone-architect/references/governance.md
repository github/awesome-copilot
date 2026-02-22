# Governance and Compliance Design

## Table of Contents
1. [Management Group Hierarchy](#management-group-hierarchy)
2. [Subscription Organization](#subscription-organization)
3. [Azure Policy Strategy](#azure-policy-strategy)
4. [Naming and Tagging](#naming-and-tagging)
5. [Cost Management](#cost-management)

## Management Group Hierarchy

### Recommended Structure
```
Tenant Root Group
│
├── Platform
│   ├── Management
│   │   └── sub-management-001
│   ├── Identity
│   │   └── sub-identity-001
│   └── Connectivity
│       └── sub-connectivity-001
│
├── Landing Zones
│   ├── Corp
│   │   ├── sub-app-finance-prod
│   │   ├── sub-app-finance-dev
│   │   └── sub-app-hr-prod
│   ├── Online
│   │   ├── sub-web-marketing-prod
│   │   └── sub-web-ecommerce-prod
│   └── Confidential
│       └── sub-app-pii-prod
│
├── Sandbox
│   └── sub-sandbox-team-a
│
└── Decommissioned
    └── (subscriptions pending deletion)
```

### Management Group Purpose

| Management Group | Purpose | Policy Focus |
|------------------|---------|--------------|
| Platform | Core infrastructure | Strict security, no workloads |
| Management | Monitoring, automation | Log collection, diagnostics |
| Identity | Identity services | AD DS, Azure AD Connect |
| Connectivity | Networking | Hub VNets, gateways, firewall |
| Landing Zones | Application workloads | Balanced security/agility |
| Corp | Internal apps | Private connectivity required |
| Online | Internet-facing | WAF, DDoS protection |
| Confidential | Sensitive data | Encryption, data residency |
| Sandbox | Experimentation | Relaxed policies, no prod data |
| Decommissioned | Cleanup staging | Deny all deployments |

## Subscription Organization

### Subscription Design Patterns

| Pattern | When to Use | Example |
|---------|-------------|---------|
| Environment-based | Simple workloads | sub-app-prod, sub-app-dev |
| Workload-based | Complex apps | sub-frontend, sub-backend |
| Team-based | Autonomous teams | sub-team-platform, sub-team-data |
| Hybrid | Large organizations | Combine patterns per need |

### Subscription Limits to Consider
- 980 resource groups per subscription
- 800 deployments per resource group
- Varies by resource type (check quotas)

### Subscription Vending
Automate subscription creation with:
1. Request via ServiceNow/form
2. Approval workflow
3. Subscription creation (Bicep/Terraform)
4. Baseline policy assignment
5. Initial RBAC setup
6. Network peering to hub
7. Handoff to application team

## Azure Policy Strategy

### Policy Assignment Hierarchy
```
Tenant Root ──► Security baseline (audit mode)
    │
    ├── Platform ──► Strict security (deny mode)
    │
    ├── Landing Zones ──► Workload policies
    │   ├── Corp ──► Private endpoint required
    │   └── Online ──► WAF required
    │
    └── Sandbox ──► Minimal restrictions
```

### Essential Policy Initiatives

#### Security Baseline
- Require HTTPS on storage accounts
- Require TLS 1.2 minimum
- Deny public blob access
- Require managed disk encryption
- Enable Microsoft Defender for Cloud

#### Network Governance
- Allowed virtual network locations
- Require NSG on subnets
- Deny public IPs (except approved)
- Require private endpoints for PaaS

#### Tag Governance
- Require cost center tag
- Require environment tag
- Require owner tag
- Inherit tags from resource group

#### Cost Control
- Allowed VM SKUs
- Allowed storage SKUs
- Deny expensive services in sandbox

### Policy Definition Example
```json
{
  "mode": "All",
  "policyRule": {
    "if": {
      "allOf": [
        {
          "field": "type",
          "equals": "Microsoft.Storage/storageAccounts"
        },
        {
          "field": "Microsoft.Storage/storageAccounts/supportsHttpsTrafficOnly",
          "notEquals": true
        }
      ]
    },
    "then": {
      "effect": "deny"
    }
  }
}
```

### Policy Rollout Strategy
1. **Deploy in Audit mode** - Assess impact
2. **Review compliance** - Identify non-compliant resources
3. **Remediate existing** - Fix or exempt resources
4. **Switch to Deny mode** - Enforce going forward
5. **Monitor continuously** - Review compliance dashboard

## Naming and Tagging

### Naming Convention
```
{resource-type}-{workload}-{environment}-{region}-{instance}
```

| Component | Values | Example |
|-----------|--------|---------|
| resource-type | rg, vnet, st, kv, app | rg |
| workload | app name or function | payments |
| environment | prod, dev, staging, test | prod |
| region | eastus, westus2, etc. | eastus |
| instance | 001, 002 (if multiple) | 001 |

**Example**: `rg-payments-prod-eastus-001`

### Required Tags

| Tag | Purpose | Example Values |
|-----|---------|----------------|
| Environment | Deployment stage | prod, dev, staging |
| CostCenter | Billing allocation | CC-12345 |
| Owner | Responsible team/person | team-payments@company.com |
| Application | Application name | PaymentGateway |
| DataClassification | Data sensitivity | public, internal, confidential |
| CreatedDate | Resource creation | 2026-01-22 |
| Automation | IaC managed | terraform, bicep, manual |

### Tag Inheritance
```bicep
// Resource group tags flow to resources
resource rg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: 'rg-payments-prod'
  location: location
  tags: {
    Environment: 'prod'
    CostCenter: 'CC-12345'
    Owner: 'team-payments@company.com'
  }
}
```

## Cost Management

### Budget Alerts
```
Subscription Budget:
├── 50% threshold → Email notification
├── 75% threshold → Email + Teams notification
├── 90% threshold → Email + Teams + trigger automation
└── 100% threshold → Email + Teams + potential scale-down
```

### Cost Allocation
- Tag resources with CostCenter
- Use cost allocation rules for shared services
- Create cost views per application/team
- Schedule weekly/monthly reports

### Reserved Instances Strategy
| Resource | Commitment | Savings |
|----------|------------|---------|
| VMs (steady state) | 3-year | ~60% |
| SQL Database | 1-year | ~30% |
| Cosmos DB | 1-year | ~20% |
| App Service | 1-year | ~35% |

### Cost Optimization Checklist
- [ ] Right-size VMs based on metrics
- [ ] Use auto-shutdown for dev/test
- [ ] Delete orphaned disks and NICs
- [ ] Use spot VMs for batch workloads
- [ ] Enable storage lifecycle policies
- [ ] Review advisor recommendations weekly
