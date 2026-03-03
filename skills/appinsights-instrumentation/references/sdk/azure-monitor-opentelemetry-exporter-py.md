# Azure Monitor OpenTelemetry Exporter — Python SDK Quick Reference

> Condensed from **azure-monitor-opentelemetry-exporter-py**. Full patterns
> (metric exporter, log exporter, offline storage, sovereign clouds)
> in the **azure-monitor-opentelemetry-exporter-py** plugin skill if installed.

## Install
pip install azure-monitor-opentelemetry-exporter

## Quick Start
```python
from azure.monitor.opentelemetry.exporter import AzureMonitorTraceExporter
exporter = AzureMonitorTraceExporter()  # reads APPLICATIONINSIGHTS_CONNECTION_STRING
```

## Best Practices
- Use BatchSpanProcessor for production (not SimpleSpanProcessor)
- Use ApplicationInsightsSampler for consistent sampling across services
- Enable offline storage for reliability in production
- Use AAD authentication instead of instrumentation keys
- Set export intervals appropriate for your workload
- Use the distro (azure-monitor-opentelemetry) unless you need custom pipelines
