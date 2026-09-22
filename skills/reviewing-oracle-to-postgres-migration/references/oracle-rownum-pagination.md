# Oracle to PostgreSQL: ROWNUM Pagination vs LIMIT/OFFSET

## Problem

Oracle uses `ROWNUM` pseudo-column for pagination and row-limiting. PostgreSQL uses standard `LIMIT` / `OFFSET` syntax. `ROWNUM` is also fundamentally different in *when* it is assigned, which affects filtering behavior.

## Behavior Comparison

**Oracle:**
- `ROWNUM` is assigned before `ORDER BY` — filtering with `ROWNUM` on an unordered result set is non-deterministic
- Common pattern to get "top N ordered rows" requires a subquery:
  ```sql
  SELECT * FROM (SELECT * FROM t ORDER BY col) WHERE ROWNUM <= 10
  ```
- `ROWNUM BETWEEN n AND m` requires a double-wrapped subquery

**PostgreSQL:**
- `LIMIT n` restricts result rows after `ORDER BY` is applied — straightforward and deterministic
- `OFFSET n` skips rows; combine with `LIMIT` for pagination
- No `ROWNUM` pseudo-column exists

## Code Example

```sql
-- Oracle: top 10 rows by date
SELECT * FROM (
  SELECT * FROM orders ORDER BY created_at DESC
) WHERE ROWNUM <= 10;

-- PostgreSQL equivalent
SELECT * FROM orders ORDER BY created_at DESC LIMIT 10;

-- Oracle: rows 11–20 (keyset pagination via ROWNUM)
SELECT * FROM (
  SELECT t.*, ROWNUM rn FROM (
    SELECT * FROM orders ORDER BY created_at DESC
  ) t WHERE ROWNUM <= 20
) WHERE rn > 10;

-- PostgreSQL equivalent
SELECT * FROM orders ORDER BY created_at DESC LIMIT 10 OFFSET 10;
```

## Migration Actions

### 1. Stored Procedures

Replace all `ROWNUM`-based limiting patterns with `LIMIT`/`OFFSET`:

```sql
-- Oracle
WHERE ROWNUM = 1
WHERE ROWNUM <= :n

-- PostgreSQL
LIMIT 1
LIMIT :n            -- note: use $n parameter style in PL/pgSQL
```

For subquery wrapping patterns:
```sql
-- Oracle
SELECT * FROM (SELECT ... ORDER BY col) WHERE ROWNUM <= :n

-- PostgreSQL
SELECT ... ORDER BY col LIMIT :n
```

### 2. Application Code (inline SQL strings)

Search for `ROWNUM` in C# string literals, `StringBuilder`, and query-builder methods. Apply the same replacement patterns above.

### 3. Tests

Ensure integration tests validate that result set sizes are correct and that ordering is preserved (i.e., the correct *n* rows are returned, not just any *n* rows).
