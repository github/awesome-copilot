# Cost Optimization Pillar - Deep Dive

## Table of Contents
1. [Cost Visibility](#cost-visibility)
2. [Right-Sizing](#right-sizing)
3. [Reserved Capacity](#reserved-capacity)
4. [Architecture Optimization](#architecture-optimization)
5. [Operational Efficiency](#operational-efficiency)

## Cost Visibility

### Cost Management Setup
1. Enable cost analysis in Azure portal
2. Create budgets with alerts
3. Configure cost allocation tags
4. Set up scheduled reports
5. Use Cost Management APIs for automation

### Budget Configuration
```bicep
resource budget 'Microsoft.Consumption/budgets@2023-11-01' = {
  name: 'budget-${workload}-monthly'
  properties: {
    category: 'Cost'
    amount: 10000
    timeGrain: 'Monthly'
    timePeriod: {
      startDate: '2026-01-01'
      endDate: '2026-12-31'
    }
    notifications: {
      notification50: {
        enabled: true
        threshold: 50
        operator: 'GreaterThan'
        contactEmails: ['finance@company.com']
      }
      notification90: {
        enabled: true
        threshold: 90
        operator: 'GreaterThan'
        contactEmails: ['finance@company.com', 'engineering@company.com']
        contactRoles: ['Owner']
      }
    }
  }
}
```

### Required Cost Tags

| Tag | Purpose | Enforcement |
|-----|---------|-------------|
| CostCenter | Chargeback/showback | Policy: Deny if missing |
| Environment | Dev/Prod cost split | Policy: Deny if missing |
| Owner | Accountability | Policy: Audit |
| Application | Workload attribution | Policy: Deny if missing |
| ExpirationDate | Temporary resources | Automation cleanup |

## Right-Sizing

### VM Right-Sizing Process
1. Enable Azure Monitor agent
2. Collect 30+ days of metrics
3. Analyze CPU, memory, disk, network
4. Use Azure Advisor recommendations
5. Test new size in non-production
6. Implement change with minimal downtime

### Right-Sizing Guidelines

| Metric | Action if Consistently... |
|--------|---------------------------|
| CPU < 20% | Downsize or use burstable |
| CPU > 80% | Upsize or scale out |
| Memory < 30% | Consider smaller SKU |
| Memory > 90% | Upsize |
| Disk IOPS < 20% capacity | Standard SSD or HDD |

### Burstable VMs
Use B-series for:
- Development environments
- Small databases with spiky loads
- Test/QA workloads
- Low-traffic web servers

### Azure Advisor Query
```kusto
AdvisorResources
| where type == "microsoft.advisor/recommendations"
| where properties.category == "Cost"
| project 
    resource = tostring(properties.resourceMetadata.resourceId),
    savings = tostring(properties.extendedProperties.savingsAmount),
    recommendation = tostring(properties.shortDescription.problem)
| order by savings desc
```

## Reserved Capacity

### Reservation Strategy

| Workload Pattern | Recommendation |
|------------------|----------------|
| Steady 24/7 | 3-year reservation (60% savings) |
| Predictable business hours | 1-year + spot for off-hours |
| Variable/unpredictable | Pay-as-you-go + auto-scaling |
| Dev/Test | Dev/Test pricing + auto-shutdown |

### Services with Reservations

| Service | Reservation Type | Max Savings |
|---------|------------------|-------------|
| Virtual Machines | Reserved Instances | 72% |
| SQL Database | Reserved Capacity | 55% |
| Cosmos DB | Reserved Capacity | 65% |
| Azure Synapse | Reserved Capacity | 65% |
| App Service | Reserved Instances | 55% |
| Azure Files | Reserved Capacity | 36% |
| Blob Storage | Reserved Capacity | 38% |

### Reservation Scope Options
- **Shared**: Automatically applies across subscriptions
- **Single subscription**: Limits to one subscription
- **Single resource group**: Most restrictive
- **Management group**: Recommended for enterprises

## Architecture Optimization

### Serverless vs Always-On

| Workload | Serverless Option | When to Use |
|----------|-------------------|-------------|
| API | Azure Functions | < 1M requests/month |
| Web | Static Web Apps | Static content + Functions |
| Data processing | Event-driven Functions | Batch/event workloads |
| Containers | Container Apps | Scale to zero needed |

### Storage Optimization

| Access Pattern | Storage Tier | Cost Relative |
|----------------|--------------|---------------|
| Frequent (daily) | Hot | 100% |
| Infrequent (monthly) | Cool | 50% |
| Rare (quarterly) | Cold | 30% |
| Archive (yearly) | Archive | 10% |

### Lifecycle Policy
```bicep
resource storagePolicy 'Microsoft.Storage/storageAccounts/managementPolicies@2023-01-01' = {
  name: 'default'
  parent: storageAccount
  properties: {
    policy: {
      rules: [
        {
          name: 'archiveOldData'
          type: 'Lifecycle'
          definition: {
            filters: { blobTypes: ['blockBlob'] }
            actions: {
              baseBlob: {
                tierToCool: { daysAfterModificationGreaterThan: 30 }
                tierToArchive: { daysAfterModificationGreaterThan: 90 }
                delete: { daysAfterModificationGreaterThan: 365 }
              }
            }
          }
        }
      ]
    }
  }
}
```

### Caching Strategy
- Use Azure Cache for Redis for session state
- Implement CDN for static content
- Use application-level caching
- Consider read replicas for databases

## Operational Efficiency

### Auto-Shutdown for Dev/Test
```bicep
resource autoShutdown 'Microsoft.DevTestLab/schedules@2018-09-15' = {
  name: 'shutdown-computevm-${vmName}'
  location: location
  properties: {
    status: 'Enabled'
    taskType: 'ComputeVmShutdownTask'
    dailyRecurrence: { time: '1900' }
    timeZoneId: 'Pacific Standard Time'
    targetResourceId: vm.id
  }
}
```

### Spot VMs for Batch Workloads
- Up to 90% savings
- Can be evicted with 30-second notice
- Ideal for: batch processing, CI/CD agents, rendering

```bicep
resource vmss 'Microsoft.Compute/virtualMachineScaleSets@2023-09-01' = {
  properties: {
    virtualMachineProfile: {
      priority: 'Spot'
      evictionPolicy: 'Deallocate'
      billingProfile: {
        maxPrice: -1  // Up to on-demand price
      }
    }
  }
}
```

### Cleanup Automation
Weekly script to identify:
- Unattached disks
- Unused public IPs
- Empty resource groups
- Stopped VMs (still incurring disk costs)
- Expired snapshots

### Cost Review Cadence

| Review | Frequency | Focus |
|--------|-----------|-------|
| Daily alerts | Automated | Budget threshold breaches |
| Weekly review | Team | Advisor recommendations |
| Monthly analysis | Finance | Trend analysis, forecasting |
| Quarterly optimization | Architecture | Major cost reduction initiatives |
