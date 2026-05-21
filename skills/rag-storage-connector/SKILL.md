# RAG Storage Connector — Integración Azure Blob

**Helper basado en PowerShell para credenciales de Azure Blob Storage.**

> Este skill es **solo PowerShell** (sin Python). Es un helper ligero para obtener
> connection strings via Azure CLI. La indexación/upload de documentos ocurre en `rag-indexer`
> (que puede leer de carpetas locales o, con credenciales de aquí, desde Blob).

## Descripción General

Utilidades helper para integración con Azure Blob Storage, usadas por indexers y pipelines de upload de documentos.

## Características

- Gestión de connection strings
- Listado de cuentas/contenedores
- Compatibilidad PowerShell/Bash
- Helpers de credenciales

## Requisitos

- Cuenta de Azure Storage
- `.env` o credenciales Azure CLI

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

## Skills Relacionados

- [`rag-indexer`](../rag-indexer/SKILL.md) — Usa storage como fuente de documentos
- [`rag-api-server`](../rag-api-server/SKILL.md) — Endpoint de upload

## Ver También

- [.github/README.md](../../README.md) — Arquitectura
