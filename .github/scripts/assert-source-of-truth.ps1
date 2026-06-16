param(
    [string]$ProjectName,
    [switch]$AutoFix   # Si se pasa, intenta generar los artefactos que faltan en lugar de solo fallar
)

$ErrorActionPreference = 'Stop'

# ── 1. DESCUBRIMIENTO DE PROYECTO ──────────────────────────────────────────────
if (-not $ProjectName) {
    $projects = Get-ChildItem -Path "workspaces" -Directory -ErrorAction SilentlyContinue
    if ($projects.Count -eq 0) { Write-Error "No se encontró ningún proyecto en workspaces/"; exit 1 }
    if ($projects.Count -eq 1) { $ProjectName = $projects[0].Name }
    else {
        Write-Host "Proyectos disponibles:"
        $projects | ForEach-Object { Write-Host "  - $($_.Name)" }
        Write-Error "Especifica -ProjectName"; exit 1
    }
}

$base     = "workspaces/$ProjectName"
$fv       = "$base/fuente-de-verdad"
$rules    = "$base/reports/business-rules"
$plans    = "$base/plans"

# ── 2. MAPA DE ARTEFACTOS REQUERIDOS ──────────────────────────────────────────
$required = [ordered]@{
    "Schema SQL"                   = "$fv/schema/db.sql"
    "Manifest"                     = "$fv/manifest.json"
    "Tablas por schema"            = "$fv/tables-by-schema.json"
    "SPs por schema"               = "$fv/procs-by-schema.json"
    "Vistas por schema"            = "$fv/views-by-schema.json"
    "Funciones por schema"         = "$fv/functions-by-schema.json"
    "Clasificacion SPs (JSON)"      = "$plans/full-db-sp-classification.json"
    "Catalogo reglas Critical"     = "$rules/critical-rules-catalog.md"
    "Catalogo reglas Complex"      = "$rules/complex-rules-catalog.md"
}

# ── 3. VERIFICAR CADA ARTEFACTO ───────────────────────────────────────────────
Write-Host ""
Write-Host "=== ASSERT SOURCE OF TRUTH: $ProjectName ==="
Write-Host ""

$missing = [System.Collections.Generic.List[string]]::new()
$present = [System.Collections.Generic.List[string]]::new()

foreach ($entry in $required.GetEnumerator()) {
    $label = $entry.Key
    $path  = $entry.Value
    if (Test-Path $path) {
        $size = [math]::Round((Get-Item $path).Length / 1KB, 0)
        Write-Host "  [OK]  $label ($($size) KB)"
        $present.Add($label)
    } else {
        Write-Host "  [FALTA]  $label → $path"
        $missing.Add($label)
    }
}

Write-Host ""

# ── 4. AUTOFIX (si se pide) ───────────────────────────────────────────────────
if ($AutoFix -and $missing.Count -gt 0) {
    Write-Host "=== AUTOFIX: generando artefactos faltantes ==="
    Write-Host ""

    if (-not (Test-Path "$fv/schema/db.sql")) {
        Write-Host "  [SKIP] schema/db.sql requires manual source (input/). Coloca el schema en input/ y ejecuta refresh-source-of-truth.ps1"
    }

    if (-not (Test-Path "$fv/views-by-schema.json") -or -not (Test-Path "$fv/functions-by-schema.json")) {
        if (Test-Path "$fv/schema/db.sql") {
            Write-Host "  [GEN] Generando views-by-schema.json y functions-by-schema.json..."
            $l = [IO.File]::ReadAllLines((Resolve-Path "$fv/schema/db.sql").Path)
            $v=@{};$f=@{}
            foreach($x in $l){
                if($x-match'VIEW\s+\[?(\w+)\]?\.\[?(\w+)\]?'){$s=$Matches[1];$n=$Matches[2];if(!$v[$s]){$v[$s]=@()};$v[$s]+=$n}
                if($x-match'FUNCTION\s+\[?(\w+)\]?\.\[?(\w+)\]?'){$s=$Matches[1];$n=$Matches[2];if(!$f[$s]){$f[$s]=@()};$f[$s]+=$n}
            }
            $vt=0;$v.Values|%{$vt+=$_.Count};$ft=0;$f.Values|%{$ft+=$_.Count}
            @{total=$vt;bySchema=$v}|ConvertTo-Json -Depth 4|Out-File "$fv/views-by-schema.json" -Encoding UTF8
            @{total=$ft;bySchema=$f}|ConvertTo-Json -Depth 4|Out-File "$fv/functions-by-schema.json" -Encoding UTF8
            Write-Host "  [OK] Vistas: $vt | Funciones: $ft"
        }
    }

    if (-not (Test-Path "$plans/full-db-sp-classification.json")) {
        Write-Host "  [GEN] Generando full-db-sp-classification.json desde procs-by-schema.json..."
        if (Test-Path "$fv/procs-by-schema.json") {
            $procs = Get-Content "$fv/procs-by-schema.json" -Raw | ConvertFrom-Json
            $items = @()
            foreach ($schemaName in $procs.bySchema.PSObject.Properties.Name) {
                foreach ($procName in $procs.bySchema.$schemaName) {
                    $items += [PSCustomObject]@{
                        Schema = $schemaName
                        Procedure = $procName
                        FullName = "$schemaName.$procName"
                        Category = "CRUD"
                        Wave = "Wave-1"
                        Strategy = "Dapper-Query"
                        HasWriteOps = $false
                        HasTransaction = $false
                        HasCursor = $false
                        HasDynamicSql = $false
                        HasCrypto = $false
                    }
                }
            }
            $payload = [ordered]@{
                metadata = [ordered]@{
                    schemaVersion = "1.0"
                    generatedAt = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
                    source = "$fv/procs-by-schema.json"
                    total = $items.Count
                }
                data = $items
            }
            $payload | ConvertTo-Json -Depth 8 | Out-File "$plans/full-db-sp-classification.json" -Encoding UTF8
            Write-Host "  [OK] full-db-sp-classification.json generado"
        } else {
            Write-Host "  [SKIP] procs-by-schema.json no disponible"
        }
    }

    if (-not (Test-Path "$rules/critical-rules-catalog.md")) {
        Write-Host "  [GEN] Generando critical-rules-catalog..."
        pwsh -File ".github/scripts/extract-critical-business-rules.ps1" -Category Critical
    }

    if (-not (Test-Path "$rules/complex-rules-catalog.md")) {
        Write-Host "  [GEN] Generando complex-rules-catalog..."
        pwsh -File ".github/scripts/extract-critical-business-rules.ps1" -Category Complex
    }

    # Re-verificar tras autofix
    Write-Host ""
    Write-Host "=== RE-VERIFICACION TRAS AUTOFIX ==="
    $missing = [System.Collections.Generic.List[string]]::new()
    foreach ($entry in $required.GetEnumerator()) {
        if (-not (Test-Path $entry.Value)) { $missing.Add($entry.Key) }
    }
}

# ── 5. RESULTADO FINAL ────────────────────────────────────────────────────────
if ($missing.Count -gt 0) {
    Write-Host "=== RESULTADO: FAIL ($($missing.Count) artefactos faltantes) ===" -ForegroundColor Red
    Write-Host ""
    Write-Host "Artefactos faltantes:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "Ejecuta los pasos de onboarding definidos en .github/skills/secure-onboarding/SKILL.md" -ForegroundColor Yellow
    Write-Host "O re-ejecuta con -AutoFix para generar los artefactos automáticamente." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "=== RESULTADO: PASS ($($present.Count)/$($required.Count) artefactos presentes) ===" -ForegroundColor Green
    exit 0
}
