param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectName,
    [string]$SchemaPath,
    [string]$ConnectionString,
    [switch]$Anonymize,
    [string]$Root = (Get-Location).Path
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path $Root).Path
$projectRoot = Join-Path $repoRoot "workspaces" $ProjectName
$sourceRoot = Join-Path $projectRoot "fuente-de-verdad"
$schemaOut = Join-Path $sourceRoot "schema"
$reportsRoot = Join-Path $projectRoot "reports"
$plansRoot = Join-Path $projectRoot "plans"
$logsRoot = Join-Path $projectRoot "logs"

New-Item -ItemType Directory -Force -Path $projectRoot, $sourceRoot, $schemaOut, $reportsRoot, $plansRoot, $logsRoot | Out-Null

$ingestion = @()
$sourceType = "unknown"

if ($SchemaPath) {
    $resolvedSchemaPath = (Resolve-Path $SchemaPath).Path
    $sourceType = "schema-files"
    $schemaFiles = Get-ChildItem -Path $resolvedSchemaPath -Recurse -File -Include *.sql, *.dacpac, *.json, *.xml
    foreach ($file in $schemaFiles) {
        $dest = Join-Path $schemaOut $file.Name
        Copy-Item -Path $file.FullName -Destination $dest -Force
        $ingestion += [PSCustomObject]@{
            file = $file.Name
            origin = $file.FullName
            importedAt = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        }
    }
}

$anonymizationMappingsPath = $null
if ($Anonymize -and (Test-Path $schemaOut)) {
    $anonymizerScript = Join-Path $PSScriptRoot "invoke-sql-anonymization.ps1"
    if (-not (Test-Path $anonymizerScript)) {
        throw "No se encontro invoke-sql-anonymization.ps1"
    }

    $anonymizationMappingsPath = Join-Path $sourceRoot "anonymization-mappings.json"
    Write-Host "Anonimizando source-of-truth SQL..."
    & $anonymizerScript -SchemaRoot $schemaOut -MergedMappingsOut $anonymizationMappingsPath -Root $repoRoot
}

$redactedConnection = $null
if ($ConnectionString) {
    if ($sourceType -eq "unknown") {
        $sourceType = "connection-string"
    }

    $redactedConnection = $ConnectionString
    $redactedConnection = $redactedConnection -replace '(?i)(Data Source\s*=\s*)[^;]+' , '$1<REDACTED_HOST>'
    $redactedConnection = $redactedConnection -replace '(?i)(Server\s*=\s*)[^;]+' , '$1<REDACTED_HOST>'
    $redactedConnection = $redactedConnection -replace '(?i)(Initial Catalog\s*=\s*)[^;]+' , '$1<REDACTED_DATABASE>'
    $redactedConnection = $redactedConnection -replace '(?i)(Database\s*=\s*)[^;]+' , '$1<REDACTED_DATABASE>'
    $redactedConnection = $redactedConnection -replace '(?i)(User ID\s*=\s*)[^;]+' , '$1<REDACTED_USER>'
    $redactedConnection = $redactedConnection -replace '(?i)(UID\s*=\s*)[^;]+' , '$1<REDACTED_USER>'
    $redactedConnection = $redactedConnection -replace '(?i)(Password\s*=\s*)[^;]+' , '$1<REDACTED_PASSWORD>'
    $redactedConnection = $redactedConnection -replace '(?i)(Pwd\s*=\s*)[^;]+' , '$1<REDACTED_PASSWORD>'
}

$manifestPath = Join-Path $sourceRoot "manifest.json"
$manifest = [ordered]@{
    projectName = $ProjectName
    createdAt = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    sourceType = $sourceType
    anonymizationEnabled = [bool]$Anonymize
    anonymizationMode = if ($Anonymize) { "full" } else { "none" }
    anonymizationMappings = $anonymizationMappingsPath
    sourceSchemaPath = $SchemaPath
    redactedConnectionProfile = $redactedConnection
    schemaFileCount = (Get-ChildItem -Path $schemaOut -File -ErrorAction SilentlyContinue | Measure-Object).Count
    folders = [ordered]@{
        sourceOfTruth = $sourceRoot
        reports = $reportsRoot
        plans = $plansRoot
        logs = $logsRoot
    }
    notes = @(
        "Usa esta carpeta como local source of truth for analysis.",
        "No guardes connection strings reales en archivos versionados.",
        "Reingesta esquemas cuando cambie el origen."
    )
}

$manifest | ConvertTo-Json -Depth 8 | Set-Content -Path $manifestPath -Encoding UTF8

$logPath = Join-Path $logsRoot "ingestion-log.json"
$ingestion | ConvertTo-Json -Depth 8 | Set-Content -Path $logPath -Encoding UTF8

$readmePath = Join-Path $projectRoot "README.md"
@"
# Workspace DBA 360 - $ProjectName

Este workspace es la fuente de verdad local para trabajar sin depender de conexion continua a la BBDD origen.
Se crea dentro del repo BoostDBA, bajo workspaces/.

## Estructura
- fuente-de-verdad/: esquemas y manifest
- reports/: analysis outputs
- plans/: roadmap y planes de cambio
- logs/: trazabilidad de ingesta

## Proximo paso
Ejecuta el preflight de seguridad sobre esta fuente:

pwsh -File .\.github\scripts\security-preflight.ps1 -ProjectName "$ProjectName"
"@ | Set-Content -Path $readmePath -Encoding UTF8

Write-Host "Fuente de verdad creada en: $projectRoot"
Write-Host "Manifest: $manifestPath"
