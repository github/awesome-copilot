# Security Baseline Design

## Table of Contents
1. [Microsoft Defender for Cloud](#microsoft-defender-for-cloud)
2. [Network Security](#network-security)
3. [Identity Security](#identity-security)
4. [Data Protection](#data-protection)
5. [Security Operations](#security-operations)

## Microsoft Defender for Cloud

### Enable Defender Plans

| Plan | Enable For | Priority |
|------|------------|----------|
| Defender for Servers | All VMs | High |
| Defender for Storage | All storage accounts | High |
| Defender for SQL | All SQL databases | High |
| Defender for Containers | AKS clusters | High |
| Defender for Key Vault | All Key Vaults | High |
| Defender for App Service | All web apps | Medium |
| Defender for ARM | Subscription level | Medium |
| Defender for DNS | Subscription level | Medium |

### Secure Score Targets

| Level | Score | Timeline |
|-------|-------|----------|
| Minimum | 60% | Immediate |
| Target | 80% | 3 months |
| Optimal | 90%+ | 6 months |

### Security Baseline Policy
Assign at Platform management group:
```json
{
  "displayName": "Enable Defender for Cloud",
  "policyDefinitionId": "/providers/Microsoft.Authorization/policySetDefinitions/1f3afdf9-d0c9-4c3d-847f-89da613e70a8"
}
```

## Network Security

### Defense in Depth
```
Internet
    │
    ▼
┌─────────────────┐
│   Azure DDoS    │ Layer 3/4 protection
│   Protection    │
└────────┬────────┘
         │
    ┌────▼────┐
    │   WAF   │ Layer 7 protection
    │   (AGW) │ OWASP rules
    └────┬────┘
         │
┌────────▼────────┐
│  Azure Firewall │ Network filtering
│  (Hub VNet)     │ FQDN rules, threat intel
└────────┬────────┘
         │
    ┌────▼────┐
    │   NSG   │ Subnet/NIC filtering
    └────┬────┘
         │
    ┌────▼────┐
    │   App   │ Application controls
    └─────────┘
```

### NSG Rules Template
```bicep
resource nsg 'Microsoft.Network/networkSecurityGroups@2023-05-01' = {
  name: 'nsg-${workload}-${environment}'
  location: location
  properties: {
    securityRules: [
      {
        name: 'AllowHTTPS'
        properties: {
          priority: 100
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourceAddressPrefix: 'VirtualNetwork'
          destinationPortRange: '443'
          destinationAddressPrefix: '*'
          sourcePortRange: '*'
        }
      }
      {
        name: 'DenyAllInbound'
        properties: {
          priority: 4096
          direction: 'Inbound'
          access: 'Deny'
          protocol: '*'
          sourceAddressPrefix: '*'
          destinationPortRange: '*'
          destinationAddressPrefix: '*'
          sourcePortRange: '*'
        }
      }
    ]
  }
}
```

### Azure Firewall Rules

| Rule Collection | Priority | Rules |
|-----------------|----------|-------|
| Platform-Allow | 100 | Azure services, Windows Update |
| App-Allow | 200 | Application-specific FQDNs |
| Default-Deny | 65000 | Deny all (implicit) |

### Private Endpoint Strategy
All PaaS services must use private endpoints:
- Storage accounts
- Key Vault
- SQL Database
- Cosmos DB
- Container Registry
- App Services (when applicable)

## Identity Security

### Privileged Access Workstations (PAW)
```
Tier 0: Domain Controllers, Azure AD
        └── PAW required for all access

Tier 1: Member Servers, Azure resources
        └── PAW or secure jumpbox

Tier 2: End user devices
        └── Standard workstations
```

### Just-In-Time Access
Enable JIT for all management VMs:
- Maximum 3-hour access window
- Require justification
- Automatic NSG rule removal
- Audit all access requests

### Service Principal Security
- Use managed identities over service principals
- If SP required: certificate auth, not secrets
- Rotate credentials every 90 days
- Minimum required permissions only
- Monitor sign-in logs

## Data Protection

### Encryption Requirements

| Data State | Encryption | Key Management |
|------------|------------|----------------|
| At rest | AES-256 | Platform or CMK |
| In transit | TLS 1.2+ | Azure managed |
| In use | Confidential (when required) | Customer managed |

### Key Vault Configuration
```bicep
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  properties: {
    tenantId: subscription().tenantId
    sku: { family: 'A', name: 'premium' }  // HSM-backed
    enableRbacAuthorization: true
    enablePurgeProtection: true            // NEVER disable
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    publicNetworkAccess: 'Disabled'
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
    }
  }
}
```

### Data Classification Policies

| Classification | Controls |
|----------------|----------|
| Public | Standard encryption |
| Internal | Encryption + private network |
| Confidential | CMK + private endpoint + audit |
| Restricted | CMK + private endpoint + DLP + CASB |

## Security Operations

### Log Collection
Collect these logs in central Log Analytics:

| Log Type | Source | Retention |
|----------|--------|-----------|
| Activity Log | All subscriptions | 90 days |
| Azure AD Sign-ins | Tenant | 90 days |
| Azure AD Audit | Tenant | 90 days |
| NSG Flow Logs | All NSGs | 30 days |
| Diagnostic Logs | All resources | 30 days |
| Azure Firewall Logs | Hub firewall | 90 days |

### Security Alerts
Configure alerts for:
- Failed login attempts (>5 in 10 min)
- Privileged role activations
- Policy violations
- Defender for Cloud high severity
- Unusual network traffic patterns

### Incident Response
```
Detection → Triage → Containment → Eradication → Recovery → Lessons Learned
    │          │           │             │            │              │
    ▼          ▼           ▼             ▼            ▼              ▼
 Sentinel   Severity    Isolate      Remove       Restore      Document
 Alerts     Assessment  Resource     Threat       Services     & Improve
```

### Security Review Cadence

| Review | Frequency | Participants |
|--------|-----------|--------------|
| Secure Score | Weekly | Security team |
| Access Reviews | Monthly | Resource owners |
| Policy Compliance | Monthly | Governance team |
| Penetration Test | Annually | Third party |
| Architecture Review | Quarterly | Security + Platform |
