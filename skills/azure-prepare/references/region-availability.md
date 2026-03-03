# Azure Region Availability Index

> **AUTHORITATIVE SOURCE** — Consult service-specific files BEFORE recommending any region.
>
> Official reference: https://azure.microsoft.com/en-us/explore/global-infrastructure/products-by-region/table

## How to Use

1. Check if your architecture includes any **limited availability** services below
2. If yes → consult the service-specific file and only offer regions that support ALL services
3. If all services are "available everywhere" → offer common regions

---

## Services with LIMITED Region Availability

| Service | Availability | Details |
|---------|--------------|---------|
| Static Web Apps | Limited (5 regions) | [Region Details](services/static-web-apps/region-availability.md) |
| Azure AI Foundry | Very limited (by model) | [Region Details](services/foundry/region-availability.md) |

---

## Services Available in Most Regions

These services are available in all major Azure regions — no special consideration needed:

- Container Apps
- Azure Functions
- App Service
- Azure SQL Database
- Cosmos DB
- Key Vault
- Storage Account
- Service Bus
- Event Grid
- Application Insights / Log Analytics


