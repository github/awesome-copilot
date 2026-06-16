param(
    [string]$ProjectName,
    [switch]$Strict   # Si se pasa, FAIL en cualquier warning (no solo errores críticos)
)

$ErrorActionPreference = 'Stop'

# ── 1. DESCUBRIMIENTO DE PROYECTO ──────────────────────────────────────────────
if (-not $ProjectName) {
    $projects = Get-ChildItem -Path "workspaces" -Directory -ErrorAction SilentlyContinue
    if ($projects.Count -eq 0) { Write-Error "No se encontró ningún proyecto en workspaces/"; exit 1 }
    if ($projects.Count -eq 1) { $ProjectName = $projects[0].Name }
    else { Write-Error "Especifica -ProjectName"; exit 1 }
}

$base = "workspaces/$ProjectName"
$fv   = "$base/fuente-de-verdad"

Write-Host ""
Write-Host "=== SECURITY PREFLIGHT: $ProjectName ==="
Write-Host ""

$failures  = [System.Collections.Generic.List[string]]::new()
$warnings  = [System.Collections.Generic.List[string]]::new()

# ── 2. SECRETOS EN FICHEROS JSON/MD (CRÍTICO) ─────────────────────────────────
$secretPatterns = @(
    @{ Name = "Password en claro";         Pattern = 'Password\s*=\s*[^;"\s]{4,}' }
    @{ Name = "Credencial sa";             Pattern = 'User\s*Id\s*=\s*sa\b|uid=sa\b' }
    @{ Name = "Private key header";        Pattern = '-----BEGIN (RSA |EC )?PRIVATE KEY-----' }
    @{ Name = "Token Bearer hardcoded";    Pattern = 'Bearer\s+[A-Za-z0-9\._-]{40,}' }
    @{ Name = "AWS access key";            Pattern = 'AKIA[A-Z0-9]{16}' }
    @{ Name = "Connection string completa"; Pattern = '(Data\s+Source|Server)\s*=.{5,};.*(Password|Pwd)\s*=' }
)

$nonSqlFiles = Get-ChildItem -Path $fv -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -notmatch '\.(sql)$' }

foreach ($file in $nonSqlFiles) {
    foreach ($sp in $secretPatterns) {
        $hit = Select-String -Path $file.FullName -Pattern $sp.Pattern -CaseSensitive:$false -ErrorAction SilentlyContinue
        if ($hit) {
            $failures.Add("SECRETO '$($sp.Name)' en $($file.Name) (linea $($hit[0].LineNumber))")
        }
    }
}

# ── 3. GDPR Y CIFRADO EN SCHEMA SQL ───────────────────────────────────────────
$schemaPath = "$fv/schema/db.sql"
if (Test-Path $schemaPath) {
    $openKey = @(Select-String -Path $schemaPath -Pattern 'OPEN\s+SYMMETRIC\s+KEY' -ErrorAction SilentlyContinue)
    if ($openKey.Count -gt 0) {
        $warnings.Add("GDPR: $($openKey.Count) uso(s) de OPEN SYMMETRIC KEY — datos cifrados presentes. Migracion requiere gestion de clave.")
    }
    $decrypt = @(Select-String -Path $schemaPath -Pattern 'DecryptByKey' -ErrorAction SilentlyContinue)
    if ($decrypt.Count -gt 0) {
        $warnings.Add("GDPR: $($decrypt.Count) uso(s) de DecryptByKey — campos con datos personales protegidos. No incluir en salidas.")
    }
    $grantSa = @(Select-String -Path $schemaPath -Pattern '\bGRANT\b.*\bsa\b|\bsa\b.*\bGRANT\b' -ErrorAction SilentlyContinue)
    if ($grantSa.Count -gt 0) {
        $failures.Add("SEGURIDAD: GRANT a usuario 'sa' en schema — privilegio excesivo.")
    }
    $linkedSrv = @(Select-String -Path $schemaPath -Pattern 'sp_addlinkedserver|OPENQUERY\s*\(' -ErrorAction SilentlyContinue)
    if ($linkedSrv.Count -gt 0) {
        $warnings.Add("INFRA: $($linkedSrv.Count) referencia(s) a LINKED SERVER — topologia interna expuesta en schema.")
    }
}

# ── 4. MANIFEST: verificar preflight status ───────────────────────────────────
$manifestPath = "$fv/manifest.json"
if (Test-Path $manifestPath) {
    try {
        $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
        if ($manifest.PSObject.Properties['preflight'] -and $manifest.preflight -and $manifest.preflight.status -eq 'FAIL') {
            $warnings.Add("PREFLIGHT BD: manifest indica FAIL — $($manifest.preflight.description)")
        }
    } catch {
        $warnings.Add("Manifest no parseable como JSON.")
    }
}

# ── 5. ARTEFACTOS DE PROYECTO EN .github (NUNCA DEBEN ESTAR AHI) ──────────────
$githubLeaks = Get-ChildItem -Path ".github" -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -match '\.(sql|json|md)$' -and
                   $_.Name -match 'db\.sql$|manifest\.json$|full-db-sp-classification\.json|critical-rules-catalog|complex-rules-catalog|views-by-schema|functions-by-schema|tables-by-schema|procs-by-schema' }
if ($githubLeaks) {
    $githubLeaks | ForEach-Object {
        $failures.Add("DATA LEAK: artefacto '$($_.Name)' en .github/ — debe estar solo en workspaces/")
    }
}

# ── 6. RESULTADO ──────────────────────────────────────────────────────────────
Write-Host "Errores criticos : $($failures.Count)"
Write-Host "Advertencias     : $($warnings.Count)"
Write-Host ""

if ($warnings.Count -gt 0) {
    Write-Host "--- ADVERTENCIAS ---" -ForegroundColor Yellow
    $warnings | ForEach-Object { Write-Host "  [!] $_" -ForegroundColor Yellow }
    Write-Host ""
}

if ($failures.Count -gt 0) {
    Write-Host "--- ERRORES CRITICOS ---" -ForegroundColor Red
    $failures | ForEach-Object { Write-Host "  [X] $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "=== RESULTADO: FAIL ===" -ForegroundColor Red
    Write-Host "Ningún análisis debe iniciarse con FAIL de seguridad." -ForegroundColor Red
    exit 1
}

if ($Strict -and $warnings.Count -gt 0) {
    Write-Host "=== RESULTADO: FAIL (Strict — warnings como errores) ===" -ForegroundColor Red
    exit 1
}

Write-Host "=== RESULTADO: PASS ===" -ForegroundColor Green
if ($warnings.Count -gt 0) {
    Write-Host "(con $($warnings.Count) advertencias para revision manual)" -ForegroundColor Yellow
}
exit 0
