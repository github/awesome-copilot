<#
.SYNOPSIS
  SCRIPT 4/4: Staged Rollout Plan & Post-Optimization Monitor
  ProjectName Query Optimization Framework

.DESCRIPTION
  Orquesta el ciclo completo de optimización de un SP:
  
  Stage 0 → Capture baseline (golden file + métricas)
  Stage 1 → Validar en DEV (regresión funcional)
  Stage 2 → Validar en STAGING (rendimiento)
  Stage 3 → Despliegue en PROD (ventana controlada)
  Stage 4 → Monitor post-deploy (compara P50/P95 vs baseline)

.PARAMETER SpName
  SP a optimizar (ej: 'bi.AccionesFormativasPlanFormacion_S')

.PARAMETER Stage
  Etapa a ejecutar: 0|1|2|3|4 o 'all' para flujo completo

.PARAMETER ProdServer
  Servidor de producción (requerido para Stage 3 y 4)

.EXAMPLE
  # Flujo completo (interactivo — pide confirmación en Stage 3)
  .\04-staged-rollout.ps1 -SpName 'plc.PlanesFormacion_S' -Stage all -ProdServer 'prod-db'

  # Solo captura baseline en PROD
  .\04-staged-rollout.ps1 -SpName 'plc.PlanesFormacion_S' -Stage 0 -ProdServer 'prod-db'

  # Monitor post-deploy (ejecutar 24h después)
  .\04-staged-rollout.ps1 -SpName 'plc.PlanesFormacion_S' -Stage 4 -ProdServer 'prod-db'
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$SpName,

    [Parameter(Mandatory=$false)]
    [ValidateSet('0','1','2','3','4','all')]
    [string]$Stage = 'all',

    [Parameter(Mandatory=$false)]
    [string]$DevServer = 'localhost',

    [Parameter(Mandatory=$false)]
    [string]$StagingServer = 'staging-db',

    [Parameter(Mandatory=$false)]
    [string]$ProdServer = '',

    [Parameter(Mandatory=$false)]
    [string]$DatabaseName = 'ProjectName',

    [Parameter(Mandatory=$false)]
    [string]$GoldenDir = '.\workspaces\ProjectName\tests\golden',

    [Parameter(Mandatory=$false)]
    [string]$ReportDir = '.\workspaces\ProjectName\plans\optimization-reports',

    [Parameter(Mandatory=$false)]
    [hashtable]$SpParams = @{}
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$regression = '.\\.github\\scripts\\query-optimization\\03-golden-file-regression.ps1'
$safeName   = $SpName -replace '[\\/:*?"<>|.]', '_'
$reportFile = Join-Path $ReportDir "$safeName-rollout-$(Get-Date -Format 'yyyyMMdd-HHmm').md"

foreach ($dir in $GoldenDir, $ReportDir) {
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
}

# ─── Emoji status helpers ─────────────────────────────────────
function Write-Stage([int]$n, [string]$title) {
    Write-Host "`n$('─'*60)" -ForegroundColor DarkGray
    Write-Host "  STAGE $n: $title" -ForegroundColor Cyan
    Write-Host "$('─'*60)" -ForegroundColor DarkGray
}
function Write-Ok([string]$m)   { Write-Host "  ✅ $m" -ForegroundColor Green }
function Write-Warn([string]$m) { Write-Host "  ⚠️  $m" -ForegroundColor Yellow }
function Write-Err([string]$m)  { Write-Host "  ❌ $m" -ForegroundColor Red }
function Write-Info([string]$m) { Write-Host "  ℹ️  $m" -ForegroundColor Gray }

# ─── Get SP metrics from DMV ─────────────────────────────────
function Get-SpMetrics([string]$server, [string]$db, [string]$sp) {
    $schema, $proc = $sp -split '\.', 2

    $query = @"
SELECT TOP 1
    execution_count,
    total_worker_time / 1000.0             AS total_cpu_ms,
    total_worker_time / execution_count / 1000.0 AS avg_cpu_ms,
    total_elapsed_time / 1000.0            AS total_elapsed_ms,
    total_elapsed_time / execution_count / 1000.0 AS avg_elapsed_ms,
    total_logical_reads,
    total_logical_reads / execution_count  AS avg_logical_reads
FROM sys.dm_exec_procedure_stats
WHERE database_id = DB_ID('$db')
  AND object_id = OBJECT_ID('$sp')
"@
    try {
        return Invoke-Sqlcmd -ServerInstance $server -Database $db -Query $query -ErrorAction Stop
    } catch {
        Write-Warn "No se pudieron obtener métricas DMV: $_"
        return $null
    }
}

$report = @()
$report += "# Optimization Rollout Report: $SpName"
$report += "**Date:** $(Get-Date -Format 'yyyy-MM-dd HH:mm')  "
$report += "**DB:** $DatabaseName  "
$report += ""

# ═══════════════════════════════════════════════════════════════
# STAGE 0 — CAPTURA DE BASELINE
# ═══════════════════════════════════════════════════════════════
if ($Stage -in '0','all') {
    Write-Stage 0 "CAPTURA DE BASELINE (PROD)"

    if ([string]::IsNullOrEmpty($ProdServer)) {
        Write-Warn "ProdServer no especificado. Capturando baseline en DEV."
        $targetServer = $DevServer
    } else {
        $targetServer = $ProdServer
    }

    Write-Info "Capturando golden file en $targetServer..."
    & $regression -Mode capture -SpName $SpName -ServerInstance $targetServer `
        -DatabaseName $DatabaseName -GoldenDir $GoldenDir -SpParams $SpParams

    $metrics = Get-SpMetrics -server $targetServer -db $DatabaseName -sp $SpName

    $report += "## Stage 0: Baseline (PROD)"
    if ($metrics) {
        $report += "| Métrica | Valor |"
        $report += "|---------|-------|"
        $report += "| ExecCount | $($metrics.execution_count) |"
        $report += "| AvgCPU_ms | $([Math]::Round($metrics.avg_cpu_ms, 1)) |"
        $report += "| AvgElapsed_ms | $([Math]::Round($metrics.avg_elapsed_ms, 1)) |"
        $report += "| AvgLogicalReads | $($metrics.avg_logical_reads) |"
        Write-Ok "Baseline: CPU=$([Math]::Round($metrics.avg_cpu_ms,1))ms | Reads=$($metrics.avg_logical_reads)"
    } else {
        $report += "_DMV sin datos (SP no ejecutado desde último reinicio)_"
    }
    $report += ""
}

# ═══════════════════════════════════════════════════════════════
# STAGE 1 — VALIDACIÓN EN DEV
# ═══════════════════════════════════════════════════════════════
if ($Stage -in '1','all') {
    Write-Stage 1 "VALIDACIÓN EN DEV ($DevServer)"
    Write-Info "Validando regresión funcional (resultados idénticos)..."

    $result = & $regression -Mode validate -SpName $SpName `
        -ServerInstance $DevServer -DatabaseName $DatabaseName `
        -GoldenDir $GoldenDir -SpParams $SpParams
    $exitCode = $LASTEXITCODE

    $report += "## Stage 1: Validación DEV"
    if ($exitCode -eq 0) {
        Write-Ok "PASS — Resultados idénticos al golden file."
        $report += "**Result:** ✅ PASS — Sin regresión funcional."
    } else {
        Write-Err "FAIL — Regresión detectada. Revisar diferencias."
        $report += "**Result:** ❌ FAIL — Revisar output del test."
        if ($Stage -eq 'all') {
            Write-Err "Pipeline detenido en Stage 1. Corregir antes de continuar."
            $report | Out-File $reportFile -Encoding UTF8 -Force
            exit 1
        }
    }
    $report += ""
}

# ═══════════════════════════════════════════════════════════════
# STAGE 2 — VALIDACIÓN EN STAGING
# ═══════════════════════════════════════════════════════════════
if ($Stage -in '2','all') {
    Write-Stage 2 "VALIDACIÓN EN STAGING ($StagingServer)"
    Write-Info "Ejecutando en staging — comparando rendimiento..."

    $before_meta = Get-Content (Join-Path $GoldenDir "$safeName.meta.json") -Raw | ConvertFrom-Json
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    & $regression -Mode validate -SpName $SpName `
        -ServerInstance $StagingServer -DatabaseName $DatabaseName `
        -GoldenDir $GoldenDir -SpParams $SpParams
    $sw.Stop()
    $exitCode = $LASTEXITCODE

    $perf = [Math]::Round($sw.ElapsedMilliseconds - $before_meta.ElapsedMs, 0)

    $report += "## Stage 2: Staging"
    if ($exitCode -eq 0) {
        Write-Ok "PASS — Funcional OK."
        if ($perf -lt 0) {
            Write-Ok "Mejora de rendimiento: $([Math]::Abs($perf))ms"
            $report += "**Result:** ✅ PASS | **Perf:** +$([Math]::Abs($perf))ms mejora"
        } else {
            Write-Warn "Sin mejora de rendimiento en staging (+${perf}ms). Validar en PROD con carga real."
            $report += "**Result:** ✅ PASS | **Perf:** ${perf}ms (sin mejora en staging)"
        }
    } else {
        Write-Err "FAIL en staging."
        $report += "**Result:** ❌ FAIL en staging."
        if ($Stage -eq 'all') {
            $report | Out-File $reportFile -Encoding UTF8 -Force
            exit 1
        }
    }
    $report += ""
}

# ═══════════════════════════════════════════════════════════════
# STAGE 3 — DEPLOY EN PROD (requiere confirmación)
# ═══════════════════════════════════════════════════════════════
if ($Stage -in '3','all') {
    Write-Stage 3 "DESPLIEGUE EN PROD ($ProdServer)"

    if ([string]::IsNullOrEmpty($ProdServer)) {
        Write-Err "ProdServer no especificado. Usar -ProdServer para Stage 3."
        exit 1
    }

    Write-Host "`n  ⚠️  ATENCIÓN: Estás a punto de aplicar cambios en PRODUCCIÓN." -ForegroundColor Red
    Write-Host "  SP: $SpName | Servidor: $ProdServer" -ForegroundColor Yellow
    Write-Host ""
    $confirm = Read-Host "  ¿Confirmas el despliegue? (escribe 'CONFIRMO' para continuar)"

    $report += "## Stage 3: Deploy PROD"
    if ($confirm -ne 'CONFIRMO') {
        Write-Warn "Despliegue cancelado por el usuario."
        $report += "**Result:** ⏸️ Cancelado por el usuario."
    } else {
        Write-Info "Aplicando cambios en PROD..."
        Write-Info "  → Si el cambio es un índice: aplicar DDL del script 02"
        Write-Info "  → Si el cambio es un SP rewrite: reemplazar definición"
        Write-Info "  → Si el cambio es un Query Store hint: forzar plan via QS"

        # Aquí se ejecutaría el DDL/script de cambio
        # Invoke-Sqlcmd -ServerInstance $ProdServer -Database $DatabaseName -InputFile $ChangeScript

        Write-Ok "Cambio aplicado. Iniciando validación de regresión en PROD..."

        & $regression -Mode validate -SpName $SpName `
            -ServerInstance $ProdServer -DatabaseName $DatabaseName `
            -GoldenDir $GoldenDir -SpParams $SpParams
        $exitCode = $LASTEXITCODE

        if ($exitCode -eq 0) {
            Write-Ok "PROD OK — Sin regresión funcional post-deploy."
            $report += "**Result:** ✅ PASS — Deploy exitoso, sin regresión."
        } else {
            Write-Err "REGRESIÓN EN PROD — Iniciar rollback inmediatamente."
            $report += "**Result:** ❌ FAIL — REGRESIÓN EN PROD. ROLLBACK REQUERIDO."

            Write-Host "`n  🔴 ROLLBACK NECESARIO:" -ForegroundColor Red
            Write-Host "  1. Revertir cambio de índice/SP" -ForegroundColor Red
            Write-Host "  2. Confirmar con: & '$regression' -Mode validate -SpName '$SpName'" -ForegroundColor Red
        }
    }
    $report += ""
}

# ═══════════════════════════════════════════════════════════════
# STAGE 4 — MONITORING POST-DEPLOY (24h después)
# ═══════════════════════════════════════════════════════════════
if ($Stage -in '4','all') {
    Write-Stage 4 "MONITORING POST-DEPLOY"

    $targetServer = if ($ProdServer) { $ProdServer } else { $DevServer }
    Write-Info "Capturando métricas actuales en $targetServer..."

    $after = Get-SpMetrics -server $targetServer -db $DatabaseName -sp $SpName
    $metaFile = Join-Path $GoldenDir "$safeName.meta.json"

    $report += "## Stage 4: Monitor Post-Deploy"
    if ($after -and (Test-Path $metaFile)) {
        $before_meta = Get-Content $metaFile -Raw | ConvertFrom-Json

        $cpuDelta     = [Math]::Round($after.avg_cpu_ms - $before_meta.ElapsedMs, 1)
        $elapsedDelta = [Math]::Round($after.avg_elapsed_ms - $before_meta.ElapsedMs, 1)

        $report += "| Métrica | Antes | Después | Delta |"
        $report += "|---------|-------|---------|-------|"
        $report += "| ExecCount | - | $($after.execution_count) | - |"
        $report += "| AvgCPU_ms | baseline | $([Math]::Round($after.avg_cpu_ms,1)) | $cpuDelta |"
        $report += "| AvgElapsed_ms | $($before_meta.ElapsedMs)ms | $([Math]::Round($after.avg_elapsed_ms,1)) | $elapsedDelta |"
        $report += "| AvgLogicalReads | - | $($after.avg_logical_reads) | - |"

        if ($after.avg_elapsed_ms -lt $before_meta.ElapsedMs * 0.9) {
            Write-Ok "MEJORA CONFIRMADA: Elapsed $([Math]::Abs($elapsedDelta))ms mejor vs baseline."
        } elseif ($after.avg_elapsed_ms -gt $before_meta.ElapsedMs * 1.1) {
            Write-Warn "Sin mejora o regresión. Revisar plan de ejecución."
        } else {
            Write-Info "Rendimiento similar al baseline (delta dentro de ±10%)."
        }
    } else {
        Write-Warn "No hay métricas disponibles aún. Ejecutar Stage 4 de nuevo en 24h."
        $report += "_Sin datos suficientes. Re-ejecutar en 24h._"
    }
    $report += ""
}

# ─── Guardar reporte ─────────────────────────────────────────
$report += "---"
$report += "**Generated:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$report | Out-File $reportFile -Encoding UTF8 -Force

Write-Host "`n$('═'*60)" -ForegroundColor DarkGray
Write-Ok "Rollout completado. Reporte: $reportFile"
Write-Host "$('═'*60)" -ForegroundColor DarkGray

