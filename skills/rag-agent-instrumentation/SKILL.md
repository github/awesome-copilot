---
name: 'rag-agent-instrumentation'
description: 'Módulos Python reutilizables para instrumentar agentes: recolección de métricas, integración con Application Insights, logging con observabilidad. Usado por todos los agentes para capturar tokens, latencia, coste, errores.'
---

**RAG Reference:** [Retrieval-augmented Generation (RAG) in Azure AI Search - Microsoft Learn](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview?tabs=videos)

**Assets incluidos**: `instrumentation.py`, `metrics_collector.py`

## Propósito

Proporcionar utilidades Python reutilizables para instrumentar cualquier agente con:
- Seguimiento de consumo de tokens
- Medición de latencia
- Cálculo de coste
- Integración con Application Insights
- Logging estructurado

## Uso

Importar en cualquier agente o script:

```python
import sys
sys.path.insert(0, ".github/skills/rag-agent-instrumentation")
from instrumentation import MetricsCollector, instrument_call

collector = MetricsCollector(
    app_insights_key=os.getenv("APP_INSIGHTS_CONNECTION_STRING")
)

@instrument_call(collector, "my_agent")
def my_agent_function():
    # Captura automáticamente timing, tokens, errores
    pass
```

## Funciones Exportadas

- `MetricsCollector` — Clase principal para recolectar métricas
- `instrument_call()` — Decorador para auto-instrumentación
- `calculate_token_cost()` — Calculador de precios por modelo
- `log_to_app_insights()` — Enviar eventos personalizados

## Usado por

- `rag-onboarding.agent.md`
- `rag-validate-deployment.agent.md`
- `rag-azure-setup.agent.md`
- `rag-indexer-specialist.agent.md`
- `rag-chat.agent.md`
- `rag-clone-new-project.agent.md`
- Cualquier agente personalizado que necesite observabilidad
