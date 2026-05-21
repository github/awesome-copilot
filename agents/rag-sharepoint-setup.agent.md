---
name: 'RAG: SharePoint Setup'
description: 'Configura la integración con SharePoint en modo profesional (Azure Search tiempo real) o local (descarga). Gestiona OAuth, resolución de sitio y configuración del indexador.'
model: 'claude-haiku-4.5'
tools: true
skills: ['rag-sharepoint-connector', 'rag-indexer', 'rag-agent-instrumentation']
depends_on: ['rag-azure-setup']
---

**RAG Reference:** [Retrieval-augmented Generation con SharePoint - Microsoft Learn](https://learn.microsoft.com/en-us/azure/search/search-solutions-retrieval-augmented-generation)

## Propósito

Configuración completa de integración con SharePoint **de un solo golpe**:

- ✅ Autenticación OAuth 2.0 (navegador o service principal)
- ✅ Descubrimiento del sitio SharePoint
- ✅ Elegir modo: Profesional (sync tiempo real) o Local (descarga)
- ✅ Configurar para tu caso de uso
- ✅ Validar conexión
- ✅ Listo para consultar

---

## Cuándo usar

- `Configurar SharePoint para RAG`
- `Conectar RAG a SharePoint`
- `Configurar integración SharePoint`
- `Fuentes de conocimiento híbridas`
- `Añadir documentos SharePoint al RAG`

---

## Prerequisitos

- ✅ Suscripción Azure con infraestructura RAG desplegada
- ✅ Sitio SharePoint con biblioteca de documentos
- ✅ Registro de app en Azure AD (ver docs del skill para configuración)
- ✅ Acceso de administrador al sitio SharePoint
- ✅ Python 3.10+ con dependencias instaladas

---

## Duración estimada

- **Modo Profesional**: ~5 minutos (setup) + configuración manual en Azure portal (~10 min)
- **Modo Local**: ~5 minutos (setup) + tiempo de descarga (varía según tamaño)

---

## Lo que hace este agente

### Fase 1: Entrevista (1 min)

```
Preguntas:
  1. ¿Has registrado una app en Azure AD? (S/n)
  2. ¿Qué modo? (profesional/local/auto-recomendar)
  3. ¿URL de SharePoint? (https://contoso.sharepoint.com/sites/Docs)
  4. ¿Tenant ID? (de Azure AD)
  5. ¿Client ID? (del registro de app)
  6. ¿Client Secret? (opcional, para service principal)
```

### Fase 2: Configuración OAuth (2 min)

- **Opción A** (Interactivo): Login por navegador
  - Clic en enlace → login → autorizar
  - Tokens cacheados automáticamente
  
- **Opción B** (Service Principal): Auth desatendida
  - Usar client secret
  - Sin interacción del usuario

### Fase 3: Resolución del sitio (1 min)

- Verificar que el sitio SharePoint existe
- Detectar biblioteca de documentos
- Obtener site ID y drive ID
- Confirmar estructura de carpetas

### Fase 4: Configuración por modo (1 min)

**Modo Profesional:**
  - Mostrar plantilla de indexador Azure Search
  - Instrucciones para configuración manual en portal
  - Explicar programación de sync tiempo real
  
**Modo Local:**
  - Iniciar descarga
  - Mostrar barra de progreso
  - Verificar que todos los ficheros se descargaron

### Fase 5: Validación (1 min)

- Probar conexión SharePoint
- Contar documentos encontrados
- Verificar credenciales almacenadas de forma segura
- Mostrar siguientes pasos

---

## Salida

### Salida exitosa

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

## Manejo de errores

| Error | Recuperación |
|-------|-------------|
| "Autenticación fallida" | Re-ejecutar con credenciales correctas, verificar registro de app |
| "Acceso denegado al sitio" | Conceder permiso a la app en Centro de Admin SharePoint |
| "Sitio no encontrado" | Verificar formato de URL, comprobar que el sitio existe |
| "Timeout en descarga" | Reintentar, verificar red, considerar descarga por partes |
| "Índice ya existe" | Confirmar modo (profesional: merge, local: nueva carpeta) |

---

## Skills relacionados

- **rag-azure-setup**: Desplegar infraestructura Azure (prerequisito)
- **rag-indexer**: Indexar documentos descargados (modo local)
- **rag-query-cli**: Consultar todos los documentos (SharePoint + local)
- **rag-diagnostics**: Monitorizar progreso de indexación
