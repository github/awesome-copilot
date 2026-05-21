---
name: 'RAG: Validate Deployment'
description: 'Validates costs and architecture before deploying RAG infrastructure. Prevents costly errors with cost analysis and tier recommendations.'
model: 'claude-opus-4.7'
tools: true
skills: ['rag-architecture-optimizer', 'rag-cost-analyst', 'rag-validator']
---

**RAG Reference:** [Retrieval-augmented Generation (RAG) in Azure AI Search - Microsoft Learn](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview?tabs=videos)

## Purpose

Run **BEFORE** `rag-azure-setup.agent.md` to validate:
- ✅ Cost fits within budget
- ✅ Architecture is properly sized
- ✅ Models are available in target region
- ✅ No oversizing
- ✅ Recommended optimizations

---

## When to Use

- `Validate deployment cost`
- `Verify if configuration is optimal`
- `Review architecture before deployment`
- `Find cost savings`

---

## workflow

### 1. Cargar configuration

Desde `.env` o input del usuario:
- `AZURE_REGION` (eastus, westus2, swedencentral…)
- `AZURE_SEARCH_TIER` (basic, standard)
- `AZURE_SEARCH_REPLICAS` (1-12)
- `APP_INSIGHTS_RETENTION_DAYS` (30-730)
- `ESTIMATED_QUERIES_MONTHLY` (por defecto: 1,000)
- `BUDGET_USD` (por defecto: 2,000)

### 2. Verificar región → Disponibilidad de modelos

```python
from cost_analyzer import validate_region_models
check = validate_region_models(["gpt-4o", "text-embedding-3-small"], region)
# Si no disponible → sugerir swedencentral / eastus / northeurope
```

### 3. Analizar con Azure Architect

✅ **Verifica:**
- ¿Tier de Search apropiado para volumen de documentos?
- ¿Réplicas bien dimensionadas para QPS?
- ¿Tier de OpenAI suficiente?
- ¿Retención de AppInsights razonable?

🔍 **Output:** Recomendaciones de arquitectura

### 4. Analizar con Cost Analyst

📊 **Calcula:**
- Coste mensual de infraestructura
- Coste mensual estimado de inferencia
- Gasto mensual total
- Optimizaciones disponibles

### 5. Presentar resultados

```
DESGLOSE DE COSTES (Mensual)          ⚠️  Estimaciones en USD (verificar en azure.com/pricing)
─────────────────────────────────────────────────────────────────────
Azure OpenAI (S0, pago por token)    ~$10
  • 1K consultas × ~$0.010/consulta (gpt-4o: $2.50/1M in + $10/1M out)
  • Escala directamente con volumen de consultas

Azure AI Search Standard S1          $295
  • 1 réplica (añadir 2ª para HA: +$295/mes)
  • Semántico: $0 bajo 1K consultas/mes, luego $5/1K

App Insights                           $0
  • Bajo 5 GB/mes gratis

Storage                                $0
  • Bajo 50 GB

TOTAL ACTUAL: ~$305/mes  (1K consultas, 1 réplica, sin HA)
CON HA (2 réplicas): ~$600/mes

Recomendación: Standard S1 requerido para búsqueda vectorial + semántica.
¿Proceder? (S/n)
```

---

## Siguientes pasos

✅ Si aprobado: Ejecutar `rag-azure-setup.agent.md`
❌ Si rechazado: Ajustar configuration y re-ejecutar validador
