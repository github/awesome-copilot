---
name: qdrant-monitoring
description: "Guides Qdrant monitoring and observability setup. Use when someone asks 'how to monitor Qdrant', 'what metrics to track', 'is Qdrant healthy', 'optimizer stuck', 'why is memory growing', 'requests are slow', or needs to set up Prometheus, Grafana, or health checks. Also use when debugging production issues that require metric analysis."
allowed-tools:
  - Read
  - Grep
  - Glob
---

# Qdrant Monitoring

Qdrant monitoring allows tracking performance and health of your deployment, and identifying issues before they become outages. First determine whether you need to set up monitoring or diagnose an active issue.

- Understand available metrics [Monitoring docs](https://search.qdrant.tech/md/documentation/operations/monitoring/)


## Monitoring Setup

Prometheus scraping, health probes, Hybrid Cloud specifics, alerting, and log centralization. [Monitoring Setup](setup/SKILL.md)


## Debugging with Metrics

Optimizer stuck, memory growth, slow requests. Using metrics to diagnose active production issues. [Debugging with Metrics](debugging/SKILL.md)
