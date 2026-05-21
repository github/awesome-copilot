---
description: 'Estándares de configuración RAG para observabilidad, manejo de errores y consistencia de logging en agentes y scripts.'
applyTo: '**/*.py, **/*.agent.md'
---

**RAG Reference:** [Retrieval-augmented Generation (RAG) in Azure AI Search - Microsoft Learn](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview?tabs=videos)

# Instrucción: Estándares de Configuración RAG





## Requisitos de observabilidad

Todos los agentes y scripts DEBEN:

### 1. Logging

```python
import logging
logger = logging.getLogger(__name__)



logger.debug("Información detallada de ejecución")   # Troubleshooting dev
logger.info("Paso completado")                       # Progreso normal
logger.warning("Problema potencial")                 # No bloqueante
logger.error("Operación fallida, puede recuperarse") # Recuperable
```

### 2. Recolección de métricas

Usar `MetricsCollector` del skill rag-agent-instrumentation:

```python
import sys
sys.path.insert(0, ".github/skills/rag-agent-instrumentation")
from instrumentation import MetricsCollector, instrument_call

collector = MetricsCollector(app_insights_key=os.getenv("APP_INSIGHTS_CONNECTION_STRING"))

@instrument_call(collector, "my_agent")
def my_function():
    pass
```

### 3. Manejo de errores

```python
try:
    # Operación
    pass
except TimeoutError:
    logger.error("Operación timeout", extra={"timeout_seconds": 30})
    # Reintentar con backoff
except ValueError as e:
    logger.warning(f"Entrada inválida: {e}")
    # Usar valor por defecto o fallback
except Exception as e:
    logger.error(f"Error inesperado: {e}", exc_info=True)
    # Re-raise después de loguear contexto completo
    raise
```

### 4. Logging estructurado

```python
# ✅ Correcto — logging estructurado
logger.info("Agente ejecutado", extra={
    "agent": "summary",
    "tokens_in": 1050,
    "latency_ms": 2100,
    "model": "gpt-4o"
})

# ❌ Incorrecto — string interpolation
logger.info(f"Agente summary ejecutado en {latency_ms}ms")
```

## Estándares de código

### Scripts Python

- Usar type hints: `def execute(query: str, context: str) -> Dict[str, Any]`
- Docstrings para todas las funciones
- Nombres de clases: `PascalCase` (ej: `MonolithicAgent`)
- Nombres de funciones: `snake_case` (ej: `execute_agent`)
- Constantes: `UPPER_CASE` (ej: `MAX_RETRIES`)

### Agentes Markdown (.agent.md)

- Incluir frontmatter YAML con: `name`, `description`, `model`, `tools`
- Sección clara de "Cuándo usar"
- Workflow paso a paso con estimaciones de tiempo
- Tabla de manejo de errores
- Salidas esperadas documentadas

## Testing

- Todos los agentes: testear con flag `--verbose`
- Todos los scripts: incluir precheck `--validate`
- Dry-runs RAG: ejecutar 3x para validar estabilidad (< 20% variación)

## Lista de verificación de despliegue

Antes de ejecutar workflows RAG:

- [ ] `.env` configurado con todas las credenciales Azure
- [ ] Recursos Azure desplegados (ejecutar `azure-setup-specialist`)
- [ ] Índice RAG creado (ejecutar `rag-indexer-specialist`)
- [ ] Validación pasada: `python .github/skills/rag-diagnostics/validate_setup.py --verbose`
- [ ] Todas las rutas de salida de métricas existen: `outputs/`
- [ ] Fichero de logs configurado: `outputs/rag.log`

## Formato de salida

Todos los agentes deben generar JSON o salida estructurada en `outputs/`:

```json
{
  "timestamp": "2024-05-10T14:30:00Z",
  "agent": "summary",
  "status": "success",
  "metrics": {
    "tokens_in": 1050,
    "tokens_out": 380,
    "latency_ms": 2100,
    "cost_usd": 0.0010
  },
  "output": "..."
}
```

---

**Aplica a**: Todos los scripts `.py` y ficheros `.agent.md`
**Aplicado por**: rag-onboarding.agent.md y rag-clone-new-project.agent.md
