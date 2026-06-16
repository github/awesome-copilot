param(
    [Parameter(Mandatory = $true)]
    [string]$SchemaRoot,
    [string]$MergedMappingsOut,
    [string]$Root = (Get-Location).Path
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-TextEncodingName {
    param([Parameter(Mandatory = $true)][string]$Path)

    $fs = [System.IO.File]::OpenRead($Path)
    try {
        $bytes = New-Object byte[] 4
        $read = $fs.Read($bytes, 0, 4)
    }
    finally {
        $fs.Dispose()
    }

    if ($read -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) { return "utf-8" }
    if ($read -ge 2 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) { return "utf-16" }
    if ($read -ge 2 -and $bytes[0] -eq 0xFE -and $bytes[1] -eq 0xFF) { return "utf-16" }

    # Fallback compatible with most source-controlled SQL files.
    return "utf-8"
}

$repoRoot = (Resolve-Path $Root).Path
$schemaRootResolved = (Resolve-Path $SchemaRoot).Path
$anonymizer = Join-Path $repoRoot ".github" "skills" "sql-anonymization" "anonymize_sql.py"

if (-not (Test-Path $anonymizer)) {
    throw "No se encontro anonymize_sql.py en .github/skills/sql-anonymization"
}

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    throw "Python no esta disponible en PATH. Instala Python para ejecutar la anonimización SQL."
}

$sqlFiles = @(Get-ChildItem -Path $schemaRootResolved -Recurse -File -Filter *.sql)
if ($sqlFiles.Count -eq 0) {
    Write-Host "No se encontraron ficheros .sql en $schemaRootResolved" -ForegroundColor Yellow
    return
}

$merged = @{}
$totalFiles = 0

foreach ($file in $sqlFiles) {
    $encoding = Get-TextEncodingName -Path $file.FullName
    $tmpOut = "$($file.FullName).anon.tmp"

    Write-Host "  Anonimizando: $($file.Name) (encoding: $encoding)"
    & python $anonymizer -i $file.FullName -o $tmpOut --encoding $encoding | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Fallo la anonimización de $($file.FullName)"
    }

    Move-Item -Path $tmpOut -Destination $file.FullName -Force
    $totalFiles++

    $generatedMapping = Join-Path $file.Directory.FullName "anonymization_mappings.json"
    if (Test-Path $generatedMapping) {
        $map = Get-Content $generatedMapping -Raw | ConvertFrom-Json -AsHashtable
        foreach ($cat in $map.Keys) {
            if (-not $merged.ContainsKey($cat)) {
                $merged[$cat] = @{}
            }
            $catMap = $map.$cat
            if ($null -ne $catMap) {
                if ($catMap -is [hashtable]) {
                    foreach ($prop in $catMap.Keys) {
                        $merged[$cat][$prop] = $catMap[$prop]
                    }
                }
                elseif ($catMap -is [System.Collections.IDictionary]) {
                    foreach ($prop in $catMap.Keys) {
                        $merged[$cat][$prop] = $catMap[$prop]
                    }
                }
            }
        }
        Remove-Item $generatedMapping -Force
    }
}

if ($MergedMappingsOut) {
    $outDir = Split-Path $MergedMappingsOut -Parent
    if ($outDir -and -not (Test-Path $outDir)) {
        New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    }
    ($merged | ConvertTo-Json -Depth 16) | Set-Content -Path $MergedMappingsOut -Encoding UTF8
    Write-Host "  Mapping consolidado: $MergedMappingsOut" -ForegroundColor Green
}

Write-Host "Anonimización SQL completada. Ficheros procesados: $totalFiles" -ForegroundColor Green
