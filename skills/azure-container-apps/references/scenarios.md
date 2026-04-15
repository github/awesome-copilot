# Scenarios & Advanced Patterns

## Container Apps Jobs

Jobs execute tasks that run to completion and exit.

### Scheduled Job (Cron)

```bash
az containerapp job create \
  --name my-scheduled-job \
  --resource-group my-rg \
  --environment my-env \
  --image myregistry.azurecr.io/my-job:latest \
  --trigger-type Schedule \
  --cron-expression "0 */6 * * *" \
  --cpu 0.25 --memory 0.5Gi \
  --replica-timeout 1800 \
  --replica-retry-limit 1
```

### Manual Job

```bash
az containerapp job create \
  --name my-manual-job \
  --resource-group my-rg \
  --environment my-env \
  --image myregistry.azurecr.io/my-job:latest \
  --trigger-type Manual \
  --cpu 0.5 --memory 1.0Gi \
  --replica-timeout 3600 \
  --replica-retry-limit 2

# Start a manual execution
az containerapp job start --name my-manual-job --resource-group my-rg
```

### Event-Driven Job (KEDA)

```bash
az containerapp job create \
  --name my-event-job \
  --resource-group my-rg \
  --environment my-env \
  --image myregistry.azurecr.io/my-processor:latest \
  --trigger-type Event \
  --cpu 0.5 --memory 1.0Gi \
  --replica-timeout 600 \
  --replica-retry-limit 1 \
  --min-executions 0 \
  --max-executions 10 \
  --scale-rule-name queue-trigger \
  --scale-rule-type azure-queue \
  --scale-rule-metadata "queueName=work-items" "queueLength=5" "connectionFromEnv=QUEUE_CONN" \
  --scale-rule-auth "connection=queue-connection" \
  --secrets "queue-connection=<QUEUE_CONNECTION_STRING>"
```

## Revisions & Traffic Splitting

### Create a New Revision

```bash
az containerapp update \
  --name my-app \
  --resource-group my-rg \
  --image myregistry.azurecr.io/my-app:v2 \
  --revision-suffix v2
```

### Split Traffic (Blue/Green & Canary)

```bash
# 80/20 canary split
az containerapp ingress traffic set \
  --name my-app \
  --resource-group my-rg \
  --revision-weight my-app--v1=80 my-app--v2=20

# Full cutover
az containerapp ingress traffic set \
  --name my-app \
  --resource-group my-rg \
  --revision-weight my-app--v2=100

# Rollback
az containerapp ingress traffic set \
  --name my-app \
  --resource-group my-rg \
  --revision-weight my-app--v1=100
```

### Revision Labels

```bash
az containerapp revision label add \
  --name my-app \
  --resource-group my-rg \
  --label blue --revision my-app--v1

# Access labeled revision: my-app---blue.<env-domain>
```

## Multi-Container Microservice Deployment

```bash
# Deploy frontend
az containerapp create \
  --name frontend \
  --resource-group my-rg \
  --environment my-env \
  --image myregistry.azurecr.io/frontend:latest \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 --max-replicas 5

# Deploy backend API (internal ingress)
az containerapp create \
  --name backend-api \
  --resource-group my-rg \
  --environment my-env \
  --image myregistry.azurecr.io/api:latest \
  --target-port 8080 \
  --ingress internal \
  --min-replicas 1 --max-replicas 10 \
  --env-vars "DATABASE_URL=secretref:db-url" \
  --secrets "db-url=<CONNECTION_STRING>"

# Frontend reaches backend at: http://backend-api
```

## Deploy from Source Code

```bash
az containerapp up \
  --name my-app \
  --resource-group my-rg \
  --environment my-env \
  --source . \
  --ingress external --target-port 8080
```

Supported runtimes: Python, Node.js, .NET, Java, Go.

## Health Probes

```json
{
  "containers": [
    {
      "probes": [
        {
          "type": "liveness",
          "httpGet": { "path": "/healthz", "port": 8080 },
          "initialDelaySeconds": 10,
          "periodSeconds": 30,
          "failureThreshold": 3
        },
        {
          "type": "readiness",
          "httpGet": { "path": "/ready", "port": 8080 },
          "initialDelaySeconds": 5,
          "periodSeconds": 10
        },
        {
          "type": "startup",
          "httpGet": { "path": "/startup", "port": 8080 },
          "initialDelaySeconds": 0,
          "periodSeconds": 5,
          "failureThreshold": 30
        }
      ]
    }
  ]
}
```

## Resource Configuration

| vCPU | Memory Options | Profile                              |
| ---- | -------------- | ------------------------------------ |
| 0.25 | 0.5 Gi         | Lightweight APIs, background workers |
| 0.5  | 1.0 Gi         | Standard web apps                    |
| 1.0  | 2.0 Gi         | Moderate workloads                   |
| 2.0  | 4.0 Gi         | Heavy processing                     |
| 4.0  | 8.0 Gi         | Maximum (Consumption plan)           |

Dedicated workload profiles allow up to 16 vCPU / 32 GiB per container (D-series, E-series).
