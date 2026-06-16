---
name: 'query-optimization'
description: 'Skill for tuning queries, plans and indexes with regression tests'
---

# Optimization of Queries and Plans

## Purpose
Reduce response time and resource consumption of critical queries while maintaining correct functional results.

## Entries
- Consult the objective stored procedure
- Execution plan (actual or estimated)
- Baseline metrics (duration, CPU, readings)

## Departures
- Optimized version of query
- Index recommendations
- Risks and regression tests
- Incremental deployment plan

## Steps

### 1. Baseline
- P50/P95 latency capture
- Capture CPU and logical reads

### 2. Plan analysis
- Detects costly table scans
- Review repetitive key lookups
- Identifica warnings (spills, memory grant)

### 3. Optimization proposal
- Sargability-oriented SQL rewrite
- Adjustment of predicates and joins
- Suggested indexes with key and included columns

### 4. Regression tests
- Compare functional results
- Compare before/after metrics

### 5. Rollout
- Deployment in staging
- Controlled window in production
- Monitoring and rollback

## Quality Checklist
- [ ] Quantified performance improvement
- [ ] No unwanted functional changes
- [ ] Defined rollback strategy

## Implementation Scripts

The complete framework is in `.github/scripts/query-optimization/`:

| Script | Paso |
|--------|------|
| `01-capture-baseline.sql` | Capture metrics before the change (CPU, reads, waits, spills, key lookups, stale stats) |
| `02-index-recommendations.sql` | Generate DDL: missing indexes due to impact, FK without index, duplicates, fragmentation |
| `03-golden-file-regression.ps1` | `capture` → save SP result · `validate` → compara vs golden |
| `04-staged-rollout.ps1` | Orquesta Stage 0→4: baseline → DEV → STAGING → PROD → monitor 24h |

Always use in this order. Do not apply DDL of script 02 without golden file of script 03.

## Priority Patterns

- **FK without index** → main cause of lock escalation in DELETE/UPDATE (Quick Win 30min)
- **Key Lookup → Covering Index** -> -30-60% logical reads with INCLUDE
- **Parameter sniffing** → `OPTIMIZE FOR UNKNOWN` or force plan in Query Store
- **Non-sargable predicates** → `YEAR(col)`, `CONVERT(...)`, `LIKE '%x'` → rewrite
- **Obsolete statistics** → `UPDATE STATISTICS WITH FULLSCAN` before any analysis
- [ ] Documented before/after evidence
