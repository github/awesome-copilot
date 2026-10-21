# Azure Service Names Reference

The `serviceName` field in the Azure Retail Prices API is **case-sensitive**. Use this reference to find the exact service name to use in filters.

## Compute

| Service | `serviceName` Value |
|---------|-------------------|
| Virtual Machines | `Virtual Machines` |
| Azure Functions | `Functions` |
| Azure App Service | `Azure App Service` |
| Azure Container Apps | `Azure Container Apps` |
| Azure Container Instances | `Container Instances` |
| Azure Kubernetes Service | `Azure Kubernetes Service` |
| Azure Batch | `Azure Batch` |
| Azure Spring Apps | `Azure Spring Apps` |
| Azure VMware Solution | `Azure VMware Solution` |

## Storage

| Service | `serviceName` Value |
|---------|-------------------|
| Azure Storage (Blob, Files, Queues, Tables) | `Storage` |
| Azure NetApp Files | `Azure NetApp Files` |
| Azure Backup | `Backup` |
| Azure Data Box | `Data Box` |

> **Note**: Blob Storage, Files, Disk Storage, and Data Lake Storage are all under the single `Storage` service name. Use `meterName` or `productName` to distinguish between them (e.g., `contains(meterName, 'Blob')`).

## Databases

| Service | `serviceName` Value |
|---------|-------------------|
| Azure Cosmos DB | `Azure Cosmos DB` |
| Azure SQL Database | `SQL Database` |
| Azure SQL Managed Instance | `SQL Managed Instance` |
| Azure Database for PostgreSQL | `Azure Database for PostgreSQL` |
| Azure Database for MySQL | `Azure Database for MySQL` |
| Azure Cache for Redis | `Redis Cache` |

## AI + Machine Learning

| Service | `serviceName` Value |
|---------|-------------------|
| Azure AI Foundry Models (incl. OpenAI) | `Foundry Models` |
| Azure AI Foundry Tools | `Foundry Tools` |
| Azure Machine Learning | `Azure Machine Learning` |
| Azure Cognitive Search (AI Search) | `Azure Cognitive Search` |
| Azure Bot Service | `Azure Bot Service` |

> **Note**: Azure OpenAI pricing is now under `Foundry Models`. Use `contains(productName, 'OpenAI')` or `contains(meterName, 'GPT')` to filter for OpenAI-specific models.

## Networking

| Service | `serviceName` Value |
|---------|-------------------|
| Azure Load Balancer | `Load Balancer` |
| Azure Application Gateway | `Application Gateway` |
| Azure Front Door | `Azure Front Door Service` |
| Azure CDN | `Azure CDN` |
| Azure DNS | `Azure DNS` |
| Azure Virtual Network | `Virtual Network` |
| Azure VPN Gateway | `VPN Gateway` |
| Azure ExpressRoute | `ExpressRoute` |
| Azure Firewall | `Azure Firewall` |

## Analytics

| Service | `serviceName` Value |
|---------|-------------------|
| Azure Synapse Analytics | `Azure Synapse Analytics` |
| Azure Data Factory | `Azure Data Factory v2` |
| Azure Stream Analytics | `Azure Stream Analytics` |
| Azure Databricks | `Azure Databricks` |
| Azure Event Hubs | `Event Hubs` |

## Integration

| Service | `serviceName` Value |
|---------|-------------------|
| Azure Service Bus | `Service Bus` |
| Azure Logic Apps | `Logic Apps` |
| Azure API Management | `API Management` |
| Azure Event Grid | `Event Grid` |

## Management & Monitoring

| Service | `serviceName` Value |
|---------|-------------------|
| Azure Monitor | `Azure Monitor` |
| Azure Log Analytics | `Log Analytics` |
| Azure Key Vault | `Key Vault` |
| Azure Backup | `Backup` |

## Web

| Service | `serviceName` Value |
|---------|-------------------|
| Azure Static Web Apps | `Azure Static Web Apps` |
| Azure SignalR | `Azure SignalR Service` |

## Tips

- If you're unsure about a service name, **filter by `serviceFamily` first** to discover valid `serviceName` values in the response.
- Example: `serviceFamily eq 'Databases' and armRegionName eq 'eastus'` will return all database service names.
- Some services have multiple `serviceName` entries for different tiers or generations.
