#!/usr/bin/env bash


set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Native Windows Python ignores MSYS-style env values; convert HOME
# fixtures so $HOME resolution sees a real directory on every platform.

# Pin surface resolution to the POSIX layout the fixtures create;
# otherwise windows-latest would resolve $APPDATA-style overrides.
export AGENT_SKILLS_PLATFORM=linux

native_path() {
    if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else printf '%s' "$1"; fi
}
MIGRATION_SCRIPT="${SCRIPT_DIR}/legacy-smart-ide-migration.sh"
export AGENT_SKILLS_SETUP_INTERNAL_LEGACY=1
TMP_ROOT="$(mktemp -d /tmp/copilot-mapping-test.XXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT

TEST_HOME="$TMP_ROOT/home"
WORKSPACE="$TMP_ROOT/workspace"
CURSOR_MCP="$TEST_HOME/.cursor/mcp.json"

mkdir -p "$(dirname "$CURSOR_MCP")" "$WORKSPACE"

assert_path() {
    local object="$1"
    local expected="$2"
    local actual

    actual="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" --print-path copilot "$object")"
    if [[ "$actual" != "$expected" ]]; then
        echo "FAIL: copilot/${object} expected '${expected}', got '${actual}'" >&2
        exit 1
    fi
}

assert_path project ".github"
assert_path project-skills ".github/skills"
assert_path project-mcp ".mcp.json"
assert_path mcp "~/.copilot/mcp-config.json"

cat > "$CURSOR_MCP" <<'JSON'
{
  "mcpServers": {
    "unsupported": {
      "type": "websocket",
      "url": "wss://example.invalid/mcp",
      "tools": ["*"]
    }
  }
}
JSON

OUTPUT="$TMP_ROOT/output.txt"
set +e
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source cursor \
    --target copilot \
    --workspace "$WORKSPACE" \
    --objects mcp \
    --yes >"$OUTPUT" 2>&1
RC=$?
set -e

if [[ $RC -eq 0 ]] && ! grep -Fq 'MCP config migration failed' "$OUTPUT"; then
    echo "FAIL: unsupported Copilot CLI MCP transport was not rejected" >&2
    cat "$OUTPUT" >&2
    exit 1
fi

if [[ -e "$TEST_HOME/.copilot/mcp-config.json" ]]; then
    echo "FAIL: unsupported Copilot CLI MCP transport was written" >&2
    exit 1
fi

cat > "$CURSOR_MCP" <<'JSON'
{
  "mcpServers": {
    "local-tool": {
      "type": "stdio",
      "command": "node",
      "args": ["server.js"],
      "tools": ["*"]
    }
  }
}
JSON

HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source cursor \
    --target copilot \
    --workspace "$WORKSPACE" \
    --objects mcp \
    --yes >"$OUTPUT" 2>&1

python3 - "$TEST_HOME/.copilot/mcp-config.json" <<'PY'
import json
import sys

with open(sys.argv[1]) as f:
    config = json.load(f)

server = config.get("mcpServers", {}).get("local-tool", {})
if server.get("type") != "stdio" or server.get("command") != "node":
    raise SystemExit("CLI MCP conversion did not preserve the documented stdio entry")
if "servers" in config:
    raise SystemExit("VS Code MCP root key leaked into CLI config")
PY

echo "Copilot CLI mapping fixture passed"
