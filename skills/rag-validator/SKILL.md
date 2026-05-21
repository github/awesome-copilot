---
name: 'rag-validator'
description: 'Validador experto RAG: verifica que agentes, instrucciones, skills e implementación RAG cumplen con mejores prácticas Microsoft RAG y directrices del repositorio.'
applyTo: '**/*.agent.md, **/*.instructions.md, **/SKILL.md, **/*.py'
---

**RAG Reference:** [Retrieval-augmented Generation (RAG) in Azure AI Search - Microsoft Learn](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview?tabs=videos)

**Estado:** Producción
**Versión:** 2.0
**Última actualización:** Mayo 13, 2026

---

## Propósito

Verificación automatizada de cumplimiento para asegurar que este repositorio se mantiene alineado con las mejores prácticas RAG de Microsoft y las convenciones de personalización de agentes/skills.

Este skill valida dos capas:

**Capa 1 — Higiene de estructura del repositorio:**
- Nombrado y frontmatter de agentes/instrucciones/skills
- Archivos de documentación requeridos
- Pureza del catálogo (`.github/agents` contiene solo `.agent.md`)

**Capa 2 — Cumplimiento de calidad RAG (alineado con Microsoft Learn):**
- Implementación de búsqueda híbrida (keyword + semántica/vectorial)
- Configuración de ranking semántico
- Estrategia de chunking para gestión de restricciones de tokens
- Pipeline de vectorización
- Límite de resultados (top-k) para prevenir overflow de tokens LLM
- Completitud del schema del índice (key, content, vector, semantic config)
- Cobertura de los 5 desafíos RAG en `rag-best-practices.md`

---

## Dimensiones de Cumplimiento RAG

Basado en [guía RAG de Microsoft](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview?tabs=videos), este validador verifica cada una de las 5 dimensiones de desafíos RAG:

| Desafío | Recomendación Microsoft | Verificación del Validador |
|---|---|---|
| **Comprensión de consulta** | Queries híbridas (keyword + vector) + ranking semántico | `hybrid_search`, `semantic_ranking` |
| **Restricciones de tokens** | Chunking en tiempo de indexación, límites top-k en tiempo de query | `chunking_strategy`, `token_limits` |
| **Datos multi-fuente** | Indexers desde Azure Blob, SharePoint, bases de datos | `rag_best_practices_content` |
| **Tiempo de respuesta** | Queries single-shot (clásico) o subqueries paralelas (agéntico) | `index_schema` |
| **Seguridad y gobernanza** | Security trimming a nivel de documento, filtros Entra ID | `rag_best_practices_content` |

### Retrieval Agéntico vs RAG Clásico

| Usar retrieval agéntico cuando... | Usar RAG clásico cuando... |
|---|---|
| El cliente es un agente o chatbot | Se requieren features solo GA |
| Se necesita máxima relevancia y precisión | Simplicidad y velocidad son prioridad |
| Queries complejas o conversacionales | Código de orquestación existente a preservar |
| Se necesitan respuestas estructuradas con citas | Se necesita control fino del pipeline |
| Construyendo nuevas implementaciones RAG | |

Referencias:
- [Agentic retrieval overview](https://learn.microsoft.com/en-us/azure/search/agentic-retrieval-overview)
- [Classic RAG sample](https://github.com/Azure-Samples/azure-search-classic-rag)
- [Hybrid search](https://learn.microsoft.com/en-us/azure/search/hybrid-search-overview)
- [Semantic ranking](https://learn.microsoft.com/en-us/azure/search/semantic-ranking)
- [Security trimming](https://learn.microsoft.com/en-us/azure/search/search-security-built-in)
- [Agentic knowledge sources](https://learn.microsoft.com/en-us/azure/search/agentic-knowledge-source-overview)

---

## Cuándo usar

- Antes de mergear cambios a `.github/agents`, `.github/instructions`, `.github/skills`
- Antes de clonar este baseline en un nuevo proyecto
- Después de modificar scripts de indexación o query, para verificar patrones de calidad RAG
- Durante QA/revisión para prevenir drift estructural

No usar este skill como health check runtime para recursos Azure.

---

## Uso

```bash
# Validación estándar
python .github/skills/microsoft-guidelines-validator/guidelines_validator.py --root .

# Output JSON (para integración CI)
python .github/skills/microsoft-guidelines-validator/guidelines_validator.py --root . --json

# Modo estricto: warnings se convierten en failures
python .github/skills/microsoft-guidelines-validator/guidelines_validator.py --root . --strict
```

---

## Verificaciones Realizadas

### Capa 1: Estructura del Repositorio

1. **required_files** — `.github/README.md`, `rag-best-practices.md`, archivos de template
2. **agents_folder** — `.github/agents` contiene solo archivos `*.agent.md`
3. **agent_frontmatter** — Campos requeridos: `name`, `description`, `model`, `tools`, `skills`
4. **instruction_pairing** — Cada `rag-*.agent.md` tiene un `agent-rag-*.instructions.md` correspondiente
5. **skill_frontmatter** — Archivos `SKILL.md` contienen al menos `name` y `description`
6. **microsoft_references** — Documentos clave incluyen links válidos `https://learn.microsoft.com/...`
7. **rag_reference_coverage** — Todos los agentes/instrucciones/skills enlazan al overview RAG oficial
8. **naming_conventions** — Agentes siguen `rag-*.agent.md`, instrucciones siguen `agent-rag-*.instructions.md`

### Capa 2: Calidad RAG (Mejores Prácticas Microsoft)

9. **hybrid_search** — Scripts de query usan `search_text` + `query_type="semantic"` o `vector_queries`
10. **semantic_ranking** — `SemanticConfiguration` definida en schema del índice y activada en query time
11. **chunking_strategy** — Scripts de indexación dividen documentos grandes en chunks
12. **vectorization** — Pipeline genera vector embeddings requeridos para similarity search
13. **token_limits** — Scripts de query configuran límites `top=` o `top_k` para prevenir overflow de tokens LLM
14. **index_schema** — Definición del índice incluye campo key, campo content buscable, campo vector y config semántica
15. **rag_best_practices_content** — `rag-best-practices.md` cubre los 5 desafíos RAG de Microsoft

---

## Output

Ejemplo de output JSON:

```json
{
  "summary": {
    "passed": 14,
    "warnings": 1,
    "failed": 0,
    "compliant": true
  },
  "checks": [
    {
      "name": "hybrid_search",
      "status": "pass",
      "details": "Scripts de query implementan búsqueda híbrida (keyword + semántica/vectorial)"
    },
    {
      "name": "semantic_ranking",
      "status": "pass",
      "details": "Ranking semántico configurado en schema del índice y capa de query"
    },
    {
      "name": "chunking_strategy",
      "status": "pass",
      "details": "Patrones de chunking detectados (chunk, chunk_size, overlap)"
    },
    {
      "name": "token_limits",
      "status": "pass",
      "details": "Límites de resultado (top-k) configurados — previene overflow de tokens LLM"
    }
  ]
}
```

Códigos de salida:
- `0` — cumplimiento (sin failures; `--strict` también requiere sin warnings)
- `1` — una o más verificaciones fallidas

---

## Patrón de Integración

Usar como gate preflight en pipelines de onboarding y revisión:

```bash
python .github/skills/microsoft-guidelines-validator/guidelines_validator.py --root . --strict
```

Si este comando falla, corregir los problemas reportados antes de continuar con despliegue o clonado.
