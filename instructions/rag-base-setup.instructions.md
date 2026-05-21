**RAG Reference:** [Retrieval-augmented Generation (RAG) in Azure AI Search - Microsoft Learn](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview?tabs=videos)




Estándares para la configuration de rag-builder: onboarding claro, conciencia de costes, consistencia en observability.

## Lista rápida de verificación

- [ ] Python 3.10+ instalado
- [ ] `.env` configurado con credentials de Azure
- [ ] Azure CLI con sesión iniciada (`az login`)
- [ ] Validador pre-deployment ejecutado (verificar costes)
- [ ] Infraestructura Azure desplegada
- [ ] Documentos indexados en AI Search
- [ ] Test de consulta RAG exitoso

## Estándares clave

### 1. Conciencia de costes primero

Siempre ejecutar el validador de costes ANTES de deploy:
```bash
copilot-cli run .github/agents/rag-validate-deployment.agent.md
```

Esto previene sorpresas de $1K+/mes por:
- Tier de Search sobredimensionado
- Retención excesiva de AppInsights
- Tier incorrecto de modelo OpenAI

### 2. Logging y observability

Todas las operaciones deben loguear en:
- `./outputs/rag.log` (local)
- Azure Application Insights (remoto)

Capturar:
- Input de query + respuesta
- Latencia de search + conteo de documentos
- Latencia de inferencia + tokens
- Coste por operación

### 3. Error Handling

Cada agente/script debe:
- Intentar pasos de configuration con mensajes de error claros
- Sugerir remediación ("¿Cuota de región llena? Prueba westus2")
- Nunca fallar en silencio
- Loguear todos los fallos

### 4. Organización de carpetas

**Los usuarios deben organizar docs ANTES de ejecutar el wizard:**

```
knowledge/
├── pdfs/               # PDFs (manuales, políticas, guías, especificaciones)
├── procedimientos/     # Word (.docx), Excel (.xlsx), Markdown (.md) docs procedimentales
├── codigo/             # SQL, Python, JavaScript, ficheros de configuración (YAML, JSON)
└── presentaciones/     # PowerPoint (.pptx), diagramas, docs de arquitectura
```

**Responsabilidad del agente:** 
- rag-onboarding.agent.md DEBE verificar que existe `knowledge/` con sus 4 subdirectorios
- Si falta, CREARLOS + GUIAR al usuario a poblarlos
- Si están vacíos, AVISAR pero continuar (se pueden añadir después)

### 5. Flujo de automatización del wizard (TOTALMENTE AUTOMÁTICO)

**rag-onboarding.agent.md DEBE ejecutar estas fases con CERO intervención del usuario:**

#### Phase 1: Entrevista al usuario (5 min)
```
Preguntar SOLO estas 5 preguntas (ni más):
1. ¿Nombre del proyecto? (ej: "rag-builder")
2. ¿Descripción del proyecto? (1-2 frases)
3. ¿Tamaño total de documentación? (pequeño: <1GB, mediano: 1-10GB, grande: >10GB)
4. ¿Presupuesto mensual en Azure? (por defecto: $2,000)
5. ¿Región Azure preferida? (por defecto: eastus)
```

#### Phase 2: Recomendar configuration (1 min - AUTOMÁTICO)
```
Basado en tamaño de docs + presupuesto:

SI pequeño (<1GB):
  ├─ OpenAI: S0 (pago por token, ~$10/1K consultas promedio)
  ├─ Search: Standard 1 réplica ($200)
  └─ AppInsights: retención 30 días ($50)
  └─ TOTAL: $1,450/mes

SI mediano (1-10GB):
  ├─ OpenAI: S0 (pago por token, ~$10/1K consultas promedio)
  ├─ Search: Standard 2 réplicas ($250)
  └─ AppInsights: retención 30 días ($50)
  └─ TOTAL: $1,500/mes

SI grande (>10GB):
  ├─ OpenAI: S1 (4M tokens/mes, $2,400)
  ├─ Search: Standard 3 réplicas ($300)
  └─ AppInsights: retención 30 días ($50)
  └─ TOTAL: $2,750/mes

SIEMPRE mostrar recomendación + preguntar "¿Proceder?"
```

#### Phase 3: Validar costes (1 min - AUTOMÁTICO)
```
Verificar:
- Presupuesto del usuario >= configuración recomendada
- La región tiene cuota disponible (az vm list-skus)
- La suscripción tiene cuota para OpenAI + Search

SI excede presupuesto:
  └─ SUGERIR: "Prueba config más pequeña o solicita aumento de cuota Azure"
  └─ PERMITIR OVERRIDE: "¿Continuar igualmente? (S/n)"

SI problema de cuota:
  └─ SUGERIR: "Prueba región: westus2" o "Solicita aumento de cuota"
  └─ BLOQUEAR hasta resolver
```

#### Phase 4: deploy infraestructura (10 min - AUTOMÁTICO)
```
Desplegar usando plantillas Bicep:
1. Crear Grupo de Recursos
2. Desplegar Azure OpenAI
3. Desplegar Azure AI Search
4. Desplegar Application Insights

Mostrar progreso:
  ✅ Grupo de Recursos creado
  ✅ OpenAI desplegado (gpt-4o)
  ✅ Search creado (búsqueda semántica habilitada)
  ✅ AppInsights configurado

SI FALLO:
  └─ Mostrar mensaje de error
  └─ Sugerir: "Verificar cuota de región" o "Probar otra región"
  └─ PERMITIR REINTENTO con otra región
```

#### Phase 5: index documentos (10-15 min - AUTOMÁTICO)
```
Escanear carpeta knowledge/ + procesar TODOS los ficheros:

PARA CADA subdirectorio:
  ├─ knowledge/pdfs/          → Extraer texto vía OCR → Chunks
  ├─ knowledge/procedimientos/ → Parsear .docx/.xlsx/.md → Chunks
  ├─ knowledge/codigo/         → Parsear SQL/Python/JS → Chunks
  └─ knowledge/presentaciones/ → Extraer texto de PPT → Chunks

LUEGO:
  ├─ Generar embeddings vía OpenAI (text-embedding-3-small)
  ├─ Subir chunks a Azure Search
  └─ Habilitar indexación de búsqueda semántica

MOSTRAR PROGRESO:
  ✅ Procesados 42 PDFs (1,200 chunks)
  ✅ Procesados 15 Word docs (350 chunks)
  ✅ Procesados 8 ficheros SQL (400 chunks)
  ✅ Procesados 3 PPTs (180 chunks)
  ✅ TOTAL: 2,130 chunks indexados

SI ERRORES:
  └─ Loguear ficheros fallidos
  └─ Continuar con los otros (no bloquear)
  └─ Mostrar: "Indexados 2,100/2,130 chunks. 30 ficheros con errores. Ver logs."
```

#### Phase 6: Configurar credentials (1 min - AUTOMÁTICO)
```
Generar fichero .env con:
  AZURE_OPENAI_ENDPOINT=...
  AZURE_OPENAI_API_KEY=...
  AZURE_SEARCH_ENDPOINT=...
  AZURE_SEARCH_API_KEY=...
  AZURE_APPINSIGHTS_KEY=...
  SUBSCRIPTION_ID=...
  RESOURCE_GROUP=...

GUARDAR en: .env (en git-ignored)
```

#### Phase 7: Probar conexiones (2 min - AUTOMÁTICO)
```
Verificar todos los servicios funcionando:
  ✅ OpenAI conectado (llamar endpoint /models)
  ✅ Search conectado (llamar endpoint /indexes)
  ✅ AppInsights conectado (enviar evento de test)

SI ALGUNO FALLA:
  └─ Mostrar error: "OpenAI no alcanzable: verificar API key en .env"
  └─ OFRECER REINTENTO
```

#### Phase 8: ¡Listo! (1 min - AUTOMÁTICO)
```
Mostrar instrucciones de uso:

📚 ¡Tu RAG está listo! Elige tu modo:

MODO A: Consultas rápidas (CLI)
  $ python .github/skills/rag-query-cli/consultar.py "¿Cuál es X?"
  Latencia: 2s | Coste: $0.02/consulta

MODO B: Chat conversacional
  $ copilot-cli run .github/agents/rag-chat.agent.md
  Latencia: 5s | Coste: $0.05/turno

MODO C: API REST (Para apps)
  $ python .github/skills/rag-api-server/servidor-api.py --port 8000
  curl -X POST http://localhost:8000/query
  Latencia: 3s | Coste: $0.03/consulta

📖 Ver sección Inicio Rápido del README para ejemplos detallados

Guardar resumen en: outputs/setup-summary-{timestamp}.json
```

### 6. Error Handling y reanudación

**Cada Phase del agente debe:**
- Loguear completación de pasos en: `outputs/wizard-checkpoint.json`
- SI se interrumpe → reanudar desde último checkpoint
- Ejemplo:
  ```json
  {
    "phase": 4,
    "status": "completed",
    "timestamp": "2026-05-13T10:30:00Z",
    "next": "Phase 5: Indexar Documentos"
  }
  ```

**Si el usuario reinicia el wizard:**
```
Detectada configuración incompleta.
¿Continuar desde Phase 5: Indexar Documentos? (S/n)
```

### 7. configuration

Toda la config a través de `.env`:
- Sin endpoints/claves hardcodeados
- Nombres de variables claros
- Comentarios explicando cada ajuste
- validation al arrancar (`validate_setup.py`)
