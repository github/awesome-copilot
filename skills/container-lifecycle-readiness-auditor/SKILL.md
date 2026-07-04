---
name: container-lifecycle-readiness-auditor
description: 'Audit and improve container runtime lifecycle reliability for Dockerfile, Docker Compose, and Kubernetes manifests. Use when asked to review container startup failures, health checks, Docker HEALTHCHECK, readiness, liveness, startup probes, SIGTERM handling, graceful shutdown, restart policies, dependency readiness, stop_grace_period, terminationGracePeriodSeconds, retry/backoff, or recovery behavior without turning the task into generic Docker security, image optimization, Kubernetes hardening, or network troubleshooting.'
---

# Container Lifecycle Readiness Auditor

Use this skill to assess whether a containerized application can start reliably, wait for dependencies correctly, report meaningful health, shut down gracefully, and recover predictably after failure.

Always inspect the actual repository before making claims. Prefer source files, manifests, scripts, tests, logs, and documented operational commands over assumptions. When available, cite file paths and line references for every finding.

For a reusable audit checklist and examples, read `references/lifecycle-readiness-checklist.md` when planning or reporting an audit.

## Scope

Focus on runtime lifecycle reliability:

- Container process model, PID 1 behavior, signal propagation, and exec-form `CMD` or `ENTRYPOINT`.
- Startup order, dependency readiness, application retry/backoff, and failure modes while dependencies are temporarily unavailable.
- Docker `HEALTHCHECK` semantics, probe timing, and meaningful readiness signals.
- Docker Compose dependency behavior, `healthcheck`, `depends_on`, restart policies, and `stop_grace_period`.
- Kubernetes `startupProbe`, `readinessProbe`, `livenessProbe`, `terminationGracePeriodSeconds`, restart behavior, and graceful termination.
- Logs and metrics that help diagnose startup, health, shutdown, and restart failures.

Avoid broad Dockerfile optimization, vulnerability scanning, image size tuning, Kubernetes policy hardening, ingress routing, cloud provisioning, or general network troubleshooting unless it directly affects lifecycle reliability.

## Workflow

1. Discover the runtime surface.
   - Search for `Dockerfile*`, `docker-compose*.yml`, `compose*.yml`, Kubernetes manifests, Helm charts, Kustomize overlays, Procfiles, supervisor scripts, application bootstrap code, signal handlers, health endpoints, and shutdown hooks.
   - Identify the application language/framework only as needed to understand startup, health, shutdown, and retry behavior.
   - Note absent surfaces explicitly, for example "No Kubernetes manifests found in this repository."

2. Build an evidence map.
   - Record relevant file paths and line references when the tool environment can provide them.
   - Capture the command or static check used to inspect each surface.
   - Do not claim that a service is healthy, tested, deployed, production-ready, or resilient unless repository evidence or executed validation supports it.

3. Assess lifecycle risks.
   - Check whether the container's main process receives `SIGTERM` directly. Prefer exec-form `CMD`/`ENTRYPOINT`; flag shell wrappers that do not `exec` the child or forward signals.
   - Check whether graceful shutdown has an application handler and an orchestrator time budget. Compare app shutdown expectations with Compose `stop_grace_period` or Kubernetes `terminationGracePeriodSeconds`.
   - Check whether service dependency configuration waits for readiness instead of mere startup ordering. In Compose, distinguish `depends_on` ordering from health-gated readiness. In Kubernetes, distinguish pod scheduling from readiness gates and application retries.
   - Check whether health checks validate meaningful service readiness rather than only process existence. Prefer checks that exercise the local HTTP/gRPC/TCP readiness endpoint or a low-cost dependency gate appropriate to the app.
   - Check probe timing for slow starts: `start_period`, `interval`, `timeout`, `retries`, Kubernetes `startupProbe`, `initialDelaySeconds`, `periodSeconds`, `timeoutSeconds`, and `failureThreshold`.
   - Check restart policies and recovery expectations. Confirm that transient dependency failures produce retry/backoff or a controlled crash that the orchestrator can restart, not silent partial readiness.
   - Check logs and metrics for lifecycle events such as startup complete, dependency unavailable, readiness false, signal received, graceful drain started, shutdown complete, and restart reason.

4. Separate automated fixes from confirmation-required changes.
   - Safe to automate when scoped and testable: converting shell-form commands to exec-form when arguments are equivalent, adding comments or documentation, adding a non-invasive validation command, or tightening a clearly local health endpoint reference.
   - Require user confirmation before changing runtime behavior, probe thresholds, restart policies, dependency gates, shutdown budgets, rollout settings, or application retry/backoff logic that could affect production availability.
   - Never run destructive infrastructure commands. Do not delete containers, volumes, namespaces, clusters, secrets, or production resources unless the user explicitly requests it and the environment is clearly safe.
   - Never recommend exposing secrets in health responses, logs, command lines, manifests, or examples.

5. Validate proportionally.
   - Prefer static validation first: YAML parsing, Dockerfile linting if available, `docker compose config`, `kubectl apply --dry-run=client`, `helm template`, or project-specific tests.
   - Run container builds, compose stacks, or Kubernetes commands only when the user requested implementation/validation and the environment is safe.
   - Report validation limitations clearly, especially when Docker, Kubernetes, dependencies, credentials, or a cluster are unavailable.

## Output Format

When reporting findings, use this structure:

```markdown
## Container Lifecycle Readiness Assessment

### Scope Reviewed
- Dockerfile:
- Docker Compose:
- Kubernetes:
- Application lifecycle code:
- Validation performed:

### Findings
#### 1. <finding>
- Evidence: <file path:line or command output>
- Impact: <startup, health, dependency readiness, graceful shutdown, restart/recovery, diagnostics>
- Severity/Priority: <critical | high | medium | low>
- Recommended change: <minimal change>
- Validation method: <specific command, test, or runtime observation>

### Safe To Automate
- <changes that are low-risk and mechanically verifiable>

### Requires Confirmation
- <runtime behavior changes, thresholds, rollout behavior, or production-impacting choices>

### Remaining Assumptions
- <what could not be verified>

### Final Checklist
- Review `references/lifecycle-readiness-checklist.md` for the Dockerfile, Docker Compose, Kubernetes, and application behavior checklist.
```

Use concise language. Prefer a small number of high-confidence findings over a broad list of generic best practices.
