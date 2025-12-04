# Dataverse SDK for Python - Best Practices Guide

## Overview
Production-ready patterns and best practices extracted from Microsoft's official PowerPlatform-DataverseClient-Python repository, examples, and recommended workflows.

## 1. Installation & Environment Setup

### Production Installation
```bash
# Install the published SDK from PyPI
pip install PowerPlatform-Dataverse-Client

# Install Azure Identity for authentication
pip install azure-identity

# Optional: pandas integration for data manipulation
pip install pandas
```

### Development Installation
```bash
# Clone the repository
git clone https://github.com/microsoft/PowerPlatform-DataverseClient-Python.git
cd PowerPlatform-DataverseClient-Python

# Install in editable mode for live development
pip install -e .

# Install development dependencies
pip install pytest pytest-cov black isort mypy ruff
```

### Python Version Support
- **Minimum**: Python 3.10
- **Recommended**: Python 3.11+ for best performance
- **Supported**: Python 3.10, 3.11, 3.12, 3.13, 3.14

### Verify Installation
```python
from PowerPlatform.Dataverse import __version__
from PowerPlatform.Dataverse.client import DataverseClient
from azure.identity import InteractiveBrowserCredential

print(f"SDK Version: {__version__}")
print("Installation successful!")
```

---

## 2. Authentication Patterns

### Interactive Development (Browser-Based)
```python
from azure.identity import InteractiveBrowserCredential
from PowerPlatform.Dataverse.client import DataverseClient

credential = InteractiveBrowserCredential()
client = DataverseClient("https://yourorg.crm.dynamics.com", credential)
```

**When to use:** Local development, interactive testing, single-user scenarios.

### Production (Client Secret)
```python
from azure.identity import ClientSecretCredential
from PowerPlatform.Dataverse.client import DataverseClient

credential = ClientSecretCredential(
    tenant_id="your-tenant-id",
    client_id="your-client-id",
    client_secret="your-client-secret"
)
client = DataverseClient("https://yourorg.crm.dynamics.com", credential)
```

**When to use:** Server-side applications, Azure automation, scheduled jobs.

### Certificate-Based Authentication
```python
from azure.identity import ClientCertificateCredential
from PowerPlatform.Dataverse.client import DataverseClient

credential = ClientCertificateCredential(
    tenant_id="your-tenant-id",
    client_id="your-client-id",
    certificate_path="path/to/certificate.pem"
)
client = DataverseClient("https://yourorg.crm.dynamics.com", credential)
```

**When to use:** Highly secure environments, certificate-pinning requirements.

### Azure CLI Authentication
```python
from azure.identity import AzureCliCredential
from PowerPlatform.Dataverse.client import DataverseClient

credential = AzureCliCredential()
client = DataverseClient("https://yourorg.crm.dynamics.com", credential)
```

**When to use:** Local testing with Azure CLI installed, Azure DevOps pipelines.

---

## 3. Singleton Client Pattern

**Best Practice**: Create one `DataverseClient` instance and reuse it throughout your application.

```python
# ❌ ANTI-PATTERN: Creating new clients repeatedly
def fetch_account(account_id):
    credential = InteractiveBrowserCredential()
    client = DataverseClient("https://yourorg.crm.dynamics.com", credential)
    return client.get("account", account_id)

# ✅ PATTERN: Singleton client
class DataverseService:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            credential = InteractiveBrowserCredential()
            cls._instance = DataverseClient(
                "https://yourorg.crm.dynamics.com", 
                credential
            )
        return cls._instance

# Usage
service = DataverseService()
account = service.get("account", account_id)
```

---

## 4. Configuration Optimization

### Connection Settings
```python
from PowerPlatform.Dataverse.core.config import DataverseConfig
from PowerPlatform.Dataverse.client import DataverseClient
from azure.identity import ClientSecretCredential

config = DataverseConfig(
    language_code=1033,  # English (US)
    # Note: http_retries, http_backoff, http_timeout are reserved for internal use
)

credential = ClientSecretCredential(tenant_id, client_id, client_secret)
client = DataverseClient("https://yourorg.crm.dynamics.com", credential, config)
```

**Key configuration options:**
- `language_code`: Language for API responses (default: 1033 for English)

---

## 5. CRUD Operations Best Practices

### Create Operations

#### Single Record
```python
record_data = {
    "name": "Contoso Ltd",
    "telephone1": "555-0100",
    "creditlimit": 100000.00,
}
created_ids = client.create("account", record_data)
record_id = created_ids[0]
print(f"Created: {record_id}")
```

#### Bulk Create (Automatically Optimized)
```python
# SDK automatically uses CreateMultiple for arrays > 1 record
records = [
    {"name": f"Company {i}", "creditlimit": 50000 + (i * 1000)}
    for i in range(100)
]
created_ids = client.create("account", records)
print(f"Created {len(created_ids)} records")
```

**Performance**: Bulk create is optimized internally; no manual batching required.

### Read Operations

#### Single Record by ID
```python
account = client.get("account", "account-guid-here")
print(account.get("name"))
```

#### Query with Filtering & Selection
```python
# Returns paginated results (generator)
for page in client.get(
    "account",
    filter="creditlimit gt 50000",
    select=["name", "creditlimit", "telephone1"],
    orderby="name",
    top=100
):
    for account in page:
        print(f"{account['name']}: ${account['creditlimit']}")
```

**Key parameters:**
- `filter`: OData filter (must use **lowercase** logical names)
- `select`: Fields to retrieve (improves performance)
- `orderby`: Sort results
- `top`: Max records per page (default: 5000)
- `page_size`: Override page size for pagination

#### SQL Queries (Read-Only)
```python
# SQL queries are read-only; use for complex analytics
results = client.query_sql("""
    SELECT TOP 10 name, creditlimit 
    FROM account 
    WHERE creditlimit > 50000
    ORDER BY name
""")

for row in results:
    print(f"{row['name']}: ${row['creditlimit']}")
```

**Limitations:**
- Read-only (SELECT only, no DML)
- Useful for complex joins and analytics
- May be disabled by org policy

### Update Operations

#### Single Record
```python
client.update("account", "account-guid", {
    "creditlimit": 150000.00,
    "name": "Updated Company Name"
})
```

#### Bulk Update (Broadcast Same Change)
```python
# Update all selected records with same data
account_ids = ["id1", "id2", "id3"]
client.update("account", account_ids, {
    "industrycode": 1,  # Retail
    "accountmanagerid": "manager-guid"
})
```

#### Paired Updates (1:1 Record Updates)
```python
# For different updates per record, send multiple calls
updates = {
    "id1": {"creditlimit": 100000},
    "id2": {"creditlimit": 200000},
    "id3": {"creditlimit": 300000},
}
for record_id, data in updates.items():
    client.update("account", record_id, data)
```

### Delete Operations

#### Single Record
```python
client.delete("account", "account-guid")
```

#### Bulk Delete (Optimized)
```python
# SDK automatically uses BulkDelete for large lists
record_ids = ["id1", "id2", "id3", ...]
client.delete("account", record_ids, use_bulk_delete=True)
```

---

## 6. Error Handling & Recovery

### Exception Hierarchy
```python
from PowerPlatform.Dataverse.core.errors import (
    DataverseError,           # Base class
    ValidationError,          # Validation failures
    MetadataError,           # Table/column operations
    HttpError,               # HTTP-level errors
    SQLParseError            # SQL query syntax errors
)

try:
    client.create("account", {"name": None})  # Invalid
except ValidationError as e:
    print(f"Validation failed: {e}")
    # Handle validation-specific logic
except DataverseError as e:
    print(f"General SDK error: {e}")
    # Handle other SDK errors
```

### Retry Logic Pattern
```python
import time
from PowerPlatform.Dataverse.core.errors import HttpError

def create_with_retry(table_name, record_data, max_retries=3):
    """Create record with exponential backoff retry logic."""
    for attempt in range(max_retries):
        try:
            return client.create(table_name, record_data)
        except HttpError as e:
            if attempt == max_retries - 1:
                raise
            
            # Exponential backoff: 1s, 2s, 4s
            backoff_seconds = 2 ** attempt
            print(f"Attempt {attempt + 1} failed. Retrying in {backoff_seconds}s...")
            time.sleep(backoff_seconds)

# Usage
created_ids = create_with_retry("account", {"name": "Contoso"})
```

### 429 (Request Rate Limit) Handling
```python
import time
from PowerPlatform.Dataverse.core.errors import HttpError

try:
    accounts = client.get("account", top=5000)
except HttpError as e:
    if "429" in str(e):
        # Rate limited; wait and retry
        print("Rate limited. Waiting 60 seconds...")
        time.sleep(60)
        accounts = client.get("account", top=5000)
    else:
        raise
```

---

## 7. Table & Column Management

### Create Custom Table
```python
from enum import IntEnum

class Priority(IntEnum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3

# Define columns with types
columns = {
    "new_Title": "string",
    "new_Quantity": "int",
    "new_Amount": "decimal",
    "new_Completed": "bool",
    "new_Priority": Priority,  # Creates option set/picklist
    "new_CreatedDate": "datetime"
}

table_info = client.create_table(
    "new_CustomTable",
    primary_column_schema_name="new_Name",
    columns=columns
)

print(f"Created table: {table_info['table_schema_name']}")
```

### Get Table Metadata
```python
table_info = client.get_table_info("account")
print(f"Schema Name: {table_info['table_schema_name']}")
print(f"Logical Name: {table_info['table_logical_name']}")
print(f"Entity Set: {table_info['entity_set_name']}")
print(f"Primary ID: {table_info['primary_id_attribute']}")
```

### List All Tables
```python
tables = client.list_tables()
for table in tables:
    print(f"{table['table_schema_name']} ({table['table_logical_name']})")
```

### Column Management
```python
# Add columns to existing table
client.create_columns("new_CustomTable", {
    "new_Status": "string",
    "new_Priority": "int"
})

# Delete columns
client.delete_columns("new_CustomTable", ["new_Status", "new_Priority"])

# Delete table
client.delete_table("new_CustomTable")
```

---

## 8. Paging & Large Result Sets

### Pagination Pattern
```python
# Retrieve all accounts in pages
all_accounts = []
for page in client.get(
    "account",
    top=500,      # Records per page
    page_size=500
):
    all_accounts.extend(page)
    print(f"Retrieved page with {len(page)} records")

print(f"Total: {len(all_accounts)} records")
```

### Manual Paging with Continuation Tokens
```python
# For complex paging scenarios
skip_count = 0
page_size = 1000

while True:
    page = client.get("account", top=page_size, skip=skip_count)
    if not page:
        break
    
    print(f"Page {skip_count // page_size + 1}: {len(page)} records")
    skip_count += page_size
```

---

## 9. File Operations

### Upload Small Files (< 128 MB)
```python
from pathlib import Path

file_path = Path("document.pdf")
record_id = "account-guid"

# Single PATCH upload
response = client.upload_file(
    table_name="account",
    record_id=record_id,
    file_column_name="new_documentfile",
    file_path=file_path
)
print(f"Upload successful: {response}")
```

### Upload Large Files with Chunking
```python
from pathlib import Path

file_path = Path("large_video.mp4")
record_id = "account-guid"

# SDK automatically chunks large files
response = client.upload_file(
    table_name="account",
    record_id=record_id,
    file_column_name="new_videofile",
    file_path=file_path,
    chunk_size=4 * 1024 * 1024  # 4 MB chunks
)
print(f"Chunked upload complete")
```

---

## 10. OData Filter Optimization

### Case Sensitivity Rules
```python
# ❌ WRONG: Uppercase logical names
results = client.get("account", filter="Name eq 'Contoso'")

# ✅ CORRECT: Lowercase logical names
results = client.get("account", filter="name eq 'Contoso'")

# ✅ Values ARE case-sensitive when needed
results = client.get("account", filter="name eq 'Contoso Ltd'")
```

### Filter Expression Examples
```python
# Equality
client.get("account", filter="name eq 'Contoso'")

# Greater than / Less than
client.get("account", filter="creditlimit gt 50000")
client.get("account", filter="createdon lt 2024-01-01")

# String contains
client.get("account", filter="contains(name, 'Ltd')")

# AND/OR operations
client.get("account", filter="(name eq 'Contoso') and (creditlimit gt 50000)")
client.get("account", filter="(industrycode eq 1) or (industrycode eq 2)")

# NOT operation
client.get("account", filter="not(statecode eq 1)")
```

### Select & Expand
```python
# Select specific columns (improves performance)
client.get("account", select=["name", "creditlimit", "telephone1"])

# Expand related records
client.get(
    "account",
    expand=["parentaccountid($select=name)"],
    select=["name", "parentaccountid"]
)
```

---

## 11. Cache Management

### Flushing Cache
```python
# Clear SDK internal cache after bulk operations
client.flush_cache()

# Useful after:
# - Metadata changes (table/column creation)
# - Bulk deletes
# - Metadata synchronization
```

---

## 12. Performance Best Practices

### Do's ✅
1. **Use `select` parameter**: Only fetch needed columns
   ```python
   client.get("account", select=["name", "creditlimit"])
   ```

2. **Batch operations**: Create/update multiple records at once
   ```python
   ids = client.create("account", [record1, record2, record3])
   ```

3. **Use paging**: Don't load all records at once
   ```python
   for page in client.get("account", top=1000):
       process_page(page)
   ```

4. **Reuse client instance**: Create once, use many times
   ```python
   client = DataverseClient(url, credential)  # Once
   # Reuse throughout app
   ```

5. **Apply filters on server**: Let Dataverse filter before returning
   ```python
   client.get("account", filter="creditlimit gt 50000")
   ```

### Don'ts ❌
1. **Don't fetch all columns**: Specify what you need
   ```python
   # Slow
   client.get("account")
   ```

2. **Don't create records in loops**: Batch them
   ```python
   # Slow
   for record in records:
       client.create("account", record)
   ```

3. **Don't load all results at once**: Use pagination
   ```python
   # Slow
   all_accounts = list(client.get("account"))
   ```

4. **Don't create new clients repeatedly**: Reuse singleton
   ```python
   # Inefficient
   for i in range(100):
       client = DataverseClient(url, credential)
   ```

---

## 13. Common Patterns Summary

### Pattern: Upsert (Create or Update)
```python
def upsert_account(name, data):
    """Create account or update if exists."""
    try:
        # Try to find existing
        results = list(client.get("account", filter=f"name eq '{name}'"))
        if results:
            account_id = results[0]['accountid']
            client.update("account", account_id, data)
            return account_id, "updated"
        else:
            ids = client.create("account", {"name": name, **data})
            return ids[0], "created"
    except Exception as e:
        print(f"Upsert failed: {e}")
        raise
```

### Pattern: Bulk Operation with Error Recovery
```python
def create_with_recovery(records):
    """Create records with per-record error tracking."""
    results = {"success": [], "failed": []}
    
    try:
        ids = client.create("account", records)
        results["success"] = ids
    except Exception as e:
        # If bulk fails, try individual records
        for i, record in enumerate(records):
            try:
                ids = client.create("account", record)
                results["success"].append(ids[0])
            except Exception as e:
                results["failed"].append({"index": i, "record": record, "error": str(e)})
    
    return results
```

---

## 14. Dependencies & Versions

### Core Dependencies
- **azure-identity** >= 1.17.0 (Authentication)
- **azure-core** >= 1.30.2 (HTTP client)
- **requests** >= 2.32.0 (HTTP requests)
- **Python** >= 3.10

### Optional Dependencies
- **pandas** (Data manipulation)
- **reportlab** (PDF generation for file examples)

### Development Tools
- **pytest** >= 7.0.0 (Testing)
- **black** >= 23.0.0 (Code formatting)
- **mypy** >= 1.0.0 (Type checking)
- **ruff** >= 0.1.0 (Linting)

---

## 15. Troubleshooting Common Issues

### ImportError: No module named 'PowerPlatform'
```bash
# Verify installation
pip show PowerPlatform-Dataverse-Client

# Reinstall
pip install --upgrade PowerPlatform-Dataverse-Client

# Check virtual environment is activated
which python  # Should show venv path
```

### Authentication Failed
```python
# Verify credentials have Dataverse access
# Try interactive auth first for testing
from azure.identity import InteractiveBrowserCredential
credential = InteractiveBrowserCredential(
    tenant_id="your-tenant-id"  # Specify if multiple tenants
)

# Check org URL format
# ✓ https://yourorg.crm.dynamics.com
# ❌ https://yourorg.crm.dynamics.com/
# ❌ https://yourorg.crm4.dynamics.com (regional)
```

### HTTP 429 Rate Limiting
```python
# Reduce request frequency
# Implement exponential backoff (see Error Handling section)
# Reduce page size
client.get("account", top=500)  # Instead of 5000
```

### MetadataError: Table Not Found
```python
# Verify table exists (schema name is case-insensitive for existence, but case-sensitive for API)
tables = client.list_tables()
print([t['table_schema_name'] for t in tables])

# Use exact schema name
table_info = client.get_table_info("new_customprefixed_table")
```

### SQL Query Not Enabled
```python
# query_sql() requires org config
# If disabled, fallback to OData
try:
    results = client.query_sql("SELECT * FROM account")
except Exception:
    # Fallback to OData
    results = client.get("account")
```

---

## Reference Links
- [Official Repository](https://github.com/microsoft/PowerPlatform-DataverseClient-Python)
- [PyPI Package](https://pypi.org/project/PowerPlatform-Dataverse-Client/)
- [Azure Identity Documentation](https://learn.microsoft.com/en-us/python/api/overview/azure/identity-readme)
- [Dataverse Web API Documentation](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/overview)
