# Azure Monitor OpenTelemetry — TypeScript SDK Quick Reference

> Condensed from **azure-monitor-opentelemetry-ts**. Full patterns
> (ESM loader, custom span processors, manual exporters, live metrics)
> in the **azure-monitor-opentelemetry-ts** plugin skill if installed.

## Install
npm install @azure/monitor-opentelemetry

## Quick Start
```typescript
import { useAzureMonitor } from "@azure/monitor-opentelemetry";
useAzureMonitor({
  azureMonitorExporterOptions: {
    connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
  }
});
```

## Best Practices
- Call useAzureMonitor() first — before importing other modules
- Use ESM loader for ESM projects — `--import @azure/monitor-opentelemetry/loader`
- Enable offline storage for reliable telemetry in disconnected scenarios
- Set sampling ratio for high-traffic applications
- Add custom dimensions — use span processors for enrichment
- Graceful shutdown — call shutdownAzureMonitor() to flush telemetry
