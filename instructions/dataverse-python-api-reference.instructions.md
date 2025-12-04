---
applyTo: '**'
---
# Dataverse SDK for Python — API Reference Guide

## DataverseClient Class
Main client for interacting with Dataverse. Initialize with base URL and Azure credentials.

### Key Methods

#### create(table_schema_name, records)
Create single or bulk records. Returns list of GUIDs.

```python
# Single record
ids = client.create("account", {"name": "Acme"})
print(ids[0])  # First GUID

# Bulk create
ids = client.create("account", [{"name": "Contoso"}, {"name": "Fabrikam"}])
```

#### get(table_schema_name, record_id=None, select, filter, orderby, top, expand, page_size)
Fetch single record or query multiple with OData options.

```python
# Single record
record = client.get("account", record_id="guid-here")

# Query with filter and paging
for batch in client.get(
    "account",
    filter="statecode eq 0",
    select=["name", "telephone1"],
    orderby=["createdon desc"],
    top=100,
    page_size=50
):
    for record in batch:
        print(record["name"])
```

#### update(table_schema_name, ids, changes)
Update single or bulk records.

```python
# Single update
client.update("account", "guid-here", {"telephone1": "555-0100"})

# Broadcast: apply same changes to many IDs
client.update("account", [id1, id2, id3], {"statecode": 1})

# Paired: one-to-one mapping
client.update("account", [id1, id2], [{"name": "A"}, {"name": "B"}])
```

#### delete(table_schema_name, ids, use_bulk_delete=True)
Delete single or bulk records.

```python
# Single delete
client.delete("account", "guid-here")

# Bulk delete (async)
job_id = client.delete("account", [id1, id2, id3])
```

#### create_table(table_schema_name, columns, solution_unique_name=None, primary_column_schema_name=None)
Create custom table.

```python
from enum import IntEnum

class ItemStatus(IntEnum):
    ACTIVE = 1
    INACTIVE = 2
    __labels__ = {
        1033: {"ACTIVE": "Active", "INACTIVE": "Inactive"}
    }

info = client.create_table("new_MyTable", {
    "new_Title": "string",
    "new_Quantity": "int",
    "new_Price": "decimal",
    "new_Active": "bool",
    "new_Status": ItemStatus
})
print(info["entity_logical_name"])
```

#### create_columns(table_schema_name, columns)
Add columns to existing table.

```python
created = client.create_columns("new_MyTable", {
    "new_Notes": "string",
    "new_Count": "int"
})
```

#### delete_columns(table_schema_name, columns)
Remove columns from table.

```python
removed = client.delete_columns("new_MyTable", ["new_Notes", "new_Count"])
```

#### delete_table(table_schema_name)
Delete custom table (irreversible).

```python
client.delete_table("new_MyTable")
```

#### get_table_info(table_schema_name)
Retrieve table metadata.

```python
info = client.get_table_info("new_MyTable")
if info:
    print(info["table_logical_name"])
    print(info["entity_set_name"])
```

#### list_tables()
List all custom tables.

```python
tables = client.list_tables()
for table in tables:
    print(table)
```

#### flush_cache(kind)
Clear SDK caches (e.g., picklist labels).

```python
removed = client.flush_cache("picklist")
```

## DataverseConfig Class
Configure client behavior (timeouts, retries, language).

```python
from PowerPlatform.Dataverse.core.config import DataverseConfig

cfg = DataverseConfig()
cfg.http_retries = 3
cfg.http_backoff = 1.0
cfg.http_timeout = 30
cfg.language_code = 1033  # English

client = DataverseClient(base_url=url, credential=cred, config=cfg)
```

## Error Handling
Catch `DataverseError` for SDK-specific exceptions. Check `is_transient` to decide retry.

```python
from PowerPlatform.Dataverse.core.errors import DataverseError

try:
    client.create("account", {"name": "Test"})
except DataverseError as e:
    print(f"Code: {e.code}")
    print(f"Message: {e.message}")
    print(f"Transient: {e.is_transient}")
    print(f"Details: {e.to_dict()}")
```

## OData Filter Tips
- Use exact logical names (lowercase) in filter expressions
- Column names in `select` are auto-lowercased
- Navigation property names in `expand` are case-sensitive

## References
- API docs: https://learn.microsoft.com/en-us/python/api/powerplatform-dataverse-client/powerplatform.dataverse.client.dataverseclient
- Config docs: https://learn.microsoft.com/en-us/python/api/powerplatform-dataverse-client/powerplatform.dataverse.core.config.dataverseconfig
- Errors: https://learn.microsoft.com/en-us/python/api/powerplatform-dataverse-client/powerplatform.dataverse.core.errors
