# Dataverse SDK for Python - Advanced Features Guide

## Overview
Comprehensive guide to advanced Dataverse SDK features including enums, complex filtering, SQL queries, metadata operations, and production patterns. Based on official Microsoft walkthrough examples.

## 1. Working with Option Sets & Picklists

### Using IntEnum for Type Safety
```python
from enum import IntEnum
from PowerPlatform.Dataverse.client import DataverseClient

# Define enum for picklist
class Priority(IntEnum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3

class Priority(IntEnum):
    COLD = 1
    WARM = 2
    HOT = 3

# Create record with enum value
record_data = {
    "new_title": "Important Task",
    "new_priority": Priority.HIGH,  # Automatically converted to int
}

ids = client.create("new_tasktable", record_data)
```

### Handling Formatted Values
```python
# When retrieving records, picklist values are returned as integers
record = client.get("new_tasktable", record_id)

priority_int = record.get("new_priority")  # Returns: 3
priority_formatted = record.get("new_priority@OData.Community.Display.V1.FormattedValue")  # Returns: "High"

print(f"Priority (Raw): {priority_int}")
print(f"Priority (Formatted): {priority_formatted}")
```

### Creating Tables with Enum Columns
```python
from enum import IntEnum

class TaskStatus(IntEnum):
    NOT_STARTED = 0
    IN_PROGRESS = 1
    COMPLETED = 2

class TaskPriority(IntEnum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3

# Pass enum classes as column types
columns = {
    "new_Title": "string",
    "new_Description": "string",
    "new_Status": TaskStatus,      # Creates option set column
    "new_Priority": TaskPriority,  # Creates option set column
    "new_Amount": "decimal",
    "new_DueDate": "datetime"
}

table_info = client.create_table(
    "new_TaskManagement",
    primary_column_schema_name="new_Title",
    columns=columns
)

print(f"Created table with {len(columns)} columns including enums")
```

---

## 2. Advanced Filtering & Querying

### Complex OData Filters
```python
# Simple equality
filter1 = "name eq 'Contoso'"

# Comparison operators
filter2 = "creditlimit gt 50000"
filter3 = "createdon lt 2024-01-01"

# String operations
filter4 = "contains(name, 'Ltd')"
filter5 = "startswith(name, 'Con')"
filter6 = "endswith(name, 'Ltd')"

# Multiple conditions with AND
filter7 = "(name eq 'Contoso') and (creditlimit gt 50000)"

# Multiple conditions with OR
filter8 = "(industrycode eq 1) or (industrycode eq 2)"

# Negation
filter9 = "not(statecode eq 1)"

# Complex nested conditions
filter10 = "(creditlimit gt 50000) and ((industrycode eq 1) or (industrycode eq 2))"

# Using in get() calls
results = client.get("account", filter=filter10, select=["name", "creditlimit"])
```

### Retrieve with Related Records (Expand)
```python
# Expand parent account information
accounts = client.get(
    "account",
    filter="creditlimit gt 100000",
    expand=["parentaccountid($select=name,creditlimit)"],
    select=["accountid", "name", "creditlimit", "parentaccountid"]
)

for page in accounts:
    for account in page:
        parent_name = account.get("_parentaccountid_value")
        print(f"Account: {account['name']}, Parent: {parent_name}")
```

### SQL Queries for Complex Analysis
```python
# SQL queries are read-only but powerful for analytics
sql = """
SELECT 
    a.name as AccountName,
    a.creditlimit,
    COUNT(c.contactid) as ContactCount
FROM account a
LEFT JOIN contact c ON a.accountid = c.parentcustomerid
WHERE a.creditlimit > 50000
GROUP BY a.accountid, a.name, a.creditlimit
ORDER BY ContactCount DESC
"""

results = client.query_sql(sql)
for row in results:
    print(f"{row['AccountName']}: {row['ContactCount']} contacts")
```

### Paging with SQL Queries
```python
# SQL queries return paginated results by default
sql = "SELECT TOP 10000 name, creditlimit FROM account ORDER BY name"

all_results = []
for page in client.query_sql(sql):
    all_results.extend(page)
    print(f"Retrieved {len(page)} rows")

print(f"Total: {len(all_results)} rows")
```

---

## 3. Metadata Operations

### Creating Complex Tables
```python
from enum import IntEnum
from datetime import datetime

class TaskStatus(IntEnum):
    NEW = 1
    OPEN = 2
    CLOSED = 3

# Create table with diverse column types
columns = {
    "new_Subject": "string",
    "new_Description": "string",
    "new_Category": "string",
    "new_Priority": "int",
    "new_Status": TaskStatus,
    "new_EstimatedHours": "decimal",
    "new_DueDate": "datetime",
    "new_IsOverdue": "bool",
    "new_Notes": "string"
}

table_info = client.create_table(
    "new_WorkItem",
    primary_column_schema_name="new_Subject",
    columns=columns
)

print(f"✓ Created table: {table_info['table_schema_name']}")
print(f"  Primary Key: {table_info['primary_id_attribute']}")
print(f"  Columns: {', '.join(table_info.get('columns_created', []))}")
```

### Inspecting Table Metadata
```python
# Get detailed table information
table_info = client.get_table_info("account")

print(f"Schema Name: {table_info.get('table_schema_name')}")
print(f"Logical Name: {table_info.get('table_logical_name')}")
print(f"Display Name: {table_info.get('table_display_name')}")
print(f"Entity Set: {table_info.get('entity_set_name')}")
print(f"Primary ID: {table_info.get('primary_id_attribute')}")
print(f"Primary Name: {table_info.get('primary_name_attribute')}")
```

### Listing All Tables in Organization
```python
# Retrieve all tables (may be large result set)
all_tables = []
for page in client.list_tables():
    all_tables.extend(page)
    print(f"Retrieved {len(page)} tables in this page")

print(f"\nTotal tables: {len(all_tables)}")

# Filter for custom tables
custom_tables = [t for t in all_tables if t['table_schema_name'].startswith('new_')]
print(f"Custom tables: {len(custom_tables)}")
for table in custom_tables[:5]:
    print(f"  - {table['table_schema_name']}")
```

### Managing Columns Dynamically
```python
# Add columns to existing table
client.create_columns("new_TaskTable", {
    "new_Department": "string",
    "new_Budget": "decimal",
    "new_ApprovedDate": "datetime"
})

# Delete specific columns
client.delete_columns("new_TaskTable", [
    "new_OldField1",
    "new_OldField2"
])

# Delete entire table
client.delete_table("new_TaskTable")
```

---

## 4. Single vs. Multiple Record Operations

### Single Record Operations
```python
# Create single
record_id = client.create("account", {"name": "Contoso"})[0]

# Get single by ID
account = client.get("account", record_id)

# Update single
client.update("account", record_id, {"creditlimit": 100000})

# Delete single
client.delete("account", record_id)
```

### Multiple Record Operations

#### Create Multiple Records
```python
# Create list of records
records = [
    {"name": "Company A", "creditlimit": 50000},
    {"name": "Company B", "creditlimit": 75000},
    {"name": "Company C", "creditlimit": 100000},
]

created_ids = client.create("account", records)
print(f"Created {len(created_ids)} records: {created_ids}")
```

#### Update Multiple Records (Broadcast)
```python
# Apply same update to multiple records
account_ids = ["id1", "id2", "id3"]
client.update("account", account_ids, {
    "industrycode": 1,  # Retail
    "accountmanagerid": "manager-guid"
})
print(f"Updated {len(account_ids)} records with same data")
```

#### Delete Multiple Records
```python
# Delete multiple records with optimized bulk delete
record_ids = ["id1", "id2", "id3", "id4", "id5"]
client.delete("account", record_ids, use_bulk_delete=True)
print(f"Deleted {len(record_ids)} records")
```

---

## 5. Data Manipulation Patterns

### Retrieve, Modify, Update Pattern
```python
# Retrieve single record
account = client.get("account", record_id)

# Modify locally
original_amount = account.get("creditlimit", 0)
new_amount = original_amount + 10000

# Update back
client.update("account", record_id, {"creditlimit": new_amount})
print(f"Updated creditlimit: {original_amount} → {new_amount}")
```

### Batch Processing Pattern
```python
# Retrieve in batches with paging
batch_size = 100
processed = 0

for page in client.get("account", top=batch_size, filter="statecode eq 0"):
    # Process each page
    batch_updates = []
    for account in page:
        if account.get("creditlimit", 0) > 100000:
            batch_updates.append({
                "id": account['accountid'],
                "accountmanagerid": "senior-manager-guid"
            })
    
    # Batch update
    for update in batch_updates:
        client.update("account", update['id'], {"accountmanagerid": update['accountmanagerid']})
        processed += 1

print(f"Processed {processed} accounts")
```

### Conditional Operations Pattern
```python
from PowerPlatform.Dataverse.core.errors import DataverseError

def safe_update(table, record_id, data, check_field=None, check_value=None):
    """Update with pre-condition check."""
    try:
        if check_field and check_value:
            # Verify condition before updating
            record = client.get(table, record_id, select=[check_field])
            if record.get(check_field) != check_value:
                print(f"Condition not met: {check_field} != {check_value}")
                return False
        
        client.update(table, record_id, data)
        return True
    except DataverseError as e:
        print(f"Update failed: {e}")
        return False

# Usage
safe_update("account", account_id, {"creditlimit": 100000}, "statecode", 0)
```

---

## 6. Formatted Values & Display

### Retrieving Formatted Values
```python
# When you retrieve a record with option set or money fields,
# you can request formatted values for display

record = client.get(
    "account",
    record_id,
    select=["name", "creditlimit", "industrycode"]
)

# Raw values
name = record.get("name")  # "Contoso Ltd"
limit = record.get("creditlimit")  # 100000.00
industry = record.get("industrycode")  # 1

# Formatted values (returned in OData response)
limit_formatted = record.get("creditlimit@OData.Community.Display.V1.FormattedValue")
industry_formatted = record.get("industrycode@OData.Community.Display.V1.FormattedValue")

print(f"Name: {name}")
print(f"Credit Limit: {limit_formatted or limit}")  # "100,000.00" or 100000.00
print(f"Industry: {industry_formatted or industry}")  # "Technology" or 1
```

---

## 7. Performance Optimization

### Column Selection Strategy
```python
# ❌ Retrieve all columns (slow, uses more bandwidth)
account = client.get("account", record_id)

# ✅ Retrieve only needed columns (fast, efficient)
account = client.get(
    "account",
    record_id,
    select=["accountid", "name", "creditlimit", "telephone1"]
)
```

### Filtering on Server
```python
# ❌ Retrieve all, filter locally (inefficient)
all_accounts = []
for page in client.get("account"):
    all_accounts.extend(page)
large_accounts = [a for a in all_accounts if a.get("creditlimit", 0) > 100000]

# ✅ Filter on server, retrieve only matches (efficient)
large_accounts = []
for page in client.get("account", filter="creditlimit gt 100000"):
    large_accounts.extend(page)
```

### Paging Large Result Sets
```python
# ❌ Load all results at once (memory intensive)
all_accounts = list(client.get("account"))

# ✅ Process in pages (memory efficient)
processed = 0
for page in client.get("account", top=1000):
    for account in page:
        process_account(account)
        processed += 1
    print(f"Processed: {processed}")
```

### Batch Operations
```python
# ❌ Individual creates in loop (slow)
for account_data in accounts:
    client.create("account", account_data)

# ✅ Batch create (fast, optimized)
created_ids = client.create("account", accounts)
```

---

## 8. Error Handling in Advanced Scenarios

### Handling Metadata Errors
```python
from PowerPlatform.Dataverse.core.errors import MetadataError

try:
    table_info = client.create_table("new_CustomTable", {"name": "string"})
except MetadataError as e:
    print(f"Metadata operation failed: {e}")
    # Handle table creation specific errors
```

### Handling Validation Errors
```python
from PowerPlatform.Dataverse.core.errors import ValidationError

try:
    client.create("account", {"name": None})  # Invalid: name required
except ValidationError as e:
    print(f"Validation error: {e}")
    # Handle validation specific errors
```

### Handling HTTP Errors
```python
from PowerPlatform.Dataverse.core.errors import HttpError

try:
    client.get("account", "invalid-guid")
except HttpError as e:
    if "404" in str(e):
        print("Record not found")
    elif "403" in str(e):
        print("Access denied")
    else:
        print(f"HTTP error: {e}")
```

### Handling SQL Errors
```python
from PowerPlatform.Dataverse.core.errors import SQLParseError

try:
    results = client.query_sql("SELECT INVALID SYNTAX")
except SQLParseError as e:
    print(f"SQL parse error: {e}")
```

---

## 9. Working with Relationships

### Creating Related Records
```python
# Create parent account
parent_ids = client.create("account", {
    "name": "Parent Company",
    "creditlimit": 500000
})
parent_id = parent_ids[0]

# Create child accounts with parent reference
children = [
    {"name": "Subsidiary A", "parentaccountid": parent_id},
    {"name": "Subsidiary B", "parentaccountid": parent_id},
    {"name": "Subsidiary C", "parentaccountid": parent_id},
]
child_ids = client.create("account", children)
print(f"Created {len(child_ids)} child accounts")
```

### Querying Related Records
```python
# Get account with child accounts
account = client.get("account", account_id)

# Query child accounts
children = client.get(
    "account",
    filter=f"parentaccountid eq {account_id}",
    select=["accountid", "name", "creditlimit"]
)

for page in children:
    for child in page:
        print(f"  - {child['name']}: ${child['creditlimit']}")
```

---

## 10. Cleanup & Housekeeping

### Clearing SDK Cache
```python
# After bulk operations, clear metadata cache
client.flush_cache()

# Useful after:
# - Massive delete operations
# - Table/column creation or deletion
# - Metadata synchronization across environments
```

### Safe Table Deletion
```python
from PowerPlatform.Dataverse.core.errors import MetadataError

def delete_table_safe(table_name):
    """Delete table with error handling."""
    try:
        # Verify table exists
        table_info = client.get_table_info(table_name)
        if not table_info:
            print(f"Table {table_name} not found")
            return False
        
        # Delete
        client.delete_table(table_name)
        print(f"✓ Deleted table: {table_name}")
        
        # Clear cache
        client.flush_cache()
        return True
        
    except MetadataError as e:
        print(f"❌ Failed to delete table: {e}")
        return False

delete_table_safe("new_TempTable")
```

---

## 11. Comprehensive Example: Full Workflow

```python
from enum import IntEnum
from azure.identity import InteractiveBrowserCredential
from PowerPlatform.Dataverse.client import DataverseClient
from PowerPlatform.Dataverse.core.errors import DataverseError, MetadataError

class TaskStatus(IntEnum):
    NEW = 1
    IN_PROGRESS = 2
    COMPLETED = 3

class TaskPriority(IntEnum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3

# Setup
credential = InteractiveBrowserCredential()
client = DataverseClient("https://yourorg.crm.dynamics.com", credential)

try:
    # 1. Create table
    print("Creating table...")
    table_info = client.create_table(
        "new_ProjectTask",
        primary_column_schema_name="new_Title",
        columns={
            "new_Description": "string",
            "new_Status": TaskStatus,
            "new_Priority": TaskPriority,
            "new_DueDate": "datetime",
            "new_EstimatedHours": "decimal"
        }
    )
    print(f"✓ Created table: {table_info['table_schema_name']}")
    
    # 2. Create records
    print("\nCreating tasks...")
    tasks = [
        {
            "new_Title": "Design system",
            "new_Description": "Create design system architecture",
            "new_Status": TaskStatus.NEW,
            "new_Priority": TaskPriority.HIGH,
            "new_EstimatedHours": 40.0
        },
        {
            "new_Title": "Implement UI",
            "new_Description": "Build React components",
            "new_Status": TaskStatus.IN_PROGRESS,
            "new_Priority": TaskPriority.HIGH,
            "new_EstimatedHours": 80.0
        },
        {
            "new_Title": "Write tests",
            "new_Description": "Unit and integration tests",
            "new_Status": TaskStatus.NEW,
            "new_Priority": TaskPriority.MEDIUM,
            "new_EstimatedHours": 30.0
        }
    ]
    task_ids = client.create("new_ProjectTask", tasks)
    print(f"✓ Created {len(task_ids)} tasks")
    
    # 3. Query and filter
    print("\nQuerying high-priority tasks...")
    high_priority = client.get(
        "new_ProjectTask",
        filter="new_priority eq 3",
        select=["new_Title", "new_Priority", "new_EstimatedHours"]
    )
    for page in high_priority:
        for task in page:
            print(f"  - {task['new_title']}: {task['new_estimatedhours']} hours")
    
    # 4. Update records
    print("\nUpdating task status...")
    client.update("new_ProjectTask", task_ids[1], {
        "new_Status": TaskStatus.COMPLETED,
        "new_EstimatedHours": 85.5
    })
    print("✓ Updated task status")
    
    # 5. Cleanup
    print("\nCleaning up...")
    client.delete_table("new_ProjectTask")
    print("✓ Deleted table")
    
    # Clear cache
    client.flush_cache()
    
except (MetadataError, DataverseError) as e:
    print(f"❌ Error: {e}")
```

---

## Reference
- [Official Walkthrough Example](https://github.com/microsoft/PowerPlatform-DataverseClient-Python/blob/main/examples/advanced/walkthrough.py)
- [OData Filter Syntax](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api)
- [Table/Column Metadata](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/create-update-entity-definitions-using-web-api)
