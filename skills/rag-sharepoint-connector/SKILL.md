---
name: rag-sharepoint-connector
description: "Hybrid-professional SharePoint integration for RAG. Two modes: Professional (Azure Search indexer, real-time sync, no duplication) or Local (download to knowledge/, coexists with traditional docs)"
version: "1.0.0"
author: "RAG Framework"
tags: ["sharepoint", "hybrid", "integration", "azure-search", "microsoft-graph"]
---

# RAG: SharePoint Connector

**Arquitectura híbrida-profesional para integration SharePoint**

Integra bibliotecas de documentos SharePoint en RAG con dos modos flexibles:
- **Profesional** (por defecto): Indexer de Azure AI Search sincroniza directamente desde SharePoint (tiempo real, sin duplicación)
- **Local**: Descarga todos los documentos a `knowledge/sharepoint-{fecha}/` (funciona offline, coexiste con docs tradicionales)

---

## Características

**authentication OAuth 2.0**
- Login interactivo en navegador (por defecto)
- Service principal para automatización
- Refresh de token y manejo de expiración
- Storage seguro de credentials

**Descubrimiento Recursivo de Documentos**
- Escanea todas las carpetas anidadas en SharePoint
- Preserva estructura de carpetas
- Seguimiento de progreso
- Estimación de tamaño

**Modo Profesional (Azure AI Search)**
- integration directa con indexer de Azure AI Search
- Sincronización en tiempo real (schedule configurable)
- Sin duplicación de documentos
- Cloud-native, escalable

**Modo Local (Descarga)**
- Descarga todos los archivos con preservación de estructura
- Carpetas con timestamp: `sharepoint-2026-05-14_14-30-45/`
- Manifest with metadata and checksums
- Coexiste con documentos knowledge tradicionales

**Seguimiento de Metadatos**
- Tracking de fuente (SharePoint vs. local)
- Tiempos de modificación de archivos
- Detección de tipo MIME
- Preservación de rutas

**Resiliencia ante Errores**
- Reintentos automáticos en fallos
- Tracking de éxito parcial
- Logging detallado de errores
- Capacidad de reanudación

---

## Inicio Rápido

### Prerequisites

```bash
# 1. App registration en Azure AD (ver sección Setup)
# 2. Sitio SharePoint con biblioteca de documentos
# 3. Python 3.10+
# 4. Dependencias
pip install msal requests tqdm
```

### Modo Profesional (Recomendado)

```bash
# 1. Obtener credenciales
TENANT_ID="your-tenant-id"
CLIENT_ID="your-client-id"
SHAREPOINT_URL="https://contoso.sharepoint.com/sites/MyDocuments"

# 2. Setup (una vez)
python sharepoint-connector.py \
  --mode professional \
  --tenant-id $TENANT_ID \
  --client-id $CLIENT_ID \
  --sharepoint-url $SHAREPOINT_URL

# 3. Seguir instrucciones en pantalla para:
#    - Login en navegador
#    - Autorizar acceso SharePoint
#    - Configurar indexer Azure Search (paso manual en portal)
```

### Modo Local

```bash
# 1. Setup (descarga todo)
python sharepoint-connector.py \
  --mode local \
  --tenant-id $TENANT_ID \
  --client-id $CLIENT_ID \
  --sharepoint-url $SHAREPOINT_URL \
  --project-root /path/to/rag-mensadef

# 2. Archivos descargados a: knowledge/sharepoint-2026-05-14_14-30-45/
# 3. Manifiesto creado: knowledge/sharepoint-2026-05-14_14-30-45/manifest.json

# 4. Indexar automáticamente con rag-indexer
python .github/skills/rag-indexer/indexar.py
```

---

## Detalles de Setup

### App Registration en Azure AD

1. **Crear app registration** en Azure Portal
   ```
   Azure Portal -> Azure Active Directory -> App registrations -> New registration
   Nombre: "RAG SharePoint Connector"
   Redirect URI: http://localhost:8000 (para auth interactiva)
   ```

2. **Añadir permisos**
   ```
   API Permissions:
   - Microsoft Graph -> Sites.Read.All (Delegated + Application)
   - Microsoft Graph -> Files.Read.All (Delegated + Application)
   - Microsoft Graph -> offline_access (Delegated)
   ```

3. **Obtener credentials**
   ```
   Certificates & secrets:
   - Anota tu Client ID (desde Overview)
   - Crea Client Secret (copia el valor inmediatamente)

   Tu tenant ID: Azure Portal -> Azure Active Directory -> Properties
   ```

4. **Conceder permisos SharePoint**
   ```
   SharePoint Admin Center -> Share Data Access -> Grant access
   - Selecciona tu app
   - Concede acceso al sitio donde viven los documentos
   ```

### configuration de Environment

```bash
# .env o establecer variables de entorno
SHAREPOINT_TENANT_ID=your-tenant-id
SHAREPOINT_CLIENT_ID=your-client-id
SHAREPOINT_CLIENT_SECRET=your-client-secret  # (opcional, para service principal)
SHAREPOINT_URL=https://contoso.sharepoint.com/sites/MyDocuments
```

---

## Patrones de Uso

### Patrón 1: Modo Profesional (Sync Tiempo Real)

```python
from sharepoint_connector import setup_sharepoint_connector
from pathlib import Path

connector = setup_sharepoint_connector(
    project_root=Path("/path/to/rag-mensadef"),
    tenant_id="your-tenant-id",
    client_id="your-client-id",
    sharepoint_url="https://contoso.sharepoint.com/sites/Docs",
    mode="professional",
)

# Configurar indexer (manual o via Azure SDK)
config = connector.setup_professional_mode()
print(config)  # Usar esto para crear indexer en Azure Portal
```

### Patrón 2: Modo Local (Descargar e index)

```python
from sharepoint_connector import setup_sharepoint_connector
from pathlib import Path

connector = setup_sharepoint_connector(
    project_root=Path("/path/to/rag-mensadef"),
    tenant_id="your-tenant-id",
    client_id="your-client-id",
    sharepoint_url="https://contoso.sharepoint.com/sites/Docs",
    mode="local",
)

# Descargar todos los archivos
download_dir = connector.setup_local_mode(
    knowledge_dir=Path("/path/to/rag-mensadef/knowledge")
)
print(f"Descargado a: {download_dir}")
```
