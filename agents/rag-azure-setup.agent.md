---
name: 'RAG: Azure Setup'
description: 'Deploys Azure infrastructure for RAG: OpenAI, AI Search, Application Insights. Uses Bicep templates. Validates connectivity and generates credentials.'
model: 'claude-haiku-4.5'
tools: true
skills: ['rag-deployment-templates', 'rag-agent-instrumentation']
---

**RAG Reference:** [Retrieval-augmented Generation (RAG) in Azure AI Search - Microsoft Learn](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview?tabs=videos)





## Purpose

Deploy complete Azure infrastructure for RAG **in one go**:

✅ Azure OpenAI Service (deployments of gpt-4o + text-embedding-3-small)
✅ Azure AI Search (for semantic search + indexing)
✅ Application Insights (observability and cost tracking)
✅ Storage Account (for document staging)

**Model availability verification:** Before deployment, verify that gpt-4o is available in your
target region. Run `python .github/skills/rag-cost-analyst/cost_analyzer.py`
or call `validate_region_models(["gpt-4o", "text-embedding-3-small"], region)`.

**Validates:** All services running + credentials stored

---

## When to Use

- `Deploy Azure infrastructure for RAG`
- `Configure OpenAI + Search + AppInsights`
- `Create production RAG environment`

---

## workflow

### 1. Validate Prerequisites (1 min)

```bash
az account show  # Logged in?
az group list    # Resource groups exist?
```

### 2. Collect configuration (2 min)

From `.env` or prompt:
```
AZURE_SUBSCRIPTION_ID=<your-subscription>
AZURE_RESOURCE_GROUP=rag-builder-rg
AZURE_REGION=eastus
OPENAI_TIER=S0
SEARCH_TIER=standard
SEARCH_REPLICAS=3
```

### 3. Deploy Bicep template (5-10 min)

```bash
cd infra/
./deploy.sh \
  --resource-group rag-builder-rg \
  --region eastus \
  --openai-tier S0 \
  --search-tier standard \
  --search-replicas 3
```

### 4. Model Deployments (created by Bicep)

The Bicep template auto-creates these deployments:
- `gpt-4o` (GlobalStandard, capacity 10) — minimum quality model for RAG
- `text-embedding-3-small` (Standard, capacity 50) — vector embeddings

If you need to add additional deployments manually:
```bash
az cognitiveservices account deployment create \
  --resource-group rag-builder-rg \
  --name <openai-resource> \
  --deployment-name gpt-4o \
  --model-name gpt-4o \
  --model-version 2024-08-06 \
  --sku-name GlobalStandard \
  --sku-capacity 10
```

### 5. Validate connectivity (1 min)

```python
from azure.openai import AzureOpenAI
from azure.search.documents import SearchClient

client = AzureOpenAI(...)
response = client.chat.completions.create(...)  # ✅ Working?

search = SearchClient(...)
results = search.search("test")  # ✅ Working?

from azure.monitor.opentelemetry import AzureMonitorTraceExporter
exporter = AzureMonitorTraceExporter(...)  # ✅ Working?
```

### 6. Store credentials

Generate `.env` with:
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

## Troubleshooting

**Deployment fails with quota error**
→ Region may have no quota. Try another region in `.env`

**Cannot create OpenAI deployment**
→ Verify that the Cognitive Services account exists and is accessible
