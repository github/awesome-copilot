# transport-socketmode-https-ts

## purpose

Bridges Slack transport (Socket Mode, HTTP Events API) and Teams Bot Framework HTTPS transport for cross-platform bots targeting Slack, Teams, or both.

## rules

1. **Slack has 3 transport modes; Teams has 1.** Slack supports HTTP webhooks (Events API), Socket Mode (WebSocket for firewalled environments), and RTM (legacy WebSocket). Teams uses exclusively HTTPS via the Azure Bot Framework Service channel. All three Slack transports collapse into one Teams model. [learn.microsoft.com -- Bot Framework](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-overview)
2. **Slack Socket Mode (`@slack/socket-mode`) has NO Teams equivalent.** Socket Mode exists because Slack apps behind firewalls can't receive inbound HTTP. In Teams, the bot MUST expose a public HTTPS endpoint. Use Azure App Service, ngrok (dev), or Azure Dev Tunnels for connectivity. For strict on-premises environments that truly cannot expose any endpoint, Azure Relay provides a hybrid connection where the bot connects outbound to Azure, and Azure proxies inbound Teams traffic through that connection. This adds 10–50ms latency but requires zero inbound firewall rules. [learn.microsoft.com -- Azure Relay](https://learn.microsoft.com/en-us/azure/azure-relay/relay-what-is-it)
3. **Slack's `xapp-` token for Socket Mode → not needed.** Socket Mode uses a special app-level token. Teams uses `CLIENT_ID`/`CLIENT_SECRET`/`TENANT_ID` for all communication. Remove all `SLACK_APP_TOKEN` references.
4. **The WebSocket connection lifecycle disappears.** Slack Socket Mode manages a persistent WebSocket: connect, reconnect on failure, handle `disconnect` events, manage `envelope_id` acknowledgements. In Teams, the Bot Framework sends HTTP POST requests to your endpoint — no connection management needed.
5. **Slack Socket Mode envelope acknowledgement → not needed.** In Socket Mode, each event arrives in an envelope with an `envelope_id` that must be acknowledged within 3 seconds. In Teams, the HTTP response itself IS the acknowledgement — the Bot Framework sends a POST, your server returns 200.
6. **Slack RTM API is fully deprecated — do not port.** If the source project uses RTM (`rtm.start`, `rtm.connect`), it's already legacy. Convert directly to Teams HTTPS handlers without attempting to map RTM patterns.
7. **Teams' deployment model requires a public HTTPS endpoint.** Unlike Socket Mode (outbound-only), Teams bots receive inbound HTTPS from the Bot Framework Service. This means: (a) you need a domain/IP, (b) you need TLS, (c) you need the endpoint registered in the Azure Bot resource.
8. **Slack's retry mechanism (`x-slack-retry-num` header, `x-slack-retry-reason`)** is replaced by Bot Framework delivery guarantees. Teams does not retry failed deliveries in the same way — if your endpoint is down, activities may be lost. Ensure high availability.
9. **Java SDK's `SocketModeClient` classes (`SocketModeApp`, `SocketModeClient`, `JavaxWebSocketClient`, `TyrusWebSocketClient`)** are entirely eliminated. Delete all Socket Mode client code, connection management, reconnection logic, and WebSocket libraries.
10. **Slack's event subscription URL verification challenge (`url_verification` event)** has no Teams equivalent. Teams verifies your endpoint via the Bot Framework registration in Azure Portal, not via an HTTP challenge. Remove all challenge-response code.
11. **Transport is inherently asymmetric.** Slack supports both Socket Mode (outbound WebSocket) and HTTP (inbound webhooks), while Teams requires HTTPS exclusively. For Teams → Slack, adding Socket Mode is optional but useful for firewall-restricted environments. A cross-platform bot typically uses HTTP/HTTPS for both platforms, with Socket Mode as an optional Slack-only enhancement.
12. **Add a health check endpoint for production hosting.** Azure App Service, Container Apps, and Kubernetes all use HTTP health probes to determine if the app is alive. Expose `GET /api/health` returning 200 with a JSON body. Configure the probe path in your hosting platform so failed health checks trigger automatic restarts instead of silent failures. [learn.microsoft.com -- Health checks](https://learn.microsoft.com/en-us/azure/app-service/monitor-instances-health-check)

## patterns

### Slack Socket Mode → Teams HTTPS endpoint

**Slack Socket Mode (before):**

```typescript
// --- Slack with Socket Mode ---
import { App } from '@slack/bolt';
import { SocketModeReceiver } from '@slack/bolt';

// Socket Mode: outbound WebSocket, no public endpoint needed
const receiver = new SocketModeReceiver({
  appToken: process.env.SLACK_APP_TOKEN!, // xapp-... token
  // Manages WebSocket connection lifecycle internally:
  // - Connects to wss://wss-primary.slack.com
  // - Handles reconnection on disconnect
  // - Acknowledges each envelope_id within 3 seconds
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  receiver, // Uses Socket Mode instead of HTTP
});

app.message(/hello/i, async ({ say }) => {
  await say('Hello via Socket Mode!');
});

await app.start();
console.log('Connected via WebSocket (no public URL needed)');
```

**Teams (after):**

```typescript
// --- Teams with HTTPS endpoint ---
import { App } from '@microsoft/teams.apps';
import { ConsoleLogger } from '@microsoft/teams.common';
import { DevtoolsPlugin } from '@microsoft/teams.dev';

// Teams: inbound HTTPS, public endpoint required
const app = new App({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  tenantId: process.env.TENANT_ID,
  logger: new ConsoleLogger('my-bot', { level: 'info' }),
  plugins: [new DevtoolsPlugin()],
  // No socket mode, no WebSocket, no app-level token
  // Bot Framework sends HTTPS POST to your /api/messages endpoint
});

app.message(/hello/i, async ({ send }) => {
  await send('Hello via HTTPS!');
});

app.start(3978);
// Requires public HTTPS endpoint:
// - Dev: ngrok http 3978 or Azure Dev Tunnels
// - Prod: Azure App Service with custom domain + TLS
```

### Java SDK Socket Mode classes → DELETE

**Java (before):**

```java
// --- Java Socket Mode setup (DELETE ALL OF THIS) ---
import com.slack.api.bolt.App;
import com.slack.api.bolt.socket_mode.SocketModeApp;

// WebSocket client selection
import com.slack.api.socket_mode.SocketModeClient;
import javax.websocket.WebSocketContainer;

App app = new App(AppConfig.builder()
    .singleTeamBotToken(System.getenv("SLACK_BOT_TOKEN"))
    .build());

app.event(MessageEvent.class, (req, ctx) -> {
    ctx.say("Hello!");
    return ctx.ack();
});

// Socket Mode wrapper — manages WebSocket connection lifecycle
SocketModeApp socketModeApp = new SocketModeApp(
    System.getenv("SLACK_APP_TOKEN"),  // xapp-... token
    app                                 // wraps the Bolt app
);
socketModeApp.start(); // connects via WebSocket

// Internally manages:
// - WebSocket connection to Slack
// - Automatic reconnection
// - Envelope ID acknowledgement
// - Multiple client backends (Tyrus, Java-WebSocket)
```

**Teams TypeScript (after):**

```typescript
// --- Teams: everything above is replaced by this ---
import { App } from '@microsoft/teams.apps';
import { ConsoleLogger } from '@microsoft/teams.common';

const app = new App({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  tenantId: process.env.TENANT_ID,
  logger: new ConsoleLogger('my-bot', { level: 'info' }),
});

app.on('message', async ({ send }) => {
  await send('Hello!');
});

app.start(3978);
// No SocketModeApp, no WebSocket client, no app-level token
// Delete: SocketModeApp, SocketModeClient, javax.websocket imports,
//         Tyrus/Java-WebSocket dependencies, xapp token config
```

### Transport comparison table

| Aspect | Slack HTTP (Events API) | Slack Socket Mode | Teams Bot Framework |
|---|---|---|---|
| Direction | Inbound HTTP POST | Outbound WebSocket | Inbound HTTPS POST |
| Public endpoint | Required | Not required | Required |
| TLS | Required | N/A (outbound) | Required |
| Authentication | Signing secret HMAC | App-level token | Bot Framework JWT (auto) |
| Event delivery | HTTP POST per event | WebSocket frames | HTTPS POST per activity |
| Acknowledgement | Return HTTP 200 in 3s | Send envelope_id ack | Return HTTP 200 |
| Retry on failure | Yes (`x-slack-retry-*`) | Reconnect WebSocket | Limited retries |
| Connection mgmt | Stateless | Client manages WS | Stateless |
| Firewall-friendly | No (needs inbound) | Yes (outbound only) | No (needs inbound) |
| Dev tunneling | ngrok / localtunnel | Not needed | ngrok / Dev Tunnels |

### Health check endpoint pattern

```typescript
import express from 'express';

const webApp = express();

// Health check for Azure App Service / Container Apps probes
webApp.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// The Teams app uses the same Express server (or integrate with app.start())
webApp.listen(process.env.PORT || 3978, () => {
  console.log(`Bot running on port ${process.env.PORT || 3978}`);
});
```

### Production deployment stages

| Stage | Hosting | Endpoint | Notes |
|---|---|---|---|
| **Local dev** | `localhost:3978` + Dev Tunnel | `https://<tunnel-id>.devtunnels.ms/api/messages` | Free; tunnels expire after idle timeout |
| **Staging** | Azure App Service (B1) | `https://my-bot-staging.azurewebsites.net/api/messages` | Use deployment slots; Always On enabled |
| **Production** | Azure App Service (S1+) or Container Apps | `https://my-bot.azurewebsites.net/api/messages` | Custom domain + managed TLS; health check configured |

### Environment variable cleanup

| Slack Variable | Action | Why |
|---|---|---|
| `SLACK_APP_TOKEN` (`xapp-...`) | Delete | Socket Mode only |
| `SLACK_BOT_TOKEN` (`xoxb-...`) | Replace with `CLIENT_ID`+`CLIENT_SECRET` | Different auth model |
| `SLACK_SIGNING_SECRET` | Delete | Bot Framework JWT is auto |
| `SLACK_CLIENT_ID` | Replace with `CLIENT_ID` | Azure Bot app ID |
| `SLACK_CLIENT_SECRET` | Replace with `CLIENT_SECRET` | Azure Bot secret |
| *(add new)* | `TENANT_ID` | Azure AD tenant |

## pitfalls

- **Trying to use WebSockets with Teams**: Teams bots use HTTPS, not WebSocket. The Bot Framework Service sends activities as HTTP POST requests. Do not attempt to create a WebSocket server for Teams.
- **Forgetting the public endpoint requirement**: Socket Mode works behind firewalls with no public URL. Teams bots MUST have a public HTTPS endpoint. In development, use `ngrok http 3978` or Azure Dev Tunnels. In production, use Azure App Service.
- **Porting reconnection logic**: Socket Mode clients implement complex reconnection (backoff, failover). Delete all reconnection code — HTTPS is stateless, there's nothing to reconnect.
- **Porting envelope acknowledgement**: Socket Mode requires acknowledging each event's `envelope_id`. Teams has no envelope concept — the HTTP 200 response IS the acknowledgement. Remove all envelope handling.
- **Slack's URL verification challenge**: Slack's Events API sends a `url_verification` challenge to verify your endpoint. Teams doesn't do this — endpoint verification happens during Azure Bot registration. Delete challenge handlers.
- **RTM API patterns**: If the source uses RTM (`rtm.connect`, `rtm.start`), these are completely obsolete even in Slack. Do not attempt to map RTM patterns — convert directly to Teams HTTPS handlers.
- **Missing TLS in production**: Teams requires HTTPS. Azure App Service provides TLS automatically. If self-hosting, you must configure TLS certificates.
- **Assuming event delivery retries**: Slack retries failed HTTP deliveries (with `x-slack-retry-num`). Bot Framework has limited retry guarantees. Design for idempotency but don't depend on retries.
- **Dev tunnels expire**: Azure Dev Tunnels and ngrok free-tier URLs expire after idle timeouts or session restarts. The Bot Framework registration must be updated with the new URL each time. Use a persistent tunnel ID or switch to Azure-hosted staging for stable endpoints.
- **No health check = blind restarts**: Without a health check endpoint, Azure App Service cannot distinguish between a crashed app and a slow response. The platform may restart a healthy but busy instance, or leave a crashed instance running. Always configure `/api/health` and set the health check path in the hosting platform.

## references

- https://api.slack.com/apis/connections/socket -- Slack Socket Mode documentation
- https://api.slack.com/apis/connections/events-api -- Slack Events API (HTTP)
- https://api.slack.com/rtm -- Slack RTM API (deprecated)
- https://learn.microsoft.com/en-us/azure/bot-service/bot-service-overview -- Bot Framework architecture
- https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-connector-authentication -- Bot Framework authentication
- https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/debug/locally-with-an-ide -- Local dev with tunneling
- https://github.com/microsoft/teams.ts -- Teams SDK v2

## instructions

Use this expert when adding cross-platform support in either direction for Slack transport (Socket Mode, HTTP Events API) or Teams Bot Framework HTTPS transport. The core message: **all three Slack transports collapse into one Teams model (inbound HTTPS)**. Transport is inherently asymmetric -- Slack supports both Socket Mode and HTTP, while Teams requires HTTPS. For Teams → Slack, adding Socket Mode is optional but useful for firewall-restricted environments. Focus on: (1) understanding transport differences between platforms, (2) envelope acknowledgement vs HTTP response patterns, (3) setting up the HTTPS endpoint with proper TLS, (4) configuring Azure Bot registration. Pair with `events-activities-ts.md` for event/activity mapping once the transport layer is resolved, and `../teams/runtime.app-init-ts.md` for Teams app initialization.

## research

Deep Research prompt:

"Write a micro expert for bridging Slack transport (Socket Mode WebSocket, HTTP Events API) and Teams Bot Framework HTTPS transport in either direction for cross-platform bots. Cover: why all three Slack transports collapse into one Teams model, transport asymmetry (Socket Mode is Slack-only), Socket Mode as optional enhancement for firewall-restricted environments, public HTTPS endpoint requirement, Bot Framework JWT authentication, deployment options (Azure App Service, ngrok, Dev Tunnels), environment variable cleanup, and transport comparison table."
