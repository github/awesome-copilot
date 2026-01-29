# Performance Efficiency Pillar - Deep Dive

## Table of Contents
1. [Scaling Strategies](#scaling-strategies)
2. [Compute Optimization](#compute-optimization)
3. [Data Tier Performance](#data-tier-performance)
4. [Network Performance](#network-performance)
5. [Performance Testing](#performance-testing)

## Scaling Strategies

### Scaling Patterns

| Pattern | Description | When to Use |
|---------|-------------|-------------|
| Vertical (Scale Up) | Increase instance size | Quick fix, stateful apps |
| Horizontal (Scale Out) | Add more instances | Stateless apps, high availability |
| Auto-scaling | Dynamic based on metrics | Variable workloads |
| Manual | Scheduled or on-demand | Predictable patterns |

### Auto-Scaling Configuration
```bicep
resource autoscale 'Microsoft.Insights/autoscalesettings@2022-10-01' = {
  name: 'autoscale-${appServicePlan.name}'
  location: location
  properties: {
    targetResourceUri: appServicePlan.id
    enabled: true
    profiles: [
      {
        name: 'default'
        capacity: {
          minimum: '2'
          maximum: '10'
          default: '2'
        }
        rules: [
          {
            metricTrigger: {
              metricName: 'CpuPercentage'
              metricResourceUri: appServicePlan.id
              timeGrain: 'PT1M'
              statistic: 'Average'
              timeWindow: 'PT5M'
              timeAggregation: 'Average'
              operator: 'GreaterThan'
              threshold: 70
            }
            scaleAction: {
              direction: 'Increase'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT5M'
            }
          }
          {
            metricTrigger: {
              metricName: 'CpuPercentage'
              metricResourceUri: appServicePlan.id
              timeGrain: 'PT1M'
              statistic: 'Average'
              timeWindow: 'PT10M'
              timeAggregation: 'Average'
              operator: 'LessThan'
              threshold: 30
            }
            scaleAction: {
              direction: 'Decrease'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT10M'
            }
          }
        ]
      }
    ]
  }
}
```

### Scaling Best Practices
- Scale out before scaling up
- Set appropriate cooldown periods
- Use multiple metrics for scaling decisions
- Test scaling under load
- Monitor for flapping (rapid scale up/down)

## Compute Optimization

### VM Size Selection

| Series | Optimized For | Use Cases |
|--------|---------------|-----------|
| B | Burstable | Dev/test, small web |
| D | General purpose | Most workloads |
| E | Memory | Databases, caching |
| F | Compute | Batch, gaming |
| L | Storage | Big data, NoSQL |
| N | GPU | ML, rendering |

### Container Performance
- Use premium storage for etcd (AKS)
- Set resource requests and limits
- Use horizontal pod autoscaler
- Implement pod disruption budgets
- Use node pools for workload isolation

### Serverless Performance
- Minimize cold starts (Premium plan for Functions)
- Use connection pooling
- Implement async patterns
- Configure appropriate timeout values
- Monitor execution duration trends

## Data Tier Performance

### Database Performance Optimization

| Layer | Optimization |
|-------|--------------|
| Application | Connection pooling, caching, async queries |
| Query | Indexes, query plans, parameterization |
| Database | Proper tier, partitioning, read replicas |
| Storage | Premium storage, proper IOPS allocation |

### SQL Database Performance
```sql
-- Find missing indexes
SELECT 
    mig.index_handle,
    mid.statement AS TableName,
    mid.equality_columns,
    mid.inequality_columns,
    mid.included_columns,
    migs.user_seeks * migs.avg_total_user_cost * (migs.avg_user_impact * 0.01) AS improvement_measure
FROM sys.dm_db_missing_index_group_stats AS migs
INNER JOIN sys.dm_db_missing_index_groups AS mig ON migs.group_handle = mig.index_group_handle
INNER JOIN sys.dm_db_missing_index_details AS mid ON mig.index_handle = mid.index_handle
ORDER BY improvement_measure DESC;
```

### Cosmos DB Performance
- Choose appropriate partition key
- Use indexing policies (exclude unused paths)
- Configure RU/s based on workload
- Use autoscale for variable workloads
- Implement retry logic for throttling

### Caching Strategy
```
Request → Cache Hit? → Yes → Return cached
              │
              No
              │
              ▼
        Query Database
              │
              ▼
        Update Cache
              │
              ▼
        Return Response
```

### Cache Options

| Service | Use Case | Max Latency |
|---------|----------|-------------|
| Azure Cache for Redis | Session, distributed cache | < 1ms |
| CDN | Static content | < 10ms |
| Application cache | Frequently accessed data | < 0.1ms |
| Database cache | Query results | Varies |

## Network Performance

### Network Latency Targets

| Tier | Latency | Strategy |
|------|---------|----------|
| < 1ms | In-region | Same VNet or peered |
| < 10ms | Cross-region | Proximity placement |
| < 50ms | Global | CDN, edge locations |
| < 100ms | Global with processing | Front Door + backend |

### Proximity Placement Groups
```bicep
resource ppg 'Microsoft.Compute/proximityPlacementGroups@2023-09-01' = {
  name: 'ppg-${workload}'
  location: location
  properties: {
    proximityPlacementGroupType: 'Standard'
  }
}

resource vm 'Microsoft.Compute/virtualMachines@2023-09-01' = {
  name: vmName
  location: location
  properties: {
    proximityPlacementGroup: { id: ppg.id }
  }
}
```

### Accelerated Networking
- Enable for all supported VMs
- Required for low-latency workloads
- Up to 30Gbps network bandwidth
- Reduced jitter and CPU usage

### CDN Configuration
```bicep
resource cdnProfile 'Microsoft.Cdn/profiles@2023-05-01' = {
  name: 'cdn-${workload}'
  location: 'global'
  sku: { name: 'Standard_Microsoft' }
}

resource cdnEndpoint 'Microsoft.Cdn/profiles/endpoints@2023-05-01' = {
  parent: cdnProfile
  name: 'endpoint-${workload}'
  location: 'global'
  properties: {
    origins: [
      {
        name: 'origin'
        hostName: storageAccount.properties.primaryEndpoints.blob
      }
    ]
    isCompressionEnabled: true
    contentTypesToCompress: [
      'text/plain'
      'text/html'
      'text/css'
      'application/javascript'
      'application/json'
    ]
    queryStringCachingBehavior: 'IgnoreQueryString'
  }
}
```

## Performance Testing

### Load Testing Strategy
1. Establish baseline metrics
2. Define performance targets (SLOs)
3. Create realistic test scenarios
4. Execute tests incrementally
5. Analyze results and bottlenecks
6. Optimize and repeat

### Azure Load Testing
```yaml
# JMeter test configuration
testPlan: 'loadtest.jmx'
engineInstances: 5
quickStartTest: false
configurationFiles:
  - 'user.properties'
failureCriteria:
  - avg(response_time_ms) > 500
  - percentage(error) > 10
```

### Performance Targets

| Metric | Web API | Batch Job | Interactive |
|--------|---------|-----------|-------------|
| Response time (p95) | < 500ms | N/A | < 200ms |
| Throughput | > 1000 RPS | Max capacity | > 100 RPS |
| Error rate | < 0.1% | < 1% | < 0.1% |
| Availability | 99.9% | 99% | 99.95% |

### Bottleneck Identification

| Symptom | Likely Bottleneck | Investigation |
|---------|-------------------|---------------|
| High CPU | Application code | Profiler, App Insights |
| High memory | Memory leak, caching | Memory dumps, metrics |
| High latency | Database, network | Query analysis, tracing |
| High disk I/O | Storage tier | Storage metrics, IOPS |
| Connection errors | Pool exhaustion | Connection metrics |

### Application Insights Performance
```kusto
// Identify slow requests
requests
| where timestamp > ago(1h)
| where success == true
| summarize 
    p50 = percentile(duration, 50),
    p95 = percentile(duration, 95),
    p99 = percentile(duration, 99)
    by name
| where p95 > 1000
| order by p95 desc
```
