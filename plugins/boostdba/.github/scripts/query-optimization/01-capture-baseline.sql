-- ============================================================
-- SCRIPT 1/4: CAPTURE BASELINE — Query Store + DMV
-- ProjectName Query Optimization Framework
-- Usage: Run against ProjectName database and persist output as JSON
-- Frequency: BEFORE any optimization change
-- ============================================================

USE ProjectName;
GO

-- ──────────────────────────────────────────────
-- 0. ENABLE QUERY STORE IF NOT ACTIVE
-- ──────────────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM sys.databases
    WHERE name = 'ProjectName' AND is_query_store_on = 1
)
BEGIN
    ALTER DATABASE ProjectName SET QUERY_STORE = ON;
    ALTER DATABASE ProjectName SET QUERY_STORE (
        OPERATION_MODE = READ_WRITE,
        CLEANUP_POLICY = (STALE_QUERY_THRESHOLD_DAYS = 30),
        DATA_FLUSH_INTERVAL_SECONDS = 900,
        INTERVAL_LENGTH_MINUTES = 60,
        MAX_STORAGE_SIZE_MB = 1000,
        QUERY_CAPTURE_MODE = AUTO,
        SIZE_BASED_CLEANUP_MODE = AUTO,
        MAX_PLANS_PER_QUERY = 200
    );
    PRINT 'Query Store habilitado en ProjectName';
END
ELSE
    PRINT 'Query Store ya estaba activo';
GO

-- ──────────────────────────────────────────────
-- 1. TOP 30 STORED PROCEDURES — MAYOR CPU
-- Baseline: tiempo total + promedio de CPU
-- ──────────────────────────────────────────────
PRINT '=== TOP 30 SPs POR CPU ===';

SELECT TOP 30
    DB_NAME(ps.database_id)                                     AS [Database],
    OBJECT_SCHEMA_NAME(ps.object_id, ps.database_id) + '.'
        + OBJECT_NAME(ps.object_id, ps.database_id)            AS [Procedure],
    ps.execution_count                                          AS [ExecCount],
    ps.total_worker_time / 1000                                 AS [TotalCPU_ms],
    ps.total_worker_time / ps.execution_count / 1000            AS [AvgCPU_ms],
    ps.total_elapsed_time / 1000                                AS [TotalElapsed_ms],
    ps.total_elapsed_time / ps.execution_count / 1000           AS [AvgElapsed_ms],
    ps.total_logical_reads                                      AS [TotalLogicalReads],
    ps.total_logical_reads / ps.execution_count                 AS [AvgLogicalReads],
    ps.total_physical_reads                                     AS [TotalPhysicalReads],
    ps.total_rows                                               AS [TotalRowsReturned],
    CAST(ps.last_execution_time AS SMALLDATETIME)               AS [LastExecution],
    CAST(ps.cached_time AS SMALLDATETIME)                       AS [PlanCached]
FROM sys.dm_exec_procedure_stats ps
WHERE ps.database_id = DB_ID('ProjectName')
  AND ps.object_id IS NOT NULL
ORDER BY ps.total_worker_time DESC;
GO

-- ──────────────────────────────────────────────
-- 2. TOP 30 SPs — MAYOR TIEMPO TOTAL (ELAPSED)
-- ──────────────────────────────────────────────
PRINT '=== TOP 30 SPs POR ELAPSED TIME ===';

SELECT TOP 30
    OBJECT_SCHEMA_NAME(ps.object_id, ps.database_id) + '.'
        + OBJECT_NAME(ps.object_id, ps.database_id)            AS [Procedure],
    ps.execution_count                                          AS [ExecCount],
    ps.total_elapsed_time / ps.execution_count / 1000           AS [AvgElapsed_ms],
    ps.total_worker_time / ps.execution_count / 1000            AS [AvgCPU_ms],
    ps.total_logical_reads / ps.execution_count                 AS [AvgLogicalReads],
    ps.total_elapsed_time / 1000000.0                           AS [TotalElapsed_sec]
FROM sys.dm_exec_procedure_stats ps
WHERE ps.database_id = DB_ID('ProjectName')
  AND ps.object_id IS NOT NULL
ORDER BY ps.total_elapsed_time DESC;
GO

-- ──────────────────────────────────────────────
-- 3. TOP 30 SPs — MAYOR FRECUENCIA (CONTENCIÓN)
-- ──────────────────────────────────────────────
PRINT '=== TOP 30 SPs POR FRECUENCIA ===';

SELECT TOP 30
    OBJECT_SCHEMA_NAME(ps.object_id, ps.database_id) + '.'
        + OBJECT_NAME(ps.object_id, ps.database_id)            AS [Procedure],
    ps.execution_count                                          AS [ExecCount],
    ps.total_elapsed_time / ps.execution_count / 1000           AS [AvgElapsed_ms],
    ps.total_worker_time / ps.execution_count / 1000            AS [AvgCPU_ms],
    ps.total_logical_reads / ps.execution_count                 AS [AvgLogicalReads]
FROM sys.dm_exec_procedure_stats ps
WHERE ps.database_id = DB_ID('ProjectName')
  AND ps.object_id IS NOT NULL
ORDER BY ps.execution_count DESC;
GO

-- ──────────────────────────────────────────────
-- 4. QUERY STORE — PLANES REGRESIONADOS
-- Identifica SPs cuyo plan cambió y empeoró
-- ──────────────────────────────────────────────
PRINT '=== PLANES REGRESIONADOS (QS) ===';

SELECT
    qsq.query_id,
    OBJECT_SCHEMA_NAME(qsq.object_id) + '.' + OBJECT_NAME(qsq.object_id) AS [Procedure],
    qsp.plan_id,
    qsrs.avg_cpu_time / 1000.0                                 AS [AvgCPU_ms],
    qsrs.avg_duration / 1000.0                                 AS [AvgDuration_ms],
    qsrs.avg_logical_io_reads                                   AS [AvgLogicalReads],
    qsrs.count_executions                                       AS [ExecCount],
    qsp.engine_version,
    qsp.is_forced_plan,
    CAST(qsp.last_compile_start_time AS SMALLDATETIME)          AS [LastCompile]
FROM sys.query_store_query qsq
JOIN sys.query_store_plan qsp ON qsp.query_id = qsq.query_id
JOIN sys.query_store_runtime_stats qsrs ON qsrs.plan_id = qsp.plan_id
JOIN sys.query_store_runtime_stats_interval qsri ON qsri.runtime_stats_interval_id = qsrs.runtime_stats_interval_id
WHERE qsq.object_id IS NOT NULL
  AND qsrs.avg_duration > 1000000  -- > 1 segundo
ORDER BY qsrs.avg_cpu_time DESC;
GO

-- ──────────────────────────────────────────────
-- 5. WAIT STATS — DISTRIBUCIÓN DE ESPERAS
-- Categoriza dónde gasta tiempo SQL Server
-- ──────────────────────────────────────────────
PRINT '=== WAIT STATS (TOP 20) ===';

SELECT TOP 20
    wait_type,
    waiting_tasks_count                                         AS [WaitCount],
    wait_time_ms                                                AS [TotalWait_ms],
    wait_time_ms / NULLIF(waiting_tasks_count, 0)               AS [AvgWait_ms],
    signal_wait_time_ms                                         AS [SignalWait_ms],
    CAST(100.0 * wait_time_ms / SUM(wait_time_ms) OVER()
         AS DECIMAL(5,2))                                       AS [WaitPct]
FROM sys.dm_os_wait_stats
WHERE wait_type NOT IN (
    'SLEEP_TASK','LAZYWRITER_SLEEP','SQLTRACE_BUFFER_FLUSH',
    'CLR_SEMAPHORE','WAITFOR','LOGMGR_QUEUE','CHECKPOINT_QUEUE',
    'REQUEST_FOR_DEADLOCK_SEARCH','XE_TIMER_EVENT','XE_DISPATCHER_JOIN',
    'BROKER_EVENTHANDLER','BROKER_RECEIVE_WAITFOR','QDS_CLEANUP_STALE_QUERIES',
    'QDS_PERSIST_TASK_MAIN_LOOP_SLEEP','FT_IFTS_SCHEDULER_IDLE_WAIT',
    'SLEEP_SYSTEMTASK','SLEEP_DBSTARTUP','DISPATCHER_QUEUE_SEMAPHORE',
    'SNI_HTTP_ACCEPT','HADR_FILESTREAM_IOMGR_IOCOMPLETION','BROKER_TO_FLUSH'
)
ORDER BY wait_time_ms DESC;
GO

-- ──────────────────────────────────────────────
-- 6. DETECCIÓN DE SPILLS (Presión TEMPDB)
-- Queries que desbordan a disco
-- ──────────────────────────────────────────────
PRINT '=== SPs CON SPILLS A TEMPDB ===';

SELECT TOP 20
    OBJECT_SCHEMA_NAME(qs.object_id, qs.database_id) + '.'
        + OBJECT_NAME(qs.object_id, qs.database_id)            AS [Procedure],
    ps.execution_count,
    qs.total_spills,
    qs.total_spills / ps.execution_count                        AS [AvgSpillsPerExec],
    qs.total_spilled_rows,
    ps.total_worker_time / ps.execution_count / 1000            AS [AvgCPU_ms]
FROM sys.dm_exec_query_stats qs
JOIN sys.dm_exec_procedure_stats ps
    ON qs.object_id = ps.object_id
    AND qs.database_id = ps.database_id
WHERE qs.total_spills > 0
  AND qs.database_id = DB_ID('ProjectName')
ORDER BY qs.total_spills DESC;
GO

-- ──────────────────────────────────────────────
-- 7. KEY LOOKUPS COSTOSOS
-- Índices NC que requieren lookup al clustered
-- ──────────────────────────────────────────────
PRINT '=== KEY LOOKUPS (via Query Plans) ===';

SELECT
    DB_NAME(qp.dbid)                                            AS [Database],
    OBJECT_NAME(qp.objectid, qp.dbid)                          AS [Procedure],
    qs.execution_count,
    qs.total_logical_reads / qs.execution_count                 AS [AvgLogicalReads],
    qs.total_worker_time / qs.execution_count / 1000            AS [AvgCPU_ms],
    SUBSTRING(qt.text, (qs.statement_start_offset/2)+1,
        ((CASE qs.statement_end_offset
            WHEN -1 THEN DATALENGTH(qt.text)
            ELSE qs.statement_end_offset
         END - qs.statement_start_offset)/2)+1)                 AS [StatementText]
FROM sys.dm_exec_query_stats qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) qt
CROSS APPLY sys.dm_exec_query_plan(qs.plan_handle) qp
WHERE CAST(qp.query_plan AS NVARCHAR(MAX)) LIKE '%Lookup%'
  AND qp.dbid = DB_ID('ProjectName')
  AND qs.execution_count > 10
ORDER BY qs.total_logical_reads DESC;
GO

-- ──────────────────────────────────────────────
-- 8. ESTADÍSTICAS OBSOLETAS
-- Tablas con stats sin actualizar > 7 días
-- ──────────────────────────────────────────────
PRINT '=== ESTADÍSTICAS OBSOLETAS (>7 días) ===';

SELECT
    OBJECT_SCHEMA_NAME(s.object_id) + '.' + OBJECT_NAME(s.object_id) AS [Table],
    s.name                                                      AS [Statistic],
    sp.last_updated                                             AS [LastUpdated],
    DATEDIFF(DAY, sp.last_updated, GETDATE())                   AS [DaysOld],
    sp.rows,
    sp.rows_sampled,
    CAST(100.0 * sp.rows_sampled / NULLIF(sp.rows,0) AS DECIMAL(5,1)) AS [SamplePct],
    sp.modification_counter                                     AS [Modifications]
FROM sys.stats s
CROSS APPLY sys.dm_db_stats_properties(s.object_id, s.stats_id) sp
WHERE OBJECTPROPERTY(s.object_id, 'IsUserTable') = 1
  AND (sp.last_updated < DATEADD(DAY, -7, GETDATE())
       OR sp.last_updated IS NULL)
ORDER BY sp.modification_counter DESC;
GO

PRINT '=== BASELINE CAPTURADO ===';
PRINT 'Guarda esta salida como baseline-' + CONVERT(VARCHAR, GETDATE(), 112) + '.json';
GO

