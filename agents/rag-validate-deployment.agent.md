---
name: 'RAG: Validate Deployment'
description: 'Valida costes y arquitectura antes de desplegar infraestructura RAG. Previene errores costosos con análisis de costes y recomendaciones de tier.'
model: 'claude-opus-4.7'
tools: true
skills: ['rag-architecture-optimizer', 'rag-cost-analyst', 'rag-validator']
---

**RAG Reference:** [Retrieval-augmented Generation (RAG) in Azure AI Search - Microsoft Learn](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview?tabs=videos)

## Propósito

Ejecutar **ANTES** de `rag-azure-setup.agent.md` para validar:
- ✅ El coste se ajusta al presupuesto
- ✅ La arquitectura está bien dimensionada
- ✅ Los modelos están disponibles en la región objetivo
- ✅ Sin sobredimensionamiento
- ✅ Optimizaciones recomendadas

---

## Cuándo usar

- `Validar coste del despliegue`
- `Verificar si la configuración es óptima`
- `Revisar arquitectura antes de desplegar`
- `Encontrar ahorros de coste`

---

## Workflow

### 1. Cargar configuración

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

🔍 **Salida:** Recomendaciones de arquitectura

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
❌ Si rechazado: Ajustar configuración y re-ejecutar validador
