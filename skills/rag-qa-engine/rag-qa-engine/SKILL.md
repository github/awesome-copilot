---
name: 'rag-qa-engine'
description: 'Interactive conversational RAG query engine for Q&A over documents'
applyTo: '**/*.agent.md'
---

**RAG Reference:** [Retrieval-augmented Generation (RAG) in Azure AI Search - Microsoft Learn](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview?tabs=videos)

**Status:** Production
**Version:** 1.0
**Last Updated:** May 13, 2026

---

## Purpose

Provides an interactive conversational interface for querying documents via RAG. Users ask questions in natural language and receive answers from their indexed knowledge base with source attribution.

This skill:
- **Interactive Loop**: Chat-like interface for multi-turn conversations
- **Source Attribution**: Shows source documents and confidence scores
- **Token Tracking**: Monitors Azure OpenAI token usage per query
- **Error Handling**: Graceful handling of Azure service issues
- **UTF-8 Support**: Cross-platform chat (Windows, Linux, Mac)
- **Extensible**: Easy to inject real Azure OpenAI/Search APIs

---

## Use Cases

### When to use this skill

- **Document Q&A**: Users asking about indexed documentation
- **Interactive Validation**: PoC/validation of RAG capabilities
- **Knowledge Base Chat**: Company wiki, procedure manuals, runbooks
- **Multi-turn Conversations**: Follow-up questions, context preservation
- **Integration**: API wrapper for web/mobile chat interfaces

### When NOT to use

- Batch/non-interactive queries (use REST API)
- Real-time streaming responses (different implementation)
- Non-text queries (images, audio)

---

## Uso en Python

### Como Módulo Invocable

```python
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent / ".github" / "skills" / "rag-qa-engine"))

from chat_engine import RAGChatEngine

engine = RAGChatEngine(
    azure_openai_endpoint="https://myapp-openai.openai.azure.com/",
    azure_search_endpoint="https://myapp-search.search.windows.net/"
)

engine.connect()

response = engine.query("What is the procedure for X?")
print(response["answer"])
print(response["sources"])

exit_code = engine.run_interactive()
```

### Como CLI Independiente

```bash
python .github/skills/rag-qa-engine/chat_engine.py

python run-rag.py --agent chat
```

---

## Input

### Parámetros del Constructor

| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| `azure_openai_endpoint` | str | Endpoint del servicio OpenAI | `https://app-openai.openai.azure.com/` |
| `azure_search_endpoint` | str | Endpoint de AI Search | `https://app-search.search.windows.net/` |

### Método Query

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `question` | str | Pregunta en lenguaje natural |

---

## Output

### Respuesta de Query Individual

```python
{
    "answer": "str - Respuesta generada por RAG",
    "sources": [
        {
            "title": "str - Nombre del documento",
            "confidence": "float - 0.0-1.0"
        }
    ],
    "tokens_used": "int - Tokens OpenAI consumidos"
}
```

### Modo Interactivo

Loop de Q&A en tiempo real con:
- Prompts de usuario: `You: [pregunta]`
- Respuestas RAG con fuentes
- Seguimiento de uso de tokens
- Comandos de salida: `quit`, `exit`, `salir`

---

## Arquitectura

### Flujo de Query

```
Input del Usuario
    ↓
[Análisis de Pregunta]
    ↓
[Búsqueda Semántica] → Encontrar docs relevantes en Azure Search
    ↓
[Preparación de Contexto] → Formatear top-K docs como contexto
    ↓
[Llamada gpt-4o] → Generar respuesta con contexto
    ↓
[Atribución de Fuentes] → Devolver fuentes + confianza
    ↓
Mostrar al Usuario
```

---

## Configuración

### Servicios Azure Requeridos

1. **Azure OpenAI Service**
   - Modelo: gpt-4o
   - API Version: 2024-08-01
   - Nombre del deployment: configurado en `.env`

2. **Azure AI Search**
   - Tier: Standard o superior
   - Vector search habilitado
   - Semantic ranking habilitado

### Variables de Entorno

```bash
AZURE_OPENAI_ENDPOINT=https://[resource]-openai.openai.azure.com/
AZURE_OPENAI_API_KEY=<key>
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o

AZURE_SEARCH_ENDPOINT=https://[resource]-search.search.windows.net/
AZURE_SEARCH_API_KEY=<key>
```

---

## Comandos del Chat

| Comando | Efecto |
|---------|--------|
| `quit` | Finalizar sesión |
| `exit` | Finalizar sesión |
| `salir` | Finalizar sesión |
| `Ctrl+C` | Interrumpir |
| línea vacía | Saltar, continuar prompt |

---

## Formato de Respuesta

### Respuesta Exitosa

```
You: What are the procedures for X?

RAG: Based on your documentation, the procedures for X include...

Sources:
  • procedures.docx (confidence: 0.95)
  • manual_chapter_3.pdf (confidence: 0.87)

Tokens used: 342
```

### Respuesta de Error

```
You: [pregunta]

Error: Failed to connect to Azure Search

[Continúa solicitando]
```

---

## Gestión de Sesión

### Seguimiento de Sesión

- Timestamp de inicio (para auditoría)
- Conteo de queries
- Tokens totales usados
- Documentos accedidos

Registrado en:
- Salida de consola (tiempo real)
- `outputs/rag-chat.log` (si logging de archivo habilitado)

---

## Extensibilidad

### Añadir Integración Azure Real

Reemplazar el mock engine con llamadas reales a Azure OpenAI y Azure Search usando las credenciales del `.env`.
