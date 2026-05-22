---
name: 'RAG: Conversational Chat'
description: 'Multi-turn conversational RAG chat. Maintains context, reformulates questions, enables follow-ups. For conversational document exploration.'
model: 'claude-opus-4.7'
tools: true
skills: ['rag-agent-instrumentation']
---

**RAG Reference:** [Retrieval-augmented Generation (RAG) in Azure AI Search - Microsoft Learn](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview?tabs=videos)

## Purpose

**Multi-turn RAG chat** with context memory. Perfect for:

- Long conversations about documentation
- Follow-up questions ("Why?" → "How do I change?")
- Iterative topic exploration
- Complex question reformulation

## When to Use

```
copilot-cli run .github/agents/rag-chat.agent.md
```

Use this when you need:
- Conversation vs. one-off queries
- Multi-step reasoning
- Persistent context across questions

## workflow

### 1. Inicializa Chat

```
System: Inicializando RAG Chat...
✅ Conectado a Azure Search
✅ Conectado a Azure OpenAI
✅ Índice: rag-builder-index

Eres un asistente de documentación. Ayudarás a usuarios a explorar
políticas, procedimientos, y documentación corporativa mediante búsqueda
semántica. Mantén conversación natural, reformula preguntas complejas,
y sugiere temas relacionados.

Escribe tu pregunta (o 'exit' para salir):
```

### 2. Conversación Multi-Turno

**User:**
```
¿Cuál es la política de retención de datos?
```

**Assistant:**
```
Basado en la documentación, la política de retención es:

📋 Política de Retención de Datos (Encontrado en: retention-policy.pdf)

- **Datos personales**: 3 años después del último acceso
- **Logs de auditoría**: 7 años
- **Backups**: 30 días de retención (con 2 copias)
- **GDPR compliance**: Eliminación segura con certificado

¿Tienes preguntas adicionales? Puedo ayudarte con:
- Excepciones a la política
- Proceso de eliminación de datos
- Cumplimiento regulatorio
```

**User:**
```
¿Cómo solicitar una excepción?
```

**Assistant:**
```
Para solicitar una excepción (encontrado en: data-exceptions.md):

📋 Proceso de Solicitud

1. Completa formulario DPA-001 (disponible en SharePoint)
2. Justifica el motivo (legal, contractual, operacional)
3. Envía a data-governance@empresa.com
4. Tiempo de respuesta: 10 días hábiles

El sistema recordará el contexto de tu pregunta anterior
y mantendrá la conversación fluida.
```

### 3. Características

- **Memoria de Contexto**: Recuerda preguntas anteriores
- **Reformulación**: Interpreta preguntas ambiguas
- **search Semántica**: Extrae documentación relevant
- **Sugerencias Relacionadas**: Propone temas de seguimiento
- **Métricas**: Registra latencia, tokens, coste en AppInsights

### 4. Salir

```
User: exit
Chat guardado en: outputs/chat-history-2026-05-13.json
Tokens totales: 1,240
Coste total: $0.31
Session guardada en AppInsights
```

---

## Arquitectura

```
User Input
    ↓
[Context Manager] → Mantiene histórico de conversación
    ↓
[Query Router] → ¿Reformular? ¿Buscar en índice? ¿Seguimiento?
    ↓
[Search Agent] → Búsqueda semántica en Azure Search
    ↓
[Context Builder] → Recupera documentos relevants + histórico
    ↓
[OpenAI Completion] → Genera respuesta conversacional
    ↓
[Metrics Logger] → AppInsights + local JSON
    ↓
User Response + Suggestions
```

---

## configuration (`.env`)

```
RAG_CHAT_MAX_HISTORY=10         # Mantener últimas 10 interacciones
RAG_CHAT_TIMEOUT=60              # Timeout por turno (segundos)
RAG_CHAT_TOP_K=8                 # Documentos recuperados por búsqueda
RAG_CHAT_TEMPERATURE=0.5         # Creatividad (0.3=factual, 0.7=creativo)
RAG_CHAT_MAX_TOKENS=2000         # Max tokens por respuesta
```

---

## Output

Chat session guardada automáticamente:

```json
{
  "session_id": "chat-20260513-143022",
  "started_at": "2026-05-13T14:30:22Z",
  "messages": [
    {
      "turn": 1,
      "user_query": "¿Cuál es la política de retención?",
      "search_results": 5,
      "assistant_response": "...",
      "tokens_used": 240,
      "latency_ms": 1850
    }
  ],
  "total_tokens": 1240,
  "total_cost_usd": 0.31,
  "duration_seconds": 180
}
```

---

## vs CLI Script

| Aspecto | CLI | Chat |
|---------|-----|------|
| Latencia | 2s | 5s |
| Coste | $0.02 | $0.05 |
| Queries | Puntuales | Conversación |
| Contexto | Stateless | Multi-turno |
| Uso | searches rápidas | Exploración profunda |

**Elige Chat cuando necesites seguimiento y contexto.**
