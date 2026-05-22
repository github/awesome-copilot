---
name: 'rag-validator'
description: 'Expert RAG validator: verifies that agents, instructions, skills, and RAG implementations comply with Microsoft RAG best practices and repository guidelines.'
applyTo: '**/*.agent.md, **/*.instructions.md, **/SKILL.md, **/*.py'
---

**RAG Reference:** [Retrieval-augmented Generation (RAG) in Azure AI Search - Microsoft Learn](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview?tabs=videos)

**Status:** Production
**Version:** 2.0
**Last Updated:** Mayo 13, 2026

---

## Purpose

Verificación automatizada de compliance para asegurar que este repositorio se mantiene alineado con las mejores prácticas RAG de Microsoft y las convenciones de personalización de agentes/skills.

Este skill valida dos capas:

**Capa 1 — Higiene de estructura del repositorio:**
- Nombrado y frontmatter de agentes/instrucciones/skills
- Archivos de documentación requeridos
- Pureza del catálogo (`.github/agents` contiene solo `.agent.md`)

**Capa 2 — Compliance de calidad RAG (alineado con Microsoft Learn):**
- implementation de search híbrida (keyword + semántica/vectorial)
- configuration de ranking semantic
- Estrategia de chunking para gestión de restricciones de tokens
- Tokenization/vectorization pipeline
- Result limit (top-k) to prevent LLM token overflow
- Index schema completeness (key, content, vector, semantic config)
- Coverage of the 5 RAG challenges in `rag-best-practices.md`

---

## RAG Compliance Dimensions

Based on [Microsoft RAG Guide](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview?tabs=videos), this validator verifies each of the 5 RAG challenge dimensions:

| Challenge | Microsoft Recommendation | Validator Check |
|---|---|---|
| **Query Understanding** | Hybrid queries (keyword + vector) + semantic ranking | `hybrid_search`, `semantic_ranking` |
| **Token Constraints** | Chunking at indexing time, top-k limits at query time | `chunking_strategy`, `token_limits` |
| **Multi-source Data** | Indexers from Azure Blob, SharePoint, databases | `rag_best_practices_content` |
| **Response Time** | Single-shot queries (classic) or parallel subqueries (agentic) | `index_schema` |
| **Security and Governance** | Document-level security trimming, Entra ID filters | `rag_best_practices_content` |

### Agentic Retrieval vs Classic RAG

| Usar retrieval agéntico cuando... | Usar RAG clásico cuando... |
|---|---|
| El client es un agente o chatbot | Se requiresn features solo GA |
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

## When to Use

- Antes de mergear cambios a `.github/agents`, `.github/instructions`, `.github/skills`
- Antes de clonar este baseline en un nuevo proyecto
- Después de modificar scripts de indexing o query, para verify patrones de calidad RAG
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
6. **microsoft_references** — Documents clave incluyen links válidos `https://learn.microsoft.com/...`
7. **rag_reference_coverage** — Todos los agentes/instrucciones/skills enlazan al overview RAG official
8. **naming_conventions** — Agentes siguen `rag-*.agent.md`, instrucciones siguen `agent-rag-*.instructions.md`

### Capa 2: Calidad RAG (Mejores Prácticas Microsoft)

9. **hybrid_search** — Scripts de query usan `search_text` + `query_type="semantic"` o `vector_queries`
10. **semantic_ranking** — `SemanticConfiguration` definida en schema del index y activada en query time
11. **chunking_strategy** — Scripts de indexing dividen documents grandes en chunks
12. **vectorization** — Pipeline genera vector embeddings requeridos para similarity search
13. **token_limits** — Scripts de query configuran límites `top=` o `top_k` para prevenir overflow de tokens LLM
14. **index_schema** — Definición del index incluye campo key, campo content buscable, campo vector y config semántica
15. **rag_best_practices_content** — `rag-best-practices.md` cubre los 5 desafíos RAG de Microsoft

---

## Output

Example de output JSON:

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
      "details": "Scripts de query implementan search híbrida (keyword + semántica/vectorial)"
    },
    {
      "name": "semantic_ranking",
      "status": "pass",
      "details": "Ranking semantic configurado en schema del index y capa de query"
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

Códigos de Output:
- `0` — compliance (sin failures; `--strict` también requires sin warnings)
- `1` — una o más verificaciones fallidas

---

## Patrón de integration

Usar como gate preflight en pipelines de onboarding y revisión:

```bash
python .github/skills/microsoft-guidelines-validator/guidelines_validator.py --root . --strict
```

Si este command falla, corregir los problemas reportados antes de continuar con deployment o clonado.
