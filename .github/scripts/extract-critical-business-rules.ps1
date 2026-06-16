param(
    [string]$ProjectName,
    [string]$Category = "Critical",
    [int]$LinesPerSP = 350,
    [string]$OutputDir
)

$ErrorActionPreference = 'Stop'

# ──────────────────────────────────────────────
# 1. AUTODESCUBRIMIENTO DE PROYECTO
# ──────────────────────────────────────────────
if (-not $ProjectName) {
    $projects = Get-ChildItem -Path "workspaces" -Directory -ErrorAction SilentlyContinue
    if ($projects.Count -eq 0) { throw "No se encontró ningún proyecto en workspaces/" }
    if ($projects.Count -eq 1) {
        $ProjectName = $projects[0].Name
        Write-Host "Proyecto detectado: $ProjectName"
    } else {
        Write-Host "Proyectos disponibles:"
        $projects | ForEach-Object { Write-Host "  - $($_.Name)" }
        throw "Especifica -ProjectName"
    }
}

$workspaceRoot = "workspaces/$ProjectName"
$schemaPath    = "$workspaceRoot/fuente-de-verdad/schema/db.sql"
$classificationPath = "$workspaceRoot/plans/full-db-sp-classification.json"

if (-not (Test-Path $schemaPath)) { throw "Schema no encontrado: $schemaPath" }
if (-not (Test-Path $classificationPath)) { throw "Clasificación JSON no encontrada: $classificationPath" }

if (-not $OutputDir) { $OutputDir = "$workspaceRoot/reports/business-rules" }
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

# ──────────────────────────────────────────────
# 2. CARGAR LISTA DE SPs A ANALIZAR
# ──────────────────────────────────────────────
$classification = Get-Content $classificationPath -Raw | ConvertFrom-Json
$classificationData = @()
if ($classification -is [System.Array]) {
    $classificationData = $classification
} elseif ($null -ne $classification.data) {
    $classificationData = @($classification.data)
} else {
    $classificationData = @($classification)
}
$targetSPs = $classificationData | Where-Object { $_.Category -eq $Category }
Write-Host "SPs $Category a analizar: $($targetSPs.Count)"

# ──────────────────────────────────────────────
# 3. PATRONES QUE DELATAN REGLAS DE NEGOCIO
# ──────────────────────────────────────────────
$rulePatterns = [ordered]@{
    EstadoMaquina      = 'ID_ESTADO[A-Z_]*\s*=\s*\d+|CASE\s+WHEN\s+.*ID_ESTADO'
    CifradoGDPR        = 'DecryptByKey|EncryptByKey|OPEN\s+SYMMETRIC\s+KEY|UP_V_ABRIR_LLAVE'
    ExcesosRegulatoros = 'ID_TIPOEXCESO\s*=\s*\d+|B_EXCESO\s*=\s*1'
    ConfiguracionDyn   = 'ID_DICCIONARIO_CONFIG\s*=\s*\d+|T_CONVOCATORIA_CONFIG'
    CodigosAnulacion   = "IN\s*\('[\w]+"
    PropagacionJerarc  = 'WHILE\s+@\w+\s*>\s*0|hierarchyid|D_PADRE'
    CursorAntiPattern  = 'DECLARE\s+\w+\s+CURSOR|FETCH\s+NEXT'
    SQLDinamicoOpaco   = "EXEC\s*\(@|sp_executesql"
    TransaccionLarga   = 'BEGIN\s+TRAN(?!SACTION)|BEGIN\s+TRANSACTION'
    RegionHardcoded    = 'ID_CCAA\s+IN\s*\('
    MagicNumbers       = '\b(65535|498|247|100|60|30|10|50)\b'
    XMLProcessing      = '\.nodes\(|\.value\s*\(|FOR\s+XML|@xml\s+XML'
    MergeUpsert        = 'MERGE\s+\w+\s+AS\s+tg|WHEN\s+NOT\s+MATCHED\s+THEN'
    TablasTmp          = 'DECLARE\s+@\w+\s+TABLE|#\w+\s+TABLE|INTO\s+#\w+'
}

# ──────────────────────────────────────────────
# 4. EXTRAER CUERPO DE CADA SP DESDE EL SCHEMA
# ──────────────────────────────────────────────
Write-Host "Leyendo schema y construyendo índice de posiciones..."
$schemaLines = [System.IO.File]::ReadAllLines((Resolve-Path $schemaPath).Path)

# Construir índice: nombre SP -> número de línea para búsqueda O(1)
Write-Host "Construyendo índice de SPs..."
$spIndex = @{}
for ($idx = 0; $idx -lt $schemaLines.Count; $idx++) {
    $line = $schemaLines[$idx]
    if ($line -match 'CREATE\s+(?:OR\s+ALTER\s+)?(?:PROC|PROCEDURE)\s+\[?(\w+)\]?\.\[?(\w+)\]?') {
        $key = ($matches[1] + '.' + $matches[2]).ToLowerInvariant()
        if (-not $spIndex.ContainsKey($key)) {
            $spIndex[$key] = $idx
        }
    }
}
Write-Host "SPs indexados: $($spIndex.Count)"

$results = [System.Collections.Generic.List[PSCustomObject]]::new()
$notFound = [System.Collections.Generic.List[string]]::new()

$total = $targetSPs.Count
$i = 0

foreach ($sp in $targetSPs) {
    $i++
    $spName = $sp.FullName.Trim()
    $schema = $sp.Schema.Trim()
    $shortName = $spName -replace "^$([regex]::Escape($schema))\.", ""

    # Buscar línea usando el índice O(1)
    $key = ($schema + '.' + $shortName).ToLowerInvariant()
    $matchLine = $spIndex[$key]

    if ($null -eq $matchLine) {
        $notFound.Add($spName)
        continue
    }

    # Extraer hasta LinesPerSP líneas del cuerpo
    $endIdx = [math]::Min($matchLine + $LinesPerSP, $schemaLines.Count - 1)
    $body = ($schemaLines[$matchLine..$endIdx]) -join "`n"

    # Extraer autor y fecha del encabezado (suelen estar antes del CREATE)
    $headerStart = [math]::Max(0, $matchLine - 15)
    $header = ($schemaLines[$headerStart..($matchLine - 1)]) -join " "
    $autor = if ($header -match "Autor[^\:]*:\s*([^\*\n\r]+)") { $matches[1].Trim() } else { "" }
    $fecha = if ($header -match "Fecha[^\:]*:\s*([^\*\n\r]+)") { $matches[1].Trim() } else { "" }
    $descripcion = if ($header -match "Descripci[oó]n[^\:]*:\s*([^\*\n\r]+)") { $matches[1].Trim() } else { "" }

    # Extraer parámetros
    $params = @()
    $bodyForParams = $body
    $paramMatches = [regex]::Matches($bodyForParams, '@(\w+)\s+([\w\(\),\s]+?)(?=,|AS\s+BEGIN|\n\s*AS\s*\n)', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    foreach ($pm in $paramMatches | Select-Object -First 10) {
        $params += "@$($pm.Groups[1].Value) $($pm.Groups[2].Value.Trim())"
    }

    # Detectar tablas leídas y escritas
    $tablesRead  = @([regex]::Matches($body, 'FROM\s+(\[?\w+\]?\.\[?\w+\]?|\[?\w+\]?)\s', 'IgnoreCase') | ForEach-Object { $_.Groups[1].Value } | Where-Object { $_ -notmatch '^(SELECT|WITH|AS)$' } | Sort-Object -Unique)
    $tablesWrite = @([regex]::Matches($body, '(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|MERGE)\s+(\[?\w+\]?\.\[?\w+\]?|\[?\w+\]?)\s', 'IgnoreCase') | ForEach-Object { $_.Groups[1].Value } | Where-Object { $_ -notmatch '^(SELECT|INTO|FROM)$' } | Sort-Object -Unique)

    # Aplicar patrones de reglas
    $detectedPatterns = [System.Collections.Generic.List[string]]::new()
    $patternEvidence  = [ordered]@{}
    foreach ($p in $rulePatterns.GetEnumerator()) {
        $matches2 = [regex]::Matches($body, $p.Value, 'IgnoreCase')
        if ($matches2.Count -gt 0) {
            $detectedPatterns.Add($p.Key)
            # Guardar el primer fragmento de evidencia (máx 120 chars)
            $evidence = $matches2[0].Value.Trim()
            if ($evidence.Length -gt 120) { $evidence = $evidence.Substring(0, 120) + "..." }
            $patternEvidence[$p.Key] = $evidence
        }
    }

    $results.Add([PSCustomObject]@{
        SP            = $spName
        Schema        = $schema
        ShortName     = $shortName
        LineInSchema  = $matchLine + 1
        Autor         = $autor
        Fecha         = $fecha
        Descripcion   = $descripcion
        Params        = ($params -join " | ")
        TablesRead    = ($tablesRead -join ", ")
        TablesWrite   = ($tablesWrite -join ", ")
        Patterns      = ($detectedPatterns -join ", ")
        PatternCount  = $detectedPatterns.Count
        Evidence      = ($patternEvidence.GetEnumerator() | ForEach-Object { "$($_.Key): $($_.Value)" }) -join " || "
    })

    if ($i % 20 -eq 0) { Write-Host "  Procesados: $i / $total" }
}

Write-Host ""
Write-Host "Encontrados: $($results.Count) / $total"
Write-Host "No encontrados en schema: $($notFound.Count)"

# ──────────────────────────────────────────────
# 5. GUARDAR RESULTADOS
# ──────────────────────────────────────────────
$categorySlug = $Category.ToLowerInvariant()
$jsonPath = "$OutputDir/$categorySlug-rules-catalog.json"
$mdPath   = "$OutputDir/$categorySlug-rules-catalog.md"

# JSON (completo, para análisis posterior)
$rulesPayload = [ordered]@{
    metadata = [ordered]@{
        schemaVersion = "1.0"
        versionEsquema = "1.0"
        generatedAt = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
        generadoEn = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
        projectName = $ProjectName
        nombreProyecto = $ProjectName
        category = $Category
        categoria = $Category
        sourceSchemaFile = $schemaPath
        archivoSchemaOrigen = $schemaPath
        sourceClassificationFile = $classificationPath
        archivoClasificacionOrigen = $classificationPath
        analyzed = $results.Count
        analizados = $results.Count
        requested = $total
        solicitados = $total
        notFound = $notFound.Count
        noEncontrados = $notFound.Count
    }
    data = $results
}
$rulesPayload | ConvertTo-Json -Depth 8 | Out-File $jsonPath -Encoding UTF8

# Markdown (legible, con tabla resumen + sección por patrón más frecuente)
$sb = [System.Text.StringBuilder]::new()
$null = $sb.AppendLine("# Catálogo de Reglas de Negocio — $ProjectName ($Category SPs)")
$null = $sb.AppendLine("")
$null = $sb.AppendLine("**Generado**: $(Get-Date -Format 'yyyy-MM-dd HH:mm')  ")
$null = $sb.AppendLine("**SPs analizados**: $($results.Count) / $total  ")
$null = $sb.AppendLine("**SPs no encontrados en schema**: $($notFound.Count)  ")
$null = $sb.AppendLine("")

# Resumen de patrones
$null = $sb.AppendLine("## Resumen de Patrones Detectados")
$null = $sb.AppendLine("")
$null = $sb.AppendLine("| Patrón | SPs afectados | % del total |")
$null = $sb.AppendLine("|---|---:|---:|")
foreach ($p in $rulePatterns.Keys) {
    $count = ($results | Where-Object { $_.Patterns -match $p }).Count
    $pct = if ($results.Count -gt 0) { [math]::Round(100.0 * $count / $results.Count, 1) } else { 0 }
    $null = $sb.AppendLine("| $p | $count | $pct% |")
}

$null = $sb.AppendLine("")
$null = $sb.AppendLine("## SPs por número de patrones detectados (mayor complejidad primero)")
$null = $sb.AppendLine("")
$null = $sb.AppendLine("| SP | Schema | Línea | Patrones | Patrón(es) clave | Tablas escritas |")
$null = $sb.AppendLine("|---|---|---:|---:|---|---|")

foreach ($r in ($results | Sort-Object PatternCount -Descending | Select-Object -First 100)) {
    $null = $sb.AppendLine("| ``$($r.ShortName)`` | $($r.Schema) | $($r.LineInSchema) | $($r.PatternCount) | $($r.Patterns) | $($r.TablesWrite) |")
}

$null = $sb.AppendLine("")
$null = $sb.AppendLine("## Detalle por SP (SPs con patrones)")
$null = $sb.AppendLine("")

foreach ($r in ($results | Where-Object { $_.PatternCount -gt 0 } | Sort-Object Schema, ShortName)) {
    $spHeader = "### ``" + $r.SP + "``"
    $null = $sb.AppendLine($spHeader)
    $null = $sb.AppendLine('')
    if ($r.Descripcion) { $null = $sb.AppendLine("**Descripcion**: " + $r.Descripcion + "  ") }
    if ($r.Autor)       { $null = $sb.AppendLine("**Autor**: " + $r.Autor + " / **Fecha**: " + $r.Fecha + "  ") }
    $null = $sb.AppendLine("**Linea en schema**: " + $r.LineInSchema + "  ")
    if ($r.Params)      { $null = $sb.AppendLine("**Parametros**: " + $r.Params + "  ") }
    $null = $sb.AppendLine("**Patrones detectados**: " + $r.Patterns + "  ")
    if ($r.TablesRead)  { $null = $sb.AppendLine("**Tablas leidas**: " + $r.TablesRead + "  ") }
    if ($r.TablesWrite) { $null = $sb.AppendLine("**Tablas escritas**: " + $r.TablesWrite + "  ") }
    $null = $sb.AppendLine('')
    $null = $sb.AppendLine('**Evidencia**:')
    $null = $sb.AppendLine('```')
    $evidence = $r.Evidence -replace ' \|\| ', "`n"
    $null = $sb.AppendLine($evidence)
    $null = $sb.AppendLine('```')
    $null = $sb.AppendLine('')
}

if ($notFound.Count -gt 0) {
    $null = $sb.AppendLine('## SPs no encontrados en schema')
    $null = $sb.AppendLine('')
    foreach ($nf in $notFound) {
        $line = "- $nf"
        $null = $sb.AppendLine($line)
    }
}

$sb.ToString() | Out-File $mdPath -Encoding UTF8

Write-Host ""
Write-Host "Resultados guardados en:"
Write-Host "  JSON: $jsonPath"
Write-Host "  MD:   $mdPath"

$anonymizeScript = Join-Path $PSScriptRoot 'apply-artifact-anonymization.ps1'
if (Test-Path $anonymizeScript) {
    $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..' '..')).Path
    & $anonymizeScript -ProjectName $ProjectName -Scope all -Root $repoRoot
}
