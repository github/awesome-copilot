---
name: 'rag-storage-connector'
description: 'PowerShell helper for obtaining Azure Blob Storage credentials via Azure CLI. Provides connection strings used by RAG indexers and document upload pipelines to access Blob Storage.'
---

# RAG Storage Connector — integration Azure Blob

**Helper basado en PowerShell para credentials de Azure Blob Storage.**

> Este skill es **solo PowerShell** (sin Python). Es un helper ligero para obtener
> connection strings via Azure CLI. La indexing/upload de documents ocurre en `rag-indexer`
> (que puede leer de carpetas locales o, con credentials de aquí, desde Blob).

## Overview

Utilidades helper para integration con Azure Blob Storage, usadas por indexers y pipelines de upload de documents.

## Features

- Gestión de connection strings
- Listado de cuentas/contenedores
- Compatibilidad PowerShell/Bash
- Helpers de credentials

## Requirements

- Cuenta de Azure Storage
- `.env` o credentials Azure CLI

## Uso

### Obtener Connection String (PowerShell)

```powershell
# Desde la raíz del proyecto
. .github/skills/rag-storage-connector/conexion-storage.ps1

# Esto muestra el connection string para pegar en .env
```

### En Environment

Añadir a `.env`:
```
AZURE_STORAGE_ACCOUNT=mystorageaccount
AZURE_STORAGE_KEY=<key-from-above>
AZURE_STORAGE_CONTAINER=documents
```

## Related Skills

- [`rag-indexer`](../rag-indexer/SKILL.md) — Usa Storage como fuente de documents
- [`rag-api-server`](../rag-api-server/SKILL.md) — Endpoint de upload

## Ver También

- [.github/README.md](../../README.md) — Arquitectura
