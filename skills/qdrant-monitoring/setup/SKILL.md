---
name: qdrant-monitoring-setup
description: "Guides Qdrant monitoring setup including Prometheus scraping, health probes, Hybrid Cloud metrics, alerting, and log centralization. Use when someone asks 'how to set up monitoring', 'Prometheus config', 'Grafana dashboard', 'health check endpoints', 'how to scrape Hybrid Cloud', 'what alerts to set', 'how to centralize logs', or 'audit logging'."
---

# How to Set Up Qdrant Monitoring

Get Prometheus scraping working first, then health probes, then alerting. Do not skip monitoring setup before going to production.


## Prometheus Metrics

Use when: setting up metric collection for the first time or adding a new deployment.

- Node metrics at `/metrics` endpoint [Monitoring docs](https://search.qdrant.tech/md/documentation/operations/monitoring/)
- Cluster metrics at `/sys_metrics` (Qdrant Cloud only)
- Prefix customization via `service.metrics_prefix` config or `QDRANT__SERVICE__METRICS_PREFIX` env var
- Example self-hosted setup with Prometheus + Grafana [prometheus-monitoring repo](https://github.com/qdrant/prometheus-monitoring)


## Hybrid Cloud Scraping

Use when: running Qdrant Hybrid Cloud and need cluster-level visibility.

Do not just scrape Qdrant nodes. In Hybrid Cloud, you manage the Kubernetes data plane. You must also scrape the cluster-exporter and operator pods for full cluster visibility and operator state.

- Hybrid Cloud Prometheus setup tutorial [Hybrid Cloud Prometheus](https://search.qdrant.tech/md/documentation/tutorials-and-examples/hybrid-cloud-prometheus/)
- Official Grafana dashboards [Grafana dashboard repo](https://github.com/qdrant/qdrant-cloud-grafana-dashboard)


## Liveness and Readiness Probes

Use when: configuring Kubernetes health checks.

- Use `/healthz`, `/livez`, `/readyz` for basic status, liveness, and readiness [Kubernetes health endpoints](https://search.qdrant.tech/md/documentation/operations/monitoring/?s=kubernetes-health-endpoints)


## Alerting

Use when: setting up alerts for production or Hybrid Cloud deployments.

- Hybrid Cloud provides ~11 pre-configured Prometheus alerts out of the box [Cloud cluster monitoring](https://search.qdrant.tech/md/documentation/cloud/cluster-monitoring/)
- Use AlertmanagerConfig to route alerts to Slack, PagerDuty, or other targets based on labels
- At minimum, alert on: optimizer errors, node not ready, replication factor below target, disk usage >80%


## Log Centralization and Audit Logging

Use when: enterprise compliance requires centralized logs or audit trails.

- Enable JSON log format for structured analysis: set `logger.format` to `json` in config [Configuration](https://search.qdrant.tech/md/documentation/operations/configuration/)
- Use FluentD/OpenSearch for log aggregation
- Audit logs (v1.17+) write to local filesystem (`/qdrant/storage/audit/`), not stdout. Mount a Persistent Volume and deploy a sidecar container to tail these files to stdout so DaemonSets can pick them up. [Audit logging](https://search.qdrant.tech/md/documentation/operations/security/?s=audit-logging)


## What NOT to Do

- Scrape `/sys_metrics` on self-hosted (only available on Qdrant Cloud)
- Scrape only Qdrant nodes in Hybrid Cloud (miss cluster-exporter and operator metrics)
- Skip monitoring setup before going to production (you will regret it)
- Alert on page cache memory usage (it's supposed to fill available RAM, normal OS behavior)
