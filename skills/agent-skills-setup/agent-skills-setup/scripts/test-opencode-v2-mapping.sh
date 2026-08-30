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
MIGRATION_SCRIPT="$SCRIPT_DIR/legacy-smart-ide-migration.sh"
export AGENT_SKILLS_SETUP_INTERNAL_LEGACY=1
TMP_ROOT="$(mktemp -d /tmp/opencode-v2-test.XXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT

TEST_HOME="$TMP_ROOT/home"
WORKSPACE="$TMP_ROOT/workspace"
SOURCE_FILE="$TMP_ROOT/cursor-mcp.json"
mkdir -p "$TEST_HOME" "$WORKSPACE"

printf '%s\n' '{"mcpServers":{"local":{"command":"node","args":["server.js"],"env":{"LOG_LEVEL":"info"},"enabled":true,"timeout":30000},"remote":{"url":"https://example.invalid/mcp","oauth":{"clientId":"client-id","callbackPort":19876}}}}' > "$SOURCE_FILE"

HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source cursor --target opencode --opencode-version v2 \
    --workspace "$WORKSPACE" --objects project-mcp \
    --source-mcp-file "$SOURCE_FILE" --strategy overwrite --yes >/dev/null

python3 - "$WORKSPACE/opencode.json" <<'PYEOF'
import json
import sys

data = json.load(open(sys.argv[1]))
assert set(data["mcp"]) == {"servers"}
servers = data["mcp"]["servers"]
assert servers["local"]["command"] == ["node", "server.js"]
assert servers["local"]["environment"] == {"LOG_LEVEL": "info"}
assert "enabled" not in servers["local"]
assert servers["local"]["disabled"] is False
assert servers["local"]["timeout"] == {"catalog": 30000, "execution": 30000}
assert servers["remote"]["oauth"]["client_id"] == "client-id"
assert servers["remote"]["oauth"]["callback_port"] == 19876
assert "clientId" not in servers["remote"]["oauth"]
PYEOF

MIGRATION_WORKSPACE="$TMP_ROOT/version-migration"
mkdir -p "$MIGRATION_WORKSPACE"
printf '%s\n' '{"theme":"dark","mcp":{"legacy":{"type":"local","command":["legacy-server"]}}}' \
    > "$MIGRATION_WORKSPACE/opencode.json"

HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source cursor --target opencode --opencode-version v2 \
    --workspace "$MIGRATION_WORKSPACE" --objects project-mcp \
    --source-mcp-file "$SOURCE_FILE" --strategy backup --yes >/dev/null

python3 - "$MIGRATION_WORKSPACE/opencode.json" <<'PYEOF'
import json
import sys

data = json.load(open(sys.argv[1]))
assert data["theme"] == "dark"
assert set(data["mcp"]) == {"servers"}, "V1 and V2 MCP roots were mixed"
assert "local" in data["mcp"]["servers"]
PYEOF

VERSION_BACKUP="$(find "$MIGRATION_WORKSPACE" -maxdepth 1 -name 'opencode.json.bak.*' -print -quit)"
python3 - "$VERSION_BACKUP" <<'PYEOF'
import json
import sys

data = json.load(open(sys.argv[1]))
assert "legacy" in data["mcp"]
PYEOF

if HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source cursor --target claude --opencode-version v2 \
    --objects mcp --dry-run >/dev/null 2>&1; then
    echo "FAIL: --opencode-version was accepted for a non-OpenCode target" >&2
    exit 1
fi

echo "PASS: OpenCode V2 target emits the native mcp.servers schema"
