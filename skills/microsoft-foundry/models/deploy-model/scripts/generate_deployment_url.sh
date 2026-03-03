#!/bin/bash
# Generate Azure AI Foundry portal URL for a model deployment
# This script creates a direct clickable link to view a deployment in the Azure AI Foundry portal

set -e

# Function to display usage
usage() {
    cat << EOF
Usage: $0 --subscription SUBSCRIPTION_ID --resource-group RESOURCE_GROUP \\
          --foundry-resource FOUNDRY_RESOURCE --project PROJECT_NAME \\
          --deployment DEPLOYMENT_NAME

Generate Azure AI Foundry deployment URL

Required arguments:
  --subscription        Azure subscription ID (GUID)
  --resource-group      Resource group name
  --foundry-resource    Foundry resource (account) name
  --project             Project name
  --deployment          Deployment name

Example:
  $0 --subscription d5320f9a-73da-4a74-b639-83efebc7bb6f \\
     --resource-group bani-host \\
     --foundry-resource banide-host-resource \\
     --project banide-host \\
     --deployment text-embedding-ada-002
EOF
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --subscription)
            SUBSCRIPTION_ID="$2"
            shift 2
            ;;
        --resource-group)
            RESOURCE_GROUP="$2"
            shift 2
            ;;
        --foundry-resource)
            FOUNDRY_RESOURCE="$2"
            shift 2
            ;;
        --project)
            PROJECT_NAME="$2"
            shift 2
            ;;
        --deployment)
            DEPLOYMENT_NAME="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

# Validate required arguments
if [ -z "$SUBSCRIPTION_ID" ] || [ -z "$RESOURCE_GROUP" ] || [ -z "$FOUNDRY_RESOURCE" ] || \
   [ -z "$PROJECT_NAME" ] || [ -z "$DEPLOYMENT_NAME" ]; then
    echo "Error: Missing required arguments"
    usage
fi

# Convert subscription GUID to bytes (big-endian/string order) and encode as base64url
# Remove hyphens from GUID
GUID_HEX=$(echo "$SUBSCRIPTION_ID" | tr -d '-')

# Convert hex string to bytes and base64 encode
# Using xxd to convert hex to binary, then base64 encode
ENCODED_SUB=$(echo "$GUID_HEX" | xxd -r -p | base64 | tr '+' '-' | tr '/' '_' | tr -d '=')

# Build the encoded resource path
# Format: {encoded-sub-id},{resource-group},,{foundry-resource},{project-name}
# Note: Two commas between resource-group and foundry-resource
ENCODED_PATH="${ENCODED_SUB},${RESOURCE_GROUP},,${FOUNDRY_RESOURCE},${PROJECT_NAME}"

# Build the full URL
BASE_URL="https://ai.azure.com/nextgen/r/"
DEPLOYMENT_PATH="/build/models/deployments/${DEPLOYMENT_NAME}/details"

echo "${BASE_URL}${ENCODED_PATH}${DEPLOYMENT_PATH}"
