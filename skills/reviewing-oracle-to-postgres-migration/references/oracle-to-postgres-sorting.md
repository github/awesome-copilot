# Oracle to PostgreSQL Sorting Migration Guide

Purpose: Preserve Oracle-like sorting semantics when moving queries to PostgreSQL.

## Key points
- Oracle and PostgreSQL default collations can differ significantly.
- Use `COLLATE "C"` only when you explicitly need Oracle-like binary ordering and no different sort rule is requested.
- If Oracle uses explicit linguistic ordering (for example `NLS_SORT = French`), map to an explicit PostgreSQL locale collation instead of forcing `"C"`.

## 1) Standard `SELECT … ORDER BY`
**Goal:** Keep Oracle-style ordering.

**Pattern (only when Oracle-compatible binary ordering is required):**
```sql
SELECT col1
FROM your_table
ORDER BY col1 COLLATE "C";
```

**Notes:**
- Apply `COLLATE "C"` only to sort expressions that must mimic Oracle binary ordering.
- Works with ascending/descending and multi-column sorts, e.g. `ORDER BY col1 COLLATE "C", col2 COLLATE "C" DESC`.

## 1b) Locale-aware ordering (when Oracle used NLS_SORT)

If Oracle used locale-specific sorting such as:
```sql
ORDER BY nlssort(Externalusers.UserID, 'NLS_SORT = French')
```
map to an explicit PostgreSQL collation, for example:
```sql
ORDER BY Externalusers.UserID COLLATE "ca_FR.utf-8"
```

Use a collation that exists in the target environment. Discover available collations with:
```sql
SELECT collname, collprovider, collcollate, collctype
FROM pg_collation
ORDER BY collname;
```

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
- The outer query safely orders the result set and adds an explicit collation where needed to align with Oracle sorting.

**Tips:**
- Ensure any columns used in the outer `ORDER BY` are included in the inner projection.
- For multi-column sorts, collate each relevant expression: `ORDER BY col2 COLLATE "C", col3 COLLATE "C" DESC`.

## Validation checklist
- [ ] Applied explicit collation only where required (`"C"` for Oracle-style binary ordering, locale collation for linguistic ordering).
- [ ] For `DISTINCT` queries, wrapped the projection and sorted in the outer query.
- [ ] Confirmed ordered columns are present in the inner projection.
- [ ] Re-ran tests or representative queries to verify ordering matches Oracle outputs.
