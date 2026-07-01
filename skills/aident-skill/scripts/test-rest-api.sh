#!/bin/bash
# Test OpenAPI package API and OOB OAuth flow
# Usage: ./aident-skill/scripts/test-rest-api.sh [BASE_URL]
#
# Credentials are saved to ~/.aident/credentials.json so you only need
# to authenticate once. Delete that file to force re-authentication.

set -euo pipefail

CRED_FILE="$HOME/.aident/credentials.json"
PASS=0
FAIL=0
TOTAL=0

green() { printf "\033[32m%s\033[0m\n" "$1"; }
red()   { printf "\033[31m%s\033[0m\n" "$1"; }
bold()  { printf "\033[1m%s\033[0m\n" "$1"; }

assert_status() {
  local label="$1" expected="$2" actual="$3"
  TOTAL=$((TOTAL + 1))
  if [ "$actual" -eq "$expected" ]; then
    green "  PASS  $label (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    red "  FAIL  $label — expected HTTP $expected, got HTTP $actual"
    FAIL=$((FAIL + 1))
  fi
}

assert_json_field() {
  local label="$1" body="$2" field="$3"
  TOTAL=$((TOTAL + 1))
  if echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); assert '$field' in d" 2>/dev/null; then
    green "  PASS  $label (response has \"$field\")"
    PASS=$((PASS + 1))
  else
    red "  FAIL  $label — response missing \"$field\""
    FAIL=$((FAIL + 1))
  fi
}

assert_json_value() {
  local label="$1" body="$2" expr="$3"
  TOTAL=$((TOTAL + 1))
  if echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); assert $expr" 2>/dev/null; then
    green "  PASS  $label"
    PASS=$((PASS + 1))
  else
    red "  FAIL  $label"
    FAIL=$((FAIL + 1))
  fi
}

save_credentials() {
  mkdir -p "$(dirname "$CRED_FILE")"
  python3 -c "
import json
d = {'base_url': '$BASE_URL', 'client_id': '$CLIENT_ID', 'access_token': '$ACCESS_TOKEN'}
with open('$CRED_FILE', 'w') as f: json.dump(d, f, indent=2)
"
  echo "  Credentials saved to $CRED_FILE"
}

# ------------------------------------------------------------------
# Step 1: Resolve credentials
# ------------------------------------------------------------------
bold "=== OpenAPI Package API E2E Test ==="
echo ""

# Priority: CLI arg > AIDENT_TOKEN env > credentials file > OOB flow
if [ -n "${AIDENT_TOKEN:-}" ]; then
  BASE_URL="${1:-${AIDENT_BASE_URL:-http://localhost:3000}}"
  ACCESS_TOKEN="$AIDENT_TOKEN"
  CLIENT_ID=""
  bold "Step 1: Using AIDENT_TOKEN from environment"
  echo "  Target: $BASE_URL"
  echo ""
elif [ -f "$CRED_FILE" ]; then
  SAVED_BASE_URL=$(python3 -c "import json; print(json.load(open('$CRED_FILE')).get('base_url',''))" 2>/dev/null || true)
  SAVED_TOKEN=$(python3 -c "import json; print(json.load(open('$CRED_FILE')).get('access_token',''))" 2>/dev/null || true)
  SAVED_CLIENT_ID=$(python3 -c "import json; print(json.load(open('$CRED_FILE')).get('client_id',''))" 2>/dev/null || true)

  if [ -n "$SAVED_TOKEN" ]; then
    BASE_URL="${1:-${AIDENT_BASE_URL:-$SAVED_BASE_URL}}"
    ACCESS_TOKEN="$SAVED_TOKEN"
    CLIENT_ID="$SAVED_CLIENT_ID"
    bold "Step 1: Loaded credentials from $CRED_FILE"
    echo "  Target: $BASE_URL"
    echo ""
  fi
fi

# If we still don't have a token, run the OOB flow
if [ -z "${ACCESS_TOKEN:-}" ]; then
  BASE_URL="${1:-${AIDENT_BASE_URL:-http://localhost:3000}}"
  bold "Step 1: Register OAuth client"
  echo "  Target: $BASE_URL"
  echo ""

  REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/mcp/oauth/register" \
    -H "Content-Type: application/json" \
    -d "{
      \"client_name\": \"test-rest-e2e-$(date +%s)\",
      \"redirect_uris\": [\"$BASE_URL/mcp/oob\"]
    }")

  REGISTER_STATUS=$(echo "$REGISTER_RESPONSE" | tail -1)
  REGISTER_BODY=$(echo "$REGISTER_RESPONSE" | sed '$d')

  assert_status "Client registration" 201 "$REGISTER_STATUS"
  assert_json_field "Registration response" "$REGISTER_BODY" "client_id"

  CLIENT_ID=$(echo "$REGISTER_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['client_id'])")
  echo "  Client ID: $CLIENT_ID"
  echo ""

  bold "Step 2: Authorize via OOB flow"
  AUTHORIZE_URL="$BASE_URL/api/mcp/oauth/authorize?client_id=$CLIENT_ID&redirect_uri=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$BASE_URL/mcp/oob'))")&response_type=code"

  echo "  Opening browser to authorize..."
  echo "  URL: $AUTHORIZE_URL"
  echo ""

  if command -v open &>/dev/null; then
    open "$AUTHORIZE_URL"
  elif command -v xdg-open &>/dev/null; then
    xdg-open "$AUTHORIZE_URL"
  else
    echo "  (Could not detect browser command — open the URL above manually)"
  fi

  echo "  1. Log in if prompted"
  echo "  2. Click 'Approve'"
  echo "  3. Copy the access token from the OOB page"
  echo ""
  read -rp "  Paste your access token here: " ACCESS_TOKEN

  if [ -z "$ACCESS_TOKEN" ]; then
    red "No token provided. Aborting."
    exit 1
  fi

  save_credentials
  echo ""
fi

# ------------------------------------------------------------------
bold "Step 3: Test OpenAPI endpoint"
echo ""
OPENAPI_DOC_PATH="$BASE_URL/api/openapi/loadout.json"
OPENAPI_OPS_PATH="$BASE_URL/api/openapi/loadout/operations"
OPENAPI_EXEC_PATH="$BASE_URL/api/openapi/loadout"

# Test 3a: GET /api/openapi/loadout.json -- fetch schema (authenticated)
bold "  3a. GET /api/openapi/loadout.json -- fetch schema"
LIST_RESPONSE=$(curl -s -w "\n%{http_code}" "$OPENAPI_DOC_PATH" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
LIST_STATUS=$(echo "$LIST_RESPONSE" | tail -1)
LIST_BODY=$(echo "$LIST_RESPONSE" | sed '$d')

assert_status "Fetch OpenAPI document" 200 "$LIST_STATUS"
assert_json_field "OpenAPI response" "$LIST_BODY" "paths"
assert_json_field "OpenAPI response" "$LIST_BODY" "x-aident-command-catalog"
assert_json_value "Has Loadout capabilities search operation" "$LIST_BODY" "'/api/openapi/loadout/loadout_capabilities_search' in d['paths']"
echo ""

# Test 3b: GET /api/openapi/loadout/operations -- compact operations
bold "  3b. GET /api/openapi/loadout/operations -- compact operations"
AUTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$OPENAPI_OPS_PATH" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
AUTH_STATUS=$(echo "$AUTH_RESPONSE" | tail -1)
AUTH_BODY=$(echo "$AUTH_RESPONSE" | sed '$d')

assert_status "Fetch operations" 200 "$AUTH_STATUS"
assert_json_field "operations response" "$AUTH_BODY" "commands"
assert_json_value "Has Loadout vault status operation" "$AUTH_BODY" "any(c.get('operationId') == 'loadout_vault_status' for c in d['commands'])"
echo ""

# Test 3c: POST operation -- call vault status
bold "  3c. POST /api/openapi/loadout/loadout_vault_status -- call vault status"
VAULT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$OPENAPI_EXEC_PATH/loadout_vault_status" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')
VAULT_STATUS=$(echo "$VAULT_RESPONSE" | tail -1)
VAULT_BODY=$(echo "$VAULT_RESPONSE" | sed '$d')

assert_status "Call vault status" 200 "$VAULT_STATUS"
assert_json_field "vault response" "$VAULT_BODY" "success"
echo ""

# Test 3d: POST operation -- call capabilities search
bold "  3d. POST /api/openapi/loadout/loadout_capabilities_search -- call capabilities search"
SEARCH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$OPENAPI_EXEC_PATH/loadout_capabilities_search" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "send email", "limit": 3}')
SEARCH_STATUS=$(echo "$SEARCH_RESPONSE" | tail -1)
SEARCH_BODY=$(echo "$SEARCH_RESPONSE" | sed '$d')

assert_status "Call capabilities_search" 200 "$SEARCH_STATUS"
assert_json_field "capabilities_search response" "$SEARCH_BODY" "success"
echo ""

# ------------------------------------------------------------------
bold "Step 4: Error cases"
echo ""

# Test 4a: No auth header — expect 401
bold "  4a. GET without auth — expect 401"
NOAUTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$OPENAPI_DOC_PATH")
NOAUTH_STATUS=$(echo "$NOAUTH_RESPONSE" | tail -1)
NOAUTH_BODY=$(echo "$NOAUTH_RESPONSE" | sed '$d')

assert_status "No auth" 401 "$NOAUTH_STATUS"
assert_json_field "401 response" "$NOAUTH_BODY" "error"
echo ""

# Test 4b: Invalid token — expect 401
bold "  4b. GET with invalid token — expect 401"
BADTOKEN_RESPONSE=$(curl -s -w "\n%{http_code}" "$OPENAPI_DOC_PATH" \
  -H "Authorization: Bearer invalid-token-12345")
BADTOKEN_STATUS=$(echo "$BADTOKEN_RESPONSE" | tail -1)

assert_status "Invalid token" 401 "$BADTOKEN_STATUS"
echo ""

# Test 4c: POST with malformed body — expect 400
bold "  4c. POST with bad body — expect 400"
BADBODY_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$OPENAPI_EXEC_PATH/loadout_capabilities_search" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[]')
BADBODY_STATUS=$(echo "$BADBODY_RESPONSE" | tail -1)
BADBODY_BODY=$(echo "$BADBODY_RESPONSE" | sed '$d')

assert_status "Bad request body" 400 "$BADBODY_STATUS"
assert_json_field "400 response" "$BADBODY_BODY" "error"
echo ""

# Test 4d: POST with non-JSON body — expect 400
bold "  4d. POST with non-JSON body — expect 400"
NONJSON_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$OPENAPI_EXEC_PATH/loadout_capabilities_search" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d 'not json at all')
NONJSON_STATUS=$(echo "$NONJSON_RESPONSE" | tail -1)

assert_status "Non-JSON body" 400 "$NONJSON_STATUS"
echo ""

# Test 4e: POST with unknown operation -- expect 404
bold "  4e. POST with nonexistent operation -- expect 404"
UNKNOWN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$OPENAPI_EXEC_PATH/loadout_nonexistent_operation" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')
UNKNOWN_STATUS=$(echo "$UNKNOWN_RESPONSE" | tail -1)
assert_status "Unknown operation" 404 "$UNKNOWN_STATUS"
echo ""

# ------------------------------------------------------------------
bold "=== Results ==="
echo ""
echo "  Total: $TOTAL"
green "  Passed: $PASS"
if [ "$FAIL" -gt 0 ]; then
  red "  Failed: $FAIL"
  exit 1
else
  green "  All tests passed!"
fi
