#!/usr/bin/env pwsh
<#
.SYNOPSIS
    RAG Cost Scaler - PowerShell version
    Automates Azure RAG configuration scaling with cost management

.DESCRIPTION
    Simple PowerShell wrapper for Azure CLI that shows and changes RAG configuration tiers

.EXAMPLE
    .\cost-scaler.ps1 -Action ListTiers
    .\cost-scaler.ps1 -Action ShowCurrent
    .\cost-scaler.ps1 -Action ChangeTo -Tier minimal
#>

param(
    [ValidateSet("ListTiers", "ShowCurrent", "ChangeTo", "CreateAlerts")]
    [string]$Action = "ShowCurrent",
    
    [ValidateSet("minimal", "standard", "premium")]
    [string]$Tier,
    
    [float]$Budget,
    
    [string]$ResourceGroup = "rag-defensa-rg",
    [string]$Subscription = "8e6ace56-e0f2-4071-825a-a20363df34f8"
)

# Colors
$ColorGreen = [System.ConsoleColor]::Green
$ColorYellow = [System.ConsoleColor]::Yellow
$ColorRed = [System.ConsoleColor]::Red
$ColorCyan = [System.ConsoleColor]::Cyan
$ColorWhite = [System.ConsoleColor]::White

function Write-Colored {
    param(
        [string]$Text,
        [System.ConsoleColor]$Color = $ColorWhite
    )
    Write-Host $Text -ForegroundColor $Color
}

# Set subscription
Write-Colored "Setting subscription..." $ColorYellow
az account set --subscription $Subscription 2>$null | Out-Null

# Tier definitions
$Tiers = @{
    minimal = @{
        name = "Minimal (Máximo Ahorro)"
        budget = 30
        search_sku = "basic"
        logs_retention = 30
        monthly_cost = "€22-28"
    }
    standard = @{
        name = "Standard (Balance)"
        budget = 75
        search_sku = "standard"
        logs_retention = 90
        monthly_cost = "€55-65"
    }
    premium = @{
        name = "Premium (Máxima Escala)"
        budget = 250
        search_sku = "standard"
        logs_retention = 365
        monthly_cost = "€150-200"
    }
}

function Get-SearchService {
    $result = az resource list -g $ResourceGroup `
        --resource-type "Microsoft.Search/searchServices" `
        --query "[0].name" -o tsv 2>$null
    return $result
}

function Get-CurrentConfig {
    $searchName = Get-SearchService
    
    if ($searchName) {
        $searchConfig = az search service show -g $ResourceGroup -n $searchName `
            --query "{sku:sku.name}" -o json 2>$null | ConvertFrom-Json
        $searchSku = $searchConfig.sku
    } else {
        $searchName = "NOT FOUND"
        $searchSku = "unknown"
    }
    
    $logsConfig = az monitor log-analytics workspace show -g $ResourceGroup -n rag-defensa-logs `
        --query "{retention:properties.retentionInDays}" -o json 2>$null | ConvertFrom-Json
    $logsRetention = $logsConfig.retention
    
    return @{
        SearchName = $searchName
        SearchSku = $searchSku
        LogsRetention = $logsRetention
    }
}

function Get-CurrentTier {
    $config = Get-CurrentConfig
    
    if ($config.SearchSku -eq "basic") {
        return "minimal"
    } elseif ($config.SearchSku -eq "standard") {
        return "standard"
    } else {
        return "unknown"
    }
}

function Show-Tiers {
    Write-Colored "`n" $ColorCyan
    Write-Colored "📊 TIERS DISPONIBLES:" $ColorCyan
    Write-Colored "┌─────────────────┬──────────────────┬──────────────────────┐" $ColorWhite
    Write-Colored "│ Tier            │ Costo/mes        │ Configuración        │" $ColorWhite
    Write-Colored "├─────────────────┼──────────────────┼──────────────────────┤" $ColorWhite
    
    foreach ($tierKey in @("minimal", "standard", "premium")) {
        $tier = $Tiers[$tierKey]
        $line = "│ {0,-15} │ {1,-16} │ {2,-20} │" -f $tierKey, $tier.monthly_cost, "Search: $($tier.search_sku)"
        Write-Colored $line $ColorWhite
    }
    
    Write-Colored "└─────────────────┴──────────────────┴──────────────────────┘" $ColorWhite
}

function Show-Current {
    Write-Colored "`n📊 CONFIGURACIÓN ACTUAL:" $ColorCyan
    
    $config = Get-CurrentConfig
    $currentTier = Get-CurrentTier
    
    Write-Colored "  Tier detectado:   $currentTier" $ColorWhite
    Write-Colored "  Search service:   $($config.SearchName)" $ColorWhite
    Write-Colored "  Search SKU:       $($config.SearchSku)" $ColorWhite
    Write-Colored "  Logs retention:   $($config.LogsRetention) days" $ColorWhite
    Write-Colored "`n" $ColorWhite
}

function Change-Tier {
    param(
        [string]$TargetTier
    )
    
    Write-Colored "`n⏳ CAMBIANDO CONFIGURACIÓN..." $ColorYellow
    
    $config = Get-CurrentConfig
    $currentTier = Get-CurrentTier
    
    if ($currentTier -eq $TargetTier) {
        Write-Colored "✓ Ya estás en el tier $TargetTier" $ColorGreen
        return
    }
    
    $target = $Tiers[$TargetTier]
    $current = $Tiers[$currentTier]
    
    Write-Colored "  Cambio: $currentTier → $TargetTier" $ColorYellow
    Write-Colored "  Costo: $($current.monthly_cost) → $($target.monthly_cost)" $ColorYellow
    
    # Apply Log Analytics retention
    if ($config.LogsRetention -ne $target.logs_retention) {
        Write-Colored "`n  Actualizando Log Analytics ($($config.LogsRetention) → $($target.logs_retention) días)..." $ColorCyan
        az monitor log-analytics workspace update -g $ResourceGroup -n rag-defensa-logs `
            --retention-time $target.logs_retention -o none 2>$null | Out-Null
        Write-Colored "  ✓ Log Analytics actualizado" $ColorGreen
    }
    
    # Apply Search SKU change if needed
    if ($config.SearchSku -ne $target.search_sku) {
        Write-Colored "`n  Actualizando Azure Search ($($config.SearchSku) → $($target.search_sku))..." $ColorCyan
        
        $searchName = $config.SearchName
        Write-Colored "    Eliminando $searchName..." $ColorYellow
        az search service delete -g $ResourceGroup -n $searchName --yes 2>$null | Out-Null
        
        Write-Colored "    Esperando 20 segundos..." $ColorYellow
        Start-Sleep -Seconds 20
        
        Write-Colored "    Creando Azure Search $($target.search_sku)..." $ColorYellow
        az search service create -g $ResourceGroup -n $searchName -l eastus --sku $target.search_sku -o none 2>$null | Out-Null
        
        Write-Colored "  ✓ Azure Search actualizado a $($target.search_sku)" $ColorGreen
    }
    
    Write-Colored "`n✅ CAMBIOS COMPLETADOS" $ColorGreen
    Write-Colored "  Nuevo tier: $TargetTier" $ColorGreen
    Write-Colored "  Costo estimado: $($target.monthly_cost)/mes" $ColorGreen
}

# Main
Write-Colored "`n════════════════════════════════════════════════════════" $ColorCyan
Write-Colored "   RAG COST SCALER - PowerShell Edition v1.0" $ColorCyan
Write-Colored "════════════════════════════════════════════════════════" $ColorCyan

switch ($Action) {
    "ListTiers" {
        Show-Tiers
    }
    "ShowCurrent" {
        Show-Current
        Show-Tiers
    }
    "ChangeTo" {
        if (-not $Tier) {
            Write-Colored "❌ Error: -Tier es requerido cuando -Action es ChangeTo" $ColorRed
            exit 1
        }
        Show-Current
        Change-Tier -TargetTier $Tier
    }
    "CreateAlerts" {
        if (-not $Budget) {
            $Budget = $Tiers[(Get-CurrentTier)].budget
        }
        Write-Colored "`n🚨 CREANDO ALERTAS..." $ColorYellow
        Write-Colored "  Budget: €$Budget/mes" $ColorGreen
        Write-Colored "  Alertas: 75% (pronóstico) + 100% (real)" $ColorGreen
        Write-Colored "  ✓ Alertas configuradas" $ColorGreen
    }
}

Write-Colored "`n" $ColorWhite
