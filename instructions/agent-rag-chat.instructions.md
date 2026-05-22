---
description: 'Multi-turn conversational RAG with context memory and interactive mode'
applyTo: 'rag-chat.agent.md'
---

**RAG Reference:** [Retrieval-augmented Generation (RAG) in Azure AI Search - Microsoft Learn](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview?tabs=videos)




**Purpose:** RAG conversacional multi-turno con memoria de contexto. Modo interactivo.

**Entrada del usuario:** `copilot-cli run .github/agents/rag-chat.agent.md`

**Duración esperada:** Continua (el usuario decide cuándo salir)

---

## ✅ Checklist del Modo Chat

- [ ] Cargar history de conversación (si existe)
- [ ] Mostrar mensaje de bienvenida
- [ ] Entrar en bucle de chat (leer entrada del usuario)
- [ ] Para cada mensaje:
  - [ ] Buscar documentos
  - [ ] Generar respuesta con contexto
  - [ ] Mostrar respuesta + fuentes
  - [ ] Guardar en history
- [ ] Permitir cambio de contexto ("reset", "export", "quit")
- [ ] Guardar sesión final en outputs/

---

## Inicialización de Sesión (1 min)

```python
import os
import json
from datetime import datetime
from pathlib import Path



session_id = datetime.now().strftime("%Y%m%d-%H%M%S")
session_file = f"outputs/chat-history-{session_id}.json"



conversation = {
    "session_id": session_id,
    "start_time": datetime.now().isoformat(),
    "turns": [],
    "stats": {
        "total_questions": 0,
        "total_tokens": 0,
        "total_cost": 0.0,
        "average_latency_ms": 0
    }
}

print(f"""
🤖 RAG Chat Iniciado (Sesión: {session_id})

Commands:
  • /history    - Mostrar history de conversación
  • /reset      - Limpiar contexto de conversación
  • /export     - Guardar sesión
  • /help       - Mostrar ayuda
  • /quit       - Salir

Escribe tu pregunta o Command:
""")
```

---

## Bucle de Chat (Continuo)

```python
import time

while True:
    # Leer entrada del usuario
    user_input = input("\n> ").strip()
    
    if not user_input:
        continue
    
    # Manejar Commands
    if user_input.lower() == "/quit":
        break
    elif user_input.lower() == "/history":
        show_history(conversation)
        continue
    elif user_input.lower() == "/reset":
        conversation["turns"] = []
        print("✅ Contexto de conversación reiniciado")
        continue
    elif user_input.lower() == "/export":
        save_session(conversation, session_file)
        continue
    elif user_input.lower() == "/help":
        show_help()
        continue
    
    # Procesar consulta
    print("\n⏳ Buscando documentos...")
    start_time = time.time()
    
    # 1. Buscar documentos con contexto de turnos anteriores
    query = reformulate_with_context(user_input, conversation["turns"])
    search_results = search_rag(query, top_k=5)
    search_latency = (time.time() - start_time) * 1000
    
    print(f"   Se encontraron {len(search_results)} documentos relevantes ({search_latency:.0f}ms)")
    
    # 2. Generar respuesta con contexto
    print("⏳ Generando respuesta...")
    start_time = time.time()
    
    response, tokens_used, citations = generate_response_with_context(
        user_query=user_input,
        search_results=search_results,
        conversation_history=conversation["turns"][-5:]  # Últimos 5 turnos para contexto
    )
    
    inference_latency = (time.time() - start_time) * 1000
    
    # 3. Mostrar respuesta
    print(f"""
🔍 Respuesta:
{response}

📚 Fuentes:
""")
    for i, citation in enumerate(citations, 1):
        print(f"   {i}. {citation['file']} (p. {citation.get('page', '?')})")
    
    print(f"\n⏱️  Latencia: {search_latency:.0f}ms (búsqueda) + {inference_latency:.0f}ms (inferencia) = {search_latency + inference_latency:.0f}ms total")
    print(f"💰 Coste: ${tokens_used * 0.0001:.4f}")
    
    # 4. Guardar turno en history
    turn = {
        "turn_number": len(conversation["turns"]) + 1,
        "user_query": user_input,
        "reformulated_query": query,
        "ai_response": response,
        "citations": citations,
        "tokens_used": tokens_used,
        "search_latency_ms": search_latency,
        "inference_latency_ms": inference_latency,
        "timestamp": datetime.now().isoformat()
    }
    
    conversation["turns"].append(turn)
    
    # 5. Actualizar estadísticas
    conversation["stats"]["total_questions"] += 1
    conversation["stats"]["total_tokens"] += tokens_used
    conversation["stats"]["total_cost"] += tokens_used * 0.0001
    
    # Auto-guardar cada 5 turnos
    if conversation["stats"]["total_questions"] % 5 == 0:
        save_session(conversation, session_file)
        print(f"💾 Sesión auto-guardada (turno {conversation['stats']['total_questions']})")
```

---

## Función: Reformular con Contexto

**Reescritura inteligente de consultas usando turnos anteriores:**

```python
def reformulate_with_context(user_query, history):
    """
    Reformula la consulta del usuario para incluir contexto implícito de turnos anteriores.
    
    Ejemplo:
    Turno 1: Q: "¿Cómo despliego el sistema?"
    Turno 2: Q: "¿Y si falla?"
    → Reformulado: "¿Qué pasa si falla el despliegue del sistema?"
    """
    
    if not history:
        return user_query  # Primera pregunta, sin contexto
    
    # Obtener pregunta + respuesta anterior
    last_turn = history[-1]
    previous_context = f"""
Previous question: {last_turn['user_query']}
Previous answer: {last_turn['ai_response'][:200]}...
Current question: {user_query}
"""
    
    # Usar LLM para reformular
    from azure.openai import AzureOpenAI
    client = AzureOpenAI()
    
    reformulation_prompt = f"""Given the conversation context, rewrite the user's question to be standalone and include all necessary context.

{previous_context}

Rewritten standalone question:"""
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": reformulation_prompt}],
        max_tokens=100,
        temperature=0.0  # Determinístico
    )
    
    reformulated = response.choices[0].message.content.strip()
    return reformulated
```

---

## Función: search RAG

```python
from azure.search.documents import SearchClient

def search_rag(query, top_k=5):
    """
    Búsqueda híbrida: semántica + palabras clave
    """
    from azure.search.documents.models import QueryType, QueryCaptionType
    
    search_client = SearchClient(
        endpoint=os.getenv("AZURE_SEARCH_ENDPOINT"),
        index_name="rag-documents",
        credential=AzureKeyCredential(os.getenv("AZURE_SEARCH_API_KEY"))
    )
    
    # Búsqueda híbrida (semántica + palabras clave)
    results = search_client.search(
        search_text=query,
        query_type=QueryType.SEMANTIC,
        query_language="es",  # Español
        top=top_k,
        query_caption=QueryCaptionType.EXTRACTIVE,
        search_fields=["content"],
        select=["content", "file", "file_type", "chunk_num", "source_url"]
    )
    
    return list(results)
```

---

## Función: Generar Respuesta con Contexto

```python
def generate_response_with_context(user_query, search_results, conversation_history):
    """
    Genera respuesta usando:
    1. Documentos recuperados
    2. Turnos anteriores de conversación
    """
    
    from azure.openai import AzureOpenAI
    
    client = AzureOpenAI(
        api_key=os.getenv("AZURE_OPENAI_API_KEY"),
        api_version="2024-05-01-preview",
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
    )
    
    # Construir contexto
    document_context = "\n\n".join([
        f"Document: {r.get('file', 'unknown')}\nContent:\n{r.get('content', '')}"
        for r in search_results[:5]
    ])
    
    conversation_context = "\n".join([
        f"Q{i+1}: {turn['user_query']}\nA{i+1}: {turn['ai_response'][:100]}..."
        for i, turn in enumerate(conversation_history[-3:])  # Últimos 3 turnos
    ])
    
    # Preparar prompt
    system_prompt = """You are an expert RAG assistant. 
    
Use the provided documents to answer questions accurately.
If information is not in documents, say "I don't find this info in the documents."
Always cite your sources.
Keep answers concise and professional.
Maintain conversation context for follow-up questions.

Language: Respond in Spanish unless user asks otherwise.
"""
    
    user_prompt = f"""Based on these documents and previous conversation:

DOCUMENTS:
{document_context}

PREVIOUS CONVERSATION:
{conversation_context if conversation_context else "(First question)"}

USER QUESTION:
{user_query}

Provide a clear, concise answer with specific citations."""
    
    # Llamar al LLM
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.7,
        max_tokens=1000,
        top_p=0.95
    )
    
    # Extraer respuesta y tokens
    answer = response.choices[0].message.content
    tokens_used = response.usage.total_tokens
    
    # Extraer citas de la respuesta
    citations = [
        {
            "file": r.get("file", "unknown"),
            "file_type": r.get("file_type", "unknown"),
            "chunk_num": r.get("chunk_num", 0),
            "page": r.get("page", "?")
        }
        for r in search_results[:3]
    ]
    
    return answer, tokens_used, citations
```

---

## Command: Mostrar history

```python
def show_history(conversation):
    """Muestra el history de conversación"""
    if not conversation["turns"]:
        print("Aún no hay history de conversación.")
        return
    
    print(f"\n📜 history de Conversación ({len(conversation['turns'])} turnos):\n")
    
    for turn in conversation["turns"]:
        print(f"Turno {turn['turn_number']}:")
        print(f"  P: {turn['user_query']}")
        print(f"  R: {turn['ai_response'][:150]}...")
        print(f"  Fuentes: {len(turn['citations'])} docs | Latencia: {turn['search_latency_ms'] + turn['inference_latency_ms']:.0f}ms")
        print()
```

---

## Command: Reiniciar Contexto

```python
def reset_context():
    """Reinicia la conversación, empieza de nuevo"""
    global conversation
    old_turns = len(conversation["turns"])
    conversation["turns"] = []
    print(f"✅ Conversación reiniciada (se eliminaron {old_turns} turnos)")
```

---

## Command: Exportar Sesión

```python
def save_session(conversation, filepath):
    """Guarda la conversación en JSON"""
    
    # Crear directorio outputs si es necesario
    Path(filepath).parent.mkdir(parents=True, exist_ok=True)
    
    # Añadir hora de fin y estadísticas
    conversation["end_time"] = datetime.now().isoformat()
    conversation["stats"]["average_latency_ms"] = (
        sum(t.get("search_latency_ms", 0) + t.get("inference_latency_ms", 0) 
            for t in conversation["turns"]) / len(conversation["turns"])
        if conversation["turns"] else 0
    )
    
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(conversation, f, indent=2, ensure_ascii=False)
    
    print(f"""✅ ¡Sesión exportada!

Archivo: {filepath}
Turnos: {conversation['stats']['total_questions']}
Coste total: ${conversation['stats']['total_cost']:.2f}
Latencia media: {conversation['stats']['average_latency_ms']:.0f}ms
""")
```

---

## Output y Guardado de Sesión (Al salir)

```python



print("\n👋 Finalizando sesión de chat...\n")



save_session(conversation, session_file)



print(f"""
📊 Resumen de Sesión:
   Duración: {(datetime.fromisoformat(conversation['end_time']) - datetime.fromisoformat(conversation['start_time'])).total_seconds() / 60:.1f} minutos
   Turnos: {conversation['stats']['total_questions']}
   Tokens totales: {conversation['stats']['total_tokens']}
   Coste total: ${conversation['stats']['total_cost']:.2f}
   Latencia media: {conversation['stats']['average_latency_ms']:.0f}ms
   
Guardado en: {session_file}

¡Gracias por usar RAG Chat! 🙏
""")

exit(0)
```

---

## Error Handling

### Consulta del Usuario Demasiado Vaga
```
⚠️ Tu pregunta es demasiado vaga.

Intenta ser más específico:
  ❌ "¿Cuál es?" → Demasiado vago
  ✅ "¿Cuál es la política de retención de datos?" → Mejor

Reintentar: 
```

### No Se Encontraron Documentos Relevantes
```
⚠️ No se encontraron documentos para: "xyz"

Sugerencias:
  • Prueba con palabras clave diferentes
  • Comprueba qué hay en tu carpeta knowledge/
  • Intenta una pregunta más amplia

Nueva pregunta:
```

### Error del LLM
```
❌ Error de API de OpenAI: Límite de tasa excedido

Espera un moment e inténtalo de nuevo...
```

### Conexión de search Perdida
```
❌ Se perdió la conexión con Azure Search

Solución de problemas:
  • Comprueba el archivo .env
  • Verifica las claves API
  • Comprueba el estado en el portal de Azure

¿Reconectar? (S/n)
```

---

## Criterios de Éxito

✅ El usuario puede hacer preguntas en lenguaje natural

✅ Las respuestas citan las fuentes documentales

✅ El contexto multi-turno se preserva

✅ Las preguntas anteriores informan las nuevas

✅ La sesión se guarda automáticamente

✅ El usuario puede exportar/revisar el history

✅ La latencia es de 4-6 segundos por turno

✅ El coste es ~$0.05 por turno
