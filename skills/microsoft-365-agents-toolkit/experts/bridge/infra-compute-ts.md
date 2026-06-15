# infra-compute-ts

## purpose

Bridges AWS and Azure compute infrastructure for cross-platform bot hosting. Covers Lambda/ECS/EC2 to Azure App Service/Functions/Container Apps (and the reverse). The common direction is AWS → Azure, but the service mappings apply bidirectionally.

> **Note:** AWS → Azure is the most common direction for this expert. For Azure → AWS, reverse the mappings: App Service → EC2/ECS, Azure Functions → Lambda + API Gateway, Container Apps → ECS/Fargate.

## rules

1. Map AWS compute services to Azure equivalents using this decision matrix: Lambda + API Gateway maps to Azure Functions (Consumption or Premium), ECS/Fargate maps to Azure Container Apps, EC2 maps to Azure App Service (or Azure VMs for lift-and-shift). Choose based on existing architecture and workload characteristics. [learn.microsoft.com -- Azure Functions](https://learn.microsoft.com/en-us/azure/azure-functions/functions-overview)
2. Teams bots require an HTTPS endpoint at `/api/messages` that accepts POST requests from the Bot Framework. Azure App Service and Container Apps provide this natively; Azure Functions requires an HTTP-triggered function bound to that route. [learn.microsoft.com -- Bot messaging endpoint](https://learn.microsoft.com/en-us/azure/bot-service/bot-builder-basics)
3. Teams expects bot responses within 3 seconds for synchronous invoke activities (card actions, dialogs, message extensions). Azure Functions Consumption plan cold starts (5-10 seconds for Node.js) will violate this. Use the Premium plan (pre-warmed instances) or App Service (always-on) for production Teams bots. [learn.microsoft.com -- Functions Premium](https://learn.microsoft.com/en-us/azure/azure-functions/functions-premium-plan)
4. Enable "Always On" for Azure App Service deployments to prevent the app from unloading after idle periods. Without it, the first request after idle triggers a cold start that can cause Teams timeouts. Set this in Configuration > General Settings or via CLI. [learn.microsoft.com -- App Service Always On](https://learn.microsoft.com/en-us/azure/app-service/configure-common)
5. Use Node.js 20 LTS or later as the runtime stack. Set this explicitly in App Service (Configuration > General Settings > Stack: Node, Version: 20-lts) or in the Azure Functions `host.json` and app settings. The Teams AI Library v2 requires Node 20+. [learn.microsoft.com -- Node.js on App Service](https://learn.microsoft.com/en-us/azure/app-service/configure-language-nodejs)
6. Migrate environment variables from AWS Lambda environment / SSM to Azure App Settings. App Settings are injected as `process.env` variables at runtime, equivalent to Lambda environment variables. Use deployment slots for staging/production separation. [learn.microsoft.com -- App Settings](https://learn.microsoft.com/en-us/azure/app-service/configure-common#configure-app-settings)
7. Configure health check endpoints for all Azure compute targets. App Service supports built-in health checks (Configuration > Health check path: `/api/health`). Container Apps use liveness and readiness probes. This replaces Lambda/ECS health monitoring. [learn.microsoft.com -- Health checks](https://learn.microsoft.com/en-us/azure/app-service/monitor-instances-health-check)
8. For streaming and WebSocket scenarios (e.g., AI streaming responses via `stream.emit()`), use App Service or Container Apps with WebSocket support enabled. Azure Functions Consumption plan does not support WebSockets. Enable WebSockets in App Service under Configuration > General Settings. [learn.microsoft.com -- WebSockets](https://learn.microsoft.com/en-us/azure/app-service/configure-common#configure-general-settings)
9. Use deployment slots in App Service for zero-downtime deployments, replacing blue/green patterns built with Lambda aliases/versions or ECS rolling updates. Swap staging to production after validation. [learn.microsoft.com -- Deployment slots](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots)
10. For complex multi-container deployments (previously ECS task definitions with sidecars), use Azure Container Apps with multiple containers per revision, or Azure Kubernetes Service for full orchestration control. Container Apps supports scale-to-zero similar to Fargate Spot. [learn.microsoft.com -- Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/overview)
11. **Azure Functions Premium "Always Ready" instances eliminate cold starts.** Set `WEBSITE_MAX_DYNAMIC_APPLICATION_SCALE_OUT` to cap horizontal scaling, and configure `alwaysReady` in the Premium plan to keep N instances warm. This is the serverless equivalent of ECS minimum task count. Required for Teams bots that must respond to invoke activities within 3 seconds. [learn.microsoft.com -- Functions Premium Always Ready](https://learn.microsoft.com/en-us/azure/azure-functions/functions-premium-plan#always-ready-instances)
12. **Container Apps with Dapr sidecars replaces ECS multi-container patterns.** ECS task definitions with multiple containers (app + sidecar) map to Container Apps revisions with Dapr enabled. Dapr provides service-to-service invocation, state management, pub/sub, and secrets — replacing custom service mesh code. Service discovery uses Dapr app IDs instead of ECS service discovery or Cloud Map. [learn.microsoft.com -- Dapr on Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/dapr-overview)

## patterns

### AWS Lambda to Azure App Service deployment

```shell
# Create resource group and App Service plan
az group create --name my-bot-rg --location eastus
az appservice plan create \
  --name my-bot-plan \
  --resource-group my-bot-rg \
  --sku B1 \
  --is-linux

# Create the web app with Node.js 20
az webapp create \
  --name my-teams-bot \
  --resource-group my-bot-rg \
  --plan my-bot-plan \
  --runtime "NODE:20-lts"

# Enable Always On and WebSockets
az webapp config set \
  --name my-teams-bot \
  --resource-group my-bot-rg \
  --always-on true \
  --web-sockets-enabled true

# Set application settings (replaces Lambda env vars)
az webapp config appsettings set \
  --name my-teams-bot \
  --resource-group my-bot-rg \
  --settings \
    CLIENT_ID="your-client-id" \
    CLIENT_SECRET="your-client-secret" \
    TENANT_ID="your-tenant-id" \
    OPENAI_API_KEY="your-openai-key" \
    PORT="8080" \
    NODE_ENV="production"

# Deploy from zip (build locally first: npm run build && zip -r dist.zip .)
az webapp deployment source config-zip \
  --name my-teams-bot \
  --resource-group my-bot-rg \
  --src ./dist.zip

# Configure health check
az webapp config set \
  --name my-teams-bot \
  --resource-group my-bot-rg \
  --generic-configurations '{"healthCheckPath": "/api/health"}'
```

### Azure Functions HTTP trigger for Teams bot endpoint

```typescript
// src/functions/messages.ts
import { app as azFunc, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { App } from "@microsoft/teams.apps";
import { ConsoleLogger } from "@microsoft/teams.common";

// Initialize the Teams app once (reused across invocations)
const teamsApp = new App({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  tenantId: process.env.TENANT_ID,
  logger: new ConsoleLogger("my-bot", { level: "info" }),
});

teamsApp.on("message", async ({ send, activity }) => {
  await send(`You said: "${activity.text}"`);
});

// Azure Functions HTTP trigger bound to /api/messages
azFunc.http("messages", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "api/messages",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const body = await req.json();
      // Forward the request to the Teams app for processing
      // In practice, use the adapter pattern from @microsoft/teams.apps
      // to bridge Azure Functions HTTP to the Teams app's Express handler
      return { status: 200, jsonBody: { status: "ok" } };
    } catch (error) {
      context.error("Error processing message:", error);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});
```

### Container Apps deployment for ECS/Fargate migration

```shell
# Create Container Apps environment (replaces ECS cluster)
az containerapp env create \
  --name my-bot-env \
  --resource-group my-bot-rg \
  --location eastus

# Deploy container (replaces ECS task definition + service)
az containerapp create \
  --name my-teams-bot \
  --resource-group my-bot-rg \
  --environment my-bot-env \
  --image myregistry.azurecr.io/my-teams-bot:latest \
  --target-port 3978 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 10 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --env-vars \
    CLIENT_ID="your-client-id" \
    CLIENT_SECRET=secretref:client-secret \
    TENANT_ID="your-tenant-id" \
    NODE_ENV="production"

# Configure scaling rule based on HTTP concurrent requests
az containerapp update \
  --name my-teams-bot \
  --resource-group my-bot-rg \
  --scale-rule-name http-rule \
  --scale-rule-type http \
  --scale-rule-http-concurrency 50
```

### Container Apps with Dapr sidecar (ECS multi-container migration)

```shell
# Create a Dapr-enabled Container App (replaces ECS task with sidecar containers)
az containerapp create \
  --name my-teams-bot \
  --resource-group my-bot-rg \
  --environment my-bot-env \
  --image myregistry.azurecr.io/my-teams-bot:latest \
  --target-port 3978 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 10 \
  --enable-dapr \
  --dapr-app-id my-teams-bot \
  --dapr-app-port 3978 \
  --dapr-app-protocol http
```

**TypeScript: invoking another service via Dapr (replaces ECS service discovery):**

```typescript
import { DaprClient, HttpMethod } from "@dapr/dapr";

const dapr = new DaprClient();

// Invoke another Container App by its Dapr app ID
// Replaces: http://service-name.local:3000/api/data (ECS service discovery)
async function callDataService(query: string) {
  const response = await dapr.invoker.invoke(
    "data-service",          // Dapr app ID (replaces ECS service name)
    `api/search?q=${query}`, // method/path
    HttpMethod.GET
  );
  return response;
}
```

## pitfalls

- **Azure Functions Consumption cold starts**: Node.js cold starts on the Consumption plan can take 5-10 seconds. Teams invoke activities (card actions, dialogs) time out at 3 seconds. Either use the Premium plan with at least one pre-warmed instance, or use App Service with Always On enabled.
- **Forgetting Always On**: App Service without Always On unloads the app after ~20 minutes idle. The next incoming Teams message triggers a full restart, causing timeout errors. Always enable Always On for bot workloads.
- **Port mismatch**: Azure App Service expects the app to listen on `process.env.PORT` (defaults to `8080`), not the Teams default of `3978`. Set `PORT` in App Settings or update `app.start(process.env.PORT || 8080)` for App Service deployments.
- **Missing /api/messages route**: The Azure Bot registration messaging endpoint must point to `https://your-app.azurewebsites.net/api/messages`. If the Teams app listens on a different path, update the Bot registration accordingly.
- **Lambda-style single-invocation patterns**: AWS Lambda processes one request per invocation. Azure App Service and Container Apps are long-running processes. Remove any Lambda-specific initialization/teardown patterns (handler export patterns, context.callbackWaitsForEmptyEventLoop) and use the standard `app.start()` pattern.
- **Deployment slot swap without warming**: Swapping a cold staging slot to production causes the same cold-start problem. Use slot warm-up rules or send traffic to staging before swapping.
- **Container Apps scale-to-zero**: If min-replicas is 0, the first request after scale-down has a cold start. Set `--min-replicas 1` for production Teams bots to ensure instant responses.
- **Functions Premium Always Ready is not free-tier**: Always Ready instances incur charges even when idle. Budget for at least 1 always-ready instance per production function app. Without it, the Premium plan still has occasional cold starts during scale-out events.
- **Dapr sidecar port conflict**: Dapr's default HTTP port is 3500 and gRPC is 50001. Ensure your app does not bind to these ports. The `--dapr-app-port` flag tells Dapr which port YOUR app listens on — this must match your Express/Teams `app.start()` port.

## references

- [Azure App Service overview](https://learn.microsoft.com/en-us/azure/app-service/overview)
- [Azure Functions Node.js developer guide](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node)
- [Azure Container Apps overview](https://learn.microsoft.com/en-us/azure/container-apps/overview)
- [Azure Functions Premium plan](https://learn.microsoft.com/en-us/azure/azure-functions/functions-premium-plan)
- [Deploy a bot to Azure](https://learn.microsoft.com/en-us/azure/bot-service/bot-builder-deploy-az-cli)
- [Azure App Service deployment slots](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots)
- [Configure Node.js apps for App Service](https://learn.microsoft.com/en-us/azure/app-service/configure-language-nodejs)
- [AWS to Azure services comparison](https://learn.microsoft.com/en-us/azure/architecture/aws-professional/services)

## instructions

This expert bridges compute infrastructure between AWS and Azure for cross-platform bot hosting. Use it when adding cross-platform support in either direction and you need to:

- Map compute services between clouds (Lambda ↔ Azure Functions, ECS ↔ Container Apps, EC2 ↔ App Service)
- Configure Azure App Service for a Teams bot with proper Always On, WebSocket, and Node.js runtime settings
- Set up Azure Functions as a Teams bot endpoint while avoiding cold-start pitfalls
- Deploy containerized bots to Azure Container Apps as a replacement for ECS/Fargate
- Bridge environment variables and deployment configurations between AWS and Azure
- Configure health checks, scaling rules, and deployment slots for production bot hosting

For Azure → AWS (less common): reverse the mappings. App Service maps to EC2 or Elastic Beanstalk, Azure Functions maps to Lambda + API Gateway, Container Apps maps to ECS/Fargate.

Pair with `infra-secrets-config-ts.md` for App Settings and environment variable configuration, and `../teams/dev.debug-test-ts.md` for local development setup.

## research

Deep Research prompt:

"Write a micro expert for bridging bot compute between AWS and Azure. Provide a bidirectional decision matrix mapping AWS Lambda+API Gateway ↔ Azure Functions, ECS/Fargate ↔ Container Apps, and EC2 ↔ App Service. Include Node/TS hosting patterns, ingress/routing, env var configuration, scaling differences, cold start mitigation for Teams 3-second response requirements, and bot endpoint considerations. Include deployment CLI examples for both directions."
