# App Service Auto-scaling

## Basic Auto-scale Configuration

```bicep
resource autoScale 'Microsoft.Insights/autoscalesettings@2022-10-01' = {
  name: '${webApp.name}-autoscale'
  location: location
  properties: {
    targetResourceUri: appServicePlan.id
    enabled: true
    profiles: [
      {
        name: 'Auto scale'
        capacity: {
          minimum: '1'
          maximum: '10'
          default: '1'
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
        ]
      }
    ]
  }
}
```

## Common Metrics

| Metric | Use Case |
|--------|----------|
| CpuPercentage | CPU-bound workloads |
| MemoryPercentage | Memory-intensive apps |
| HttpQueueLength | Request queue depth |
| Requests | Request volume |

## Recommendations

| Workload | Min | Max | Metric |
|----------|-----|-----|--------|
| Production API | 2 | 10 | CPU + Requests |
| Dev/Test | 1 | 3 | CPU |
| High-traffic | 3 | 20 | HTTP Queue |

## SKU Requirements

Auto-scaling requires **Standard (S1+)** or **Premium** tier.
