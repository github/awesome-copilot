---
applyTo: '**'
---
# Dataverse SDK for Python — Complete Module Reference

## Package Hierarchy

```
PowerPlatform.Dataverse
├── client
│   └── DataverseClient
├── core
│   ├── config (DataverseConfig)
│   └── errors (DataverseError, ValidationError, MetadataError, HttpError, SQLParseError)
├── data (OData operations, metadata, SQL, file upload)
├── extensions (placeholder for future extensions)
├── models (placeholder for data models and types)
└── utils (placeholder for utilities and adapters)
```

## core.config Module

Manage client connection and behavior settings.

### DataverseConfig Class

Container for language, timeouts, retries. Immutable.

```python
from PowerPlatform.Dataverse.core.config import DataverseConfig

cfg = DataverseConfig(
    language_code=1033,        # Default English (US)
    http_retries=None,         # Reserved for future
    http_backoff=None,         # Reserved for future
    http_timeout=None          # Reserved for future
)

# Or use default static builder
cfg_default = DataverseConfig.from_env()
```

**Key attributes:**
- `language_code: int = 1033` — LCID for localized labels and messages.
- `http_retries: int | None` — (Reserved) Maximum retry attempts for transient errors.
- `http_backoff: float | None` — (Reserved) Backoff multiplier between retries.
- `http_timeout: float | None` — (Reserved) Request timeout in seconds.

## core.errors Module

Structured exception hierarchy for SDK operations.

### DataverseError (Base)

Base exception for SDK errors.

```python
from PowerPlatform.Dataverse.core.errors import DataverseError

try:
    # SDK call
    pass
except DataverseError as e:
    print(f"Code: {e.code}")                # Error category
    print(f"Subcode: {e.subcode}")          # Specific error
    print(f"Message: {e.message}")          # Human-readable
    print(f"Status: {e.status_code}")       # HTTP status (if applicable)
    print(f"Transient: {e.is_transient}")   # Retry-worthy?
    details = e.to_dict()                  # Convert to dict
```

### ValidationError

Validation failures during data operations.

```python
from PowerPlatform.Dataverse.core.errors import ValidationError
```

### MetadataError

Table/column creation, deletion, or inspection failures.

```python
from PowerPlatform.Dataverse.core.errors import MetadataError

try:
    client.create_table("MyTable", {...})
except MetadataError as e:
    print(f"Metadata issue: {e.message}")
```

### HttpError

Web API HTTP request failures (4xx, 5xx, etc.).

```python
from PowerPlatform.Dataverse.core.errors import HttpError

try:
    client.get("account", record_id)
except HttpError as e:
    print(f"HTTP {e.status_code}: {e.message}")
    print(f"Service error code: {e.service_error_code}")
    print(f"Correlation ID: {e.correlation_id}")
    print(f"Request ID: {e.request_id}")
    print(f"Retry-After: {e.retry_after} seconds")
    print(f"Transient (retry?): {e.is_transient}")  # 429, 503, 504
```

### SQLParseError

SQL query syntax errors when using `query_sql()`.

```python
from PowerPlatform.Dataverse.core.errors import SQLParseError

try:
    client.query_sql("INVALID SQL HERE")
except SQLParseError as e:
    print(f"SQL parse error: {e.message}")
```

## data Package

Low-level OData protocol, metadata, SQL, and file operations (internal delegation).

The `data` package is primarily internal; the high-level `DataverseClient` in the `client` module wraps and exposes:
- CRUD operations via OData
- Metadata management (create/update/delete tables and columns)
- SQL query execution
- File upload handling

Users interact with these via `DataverseClient` methods (e.g., `create()`, `get()`, `update()`, `delete()`, `create_table()`, `query_sql()`, `upload_file()`).

## extensions Package (Placeholder)

Reserved for future extension points (e.g., custom adapters, middleware).

Currently empty; use core and client modules for current functionality.

## models Package (Placeholder)

Reserved for future data model definitions and type definitions.

Currently empty. Data structures return as `dict` (OData) and are JSON-serializable.

## utils Package (Placeholder)

Reserved for utility adapters and helpers.

Currently empty. Helper functions may be added in future releases.

## client Module

Main user-facing API.

### DataverseClient Class

High-level client for all Dataverse operations.

```python
from azure.identity import InteractiveBrowserCredential
from PowerPlatform.Dataverse.client import DataverseClient
from PowerPlatform.Dataverse.core.config import DataverseConfig

# Create credential
credential = InteractiveBrowserCredential()

# Optionally configure
cfg = DataverseConfig(language_code=1033)

# Create client
client = DataverseClient(
    base_url="https://org.crm.dynamics.com",
    credential=credential,
    config=cfg  # optional
)
```

#### CRUD Methods

- `create(table_schema_name, records)` → `list[str]` — Create records, return GUIDs.
- `get(table_schema_name, record_id=None, select, filter, orderby, top, expand, page_size)` → Record(s).
- `update(table_schema_name, ids, changes)` → `None` — Update records.
- `delete(table_schema_name, ids, use_bulk_delete=True)` → `str | None` — Delete records.

#### Metadata Methods

- `create_table(table_schema_name, columns, solution_unique_name, primary_column_schema_name)` → Metadata dict.
- `create_columns(table_schema_name, columns)` → `list[str]`.
- `delete_columns(table_schema_name, columns)` → `list[str]`.
- `delete_table(table_schema_name)` → `None`.
- `get_table_info(table_schema_name)` → Metadata dict or `None`.
- `list_tables()` → `list[str]`.

#### SQL & Utilities

- `query_sql(sql)` → `list[dict]` — Execute read-only SQL.
- `upload_file(table_schema_name, record_id, file_name_attribute, path, mode, mime_type, if_none_match)` → `None` — Upload to file column.
- `flush_cache(kind)` → `int` — Clear SDK caches (e.g., `"picklist"`).

## Imports Summary

```python
# Main client
from PowerPlatform.Dataverse.client import DataverseClient

# Configuration
from PowerPlatform.Dataverse.core.config import DataverseConfig

# Errors
from PowerPlatform.Dataverse.core.errors import (
    DataverseError,
    ValidationError,
    MetadataError,
    HttpError,
    SQLParseError,
)
```

## References

- Module docs: https://learn.microsoft.com/en-us/python/api/powerplatform-dataverse-client/
- Core: https://learn.microsoft.com/en-us/python/api/powerplatform-dataverse-client/powerplatform.dataverse.core
- Data: https://learn.microsoft.com/en-us/python/api/powerplatform-dataverse-client/powerplatform.dataverse.data
- Extensions: https://learn.microsoft.com/en-us/python/api/powerplatform-dataverse-client/powerplatform.dataverse.extensions
- Models: https://learn.microsoft.com/en-us/python/api/powerplatform-dataverse-client/powerplatform.dataverse.models
- Utils: https://learn.microsoft.com/en-us/python/api/powerplatform-dataverse-client/powerplatform.dataverse.utils
- Client: https://learn.microsoft.com/en-us/python/api/powerplatform-dataverse-client/powerplatform.dataverse.client
