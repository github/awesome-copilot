param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectName,
    [ValidateSet('reports', 'plans', 'entrega', 'all')]
    [string]$Scope = 'all',
    [string]$Root = (Get-Location).Path
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path $Root).Path
$workspace = Join-Path $repoRoot "workspaces" $ProjectName
$manifestPath = Join-Path $workspace "fuente-de-verdad" "manifest.json"

if (-not (Test-Path $manifestPath)) {
    throw "Manifest no encontrado: $manifestPath"
}

$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$manifestAnonymized = $false
if ($manifest.PSObject.Properties['anonymizationEnabled']) {
    $manifestAnonymized = [bool]$manifest.anonymizationEnabled
}

if (-not $manifestAnonymized) {
    Write-Host "Anonimización desactivada en manifest. No se aplican cambios." -ForegroundColor Yellow
    return
}

# Replace both plain and backticked identifiers seen in reports/plans.
$regexReplacements = @(
    @{ Pattern = '(?<!\w)dbo(?!\w)'; Value = 'SCH_CORE' },
    @{ Pattern = '(?<!\w)bi(?!\w)'; Value = 'SCH_BI' },
    @{ Pattern = '(?<!\w)bya(?!\w)'; Value = 'SCH_GRANTS' },
    @{ Pattern = '(?<!\w)plc(?!\w)'; Value = 'SCH_LIQUID' },
    @{ Pattern = '(?<!\w)vt(?!\w)'; Value = 'SCH_VALUATION' },
    @{ Pattern = '(?<!\w)gba(?!\w)'; Value = 'SCH_GRANTS_ADV' },
    @{ Pattern = '(?<!\w)gcc(?!\w)'; Value = 'SCH_COSTS' },
    @{ Pattern = '(?<!\w)req(?!\w)'; Value = 'SCH_REQS' },
    @{ Pattern = '(?<!\w)rei(?!\w)'; Value = 'SCH_REFUNDS' },
    @{ Pattern = '(?<!\w)ale(?!\w)'; Value = 'SCH_APPEALS' },
    @{ Pattern = '\bSubvencionesSymmetricKey\b'; Value = 'SYM_KEY_001' },
    @{ Pattern = '\bT_GRUPO_PARTICIPANTE\b'; Value = 'T_ENTITY_PARTICIPANTS' },
    @{ Pattern = '\bT_SOLICITUD\b'; Value = 'T_REQUEST' },
    @{ Pattern = '\bT_PARTICIPANTE_DATOSBANCARIOS\b'; Value = 'T_PARTICIPANT_BANK' },
    @{ Pattern = '\bT_PLANFORMACION\b'; Value = 'T_TRAINING_PLAN' },
    @{ Pattern = '\bT_PLANFORM_AF\b'; Value = 'T_TRAINING_ACTION' },
    @{ Pattern = '\bUP_V_ABRIR_LLAVE\b'; Value = 'SP_OPEN_KEY' },
    @{ Pattern = '\bUP_U_CANCELAR_DEVOLUCION\b'; Value = 'SP_CANCEL_REFUND' },
    @{ Pattern = '\bDecryptByKey\b'; Value = 'DecryptByKeyAlias' }
)

$targets = @()
switch ($Scope) {
    'reports' { $targets += [PSCustomObject]@{ Path = (Join-Path $workspace 'reports'); Recurse = $true } }
    'plans'   { $targets += [PSCustomObject]@{ Path = (Join-Path $workspace 'plans'); Recurse = $true } }
    'entrega' { $targets += [PSCustomObject]@{ Path = (Join-Path $workspace 'entrega'); Recurse = $true } }
    default {
        # Include root masters (e.g. <Project>-INFORME-*.md) without walking source-of-truth recursively.
        $targets += [PSCustomObject]@{ Path = $workspace; Recurse = $false }
        $targets += [PSCustomObject]@{ Path = (Join-Path $workspace 'reports'); Recurse = $true }
        $targets += [PSCustomObject]@{ Path = (Join-Path $workspace 'plans'); Recurse = $true }
        $targets += [PSCustomObject]@{ Path = (Join-Path $workspace 'entrega'); Recurse = $true }
    }
}

$files = foreach ($t in $targets) {
    if (Test-Path $t.Path) {
        if ($t.Recurse) {
            Get-ChildItem -Path $t.Path -Recurse -File -Include *.md, *.txt, *.json
        } else {
            Get-ChildItem -Path $t.Path -File -Include *.md, *.txt, *.json
        }
    }
}

$updated = 0
foreach ($file in $files) {
    $original = Get-Content $file.FullName -Raw
    $content = $original
    foreach ($r in $regexReplacements) {
        $content = [regex]::Replace($content, $r.Pattern, $r.Value)
    }

    if ($content -ne $original) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8
        $updated++
    }
}

Write-Host "Anonimización de artefactos aplicada. Ficheros actualizados: $updated" -ForegroundColor Green
