param(
    [Parameter(Mandatory = $true)]
    [string]$SchemaFile,
    [string]$OutDir = "workspaces/ProjectName/plans"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Test-Path $SchemaFile)) {
    throw "No se encontro el archivo de schema: $SchemaFile"
}

if (-not (Test-Path $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
}

$content = Get-Content -Path $SchemaFile -Raw

# Capturar cada bloque de procedimiento desde CREATE PROCEDURE ... hasta el siguiente GO
$procRegex = '(?is)CREATE\s+PROCEDURE\s+\[(?<schema>[^\]]+)\]\.\[(?<name>[^\]]+)\](?<body>.*?)(?:\r?\nGO\b|\z)'
$matches = [regex]::Matches($content, $procRegex)

$results = @()

foreach ($m in $matches) {
    $schema = $m.Groups['schema'].Value
    $name = $m.Groups['name'].Value
    $body = $m.Groups['body'].Value
    $fullName = "$schema.$name"

    $isSelectHeavy = [regex]::IsMatch($body, '(?is)^\s*(?:--.*\r?\n|/\*.*?\*/\s*)*\bAS\b.*\bSELECT\b')
    $hasInsert = [regex]::IsMatch($body, '(?i)\bINSERT\b')
    $hasUpdate = [regex]::IsMatch($body, '(?i)\bUPDATE\b')
    $hasDelete = [regex]::IsMatch($body, '(?i)\bDELETE\b')
    $hasMerge = [regex]::IsMatch($body, '(?i)\bMERGE\b')
    $hasTran = [regex]::IsMatch($body, '(?i)\bBEGIN\s+(TRAN|TRANSACTION)\b|\bCOMMIT\b|\bROLLBACK\b')
    $hasCursor = [regex]::IsMatch($body, '(?i)\bCURSOR\b')
    $hasDynamicSql = [regex]::IsMatch($body, '(?i)\bsp_executesql\b|\bEXEC\s*\(\s*@')
    $hasCrypto = [regex]::IsMatch($body, '(?i)\bOPEN\s+SYMMETRIC\s+KEY\b|\bDECRYPT\w*\b|\bENCRYPT\w*\b')

    $writes = @($hasInsert, $hasUpdate, $hasDelete, $hasMerge) | Where-Object { $_ } | Measure-Object | Select-Object -ExpandProperty Count

    $category = "Simple"
    $wave = "Wave-2"
    $strategy = "CSharp-Service"

    if ($hasCrypto -or $hasTran -or $hasCursor -or $hasDynamicSql) {
        $category = "Critical"
        $wave = "Wave-4"
        $strategy = "Domain-Service+High-Coverage"
    } elseif ($writes -ge 2 -or (($writes -ge 1) -and -not $isSelectHeavy)) {
        $category = "Complex"
        $wave = "Wave-3"
        $strategy = "Domain-Service"
    } elseif ($writes -eq 1) {
        $category = "Simple"
        $wave = "Wave-2"
        $strategy = "Command-Handler"
    } else {
        $category = "CRUD"
        $wave = "Wave-1"
        $strategy = "Dapper-Query"
    }

    # Reglas por esquema segun la estrategia de migracion
    if ($schema -eq "bi") {
        $category = "CRUD"
        $wave = "Wave-1"
        $strategy = "Dapper-Query"
    }

    $results += [PSCustomObject]@{
        Schema = $schema
        Procedure = $name
        FullName = $fullName
        Category = $category
        Wave = $wave
        Strategy = $strategy
        HasWriteOps = ($writes -gt 0)
        HasTransaction = $hasTran
        HasCursor = $hasCursor
        HasDynamicSql = $hasDynamicSql
        HasCrypto = $hasCrypto
    }
}

$jsonPath = Join-Path $OutDir "full-db-sp-classification.json"
$mdPath = Join-Path $OutDir "full-db-sp-classification.md"
$schemaSummaryPath = Join-Path $OutDir "full-db-schema-wave-summary.json"

$results = $results | Sort-Object Schema, Procedure
$classificationPayload = [ordered]@{
    metadata = [ordered]@{
        schemaVersion = "1.0"
        versionEsquema = "1.0"
        generatedAt = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
        generadoEn = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
        sourceSchemaFile = $SchemaFile
        archivoSchemaOrigen = $SchemaFile
        total = $results.Count
        totalElementos = $results.Count
    }
    data = $results
}
$classificationPayload | ConvertTo-Json -Depth 8 | Set-Content -Path $jsonPath -Encoding UTF8

$byCategory = $results | Group-Object Category | Sort-Object Name
$byWave = $results | Group-Object Wave | Sort-Object Name
$bySchema = $results | Group-Object Schema | Sort-Object Name

$schemaWaveRows = @()
foreach ($g in $bySchema) {
    $items = $g.Group
    $schemaWaveRows += [PSCustomObject]@{
        Schema = $g.Name
        Total = $items.Count
        Wave1 = @($items | Where-Object Wave -eq "Wave-1").Count
        Wave2 = @($items | Where-Object Wave -eq "Wave-2").Count
        Wave3 = @($items | Where-Object Wave -eq "Wave-3").Count
        Wave4 = @($items | Where-Object Wave -eq "Wave-4").Count
    }
}
$schemaSummaryPayload = [ordered]@{
    metadata = [ordered]@{
        schemaVersion = "1.0"
        versionEsquema = "1.0"
        generatedAt = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
        generadoEn = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
        sourceClassificationFile = $jsonPath
        archivoClasificacionOrigen = $jsonPath
        totalSchemas = $schemaWaveRows.Count
        totalEsquemas = $schemaWaveRows.Count
    }
    data = $schemaWaveRows
}
$schemaSummaryPayload | ConvertTo-Json -Depth 8 | Set-Content -Path $schemaSummaryPath -Encoding UTF8

$topCritical = $results |
    Where-Object { $_.Wave -eq "Wave-4" } |
    Sort-Object Schema, Procedure |
    Select-Object -First 40

$topWave1 = $results |
    Where-Object { $_.Wave -eq "Wave-1" } |
    Sort-Object Schema, Procedure |
    Select-Object -First 40

$nl = [Environment]::NewLine
$md = "# Clasificacion completa de SPs (Migracion C#)`n`n"
$md += "- Generado: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n"
$md += "- Fuente: $SchemaFile`n"
$md += "- Total de procedimientos: $($results.Count)`n`n"

$md += "## Resumen por categoria`n`n"
$md += "| Categoria | Cantidad |`n|---|---:|`n"
foreach ($c in $byCategory) {
    $md += "| $($c.Name) | $($c.Count) |`n"
}

$md += "`n## Resumen por ola`n`n"
$md += "| Ola | Cantidad | Estrategia |`n|---|---:|---|`n"
foreach ($w in $byWave) {
    $strategy = switch ($w.Name) {
        "Wave-1" { "Consultas Dapper (lectura primero)" }
        "Wave-2" { "Comandos/handlers simples" }
        "Wave-3" { "Extraccion a servicio de dominio" }
        "Wave-4" { "Transaccional/criptografia critica" }
        default { "Por definir" }
    }
    $md += "| $($w.Name) | $($w.Count) | $strategy |`n"
}

$md += "`n## Esquema x ola`n`n"
$md += "| Esquema | Total | Wave-1 | Wave-2 | Wave-3 | Wave-4 |`n|---|---:|---:|---:|---:|---:|`n"
foreach ($s in ($schemaWaveRows | Sort-Object Total -Descending)) {
    $md += "| $($s.Schema) | $($s.Total) | $($s.Wave1) | $($s.Wave2) | $($s.Wave3) | $($s.Wave4) |`n"
}

$md += "`n## Primeros 40 candidatos Wave-1`n`n"
$md += "| NombreCompleto | Estrategia |`n|---|---|`n"
foreach ($p in $topWave1) {
    $md += "| $($p.FullName) | $($p.Strategy) |`n"
}

$md += "`n## Primeros 40 candidatos criticos Wave-4`n`n"
$md += "| NombreCompleto | Tx | Cursor | SQLDinamico | Cripto |`n|---|---|---|---|---|`n"
foreach ($p in $topCritical) {
    $md += "| $($p.FullName) | $($p.HasTransaction) | $($p.HasCursor) | $($p.HasDynamicSql) | $($p.HasCrypto) |`n"
}

$md += "`n## Salidas`n`n"
$md += "- $jsonPath`n"
$md += "- $schemaSummaryPath`n"
$md += "- $mdPath`n"

Set-Content -Path $mdPath -Value $md -Encoding UTF8

Write-Host "Clasificacion completada"
Write-Host "Total de SPs: $($results.Count)"
Write-Host "JSON: $jsonPath"
Write-Host "Resumen por esquema (JSON): $schemaSummaryPath"
Write-Host "MD: $mdPath"

$resolvedOutDir = (Resolve-Path $OutDir).Path
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

