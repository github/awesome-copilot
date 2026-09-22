# PostgreSQL UNION ALL Planner Risk Guide

Purpose: Avoid regressions where migrated `UNION ALL` queries run much slower in PostgreSQL than expected.

## Problem

`UNION ALL` keeps duplicate rows and combines branch outputs directly, but PostgreSQL does not always optimize each branch as aggressively as isolated queries. In large datasets this can produce poor plans (for example full scans where index-based plans are expected).

## Why it happens

- Predicate pushdown through `UNION ALL` branches can be limited depending on query shape.
- Cardinality estimates across branches can be skewed.
- Branch-local indexes may not be chosen when the optimizer evaluates the combined query.

## Review checklist

- [ ] Compare `EXPLAIN (ANALYZE, BUFFERS)` plans for the combined `UNION ALL` query and branch-isolated variants.
- [ ] Confirm branch predicates are explicit and not hidden inside non-sargable expressions.
- [ ] Check for unexpected sequential scans on large tables in either branch.
- [ ] Verify indexes exist for each branch's filter and join predicates.

## Mitigation patterns

1. Test each branch independently to verify expected index usage.
2. Push filters down into each branch instead of only filtering in the outer query.
3. If plan quality remains poor, split the query into two separately executed statements and combine results in application code.
4. Consider materializing branch results in temporary/intermediate structures only when measurement confirms benefit.

## Validation note

Treat `UNION ALL` performance behavior as a migration review item even when functional test results match Oracle.
