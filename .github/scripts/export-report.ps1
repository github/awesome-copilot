# ================================================================
# Export Report - Convierte MD a DOCX con Pandoc
# ================================================================
# Uso: powershell -File .github\scripts\export-report.ps1 -ProjectName ProjectName -Audience client
# ================================================================

[CmdletBinding(DefaultParameterSetName = 'Export')]
param(
    [Parameter(ParameterSetName = 'Export', Mandatory = $true)]
    [string]$ProjectName,

    [Parameter(ParameterSetName = 'Export')]
    [ValidateSet('client', 'functional', 'assessment', 'techlead', 'dba')]
    [string]$Audience = 'client',

    [Parameter(ParameterSetName = 'Check', Mandatory = $false)]
    [switch]$Check
)

$ErrorActionPreference = 'Stop'

# BASE PATHS
$scriptDir = $PSScriptRoot
$repoRoot = (Resolve-Path (Join-Path $scriptDir '..' '..')).Path
$workspaceDir = Join-Path $repoRoot 'workspaces' $ProjectName

$manifestPath = Join-Path $workspaceDir 'fuente-de-verdad' 'manifest.json'
if (Test-Path $manifestPath) {
    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
    if ($manifest.anonymizationEnabled) {
        $anonymizeArtifactsScript = Join-Path $scriptDir 'apply-artifact-anonymization.ps1'
        if (Test-Path $anonymizeArtifactsScript) {
            Write-Host "MODO ANONIMIZADO ACTIVO: saneando artefactos antes de exportar..." -ForegroundColor Yellow
            & $anonymizeArtifactsScript -ProjectName $ProjectName -Scope all -Root $repoRoot
        }
    }
}

# TEST DEPENDENCIES
Write-Host ""
Write-Host "=== VERIFICACION DE DEPENDENCIAS ===" -ForegroundColor Cyan

$pandoc = Get-Command pandoc -ErrorAction SilentlyContinue
if ($pandoc) {
    $pver = & pandoc --version | Select-Object -First 1
    Write-Host "  OK Pandoc: $pver" -ForegroundColor Green
} else {
    Write-Host "  FALTA Pandoc >= 3.1" -ForegroundColor Red
    exit 1
}

$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
    $nver = & node --version
    Write-Host "  OK Node.js: $nver" -ForegroundColor Green
} else {
    Write-Host "  FALTA Node.js >= 18" -ForegroundColor Red
    exit 1
}

$mmf = Get-Command mermaid-filter -ErrorAction SilentlyContinue
if ($mmf) {
    Write-Host "  OK mermaid-filter: disponible" -ForegroundColor Green
} else {
    Write-Host "  INFO mermaid-filter no instalado (diagrams como texto)" -ForegroundColor DarkGray
}

Write-Host "  TODAS OK" -ForegroundColor Green
Write-Host ""

# GET MASTER DOCUMENT
$audienceUpper = $Audience.ToUpper()

$rootCandidate = if ($Audience -eq 'assessment') {
    Join-Path $workspaceDir "$ProjectName-ASSESSMENT.md"
} else {
    Join-Path $workspaceDir "$ProjectName-INFORME-$audienceUpper.md"
}

$entregaDir = Join-Path $workspaceDir 'entrega'
$entregaCandidate = if ($Audience -eq 'assessment') {
    Join-Path $entregaDir "$ProjectName-ASSESSMENT.md"
} else {
    Join-Path $entregaDir "$ProjectName-INFORME-$audienceUpper.md"
}

if (Test-Path $rootCandidate) {
    $masterMd = $rootCandidate
} elseif (Test-Path $entregaCandidate) {
    $masterMd = $entregaCandidate
} else {
    # Fallback historico a ejecutivo
    Write-Host "ERROR: No hay documento maestro para audiencia '$Audience' en $workspaceDir/entrega/" -ForegroundColor Red
        exit 1
}

Write-Host "ORIGEN: $masterMd" -ForegroundColor Cyan
Write-Host ""

# PRE-RENDER MERMAID DIAGRAMS
$mmdc = Get-Command mmdc -ErrorAction SilentlyContinue
if ($mmdc) {
    Write-Host "PRE-RENDERING MERMAID DIAGRAMS..." -ForegroundColor Cyan
    $renderScript = Join-Path $scriptDir "convert-mermaid-to-png.ps1"
    if (Test-Path $renderScript) {
        try {
            $renderedMd = & $renderScript -InputMd $masterMd
            if ($renderedMd -and (Test-Path $renderedMd)) {
                $masterMd = $renderedMd
                Write-Host "  OK - diagrams rendered as PNG" -ForegroundColor Green
            }
        } catch {
            Write-Host "  WARNING - failed to render diagrams, will exportaran como texto" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "AVISO: mmdc no encontrado. Diagrams will be exported como bloques de codigo." -ForegroundColor Yellow
    Write-Host "       Para activar renderizado: npm install -g @mermaid-js/mermaid-cli" -ForegroundColor DarkGray
}
Write-Host ""
# Destino: SIEMPRE en workspaces/<Proyecto>/entrega
if (-not (Test-Path $entregaDir)) {
    New-Item -ItemType Directory -Path $entregaDir -Force | Out-Null
}
$docxName = ([System.IO.Path]::GetFileName($masterMd)) -replace '-RENDERED\.md$', '.docx' -replace '\.md$', '.docx'
$destDocx = Join-Path $entregaDir $docxName
Write-Host "DESTINO: $destDocx" -ForegroundColor Cyan
Write-Host ""

$pandocArgs = @(
    $masterMd,
    '-o', $destDocx,
    '--from', 'markdown+smart',
    '--to', 'docx',
    '--standalone',
    '--table-of-contents',
    '--toc-depth', '3',
    '--metadata', "title=$ProjectName - Informe DBA 360",
    '--metadata', "date=$(Get-Date -Format 'yyyy-MM-dd')",
    '--metadata', 'author=Boost DBA 360'
)

Write-Host "EJECUTANDO PANDOC..." -ForegroundColor Cyan
& pandoc @pandocArgs

if ($LASTEXITCODE -eq 0) {
    $sizeKB = [math]::Round((Get-Item $destDocx).Length / 1KB, 1)
    Write-Host ""
    Write-Host "OK - DOCUMENTO GENERADO: $destDocx ($sizeKB KB)" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "ERROR - Pandoc fallo con codigo $LASTEXITCODE" -ForegroundColor Red
    exit 1
}

