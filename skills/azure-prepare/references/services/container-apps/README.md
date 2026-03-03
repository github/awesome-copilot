# Azure Container Apps

Serverless container hosting for microservices, APIs, and background workers.

## When to Use

- Microservices and APIs
- Background processing workers
- Event-driven applications
- Web applications (server-rendered)
- Any containerized workload that doesn't need full Kubernetes

## Service Type in azure.yaml

```yaml
services:
  my-api:
    host: containerapp
    project: ./src/my-api
    docker:
      path: ./Dockerfile
```

## Required Supporting Resources

| Resource | Purpose |
|----------|---------|
| Container Apps Environment | Hosting environment |
| Container Registry | Image storage |
| Log Analytics Workspace | Logging |
| Application Insights | Monitoring |

## Common Configurations

| Workload Type | Ingress | Min Replicas | Scaling |
|---------------|---------|--------------|---------|
| API Service | External | 1 (avoid cold starts) | HTTP-based |
| Background Worker | None | 0 (scale to zero) | Queue-based |
| Web Application | External | 1 | HTTP-based |

## References

- [Bicep Patterns](bicep.md)
- [Scaling Patterns](scaling.md)
- [Health Probes](health-probes.md)
- [Environment Variables](environment.md)
