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

## Bundled Script

The reconciliation logic is provided as a standalone script at `scripts/reconcile.py`. Invoke it with the appropriate arguments based on user inputs:

```bash
python scripts/reconcile.py \
    --source-server <source_server> \
    --source-database <source_database> \
    --target-server <target_server> \
    --target-database <target_database> \
    --tables "<table_spec>" \
    --auth <sql|entra> \
    --chunk-size <chunk_size> \
    --output <console|csv|json>
```

### Optional arguments

| Argument | Description |
|----------|-------------|
| `--primary-key` | Comma-separated PK column(s). Omit to auto-detect. |
| `--columns` | Comma-separated columns to compare. Omit to compare all non-PK columns. |

### Example invocations

Single table with SQL auth:

```bash
python scripts/reconcile.py \
    --source-server prod-server.database.windows.net \
    --source-database ProdDB \
    --target-server staging-server.database.windows.net \
    --target-database StagingDB \
    --tables "dbo.Orders" \
    --auth sql \
    --output console
```

Wildcard with Entra auth and CSV output:

```bash
python scripts/reconcile.py \
    --source-server prod-server.database.windows.net \
    --source-database ProdDB \
    --target-server staging-server.database.windows.net \
    --target-database StagingDB \
    --tables "dbo.*" \
    --auth entra \
    --output csv
```

### Prerequisites

Install required packages before running:

```bash
pip install mssql-python pyarrow pandas
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
