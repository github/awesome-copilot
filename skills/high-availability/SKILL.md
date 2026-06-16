---
name: 'high-availability'
description: 'Skill to evaluate the state of HA/DR in SQL Server: AlwaysOn, replication, log shipping and failover'
---

# High Availability and Disaster Recovery

## Purpose
Validate that the HA/DR strategy is operational, synchronized and aligned with the RTO/RPO objectives of the business.

## Entries
- SQL Server instance with HA configured
- Declared RTO/RPO objectives

## Departures
- Current status of replicas and synchronization
- Achievable vs target RTO/RPO
- Single points of failure identificados
- Runbook de failover
- Prioritized improvement plan

## Steps

### 1. Estado de AlwaysOn Availability Groups
```sql
SELECT
    ag.name AS grupo_disponibilidad,
    ar.replica_server_name AS replica,
    ar.availability_mode_desc AS modo,
    ar.failover_mode_desc AS failover,
    ars.role_desc AS rol,
    ars.synchronization_health_desc AS salud_sync,
    ars.connected_state_desc AS conexion
FROM sys.availability_groups ag
JOIN sys.availability_replicas ar ON ag.group_id = ar.group_id
JOIN sys.dm_hadr_availability_replica_states ars ON ar.replica_id = ars.replica_id;
```

### 2. Sync latency
```sql
SELECT
    db_name(drs.database_id) AS base_datos,
    drs.synchronization_state_desc,
    drs.synchronization_health_desc,
    drs.log_send_queue_size,
    drs.log_send_rate,
    drs.redo_queue_size,
    drs.redo_rate,
    drs.last_commit_time
FROM sys.dm_hadr_database_replica_states drs
WHERE drs.is_local = 0;
```

### 3. Log shipping (si aplica)
```sql
SELECT
    primary_server, primary_database,
    secondary_server, secondary_database,
    last_backup_date, last_copied_date, last_restored_date,
    DATEDIFF(MINUTE, last_restored_date, GETDATE()) AS minutos_retraso
FROM msdb.dbo.log_shipping_monitor_secondary;
```

### 4. RTO/RPO validation
- Calculates actual RPO based on sync latency
- Estimates RTO based on failover history or restore time
- Contrasts with stated objectives
- Identifica gaps

## Quality Checklist
- [ ] Checked replica status
- [ ] Measured sync latency
- [ ] Actual RPO calculated and compared to target
- [ ] Single points of failure documentados
- [ ] Updated failover runbook
