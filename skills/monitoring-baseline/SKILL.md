---
name: 'monitoring-baseline'
description: 'Skill to establish baseline of normal behavior and detect deviations in SQL Server'
---

# Performance Monitoring and Baseline

## Purpose
Define what is "normal" in the system and detect when current behavior deviates, before it impacts users.

## Entries
- Target SQL Server instance
- Ventana de tiempo de referencia (baseline)
- Metrics to monitor

## Departures
- Baseline of key metrics by time zone
- Deviations from the current baseline
- Recommended alert thresholds
- Comparative health report

## Steps

### 1. Session and connection metrics
```sql
SELECT
    login_name,
    COUNT(*) AS conexiones,
    SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) AS activas,
    SUM(CASE WHEN blocking_session_id > 0 THEN 1 ELSE 0 END) AS bloqueadas
FROM sys.dm_exec_sessions
WHERE is_user_process = 1
GROUP BY login_name
ORDER BY conexiones DESC;
```

### 2. Baseline of waits per time slot
```sql
SELECT
    wait_type,
    waiting_tasks_count,
    wait_time_ms,
    max_wait_time_ms,
    signal_wait_time_ms
FROM sys.dm_os_wait_stats
WHERE wait_type NOT IN (
    'SLEEP_TASK','BROKER_TO_FLUSH','BROKER_TASK_STOP',
    'CLR_AUTO_EVENT','DISPATCHER_QUEUE_SEMAPHORE',
    'FT_IFTS_SCHEDULER_IDLE_WAIT','HADR_FILESTREAM_IOMGR_IOCOMPLETION',
    'HADR_WORK_QUEUE','LAZYWRITER_SLEEP','LOGMGR_QUEUE',
    'ONDEMAND_TASK_QUEUE','REQUEST_FOR_DEADLOCK_SEARCH',
    'RESOURCE_QUEUE','SERVER_IDLE_CHECK','SLEEP_DBSTARTUP',
    'SLEEP_DCOMSTARTUP','SLEEP_MASTERDBREADY','SLEEP_MASTERMDREADY',
    'SLEEP_MASTERUPGRADED','SLEEP_MSDBSTARTUP','SLEEP_TEMPDBSTARTUP',
    'SNI_HTTP_ACCEPT','SP_SERVER_DIAGNOSTICS_SLEEP','SQLTRACE_BUFFER_FLUSH',
    'WAITFOR','XE_DISPATCHER_WAIT','XE_TIMER_EVENT'
)
ORDER BY wait_time_ms DESC;
```

### 3. Memory pressure
```sql
SELECT
    physical_memory_in_use_kb / 1024 AS mem_uso_mb,
    page_fault_count,
    memory_utilization_percentage
FROM sys.dm_os_process_memory;
```

### 4. Definition of thresholds and alerts
- Compare current metrics with captured baseline
- Proposes thresholds based on the 95th percentile of the baseline
- List the metrics that deviate the most

## Quality Checklist
- [ ] Baseline captured in representative period
- [ ] Metric-defined thresholds
- [ ] Anomalies documented with context
- [ ] Alerting tool recommendations
