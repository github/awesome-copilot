<#
.SYNOPSIS
  Validacion de cuellos de botella Fase 2: ejecuta consultas DMV en SQL Server PROD para confirmar cuellos reales
  
.DESCRIPTION
  Valida el diagnostico de analisis estatico con metricas reales de produccion:
  1. Top SPs por total_elapsed_time (consultas CPU-bound)
  2. Top SPs por execution_count (candidatos frecuentes/de contencion)
  3. Eventos de escalado de locks (waits PAGEIO_LATCH, LCK_M)
  4. Inflado de cache de planes (multiples planes para la misma consulta)
  5. Desglose de wait stats por tipo
  
.PARAMETER ServerInstance
  Instancia SQL Server (ej., 'localhost\SQLEXPRESS' o 'prod.database.windows.net')
  
.PARAMETER DatabaseName
  Base de datos objetivo (ej., 'ProjectName')
  
.PARAMETER OutputDir
  Directorio de salida para informes (por defecto ./workspaces/ProjectName/plans/)
  
.EXAMPLE
  .\diagnose-sp-bottlenecks.ps1 -ServerInstance 'prod-db.database.windows.net' -DatabaseName 'ProjectName'
  
.NOTES
  Requiere: SQL Server Management Objects (SMO) o modulo SqlServer
  Rol: db_datareader en la base objetivo
#>

param(
  [Parameter(Mandatory=$true)]
  [string]$ServerInstance,
  
  [Parameter(Mandatory=$false)]
  [string]$DatabaseName = 'ProjectName',
  
  [Parameter(Mandatory=$false)]
  [string]$OutputDir = '.\workspaces\ProjectName\plans'
)

$ErrorActionPreference = 'Stop'

function Export-JsonEnvelope {
  param(
    [Parameter(Mandatory=$true)] [string]$Path,
    [Parameter(Mandatory=$true)] [string]$QueryName,
    [Parameter(Mandatory=$true)] [object]$Rows,
    [string]$Server,
    [string]$Database
  )

  $items = @($Rows)
  $payload = [ordered]@{
    metadata = [ordered]@{
      schemaVersion = "1.0"
      versionEsquema = "1.0"
      generatedAt = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
      generadoEn = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
      query = $QueryName
      consulta = $QueryName
      serverInstance = $Server
      instanciaServidor = $Server
      databaseName = $Database
      nombreBaseDatos = $Database
      total = $items.Count
    }
    data = $items
  }

  $payload | ConvertTo-Json -Depth 8 | Out-File -FilePath $Path -Encoding UTF8 -Force
}

Write-Host "🔍 Fase 2: Validacion de cuellos de botella con DMV" -ForegroundColor Cyan
Write-Host "📌 Objetivo: $ServerInstance / $DatabaseName" -ForegroundColor Gray
Write-Host "📂 Salida: $OutputDir" -ForegroundColor Gray

# Asegurar que exista el directorio de salida
if (-not (Test-Path $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
  Write-Host "✅ Directorio de salida creado" -ForegroundColor Green
}

# Intentar importar SqlServer; fallback a SMO
try {
  Import-Module SqlServer -ErrorAction Stop | Out-Null
  $usingSqlModule = $true
  Write-Host "✅ Usando modulo SqlServer" -ForegroundColor Green
} catch {
  Write-Host "⚠️  Modulo SqlServer no encontrado, intentando conexion directa..." -ForegroundColor Yellow
  $usingSqlModule = $false
}

# Conectar a SQL Server
try {
  if ($usingSqlModule) {
    $connection = Connect-DbaInstance -SqlInstance $ServerInstance -Database $DatabaseName -ErrorAction Stop
  } else {
    [System.Reflection.Assembly]::LoadWithPartialName("Microsoft.SqlServer.Smo") | Out-Null
    $smo = New-Object Microsoft.SqlServer.Management.Smo.Server $ServerInstance
    $db = $smo.Databases[$DatabaseName]
    Write-Host "✅ Conectado a $ServerInstance / $DatabaseName" -ForegroundColor Green
  }
} catch {
  Write-Host "❌ Error al conectar: $_" -ForegroundColor Red
  exit 1
}

# Consulta 1: Top SPs por total_elapsed_time (CPU-bound)
Write-Host "`n📊 Consulta 1: Top 20 SPs por tiempo total transcurrido (CPU-bound)" -ForegroundColor Cyan

$query1 = @"
SELECT TOP 20 
  DB_NAME(database_id) as [Database],
  OBJECT_SCHEMA_NAME(object_id, database_id) + '.' + OBJECT_NAME(object_id, database_id) as [Procedure],
  execution_count as [ExecCount],
  total_elapsed_time / 1000000.0 as [TotalElapsed_Sec],
  (total_elapsed_time / execution_count) / 1000.0 as [AvgElapsed_Ms],
  total_logical_reads as [LogicalReads],
  total_physical_reads as [PhysicalReads],
  total_rows as [RowsReturned]
FROM sys.dm_exec_procedure_stats
WHERE database_id = DB_ID('$DatabaseName')
  AND object_id IS NOT NULL
ORDER BY total_elapsed_time DESC;
"@

try {
  if ($usingSqlModule) {
    $results1 = Invoke-DbaQuery -SqlInstance $ServerInstance -Database $DatabaseName -Query $query1
  } else {
    $results1 = $smo.Query($query1)
  }
  
  $results1 | Format-Table -AutoSize
  Export-JsonEnvelope -Path "$OutputDir\phase2-top-sps-cpu.json" -QueryName "top-sps-cpu" -Rows $results1 -Server $ServerInstance -Database $DatabaseName
  Write-Host "✅ Exportado a phase2-top-sps-cpu.json" -ForegroundColor Green
} catch {
  Write-Host "❌ Consulta 1 fallo: $_" -ForegroundColor Red
}

# Consulta 2: Top SPs por execution_count (frecuencia)
Write-Host "`n📊 Consulta 2: Top 20 SPs por numero de ejecuciones (riesgo de contencion)" -ForegroundColor Cyan

$query2 = @"
SELECT TOP 20
  DB_NAME(database_id) as [Database],
  OBJECT_SCHEMA_NAME(object_id, database_id) + '.' + OBJECT_NAME(object_id, database_id) as [Procedure],
  execution_count as [ExecCount],
  (total_elapsed_time / execution_count) / 1000.0 as [AvgElapsed_Ms],
  total_logical_reads as [LogicalReads],
  total_physical_reads as [PhysicalReads]
FROM sys.dm_exec_procedure_stats
WHERE database_id = DB_ID('$DatabaseName')
  AND object_id IS NOT NULL
ORDER BY execution_count DESC;
"@

try {
  if ($usingSqlModule) {
    $results2 = Invoke-DbaQuery -SqlInstance $ServerInstance -Database $DatabaseName -Query $query2
  } else {
    $results2 = $smo.Query($query2)
  }
  
  $results2 | Format-Table -AutoSize
  Export-JsonEnvelope -Path "$OutputDir\phase2-top-sps-frequency.json" -QueryName "top-sps-frequency" -Rows $results2 -Server $ServerInstance -Database $DatabaseName
  Write-Host "✅ Exportado a phase2-top-sps-frequency.json" -ForegroundColor Green
} catch {
  Write-Host "❌ Consulta 2 fallo: $_" -ForegroundColor Red
}

# Consulta 3: Desglose de waits
Write-Host "`n📊 Consulta 3: Desglose de wait stats" -ForegroundColor Cyan

$query3 = @"
SELECT TOP 20
  wait_type,
  waiting_tasks_count as [WaitCount],
  wait_time_ms as [TotalWaitMs],
  (wait_time_ms / NULLIF(waiting_tasks_count, 0)) as [AvgWaitMs],
  signal_wait_time_ms as [SignalWaitMs]
FROM sys.dm_os_wait_stats
WHERE wait_type NOT IN ('CLR_SEMAPHORE', 'LAZYWRITER_SLEEP', 'SQLTRACE_BUFFER_FLUSH',
                        'SLEEP_TASK', 'SLEEP_SYSTEMTASK', 'WAITFOR', 'LOGMGR_QUEUE',
                        'CHECKPOINT_QUEUE', 'REQUEST_FOR_DEADLOCK_SEARCH', 'XE_TIMER_EVENT',
                        'XE_DISPATCHER_JOIN', 'QDS_CLEANUP_STALE_QUERIES', 'QDS_PERSIST_TASK_MAIN_LOOP_SLEEP',
                        'BROKER_EVENTHANDLER', 'BROKER_RECEIVE_WAITFOR', 'TRACER', 'FT_IFTS_SCHEDULER_IDLE_WAIT',
                        'HADR_FILESTREAM_IOMGR_IOCOMPLETION', 'PWAIT_ALL', 'CXPACKET_IDLE')
ORDER BY wait_time_ms DESC;
"@

try {
  if ($usingSqlModule) {
    $results3 = Invoke-DbaQuery -SqlInstance $ServerInstance -Database $DatabaseName -Query $query3
  } else {
    $results3 = $smo.Query($query3)
  }
  
  $results3 | Format-Table -AutoSize
  Export-JsonEnvelope -Path "$OutputDir\phase2-wait-stats.json" -QueryName "wait-stats" -Rows $results3 -Server $ServerInstance -Database $DatabaseName
  Write-Host "✅ Exportado a phase2-wait-stats.json" -ForegroundColor Green
} catch {
  Write-Host "❌ Consulta 3 fallo: $_" -ForegroundColor Red
}

# Consulta 4: Candidatos a escalado de locks
Write-Host "`n📊 Consulta 4: Waits de lock actuales" -ForegroundColor Cyan

$query4 = @"
SELECT 
  session_id as [SessionId],
  wait_type as [WaitType],
  wait_duration_ms as [WaitMs],
  wait_resource as [WaitResource]
FROM sys.dm_os_waiting_tasks
WHERE wait_type IN ('PAGEIO_LATCH_SH', 'PAGEIO_LATCH_EX', 'PAGEIO_LATCH_UP',
                    'LCK_M_S', 'LCK_M_X', 'LCK_M_U', 'LCK_M_SCH_S', 'LCK_M_SCH_M',
                    'LCK_M_IS', 'LCK_M_IX', 'LCK_M_UIX', 'BUFFER_IO_LATCH')
ORDER BY wait_duration_ms DESC;
"@

try {
  if ($usingSqlModule) {
    $results4 = Invoke-DbaQuery -SqlInstance $ServerInstance -Database $DatabaseName -Query $query4
  } else {
    $results4 = $smo.Query($query4)
  }
  
  if ($results4) {
    Write-Host "⚠️  SE DETECTARON WAITS DE LOCK ACTIVOS:" -ForegroundColor Yellow
    $results4 | Format-Table -AutoSize
    Export-JsonEnvelope -Path "$OutputDir\phase2-active-locks.json" -QueryName "active-locks" -Rows $results4 -Server $ServerInstance -Database $DatabaseName
  } else {
    Write-Host "✅ No se detectaron waits de lock (normal)" -ForegroundColor Green
  }
} catch {
  Write-Host "❌ Consulta 4 fallo: $_" -ForegroundColor Red
}

# Consulta 5: Deteccion de inflado de cache de planes
Write-Host "`n📊 Consulta 5: Inflado de cache de planes (multiples planes por sentencia)" -ForegroundColor Cyan

$query5 = @"
SELECT TOP 10
  OBJECT_SCHEMA_NAME(qs.object_id, qs.database_id) + '.' + OBJECT_NAME(qs.object_id, qs.database_id) as [Procedure],
  COUNT(DISTINCT qs.plan_handle) as [PlanCount],
  SUM(qs.execution_count) as [TotalExecs],
  SUM(qs.total_elapsed_time) / 1000000.0 as [TotalElapsed_Sec]
FROM sys.dm_exec_query_stats qs
WHERE qs.database_id = DB_ID('$DatabaseName')
  AND OBJECT_NAME(qs.object_id, qs.database_id) IS NOT NULL
GROUP BY qs.object_id, qs.database_id
HAVING COUNT(DISTINCT qs.plan_handle) > 1
ORDER BY COUNT(DISTINCT qs.plan_handle) DESC;
"@

try {
  if ($usingSqlModule) {
    $results5 = Invoke-DbaQuery -SqlInstance $ServerInstance -Database $DatabaseName -Query $query5
  } else {
    $results5 = $smo.Query($query5)
  }
  
  if ($results5) {
    Write-Host "⚠️  SE DETECTO INFLADO DE CACHE DE PLANES:" -ForegroundColor Yellow
    $results5 | Format-Table -AutoSize
    Export-JsonEnvelope -Path "$OutputDir\phase2-plan-cache-bloat.json" -QueryName "plan-cache-bloat" -Rows $results5 -Server $ServerInstance -Database $DatabaseName
  } else {
    Write-Host "✅ No se detecto inflado de cache de planes" -ForegroundColor Green
  }
} catch {
  Write-Host "❌ Consulta 5 fallo: $_" -ForegroundColor Red
}

# Generar informe resumen
Write-Host "`n📋 Generando informe resumen..." -ForegroundColor Cyan

$summary = @"
# 📊 RESUMEN DE VALIDACION DMV - FASE 2
**Fecha:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
**Servidor:** $ServerInstance
**Base de datos:** $DatabaseName

## ✅ Consultas ejecutadas

1. **Top 20 SPs por tiempo total transcurrido (CPU-bound)**
  - Archivo: phase2-top-sps-cpu.json
  - Objetivo: identificar procedimientos intensivos en CPU

2. **Top 20 SPs por numero de ejecuciones (riesgo de contencion)**
  - Archivo: phase2-top-sps-frequency.json
  - Objetivo: identificar procedimientos muy frecuentes (alto riesgo de contencion)

3. **Desglose de estadisticas de espera**
  - Archivo: phase2-wait-stats.json
  - Objetivo: identificar tipos de wait con cuellos de botella (PAGEIO_LATCH, LCK_M, etc)

4. **Waits de lock activos**
  - Archivo: phase2-active-locks.json
  - Objetivo: detectar contencion de locks en tiempo real

5. **Inflado de cache de planes**
  - Archivo: phase2-plan-cache-bloat.json
  - Objetivo: identificar procedimientos con multiples planes de ejecucion (SQL dinamico?)

## 🎯 Guia de interpretacion

### Indicadores de alto riesgo
- **PAGEIO_LATCH esperas > 1000ms:** fragmentacion de indices o indices faltantes
- **LCK_M_X esperas:** contencion de escritura en tablas
- **Multiples planes para el mismo SP:** SQL dinamico o parameter sniffing

### Correlacion con analisis estatico
- Analisis estatico: 2,483 SPs de escritura (37.9%)
- DMV muestra: top de ejecucion por frecuencia = alto riesgo de contencion
- Accion: priorizar top 20 SPs de escritura para auditoria de indices

## 📋 Siguientes pasos
1. Revisar top SPs por CPU y correlacionar con categoria Complex/Critical
2. Revisar top SPs por frecuencia y correlacionar con asignacion de ola
3. Revisar wait stats y contrastar con cuellos esperados
4. Si PAGEIO_LATCH es alto: ejecutar auditoria de fragmentacion de indices
5. Si LCK_M es alto: validar indices faltantes en claves foraneas

---
**Generado:** $(Get-Date)
"@

$summary | Out-File -FilePath "$OutputDir\FASE2-RESUMEN.md" -Force
Write-Host "✅ Informe resumen exportado a FASE2-RESUMEN.md" -ForegroundColor Green

Write-Host "`n✅ Validacion de fase 2 completada" -ForegroundColor Green
Write-Host "📂 Informes disponibles en: $OutputDir" -ForegroundColor Green

$resolvedOutDir = (Resolve-Path $OutputDir).Path
$projectName = $null
if ($resolvedOutDir -match '[\\/]workspaces[\\/](?<project>[^\\/]+)[\\/]') {
  $projectName = $matches['project']
}

if ($projectName) {
  $anonymizeScript = Join-Path $PSScriptRoot 'apply-artifact-anonymization.ps1'
  if (Test-Path $anonymizeScript) {
    $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..' '..')).Path
    & $anonymizeScript -ProjectName $projectName -Scope all -Root $repoRoot
  }
}

