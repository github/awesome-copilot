# Azure Monitor OpenTelemetry — Python SDK Quick Reference

> Condensed from **azure-monitor-opentelemetry-py**. Full patterns
> (Flask/Django/FastAPI, custom metrics, sampling, live metrics)
> in the **azure-monitor-opentelemetry-py** plugin skill if installed.

## Install
pip install azure-monitor-opentelemetry

## Quick Start
```python
from azure.monitor.opentelemetry import configure_azure_monitor
configure_azure_monitor()
```

## Best Practices
- Call configure_azure_monitor() early — before importing instrumented libraries
- Use environment variables for connection string in production
- Set cloud role name for multi-service Application Map
- Enable sampling in high-traffic applications
- Use structured logging for better log analytics queries
- Add custom attributes to spans for better debugging
- Use AAD authentication for production workloads
