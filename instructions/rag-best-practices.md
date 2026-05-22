---
description: 'Mejores prácticas RAG de Microsoft Learn: retrieval agéntico vs RAG clásico, preparación de contenido, ajuste de relevancia'
---

# Mejores Prácticas RAG para MENSADEF

**Referencia:** [Retrieval-augmented Generation (RAG) en Azure AI Search - Microsoft Learn](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview)

> "RAG es un patrón que extiende las capacidades del LLM fundamentando las respuestas en tu contenido propietario. Aunque conceptualmente simple, las implementaciones RAG enfrentan desafíos significativos."

---

## El desafío del RAG

### 1. Comprensión de consultas

**El problema:**  
Los usuarios hacen preguntas conversacionales, complejas o vagas:
> "¿Cuáles son las políticas de PTO para empleados remotos contratados después de 2023?"

Pero los documentos dicen:
- "time off" (docs en inglés)
- "teletrabajo"
- "incorporaciones recientes"

**La search tradicional por keywords falla.** Busca coincidencias exactas, no intención.

---

### 2. Acceso a datos multi-fuente

**El problema:**  
El contenido enterprise abarca múltiples plataformas:
- SharePoint (políticas RRHH)
- Bases de datos (registros de empleados)
- Blob Storage (PDFs, docs Word)
- Repositorios de código (SQL, procedimientos)

**Crear un corpus de search unificado sin interrumpir las operaciones de datos es esencial.**

---

### 3. Restricciones de tokens

**El problema:**  
Los LLMs aceptan tokens limitados (~128K para gpt-4o):
- Tienes 10,000 páginas de documentación
- Enviar todo desperdicia tokens y degrada la calidad
- El tiempo de respuesta se vuelve inaceptable

**Tu sistema de recuperación debe devolver resultados altamente relevant y concisos — no volcados exhaustivos de documentos.**

---

### 4. Expectativas de tiempo de respuesta

**El problema:**  
Los usuarios esperan respuestas potenciadas por IA en **3-5 segundos**, no minutos.

**El sistema de recuperación debe equilibrar exhaustividad con velocidad.**

---

### 5. security y gobernanza

**El problema:**  
Abrir contenido privado a LLMs requires control de acceso granular:
- Los datos financieros solo deben ser accessibles para el equipo de finanzas
- Incluso cuando un ejecutivo pregunta al chatbot
- Los usuarios solo deben recuperar contenido autorizado

---

## Cómo Azure AI Search resuelve estos desafíos

### Azure AI Search: Dos enfoques

#### 1. **Retrieval Agéntico** (Recomendado para proyectos nuevos)

**Usar cuando:**
- Tu client es un agente o chatbot
- Necesitas la mayor relevancia y precisión possible
- Tus consultas son complejas o conversacionales
- Quieres respuestas estructuradas con citas y detalles de consulta
- Estás construyendo nuevas implementaciones RAG

**Cómo funciona:**

```
Consulta del usuario
    ↓
LLM analiza consulta → genera múltiples sub-consultas
    ↓
Ejecución paralela de todas las sub-consultas
    ↓
Ejecución paralela (no sequential)
    ↓
Respuesta estructurada con datos de fundamentación
    ↓
Seguimiento de citas integrado
    ↓
Log de actividad explica qué se buscó
    ↓
Síntesis de respuesta opcional (usa respuesta formulada por LLM)
```

**Características:**
- Planificación de consultas con contexto usando history de conversación
- Ejecución paralela de múltiples sub-consultas enfocadas
- Respuestas estructuradas con datos de fundamentación, citas, metadatos de ejecución
- Ranking semántico integrado para relevancia óptima
- Síntesis de respuesta opcional que usa respuesta formulada por LLM

**Arquitectura:**
```
Fuentes de conocimiento (multi-fuente)
    ↓
Base de conocimiento (interfaz unificada)
    ↓
Acción Retrieve (llamada desde código del agente como tool)
    ↓
Razonamiento agéntico LLM
    ↓
El agente responds al usuario
```

**Ejemplo de workflow:**

```python
from azure_ai_search import AgenticRetrieval

retriever = AgenticRetrieval(
    service_endpoint="https://rag-builder.search.windows.net/",
    admin_key="...",
    knowledge_base="rag-kb-mensadef"
)

# El agente consulta la base de conocimiento
response = retriever.retrieve(
    query="¿Cuáles son las políticas de PTO para remotos?",
    reasoning_effort="medium",  # minimal/low/medium
    top_k=5
)

# Respuesta estructurada
print(response.answer)           # Respuesta generada por LLM
print(response.citations)       # [{"text": "...", "source": "..."}]
print(response.follow_ups)      # Siguientes preguntas sugeridas
```

---

#### 2. **RAG Clásico** (Para features GA/estables)

**Usar cuando:**
- Necesitas solo features generalmente disponibles (GA)
- La simplicidad y velocidad son prioridad sobre relevancia avanzada
- Tienes código de orquestación existente que quieres preservar
- Necesitas control granular sobre el pipeline de consultas

**Cómo funciona:**

```
Consulta del usuario
    ↓
La aplicación envía una sola consulta a Azure AI Search
    ↓
Consulta híbrida (keyword + búsqueda vectorial)
    ↓
Resultados rankeados por relevancia semántica
    ↓
La aplicación orquesta el handoff al LLM
    ↓
LLM formula respuesta usando el conjunto de resultados
    ↓
Respuesta devuelta al usuario
```

**Características:**
- Consultas híbridas combinan keyword (BM25) y search vectorial para máximo recall
- Ranking semántico re-puntúa resultados por significado, no solo keywords
- search por similitud vectorial coincide conceptos, no términos exactos
- Arquitectura más simple con menos puntos de fallo
- Control granular sobre el pipeline de consultas

**Ejemplo de workflow:**

```python
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizedQuery

client = SearchClient(
    endpoint="https://rag-builder.search.windows.net/",
    index_name="rag-builder-index",
    credential=AzureKeyCredential(key)
)

# Consulta híbrida: keyword + vector
query_vector = generate_embedding("PTO policy remote")
results = client.search(
    search_text="política PTO empleados remotos",
    vector_queries=[VectorizedQuery(vector=query_vector, k_nearest_neighbors=5)],
    select=["title", "content", "metadata"],
    top=5,
    semantic_configuration_name="default"
)

# La aplicación pasa resultados al LLM
context = "\n".join([r["content"] for r in results])
response = llm.generate(
    query="¿Cuáles son las políticas de PTO para remotos?",
    context=context
)
```

---

## Preparación de contenido para RAG

### Cómo maximizar relevancia y recall

#### 1. **Estrategia de chunking**

**Problema:**  
Documentos grandes (50+ páginas) no funcionan bien en search vectorial. Los resultados devuelven documentos enteros en vez de secciones relevant.

**Solución:**  
Dividir documentos en chunks semánticos (200-500 tokens cada uno):

```
Documento: "HR_Handbook_2024.pdf" (100 páginas)
    ↓
Chunk 1: "Sección 1.1: Políticas de empleo" (250 tokens)
Chunk 2: "Sección 1.2: Horarios de trabajo" (300 tokens)
Chunk 3: "Sección 2.1: Política PTO - General" (400 tokens)
Chunk 4: "Sección 2.2: Política PTO - Trabajadores remotos" (350 tokens)
...
Chunk N: "Sección 8.5: Procedimientos de terminación" (275 tokens)
```

**Mejores prácticas:**
- Preservar fronteras semánticas (no dividir a mitad de frase/sección)
- Incluir metadatos del documento padre (título, fuente, author)
- Solapar chunks ligeramente (20-50 tokens) para contexto
- Usar división syntax-aware para archivos de código

**Azure AI Search: Chunking integrado**
```bicep
// En knowledge sources (retrieval agéntico),
// el chunking se auto-genera con defaults inteligentes
```

---

#### 2. **Vectorización**

**Problema:**  
La search por keywords falla en consultas conceptuales. "Política PTO" y "días libres" son semánticamente idénticos pero textualmente diferentes.

**Solución:**  
Crear embeddings (representaciones vector) para cada chunk.

```
Texto del chunk: "La política de días libres permite 30 días anuales"
    ↓
Modelo de embeddings: Azure OpenAI (text-embedding-3-small)
    ↓
Vector: [0.234, -0.891, 0.123, ..., 0.567]  (dimensión: 1536)
    ↓
Almacenado en el índice de búsqueda junto al texto
```

**En tiempo de consulta:**
```
Consulta del usuario: "Política PTO"
    ↓
Generar embedding: [0.245, -0.885, 0.131, ..., 0.571]
    ↓
Encontrar vectors similares (similitud coseno)
    ↓
Recuperar chunks relevant
```

**Mejores prácticas:**
- Usar embeddings de Azure OpenAI (o Azure Vision para imágenes)
- Mantener el modelo de embeddings consistente (no cambiar a mitad de proyecto)
- Trade-offs de dimensión: Mayor dims = mejor precisión, mayor coste
- embeddings multilingüe soportan 50+ idiomas

---

#### 3. **Extracción de metadatos**

**Problema:**  
Los resultados de search carecen de contexto. El usuario no sabe de dónde viene la información.

**Solución:**  
Extraer y almacenar metadatos con cada chunk:

```json
{
  "id": "chunk-123",
  "content": "La política de días libres permite 30 días anuales...",
  "metadata": {
    "source_document": "HR_Handbook_2024.pdf",
    "source_section": "2.1: Política PTO - General",
    "page_number": 12,
    "author": "Departamento RRHH",
    "last_updated": "2024-01-15",
    "document_type": "policy",
    "applicable_to": ["remote", "onsite"]
  }
}
```

**Generación de citas:**
```python
# Al generar respuesta, incluir metadatos
response = {
  "answer": "La política PTO permite 30 días anuales...",
  "citations": [
    {
      "text": "30 días anuales",
      "source": "HR_Handbook_2024.pdf",
      "section": "2.1",
      "page": 12
    }
  ]
}
```

---

#### 4. **Soporte multilingüe**

**Problema:**  
MENSADEF probablemente tiene documentos en español. La search por keywords estándar no entiende stemming/lematización en español.

**Solución:**  
Usar analizadores de idioma apropiados:

```bicep
resource searchIndex 'Microsoft.Search/searchServices/indexes@2023-11-01' = {
  name: '${searchService.name}/rag-builder-index'
  properties: {
    fields: [
      {
        name: 'content'
        type: 'Edm.String'
        searchable: true
        analyzer: 'es.microsoft'  // Analizador español
      }
    ]
  }
}
```

**Opciones de analizador:**
- `es.microsoft` - Español (analizador Microsoft)
- `en.microsoft` - Inglés (analizador Microsoft)
- `es.lucene` - Español (analizador Lucene)
- Más de 50 analizadores de idioma disponibles

---

#### 5. **OCR para PDFs e imágenes**

**Problema:**  
PDFs e imágenes contienen texto que no puede indexarse sin OCR.

**Solución:**  
Azure AI Search tiene OCR integrado (vía pipeline de skills):

```bicep
resource ocrSkill 'Microsoft.Search/searchServices/skillsets@2023-11-01' = {
  name: '${searchService.name}/ocr-skillset'
  properties: {
    skills: [
      {
        '@odata.type': '#Microsoft.Skills.Vision.OcrSkill'
        context: '/document/normalized_images/*'
        textExtractionAlgorithm: 'printed'  // o 'handwritten'
        lineEnding: 'space'
      }
    ]
  }
}
```

---

### Checklist de preparación de contenido

- [ ] **Documentos grandes:** Divididos en chunks (200-500 tokens cada uno)
- [ ] **Vectorización:** Todos los chunks tienen embeddings
- [ ] **Metadatos:** Fuente, fecha, author, tipo de documento extraídos
- [ ] **Idioma:** Analizador apropiado configurado
- [ ] **PDFs/Imágenes:** OCR aplicado
- [ ] **Sinónimos:** Mapas de sinónimos para diferencias terminológicas (PTO = "días libres", "vacaciones")
- [ ] **Filtros:** Metadatos de security a nivel documento incluidos
- [ ] **Scoring:** Campos clave potenciados (título > cuerpo)
- [ ] **Testing:** Calidad de search validada con consultas de ejemplo

---

## Ajuste de relevancia

### 1. Consultas híbridas (Keyword + Vector)

**Enfoque clásico:** SOLO search por keywords (BM25)
```
Consulta: "Política PTO"
Resultados: Solo coincidencias exactas de frase
Problema: No encuentra "días de vacaciones", "días libres", "política de ausencias"
```

**Mejor enfoque:** search híbrida (keyword + vector)
```
Consulta: "Política PTO"
    ├─► Búsqueda keyword: "política PTO", "días libres", "vacaciones"
    └─► Búsqueda vectorial: Contenido semánticamente similar
Resultado: Combina lo mejor de ambos (alto recall + alta precisión)
```

**implementation:**
```python
from azure.search.documents.models import HybridSearch, VectorizedQuery

results = client.search(
    search_text="Política PTO",  # Componente keyword
    vector_queries=[VectorizedQuery(...)],  # Componente vectorial
    select=["title", "content"],
    top=5,
    semantic_configuration_name="default"
)
```

---

### 2. Ranking semántico

**Problema:**  
Los resultados top de search híbrida pueden no ser semánticamente relevant.

```
Top 3 Resultados:
1. "Política PTO de la empresa (50 páginas)" - Alta coincidencia keyword, baja relevancia
2. "Guía de beneficios trabajo remoto" - Menor coincidencia, alta relevancia
3. "Manual de procesamiento nóminas" - Coincidencia media, sin relevancia
```

**Solución:**  
Re-rankear resultados usando ranking semántico (modelo cross-encoder):

```
Ranking original (score BM25):
1. "Política PTO empresa" - Score: 8.5
2. "Beneficios trabajo remoto" - Score: 7.2
3. "Manual nóminas" - Score: 6.1

Después de re-ranking semántico:
1. "Beneficios trabajo remoto" - Score semántico: 2.8 (más relevant)
2. "Política PTO empresa" - Score semántico: 2.1
3. "Manual nóminas" - Score semántico: 0.4
```

**implementation:**
```bicep
// Habilitar en el índice de búsqueda
semanticConfiguration: {
  name: 'default'
  prioritizedFields: {
    contentFields: [{ fieldName: 'content' }]
    keywordsFields: [{ fieldName: 'keywords' }]
  }
}
```

---

### 3. Perfiles de scoring

**Problema:**  
Algunos campos son más importantes que otros.

```
Consulta del usuario: "Política PTO"
Resultados:
- Coincidencia en título (documento de política) - Debería rankear más alto
- Coincidencia en cuerpo (menciona PTO una vez) - Debería rankear más bajo
- Coincidencia en nota al pie (referencia suelta) - Debería rankear lo más bajo
```

**Solución:**  
Aplicar perfiles de scoring para potenciar campos clave:

```bicep
scoringProfiles: [
  {
    name: 'relevanceProfile'
    textWeights: {
      weights: {
        'title': 3          // Coincidencias en título rankean 3x más alto
        'content': 1        // Coincidencias en cuerpo - neutral
        'metadata': 0.5     // Coincidencias en metadatos - menor peso
      }
    }
    functions: [
      {
        fieldName: 'last_updated'
        type: 'freshness'
        freshness: { boostingDurationInDays: 90 }  // Potenciar docs recientes
      }
    ]
  }
]
```

---

### 4. Parámetros de search vectorial

**Ponderación vectorial en consultas híbridas:**
```python
# Por defecto: 50% keyword + 50% vector
results = client.search(
    search_text="consulta",
    vector_queries=[
      VectorizedQuery(
        vector=embedding,
        k_nearest_neighbors=5,
        weight: 0.8  # 80% peso en búsqueda vectorial
      )
    ],
    # Top 5 resultados keyword + top 5 resultados vector
    # Re-rankeados por score híbrido
)
```

**Umbrales mínimos:**
```python
# Excluir resultados con score bajo
results = client.search(
    search_text="consulta",
    vector_queries=[VectorizedQuery(...)],
    filter="search.score(any()) > 0.5"  # Solo resultados con score > 0.5
)
```

---

## Comprensión de consultas y planificación de sub-consultas

### Retrieval agéntico: Estrategia multi-consulta

**Problema:**  
El usuario does una pregunta compleja que no puede respondsrse con una sola consulta.

**Consulta del usuario:**
> "¿Cuáles son las políticas de vacaciones para empleados remotos contratados después de 2023 que trabajan en el sector de Defensa?"

**RAG tradicional:**
Una consulta → Un conjunto de resultados → Una respuesta
(Probablemente pierde contexto importante)

**Retrieval agéntico:**
LLM descompone la pregunta → Múltiples sub-consultas enfocadas → search paralela

```
Consulta original:
"¿Cuáles son las políticas de vacaciones para empleados remotos 
 contratados después de 2023 que trabajan en el sector de Defensa?"
    ↓
Generación de sub-consultas por LLM (usando history de conversación para contexto)
    ├─► Sub-consulta 1: "Políticas de vacaciones empleados remotos"
    ├─► Sub-consulta 2: "Requisitos para empleados nuevos 2023"
    └─► Sub-consulta 3: "Especificaciones sector Defensa"
    ↓
Ejecución de búsqueda paralela (¡mucho más rápido que sequential!)
    ├─► Búsqueda 1: Resultados [chunk-1, chunk-2, chunk-3, ...]
    ├─► Búsqueda 2: Resultados [chunk-4, chunk-5, chunk-6, ...]
    └─► Búsqueda 3: Resultados [chunk-7, chunk-8, chunk-9, ...]
    ↓
Re-ranking semántico (todos los resultados)
    └─► Top 5 más relevant de todas las búsquedas
    ↓
Síntesis de respuesta
    └─► LLM formula respuesta comprensiva con citas
```

---

## security: Control de acceso a nivel documento

### Escenario

```
Ejecutivo pregunta: "¿Cuál es nuestro gasto actual en contratistas IT?"
    ↓
Sin DLS: RAG devuelve datos confidenciales de Finanzas (¡RIESGO!)
    ↓
Con DLS: Solo el equipo de Finanzas ve documentos financieros
          El ejecutivo obtiene "Sin autorización para estos datos"
```

### implementation

**En tiempo de indexing:**
```json
{
  "id": "finance-budget-2024",
  "title": "Informe Presupuesto Q1 2024",
  "content": "...",
  "allowed_departments": ["Finance", "CFO-Office"],
  "allowed_users": ["cfo@company.com", "finance-manager@company.com"]
}
```

**En tiempo de consulta:**
```python
# Usuario solicitando documento
user = current_user()  # John (equipo Finanzas)
user_departments = ["Finance"]

# Aplicar filtro de seguridad
filter_expression = f"""
  allowed_departments/any(d: search.in(d, '{','.join(user_departments)}'))
  OR allowed_users/any(u: search.in(u, '{user.email}'))
"""

results = client.search(
    search_text="presupuesto",
    filter=filter_expression
)
```

---

## Checklist de ajuste de performance

- [ ] **Consultas híbridas habilitadas** (keyword + vector)
- [ ] **Ranking semántico habilitado** (re-scoring cross-encoder)
- [ ] **Perfiles de scoring aplicados** (potenciar campos clave)
- [ ] **search vectorial ajustada** (ponderación, umbrales mínimos)
- [ ] **Resultados top-k limitados** (top: 5-10, no 100)
- [ ] **Filtros optimizados** (estrechar resultados antes de rankear)
- [ ] **Réplicas escaladas** (1+ para escenarios multi-usuario)
- [ ] **Timeouts de consulta configurados** (por defecto: 30s)
- [ ] **Caché para consultas frecuentes** (si aplica)

---

## optimization de costes

### Selección de tier

| Caso de uso | Tier OpenAI | Tier Search | Coste/Mes |
|----------|-------------|------------|-----------|
| Desarrollo/Testing | S0 | Standard 1 réplica | $1,450 |
| Producción (HA) | S1 | Standard 2-3 réplicas | $2,800 |
| Alto volumen | S1 | Premium | $4,500+ |

### Estrategias

1. **Usar modelos más baratos** (gpt-4o-mini vs gpt-4o)
2. **Optimizar dimensión de embeddings** (1024 vs 1536)
3. **Reducir réplicas de Search** (para entornos no críticos)
4. **Configurar retención App Insights** (30 días vs 90 días)
5. **Habilitar muestreo de resultados** (si métricas exactas no son críticas)

---

## Monitorización y observability

### Métricas clave

```
Dashboard Application Insights

Rendimiento de consultas:
├─ Latencia (e2e) - Objetivo: < 5 segundos
├─ Latencia de búsqueda - Objetivo: < 1 segundo
├─ Latencia inferencia OpenAI - Objetivo: < 2 segundos
└─ Latencia P95 - Objetivo: < 10 segundos

Relevancia:
├─ Score de relevancia promedio
├─ Conteo de citas por respuesta
└─ Tasa de clic en sugerencias de seguimiento

Costes:
├─ Coste por consulta
├─ Tendencia de coste diario/mensual
└─ Desglose de coste por modelo

Errores:
├─ Tasa de error (%)
├─ Tipos de error principales
└─ Tasa de éxito de recuperación
```

---

## Resumen: Retrieval Agéntico vs RAG Clásico

| Aspecto | Retrieval Agéntico | RAG Clásico |
|--------|-----------------|------------|
| **Mejor para** | Agentes, chatbots, consultas complejas | Escenarios simples, solo GA |
| **Planificación consultas** | Asistida por LLM (sub-consultas) | Consulta única |
| **Ejecución** | Sub-consultas paralelas | Petición única |
| **Respuesta** | Estructurada (citas, metadatos) | Conjunto plano de resultados |
| **Relevancia** | Máxima (multi-facetada) | Buena (consulta única) |
| **Velocidad** | Moderada (múltiples searches) | Rápida (una petición) |
| **Madurez** | Preview (features nuevos) | GA (estable) |
| **Coste** | Ligeramente mayor (más consultas) | Menor (consulta única) |

**Recomendación para MENSADEF:**
- **Implementaciones nuevas:** Usar Retrieval Agéntico
- **Sistemas existentes:** Considerar migrar a retrieval agéntico para ganancias de precisión
- **Híbrido:** Algunos equipos usan ambos (clásico para Q&A simple, agéntico para análisis complejo)

---

## Referencias

- 📚 [Visión general RAG (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview)
- 🔍 [search híbrida](https://learn.microsoft.com/en-us/azure/search/hybrid-search-overview)
- ⭐ [Ranking semántico](https://learn.microsoft.com/en-us/azure/search/semantic-ranking)
- 🏗️ [README - Arquitectura](README.md)
- 📋 [Agentes](.github/agents/)
