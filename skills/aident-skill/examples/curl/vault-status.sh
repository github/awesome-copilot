#!/bin/bash
# List connected Loadout Vault integrations
# Usage: AIDENT_TOKEN=... ./vault-status.sh

BASE_URL="${AIDENT_BASE_URL:-https://app.aident.ai}"

curl -s -X POST "$BASE_URL/api/openapi/loadout/loadout_vault_status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AIDENT_TOKEN" \
  -d '{}' | python3 -m json.tool
