# Infrastructure

## Transport

| Aspect | Slack | Teams |
|---|---|---|
| Primary transport | Socket Mode (WebSocket) or HTTP | **HTTPS only** (inbound webhook) |
| Firewall-friendly | Socket Mode — outbound WebSocket, no inbound ports | **Requires public HTTPS endpoint** |
| Default endpoint | `/slack/events` | `/api/messages` |
| Local development | Socket Mode (no tunnel needed) | Dev Tunnels or ngrok required |
| Request verification | HMAC-SHA256 (`signingSecret`) | Bot Framework JWT (automatic) |

**Rating:** GREEN for HTTP-to-HTTPS, RED for Socket Mode → HTTPS (firewall environments).

### Impact

Slack bots using Socket Mode run behind firewalls with zero inbound ports. Teams requires a public HTTPS endpoint — a fundamental architecture change for firewall-restricted environments.

### Mitigation (Slack Socket Mode → Teams)

| Strategy | How | Effort |
|---|---|---|
| **Deploy to Azure (Recommended)** | Host in Azure App Service / Functions / Container Apps. Use Dev Tunnels for local dev. | 4–8 hrs |
| **Azure Relay** | Hybrid connection for strict on-premises firewalls. Adds latency. | 8–16 hrs |

### Dual-Bot Transport

For bots targeting both platforms simultaneously:

| Pattern | How |
|---|---|
| **Socket Mode + HTTP (Recommended)** | Slack uses WebSocket (no HTTP needed), Teams uses Express on port 3978. No port conflicts. Simplest setup. |
| **Shared Express** | Both use HTTP. Slack `ExpressReceiver` at `/slack/events`, Teams adapter at `/api/messages`. Requires careful body-parsing middleware ordering. |

---

## Compute (AWS ↔ Azure)

| AWS | Azure | Notes |
|---|---|---|
| Lambda + API Gateway | Azure Functions | Teams bots need 3-second response; Functions Consumption has 5–10s cold starts |
| ECS / Fargate | Container Apps | Best for long-running bots with streaming |
| EC2 | App Service | Always-on, predictable latency |

### Cold Start Warning

Azure Functions Consumption plan has 5–10 second cold starts that violate the Teams 3-second response timeout. Mitigations:

| Strategy | Cost Impact |
|---|---|
| **App Service with Always On (Recommended)** | Fixed cost but no cold starts |
| **Functions Premium with Always Ready** | Higher cost, eliminates cold starts |
| **Container Apps (min replicas ≥ 1)** | Moderate cost, no scale-to-zero |

---

## Storage (AWS ↔ Azure)

| AWS | Azure | Notes |
|---|---|---|
| S3 | Blob Storage | Hot/Cool/Archive tiers |
| DynamoDB | Cosmos DB | Table API (lowest effort) or Core SQL (richer querying) |
| RDS (MySQL) | Azure Database for MySQL | Managed migration service available |
| RDS (PostgreSQL) | Azure Database for PostgreSQL | Managed migration service available |
| RDS (SQL Server) | Azure SQL | Direct migration path |

### Bot State Storage

| Aspect | Slack | Teams |
|---|---|---|
| SDK storage | No built-in state management | `IStorage` interface with pluggable backends |
| Default | Developer manages state | In-memory (lost on restart) |
| Production | External DB (Redis, PostgreSQL, etc.) | Cosmos DB, Azure SQL, or custom `IStorage` |

**Mitigation:** Implement the Teams `IStorage` interface with Cosmos DB for bot state. Use serverless pricing for development, provisioned RUs for production.

---

## Secrets & Configuration

| AWS | Azure | Notes |
|---|---|---|
| Secrets Manager | Key Vault | Sensitive credentials |
| SSM Parameter Store | App Configuration | Non-secret configuration |
| IAM roles | Managed Identity | Zero-secret authentication |
| Environment variables | App Settings | Runtime configuration |

### Bot Credentials

| Credential | Slack | Teams |
|---|---|---|
| Bot token | `SLACK_BOT_TOKEN` | Managed by SDK (`CLIENT_ID` + `CLIENT_SECRET`) |
| Signing/verification | `SLACK_SIGNING_SECRET` | Automatic JWT validation |
| Socket Mode | `SLACK_APP_TOKEN` | N/A |
| Tenant | N/A | `TENANT_ID` |

### Production Secret Management

| Strategy | How |
|---|---|
| **Key Vault references (Recommended)** | `@Microsoft.KeyVault(SecretUri=...)` in App Settings. Zero-code secret injection. Requires managed identity. |
| **Managed identity for bot auth** | `managedIdentityClientId: "system"` in App constructor. Eliminates `CLIENT_SECRET` entirely. |
| **`DefaultAzureCredential`** | Chains managed identity → environment → CLI → VS Code. Works everywhere. |

---

## Observability (AWS ↔ Azure)

| AWS | Azure | Notes |
|---|---|---|
| CloudWatch Logs | Application Insights + Log Analytics | KQL query language (different from CloudWatch Insights) |
| CloudWatch Metrics | Azure Monitor Metrics | `trackMetric()` |
| CloudWatch Alarms | Azure Monitor Alerts | KQL-based alerting |
| X-Ray | Application Insights distributed tracing | Operation IDs, `traceparent` headers |

### Bot Health Monitoring

Key metrics to track for both platforms:

| Metric | Why |
|---|---|
| Request rate | Volume baseline |
| Response time (P50/P95/P99) | Detect slowdowns before they cause timeouts |
| Failure rate | Catch errors before users report them |
| Active conversations | Usage trends |
| AI/external API latency | Dependency health |

### Setup

```typescript
// Application Insights — must be first import
import appInsights from "applicationinsights";
appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING).start();

// Then import everything else
import { App } from "@microsoft/teams.apps";
```

**Pitfall:** Late instrumentation import. `applicationinsights` must run before `http`/`https` are loaded or distributed tracing won't work.

---

## Rate Limiting & Resilience

| Aspect | Slack | Teams |
|---|---|---|
| Rate limit signal | HTTP 429 + `Retry-After` header | HTTP 429 + `Retry-After` header |
| Built-in retry | Bolt `retryConfig` option | **No built-in retry** |
| Conversation limits | ~1 msg/sec per method per token | ~1 msg/sec per conversation, ~30 msg/min per conversation |
| Graph API limits | N/A | Separate throttling (per-app per-tenant) |
| Invoke timeout | N/A | 3–10 seconds (varies by invoke type) |

**Rating:** GREEN for basic rate limiting, YELLOW for resilience patterns.

### Mitigation (Slack → Teams)

Build a `RetryPlugin` with exponential backoff + jitter:

| Component | Purpose |
|---|---|
| **Exponential backoff** | Wait 1s, 2s, 4s, 8s between retries |
| **Jitter** | Add random delay to prevent thundering herd |
| **Circuit breaker** | Stop retrying after N consecutive failures |
| **`p-queue`** | Concurrency control for proactive broadcast (avoid bursting) |

Effort: 12–16 hrs for a production-grade retry plugin.

### Reverse Direction (Teams → Slack)

Use Bolt's built-in `retryConfig` option:

```typescript
const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
  // Built-in retry with exponential backoff
});
```
