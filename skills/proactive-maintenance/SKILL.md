---
name: 'proactive-maintenance'
description: 'Skill to detect fragmentation, stale statistics and problematic indexes in SQL Server'
---

# Proactive Maintenance of Indices and Statistics

## Purpose
Identify degraded objects that impact the performance of execution plans and generate prioritized maintenance commands.

## Entries
- Target database
- Configurable fragmentation threshold (default: rebuild >30%, reorganize >10%)
- List of critical tables (optional, to prioritize)

## Departures
- List of indexes to rebuild/reorganize with priority
- Outdated statistics sorted by impact
- Duplicate, overlapping or unused indexes
- Maintenance script ready to run
- Recommended schedule

## Steps

### 1. Index fragmentation
```sql
SELECT
    OBJECT_NAME(ips.object_id) AS tabla,
    i.name AS indice,
    ips.avg_fragmentation_in_percent,
    ips.page_count,
    CASE
        WHEN ips.avg_fragmentation_in_percent > 30 THEN 'REBUILD'
        WHEN ips.avg_fragmentation_in_percent > 10 THEN 'REORGANIZE'
        ELSE 'OK'
    END AS accion
FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') ips
JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
WHERE ips.page_count > 1000
ORDER BY ips.avg_fragmentation_in_percent DESC;
```

### 2. Outdated statistics
```sql
SELECT
    OBJECT_NAME(s.object_id) AS tabla,
    s.name AS estadistica,
    sp.last_updated,
    sp.rows,
    sp.rows_sampled,
    DATEDIFF(DAY, sp.last_updated, GETDATE()) AS dias_sin_actualizar
FROM sys.stats s
CROSS APPLY sys.dm_db_stats_properties(s.object_id, s.stats_id) sp
WHERE DATEDIFF(DAY, sp.last_updated, GETDATE()) > 7
ORDER BY dias_sin_actualizar DESC;
```

### 3. Unused indexes
```sql
SELECT
    OBJECT_NAME(i.object_id) AS tabla,
    i.name AS indice,
    ius.user_seeks, ius.user_scans, ius.user_lookups, ius.user_updates
FROM sys.indexes i
LEFT JOIN sys.dm_db_index_usage_stats ius
    ON i.object_id = ius.object_id AND i.index_id = ius.index_id
    AND ius.database_id = DB_ID()
WHERE i.type > 0
  AND ISNULL(ius.user_seeks,0) + ISNULL(ius.user_scans,0) + ISNULL(ius.user_lookups,0) = 0
ORDER BY ISNULL(ius.user_updates,0) DESC;
```

### 4. Prioritization and maintenance script
- Sort by critical tables first
- Genera ALTER INDEX ... REBUILD / REORGANIZE
- Estimate duration and necessary window

## Quality Checklist
- [ ] Revised fragmentation in all indexes with more than 1000 pages
- [ ] Statistics with more than 7 days identified
- [ ] Documented unused indexes before proposing deletion
- [ ] Script with transaction and time estimate
