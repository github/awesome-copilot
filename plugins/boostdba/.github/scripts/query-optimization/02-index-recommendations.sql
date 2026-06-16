-- ============================================================
-- SCRIPT 2/4: RECOMENDACIÓN DE ÍNDICES
-- ProjectName Query Optimization Framework
-- Usage: Ejecutar DESPUÉS de capturar baseline y observar waits
-- Output: DDL de índices listo para revisar y aplicar
-- IMPORTANTE: Revisar ANTES de ejecutar, no aplicar en bloque
-- ============================================================

USE ProjectName;
GO

-- ──────────────────────────────────────────────
-- 1. ÍNDICES FALTANTES (sys.dm_db_missing_index)
-- Ordered por impacto = seeks × avg_impact × (seeks+scans)
-- ──────────────────────────────────────────────
PRINT '=== ÍNDICES FALTANTES — ORDENADOS POR IMPACTO ===';

SELECT TOP 30
    ROUND(migs.avg_total_user_cost
          * migs.avg_user_impact
          * (migs.user_seeks + migs.user_scans), 0)             AS [ImpactScore],
    migs.user_seeks                                             AS [Seeks],
    migs.user_scans                                             AS [Scans],
    ROUND(migs.avg_user_impact, 1)                              AS [AvgImpactPct],
    DB_NAME(mid.database_id)                                    AS [Database],
    OBJECT_SCHEMA_NAME(mid.object_id, mid.database_id) + '.'
        + OBJECT_NAME(mid.object_id, mid.database_id)          AS [Table],
    mid.equality_columns                                        AS [EqualityCols],
    mid.inequality_columns                                      AS [InequalityCols],
    mid.included_columns                                        AS [IncludedCols],
    -- DDL sugerido (revisar nombre antes de aplicar)
    'CREATE NONCLUSTERED INDEX [IX_'
        + OBJECT_NAME(mid.object_id, mid.database_id)
        + '_Missing_' + CONVERT(VARCHAR, mid.index_handle)
        + '] ON '
        + OBJECT_SCHEMA_NAME(mid.object_id, mid.database_id) + '.'
        + OBJECT_NAME(mid.object_id, mid.database_id)
        + ' ('
        + ISNULL(mid.equality_columns, '')
        + CASE WHEN mid.inequality_columns IS NOT NULL
               THEN CASE WHEN mid.equality_columns IS NOT NULL THEN ', ' ELSE '' END
                    + mid.inequality_columns
               ELSE '' END
        + ')'
        + ISNULL(' INCLUDE (' + mid.included_columns + ')', '')
        + ' WITH (ONLINE=ON, FILLFACTOR=85);'                   AS [SuggestedDDL]
FROM sys.dm_db_missing_index_details mid
JOIN sys.dm_db_missing_index_groups mig
    ON mid.index_handle = mig.index_handle
JOIN sys.dm_db_missing_index_group_stats migs
    ON mig.index_group_handle = migs.group_handle
WHERE mid.database_id = DB_ID('ProjectName')
ORDER BY ImpactScore DESC;
GO

-- ──────────────────────────────────────────────
-- 2. FOREIGN KEYS SIN ÍNDICE (Lock escalation risk)
-- Cada FK no indexada = full scan en DELETE/UPDATE
-- ──────────────────────────────────────────────
PRINT '=== FOREIGN KEYS SIN ÍNDICE ===';

SELECT
    fk.name                                                     AS [ForeignKey],
    OBJECT_SCHEMA_NAME(fk.parent_object_id) + '.'
        + OBJECT_NAME(fk.parent_object_id)                     AS [ChildTable],
    fkc.constraint_column_id                                    AS [ColOrder],
    c.name                                                      AS [ColumnName],
    c.system_type_id,
    -- DDL sugerido
    'CREATE NONCLUSTERED INDEX [IX_'
        + OBJECT_NAME(fk.parent_object_id)
        + '_FK_' + c.name
        + '] ON '
        + OBJECT_SCHEMA_NAME(fk.parent_object_id) + '.'
        + OBJECT_NAME(fk.parent_object_id)
        + ' (' + c.name + ')'
        + ' WITH (ONLINE=ON, FILLFACTOR=90);'                   AS [SuggestedDDL]
FROM sys.foreign_keys fk
JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
JOIN sys.columns c
    ON c.object_id = fkc.parent_object_id
    AND c.column_id = fkc.parent_column_id
WHERE NOT EXISTS (
    SELECT 1
    FROM sys.index_columns ic
    JOIN sys.indexes i ON i.object_id = ic.object_id AND i.index_id = ic.index_id
    WHERE ic.object_id = fkc.parent_object_id
      AND ic.column_id = fkc.parent_column_id
      AND ic.index_column_id = 1  -- columna líder del índice
      AND i.type IN (1, 2)        -- clustered o nonclustered
)
ORDER BY fk.parent_object_id, fkc.constraint_column_id;
GO

-- ──────────────────────────────────────────────
-- 3. ÍNDICES DUPLICADOS / REDUNDANTES
-- Índices que cubren el mismo conjunto de columnas
-- ──────────────────────────────────────────────
PRINT '=== ÍNDICES DUPLICADOS / REDUNDANTES ===';

WITH IndexColumns AS (
    SELECT
        i.object_id,
        i.index_id,
        i.name    AS IndexName,
        i.type_desc,
        STRING_AGG(c.name, ',') WITHIN GROUP (ORDER BY ic.key_ordinal) AS KeyColumns
    FROM sys.indexes i
    JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
    JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE ic.is_included_column = 0
      AND i.type > 0   -- excluir heap
      AND OBJECTPROPERTY(i.object_id, 'IsUserTable') = 1
    GROUP BY i.object_id, i.index_id, i.name, i.type_desc
)
SELECT
    OBJECT_SCHEMA_NAME(a.object_id) + '.' + OBJECT_NAME(a.object_id) AS [Table],
    a.IndexName                                                 AS [Index1],
    b.IndexName                                                 AS [Index2_Duplicate],
    a.KeyColumns,
    -- Sugerencia de DROP (validar antes)
    'DROP INDEX [' + b.IndexName + '] ON '
        + OBJECT_SCHEMA_NAME(b.object_id) + '.' + OBJECT_NAME(b.object_id) + ';' AS [SuggestedDrop]
FROM IndexColumns a
JOIN IndexColumns b
    ON a.object_id = b.object_id
    AND a.index_id < b.index_id
    AND b.KeyColumns LIKE a.KeyColumns + '%'  -- b es superset o igual
ORDER BY a.object_id, a.IndexName;
GO

-- ──────────────────────────────────────────────
-- 4. ÍNDICES NO USADOS (candidatos a eliminar)
-- user_seeks=0 AND user_scans=0 AND user_lookups=0
-- ──────────────────────────────────────────────
PRINT '=== ÍNDICES NO USADOS (desde último reinicio) ===';

SELECT
    OBJECT_SCHEMA_NAME(i.object_id) + '.' + OBJECT_NAME(i.object_id) AS [Table],
    i.name                                                      AS [Index],
    i.type_desc,
    ius.user_seeks,
    ius.user_scans,
    ius.user_lookups,
    ius.user_updates                                            AS [WriteOverhead],
    -- Eliminar solo si user_updates = 0 también
    'DROP INDEX [' + i.name + '] ON '
        + OBJECT_SCHEMA_NAME(i.object_id) + '.' + OBJECT_NAME(i.object_id)
        + '; -- ⚠️ VALIDAR ANTES'                               AS [SuggestedDrop]
FROM sys.indexes i
LEFT JOIN sys.dm_db_index_usage_stats ius
    ON ius.object_id = i.object_id
    AND ius.index_id = i.index_id
    AND ius.database_id = DB_ID('ProjectName')
WHERE OBJECTPROPERTY(i.object_id, 'IsUserTable') = 1
  AND i.type > 0    -- excluir heaps
  AND i.is_primary_key = 0
  AND i.is_unique_constraint = 0
  AND ISNULL(ius.user_seeks, 0) = 0
  AND ISNULL(ius.user_scans, 0) = 0
  AND ISNULL(ius.user_lookups, 0) = 0
  AND ISNULL(ius.user_updates, 0) > 0  -- solo si genera overhead
ORDER BY ius.user_updates DESC;
GO

-- ──────────────────────────────────────────────
-- 5. FRAGMENTACIÓN DE ÍNDICES
-- > 30% REBUILD | 10-30% REORGANIZE
-- ──────────────────────────────────────────────
PRINT '=== FRAGMENTACIÓN DE ÍNDICES (>10%) ===';

SELECT
    OBJECT_SCHEMA_NAME(ips.object_id) + '.' + OBJECT_NAME(ips.object_id) AS [Table],
    i.name                                                      AS [Index],
    ips.index_type_desc,
    ROUND(ips.avg_fragmentation_in_percent, 1)                  AS [Fragmentation_Pct],
    ips.page_count,
    CASE
        WHEN ips.avg_fragmentation_in_percent > 30
            THEN 'ALTER INDEX [' + i.name + '] ON '
                + OBJECT_SCHEMA_NAME(ips.object_id) + '.' + OBJECT_NAME(ips.object_id)
                + ' REBUILD WITH (ONLINE=ON, FILLFACTOR=85);'
        WHEN ips.avg_fragmentation_in_percent > 10
            THEN 'ALTER INDEX [' + i.name + '] ON '
                + OBJECT_SCHEMA_NAME(ips.object_id) + '.' + OBJECT_NAME(ips.object_id)
                + ' REORGANIZE;'
        ELSE 'OK'
    END                                                         AS [SuggestedAction]
FROM sys.dm_db_index_physical_stats(
    DB_ID('ProjectName'), NULL, NULL, NULL, 'LIMITED') ips
JOIN sys.indexes i
    ON i.object_id = ips.object_id
    AND i.index_id = ips.index_id
WHERE ips.avg_fragmentation_in_percent > 10
  AND ips.page_count > 100  -- ignorar tablas pequeñas
  AND ips.index_type_desc != 'HEAP'
ORDER BY ips.avg_fragmentation_in_percent DESC;
GO

PRINT '=== ANÁLISIS DE ÍNDICES COMPLETADO ===';
PRINT 'IMPORTANTE: Revisar CADA DDL sugerido antes de ejecutar.';
PRINT 'NO eliminar índices sin análisis de impacto en escrituras.';
GO

