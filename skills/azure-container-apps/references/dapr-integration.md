# Dapr Integration Reference

Enable Dapr sidecars for microservice communication patterns.

## Enable Dapr

```bash
az containerapp dapr enable \
  --name my-api \
  --resource-group my-rg \
  --dapr-app-id my-api \
  --dapr-app-port 8080 \
  --dapr-app-protocol http
```

## Create a Dapr Component

```bash
az containerapp env dapr-component set \
  --name my-env \
  --resource-group my-rg \
  --dapr-component-name statestore \
  --yaml dapr-statestore.yaml
```

### Example: Cosmos DB State Store

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

## Supported Building Blocks

| API                           | Status | Use Case                                |
| ----------------------------- | ------ | --------------------------------------- |
| Service-to-service invocation | GA     | Direct calls between apps with mTLS     |
| State management              | GA     | Key-value CRUD operations               |
| Pub/sub                       | GA     | Async messaging via message brokers     |
| Bindings                      | GA     | Trigger/output from external systems    |
| Actors                        | GA     | Stateful, single-threaded units of work |
| Secrets                       | GA     | Access secrets from Dapr components     |
| Configuration                 | GA     | Retrieve/subscribe to config items      |

## Tier 1 Components (Fully Supported)

- **State**: Azure Cosmos DB, Blob Storage, Table Storage, SQL Server
- **Pub/sub**: Azure Service Bus Queues/Topics, Event Hubs
- **Bindings**: Azure Storage Queues, Service Bus Queues, Blob Storage, Event Hubs
- **Secrets**: Azure Key Vault

## Tier 2 Components

- **State**: PostgreSQL, MySQL/MariaDB, Redis
- **Pub/sub**: Apache Kafka, Redis Streams
- **Bindings**: Event Grid, Cosmos DB, Kafka, PostgreSQL, Redis, Cron
- **Configuration**: PostgreSQL, Redis

## Limitations

- Dapr is **not supported for jobs**
- Actor reminders require `minReplicas >= 1`
- Dapr server extensions, actor SDK, and workflow SDK are not compatible with ACA
