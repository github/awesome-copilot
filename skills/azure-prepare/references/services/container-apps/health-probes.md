# Container Apps Health Probes

Always configure health probes for production workloads.

## Liveness Probe

Detects if container is alive. Failure triggers restart.

```bicep
probes: [
  {
    type: 'liveness'
    httpGet: {
      path: '/health'
      port: 8080
    }
    initialDelaySeconds: 10
    periodSeconds: 30
    failureThreshold: 3
  }
]
```

## Readiness Probe

Detects if container is ready to receive traffic.

```bicep
probes: [
  {
    type: 'readiness'
    httpGet: {
      path: '/ready'
      port: 8080
    }
    initialDelaySeconds: 5
    periodSeconds: 10
    failureThreshold: 3
  }
]
```

## Startup Probe

For slow-starting containers. Delays other probes until startup succeeds.

```bicep
probes: [
  {
    type: 'startup'
    httpGet: {
      path: '/health'
      port: 8080
    }
    initialDelaySeconds: 0
    periodSeconds: 10
    failureThreshold: 30  // 30 * 10s = 5 min max startup
  }
]
```

## Recommendations

| Probe | Path | Initial Delay | Period |
|-------|------|---------------|--------|
| Liveness | `/health` | 10s | 30s |
| Readiness | `/ready` | 5s | 10s |
| Startup | `/health` | 0s | 10s |
