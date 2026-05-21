#!/bin/bash

# deploy.sh - Deploy Azure infrastructure for Agentic First demo

set -e

# Parse arguments
RESOURCE_GROUP=${1:-demo-rg}
REGION=${2:-eastus}

echo "Deploying Azure infrastructure..."
echo "Resource Group: $RESOURCE_GROUP"
echo "Region: $REGION"

# Create resource group if it doesn't exist
az group create --name $RESOURCE_GROUP --location $REGION

# Deploy Bicep template
echo "Deploying Bicep template..."
az deployment group create \
  --resource-group $RESOURCE_GROUP \
  --template-file main.bicep \
  --parameters location=$REGION

# Get deployment outputs
DEPLOYMENT=$(az deployment group show --resource-group $RESOURCE_GROUP --name main --query 'properties.outputs' -o json)

echo "✓ Deployment complete!"
echo "Outputs saved to deployment_summary.json"

# Save outputs
echo "$DEPLOYMENT" > deployment_summary.json
