---
name: 'capacity-planning'
description: 'Skill to analyze growth trends and project storage and resource needs'
---

# Capacity Planning and Growth Projections

## Purpose
Anticipate capacity issues before they occur through trend analysis and projections based on historical data.

## Entries
- Target database or instance
- Projection horizon (3, 6, 12 months)
- Historical size data (if available)

## Departures
- Current size per database and top 20 table
- Estimated monthly growth rate
- Storage projection for the requested horizon
- Identified capacity risks
- Configuration recommendations

## Steps

### 1. Current storage inventory
```sql
SELECT
    DB_NAME() AS base_datos,
    name AS fichero,
    physical_name,
    size * 8 / 1024 AS size_mb,
    max_size,
    growth,
    is_percent_growth
FROM sys.database_files;
```

### 2. Larger tables
```sql
SELECT TOP 20
    OBJECT_NAME(i.object_id) AS tabla,
    SUM(a.total_pages) * 8 / 1024 AS total_mb,
    SUM(a.used_pages) * 8 / 1024 AS used_mb,
    SUM(p.rows) AS filas
FROM sys.indexes i
JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
JOIN sys.allocation_units a ON p.partition_id = a.container_id
GROUP BY i.object_id
ORDER BY total_mb DESC;
```

### 3. Autogrowth configuration
```sql
SELECT
    name, physical_name,
    size * 8 / 1024 AS size_mb,
    CASE is_percent_growth
        WHEN 1 THEN CAST(growth AS VARCHAR) + '%'
        ELSE CAST(growth * 8 / 1024 AS VARCHAR) + ' MB'
    END AS autogrowth,
    CASE WHEN growth = 0 THEN 'RISK: no autogrowth'
    WHEN is_percent_growth = 1 AND growth >= 10 THEN 'RISK: growth % may be excessive'
         ELSE 'OK'
    END AS evaluacion
FROM sys.database_files;
```

### 4. Projection and recommendations
- Calculate growth rate with available data
- Project to requested horizon
- Identify when 80% capacity is reached

## Quality Checklist
- [ ] Autogrowth reviewed in all files
- [ ] Top 20 tables by size identified
- [ ] Documented projection with explicit assumptions
- [ ] Prioritized capacity risks
