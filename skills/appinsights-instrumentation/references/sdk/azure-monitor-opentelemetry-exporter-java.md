# Azure Monitor OpenTelemetry Exporter — Java SDK Quick Reference

> Condensed from **azure-monitor-opentelemetry-exporter-java**. Full patterns
> (trace/metric/log export, spans, semantic conventions)
> in the **azure-monitor-opentelemetry-exporter-java** plugin skill if installed.

## Install
```xml
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-monitor-opentelemetry-exporter</artifactId>
    <version>1.0.0-beta.x</version>
</dependency>
```

> **DEPRECATED**: Migrate to `azure-monitor-opentelemetry-autoconfigure`.

## Quick Start
```java
// Prefer autoconfigure instead:
// <artifactId>azure-monitor-opentelemetry-autoconfigure</artifactId>
```

## Best Practices
- Use autoconfigure — migrate to `azure-monitor-opentelemetry-autoconfigure`
- Set meaningful span names — use descriptive operation names
- Add relevant attributes — include contextual data for debugging
- Handle exceptions — always record exceptions on spans
- Use semantic conventions — follow OpenTelemetry semantic conventions
- End spans in finally — ensure spans are always ended
- Use try-with-resources — scope management with try-with-resources pattern
