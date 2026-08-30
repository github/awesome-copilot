#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Native Windows Python ignores MSYS-style env values; convert HOME
# fixtures so $HOME resolution sees a real directory on every platform.

# Pin surface resolution to the POSIX layout the fixtures create;
# otherwise windows-latest would resolve $APPDATA-style overrides.
export AGENT_SKILLS_PLATFORM=linux

native_path() {
    if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else printf '%s' "$1"; fi
}
SCRIPT="$SCRIPT_DIR/legacy-smart-ide-migration.sh"
export AGENT_SKILLS_SETUP_INTERNAL_LEGACY=1
TMP_ROOT="$(mktemp -d /tmp/zed-mapping-test.XXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT
TEST_HOME="$TMP_ROOT/home"
mkdir -p "$TEST_HOME/.cursor" "$TEST_HOME/.config/zed"

assert_path() {
    local object="$1" expected="$2" actual
    actual="$(HOME="$(native_path "$TEST_HOME")" bash "$SCRIPT" --print-path zed "$object" 2>/dev/null || true)"
    [[ "$actual" == "$expected" ]] || {
        echo "FAIL: zed/$object expected '$expected', got '$actual'" >&2
        exit 1
    }
}

assert_path global '~/.agents/skills'
assert_path project ''
assert_path project-skills '.agents/skills'
assert_path rules 'AGENTS.md'
assert_path mcp '~/.config/zed/settings.json'
assert_path project-mcp '.zed/settings.json'
assert_path config ''

printf '%s\n' '{"mcpServers":{"local":{"command":"node","args":["server.js"],"env":{"TOKEN":"__zed_inert_fixture__"}},"remote":{"url":"https://example.invalid/mcp","headers":{"Authorization":"Bearer __zed_inert_fixture__"}}}}' > "$TEST_HOME/.cursor/mcp.json"
HOME="$(native_path "$TEST_HOME")" bash "$SCRIPT" --source cursor --target zed --objects mcp --yes --strategy overwrite >/dev/null
python3 - "$TEST_HOME/.config/zed/settings.json" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
assert set(data["context_servers"]) == {"local", "remote"}
assert data["context_servers"]["local"]["env"]["TOKEN"] == ""
assert data["context_servers"]["remote"]["headers"]["Authorization"] == ""
assert "type" not in data["context_servers"]["local"]
PY

ZED_TARGET_BEFORE="$TMP_ROOT/zed-settings-before.json"
cp "$TEST_HOME/.config/zed/settings.json" "$ZED_TARGET_BEFORE"
printf '%s\n' '{"mcpServers":{"bad":{"type":"stdio","command":"node","args":[]}}}' > "$TEST_HOME/.cursor/mcp.json"
BAD_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$SCRIPT" --source cursor --target zed --objects mcp --yes --strategy overwrite 2>&1)"
if ! grep -Fq 'Zed context_servers schema is unsupported' <<< "$BAD_OUTPUT"; then
    echo "FAIL: unsupported Zed transport/type was accepted" >&2
    exit 1
fi
cmp -s "$ZED_TARGET_BEFORE" "$TEST_HOME/.config/zed/settings.json" || {
    echo "FAIL: unsupported Zed transport/type mutated the existing target" >&2
    exit 1
}

echo "Zed mapping fixture test passed"
