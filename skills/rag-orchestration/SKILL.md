---
name: 'rag-orchestration'
description: 'Complete automated RAG setup orchestrator in 8 phases for new projects'
applyTo: '**/*.agent.md'
---

**RAG Reference:** [Retrieval-augmented Generation (RAG) in Azure AI Search - Microsoft Learn](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview?tabs=videos)

**Estado:** Producción
**Versión:** 1.0
**Última actualización:** Mayo 13, 2026

---

## Purpose

Orquestador de automatización completa para setup RAG (Retrieval Augmented Generation). Lleva al usuario desde "Tengo documentos" a "Puedo consultar mi RAG" en 8 fases con cero interacción manual en Azure portal.

Este skill:
- **Automatización 8 Phases**: Entrevista -> Recomendar -> Validar -> deploy -> index -> Configurar -> Probar -> Resumen
- **Dirigido por configuration**: Auto-selecciona tiers de infraestructura basado en tamaño de documentos
- **Consciente de Costes**: Valida presupuesto antes del deployment, previene errores costosos
- **Auto-Descubrimiento de Documentos**: Escanea carpeta `knowledge/` e indexa todos los formatos (PDF, Word, Excel, Markdown, Código, PowerPoint)
- **Generación de credentials**: Auto-crea `.env` con templates de endpoints Azure
- **Logging de Sesión**: Guarda logs de orquestación en JSON para auditoría

---

## Casos de Uso

### When to Use este skill

- **Nuevo Proyecto RAG**: Empezando desde cero con archivos de documentación
- **Setup Primera Vez**: Escenario "Tengo docs, que funcione"
- **Onboarding Automatizado**: Necesita proceso de setup repetible y sin intervención
- **Múltiples Proyectos**: Puede ejecutarse para diferentes fuentes de conocimiento (siguiente proyecto solo cambia carpeta `knowledge/`)
- **validation/PoC**: validation rápida de que RAG funciona antes de inversión en producción

### Cuándo NO usar

- Despliegues existentes que necesitan actualizaciones (usar skills de Phase individual)
- Escenarios multi-tenant complejos
- Configuraciones Azure altamente personalizadas

---

## workflow de 8 Phases

### Phase 1: Entrevista (5 min)
- Recolecta 5 preguntas: nombre proyecto, descripción, tamaño docs, presupuesto, región
- **Output**: Dict de configuration del usuario

### Phase 2: Recomendar (1 min)
- Auto-selecciona config de tier Azure basado en tamaño de documentos
- **Output**: Recomendaciones de infraestructura (tier OpenAI, tier Search, estimación de coste)

### Phase 3: Validar (2 min)
- Llama al skill `rag-cost-analyst` para validar presupuesto vs coste real
- Verifica cuotas Azure en región objetivo
- **Output**: Decisión Go/No-go con warnings

### Phase 4: deploy (10-15 min)
- Despliega via plantillas Bicep (o el coordinador puede inyectar lógica de deployment personalizada)
- **Output**: Endpoints de recursos (OpenAI, Search, AppInsights)

### Phase 5: index (5 min)
- Escanea carpeta `knowledge/` (pdfs, procedimientos, codigo, presentaciones)
- Cuenta documentos y mock-chunks (300 tokens, 50 overlap)
- **Output**: Inventario de documentos

### Phase 6: Configurar (1 min)
- Genera archivo `.env` con templates de credentials
- **Output**: `.env` listo para que el usuario rellene credentials

### Phase 7: Probar (2 min)
- Mock-tests de conexiones a Azure OpenAI, Search, AppInsights
- **Output**: Informe de validation de conexiones

### Phase 8: Resumen (1 min)
- Muestra resumen de setup completo
- Guarda log de sesión en JSON para auditoría
- **Output**: Instrucciones de próximos pasos

---

## Uso en Python

```python
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent / ".github" / "skills" / "rag-orchestration"))

from orchestrator import RAGOrchestrator

orchestrator = RAGOrchestrator()
exit_code = orchestrator.run()
```

### Ejecución Directa

```bash
python .github/skills/rag-orchestration/orchestrator.py

python run-rag.py --agent onboarding
```
