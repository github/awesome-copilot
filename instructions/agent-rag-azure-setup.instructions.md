**RAG Reference:** [Retrieval-augmented Generation (RAG) in Azure AI Search - Microsoft Learn](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview?tabs=videos)




**Propósito:** Desplegar infraestructura Azure (OpenAI, Search, AppInsights). Automático.

**Invocado por:** rag-onboarding.agent.md (Fase 4) O manual: `copilot-cli run rag-azure-setup.agent.md`

**Duración estimada:** 10-15 minutos (totalmente automático, interacción mínima)

---

## ✅ Lista de verificación del despliegue

- [ ] Validar prerequisitos (az CLI, sesión iniciada)
- [ ] Verificar que existen las plantillas Bicep (infra/main.bicep)
- [ ] Crear grupo de recursos de Azure
- [ ] Desplegar OpenAI mediante Bicep
- [ ] Desplegar AI Search mediante Bicep
- [ ] Desplegar AppInsights mediante Bicep
- [ ] Extraer credenciales del despliegue
- [ ] Mostrar resumen del despliegue

---

## Verificación de prerequisitos (1 min - AUTO)

```bash
# Verificar CLI de Azure instalada
az version

# Verificar sesión activa
az account show

# Verificar plantilla Bicep
test -f infra/main.bicep || {
  echo "❌ infra/main.bicep no encontrado"
  exit 1
}
```

**Si no se ha iniciado sesión:**
```
⚠️ No se ha iniciado sesión en Azure CLI.

Ejecutando: az login
→ Abre el navegador para autenticación...

¿Continuar? (S/n)
```

---

## Obtener parámetros de despliegue

**Desde variables de entorno o desde .env:**

```python
import os
from dotenv import load_dotenv

load_dotenv()

params = {
    "RESOURCE_GROUP": os.getenv("RESOURCE_GROUP", f"rag-{project_name}-{timestamp}"),
    "REGION": os.getenv("AZURE_REGION", "eastus"),
    "PROJECT_NAME": os.getenv("PROJECT_NAME"),
    "OPENAI_TIER": os.getenv("OPENAI_TIER", "S0"),
    "SEARCH_TIER": os.getenv("SEARCH_TIER", "Standard"),
    "SEARCH_REPLICAS": os.getenv("SEARCH_REPLICAS", 1),
    "APPINSIGHTS_RETENTION": os.getenv("APPINSIGHTS_RETENTION", 30)
}
```

---

## Fase 1: Crear grupo de recursos (2 min)

```bash
#!/bin/bash

RG_NAME="${RESOURCE_GROUP}"
REGION="${AZURE_REGION}"

echo "🚀 Creando grupo de recursos..."
echo "   Nombre: $RG_NAME"
echo "   Región: $REGION"

az group create \
  --name "$RG_NAME" \
  --location "$REGION" \
  --tags project="${PROJECT_NAME}" created="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [ $? -eq 0 ]; then
    echo "✅ Grupo de recursos creado"
else
    echo "❌ Error al crear el grupo de recursos"
    exit 1
fi
```

---

## Fase 2: Desplegar plantilla Bicep (8-10 min)

```bash
#!/bin/bash

echo "⏳ Desplegando servicios Azure mediante Bicep..."

az deployment group create \
  --resource-group "$RG_NAME" \
  --template-file infra/main.bicep \
  --parameters \
    projectName="${PROJECT_NAME}" \
    location="${REGION}" \
    openaiSku="${OPENAI_TIER}" \
    searchTier="${SEARCH_TIER}" \
    searchReplicas="${SEARCH_REPLICAS}" \
    appInsightsRetention="${APPINSIGHTS_RETENTION}" \
  --output json > deployment-output.json

if [ $? -eq 0 ]; then
    echo "✅ Despliegue Bicep exitoso"
else
    echo "❌ El despliegue Bicep ha fallado"
    exit 1
fi
```

**Mostrar progreso:**
```
⏳ Desplegando servicios...

✅ Azure OpenAI (gpt-4o)
   Endpoint: https://rag-xxx.openai.azure.com
   Modelo: gpt-4o
   Tokens/mes: 2M

✅ Azure AI Search (Standard, 1 réplica)
   Endpoint: https://rag-xxx.search.windows.net
   Índice: rag-documents
   Búsqueda semántica: habilitada

✅ Application Insights
   Clave de instrumentación: [oculta]
   Retención: 30 días

🎉 ¡Todos los servicios desplegados!
```

---

## Fase 3: Extraer credenciales (2 min - AUTO)

```python
import json
import subprocess
from azure.identity import DefaultAzureCredential
from azure.mgmt.cognitiveservices import CognitiveServicesManagementClient

# Leer salida del despliegue
with open("deployment-output.json") as f:
    deployment = json.load(f)

# Extraer endpoints y claves
openai_endpoint = deployment["properties"]["outputs"]["openaiEndpoint"]["value"]
openai_key = deployment["properties"]["outputs"]["openaiKey"]["value"]

# Search
search_endpoint = deployment["properties"]["outputs"]["searchEndpoint"]["value"]
search_key = deployment["properties"]["outputs"]["searchKey"]["value"]

# AppInsights
appinsights_key = deployment["properties"]["outputs"]["appInsightsKey"]["value"]

print("✅ Credenciales extraídas del despliegue")
```

---

## Fase 4: Actualizar .env (1 min - AUTO)

```python
env_content = f"""# Configuración RAG (Auto-generado: {timestamp})

# === Azure OpenAI ===
AZURE_OPENAI_ENDPOINT={openai_endpoint}
AZURE_OPENAI_API_KEY={openai_key}
OPENAI_CHAT_MODEL=gpt-4o
OPENAI_DEPLOYMENT=gpt-4o

# === Azure AI Search ===
AZURE_SEARCH_ENDPOINT={search_endpoint}
AZURE_SEARCH_API_KEY={search_key}
SEARCH_INDEX=rag-documents

# === Observabilidad ===
AZURE_APPINSIGHTS_KEY={appinsights_key}

# === Configuración RAG ===
RAG_TOP_K=5
RAG_TEMPERATURE=0.7
RAG_MAX_TOKENS=1000
"""

with open(".env", "w") as f:
    f.write(env_content)

# Asegurar permisos del fichero
os.chmod(".env", 0o600)

print("✅ .env actualizado con las credenciales")
```

---

## Fase 5: Guardar resumen del despliegue (1 min)

```python
summary = {
    "timestamp": "2026-05-13T10:30:00Z",
    "status": "SUCCESS",
    "resource_group": resource_group,
    "region": region,
    "services": {
        "openai": {
            "endpoint": openai_endpoint,
            "model": "gpt-4o",
            "tier": openai_tier
        },
        "search": {
            "endpoint": search_endpoint,
            "replicas": search_replicas,
            "tier": "Standard"
        },
        "appinsights": {
            "retention_days": appinsights_retention
        }
    },
    "credentials_stored": ".env"
}

with open(f"outputs/deployment-summary-{timestamp}.json", "w") as f:
    json.dump(summary, f, indent=2)

print(f"✅ Resumen del despliegue guardado en outputs/")
```

---

## Manejo de errores

### El grupo de recursos ya existe
```
⚠️ El grupo de recursos '{RG_NAME}' ya existe.

Opciones:
  A) Usar el existente (reutilizar)
  B) Crear uno nuevo con nombre diferente
  C) Cancelar

¿Tu elección? (A/B/C)
```

### El despliegue falla
```
❌ El despliegue Bicep ha fallado.

Error:
  RegionQuotaExceeded: Cuota de OpenAI agotada en eastus

Sugerencias:
  • Probar región: westus2
  • Solicitar aumento de cuota (azure.microsoft.com/quotas)
  • Reducir tier: S0 → Standby

¿Reintentar con westus2? (S/n)
```

### Fallo parcial en el despliegue de servicios
```
⚠️ Despliegue parcialmente exitoso:

✅ OpenAI: Desplegado
✅ Search: Desplegado
❌ AppInsights: Fallido (SKU no disponible)

Opciones:
  A) Continuar sin AppInsights
  B) Reintentar con otra región
  C) Cancelar y limpiar

¿Tu elección? (A/B/C)
```

### No se pueden extraer credenciales
```
❌ No se pudieron extraer las credenciales del despliegue.

Solución de problemas:
  1. Verificar que el grupo de recursos existe: az group list
  2. Verificar estado del despliegue: az deployment group list -g {RG_NAME}
  3. Verificar que el fichero .json de salida existe

¿Reintentar? (S/n)
```

---

## Soporte de rollback

Si el despliegue falla a mitad del proceso:

```bash
# Eliminar grupo de recursos completo
echo "🗑️  Limpiando recursos..."

az group delete \
  --name "$RG_NAME" \
  --yes \
  --no-wait

echo "✅ Grupo de recursos marcado para eliminación (tarda ~5 min)"
```

---

## Criterios de éxito

✅ Los 3 servicios desplegados (OpenAI, Search, AppInsights)

✅ Credenciales extraídas y guardadas en `.env`

✅ Permisos de fichero asegurados (600)

✅ Resumen del despliegue guardado en `outputs/`

✅ Usuario listo para la siguiente fase: Indexación
