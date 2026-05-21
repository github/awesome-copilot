#!/usr/bin/env powershell
<#
Get Storage Connection String from deployment
(No se expone en outputs por seguridad)
#>

param(
    [string]$ResourceGroup = "rag-defensa-rg",
    [string]$StorageAccountName = "ragdefensastorage"
)

# Obtener storage key
$keys = az storage account keys list `
  --resource-group $ResourceGroup `
  --account-name $StorageAccountName `
  --query "[0].value" `
  --output tsv

$connectionString = "DefaultEndpointsProtocol=https;AccountName=$StorageAccountName;AccountKey=$keys;EndpointSuffix=core.windows.net"

Write-Host "📋 Connection String para .env:" -ForegroundColor Green
Write-Host ""
Write-Host "AZURE_STORAGE_CONNECTION_STRING=$connectionString"
Write-Host ""
Write-Host "✅ Cópiala y pégala en .env"
