# Oracle to PostgreSQL: NVL, DECODE, and Null-Handling Functions

## Problem

Oracle provides several functions — `NVL`, `NVL2`, `DECODE` — that have no direct equivalents in standard SQL but are commonly used in Oracle stored procedures and inline SQL. PostgreSQL uses standard SQL alternatives: `COALESCE`, `NULLIF`, and `CASE` expressions.

## Behavior Comparison

### NVL

**Oracle:** `NVL(expr, replacement)` — returns `replacement` if `expr` is `NULL`, otherwise `expr`.

**PostgreSQL:** Use `COALESCE(expr, replacement)` — semantically identical for two arguments.

```sql
-- Oracle
NVL(column_name, 'default')

-- PostgreSQL
COALESCE(column_name, 'default')
```

### NVL2

**Oracle:** `NVL2(expr, not_null_val, null_val)` — returns `not_null_val` if `expr` IS NOT NULL, `null_val` if NULL.

**PostgreSQL:** No direct equivalent — use `CASE`:

```sql
-- Oracle
NVL2(column_name, 'has value', 'no value')

-- PostgreSQL
CASE WHEN column_name IS NOT NULL THEN 'has value' ELSE 'no value' END
```

### DECODE

**Oracle:** `DECODE(expr, search1, result1, search2, result2, ..., default)` — equality-based switch.

**PostgreSQL:** No `DECODE` function — use `CASE WHEN`:

```sql
-- Oracle
DECODE(status, 1, 'Active', 2, 'Inactive', 'Unknown')

-- PostgreSQL
CASE status
  WHEN 1 THEN 'Active'
  WHEN 2 THEN 'Inactive'
  ELSE 'Unknown'
END
```

Note: `DECODE` in Oracle treats two `NULL` values as equal (unlike `=`). If any search value is `NULL`, use `IS NULL` in the `CASE` equivalent:

```sql
-- Oracle: DECODE treats NULL = NULL
DECODE(col, NULL, 'empty', col)

-- PostgreSQL
CASE WHEN col IS NULL THEN 'empty' ELSE col END
```

## Migration Actions

### 1. Stored Procedures

Apply the direct substitutions above. Pay special attention to:
- `NVL` on numeric expressions — `COALESCE` is type-sensitive in PostgreSQL; ensure both arguments are the same type or cast explicitly.
- `DECODE` with `NULL` search values — replace with `IS NULL` guard in the `CASE` expression.

### 2. Application Code (inline SQL strings)

Search C# string literals and query builders for `NVL(`, `NVL2(`, and `DECODE(`. Apply the same substitutions.

### 3. Tests

Write test cases that exercise `NULL` inputs specifically — the Oracle → PostgreSQL translation of `NVL`/`COALESCE` is straightforward, but edge cases around NULL equality in `DECODE` → `CASE` are a common source of silent behavioral differences.
