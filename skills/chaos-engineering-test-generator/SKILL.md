---
name: chaos-engineering-test-generator
description: 'Generates chaos engineering experiments (LitmusChaos, Chaos Mesh, Chaos Monkey, AWS FIS) to validate system resilience against network latency, pod/instance failure, CPU/memory stress, and dependency outages. Use when the user asks to test resilience, simulate failures, run a game day, validate a runbook, or wants chaos experiments for Kubernetes or cloud workloads.'
---

# Chaos Engineering Test Generator

This skill generates ready-to-run chaos engineering experiments that inject controlled failure into a system so its resilience can be measured and validated. It targets Kubernetes-native tooling (LitmusChaos, Chaos Mesh) as well as Chaos Monkey-style instance termination and AWS Fault Injection Simulator (FIS), and always pairs the experiment with a hypothesis, a blast-radius definition, and a rollback plan.

## When to Use This Skill

Use this skill when you need to:
- Design and generate chaos experiments for a Kubernetes workload, VM fleet, or cloud service (network latency/loss, pod/instance/AZ failure, CPU/memory/IO stress, DNS or dependency failure).
- Prepare a "Game Day" exercise to validate an incident response runbook or an SLO's error budget assumptions.
- Turn a suspected weak point (single point of failure, missing timeout, no circuit breaker) into a concrete, measurable experiment.
- Convert an existing manual chaos test (e.g., a `kubectl delete pod` script) into a repeatable, version-controlled experiment manifest.

Do not use this skill to run experiments directly against a production environment without a reviewed rollback plan, monitoring in place, and stakeholder sign-off — always generate the experiment and safety controls together.

## Prerequisites

- Target environment identified: Kubernetes cluster (with LitmusChaos or Chaos Mesh installed) or cloud VM/instance group (AWS/GCP/Azure).
- Baseline observability in place (metrics, dashboards, alerts) to detect the "steady state" before and during the experiment. If this is missing, the skill will recommend minimal monitoring hooks first.
- A rollback/abort mechanism (manual or automated) reachable within the experiment's blast radius.
- Optional: existing SLOs/SLIs for the target service, to phrase the hypothesis in terms of error budget impact.

## Core Capabilities

### 1. Hypothesis-driven experiment design
Every experiment starts from a falsifiable hypothesis in the form: "When [fault] happens, [system] will [expected behavior] within [time], and users will [observe/not observe] impact." The skill asks for or infers the target service, the suspected weak point, and the expected safeguard (retry, failover, circuit breaker, autoscaling) before generating any manifest.

### 2. Fault injection manifest generation
Generates ready-to-apply experiment definitions for:
- **LitmusChaos**: `ChaosEngine` + `ChaosExperiment` CRs (pod-delete, pod-network-latency, pod-network-loss, pod-cpu-hog, pod-memory-hog, disk-fill, node-drain).
- **Chaos Mesh**: `PodChaos`, `NetworkChaos`, `StressChaos`, `IOChaos`, `DNSChaos` custom resources.
- **Chaos Monkey-style**: scripts/cron-style definitions for random instance/pod termination scoped to a namespace, ASG, or deployment.
- **AWS FIS**: experiment templates for EC2 instance/AZ failure, network latency, and API throttling simulation.

### 3. Blast radius and safety controls
Every generated experiment includes: a scoped selector (namespace/label/percentage of replicas; avoid targeting all replicas by default unless explicitly approved), a `duration`, and abort conditions tied to a monitored metric (e.g., abort if error rate > X% or latency p99 > Y ms). The skill defaults to the smallest blast radius that can still test the hypothesis and flags anything wider as "requires explicit approval."

### 4. Steady-state and observability hooks
Suggests the Prometheus queries, dashboards, or health-check endpoints to watch before, during, and after the experiment, and generates a short "steady-state definition" the team can check against post-experiment.

### 5. Game Day / runbook scaffolding
For multi-experiment exercises, generates a Game Day script: sequencing of experiments, expected on-call actions, and a post-mortem template capturing what was learned, what broke, and follow-up action items.

## Usage Examples

### Example 1: Pod failure test on a Kubernetes Deployment (LitmusChaos)
```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: checkout-service-pod-delete
  namespace: checkout
spec:
  appinfo:
    appns: checkout
    applabel: 'app=checkout-service'
    appkind: deployment
  engineState: active
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-delete
      spec:
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: '60'
            - name: CHAOS_INTERVAL
              value: '10'
            - name: FORCE
              value: 'false'
            - name: PODS_AFFECTED_PERC
              value: '25'
```
Hypothesis: killing 25% of `checkout-service` pods for 60s should not raise the checkout error rate above 1%, because readiness probes and 3 replicas should absorb the loss.

### Example 2: Network latency injection (Chaos Mesh)
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: payments-api-latency
  namespace: payments
spec:
  action: delay
  mode: fixed-percent
  value: '30'
  selector:
    namespaces: [payments]
    labelSelectors:
      app: payments-api
  delay:
    latency: '300ms'
    jitter: '50ms'
  duration: '5m'
  scheduler:
    cron: '@every 1m'
```
Hypothesis: adding 300ms latency to 30% of `payments-api` pods should trigger the client-side circuit breaker within 10s without cascading timeouts upstream.

### Example 3: CPU stress test (Chaos Mesh) with abort condition
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: search-service-cpu-hog
  namespace: search
spec:
  mode: one
  selector:
    labelSelectors:
      app: search-service
  stressors:
    cpu:
      workers: 2
      load: 90
  duration: '3m'
```
Abort condition: stop immediately if `search_service_p99_latency_ms > 800` for more than 30s (wire to an alert or a manual `kubectl delete stresschaos search-service-cpu-hog`).

## Guidelines

1. **Always start from a hypothesis, not a tool** - Ask "what do we believe should happen?" before picking pod-delete vs. network-latency vs. CPU-hog; the fault type follows from the weak point being tested, not the other way around.
2. **Smallest viable blast radius first** - Default to a single pod, a single AZ, or a small percentage (10-25%) of replicas/instances before proposing anything wider, and call out explicitly whenever a wider radius is suggested.
3. **No experiment without an abort condition** - Every generated manifest must include a duration cap and a monitored metric or manual command to stop the experiment early.
4. **Never target production without saying so** - If the user doesn't specify an environment, ask; if production is targeted, remind them of the need for on-call awareness, a maintenance window, and stakeholder sign-off.
5. **Tie experiments to existing SLOs when available** - Phrase expected impact in terms of error budget consumption, not just "it should still work."
6. **Keep manifests idempotent and removable** - Prefer scheduled/duration-bound experiments over ones requiring manual cleanup, and note the exact command to tear down the experiment if something goes wrong.

## Common Patterns

### Pattern: Progressive blast-radius escalation
```text
1. Single pod / single instance, non-prod            (smoke test)
2. 10-25% of replicas, non-prod                       (validate hypothesis)
3. 10-25% of replicas, prod, off-peak, on-call aware  (Game Day)
4. Full AZ / region failover drill, prod, scheduled   (quarterly, leadership sign-off)
```
Only propose step N+1 once step N passed with the system meeting its steady-state definition.

### Pattern: Dependency failure simulation (DNS/API)
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: DNSChaos
metadata:
  name: block-inventory-dns
spec:
  action: error
  mode: all
  selector:
    labelSelectors:
      app: order-service
  patterns:
    - inventory-service.internal
  duration: '2m'
```
Use to validate that a dependent service failure degrades gracefully (cached response, feature flag fallback) instead of cascading into a full outage.

## Limitations

- Generated manifests assume LitmusChaos, Chaos Mesh, or AWS FIS controllers are already installed and configured with the necessary RBAC/IAM permissions; this skill does not install the chaos platform itself.
- This skill produces experiment definitions and safety scaffolding, not a full observability stack — it will recommend metrics to watch but cannot verify that monitoring/alerting actually exists in the target environment.
- Blast-radius and abort-condition recommendations are heuristics based on common practice, not a substitute for review by the team that owns the target service.
- Does not execute experiments; the user (or their CI/CD or chaos scheduler) is responsible for applying and observing the generated manifests.
