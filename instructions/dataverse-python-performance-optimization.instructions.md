---
applyTo: '**'
---

# Dataverse SDK for Python — Performance & Optimization Guide

Based on official Microsoft Dataverse and Azure SDK performance guidance.

## 1. Performance Overview

The Dataverse SDK for Python is optimized for Python developers but has some limitations in preview:
- **Minimal retry policy**: Only network errors are retried by default
- **No DeleteMultiple**: Use individual deletes or update status instead
- **Limited OData batching**: General-purpose OData batching not supported
- **SQL limitations**: No JOINs, limited WHERE/TOP/ORDER BY

Workarounds and optimization strategies address these limitations.

---

## 2. Query Optimization

### Use Select to Limit Columns

```python
# ❌ SLOW - Retrieves all columns
accounts = client.get("account", top=100)

# ✅ FAST - Only retrieve needed columns
accounts = client.get(
    "account",
    select=["accountid", "name", "telephone1", "creditlimit"],
    top=100
)
```

**Impact**: Reduces payload size and memory usage by 30-50%.

---

### Use Filters Efficiently

```python
# ❌ SLOW - Fetch all, filter in Python
all_accounts = client.get("account")
active_accounts = [a for a in all_accounts if a.get("statecode") == 0]

# ✅ FAST - Filter server-side
accounts = client.get(
    "account",
    filter="statecode eq 0",
    top=100
)
```

**OData filter examples**:
```python
# Equals
filter="statecode eq 0"

# String contains
filter="contains(name, 'Acme')"

# Multiple conditions
filter="statecode eq 0 and createdon gt 2025-01-01Z"

# Not equals
filter="statecode ne 2"
```

---

### Order by for Predictable Paging

```python
# Ensure consistent order for pagination
accounts = client.get(
    "account",
    orderby=["createdon desc", "name asc"],
    page_size=100
)

for page in accounts:
    process_page(page)
```

---

## 3. Pagination Best Practices

### Lazy Pagination (Recommended)

```python
# ✅ BEST - Generator yields one page at a time
pages = client.get(
    "account",
    top=5000,              # Total limit
    page_size=200          # Per-page size (hint)
)

for page in pages:  # Each iteration fetches one page
    for record in page:
        process_record(record)  # Process immediately
```

**Benefits**:
- Memory efficient (pages loaded on-demand)
- Fast time-to-first-result
- Can stop early if needed

### Avoid Loading Everything into Memory

```python
# ❌ SLOW - Loads all 100,000 records at once
all_records = list(client.get("account", top=100000))
process(all_records)

# ✅ FAST - Process as you go
for page in client.get("account", top=100000, page_size=5000):
    process(page)
```

---

## 4. Batch Operations

### Bulk Create (Recommended)

```python
# ✅ BEST - Single call with multiple records
payloads = [
    {"name": f"Account {i}", "telephone1": f"555-{i:04d}"}
    for i in range(1000)
]
ids = client.create("account", payloads)  # One API call for many records
```

### Bulk Update - Broadcast Mode

```python
# ✅ FAST - Same update applied to many records
account_ids = ["id1", "id2", "id3", "..."]
client.update("account", account_ids, {"statecode": 1})  # One call
```

### Bulk Update - Per-Record Mode

```python
# ✅ ACCEPTABLE - Different updates for each record
account_ids = ["id1", "id2", "id3"]
updates = [
    {"telephone1": "555-0100"},
    {"telephone1": "555-0200"},
    {"telephone1": "555-0300"},
]
client.update("account", account_ids, updates)
```

### Batch Size Tuning

Based on table complexity (per Microsoft guidance):

| Table Type | Batch Size | Max Threads |
|------------|-----------|-------------|
| OOB (Account, Contact, Lead) | 200-300 | 30 |
| Simple (few lookups) | ≤10 | 50 |
| Moderately complex | ≤100 | 30 |
| Large/complex (>100 cols, >20 lookups) | 10-20 | 10-20 |

```python
def bulk_create_optimized(client, table_name, payloads, batch_size=200):
    """Create records in optimal batch size."""
    for i in range(0, len(payloads), batch_size):
        batch = payloads[i:i + batch_size]
        ids = client.create(table_name, batch)
        print(f"Created {len(ids)} records")
        yield ids
```

---

## 5. Connection Management

### Reuse Client Instance

```python
# ❌ BAD - Creates new connection each time
def process_batch():
    for batch in batches:
        client = DataverseClient(...)  # Expensive!
        client.create("account", batch)

# ✅ GOOD - Reuse connection
client = DataverseClient(...)  # Create once

def process_batch():
    for batch in batches:
        client.create("account", batch)  # Reuse
```

### Global Client Instance

```python
# singleton_client.py
from azure.identity import DefaultAzureCredential
from PowerPlatform.Dataverse.client import DataverseClient

_client = None

def get_client():
    global _client
    if _client is None:
        _client = DataverseClient(
            base_url="https://myorg.crm.dynamics.com",
            credential=DefaultAzureCredential()
        )
    return _client

# main.py
from singleton_client import get_client

client = get_client()
records = client.get("account")
```

### Connection Timeout Configuration

```python
from PowerPlatform.Dataverse.core.config import DataverseConfig

cfg = DataverseConfig()
cfg.http_timeout = 30         # Request timeout
cfg.connection_timeout = 5    # Connection timeout

client = DataverseClient(
    base_url="https://myorg.crm.dynamics.com",
    credential=credential,
    config=cfg
)
```

---

## 6. Async Operations (Future Capability)

Currently synchronous, but prepare for async:

```python
# Recommended pattern for future async support
import asyncio

async def get_accounts_async(client):
    """Pattern for future async SDK."""
    # When SDK supports async:
    # accounts = await client.get("account")
    # For now, use sync with executor
    loop = asyncio.get_event_loop()
    accounts = await loop.run_in_executor(
        None, 
        lambda: list(client.get("account"))
    )
    return accounts

# Usage
accounts = asyncio.run(get_accounts_async(client))
```

---

## 7. File Upload Optimization

### Small Files (<128 MB)

```python
# ✅ FAST - Single request
client.upload_file(
    table_name="account",
    record_id=record_id,
    column_name="document_column",
    file_path="small_file.pdf"
)
```

### Large Files (>128 MB)

```python
# ✅ OPTIMIZED - Chunked upload
client.upload_file(
    table_name="account",
    record_id=record_id,
    column_name="document_column",
    file_path="large_file.pdf",
    mode='chunk',
    if_none_match=True
)

# SDK automatically:
# 1. Splits file into 4MB chunks
# 2. Uploads chunks in parallel
# 3. Assembles on server
```

---

## 8. OData Query Optimization

### SQL Alternative (Simple Queries)

```python
# ✅ SOMETIMES FASTER - Direct SQL for SELECT only
# Limited support: single SELECT, optional WHERE/TOP/ORDER BY
records = client.get(
    "account",
    sql="SELECT accountid, name FROM account WHERE statecode = 0 ORDER BY name"
)
```

### Complex Queries

```python
# ❌ NOT SUPPORTED - JOINs, complex WHERE
sql="SELECT a.accountid, c.fullname FROM account a JOIN contact c ON a.accountid = c.parentcustomerid"

# ✅ WORKAROUND - Get accounts, then contacts for each
accounts = client.get("account", select=["accountid", "name"])
for account in accounts:
    contacts = client.get(
        "contact",
        filter=f"parentcustomerid eq '{account['accountid']}'"
    )
    process(account, contacts)
```

---

## 9. Memory Management

### Process Large Datasets Incrementally

```python
import gc

def process_large_table(client, table_name):
    """Process millions of records without memory issues."""
    
    for page in client.get(table_name, page_size=5000):
        for record in page:
            result = process_record(record)
            save_result(result)
        
        # Force garbage collection between pages
        gc.collect()
```

### DataFrame Integration with Chunking

```python
import pandas as pd

def load_to_dataframe_chunked(client, table_name, chunk_size=10000):
    """Load data to DataFrame in chunks."""
    
    dfs = []
    for page in client.get(table_name, page_size=1000):
        df_chunk = pd.DataFrame(page)
        dfs.append(df_chunk)
        
        # Combine when chunk threshold reached
        if len(dfs) >= chunk_size // 1000:
            df = pd.concat(dfs, ignore_index=True)
            process_chunk(df)
            dfs = []
    
    # Process remaining
    if dfs:
        df = pd.concat(dfs, ignore_index=True)
        process_chunk(df)
```

---

## 10. Rate Limiting Handling

SDK has minimal retry support - implement manually:

```python
import time
from PowerPlatform.Dataverse.core.errors import DataverseError

def call_with_backoff(func, max_retries=3):
    """Call function with exponential backoff for rate limits."""
    
    for attempt in range(max_retries):
        try:
            return func()
        except DataverseError as e:
            if e.status_code == 429:  # Too Many Requests
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt  # 1s, 2s, 4s
                    print(f"Rate limited. Waiting {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    raise
            else:
                raise

# Usage
ids = call_with_backoff(
    lambda: client.create("account", payload)
)
```

---

## 11. Transaction Consistency (Known Limitation)

SDK doesn't have transactional guarantees:

```python
# ⚠️ If bulk operation partially fails, some records may be created

def create_with_consistency_check(client, table_name, payloads):
    """Create records and verify all succeeded."""
    
    try:
        ids = client.create(table_name, payloads)
        
        # Verify all records created
        created = client.get(
            table_name,
            filter=f"isof(Microsoft.Dynamics.CRM.{table_name})"
        )
        
        if len(ids) != count_created:
            print(f"⚠️ Only {count_created}/{len(ids)} records created")
            # Handle partial failure
    except Exception as e:
        print(f"Creation failed: {e}")
        # Check what was created
```

---

## 12. Monitoring Performance

### Log Operation Duration

```python
import time
import logging

logger = logging.getLogger("dataverse")

def monitored_operation(operation_name):
    """Decorator to monitor operation performance."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            start = time.time()
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start
                logger.info(f"{operation_name}: {duration:.2f}s")
                return result
            except Exception as e:
                duration = time.time() - start
                logger.error(f"{operation_name} failed after {duration:.2f}s: {e}")
                raise
        return wrapper
    return decorator

@monitored_operation("Bulk Create Accounts")
def create_accounts(client, payloads):
    return client.create("account", payloads)
```

---

## 13. Performance Checklist

| Item | Status | Notes |
|------|--------|-------|
| Reuse client instance | ☐ | Create once, reuse |
| Use select to limit columns | ☐ | Only retrieve needed data |
| Filter server-side with OData | ☐ | Don't fetch all and filter |
| Use pagination with page_size | ☐ | Process incrementally |
| Batch operations | ☐ | Use create/update for multiple |
| Tune batch size by table type | ☐ | OOB=200-300, Simple=≤10 |
| Handle rate limiting (429) | ☐ | Implement exponential backoff |
| Use chunked upload for large files | ☐ | SDK handles for >128MB |
| Monitor operation duration | ☐ | Log timing for analysis |
| Test with production-like data | ☐ | Performance varies with data volume |

---

## 14. See Also

- [Dataverse Web API Performance](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/optimize-performance-create-update)
- [OData Query Options](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api)
- [SDK Working with Data](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/sdk-python/work-data)
