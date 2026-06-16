# ================================================================
# Convert-MermaidToPng.ps1
# Pre-renderiza todos los bloques mermaid de un .md como PNG
# y genera un nuevo .md con los PNG embebidos
# ================================================================
# Uso:
#   & .\.github\scripts\convert-mermaid-to-png.ps1 -InputMd workspaces\ProjectName\entrega\ProjectName-INFORME-CLIENTE.md
# ================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$InputMd
)

$ErrorActionPreference = 'Stop'

$mmdc = Get-Command mmdc -ErrorAction SilentlyContinue
if (-not $mmdc) {
    Write-Host "ERROR: mmdc no encontrado. Instalar con: npm install -g @mermaid-js/mermaid-cli" -ForegroundColor Red
    exit 1
}

$inputPath  = Resolve-Path $InputMd
$inputDir   = Split-Path $inputPath
$baseName   = [System.IO.Path]::GetFileNameWithoutExtension($inputPath)
$outputMd   = Join-Path $inputDir "$baseName-RENDERED.md"
$imgDir     = Join-Path $inputDir "mermaid-imgs"

if (-not (Test-Path $imgDir)) { New-Item -ItemType Directory -Path $imgDir | Out-Null }

$content  = Get-Content $inputPath -Raw -Encoding UTF8
$counter  = 0
$newLines = @()

$lines = $content -split "`n"
$inBlock = $false
$mermaidLines = @()

foreach ($line in $lines) {
    if ($line.TrimEnd() -match '^```mermaid') {
        $inBlock = $true
        $mermaidLines = @()
    } elseif ($inBlock -and $line.TrimEnd() -eq '```') {
        $inBlock = $false
        $counter++
        $tmpFile = Join-Path $imgDir "mermaid_$counter.mmd"
        $pngFile = Join-Path $imgDir "mermaid_$counter.png"

        # Escribir definicion Mermaid a fichero temporal
        $mermaidLines -join "`n" | Set-Content $tmpFile -Encoding UTF8

        # Renderizar con mmdc
        Write-Host "  Rendering diagram $counter..." -ForegroundColor DarkGray
        & mmdc -i $tmpFile -o $pngFile --backgroundColor white 2>&1 | Out-Null

        if (Test-Path $pngFile) {
            $newLines += "![Diagram $counter]($pngFile)"
            Write-Host "  OK diagram $counter -> $pngFile" -ForegroundColor Green
        } else {
            Write-Host "  FAILED diagram $counter, manteniendo bloque de codigo" -ForegroundColor Yellow
            $newLines += '```mermaid'
            $newLines += $mermaidLines
            $newLines += '```'
        }
    } elseif ($inBlock) {
        $mermaidLines += $line
    } else {
        $newLines += $line
    }
}

$newLines -join "`n" | Set-Content $outputMd -Encoding UTF8

Write-Host ""
Write-Host "OK - $counter diagrams rendered" -ForegroundColor Green
Write-Host "Salida: $outputMd" -ForegroundColor Cyan
Write-Host ""

return $outputMd

