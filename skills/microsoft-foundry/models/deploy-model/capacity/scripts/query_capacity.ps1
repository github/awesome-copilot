<#
.SYNOPSIS
    Queries available capacity for an Azure OpenAI model and validates if a target is achievable.
.PARAMETER ModelName
    The model name (e.g., "gpt-4o", "o3-mini")
.PARAMETER ModelVersion
    The model version (e.g., "2025-01-31"). If omitted, lists available versions.
.PARAMETER Region
    Optional. Check capacity in a specific region only.
.PARAMETER SKU
    SKU to check (default: GlobalStandard)
.EXAMPLE
    .\query_capacity.ps1 -ModelName o3-mini
    .\query_capacity.ps1 -ModelName o3-mini -ModelVersion 2025-01-31 -Region eastus2
#>
param(
    [Parameter(Mandatory)][string]$ModelName,
    [string]$ModelVersion,
    [string]$Region,
    [string]$SKU = "GlobalStandard"
)

$ErrorActionPreference = "Stop"

$subId = az account show --query id -o tsv

# If no version provided, list available versions first
if (-not $ModelVersion) {
    Write-Host "Available versions for $ModelName`:"
    $loc = if ($Region) { $Region } else { "eastus" }
    az cognitiveservices model list --location $loc `
        --query "[?model.name=='$ModelName'].{Version:model.version, Format:model.format}" `
        --output table 2>$null
    return
}

# Build URL parameters
$urlParams = @("api-version=2024-10-01", "modelFormat=OpenAI", "modelName=$ModelName", "modelVersion=$ModelVersion")

if ($Region) {
    $url = "https://management.azure.com/subscriptions/$subId/providers/Microsoft.CognitiveServices/locations/$Region/modelCapacities"
} else {
    $url = "https://management.azure.com/subscriptions/$subId/providers/Microsoft.CognitiveServices/modelCapacities"
}

$raw = az rest --method GET --url $url --url-parameters @urlParams 2>$null | Out-String | ConvertFrom-Json

# Filter by SKU
$filtered = $raw.value | Where-Object { $_.properties.skuName -eq $SKU -and $_.properties.availableCapacity -gt 0 }

if (-not $filtered) {
    Write-Host "No capacity found for $ModelName v$ModelVersion ($SKU)" -ForegroundColor Red
    Write-Host "Try a different SKU or version."
    return
}

Write-Host "Capacity: $ModelName v$ModelVersion ($SKU)"
Write-Host ""
$filtered | ForEach-Object {
    # Check subscription quota for this region
    $quotaDisplay = "?"
    try {
        $usageData = az cognitiveservices usage list --location $_.location --subscription $subId -o json 2>$null | Out-String | ConvertFrom-Json
        $usageEntry = $usageData | Where-Object { $_.name.value -eq "OpenAI.$SKU.$ModelName" }
        if ($usageEntry) {
            $quotaAvail = [int]$usageEntry.limit - [int]$usageEntry.currentValue
            $quotaDisplay = if ($quotaAvail -gt 0) { "${quotaAvail}K" } else { "0 (at limit)" }
        } else {
            $quotaDisplay = "0 (none)"
        }
    } catch {
        $quotaDisplay = "?"
    }
    [PSCustomObject]@{
        Region    = $_.location
        SKU       = $_.properties.skuName
        Available = "$($_.properties.availableCapacity)K TPM"
        Quota     = $quotaDisplay
    }
} | Sort-Object { [int]($_.Available -replace '[^\d]','') } -Descending | Format-Table -AutoSize
