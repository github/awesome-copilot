# Reliability Pillar - Deep Dive

## Table of Contents
1. [Design Principles](#design-principles)
2. [Availability Patterns](#availability-patterns)
3. [Disaster Recovery](#disaster-recovery)
4. [Data Resilience](#data-resilience)
5. [Testing Reliability](#testing-reliability)

## Design Principles

### Design for Failure
- Assume components will fail
- Implement redundancy at every layer
- Use health probes and circuit breakers
- Design for graceful degradation

### Self-Healing
- Automatic restart on failure
- Health endpoint monitoring
- Replace unhealthy instances automatically
- Queue-based load leveling

### Scale Out
- Prefer horizontal over vertical scaling
- Design stateless applications
- Use managed services where possible
- Implement auto-scaling

## Availability Patterns

### Availability Targets

| SLA | Monthly Downtime | Architecture |
|-----|------------------|--------------|
| 99% | 7.3 hours | Single instance |
| 99.9% | 43.8 minutes | Availability Set |
| 99.95% | 21.9 minutes | Availability Zones |
| 99.99% | 4.3 minutes | Multi-region active |

### Availability Zones
```
Azure Region
┌─────────────────────────────────────────────────┐
│                                                 │
│   Zone 1         Zone 2         Zone 3         │
│  ┌───────┐      ┌───────┐      ┌───────┐      │
│  │  VM   │      │  VM   │      │  VM   │      │
│  └───────┘      └───────┘      └───────┘      │
│      │              │              │           │
│      └──────────────┼──────────────┘           │
│                     │                          │
│              ┌──────▼──────┐                   │
│              │   Load      │                   │
│              │   Balancer  │                   │
│              └─────────────┘                   │
└─────────────────────────────────────────────────┘
```

### Zone-Redundant Services

| Service | Zone-Redundant Option |
|---------|----------------------|
| VMs | Zone-redundant VMSS |
| Storage | ZRS or GZRS |
| SQL Database | Zone-redundant deployment |
| AKS | Zone-redundant node pools |
| App Service | Zone-redundant App Service Plan |
| Key Vault | Automatic (Premium) |

### Multi-Region Active-Active
```
                    ┌─────────────────┐
                    │  Traffic Manager│
                    │  or Front Door  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              │              ▼
       ┌──────────┐          │       ┌──────────┐
       │ East US  │          │       │ West US  │
       │ Region   │◄─────────┼──────►│ Region   │
       └──────────┘    Data  │       └──────────┘
                       Sync  │
```

## Disaster Recovery

### RTO and RPO Planning

| Tier | RTO | RPO | Strategy |
|------|-----|-----|----------|
| Mission Critical | < 1 hour | < 1 minute | Active-active multi-region |
| Business Critical | < 4 hours | < 1 hour | Active-passive with hot standby |
| Standard | < 24 hours | < 4 hours | Active-passive with warm standby |
| Low Priority | < 72 hours | < 24 hours | Backup and restore |

### DR Patterns

#### Pilot Light
```
Primary Region (Active)          Secondary Region (Pilot)
┌────────────────────┐          ┌────────────────────┐
│  Full deployment   │          │  Minimal resources │
│  - Web tier        │          │  - Scaled down VMs │
│  - App tier        │          │  - Database replica│
│  - Database        │  ──────► │  - Scripts ready   │
└────────────────────┘   Async  └────────────────────┘
                         Repl
```

#### Warm Standby
- Secondary region runs at reduced capacity
- Scale up during failover
- RTO: 15-60 minutes
- Higher cost than pilot light

#### Hot Standby
- Full deployment in secondary
- Load balanced across regions
- RTO: < 15 minutes
- Highest cost, highest availability

### Azure Site Recovery
```bicep
resource recoveryVault 'Microsoft.RecoveryServices/vaults@2023-06-01' = {
  name: 'rsv-${workload}-${environment}'
  location: secondaryLocation
  sku: { name: 'RS0', tier: 'Standard' }
  properties: {}
}
```

## Data Resilience

### Storage Redundancy Options

| Option | Protection | Use Case |
|--------|------------|----------|
| LRS | 3 copies in datacenter | Dev/test, easily recreated data |
| ZRS | 3 copies across zones | High availability in single region |
| GRS | 6 copies across regions | DR with manual failover |
| GZRS | ZRS + GRS | Maximum durability |
| RA-GRS | GRS + read access | Read-heavy workloads with DR |
| RA-GZRS | GZRS + read access | Maximum availability and durability |

### Database High Availability

#### SQL Database
```bicep
resource sqlDb 'Microsoft.Sql/servers/databases@2023-05-01-preview' = {
  name: 'sqldb-${workload}'
  properties: {
    zoneRedundant: true
    readScale: 'Enabled'
    highAvailabilityReplicaCount: 2
  }
}
```

#### Cosmos DB
```bicep
resource cosmosDb 'Microsoft.DocumentDB/databaseAccounts@2023-11-15' = {
  properties: {
    enableMultipleWriteLocations: true
    locations: [
      { locationName: 'eastus', failoverPriority: 0 }
      { locationName: 'westus', failoverPriority: 1 }
    ]
    backupPolicy: {
      type: 'Continuous'
      continuousModeProperties: { tier: 'Continuous7Days' }
    }
  }
}
```

### Backup Strategy

| Resource | Backup Method | Retention |
|----------|---------------|-----------|
| VMs | Azure Backup | 30 days daily, 12 months monthly |
| SQL Database | Automated backups | 7-35 days PITR |
| Storage | Soft delete + versioning | 30 days |
| Cosmos DB | Continuous backup | 7-30 days |
| AKS | Velero or Azure Backup | 7 days |

## Testing Reliability

### Chaos Engineering
Test failure scenarios:
- VM/instance failures
- Network latency injection
- Zone failures
- Dependency failures
- DNS failures

### Azure Chaos Studio
```bicep
resource chaosExperiment 'Microsoft.Chaos/experiments@2023-11-01' = {
  name: 'exp-vm-shutdown'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    selectors: [
      {
        type: 'List'
        id: 'selector1'
        targets: [{ type: 'ChaosTarget', id: vmChaosTarget.id }]
      }
    ]
    steps: [
      {
        name: 'Step 1'
        branches: [
          {
            name: 'Branch 1'
            actions: [
              {
                type: 'continuous'
                name: 'urn:csci:microsoft:virtualMachine:shutdown/1.0'
                duration: 'PT5M'
                selectorId: 'selector1'
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### DR Testing Schedule

| Test Type | Frequency | Scope |
|-----------|-----------|-------|
| Backup restore | Monthly | Sample data |
| Failover drill | Quarterly | Non-production |
| Full DR test | Annually | Production (planned) |
| Chaos experiments | Continuous | Controlled |

### Health Monitoring
```bicep
resource healthCheck 'Microsoft.Network/applicationGateways/probes@2023-05-01' = {
  name: 'health-probe'
  properties: {
    protocol: 'Https'
    path: '/health'
    interval: 30
    timeout: 30
    unhealthyThreshold: 3
    pickHostNameFromBackendHttpSettings: true
  }
}
```
