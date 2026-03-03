#!/bin/bash
# query_capacity.sh
# Queries available capacity for an Azure OpenAI model.
#
# Usage:
#   ./query_capacity.sh <model-name> [model-version] [region] [sku]
# Examples:
#   ./query_capacity.sh o3-mini                          # List versions
#   ./query_capacity.sh o3-mini 2025-01-31               # All regions
#   ./query_capacity.sh o3-mini 2025-01-31 eastus2       # Specific region
#   ./query_capacity.sh o3-mini 2025-01-31 "" Standard   # Different SKU

set -euo pipefail

MODEL_NAME="${1:?Usage: $0 <model-name> [model-version] [region] [sku]}"
MODEL_VERSION="${2:-}"
REGION="${3:-}"
SKU="${4:-GlobalStandard}"

SUB_ID=$(az account show --query id -o tsv)

# If no version, list available versions
if [ -z "$MODEL_VERSION" ]; then
    LOC="${REGION:-eastus}"
    echo "Available versions for $MODEL_NAME:"
    az cognitiveservices model list --location "$LOC" \
        --query "[?model.name=='$MODEL_NAME'].{Version:model.version, Format:model.format}" \
        --output table 2>/dev/null
    exit 0
fi

# Build URL
if [ -n "$REGION" ]; then
    URL="https://management.azure.com/subscriptions/${SUB_ID}/providers/Microsoft.CognitiveServices/locations/${REGION}/modelCapacities"
else
    URL="https://management.azure.com/subscriptions/${SUB_ID}/providers/Microsoft.CognitiveServices/modelCapacities"
fi

# Query capacity
CAPACITY_RESULT=$(az rest --method GET --url "$URL" \
    --url-parameters api-version=2024-10-01 modelFormat=OpenAI modelName="$MODEL_NAME" modelVersion="$MODEL_VERSION" \
    2>/dev/null)

# Get regions with capacity
REGIONS_WITH_CAP=$(echo "$CAPACITY_RESULT" | jq -r ".value[] | select(.properties.skuName==\"$SKU\" and .properties.availableCapacity > 0) | .location" 2>/dev/null | sort -u)

if [ -z "$REGIONS_WITH_CAP" ]; then
    echo "No capacity found for $MODEL_NAME v$MODEL_VERSION ($SKU)"
    echo "Try a different SKU or version."
    exit 0
fi

echo "Capacity: $MODEL_NAME v$MODEL_VERSION ($SKU)"
echo ""
printf "%-22s %-12s %-15s %s\n" "Region" "Available" "Quota" "SKU"
printf -- '-%.0s' {1..60}; echo ""

for region in $REGIONS_WITH_CAP; do
    avail=$(echo "$CAPACITY_RESULT" | jq -r ".value[] | select(.location==\"$region\" and .properties.skuName==\"$SKU\") | .properties.availableCapacity" 2>/dev/null | head -1)

    # Check subscription quota
    usage_json=$(az cognitiveservices usage list --location "$region" --subscription "$SUB_ID" -o json 2>/dev/null || echo "[]")
    quota_avail=$(echo "$usage_json" | jq -r --arg name "OpenAI.$SKU.$MODEL_NAME" \
        '[.[] | select(.name.value == $name)] | if length > 0 then .[0].limit - .[0].currentValue else 0 end' 2>/dev/null || echo "?")

    if [ "$quota_avail" = "0" ]; then
        quota_display="0 (none)"
    elif [ "$quota_avail" = "?" ]; then
        quota_display="?"
    else
        quota_display="${quota_avail}K"
    fi

    printf "%-22s %-12s %-15s %s\n" "$region" "${avail}K TPM" "$quota_display" "$SKU"
done
