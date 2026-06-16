param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectName,
    [string]$SchemaPath,
    [string]$ConnectionString,
    [ValidateSet('ask', 'yes', 'no')]
    [string]$Anonymize = 'ask',
    [string]$Root = (Get-Location).Path
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path $Root).Path
$bootstrapScript = Join-Path $PSScriptRoot "bootstrap-source-of-truth.ps1"
$preflightScript = Join-Path $PSScriptRoot "security-preflight.ps1"

if (-not (Test-Path $bootstrapScript)) { throw "No se encontro bootstrap-source-of-truth.ps1" }
if (-not (Test-Path $preflightScript)) { throw "No se encontro security-preflight.ps1" }

$anonymizeEnabled = $false
switch ($Anonymize) {
    'yes' { $anonymizeEnabled = $true }
    'no'  { $anonymizeEnabled = $false }
    default {
        # Decision gate is mandatory: in non-interactive mode caller must set -Anonymize yes|no.
        if ($Host.Name -and $Host.Name -ne 'ServerRemoteHost') {
            $answer = Read-Host "¿Quieres anonimizar la BBDD y todos los artefactos derivados del workspace? (s/N)"
            $anonymizeEnabled = $answer -match '^(s|si|y|yes)$'
        } else {
            throw "Decision de anonimización obligatoria: usa -Anonymize yes o -Anonymize no en ejecuciones no interactivas."
        }
    }
}

Write-Host "Modo de anonimización: $(if($anonymizeEnabled){'ACTIVO'}else{'DESACTIVADO'})"

Write-Host "[1/2] Creando fuente de verdad local..."
$bootstrapParams = @{
    ProjectName = $ProjectName
    Root = $repoRoot
}
if ($SchemaPath) { $bootstrapParams.SchemaPath = $SchemaPath }
if ($ConnectionString) { $bootstrapParams.ConnectionString = $ConnectionString }
if ($anonymizeEnabled) { $bootstrapParams.Anonymize = $true }

& $bootstrapScript @bootstrapParams

$projectRoot = Join-Path $repoRoot "workspaces" $ProjectName
Write-Host "[2/2] Ejecutando preflight de seguridad sobre la fuente de verdad..."
& $preflightScript -ProjectName $ProjectName

Write-Host "Wizard completado. Ya puedes iniciar analisis DBA 360 sobre: $projectRoot"
