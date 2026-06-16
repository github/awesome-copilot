<#
.SYNOPSIS
  SCRIPT 3/4: Golden-File Regression Test Generator
  ProjectName Query Optimization Framework

.DESCRIPTION
  Para cada SP optimizado:
  1. Ejecuta el SP ORIGINAL y captura output (golden file)
  2. Ejecuta el SP NUEVO y compara resultado
  3. Genera reporte de regresión (pass/fail por columna y fila)
  
  Flujo:
    a. Captura: Genera archivos .json de resultado esperado
    b. Validación: Compara versión nueva vs golden file
    c. Reporte: Diferencias detalladas (schema, rows, values)

.PARAMETER ConnectionString
  SQL Server connection (Integrated Security by default)

.PARAMETER DatabaseName
  Target database (ProjectName)

.PARAMETER SpName
  SP a testear (ej: 'bi.AccionesFormativasPlanFormacion_S')

.PARAMETER Mode
  'capture' → genera golden file
  'validate' → compara contra golden file
  'report'   → muestra diferencias sin fallar (dry run)

.PARAMETER GoldenDir
  Directorio donde guardar/leer golden files
  Default: workspaces/ProjectName/tests/golden

.EXAMPLE
  # PASO 1: Captura resultado antes de optimizar
  .\03-golden-file-regression.ps1 -Mode capture -SpName 'bi.AccionesFormativasPlanFormacion_S'

  # PASO 2: Aplica optimización (índice, rewrite, etc.)

  # PASO 3: Valida que el resultado no cambió
  .\03-golden-file-regression.ps1 -Mode validate -SpName 'bi.AccionesFormativasPlanFormacion_S'
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('capture', 'validate', 'report')]
    [string]$Mode,

    [Parameter(Mandatory=$true)]
    [string]$SpName,

    [Parameter(Mandatory=$false)]
    [string]$ServerInstance = 'localhost',

    [Parameter(Mandatory=$false)]
    [string]$DatabaseName = 'ProjectName',

    [Parameter(Mandatory=$false)]
    [string]$GoldenDir = '.\workspaces\ProjectName\tests\golden',

    [Parameter(Mandatory=$false)]
    [hashtable]$SpParams = @{},

    [Parameter(Mandatory=$false)]
    [int]$MaxRows = 10000,

    [Parameter(Mandatory=$false)]
    [decimal]$NumericTolerance = 0.0001
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ─── Helpers ─────────────────────────────────────────────────
function Write-Step([string]$msg, [string]$color = 'Cyan') {
    Write-Host "`n$msg" -ForegroundColor $color
}

function Get-SafeName([string]$name) {
    return $name -replace '[\\/:*?"<>|.]', '_'
}

function Invoke-SpQuery {
    param([string]$server, [string]$db, [string]$sp, [hashtable]$params)

    $conn = New-Object System.Data.SqlClient.SqlConnection
    $conn.ConnectionString = "Server=$server;Database=$db;Integrated Security=True;Connection Timeout=120;"

    try {
        $conn.Open()
        $cmd = $conn.CreateCommand()
        $cmd.CommandType = [System.Data.CommandType]::StoredProcedure
        $cmd.CommandText = $sp
        $cmd.CommandTimeout = 300

        foreach ($key in $params.Keys) {
            $cmd.Parameters.AddWithValue("@$key", $params[$key]) | Out-Null
        }

        $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
        $ds = New-Object System.Data.DataSet
        $adapter.Fill($ds) | Out-Null
        return $ds
    } finally {
        $conn.Close()
    }
}

function Dataset-ToHashable {
    param([System.Data.DataSet]$ds, [int]$maxRows)

    $tables = @()
    foreach ($dt in $ds.Tables) {
        $cols = $dt.Columns | ForEach-Object { $_.ColumnName }
        $rows = @()
        $count = 0
        foreach ($row in $dt.Rows) {
            if ($count++ -ge $maxRows) {
                Write-Warning "Truncando a $maxRows filas por tabla"
                break
            }
            $r = [ordered]@{}
            foreach ($col in $cols) {
                $val = $row[$col]
                if ($val -is [DBNull]) { $r[$col] = $null }
                elseif ($val -is [DateTime]) { $r[$col] = $val.ToString('O') }
                else { $r[$col] = $val }
            }
            $rows += $r
        }
        $tables += @{
            Columns  = $cols
            RowCount = $rows.Count
            Rows     = $rows
        }
    }
    return $tables
}

function Compare-Tables {
    param($golden, $actual, [decimal]$tolerance)

    $diffs = @()

    # Schema check
    if ($golden.Count -ne $actual.Count) {
        $diffs += "SCHEMA: número de result sets: esperado=$($golden.Count), actual=$($actual.Count)"
        return $diffs
    }

    for ($t = 0; $t -lt $golden.Count; $t++) {
        $gt = $golden[$t]
        $at = $actual[$t]

        # Column schema check
        $missingCols = $gt.Columns | Where-Object { $_ -notin $at.Columns }
        $extraCols   = $at.Columns | Where-Object { $_ -notin $gt.Columns }
        if ($missingCols) { $diffs += "RS[$t] Columnas faltantes: $($missingCols -join ', ')" }
        if ($extraCols)   { $diffs += "RS[$t] Columnas extra: $($extraCols -join ', ')" }

        # Row count
        if ($gt.RowCount -ne $at.RowCount) {
            $diffs += "RS[$t] Filas: esperado=$($gt.RowCount), actual=$($at.RowCount)"
        }

        # Row-by-row value comparison (up to 200 rows for detail)
        $limit = [Math]::Min($gt.RowCount, [Math]::Min($at.RowCount, 200))
        for ($r = 0; $r -lt $limit; $r++) {
            $gr = $gt.Rows[$r]
            $ar = $at.Rows[$r]
            foreach ($col in $gt.Columns) {
                if ($col -notin $at.Columns) { continue }
                $gVal = $gr[$col]
                $aVal = $ar[$col]

                if ($null -eq $gVal -and $null -eq $aVal) { continue }
                if ($null -eq $gVal -xor $null -eq $aVal) {
                    $diffs += "RS[$t] Fila[$r][$col]: NULL vs no-NULL"
                    continue
                }

                # Numeric tolerance
                if ($gVal -is [decimal] -or $gVal -is [double] -or $gVal -is [float]) {
                    if ([Math]::Abs($gVal - $aVal) -gt $tolerance) {
                        $diffs += "RS[$t] Fila[$r][$col]: $gVal ≠ $aVal (diff=$([Math]::Abs($gVal-$aVal)))"
                    }
                } elseif ($gVal -ne $aVal) {
                    $diffs += "RS[$t] Fila[$r][$col]: '$gVal' ≠ '$aVal'"
                }
            }
        }
    }

    return $diffs
}

# ─── Main ────────────────────────────────────────────────────
$safeName   = Get-SafeName $SpName
$goldenFile = Join-Path $GoldenDir "$safeName.golden.json"
$metaFile   = Join-Path $GoldenDir "$safeName.meta.json"

if (-not (Test-Path $GoldenDir)) {
    New-Item -ItemType Directory -Path $GoldenDir -Force | Out-Null
}

Write-Step "🧪 REGRESSION TEST: $SpName" 'Cyan'
Write-Step "   Mode: $Mode | Server: $ServerInstance | DB: $DatabaseName"

switch ($Mode) {

    # ── CAPTURE ──────────────────────────────────────
    'capture' {
        Write-Step "📸 Capturando golden file..." 'Yellow'

        $before = Measure-Command {
            $ds = Invoke-SpQuery -server $ServerInstance -db $DatabaseName -sp $SpName -params $SpParams
        }

        $tables = Dataset-ToHashable -ds $ds -maxRows $MaxRows

        $meta = @{
            SpName      = $SpName
            CapturedAt  = (Get-Date -Format 'O')
            Server      = $ServerInstance
            Database    = $DatabaseName
            ElapsedMs   = $before.TotalMilliseconds
            Params      = $SpParams
            ResultSets  = $tables.Count
            TotalRows   = ($tables | Measure-Object -Property RowCount -Sum).Sum
        }

        $tables | ConvertTo-Json -Depth 10 | Out-File $goldenFile -Encoding UTF8 -Force
        $meta   | ConvertTo-Json -Depth 5  | Out-File $metaFile   -Encoding UTF8 -Force

        Write-Host "✅ Golden file guardado:" -ForegroundColor Green
        Write-Host "   $goldenFile"
        Write-Host "   ResultSets: $($tables.Count) | Rows: $($meta.TotalRows) | Time: $([Math]::Round($before.TotalMilliseconds,0))ms"
    }

    # ── VALIDATE ─────────────────────────────────────
    'validate' {
        if (-not (Test-Path $goldenFile)) {
            Write-Host "❌ Golden file no encontrado. Ejecuta primero con -Mode capture." -ForegroundColor Red
            exit 2
        }

        $golden = Get-Content $goldenFile -Raw | ConvertFrom-Json -AsHashtable
        $meta   = Get-Content $metaFile   -Raw | ConvertFrom-Json

        Write-Step "📋 Golden baseline: $($meta.CapturedAt) | Rows: $($meta.TotalRows)" 'Gray'
        Write-Step "⚡ Ejecutando SP actual..." 'Yellow'

        $after = Measure-Command {
            $ds = Invoke-SpQuery -server $ServerInstance -db $DatabaseName -sp $SpName -params $SpParams
        }

        $actual = Dataset-ToHashable -ds $ds -maxRows $MaxRows
        $diffs  = Compare-Tables -golden $golden -actual $actual -tolerance $NumericTolerance

        $perfDelta = [Math]::Round($after.TotalMilliseconds - $meta.ElapsedMs, 0)
        $perfPct   = if ($meta.ElapsedMs -gt 0) {
                         [Math]::Round(($after.TotalMilliseconds - $meta.ElapsedMs) / $meta.ElapsedMs * 100, 1)
                     } else { 0 }

        Write-Host "`n📊 RENDIMIENTO:" -ForegroundColor Cyan
        Write-Host "   Antes: $([Math]::Round($meta.ElapsedMs,0))ms"
        Write-Host "   Después: $([Math]::Round($after.TotalMilliseconds,0))ms"

        if ($perfDelta -lt 0) {
            Write-Host "   Mejora: $([Math]::Abs($perfDelta))ms ($([Math]::Abs($perfPct))% más rápido)" -ForegroundColor Green
        } else {
            Write-Host "   Regresión: +${perfDelta}ms (+${perfPct}%)" -ForegroundColor Yellow
        }

        if ($diffs.Count -eq 0) {
            Write-Host "`n✅ VALIDACIÓN EXITOSA: Resultados idénticos al golden file." -ForegroundColor Green
            exit 0
        } else {
            Write-Host "`n❌ REGRESIÓN DETECTADA: $($diffs.Count) diferencias:" -ForegroundColor Red
            $diffs | Select-Object -First 30 | ForEach-Object { Write-Host "   • $_" -ForegroundColor Red }
            if ($diffs.Count -gt 30) {
                Write-Host "   ... y $($diffs.Count - 30) diferencias más." -ForegroundColor Red
            }
            exit 1
        }
    }

    # ── REPORT ───────────────────────────────────────
    'report' {
        if (-not (Test-Path $goldenFile)) {
            Write-Host "⚠️  Sin golden file. Ejecuta primero con -Mode capture." -ForegroundColor Yellow
            exit 0
        }

        $meta = Get-Content $metaFile -Raw | ConvertFrom-Json
        Write-Host "📋 Golden: $($meta.CapturedAt)"
        Write-Host "   ResultSets: $($meta.ResultSets) | Rows: $($meta.TotalRows) | Time: $($meta.ElapsedMs)ms"
        Write-Host "   Golden file: $goldenFile"
    }
}

