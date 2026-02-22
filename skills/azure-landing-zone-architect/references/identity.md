# Identity and Access Management Design

## Table of Contents
1. [Azure AD Tenant Design](#azure-ad-tenant-design)
2. [Management Group RBAC](#management-group-rbac)
3. [Privileged Identity Management](#privileged-identity-management)
4. [Hybrid Identity](#hybrid-identity)
5. [Conditional Access](#conditional-access)

## Azure AD Tenant Design

### Single vs Multiple Tenants

| Factor | Single Tenant | Multiple Tenants |
|--------|---------------|------------------|
| Collaboration | Seamless | Requires B2B |
| Administration | Centralized | Distributed |
| Compliance isolation | Via subscriptions | Complete separation |
| Recommended | Most organizations | Strict regulatory needs |

### Tenant Configuration Baseline
- Enable Security Defaults or Conditional Access
- Configure Azure AD Identity Protection
- Enable Azure AD audit logs to Log Analytics
- Implement break-glass accounts (2 minimum)
- Disable legacy authentication

## Management Group RBAC

### Built-in Roles by Scope

| Role | Scope | Use Case |
|------|-------|----------|
| Owner | Tenant Root | Platform team only |
| Contributor | Landing Zone MG | Application teams |
| Reader | Platform MG | Security/compliance teams |
| Network Contributor | Connectivity sub | NetOps team |
| Security Admin | Tenant | SecOps team |

### Custom Role: Landing Zone Owner
```json
{
  "Name": "Landing Zone Owner",
  "Description": "Full control within landing zone, no policy changes",
  "Actions": [
    "Microsoft.Resources/*",
    "Microsoft.Compute/*",
    "Microsoft.Storage/*",
    "Microsoft.Network/*",
    "Microsoft.Web/*",
    "Microsoft.Sql/*"
  ],
  "NotActions": [
    "Microsoft.Authorization/policyAssignments/*",
    "Microsoft.Authorization/policyDefinitions/*",
    "Microsoft.Network/virtualNetworks/virtualNetworkPeerings/*"
  ],
  "AssignableScopes": ["/providers/Microsoft.Management/managementGroups/landing-zones"]
}
```

### Custom Role: Subscription Vending
```json
{
  "Name": "Subscription Creator",
  "Description": "Create and manage subscriptions",
  "Actions": [
    "Microsoft.Subscription/aliases/*",
    "Microsoft.Management/managementGroups/subscriptions/*",
    "Microsoft.Resources/subscriptions/read"
  ],
  "AssignableScopes": ["/providers/Microsoft.Management/managementGroups/root"]
}
```

## Privileged Identity Management

### PIM Configuration for Platform Roles

| Role | Activation Duration | Require Approval | MFA Required |
|------|---------------------|------------------|--------------|
| Global Admin | 2 hours | Yes | Yes |
| Owner (Tenant Root) | 4 hours | Yes | Yes |
| Contributor (Platform) | 8 hours | No | Yes |
| Reader (any) | Permanent eligible | No | Yes |

### Break-Glass Account Configuration
1. Create 2 cloud-only accounts (no hybrid sync)
2. Exclude from all Conditional Access policies
3. Assign Global Administrator permanently
4. Store credentials in physical safe
5. Monitor sign-ins with alerts
6. Test quarterly

## Hybrid Identity

### Identity Models

| Model | Description | Recommended When |
|-------|-------------|------------------|
| Cloud-only | All identities in Azure AD | New organizations, no on-prem |
| Synchronized | AD DS synced to Azure AD | Existing AD DS investment |
| Federated | ADFS or PingFederate | Strict on-prem auth requirements |

### Azure AD Connect Deployment
```
On-premises                          Azure
┌─────────────────┐                 ┌─────────────────┐
│   AD DS         │                 │   Azure AD      │
│   Domain        │◄───────────────►│   Tenant        │
│   Controllers   │  Azure AD       │                 │
└─────────────────┘  Connect        └─────────────────┘
        │            Sync                    │
        │                                    │
        ▼                                    ▼
┌─────────────────┐                 ┌─────────────────┐
│   Users         │                 │   Cloud Apps    │
│   Groups        │                 │   Azure RBAC    │
│   Computers     │                 │   Conditional   │
└─────────────────┘                 └─────────────────┘
```

### Recommended Sync Settings
- Password Hash Sync: **Enabled** (required for Identity Protection)
- Password Writeback: **Enabled** (for SSPR)
- Device Writeback: **Optional** (for Hybrid Azure AD Join)
- Filtering: By OU or group (not attribute-based)

## Conditional Access

### Baseline Policies (Minimum Required)

1. **Require MFA for admins**
   - Users: Directory roles (Global Admin, etc.)
   - Cloud apps: All
   - Grant: Require MFA

2. **Require MFA for Azure Management**
   - Users: All
   - Cloud apps: Microsoft Azure Management
   - Grant: Require MFA

3. **Block legacy authentication**
   - Users: All
   - Cloud apps: All
   - Conditions: Client apps = Other clients
   - Grant: Block

4. **Require compliant devices for sensitive apps**
   - Users: All
   - Cloud apps: Select sensitive apps
   - Grant: Require compliant device

### Named Locations
```
Corporate Networks:
- 203.0.113.0/24 (HQ)
- 198.51.100.0/24 (Branch)

Trusted Countries:
- United States
- United Kingdom
- (Add as needed)
```

### Emergency Access Exclusions
Always exclude break-glass accounts from:
- MFA requirements
- Device compliance
- Location-based policies
- Risk-based policies
