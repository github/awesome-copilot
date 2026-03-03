# Generate Azure AI Foundry portal URL for a model deployment
# This script creates a direct clickable link to view a deployment in the Azure AI Foundry portal
#
# NOTE: The encoding scheme for the subscription ID portion is proprietary to Azure AI Foundry.
# This script uses a GUID byte encoding approach, but may need adjustment based on the actual encoding used.

param(
    [Parameter(Mandatory=$true)]
    [string]$SubscriptionId,
    
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroup,
    
    [Parameter(Mandatory=$true)]
    [string]$FoundryResource,
    
    [Parameter(Mandatory=$true)]
    [string]$ProjectName,
    
    [Parameter(Mandatory=$true)]
    [string]$DeploymentName
)

function Get-SubscriptionIdEncoded {
    param([string]$SubscriptionId)
    
    # Parse GUID and convert to bytes in string order (big-endian)
    # Not using ToByteArray() because it uses little-endian format
    $guidString = $SubscriptionId.Replace('-', '')
    $bytes = New-Object byte[] 16
    for ($i = 0; $i -lt 16; $i++) {
        $bytes[$i] = [Convert]::ToByte($guidString.Substring($i * 2, 2), 16)
    }
    
    # Encode as base64url
    $base64 = [Convert]::ToBase64String($bytes)
    $urlSafe = $base64.Replace('+', '-').Replace('/', '_').TrimEnd('=')
    return $urlSafe
}

function Get-FoundryDeploymentUrl {
    param(
        [string]$SubscriptionId,
        [string]$ResourceGroup,
        [string]$FoundryResource,
        [string]$ProjectName,
        [string]$DeploymentName
    )
    
    # Encode subscription ID
    $encodedSubId = Get-SubscriptionIdEncoded -SubscriptionId $SubscriptionId
    
    # Build the encoded resource path
    # Format: {encoded-sub-id},{resource-group},,{foundry-resource},{project-name}
    # Note: Two commas between resource-group and foundry-resource
    $encodedPath = "$encodedSubId,$ResourceGroup,,$FoundryResource,$ProjectName"
    
    # Build the full URL
    $baseUrl = "https://ai.azure.com/nextgen/r/"
    $deploymentPath = "/build/models/deployments/$DeploymentName/details"
    
    return "$baseUrl$encodedPath$deploymentPath"
}

# Generate and output the URL
$url = Get-FoundryDeploymentUrl `
    -SubscriptionId $SubscriptionId `
    -ResourceGroup $ResourceGroup `
    -FoundryResource $FoundryResource `
    -ProjectName $ProjectName `
    -DeploymentName $DeploymentName

Write-Output $url
