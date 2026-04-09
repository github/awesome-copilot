---
name: azure-container-apps
description: 'Guide for building, deploying, scaling, and troubleshooting Azure Container Apps. Use when creating container apps, configuring ingress, setting up scaling rules, enabling Dapr sidecars, deploying container images, creating jobs, configuring custom domains, managing revisions, traffic splitting, or troubleshooting ACA workloads.'
---

# Azure Container Apps

Azure Container Apps (ACA) is a serverless container platform for running microservices, APIs, background jobs, and event-driven workloads without managing infrastructure.

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Environment** | Shared boundary for container apps. Apps in the same environment share a virtual network, logging destination, and Dapr configuration. |
| **Container App** | The deployable unit. Each app has one or more containers, ingress settings, scaling rules, and secrets. |
| **Revision** | An immutable snapshot of a container app version. New revisions are created when template-scope properties change (image, env vars, scaling rules). |
| **Replica** | A running instance of a revision. Scaling rules control how many replicas run. |
| **Job** | A container that runs to completion — on-demand, scheduled (cron), or event-driven. Jobs do not serve traffic. |

## Prerequisites

```bash
# Install or upgrade the Azure CLI extension
az extension add --name containerapp --upgrade

# Register required providers
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights
```

## Quick Start

### Create and deploy in one command

```bash
az containerapp up \
  --name my-app \
  --resource-group my-rg \
  --location eastus \
  --environment my-env \
  --image mcr.microsoft.com/k8se/quickstart:latest \
  --target-port 80 \
  --ingress external
```

`containerapp up` creates the environment, Log Analytics workspace, and container app if they don't already exist.

### Step-by-step creation

```bash
# 1. Create environment
az containerapp env create \
  --name my-env \
  --resource-group my-rg \
  --location eastus

# 2. Create container app
az containerapp create \
  --name my-app \
  --resource-group my-rg \
  --environment my-env \
  --image myregistry.azurecr.io/myapp:latest \
  --target-port 8080 \
  --ingress external \
  --registry-server myregistry.azurecr.io \
  --min-replicas 1 \
  --max-replicas 10 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --env-vars "DB_HOST=mydb.postgres.database.azure.com" "APP_ENV=production"
```

## Container Image Sources

### Azure Container Registry (ACR)

```bash
# Use managed identity (recommended — no credentials stored)
az containerapp create \
  --name my-app \
  --resource-group my-rg \
  --environment my-env \
  --image myregistry.azurecr.io/myapp:v1 \
  --registry-server myregistry.azurecr.io \
  --registry-identity system-environment

# Use admin credentials (not recommended for production)
az containerapp create \
  --name my-app \
  --resource-group my-rg \
  --environment my-env \
  --image myregistry.azurecr.io/myapp:v1 \
  --registry-server myregistry.azurecr.io \
  --registry-username <ACR_USERNAME> \
  --registry-password <ACR_PASSWORD>
```

### Docker Hub or other registries

```bash
az containerapp create \
  --name my-app \
  --resource-group my-rg \
  --environment my-env \
  --image docker.io/myuser/myapp:latest \
  --registry-server docker.io \
  --registry-username <USERNAME> \
  --registry-password <PASSWORD>
```

## Ingress Configuration

| Setting | Description |
|---------|-------------|
| `--ingress external` | Accessible from the internet and within the environment |
| `--ingress internal` | Accessible only within the environment (service-to-service) |
| `--target-port` | The port your container listens on |
| `--transport auto` | Auto-detect HTTP/1.1 or HTTP/2 (default) |
| `--transport http2` | Force HTTP/2 |
| `--transport tcp` | TCP-only (no HTTP features) |

```bash
# External HTTPS endpoint
az containerapp ingress enable \
  --name my-app \
  --resource-group my-rg \
  --type external \
  --target-port 8080 \
  --transport auto

# Internal-only (microservice backend)
az containerapp ingress enable \
  --name my-app \
  --resource-group my-rg \
  --type internal \
  --target-port 8080
```

### Custom Domains

```bash
# Add custom domain with managed certificate
az containerapp hostname add \
  --name my-app \
  --resource-group my-rg \
  --hostname api.example.com

az containerapp hostname bind \
  --name my-app \
  --resource-group my-rg \
  --hostname api.example.com \
  --environment my-env \
  --validation-method CNAME
```

## Scaling Rules

ACA uses KEDA (Kubernetes Event-driven Autoscaling) for scale decisions. Default: 0–10 replicas with HTTP scaling.

### HTTP scaling

```bash
az containerapp create \
  --name my-app \
  --resource-group my-rg \
  --environment my-env \
  --image myapp:latest \
  --min-replicas 0 \
  --max-replicas 20 \
  --scale-rule-name http-rule \
  --scale-rule-type http \
  --scale-rule-http-concurrency 50
```

When concurrent requests exceed 50 per replica, a new replica is created. Apps with HTTP scaling can scale to zero when idle.

### TCP scaling

```bash
az containerapp create \
  --name my-app \
  --resource-group my-rg \
  --environment my-env \
  --image myapp:latest \
  --min-replicas 0 \
  --max-replicas 10 \
  --transport tcp \
  --ingress external \
  --target-port 9090 \
  --scale-rule-name tcp-rule \
  --scale-rule-type tcp \
  --scale-rule-tcp-concurrency 100
```

### Custom scaling (event-driven)

Use any KEDA-supported scaler. Common examples:

**Azure Service Bus queue:**

```bash
az containerapp create \
  --name my-worker \
  --resource-group my-rg \
  --environment my-env \
  --image myworker:latest \
  --min-replicas 0 \
  --max-replicas 30 \
  --secrets "sb-conn=<SERVICE_BUS_CONNECTION_STRING>" \
  --scale-rule-name servicebus-rule \
  --scale-rule-type azure-servicebus \
  --scale-rule-metadata "queueName=orders" \
                        "namespace=my-sb-ns" \
                        "messageCount=5" \
  --scale-rule-auth "connection=sb-conn"
```

**Azure Queue Storage (with managed identity):**

```bash
az containerapp create \
  --name my-processor \
  --resource-group my-rg \
  --environment my-env \
  --image myprocessor:latest \
  --user-assigned <IDENTITY_RESOURCE_ID> \
  --min-replicas 0 \
  --max-replicas 15 \
  --scale-rule-name queue-rule \
  --scale-rule-type azure-queue \
  --scale-rule-metadata "accountName=mystorageacct" \
                        "queueName=work-items" \
                        "queueLength=10" \
  --scale-rule-identity <IDENTITY_RESOURCE_ID>
```

### Scale behavior reference

| Parameter | Value |
|-----------|-------|
| Polling interval | 30 seconds |
| Cool down period | 300 seconds (applies only when scaling from 1 to 0) |
| Scale up step | 1, 4, 8, 16, 32, ... up to max replicas |
| Scale down step | 100% of excess replicas removed |
| Algorithm | `desiredReplicas = ceil(currentMetricValue / targetMetricValue)` |

**Important:** If ingress is disabled and no custom scale rule or `minReplicas >= 1` is set, the app scales to zero with no way to restart.

## Revisions and Traffic Splitting

```bash
# Enable multi-revision mode
az containerapp revision set-mode \
  --name my-app \
  --resource-group my-rg \
  --mode multiple

# Deploy a new revision
az containerapp update \
  --name my-app \
  --resource-group my-rg \
  --image myapp:v2

# Split traffic (blue/green or canary)
az containerapp ingress traffic set \
  --name my-app \
  --resource-group my-rg \
  --revision-weight my-app--v1=80 my-app--v2=20

# Promote new revision to 100%
az containerapp ingress traffic set \
  --name my-app \
  --resource-group my-rg \
  --revision-weight my-app--v2=100

# Deactivate old revision
az containerapp revision deactivate \
  --name my-app \
  --resource-group my-rg \
  --revision my-app--v1
```

## Jobs

Jobs are for tasks that run to completion rather than serving traffic.

```bash
# Scheduled job (cron)
az containerapp job create \
  --name nightly-cleanup \
  --resource-group my-rg \
  --environment my-env \
  --image mytools:latest \
  --trigger-type Schedule \
  --cron-expression "0 2 * * *" \
  --replica-timeout 1800 \
  --replica-retry-limit 1 \
  --cpu 0.5 \
  --memory 1.0Gi

# Manual (on-demand) job
az containerapp job create \
  --name data-migration \
  --resource-group my-rg \
  --environment my-env \
  --image mymigration:latest \
  --trigger-type Manual \
  --replica-timeout 3600 \
  --replica-retry-limit 0 \
  --cpu 1.0 \
  --memory 2.0Gi

# Start a manual job execution
az containerapp job start \
  --name data-migration \
  --resource-group my-rg

# Event-driven job (processes queue messages then exits)
az containerapp job create \
  --name queue-processor \
  --resource-group my-rg \
  --environment my-env \
  --image myprocessor:latest \
  --trigger-type Event \
  --min-executions 0 \
  --max-executions 10 \
  --scale-rule-name queue-trigger \
  --scale-rule-type azure-queue \
  --scale-rule-metadata "accountName=mystorage" \
                        "queueName=jobs" \
                        "queueLength=1" \
  --scale-rule-auth "connection=storage-conn" \
  --secrets "storage-conn=<STORAGE_CONNECTION_STRING>"
```

## Secrets Management

```bash
# Add secrets during creation
az containerapp create \
  --name my-app \
  --resource-group my-rg \
  --environment my-env \
  --image myapp:latest \
  --secrets "db-password=<PASSWORD>" "api-key=<KEY>" \
  --env-vars "DB_PASSWORD=secretref:db-password" "API_KEY=secretref:api-key"

# Reference Key Vault secrets (managed identity required)
az containerapp create \
  --name my-app \
  --resource-group my-rg \
  --environment my-env \
  --image myapp:latest \
  --user-assigned <IDENTITY_RESOURCE_ID> \
  --secrets "db-pass=keyvaultref:<KEY_VAULT_SECRET_URI>,identityref:<IDENTITY_RESOURCE_ID>" \
  --env-vars "DB_PASSWORD=secretref:db-pass"
```

## Managed Identity

```bash
# Enable system-assigned identity
az containerapp identity assign \
  --name my-app \
  --resource-group my-rg \
  --system-assigned

# Enable user-assigned identity
az containerapp identity assign \
  --name my-app \
  --resource-group my-rg \
  --user-assigned <IDENTITY_RESOURCE_ID>
```

Use managed identity for:
- Pulling images from ACR (via `--registry-identity`)
- Accessing Key Vault secrets
- Authenticating KEDA scale rules to Azure services
- Connecting to Azure databases without passwords

## Dapr Integration

Enable Dapr sidecars for microservice communication patterns:

```bash
# Enable Dapr on a container app
az containerapp dapr enable \
  --name my-api \
  --resource-group my-rg \
  --dapr-app-id my-api \
  --dapr-app-port 8080 \
  --dapr-app-protocol http

# Create a Dapr component (e.g., state store)
az containerapp env dapr-component set \
  --name my-env \
  --resource-group my-rg \
  --dapr-component-name statestore \
  --yaml dapr-statestore.yaml
```

### Example Dapr component YAML (state store with Cosmos DB)

```yaml
componentType: state.azure.cosmosdb
version: v1
metadata:
  - name: url
    value: "https://myaccount.documents.azure.com:443/"
  - name: database
    value: "mydb"
  - name: collection
    value: "mystate"
  - name: masterKey
    secretRef: cosmos-key
secrets:
  - name: cosmos-key
    value: "<COSMOS_DB_PRIMARY_KEY>"
scopes:
  - my-api
  - my-worker
```

### Supported Dapr building blocks in ACA

| API | Status | Use Case |
|-----|--------|----------|
| Service-to-service invocation | GA | Direct calls between apps with mTLS |
| State management | GA | Key-value CRUD operations |
| Pub/sub | GA | Async messaging via message brokers |
| Bindings | GA | Trigger/output from external systems |
| Actors | GA | Stateful, single-threaded units of work |
| Secrets | GA | Access secrets from Dapr components |
| Configuration | GA | Retrieve/subscribe to config items |

**Tier 1 components** (fully supported):
- **State**: Azure Cosmos DB, Blob Storage, Table Storage, SQL Server
- **Pub/sub**: Azure Service Bus Queues/Topics, Event Hubs
- **Bindings**: Azure Storage Queues, Service Bus Queues, Blob Storage, Event Hubs
- **Secrets**: Azure Key Vault

### Dapr limitations in ACA

- Dapr is **not supported for jobs**
- Actor reminders require `minReplicas >= 1`
- Dapr server extensions, actor SDK, and workflow SDK are not compatible with ACA

## Networking

### VNet integration

```bash
# Create environment with custom VNet
az containerapp env create \
  --name my-env \
  --resource-group my-rg \
  --location eastus \
  --infrastructure-subnet-resource-id <SUBNET_RESOURCE_ID>
```

### Service-to-service communication

Apps in the same environment can reach each other using the app name as hostname:

```
http://<APP_NAME>              # Internal URL (within environment)
https://<APP_NAME>.<ENV_DOMAIN>  # FQDN (if external ingress)
```

## Health Probes

```json
{
  "template": {
    "containers": [{
      "name": "my-app",
      "image": "myapp:latest",
      "probes": [
        {
          "type": "liveness",
          "httpGet": {
            "path": "/healthz",
            "port": 8080
          },
          "initialDelaySeconds": 5,
          "periodSeconds": 10
        },
        {
          "type": "readiness",
          "httpGet": {
            "path": "/ready",
            "port": 8080
          },
          "initialDelaySeconds": 3,
          "periodSeconds": 5
        },
        {
          "type": "startup",
          "httpGet": {
            "path": "/startup",
            "port": 8080
          },
          "initialDelaySeconds": 0,
          "periodSeconds": 1,
          "failureThreshold": 30
        }
      ]
    }]
  }
}
```

## Environment Variables and Resource Limits

```bash
az containerapp update \
  --name my-app \
  --resource-group my-rg \
  --cpu 1.0 \
  --memory 2.0Gi \
  --env-vars "NODE_ENV=production" "LOG_LEVEL=info"
```

| CPU | Memory options |
|-----|----------------|
| 0.25 | 0.5Gi |
| 0.5 | 1.0Gi |
| 0.75 | 1.5Gi |
| 1.0 | 2.0Gi |
| 1.25 | 2.5Gi |
| 1.5 | 3.0Gi |
| 1.75 | 3.5Gi |
| 2.0 | 4.0Gi |

Higher CPU/memory options are available on workload-profile environments (Dedicated plan).

## Monitoring and Logs

```bash
# View app logs (real-time)
az containerapp logs show \
  --name my-app \
  --resource-group my-rg \
  --type console \
  --follow

# View system logs
az containerapp logs show \
  --name my-app \
  --resource-group my-rg \
  --type system

# Query logs via Log Analytics (KQL)
az monitor log-analytics query \
  --workspace <WORKSPACE_ID> \
  --analytics-query "ContainerAppConsoleLogs_CL | where ContainerAppName_s == 'my-app' | where TimeGenerated > ago(1h) | project TimeGenerated, Log_s | order by TimeGenerated desc" \
  --output table
```

## Scenarios

### Deploy a multi-container microservice with Dapr

```bash
# Create environment
az containerapp env create --name prod-env --resource-group my-rg --location eastus

# Deploy API gateway (external)
az containerapp create \
  --name api-gateway \
  --resource-group my-rg \
  --environment prod-env \
  --image myregistry.azurecr.io/gateway:v1 \
  --target-port 8080 \
  --ingress external \
  --min-replicas 2 \
  --max-replicas 20 \
  --scale-rule-name http-scale \
  --scale-rule-type http \
  --scale-rule-http-concurrency 100 \
  --registry-server myregistry.azurecr.io \
  --registry-identity system-environment \
  --dapr-app-id api-gateway \
  --dapr-app-port 8080

# Deploy backend service (internal)
az containerapp create \
  --name order-service \
  --resource-group my-rg \
  --environment prod-env \
  --image myregistry.azurecr.io/orders:v1 \
  --target-port 3000 \
  --ingress internal \
  --min-replicas 1 \
  --max-replicas 10 \
  --registry-server myregistry.azurecr.io \
  --registry-identity system-environment \
  --dapr-app-id order-service \
  --dapr-app-port 3000

# Deploy event-driven worker (no ingress)
az containerapp create \
  --name order-processor \
  --resource-group my-rg \
  --environment prod-env \
  --image myregistry.azurecr.io/processor:v1 \
  --min-replicas 0 \
  --max-replicas 30 \
  --registry-server myregistry.azurecr.io \
  --registry-identity system-environment \
  --secrets "sb-conn=<SERVICE_BUS_CONN>" \
  --scale-rule-name orders-queue \
  --scale-rule-type azure-servicebus \
  --scale-rule-metadata "queueName=new-orders" \
                        "namespace=my-sb" \
                        "messageCount=5" \
  --scale-rule-auth "connection=sb-conn" \
  --dapr-app-id order-processor \
  --dapr-app-port 3000
```

### Blue/green deployment

```bash
# Ensure multi-revision mode
az containerapp revision set-mode --name my-app --resource-group my-rg --mode multiple

# Deploy new version (creates new revision, initial 0% traffic)
az containerapp update \
  --name my-app \
  --resource-group my-rg \
  --image myapp:v2 \
  --revision-suffix v2

# Send 10% canary traffic
az containerapp ingress traffic set \
  --name my-app \
  --resource-group my-rg \
  --revision-weight my-app--v1=90 my-app--v2=10

# Promote after validation
az containerapp ingress traffic set \
  --name my-app \
  --resource-group my-rg \
  --revision-weight my-app--v2=100

# Clean up old revision
az containerapp revision deactivate --name my-app --resource-group my-rg --revision my-app--v1
```

### Deploy from source code (cloud build)

```bash
az containerapp up \
  --name my-app \
  --resource-group my-rg \
  --environment my-env \
  --source . \
  --ingress external \
  --target-port 8080
```

ACA auto-detects the language, builds the container image in the cloud, pushes to a managed registry, and deploys.

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| App stuck at 0 replicas | No ingress + no scale rule + no `minReplicas` | Set `--min-replicas 1` or add a scale rule |
| 404 on requests | Ingress not enabled, or wrong `target-port` | Enable ingress and match `--target-port` to the port your app listens on |
| Container crash loop | App exits immediately | Check logs with `az containerapp logs show --type console`; verify health probes and startup time |
| Slow cold starts | Scale-to-zero + heavy container | Set `--min-replicas 1` or optimize image size |
| Image pull failure | Wrong registry credentials or image tag | Verify registry server, credentials, and image name/tag |
| Inter-service connectivity | Wrong app name or ingress type | Use internal ingress; reference services by app name within environment |
| Revision not receiving traffic | Single-revision mode or no traffic weight | Switch to multi-revision mode; set traffic weights explicitly |
| Scaling not triggering | Incorrect KEDA scaler metadata | Verify `--scale-rule-metadata` values match your Azure resource names |
| Dapr sidecar not starting | Dapr not enabled or port mismatch | Verify `--dapr-app-port` matches actual container port |

## Reference Documentation

- [Azure Container Apps overview](https://learn.microsoft.com/azure/container-apps/overview)
- [Scaling rules](https://learn.microsoft.com/azure/container-apps/scale-app)
- [Dapr integration](https://learn.microsoft.com/azure/container-apps/dapr-overview)
- [Jobs](https://learn.microsoft.com/azure/container-apps/jobs)
- [Networking](https://learn.microsoft.com/azure/container-apps/networking)
- [Health probes](https://learn.microsoft.com/azure/container-apps/health-probes)
- [Managed identity](https://learn.microsoft.com/azure/container-apps/managed-identity)
- [KEDA scalers](https://keda.sh/docs/scalers/)
