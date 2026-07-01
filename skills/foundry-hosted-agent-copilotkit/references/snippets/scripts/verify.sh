#!/usr/bin/env bash
# Structural checks — no network calls, no running services required.
# Verifies the file layout, the bridge wiring, the HITL contract, the
# FoundryChatClient requirement, agent-name consistency, and MCR base images.
# Adapt the tool/file names below if you renamed anything from the snippets.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAIL=0

pass() { echo "  OK   $1"; }
fail() { echo "  FAIL $1"; FAIL=1; }

check_file() {
  if [ -f "$ROOT/$1" ]; then pass "$1 exists"; else fail "$1 is missing"; fi
}

echo "== Layout =="
check_file "hosted/responses/agent.py"
check_file "hosted/responses/main.py"
check_file "hosted/responses/agent.yaml"
check_file "hosted/responses/Dockerfile"
check_file "hosted/azure.yaml"
check_file "backend/bridge_app.py"
check_file "backend/requirements.txt"
check_file "backend/Dockerfile"
check_file "frontend/package.json"
check_file "frontend/app/providers.tsx"
check_file "frontend/app/api/copilotkit/[[...slug]]/route.ts"
check_file "frontend/components/ApprovalHitl.tsx"

AGENT_PY="$ROOT/hosted/responses/agent.py"
BRIDGE_PY="$ROOT/backend/bridge_app.py"

echo "== hosted/responses/agent.py: FoundryChatClient + HITL tool =="
if grep -q "FoundryChatClient" "$AGENT_PY"; then
  pass "uses FoundryChatClient (Responses) — required for hosted mcp_approval_response resume"
else
  fail "does NOT use FoundryChatClient — Chat Completions 500s on hosted approve-resume"
fi
if grep -q 'approval_mode="always_require"' "$AGENT_PY"; then
  pass "at least one tool has approval_mode=\"always_require\""
else
  fail "no consequential tool is gated with approval_mode=\"always_require\""
fi
if grep -q 'approval_mode="never_require"' "$AGENT_PY"; then
  pass "has at least one read (no side-effect) tool"
else
  fail "no read-only tool found"
fi

echo "== backend/bridge_app.py: forwards HITL, translates the Responses stream =="
if grep -q "mcp_approval_response" "$BRIDGE_PY"; then
  pass "forwards mcp_approval_response on approve/reject (re-executes server-side)"
else
  fail "never sends mcp_approval_response — HITL approve would not re-execute"
fi
if grep -q "confirm_changes" "$BRIDGE_PY"; then
  pass "surfaces the gated tool as an approval-request card"
else
  fail "does not surface an approval-request card"
fi
if grep -qE 'headers\[.x-ms-user-isolation-key.\]|"x-ms-user-isolation-key":' "$BRIDGE_PY"; then
  fail "sets x-ms-user-isolation-key — deployed agents use Entra isolation (400)"
else
  pass "does not send x-ms-user-isolation-key"
fi
if grep -q "ping" "$BRIDGE_PY"; then
  pass "has an SSE keep-alive"
else
  fail "has no SSE keep-alive"
fi

echo "== HITL contract consistency (your chosen shape, both sides) =="
if grep -q '"accepted"' "$BRIDGE_PY" && grep -q "accepted" "$ROOT/frontend/components/ApprovalHitl.tsx"; then
  pass "backend detects \"accepted\" in the resolved payload; frontend responds with the same shape"
else
  fail "HITL contract mismatch — the frontend respond(...) shape and the bridge's parser disagree"
fi

echo "== Agent name consistency (agent.py <-> agent.yaml) =="
AGENT_PY_NAME=$(grep -oE 'AGENT_NAME = "[^"]+"' "$AGENT_PY" | head -1 | sed -E 's/AGENT_NAME = "([^"]+)"/\1/')
YAML_NAME=$(grep -oE '^name: [a-zA-Z0-9_.-]+' "$ROOT/hosted/responses/agent.yaml" | head -1 | sed -E 's/name: //')
echo "  hosted/responses/agent.py   AGENT_NAME = $AGENT_PY_NAME"
echo "  hosted/responses/agent.yaml name       = $YAML_NAME"
if [ "$AGENT_PY_NAME" = "$YAML_NAME" ] && [ -n "$AGENT_PY_NAME" ]; then
  pass "agent name is consistent between agent.py and agent.yaml"
else
  fail "agent name DRIFTS between agent.py and agent.yaml — see values printed above"
fi

echo "== Frontend: CopilotKit provider / route wiring =="
if grep -q "react-core/v2" "$ROOT/frontend/app/providers.tsx"; then
  pass "providers.tsx imports the /v2 subpath (@copilotkit/react-core/v2)"
else
  fail "providers.tsx does not import the /v2 subpath — confirm this is still correct for your version"
fi
if grep -q "createCopilotRuntimeHandler\|createCopilotHonoHandler\|createCopilotEndpoint" "$ROOT/frontend/app/api/copilotkit/[[...slug]]/route.ts"; then
  pass "route.ts wires a CopilotKit runtime handler"
else
  fail "route.ts does not appear to wire a CopilotKit runtime handler"
fi
if grep -q "useHumanInTheLoop" "$ROOT/frontend/components/ApprovalHitl.tsx"; then
  pass "ApprovalHitl.tsx uses the useHumanInTheLoop hook"
else
  fail "no useHumanInTheLoop hook found"
fi

echo "== Containers: MCR base images (no Docker Hub) =="
for dockerfile in "backend/Dockerfile" "hosted/responses/Dockerfile"; do
  if grep -q "mcr.microsoft.com" "$ROOT/$dockerfile"; then
    pass "$dockerfile uses an MCR base image"
  else
    fail "$dockerfile does NOT use an MCR base image (Docker Hub rate-limit risk)"
  fi
done

echo
if [ "$FAIL" -eq 0 ]; then
  echo "verify.sh: ALL CHECKS PASSED"
  exit 0
else
  echo "verify.sh: SOME CHECKS FAILED"
  exit 1
fi
