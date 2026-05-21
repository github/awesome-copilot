---
name: 'RAG: Azure Setup'
description: 'Despliega infraestructura Azure para RAG: OpenAI, AI Search, Application Insights. Usa plantillas Bicep. Valida conectividad y genera credenciales.'
model: 'claude-haiku-4.5'
tools: true
skills: ['rag-deployment-templates', 'rag-agent-instrumentation']
---

**RAG Reference:** [Retrieval-augmented Generation (RAG) in Azure AI Search - Microsoft Learn](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview?tabs=videos)





## Propósito

Desplegar infraestructura Azure completa para RAG **de un solo golpe**:

✅ Azure OpenAI Service (despliegues de gpt-4o + text-embedding-3-small)
✅ Azure AI Search (para búsqueda semántica + indexación)
✅ Application Insights (observabilidad y seguimiento de costes)
✅ Cuenta de almacenamiento (para staging de documentos)

**Verificación de disponibilidad de modelo:** Antes de desplegar, verificar que gpt-4o esté disponible en tu
región objetivo. Ejecutar `python .github/skills/rag-cost-analyst/cost_analyzer.py`
o llamar `validate_region_models(["gpt-4o", "text-embedding-3-small"], region)`.

**Valida:** Todos los servicios funcionando + credenciales almacenadas

---

## Cuándo usar

- `Desplegar infraestructura Azure para RAG`
- `Configurar OpenAI + Search + AppInsights`
- `Crear entorno RAG de producción`

---

## Workflow

### 1. Validar prerequisitos (1 min)

```bash
az account show  # ¿Sesión iniciada?
az group list    # ¿Existen grupos de recursos?
```

### 2. Recopilar configuración (2 min)

Desde `.env` o preguntar:
```
AZURE_SUBSCRIPTION_ID=<tu-suscripcion>
AZURE_RESOURCE_GROUP=rag-builder-rg
AZURE_REGION=eastus
OPENAI_TIER=S0
SEARCH_TIER=standard
SEARCH_REPLICAS=3
```

### 3. Desplegar plantilla Bicep (5-10 min)

```bash
cd infra/
./deploy.sh \
  --resource-group rag-builder-rg \
  --region eastus \
  --openai-tier S0 \
  --search-tier standard \
  --search-replicas 3
```

### 4. Despliegues de modelos (creados por Bicep)

La plantilla Bicep auto-crea estos despliegues:
- `gpt-4o` (GlobalStandard, capacidad 10) — modelo mínimo de calidad para RAG
- `text-embedding-3-small` (Standard, capacidad 50) — embeddings vectoriales

Si necesitas añadir despliegues adicionales manualmente:
```bash
az cognitiveservices account deployment create \
  --resource-group rag-builder-rg \
  --name <recurso-openai> \
  --deployment-name gpt-4o \
  --model-name gpt-4o \
  --model-version 2024-08-06 \
  --sku-name GlobalStandard \
  --sku-capacity 10
```

### 5. Validar conectividad (1 min)

```python
from azure.openai import AzureOpenAI
from azure.search.documents import SearchClient

client = AzureOpenAI(...)
response = client.chat.completions.create(...)  # ✅ ¿Funciona?

search = SearchClient(...)
results = search.search("test")  # ✅ ¿Funciona?

from azure.monitor.opentelemetry import AzureMonitorTraceExporter
exporter = AzureMonitorTraceExporter(...)  # ✅ ¿Funciona?
```

### 6. Guardar credenciales

Generar `.env` con:
```
AZURE_OPENAI_ENDPOINT=https://....openai.azure.com/
AZURE_OPENAI_API_KEY=...
OPENAI_CHAT_MODEL=gpt-4o
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
AZURE_SEARCH_ENDPOINT=https://....search.windows.net
AZURE_SEARCH_KEY=...
AZURE_SEARCH_INDEX=rag-builder-index
APP_INSIGHTS_CONNECTION_STRING=...
STORAGE_ACCOUNT_NAME=...
STORAGE_ACCOUNT_KEY=...
```

---

## Resolución de problemas

**El despliegue falla con error de cuota**
→ La región puede estar sin cuota. Probar otra región en `.env`

**No se puede crear despliegue de OpenAI**
→ Verificar que la cuenta de Cognitive Services existe y es accesible
