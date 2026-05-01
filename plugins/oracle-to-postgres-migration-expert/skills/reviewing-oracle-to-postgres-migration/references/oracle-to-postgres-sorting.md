# Oracle to PostgreSQL Sorting Migration Guide

Purpose: Preserve Oracle-like sorting semantics when moving queries to PostgreSQL.

## Key points
- Oracle often treats plain `ORDER BY` as binary/byte-wise, giving case-insensitive ordering for ASCII.
- PostgreSQL defaults differ; to match Oracle behavior, use `COLLATE "C"` on sort expressions.

## 1) Standard `SELECT … ORDER BY`
**Goal:** Keep Oracle-style ordering.

**Pattern:**
```sql
SELECT col1
FROM your_table
ORDER BY col1 COLLATE "C";
```

**Notes:**
- Apply `COLLATE "C"` to each sort expression that must mimic Oracle.
- Works with ascending/descending and multi-column sorts, e.g. `ORDER BY col1 COLLATE "C", col2 COLLATE "C" DESC`.

## 2) `SELECT DISTINCT … ORDER BY`
**Issue:** PostgreSQL enforces that `ORDER BY` expressions appear in the `SELECT` list for `DISTINCT`, raising:
`Npgsql.PostgresException: 42P10: for SELECT DISTINCT, ORDER BY expressions must appear in select list`

**Oracle difference:** Oracle allowed ordering by expressions not projected when using `DISTINCT`.

**Recommended pattern (wrap and sort):**
```sql
SELECT *
FROM (
  SELECT DISTINCT col1, col2
  FROM your_table
) AS distinct_results
ORDER BY col2 COLLATE "C";
```

**Why:**
- The inner query performs the `DISTINCT` projection.
- The outer query safely orders the result set and adds `COLLATE "C"` to align with Oracle sorting.

**Tips:**
- Ensure any columns used in the outer `ORDER BY` are included in the inner projection.
- For multi-column sorts, collate each relevant expression: `ORDER BY col2 COLLATE "C", col3 COLLATE "C" DESC`.

## Validation checklist
- [ ] Added `COLLATE "C"` to every `ORDER BY` that should follow Oracle sorting rules.
- [ ] For `DISTINCT` queries, wrapped the projection and sorted in the outer query.
- [ ] Confirmed ordered columns are present in the inner projection.
- [ ] Re-ran tests or representative queries to verify ordering matches Oracle outputs.
