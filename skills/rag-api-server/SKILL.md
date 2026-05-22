---
name: 'rag-api-server'
description: 'Exposes RAG functionality as a REST API for external applications. Provides HTTP endpoints for document search and query with JSON request/response, async processing, CORS support, and observability metrics.'
---

# RAG API Server — Interfaz REST

**Expone RAG como API REST para aplicaciones externas.**

## Overview

Servidor API REST que envuelve la funcionalidad de query RAG, permitiendo a clients HTTP buscar y consultar documents.

## Features

- REST API endpoints
- Request/response JSON
- Procesamiento async de queries
- Métricas y monitoring
- Soporte CORS

## Requirements

```bash
pip install -r .github/requirements.txt
```

- `.env` con credentials Azure:
  - `AZURE_OPENAI_KEY`
  - `AZURE_OPENAI_ENDPOINT`
  - `AZURE_SEARCH_ENDPOINT`
  - `AZURE_SEARCH_KEY`
  - `AZURE_SEARCH_INDEX`

## Uso

### Iniciar Servidor

```bash
# Desde la raíz del proyecto
python .github/skills/rag-api-server/servidor-api.py
```

### Puerto por Defecto

El servidor corre en `http://localhost:8000`

### Endpoints API

#### POST `/query` — Ejecutar Query RAG

**Request:**
```json
{
  "query": "What is the user onboarding process?",
  "top_k": 5
}
```

**Response:**
```json
{
  "query": "What is the user onboarding process?",
  "response": "Based on the documentation...",
  "sources": [
    "knowledge/pdfs/Onboarding.pdf",
    "knowledge/procedimientos/UserSetup.docx"
  ],
  "metrics": {
    "search_time_ms": 234,
    "inference_time_ms": 1523,
    "total_time_ms": 1757,
    "tokens_used": 412
  }
}
```

#### GET `/health` — Health Check

**Response:**
```json
{
  "status": "healthy",
  "search_endpoint": "https://my-search.search.windows.net",
  "openai_model": "gpt-4o"
}
```

## Clients de Example

### cURL

```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "user onboarding", "top_k": 5}'
```

### Python

```python
import requests

response = requests.post(
    "http://localhost:8000/query",
    json={"query": "user onboarding", "top_k": 5}
)

result = response.json()
print(result['response'])
```

### JavaScript

```javascript
fetch('http://localhost:8000/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'user onboarding',
    top_k: 5
  })
})
.then(r => r.json())
.then(data => console.log(data.response))
```
