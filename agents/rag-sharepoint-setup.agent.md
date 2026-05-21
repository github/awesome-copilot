---
name: 'RAG: SharePoint Setup'
description: 'Configures SharePoint integration in professional mode (real-time Azure AI Search) or local mode (download). Manages OAuth, site resolution, and indexer configuration.'
model: 'claude-haiku-4.5'
tools: true
skills: ['rag-sharepoint-connector', 'rag-indexer', 'rag-agent-instrumentation']
depends_on: ['rag-azure-setup']
---

**RAG Reference:** [Retrieval-augmented Generation con SharePoint - Microsoft Learn](https://learn.microsoft.com/en-us/azure/search/search-solutions-retrieval-augmented-generation)

## Purpose

Complete SharePoint integration configuration **in one go**:

- ✅ OAuth 2.0 authentication (browser or service principal)
- ✅ SharePoint site discovery
- ✅ Choose mode: Professional (real-time sync) or Local (download)
- ✅ Configure for your use case
- ✅ Validate connection
- ✅ Ready to query

---

## When to Use

- `Configure SharePoint for RAG`
- `Connect RAG to SharePoint`
- `Configure SharePoint integration`
- `Hybrid knowledge sources`
- `Add SharePoint documents to RAG`

---

## Prerequisites

- ✅ Suscripción Azure con infraestructura RAG desplegada
- ✅ Sitio SharePoint con biblioteca de documentos
- ✅ Registro de app en Azure AD (ver docs del skill para configuration)
- ✅ Acceso de administrador al sitio SharePoint
- ✅ Python 3.10+ con dependencias instaladas

---

## Estimated Duration

- **Modo Profesional**: ~5 minutos (setup) + configuration manual en Azure portal (~10 min)
- **Modo Local**: ~5 minutos (setup) + tiempo de descarga (varía según tamaño)

---

## Lo que hace este agente

### Phase 1: Entrevista (1 min)

```
Preguntas:
  1. ¿Has registrado una app en Azure AD? (S/n)
  2. ¿Qué modo? (profesional/local/auto-recomendar)
  3. ¿URL de SharePoint? (https://contoso.sharepoint.com/sites/Docs)
  4. ¿Tenant ID? (de Azure AD)
  5. ¿Client ID? (del registro de app)
  6. ¿Client Secret? (opcional, para service principal)
```

### Phase 2: configuration OAuth (2 min)

- **Opción A** (Interactivo): Login por navegador
  - Clic en enlace → login → autorizar
  - Tokens cacheados automáticamente

- **Opción B** (Service Principal): Auth desatendida
  - Usar client secret
  - Sin interacción del usuario

### Phase 3: Resolución del sitio (1 min)

- Verificar que el sitio SharePoint existe
- Detectar biblioteca de documentos
- Obtener site ID y drive ID
- Confirmar estructura de carpetas

### Phase 4: configuration por modo (1 min)

**Modo Profesional:**
  - Mostrar plantilla de indexador Azure AI Search
  - Instrucciones para configuration manual en portal
  - Explicar programación de sync tiempo real

**Modo Local:**
  - Iniciar descarga
  - Mostrar barra de progreso
  - Verificar que todos los ficheros se descargaron

### Phase 5: validation (1 min)

- Probar conexión SharePoint
- Contar documentos encontrados
- Verificar credentials almacenadas de forma segura
- Mostrar siguientes pasos

---

## Output

### Output exitosa

```
✅ Configuración SharePoint completa

Modo: Profesional
Sitio SharePoint: Documentos Finanzas
Documentos encontrados: 2,345
Tamaño total: 15.3 GB

Siguientes pasos:
1. Crear indexador en Azure Portal
2. Usar esta configuración: [config.json]
3. Ejecutar indexador manualmente o esperar sync programado (1 hora)
4. Consultar documentos: python consultar.py "..."

Config guardada: scripts/sharepoint-config.json
```

### Con descarga en modo local

```
✅ Configuración SharePoint completa

Modo: Local (Descarga)
Sitio SharePoint: Documentos Finanzas
Descargados: 2,345 archivos, 15.3 GB
Destino: knowledge/sharepoint-2026-05-14_14-30-45/

Indexación: Ejecutando rag-indexer.py...
  ✅ Indexados 2,345 documentos
  ✅ Tamaño del índice: 1.2 GB (comprimido)

Siguientes pasos:
1. Consultar: python .github/skills/rag-query-cli/consultar.py "¿Cuál es el presupuesto Q1?"
2. O: python .github/skills/rag-api-server/servidor-api.py (API REST)
3. Monitorizar: python .github/skills/rag-diagnostics/estado-sistema.py

Config guardada: scripts/sharepoint-config.json
Manifiesto guardado: knowledge/sharepoint-2026-05-14_14-30-45/manifest.json
```

---

## Error Handling

| Error | Recuperación |
|-------|-------------|
| "authentication fallida" | Re-ejecutar con credentials correctas, verificar registro de app |
| "Acceso denegado al sitio" | Conceder permiso a la app en Centro de Admin SharePoint |
| "Sitio no encontrado" | Verificar formato de URL, comprobar que el sitio existe |
| "Timeout en descarga" | Reintentar, verificar red, considerar descarga por partes |
| "Índice ya existe" | Confirmar modo (profesional: merge, local: nueva carpeta) |

---

## Related Skills

- **rag-azure-setup**: deploy infraestructura Azure (prerequisito)
- **rag-indexer**: index documentos descargados (modo local)
- **rag-query-cli**: Consultar todos los documentos (SharePoint + local)
- **rag-diagnostics**: Monitorizar progreso de indexing
