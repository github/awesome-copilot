# Security Pillar - Deep Dive

## Table of Contents
1. [Zero Trust Model](#zero-trust-model)
2. [Identity Security](#identity-security)
3. [Network Security](#network-security)
4. [Data Protection](#data-protection)
5. [Application Security](#application-security)

## Zero Trust Model

### Principles
1. **Verify explicitly** - Always authenticate and authorize
2. **Use least privilege** - Limit access with JIT/JEA
3. **Assume breach** - Minimize blast radius, segment access

### Implementation Layers
```
┌─────────────────────────────────────────────────────────┐
│                    Identity Layer                       │
│     Azure AD, Conditional Access, MFA, PIM             │
├─────────────────────────────────────────────────────────┤
│                    Device Layer                         │
│     Intune, Compliant Devices, Health Attestation      │
├─────────────────────────────────────────────────────────┤
│                    Network Layer                        │
│     NSGs, Azure Firewall, Private Link, DDoS           │
├─────────────────────────────────────────────────────────┤
│                  Application Layer                      │
│     WAF, API Management, App Service Auth              │
├─────────────────────────────────────────────────────────┤
│                     Data Layer                          │
│     Encryption, Classification, DLP, Rights Mgmt       │
└─────────────────────────────────────────────────────────┘
```

## Identity Security

### Authentication Best Practices

| Method | Security Level | Use Case |
|--------|----------------|----------|
| Password only | ❌ Low | Never recommended |
| Password + MFA | ⚠️ Medium | Minimum for users |
| Passwordless | ✅ High | Preferred for users |
| Managed Identity | ✅ High | Azure workloads |
| Certificate | ✅ High | Service principals |

### Managed Identity Configuration
```bicep
// System-assigned identity
resource appService 'Microsoft.Web/sites@2023-01-01' = {
  name: appServiceName
  identity: {
    type: 'SystemAssigned'
  }
}

// Grant access to Key Vault
resource keyVaultAccess 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, appService.id, keyVaultSecretsUser)
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '4633458b-17de-408a-b874-0445c86b69e6' // Key Vault Secrets User
    )
    principalId: appService.identity.principalId
    principalType: 'ServicePrincipal'
  }
}
```

### Service Principal Security
- ❌ Avoid client secrets (rotate every 90 days if used)
- ✅ Use certificate credentials
- ✅ Use federated credentials for CI/CD
- ✅ Limit permissions to minimum required
- ✅ Monitor sign-in logs for anomalies

## Network Security

### Network Segmentation
```
Internet
    │
    ▼
┌─────────────────────────────────────────────┐
│  DMZ / Perimeter                            │
│  - Application Gateway with WAF             │
│  - Azure Front Door                         │
│  - DDoS Protection                          │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│  Application Tier (Spoke VNet)              │
│  - NSG: Allow 443 from AGW only             │
│  - Private endpoints for PaaS               │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│  Data Tier (Spoke VNet)                     │
│  - NSG: Allow from App tier only            │
│  - No public endpoints                      │
│  - Private endpoints for databases          │
└─────────────────────────────────────────────┘
```

### NSG Rule Priorities

| Priority | Rule Type | Example |
|----------|-----------|---------|
| 100-199 | Essential allows | Allow health probes |
| 200-299 | Application allows | Allow HTTPS from known sources |
| 300-399 | Management allows | Allow Bastion, Azure management |
| 4000-4095 | Explicit denies | Deny specific threats |
| 4096 | Default deny all | Block everything else |

### Private Endpoint Checklist
- [ ] Storage accounts - blob, file, table, queue
- [ ] Key Vault
- [ ] SQL Database
- [ ] Cosmos DB
- [ ] Container Registry
- [ ] App Configuration
- [ ] Service Bus / Event Hubs
- [ ] Azure Cache for Redis

## Data Protection

### Encryption Requirements

| Requirement | Implementation |
|-------------|----------------|
| Encryption at rest | Azure Storage Service Encryption (default) |
| Customer-managed keys | Key Vault + CMK configuration |
| Encryption in transit | TLS 1.2 minimum enforced |
| Database encryption | TDE enabled (default for SQL) |
| Disk encryption | Azure Disk Encryption or server-side encryption |

### Key Vault Best Practices
```bicep
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  properties: {
    tenantId: subscription().tenantId
    sku: { family: 'A', name: 'premium' }  // HSM-backed keys
    
    // Security settings
    enableRbacAuthorization: true          // Use RBAC, not access policies
    enablePurgeProtection: true            // NEVER set to false
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    
    // Network isolation
    publicNetworkAccess: 'Disabled'
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
    }
  }
}
```

### Secret Management Rules
1. **Never** store secrets in code or config files
2. **Never** log secrets (mask in all outputs)
3. **Always** use Key Vault references
4. **Rotate** secrets on schedule (90 days max)
5. **Audit** all secret access

## Application Security

### OWASP Top 10 Mitigations

| Risk | Azure Mitigation |
|------|------------------|
| Injection | Parameterized queries, WAF SQL rules |
| Broken Auth | Azure AD, MFA, token validation |
| Sensitive Data | TLS, encryption, Key Vault |
| XXE | WAF, input validation |
| Broken Access | Azure RBAC, attribute-based access |
| Misconfiguration | Azure Policy, Security Center |
| XSS | WAF, Content-Security-Policy |
| Insecure Deserialization | Input validation, WAF |
| Vulnerable Components | Defender for containers, Dependabot |
| Logging Failures | Azure Monitor, Log Analytics |

### Web Application Firewall
```bicep
resource wafPolicy 'Microsoft.Network/ApplicationGatewayWebApplicationFirewallPolicies@2023-05-01' = {
  name: 'waf-${workload}'
  properties: {
    policySettings: {
      mode: 'Prevention'
      state: 'Enabled'
      requestBodyCheck: true
      maxRequestBodySizeInKb: 128
      fileUploadLimitInMb: 100
    }
    managedRules: {
      managedRuleSets: [
        {
          ruleSetType: 'OWASP'
          ruleSetVersion: '3.2'
        }
        {
          ruleSetType: 'Microsoft_BotManagerRuleSet'
          ruleSetVersion: '1.0'
        }
      ]
    }
  }
}
```

### Container Security
- Use private container registry (ACR)
- Enable vulnerability scanning
- Use minimal base images (distroless)
- Never run as root
- Implement pod security policies
- Enable Defender for Containers
