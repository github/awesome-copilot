# RAG Indexer — Indexación de Documentos

**Indexa documentos desde la carpeta `knowledge/` en Azure AI Search.**

## Descripción General

Indexa masivamente documentos de varios formatos (PDF, DOCX, SQL, TXT, MD) en Azure AI Search con chunking automático y extracción de metadatos.

## Características

- Soporte multi-formato (PDF, DOCX, SQL, TXT, MD, XML)
- Chunking automático de texto con overlap
- Creación del índice si no existe
- Manejo de errores e informes
- Seguimiento de progreso
- Soporte de rutas relativas

## Requisitos

- Instancia Azure AI Search
- Archivo `.env` con:
  - `AZURE_SEARCH_ENDPOINT`
  - `AZURE_SEARCH_KEY`
  - `AZURE_SEARCH_INDEX`
- Estructura de carpeta `knowledge/`:
  ```
  knowledge/
  ├── pdfs/
  ├── procedimientos/
  ├── codigo/
  └── presentaciones/
  ```

## Instalación

```bash
pip install -r .github/requirements.txt
```

## Uso

### Ejecutar Indexación

```bash
# Desde la raíz del proyecto
python .github/skills/rag-indexer/indexar.py
```

### Qué Hace

1. **Crea índice** si no existe
2. **Escanea carpetas**:
   - `knowledge/pdfs/` -> Documentos PDF
   - `knowledge/procedimientos/` -> Word/Excel/Markdown
   - `knowledge/codigo/` -> SQL/Python/JavaScript
   - `knowledge/presentaciones/` -> PowerPoint/Imágenes
3. **Extrae texto** de cada archivo
4. **Fragmenta texto** (1000 tokens, 200 tokens de overlap)
5. **Sube a Azure** con metadatos
6. **Reporta resumen**

### Ejemplo de Output

```
============================================================
  RAG Indexer - Indexando Documentos
============================================================

  Índice 'rag-documents' ya existe

  Iniciando indexación...

  Indexando pdf desde pdfs/
    Manual.pdf (8 chunks)
    FAQ.pdf (12 chunks)
  Total: 2 archivos indexados

  Indexando documento desde procedimientos/
    Process.docx (5 chunks)
    Checklist.xlsx (3 chunks)
  Total: 2 archivos indexados

  Indexando código desde codigo/
    schema.sql (15 chunks)
  Total: 1 archivo indexado

  Indexando presentación desde presentaciones/
    Architecture.pptx (4 chunks)
  Total: 1 archivo indexado

============================================================
  Resumen de Indexación
============================================================
  Total archivos procesados: 6
  Total documentos indexados: 6
  Total chunks creados: 47

  Indexación completa! Listo para consultar.
============================================================
```
