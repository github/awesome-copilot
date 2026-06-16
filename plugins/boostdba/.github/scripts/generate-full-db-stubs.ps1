param(
    [Parameter(Mandatory = $true)]
    [string]$ClassificationJson,
    [Parameter(Mandatory = $true)]
    [string]$SchemaFile,
    [string]$OutDir = "workspaces/ProjectName/plans/migration/full-db-stubs",
    [ValidateSet("Wave-1", "Wave-2", "Wave-3", "Wave-4", "All")]
    [string]$Wave = "All"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Test-Path $ClassificationJson)) {
    throw "No se encontro el JSON de clasificacion: $ClassificationJson"
}
if (-not (Test-Path $SchemaFile)) {
    throw "No se encontro el archivo de schema: $SchemaFile"
}

New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

$classification = Get-Content -Path $ClassificationJson -Raw | ConvertFrom-Json
$rows = @()
if ($classification -is [System.Array]) {
    $rows = $classification
} elseif ($null -ne $classification.data) {
    $rows = @($classification.data)
} else {
    $rows = @($classification)
}
if ($Wave -ne "All") {
    $rows = $rows | Where-Object { $_.Wave -eq $Wave }
}

# Construir mapa de firmas de procedimientos desde el schema (schema.nombre -> lista de parametros)
$schemaContent = Get-Content -Raw -Path $SchemaFile
$signatureRegex = '(?is)CREATE\s+PROCEDURE\s+\[(?<schema>[^\]]+)\]\.\[(?<name>[^\]]+)\](?<sig>.*?)\bAS\b'
$signatureMatches = [regex]::Matches($schemaContent, $signatureRegex)

$paramMap = @{}
foreach ($m in $signatureMatches) {
    $schema = $m.Groups['schema'].Value
    $name = $m.Groups['name'].Value
    $full = "$schema.$name"
    $sigBody = $m.Groups['sig'].Value

    $params = @()
    $paramRegex = '(?im)^\s*@(?<pname>[A-Za-z0-9_]+)\s+(?<ptype>[A-Za-z0-9_]+(?:\s*\([^\)]*\))?)'
    $pm = [regex]::Matches($sigBody, $paramRegex)
    foreach ($p in $pm) {
        $params += [PSCustomObject]@{
            Name = $p.Groups['pname'].Value
            SqlType = $p.Groups['ptype'].Value.Trim()
        }
    }
    $paramMap[$full] = $params
}

function Convert-ToPascal([string]$text) {
    if ([string]::IsNullOrWhiteSpace($text)) { return "X" }
    $parts = $text -split '[^A-Za-z0-9]+'
    $clean = ($parts | Where-Object { $_ -ne '' } | ForEach-Object {
        if ($_.Length -eq 1) { $_.ToUpper() } else { $_.Substring(0,1).ToUpper() + $_.Substring(1).ToLower() }
    }) -join ''
    if ([string]::IsNullOrWhiteSpace($clean)) { return "X" }
    if ([char]::IsDigit($clean[0])) { return "P$clean" }
    return $clean
}

function SqlTypeToCSharp([string]$sqlType) {
    $t = $sqlType.ToLower()
    if ($t -match '^int') { return 'int' }
    if ($t -match '^bigint') { return 'long' }
    if ($t -match '^smallint') { return 'short' }
    if ($t -match '^tinyint') { return 'byte' }
    if ($t -match '^bit') { return 'bool' }
    if ($t -match 'decimal|numeric|money|smallmoney') { return 'decimal' }
    if ($t -match 'float') { return 'double' }
    if ($t -match 'real') { return 'float' }
    if ($t -match 'date|datetime|smalldatetime|datetime2') { return 'DateTime' }
    if ($t -match 'time') { return 'TimeSpan' }
    if ($t -match 'uniqueidentifier') { return 'Guid' }
    if ($t -match 'char|nchar|varchar|nvarchar|text|ntext|xml') { return 'string' }
    if ($t -match 'varbinary|binary|image') { return 'byte[]' }
    return 'string'
}

function Ensure-Dir([string]$path) {
    if (-not (Test-Path $path)) { New-Item -ItemType Directory -Path $path -Force | Out-Null }
}

function Get-SafeFileBase([string]$schema, [string]$proc, [string]$pascalProc) {
    $hashBytes = [System.Text.Encoding]::UTF8.GetBytes("$schema.$proc")
    $hash = [System.Convert]::ToHexString([System.Security.Cryptography.SHA1]::HashData($hashBytes)).Substring(0, 8)
    $base = if ($pascalProc.Length -gt 80) { $pascalProc.Substring(0, 80) } else { $pascalProc }
    return "$base`_$hash"
}

$manifest = [System.Collections.Generic.List[object]]::new()
$errors = [System.Collections.Generic.List[object]]::new()
$count = 0
$total = @($rows).Count

foreach ($r in $rows) {
    try {
        $fullName = $r.FullName
        $parts = $fullName.Split('.')
        if ($parts.Length -ne 2) { continue }

        $schema = $parts[0]
        $proc = $parts[1]
        $pascalSchema = Convert-ToPascal $schema
        $pascalProc = Convert-ToPascal $proc

        $schemaDir = Join-Path $OutDir $schema
        Ensure-Dir $schemaDir

        $params = @()
        if ($paramMap.ContainsKey($fullName)) {
            $params = $paramMap[$fullName]
        }

        $isRead = $r.Category -eq 'CRUD'
        $contractName = if ($isRead) { "I${pascalProc}Query" } else { "I${pascalProc}Command" }
        $resultType = if ($isRead) { "${pascalProc}Row" } else { "${pascalProc}Result" }
        $commandType = if ($isRead) { "StoredProcedure" } else { "StoredProcedure" }

        $paramSignature = ""
        $anonMap = ""
        if ($params.Count -gt 0) {
            $sigParts = @()
            $mapParts = @()
            foreach ($p in $params) {
                $pn = Convert-ToPascal $p.Name
                $csType = SqlTypeToCSharp $p.SqlType
                $camel = $pn.Substring(0,1).ToLower() + $pn.Substring(1)
                $sigParts += "$csType $camel"
                $mapParts += "                $($p.Name) = $camel"
            }
            $paramSignature = ($sigParts -join ', ')
            $anonMap = ($mapParts -join ",`r`n")
        }

        $contractText = @"
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace ProjectName.Migration.$pascalSchema;

public interface $contractName
{
    Task<IReadOnlyList<$resultType>> ExecuteAsync($paramSignature, CancellationToken ct = default);
}

public sealed record $resultType;
"@

        $aclText = @"
using System.Collections.Generic;
using System.Data;
using System.Threading;
using System.Threading.Tasks;
using Dapper;

namespace ProjectName.Migration.$pascalSchema;

internal sealed class Sp$pascalProc : $contractName
{
    private readonly IDbConnection _db;

    public Sp$pascalProc(IDbConnection db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<$resultType>> ExecuteAsync($paramSignature, CancellationToken ct = default)
    {
        var rows = await _db.QueryAsync<$resultType>(
            "$fullName",
            new
            {
$anonMap
            },
            commandType: CommandType.$commandType
        );

        return rows.AsList();
    }
}
"@

        $safeBase = Get-SafeFileBase -schema $schema -proc $proc -pascalProc $pascalProc
        $contractPath = Join-Path $schemaDir "$safeBase.Contract.cs"
        $aclPath = Join-Path $schemaDir "$safeBase.Acl.cs"

        Set-Content -Path $contractPath -Value $contractText -Encoding UTF8
        Set-Content -Path $aclPath -Value $aclText -Encoding UTF8

        $manifest.Add([PSCustomObject]@{
            FullName = $fullName
            Schema = $schema
            Category = $r.Category
            Wave = $r.Wave
            Strategy = $r.Strategy
            Contract = $contractPath
            Acl = $aclPath
            Params = $params.Count
        })

        $count++
        if ($count % 250 -eq 0) {
            Write-Host ("Generados {0}/{1}" -f $count, $total)
        }
    }
    catch {
        $errors.Add([PSCustomObject]@{
            FullName = $r.FullName
            Error = $_.Exception.Message
        })
    }
}

$manifestPath = Join-Path $OutDir "stubs-manifest.json"
$manifestPayload = [ordered]@{
    metadata = [ordered]@{
        schemaVersion = "1.0"
        versionEsquema = "1.0"
        generatedAt = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
        generadoEn = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
        sourceClassificationFile = $ClassificationJson
        archivoClasificacionOrigen = $ClassificationJson
        sourceSchemaFile = $SchemaFile
        archivoSchemaOrigen = $SchemaFile
        filterWave = $Wave
        olaFiltrada = $Wave
        total = $manifest.Count
    }
    data = @($manifest)
}
$manifestPayload | ConvertTo-Json -Depth 8 | Set-Content -Path $manifestPath -Encoding UTF8

$errorsPath = Join-Path $OutDir "stubs-errors.json"
$errorsPayload = [ordered]@{
    metadata = [ordered]@{
        schemaVersion = "1.0"
        versionEsquema = "1.0"
        generatedAt = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
        generadoEn = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
        sourceClassificationFile = $ClassificationJson
        archivoClasificacionOrigen = $ClassificationJson
        sourceSchemaFile = $SchemaFile
        archivoSchemaOrigen = $SchemaFile
        filterWave = $Wave
        olaFiltrada = $Wave
        total = $errors.Count
    }
    data = @($errors)
}
$errorsPayload | ConvertTo-Json -Depth 8 | Set-Content -Path $errorsPath -Encoding UTF8

$summaryPath = Join-Path $OutDir "stubs-summary.md"
$byWave = $manifest | Group-Object Wave | Sort-Object Name
$bySchema = $manifest | Group-Object Schema | Sort-Object Count -Descending

$md = "# Generacion completa de stubs C#`n`n"
$md += "- Generado: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n"
$md += "- JSON fuente: $ClassificationJson`n"
$md += "- Schema fuente: $SchemaFile`n"
$md += "- Ola filtrada: $Wave`n"
$md += "- Total de procedimientos generados: $count`n"
$md += "- Total de procedimientos con error: $($errors.Count)`n`n"

$md += "## Por ola`n`n| Ola | Cantidad |`n|---|---:|`n"
foreach ($w in $byWave) { $md += "| $($w.Name) | $($w.Count) |`n" }

$md += "`n## Esquemas principales`n`n| Esquema | Cantidad |`n|---|---:|`n"
foreach ($s in $bySchema | Select-Object -First 20) { $md += "| $($s.Name) | $($s.Count) |`n" }

$md += "`n## Salidas`n`n"
$md += "- $manifestPath`n"
$md += "- $errorsPath`n"
$md += "- $summaryPath`n"

Set-Content -Path $summaryPath -Value $md -Encoding UTF8

Write-Host "Generacion de stubs completada"
Write-Host "Total generado: $count"
Write-Host "Total con error: $($errors.Count)"
Write-Host "Manifiesto: $manifestPath"
Write-Host "Errores: $errorsPath"
Write-Host "Resumen: $summaryPath"

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

