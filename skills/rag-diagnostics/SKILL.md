# RAG Diagnostics — Salud del Sistema y Monitorización

**Monitoriza, diagnostica y soluciona problemas de tu sistema RAG.**

## Descripción General

Colección de herramientas de diagnóstico y monitorización para verificar la salud de Azure AI Search, estado del índice y configuración del sistema.

## Características

- Informe de estado del sistema (todos los componentes)
- Diagnósticos del índice (documentos, campos, salud)
- Verificación de configuración
- Monitorización en tiempo real
- Informes de error con soluciones

## Herramientas Incluidas

### 1. **estado-sistema.py** — Estado Completo del Sistema

Verificar salud general del RAG y estado de componentes.

```bash
python .github/skills/rag-diagnostics/estado-sistema.py
```

**Output:**
```
========================================================================
  RAG SYSTEM STATUS REPORT
========================================================================

  FASE 1: Búsqueda Keyword + Semántica
   Estado: Running
   Items procesados: 113
   Items fallidos: 0
   Duración: 245000 ms
   Índice: rag-documents

  FASE 2: Búsqueda Vectorial
   Estado: Running
   Items procesados: 86
   Items fallidos: 0
   Duración: 123000 ms
   Índice: rag-documents-vectors

  ESTADÍSTICAS DEL ÍNDICE
   rag-documents: 113 documentos
   rag-documents-vectors: 86 documentos
```

### 2. **diagnosticar.py** — Diagnósticos Detallados

Análisis profundo de configuración Azure Search y problemas.

```bash
python .github/skills/rag-diagnostics/diagnosticar.py
```

**Output:**
```
1  INDEXES
   rag-documents
      - Campos: 7
      - Vectores: No

2  DATA SOURCES
   blob-storage
      - Tipo: AzureBlobStorage

3  SKILLSETS
   ocr-skillset
      - Skills: 4
      - Tipos: OcrSkill, SplitSkill, MergeSkill

4  INDEXERS
   blob-indexer
      - Estado: Running
      - Schedule: Every hour
```

### 3. **monitorear.py** — Monitorización en Tiempo Real

Monitorización continua de actividad del indexer.

```bash
python .github/skills/rag-diagnostics/monitorear.py
```

**Output:**
```
Monitorizando indexer: blob-indexer
Pulsa Ctrl+C para detener

[14:23:45] Estado: Running | Procesados: 45 | Fallidos: 0
[14:24:10] Estado: Running | Procesados: 89 | Fallidos: 1
[14:24:35] Estado: Completed | Procesados: 113 | Fallidos: 0
```

## Requisitos

```bash
pip install -r .github/requirements.txt
```

- `.env` con credenciales Azure Search:
  - `AZURE_SEARCH_ENDPOINT`
  - `AZURE_SEARCH_KEY`

## Ejemplos de Uso

### Verificar Salud del Sistema

```bash
python .github/skills/rag-diagnostics/estado-sistema.py
```

### Diagnosticar Problemas del Indexer

```bash
python .github/skills/rag-diagnostics/diagnosticar.py
```

### Monitorizar Progreso en Vivo

```bash
# Ver indexación en tiempo real
python .github/skills/rag-diagnostics/monitorear.py
```

## Problemas Comunes y Soluciones

| Problema | Diagnóstico | Solución |
|---|---|---|
| Índice vacío | `estado-sistema.py` muestra 0 docs | Ejecutar skill `rag-indexer` |
| Indexer fallido | `diagnosticar.py` muestra status: Failed | Verificar credenciales `.env` |
| Búsqueda semántica no funciona | Índice sin config semántica | Recrear índice con semántica habilitada |
| Indexación lenta | `monitorear.py` muestra bajo throughput | Aumentar tier Search o batch size |

## Integración

### En Scripts

```python
from estado_sistema import check_status

status = check_status()
if status['index_count'] == 0:
    print("No hay documentos indexados aún")
else:
    print(f"{status['index_count']} documentos listos")
```

### En CI/CD

```bash
# Health check antes del despliegue
python .github/skills/rag-diagnostics/diagnosticar.py || exit 1
```
