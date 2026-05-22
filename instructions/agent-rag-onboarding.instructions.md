---
description: 'Onboard and configure RAG applications with step-by-step setup phases'
applyTo: 'rag-onboarding.agent.md'
---

**RAG Reference:** [Retrieval-augmented Generation (RAG) in Azure AI Search - Microsoft Learn](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview?tabs=videos)




**Purpose:** Asistente de onboarding completamente automatizado para nuevos usuarios. Configurar → deploy → index → Listo.

**Entrada del usuario:** `copilot-cli run .github/agents/rag-onboarding.agent.md`

**Estimated Duration:** ~30 minutos en total (totalmente automático)

---

## ✅ Lista de verificación OBLIGATORIA

- [ ] Preguntar nombre del proyecto → crear `rag-{nombre}/`
- [ ] Crear estructura de carpetas dentro de `rag-{nombre}/`
- [ ] Entrevistar al usuario (5 preguntas)
- [ ] Recomendar configuration según tamaño de docs
- [ ] Validar costes ANTES de deploy
- [ ] deploy infraestructura Azure (Bicep)
- [ ] index todos los documentos de `knowledge/`
- [ ] Generar `.env` con credentials
- [ ] Probar todas las conexiones
- [ ] Mostrar instrucciones de uso (3 modos)
- [ ] Guardar resumen en `outputs/`

---

## Automatización Phase a Phase

### Phase 0: Crear estructura del proyecto (1 min)

Pregunta el nombre del proyecto y crea la carpeta con toda la estructura:

```python
import os
from pathlib import Path

project_name = input("¿Nombre del proyecto? (ej: mensadef): ").strip().lower()
folder_name = f"rag-{project_name}"
project_root = Path("..") / folder_name  # hermano de .github/

folders = [
    "knowledge/pdfs",
    "knowledge/procedimientos",
    "knowledge/codigo",
    "knowledge/presentaciones",
    "docs",
    "outputs",
    "logs"
]

project_root.mkdir(parents=True, exist_ok=True)
for folder in folders:
    (project_root / folder).mkdir(parents=True, exist_ok=True)

print(f"✅ Creada carpeta: {folder_name}/")
print(f"   Añade tus documentos en {folder_name}/knowledge/ antes de continuar")
```

### Phase 1: Verificar estructura de documentos (2 min)

```python
import os

knowledge_path = "knowledge"
required_dirs = ["pdfs", "procedimientos", "codigo", "presentaciones"]

if not os.path.exists(knowledge_path):
    os.makedirs(knowledge_path)
    for subdir in required_dirs:
        os.makedirs(f"{knowledge_path}/{subdir}")
    print("✅ Creada estructura knowledge/")
else:
    missing = [d for d in required_dirs if not os.path.exists(f"{knowledge_path}/{d}")]
    if missing:
        for d in missing:
            os.makedirs(f"{knowledge_path}/{d}")
        print(f"✅ Creados subdirectorios faltantes: {missing}")

pdf_count = len(os.listdir(f"{knowledge_path}/pdfs"))
proc_count = len(os.listdir(f"{knowledge_path}/procedimientos"))
code_count = len(os.listdir(f"{knowledge_path}/codigo"))
ppt_count = len(os.listdir(f"{knowledge_path}/presentaciones"))

print(f"\n📂 Documentación actual:")
print(f"   PDFs: {pdf_count} archivos")
print(f"   Procedimientos: {proc_count} archivos")
print(f"   Código: {code_count} archivos")
print(f"   Presentaciones: {ppt_count} archivos")
```

### Phase 2: Entrevista al usuario (5 min)

```
Preguntar EXACTAMENTE estas 5 preguntas (ni más, ni menos):

1️⃣  ¿Nombre del proyecto?
    Ejemplo: "rag-builder"

2️⃣  ¿Descripción del proyecto? (1-2 frases)
    Ejemplo: "Sistema de gestión de clients para banca minorista"

3️⃣  ¿Tamaño total de documentación?
    Opciones:
      - pequeño (< 1GB)
      - mediano (1-10GB)
      - grande (> 10GB)

4️⃣  ¿Presupuesto mensual en Azure?
    Por defecto: $2,000

5️⃣  ¿Región Azure preferida?
    Por defecto: eastus
    Opciones: eastus, westus2, northeurope, southeastasia

Guardar respuestas en: outputs/interview-{timestamp}.json
```

### Phase 3: Recomendar configuration (1 min - AUTO)

```python
recommendations = {
    "small": {
        "openai": {"tier": "S0", "model": "gpt-4o", "tokens": "2M/mes", "cost": 1200},
        "search": {"tier": "Standard", "replicas": 1, "cost": 200},
        "appinsights": {"retention": "30 días", "cost": 50},
        "total": 1450
    },
    "medium": {
        "openai": {"tier": "S0", "model": "gpt-4o", "tokens": "2M/mes", "cost": 1200},
        "search": {"tier": "Standard", "replicas": 2, "cost": 250},
        "appinsights": {"retention": "30 días", "cost": 50},
        "total": 1500
    },
    "large": {
        "openai": {"tier": "S1", "model": "gpt-4o", "tokens": "4M/mes", "cost": 2400},
        "search": {"tier": "Standard", "replicas": 3, "cost": 300},
        "appinsights": {"retention": "30 días", "cost": 50},
        "total": 2750
    }
}

config = recommendations[doc_size]

print(f"""
📊 CONFIGURACIÓN RECOMENDADA:
   Azure OpenAI:  {config['openai']['tier']} - {config['openai']['tokens']} - ${config['openai']['cost']}/mes
   Search:        {config['search']['tier']} ({config['search']['replicas']} réplicas) - ${config['search']['cost']}/mes
   AppInsights:   {config['appinsights']['retention']} - ${config['appinsights']['cost']}/mes
   ────────────────────────────────────
   TOTAL:         ${config['total']}/mes

Presupuesto declarado: ${budget}/mes
Estado: {"✅ DENTRO DEL PRESUPUESTO" if config['total'] <= budget else "⚠️  EXCEEDS PRESUPUESTO"}
""")

print("¿Proceder con esta configuración? (S/n)")
```

### Phase 4: Validar costes (1 min - AUTO)

```python
if config_cost > user_budget:
    print(f"""
⚠️  La configuración (${config_cost}) EXCEEDS el presupuesto (${user_budget}).

Opciones:
  A) Continuar igualmente (los costes se acumularán)
  B) Usar tier más pequeño
  C) Aumentar presupuesto
  D) Cancelar

¿Tu elección? (A/B/C/D)
    """)

import subprocess
result = subprocess.run([
    "az", "vm", "list-skus",
    "--location", region,
    "--query", "[?family=='StandardSv5'].capabilities[?name=='vCPUs'].value",
    "--output", "json"
], capture_output=True)

if not result.stdout:
    print(f"""
⚠️  La región {region} puede tener problemas de cuota.

Probando regiones alternativas...
    """)

try:
    from azure.identity import DefaultAzureCredential
    # Intentar verificar disponibilidad del modelo en la región
except:
    print("⚠️  No se pudo verificar OpenAI en esta región. Continuando...")

print("✅ Validación de costes superada")
```

### Phase 5: deploy infraestructura (10 min - AUTO, SILENCIOSO)

```bash
#!/bin/bash

echo "🚀 Desplegando infraestructura Azure..."

az group create \
  --name "${RESOURCE_GROUP}" \
  --location "${REGION}"

az deployment group create \
  --resource-group "${RESOURCE_GROUP}" \
  --template-file infra/main.bicep \
  --parameters \
    openaiTier="${OPENAI_TIER}" \
    searchTier="${SEARCH_TIER}" \
    appInsightsRetention="${APPINSIGHTS_RETENTION}"

echo "✅ Infraestructura desplegada"
```

**Mostrar progreso:**
```
⏳ Desplegando infraestructura Azure...
   ⏳ Creando Grupo de Recursos...
   ✅ Grupo de Recursos creado
   ⏳ Desplegando Azure OpenAI...
   ✅ Azure OpenAI desplegado
   ⏳ Desplegando AI Search...
   ✅ AI Search desplegado
   ⏳ Desplegando Application Insights...
   ✅ Application Insights desplegado

✅ ¡Toda la infraestructura lista!
```

### Phase 6: index documentos (10-15 min - AUTO, MOSTRAR PROGRESO)

```python
import os
from pathlib import Path
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from azure.identity import DefaultAzureCredential

knowledge_path = "knowledge"

for doc_type, subdir in [
    ("PDFs", "pdfs"),
    ("Procedimientos", "procedimientos"),
    ("Código", "codigo"),
    ("Presentaciones", "presentaciones")
]:
    folder = f"{knowledge_path}/{subdir}"
    files = os.listdir(folder)

    print(f"\n⏳ Indexando {doc_type}...")

    for file in files:
        filepath = os.path.join(folder, file)

        # Procesar fichero (OCR para PDFs, parsing para otros)
        if file.endswith('.pdf'):
            chunks = extract_pdf(filepath)
        elif file.endswith(('.docx', '.xlsx')):
            chunks = extract_office(filepath)
        elif file.endswith(('.py', '.sql', '.js')):
            chunks = extract_code(filepath)
        elif file.endswith('.pptx'):
            chunks = extract_ppt(filepath)
        else:
            continue

        # Generar embeddings
        embeddings = [generate_embedding(c) for c in chunks]

        # Subir a Azure Search
        search_client.upload_documents([...])

    print(f"   ✅ Indexados {len(files)} archivos de {doc_type}")

print("\n✅ ¡Indexación completa!")
```

**Mostrar resumen:**
```
📚 ¡Indexación completa!

✅ PDFs:          42 archivos → 1,200 chunks
✅ Procedimientos: 15 archivos → 350 chunks
✅ Código:        8 archivos → 400 chunks
✅ Presentaciones: 3 archivos → 180 chunks
────────────────────────────────────────
   TOTAL:       2,130 chunks indexados
```

### Phase 7: Configurar credentials (1 min - AUTO)

```python
import os
import json

openai_key = os.getenv("AZURE_OPENAI_API_KEY")
openai_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
search_key = os.getenv("AZURE_SEARCH_API_KEY")
search_endpoint = os.getenv("AZURE_SEARCH_ENDPOINT")
appinsights_key = os.getenv("AZURE_APPINSIGHTS_KEY")

env_content = f"""# Configuración RAG (Generado: {timestamp})

AZURE_OPENAI_ENDPOINT={openai_endpoint}
AZURE_OPENAI_API_KEY={openai_key}
OPENAI_CHAT_MODEL=gpt-4o
OPENAI_DEPLOYMENT=gpt-4o

AZURE_SEARCH_ENDPOINT={search_endpoint}
AZURE_SEARCH_API_KEY={search_key}
SEARCH_INDEX=rag-documents

AZURE_APPINSIGHTS_KEY={appinsights_key}

RAG_TOP_K=5
RAG_TEMPERATURE=0.7
RAG_MAX_TOKENS=1000
"""

with open(".env", "w") as f:
    f.write(env_content)

print("✅ Credenciales guardadas en .env")
```

### Phase 8: Probar conexiones (2 min - AUTO)

```python
import os
from dotenv import load_dotenv
from azure.openai import AzureOpenAI
from azure.search.documents import SearchClient

load_dotenv()

try:
    client = AzureOpenAI(
        api_key=os.getenv("AZURE_OPENAI_API_KEY"),
        api_version="2024-05-01-preview",
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
    )
    models = client.models.list()
    print("✅ OpenAI conectado")
except Exception as e:
    print(f"❌ OpenAI falló: {e}")

try:
    search_client = SearchClient(
        endpoint=os.getenv("AZURE_SEARCH_ENDPOINT"),
        index_name="rag-documents",
        credential=AzureKeyCredential(os.getenv("AZURE_SEARCH_API_KEY"))
    )
    search_client.get_document_count()
    print("✅ Search conectado")
except Exception as e:
    print(f"❌ Search falló: {e}")

try:
    from azure.monitor.opentelemetry import configure_azure_monitor
    configure_azure_monitor()
    print("✅ AppInsights conectado")
except Exception as e:
    print(f"❌ AppInsights falló: {e}")
```

### Phase 9: ¡Listo! Mostrar uso (1 min - AUTO)

```
🎉 ¡TU RAG ESTÁ LISTO!

Elige tu modo de consulta:

═══════════════════════════════════════════════════════════

🔹 MODO A: Consultas rápidas (CLI)

   Uso:
   $ python .github/skills/rag-query-cli/consultar.py "¿Cuál es la política X?"

   Ideal para: Preguntas rápidas, consultas puntuales
   Latencia: 2 segundos
   Coste: $0.02 por consulta

   Ejemplo de salida:
   > Pregunta: ¿Cuál es la política de retención?
   > Respuesta: Según el documento 'data-retention.docx'...
   > Fuentes: data-retention.docx (p.3), api-specs.xlsx (Hoja 2)
   > Tiempo: 2.1s | Tokens: 340 | Coste: $0.02

═══════════════════════════════════════════════════════════

🔹 MODO B: Chat conversacional

   Uso:
   $ copilot-cli run .github/agents/rag-chat.agent.md

   Ideal para: Conversaciones multi-turno, seguimientos, exploración profunda
   Latencia: 5 segundos por turno
   Coste: $0.05 por turno
   Contexto: Recuerda las últimas 10 interacciones

   Ejemplo de flujo:
   > P1: ¿Cómo despliego el sistema?
   < R1: Según deployment-guide.pdf...
   > P2: ¿Y si falla la conexión?
   < R2: Refiere al contexto de P1 + nueva respuesta

═══════════════════════════════════════════════════════════

🔹 MODO C: API REST (Para integración con apps)

   Uso:
   $ python .github/skills/rag-api-server/servidor-api.py --port 8000

   Desde tu app:
   curl -X POST http://localhost:8000/query \
     -H "Content-Type: application/json" \
     -d '{"query": "¿Cuál es X?", "top_k": 5}'

   Ideal para: Web apps, dashboards, workflows
   Latencia: 3 segundos por consulta
   Coste: $0.03 por consulta
   Features: Consultas batch, health checks, CORS habilitado

═══════════════════════════════════════════════════════════

📖 Ver ejemplos de consultas en la sección Inicio Rápido del README

Siguientes pasos:
  1. Elige tu modo (A, B o C)
  2. Haz tu primera consulta
  3. Personaliza según necesites

Configuración guardada en: outputs/setup-summary-{timestamp}.json
```

---

## Error Handling

### Si falta la carpeta
```
⚠️ Carpeta knowledge/ no encontrada.
   Creando estructura...
   ✅ Creadas knowledge/{pdfs, procedimientos, codigo, presentaciones}

Por favor añade tus documentos y ejecuta el wizard de nuevo.
```

### Si falla la entrevista
```
❌ Error de entrada: El presupuesto debe ser > 0
   Inténtalo de nuevo...
```

### Si falla el deployment
```
❌ Despliegue Azure fallido: Cuota excedida para la región eastus

Sugerencias:
  A) Probar región: westus2
  B) Solicitar aumento de cuota (tarda 24h)
  C) Reducir tamaño del tier

¿Tu elección? (A/B/C)
```

### Si la indexing falla parcialmente
```
⚠️ Indexación parcialmente exitosa:
   ✅ 2,100 chunks indexados correctamente
   ❌ 30 chunks fallaron (ver errores abajo)

Archivos fallidos:
  - corrupted-file.pdf: OCR falló
  - binary-code.so: No es un fichero de texto

Continuando con los chunks exitosos. Revisar logs: outputs/rag.log
```

### Si falla la prueba de conexión
```
❌ Prueba de conexión fallida:
   ✅ OpenAI: OK
   ❌ Search: No se pudo conectar (verificar API key)
   ⚠️  AppInsights: Timeout

Resolución de problemas:
  1. Verificar que existe el fichero .env
  2. Verificar API keys: cat .env
  3. Comprobar disponibilidad de la región Azure
  4. Ejecutar: az login --tenant {tenant-id}

¿Reintentar? (S/n)
```

---

## Soporte de reanudación

Si el wizard se interrumpe, guardar checkpoint:

```json
{
    "project_name": "rag-builder",
  "phase": 5,
  "phase_name": "Indexar Documentos",
  "status": "en-progreso",
  "timestamp": "2026-05-13T10:30:00Z",
  "indexed_chunks": 1250,
  "next": "Completar indexación + Phase 6"
}
```

Al reiniciar:
```
🔄 Detectada configuración incompleta del 2026-05-13 10:30

Última phase: Phase 5 (Indexar Documentos)
Progreso: 1,250 / 2,130 chunks indexados

¿Reanudar desde la Phase 5? (S/n)
```

---

## Criterios de éxito

✅ El usuario ve UNO de estos 3 commands y puede ejecutarlo inmediatamente:
```bash
python .github/skills/rag-query-cli/consultar.py "¿Cuál es X?"
copilot-cli run .github/agents/rag-chat.agent.md
python .github/skills/rag-api-server/servidor-api.py --port 8000
```

✅ La primera consulta devuelve resultado en 2-5 segundos

✅ Resumen de configuration guardado en `outputs/setup-summary-{timestamp}.json`

✅ El usuario NUNCA tuvo que abrir el Portal de Azure
