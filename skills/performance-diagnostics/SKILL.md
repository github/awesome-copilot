---
name: 'performance-diagnostics'
description: 'Skill to detect bottlenecks with DMVs and Query Store'
---

# SQL Server Performance Diagnosis

## Purpose
Identify root causes of performance degradation in SQL Server using reproducible technical evidence.

## Entries
- Target database
- Problem time window
- Main symptom (high CPU, timeout, crashes, slowness)

## Departures
- Top queries by impact
- Prioritized bottlenecks
- Root Cause Hypothesis
- Mitigation and validation plan

## Steps

### 1. Wait Main Stats
```sql
SELECT TOP 20 wait_type, waiting_tasks_count, wait_time_ms
FROM sys.dm_os_wait_stats
WHERE wait_type NOT LIKE 'SLEEP%'
ORDER BY wait_time_ms DESC;
```

### 2. Top queries by CPU
```sql
SELECT TOP 20
    qs.total_worker_time AS total_cpu,
    qs.execution_count,
    qs.total_elapsed_time,
    SUBSTRING(st.text, (qs.statement_start_offset/2)+1,
      ((CASE qs.statement_end_offset WHEN -1 THEN DATALENGTH(st.text)
      ELSE qs.statement_end_offset END - qs.statement_start_offset)/2) + 1) AS query_text
FROM sys.dm_exec_query_stats qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) st
ORDER BY qs.total_worker_time DESC;
```

### 3. Active locks
```sql
SELECT
    r.session_id,
    r.blocking_session_id,
    r.wait_type,
    r.wait_time,
    t.text
FROM sys.dm_exec_requests r
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) t
WHERE r.blocking_session_id <> 0;
```

### 4. Hypotheses and prioritization
- Classify findings into high, medium, low impact
- Assign action and risk for each finding

### 5. Validation plan
- Define before/after metrics
- Define rollback per action

## Quality Checklist
- [ ] Findings with SQL evidence
- [ ] Prioritization by impact/effort
- [ ] Mitigations with estimated risk
- [ ] Measurable success criterion
