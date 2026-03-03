# azqr Recommendation Categories

This document describes how to interpret azqr recommendations and prioritize remediation.

## Recommendation Sources

azqr aggregates recommendations from multiple sources:

| Source | Description | Priority |
|--------|-------------|----------|
| **APRL** | Azure Proactive Resiliency Library - reliability-focused best practices | High |
| **Orphaned Resources** | Resources that are unused or disconnected | Medium |
| **Azure Advisor** | Microsoft's built-in recommendation engine | Medium |
| **Defender for Cloud** | Security-focused recommendations | Critical |
| **Azure Policy** | Governance compliance status | Varies |

## Impact Categories

### Reliability

Recommendations that affect service availability and resiliency:

| Issue | Risk | Example Resources |
|-------|------|-------------------|
| No zone redundancy | Single zone failure causes outage | VMs, Storage, SQL, AKS |
| Single instance | No failover capability | App Service, Redis, VMs |
| No backup configured | Data loss risk | VMs, SQL, Cosmos DB |
| No disaster recovery | Regional failure exposure | Storage, SQL, Key Vault |

### Security

Recommendations that affect security posture:

| Issue | Risk | Example Resources |
|-------|------|-------------------|
| Public endpoint exposed | Attack surface exposure | Storage, SQL, Key Vault |
| Missing encryption | Data exposure risk | Storage, Disks, SQL |
| No private endpoint | Traffic on public internet | PaaS services |
| Weak TLS version | Protocol vulnerabilities | App Service, API Management |
| No managed identity | Credential management risk | App Service, Functions, AKS |

### Operational Excellence

Recommendations for better operations:

| Issue | Risk | Example Resources |
|-------|------|-------------------|
| No diagnostic settings | Blind to failures | All resources |
| Missing alerts | Delayed incident response | All resources |
| No tags | Governance/cost tracking gaps | All resources |
| Outdated SKU/version | Missing features/security fixes | All resources |

### Cost Optimization

Recommendations to reduce spending:

| Issue | Risk | Example Resources |
|-------|------|-------------------|
| Orphaned disk | Paying for unused storage | Managed Disks |
| Orphaned public IP | Paying for unused IP | Public IP |
| Oversized SKU | Excess capacity cost | VMs, SQL, App Service |
| No reserved capacity | Missing discounts | VMs, SQL, Cosmos DB |

## Severity Levels

Prioritize remediation using this severity matrix:

| Severity | Criteria | Response Time |
|----------|----------|---------------|
| **Critical** | Security vulnerability with active exploit risk | Immediate |
| **High** | Reliability risk affecting availability | Within 1 week |
| **Medium** | Best practice violation with moderate risk | Within 1 month |
| **Low** | Optimization opportunity | As capacity allows |

## Excel Report Columns

### Recommendations Sheet

| Column | Description |
|--------|-------------|
| Recommendation ID | Unique identifier for the recommendation |
| Category | Reliability, Security, Cost, etc. |
| Recommendation | Description of the issue |
| Learn More | Link to documentation |
| Impacted Resources | Count of affected resources |

### ImpactedResources Sheet

| Column | Description |
|--------|-------------|
| Subscription | Subscription ID (may be masked) |
| Resource Group | Resource group name |
| Type | Azure resource type |
| Name | Resource name |
| Recommendation ID | Links to Recommendations sheet |
| Recommendation | Issue description |
| Learn More | Documentation link |
| Param1-5 | Additional context (varies by recommendation) |

### Inventory Sheet

| Column | Description |
|--------|-------------|
| Subscription | Subscription ID |
| Resource Group | Resource group name |
| Location | Azure region |
| Type | Resource type |
| Name | Resource name |
| SKU | SKU tier/name |
| SLA | Calculated SLA percentage |
| Availability Zones | Zone configuration |
| Private Endpoint | Private endpoint status |
| Diagnostic Settings | Diagnostic configuration status |

## Common Recommendation IDs

High-impact recommendations to prioritize:

### Storage Accounts

| ID | Issue |
|----|-------|
| `st-001` | Enable soft delete for blobs |
| `st-002` | Enable soft delete for containers |
| `st-003` | Enable versioning |
| `st-004` | Use private endpoints |
| `st-005` | Disable public blob access |

### Virtual Machines

| ID | Issue |
|----|-------|
| `vm-001` | Enable Azure Backup |
| `vm-002` | Use managed disks |
| `vm-003` | Deploy in availability zones |
| `vm-004` | Enable boot diagnostics |
| `vm-005` | Use managed identity |

### Azure Kubernetes Service

| ID | Issue |
|----|-------|
| `aks-001` | Enable Azure Policy |
| `aks-002` | Use managed identity |
| `aks-003` | Enable Defender for Containers |
| `aks-004` | Use availability zones |
| `aks-005` | Enable cluster autoscaler |

### Key Vault

| ID | Issue |
|----|-------|
| `kv-001` | Enable soft delete |
| `kv-002` | Enable purge protection |
| `kv-003` | Use private endpoints |
| `kv-004` | Enable diagnostic logging |
| `kv-005` | Use RBAC for data plane |

### SQL Database

| ID | Issue |
|----|-------|
| `sql-001` | Enable Transparent Data Encryption |
| `sql-002` | Enable auditing |
| `sql-003` | Use private endpoints |
| `sql-004` | Enable zone redundancy |
| `sql-005` | Enable Advanced Threat Protection |

## Additional Resources

- [Azure Proactive Resiliency Library](https://aka.ms/aprl)
- [Azure Orphaned Resources](https://github.com/dolevshor/azure-orphan-resources)
- [Azure Advisor Documentation](https://learn.microsoft.com/azure/advisor/)
- [Defender for Cloud Recommendations](https://learn.microsoft.com/azure/defender-for-cloud/recommendations-reference)
