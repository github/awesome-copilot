---
name: 'jobs-automation'
description: 'Skill to audit SQL Agent jobs, detect failures and optimize schedules'
---

# Job Analysis and SQL Agent Automation

## Purpose
Provide complete visibility over SQL Agent jobs: inventory, success rate, schedule conflicts, and obsolete jobs.

## Entries
- Target SQL Server instance
- Analysis time window (default: last 30 days)

## Departures
- Complete inventory of jobs with status and metrics
- Failed jobs or jobs with a high error rate
- Schedule conflicts detected
- Obsolete Jobs or Jobs without recent execution
- Reorganization recommendations

## Steps

### 1. Job inventory
```sql
SELECT
    j.name AS job,
    j.enabled,
    c.name AS categoria,
    l.name AS propietario,
    j.date_created,
    j.date_modified
FROM msdb.dbo.sysjobs j
LEFT JOIN msdb.dbo.syscategories c ON j.category_id = c.category_id
LEFT JOIN sys.syslogins l ON j.owner_sid = l.sid
ORDER BY j.name;
```

### 2. Recent execution history
```sql
SELECT TOP 100
    j.name AS job,
    h.step_name,
    CASE h.run_status
        WHEN 0 THEN 'FALLO' WHEN 1 THEN 'OK'
        WHEN 2 THEN 'REINTENTO' WHEN 3 THEN 'CANCELADO'
    END AS estado,
    msdb.dbo.agent_datetime(h.run_date, h.run_time) AS fecha_inicio,
    h.run_duration AS duracion_hhmmss,
    h.message
FROM msdb.dbo.sysjobhistory h
JOIN msdb.dbo.sysjobs j ON h.job_id = j.job_id
WHERE h.step_id = 0
ORDER BY h.run_date DESC, h.run_time DESC;
```

### 3. Jobs without recent execution
```sql
SELECT
    j.name AS job,
    j.enabled,
    MAX(msdb.dbo.agent_datetime(h.run_date, h.run_time)) AS ultima_ejecucion,
    DATEDIFF(DAY, MAX(msdb.dbo.agent_datetime(h.run_date, h.run_time)), GETDATE()) AS dias_inactivo
FROM msdb.dbo.sysjobs j
LEFT JOIN msdb.dbo.sysjobhistory h ON j.job_id = h.job_id AND h.step_id = 0
GROUP BY j.job_id, j.name, j.enabled
HAVING MAX(msdb.dbo.agent_datetime(h.run_date, h.run_time)) < DATEADD(DAY, -30, GETDATE())
    OR MAX(h.run_date) IS NULL
ORDER BY dias_inactivo DESC;
```

### 4. Detection of schedule overlaps
- Identify jobs with schedules that match the time window
- Estimate average duration per job
- Detects possible resource conflicts

## Quality Checklist
- [ ] All inventoried jobs with owner
- [ ] Failed jobs in last 30 days identified
- [ ] Inactive jobs >30 days documented
- [ ] Revised schedule overlaps
- [ ] Recommendations with justification
