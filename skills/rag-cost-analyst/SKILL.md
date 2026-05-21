---
name: 'rag-cost-analyst'
description: 'Análisis exhaustivo de costes Azure, previsiones y recomendaciones de optimization. Analiza costes de infraestructura, costes de inferencia de modelos, e identifica oportunidades de ahorro.'
---

**RAG Reference:** [Retrieval-augmented Generation (RAG) in Azure AI Search - Microsoft Learn](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview?tabs=videos)

**Estado:** Producción
**Versión:** 1.0
**Módulos:** `cost_analyzer.py`, `validator.py`

## Purpose

Análisis de costes y optimization pre y post-deployment. Valida configuration contra presupuesto antes del deployment, luego calcula costes reales vs esperados y recomienda acciones específicas para reducir gasto mensual sin sacrificar fiabilidad.

## When to Use

- Después del deployment para validar que costes coincidan con presupuesto
- Revisiones mensuales de coste
- Al identificar oportunidades de optimization
- Antes de escalar a producción

## Componentes de Coste Analizados

> Todos los precios son estimaciones en USD. Verificar en https://azure.microsoft.com/en-us/pricing/calculator/

### 1. Azure OpenAI — Pago por Token (sin cuota mensual fija)

| Modelo | Input ($/1M tokens) | Output ($/1M tokens) | Uso |
|---|---|---|---|
| **gpt-4o** | $2.50 | $10.00 | Barra mínima de calidad para RAG |
| **o3-mini** | $1.10 | $4.40 | Tareas intensivas en razonamiento |
| **text-embedding-3-small** | $0.02 | — | embeddings por defecto |
| **text-embedding-3-large** | $0.13 | — | embeddings alta precisión |

> `gpt-4o-mini` **no** está soportado (por debajo del umbral de calidad para RAG)
> Disponibilidad de modelos varía por región — ver `cost_analyzer.check_model_availability()`.

### 2. Azure AI Search (por réplica al mes)

| Tier | Coste/réplica | Storage | search semántica |
|---|---|---|---|
| **Free** | $0 | <=50 MB | No |
| **Basic** | $82 | <=2 GB | No |
| **Standard S1** | $295 | <=25 GB | Sí |
| **Standard S2** | $590 | <=100 GB | Sí |

Add-on de search semántica: **1,000 queries gratis/mes**, luego **$5 por 1,000 queries**.

### 3. Application Insights

- **5 GB/mes gratis**
- Después **$2.30/GB** ingestión
- Uso típico RAG: <1 GB/mes -> efectivamente $0

### 4. Storage (Blob, para documentos)
- ~**$0.018/GB/mes** (tier Hot, LRS)

## Costes Típicos (números reales)

### Escenario A: PoC / Herramienta interna (1,000 queries/mes, 5 GB docs)
```
OpenAI (gpt-4o):           ~$10/mes  (2K input + 500 output tokens/query)
Embeddings (una vez):      ~$1      (one-time, al indexar)
Search Standard S1 x1:     $295/mes
Búsqueda semántica:        $0      (bajo 1K queries gratis)
App Insights:              $0      (bajo 5GB gratis)
Storage (5GB):             $0.09/mes
--------------------------------------
TOTAL:                     ~$305/mes
```

### Escenario B: Producción (100,000 queries/mes, 25 GB docs)
```
OpenAI (gpt-4o):           ~$1,000/mes  (100K x $0.01/query avg)
Embeddings (incremental):  ~$5/mes
Search Standard S1 x2 HA:  $590/mes
Búsqueda semántica:        $495/mes     ((100K-1K)/1K x $5)
App Insights:              ~$10/mes
Storage (25GB):            $0.45/mes
--------------------------------------
TOTAL:                     ~$2,100/mes
```

## Módulos

- **`cost_analyzer.py`** — core: disponibilidad de modelos por región (live + estática), precios por token, validation de presupuesto
- **`azure_cost_analyst.py`** — análisis: recomendaciones de optimization, previsiones, scoring de costes
- **`validator.py`** — wrapper de punto de entrada público

## Uso

```python
from cost_analyzer import validate_deployment

result = validate_deployment(
    doc_size_str="medium",
    budget_usd=2000,
    region="eastus",
    ha_required_str="standard",
    semantic_search=True,
    estimated_docs_gb=5.0,
    estimated_queries_monthly=1000,
    openai_model="gpt-4o",
)

# result incluye: region_check, cost_estimate, budget_check, warnings, recommendations
```

## Palancas de optimization

| Acción | Esfuerzo | Ahorro | Riesgo |
|---|---|---|---|
| Bajar a Standard S1 desde S2 (si docs <25GB) | 5 min | $295/mes por réplica | Bajo |
| Desactivar search semántica (pierde ~30% precisión) | 5 min | $5/1K queries | Medio (calidad) |
| Eliminar 2ª réplica (pierde HA) | 5 min | $295/mes | Alto (sin failover) |
