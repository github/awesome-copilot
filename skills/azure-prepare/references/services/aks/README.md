# Azure Kubernetes Service (AKS)

Full Kubernetes orchestration for complex containerized workloads.

## When to Use

- Complex microservices requiring Kubernetes orchestration
- Teams with Kubernetes expertise
- Workloads needing fine-grained infrastructure control
- Multi-container pods with sidecars
- Custom networking requirements
- Hybrid/multi-cloud Kubernetes strategies

## Service Type in azure.yaml

```yaml
services:
  my-service:
    host: aks
    project: ./src/my-service
    docker:
      path: ./Dockerfile
    k8s:
      deploymentPath: ./k8s
```

## Required Supporting Resources

| Resource | Purpose |
|----------|---------|
| Container Registry | Image storage |
| Log Analytics Workspace | Monitoring |
| Virtual Network | Network isolation (optional) |
| Key Vault | Secrets management |

## Node Pool Types

| Pool | Purpose |
|------|---------|
| System | Cluster infrastructure, 3 nodes minimum |
| User | Application workloads, auto-scaling |

## References

- [Bicep Patterns](bicep.md)
- [K8s Manifests](manifests.md)
- [Add-ons](addons.md)
