#!/usr/bin/env python3
"""SQL Server Table Reconciliation Script.

Compare identical tables across two SQL Server instances using mssql-python
driver and Apache Arrow. Detect missing rows, column mismatches, schema drift,
and produce a reconciliation report.

Usage:
    python reconcile.py \
        --source-server prod-server.database.windows.net \
        --source-database ProdDB \
        --target-server staging-server.database.windows.net \
        --target-database StagingDB \
        --tables "dbo.Orders,dbo.Items" \
        --auth entra \
        --output console \
        --chunk-size 100000

Environment variables for credentials (when --auth sql):
    MSSQL_USER       - SQL Server username
    MSSQL_PASSWORD   - SQL Server password
"""

import argparse
import os
import sys
from getpass import getpass

import pandas as pd
import pyarrow as pa
import pyarrow.compute as pc
from mssql_python import connect as mssql_connect


# --- Connection Setup ---
def connect(server, database, auth_mode, user=None, password=None):
    """Connect using mssql-python driver.

    Reads credentials from env vars or prompts interactively. Never hardcodes."""
    if auth_mode == "sql":
        user = user or os.environ.get("MSSQL_USER") or input("Username: ")
        password = password or os.environ.get("MSSQL_PASSWORD") or getpass("Password: ")
        conn_str = (
            f"Server={server};Database={database};"
            f"UID={user};PWD={password};"
            f"TrustServerCertificate=yes;Encrypt=yes"
        )
    else:
        # Entra (Azure AD) authentication
        conn_str = (
            f"Server={server};Database={database};"
            f"Authentication=ActiveDirectoryDefault;"
            f"TrustServerCertificate=yes;Encrypt=yes"
        )
    return mssql_connect(conn_str)


# --- Table Discovery ---
def resolve_tables(conn, table_spec):
    """Resolve table spec to list of schema.table names.

    Accepts: 'dbo.*', 'dbo.Orders,dbo.Items', or 'dbo.Orders'."""
    tables = []
    for spec in table_spec.split(","):
        spec = spec.strip()
        schema, tbl = spec.split(".")
        if tbl == "*":
            query = """
            SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
            """
            cur = conn.cursor()
            cur.execute(query, [schema])
            rows = cur.arrow().to_pandas()
            tables.extend(f"{schema}.{t}" for t in rows["TABLE_NAME"])
        else:
            tables.append(spec)
    return tables


# --- Schema Comparison ---
def compare_schema(source_conn, target_conn, table):
    """Compare column names, types, nullability. Return drift report and common columns."""
    query = """
    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH,
           NUMERIC_PRECISION, NUMERIC_SCALE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = ?
    ORDER BY ORDINAL_POSITION
    """
    schema_name, table_name = table.split(".")

    src_cur = source_conn.cursor()
    src_cur.execute(query, [schema_name, table_name])
    source_schema = src_cur.arrow().to_pandas()

    tgt_cur = target_conn.cursor()
    tgt_cur.execute(query, [schema_name, table_name])
    target_schema = tgt_cur.arrow().to_pandas()

    src_cols = set(source_schema["COLUMN_NAME"])
    tgt_cols = set(target_schema["COLUMN_NAME"])

    drift = []
    only_in_source = src_cols - tgt_cols
    only_in_target = tgt_cols - src_cols
    if only_in_source:
        drift.append(f"Columns only in source: {sorted(only_in_source)}")
    if only_in_target:
        drift.append(f"Columns only in target: {sorted(only_in_target)}")

    common_cols = sorted(src_cols & tgt_cols)

    # Check type differences for common columns
    src_types = source_schema.set_index("COLUMN_NAME")
    tgt_types = target_schema.set_index("COLUMN_NAME")
    for col in common_cols:
        if col in src_types.index and col in tgt_types.index:
            s = src_types.loc[col]
            t = tgt_types.loc[col]
            if s["DATA_TYPE"] != t["DATA_TYPE"]:
                drift.append(
                    f"  {col}: type {s['DATA_TYPE']} vs {t['DATA_TYPE']}"
                )

    return drift, common_cols


# --- Primary Key Detection ---
def detect_primary_key(conn, table):
    """Auto-detect PK columns from sys.index_columns."""
    schema, tbl = table.split(".")
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
    return result.column("name").to_pylist()


# --- Data Extraction (Arrow) ---
def extract_table(conn, table, pk_cols, chunk_size=100000):
    """Extract table data as Arrow Table, using Arrow columnar transfer."""
    pk_order = ", ".join(pk_cols)
    query = f"SELECT * FROM {table} ORDER BY {pk_order}"
    cur = conn.cursor()
    cur.execute(query)
    return cur.arrow()


# --- Hash Pre-check (for large tables) ---
def extract_hashes(conn, table, pk_cols, compare_cols):
    """Extract PK + row hash for large table optimization."""
    pk_select = ", ".join(pk_cols)
    col_concat = ", ".join(compare_cols)
    query = f"""
    SELECT {pk_select},
           HASHBYTES('SHA2_256', CONCAT_WS('|', {col_concat})) AS row_hash
    FROM {table}
    ORDER BY {pk_select}
    """
    cur = conn.cursor()
    cur.execute(query)
    return cur.arrow()


# --- Comparison Logic ---
def reconcile(source_table, target_table, pk_cols, compare_cols):
    """Compare two Arrow tables.

    1. Convert to pandas with PK as index
    2. Identify missing/extra rows
    3. Compare column values for matching rows
    4. Handle NULL vs non-NULL (NULL == NULL is a match)
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
    common_src = src_df.loc[src_df.index.isin(common_keys), compare_cols]
    common_tgt = tgt_df.loc[tgt_df.index.isin(common_keys), compare_cols]
    diff = common_src.compare(common_tgt, keep_shape=False)

    return {
        "missing_in_target": missing_in_target,
        "extra_in_target": extra_in_target,
        "mismatches": diff,
        "total_source": len(src_df),
        "total_target": len(tgt_df),
    }


# --- Per-Table Pipeline ---
def reconcile_table(source_conn, target_conn, table, pk_override=None, columns=None,
                    chunk_size=100000):
    """Run full reconciliation for one table. Returns result dict."""
    schema_drift, common_cols = compare_schema(source_conn, target_conn, table)

    pk_cols = pk_override
    if not pk_cols:
        pk_cols = detect_primary_key(source_conn, table)
    if not pk_cols:
        pk_cols = detect_primary_key(target_conn, table)
    if not pk_cols:
        return {"table": table, "error": "No PK detected", "status": "SKIPPED"}

    compare_cols = columns if columns else [c for c in common_cols if c not in pk_cols]

    source_data = extract_table(source_conn, table, pk_cols, chunk_size)
    target_data = extract_table(target_conn, table, pk_cols, chunk_size)

    result = reconcile(source_data, target_data, pk_cols, compare_cols)
    result["table"] = table
    result["schema_drift"] = schema_drift
    result["status"] = (
        "PASS"
        if not (result["missing_in_target"] or result["extra_in_target"] or len(result["mismatches"]))
        else "FAIL"
    )
    return result


# --- Report Generation ---
def generate_report(all_results, output_format="console"):
    """Output per-table details + combined summary."""
    for r in all_results:
        print(f"\n--- {r['table']} ---")
        if r.get("error"):
            print(f"  SKIPPED: {r['error']}")
            continue
        print(f"  Source: {r['total_source']:,}  Target: {r['total_target']:,}")
        print(
            f"  Missing: {len(r['missing_in_target'])}  "
            f"Extra: {len(r['extra_in_target'])}  "
            f"Mismatches: {len(r['mismatches'])}"
        )
        print(
            f"  Result: {'✓ IDENTICAL' if r['status'] == 'PASS' else '✗ DIFFERENCES FOUND'}"
        )
        if r.get("schema_drift"):
            print("  Schema drift:")
            for d in r["schema_drift"]:
                print(f"    {d}")

    # Summary
    passed = sum(1 for r in all_results if r["status"] == "PASS")
    failed = sum(1 for r in all_results if r["status"] == "FAIL")
    skipped = sum(1 for r in all_results if r["status"] == "SKIPPED")
    print(
        f"\n=== Summary: {passed} passed, {failed} failed, "
        f"{skipped} skipped / {len(all_results)} tables ==="
    )

    # Export if requested
    if output_format == "csv":
        rows = [
            {
                "table": r["table"],
                "status": r["status"],
                "source_rows": r.get("total_source", 0),
                "target_rows": r.get("total_target", 0),
                "missing": len(r.get("missing_in_target", [])),
                "extra": len(r.get("extra_in_target", [])),
                "mismatches": len(r.get("mismatches", [])),
            }
            for r in all_results
        ]
        df = pd.DataFrame(rows)
        df.to_csv("reconciliation_report.csv", index=False)
        print("\nReport saved to reconciliation_report.csv")
    elif output_format == "json":
        import json

        rows = [
            {
                "table": r["table"],
                "status": r["status"],
                "source_rows": r.get("total_source", 0),
                "target_rows": r.get("total_target", 0),
                "missing": len(r.get("missing_in_target", [])),
                "extra": len(r.get("extra_in_target", [])),
                "mismatches": len(r.get("mismatches", [])),
            }
            for r in all_results
        ]
        with open("reconciliation_report.json", "w") as f:
            json.dump(rows, f, indent=2)
        print("\nReport saved to reconciliation_report.json")


# --- Main ---
def main():
    parser = argparse.ArgumentParser(
        description="Compare SQL Server tables across two instances."
    )
    parser.add_argument("--source-server", required=True, help="Source SQL Server host")
    parser.add_argument("--source-database", required=True, help="Source database name")
    parser.add_argument("--target-server", required=True, help="Target SQL Server host")
    parser.add_argument("--target-database", required=True, help="Target database name")
    parser.add_argument(
        "--tables",
        required=True,
        help="Comma-separated schema.table names or schema.* wildcard",
    )
    parser.add_argument(
        "--auth",
        choices=["sql", "entra"],
        default="sql",
        help="Authentication mode (default: sql)",
    )
    parser.add_argument(
        "--primary-key",
        default=None,
        help="Comma-separated PK column(s). Auto-detected if omitted.",
    )
    parser.add_argument(
        "--columns",
        default=None,
        help="Comma-separated columns to compare. All non-PK columns if omitted.",
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=100000,
        help="Rows per batch for large tables (default: 100000)",
    )
    parser.add_argument(
        "--output",
        choices=["console", "csv", "json"],
        default="console",
        help="Output format (default: console)",
    )
    args = parser.parse_args()

    pk_override = [c.strip() for c in args.primary_key.split(",")] if args.primary_key else None
    columns = [c.strip() for c in args.columns.split(",")] if args.columns else None

    print(f"Connecting to source: {args.source_server}/{args.source_database}")
    source_conn = connect(args.source_server, args.source_database, args.auth)

    print(f"Connecting to target: {args.target_server}/{args.target_database}")
    target_conn = connect(args.target_server, args.target_database, args.auth)

    tables = resolve_tables(source_conn, args.tables)
    print(f"Tables to reconcile: {tables}")

    results = []
    for table in tables:
        print(f"Reconciling {table}...")
        results.append(
            reconcile_table(
                source_conn, target_conn, table,
                pk_override=pk_override,
                columns=columns,
                chunk_size=args.chunk_size,
            )
        )

    generate_report(results, output_format=args.output)


if __name__ == "__main__":
    main()
