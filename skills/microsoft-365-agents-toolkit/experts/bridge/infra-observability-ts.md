# infra-observability-ts

## purpose

Bridges AWS and Azure observability for cross-platform bot monitoring. Covers CloudWatch to Azure Monitor/Application Insights/Log Analytics (and the reverse). The common direction is AWS → Azure, but the service mappings apply bidirectionally.

> **Note:** AWS → Azure is the most common direction for this expert. For Azure → AWS, reverse the mappings: Application Insights → CloudWatch + X-Ray, Log Analytics (KQL) → CloudWatch Logs Insights, Azure Monitor Alerts → CloudWatch Alarms + SNS.

## rules

1. Map CloudWatch Logs to Application Insights and Log Analytics. Application Insights provides structured telemetry (requests, dependencies, exceptions, traces) while Log Analytics is the query engine (KQL) for exploring that data. Both replace CloudWatch Logs Insights. [learn.microsoft.com -- Application Insights overview](https://learn.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview)
2. Instrument Node.js Teams bots with the `applicationinsights` npm package. Call `setup()` and `start()` before any other imports to enable automatic dependency tracking, request correlation, and exception capture. This replaces AWS X-Ray SDK instrumentation. [learn.microsoft.com -- Node.js Application Insights](https://learn.microsoft.com/en-us/azure/azure-monitor/app/nodejs)
3. Map CloudWatch Metrics to Azure Monitor Metrics. Custom metrics sent via `trackMetric()` in Application Insights appear in Azure Monitor Metrics Explorer, replacing CloudWatch custom metrics and `putMetricData` calls. [learn.microsoft.com -- Custom metrics](https://learn.microsoft.com/en-us/azure/azure-monitor/app/api-custom-events-metrics)
4. Map CloudWatch Alarms to Azure Monitor Alerts. Create alert rules on Application Insights metrics (response time, failure rate, exception count) or log-based alerts using KQL queries. This replaces CloudWatch Alarm + SNS notification patterns. [learn.microsoft.com -- Azure Monitor Alerts](https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-overview)
5. Map AWS X-Ray distributed tracing to Application Insights distributed tracing. Application Insights automatically correlates requests across services using operation IDs. The `applicationinsights` SDK propagates trace context headers (`traceparent`) automatically. [learn.microsoft.com -- Distributed tracing](https://learn.microsoft.com/en-us/azure/azure-monitor/app/distributed-trace-data)
6. Integrate with the Teams SDK `ConsoleLogger` by creating a custom logger implementation that forwards to Application Insights. Use `trackTrace()` for log messages, `trackException()` for errors, and `trackEvent()` for business events (bot installs, card actions). [learn.microsoft.com -- Application Insights API](https://learn.microsoft.com/en-us/azure/azure-monitor/app/api-custom-events-metrics)
7. Set the Application Insights connection string via the `APPLICATIONINSIGHTS_CONNECTION_STRING` environment variable in App Settings. Do not hardcode connection strings. App Service and Functions have built-in Application Insights integration that can be enabled without code changes for basic telemetry. [learn.microsoft.com -- Connection strings](https://learn.microsoft.com/en-us/azure/azure-monitor/app/sdk-connection-string)
8. Use KQL queries in Log Analytics to diagnose bot issues, replacing CloudWatch Logs Insights queries. Query `requests`, `dependencies`, `exceptions`, and `traces` tables. Pin frequently used queries to Azure dashboards for team visibility. [learn.microsoft.com -- KQL overview](https://learn.microsoft.com/en-us/azure/data-explorer/kusto/query/)
9. Configure sampling to control telemetry volume and cost. Application Insights supports adaptive sampling (automatic) and fixed-rate sampling. For production bots with high message volume, set a sampling percentage to avoid excessive costs while retaining representative data. [learn.microsoft.com -- Sampling](https://learn.microsoft.com/en-us/azure/azure-monitor/app/sampling-classic-api)
10. Build Azure dashboards for bot health monitoring, replacing CloudWatch Dashboards. Include panels for request rate, response time (P50/P95/P99), failure rate, active conversations, and AI model latency. Use Application Insights workbooks for detailed investigation views. [learn.microsoft.com -- Dashboards](https://learn.microsoft.com/en-us/azure/azure-monitor/app/overview-dashboard)

## patterns

### Application Insights setup for a Teams bot

```typescript
// src/instrumentation.ts — MUST be imported before all other modules
import * as appInsights from "applicationinsights";

appInsights
  .setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
  .setAutoCollectRequests(true)
  .setAutoCollectPerformance(true)
  .setAutoCollectExceptions(true)
  .setAutoCollectDependencies(true)
  .setAutoCollectConsole(true, true) // capture console.log and console.error
  .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C)
  .setSendLiveMetrics(true)
  .start();

export const telemetryClient = appInsights.defaultClient;
```

```typescript
// src/index.ts
import { telemetryClient } from "./instrumentation.js"; // import first!
import { App } from "@microsoft/teams.apps";
import { ConsoleLogger } from "@microsoft/teams.common";

const app = new App({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  tenantId: process.env.TENANT_ID,
  logger: new ConsoleLogger("my-bot", { level: "info" }),
});

// Track custom events for bot lifecycle
app.on("install.add", async ({ send, activity }) => {
  telemetryClient.trackEvent({
    name: "BotInstalled",
    properties: {
      conversationType: activity.conversation.conversationType ?? "personal",
      tenantId: activity.conversation.tenantId ?? "unknown",
    },
  });
  await send("Hello! I am now installed.");
});

// Track AI prompt latency as a custom metric
app.on("message", async ({ send, activity }) => {
  const start = Date.now();
  // ... process with AI prompt ...
  const duration = Date.now() - start;

  telemetryClient.trackMetric({
    name: "AIPromptLatency",
    value: duration,
    properties: { conversationId: activity.conversation.id },
  });
});

// Track unhandled errors
app.event("error", ({ error }) => {
  telemetryClient.trackException({ exception: error as Error });
});

app.start(process.env.PORT || 3978);
```

### KQL queries for bot diagnostics

```text
// Request latency for the /api/messages endpoint (replaces CloudWatch Logs Insights)
requests
| where name == "POST /api/messages"
| where timestamp > ago(24h)
| summarize
    avg(duration),
    percentile(duration, 50),
    percentile(duration, 95),
    percentile(duration, 99),
    count()
  by bin(timestamp, 5m)
| render timechart

// Failed requests with exception details
requests
| where success == false
| where timestamp > ago(1h)
| join kind=inner (
    exceptions
    | where timestamp > ago(1h)
  ) on operation_Id
| project timestamp, name, resultCode, duration, exceptionType = type, exceptionMessage = outerMessage
| order by timestamp desc
| take 50

// Bot install/uninstall events over time
customEvents
| where name in ("BotInstalled", "BotUninstalled")
| where timestamp > ago(7d)
| summarize count() by name, bin(timestamp, 1d)
| render columnchart

// AI prompt latency distribution
customMetrics
| where name == "AIPromptLatency"
| where timestamp > ago(24h)
| summarize avg(value), percentile(value, 95), max(value) by bin(timestamp, 15m)
| render timechart

// Dependency call failures (external APIs, databases)
dependencies
| where success == false
| where timestamp > ago(6h)
| summarize failureCount = count() by target, name, resultCode
| order by failureCount desc
```

### Custom logger that bridges ConsoleLogger to Application Insights

```typescript
// src/logger.ts
import * as appInsights from "applicationinsights";
import { ILogger } from "@microsoft/teams.common";

export class AppInsightsLogger implements ILogger {
  private client: appInsights.TelemetryClient;
  private name: string;

  constructor(name: string, client?: appInsights.TelemetryClient) {
    this.name = name;
    this.client = client ?? appInsights.defaultClient;
  }

  error(message: string, ...args: unknown[]): void {
    const formatted = this.format(message, args);
    console.error(`[${this.name}] ${formatted}`);
    this.client.trackTrace({
      message: formatted,
      severity: appInsights.Contracts.SeverityLevel.Error,
      properties: { component: this.name },
    });
  }

  warn(message: string, ...args: unknown[]): void {
    const formatted = this.format(message, args);
    console.warn(`[${this.name}] ${formatted}`);
    this.client.trackTrace({
      message: formatted,
      severity: appInsights.Contracts.SeverityLevel.Warning,
      properties: { component: this.name },
    });
  }

  info(message: string, ...args: unknown[]): void {
    const formatted = this.format(message, args);
    console.info(`[${this.name}] ${formatted}`);
    this.client.trackTrace({
      message: formatted,
      severity: appInsights.Contracts.SeverityLevel.Information,
      properties: { component: this.name },
    });
  }

  debug(message: string, ...args: unknown[]): void {
    const formatted = this.format(message, args);
    console.debug(`[${this.name}] ${formatted}`);
    this.client.trackTrace({
      message: formatted,
      severity: appInsights.Contracts.SeverityLevel.Verbose,
      properties: { component: this.name },
    });
  }

  log(message: string, ...args: unknown[]): void {
    this.info(message, ...args);
  }

  child(name: string): ILogger {
    return new AppInsightsLogger(`${this.name}/${name}`, this.client);
  }

  private format(message: string, args: unknown[]): string {
    return args.length > 0 ? `${message} ${args.map(String).join(" ")}` : message;
  }
}

// Usage in src/index.ts:
// import { AppInsightsLogger } from "./logger.js";
// const app = new App({
//   logger: new AppInsightsLogger("my-bot"),
//   ...
// });
```

## pitfalls

- **Late instrumentation import**: The `applicationinsights` setup must run before importing any other modules (especially `http`/`https`). If imported after, automatic dependency tracking and request correlation will not work. Always import the instrumentation module first in your entry point.
- **Missing connection string**: If `APPLICATIONINSIGHTS_CONNECTION_STRING` is not set, the SDK initializes silently in no-op mode. Telemetry is lost without any error. Always verify the connection string is configured in App Settings.
- **CloudWatch Logs Insights queries not portable**: CloudWatch Logs Insights query syntax is completely different from KQL. All existing dashboard queries must be manually rewritten in KQL. The table structures also differ (e.g., `@timestamp` becomes `timestamp`, `@message` becomes `message`).
- **Cost surprise from high-volume bots**: Application Insights charges per GB of ingested telemetry. A high-traffic bot logging every message can generate significant costs. Configure sampling early and exclude verbose trace levels in production.
- **Console.log not structured**: Raw `console.log` statements captured by Application Insights appear as unstructured trace messages. Use `trackEvent()`, `trackMetric()`, and `trackTrace()` with properties for queryable, structured telemetry.
- **X-Ray annotations not migrated**: AWS X-Ray annotations and metadata have no automatic migration path to Application Insights custom properties. Manually map important annotations to `trackTrace()` or `trackEvent()` property bags.
- **Forgetting to flush on shutdown**: Application Insights batches telemetry before sending. If the process exits abruptly (e.g., container restart), buffered telemetry is lost. Call `telemetryClient.flush()` in a graceful shutdown handler.

## references

- [Application Insights overview](https://learn.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview)
- [Application Insights for Node.js](https://learn.microsoft.com/en-us/azure/azure-monitor/app/nodejs)
- [Application Insights API reference](https://learn.microsoft.com/en-us/azure/azure-monitor/app/api-custom-events-metrics)
- [KQL quick reference](https://learn.microsoft.com/en-us/azure/data-explorer/kusto/query/kql-quick-reference)
- [Azure Monitor Alerts](https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-overview)
- [Application Insights sampling](https://learn.microsoft.com/en-us/azure/azure-monitor/app/sampling-classic-api)
- [Distributed tracing in Application Insights](https://learn.microsoft.com/en-us/azure/azure-monitor/app/distributed-trace-data)
- [AWS to Azure services comparison -- Management and monitoring](https://learn.microsoft.com/en-us/azure/architecture/aws-professional/services#management-and-monitoring)

## instructions

This expert bridges observability between AWS and Azure for cross-platform bot monitoring. Use it when adding cross-platform support in either direction and you need to:

- Map monitoring services between clouds (CloudWatch ↔ Azure Monitor, X-Ray ↔ Application Insights, CloudWatch Alarms ↔ Azure Alerts)
- Instrument a Node.js Teams bot with the `applicationinsights` npm package
- Write KQL queries for bot diagnostics (latency, errors, usage patterns)
- Build Azure dashboards for bot health monitoring
- Bridge the Teams SDK `ConsoleLogger` to Application Insights telemetry

For Azure → AWS (less common): reverse the mappings. Application Insights maps to CloudWatch + X-Ray, KQL maps to CloudWatch Logs Insights, Azure Alerts map to CloudWatch Alarms + SNS.

Pair with `../teams/dev.debug-test-ts.md` for Teams SDK ConsoleLogger integration, and `infra-compute-ts.md` for Application Insights instrumentation on the target compute platform.

## research

Deep Research prompt:

"Write a micro expert for bridging observability between AWS CloudWatch and Azure Monitor/Application Insights for cross-platform bots. Cover structured logging with the applicationinsights npm package, distributed tracing (X-Ray ↔ Application Insights), KQL ↔ CloudWatch Logs Insights query mapping, custom metrics, alert rules, dashboard setup, and cost management with sampling bidirectionally. Include instrumentation code examples and diagnostic queries."
