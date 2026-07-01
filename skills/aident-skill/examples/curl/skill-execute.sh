#!/bin/bash
# Execute a capability by name
# Usage: AIDENT_TOKEN=... ./skill-execute.sh gmail_tools.gmail_send_email '{"to":"user@example.com","subject":"Hello","body":"World"}'

BASE_URL="${AIDENT_BASE_URL:-https://app.aident.ai}"
CAPABILITY_NAME="${1:?Usage: ./skill-execute.sh <capability_name> <input_json>}"
INPUT_JSON="${2:?Usage: ./skill-execute.sh <capability_name> <input_json>}"

curl -s -X POST "$BASE_URL/api/openapi/loadout/loadout_capabilities_execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AIDENT_TOKEN" \
  -d "{
    \"name\": \"$CAPABILITY_NAME\",
    \"input\": $INPUT_JSON
  }" | python3 -m json.tool
