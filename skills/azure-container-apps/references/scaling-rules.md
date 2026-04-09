# Scaling Rules Reference

ACA uses KEDA (Kubernetes Event-driven Autoscaling) for scale decisions. Default: 0–10 replicas with HTTP scaling.

## HTTP Scaling

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

## TCP Scaling

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

## Custom Scaling (Event-Driven)

Use any KEDA-supported scaler. Common examples:

### Azure Service Bus Queue

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

### Azure Queue Storage (Managed Identity)

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

## Scale Behavior

| Parameter        | Value                                                            |
| ---------------- | ---------------------------------------------------------------- |
| Polling interval | 30 seconds                                                       |
| Cool down period | 300 seconds (applies only when scaling from 1 to 0)              |
| Scale up step    | 1, 4, 8, 16, 32, ... up to max replicas                          |
| Scale down step  | 100% of excess replicas removed                                  |
| Algorithm        | `desiredReplicas = ceil(currentMetricValue / targetMetricValue)` |

**Important:** If ingress is disabled and no custom scale rule or `minReplicas >= 1` is set, the app scales to zero with no way to restart.
