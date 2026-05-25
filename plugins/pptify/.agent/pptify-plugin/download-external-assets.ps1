#Requires -Version 5.1
[CmdletBinding()]
param(
    [string]$MiniLmRepo = "sentence-transformers/all-MiniLM-L6-v2",
    [string]$MiniLmRevision = "main",
    [string]$MiniLmModelPath = "onnx/model_quint8_avx2.onnx",

    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Get-RepoRoot {
    $scriptDir = Split-Path -Parent $PSCommandPath
    return (Resolve-Path (Join-Path $scriptDir "..")).Path
}

function Save-RemoteFile {
    param(
        [Parameter(Mandatory = $true)][string]$Uri,
        [Parameter(Mandatory = $true)][string]$Destination,
        [Parameter(Mandatory = $true)][bool]$Overwrite
    )

    if ((Test-Path -LiteralPath $Destination) -and -not $Overwrite) {
        Write-Host "Exists: $Destination"
        return
    }

    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Destination) | Out-Null
    $downloadPath = "$Destination.download"
    if (Test-Path -LiteralPath $downloadPath) {
        Remove-Item -LiteralPath $downloadPath -Force
    }

    Write-Host "Downloading $Uri"
    Invoke-WebRequest -Uri $Uri -OutFile $downloadPath -Headers @{ "User-Agent" = "pptify-external-assets" }
    Move-Item -LiteralPath $downloadPath -Destination $Destination -Force
    Write-Host "Wrote: $Destination"
}

function Join-HuggingFaceResolveUrl {
    param(
        [Parameter(Mandatory = $true)][string]$Repo,
        [Parameter(Mandatory = $true)][string]$Revision,
        [Parameter(Mandatory = $true)][string]$Path
    )

    $encodedPath = (($Path -split "/") | ForEach-Object { [uri]::EscapeDataString($_) }) -join "/"
    return "https://huggingface.co/$Repo/resolve/$Revision/$encodedPath"
}

function Install-MiniLm {
    param([Parameter(Mandatory = $true)][string]$RepoRoot)

    $targetDir = Join-Path $RepoRoot "pptify-plugin\external\all-MiniLM-L6-v2"
    $files = @(
        @{ Source = $MiniLmModelPath; Target = "model_quantized.onnx" },
        @{ Source = "tokenizer.json"; Target = "tokenizer.json" },
        @{ Source = "tokenizer_config.json"; Target = "tokenizer_config.json" }
    )

    foreach ($file in $files) {
        $uri = Join-HuggingFaceResolveUrl -Repo $MiniLmRepo -Revision $MiniLmRevision -Path $file.Source
        $destination = Join-Path $targetDir $file.Target
        Save-RemoteFile -Uri $uri -Destination $destination -Overwrite ([bool]$Force)
    }
}

$repoRoot = Get-RepoRoot

Install-MiniLm -RepoRoot $repoRoot