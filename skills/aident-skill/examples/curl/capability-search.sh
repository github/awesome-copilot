#!/bin/bash
# Search for skills and integrations by keyword
# Usage: AIDENT_TOKEN=... ./capability-search.sh "send email"

BASE_URL="${AIDENT_BASE_URL:-https://app.aident.ai}"
QUERY="${1:-send email}"

curl -s -X POST "$BASE_URL/api/openapi/loadout/loadout_capabilities_search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AIDENT_TOKEN" \
  -d "{ \"query\": \"$QUERY\", \"limit\": 5 }" | python3 -m json.tool
