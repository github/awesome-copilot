---
name: 'rag-qa-engine'
description: 'Interactive conversational RAG query engine for Q&A over documents'
applyTo: '**/*.agent.md'
---

**RAG Reference:** [Retrieval-augmented Generation (RAG) in Azure AI Search - Microsoft Learn](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview?tabs=videos)

**Estado:** Producción
**Versión:** 1.0
**Última actualización:** Mayo 13, 2026

---

## Propósito

Proporciona interfaz conversacional interactiva para consultar documentos via RAG. Los usuarios hacen preguntas en lenguaje natural y reciben respuestas de su base de conocimiento indexada con atribución de fuentes.

Este skill:
- **Loop Interactivo**: Interfaz tipo chat para conversaciones multi-turno
- **Atribución de Fuentes**: Muestra documentos fuente y puntuaciones de confianza
- **Seguimiento de Tokens**: Monitoriza uso de tokens OpenAI por consulta
- **Manejo de Errores**: Gestión elegante de problemas con servicios Azure
- **Soporte UTF-8**: Chat multiplataforma (Windows, Linux, Mac)
- **Extensible**: Fácil de inyectar APIs reales de Azure OpenAI/Search

---

## Casos de Uso

### Cuándo usar este skill

- **Q&A de Documentos**: Usuarios preguntando sobre documentación indexada
- **Validación Interactiva**: PoC/validación de capacidades RAG
- **Chat Base de Conocimiento**: Wiki empresa, manuales de procedimientos, runbooks
- **Conversaciones Multi-turno**: Preguntas de seguimiento, preservación de contexto
- **Integración**: Wrapper API para interfaces web/móvil de chat

### Cuándo NO usar

- Consultas batch/no interactivas (usar REST API)
- Respuestas en streaming real-time (implementación diferente)
- Consultas no textuales (imágenes, audio)

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
