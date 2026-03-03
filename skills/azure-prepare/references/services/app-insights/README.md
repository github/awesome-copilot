# App Insights

Azure Application Insights for telemetry, monitoring, and APM.

## When to Add

- User wants observability/monitoring
- User mentions telemetry, tracing, or logging
- Production apps needing health visibility

## Implementation

> **→ Invoke the `appinsights-instrumentation` skill**
>
> This skill has detailed guides for:
> - Auto-instrumentation (ASP.NET Core on App Service)
> - Manual instrumentation (Node.js, Python, C#)
> - Bicep templates and CLI scripts

## Quick Reference

| Aspect | Value |
|--------|-------|
| Resource | `Microsoft.Insights/components` |
| Depends on | Log Analytics Workspace |
| SKU | PerGB2018 (consumption-based) |

## Architecture Notes

- Create in same resource group as the app
- Connect to centralized Log Analytics Workspace
- Use connection string (not instrumentation key) for new apps
