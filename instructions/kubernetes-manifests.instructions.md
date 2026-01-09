---
applyTo: 'k8s/**/*.yaml,k8s/**/*.yml,manifests/**/*.yaml,manifests/**/*.yml,deploy/**/*.yaml,deploy/**/*.yml,charts/**/templates/**/*.yaml,charts/**/templates/**/*.yml'
description: 'Best practices for Kubernetes YAML manifests including labeling conventions, security contexts, pod security, resource management, probes, and validation commands'
---

# Kubernetes Manifests Instructions

## Your Mission

Create production-ready Kubernetes manifests that prioritize security, reliability, and operational excellence with consistent labeling, proper resource management, and comprehensive health checks.

## Labeling Conventions

**Required Labels** (Kubernetes recommended):
- `app.kubernetes.io/name`: Application name
- `app.kubernetes.io/instance`: Instance identifier
- `app.kubernetes.io/version`: Version
- `app.kubernetes.io/component`: Component role
- `app.kubernetes.io/part-of`: Application group
- `app.kubernetes.io/managed-by`: Management tool

**Additional Labels**:
- `environment`: Environment name
- `team`: Owning team
- `cost-center`: For billing

**Useful Annotations**:
- Documentation and ownership
- Monitoring: `prometheus.io/scrape`, `prometheus.io/port`, `prometheus.io/path`
- Change tracking: git commit, deployment date

## SecurityContext Defaults

**Pod-level**:
- `runAsNonRoot: true`
- `runAsUser` and `runAsGroup`: Specific IDs
- `fsGroup`: File system group
- `seccompProfile.type: RuntimeDefault`

**Container-level**:
- `allowPrivilegeEscalation: false`
- `readOnlyRootFilesystem: true` (with tmpfs mounts for writable dirs)
- `capabilities.drop: [ALL]` (add only what's needed)

## Pod Security Standards

Use Pod Security Admission:
- **Restricted** (recommended for production): Enforces security hardening
- **Baseline**: Minimal security requirements
- Apply at namespace level

## Resource Requests and Limits

**Always define**:
- Requests: Guaranteed minimum (scheduling)
- Limits: Maximum allowed (prevents exhaustion)

**QoS Classes**:
- **Guaranteed**: requests == limits (best for critical apps)
- **Burstable**: requests < limits (flexible resource use)
- **BestEffort**: No resources defined (avoid in production)

## Health Probes

**Liveness**: Restart unhealthy containers
**Readiness**: Control traffic routing
**Startup**: Protect slow-starting applications

Configure appropriate delays, periods, timeouts, and thresholds for each.

## Rollout Strategies

**Deployment Strategy**:
- `RollingUpdate` with `maxSurge` and `maxUnavailable`
- Set `maxUnavailable: 0` for zero-downtime

**High Availability**:
- Minimum 2-3 replicas
- Pod Disruption Budget (PDB)
- Anti-affinity rules (spread across nodes/zones)
- Horizontal Pod Autoscaler (HPA) for variable load

## Validation Commands

**Pre-deployment**:
- `kubectl apply --dry-run=client -f manifest.yaml`
- `kubectl apply --dry-run=server -f manifest.yaml`
- `kubeconform -strict manifest.yaml` (schema validation)
- `helm template ./chart | kubeconform -strict` (for Helm)

**Policy Validation**:
- OPA Conftest, Kyverno, or Datree

## Rollout & Rollback

**Deploy**:
- `kubectl apply -f manifest.yaml`
- `kubectl rollout status deployment/NAME`

**Rollback**:
- `kubectl rollout undo deployment/NAME`
- `kubectl rollout undo deployment/NAME --to-revision=N`
- `kubectl rollout history deployment/NAME`

**Restart**:
- `kubectl rollout restart deployment/NAME`

## Manifest Checklist

- [ ] Labels: Standard labels applied
- [ ] Annotations: Documentation and monitoring
- [ ] Security: runAsNonRoot, readOnlyRootFilesystem, dropped capabilities
- [ ] Resources: Requests and limits defined
- [ ] Probes: Liveness, readiness, startup configured
- [ ] Images: Specific tags (never :latest)
- [ ] Replicas: Minimum 2-3 for production
- [ ] Strategy: RollingUpdate with appropriate surge/unavailable
- [ ] PDB: Defined for production
- [ ] Anti-affinity: Configured for HA
- [ ] Graceful shutdown: terminationGracePeriodSeconds set
- [ ] Validation: Dry-run and kubeconform passed
- [ ] Secrets: In Secrets resource, not ConfigMaps
- [ ] NetworkPolicy: Least-privilege access (if applicable)

## Best Practices Summary

1. Use standard labels and annotations
2. Always run as non-root with dropped capabilities
3. Define resource requests and limits
4. Implement all three probe types
5. Pin image tags to specific versions
6. Configure anti-affinity for HA
7. Set Pod Disruption Budgets
8. Use rolling updates with zero unavailability
9. Validate manifests before applying
10. Enable read-only root filesystem when possible
