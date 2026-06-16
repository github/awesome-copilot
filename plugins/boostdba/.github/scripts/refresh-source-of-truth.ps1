<#
.SYNOPSIS
    Actualiza la fuente de verdad de un workspace existente de BoostDBA.

.DESCRIPTION
    Reingesta un nuevo schema SQL en un workspace ya creado por bootstrap-source-of-truth.ps1.
    Preserves the ingestion history en ingestion-log.json y genera un diff de objetos
    comparando el manifest anterior con el nuevo.

    No borra reportes ni planes existentes. Solo actualiza fuente-de-verdad/.

.PARAMETER ProjectName
    Nombre del proyecto (debe coincidir con el workspace existente en workspaces/<ProjectName>).

.PARAMETER SchemaPath
    Carpeta o archivo .sql con el nuevo schema. Si se omite, solo regenera el manifest.

.PARAMETER Root
    Raiz del repositorio BoostDBA. Por defecto el directorio actual.

.EXAMPLE
    # Actualizar schema de ProjectName con un nuevo dump
    pwsh -File .github\scripts\refresh-source-of-truth.ps1 -ProjectName ProjectName -SchemaPath C:\nuevo-schema

    # Solo regenerar manifest (sin cambio de schema)
    pwsh -File .github\scripts\refresh-source-of-truth.ps1 -ProjectName ProjectName
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectName,
    [string]$SchemaPath,
    [switch]$Anonymize,
    [string]$Root = (Get-Location).Path
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot    = (Resolve-Path $Root).Path
$projectRoot = Join-Path $repoRoot "workspaces" $ProjectName
$sourceRoot  = Join-Path $projectRoot "fuente-de-verdad"
$schemaOut   = Join-Path $sourceRoot "schema"
$logsRoot    = Join-Path $projectRoot "logs"
$manifestPath = Join-Path $sourceRoot "manifest.json"
$logPath      = Join-Path $logsRoot "ingestion-log.json"

# --- Validaciones previas -------------------------------------------------------

if (-not (Test-Path $projectRoot)) {
    throw "El workspace '$ProjectName' no existe en workspaces/. Ejecuta primero bootstrap-source-of-truth.ps1."
}

if (-not (Test-Path $manifestPath)) {
    throw "No se encontro manifest.json en $sourceRoot. El workspace puede estar corrupto."
}

# --- Leer manifest anterior para calcular diff ----------------------------------

$previousManifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$previousObjects = @{
    tables    = if ($previousManifest.objects.tables)    { $previousManifest.objects.tables }    else { 0 }
    procs     = if ($previousManifest.objects.procs)     { $previousManifest.objects.procs }     else { 0 }
    functions = if ($previousManifest.objects.functions) { $previousManifest.objects.functions } else { 0 }
    indexes   = if ($previousManifest.objects.indexes)   { $previousManifest.objects.indexes }   else { 0 }
}

Write-Host ""
Write-Host "=== Refresh: $ProjectName ===" -ForegroundColor Cyan
Write-Host "  Workspace   : $projectRoot"
Write-Host "  Ultima ingesta: $($previousManifest.createdAt)"
if ($previousManifest.updatedAt) {
    Write-Host "  Ultima actualizacion: $($previousManifest.updatedAt)"
}
Write-Host ""

# --- Reingestar schema si se provee un nuevo path --------------------------------

$ingestionEntry = [ordered]@{
    timestamp  = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    action     = "refresh"
    schemaPath = $SchemaPath
    files      = @()
}

if ($SchemaPath) {
    $resolvedPath = (Resolve-Path $SchemaPath).Path
    Write-Host "[1/3] Reingiriendo schema desde: $resolvedPath" -ForegroundColor Yellow

    # Limpiar schema anterior
    Get-ChildItem -Path $schemaOut -File | Remove-Item -Force

    $schemaFiles = Get-ChildItem -Path $resolvedPath -Recurse -File -Include *.sql, *.dacpac, *.json, *.xml
    foreach ($file in $schemaFiles) {
        $dest = Join-Path $schemaOut $file.Name
        Copy-Item -Path $file.FullName -Destination $dest -Force
        $ingestionEntry.files += $file.Name
        Write-Host "  Copiado: $($file.Name) ($([math]::Round($file.Length / 1KB, 1)) KB)"
    }
    Write-Host "  $($ingestionEntry.files.Count) archivo(s) reingresado(s)." -ForegroundColor Green
} else {
    Write-Host "[1/3] Sin nuevo schema. Regenerando manifest con schema existente." -ForegroundColor Yellow
    $ingestionEntry.action = "manifest-refresh"
}

$effectiveAnonymize = $Anonymize
if (-not $effectiveAnonymize -and $previousManifest.PSObject.Properties['anonymizationEnabled']) {
    $effectiveAnonymize = [bool]$previousManifest.anonymizationEnabled
}

if ($effectiveAnonymize -and (Test-Path $schemaOut)) {
    $anonymizerScript = Join-Path $PSScriptRoot "invoke-sql-anonymization.ps1"
    if (-not (Test-Path $anonymizerScript)) {
        throw "No se encontro invoke-sql-anonymization.ps1"
    }

    Write-Host "  Reaplicando anonimización SQL..." -ForegroundColor Yellow
    & $anonymizerScript -SchemaRoot $schemaOut -MergedMappingsOut (Join-Path $sourceRoot "anonymization-mappings.json") -Root $repoRoot
}

# --- Recalcular inventario del schema -------------------------------------------

Write-Host "[2/3] Recalculando inventario..." -ForegroundColor Yellow

$allSql = Get-ChildItem -Path $schemaOut -Filter *.sql -Recurse -File |
          Get-Content -Raw -ErrorAction SilentlyContinue

$newObjects = [ordered]@{
    tables    = ([regex]::Matches($allSql, '(?i)CREATE\s+TABLE\b')).Count
    procs     = ([regex]::Matches($allSql, '(?i)CREATE\s+(PROCEDURE|PROC)\b')).Count
    functions = ([regex]::Matches($allSql, '(?i)CREATE\s+FUNCTION\b')).Count
    indexes   = ([regex]::Matches($allSql, '(?i)CREATE\s+(?:UNIQUE\s+)?(?:CLUSTERED\s+|NONCLUSTERED\s+)?INDEX\b')).Count
    fks       = ([regex]::Matches($allSql, '(?i)FOREIGN\s+KEY\b')).Count
    schemas   = ([regex]::Matches($allSql, '(?i)CREATE\s+SCHEMA\b')).Count
}

# --- Calcular diff con manifest anterior ----------------------------------------

$diff = [ordered]@{
    tables    = $newObjects.tables    - $previousObjects.tables
    procs     = $newObjects.procs     - $previousObjects.procs
    functions = $newObjects.functions - $previousObjects.functions
    indexes   = $newObjects.indexes   - $previousObjects.indexes
}

Write-Host ""
Write-Host "  DIFERENCIAS VS INGESTA ANTERIOR:" -ForegroundColor Cyan
foreach ($key in $diff.Keys) {
    $val = $diff[$key]
    $sign = if ($val -gt 0) { "+" } else { "" }
    $color = if ($val -gt 0) { "Green" } elseif ($val -lt 0) { "Red" } else { "Gray" }
    Write-Host ("  {0,-12}: {1,6}  (antes: {2}, ahora: {3})" -f $key, "$sign$val", $previousObjects[$key], $newObjects[$key]) -ForegroundColor $color
}
Write-Host ""

# --- Actualizar manifest ---------------------------------------------------------

$updatedManifest = [ordered]@{
    projectName    = $previousManifest.projectName
    createdAt      = $previousManifest.createdAt
    updatedAt      = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    refreshCount   = if ($previousManifest.refreshCount) { [int]$previousManifest.refreshCount + 1 } else { 1 }
    sourceType     = if ($SchemaPath) { "schema-files" } else { $previousManifest.sourceType }
    anonymizationEnabled = [bool]$effectiveAnonymize
    anonymizationMode = if ($effectiveAnonymize) { "full" } else { "none" }
    anonymizationMappings = if ($effectiveAnonymize) { (Join-Path $sourceRoot "anonymization-mappings.json") } else { $null }
    sourceSchemaPath = if ($SchemaPath) { $SchemaPath } else { $previousManifest.sourceSchemaPath }
    schemaFileCount  = (Get-ChildItem -Path $schemaOut -File -ErrorAction SilentlyContinue | Measure-Object).Count
    objects          = $newObjects
    diff_vs_previous = $diff
    folders          = $previousManifest.folders
    notes            = $previousManifest.notes
}

$updatedManifest | ConvertTo-Json -Depth 8 | Set-Content -Path $manifestPath -Encoding UTF8
Write-Host "  manifest.json actualizado." -ForegroundColor Green

# --- Append a ingestion-log.json -------------------------------------------------

$history = @()
if (Test-Path $logPath) {
    $history = Get-Content $logPath -Raw | ConvertFrom-Json
    if ($history -isnot [System.Array]) { $history = @($history) }
}
$ingestionEntry.objectCounts = $newObjects
$ingestionEntry.diff          = $diff
$history += $ingestionEntry
$history | ConvertTo-Json -Depth 8 | Set-Content -Path $logPath -Encoding UTF8

# --- Preflight de seguridad sobre el nuevo schema --------------------------------

$preflightScript = Join-Path $PSScriptRoot "security-preflight.ps1"
if (Test-Path $preflightScript) {
    Write-Host "[3/3] Ejecutando preflight de seguridad..." -ForegroundColor Yellow
    & $preflightScript -ProjectName $ProjectName
} else {
    Write-Host "[3/3] security-preflight.ps1 no encontrado, omitiendo." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "Refresh completado. Workspace: $projectRoot" -ForegroundColor Green
Write-Host "Proximos pasos:" -ForegroundColor Cyan
Write-Host "  1. Revisa el diff de objetos arriba"
Write-Host "  2. Actualiza los reportes afectados en reports/"
Write-Host "  3. Si hay cambios en tablas criticas, ejecuta el Change Impact Assessor"

