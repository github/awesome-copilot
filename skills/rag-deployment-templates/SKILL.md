---
name: 'rag-deployment-templates'
description: 'Plantillas Bicep IaC para desplegar Azure OpenAI, AI Search y Application Insights. Reutilizables en cualquier proyecto RAG. Incluye main.bicep y orquestación deploy.sh.'
---

**RAG Reference:** [Retrieval-augmented Generation (RAG) in Azure AI Search - Microsoft Learn](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview?tabs=videos)

**Estado:** Producción
**Versión:** 1.0
**Assets incluidos:** `main.bicep`, `deploy.sh`, `deployer.py`, `indexer_runner.py`, `document_indexer.py`

## Propósito

Plantillas Infrastructure-as-Code y orquestación de despliegue para stack Azure completo:
- Azure Cognitive Services (OpenAI) con múltiples deployments de modelos
- Azure AI Search (tier Standard para vector search)
- Application Insights + Log Analytics
- Indexación de documentos y runners de despliegue
- Todo configurado, vinculado y automatizado

## Uso

```bash
# Mínima (Basic Search, 30d logs, LRS)
cd infra/
az deployment group create \
  --resource-group rag-rg \
  --template-file main.bicep \
  --parameters searchTier=basic searchReplicaCount=1 searchPartitionCount=1 \
               storageRedundancy=Standard_LRS logRetentionDays=30

# Estándar (Standard Search, 2 replicas, 90d logs)
az deployment group create \
  --resource-group rag-rg \
  --template-file main.bicep \
  --parameters searchTier=standard searchReplicaCount=2 searchPartitionCount=1 \
               storageRedundancy=Standard_LRS logRetentionDays=90

# Máxima (Standard Search, 3 replicas, 2 partitions, ZRS, 1 year logs)
az deployment group create \
  --resource-group rag-rg \
  --template-file main.bicep \
  --parameters searchTier=standard searchReplicaCount=3 searchPartitionCount=2 \
               storageRedundancy=Standard_ZRS logRetentionDays=365
```

## Recursos Desplegados

- `Azure OpenAI Service` (tier S0, pago por token)
  - Deployments: **gpt-4o** (GlobalStandard, capacidad 10), **text-embedding-3-small** (Standard, capacidad 50)
  - Nota: `gpt-4o-mini` **no** se despliega (por debajo de barra de calidad para RAG)
  - Disponibilidad de modelos varía por región — verificar con `cost_analyzer.check_model_availability()`

- `Azure AI Search` (Basic o Standard, configurable)
  - Basic: $25/mes — suficiente para PoC/Mínima (soporta indexers incluyendo SharePoint)
  - Standard S1: $295/mes por réplica — para volumen de producción
  - Vector + búsqueda semántica habilitada
  - Índice: `rag-documents`

- `Storage Account` (LRS o ZRS, configurable)
  - Blob container: `documents`
  - Tier de acceso Hot

- `Application Insights` + `Log Analytics`
  - Tier PerGB2018, 5 GB/mes ingestión gratis
  - Retención: 30/90/365 días (configurable)

## Estimación de Coste por Tier

> Todos los precios son estimaciones en USD. Verificar en https://azure.microsoft.com/en-us/pricing/calculator/

**Mínima (Basic Search, 1 réplica, LRS, 30d logs):**
- OpenAI (pago por token): ~$5-10/mes
- Search Basic: $25/mes
- Storage LRS: ~$1/mes
- App Insights: $0 (bajo 5GB gratis)
- **Total: ~$30-35/mes**

**Estándar (Standard Search, 2 réplicas, LRS, 90d logs):**
- OpenAI: ~$50-100/mes
- Search Standard (2 réplicas): $590/mes
- Storage LRS: ~$2/mes
- App Insights: ~$5/mes
- **Total: ~$650-700/mes**

**Máxima (Standard Search, 3 réplicas + 2 particiones, ZRS, 365d logs):**
- OpenAI: ~$200-500/mes
- Search Standard (3R + 2P = 6 unidades): $1,770/mes
- Storage ZRS: ~$3/mes
- App Insights: ~$15/mes
- **Total: ~$2,000-2,300/mes**

Ver `rag-cost-analyst/SKILL.md` para desglose completo.

## Limpieza

```bash
az group delete --name rag-rg --yes --no-wait
```
