---
name: azure-container-apps
description: 'Guide for building, deploying, scaling, and troubleshooting Azure Container Apps. Use when creating container apps, configuring ingress, setting up scaling rules, enabling Dapr sidecars, deploying container images, creating jobs, configuring custom domains, managing revisions, traffic splitting, or troubleshooting ACA workloads.'
---

# Azure Container Apps

Azure Container Apps (ACA) is a serverless container platform for microservices, APIs, background jobs, and event-driven workloads.

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Environment** | Shared boundary — apps share a VNet, logging, and Dapr config |
| **Container App** | Deployable unit with containers, ingress, scaling rules, and secrets |
| **Revision** | Immutable snapshot created when template properties change |
| **Replica** | Running instance of a revision; controlled by scaling rules |
| **Job** | Runs to completion (scheduled, manual, or event-driven) |

## Prerequisites

```bash
az extension add --name containerapp --upgrade
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights
```

## Workflow

Follow these numbered steps to deploy a container app:

### Step 1: Create an Environment

```bash
az containerapp env create \
  --name my-env \
  --resource-group my-rg \
  --location eastus
```

For VNet integration, add `--infrastructure-subnet-resource-id <SUBNET_ID>`.

### Step 2: Create the Container App

```bash
az containerapp create \
  --name my-app \
  --resource-group my-rg \
  --environment my-env \
  --image myregistry.azurecr.io/myapp:latest \
  --target-port 8080 \
  --ingress external \
  --registry-server myregistry.azurecr.io \
  --registry-identity system-environment \
  --min-replicas 1 \
  --max-replicas 10 \
  --cpu 0.5 --memory 1.0Gi \
  --env-vars "APP_ENV=production"
```

Use `--registry-identity system-environment` for managed-identity-based ACR pulls (recommended over credentials).

**Quick alternative** — single command that creates everything:

```bash
az containerapp up \
  --name my-app \
  --resource-group my-rg \
  --environment my-env \
  --image mcr.microsoft.com/k8se/quickstart:latest \
  --target-port 80 --ingress external
```

### Step 3: Configure Ingress

| Flag | Purpose |
|------|---------|
| `--ingress external` | Internet-accessible + within environment |
| `--ingress internal` | Within environment only (service-to-service) |
| `--target-port` | Port the container listens on |
| `--transport auto` | Auto-detect HTTP/1.1 or HTTP/2 (default) |
| `--transport http2` | Force HTTP/2 |
| `--transport tcp` | TCP-only (no HTTP features) |

```bash
az containerapp ingress enable \
  --name my-app --resource-group my-rg \
  --type external --target-port 8080 --transport auto
```

**Custom domain:**

```bash
az containerapp hostname add --name my-app --resource-group my-rg --hostname api.example.com
az containerapp hostname bind --name my-app --resource-group my-rg \
  --hostname api.example.com --environment my-env --validation-method CNAME
```

### Step 4: Add Scaling Rules

ACA uses KEDA for autoscaling. Default: 0-10 replicas with HTTP scaling.

**HTTP scaling:**

```bash
az containerapp create \
  --name my-app --resource-group my-rg --environment my-env \
  --image myapp:latest \
  --min-replicas 0 --max-replicas 20 \
  --scale-rule-name http-rule --scale-rule-type http \
  --scale-rule-http-concurrency 50
```

**Event-driven scaling (Service Bus):**

```bash
az containerapp create \
  --name my-worker --resource-group my-rg --environment my-env \
  --image myworker:latest \
  --min-replicas 0 --max-replicas 30 \
  --secrets "sb-conn=<SERVICE_BUS_CONNECTION_STRING>" \
  --scale-rule-name sb-rule --scale-rule-type azure-servicebus \
  --scale-rule-metadata "queueName=orders" "namespace=my-sb-ns" "messageCount=5" \
  --scale-rule-auth "connection=sb-conn"
```

> **Important:** If ingress is disabled and no scale rule or `minReplicas >= 1` is set, the app scales to zero permanently.

See `references/scaling-rules.md` for TCP scaling, Queue Storage with managed identity, and scale behavior details.

### Step 5: Configure Secrets and Identity

```bash
# Inline secrets
az containerapp create --name my-app --resource-group my-rg --environment my-env \
  --image myapp:latest \
  --secrets "db-password=<PASSWORD>" "api-key=<KEY>" \
  --env-vars "DB_PASSWORD=secretref:db-password" "API_KEY=secretref:api-key"

# Key Vault reference (requires managed identity)
az containerapp create --name my-app --resource-group my-rg --environment my-env \
  --image myapp:latest --user-assigned <IDENTITY_RESOURCE_ID> \
  --secrets "db-pass=keyvaultref:<KV_SECRET_URI>,identityref:<IDENTITY_RESOURCE_ID>" \
  --env-vars "DB_PASSWORD=secretref:db-pass"
```

**Enable managed identity:**

```bash
az containerapp identity assign --name my-app --resource-group my-rg --system-assigned
```

Use managed identity for: ACR pulls (`--registry-identity`), Key Vault secrets, KEDA auth, passwordless DB connections.

### Step 6: Monitor and Troubleshoot

```bash
# Real-time console logs
az containerapp logs show --name my-app --resource-group my-rg --type console --follow

# System logs
az containerapp logs show --name my-app --resource-group my-rg --type system

# KQL query
az monitor log-analytics query --workspace <WORKSPACE_ID> \
  --analytics-query "ContainerAppConsoleLogs_CL | where ContainerAppName_s == 'my-app' | where TimeGenerated > ago(1h) | project TimeGenerated, Log_s | order by TimeGenerated desc" \
  --output table
```

## Revisions and Traffic Splitting

```bash
# Enable multi-revision mode
az containerapp revision set-mode --name my-app --resource-group my-rg --mode multiple

# Deploy new revision
az containerapp update --name my-app --resource-group my-rg --image myapp:v2

# Canary traffic split
az containerapp ingress traffic set --name my-app --resource-group my-rg \
  --revision-weight my-app--v1=80 my-app--v2=20

# Full cutover
az containerapp ingress traffic set --name my-app --resource-group my-rg \
  --revision-weight my-app--v2=100

# Deactivate old revision
az containerapp revision deactivate --name my-app --resource-group my-rg --revision my-app--v1
```

See `references/scenarios.md` for blue/green deployment patterns and revision labels.

## Dapr Integration

Enable Dapr sidecars for microservice communication:

```bash
az containerapp dapr enable \
  --name my-api --resource-group my-rg \
  --dapr-app-id my-api --dapr-app-port 8080 --dapr-app-protocol http
```

Key facts:
- Dapr is **not supported for jobs**; actor reminders require `minReplicas >= 1`
- Apps communicate via Dapr service invocation with automatic mTLS
- Tier 1 components (fully supported): Cosmos DB, Service Bus, Event Hubs, Key Vault, Blob Storage

See `references/dapr-integration.md` for component YAML examples, building blocks table, and component tiers.

## Jobs

Jobs run to completion rather than serving traffic. Three trigger types:

```bash
# Scheduled (cron)
az containerapp job create --name nightly-job --resource-group my-rg --environment my-env \
  --image mytools:latest --trigger-type Schedule --cron-expression "0 2 * * *" \
  --replica-timeout 1800 --cpu 0.5 --memory 1.0Gi

# Manual
az containerapp job create --name migration --resource-group my-rg --environment my-env \
  --image mymigration:latest --trigger-type Manual --replica-timeout 3600
az containerapp job start --name migration --resource-group my-rg

# Event-driven
az containerapp job create --name processor --resource-group my-rg --environment my-env \
  --image myprocessor:latest --trigger-type Event \
  --min-executions 0 --max-executions 10 \
  --scale-rule-name queue-trigger --scale-rule-type azure-queue \
  --scale-rule-metadata "accountName=mystorage" "queueName=jobs" "queueLength=1" \
  --scale-rule-auth "connection=storage-conn" --secrets "storage-conn=<CONN_STRING>"
```

See `references/scenarios.md` for full job examples and multi-container deployment patterns.

## Networking

```bash
# VNet-integrated environment
az containerapp env create --name my-env --resource-group my-rg --location eastus \
  --infrastructure-subnet-resource-id <SUBNET_RESOURCE_ID>
```

Service-to-service: apps in the same environment reach each other at `http://<APP_NAME>`.

## Resource Limits

| CPU | Memory | Profile |
|-----|--------|---------|
| 0.25 | 0.5Gi | Lightweight APIs |
| 0.5 | 1.0Gi | Standard web apps |
| 1.0 | 2.0Gi | Moderate workloads |
| 2.0 | 4.0Gi | Heavy processing |

Workload-profile environments support up to 16 vCPU / 32 GiB (D-series, E-series).

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| App stuck at 0 replicas | No ingress + no scale rule + no `minReplicas` | Set `--min-replicas 1` or add a scale rule |
| 404 on requests | Ingress not enabled or wrong `target-port` | Enable ingress; match `--target-port` to app port |
| Container crash loop | App exits immediately | Check `az containerapp logs show --type console`; verify probes |
| Slow cold starts | Scale-to-zero + heavy image | Set `--min-replicas 1` or optimize image size |
| Image pull failure | Wrong registry/credentials/tag | Verify registry server, credentials, image name |
| Inter-service connectivity | Wrong app name or ingress type | Use internal ingress; reference by app name |
| Revision not receiving traffic | Single-revision mode | Switch to multi-revision mode; set traffic weights |
| Scaling not triggering | Wrong KEDA metadata | Verify `--scale-rule-metadata` matches resource names |
| Dapr sidecar not starting | Dapr disabled or port mismatch | Check `--dapr-app-port` matches container port |

## Reference Documentation

- [Azure Container Apps overview](https://learn.microsoft.com/azure/container-apps/overview)
- [Scaling rules](https://learn.microsoft.com/azure/container-apps/scale-app)
- [Dapr integration](https://learn.microsoft.com/azure/container-apps/dapr-overview)
- [Jobs](https://learn.microsoft.com/azure/container-apps/jobs)
- [Networking](https://learn.microsoft.com/azure/container-apps/networking)
- [Health probes](https://learn.microsoft.com/azure/container-apps/health-probes)
- [Managed identity](https://learn.microsoft.com/azure/container-apps/managed-identity)
- [KEDA scalers](https://keda.sh/docs/scalers/)
