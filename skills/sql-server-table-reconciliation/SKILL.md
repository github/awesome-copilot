---
name: sql-server-table-reconciliation
description: "Use when: comparing SQL Server tables across instances, data migration validation, ETL verification, row mismatch detection, schema drift, reconciliation report, production vs staging comparison. Uses mssql-python driver with Apache Arrow for fast columnar data transfer and comparison."
---

# SQL Server Table Reconciliation

Compare identical tables across two SQL Server instances using Python with `mssql-python` driver and Apache Arrow. Detect missing rows, column mismatches, schema drift, and produce a reconciliation report.

## Workflow

1. Collect connection details for source and target
2. Identify primary key / composite key
3. Detect schema differences
4. Extract data via Arrow for efficient columnar transfer
5. Compare rows and columns
6. Generate reconciliation report

## Collect Inputs

| Parameter | Required | Description |
|-----------|----------|-------------|
| Source server | Yes | Source SQL Server (e.g. `prod-server.database.windows.net`) |
| Source database | Yes | Source database name |
| Target server | Yes | Target SQL Server (e.g. `staging-server.database.windows.net`) |
| Target database | Yes | Target database name |
| Tables | Yes | Comma-separated `schema.table` names, or `schema.*` wildcard (e.g. `dbo.Orders,dbo.Items` or `dbo.*`) |
| Auth mode | Yes | `sql` (user/password) or `entra` (Azure AD/token) |
| Primary key | Auto-detect | Column(s) forming the row identity. Auto-detect from metadata if not provided. |
| Columns to compare | All | Subset of columns, or all non-PK columns |
| Chunk size | `100000` | Rows per batch for large tables |
| Output format | `console` | `console`, `csv`, `parquet`, or `json` |

## Generated Script Structure

Always produce a single Python script with this structure:

```python
import os
from getpass import getpass
from mssql_python import connect as mssql_connect
import pyarrow as pa
import pyarrow.compute as pc
import pandas as pd

# --- Connection Setup ---
def connect(server, database, user=None, password=None):
    """Connect using mssql-python driver, return connection.
    Reads credentials from env vars or prompts interactively. Never hardcode."""
    user = user or os.environ.get('MSSQL_USER') or input('Username: ')
    password = password or os.environ.get('MSSQL_PASSWORD') or getpass('Password: ')
    conn_str = (
        f"Server={server};Database={database};"
        f"UID={user};PWD={password};"
        f"TrustServerCertificate=yes;Encrypt=yes"
    )
    return mssql_connect(conn_str)

# --- Table Discovery ---
def resolve_tables(conn, table_spec):
    """Resolve table spec to list of schema.table names.
    Accepts: 'dbo.*', 'dbo.Orders,dbo.Items', or 'dbo.Orders'."""
    tables = []
    for spec in table_spec.split(','):
        spec = spec.strip()
        schema, tbl = spec.split('.')
        if tbl == '*':
            query = """
            SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
            """
            cur = conn.cursor()
            cur.execute(query, [schema])
            rows = cur.arrow().to_pandas()
            tables.extend(f"{schema}.{t}" for t in rows['TABLE_NAME'])
        else:
            tables.append(spec)
    return tables

# --- Schema Comparison ---
def compare_schema(source_conn, target_conn, table):
    """Compare column names, types, nullability. Return drift report."""
    query = """
    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH,
           NUMERIC_PRECISION, NUMERIC_SCALE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = ?
    ORDER BY ORDINAL_POSITION
    """
    schema_name, table_name = table.split('.')
    src_cur = source_conn.cursor()
    src_cur.execute(query, [schema_name, table_name])
    source_schema = src_cur.arrow()
    tgt_cur = target_conn.cursor()
    tgt_cur.execute(query, [schema_name, table_name])
    target_schema = tgt_cur.arrow()
    # Compare and report differences...

# --- Primary Key Detection ---
def detect_primary_key(conn, table):
    """Auto-detect PK columns from sys.index_columns."""
    schema, tbl = table.split('.')
    query = """
    SELECT c.name
    FROM sys.indexes i
    JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
    JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
    WHERE i.is_primary_key = 1
      AND OBJECT_SCHEMA_NAME(i.object_id) = ?
      AND OBJECT_NAME(i.object_id) = ?
    ORDER BY ic.key_ordinal
    """
    cur = conn.cursor()
    cur.execute(query, [schema, tbl])
    result = cur.arrow()
    return result.column('name').to_pylist()

# --- Data Extraction (Arrow) ---
def extract_table(conn, table, pk_cols, chunk_size=100000):
    """Extract table data as Arrow Table, chunked for large datasets."""
    query = f"SELECT * FROM {table} ORDER BY {', '.join(pk_cols)}"
    # Use Arrow for columnar transfer
    cur = conn.cursor()
    cur.execute(query)
    return cur.arrow()

# --- Comparison Logic ---
def reconcile(source_table, target_table, pk_cols, compare_cols):
    """
    Compare two Arrow tables:
    1. Convert to pandas with PK as index
    2. Identify missing/extra rows
    3. Compare column values for matching rows
    4. Handle NULL vs non-NULL
    """
    src_df = source_table.to_pandas().set_index(pk_cols)
    tgt_df = target_table.to_pandas().set_index(pk_cols)

    # Missing/extra rows
    src_keys = set(src_df.index.tolist() if len(pk_cols) > 1 else src_df.index)
    tgt_keys = set(tgt_df.index.tolist() if len(pk_cols) > 1 else tgt_df.index)
    missing_in_target = src_keys - tgt_keys
    extra_in_target = tgt_keys - src_keys
    common_keys = src_keys & tgt_keys

    # Column-level mismatches on common rows
    mismatches = []
    common_src = src_df.loc[src_df.index.isin(common_keys), compare_cols]
    common_tgt = tgt_df.loc[tgt_df.index.isin(common_keys), compare_cols]
    diff = common_src.compare(common_tgt, keep_shape=False)
    # Collect mismatch details...

    return {
        'missing_in_target': missing_in_target,
        'extra_in_target': extra_in_target,
        'mismatches': diff,
        'total_source': len(src_df),
        'total_target': len(tgt_df),
    }

# --- Per-Table Pipeline ---
def reconcile_table(source_conn, target_conn, table):
    """Run full reconciliation for one table. Returns result dict."""
    schema_drift, common_cols = compare_schema(source_conn, target_conn, table)
    pk_cols = detect_primary_key(source_conn, table)
    if not pk_cols:
        pk_cols = detect_primary_key(target_conn, table)
    if not pk_cols:
        return {'table': table, 'error': 'No PK detected', 'status': 'SKIPPED'}
    source_data = extract_table(source_conn, table, pk_cols)
    target_data = extract_table(target_conn, table, pk_cols)
    cols = [c for c in common_cols if c not in pk_cols]
    result = reconcile(source_data, target_data, pk_cols, cols)
    result['table'] = table
    result['schema_drift'] = schema_drift
    result['status'] = 'PASS' if not (
        result['missing_in_target'] or result['extra_in_target'] or result['mismatches']
    ) else 'FAIL'
    return result

# --- Report Generation ---
def generate_report(all_results, output_format='console'):
    """Output per-table details + combined summary."""
    for r in all_results:
        print(f"\n--- {r['table']} ---")
        if r.get('error'):
            print(f"  SKIPPED: {r['error']}")
            continue
        print(f"  Source: {r['total_source']:,}  Target: {r['total_target']:,}")
        print(f"  Missing: {len(r['missing_in_target'])}  Extra: {len(r['extra_in_target'])}  Mismatches: {len(r['mismatches'])}")
        print(f"  Result: {'✓ IDENTICAL' if r['status'] == 'PASS' else '✗ DIFFERENCES FOUND'}")

    # Summary table
    passed = sum(1 for r in all_results if r['status'] == 'PASS')
    failed = sum(1 for r in all_results if r['status'] == 'FAIL')
    skipped = sum(1 for r in all_results if r['status'] == 'SKIPPED')
    print(f"\n=== Summary: {passed} passed, {failed} failed, {skipped} skipped / {len(all_results)} tables ===")
    # Export to csv/parquet/json if requested...

# --- Main ---
def main(source_conn, target_conn, table_spec):
    tables = resolve_tables(source_conn, table_spec)
    results = []
    for table in tables:
        print(f"Reconciling {table}...")
        results.append(reconcile_table(source_conn, target_conn, table))
    generate_report(results)
```

## Comparison Rules

- **Normalize types before comparing**: cast decimals to same precision, trim strings, normalize datetime to UTC
- **NULL handling**: `NULL == NULL` is considered a match (both sides missing = no diff)
- **Ignore row order**: always compare by PK join, never positional
- **Large tables**: chunk extraction with `OFFSET/FETCH` or `ROW_NUMBER()` partitioning

## Hash-Based Optimization (for large tables)

When table has >1M rows, generate a hash pre-check:

```sql
SELECT {pk_cols},
       HASHBYTES('SHA2_256', CONCAT_WS('|', col1, col2, ...)) AS row_hash
FROM {table}
```

Compare hashes first; only fetch full rows for mismatched hashes. This reduces data transfer significantly.

## Report Format

```
Reconciling dbo.EMPLOYEES...
Reconciling dbo.DEPARTMENTS...
Reconciling dbo.JOBS...

--- dbo.EMPLOYEES ---
  Source: 107  Target: 107
  Missing: 0  Extra: 0  Mismatches: 0
  Result: ✓ IDENTICAL

--- dbo.DEPARTMENTS ---
  Source: 27  Target: 27
  Missing: 0  Extra: 0  Mismatches: 3
  Result: ✗ DIFFERENCES FOUND

--- dbo.JOBS ---
  Source: 19  Target: 19
  Missing: 0  Extra: 0  Mismatches: 0
  Result: ✓ IDENTICAL

=== Summary: 2 passed, 1 failed, 0 skipped / 3 tables ===
```

When a single table is provided, include full detail (schema drift, sample rows, mismatches). When multiple tables, use the compact per-table format above with full detail only for tables with `FAIL` status.

## Performance Considerations

| Scenario | Strategy |
|----------|----------|
| < 100K rows | Single Arrow fetch, in-memory pandas compare |
| 100K–1M rows | Chunked extraction (100K batches), streaming comparison |
| > 1M rows | Hash pre-check → only fetch mismatched rows |
| Wide tables (100+ cols) | Compare PK + hash first, drill into specific columns on mismatch |
| Network-constrained | Use Arrow columnar format (10-50x smaller than row-by-row) |

## Constraints

- Always use `mssql-python` driver (not pyodbc, pymssql)
- Always use Apache Arrow via cursor (`cursor.arrow()`) for data extraction
- Connection MUST use connection string format, not keyword arguments (kwargs like `encrypt=True` throw errors)
- Never compare without identifying PK first — ask user if auto-detect fails
- Handle connection failures gracefully with retry logic
- **Never hardcode credentials** in generated scripts — use `os.environ` / `getpass` (env vars: `MSSQL_USER`, `MSSQL_PASSWORD`)
- Do not print credentials in output or logs
- Use parameterized queries (`?` placeholders) for metadata lookups — never f-string interpolate user input into SQL
