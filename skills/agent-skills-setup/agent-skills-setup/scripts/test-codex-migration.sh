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
TMP_ROOT="$(mktemp -d /tmp/codex-migration-test.XXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT

TEST_HOME="$TMP_ROOT/home"
SOURCE_MCP="$TEST_HOME/.claude.json"
TARGET_MCP="$TEST_HOME/.codex/config.toml"
SOURCE_CONFIG="$TEST_HOME/.codex/config.toml"
TARGET_CONFIG="$TEST_HOME/.openclaw/openclaw.json"
OUTPUT="$TMP_ROOT/mcp.txt"
CONFIG_OUTPUT="$TMP_ROOT/config.txt"

assert_path() {
    local object="$1"
    local expected="$2"
    local actual

    actual="$(HOME="$(native_path "$TEST_HOME")" bash "$SCRIPT_DIR/smart-ide-migration.sh" legacy --print-path codex "$object")"
    [[ "$actual" == "$expected" ]] || {
        echo "FAIL: codex/${object} expected '${expected}', got '${actual}'" >&2
        exit 1
    }
}

assert_path global "~/.agents/skills"
assert_path project ".agents"
assert_path project-skills ".agents/skills"
assert_path project-config ".codex/config.toml"
assert_path mcp "~/.codex/config.toml"
assert_path config "~/.codex/config.toml"

mkdir -p "$TEST_HOME"
printf '%s\n' \
    '{' \
    '  "mcpServers": {' \
    '    "example": {"url": "https://example.invalid/mcp"}' \
    '  }' \
    '}' > "$SOURCE_MCP"

if HOME="$(native_path "$TEST_HOME")" bash "$SCRIPT_DIR/smart-ide-migration.sh" legacy \
    --source claude \
    --target codex \
    --objects mcp \
    --strategy overwrite \
    --yes > "$OUTPUT" 2>"$TMP_ROOT/mcp.err"; then
    echo "FAIL: canonical entry point authorized the manual Codex TOML adapter" >&2
    exit 1
fi

if [[ -e "$TARGET_MCP" ]]; then
    echo "FAIL: JSON MCP configuration was written to Codex TOML config" >&2
    exit 1
fi

grep -Fq 'legacy writes are disabled' "$TMP_ROOT/mcp.err"

mkdir -p "$(dirname "$SOURCE_CONFIG")"
printf '%s\n' \
    '[mcp_servers.example]' \
    'url = "https://example.invalid/mcp"' \
    '' \
    '[hooks]' \
    'enabled = true' > "$SOURCE_CONFIG"

if HOME="$(native_path "$TEST_HOME")" bash "$SCRIPT_DIR/smart-ide-migration.sh" legacy \
    --source codex \
    --target openclaw \
    --objects config \
    --strategy overwrite \
    --yes > "$CONFIG_OUTPUT" 2>"$TMP_ROOT/config.err"; then
    echo "FAIL: canonical entry point authorized whole-IDE config migration" >&2
    exit 1
fi

if [[ -e "$TARGET_CONFIG" ]]; then
    echo "FAIL: Codex config.toml was copied to a non-Codex configuration target" >&2
    exit 1
fi

grep -Fq 'legacy writes are disabled' "$TMP_ROOT/config.err"
echo "Codex migration mapping test passed"
